#!/usr/bin/env bash
# ==============================================================================
# SIBA SURYA PDF - macOS 1-Click Launcher (.command)
# Double-click file ini di Finder macOS untuk membuka aplikasi secara instan.
# ==============================================================================

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Sertakan path standar macOS Homebrew dan lokal
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

clear
echo "=========================================================="
echo "           SIBA SURYA PDF - macOS Portable Suite          "
echo "=========================================================="
echo ""

# Periksa Python 3
if command -v python3 &>/dev/null; then
    PY="python3"
elif command -v python &>/dev/null; then
    PY="python"
elif [ -f "/opt/homebrew/bin/python3" ]; then
    PY="/opt/homebrew/bin/python3"
elif [ -f "/usr/local/bin/python3" ]; then
    PY="/usr/local/bin/python3"
else
    echo "[INFO] Python 3 belum terdeteksi di macOS."
    echo ""
    echo "TIPS PRAKTIS: Anda juga bisa langsung membuka file:"
    echo "  >> SIBA_PDF_PORTABLE.html <<"
    echo "di browser (Safari/Chrome) tanpa perlu install Python sama sekali!"
    echo ""
    echo "Atau jika ingin backend Python, pasang Python dari: https://www.python.org/downloads/"
    echo ""
    read -p "Tekan Enter untuk membuka versi Portable HTML..."
    open "$DIR/SIBA_PDF_PORTABLE.html" &>/dev/null || open "SIBA_PDF_PORTABLE.html" &>/dev/null
    exit 0
fi

echo "[1/3] Menyiapkan sistem: $($PY --version)..."

# Buat virtual environment lokal jika belum ada
if [ ! -d ".venv" ]; then
    echo "[2/3] Menyiapkan virtual environment lokal (.venv)..."
    "$PY" -m venv .venv 2>/dev/null || true
fi

if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi

# Pasang dependensi jika belum lengkap
if ! python -c "import pymupdf, fastapi, uvicorn, PIL" &>/dev/null; then
    echo "[INFO] Menyiapkan library PDF..."
    pip install -r requirements.txt || pip install --break-system-packages -r requirements.txt || true
fi

echo "[3/3] Membuka SIBA PDF di Safari / Chrome..."
(sleep 1.2 && open "http://127.0.0.1:5050") &

echo ""
echo "=========================================================="
echo "  Aplikasi aktif di: http://127.0.0.1:5050"
echo "  Jangan tutup jendela Terminal ini selama menggunakan app."
echo "  Tekan tombol Ctrl + C untuk mematikan aplikasi."
echo "=========================================================="
echo ""

# Jalankan server
python execution/server.py
