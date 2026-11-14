"""
Builds SIBA_PDF_PORTABLE.html by bundling the FULL templates/index.html,
inlining static/css/style.css, embedding base64 logo assets,
and inlining static/js/app.js with client engine libraries.
Zero difference between the server version and the portable HTML version!
"""

import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent

# Read embedded base64 logos
with open(root / ".tmp" / "logos_b64.json", "r") as f:
    logos = json.load(f)

sb_icon_data = f"data:image/png;base64,{logos['sb']}"
logo_data = f"data:image/png;base64,{logos['logo']}"

# Read full template, full CSS, full JS
index_html = (root / "templates" / "index.html").read_text(encoding="utf-8")
style_css = (root / "static" / "css" / "style.css").read_text(encoding="utf-8")
app_js = (root / "static" / "js" / "app.js").read_text(encoding="utf-8")

# 1. Replace image references with embedded base64 data URIs
index_html = index_html.replace('/static/img/siba_surya_logo.png', logo_data)
index_html = index_html.replace('/static/img/sb_icon.png', sb_icon_data)
index_html = index_html.replace('/static/img/favicon.png', sb_icon_data)
index_html = index_html.replace('/static/img/apple-touch-icon.png', sb_icon_data)

# 2. Inline full CSS into <style> tag
css_tag = f"<style>\n{style_css}\n</style>"
index_html = re.sub(r'<link\s+rel="stylesheet"\s+href="/static/css/style\.css(?:\?[^"]*)?"\s*/?>', lambda _: css_tag, index_html)

# 3. Ensure client engine libraries are present in <head>
client_libs = '''
  <!-- Client Engine Libraries for Offline & Instant Browser Execution -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
'''
if "pdf.min.js" not in index_html:
    index_html = index_html.replace("</head>", f"{client_libs}\n</head>")

# 4. Inline full JS into <script> tag
js_tag = f"<script>\n{app_js}\n</script>"
index_html = re.sub(r'<script\s+src="/static/js/app\.js(?:\?[^"]*)?"\s*></script>', lambda _: js_tag, index_html)

# Output bundled portable HTML
output_file = root / "SIBA_PDF_PORTABLE.html"
output_file.write_text(index_html, encoding="utf-8")

print(f"SIBA_PDF_PORTABLE.html successfully built! File size: {len(index_html):,} bytes")
