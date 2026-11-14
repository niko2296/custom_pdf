@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>nul
title SIBA SURYA PDF Suite - Windows Launcher
pushd "%~dp0" >nul 2>nul
if errorlevel 1 cd /d "%~dp0"

echo ======================================================
echo   SIBA SURYA PDF Suite - Windows Launcher
echo ======================================================
echo.
echo [1/4] Mencari instalasi Python 3...

set "PY_BIN="
set "PY_ARGS="
call :find_python
if defined PY_BIN goto :py_found

:no_python
echo.
echo [PERINGATAN] Python 3 tidak ditemukan di PATH maupun folder instalasi standar Windows.
echo              Server backend Python dibutuhkan agar fitur penuh ^(kompresi presisi,
echo              editor PDF, dll.^) dapat berjalan.
echo.

where winget >nul 2>nul
if errorlevel 1 goto :no_winget_fallback

echo [OPSI] Winget terdeteksi. Dapat menginstal Python 3.12 secara otomatis.
set "INST_CHOICE="
set /p "INST_CHOICE=Instal Python 3.12 otomatis sekarang? [Y/N]: "
if /i not "%INST_CHOICE%"=="Y" goto :no_winget_fallback

echo.
echo [INFO] Menginstal Python 3.12 melalui winget ^(harap tunggu^)...
winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
if errorlevel 1 winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements

call :find_python
if defined PY_BIN goto :py_found
echo.
echo [INFO] Instalasi selesai. Jika masih belum terdeteksi, tutup jendela ini dan buka ulang run.bat.
pause
goto :cleanup_fail

:no_winget_fallback
if exist "%~dp0SIBA_PDF_PORTABLE.html" (
    echo [INFO] Silakan instal Python 3 dari https://www.python.org/downloads/
    echo        Pastikan mencentang "Add Python to PATH" saat instalasi.
    echo.
    set "OPEN_PORTABLE="
    set /p "OPEN_PORTABLE=Buka versi offline SIBA_PDF_PORTABLE.html sementara? [Y/N]: "
    if /i "%OPEN_PORTABLE%"=="Y" (
        start "" "%~dp0SIBA_PDF_PORTABLE.html"
        goto :cleanup_ok
    )
    goto :cleanup_fail
)
echo [ERROR] Silakan instal Python 3 dari https://www.python.org/downloads/
echo         Pastikan mencentang "Add Python to PATH" saat instalasi.
pause
goto :cleanup_fail

:py_found
for %%D in ("%PY_BIN%") do set "PATH=%%~dpD;%%~dpDScripts;%PATH%"
for /f "usebackq delims=" %%V in (`""%PY_BIN%" %PY_ARGS% --version 2>&1"`) do echo [1/4] Menggunakan %%V ^(Lokasi: %PY_BIN%^)

REM 2. Pastikan seluruh dependensi Python tersedia
"%PY_BIN%" %PY_ARGS% -c "import pymupdf, pypdf, fastapi, uvicorn, PIL, multipart" >nul 2>nul
if not errorlevel 1 goto :deps_ok

echo [2/4] Menginstal modul PDF yang diperlukan ^(hanya sekali^)...
"%PY_BIN%" %PY_ARGS% -m pip install -r requirements.txt
if not errorlevel 1 goto :verify_deps

echo [INFO] Mencoba instalasi pip mode --user...
"%PY_BIN%" %PY_ARGS% -m pip install --user -r requirements.txt
if not errorlevel 1 goto :verify_deps

echo [INFO] Mencoba instalasi di environment lokal ^(.venv^)...
"%PY_BIN%" %PY_ARGS% -m venv "%~dp0.venv"
if exist "%~dp0.venv\Scripts\python.exe" (
    set "PY_BIN=%~dp0.venv\Scripts\python.exe"
    set "PY_ARGS="
    goto :install_in_venv
)
goto :deps_failed

:install_in_venv
"%PY_BIN%" -m pip install -r requirements.txt

:verify_deps
"%PY_BIN%" %PY_ARGS% -c "import pymupdf, pypdf, fastapi, uvicorn, PIL, multipart" >nul 2>nul
if not errorlevel 1 goto :deps_ok

:deps_failed
echo.
echo [ERROR] Gagal memasang dependensi Python. Periksa koneksi internet Anda.
pause
goto :cleanup_fail

:deps_ok
echo [2/4] Dependensi Python siap.

if not exist "execution\server.py" (
    echo [ERROR] File execution\server.py tidak ditemukan!
    echo         Pastikan isi file ZIP sudah diekstrak seluruhnya ke folder terlebih dahulu.
    pause
    goto :cleanup_fail
)

if not defined PORT set "PORT=5050"
echo [3/4] Membersihkan proses server lama di port %PORT% ^(jika ada^)...
set "KILLED_OLD="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%PORT% .*LISTENING"') do (
    tasklist /FI "PID eq %%P" /NH 2>nul | findstr /I "python py.exe" >nul && (
        taskkill /F /PID %%P >nul 2>nul
        set "KILLED_OLD=1"
    )
)
if defined KILLED_OLD timeout /t 1 /nobreak >nul 2>nul

echo [4/4] Menyalakan server lokal ^(http://127.0.0.1:%PORT%^) ^& membuka browser...
echo       Jangan tutup jendela ini selama menggunakan aplikasi.
echo       Tekan Ctrl+C untuk menghentikan server.
echo.

"%PY_BIN%" %PY_ARGS% -u "execution\server.py"
set "SRV_ERR=%ERRORLEVEL%"
if not "%SRV_ERR%"=="0" (
    echo.
    echo [PERINGATAN] Server berhenti dengan kode error %SRV_ERR%.
    pause
)
popd >nul 2>nul
exit /b %SRV_ERR%

:cleanup_ok
popd >nul 2>nul
exit /b 0

:cleanup_fail
popd >nul 2>nul
exit /b 1

REM ==============================================================================
REM Subrutin Pencarian Python 3 Komprehensif (tahan stub WindowsApps & no-PATH)
REM ==============================================================================
:find_python
call :try_python "%~dp0.venv\Scripts\python.exe" ""
if defined PY_BIN exit /b 0

for /f "delims=" %%P in ('where python 2^>nul') do call :try_python "%%~P" ""
if defined PY_BIN exit /b 0

for /f "delims=" %%P in ('where python3 2^>nul') do call :try_python "%%~P" ""
if defined PY_BIN exit /b 0

for /f "delims=" %%P in ('where py 2^>nul') do call :try_python "%%~P" "-3"
if defined PY_BIN exit /b 0

call :try_python "%SystemRoot%\py.exe" "-3"
if defined PY_BIN exit /b 0

call :try_python "%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" "-3"
if defined PY_BIN exit /b 0

REM Lokasi default installer Python.org (user & all users) walau belum masuk PATH
for %%V in (314 313 312 311 310 39 38) do (
    call :try_python "%LOCALAPPDATA%\Programs\Python\Python%%V\python.exe" ""
    call :try_python "%ProgramFiles%\Python%%V\python.exe" ""
    call :try_python "%ProgramFiles(x86)%\Python%%V\python.exe" ""
    call :try_python "%SystemDrive%\Python%%V\python.exe" ""
)
if defined PY_BIN exit /b 0

for /d %%D in ("%LOCALAPPDATA%\Programs\Python\Python*") do call :try_python "%%~fD\python.exe" ""
if defined PY_BIN exit /b 0

for /d %%D in ("%ProgramFiles%\Python*") do call :try_python "%%~fD\python.exe" ""
if defined PY_BIN exit /b 0

REM WinGet Links / Conda / Miniconda / uv
call :try_python "%LOCALAPPDATA%\Microsoft\WinGet\Links\python.exe" ""
call :try_python "%LOCALAPPDATA%\Microsoft\WinGet\Links\python3.exe" ""
call :try_python "%USERPROFILE%\anaconda3\python.exe" ""
call :try_python "%USERPROFILE%\miniconda3\python.exe" ""
call :try_python "%LOCALAPPDATA%\anaconda3\python.exe" ""
call :try_python "%LOCALAPPDATA%\miniconda3\python.exe" ""
call :try_python "C:\ProgramData\anaconda3\python.exe" ""
call :try_python "C:\ProgramData\miniconda3\python.exe" ""
if defined PY_BIN exit /b 0

REM Fallback Registry PythonCore (HKCU & HKLM)
for %%H in ("HKCU\Software\Python\PythonCore" "HKLM\SOFTWARE\Python\PythonCore" "HKLM\SOFTWARE\WOW6432Node\Python\PythonCore") do (
    for /f "delims=" %%K in ('reg query %%H 2^>nul') do (
        for /f "tokens=2,*" %%A in ('reg query "%%~K\InstallPath" /ve 2^>nul ^| findstr /I "REG_"') do (
            call :try_python "%%~Bpython.exe" ""
            call :try_python "%%~B\python.exe" ""
        )
    )
)
exit /b 0

:try_python
if defined PY_BIN exit /b 0
set "CAND=%~1"
set "CARG=%~2"
if "%CAND%"=="" exit /b 0
if not exist "%CAND%" exit /b 0

REM Hindari stub 0-byte Microsoft Store di WindowsApps agar tidak gagal/buka MS Store
echo "%CAND%" | find /I "\Microsoft\WindowsApps\" >nul
if not errorlevel 1 (
    for %%Z in ("%CAND%") do (
        if "%%~zZ"=="0" exit /b 0
    )
)

"%CAND%" %CARG% -c "import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)" >nul 2>nul
if errorlevel 1 exit /b 0

set "PY_BIN=%CAND%"
set "PY_ARGS=%CARG%"
exit /b 0
