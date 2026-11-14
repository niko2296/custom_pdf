# SIBA SURYA PDF - Portable Web UI & Smart Target Max Size PDF Compressor

Aplikasi Web UI PDF mandiri (*portable*), ringan, dan estetik (*Clean Light UI*) dengan identitas resmi **SIBA SURYA** yang dirancang khusus untuk kemudahan eksekusi instan di **MacBook (macOS)** maupun Windows/Linux. 

Dilengkapi dengan inovasi **"Target Max Size PDF Compressor"**: Anda dapat menentukan batas ukuran maksimal hasil kompresi (misal: 300 KB untuk e-KTP/BKN, 500 KB untuk berkas CPNS/SSCASN, 1 MB untuk portal kerja, atau nilai kustom KB/MB), dengan teknologi **Preservasi Vektor & Adaptif Binary Search** sehingga tulisan/dokumen **tidak pecah atau blur**.

---

## Panduan Menjalankan di MacBook (macOS) - Buka Langsung Ready!

Aplikasi ini dikemas sangat ringkas dan portabel. Anda cukup menyalin satu folder `SIBA PDF THINGS` ini ke MacBook Anda (via Flashdisk, AirDrop, atau Google Drive):

### Pilihan 1: INSTAN & ZERO-INSTALL (Sangat Direkomendasikan)
1. Di Finder MacBook Anda, cukup **klik ganda (double-click)** file:
   `SIBA_PDF_PORTABLE.html`
2. Aplikasi langsung terbuka dan aktif di **Safari / Google Chrome**!
   - **100% Offline & Mandiri**: Tanpa perlu instalasi Python, pip, ataupun Terminal.
   - **Bebas Masalah Izin/Privilege**: Langsung jalan di semua versi macOS (Sonoma, Sequoia, Ventura, Monterey).
   - Fitur lengkap: Kompres Target Size, Gabung, Pisah, Putar, Konversi, dan PRO Editor!

### Pilihan 2: Menggunakan Server Backend Python (Port 5050)
1. Klik ganda file:
   `Buka_SIBA_PDF.command`
   *(Port otomatis diatur ke 5050 untuk menghindari bentrok dengan AirPlay macOS)*.
2. Jika macOS menampilkan pesan *"access privileges"* (karena file disalin dari Windows):
   Cukup buka **Terminal**, geser folder ini ke Terminal, dan jalankan:
   ```bash
   bash run.sh
   ```
   Aplikasi akan otomatis menginstal library dan membuka browser di `http://127.0.0.1:5050`.

> **Untuk Pengguna Windows:** Cukup klik ganda file `run.bat` atau buka `SIBA_PDF_PORTABLE.html`.

---

## Fitur PRO: Make Any PDF Editable + Real-Time OCR (Key: 1507)

* **Tombol Mengambang (Floating Button)** di kanan bawah layar: "Unlock PRO".
* Masukkan key otorisasi: **`1507`**.
* Terbuka tab baru berwarna merah dengan efek animasi kilau glossy (**PRO Editor**) pada satu baris navigasi yang rapi.
* **Fitur Editor Interaktif & Real-Time OCR (Optical Character Recognition)**:
  - **Pindai Teks Digital & Dokumen Scan (OCR)**: Mendeteksi teks digital secara instan. Jika dokumen berupa hasil scan fisik, foto kertas, atau kuitansi, engine **Tesseract OCR WebAssembly** otomatis aktif secara real-time memindai setiap baris dan kata dengan progress bar interaktif!
  - **In-Place Live Text Editing**: Setiap kata dan baris hasil OCR langsung dapat diklik dan diedit (*contenteditable*), diubah katanya, atau dihapus langsung di kanvas.
  - **Tombol "Pindai OCR Ulang"**: Pengguna dapat memicu pemindaian ulang OCR kapan saja untuk mendeteksi tulisan samar.
  - **Tambah Teks & Gambar**: Tambah teks baru di posisi mana pun dan sisipkan gambar dari PC/Mac Anda (dapat digeser & disesuaikan).
  - **Seamless Inpainting & Blending**: Teks lama yang diedit/dihapus ditimpa dengan *background color sampling* yang menyatu dengan warna kertas dokumen aslinya, lalu teks baru dirender dengan ketajaman tinggi.
  - **Privasi & Keamanan**: Status PRO tersimpan di memori (akan kembali terkunci otomatis saat halaman di-refresh atau sesi ditutup).

---

## Hasil Riset: Menu & Cara Kerja Website iLovePDF

Berdasarkan riset mendalam terhadap platform **https://www.ilovepdf.com/**:

### 1. Struktur Menu iLovePDF
* **Organize PDF**: *Merge PDF*, *Split PDF*, *Remove Pages*, *Extract Pages*, *Organize PDF*, *Scan to PDF*.
* **Optimize PDF**: *Compress PDF*, *Repair PDF*, *OCR PDF*.
* **Convert to PDF**: *JPG to PDF*, *Word to PDF*, *PowerPoint to PDF*, *Excel to PDF*, *HTML to PDF*.
* **Convert from PDF**: *PDF to JPG*, *PDF to Word*, *PowerPoint*, *Excel*, *PDF/A*.
* **Edit PDF**: *Rotate*, *Page Numbers*, *Add Watermark*, *Crop*, *Edit PDF (Annotation)*.
* **PDF Security**: *Unlock PDF*, *Protect PDF*, *Sign PDF*, *Redact PDF*, *Compare PDF*.

### 2. Cara Kerja di Balik Layar (Backend Pipeline)
1. **Upload & Task Queue**: Browser mengirim file secara terbagi (*chunked upload*) ke server backend, lalu masuk ke antrean tugas (Message Queue).
2. **Worker Processing Engine**: Backend memanggil *native low-level binaries* (seperti MuPDF, Ghostscript, QPDF, LibreOffice Headless, Tesseract OCR) untuk memanipulasi dokumen.
3. **Penyimpanan Sementara & Privasi**: iLovePDF menerapkan kebijakan penghapusan otomatis (*auto-purge*) maksimal 2 jam setelah selesai diproses.
4. **Kelemahan Kompresi iLovePDF**: Pengguna **hanya diberi 3 opsi statis**: *Extreme*, *Recommended*, dan *Less*. 
   - Sering kali, hasil *Recommended* masih melebihi batas upload instansi (misal masih 650 KB dari batas 500 KB).
   - Saat memilih *Extreme*, dokumen diturunkan kualitasnya terlalu drastis hingga teks scan blur/pecah (*unreadable*).
   - iLovePDF **tidak memiliki menu penyesuaian target ukuran maksimal pasti**.

---

## Solusi: Menu Tambahan "Target Ukuran Maksimal" (Anti-Pecah)

Siba PDF Suite menambahkan fitur yang memecahkan masalah di atas:

### Mengapa File Tetap Tajam ("Very Optimize & Anti-Pecah")?
1. **Preservasi Teks & Garis Vektor (Vector-Safe Engine)**:
   Banyak aplikasi kompresi murahan merasterisasi seluruh halaman PDF menjadi gambar beresolusi rendah, sehingga tulisan menjadi kabur saat dizoom. Siba PDF **TIDAK PERNAH merasterisasi elemen vektor**. Teks font (TrueType/OpenType), tabel, dan garis tetap 100% vektor murni.
2. **Binary Search pada Parameter Kualitas JPEG ($Q \in [28, 92]$)**:
   Hanya stream gambar (foto/scan) yang dioptimasi. Algoritma melakukan *adaptive binary search* untuk menemukan parameter kualitas tertinggi yang ukurannya pas $\le \text{Target Ukuran}$.
3. **Lanczos Downsampling Clamping**:
   Jika gambar scan beresolusi sangat besar (>300 DPI), resolusi diturunkan secara proporsional ke rentang 150-180 DPI (standar emas yang tetap tajam untuk layar dan cetak).
4. **Pembersihan Struktur Lossless**:
   Menghapus metadata usang, duplikasi font, dan thumbnail cache melalui kompresi `/FlateDecode` level 9.

---

## Desain Antarmuka Pengguna (Clean Light UI)

* **Desain Apple & SaaS Modern**: Latar belakang putih bersih (`#ffffff`, `#f8fafc`), garis tepi halus (`#e2e8f0`), tipografi sans-serif modern, bayangan ambient yang halus (*subtle elevation*).
* **Ikon Standar Google Material & Lucide**: Seluruh ikon dibuat menggunakan format SVG *stroke-based* 24×24 yang sangat tajam di layar Retina Display MacBook.
* **Fitur Kontrol Kompresi**:
  - Tombol cepat: **300 KB** (e-KTP/BKN), **500 KB** (CPNS/SSCASN), **1 MB** (Job Portal/LinkedIn), **2 MB** (Visa/Email).
  - Slider dan kotak angka bebas dalam KB/MB.
  - Komparasi visual instan (Ukuran Awal vs Ukuran Baru vs Persentase Penghematan).

---

## Struktur Proyek (3-Layer Architecture)

```
SIBA PDF THINGS/
├── directives/                                # Layer 1: SOP & Petunjuk Kerja
│   ├── ilovepdf_research_and_specs.md         # Riset lengkap arsitektur iLovePDF & spesifikasi
│   └── compress_target_size_engine.md         # Directive teknis optimasi kompresi
├── execution/                                 # Layer 3: Skrip Deterministik Python
│   ├── compress_engine.py                     # Engine kompresi target size & binary search
│   ├── pdf_tools.py                           # Utilitas PDF (Merge, Split, Rotate, Protect)
│   └── server.py                              # Backend FastAPI & Web Server lokal
├── static/                                    # Aset Web UI
│   ├── css/style.css                          # Desain Light Mode rapi
│   └── js/app.js                              # Logika frontend, drag & drop, interaksi slider
├── templates/
│   └── index.html                             # Antarmuka web utama
├── .tmp/                                      # File pemrosesan sementara
├── run.sh                                     # Launcher 1-klik untuk MacBook (macOS) / Linux
├── run.bat                                    # Launcher 1-klik untuk Windows
├── requirements.txt                           # Dependensi minimal (PyMuPDF, FastAPI, Pillow)
└── README.md                                  # Dokumentasi lengkap
```

