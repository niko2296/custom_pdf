# Riset Komprehensif: Arsitektur & Menu iLovePDF Serta Spesifikasi Fitur "Target Max Size PDF Compressor"

Dokumen ini merupakan SOP & hasil riset mendalam terkait struktur menu, arsitektur teknis, dan mekanisme kerja platform **iLovePDF (https://www.ilovepdf.com/)**, serta spesifikasi rekayasa fitur baru: **Target Maximum Size PDF Compression (Very Optimized - Anti-Pecah)** untuk aplikasi web portable (khususnya ramah macOS / MacBook).

---

## 1. Riset Struktur Menu & Fitur iLovePDF

iLovePDF membagi fiturnya ke dalam 6 kategori utama dengan 25+ modul perkakas dokumen:

### A. Organize PDF (Manajemen Struktur Halaman)
* **Merge PDF**: Menggabungkan beberapa file PDF menjadi satu file secara berurutan.
* **Split PDF**: Memecah halaman tertentu, rentang halaman (ranges), atau mengekstrak setiap halaman menjadi file PDF terpisah.
* **Remove Pages**: Menghapus halaman-halaman yang tidak diinginkan dari dokumen.
* **Extract Pages**: Memilih halaman individual untuk dijadikan file baru.
* **Organize PDF**: Mengatur ulang urutan halaman (drag & drop visual), memutar per halaman, atau menyisipkan halaman kosong.
* **Scan to PDF**: Menangkap dokumen fisik melalui kamera perangkat dan mengonversinya langsung ke PDF.

### B. Optimize PDF (Optimalisasi & Perbaikan)
* **Compress PDF**: Memperkecil ukuran file PDF dengan mengurangi resolusi gambar dan menghapus metadata redundan.
* **Repair PDF**: Memperbaiki file PDF yang rusak (corrupted cross-reference table / xref) agar bisa dibuka kembali.
* **OCR PDF**: Mengubah PDF hasil scan (gambar) menjadi teks yang dapat dicari (*searchable*) dan disalin (*selectable*).

### C. Convert to PDF (Konversi Menuju PDF)
* **JPG to PDF**: Mengubah gambar JPEG/PNG menjadi halaman PDF.
* **Word to PDF**: Mengonversi format `.doc` / `.docx` ke `.pdf` dengan mempertahankan layout.
* **PowerPoint to PDF**: Mengonversi slide presentasi `.ppt` / `.pptx` ke PDF.
* **Excel to PDF**: Mengonversi spreadsheet `.xls` / `.xlsx` ke PDF dengan penyesuaian batas cetak.
* **HTML to PDF**: Mengonversi URL halaman web menjadi dokumen PDF.

### D. Convert from PDF (Ekspor dari PDF)
* **PDF to JPG**: Mengekstrak setiap halaman PDF menjadi gambar berkualitas tinggi atau mengekstrak gambar yang tertanam.
* **PDF to Word**: Rekonstruksi dokumen PDF menjadi file Word yang dapat diedit (*editable document*).
* **PDF to PowerPoint**: Mengekstrak slide dan konten ke PPTX.
* **PDF to Excel**: Mengekstrak tabel data dalam PDF ke format spreadsheet.
* **PDF to PDF/A**: Mengonversi PDF ke standar arsip jangka panjang (ISO 19005).

### E. Edit PDF (Penyuntingan Konten)
* **Rotate PDF**: Memutar orientasi seluruh atau sebagian halaman (90°, 180°, 270°).
* **Add Page Numbers**: Menambahkan nomor halaman kustom (posisi header/footer, format 1/n, font, ukuran).
* **Add Watermark**: Membubuhkan teks cap air atau stempel gambar logo dengan transparansi kustom.
* **Crop PDF**: Memotong margin halaman PDF.
* **Edit PDF**: Menambahkan teks, bentuk geometris (panah, kotak), tanda tangan, dan gambar secara visual.

### F. PDF Security (Keamanan & Legalitas)
* **Unlock PDF**: Menghilangkan proteksi password pemilik (*owner password / permission password*) untuk mencetak atau menyalin.
* **Protect PDF**: Mengenkripsi dokumen dengan password (*AES 128-bit / 256-bit*).
* **Sign PDF**: Menandatangani dokumen secara digital atau tanda tangan elektronik bersertifikat.
* **Redact PDF**: Menghapus permanen teks atau area sensitif (blok hitam) sehingga tidak dapat diakses kembali.
* **Compare PDF**: Menampilkan perbandingan visual sisi-demi-sisi antara dua versi dokumen.

---

## 2. Cara Kerja Teknis di Balik iLovePDF (Backend Pipeline)

1. **Ingestion & Client-Side Handling**:
   * File diunggah melalui browser via XMLHttpRequest / Fetch API dengan *chunked upload* untuk file besar.
   * File diberi UUID unik dan disimpan sementara di cache storage (Amazon S3 / Google Cloud Storage / Local Redis/Disk).
2. **Processing Pipeline (Worker Architecture)**:
   * **Task Dispatcher**: Pesan tugas masuk ke queue (RabbitMQ / Redis Queue).
   * **Engine Eksekusi**:
     * Manipulasi struktural (Merge, Split, Rotate, Compress, Encrypt): Menggunakan binary C/C++ cepat seperti **MuPDF**, **QPDF**, **Ghostscript**, atau **pdfcpu**.
     * Konversi Office (Word/Excel/PPT): Menggunakan **LibreOffice headless** / engine konversi proprietary yang berjalan di container microservices.
     * OCR: Menggunakan **Tesseract OCR** atau neural network model untuk pengenalan karakter multi-bahasa.
3. **Penyimpanan Sementara & Siklus Hidup Dokumen (Privacy Lifecycle)**:
   * iLovePDF menerapkan kebijakan penghapusan otomatis (*auto-purge*) maksimal 2 jam setelah proses selesai demi privasi pengguna.
4. **Download Delivery**:
   * Output file dikemas (zip untuk file jamak) dan URL download sementara diberikan ke browser pengguna.

---

## 3. Kelemahan Menu "Compress PDF" iLovePDF Saat Ini

Pada menu Compress PDF bawaan iLovePDF, pengguna **hanya diberikan 3 opsi statis**:
1. *Extreme Compression*: Kualitas gambar diturunkan drastis, seringkali membuat teks scan menjadi blur/pecah (*unreadable*).
2. *Recommended Compression*: Opsi default seimbang, namun seringkali file hasilnya masih melebihi batas upload tertentu.
3. *Less Compression*: Kompresi sangat ringan, file tetap relatif besar.

### Masalah Nyata di Lapangan:
Di dunia nyata (terutama di Indonesia), instansi pemerintahan (CPNS / SSCASN, BKN, SIMPEG), portal kerja (JobStreet, Kalibrr, LinkedIn), pendaftaran visa, dan portal beasiswa mensyaratkan **Batas Ukuran Maksimal Pasti**:
* Misalnya: Dokumen ijazah / transkrip / SKCK harus **maksimal 500 KB** atau **maksimal 300 KB**.
* Jika pengguna memakai "Recommended", file berukuran 600 KB akan ditolak sistem instansi.
* Jika pengguna beralih ke "Extreme", file mengecil ke 150 KB tapi teksnya pecah sehingga berisiko gugur administrasi!

---

## 4. Solusi & Spesifikasi Fitur Baru: "Target Max Size (Anti-Pecah)"

Fitur inovasi yang kita bangun mengintegrasikan mode: **"Target Ukuran Maksimal"** dengan algoritma kompresi adaptif yang menjaga integritas dokumen.

### Algoritma Kompresi "Very Optimize - Tidak Pecah":
1. **Preservasi Elemen Vektor & Font (Vector-Safe Compression)**:
   * Tidak merasterisasi teks asli menjadi gambar pixel. Font teks dan garis vektor dipertahankan 100% tajam, sehingga saat dizoom 500% tetap tajam sempurna.
2. **Adaptive Image XObject Re-encoding (Binary Search Optimizer)**:
   * Skrip memindai seluruh *image stream* (gambar/foto yang tertanam) di dalam PDF.
   * Resolusi gambar (DPI) diturunkan secara proporsional menggunakan filter *Lanczos downsampling* hanya jika resolusinya melebihi 150-180 DPI.
   * Dilakukan **Binary Search pada Parameter Kualitas JPEG ($Q \in [30, 92]$)**:
     - Iterasi mencari nilai $Q$ tertinggi yang menghasilkan ukuran file tepat $\le \text{Target Size}$.
     - Algoritma berhenti saat selisih ukuran mendekati target (misal target 500 KB, hasil 480-495 KB) tanpa mengorbankan kualitas secara berlebihan.
3. **Flate Stream Deflate & Metadata Scrubbing**:
   * Menghapus cache thumbnail (`/Thumb`), metadata XML duplikat, dan *unused object garbage* (`clean=True, deflate=True, garbage=4`).
4. **Preset Cepat Populer**:
   * Tombol cepat: `300 KB` (e-KTP/BKN), `500 KB` (CPNS/PNS), `1 MB` (Job Portal), `2 MB` (Visa/Email), serta input angka bebas (KB/MB).

---

## 5. Spesifikasi Aplikasi Web Portable untuk MacBook & Multi-Platform

* **Zero-Setup Architecture**:
  * Aplikasi berjalan langsung di web browser lokal (`http://localhost:5000` atau `http://127.0.0.1:5000`).
  * Backend menggunakan Python yang sangat ringan, didukung modul native C-binding PyMuPDF (super cepat, efisien memori).
* **Portabilitas Tinggi**:
  * Seluruh aplikasi berada dalam satu folder ringkas.
  * Cukup jalankan `./run.sh` di Terminal MacBook (atau klik ganda `run.bat` di Windows). Skrip otomatis mendeteksi lingkungan, menginstal dependensi minimal yang diperlukan, menjalankan server, dan membuka browser Safari/Chrome secara otomatis.
* **Standar Tampilan UI**:
  * Menggunakan **Clean Light UI System** (gaya Apple / modern SaaS).
  * **Desain Bersih & Fungsional**: Tanpa gradien berlebihan atau efek visual mengganggu. Garis tepi rapi, tipografi sans-serif bersih, ruang putih (whitespace) yang proporsional, dan palet warna profesional.
  * **Ikon Standar & Presisi**: Ikon SVG 24×24 bersih berbasis Google Material Symbols & Lucide, tajam pada layar Retina Display MacBook.

