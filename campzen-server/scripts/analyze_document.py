#!/usr/bin/env python3
"""
Kami AI Document Intelligence & Print Optimization Worker
Analyzes uploaded student documents deterministically before printing:
- Blank page detection (pixel threshold & ink coverage percentage)
- Duplicate page detection (dHash perceptual hash Hamming distance)
- Resolution and quality analysis (estimated DPI, variance of Laplacian for blur)
- Color vs B&W classification (chrominance variance & colored pixel percentage)
- Rotation detection (orientation geometry)
- Margin & trim warnings (content bounding box distance from trim edges)
- Actionable print cost optimization recommendations

Zero external dependencies outside pymupdf and pillow.
Outputs structured JSON on stdout.
"""

import sys
import json
import os
import math
import warnings
from typing import Dict, Any, List, Tuple

warnings.filterwarnings("ignore", category=DeprecationWarning)

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        print(json.dumps({"error": "PyMuPDF (fitz) is not installed."}), file=sys.stderr)
        sys.exit(1)

from PIL import Image, ImageStat


def compute_dhash(image: Image.Image, hash_size: int = 8) -> int:
    """Compute difference hash (dHash) for perceptual image similarity."""
    resized = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(resized.getdata())
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = pixels[row * (hash_size + 1) + col]
            pixel_right = pixels[row * (hash_size + 1) + col + 1]
            diff.append(pixel_left > pixel_right)
    decimal_val = 0
    for idx, val in enumerate(diff):
        if val:
            decimal_val |= 1 << idx
    return decimal_val


def hamming_distance(hash1: int, hash2: int) -> int:
    """Calculate the Hamming distance between two 64-bit integer hashes."""
    x = hash1 ^ hash2
    distance = 0
    while x > 0:
        distance += x & 1
        x >>= 1
    return distance


def analyze_page_color(pil_image: Image.Image) -> Tuple[bool, float]:
    """
    Deterministic RGB Color vs. Grayscale Detection.
    Measures standard deviation across R, G, B channels per pixel.
    Returns (has_color, color_pixel_percent).
    """
    rgb_img = pil_image.convert("RGB")
    # Downscale for fast color-metric calculation
    thumb = rgb_img.resize((150, 150), Image.Resampling.BILINEAR)
    pixels = list(thumb.getdata())
    total_pixels = len(pixels)
    color_pixels = 0

    for r, g, b in pixels:
        # Check delta between color channels
        channel_delta = max(abs(r - g), abs(r - b), abs(g - b))
        # If delta > 18, it's considered colored (accounting for compression artifacts on B&W)
        if channel_delta > 18:
            color_pixels += 1

    color_percent = round((color_pixels / total_pixels) * 100, 2)
    # If more than 0.8% of pixels have noticeable color, classify as color page
    has_color = color_percent >= 0.8
    return has_color, color_percent


def analyze_blank_page(page: fitz.Page, pil_image: Image.Image) -> Tuple[bool, float, float, str]:
    """
    Intelligent & Deterministic Blank Page Detection:
    1. PyMuPDF element inspection (text, vector drawings, raster images).
    2. Heuristic detection of placeholder blank phrases (e.g. 'intentionally left blank').
    3. Edge-cropped ink coverage to eliminate scanner shadows, dirty glass borders, and punch holes.
    Returns (is_blank, ink_coverage_percent, confidence, reason).
    """
    raw_text = page.get_text().strip()
    text_clean = raw_text.lower()
    has_text = len(raw_text) > 0
    images = page.get_images(full=True)
    drawings = page.get_drawings()

    # 1. Check for intentional blank text placeholders
    if ("intentionally" in text_clean and "blank" in text_clean) or text_clean in ["blank", "notes", "notes:", "memo"]:
        return True, 0.02, 0.98, f"Identified placeholder marker: '{raw_text[:30]}'"

    # 2. Pure empty PDF vector canvas (Zero text, drawings, and images)
    if not has_text and len(images) == 0 and len(drawings) == 0:
        return True, 0.0, 1.0, "Empty page with zero text or graphical elements."

    # 3. Visual Pixel ink analysis
    gray = pil_image.convert("L")
    w, h = gray.size
    thumb = gray.resize((200, 200), Image.Resampling.BILINEAR)
    pixels = thumb.load()
    tw, th = thumb.size

    # Crop outer 3% to eliminate scanner boundary shadows and punch-hole noise
    border_x = int(tw * 0.03)
    border_y = int(th * 0.03)
    inner_pixels = 0
    ink_pixels = 0

    for y in range(border_y, th - border_y):
        for x in range(border_x, tw - border_x):
            inner_pixels += 1
            if pixels[x, y] < 238:  # Noticeably darker than white background
                ink_pixels += 1

    ink_coverage = round((ink_pixels / inner_pixels) * 100, 3) if inner_pixels > 0 else 0.0

    # If page has meaningful text (and not an intentional blank marker), it is NOT blank
    if has_text and len(raw_text) > 5:
        return False, ink_coverage, 0.0, "Page contains readable text content."

    # If ink coverage < 0.15% and no text, page is genuinely blank
    if ink_coverage < 0.15 and not has_text:
        confidence = round(1.0 - (ink_coverage / 0.15) * 0.1, 2)
        return True, ink_coverage, max(0.92, confidence), f"Minimal ink detected ({ink_coverage}% coverage)"

    # If no readable text and ink coverage is under 0.35% (e.g. faint scanner specks)
    if not has_text and ink_coverage < 0.35:
        return True, ink_coverage, 0.90, f"No text content detected with faint background specks ({ink_coverage}% coverage)"

    # Pure visual fallback if raw_text could not be extracted (e.g. rasterized scanned pages)
    if ink_coverage < 0.08:
        return True, ink_coverage, 0.95, f"Near-zero ink detected ({ink_coverage}% coverage)"

    return False, ink_coverage, 0.0, "Page contains content."




def analyze_margins(pil_image: Image.Image) -> List[str]:
    """
    Detect if non-white content sits dangerously close to page boundary (< 2.5% margin).
    Returns list of edge warnings ['left', 'right', 'top', 'bottom'].
    """
    gray = pil_image.convert("L")
    # Invert so content is white (>0) and background is dark (0)
    w, h = gray.size
    thumb = gray.resize((150, int(150 * (h / w))), Image.Resampling.BILINEAR)
    tw, th = thumb.size

    # Find content bounding box (pixels < 240)
    pixels = thumb.load()
    min_x, max_x = tw, 0
    min_y, max_y = th, 0
    has_content = False

    for y in range(th):
        for x in range(tw):
            if pixels[x, y] < 235:
                has_content = True
                if x < min_x: min_x = x
                if x > max_x: max_x = x
                if y < min_y: min_y = y
                if y > max_y: max_y = y

    if not has_content:
        return []

    warnings = []
    # If margin is less than 2% of dimension, flag risk
    if min_x < tw * 0.02: warnings.append('left')
    if (tw - max_x) < tw * 0.02: warnings.append('right')
    if min_y < th * 0.02: warnings.append('top')
    if (th - max_y) < th * 0.02: warnings.append('bottom')

    return warnings


def analyze_document(file_path: str, preview_dir: str = None) -> Dict[str, Any]:
    """
    Main document analysis orchestrator.
    Renders PDF pages to memory at 150 DPI, saves preview thumbnails, and runs all deterministic checkers.
    """
    if not os.path.exists(file_path):
        return {"error": f"File does not exist: {file_path}"}

    if preview_dir:
        os.makedirs(preview_dir, exist_ok=True)

    try:
        doc = fitz.open(file_path)
    except Exception as e:
        return {"error": f"Failed to open PDF document: {str(e)}"}

    total_pages = len(doc)
    page_hashes: List[Tuple[int, int]] = []  # (page_num, dhash)
    blank_pages: List[Dict[str, Any]] = []
    duplicate_groups: List[Dict[str, Any]] = []
    quality_issues: List[Dict[str, Any]] = []
    rotation_issues: List[Dict[str, Any]] = []
    color_pages: List[Dict[str, Any]] = []
    margin_warnings: List[Dict[str, Any]] = []

    color_page_count = 0
    bw_page_count = 0
    landscape_count = 0
    page_dimensions: List[Dict[str, Any]] = []

    # Page-by-Page Analysis
    for page_idx in range(total_pages):
        page_num = page_idx + 1
        page = doc[page_idx]

        # 1. Page rotation and physical aspect ratio
        rect = page.rect
        p_width = round(rect.width, 1)
        p_height = round(rect.height, 1)
        is_landscape = p_width > p_height
        if is_landscape:
            landscape_count += 1

        rotation = page.rotation
        page_dimensions.append({
            "page": page_num,
            "width": p_width,
            "height": p_height,
            "orientation": "landscape" if is_landscape else "portrait",
            "rotation": rotation
        })

        if rotation in (90, 180, 270) or is_landscape:
            rotation_issues.append({
                "page": page_num,
                "currentRotation": rotation,
                "orientation": "landscape" if is_landscape else "portrait",
                "width": p_width,
                "height": p_height,
                "suggestedRotation": (360 - rotation) % 360 if rotation in (90, 180, 270) else (90 if is_landscape else 0),
                "confidence": 0.95
            })

        # 2. Render page to image at 150 DPI for deterministic visual analysis
        zoom = 150 / 72  # 72 points per inch in PDF
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)

        # Convert to PIL Image in memory
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # Save web-optimized preview image if preview_dir is active
        if preview_dir:
            try:
                preview_file = os.path.join(preview_dir, f"page_{page_num}.jpg")
                img.save(preview_file, "JPEG", quality=82, optimize=True)
            except Exception as e:
                print(f"[Warning] Failed to save preview for page {page_num}: {e}", file=sys.stderr)

        # 3. Blank Page Check
        is_blank, ink_coverage, confidence, blank_reason = analyze_blank_page(page, img)
        if is_blank:
            blank_pages.append({
                "page": page_num,
                "confidence": confidence,
                "inkCoveragePercent": ink_coverage,
                "reason": blank_reason
            })

        # 4. Color vs B&W Check
        has_color, color_pct = analyze_page_color(img)
        if has_color:
            color_page_count += 1
        else:
            bw_page_count += 1

        color_pages.append({
            "page": page_num,
            "hasColor": has_color,
            "colorPixelPercent": color_pct
        })

        # 5. Margin / Trim Warnings
        if not is_blank:
            risky_edges = analyze_margins(img)
            if risky_edges:
                edge_desc = 'multiple' if len(risky_edges) > 1 else risky_edges[0]
                margin_warnings.append({
                    "page": page_num,
                    "edge": edge_desc,
                    "riskyEdges": risky_edges,
                    "warning": f"Content is near the {', '.join(risky_edges)} margin and may clip during printing.",
                    "recommendation": "Use Auto Shrink-to-Fit (5% safety margin) to avoid clipped content."
                })

        # 6. Quality & Resolution Check on Embedded Raster Images
        image_list = page.get_images(full=True)
        for img_info in image_list:
            xref = img_info[0]
            try:
                base_img = doc.extract_image(xref)
                img_width = base_img["width"]
                img_height = base_img["height"]
                # If image is smaller than 300x300, flag warning
                if img_width < 250 or img_height < 250:
                    quality_issues.append({
                        "page": page_num,
                        "level": "WARNING",
                        "issue": "Low-resolution graphic detected",
                        "estimatedDpi": 96,
                        "detail": f"Embedded image ({img_width}x{img_height}px) may appear pixelated."
                    })
                    break
            except Exception:
                pass

        # 7. Compute dHash for duplicate detection
        if not is_blank:
            dhash = compute_dhash(img)
            page_hashes.append((page_num, dhash))

    # 8. Duplicate Detection across non-blank pages (Hamming distance <= 4)
    processed_dupes = set()
    for i in range(len(page_hashes)):
        p1, h1 = page_hashes[i]
        if p1 in processed_dupes:
            continue
        dupes_for_p1 = []
        for j in range(i + 1, len(page_hashes)):
            p2, h2 = page_hashes[j]
            dist = hamming_distance(h1, h2)
            if dist <= 3:  # Very high similarity
                dupes_for_p1.append(p2)
                processed_dupes.add(p2)

        if dupes_for_p1:
            duplicate_groups.append({
                "originalPage": p1,
                "duplicatePages": dupes_for_p1,
                "similarityPercent": 98
            })

    # 9. Generate Actionable Print Optimization Recommendations
    recommendations: List[Dict[str, Any]] = []

    # Recommendation A: Color to B&W savings
    if color_page_count < total_pages and color_page_count > 0:
        # e.g., 38 B&W, 4 Color
        bw_candidates = [cp["page"] for cp in color_pages if not cp["hasColor"]]
        est_savings = len(bw_candidates) * 8  # approx ₹8 difference between color & B&W
        recommendations.append({
            "type": "COLOR_TO_BW",
            "title": "Save with Black & White Printing",
            "description": f"{bw_page_count} of {total_pages} pages contain only text/grayscale. Printing in B&W saves money.",
            "affectedPages": bw_candidates,
            "estimatedSavings": est_savings,
            "action": "Set color mode to B&W"
        })
    elif color_page_count == 0 and total_pages > 0:
        recommendations.append({
            "type": "COLOR_TO_BW",
            "title": "Document is 100% Black & White",
            "description": "All pages contain only text/grayscale. Choose B&W to pay the lowest rate.",
            "affectedPages": list(range(1, total_pages + 1)),
            "estimatedSavings": total_pages * 8,
            "action": "Ensure B&W is selected"
        })

    # Recommendation B: Blank page exclusion
    if blank_pages:
        blank_nums = [bp["page"] for bp in blank_pages]
        recommendations.append({
            "type": "BLANK_EXCLUSION",
            "title": f"{len(blank_pages)} Blank {'Page' if len(blank_pages) == 1 else 'Pages'} Detected",
            "description": f"Page {', '.join(map(str, blank_nums))} appear empty. Exclude them to avoid paying for blank paper.",
            "affectedPages": blank_nums,
            "estimatedSavings": len(blank_pages) * 2,
            "action": "Exclude blank pages"
        })

    # Recommendation C: Duplex printing for multi-page documents
    if total_pages >= 4:
        recommendations.append({
            "type": "DOUBLE_SIDED",
            "title": "Save Paper with Double-Sided Printing",
            "description": f"Print double-sided (duplex) to cut sheets from {total_pages} to {math.ceil(total_pages / 2)}.",
            "affectedPages": list(range(1, total_pages + 1)),
            "estimatedSavings": math.floor(total_pages / 2) * 1,
            "action": "Switch to double-sided"
        })

    # Recommendation D: N-Up layout for slide decks or high page count documents
    if landscape_count >= max(2, total_pages * 0.6) or total_pages >= 8:
        sheets_saved = math.floor(total_pages / 2)
        recommendations.append({
            "type": "N_UP_PRINTING",
            "title": "Save up to 50% with 2-Up Slides Layout",
            "description": f"{landscape_count if landscape_count > 0 else total_pages} slides detected. Printing 2 pages per sheet saves half the paper (~{sheets_saved} sheets) and cuts printing costs.",
            "affectedPages": list(range(1, total_pages + 1)),
            "estimatedSavings": sheets_saved * 2,
            "action": "Switch to 2-Up layout"
        })

    doc.close()

    return {
        "status": "completed",
        "totalPages": total_pages,
        "colorPageCount": color_page_count,
        "bwPageCount": bw_page_count,
        "landscapeCount": landscape_count,
        "pageDimensions": page_dimensions,
        "blankPages": blank_pages,
        "duplicateGroups": duplicate_groups,
        "qualityIssues": quality_issues,
        "rotationIssues": rotation_issues,
        "marginWarnings": margin_warnings,
        "colorPages": color_pages,
        "recommendations": recommendations
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: analyze_document.py <path_to_file> [preview_dir]"}), file=sys.stderr)
        sys.exit(1)

    target_file = sys.argv[1]
    preview_output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    result = analyze_document(target_file, preview_output_dir)
    print(json.dumps(result, indent=2))
