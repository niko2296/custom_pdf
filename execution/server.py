"""
Web UI Server for Portable PDF Suite (FastAPI + Uvicorn)
Part of the 3-Layer Architecture (Layer 3: Deterministic Execution)
"""

import os
import sys
import uuid
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import List, Optional

import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Add parent directory to path
current_dir = Path(__file__).resolve().parent
project_root = current_dir.parent
sys.path.insert(0, str(project_root))

from execution.compress_engine import compress_pdf_to_target_size, compress_pdf_preset
from execution.pdf_tools import (
    merge_pdfs, split_pdf, rotate_pdf, protect_pdf, unlock_pdf,
    pdf_to_images, images_to_pdf, remove_pages
)
from execution.pro_editor import (
    get_page_editor_data, save_visual_editor_changes,
    analyze_pdf_text_blocks, seamless_replace_text
)
import base64
import json
import socket
import pymupdf

app = FastAPI(title="Siba PDF Suite - Portable & Smart Compressor")

# Storage directories
TEMP_DIR = project_root / ".tmp"
TEMP_DIR.mkdir(exist_ok=True)
UPLOAD_DIR = TEMP_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR = TEMP_DIR / "outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

# Mount static files
static_dir = project_root / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")


@app.middleware("http")
async def disable_static_cache_headers(request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path == "/" or path.endswith(".css") or path.endswith(".js"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = project_root / "templates" / "index.html"
    if not index_file.exists():
        return HTMLResponse("<h1>Templates index.html belum dibuat.</h1>", status_code=500)
    return HTMLResponse(index_file.read_text(encoding="utf-8"))

@app.post("/api/compress")
async def api_compress(
    files: Optional[List[UploadFile]] = File(None),
    file: Optional[UploadFile] = File(None),
    mode: str = Form("target_size"), # "target_size" or "preset"
    target_kb: int = Form(500),
    preset: str = Form("recommended")
):
    try:
        upload_files: List[UploadFile] = []
        if files:
            upload_files.extend([f for f in files if f.filename])
        if file and file.filename:
            if not any(f.filename == file.filename for f in upload_files):
                upload_files.append(file)

        if not upload_files:
            return JSONResponse({"success": False, "error": "Tidak ada file PDF yang diunggah."}, status_code=400)

        task_id = str(uuid.uuid4())[:8]

        # Single file compression flow
        if len(upload_files) == 1:
            target_file = upload_files[0]
            safe_name = Path(target_file.filename or "document.pdf").name
            input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
            output_filename = f"compressed_{safe_name}"
            output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
            
            with open(input_path, "wb") as f:
                shutil.copyfileobj(target_file.file, f)
                
            if mode == "target_size":
                result = compress_pdf_to_target_size(
                    input_pdf_path=str(input_path),
                    target_size_kb=target_kb,
                    output_pdf_path=str(output_path)
                )
            else:
                result = compress_pdf_preset(
                    input_pdf_path=str(input_path),
                    preset=preset,
                    output_pdf_path=str(output_path)
                )
                
            result["download_url"] = f"/api/download/{task_id}_{output_filename}"
            result["filename"] = output_filename
            result["is_zip"] = False
            return JSONResponse(result)

        # Multiple files compression flow -> packaged into ZIP
        compressed_items = []
        total_orig_size = 0
        total_comp_size = 0
        all_targets_met = True

        for idx, f_item in enumerate(upload_files):
            safe_name = Path(f_item.filename or f"doc_{idx}.pdf").name
            input_path = UPLOAD_DIR / f"{task_id}_{idx}_{safe_name}"
            output_filename = f"compressed_{safe_name}"
            output_path = OUTPUT_DIR / f"{task_id}_{idx}_{output_filename}"

            with open(input_path, "wb") as f:
                shutil.copyfileobj(f_item.file, f)

            if mode == "target_size":
                res = compress_pdf_to_target_size(
                    input_pdf_path=str(input_path),
                    target_size_kb=target_kb,
                    output_pdf_path=str(output_path)
                )
            else:
                res = compress_pdf_preset(
                    input_pdf_path=str(input_path),
                    preset=preset,
                    output_pdf_path=str(output_path)
                )

            total_orig_size += res.get("original_size", 0)
            total_comp_size += res.get("compressed_size", 0)
            if not res.get("target_met", True):
                all_targets_met = False

            compressed_items.append((output_path, safe_name))

        zip_filename = "compressed_pdfs.zip"
        zip_storage_name = f"{task_id}_{zip_filename}"
        zip_path = OUTPUT_DIR / zip_storage_name

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for out_p, orig_n in compressed_items:
                arc_name = f"compressed_{orig_n}"
                zf.write(out_p, arcname=arc_name)

        final_zip_size = os.path.getsize(zip_path)
        reduction_pct = round(max(0.0, (1.0 - final_zip_size / max(1, total_orig_size)) * 100), 1)

        return JSONResponse({
            "success": True,
            "is_zip": True,
            "total_files": len(upload_files),
            "original_size": total_orig_size,
            "compressed_size": final_zip_size,
            "reduction_pct": reduction_pct,
            "target_met": all_targets_met,
            "note": f"Berhasil mengompres {len(upload_files)} file PDF menjadi 1 file ZIP.",
            "download_url": f"/api/download/{zip_storage_name}",
            "filename": zip_filename
        })
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/merge")
async def api_merge(files: List[UploadFile] = File(...)):
    try:
        task_id = str(uuid.uuid4())[:8]
        input_paths = []
        for idx, f in enumerate(files):
            safe_name = Path(f.filename or f"doc_{idx}.pdf").name
            p = UPLOAD_DIR / f"{task_id}_{idx}_{safe_name}"
            with open(p, "wb") as out_f:
                shutil.copyfileobj(f.file, out_f)
            input_paths.append(str(p))
            
        output_filename = "merged_document.pdf"
        output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
        res = merge_pdfs(input_paths, str(output_path))
        res["download_url"] = f"/api/download/{task_id}_{output_filename}"
        res["filename"] = output_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/split")
async def api_split(file: UploadFile = File(...), ranges: str = Form("1-3")):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "document.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        split_out_dir = OUTPUT_DIR / f"split_{task_id}"
        res = split_pdf(str(input_path), ranges, str(split_out_dir))
        zip_filename = f"split_{Path(safe_name).stem}.zip"
        target_zip = OUTPUT_DIR / f"{task_id}_{zip_filename}"
        shutil.copyfile(res["zip_path"], target_zip)
        
        res["download_url"] = f"/api/download/{task_id}_{zip_filename}"
        res["filename"] = zip_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/rotate")
async def api_rotate(file: UploadFile = File(...), degrees: int = Form(90)):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "document.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        output_filename = f"rotated_{safe_name}"
        output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
        res = rotate_pdf(str(input_path), degrees, str(output_path))
        res["download_url"] = f"/api/download/{task_id}_{output_filename}"
        res["filename"] = output_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/protect")
async def api_protect(file: UploadFile = File(...), password: str = Form(...)):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "document.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        output_filename = f"protected_{safe_name}"
        output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
        res = protect_pdf(str(input_path), password, password, str(output_path))
        res["download_url"] = f"/api/download/{task_id}_{output_filename}"
        res["filename"] = output_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/unlock")
async def api_unlock(file: UploadFile = File(...), password: str = Form(...)):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "document.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        output_filename = f"unlocked_{safe_name}"
        output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
        res = unlock_pdf(str(input_path), password, str(output_path))
        if not res.get("success"):
            return JSONResponse(res, status_code=400)
            
        res["download_url"] = f"/api/download/{task_id}_{output_filename}"
        res["filename"] = output_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/pdf-to-img")
async def api_pdf_to_img(file: UploadFile = File(...)):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "document.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        out_img_dir = OUTPUT_DIR / f"imgs_{task_id}"
        res = pdf_to_images(str(input_path), str(out_img_dir))
        zip_filename = f"images_{Path(safe_name).stem}.zip"
        target_zip = OUTPUT_DIR / f"{task_id}_{zip_filename}"
        shutil.copyfile(res["zip_path"], target_zip)
        
        res["download_url"] = f"/api/download/{task_id}_{zip_filename}"
        res["filename"] = zip_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/img-to-pdf")
async def api_img_to_pdf(files: List[UploadFile] = File(...)):
    try:
        task_id = str(uuid.uuid4())[:8]
        input_paths = []
        for idx, f in enumerate(files):
            safe_name = Path(f.filename or f"img_{idx}.jpg").name
            p = UPLOAD_DIR / f"{task_id}_{idx}_{safe_name}"
            with open(p, "wb") as out_f:
                shutil.copyfileobj(f.file, out_f)
            input_paths.append(str(p))
            
        output_filename = "converted_from_images.pdf"
        output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
        res = images_to_pdf(input_paths, str(output_path))
        res["download_url"] = f"/api/download/{task_id}_{output_filename}"
        res["filename"] = output_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/pro/page-data")
async def api_pro_page_data(
    file: UploadFile = File(...),
    page_idx: int = Form(0),
    scale: float = Form(1.5),
    illustrator_mode: bool = Form(False)
):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "doc.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        data = get_page_editor_data(str(input_path), page_idx=page_idx, scale=scale, illustrator_mode=illustrator_mode)
        data["file_id"] = f"{task_id}_{safe_name}"
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


@app.post("/api/pro/preview-page")
async def api_pro_preview_page(
    file: UploadFile = File(...),
    page_idx: int = Form(0),
    scale: float = Form(1.5),
    changes: str = Form("{}")
):
    """Live 1:1 PyMuPDF page re-renderer (Illustrator / Acrobat TileCanvas update pattern)."""
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "doc.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        output_path = OUTPUT_DIR / f"{task_id}_preview_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        changes_payload = json.loads(changes or "{}")
        save_visual_editor_changes(str(input_path), str(output_path), changes_payload)
        doc = pymupdf.open(str(output_path))
        p_idx = max(0, min(int(page_idx), len(doc) - 1))
        pix = doc[p_idx].get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
        b64_img = base64.b64encode(pix.tobytes("png")).decode("ascii")
        doc.close()
        return JSONResponse({
            "success": True,
            "page_idx": p_idx,
            "rendered_image": f"data:image/png;base64,{b64_img}"
        })
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/pro/save-visual-editor")
async def api_pro_save_visual_editor(
    file: UploadFile = File(...),
    changes: str = Form(...)
):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "doc.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        changes_payload = json.loads(changes)
        output_filename = f"edited_{safe_name}"
        output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
        
        res = save_visual_editor_changes(str(input_path), str(output_path), changes_payload)
        res["download_url"] = f"/api/download/{task_id}_{output_filename}"
        res["filename"] = output_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/pro/analyze")
async def api_pro_analyze(file: UploadFile = File(...)):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "doc.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        res = analyze_pdf_text_blocks(str(input_path))
        res["file_id"] = f"{task_id}_{safe_name}"
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.post("/api/pro/replace")
async def api_pro_replace(
    file: UploadFile = File(...),
    replacements: str = Form(...)
):
    try:
        task_id = str(uuid.uuid4())[:8]
        safe_name = Path(file.filename or "doc.pdf").name
        input_path = UPLOAD_DIR / f"{task_id}_{safe_name}"
        with open(input_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        reps_data = json.loads(replacements)
        output_filename = f"edited_{safe_name}"
        output_path = OUTPUT_DIR / f"{task_id}_{output_filename}"
        
        res = seamless_replace_text(str(input_path), str(output_path), reps_data)
        res["download_url"] = f"/api/download/{task_id}_{output_filename}"
        res["filename"] = output_filename
        return JSONResponse(res)
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.get("/api/download/{filename}")
async def download_file(filename: str):
    file_path = OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File tidak ditemukan atau telah kedaluwarsa.")
        
    # Extract clean display name by stripping task_id prefix if present
    display_name = filename
    if "_" in filename:
        parts = filename.split("_", 1)
        if len(parts[0]) == 8:
            display_name = parts[1]
            
    return FileResponse(
        path=str(file_path),
        filename=display_name,
        media_type="application/octet-stream"
    )

if __name__ == "__main__":
    import webbrowser
    import threading
    import time

    host = os.environ.get("HOST", "127.0.0.1").strip() or "127.0.0.1"

    def find_free_port(bind_host: str, start_port: int = 5050, max_port: int = 5099) -> int:
        test_host = "127.0.0.1" if bind_host in ("0.0.0.0", "::", "") else bind_host
        for p in range(start_port, max_port + 1):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind((test_host, p))
                    return p
            except OSError:
                continue
        return start_port

    env_port = os.environ.get("PORT", "").strip()
    if env_port:
        port = int(env_port)
    else:
        port = find_free_port(host, 5050)

    display_host = "127.0.0.1" if host in ("0.0.0.0", "::", "") else host
    url = f"http://{display_host}:{port}"

    no_browser = os.environ.get("NO_BROWSER", "").strip().lower() in ("1", "true", "yes")
    is_linux_headless = sys.platform.startswith("linux") and not (
        os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")
    )

    if not no_browser and not is_linux_headless:
        def open_browser():
            time.sleep(1.2)
            try:
                webbrowser.open(url)
            except Exception:
                pass

        threading.Thread(target=open_browser, daemon=True).start()

    print("======================================================")
    print(f"SIBA SURYA PDF Suite aktif di: http://{host}:{port}")
    if host in ("0.0.0.0", "::"):
        print(f"Akses lokal  : {url}")
    print("Tekan Ctrl+C untuk menghentikan server.")
    print("======================================================")
    uvicorn.run(app, host=host, port=port, log_level="info")

