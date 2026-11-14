#!/usr/bin/env bash
# ==============================================================================
# SIBA SURYA PDF - Linux & macOS Deploy Launcher (Wajib Python 3)
# Jalankan di Terminal / Linux Server: bash run.sh
# Opsional env: HOST=0.0.0.0 PORT=5050 NO_BROWSER=1 AUTO_INSTALL_PYTHON=1
# ==============================================================================

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${PATH:-}"
OS_NAME="$(uname -s 2>/dev/null || echo Unknown)"

echo "=========================================================="
echo "     SIBA SURYA PDF Suite - Linux/macOS Python Deploy     "
echo "=========================================================="

is_valid_python3() {
    local bin="${1:-}"
    [ -n "$bin" ] || return 1
    if [ -x "$bin" ] || command -v "$bin" >/dev/null 2>&1; then
        "$bin" -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" >/dev/null 2>&1
        return $?
    fi
    return 1
}

find_python3() {
    local cand=""
    for cand in \
        "$DIR/.venv/bin/python" \
        "$DIR/.venv/bin/python3" \
        python3 python3.13 python3.12 python3.11 python3.10 python3.9 python3.8 python \
        /usr/bin/python3 \
        /usr/local/bin/python3 \
        /opt/homebrew/bin/python3 \
        "$HOME/.local/bin/python3" \
        "$HOME/.pyenv/shims/python3" \
        /opt/conda/bin/python3 \
        "$HOME/miniconda3/bin/python3" \
        "$HOME/anaconda3/bin/python3"
    do
        if is_valid_python3 "$cand"; then
            if command -v "$cand" >/dev/null 2>&1; then
                command -v "$cand"
            else
                printf '%s\n' "$cand"
            fi
            return 0
        fi
    done
    return 1
}

run_pkg_install_linux() {
    local runner=""
    if [ "$(id -u)" -eq 0 ]; then
        runner=""
    elif command -v sudo >/dev/null 2>&1; then
        if [ "${AUTO_INSTALL_PYTHON:-0}" = "1" ] || sudo -n true >/dev/null 2>&1; then
            runner="sudo"
        elif [ -t 0 ]; then
            local ans=""
            read -r -p "Instal paket Python 3 via sudo sekarang? [Y/n]: " ans || true
            if [ -z "$ans" ] || [ "$ans" = "y" ] || [ "$ans" = "Y" ]; then
                runner="sudo"
            else
                return 1
            fi
        else
            return 1
        fi
    else
        return 1
    fi

    if command -v apt-get >/dev/null 2>&1; then
        echo "[INFO] Menginstal python3, python3-venv, dan python3-pip via apt-get..."
        $runner apt-get update -y && $runner apt-get install -y python3 python3-venv python3-pip
    elif command -v dnf >/dev/null 2>&1; then
        echo "[INFO] Menginstal python3 dan python3-pip via dnf..."
        $runner dnf install -y python3 python3-pip
    elif command -v yum >/dev/null 2>&1; then
        echo "[INFO] Menginstal python3 dan python3-pip via yum..."
        $runner yum install -y python3 python3-pip
    elif command -v apk >/dev/null 2>&1; then
        echo "[INFO] Menginstal python3 dan py3-pip via apk..."
        $runner apk add --no-cache python3 py3-pip
    elif command -v pacman >/dev/null 2>&1; then
        echo "[INFO] Menginstal python dan python-pip via pacman..."
        $runner pacman -Sy --noconfirm python python-pip
    elif command -v zypper >/dev/null 2>&1; then
        echo "[INFO] Menginstal python3 dan python3-pip via zypper..."
        $runner zypper --non-interactive install python3 python3-pip
    else
        return 1
    fi
}

# ------------------------------------------------------------------------------
# [1/3] Wajib menemukan / menyiapkan Python >= 3.8 (tanpa fallback HTML-only)
# ------------------------------------------------------------------------------
SYS_PY="$(find_python3 || true)"

if [ -z "$SYS_PY" ]; then
    echo "[PERINGATAN] Python >= 3.8 belum terpasang di sistem ($OS_NAME)."
    if [ "$OS_NAME" = "Linux" ]; then
        if [ "$(id -u)" -eq 0 ] || [ "${AUTO_INSTALL_PYTHON:-0}" = "1" ] || [ -t 0 ]; then
            run_pkg_install_linux || true
            SYS_PY="$(find_python3 || true)"
        fi
    fi
fi

if [ -z "$SYS_PY" ]; then
    echo "[ERROR] Python >= 3.8 WAJIB terpasang untuk menjalankan/deploy SIBA SURYA PDF."
    echo "        Silakan instal Python 3 terlebih dahulu, misalnya:"
    echo "        - Ubuntu/Debian : sudo apt-get update && sudo apt-get install -y python3 python3-venv python3-pip"
    echo "        - RHEL/Fedora   : sudo dnf install -y python3 python3-pip"
    echo "        - Alpine        : apk add --no-cache python3 py3-pip"
    echo "        - macOS         : brew install python3"
    exit 1
fi

echo "[1/3] Menggunakan $("$SYS_PY" --version 2>&1) ($SYS_PY)"

# ------------------------------------------------------------------------------
# [2/3] Pastikan requirements & environment (.venv / pip) siap untuk deploy
# ------------------------------------------------------------------------------
if [ ! -f "$DIR/requirements.txt" ]; then
    echo "[ERROR] File requirements.txt tidak ditemukan di $DIR"
    exit 1
fi

PY_EXEC=""

# Pakai .venv yang sudah lengkap bila valid
if [ -x "$DIR/.venv/bin/python" ] && is_valid_python3 "$DIR/.venv/bin/python"; then
    if "$DIR/.venv/bin/python" -m pip --version >/dev/null 2>&1; then
        PY_EXEC="$DIR/.venv/bin/python"
    else
        echo "[INFO] .venv tidak lengkap (tanpa pip), membuat ulang .venv..."
        rm -rf "$DIR/.venv"
    fi
fi

# Buat .venv bila belum ada/valid (termasuk membersihkan .venv bekas OS lain)
if [ -z "$PY_EXEC" ]; then
    if [ -d "$DIR/.venv" ]; then
        echo "[INFO] Membersihkan .venv tidak valid..."
        rm -rf "$DIR/.venv"
    fi
    echo "[2/3] Menyiapkan virtual environment lokal (.venv)..."
    if ! "$SYS_PY" -m venv "$DIR/.venv" >/dev/null 2>&1; then
        rm -rf "$DIR/.venv"
        if [ "$OS_NAME" = "Linux" ]; then
            echo "[INFO] Modul python3-venv belum siap, mencoba melengkapi paket sistem..."
            run_pkg_install_linux || true
            "$SYS_PY" -m venv "$DIR/.venv" >/dev/null 2>&1 || rm -rf "$DIR/.venv"
        fi
    fi
    if [ -x "$DIR/.venv/bin/python" ] && "$DIR/.venv/bin/python" -m pip --version >/dev/null 2>&1; then
        PY_EXEC="$DIR/.venv/bin/python"
    fi
fi

# Jika .venv tidak memungkinkan (misal env minimal), gunakan SYS_PY langsung
if [ -z "$PY_EXEC" ]; then
    PY_EXEC="$SYS_PY"
fi

HAS_DEPS_CODE="import pymupdf, pypdf, fastapi, uvicorn, PIL
try:
    import python_multipart
except ImportError:
    import multipart
"

if ! "$PY_EXEC" -c "$HAS_DEPS_CODE" >/dev/null 2>&1; then
    echo "[2/3] Menginstal dependensi PDF dari requirements.txt..."
    if ! "$PY_EXEC" -m pip --version >/dev/null 2>&1; then
        "$PY_EXEC" -m ensurepip --upgrade >/dev/null 2>&1 || true
    fi
    if ! "$PY_EXEC" -m pip --version >/dev/null 2>&1; then
        echo "[ERROR] modul pip tidak tersedia pada $PY_EXEC."
        echo "        Untuk Linux Ubuntu/Debian, jalankan: sudo apt-get update && sudo apt-get install -y python3-venv python3-pip"
        exit 1
    fi
    if ! "$PY_EXEC" -m pip install --no-cache-dir -r "$DIR/requirements.txt"; then
        if [ "$PY_EXEC" != "$DIR/.venv/bin/python" ]; then
            "$PY_EXEC" -m pip install --no-cache-dir --break-system-packages -r "$DIR/requirements.txt" \
                || "$PY_EXEC" -m pip install --no-cache-dir --user --break-system-packages -r "$DIR/requirements.txt" \
                || "$PY_EXEC" -m pip install --no-cache-dir --user -r "$DIR/requirements.txt"
        else
            echo "[ERROR] Gagal menginstal dependensi dari requirements.txt."
            exit 1
        fi
    fi
fi

if ! "$PY_EXEC" -c "$HAS_DEPS_CODE" >/dev/null 2>&1; then
    echo "[ERROR] Dependensi Python (pymupdf, pypdf, fastapi, uvicorn, pillow, python-multipart) gagal dimuat."
    exit 1
fi
echo "[2/3] Dependensi Python siap ($PY_EXEC)."

# ------------------------------------------------------------------------------
# [3/3] Jalankan Backend Server Python (Wajib untuk deploy Linux / macOS)
# ------------------------------------------------------------------------------
if [ ! -f "$DIR/execution/server.py" ]; then
    echo "[ERROR] File execution/server.py tidak ditemukan!"
    exit 1
fi

export PORT="${PORT:-5050}"
if [ "$OS_NAME" = "Linux" ]; then
    export HOST="${HOST:-0.0.0.0}"
    if [ -z "${DISPLAY:-}" ] && [ -z "${WAYLAND_DISPLAY:-}" ]; then
        export NO_BROWSER="${NO_BROWSER:-1}"
    fi
else
    export HOST="${HOST:-127.0.0.1}"
fi

# Bersihkan proses server lama di port yang sama agar deploy selalu memakai versi terbaru
if command -v pkill >/dev/null 2>&1; then
    pkill -f "execution/server.py" >/dev/null 2>&1 || true
fi
if command -v lsof >/dev/null 2>&1; then
    for old_pid in $(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true); do
        [ -n "$old_pid" ] && [ "$old_pid" != "$$" ] && kill "$old_pid" >/dev/null 2>&1 || true
    done
elif command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi
sleep 0.4

echo "[3/3] Menyalakan server Python SIBA PDF Suite..."
echo "      Python : $PY_EXEC"
echo "      Listen : http://${HOST}:${PORT}"
echo "      Tekan Ctrl+C untuk menghentikan server."
echo ""

exec "$PY_EXEC" -u "$DIR/execution/server.py"
