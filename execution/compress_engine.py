"""
PDF Compression Engine with iLovePDF-Style Structural Optimization & Smart Target Optimizer
Part of the 3-Layer Architecture (Layer 3: Deterministic Execution)
Preserves vector text & fonts razor-sharp while stripping hidden bloat and adaptively
optimizing embedded images to printed DPI + quality budget.
"""

import hashlib
import io
import os
from typing import Dict, Any, Optional, Tuple, List
import pymupdf
from PIL import Image

# Preset profiles (iLovePDF-aligned tiers)
PRESETS = {
    "low": {"dpi": 200, "scale": 1.0, "quality": 86, "subsampling": 0, "label": "Kompresi Ringan (Kualitas Tertinggi)"},
    "recommended": {"dpi": 144, "scale": 0.85, "quality": 74, "subsampling": 2, "label": "Kompresi Rekomendasi (Seimbang)"},
    "extreme": {"dpi": 88, "scale": 0.55, "quality": 44, "subsampling": 2, "label": "Kompresi Ekstrem (Ukuran Terkecil)"},
}


def get_pdf_images_info(doc: pymupdf.Document) -> List[Dict[str, Any]]:
    """Scan and retrieve unique image objects in the document along with max printed dimensions."""
    seen_xrefs = {}
    ordered_xrefs: List[int] = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        # Printed bbox dimensions on page via get_image_info(xrefs=True)
        bbox_dims_by_xref: Dict[int, Tuple[float, float]] = {}
        try:
            for info in page.get_image_info(xrefs=True):
                ix = int(info.get("xref") or 0)
                bbox = info.get("bbox")
                if ix > 0 and bbox and len(bbox) == 4:
                    w_pt = max(1.0, float(bbox[2]) - float(bbox[0]))
                    h_pt = max(1.0, float(bbox[3]) - float(bbox[1]))
                    prev = bbox_dims_by_xref.get(ix)
                    if not prev or (w_pt * h_pt) > (prev[0] * prev[1]):
                        bbox_dims_by_xref[ix] = (w_pt, h_pt)
        except Exception:
            pass

        for img in page.get_images(full=True):
            xref = int(img[0])
            smask = int(img[1] or 0)
            w_pt, h_pt = bbox_dims_by_xref.get(xref, (float(page.rect.width), float(page.rect.height)))
            if xref in seen_xrefs:
                rec = seen_xrefs[xref]
                if (w_pt * h_pt) > (rec["max_w_pt"] * rec["max_h_pt"]):
                    rec["max_w_pt"] = w_pt
                    rec["max_h_pt"] = h_pt
                continue
            try:
                info = doc.extract_image(xref)
                if info:
                    pix_w = int(info.get("width", 0) or img[2] or 0)
                    pix_h = int(info.get("height", 0) or img[3] or 0)
                    dpi_x = pix_w / max(0.2, w_pt / 72.0) if pix_w > 0 else 150.0
                    dpi_y = pix_h / max(0.2, h_pt / 72.0) if pix_h > 0 else 150.0
                    entry = {
                        "xref": xref,
                        "page_idx": page_idx,
                        "width": pix_w,
                        "height": pix_h,
                        "ext": info.get("ext", "png"),
                        "bytes_len": len(info.get("image", b"")),
                        "smask": smask,
                        "bpc": int(info.get("bpc", 8) or 8),
                        "cs_name": str(info.get("cs-name") or ""),
                        "max_w_pt": w_pt,
                        "max_h_pt": h_pt,
                        "eff_dpi": max(dpi_x, dpi_y),
                    }
                    seen_xrefs[xref] = entry
                    ordered_xrefs.append(xref)
            except Exception:
                pass

    return [seen_xrefs[x] for x in ordered_xrefs]


def _save_optimized_bytes(doc: pymupdf.Document) -> bytes:
    """Save PDF using Object Streams (PDF 1.5+), FlateDecode, and dead-object GC."""
    try:
        return doc.tobytes(
            garbage=4,
            deflate=True,
            deflate_images=True,
            deflate_fonts=True,
            clean=True,
            use_objstms=True,
        )
    except Exception:
        return doc.tobytes(
            garbage=4,
            deflate=True,
            clean=True,
        )


def _strip_bloat_and_subset(doc: pymupdf.Document, strip_icc_over_kb: Optional[int] = None) -> None:
    """
    iLovePDF-style structural cleanup (100% lossless visually):
    - Strips Photoshop / Illustrator / InDesign private /PieceInfo blobs (can be 10MB+)
    - Strips heavy XML XMP metadata & page thumbnails
    - Deduplicates identical image streams across pages before GC
    - Subsets embedded fonts to only used glyphs (keeps 100% vector crispness)
    """
    try:
        doc.set_metadata({})
    except Exception:
        pass
    try:
        doc.del_xml_metadata()
    except Exception:
        pass

    # Strip /PieceInfo and /Metadata on catalog, pages, and XObjects
    try:
        cat_xref = doc.pdf_catalog()
        if cat_xref > 0:
            doc.xref_set_key(cat_xref, "PieceInfo", "null")
            doc.xref_set_key(cat_xref, "Metadata", "null")
    except Exception:
        pass

    for page in doc:
        try:
            doc.xref_set_key(page.xref, "PieceInfo", "null")
            doc.xref_set_key(page.xref, "Thumb", "null")
            doc.xref_set_key(page.xref, "Metadata", "null")
        except Exception:
            pass

    xref_len = doc.xref_length()
    for xref in range(1, xref_len):
        try:
            if doc.xref_is_stream(xref):
                if doc.xref_get_key(xref, "Type")[1] == "/Metadata":
                    doc.update_object(xref, "<<>>")
                    doc.update_stream(xref, b"", new=True)
                    continue
            if doc.xref_get_key(xref, "PieceInfo")[0] != "null":
                doc.xref_set_key(xref, "PieceInfo", "null")
            if doc.xref_get_key(xref, "Metadata")[0] != "null":
                doc.xref_set_key(xref, "Metadata", "null")
        except Exception:
            pass

    # Optional rescue: normalize bloated custom ICC profiles into compact DeviceRGB/DeviceGray
    if strip_icc_over_kb is not None:
        thresh = strip_icc_over_kb * 1024
        for page in doc:
            for img in page.get_images(full=True):
                ix = int(img[0])
                try:
                    cs_key = doc.xref_get_key(ix, "ColorSpace")
                    if cs_key[0] == "array" or cs_key[0] == "xref":
                        raw_cs = cs_key[1]
                        if "ICCBased" in raw_cs:
                            # Find referenced ICC stream size
                            parts = [int(t) for t in raw_cs.replace("[", " ").replace("]", " ").split() if t.isdigit()]
                            icc_xref = parts[0] if parts else 0
                            if icc_xref > 0 and len(doc.xref_stream(icc_xref) or b"") > thresh:
                                n_ch = int(img[5] == "DeviceGray" or doc.xref_get_key(icc_xref, "N")[1] == "1")
                                doc.xref_set_key(ix, "ColorSpace", "/DeviceGray" if n_ch else "/DeviceRGB")
                except Exception:
                    pass

    # Prune unused TTF/OTF font glyphs cleanly while preserving every displayed vector character
    try:
        doc.subset_fonts()
    except Exception:
        pass


def _prepare_lossless_base_pdf(input_pdf_path: str) -> bytes:
    """Perform maximum-safe lossless cleanup & font subsetting once as optimization baseline."""
    doc = pymupdf.open(input_pdf_path)
    _strip_bloat_and_subset(doc)
    lossless_bytes = _save_optimized_bytes(doc)
    doc.close()
    orig_bytes = open(input_pdf_path, "rb").read()
    return lossless_bytes if len(lossless_bytes) < len(orig_bytes) else orig_bytes


def _open_pil_from_pdf_xref(doc: pymupdf.Document, xref: int, raw_bytes: bytes, cs_name: str = "") -> Optional[Image.Image]:
    """Load an accurate sRGB or L Pillow Image from a PDF image xref without CMYK/ICC color inversion."""
    use_pixmap_fallback = "CMYK" in (cs_name or "").upper() or "SEPARATION" in (cs_name or "").upper()
    if not use_pixmap_fallback:
        try:
            pil_img = Image.open(io.BytesIO(raw_bytes))
            pil_img.load()
            if pil_img.mode == "CMYK":
                use_pixmap_fallback = True
            elif pil_img.mode in ("RGB", "RGBA", "L", "LA", "P", "1"):
                return pil_img
            else:
                use_pixmap_fallback = True
        except Exception:
            use_pixmap_fallback = True

    if use_pixmap_fallback:
        try:
            pix = pymupdf.Pixmap(doc, xref)
            if pix.colorspace and pix.colorspace.n > 3:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            if pix.n == 1:
                return Image.frombytes("L", [pix.width, pix.height], pix.samples)
            if pix.n == 2:
                return Image.frombytes("LA", [pix.width, pix.height], pix.samples)
            if pix.n == 4:
                return Image.frombytes("RGBA", [pix.width, pix.height], pix.samples)
            if pix.colorspace != pymupdf.csRGB:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        except Exception:
            return None
    return None


def recompress_image(
    raw_bytes: bytes,
    scale: float = 1.0,
    quality: int = 75,
    max_dimension: int = 2400,
    subsampling: int = 2,
) -> Optional[bytes]:
    """
    Recompress an image stream into optimized JPEG/PNG with Lanczos resampling.
    Preserves aspect ratio and avoids unnecessary color/detail degradation.
    """
    try:
        pil_img = Image.open(io.BytesIO(raw_bytes))
        pil_img.load()

        if pil_img.mode in ("RGBA", "LA"):
            background = Image.new("RGB", pil_img.size, (255, 255, 255))
            alpha = pil_img.split()[-1]
            background.paste(pil_img, mask=alpha)
            pil_img = background
        elif pil_img.mode == "1":
            pil_img = pil_img.convert("L")
        elif pil_img.mode not in ("RGB", "L"):
            pil_img = pil_img.convert("RGB")

        orig_w, orig_h = pil_img.size
        target_w = int(round(orig_w * scale))
        target_h = int(round(orig_h * scale))

        if max(target_w, target_h) > max_dimension:
            ratio = max_dimension / max(target_w, target_h)
            target_w = max(1, int(round(target_w * ratio)))
            target_h = max(1, int(round(target_h * ratio)))

        target_w = max(1, target_w)
        target_h = max(1, target_h)

        if (target_w, target_h) != (orig_w, orig_h):
            pil_img = pil_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

        out_buf = io.BytesIO()
        q = max(18, min(95, int(quality)))
        save_kw = {"format": "JPEG", "quality": q, "optimize": True, "progressive": True}
        if pil_img.mode == "RGB":
            save_kw["subsampling"] = subsampling
        pil_img.save(out_buf, **save_kw)
        return out_buf.getvalue()
    except Exception:
        return None


def _encode_pil_image(
    pil_img: Image.Image,
    target_w: int,
    target_h: int,
    quality: int,
    subsampling: int,
    force_jpeg: bool = True,
) -> bytes:
    """Resize and encode a Pillow Image efficiently while preserving crisp grayscale/RGB fidelity."""
    orig_w, orig_h = pil_img.size
    if (target_w, target_h) != (orig_w, orig_h):
        pil_img = pil_img.resize((target_w, target_h), Image.Resampling.LANCZOS)

    out_buf = io.BytesIO()
    q = max(16, min(95, int(quality)))

    if not force_jpeg and pil_img.mode in ("1", "L", "P"):
        pil_img.save(out_buf, format="PNG", optimize=True)
        return out_buf.getvalue()

    if pil_img.mode == "1" or pil_img.mode == "L":
        enc_img = pil_img.convert("L")
        enc_img.save(out_buf, format="JPEG", quality=q, optimize=True, progressive=True)
        return out_buf.getvalue()

    if pil_img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", pil_img.size, (255, 255, 255))
        bg.paste(pil_img, mask=pil_img.split()[-1])
        enc_img = bg
    elif pil_img.mode != "RGB":
        enc_img = pil_img.convert("RGB")
    else:
        enc_img = pil_img

    enc_img.save(
        out_buf,
        format="JPEG",
        quality=q,
        optimize=True,
        progressive=True,
        subsampling=subsampling,
    )
    return out_buf.getvalue()


def _build_decoded_cache(base_pdf_bytes: bytes):
    """Pre-decode unique image xrefs & alpha SMasks once per optimization session."""
    doc = pymupdf.open(stream=base_pdf_bytes, filetype="pdf")
    imgs = get_pdf_images_info(doc)
    decoded_imgs: Dict[int, Dict[str, Any]] = {}
    decoded_masks: Dict[int, Dict[str, Any]] = {}

    for rec in imgs:
        xref = rec["xref"]
        smask = rec["smask"]
        if xref not in decoded_imgs:
            try:
                img_info = doc.extract_image(xref)
                if img_info:
                    orig_bytes = img_info.get("image") or b""
                    if orig_bytes and (len(orig_bytes) >= 1024 or smask > 0):
                        pil_img = _open_pil_from_pdf_xref(doc, xref, orig_bytes, rec.get("cs_name", ""))
                        if pil_img is not None:
                            decoded_imgs[xref] = {
                                "pil": pil_img,
                                "orig_bytes": orig_bytes,
                                "ext": img_info.get("ext", "png"),
                            }
            except Exception:
                pass

        if smask > 0 and smask not in decoded_masks:
            try:
                sm_info = doc.extract_image(smask)
                if sm_info:
                    sm_raw = sm_info.get("image") or b""
                    sm_pil = _open_pil_from_pdf_xref(doc, smask, sm_raw, "DeviceGray")
                    if sm_pil is not None:
                        sm_pil_l = sm_pil.convert("L")
                        decoded_masks[smask] = {
                            "pil_l": sm_pil_l,
                            "orig_bytes": sm_raw,
                            "extrema": sm_pil_l.getextrema(),
                            "orig_wh": (sm_info.get("width"), sm_info.get("height")),
                        }
            except Exception:
                pass

    doc.close()
    return (imgs, decoded_imgs, decoded_masks)


def _run_dpi_pass_on_doc(
    doc: pymupdf.Document,
    target_dpi: float,
    quality: int,
    subsampling: int = 2,
    fallback_scale: float = 1.0,
    max_dimension: int = 2400,
    aggressive_icc_strip: bool = False,
    decoded_cache: Optional[Tuple[Any, Any, Any]] = None,
) -> bytes:
    """
    Execute a smart DPI-aware compression pass on an already-opened PyMuPDF Document:
    - Vector text & paths remain 100% crisp vector (NEVER rasterized).
    - Images above target_dpi are downsampled proportionally to exact printed DPI.
    - Alpha /SMask cutouts are compressed synchronously & relinked safely (never lost or boxed).
    """
    if decoded_cache is not None:
        imgs, decoded_imgs, decoded_masks = decoded_cache
    else:
        imgs = get_pdf_images_info(doc)
        decoded_imgs, decoded_masks = None, None
    page_lookup = {i: doc[i] for i in range(len(doc))}

    # Track shared /SMask dimensions so multi-reference masks match largest base image
    smask_targets: Dict[int, Tuple[int, int, int]] = {}
    base_targets: Dict[int, Tuple[int, int]] = {}

    for rec in imgs:
        xref = rec["xref"]
        smask = rec["smask"]
        w, h = rec["width"], rec["height"]
        if w <= 0 or h <= 0:
            continue
        eff_dpi = rec["eff_dpi"]
        scale_ratio = fallback_scale
        if target_dpi > 0 and eff_dpi > target_dpi:
            scale_ratio = min(scale_ratio, target_dpi / eff_dpi)

        tw = max(1, int(round(w * scale_ratio)))
        th = max(1, int(round(h * scale_ratio)))
        if max(tw, th) > max_dimension:
            clamp = max_dimension / max(tw, th)
            tw = max(1, int(round(tw * clamp)))
            th = max(1, int(round(th * clamp)))

        base_targets[xref] = (tw, th)
        if smask > 0:
            prev = smask_targets.get(smask)
            if not prev or (tw * th) > (prev[0] * prev[1]):
                smask_targets[smask] = (tw, th, rec["page_idx"])

    # Compress each unique SMask once to clean DeviceGray
    compressed_smasks: Dict[int, bytes] = {}
    opaque_smasks = set()
    mask_orig_lens: Dict[int, int] = {}
    for sm_xref, (sm_tw, sm_th, pg_i) in smask_targets.items():
        try:
            if decoded_masks is not None:
                dm = decoded_masks.get(sm_xref)
                if not dm:
                    continue
                sm_raw = dm["orig_bytes"]
                sm_pil = dm["pil_l"]
                extrema = dm["extrema"]
                orig_wh = dm["orig_wh"]
            else:
                sm_info = doc.extract_image(sm_xref)
                if not sm_info:
                    continue
                sm_raw = sm_info.get("image") or b""
                sm_pil = _open_pil_from_pdf_xref(doc, sm_xref, sm_raw, "DeviceGray")
                if sm_pil is None:
                    continue
                sm_pil = sm_pil.convert("L")
                extrema = sm_pil.getextrema()
                orig_wh = (sm_info.get("width"), sm_info.get("height"))

            mask_orig_lens[sm_xref] = len(sm_raw)
            if extrema and extrema[0] >= 253:
                opaque_smasks.add(sm_xref)
                continue

            new_sm_bytes = _encode_pil_image(
                sm_pil,
                sm_tw,
                sm_th,
                max(36, min(88, quality + 8)),
                subsampling=0,
                force_jpeg=(sm_tw * sm_th > 20000),
            )
            if len(new_sm_bytes) < len(sm_raw) or (sm_tw, sm_th) != orig_wh:
                compressed_smasks[sm_xref] = new_sm_bytes
        except Exception:
            continue

    # Replace base images while preserving real transparency cutouts via /SMask relinking
    for rec in imgs:
        xref = rec["xref"]
        smask = rec["smask"]
        if xref not in base_targets:
            continue
        tw, th = base_targets[xref]
        page = page_lookup.get(rec["page_idx"])
        if page is None:
            continue

        try:
            if decoded_imgs is not None:
                di = decoded_imgs.get(xref)
                if not di:
                    continue
                orig_bytes = di["orig_bytes"]
                orig_ext = di["ext"]
                pil_img = di["pil"]
            else:
                img_info = doc.extract_image(xref)
                if not img_info:
                    continue
                orig_bytes = img_info.get("image") or b""
                orig_ext = img_info.get("ext", "png")
                pil_img = _open_pil_from_pdf_xref(doc, xref, orig_bytes, rec.get("cs_name", ""))
                if pil_img is None:
                    continue

            min_skip = 1024 if quality <= 45 else 3072
            if not orig_bytes or (len(orig_bytes) < min_skip and smask == 0):
                continue

            # For crisp 1-bit monochrome scans, test both grayscale JPEG & PNG and keep smallest
            new_bytes = _encode_pil_image(pil_img, tw, th, quality, subsampling=subsampling, force_jpeg=True)
            if rec.get("bpc") == 1 or orig_ext == "png":
                if len(new_bytes) >= len(orig_bytes):
                    alt_png = _encode_pil_image(pil_img, tw, th, quality, subsampling=subsampling, force_jpeg=False)
                    if len(alt_png) < len(new_bytes):
                        new_bytes = alt_png

            has_real_smask = smask > 0 and smask not in opaque_smasks
            orig_mask_len = mask_orig_lens.get(smask, 0)
            if smask > 0 and orig_mask_len == 0 and decoded_masks is None:
                try:
                    mi = doc.extract_image(smask)
                    orig_mask_len = len(mi.get("image", b"")) if mi else 0
                except Exception:
                    pass

            # Only replace if combined size strictly shrinks vs original base + mask
            if smask > 0 and not has_real_smask:
                # Opaque white mask can be flattened cleanly
                if len(new_bytes) < (len(orig_bytes) + orig_mask_len):
                    page.replace_image(xref, stream=new_bytes)
            elif len(new_bytes) < len(orig_bytes) or has_real_smask and (smask in compressed_smasks):
                if len(new_bytes) < len(orig_bytes):
                    page.replace_image(xref, stream=new_bytes)
                    if has_real_smask:
                        if smask in compressed_smasks:
                            page.replace_image(smask, stream=compressed_smasks[smask])
                            doc.xref_set_key(smask, "ColorSpace", "/DeviceGray")
                        doc.xref_set_key(xref, "SMask", f"{smask} 0 R")
                elif has_real_smask and smask in compressed_smasks:
                    page.replace_image(smask, stream=compressed_smasks[smask])
                    doc.xref_set_key(smask, "ColorSpace", "/DeviceGray")
        except Exception:
            continue

    if aggressive_icc_strip:
        _strip_bloat_and_subset(doc, strip_icc_over_kb=8)

    return _save_optimized_bytes(doc)


def apply_compression_pass(
    input_pdf_path: str,
    scale: float,
    quality: int,
    max_dimension: int = 2200,
    target_dpi: float = 0.0,
    subsampling: int = 2,
    base_pdf_bytes: Optional[bytes] = None,
    decoded_cache: Optional[Tuple[Any, Any, Any]] = None,
) -> bytes:
    """
    Execute a single compression pass on PDF keeping text/vectors vector-sharp,
    recompressing image xrefs and structurally optimizing streams.
    """
    if base_pdf_bytes is None:
        base_pdf_bytes = _prepare_lossless_base_pdf(input_pdf_path)

    doc = pymupdf.open(stream=base_pdf_bytes, filetype="pdf")
    out_pdf_bytes = _run_dpi_pass_on_doc(
        doc,
        target_dpi=target_dpi,
        quality=quality,
        subsampling=subsampling,
        fallback_scale=scale,
        max_dimension=max_dimension,
        decoded_cache=decoded_cache,
    )
    doc.close()
    return out_pdf_bytes


def compress_pdf_to_target_size(
    input_pdf_path: str,
    target_size_kb: int,
    output_pdf_path: str,
    tolerance_pct: float = 0.05,
) -> Dict[str, Any]:
    """
    Smart Target Size Optimizer (iLovePDF Multi-Tier Engine):
    1. Performs lossless structural optimization first (/PieceInfo, XMP metadata, thumbs,
       font subsetting, object streams). If already <= target, returns zero-loss output!
    2. Binary-searches a 13-tier DPI+Quality curve preserving 100% vector text sharpness.
    3. Runs fine quality refinement probes to maximize sharpness right under target_size_kb.
    """
    orig_size = os.path.getsize(input_pdf_path)
    # Match both decimal MB viewers (macOS/web portals: 1 MB = 1,000,000 B) and KB viewers cleanly
    target_bytes = int(target_size_kb * 1000)

    # Stage 1: Pure Lossless Structural Optimization + Font Subsetting + /PieceInfo Scrub
    lossless_bytes = _prepare_lossless_base_pdf(input_pdf_path)
    lossless_size = len(lossless_bytes)

    if orig_size <= target_bytes or lossless_size <= target_bytes:
        final_bytes = lossless_bytes if lossless_size < orig_size else open(input_pdf_path, "rb").read()
        with open(output_pdf_path, "wb") as f:
            f.write(final_bytes)

        final_size = len(final_bytes)
        reduction = round(max(0.0, (1.0 - final_size / max(1, orig_size)) * 100), 1)
        if orig_size <= target_bytes:
            label = "Lossless Clean (Ukuran Asli Sudah Di Bawah Target)"
            note = "Dokumen asli sudah memenuhi target ukuran, dilakukan pembersihan struktur tanpa penurunan kualitas."
        else:
            label = "Lossless Structural Optimization (iLovePDF Zero-Loss Mode)"
            note = (
                f"Target tercapai 100% tanpa menurunkan resolusi/kualitas visual "
                f"dengan pembersihan metadata, PieceInfo, Object Streams & Font Subsetting (hemat {reduction}%)."
            )
        return {
            "success": True,
            "original_size": orig_size,
            "compressed_size": final_size,
            "reduction_pct": reduction,
            "target_size_kb": target_size_kb,
            "target_met": True,
            "quality_profile": label,
            "iterations": 1,
            "note": note,
        }

    # Stage 2: Effective-DPI & Quality Ladder (from crisp ultra-HD down to tight portal cap)
    profiles = [
        {"dpi": 240, "scale": 1.0,  "quality": 90, "dim": 2400, "sub": 0, "label": "Sangat Tinggi (240 DPI, Q=90)"},
        {"dpi": 200, "scale": 1.0,  "quality": 85, "dim": 2200, "sub": 0, "label": "Tinggi (200 DPI, Q=85)"},
        {"dpi": 175, "scale": 0.92, "quality": 80, "dim": 2000, "sub": 2, "label": "Prima (175 DPI, Q=80)"},
        {"dpi": 150, "scale": 0.85, "quality": 76, "dim": 1800, "sub": 2, "label": "Optimal (150 DPI, Q=76)"},
        {"dpi": 135, "scale": 0.78, "quality": 70, "dim": 1650, "sub": 2, "label": "Seimbang (135 DPI, Q=70)"},
        {"dpi": 120, "scale": 0.70, "quality": 64, "dim": 1500, "sub": 2, "label": "Standar Web (120 DPI, Q=64)"},
        {"dpi": 105, "scale": 0.62, "quality": 58, "dim": 1350, "sub": 2, "label": "Efisien (105 DPI, Q=58)"},
        {"dpi": 96,  "scale": 0.54, "quality": 52, "dim": 1200, "sub": 2, "label": "Kompak (96 DPI, Q=52)"},
        {"dpi": 85,  "scale": 0.48, "quality": 46, "dim": 1080, "sub": 2, "label": "Ringkas (85 DPI, Q=46)"},
        {"dpi": 75,  "scale": 0.42, "quality": 40, "dim": 960,  "sub": 2, "label": "Ekonomis (75 DPI, Q=40)"},
        {"dpi": 66,  "scale": 0.36, "quality": 34, "dim": 840,  "sub": 2, "label": "Hemat Kuota (66 DPI, Q=34)"},
        {"dpi": 56,  "scale": 0.30, "quality": 28, "dim": 720,  "sub": 2, "label": "Agresif (56 DPI, Q=28)"},
        {"dpi": 48,  "scale": 0.25, "quality": 22, "dim": 620,  "sub": 2, "label": "Ultra Ringkas (48 DPI, Q=22)"},
    ]

    decoded_cache = _build_decoded_cache(lossless_bytes)

    low = 0
    high = len(profiles) - 1
    best_candidate_bytes: Optional[bytes] = None
    best_candidate_idx: Optional[int] = None
    best_custom_label: Optional[str] = None
    smallest_achieved_bytes: Optional[bytes] = None
    smallest_achieved_idx = len(profiles) - 1
    iterations_run = 1  # including lossless baseline

    while low <= high:
        mid = (low + high) // 2
        p = profiles[mid]
        iterations_run += 1

        test_bytes = apply_compression_pass(
            input_pdf_path,
            scale=p["scale"],
            quality=p["quality"],
            max_dimension=p["dim"],
            target_dpi=p["dpi"],
            subsampling=p["sub"],
            base_pdf_bytes=lossless_bytes,
            decoded_cache=decoded_cache,
        )
        current_len = len(test_bytes)

        if smallest_achieved_bytes is None or current_len < len(smallest_achieved_bytes):
            smallest_achieved_bytes = test_bytes
            smallest_achieved_idx = mid

        if current_len <= target_bytes:
            best_candidate_bytes = test_bytes
            best_candidate_idx = mid
            high = mid - 1
        else:
            low = mid + 1

    # Quality Recovery Polish: if best candidate sits noticeably below budget (<88% of target)
    # and higher rung exceeded target, interpolate quality/DPI so user gets crispest possible output!
    if (
        best_candidate_bytes is not None
        and best_candidate_idx is not None
        and best_candidate_idx > 0
        and len(best_candidate_bytes) < target_bytes * 0.88
    ):
        p_ok = profiles[best_candidate_idx]
        p_hi = profiles[best_candidate_idx - 1]
        q_lo = p_ok["quality"]
        q_hi = p_hi["quality"]
        mid_dpi = int(round((p_ok["dpi"] + p_hi["dpi"]) / 2.0))
        mid_scale = round((p_ok["scale"] + p_hi["scale"]) / 2.0, 3)
        mid_dim = int(round((p_ok["dim"] + p_hi["dim"]) / 2.0))

        for _ in range(2):
            if q_hi - q_lo < 3:
                break
            q_try = (q_lo + q_hi + 1) // 2
            iterations_run += 1
            probe_bytes = apply_compression_pass(
                input_pdf_path,
                scale=mid_scale,
                quality=q_try,
                max_dimension=mid_dim,
                target_dpi=mid_dpi,
                subsampling=p_ok["sub"],
                base_pdf_bytes=lossless_bytes,
                decoded_cache=decoded_cache,
            )
            if len(probe_bytes) <= target_bytes and len(probe_bytes) > len(best_candidate_bytes):
                best_candidate_bytes = probe_bytes
                best_custom_label = f"Optimal Presisi ({mid_dpi} DPI, Q={q_try})"
                q_lo = q_try
            else:
                q_hi = q_try - 1

    # Stage 3 Rescue: if still above target on extreme docs, strip heavy ICC & allow final 38 DPI pass
    if best_candidate_bytes is None and (smallest_achieved_bytes is None or len(smallest_achieved_bytes) > target_bytes):
        iterations_run += 1
        doc_rescue = pymupdf.open(stream=lossless_bytes, filetype="pdf")
        rescue_bytes = _run_dpi_pass_on_doc(
            doc_rescue,
            target_dpi=38,
            quality=18,
            subsampling=2,
            fallback_scale=0.20,
            max_dimension=520,
            aggressive_icc_strip=True,
            decoded_cache=decoded_cache,
        )
        doc_rescue.close()
        if smallest_achieved_bytes is None or len(rescue_bytes) < len(smallest_achieved_bytes):
            smallest_achieved_bytes = rescue_bytes
        if len(rescue_bytes) <= target_bytes:
            best_candidate_bytes = rescue_bytes
            best_custom_label = "Kompresi Ekstrem Maksimal (38 DPI, Q=18)"

    if best_candidate_bytes is None:
        # Ensure we never output larger than lossless or original
        if smallest_achieved_bytes is not None and len(smallest_achieved_bytes) < lossless_size:
            final_bytes = smallest_achieved_bytes
            final_label = profiles[smallest_achieved_idx]["label"]
        else:
            final_bytes = lossless_bytes
            final_label = "Lossless Structural Optimization"
        target_met = len(final_bytes) <= target_bytes
        note = (
            f"Batas optimal kompresi tercapai di {round(len(final_bytes) / 1024, 1)} KB "
            f"(elemen teks vektor & font tetap 100% tajam)."
        )
    else:
        final_bytes = best_candidate_bytes
        final_label = best_custom_label or profiles[best_candidate_idx]["label"]
        target_met = True
        note = f"Target terpenuhi secara presisi dengan profil '{final_label}' (teks vektor 100% utuh)."

    with open(output_pdf_path, "wb") as f:
        f.write(final_bytes)

    final_size = len(final_bytes)
    reduction_pct = round(max(0.0, (1.0 - final_size / max(1, orig_size)) * 100), 1)
    return {
        "success": True,
        "original_size": orig_size,
        "compressed_size": final_size,
        "reduction_pct": reduction_pct,
        "target_size_kb": target_size_kb,
        "target_met": target_met,
        "quality_profile": final_label,
        "iterations": iterations_run,
        "note": note,
    }


def compress_pdf_preset(
    input_pdf_path: str,
    preset: str,
    output_pdf_path: str,
) -> Dict[str, Any]:
    """Compress PDF using iLovePDF-aligned presets (low, recommended, extreme) + lossless cleanup."""
    if preset not in PRESETS:
        preset = "recommended"
    p = PRESETS[preset]
    orig_size = os.path.getsize(input_pdf_path)

    lossless_bytes = _prepare_lossless_base_pdf(input_pdf_path)
    out_bytes = apply_compression_pass(
        input_pdf_path,
        scale=p["scale"],
        quality=p["quality"],
        max_dimension=2200 if preset == "low" else (1800 if preset == "recommended" else 1200),
        target_dpi=p["dpi"],
        subsampling=p["subsampling"],
        base_pdf_bytes=lossless_bytes,
    )
    if len(lossless_bytes) < len(out_bytes):
        out_bytes = lossless_bytes

    with open(output_pdf_path, "wb") as f:
        f.write(out_bytes)

    final_size = len(out_bytes)
    return {
        "success": True,
        "original_size": orig_size,
        "compressed_size": final_size,
        "reduction_pct": round(max(0.0, (1.0 - final_size / max(1, orig_size)) * 100), 1),
        "target_met": True,
        "quality_profile": p["label"],
        "iterations": 1,
        "note": f"Dikompresi menggunakan {p['label']} dengan pembersihan metadata, Font Subsetting & teks vektor utuh.",
    }
