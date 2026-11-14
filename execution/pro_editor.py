"""
PRO Visual PDF Editor Engine (Layer 3: Deterministic Execution)
Provides high-precision scanning of text spans with exact bounding boxes,
auto-detection of font family, font size, bold, italic, underline, and colors.
Renders pages to high-resolution base64 images for interactive Web UI editing,
and provides seamless back-rendering of modified text, newly inserted text, and user-uploaded PC images.
"""

import os
import io
import re
import math
import base64
import tempfile
from typing import Dict, Any, List, Optional, Tuple
import pymupdf
from PIL import Image

def detect_font_properties(font_name: str, flags: int = 0) -> Dict[str, Any]:
    """
    Analyzes PDF font name and flags to determine:
    - Clean web font family (Tahoma, Bookman Old Style, Arial, Times New Roman, etc.)
    - Standard PyMuPDF font code (tiro, tibo, tiit, tibi, helv, hebo, heit, hebi, cour, cobo, etc.)
    - is_bold (bool)
    - is_italic (bool)
    """
    fn = font_name.lower()
    
    # Check bold and italic using flags and font suffix markers
    is_bold = bool(flags & 16) or bool(re.search(r'(bold|black|heavy|semibold|demi|w7|w8|w9|[-,_]bd\b|[-,_]b\b)', fn))
    is_italic = bool(flags & 2) or bool(re.search(r'(italic|oblique|slanted|inclined|[-,_]it\b)', fn))

    def _pick_code(family_prefix: str) -> str:
        if family_prefix == "ti":
            return "tibi" if (is_bold and is_italic) else ("tibo" if is_bold else ("tiit" if is_italic else "tiro"))
        if family_prefix == "co":
            return "cobi" if (is_bold and is_italic) else ("cobo" if is_bold else ("coit" if is_italic else "cour"))
        return "hebi" if (is_bold and is_italic) else ("hebo" if is_bold else ("heit" if is_italic else "helv"))

    # Determine family cleanly (prevent 'sans-serif' from matching 'serif')
    is_sans_explicit = ("sans" in fn) or any(w in fn for w in ["arial", "helvetica", "tahoma", "verdana", "calibri", "candara", "segoe", "roboto", "inter"])

    if any(w in fn for w in ["bookman", "urwbookman"]):
        web_font = "'Bookman Old Style', 'URW Bookman', Georgia, serif"
        font_display = "Bookman Old Style"
        font_code = _pick_code("ti")
    elif "tahoma" in fn:
        web_font = "Tahoma, Geneva, Verdana, sans-serif"
        font_display = "Tahoma"
        font_code = _pick_code("he")
    elif "verdana" in fn:
        web_font = "Verdana, Geneva, sans-serif"
        font_display = "Verdana"
        font_code = _pick_code("he")
    elif any(w in fn for w in ["calibri", "candara"]):
        web_font = "Calibri, Candara, sans-serif"
        font_display = "Calibri"
        font_code = _pick_code("he")
    elif "segoe" in fn:
        web_font = "'Segoe UI', Roboto, sans-serif"
        font_display = "Segoe UI"
        font_code = _pick_code("he")
    elif "georgia" in fn:
        web_font = "Georgia, serif"
        font_display = "Georgia"
        font_code = _pick_code("ti")
    elif any(w in fn for w in ["courier", "mono", "consolas", "menlo", "monaco"]):
        web_font = "'Courier New', Courier, monospace"
        font_display = "Courier New"
        font_code = _pick_code("co")
    elif (not is_sans_explicit) and (any(w in fn for w in ["times", "roman", "cambria", "minion", "garamond", "palatino"]) or ("serif" in fn)):
        web_font = "'Times New Roman', Times, serif"
        font_display = "Times New Roman"
        font_code = _pick_code("ti")
    else:
        # Default clean Sans-Serif (Arial / Helvetica)
        web_font = "Arial, Helvetica, sans-serif"
        font_display = "Arial"
        font_code = _pick_code("he")
            
    return {
        "web_font": web_font,
        "font_display": font_display,
        "font_code": font_code,
        "is_bold": is_bold,
        "is_italic": is_italic
    }

def sample_background_color(page: pymupdf.Page, rect: pymupdf.Rect) -> Tuple[float, float, float]:
    """
    Sample the average LIGHT paper color around a bounding box (filtering dark ink/stamps)
    to ensure clean inpainting without dark gray patches near stamps or QR codes.
    """
    try:
        expanded = pymupdf.Rect(
            max(0, rect.x0 - 3),
            max(0, rect.y0 - 3),
            min(page.rect.width, rect.x1 + 3),
            min(page.rect.height, rect.y1 + 3)
        )
        pix = page.get_pixmap(clip=expanded, dpi=72)
        if pix.width > 0 and pix.height > 0:
            light_samples = []
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            w, h = img.size
            edge_pixels = []
            for x in [0, w - 1]:
                for y in range(h):
                    edge_pixels.append(img.getpixel((x, y)))
            for y in [0, h - 1]:
                for x in range(w):
                    edge_pixels.append(img.getpixel((x, y)))
            for px in edge_pixels:
                brightness = (px[0] * 299 + px[1] * 587 + px[2] * 114) / 1000.0
                if brightness >= 195.0:
                    light_samples.append(px)
            if light_samples:
                avg_r = sum(s[0] for s in light_samples) / (len(light_samples) * 255.0)
                avg_g = sum(s[1] for s in light_samples) / (len(light_samples) * 255.0)
                avg_b = sum(s[2] for s in light_samples) / (len(light_samples) * 255.0)
                return (avg_r, avg_g, avg_b)
    except Exception:
        pass
    return (1.0, 1.0, 1.0)

def get_page_editor_data(pdf_path: str, page_idx: int = 0, scale: float = 1.5, illustrator_mode: bool = False) -> Dict[str, Any]:
    """
    Scans a PDF page and returns:
    1. High-resolution rendered page image (base64 Data URL) for the canvas stage.
    2. Precise span-level text blocks with detected font, size, bold, italic, baseline origin,
       ascender/descender, rotation angle, and coordinates.
    3. When illustrator_mode=True: extracts embedded @font-face font binaries + renders clean
       raster/vector background layer (rendered_bg_image) with vector text stripped non-destructively.
    """
    doc = pymupdf.open(pdf_path)
    total_pages = len(doc)
    if total_pages == 0:
        raise ValueError("Dokumen PDF kosong.")
        
    page_idx = max(0, min(page_idx, total_pages - 1))
    page = doc[page_idx]
    page_rect = page.rect
    
    # Render page to high-res image
    mat = pymupdf.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    img_bytes = pix.tobytes("png")
    b64_img = base64.b64encode(img_bytes).decode("ascii")
    rendered_image = f"data:image/png;base64,{b64_img}"

    # Map embedded PDF fonts (xref lookup + optional @font-face Data URI for Illustrator mode)
    font_lookup: Dict[str, Dict[str, Any]] = {}
    embedded_fonts: Dict[str, Dict[str, Any]] = {}
    try:
        for finfo in page.get_fonts(full=True):
            fxref = int(finfo[0])
            fext = (finfo[1] or "").lower()
            fbasename = finfo[3] or ""
            fref = finfo[4] or ""
            clean_name = fbasename.split("+")[-1] if "+" in fbasename else fbasename
            stripped_name = re.sub(r'[\s,\-_]+(regular|roman|normal|book|mt|psmt)$', '', clean_name, flags=re.IGNORECASE).strip()
            is_subset = ("+" in fbasename and len(fbasename.split("+")[0]) == 6)
            alias = f"PdfFont_{fxref}"
            entry = {
                "xref": fxref,
                "ext": fext,
                "basename": fbasename,
                "clean_name": clean_name,
                "alias": alias,
                "is_subset": is_subset,
                "space_w_1pt": 0.28,
            }
            candidate_keys = [
                fbasename.lower(),
                clean_name.lower(),
                stripped_name.lower(),
                re.sub(r'[^a-z0-9]', '', clean_name.lower()),
                re.sub(r'[^a-z0-9]', '', stripped_name.lower()),
                fref.lower(),
            ]
            for key in candidate_keys:
                if key and key not in font_lookup:
                    font_lookup[key] = entry
            if fext in ("ttf", "otf"):
                try:
                    _, extracted_ext, _, fbuf = doc.extract_font(fxref)
                    if fbuf and 500 < len(fbuf) <= 1_800_000:
                        try:
                            f_probe = pymupdf.Font(fontbuffer=fbuf)
                            sw1 = f_probe.text_length(" ", fontsize=1.0)
                            if 0.12 <= sw1 <= 0.8:
                                entry["space_w_1pt"] = sw1
                        except Exception:
                            pass
                        if alias not in embedded_fonts:
                            mime = "font/otf" if (extracted_ext or fext).lower() == "otf" else "font/ttf"
                            embedded_fonts[alias] = {
                                "alias": alias,
                                "xref": fxref,
                                "family": clean_name,
                                "is_subset": is_subset,
                                "data_uri": f"data:{mime};base64,{base64.b64encode(fbuf).decode('ascii')}"
                            }
                except Exception:
                    pass
    except Exception:
        pass
    
    # Collect vector horizontal lines for underline detection
    h_lines = []
    try:
        drawings = page.get_drawings()
        for d in drawings:
            r = d.get("rect")
            if r and (r.y1 - r.y0) <= 3 and (r.x1 - r.x0) >= 8:
                h_lines.append(r)
            for item in d.get("items", []):
                if item[0] == "l":
                    p1, p2 = item[1], item[2]
                    if abs(p1.y - p2.y) <= 2 and abs(p1.x - p2.x) >= 8:
                        h_lines.append(pymupdf.Rect(min(p1.x, p2.x), min(p1.y, p2.y), max(p1.x, p2.x), max(p1.y, p2.y)))
    except Exception:
        pass

    def check_underline(bbox: List[float]) -> bool:
        span_w = bbox[2] - bbox[0]
        if span_w <= 0:
            return False
        for lr in h_lines:
            if abs(lr.y0 - bbox[3]) <= 4 or abs(lr.y1 - bbox[3]) <= 4:
                overlap_x0 = max(bbox[0], lr.x0)
                overlap_x1 = min(bbox[2], lr.x1)
                overlap_w = max(0, overlap_x1 - overlap_x0)
                line_w = lr.x1 - lr.x0
                if overlap_w >= span_w * 0.5 and line_w <= span_w * 1.35:
                    return True
        return False

    def detect_align(bbox: List[float], text: str) -> str:
        box_w = bbox[2] - bbox[0]
        mid_x = (bbox[0] + bbox[2]) / 2.0
        txt_lower = text.strip().lower()
        # Colon form values (": ANDREAS...") and left-margin body lines stay left-aligned
        if txt_lower.startswith(":"):
            return "left"
        if bbox[1] < 160.0 and bbox[0] > 85.0 and box_w < page_rect.width * 0.72:
            if any(txt_lower.startswith(k) for k in ["pemerintah", "kecamatan", "kelurahan", "jl.", "jalan ", "surabaya"]):
                return "center"
        if any(txt_lower.startswith(k) for k in ["surat keterangan", "surat pernyataan", "surat tugas", "nomor :", "nomor:"]):
            return "center"
        # Full-width or left-margin paragraph lines stay left-aligned
        if box_w > page_rect.width * 0.58 or bbox[0] < 100.0:
            return "left"
        if abs(mid_x - page_rect.width / 2.0) < 30.0:
            return "center"
        return "left"

    # High-precision span-level text extraction
    page_dict = page.get_text("dict")
    text_blocks = []
    all_raw_span_bboxes: List[List[float]] = []

    block_counter = 0
    for b_idx, block in enumerate(page_dict.get("blocks", [])):
        if block.get("type") != 0:
            continue
            
        for l_idx, line in enumerate(block.get("lines", [])):
            spans = line.get("spans", [])
            if not spans:
                continue
            line_dir = line.get("dir") or (1.0, 0.0)
            angle_deg = round(math.degrees(math.atan2(line_dir[1], line_dir[0])), 2) if (abs(line_dir[0] - 1.0) > 0.01 or abs(line_dir[1]) > 0.01) else 0.0

            # Group spans smartly:
            # If two consecutive spans have a small horizontal gap (< font_size * 0.9)
            # and same font/style, group them.
            # BUT if there is a large gap (such as table columns or separate signature blocks), KEEP THEM SEPARATE!
            current_group = []
            
            for s_idx, span in enumerate(spans):
                stext = (span.get("text", "") or "").replace("\xa0", " ")
                if not stext.strip():
                    continue
                    
                font_name = span.get("font", "Helvetica")
                font_size = round(span.get("size", 11), 2)
                flags = span.get("flags", 0)
                font_info = detect_font_properties(font_name, flags)
                span_clean_f = font_name.split("+")[-1] if "+" in font_name else font_name
                span_compact_f = re.sub(r'[^a-z0-9]', '', span_clean_f.lower())
                f_meta = (
                    font_lookup.get(font_name.lower())
                    or font_lookup.get(span_clean_f.lower())
                    or font_lookup.get(span_compact_f)
                )
                if f_meta is None and len(span_compact_f) >= 8:
                    # Match truncated PostScript font names such as 'DejaVuSerifCondensed-Bol' -> 'DejaVuSerifCondensed-Bold'
                    best_match = None
                    best_gap = 999
                    for k_entry in font_lookup.values():
                        cand_c = re.sub(r'[^a-z0-9]', '', k_entry.get("clean_name", "").lower())
                        if cand_c.startswith(span_compact_f) and (len(cand_c) - len(span_compact_f)) < best_gap:
                            best_gap = len(cand_c) - len(span_compact_f)
                            best_match = k_entry
                    f_meta = best_match
                pdf_font_xref = f_meta["xref"] if f_meta else None
                pdf_font_alias = f_meta["alias"] if (f_meta and f_meta["alias"] in embedded_fonts) else None
                norm_space_w = (f_meta["space_w_1pt"] if f_meta else 0.28) * font_size

                # Check color
                color_int = span.get("color", 0)
                r = (color_int >> 16) & 255
                g = (color_int >> 8) & 255
                b = color_int & 255
                color_hex = f"#{r:02x}{g:02x}{b:02x}"
                s_bbox = [round(c, 2) for c in span.get("bbox", [0, 0, 0, 0])]
                all_raw_span_bboxes.append(s_bbox)
                s_origin = span.get("origin") or [s_bbox[0], s_bbox[1] + font_size * 0.88]
                s_asc = round(float(span.get("ascender") or 0.88), 4)
                s_orig_x = round(float(s_origin[0]), 2)
                s_base_y = round(float(s_origin[1]), 2)
                s_web_font = f"'{pdf_font_alias}', {font_info['web_font']}" if pdf_font_alias else font_info["web_font"]

                # Check for large internal spaces inside the span (e.g. tabs or multi-space column separators)
                # Split if span contains 3 or more spaces
                internal_parts = re.split(r'(\s{3,})', stext)
                if len(internal_parts) > 1:
                    # Multi-column in a single span
                    span_width = s_bbox[2] - s_bbox[0]
                    total_chars = max(1, len(stext))
                    cur_x = s_bbox[0]
                    
                    for part in internal_parts:
                        part_len = len(part)
                        part_w = (part_len / total_chars) * span_width
                        if part.strip():
                            sub_bbox = [round(cur_x, 2), s_bbox[1], round(cur_x + part_w, 2), s_bbox[3]]
                            block_counter += 1
                            text_blocks.append({
                                "id": f"blk_{page_idx}_{block_counter}",
                                "bbox": sub_bbox,
                                "orig_bbox": list(sub_bbox),
                                "text": part.strip(),
                                "font": font_info["font_display"],
                                "web_font": s_web_font,
                                "font_code": font_info["font_code"],
                                "size": font_size,
                                "is_bold": font_info["is_bold"],
                                "is_italic": font_info["is_italic"],
                                "is_underline": check_underline(sub_bbox),
                                "align": detect_align(sub_bbox, part.strip()),
                                "color": color_hex,
                                "orig_origin_x": sub_bbox[0],
                                "orig_baseline_y": s_base_y,
                                "ascender": s_asc,
                                "angle_deg": angle_deg,
                                "pdf_font_xref": pdf_font_xref,
                                "pdf_font_alias": pdf_font_alias
                            })
                        cur_x += part_w
                    continue
                
                # Normal span: decide whether to group with previous on the same horizontal line
                if current_group:
                    prev = current_group[-1]
                    prev_bbox = prev["bbox"]
                    gap_x = s_bbox[0] - prev_bbox[2]

                    font_family_match = (
                        prev["font"] == font_info["font_display"] and
                        abs(prev["size"] - font_size) < 1.5
                    )
                    tight_split = (
                        len(prev["text"]) <= 2 and
                        -4.0 <= gap_x <= 2.5 and
                        abs(prev["size"] - font_size) < 1.5
                    )
                    # Group normal word spacing even across inline Bold/Regular/Italic transitions (e.g. "adalah " + "berdomisili...")
                    # while keeping table/form columns (large gaps) strictly separate!
                    can_merge = (
                        gap_x >= -4.0 and
                        gap_x < font_size * 1.1 and
                        (font_family_match or tight_split)
                    )

                    if can_merge:
                        joiner = " " if (gap_x > 1.2 or stext.startswith(" ") or prev.get("_raw_trailing_space")) else ""
                        seg_text = stext.strip()
                        seg_underline = check_underline(s_bbox)
                        prev_runs = prev.setdefault("runs", [{
                            "text": prev["text"],
                            "is_bold": prev["is_bold"],
                            "is_italic": prev["is_italic"],
                            "is_underline": prev["is_underline"],
                            "color": prev["color"]
                        }])
                        prev_trim = prev["text"].strip()
                        is_prefix_marker = bool(re.match(r'^([a-zA-Z0-9]{1,3}[.)]|:)$', prev_trim))
                        min_tab_extra = 0.25 if is_prefix_marker else max(1.8, font_size * 0.20)
                        is_tab_gap = bool(joiner) and ((gap_x - norm_space_w) >= min_tab_extra)
                        col_dx = round(s_orig_x - prev.get("orig_origin_x", prev_bbox[0]), 2) if is_tab_gap else None

                        last_run = prev_runs[-1]
                        if (
                            not is_tab_gap and
                            last_run["is_bold"] == font_info["is_bold"] and
                            last_run["is_italic"] == font_info["is_italic"] and
                            last_run["is_underline"] == seg_underline and
                            last_run["color"] == color_hex
                        ):
                            last_run["text"] += joiner + seg_text
                        else:
                            if joiner and not is_tab_gap:
                                last_run["text"] += joiner
                                new_run_txt = seg_text
                            else:
                                new_run_txt = (joiner + seg_text) if is_tab_gap else seg_text
                            run_obj: Dict[str, Any] = {
                                "text": new_run_txt,
                                "is_bold": font_info["is_bold"],
                                "is_italic": font_info["is_italic"],
                                "is_underline": seg_underline,
                                "color": color_hex
                            }
                            if col_dx is not None and col_dx > 0:
                                run_obj["col_dx"] = col_dx
                                run_obj["tab_gap"] = round(gap_x, 2)
                                if is_prefix_marker and not prev.get("tab_prefix"):
                                    prev["tab_prefix"] = prev_trim
                                    prev["tab_col_dx"] = col_dx
                                    prev["tab_gap"] = round(gap_x, 2)
                            prev_runs.append(run_obj)
                        prev["text"] = (prev["text"] + joiner + seg_text).strip()
                        prev["_raw_trailing_space"] = stext.endswith(" ")
                        prev["bbox"][0] = min(prev["bbox"][0], s_bbox[0])
                        prev["bbox"][1] = min(prev["bbox"][1], s_bbox[1])
                        prev["bbox"][2] = max(prev["bbox"][2], s_bbox[2])
                        prev["bbox"][3] = max(prev["bbox"][3], s_bbox[3])
                        prev["orig_bbox"] = list(prev["bbox"])
                        prev["is_underline"] = prev["is_underline"] and seg_underline
                        prev["align"] = detect_align(prev["bbox"], prev["text"])
                        continue

                # Create new entry
                block_counter += 1
                s_underline = check_underline(s_bbox)
                clean_s = stext.strip()
                item_dict = {
                    "id": f"blk_{page_idx}_{block_counter}",
                    "bbox": s_bbox,
                    "orig_bbox": list(s_bbox),
                    "text": clean_s,
                    "_raw_trailing_space": stext.endswith(" "),
                    "font": font_info["font_display"],
                    "web_font": s_web_font,
                    "font_code": font_info["font_code"],
                    "size": font_size,
                    "is_bold": font_info["is_bold"],
                    "is_italic": font_info["is_italic"],
                    "is_underline": s_underline,
                    "align": detect_align(s_bbox, clean_s),
                    "color": color_hex,
                    "orig_origin_x": s_orig_x,
                    "orig_baseline_y": s_base_y,
                    "ascender": s_asc,
                    "angle_deg": angle_deg,
                    "pdf_font_xref": pdf_font_xref,
                    "pdf_font_alias": pdf_font_alias,
                    "runs": [{
                        "text": clean_s,
                        "is_bold": font_info["is_bold"],
                        "is_italic": font_info["is_italic"],
                        "is_underline": s_underline,
                        "color": color_hex
                    }]
                }
                current_group.append(item_dict)
                text_blocks.append(item_dict)

    # Merge contiguous wrapped lines into unified Paragraph edit fields (preserving inline Bold/Regular runs)
    text_blocks = _merge_paragraph_blocks(text_blocks, page_rect.width, page_idx)
                
    # Strip internal scratch keys from extracted blocks and assign Adobe bbox_type (1=Paragraph, 2=Form/List)
    for tb in text_blocks:
        tb.pop("_raw_trailing_space", None)
        tb["orig_bbox"] = list(tb["bbox"])
        if "bbox_type" not in tb:
            txt_s = (tb.get("text") or "").strip()
            tb["bbox_type"] = 2 if _PARA_FORM_LINE_RE.match(txt_s) else 1

    meta = doc.metadata or {}
    creator_raw = ((meta.get("creator") or "") + " " + (meta.get("producer") or "")).lower()
    page_area = max(1.0, page_rect.width * page_rect.height)
    has_fullpage_raster = False
    image_blocks: List[Dict[str, Any]] = []
    seen_img_rects: List[pymupdf.Rect] = []
    raster_layers_count = 0
    try:
        all_imgs = page.get_images(full=True)
        raster_layers_count = len(all_imgs)
        for img_info in all_imgs:
            xref = img_info[0]
            for r in page.get_image_rects(xref):
                rw, rh = r.width, r.height
                area_ratio = r.get_area() / page_area
                if area_ratio >= 0.55:
                    has_fullpage_raster = True
                    continue
                if rw < 16 or rh < 16 or area_ratio < 0.0012:
                    continue
                is_dup = any(
                    abs(r.x0 - sr.x0) < 4 and abs(r.y0 - sr.y0) < 4 and abs(r.x1 - sr.x1) < 4 and abs(r.y1 - sr.y1) < 4
                    for sr in seen_img_rects
                )
                if is_dup:
                    continue
                seen_img_rects.append(r)
                image_blocks.append({
                    "id": f"img_{page_idx}_{len(image_blocks) + 1}",
                    "xref": xref,
                    "bbox": [round(r.x0, 2), round(r.y0, 2), round(r.x1, 2), round(r.y1, 2)],
                    "bbox_type": 3
                })
    except Exception:
        has_fullpage_raster = False

    # Illustrator Mode Layer Separation: Render background raster/artwork layer with vector text non-destructively stripped
    rendered_bg_image = None
    if illustrator_mode and all_raw_span_bboxes:
        try:
            bg_doc = pymupdf.open()
            bg_doc.insert_pdf(doc, from_page=page_idx, to_page=page_idx)
            bg_page = bg_doc[0]
            for sb in all_raw_span_bboxes:
                sr = pymupdf.Rect(sb[0] - 0.5, sb[1] - 0.5, sb[2] + 0.5, sb[3] + 0.5)
                bg_page.add_redact_annot(sr, fill=None)
            bg_page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)
            bg_pix = bg_page.get_pixmap(matrix=mat, alpha=False)
            rendered_bg_image = f"data:image/png;base64,{base64.b64encode(bg_pix.tobytes('png')).decode('ascii')}"
            bg_doc.close()
        except Exception:
            rendered_bg_image = None

    is_design_app = any(k in creator_raw for k in ["illustrator", "corel", "inkscape", "figma", "indesign", "canva", "affinity"])
    is_office_app = any(k in creator_raw for k in ["acrobat", "adobe", "word", "libreoffice", "writer", "excel", "powerpoint", "foxit", "nitro", "chrome", "pdfkit", "reportlab", "pymupdf"])

    if illustrator_mode and len(text_blocks) > 0:
        if raster_layers_count > 0:
            doc_source_type = f"Illustrator Hybrid (Vektor Teks + {raster_layers_count} Layer Raster)"
        else:
            doc_source_type = "Illustrator Precision (Vektor Native)"
    elif len(text_blocks) == 0 or (len(text_blocks) <= 4 and has_fullpage_raster and not is_design_app):
        doc_source_type = "Scanned Document (OCR)"
    elif is_design_app:
        doc_source_type = "Editable Vector PDF (Adobe Illustrator / Design)"
    elif is_office_app:
        doc_source_type = "Editable Vector PDF (Adobe Acrobat / Office)"
    else:
        doc_source_type = "Editable Digital Vector PDF"

    doc.close()
    
    out_res = {
        "success": True,
        "page_idx": page_idx,
        "total_pages": total_pages,
        "width": round(page_rect.width, 2),
        "height": round(page_rect.height, 2),
        "scale": scale,
        "doc_source_type": doc_source_type,
        "has_raster_data": raster_layers_count > 0,
        "raster_layers_count": raster_layers_count,
        "rendered_image": rendered_image,
        "text_blocks": text_blocks,
        "image_blocks": image_blocks
    }
    if embedded_fonts:
        out_res["embedded_fonts"] = list(embedded_fonts.values())
    if illustrator_mode:
        out_res["illustrator_mode"] = True
        out_res["rendered_bg_image"] = rendered_bg_image
        out_res.setdefault("embedded_fonts", list(embedded_fonts.values()))
    return out_res

_PARA_FORM_LINE_RE = re.compile(r"^([a-zA-Z0-9]{1,2}\.\s+|:\s*|nip\.|nomor\s*:)", re.I)


def _coalesce_runs(runs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    merged: List[Dict[str, Any]] = []
    for r in runs:
        if not r.get("text"):
            continue
        if (
            merged
            and r.get("col_dx") is None
            and merged[-1]["is_bold"] == r["is_bold"]
            and merged[-1]["is_italic"] == r["is_italic"]
            and merged[-1]["is_underline"] == r["is_underline"]
            and merged[-1]["color"] == r["color"]
        ):
            merged[-1]["text"] += r["text"]
        else:
            merged.append(dict(r))
    return merged


def _merge_paragraph_blocks(line_blocks: List[Dict[str, Any]], page_width: float, page_idx: int) -> List[Dict[str, Any]]:
    """
    Merge contiguous wrapped body-paragraph lines into 1 unified editable paragraph block
    while preserving headings, Kop Surat, form fields, and signatures separate.
    """
    if len(line_blocks) <= 1:
        return line_blocks

    sorted_lines = sorted(line_blocks, key=lambda b: (round(b["bbox"][1], 1), round(b["bbox"][0], 1)))

    # Detect rows that have horizontal column neighbors (e.g. a. Nama : ANDREAS)
    has_neighbor = [False] * len(sorted_lines)
    for i in range(len(sorted_lines)):
        yi = sorted_lines[i]["bbox"][1]
        for j in range(i + 1, len(sorted_lines)):
            if abs(sorted_lines[j]["bbox"][1] - yi) < 4.5:
                has_neighbor[i] = True
                has_neighbor[j] = True
            elif sorted_lines[j]["bbox"][1] - yi >= 4.5:
                break

    groups: List[Dict[str, Any]] = []
    for idx, blk in enumerate(sorted_lines):
        if has_neighbor[idx] or blk.get("align", "left") != "left":
            groups.append({"lines": [blk], "can_extend": False, "body_x0": blk["bbox"][0]})
            continue

        curr_txt = blk["text"].strip()
        if _PARA_FORM_LINE_RE.match(curr_txt):
            groups.append({"lines": [blk], "can_extend": False, "body_x0": blk["bbox"][0]})
            continue

        if groups and groups[-1]["can_extend"]:
            g = groups[-1]
            prev = g["lines"][-1]
            prev_txt = prev["text"].rstrip()
            v_gap = blk["bbox"][1] - prev["bbox"][3]
            size_ok = abs(prev["size"] - blk["size"]) <= 1.5 and prev["font"] == blk["font"]
            v_gap_ok = -2.0 <= v_gap <= (prev["size"] * 1.15)
            prev_ends_colon = prev_txt.endswith(":")
            prev_w = prev["bbox"][2] - prev["bbox"][0]
            curr_w = blk["bbox"][2] - blk["bbox"][0]
            wide_flow = (
                prev_w >= page_width * 0.44
                or prev["bbox"][2] >= page_width * 0.65
                or (len(g["lines"]) >= 2 and curr_w > 60)
            )

            body_x0 = g["body_x0"]
            dx_body = blk["bbox"][0] - body_x0
            if len(g["lines"]) == 1:
                indent_diff = prev["bbox"][0] - blk["bbox"][0]
                x_aligned = abs(dx_body) <= 20.0 or (0.0 < indent_diff <= 78.0 and prev["bbox"][2] >= page_width * 0.62)
                next_body_x0 = blk["bbox"][0] if (0.0 < indent_diff <= 78.0) else body_x0
            else:
                x_aligned = abs(dx_body) <= 22.0
                next_body_x0 = body_x0

            if size_ok and v_gap_ok and not prev_ends_colon and wide_flow and x_aligned:
                g["lines"].append(blk)
                g["body_x0"] = min(next_body_x0, blk["bbox"][0]) if len(g["lines"]) > 2 else next_body_x0
                continue

        groups.append({"lines": [blk], "can_extend": not curr_txt.endswith(":"), "body_x0": blk["bbox"][0]})

    out_blocks: List[Dict[str, Any]] = []
    for g_idx, g in enumerate(groups):
        lines = g["lines"]
        if len(lines) == 1:
            single = dict(lines[0])
            single["is_paragraph"] = False
            out_blocks.append(single)
            continue

        x0 = min(l["bbox"][0] for l in lines)
        y0 = min(l["bbox"][1] for l in lines)
        x1 = max(l["bbox"][2] for l in lines)
        y1 = max(l["bbox"][3] for l in lines)

        all_runs: List[Dict[str, Any]] = []
        full_texts: List[str] = []
        for li, ln in enumerate(lines):
            full_texts.append(ln["text"].strip())
            ln_runs = ln.get("runs") or [{
                "text": ln["text"].strip(),
                "is_bold": ln["is_bold"],
                "is_italic": ln["is_italic"],
                "is_underline": ln["is_underline"],
                "color": ln["color"]
            }]
            if li > 0 and all_runs:
                all_runs[-1]["text"] += " "
            for r in ln_runs:
                all_runs.append(dict(r))

        coalesced = _coalesce_runs(all_runs)
        combined_text = " ".join(full_texts)

        non_first_x0 = [l["bbox"][0] for l in lines[1:]]
        body_left = min(non_first_x0) if non_first_x0 else x0
        first_indent = round(max(0.0, lines[0]["bbox"][0] - body_left), 1)
        if first_indent < 6.0:
            first_indent = 0.0

        steps = []
        for k in range(1, len(lines)):
            b1 = lines[k].get("orig_baseline_y")
            b0 = lines[k - 1].get("orig_baseline_y")
            if b1 is not None and b0 is not None and b1 > b0:
                steps.append(b1 - b0)
            elif lines[k]["bbox"][1] > lines[k - 1]["bbox"][1]:
                steps.append(lines[k]["bbox"][1] - lines[k - 1]["bbox"][1])
        avg_leading = round(sum(steps) / len(steps), 1) if steps else round(lines[0]["size"] * 1.25, 1)

        non_last_rights = [l["bbox"][2] for l in lines[:-1]]
        last_right = lines[-1]["bbox"][2]
        align_val = "left"
        if non_last_rights and (max(non_last_rights) - min(non_last_rights)) <= 15.0 and max(non_last_rights) >= page_width * 0.62 and last_right < max(non_last_rights) - 14.0:
            align_val = "justify"

        first = lines[0]
        all_bold = all(r["is_bold"] for r in coalesced) if coalesced else first["is_bold"]
        all_italic = all(r["is_italic"] for r in coalesced) if coalesced else first["is_italic"]
        all_under = all(r["is_underline"] for r in coalesced) if coalesced else first["is_underline"]

        para_bbox = [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)]
        out_blocks.append({
            "id": f"blk_{page_idx}_p_{g_idx + 1}",
            "bbox": para_bbox,
            "orig_bbox": list(para_bbox),
            "text": combined_text,
            "font": first["font"],
            "web_font": first["web_font"],
            "font_code": first["font_code"],
            "size": first["size"],
            "is_bold": all_bold,
            "is_italic": all_italic,
            "is_underline": all_under,
            "align": align_val,
            "color": first["color"],
            "is_paragraph": True,
            "text_indent": first_indent,
            "line_height": avg_leading,
            "tracking": 0,
            "kerning": "auto",
            "orig_origin_x": first.get("orig_origin_x"),
            "orig_baseline_y": first.get("orig_baseline_y"),
            "ascender": first.get("ascender"),
            "angle_deg": first.get("angle_deg", 0.0),
            "pdf_font_xref": first.get("pdf_font_xref"),
            "pdf_font_alias": first.get("pdf_font_alias"),
            "runs": coalesced
        })

    return out_blocks


_WIN_TTF_MAP = {
    "segoe": {
        (False, False): "C:/Windows/Fonts/segoeui.ttf",
        (True, False): "C:/Windows/Fonts/segoeuib.ttf",
        (False, True): "C:/Windows/Fonts/segoeuii.ttf",
        (True, True): "C:/Windows/Fonts/segoeuiz.ttf",
    },
    "calibri": {
        (False, False): "C:/Windows/Fonts/calibri.ttf",
        (True, False): "C:/Windows/Fonts/calibrib.ttf",
        (False, True): "C:/Windows/Fonts/calibrii.ttf",
        (True, True): "C:/Windows/Fonts/calibriz.ttf",
    },
    "tahoma": {
        (False, False): "C:/Windows/Fonts/tahoma.ttf",
        (True, False): "C:/Windows/Fonts/tahomabd.ttf",
        (False, True): "C:/Windows/Fonts/tahoma.ttf",
        (True, True): "C:/Windows/Fonts/tahomabd.ttf",
    },
    "verdana": {
        (False, False): "C:/Windows/Fonts/verdana.ttf",
        (True, False): "C:/Windows/Fonts/verdanab.ttf",
        (False, True): "C:/Windows/Fonts/verdanai.ttf",
        (True, True): "C:/Windows/Fonts/verdanaz.ttf",
    },
    "georgia": {
        (False, False): "C:/Windows/Fonts/georgia.ttf",
        (True, False): "C:/Windows/Fonts/georgiab.ttf",
        (False, True): "C:/Windows/Fonts/georgiai.ttf",
        (True, True): "C:/Windows/Fonts/georgiaz.ttf",
    },
}
_TTF_FONT_CACHE: Dict[str, Tuple[str, Any]] = {}


def _strip_font_style_suffix(clean_name: str) -> str:
    s = (clean_name or "").lower()
    s = re.sub(r'[-,\s_]+(bolditalic|boldoblique|boldbol|bold|bol|italic|oblique|slanted|regular|roman|normal|book|mt|psmt)+$', '', s)
    return re.sub(r'[^a-z0-9]', '', s)


def _find_pdf_font_variant(
    page: pymupdf.Page,
    base_xref: Any,
    target_bold: bool,
    target_italic: bool
) -> Optional[int]:
    """Finds a matching style variant font (e.g. DejaVuSansCondensed-Bold) embedded in the same PDF."""
    if base_xref in (None, "", 0, "0"):
        return None
    try:
        bx = int(base_xref)
        fonts = page.get_fonts(full=True)
        src_entry = next((f for f in fonts if int(f[0]) == bx), None)
        if not src_entry:
            return None
        src_clean = (src_entry[3] or "").split("+")[-1]
        src_fam = _strip_font_style_suffix(src_clean)
        if not src_fam:
            return None
        for f in fonts:
            fx = int(f[0])
            fext = (f[1] or "").lower()
            if fext not in ("ttf", "otf", "cff"):
                continue
            fclean = (f[3] or "").split("+")[-1]
            if _strip_font_style_suffix(fclean) != src_fam:
                continue
            fl = fclean.lower()
            c_bold = bool(re.search(r'(bold|black|heavy|semibold|demi|[-,_]bol\b|[-,_]bd\b)', fl))
            c_ital = bool(re.search(r'(italic|oblique|slanted|inclined)', fl))
            if c_bold == bool(target_bold) and c_ital == bool(target_italic):
                return fx
    except Exception:
        pass
    return None


def _get_embedded_pdf_font(
    page: pymupdf.Page,
    fxref: int,
    required_text: str = ""
) -> Optional[Tuple[str, Any]]:
    try:
        doc = page.parent
        if doc is None:
            return None
        _, ext, _, fbuf = doc.extract_font(fxref)
        if fbuf and (ext or "").lower() in ("ttf", "otf", "cff") and len(fbuf) > 500:
            fobj = pymupdf.Font(fontbuffer=fbuf)
            has_all = all((ch.isspace() or fobj.has_glyph(ord(ch)) > 0) for ch in (required_text or ""))
            if has_all:
                alias = f"PDFEMB_{fxref}"
                existing_aliases = {f[4] for f in page.get_fonts(full=False) if len(f) > 4}
                if alias not in existing_aliases:
                    page.insert_font(fontname=alias, fontbuffer=fbuf)
                return alias, fobj
    except Exception:
        pass
    return None


def _resolve_page_font(
    page: pymupdf.Page,
    font_display: str,
    base_code: str,
    is_bold: bool,
    is_italic: bool,
    source_pdf_font_xref: Any = None,
    required_text: str = ""
) -> Tuple[str, Any]:
    """Resolve PyMuPDF fontname & Font object: tries original/sibling embedded PDF font first if glyphs match, then Windows TTF, then Base-14."""
    if source_pdf_font_xref not in (None, "", 0, "0"):
        variant_xref = _find_pdf_font_variant(page, source_pdf_font_xref, is_bold, is_italic)
        if variant_xref is not None:
            res = _get_embedded_pdf_font(page, variant_xref, required_text=required_text)
            if res is not None:
                return res

    fn_l = (font_display or "").lower()
    fam_key = None
    for k in _WIN_TTF_MAP:
        if k in fn_l:
            fam_key = k
            break
    if fam_key:
        ttf_path = _WIN_TTF_MAP[fam_key].get((bool(is_bold), bool(is_italic)))
        if ttf_path and os.path.exists(ttf_path):
            cached = _TTF_FONT_CACHE.get(ttf_path)
            if cached is None:
                alias = f"TTF_{fam_key}_{'b' if is_bold else 'r'}{'i' if is_italic else 'n'}"
                font_obj = pymupdf.Font(fontfile=ttf_path)
                _TTF_FONT_CACHE[ttf_path] = (alias, font_obj)
                cached = _TTF_FONT_CACHE[ttf_path]
            alias, font_obj = cached
            existing_aliases = {f[4] for f in page.get_fonts(full=False) if len(f) > 4}
            if alias not in existing_aliases:
                page.insert_font(fontname=alias, fontfile=ttf_path)
            return alias, font_obj
    return _resolve_font_code(base_code, is_bold, is_italic), None


def _resolve_font_code(base_code: str, is_bold: bool, is_italic: bool) -> str:
    """Resolve exact PyMuPDF standard font code from base family and style flags."""
    if base_code in ("tibo", "tiro", "tiit", "tibi"):
        if is_bold and is_italic: return "tibi"
        if is_bold: return "tibo"
        if is_italic: return "tiit"
        return "tiro"
    if base_code in ("cobo", "cour", "coit", "cobi"):
        if is_bold and is_italic: return "cobi"
        if is_bold: return "cobo"
        if is_italic: return "coit"
        return "cour"
    if is_bold and is_italic: return "hebi"
    if is_bold: return "hebo"
    if is_italic: return "heit"
    return "helv"


def _parse_hex_color(color_str: str) -> tuple:
    """Convert #RRGGBB or rgb(r,g,b) string to normalized RGB float tuple."""
    s = (color_str or "#000000").strip()
    if s.lower().startswith("rgb"):
        m = re.match(r"rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)", s, re.I)
        if m:
            return (int(m.group(1)) / 255.0, int(m.group(2)) / 255.0, int(m.group(3)) / 255.0)
    color_hex = s.lstrip("#")
    if len(color_hex) == 3:
        color_hex = "".join(c * 2 for c in color_hex)
    if len(color_hex) == 6:
        try:
            r = int(color_hex[0:2], 16) / 255.0
            g = int(color_hex[2:4], 16) / 255.0
            b = int(color_hex[4:6], 16) / 255.0
            return (r, g, b)
        except ValueError:
            pass
    return (0.0, 0.0, 0.0)


def _measure_piece_width(text: str, font_code: str, font_size: float, extra_char_pt: float, font_obj: Any = None, h_scale_f: float = 1.0) -> float:
    base_w = font_obj.text_length(text, fontsize=font_size) if font_obj is not None else pymupdf.get_text_length(text, fontname=font_code, fontsize=font_size)
    base_w *= h_scale_f
    if abs(extra_char_pt) > 0.001:
        base_w += extra_char_pt * len(text)
    return max(0.0, base_w)


def _draw_styled_piece(
    page: pymupdf.Page,
    x: float,
    baseline_y: float,
    text: str,
    font_code: str,
    font_size: float,
    rgb: tuple,
    is_underline: bool,
    extra_char_pt: float,
    font_obj: Any = None,
    h_scale_f: float = 1.0,
    angle_deg: float = 0.0,
    pivot_pt: Optional[pymupdf.Point] = None
) -> float:
    if not text:
        return 0.0
    total_w = 0.0
    use_rot = abs(angle_deg) > 0.5
    use_morph = abs(h_scale_f - 1.0) > 0.005 or use_rot
    mat_tx = pymupdf.Matrix(h_scale_f, 1.0)
    if use_rot:
        mat_tx = mat_tx * pymupdf.Matrix(-angle_deg)
    if abs(extra_char_pt) <= 0.005:
        pt = pymupdf.Point(x, baseline_y)
        if use_morph:
            piv = pivot_pt if (use_rot and pivot_pt is not None) else pt
            page.insert_text(pt, text, fontsize=font_size, color=rgb, fontname=font_code, morph=(piv, mat_tx))
        else:
            page.insert_text(pt, text, fontsize=font_size, color=rgb, fontname=font_code)
        total_w = (font_obj.text_length(text, fontsize=font_size) if font_obj is not None else pymupdf.get_text_length(text, fontname=font_code, fontsize=font_size)) * h_scale_f
    else:
        cur_x = x
        for ch in text:
            pt = pymupdf.Point(cur_x, baseline_y)
            if use_morph:
                piv = pivot_pt if (use_rot and pivot_pt is not None) else pt
                page.insert_text(pt, ch, fontsize=font_size, color=rgb, fontname=font_code, morph=(piv, mat_tx))
            else:
                page.insert_text(pt, ch, fontsize=font_size, color=rgb, fontname=font_code)
            ch_w = (font_obj.text_length(ch, fontsize=font_size) if font_obj is not None else pymupdf.get_text_length(ch, fontname=font_code, fontsize=font_size)) * h_scale_f
            cw = ch_w + extra_char_pt
            cur_x += max(0.5, cw)
        total_w = cur_x - x
    if is_underline and total_w > 0:
        line_y = min(page.rect.height - 1.0, baseline_y + max(1.2, font_size * 0.14))
        page.draw_line(
            pymupdf.Point(x, line_y),
            pymupdf.Point(x + total_w, line_y),
            color=rgb,
            width=max(0.75, font_size * 0.06)
        )
    return total_w


def _draw_rich_paragraph_pymupdf(page: pymupdf.Page, rect: pymupdf.Rect, data: Dict[str, Any], default_text: str = "") -> None:
    """
    Precision vector text & paragraph writer supporting:
    - Inline mixed Bold/Italic/Underline/Color runs
    - Leading (line_height), Tracking (VA), Kerning (V/A), Text Indent
    - Horizontal Scaling (h_scale %) & Paragraph Spacing (para_spacing pt)
    - All 7 Paragraph Alignments (left, center, right, justify, justify-center, justify-right, justify-all)
    """
    font_size = float(data.get("size") or data.get("font_size") or 11.0)
    font_display = data.get("font", "Arial")
    font_info = detect_font_properties(font_display)
    base_family_code = data.get("font_code") or font_info["font_code"]

    try:
        h_scale_pct = float(data.get("h_scale") if data.get("h_scale") not in (None, "", 0, "0") else 100.0)
    except (TypeError, ValueError):
        h_scale_pct = 100.0
    h_scale_f = max(0.5, min(2.0, h_scale_pct / 100.0))

    try:
        para_spacing = max(0.0, float(data.get("para_spacing") or 0.0))
    except (TypeError, ValueError):
        para_spacing = 0.0

    leading_raw = data.get("line_height")
    try:
        leading_pt = float(leading_raw) if (leading_raw not in (None, "", "auto", 0, "0")) else round(font_size * 1.25, 2)
    except (TypeError, ValueError):
        leading_pt = round(font_size * 1.25, 2)
    leading_pt = max(font_size * 0.8, leading_pt)

    tracking_val = 0.0
    try:
        tracking_val = float(data.get("tracking") or 0.0)
    except (TypeError, ValueError):
        tracking_val = 0.0

    kerning_raw = data.get("kerning")
    kerning_val = 0.0
    if kerning_raw not in (None, "", "auto", "Auto"):
        try:
            kerning_val = float(kerning_raw)
        except (TypeError, ValueError):
            kerning_val = 0.0

    extra_char_pt = ((tracking_val + kerning_val) / 1000.0) * font_size
    text_indent = max(0.0, float(data.get("text_indent") or 0.0))
    align_str = (data.get("align") or "left").lower()
    wrap_lines = bool(data.get("is_paragraph")) or ("\n" in (default_text or "")) or align_str.startswith("justify")

    runs_input = data.get("runs")
    if not runs_input or not isinstance(runs_input, list):
        runs_input = [{
            "text": default_text,
            "is_bold": bool(data.get("is_bold", False)),
            "is_italic": bool(data.get("is_italic", False)),
            "is_underline": bool(data.get("is_underline", False)),
            "color": data.get("color", "#111827")
        }]

    # Split runs into logical hard-break paragraphs preserving inline mixed-style word clusters
    hard_paras: List[List[Dict[str, Any]]] = [[]]
    current_cluster: List[Dict[str, Any]] = []

    def flush_cluster():
        nonlocal current_cluster
        if current_cluster:
            hard_paras[-1].append({"parts": current_cluster, "w": sum(p["w"] for p in current_cluster)})
            current_cluster = []

    font_family_hint = f"{data.get('font', '')} {data.get('web_font', '')}".strip() or "Arial"
    src_xref = None if data.get("font_overridden") else data.get("pdf_font_xref")
    for r in runs_input:
        r_text = str(r.get("text", "")).replace("\r\n", "\n").replace("\r", "\n")
        r_bold = bool(r.get("is_bold", data.get("is_bold", False)))
        r_italic = bool(r.get("is_italic", data.get("is_italic", False)))
        r_under = bool(r.get("is_underline", data.get("is_underline", False)))
        r_rgb = _parse_hex_color(r.get("color") or data.get("color", "#111827"))
        r_col_dx = r.get("col_dx")

        # Resolve PDF font (including sibling Bold/Italic variant inside same PDF) or split per glyph if subset lacks 1 char
        r_code, r_font_obj = _resolve_page_font(page, font_family_hint, base_family_code, r_bold, r_italic, source_pdf_font_xref=src_xref, required_text=r_text)
        sub_chunks: List[Tuple[str, str, Any]] = []
        if src_xref and r_font_obj is None:
            v_xref = _find_pdf_font_variant(page, src_xref, r_bold, r_italic) or (int(src_xref) if (r_bold == bool(data.get("orig_is_bold", r_bold)) and r_italic == bool(data.get("orig_is_italic", r_italic))) else None)
            emb_full = _get_embedded_pdf_font(page, int(v_xref), required_text="") if v_xref else None
            if emb_full is not None:
                emb_alias, emb_fobj = emb_full
                cur_supported = None
                cur_buf: List[str] = []
                for ch in r_text:
                    sup = ch.isspace() or (emb_fobj.has_glyph(ord(ch)) > 0)
                    if cur_supported is None or sup == cur_supported:
                        cur_supported = sup
                        cur_buf.append(ch)
                    else:
                        part_s = "".join(cur_buf)
                        c_code, c_fobj = (emb_alias, emb_fobj) if cur_supported else (r_code, r_font_obj)
                        sub_chunks.append((part_s, c_code, c_fobj))
                        cur_supported = sup
                        cur_buf = [ch]
                if cur_buf:
                    part_s = "".join(cur_buf)
                    c_code, c_fobj = (emb_alias, emb_fobj) if cur_supported else (r_code, r_font_obj)
                    sub_chunks.append((part_s, c_code, c_fobj))
        if not sub_chunks:
            sub_chunks = [(r_text, r_code, r_font_obj)]

        pending_col_dx = r_col_dx
        for sub_txt, sub_code, sub_fobj in sub_chunks:
            segments = sub_txt.split("\n")
            for seg_idx, seg in enumerate(segments):
                if seg_idx > 0:
                    flush_cluster()
                    hard_paras.append([])
                for tok in re.findall(r"\S+|\s+", seg):
                    if tok.isspace():
                        flush_cluster()
                    else:
                        pw = _measure_piece_width(tok, sub_code, font_size, extra_char_pt, font_obj=sub_fobj, h_scale_f=h_scale_f)
                        part_dict: Dict[str, Any] = {
                            "text": tok,
                            "font_code": sub_code,
                            "font_obj": sub_fobj,
                            "rgb": r_rgb,
                            "is_underline": r_under,
                            "w": pw
                        }
                        if pending_col_dx is not None:
                            part_dict["col_dx"] = pending_col_dx
                            pending_col_dx = None
                        current_cluster.append(part_dict)
    flush_cluster()

    base_code_plain, base_font_obj = _resolve_page_font(page, font_family_hint, base_family_code, False, False, source_pdf_font_xref=src_xref, required_text=" ")
    space_w = _measure_piece_width(" ", base_code_plain, font_size, extra_char_pt, font_obj=base_font_obj, h_scale_f=h_scale_f)
    box_w = max(20.0, rect.width)

    visual_lines: List[Dict[str, Any]] = []
    for p_words in hard_paras:
        if not p_words:
            visual_lines.append({"words": [], "is_hard_end": True, "indent": 0.0})
            continue
        cur_words: List[Dict[str, Any]] = []
        cur_w = 0.0
        line_indent = text_indent
        avail_w = max(18.0, box_w - line_indent)

        for wobj in p_words:
            first_col_dx = next((p.get("col_dx") for p in wobj["parts"] if p.get("col_dx") is not None), None)
            if first_col_dx is not None:
                wobj["col_dx"] = first_col_dx
            ww = wobj["w"]
            need_w = ww if not cur_words else (cur_w + space_w + ww)
            if wrap_lines and cur_words and need_w > avail_w + 0.15:
                visual_lines.append({"words": cur_words, "is_hard_end": False, "indent": line_indent})
                cur_words = [wobj]
                cur_w = ww
                line_indent = 0.0
                avail_w = box_w
            else:
                cur_words.append(wobj)
                cur_w = need_w
        if cur_words:
            visual_lines.append({"words": cur_words, "is_hard_end": True, "indent": line_indent})

    try:
        angle_deg = float(data.get("angle_deg") or 0.0)
    except (TypeError, ValueError):
        angle_deg = 0.0

    # Precision X & Y Origin Lock: use exact PDF span origin[0], origin[1] + displacement when available!
    if data.get("orig_baseline_y") is not None:
        orig_y0 = float(data.get("orig_y0") if data.get("orig_y0") is not None else rect.y0)
        cur_baseline_y = float(data["orig_baseline_y"]) + (rect.y0 - orig_y0)
    else:
        asc_ratio = float(data.get("ascender") or 0.88)
        cur_baseline_y = rect.y0 + font_size * max(0.70, min(1.12, asc_ratio))

    sidebearing_dx = 0.0
    if data.get("orig_origin_x") is not None and not wrap_lines and align_str == "left":
        orig_x0_val = float(data.get("orig_x0") if data.get("orig_x0") is not None else rect.x0)
        raw_sb = float(data["orig_origin_x"]) - orig_x0_val
        if abs(angle_deg) > 0.5 or -8.0 <= raw_sb <= 8.0:
            sidebearing_dx = raw_sb

    for l_idx, vline in enumerate(visual_lines):
        words = vline["words"]
        if not words:
            cur_baseline_y += leading_pt + para_spacing
            continue
        baseline_y = cur_baseline_y
        indent_pt = vline["indent"]
        avail_w = max(15.0, box_w - indent_pt)
        words_w = sum(w["w"] for w in words)
        n_gaps = max(0, len(words) - 1)
        is_last = vline["is_hard_end"] or (l_idx == len(visual_lines) - 1)

        do_justify = (align_str == "justify-all" and n_gaps >= 1) or (
            align_str in ("justify", "justify-left", "justify-center", "justify-right") and not is_last and n_gaps >= 1
        )
        if do_justify:
            gap_pt = max(space_w * 0.65, (avail_w - words_w) / n_gaps)
            cur_x = rect.x0 + indent_pt
        elif align_str == "center" or (align_str == "justify-center" and is_last):
            total_w = words_w + n_gaps * space_w
            gap_pt = space_w
            cur_x = rect.x0 + indent_pt + (avail_w - total_w) / 2.0
        elif align_str == "right" or (align_str == "justify-right" and is_last):
            total_w = words_w + n_gaps * space_w
            gap_pt = space_w
            cur_x = rect.x0 + box_w - total_w
        else:
            gap_pt = space_w
            cur_x = rect.x0 + indent_pt + sidebearing_dx

        line_start_x = cur_x
        line_pivot = pymupdf.Point(cur_x, baseline_y)
        for w_i, wobj in enumerate(words):
            for part in wobj["parts"]:
                pw = _draw_styled_piece(
                    page,
                    cur_x,
                    baseline_y,
                    part["text"],
                    part["font_code"],
                    font_size,
                    part["rgb"],
                    part["is_underline"],
                    extra_char_pt,
                    font_obj=part.get("font_obj"),
                    h_scale_f=h_scale_f,
                    angle_deg=angle_deg,
                    pivot_pt=line_pivot
                )
                cur_x += pw
            if w_i < len(words) - 1:
                next_col_dx = words[w_i + 1].get("col_dx")
                if next_col_dx is not None and not do_justify:
                    next_x = max(cur_x + max(1.2, space_w * 0.35), line_start_x + float(next_col_dx))
                else:
                    next_x = cur_x + gap_pt
                # Emit explicit space glyph (without underline) so PDF readers, copy/paste,
                # and re-opened justified lines retain word separators instead of fragmenting.
                sp_part = wobj["parts"][-1]
                sp_fo = sp_part.get("font_obj")
                sp_code = sp_part["font_code"] if (sp_fo is None or sp_fo.has_glyph(32)) else base_family_code
                sp_step = next_x - cur_x
                if sp_step >= max(0.8, space_w * 0.35):
                    sp_h = h_scale_f if (space_w <= 0 or sp_step >= space_w * 0.9) else max(0.25, (sp_step * 0.85 / space_w) * h_scale_f)
                    _draw_styled_piece(
                        page,
                        cur_x,
                        baseline_y,
                        " ",
                        sp_code,
                        font_size,
                        sp_part["rgb"],
                        False,
                        0.0,
                        font_obj=sp_fo if sp_code == sp_part["font_code"] else None,
                        h_scale_f=sp_h,
                        angle_deg=angle_deg,
                        pivot_pt=line_pivot,
                    )
                cur_x = next_x
        cur_baseline_y += leading_pt + (para_spacing if vline["is_hard_end"] else 0.0)


def _apply_edits_to_page(page: pymupdf.Page, changes: Dict[str, Any]) -> None:
    """Applies edits, highlights, drawings, symbols, added texts and images to a single PyMuPDF Page."""
    # Capture original span rectangles to prevent redactions from clipping adjacent lines
    existing_page_spans: List[pymupdf.Rect] = []
    try:
        for b in page.get_text("dict").get("blocks", []):
            if b.get("type") != 0:
                continue
            for ln in b.get("lines", []):
                for sp in ln.get("spans", []):
                    if (sp.get("text") or "").strip():
                        sb = sp.get("bbox")
                        if sb and len(sb) == 4:
                            existing_page_spans.append(pymupdf.Rect(*sb))
    except Exception:
        existing_page_spans = []

    # 1. Process modified/deleted text blocks & unified paragraphs (2-Phase: Redact All -> Draw All)
    text_edits = changes.get("text_edits", [])
    global_illustrator = bool(changes.get("illustrator_mode", False))
    pending_draws: List[Tuple[pymupdf.Rect, Dict[str, Any], str]] = []
    has_preserve_redacts = False
    has_opaque_redacts = False

    def _clamped_redact_rect(orig_rect: pymupdf.Rect, pad_top: float, pad_bottom: float) -> pymupdf.Rect:
        rr = pymupdf.Rect(orig_rect.x0 - 1.2, orig_rect.y0 - pad_top, orig_rect.x1 + 1.2, orig_rect.y1 + pad_bottom)
        for sr in existing_page_spans:
            if min(sr.x1, orig_rect.x1) - max(sr.x0, orig_rect.x0) <= 2.0:
                continue
            sr_cy = (sr.y0 + sr.y1) / 2.0
            v_overlap = max(0.0, min(sr.y1, orig_rect.y1) - max(sr.y0, orig_rect.y0))
            if v_overlap >= min(sr.height, orig_rect.height) * 0.45:
                continue
            if sr_cy > orig_rect.y1:
                min_safe_y1 = orig_rect.y0 + max(2.0, orig_rect.height * 0.55)
                rr.y1 = max(min_safe_y1, min(rr.y1, sr.y0 - 0.15))
            elif sr_cy < orig_rect.y0:
                max_safe_y0 = orig_rect.y1 - max(2.0, orig_rect.height * 0.55)
                rr.y0 = min(max_safe_y0, max(rr.y0, sr.y1 + 0.15))
        return rr

    # Phase 1A: Non-destructive redactions (preserve_bg / Illustrator mode)
    for edit in text_edits:
        bbox = edit.get("bbox")
        if not bbox or len(bbox) != 4:
            continue
        preserve_bg = bool(edit.get("preserve_bg", False) or global_illustrator) and not bool(edit.get("isOcr", False))
        if not preserve_bg:
            continue
        orig_rect = pymupdf.Rect(*(edit.get("orig_bbox") or bbox))
        is_para = bool(edit.get("is_paragraph"))
        redact_orig = _clamped_redact_rect(
            orig_rect,
            0.8 if is_para else 0.35,
            1.8 if bool(edit.get("is_underline", False)) else (1.0 if is_para else 0.35),
        )
        page.add_redact_annot(redact_orig, fill=None)
        has_preserve_redacts = True

    if has_preserve_redacts:
        page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE)

    # Phase 1B: Opaque background-filled redactions (scanned / OCR / standard non-raster-preserving mode)
    for edit in text_edits:
        bbox = edit.get("bbox")
        if not bbox or len(bbox) != 4:
            continue
        preserve_bg = bool(edit.get("preserve_bg", False) or global_illustrator) and not bool(edit.get("isOcr", False))
        if preserve_bg:
            continue
        rect = pymupdf.Rect(*bbox)
        orig_rect = pymupdf.Rect(*(edit.get("orig_bbox") or bbox))
        is_para = bool(edit.get("is_paragraph"))
        pad_top = 0.8 if is_para else 0.35
        pad_bottom = 1.8 if bool(edit.get("is_underline", False)) else (1.0 if is_para else 0.35)
        redact_orig = _clamped_redact_rect(orig_rect, pad_top, pad_bottom)
        bg_color = sample_background_color(page, redact_orig)
        page.add_redact_annot(redact_orig, fill=bg_color)
        if abs(rect.x0 - orig_rect.x0) > 3.0 or abs(rect.y0 - orig_rect.y0) > 4.0:
            redact_new = pymupdf.Rect(rect.x0 - 1.2, rect.y0 - pad_top, rect.x1 + 1.2, rect.y1 + pad_bottom)
            page.add_redact_annot(redact_new, fill=bg_color)
        has_opaque_redacts = True

    if has_opaque_redacts:
        page.apply_redactions()

    # Phase 2: Prepare anchor-locked write rects & render all new vector text after redactions complete
    for edit in text_edits:
        bbox = edit.get("bbox")
        if not bbox or len(bbox) != 4:
            continue
        new_text = edit.get("new_text", "").strip()
        if not (new_text or edit.get("runs")) or edit.get("deleted", False):
            continue

        rect = pymupdf.Rect(*bbox)
        orig_rect = pymupdf.Rect(*(edit.get("orig_bbox") or bbox))
        is_para = bool(edit.get("is_paragraph"))
        font_size = float(edit.get("size", 11))
        align_str = (edit.get("align") or "left").lower()
        user_moved = bool(edit.get("user_moved", False))
        align_changed = bool(edit.get("align_changed", False))
        orig_x0 = float(edit.get("orig_x0") if edit.get("orig_x0") is not None else orig_rect.x0)
        orig_y0 = float(edit.get("orig_y0") if edit.get("orig_y0") is not None else orig_rect.y0)

        anchor_y0 = orig_y0 if (not user_moved and not align_changed and abs(rect.y0 - orig_y0) <= 3.0) else rect.y0
        est_w = rect.width if is_para else max(rect.width, len(new_text) * font_size * 0.65 + 12)
        out_h = max(rect.height, font_size * 1.5)

        if align_str in ("center", "justify-center"):
            orig_cx = (orig_rect.x0 + orig_rect.x1) / 2.0
            rect_cx = (rect.x0 + rect.x1) / 2.0
            target_cx = orig_cx if (not user_moved and not align_changed and abs(rect_cx - orig_cx) <= 12.0) else rect_cx
            write_rect = pymupdf.Rect(target_cx - est_w / 2.0, anchor_y0, target_cx + est_w / 2.0, anchor_y0 + out_h)
        elif align_str in ("right", "justify-right"):
            target_rx = orig_rect.x1 if (not user_moved and not align_changed and abs(rect.x1 - orig_rect.x1) <= 12.0) else rect.x1
            write_rect = pymupdf.Rect(target_rx - est_w, anchor_y0, target_rx, anchor_y0 + out_h)
        else:
            anchor_x0 = orig_x0 if (not user_moved and not align_changed and abs(rect.x0 - orig_x0) <= 12.0) else rect.x0
            write_rect = pymupdf.Rect(anchor_x0, anchor_y0, anchor_x0 + est_w, anchor_y0 + out_h)

        edit_draw = dict(edit)
        edit_draw["orig_x0"] = orig_x0
        edit_draw["orig_y0"] = orig_y0
        pending_draws.append((write_rect, edit_draw, edit.get("new_text", "")))

    for write_rect, edit_draw, raw_txt in pending_draws:
        _draw_rich_paragraph_pymupdf(page, write_rect, edit_draw, default_text=raw_txt)

    # 1b. Process Adobe bboxType=3 existing image edits (move, resize, replace, delete logos/QR/stamps)
    image_edits = changes.get("image_edits", [])
    for img_ed in image_edits:
        orig_bbox = img_ed.get("orig_bbox") or img_ed.get("bbox")
        new_bbox = img_ed.get("bbox") or orig_bbox
        if not orig_bbox or len(orig_bbox) != 4:
            continue
        orig_r = pymupdf.Rect(*orig_bbox)
        new_r = pymupdf.Rect(*new_bbox)
        deleted = bool(img_ed.get("deleted", False))

        # Capture crisp raster from original region BEFORE redacting if user didn't replace image bytes
        raw_img_bytes = None
        if not deleted:
            data_uri = img_ed.get("data_uri") or ""
            if "," in data_uri:
                _, encoded = data_uri.split(",", 1)
                raw_img_bytes = base64.b64decode(encoded)
            else:
                pix = page.get_pixmap(matrix=pymupdf.Matrix(2.5, 2.5), clip=orig_r, alpha=False)
                raw_img_bytes = pix.tobytes("png")

        redact_r = pymupdf.Rect(orig_r.x0 - 1.0, orig_r.y0 - 1.0, orig_r.x1 + 1.0, orig_r.y1 + 1.0)
        bg_c = sample_background_color(page, redact_r)
        page.add_redact_annot(redact_r, fill=bg_c)
        page.apply_redactions()

        if not deleted and raw_img_bytes and new_r.width >= 4 and new_r.height >= 4:
            page.insert_image(new_r, stream=raw_img_bytes, keep_proportion=False)

    # 2. Process added texts
    added_texts = changes.get("added_texts", [])
    for item in added_texts:
        text = item.get("text", "").strip()
        if not text:
            continue
        x = float(item.get("x", 50))
        y = float(item.get("y", 50))
        font_size = float(item.get("font_size") or item.get("size") or 13)
        est_w = max(100.0, float(item.get("boxW") or item.get("w") or 200), len(text) * font_size * 0.65 + 16)
        est_h = max(30.0, float(item.get("h", 40)), font_size * 2.0)
        item_copy = dict(item)
        item_copy["size"] = font_size
        if "is_bold" not in item_copy:
            item_copy["is_bold"] = True
        rect = pymupdf.Rect(x, y, x + est_w, y + est_h)
        _draw_rich_paragraph_pymupdf(page, rect, item_copy, default_text=item.get("text", ""))

    # 3. Process added images uploaded from PC
    added_images = changes.get("added_images", [])
    for img_item in added_images:
        data_uri = img_item.get("data_uri", "")
        if not data_uri or "," not in data_uri:
            continue
            
        _, encoded = data_uri.split(",", 1)
        raw_bytes = base64.b64decode(encoded)
        
        x = float(img_item.get("x", 50))
        y = float(img_item.get("y", 50))
        w = float(img_item.get("w", 150))
        h = float(img_item.get("h", 150))
        
        img_rect = pymupdf.Rect(x, y, x + w, y + h)
        page.insert_image(img_rect, stream=raw_bytes)

    # 4. Process Adobe-style translucent highlights
    highlights = changes.get("highlights", [])
    for hl in highlights:
        x = float(hl.get("x", 0))
        y = float(hl.get("y", 0))
        w = max(4.0, float(hl.get("w", 40)))
        h = max(4.0, float(hl.get("h", 14)))
        hr, hg, hb = _parse_hex_color(hl.get("color", "#fde047"))
        hl_rect = pymupdf.Rect(x, y, x + w, y + h)
        page.draw_rect(hl_rect, color=None, fill=(hr, hg, hb), fill_opacity=0.38, width=0, overlay=True)

    # 5. Process Adobe-style freehand vector pencil drawings
    drawings = changes.get("drawings", [])
    for drw in drawings:
        pts_raw = drw.get("points", [])
        if len(pts_raw) < 2:
            continue
        pts = [pymupdf.Point(float(p[0]), float(p[1])) for p in pts_raw]
        dr, dg, db = _parse_hex_color(drw.get("color", "#111827"))
        sw = max(0.75, float(drw.get("width", 2)))
        page.draw_polyline(pts, color=(dr, dg, db), width=sw, lineCap=1, lineJoin=1)

    # 6. Process Adobe Fill & Sign vector symbols (✓, ✕, ●, ◯)
    symbols = changes.get("symbols", [])
    for sym in symbols:
        char = sym.get("char", "✓")
        sx = float(sym.get("x", 50))
        sy = float(sym.get("y", 50))
        sz = max(10.0, float(sym.get("size", 18)))
        sr, sg, sb = _parse_hex_color(sym.get("color", "#111827"))
        stroke_w = max(1.4, sz * 0.13)

        if char in ("✓", "✔", "v"):
            p1 = pymupdf.Point(sx + sz * 0.15, sy + sz * 0.52)
            p2 = pymupdf.Point(sx + sz * 0.42, sy + sz * 0.80)
            p3 = pymupdf.Point(sx + sz * 0.88, sy + sz * 0.20)
            page.draw_polyline([p1, p2, p3], color=(sr, sg, sb), width=stroke_w, lineCap=1, lineJoin=1)
        elif char in ("✕", "✗", "x", "X"):
            page.draw_line(pymupdf.Point(sx + sz * 0.18, sy + sz * 0.18), pymupdf.Point(sx + sz * 0.82, sy + sz * 0.82), color=(sr, sg, sb), width=stroke_w, lineCap=1)
            page.draw_line(pymupdf.Point(sx + sz * 0.82, sy + sz * 0.18), pymupdf.Point(sx + sz * 0.18, sy + sz * 0.82), color=(sr, sg, sb), width=stroke_w, lineCap=1)
        elif char in ("●", "o", "•"):
            center = pymupdf.Point(sx + sz * 0.5, sy + sz * 0.5)
            page.draw_circle(center, sz * 0.32, color=None, fill=(sr, sg, sb), width=0)
        elif char in ("◯", "○"):
            center = pymupdf.Point(sx + sz * 0.5, sy + sz * 0.5)
            page.draw_circle(center, sz * 0.35, color=(sr, sg, sb), fill=None, width=stroke_w)
        else:
            page.insert_text(pymupdf.Point(sx, sy + sz * 0.85), char, fontsize=sz, color=(sr, sg, sb), fontname="helv")

def save_visual_editor_changes(
    input_path: str,
    output_path: str,
    changes: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Applies user edits (single-page or multi-page dict 'pages_edits') back onto the PDF
    preserving native Adobe Illustrator / Acrobat vector content everywhere else untouched.
    """
    doc = pymupdf.open(input_path)

    pages_edits = changes.get("pages_edits")
    if isinstance(pages_edits, dict) and pages_edits:
        global_illus = bool(changes.get("illustrator_mode", False))
        for p_str, p_changes in pages_edits.items():
            try:
                p_idx = int(p_str)
            except (ValueError, TypeError):
                continue
            if 0 <= p_idx < len(doc):
                eff_changes = {**p_changes, "illustrator_mode": True} if (global_illus and "illustrator_mode" not in p_changes) else p_changes
                _apply_edits_to_page(doc[p_idx], eff_changes)
    else:
        page_idx = int(changes.get("page_idx", 0))
        if 0 <= page_idx < len(doc):
            _apply_edits_to_page(doc[page_idx], changes)

    # Save finalized document
    doc.save(output_path, garbage=4, deflate=True)
    doc.close()
    
    return {
        "success": True,
        "output_size": os.path.getsize(output_path)
    }

def analyze_pdf_text_blocks(pdf_path: str) -> Dict[str, Any]:
    """Scans all pages in the document and returns global text block analysis."""
    doc = pymupdf.open(pdf_path)
    all_blocks = []
    for p_idx in range(len(doc)):
        page = doc[p_idx]
        blocks = page.get_text("blocks")
        for b in blocks:
            if b[6] == 0:
                text = b[4].strip()
                if text:
                    all_blocks.append({
                        "page": p_idx + 1,
                        "text": text,
                        "bbox": [round(c, 2) for c in b[:4]]
                    })
    doc.close()
    return {"success": True, "total_blocks": len(all_blocks), "blocks": all_blocks}


def seamless_replace_text(
    pdf_path: str,
    output_path: str,
    replacements: List[Dict[str, str]]
) -> Dict[str, Any]:
    """
    Global find & replace text utility across all pages.
    Each item: {"find": "old text", "replace": "new text"}
    """
    doc = pymupdf.open(pdf_path)
    total_replaced = 0
    
    for page in doc:
        for rep in replacements:
            find_txt = rep.get("find", "").strip()
            new_txt = rep.get("replace", "").strip()
            if not find_txt:
                continue
                
            # Search occurrences
            quads = page.search_for(find_txt)
            for rect in quads:
                bg = sample_background_color(page, rect)
                page.add_redact_annot(rect, fill=bg)
                page.apply_redactions()
                if new_txt:
                    page.insert_textbox(rect, new_txt, fontsize=10, fontname="helv")
                total_replaced += 1
                
    doc.save(output_path, garbage=4, deflate=True)
    doc.close()
    return {"success": True, "total_replaced": total_replaced, "output_size": os.path.getsize(output_path)}
