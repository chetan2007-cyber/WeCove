#!/usr/bin/env python3
"""
Deterministic PDF-to-Raster renderer for Kami Windows Spooler bridge.
Preserves exact 1-based page order and per-page color/grayscale separation:
- B&W jobs / B&W pages in Mixed jobs -> rendered in pure Grayscale (csGRAY)
- Color jobs / Color pages in Mixed jobs -> rendered in full RGB (csRGB)
Never duplicates pages or copies.
"""

import sys
import os
import json

try:
    import pymupdf
except ImportError:
    import fitz as pymupdf


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: render_print_pages.py <pdf_path> <output_dir> <color_mode> [color_pages_csv]"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    color_mode = sys.argv[3].strip()
    color_pages_csv = sys.argv[4].strip() if len(sys.argv) > 4 else ""

    if not os.path.exists(pdf_path):
        print(json.dumps({"error": f"PDF file not found: {pdf_path}"}))
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    color_pages = set()
    if color_pages_csv:
        for tok in color_pages_csv.split(","):
            tok = tok.strip()
            if tok.isdigit():
                color_pages.add(int(tok))

    doc = pymupdf.open(pdf_path)
    total_pages = len(doc)
    # 300 DPI for crisp text/graphics; 200 DPI for very large docs (>25 pages) to keep spool memory lean
    dpi = 300 if total_pages <= 25 else 200

    rendered_files = []
    for idx in range(total_pages):
        page_num = idx + 1
        page = doc[idx]

        use_color = (
            color_mode == "Color"
            or (color_mode == "Mixed" and page_num in color_pages)
        )
        cs = pymupdf.csRGB if use_color else pymupdf.csGRAY
        pix = page.get_pixmap(dpi=dpi, colorspace=cs, alpha=False)

        out_file = os.path.join(output_dir, f"page_{page_num:04d}.png")
        pix.save(out_file)
        rendered_files.append(out_file)

    doc.close()
    print(json.dumps({
        "success": True,
        "pageCount": total_pages,
        "dpi": dpi,
        "files": rendered_files
    }))


if __name__ == "__main__":
    main()
