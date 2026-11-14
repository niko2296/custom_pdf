# Directive: PDF Compression Engine with Target Max Size (Smart Optimizer)

## 1. Goal
Menyediakan modul pemrosesan deterministik untuk mengompresi dokumen PDF dengan target ukuran maksimal tertentu (misal: 500 KB, 1 MB, dll.) dengan menjaga ketajaman visual teks dan gambar semaksimal mungkin (anti-pecah).

## 2. Input & Output
* **Input**:
  - `input_pdf_path`: Path file PDF asli.
  - `mode`: `"target_size"` (ukuran pasti) atau preset `"recommended"`, `"extreme"`, `"low"`.
  - `target_size_kb`: Angka target ukuran maksimal dalam Kilobyte (contoh: 500).
  - `max_image_dpi`: Batas maksimal resolusi gambar yang diizinkan (default 150-180 DPI agar tetap tajam di layar dan cetak).
* **Output**:
  - `output_pdf_path`: Path file PDF yang sudah teroptimasi.
  - `metrics`: Dictionary berisi:
    - `original_size`: Ukuran sebelum dikompresi (bytes).
    - `compressed_size`: Ukuran setelah dikompresi (bytes).
    - `reduction_pct`: Persentase pengecilan (%).
    - `quality_profile`: Keterangan profil kompresi yang diterapkan.
    - `target_met`: Boolean apakah target ukuran tercapai.

## 3. Strategi Optimasi (Multi-Tier Optimization)

### Tahap 1: Analisis Dokumen Awal
1. Hitung ukuran dokumen $S_0$.
2. Jika $S_0 \le S_{target}$, lakukan pembersihan struktur ringan (*lossless cleanup & stream deflation*) tanpa mengubah raster gambar apapun.
3. Ekstraksi daftar seluruh *image object* (xref) di seluruh halaman beserta dimensi pixel dan frekuensi penggunaannya.

### Tahap 2: Preservasi Vektor & Teks (Anti-Pecah)
1. Teks, font subset (Type1, TrueType, OpenType, CIDFont), tabel, dan elemen vektor (garis, kurva Bezier) **TIDAK BOLEH DIRASTERISASI**.
2. Elemen-elemen ini hanya dibersihkan metadata-nya dan dikompresi menggunakan kompresor lossless `/FlateDecode` (Zlib Deflate level 9).

### Tahap 3: Target Size Binary Search pada Image Streams
Ukuran dokumen PDF scan/campuran 90%+ didominasi oleh gambar. Untuk mencapai target ukuran secara presisi:
1. Hitung rasio kompresi yang dibutuhkan $R = S_{target} / S_0$.
2. Tentukan rentang pencarian kualitas JPEG: $Q_{min} = 30$, $Q_{max} = 90$.
3. Tentukan batas resolusi maksimal (clamping):
   - Jika dokumen beresolusi super tinggi (>200 DPI), turunkan skala ke dimensi target (misal lebar maksimum 1600px atau ~150 DPI) menggunakan *Bicubic/Lanczos resampling*.
4. Lakukan **Pencarian Adaptif (Adaptive Search / Binary Search)**:
   - Evaluasi ukuran dokumen pada titik uji $Q_{mid} = (Q_{min} + Q_{max}) / 2$.
   - Jika ukuran $\le S_{target}$ dan dalam selisih toleransi (misal 5% dari target), simpan sebagai kandidat optimal.
   - Jika ukuran $> S_{target}$, perketat pencarian ke rentang bawah $Q_{max} = Q_{mid} - 1$.
   - Jika ukuran jauh di bawah target, tingkatkan kualitas $Q_{min} = Q_{mid} + 1$.
   - Maksimal 4-5 iterasi (rata-rata konvergen dalam < 1.5 detik pada PyMuPDF).

### Tahap 4: Fallback & Edge Cases
* **Edge Case 1: Dokumen Pure Text / Vektor**:
  Jika dokumen tidak memiliki gambar tetapi ukurannya besar karena font tertanam, sistem menerapkan *font deduplication* dan *garbage collection*. Jika ukuran teks tetap di atas target, sistem mengembalikan file terkecil yang memungkinkan dan memberikan label: *"Tercapai kompresi maksimal struktur teks tanpa merusak isi."*
* **Edge Case 2: Dokumen Terkunci / Terenkripsi**:
  Sistem meminta password dokumen terlebih dahulu sebelum melakukan kompresi.

## 4. Lokasi Skrip Eksekusi
* `execution/compress_engine.py`: Engine kompresi deterministik.
* `execution/pdf_tools.py`: Utilitas pembantu manipulasi PDF (merge, split, rotate, protect, unlock, export).

