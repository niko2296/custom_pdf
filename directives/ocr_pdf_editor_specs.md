# SOP & Spesifikasi Teknis: OCR & Precision PDF Editor (PRO Mode)

## 1. Latar Belakang & Masalah Plasing / Font pada PDF
Pada dokumen bisnis dan korespondensi resmi (seperti surat penawaran harga, tabel tarif muatan, kuitansi, atau dokumen kontrak):
- Teks sering tersusun dalam **format multi-kolom**, seperti tabel tarif ("RUTE TRUK", "HARGA", "KETERANGAN") atau tanda tangan ganda berdampingan ("Hormat kami," di kiri dan "Menyetujui," di kanan).
- Jika sistem memindai teks berdasarkan baris penuh (*line-level grouping*), teks dari kolom-kolom yang berjauhan akan tergabung menjadi satu kalimat panjang dan terdorong ke sisi kiri, merusak susunan asli dokumen.
- Selain itu, jenis font (*font-family*), ukuran (*font-size*), dan format visual seperti **BOLD (Tebal)**, *Italic (Miring)*, serta <u>Underline (Garis Bawah)</u> harus dideteksi secara otomatis agar editan teks menyatu sempurna dengan dokumen asli tanpa efek bayangan ganda (*ghosting*).

---

## 2. Arsitektur Segmentasi Presisi (Span-Level & Multi-Column Protection)

### Aturan Segmentasi Koordinat:
1. **Pemisahan Antar Kolom**:
   - Jika jarak horizontal antar kata atau span melebihi $1.2 \times \text{font\_size}$ (seperti spasi tabel, tabulator, atau kolom tanda tangan), teks **DILARANG DIGABUNG**.
   - Setiap kolom atau frase diperlakukan sebagai blok mandiri dengan koordinat $x_0, y_0, x_1, y_1$ presisi.
2. **Penggabungan Frase Sewajar Baca**:
   - Teks yang berada pada baseline Y yang sama ($\Delta Y \le 3.5\text{ pt}$), dengan jenis font & ukuran yang identik, dan spasi baca normal ($\Delta X < 0.9 \times \text{font\_size}$) digabungkan menjadi satu kalimat agar nyaman diedit.
3. **Konversi Viewport Canvas Tanpa Distorsi**:
   - Menghitung koordinat piksel kanvas menggunakan fungsi matriks resmi `viewport.convertToViewportRectangle([x, yBottom, xRight, yTop])` untuk PDF digital, dan segmentasi berbasis kata (*word-level grouping*) pada OCR Tesseract.

---

## 3. Sistem Auto-Detect Font, Ukuran, & Format

### A. Deteksi Font Family:
Sistem mendeteksi metadata font asli dokumen dan memetakannya ke web-safe & system font:
- **Serif / Roman**: `Times New Roman`, `Times`, `Georgia`, `Cambria` $\rightarrow$ `'Times New Roman', Times, serif` (PyMuPDF code: `tiro`, `tibo`, `tiit`, `tibi`).
- **Sans-Serif**: `Arial`, `Helvetica`, `Calibri`, `Segoe UI` $\rightarrow$ `Arial, Helvetica, sans-serif` (PyMuPDF code: `helv`, `hebo`, `heit`, `hebi`).
- **Monospace**: `Courier`, `Courier New`, `Consolas` $\rightarrow$ `'Courier New', Courier, monospace` (PyMuPDF code: `cour`, `cobo`, `coit`, `cobi`).

### B. Deteksi Status Font Style:
- **BOLD**: Dideteksi dari flag bit-16 atau nama font yang mengandung kata `bold`, `black`, `heavy`, `w7`, `w8`, `medium`.
- **ITALIC**: Dideteksi dari flag bit-2 atau nama font yang mengandung kata `italic`, `oblique`, `slanted`.
- **UNDERLINE**: 
  - **Deteksi Otomatis Digital**: Menginspeksi path gambar vektor (`page.get_drawings()`) yang sejajar di bawah baseline teks ($\Delta Y \le 4\text{ pt}$) dan memiliki panjang yang sesuai dengan span teks (membedakannya dari garis pembatas tabel/row separator).
  - **Deteksi Kanvas (Browser)**: Menggunakan sampling kontras horizontal piksel di bawah teks untuk mengenali garis bawah baik pada PDF digital maupun dokumen hasil scan OCR.
  - **Seamless Redaction & Render**: Saat diedit, garis bawah lama ikut ter-inpaint/terhapus rapi di background, dan garis bawah baru digambar proporsional mengikuti panjang kata baru (`page.draw_line` & canvas stroke).

---

## 4. Antarmuka Toolbar Formating & Zero-Ghosting Experience

1. **Toolbar Formating Terpadu (`#pro-format-bar`)**:
   - **Pill Auto-Detect**: Menampilkan secara live nama font, ukuran poin, dan atribut (misal: `Auto-Detect: Times New Roman, 12pt [Tebal (Bold)]`) saat pengguna mengeklik teks mana saja.
   - **Dropdown Font Family**: Memungkinkan pergantian font ke Arial, Times New Roman, Courier New, Calibri, Georgia, dll.
   - **Kontrol Ukuran Font**: Tombol `-`, indikator angka pt, dan tombol `+`.
   - **Tombol Format Cepat**: **B** (Bold), *I* (Italic), <u>U</u> (Underline).
   - **Color Picker**: Pemilih warna teks berbasis hex.
   - **Shortcut Keyboard**: Dukungan `Ctrl+B` (Bold), `Ctrl+I` (Italic), dan `Ctrl+U` (Underline).

2. **Teknik Eliminasi Ghosting (Double Text)**:
   - Pada kondisi diam (*idle/unfocused*), kotak teks bersifat transparan dengan garis putus-putus tipis sehingga dokumen asli kanvas terlihat 100% jernih dan tajam tanpa pergeseran bayangan.
   - Saat teks diklik atau difokuskan untuk diedit (`:focus`), kotak teks mengaktifkan latar belakang inpainting kertas (`#ffffff` atau warna sampel dokumen) yang menutupi teks lama di kanvas, sehingga pengguna hanya melihat satu teks aktif yang sedang diedit.
   - Teks yang telah diubah tetap ter-inpaint dan menampilkan teks editan baru secara rapi.

---

## 5. Alur Simpan & Render Ulang (Seamless Back-Rendering)

Saat pengguna menekan tombol `Simpan & Download PDF`:
1. **PyMuPDF Backend**:
   - Area teks asli di-redact dengan warna sampel latar belakang dokumen.
   - Teks baru disisipkan menggunakan font code yang sesuai (`tiro`, `tibo`, `hebo`, `heit`, dll.) dengan ukuran font yang tepat.
   - Jika `is_underline: true`, garis bawah digambar menggunakan `page.draw_line` dengan ketebalan proporsional $0.06 \times \text{font\_size}$.
2. **Client Fallback (In-Browser Offline Mode)**:
   - Kanvas beresolusi tinggi (2.0x DPI) merender teks editan menggunakan `ctx.font = "${style}${weight}${size}px ${fontFam}"`.
   - Garis bawah digambar dengan `ctx.stroke()` dan diekspor ke PDF berkualitas cetak via PDFLib.

---

## 6. Spesifikasi Penanganan Dokumen Hasil Pindai / Scan (Contoh: Surat Domisili)

Pada dokumen berbasis gambar hasil scan (seperti `Surat Domisili Silbang 2026 (1) (2).pdf`):
1. **Pencegahan Ghosting Mutlak**:
   - Kotak teks idle wajib menggunakan `color: transparent !important; background: transparent !important;`.
   - Tidak ada inline style `color` pada elemen idle.
   - Latar belakang `#ffffff` (atau warna kertas sampel) hanya aktif saat diklik/diedit atau sudah dimodifikasi sehingga tulisan lama di bitmap tertutup 100%.
2. **Kalibrasi Ukuran Font A4**:
   - Pada paragraf atau kalimat yang memiliki tinggi bounding box $> 22\text{ pt}$, tinggi dinormalisasi berdasarkan perkiraan baris $N = \text{round}(h / 14)$ agar ukuran font tetap di kisaran $10.5\text{ pt} - 11.5\text{ pt}$ (ukuran standar surat dinas A4), bukan melonjak ke $25\text{ pt} - 30\text{ pt}$.
   - Judul surat diatur di $13.5\text{ pt}$, dan Kop Surat utama di $14\text{ pt} - 15\text{ pt}$.
3. **Sampling Warna Tinta & Kertas**:
   - Warna tinta di-sample dari piksel gelap dokumen ($\le 160$ brightness), menghasilkan warna hitam pekat resmi (`#111827`) atau warna stempel asli.
   - Warna kertas di-sample dari piksel terang sekitar teks sehingga inpainting tidak meninggalkan bercak kontras.
4. **Deteksi Otomatis BOLD & UNDERLINE**:
   - BOLD diaktifkan otomatis jika kerapatan tinta $> 13.5\%$, atau jika teks berhuruf kapital penuh (Kop/Judul/Nama Pejabat/Nama Perusahaan), atau label isian (seperti `Nama Usaha :`, `Alamat Usaha :`).
   - UNDERLINE dideteksi via baris kontras horizontal tepat di bawah baseline kata.
5. **Kerapian Antarmuka**:
   - Badge "OCR" merah disembunyikan agar tampilan dokumen tetap bersih, elegan, dan berstandar eksekutif.

---

## 7. Kotak Edit Fleksibel & Dinamis (Dynamic Auto-Expanding Width)

Saat pengguna mengetik teks baru yang melebihi ukuran semula:
1. **Perataan Kiri (`align === 'left'`)**:
   - Titik awal kiri (`origLeft`) tetap terkunci.
   - Lebar kotak (`width`) memanjang ke arah kanan secara mulus mengikuti panjang teks baru.
2. **Perataan Tengah (`align === 'center'`)**:
   - Titik pusat horizontal (`origCenterX = origLeft + origWidth / 2`) dipertahankan tetap di tengah.
   - Lebar kotak bertambah dan memanjang ke **dua sisi (kanan dan kiri)** secara simetris: $\text{newLeft} = \text{origCenterX} - \frac{\text{newWidth}}{2}$.
3. **Perataan Kanan (`align === 'right'`)**:
   - Titik kanan (`origRight`) tetap terkunci, kotak memanjang ke arah kiri: $\text{newLeft} = \text{origRight} - \text{newWidth}$.
4. **Batas Bawah Lebar Minimal**:
   - Lebar kotak tidak boleh mengecil melebihi `origWidth` agar teks scan asli di bawahnya tetap tertutup 100% inpainting tanpa kebocoran.
5. **Seamless Save & Inpainting**:
   - Area inpainting menutup gabungan (`union`) dari `orig_bbox` dan `expandedBbox`.
   - PyMuPDF merender teks rata tengah dengan `align=pymupdf.TEXT_ALIGN_CENTER` dan underline simetris terpusat.

---

## 8. Loading Animasi & Persentase Progres (Drag & Drop UX)

1. **Visual Feedback Langsung**:
   - Begitu berkas di-drop atau dipilih lewat tombol picker, dropzone segera beralih menampilkan card loading animasi yang elegan.
2. **Komponen Indikator**:
   - **Circular Ring Progress SVG**: Lingkaran dengan animasi `stroke-dashoffset` halus berputar seiring bertambahnya persentase.
   - **Persentase Digital Real-Time**: Angka tebal (0% hingga 100%) di tengah lingkaran.
   - **Progress Bar Horizontal**: Bar pengisi linear aksen merah PRO di bagian bawah.
   - **Status Teks Dinamis**: Penjelasan aksi sistem (Membaca berkas $\rightarrow$ Merender halaman $\rightarrow$ Menganalisis layer teks $\rightarrow$ Memindai OCR $\rightarrow$ Selesai).
   - **Badge Nama Berkas**: Menampilkan nama file PDF yang sedang diproses.
3. **Transisi Selesai**:
   - Saat mencapai 100%, sistem memberi jeda 250ms sebelum membuka editor visual agar transisi terasa alami dan memuaskan.
