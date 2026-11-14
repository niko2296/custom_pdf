"""
PDF Suite Utilities (Merge, Split, Rotate, Protect, Unlock, Convert)
Part of the 3-Layer Architecture (Layer 3: Deterministic Execution)
"""

import os
import io
import zipfile
from typing import List, Dict, Any, Optional
import pymupdf
from PIL import Image

def merge_pdfs(input_paths: List[str], output_path: str) -> Dict[str, Any]:
    """Merge multiple PDF files into one in order."""
    if not input_paths:
        raise ValueError("Daftar file input tidak boleh kosong.")
        
    merged_doc = pymupdf.open()
    total_pages = 0
    for p in input_paths:
        doc = pymupdf.open(p)
        merged_doc.insert_pdf(doc)
        total_pages += len(doc)
        doc.close()
        
    merged_doc.save(output_path, garbage=4, deflate=True)
    merged_doc.close()
    
    return {
        "success": True,
        "total_files": len(input_paths),
        "total_pages": total_pages,
        "output_size": os.path.getsize(output_path)
    }

def split_pdf(
    input_path: str,
    page_ranges: str, # e.g. "1-3, 5, 8-10" or "all"
    output_dir: str
) -> Dict[str, Any]:
    """
    Split a PDF by page ranges or extract all pages as individual files.
    """
    doc = pymupdf.open(input_path)
    num_pages = len(doc)
    os.makedirs(output_dir, exist_ok=True)
    created_files = []
    
    if page_ranges.strip().lower() == "all":
        # Extract each page individually
        for idx in range(num_pages):
            out_doc = pymupdf.open()
            out_doc.insert_pdf(doc, from_page=idx, to_page=idx)
            fname = f"page_{idx + 1}.pdf"
            fpath = os.path.join(output_dir, fname)
            out_doc.save(fpath)
            out_doc.close()
            created_files.append(fpath)
    else:
        # Parse ranges like "1-3, 5" (1-based index)
        parts = [p.strip() for p in page_ranges.split(",") if p.strip()]
        for i, part in enumerate(parts):
            out_doc = pymupdf.open()
            if "-" in part:
                start_s, end_s = part.split("-", 1)
                start = max(1, min(num_pages, int(start_s))) - 1
                end = max(1, min(num_pages, int(end_s))) - 1
                if start > end:
                    start, end = end, start
                out_doc.insert_pdf(doc, from_page=start, to_page=end)
            else:
                p_idx = max(1, min(num_pages, int(part))) - 1
                out_doc.insert_pdf(doc, from_page=p_idx, to_page=p_idx)
                
            fname = f"split_part_{i + 1}.pdf"
            fpath = os.path.join(output_dir, fname)
            out_doc.save(fpath)
            out_doc.close()
            created_files.append(fpath)
            
    doc.close()
    
    # If multiple files, create a convenient zip bundle
    zip_path = os.path.join(output_dir, "split_results.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in created_files:
            zf.write(f, arcname=os.path.basename(f))
            
    return {
        "success": True,
        "files_count": len(created_files),
        "files": created_files,
        "zip_path": zip_path
    }

def rotate_pdf(input_path: str, rotation_deg: int, output_path: str) -> Dict[str, Any]:
    """Rotate all pages in PDF by 90, 180, or 270 degrees clockwise."""
    doc = pymupdf.open(input_path)
    for page in doc:
        page.set_rotation((page.rotation + rotation_deg) % 360)
    doc.save(output_path)
    doc.close()
    return {
        "success": True,
        "rotation": rotation_deg,
        "pages": len(doc)
    }

def protect_pdf(input_path: str, user_pw: str, owner_pw: str, output_path: str) -> Dict[str, Any]:
    """Encrypt and password-protect a PDF with AES-256."""
    doc = pymupdf.open(input_path)
    doc.save(
        output_path,
        encryption=pymupdf.PDF_ENCRYPT_AES_256,
        user_pw=user_pw,
        owner_pw=owner_pw or user_pw
    )
    doc.close()
    return {
        "success": True,
        "encrypted": True
    }

def unlock_pdf(input_path: str, password: str, output_path: str) -> Dict[str, Any]:
    """Unlock and decrypt a password-protected PDF."""
    doc = pymupdf.open(input_path)
    if doc.is_encrypted:
        auth_success = doc.authenticate(password)
        if not auth_success:
            doc.close()
            return {"success": False, "error": "Password yang dimasukkan salah."}
            
    # Save decrypted
    doc.save(output_path, encryption=pymupdf.PDF_ENCRYPT_NONE)
    doc.close()
    return {
        "success": True,
        "decrypted": True
    }

def pdf_to_images(input_path: str, output_dir: str, dpi: int = 150) -> Dict[str, Any]:
    """Convert each PDF page to crisp JPEG image and bundle as ZIP."""
    doc = pymupdf.open(input_path)
    os.makedirs(output_dir, exist_ok=True)
    img_files = []
    
    matrix = pymupdf.Matrix(dpi / 72.0, dpi / 72.0)
    for idx, page in enumerate(doc):
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        fname = f"page_{idx + 1:03d}.jpg"
        fpath = os.path.join(output_dir, fname)
        pix.save(fpath)
        img_files.append(fpath)
        
    doc.close()
    
    zip_path = os.path.join(output_dir, "pdf_images.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in img_files:
            zf.write(f, arcname=os.path.basename(f))
            
    return {
        "success": True,
        "page_count": len(img_files),
        "images": img_files,
        "zip_path": zip_path
    }

def images_to_pdf(image_paths: List[str], output_path: str) -> Dict[str, Any]:
    """Combine multiple JPG/PNG images into a single PDF."""
    doc = pymupdf.open()
    for img_p in image_paths:
        try:
            with Image.open(img_p) as pil_img:
                w, h = pil_img.size
                
            # Create page with corresponding dimensions in points (72 DPI standard)
            # Normalize to ~A4 aspect if desired or exact image aspect ratio
            rect = pymupdf.Rect(0, 0, w * 72 / 150, h * 72 / 150)
            page = doc.new_page(width=rect.width, height=rect.height)
            page.insert_image(rect, filename=img_p)
        except Exception:
            continue
            
    doc.save(output_path, garbage=4, deflate=True)
    doc.close()
    return {
        "success": True,
        "total_images": len(image_paths),
        "output_size": os.path.getsize(output_path)
    }

def remove_pages(input_path: str, pages_to_remove: List[int], output_path: str) -> Dict[str, Any]:
    """Remove specific 1-based page numbers from PDF."""
    doc = pymupdf.open(input_path)
    zero_based = sorted([p - 1 for p in pages_to_remove if 1 <= p <= len(doc)], reverse=True)
    for p_idx in zero_based:
        doc.delete_page(p_idx)
    doc.save(output_path, garbage=4, deflate=True)
    doc.close()
    return {
        "success": True,
        "remaining_pages": len(doc)
    }

