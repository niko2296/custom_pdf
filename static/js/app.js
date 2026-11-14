/**
 * SIBA SURYA PDF Suite - Client Script
 * Complete Hybrid Engine (Python Backend & Instant In-Browser Client Execution)
 * Clean SaaS UX with Full Drag & Drop across all modules
 */

document.addEventListener("DOMContentLoaded", () => {
  // ==========================================
  // NAVIGATION & TAB ROUTING
  // ==========================================
  const navBtns = document.querySelectorAll(".nav-btn");
  const toolSections = document.querySelectorAll(".tool-section");

  function syncProThemeAndLayout(activeTabId = null) {
    const proOn = typeof isProUnlocked !== "undefined" && Boolean(isProUnlocked);
    if (document.documentElement && document.documentElement.classList) {
      document.documentElement.classList.toggle("pro-editor-dark-mode", proOn);
    }
    if (document.body && document.body.classList) {
      document.body.classList.toggle("pro-editor-dark-mode", proOn);
    }
    const proSec = document.getElementById("section-pro");
    const isProTabActive = activeTabId ? activeTabId === "pro" : Boolean(proSec && proSec.classList && proSec.classList.contains("active"));
    const wideOn = proOn && isProTabActive;
    if (document.body && document.body.classList) {
      document.body.classList.toggle("pro-studio-wide", wideOn);
    }
    const mainCont = document.querySelector(".container");
    if (mainCont && mainCont.classList) {
      mainCont.classList.toggle("pro-studio-wide", wideOn);
    }
  }

  function switchTab(targetTabId) {
    navBtns.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === targetTabId);
    });
    toolSections.forEach(sec => {
      sec.classList.toggle("active", sec.id === `section-${targetTabId}`);
    });
    syncProThemeAndLayout(targetTabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  navBtns.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Global Quick Tool Cards Click
  document.querySelectorAll(".tool-card[data-target]").forEach(card => {
    card.addEventListener("click", () => {
      switchTab(card.dataset.target);
    });
  });

  // Format bytes helper
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  // ==========================================
  // UNIVERSAL DRAG & DROP HELPER
  // ==========================================
  function setupDropzone(dropzoneEl, inputEl, onFiles) {
    if (!dropzoneEl || !inputEl) return;

    ["dragenter", "dragover"].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropzoneEl.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzoneEl.classList.remove("dragover");
      });
    });

    dropzoneEl.addEventListener("drop", (e) => {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFiles(Array.from(e.dataTransfer.files));
      }
    });

    dropzoneEl.addEventListener("click", (e) => {
      // If clicking button or container, trigger file input
      if (e.target !== inputEl) {
        inputEl.click();
      }
    });

    inputEl.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        onFiles(Array.from(e.target.files));
      }
    });
  }

  // ==========================================
  // 1. COMPRESS PDF CONTROLLER
  // ==========================================
  const compressDropzone = document.getElementById("compress-dropzone");
  const compressFileInput = document.getElementById("compress-file-input");
  const compressFilePreview = document.getElementById("compress-file-preview");
  const compressFileName = document.getElementById("compress-file-name");
  const compressFileSize = document.getElementById("compress-file-size");
  const compressBtnRemove = document.getElementById("compress-btn-remove");
  const compressOptions = document.getElementById("compress-options");

  const modeTargetBtn = document.getElementById("mode-target-btn");
  const modePresetBtn = document.getElementById("mode-preset-btn");
  const targetBox = document.getElementById("target-box");
  const classicalGrid = document.getElementById("classical-grid");

  const targetSlider = document.getElementById("target-slider");
  const targetNumInput = document.getElementById("target-num-input");
  const presetPills = document.querySelectorAll(".preset-pill");
  const presetCards = document.querySelectorAll(".preset-card");

  const btnStartCompress = document.getElementById("btn-start-compress");
  const compressProgress = document.getElementById("compress-progress");
  const compressProgressText = document.getElementById("compress-progress-text");
  const compressResult = document.getElementById("compress-result");

  let selectedCompressFile = null;
  let currentCompressMode = "target_size"; // "target_size" | "preset"
  let currentPreset = "recommended";

  function handleCompressFile(file) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Silakan pilih dokumen dengan ekstensi .pdf");
      return;
    }
    selectedCompressFile = file;
    compressFileName.textContent = file.name;
    compressFileSize.textContent = `Ukuran awal: ${formatBytes(file.size)}`;

    compressDropzone.style.display = "none";
    compressFilePreview.style.display = "flex";
    compressOptions.style.display = "block";
    compressResult.style.display = "none";

    // Suggest default target (500 KB or 60% of file size)
    const fileKb = Math.round(file.size / 1024);
    if (fileKb > 500) {
      setTargetKb(500);
    } else {
      setTargetKb(Math.max(100, Math.round(fileKb * 0.6)));
    }
  }

  setupDropzone(compressDropzone, compressFileInput, (files) => {
    if (files.length > 0) handleCompressFile(files[0]);
  });

  compressBtnRemove.addEventListener("click", (e) => {
    e.stopPropagation();
    selectedCompressFile = null;
    compressFileInput.value = "";
    compressDropzone.style.display = "block";
    compressFilePreview.style.display = "none";
    compressOptions.style.display = "none";
    compressResult.style.display = "none";
    compressProgress.style.display = "none";
  });

  // Switch Target vs Preset Mode
  modeTargetBtn.addEventListener("click", () => {
    currentCompressMode = "target_size";
    modeTargetBtn.classList.add("active");
    modePresetBtn.classList.remove("active");
    targetBox.style.display = "block";
    classicalGrid.style.display = "none";
  });

  modePresetBtn.addEventListener("click", () => {
    currentCompressMode = "preset";
    modePresetBtn.classList.add("active");
    modeTargetBtn.classList.remove("active");
    targetBox.style.display = "none";
    classicalGrid.style.display = "grid";
  });

  function setTargetKb(kb) {
    targetSlider.value = kb;
    targetNumInput.value = kb;
    presetPills.forEach(p => {
      p.classList.toggle("active", parseInt(p.dataset.val) === kb);
    });
  }

  targetSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value);
    targetNumInput.value = val;
    presetPills.forEach(p => {
      p.classList.toggle("active", parseInt(p.dataset.val) === val);
    });
  });

  targetNumInput.addEventListener("input", (e) => {
    let val = parseInt(e.target.value) || 100;
    val = Math.max(50, Math.min(20000, val));
    targetSlider.value = val;
    presetPills.forEach(p => {
      p.classList.toggle("active", parseInt(p.dataset.val) === val);
    });
  });

  presetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      const val = parseInt(pill.dataset.val);
      setTargetKb(val);
    });
  });

  presetCards.forEach(card => {
    card.addEventListener("click", () => {
      presetCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      currentPreset = card.dataset.preset;
    });
  });

  // Start Compression (Hybrid: Server API with Client Fallback)
  btnStartCompress.addEventListener("click", async () => {
    if (!selectedCompressFile) return;

    btnStartCompress.disabled = true;
    compressProgress.style.display = "block";
    compressResult.style.display = "none";

    const targetKb = parseInt(targetNumInput.value) || 500;
    if (currentCompressMode === "target_size") {
      compressProgressText.textContent = `Mengoptimasi dokumen ke target maksimal ${targetKb} KB...`;
    } else {
      compressProgressText.textContent = `Menjalankan kompresi preset '${currentPreset}'...`;
    }

    // Try Python Server API first
    let serverSuccess = false;
    try {
      const formData = new FormData();
      formData.append("file", selectedCompressFile);
      formData.append("mode", currentCompressMode);
      if (currentCompressMode === "target_size") {
        formData.append("target_kb", targetKb);
      } else {
        formData.append("preset", currentPreset);
      }

      const response = await fetch("/api/compress", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          serverSuccess = true;
          btnStartCompress.disabled = false;
          compressProgress.style.display = "none";
          displayCompressResult(data);
          return;
        }
      }
    } catch (e) {
      // Server not reachable (offline / standalone HTML file mode)
    }

    // Client-side fallback engine (100% in-browser)
    try {
      compressProgressText.textContent = "Memproses kompresi langsung di memori browser...";
      const clientResult = await clientCompressPdf(selectedCompressFile, currentCompressMode, targetKb, currentPreset);
      btnStartCompress.disabled = false;
      compressProgress.style.display = "none";
      displayCompressResult(clientResult);
    } catch (clientErr) {
      btnStartCompress.disabled = false;
      compressProgress.style.display = "none";
      alert("Gagal mengompresi PDF: " + clientErr.message);
    }
  });

  function displayCompressResult(data) {
    compressResult.style.display = "block";
    const statusBadge = document.getElementById("res-status-badge");
    if (data.target_met) {
      statusBadge.className = "result-badge-status badge-success";
      statusBadge.innerHTML = `<svg class="ui-icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"></polyline></svg> Target Tercapai!`;
    } else {
      statusBadge.className = "result-badge-status badge-warning";
      statusBadge.innerHTML = `<svg class="ui-icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Kompresi Optimal Selesai`;
    }

    document.getElementById("res-orig-size").textContent = formatBytes(data.original_size);
    document.getElementById("res-comp-size").textContent = formatBytes(data.compressed_size);
    document.getElementById("res-saved-pct").textContent = `-${data.reduction_pct}%`;
    document.getElementById("res-note").textContent = data.note || "Target ukuran berhasil dioptimasi dengan preservasi teks tajam.";

    const btnDownload = document.getElementById("res-btn-download");
    btnDownload.href = data.download_url;
    btnDownload.download = data.filename;

    // Auto-trigger instant download on successful compression
    triggerAutoDownload(data.download_url, data.filename, `Kompresi PDF selesai (${formatBytes(data.compressed_size)}, hemat ${data.reduction_pct}%).`);

    compressResult.scrollIntoView({ behavior: "smooth" });
  }

  document.getElementById("res-btn-reset").addEventListener("click", () => {
    compressBtnRemove.click();
  });

  // Client-side PDF Compressor Engine (Adaptive Binary Search Optimizer)
  async function clientCompressPdf(file, mode, targetKb, preset) {
    if (typeof pdfjsLib === "undefined" || typeof PDFLib === "undefined") {
      throw new Error("Library PDF di browser belum siap.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const origSize = file.size;
    const targetBytes = Math.round((targetKb || 500) * 1000);

    // Quick lossless structural repack via PDFLib Object Streams
    try {
      const cleanDoc = await PDFLib.PDFDocument.load(arrayBuffer.slice(0), { ignoreEncryption: true });
      cleanDoc.setTitle("");
      cleanDoc.setProducer("");
      cleanDoc.setCreator("");
      const cleanBytes = await cleanDoc.save({ useObjectStreams: true });
      if (mode === "target_size" && cleanBytes.byteLength <= targetBytes) {
        const useBytes = cleanBytes.byteLength < origSize ? cleanBytes : new Uint8Array(arrayBuffer);
        const blob = new Blob([useBytes], { type: "application/pdf" });
        const reductionPct = Math.max(0, Math.round(((origSize - useBytes.byteLength) / Math.max(1, origSize)) * 100));
        return {
          success: true,
          original_size: origSize,
          compressed_size: useBytes.byteLength,
          reduction_pct: reductionPct,
          target_met: true,
          note: `Target terpenuhi 100% lossless via Object Streams & pembersihan struktur (${formatBytes(useBytes.byteLength)}).`,
          download_url: URL.createObjectURL(blob),
          filename: `compressed_${file.name}`
        };
      }
    } catch (cleanErr) {}

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;

    async function renderWithParams(scaleVal, qVal) {
      const outDoc = await PDFLib.PDFDocument.create();
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: scaleVal });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;

        const dataUrl = canvas.toDataURL("image/jpeg", qVal);
        const imgBytes = await fetch(dataUrl).then(r => r.arrayBuffer());
        const embeddedImg = await outDoc.embedJpg(imgBytes);

        const origViewport = page.getViewport({ scale: 1.0 });
        const outPage = outDoc.addPage([origViewport.width, origViewport.height]);
        outPage.drawImage(embeddedImg, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height
        });
      }
      return await outDoc.save({ useObjectStreams: true });
    }

    let finalBytes = null;
    if (mode !== "target_size") {
      const presetCfg = preset === "extreme"
        ? { scale: 0.72, quality: 0.42 }
        : (preset === "low" ? { scale: 1.35, quality: 0.86 } : { scale: 1.05, quality: 0.72 });
      finalBytes = await renderWithParams(presetCfg.scale, presetCfg.quality);
    } else {
      const rungs = [
        { scale: 1.50, quality: 0.86 },
        { scale: 1.25, quality: 0.78 },
        { scale: 1.05, quality: 0.70 },
        { scale: 0.90, quality: 0.60 },
        { scale: 0.78, quality: 0.50 },
        { scale: 0.66, quality: 0.40 },
        { scale: 0.54, quality: 0.30 }
      ];
      let lo = 0, hi = rungs.length - 1;
      let bestBytes = null;
      let smallestBytes = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const probe = await renderWithParams(rungs[mid].scale, rungs[mid].quality);
        if (!smallestBytes || probe.byteLength < smallestBytes.byteLength) smallestBytes = probe;
        if (probe.byteLength <= targetBytes) {
          bestBytes = probe;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }
      finalBytes = bestBytes || smallestBytes;
    }

    if (finalBytes.byteLength > origSize) {
      finalBytes = new Uint8Array(arrayBuffer);
    }

    const blob = new Blob([finalBytes], { type: "application/pdf" });
    const downloadUrl = URL.createObjectURL(blob);
    const compSize = finalBytes.byteLength;
    const reductionPct = Math.max(0, Math.round(((origSize - compSize) / Math.max(1, origSize)) * 100));

    return {
      success: true,
      original_size: origSize,
      compressed_size: compSize,
      reduction_pct: reductionPct,
      target_met: mode === "target_size" ? (compSize <= targetBytes) : true,
      note: mode === "target_size"
        ? `Ukuran berkurang dari ${formatBytes(origSize)} menjadi ${formatBytes(compSize)} (hemat ${reductionPct}%).`
        : `Kompresi preset '${preset}' selesai dengan penghematan ${reductionPct}%.`,
      download_url: downloadUrl,
      filename: `compressed_${file.name}`
    };
  }

  // ==========================================
  // 2. MERGE PDF CONTROLLER (With Full Drag & Drop & Reset)
  // ==========================================
  const mergeDropzone = document.getElementById("merge-dropzone");
  const mergeFileInput = document.getElementById("merge-file-input");
  const mergeFileList = document.getElementById("merge-file-list");
  const mergeListHeader = document.getElementById("merge-list-header");
  const mergeFileCountBadge = document.getElementById("merge-file-count-badge");
  const btnResetMergeList = document.getElementById("btn-reset-merge-list");
  const btnStartMerge = document.getElementById("btn-start-merge");
  let mergeFiles = [];

  setupDropzone(mergeDropzone, mergeFileInput, (files) => {
    files.forEach(f => {
      if (f.name.toLowerCase().endsWith(".pdf")) {
        mergeFiles.push(f);
      }
    });
    renderMergeList();
  });

  if (btnResetMergeList) {
    btnResetMergeList.addEventListener("click", () => {
      mergeFiles = [];
      if (mergeFileInput) mergeFileInput.value = "";
      renderMergeList();
    });
  }

  // Keyboard shortcut: Cmd + Option + Backspace (Mac) / Ctrl + Alt + Backspace (Windows)
  document.addEventListener("keydown", (e) => {
    const mergeSec = document.getElementById("section-merge");
    const isMergeActive = mergeSec && (mergeSec.classList.contains("active") || mergeSec.style.display === "block");
    if (!isMergeActive) return;
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;

    if ((e.metaKey || e.ctrlKey) && e.altKey && (e.key === "Backspace" || e.key === "Delete")) {
      e.preventDefault();
      if (mergeFiles.length > 0) {
        mergeFiles = [];
        if (mergeFileInput) mergeFileInput.value = "";
        renderMergeList();
      }
    }
  });

  function renderMergeList() {
    mergeFileList.innerHTML = "";
    if (mergeFiles.length === 0) {
      if (mergeListHeader) mergeListHeader.style.display = "none";
      mergeFileList.innerHTML = '<div style="color:var(--text-muted); font-size:14px; text-align:center; padding:12px;">Belum ada file PDF yang dipilih.</div>';
      btnStartMerge.disabled = true;
      return;
    }

    if (mergeListHeader) {
      mergeListHeader.style.display = "flex";
      if (mergeFileCountBadge) {
        mergeFileCountBadge.textContent = `${mergeFiles.length} File`;
      }
    }

    btnStartMerge.disabled = mergeFiles.length < 2;

    mergeFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "file-preview";
      item.style.marginTop = "8px";
      item.innerHTML = `
        <div class="file-preview-left">
          <div class="file-icon">
            <svg class="ui-icon icon-md" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div>
            <div class="file-name">${index + 1}. ${file.name}</div>
            <div class="file-size">${formatBytes(file.size)}</div>
          </div>
        </div>
        <button type="button" class="btn-remove-file" title="Hapus file" data-idx="${index}">
          <svg class="ui-icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;

      item.querySelector(".btn-remove-file").addEventListener("click", () => {
        mergeFiles.splice(index, 1);
        renderMergeList();
      });

      mergeFileList.appendChild(item);
    });
  }

  btnStartMerge.addEventListener("click", async () => {
    if (mergeFiles.length < 2) return;
    btnStartMerge.disabled = true;
    btnStartMerge.textContent = "Menggabungkan...";

    // Try server first
    try {
      const formData = new FormData();
      mergeFiles.forEach(f => formData.append("files", f));
      const res = await fetch("/api/merge", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          btnStartMerge.disabled = false;
          btnStartMerge.textContent = "Gabungkan File PDF";
          showSimpleDownload(data.download_url, data.filename, `Berhasil menggabungkan ${data.total_files} file PDF (${data.total_pages} halaman).`);
          return;
        }
      }
    } catch (e) {}

    // Client fallback
    try {
      const mergedPdf = await PDFLib.PDFDocument.create();
      for (const file of mergeFiles) {
        const bytes = await file.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }
      const outBytes = await mergedPdf.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);
      btnStartMerge.disabled = false;
      btnStartMerge.textContent = "Gabungkan File PDF";
      showSimpleDownload(downloadUrl, "merged_document.pdf", `Berhasil menggabungkan ${mergeFiles.length} file PDF (${mergedPdf.getPageCount()} halaman).`);
    } catch (err) {
      btnStartMerge.disabled = false;
      btnStartMerge.textContent = "Gabungkan File PDF";
      alert("Error menggabungkan: " + err.message);
    }
  });

  // ==========================================
  // 3. SPLIT PDF CONTROLLER (With Drag & Drop)
  // ==========================================
  const splitDropzone = document.getElementById("split-dropzone");
  const splitFileInput = document.getElementById("split-file-input");
  const splitFileName = document.getElementById("split-file-name");
  const splitRangeInput = document.getElementById("split-range-input");
  const btnStartSplit = document.getElementById("btn-start-split");
  let splitFile = null;

  setupDropzone(splitDropzone, splitFileInput, (files) => {
    if (files.length > 0) {
      splitFile = files[0];
      splitFileName.textContent = `${splitFile.name} (${formatBytes(splitFile.size)})`;
      splitFileName.style.display = "block";
      btnStartSplit.disabled = false;
    }
  });

  btnStartSplit.addEventListener("click", async () => {
    if (!splitFile) return;
    btnStartSplit.disabled = true;
    btnStartSplit.textContent = "Memproses pemisahan...";

    // Try server first
    try {
      const formData = new FormData();
      formData.append("file", splitFile);
      formData.append("ranges", splitRangeInput.value || "1-3");
      const res = await fetch("/api/split", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          btnStartSplit.disabled = false;
          btnStartSplit.textContent = "Pisahkan PDF Sekarang";
          showSimpleDownload(data.download_url, data.filename, `Berhasil memisahkan PDF.`);
          return;
        }
      }
    } catch (e) {}

    // Client fallback
    try {
      const bytes = await splitFile.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes);
      const total = doc.getPageCount();
      const outDoc = await PDFLib.PDFDocument.create();

      const parts = splitRangeInput.value.split(",");
      const pageIndices = [];
      parts.forEach(p => {
        p = p.trim().toLowerCase();
        if (p === "all") {
          for (let i = 0; i < total; i++) pageIndices.push(i);
        } else if (p.includes("-")) {
          const [s, e] = p.split("-").map(n => parseInt(n.trim(), 10));
          for (let i = s; i <= e; i++) if (i >= 1 && i <= total) pageIndices.push(i - 1);
        } else {
          const n = parseInt(p, 10);
          if (n >= 1 && n <= total) pageIndices.push(n - 1);
        }
      });

      const copied = await outDoc.copyPages(doc, pageIndices);
      copied.forEach(p => outDoc.addPage(p));
      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      btnStartSplit.disabled = false;
      btnStartSplit.textContent = "Pisahkan PDF Sekarang";
      showSimpleDownload(URL.createObjectURL(blob), `split_${splitFile.name}`, `Berhasil mengekstrak ${pageIndices.length} halaman.`);
    } catch (err) {
      btnStartSplit.disabled = false;
      btnStartSplit.textContent = "Pisahkan PDF Sekarang";
      alert("Error memisahkan PDF: " + err.message);
    }
  });

  // ==========================================
  // 4. ROTATE PDF CONTROLLER (With Drag & Drop)
  // ==========================================
  const rotateDropzone = document.getElementById("rotate-dropzone");
  const rotateFileInput = document.getElementById("rotate-file-input");
  const rotateFileName = document.getElementById("rotate-file-name");
  const rotateDegrees = document.getElementById("rotate-degrees");
  const btnStartRotate = document.getElementById("btn-start-rotate");
  let rotateFile = null;

  setupDropzone(rotateDropzone, rotateFileInput, (files) => {
    if (files.length > 0) {
      rotateFile = files[0];
      rotateFileName.textContent = `${rotateFile.name} (${formatBytes(rotateFile.size)})`;
      rotateFileName.style.display = "block";
      btnStartRotate.disabled = false;
    }
  });

  btnStartRotate.addEventListener("click", async () => {
    if (!rotateFile) return;
    btnStartRotate.disabled = true;
    btnStartRotate.textContent = "Memutar...";

    // Try server first
    try {
      const formData = new FormData();
      formData.append("file", rotateFile);
      formData.append("degrees", rotateDegrees.value);
      const res = await fetch("/api/rotate", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          btnStartRotate.disabled = false;
          btnStartRotate.textContent = "Putar Halaman PDF";
          showSimpleDownload(data.download_url, data.filename, `Halaman PDF berhasil diputar.`);
          return;
        }
      }
    } catch (e) {}

    // Client fallback
    try {
      const bytes = await rotateFile.arrayBuffer();
      const doc = await PDFLib.PDFDocument.load(bytes);
      const deg = parseInt(rotateDegrees.value, 10) || 90;
      doc.getPages().forEach(p => {
        const existing = p.getRotation().angle;
        p.setRotation(PDFLib.degrees(existing + deg));
      });
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      btnStartRotate.disabled = false;
      btnStartRotate.textContent = "Putar Halaman PDF";
      showSimpleDownload(URL.createObjectURL(blob), `rotated_${rotateFile.name}`, `PDF berhasil diputar ${deg}° searah jarum jam.`);
    } catch (err) {
      btnStartRotate.disabled = false;
      btnStartRotate.textContent = "Putar Halaman PDF";
      alert("Error memutar: " + err.message);
    }
  });

  // ==========================================
  // 5. PROTECT & UNLOCK PDF (With Drag & Drop)
  // ==========================================
  const protectDropzone = document.getElementById("protect-dropzone");
  const protectFileInput = document.getElementById("protect-file-input");
  const protectFileName = document.getElementById("protect-file-name");
  const protectPassword = document.getElementById("protect-password");
  const btnStartProtect = document.getElementById("btn-start-protect");
  const secModeProtectBtn = document.getElementById("sec-mode-protect-btn");
  const secModeUnlockBtn = document.getElementById("sec-mode-unlock-btn");
  const protectPwLabel = document.getElementById("protect-pw-label");

  let protectFile = null;
  let currentSecMode = "protect"; // "protect" | "unlock"

  secModeProtectBtn.addEventListener("click", () => {
    currentSecMode = "protect";
    secModeProtectBtn.classList.add("active");
    secModeUnlockBtn.classList.remove("active");
    protectPwLabel.textContent = "Masukkan Password Baru:";
    btnStartProtect.textContent = "Enkripsi & Kunci Dokumen";
  });

  secModeUnlockBtn.addEventListener("click", () => {
    currentSecMode = "unlock";
    secModeUnlockBtn.classList.add("active");
    secModeProtectBtn.classList.remove("active");
    protectPwLabel.textContent = "Masukkan Password Dokumen:";
    btnStartProtect.textContent = "Hapus Password PDF";
  });

  setupDropzone(protectDropzone, protectFileInput, (files) => {
    if (files.length > 0) {
      protectFile = files[0];
      protectFileName.textContent = `${protectFile.name} (${formatBytes(protectFile.size)})`;
      protectFileName.style.display = "block";
      btnStartProtect.disabled = false;
    }
  });

  btnStartProtect.addEventListener("click", async () => {
    if (!protectFile) return;
    const pw = protectPassword.value;
    if (!pw) {
      alert("Silakan masukkan password terlebih dahulu.");
      return;
    }

    btnStartProtect.disabled = true;
    btnStartProtect.textContent = "Memproses...";

    const endpoint = currentSecMode === "protect" ? "/api/protect" : "/api/unlock";
    try {
      const formData = new FormData();
      formData.append("file", protectFile);
      formData.append("password", pw);
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      btnStartProtect.disabled = false;
      btnStartProtect.textContent = currentSecMode === "protect" ? "Enkripsi & Kunci Dokumen" : "Hapus Password PDF";

      if (data.success) {
        showSimpleDownload(data.download_url, data.filename, currentSecMode === "protect" ? "PDF berhasil dienkripsi dan dikunci sandi." : "Password PDF berhasil dibuka.");
      } else {
        alert("Gagal memproses keamanan: " + data.error);
      }
    } catch (e) {
      btnStartProtect.disabled = false;
      btnStartProtect.textContent = currentSecMode === "protect" ? "Enkripsi & Kunci Dokumen" : "Hapus Password PDF";
      alert("Error: " + e.message);
    }
  });

  // ==========================================
  // 6. CONVERT CONTROLLER (PDF <-> Images)
  // ==========================================
  const convModeP2iBtn = document.getElementById("conv-mode-p2i-btn");
  const convModeI2pBtn = document.getElementById("conv-mode-i2p-btn");
  const convP2iBox = document.getElementById("conv-p2i-box");
  const convI2pBox = document.getElementById("conv-i2p-box");

  convModeP2iBtn.addEventListener("click", () => {
    convModeP2iBtn.classList.add("active");
    convModeI2pBtn.classList.remove("active");
    convP2iBox.style.display = "block";
    convI2pBox.style.display = "none";
  });

  convModeI2pBtn.addEventListener("click", () => {
    convModeI2pBtn.classList.add("active");
    convModeP2iBtn.classList.remove("active");
    convP2iBox.style.display = "none";
    convI2pBox.style.display = "block";
  });

  // Mode A: PDF to Images
  const p2iDropzone = document.getElementById("p2i-dropzone");
  const p2iFileInput = document.getElementById("p2i-file-input");
  const p2iFileName = document.getElementById("p2i-file-name");
  const btnStartP2i = document.getElementById("btn-start-p2i");
  let p2iFile = null;

  setupDropzone(p2iDropzone, p2iFileInput, (files) => {
    if (files.length > 0) {
      p2iFile = files[0];
      p2iFileName.textContent = `${p2iFile.name} (${formatBytes(p2iFile.size)})`;
      p2iFileName.style.display = "block";
      btnStartP2i.disabled = false;
    }
  });

  btnStartP2i.addEventListener("click", async () => {
    if (!p2iFile) return;
    btnStartP2i.disabled = true;
    btnStartP2i.textContent = "Mengekstrak halaman...";

    try {
      const formData = new FormData();
      formData.append("file", p2iFile);
      const res = await fetch("/api/pdf-to-img", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          btnStartP2i.disabled = false;
          btnStartP2i.textContent = "Ekstrak Halaman ke JPEG (ZIP)";
          showSimpleDownload(data.download_url, data.filename, `Berhasil mengekstrak ${data.page_count} halaman ke JPEG.`);
          return;
        }
      }
    } catch (e) {}

    // Client fallback: render pages to jpeg and download
    try {
      const bytes = await p2iFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      for (let i = 1; i <= Math.min(5, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
        const a = document.createElement("a");
        a.href = canvas.toDataURL("image/jpeg", 0.9);
        a.download = `page_${i}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      btnStartP2i.disabled = false;
      btnStartP2i.textContent = "Ekstrak Halaman ke JPEG (ZIP)";
    } catch (err) {
      btnStartP2i.disabled = false;
      btnStartP2i.textContent = "Ekstrak Halaman ke JPEG (ZIP)";
      alert("Error: " + err.message);
    }
  });

  // Mode B: Images to PDF
  const i2pDropzone = document.getElementById("i2p-dropzone");
  const i2pFileInput = document.getElementById("i2p-file-input");
  const i2pFileCount = document.getElementById("i2p-file-count");
  const btnStartI2p = document.getElementById("btn-start-i2p");
  let i2pFiles = [];

  setupDropzone(i2pDropzone, i2pFileInput, (files) => {
    i2pFiles = files;
    if (i2pFiles.length > 0) {
      i2pFileCount.textContent = `${i2pFiles.length} gambar dipilih`;
      i2pFileCount.style.display = "block";
      btnStartI2p.disabled = false;
    }
  });

  btnStartI2p.addEventListener("click", async () => {
    if (i2pFiles.length === 0) return;
    btnStartI2p.disabled = true;
    btnStartI2p.textContent = "Mengonversi ke PDF...";

    try {
      const formData = new FormData();
      i2pFiles.forEach(f => formData.append("files", f));
      const res = await fetch("/api/img-to-pdf", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          btnStartI2p.disabled = false;
          btnStartI2p.textContent = "Gabungkan Semua Gambar ke PDF";
          showSimpleDownload(data.download_url, data.filename, `Berhasil menggabungkan ${data.total_images} gambar ke PDF.`);
          return;
        }
      }
    } catch (e) {}

    // Client fallback
    try {
      const doc = await PDFLib.PDFDocument.create();
      for (const f of i2pFiles) {
        const bytes = await f.arrayBuffer();
        let img;
        if (f.type === "image/png") img = await doc.embedPng(bytes);
        else img = await doc.embedJpg(bytes);
        const p = doc.addPage([img.width, img.height]);
        p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      btnStartI2p.disabled = false;
      btnStartI2p.textContent = "Gabungkan Semua Gambar ke PDF";
      showSimpleDownload(URL.createObjectURL(blob), "converted_images.pdf", `Berhasil menggabungkan ${i2pFiles.length} gambar ke PDF.`);
    } catch (err) {
      btnStartI2p.disabled = false;
      btnStartI2p.textContent = "Gabungkan Semua Gambar ke PDF";
      alert("Error konversi: " + err.message);
    }
  });

  // ==========================================
  // 7. PRO MODE & INTERACTIVE VISUAL EDITOR
  // ==========================================
  let isProUnlocked = false;
  let currentProFile = null;
  let currentProPageIdx = 0;
  let currentProTotalPages = 1;
  const BASE_PRO_SCALE = 1.5;
  let currentProZoom = 1.0;
  let currentProScale = BASE_PRO_SCALE;
  let currentProEdits = {}; // id -> { id, bbox, orig_bbox, original, new_text, deleted, size, font, web_font, font_code, is_bold, is_italic, is_underline, align, color, bg_color }
  let currentAddedTexts = [];
  let currentAddedImages = [];
  let currentHighlights = [];
  let currentDrawings = [];
  let currentAddedSymbols = [];
  let currentPageTextBlocks = [];
  let currentPageImageBlocks = [];
  let currentProImageEdits = {};
  let selectedImageBlockId = null;
  let currentPageSize = { width: 595, height: 842 };
  let currentDocSourceType = "";
  let currentProEditorMode = "standard"; // "standard" | "illustrator"
  let currentBgLayerDataUrl = null;
  let currentEmbeddedFonts = [];
  let proPagesState = {}; // pageIdx -> { edits, imageEdits, addedTexts, addedImages, highlights, drawings, symbols }
  let clientPdfDoc = null; // for browser-side fallback
  let activeEditBlock = null;
  let activeEditElement = null;
  let activeBBoxFrameEl = null;
  let currentEditorMode = "select"; // "select" | "addtext" | "highlight" | "draw" | "symbol"
  let activeHighlightColor = "#fde047";
  let activeDrawColor = "#dc2626";
  let activeDrawWidth = 2.5;
  let activeSymbolChar = "✓";
  let activeSymbolColor = "#16a34a";
  let selectedDrawingId = null;
  let proUndoStack = [];
  let proRedoStack = [];
  const MAX_UNDO_STEPS = 40;

  const btnFloatingPro = document.getElementById("btn-floating-pro");
  const proModal = document.getElementById("pro-modal");
  const proModalClose = document.getElementById("pro-modal-close");
  const proKeyInput = document.getElementById("pro-key-input");
  const btnSubmitKey = document.getElementById("btn-submit-key");
  const proErrorMsg = document.getElementById("pro-error-msg");
  const navBtnPro = document.getElementById("nav-btn-pro");

  const proUploadView = document.getElementById("pro-upload-view");
  const proUploadGrid = document.getElementById("pro-upload-grid");
  const proEditorView = document.getElementById("pro-editor-view");
  const proDropzone = document.getElementById("pro-dropzone");
  const proFileInput = document.getElementById("pro-file-input");
  const proDropzoneIllustrator = document.getElementById("pro-dropzone-illustrator");
  const proFileInputIllustrator = document.getElementById("pro-file-input-illustrator");
  const proBtnLivePreview = document.getElementById("pro-btn-live-preview");
  const proDocFilename = document.getElementById("pro-doc-filename");
  const proPageIndicator = document.getElementById("pro-page-indicator");
  const proBtnPrevPage = document.getElementById("pro-btn-prev-page");
  const proBtnNextPage = document.getElementById("pro-btn-next-page");
  const proBtnUndo = document.getElementById("pro-btn-undo");
  const proBtnRedo = document.getElementById("pro-btn-redo");
  const proBtnZoomOut = document.getElementById("pro-btn-zoom-out");
  const proZoomLabel = document.getElementById("pro-zoom-label");
  const proBtnZoomIn = document.getElementById("pro-btn-zoom-in");
  const proPageImg = document.getElementById("pro-page-img");
  const proStage = document.getElementById("pro-stage");
  const proHighlightOverlays = document.getElementById("pro-highlight-overlays");
  const proDrawSvg = document.getElementById("pro-draw-svg");
  const proImageOverlays = document.getElementById("pro-image-overlays");
  const proTextOverlays = document.getElementById("pro-text-overlays");
  const proAddedOverlays = document.getElementById("pro-added-overlays");
  const proBtnAddText = document.getElementById("pro-btn-add-text");
  const proImageUploadInput = document.getElementById("pro-image-upload-input");
  const proBtnChangeDoc = document.getElementById("pro-btn-change-doc");
  const proBtnSaveDownload = document.getElementById("pro-btn-save-download");
  const proOcrCard = document.getElementById("pro-ocr-card");
  const proOcrStatusText = document.getElementById("pro-ocr-status-text");
  const proOcrProgressBar = document.getElementById("pro-ocr-progress-bar");
  const proOcrPct = document.getElementById("pro-ocr-pct");
  const proBtnRunOcr = document.getElementById("pro-btn-run-ocr");
  const proOcrStatusBadge = document.getElementById("pro-ocr-status-badge");

  // Contextual Property Bar & Formatting Toolbar Elements
  const proFormatBar = document.getElementById("pro-format-bar");
  const proPropText = document.getElementById("pro-prop-text");
  const proPropHighlight = document.getElementById("pro-prop-highlight");
  const proPropDraw = document.getElementById("pro-prop-draw");
  const proPropSymbol = document.getElementById("pro-prop-symbol");
  const proSymbolColor = document.getElementById("pro-symbol-color");
  const proDetectLabel = document.getElementById("pro-detect-label");
  const proToolFont = document.getElementById("pro-tool-font");
  const proToolSizeDec = document.getElementById("pro-tool-size-dec");
  const proToolSizeVal = document.getElementById("pro-tool-size-val");
  const proToolSizeInc = document.getElementById("pro-tool-size-inc");
  const proToolSizePreset = document.getElementById("pro-tool-size-preset");
  const proToolLeadingDec = document.getElementById("pro-tool-leading-dec");
  const proToolLeadingVal = document.getElementById("pro-tool-leading-val");
  const proToolLeadingInc = document.getElementById("pro-tool-leading-inc");
  const proToolLeadingPreset = document.getElementById("pro-tool-leading-preset");
  const proToolKerningDec = document.getElementById("pro-tool-kerning-dec");
  const proToolKerningVal = document.getElementById("pro-tool-kerning-val");
  const proToolKerningInc = document.getElementById("pro-tool-kerning-inc");
  const proToolKerningPreset = document.getElementById("pro-tool-kerning-preset");
  const proToolTrackingDec = document.getElementById("pro-tool-tracking-dec");
  const proToolTrackingVal = document.getElementById("pro-tool-tracking-val");
  const proToolTrackingInc = document.getElementById("pro-tool-tracking-inc");
  const proToolTrackingPreset = document.getElementById("pro-tool-tracking-preset");
  const proToolHScaleDec = document.getElementById("pro-tool-hscale-dec");
  const proToolHScaleVal = document.getElementById("pro-tool-hscale-val");
  const proToolHScaleInc = document.getElementById("pro-tool-hscale-inc");
  const proToolHScalePreset = document.getElementById("pro-tool-hscale-preset");
  const proToolBulletList = document.getElementById("pro-tool-bullet-list");
  const proToolNumberList = document.getElementById("pro-tool-number-list");
  const proToolParaSpacingDec = document.getElementById("pro-tool-paraspacing-dec");
  const proToolParaSpacingVal = document.getElementById("pro-tool-paraspacing-val");
  const proToolParaSpacingInc = document.getElementById("pro-tool-paraspacing-inc");
  const proToolParaSpacingPreset = document.getElementById("pro-tool-paraspacing-preset");
  const proToolBold = document.getElementById("pro-tool-bold");
  const proToolItalic = document.getElementById("pro-tool-italic");
  const proToolUnderline = document.getElementById("pro-tool-underline");
  const proToolAlignLeft = document.getElementById("pro-tool-align-left");
  const proToolAlignCenter = document.getElementById("pro-tool-align-center");
  const proToolAlignRight = document.getElementById("pro-tool-align-right");
  const proToolAlignJustifyLeft = document.getElementById("pro-tool-align-justify-left");
  const proToolAlignJustifyCenter = document.getElementById("pro-tool-align-justify-center");
  const proToolAlignJustifyRight = document.getElementById("pro-tool-align-justify-right");
  const proToolAlignJustifyAll = document.getElementById("pro-tool-align-justify-all");
  const proToolColor = document.getElementById("pro-tool-color");

  // Signature Pad Modal Elements
  const proSigModal = document.getElementById("pro-sig-modal");
  const sigModalClose = document.getElementById("sig-modal-close");
  const sigTabBtnDraw = document.getElementById("sig-tab-btn-draw");
  const sigTabBtnType = document.getElementById("sig-tab-btn-type");
  const sigTabBtnUpload = document.getElementById("sig-tab-btn-upload");
  const sigPaneDraw = document.getElementById("sig-pane-draw");
  const sigPaneType = document.getElementById("sig-pane-type");
  const sigPaneUpload = document.getElementById("sig-pane-upload");
  const sigBtnClear = document.getElementById("sig-btn-clear");
  const sigPadCanvas = document.getElementById("sig-pad-canvas");
  const sigTypeInput = document.getElementById("sig-type-input");
  const sigTypePreview = document.getElementById("sig-type-preview");
  const sigUploadInput = document.getElementById("sig-upload-input");
  const sigUploadStatus = document.getElementById("sig-upload-status");
  const sigBtnCancel = document.getElementById("sig-btn-cancel");
  const sigBtnInsert = document.getElementById("sig-btn-insert");

  // Loading Overlay Elements for Drag & Drop and PDF Processing
  const proUploadLoading = document.getElementById("pro-upload-loading");
  const proLoadingRingBar = document.getElementById("pro-loading-ring-bar");
  const proLoadingPct = document.getElementById("pro-loading-pct");
  const proLoadingHeading = document.getElementById("pro-loading-heading");
  const proLoadingSubtext = document.getElementById("pro-loading-subtext");
  const proLoadingProgressBar = document.getElementById("pro-loading-progress-bar");
  const proLoadingFilename = document.getElementById("pro-loading-filename");
  const proLoadingFileLabel = document.getElementById("pro-loading-file-label");

  function saveCurrentPageToPagesState() {
    proPagesState[currentProPageIdx] = {
      edits: JSON.parse(JSON.stringify(currentProEdits || {})),
      imageEdits: JSON.parse(JSON.stringify(currentProImageEdits || {})),
      addedTexts: JSON.parse(JSON.stringify(currentAddedTexts || [])),
      addedImages: JSON.parse(JSON.stringify(currentAddedImages || [])),
      highlights: JSON.parse(JSON.stringify(currentHighlights || [])),
      drawings: JSON.parse(JSON.stringify(currentDrawings || [])),
      symbols: JSON.parse(JSON.stringify(currentAddedSymbols || []))
    };
  }

  function restorePageFromPagesState(pageIdx) {
    const st = proPagesState[pageIdx] || {};
    currentProEdits = JSON.parse(JSON.stringify(st.edits || {}));
    currentProImageEdits = JSON.parse(JSON.stringify(st.imageEdits || {}));
    currentAddedTexts = JSON.parse(JSON.stringify(st.addedTexts || []));
    currentAddedImages = JSON.parse(JSON.stringify(st.addedImages || []));
    currentHighlights = JSON.parse(JSON.stringify(st.highlights || []));
    currentDrawings = JSON.parse(JSON.stringify(st.drawings || []));
    currentAddedSymbols = JSON.parse(JSON.stringify(st.symbols || []));
    selectedDrawingId = null;
    selectedImageBlockId = null;
  }

  function updateUndoRedoButtons() {
    if (proBtnUndo) proBtnUndo.disabled = proUndoStack.length <= 1;
    if (proBtnRedo) proBtnRedo.disabled = proRedoStack.length === 0;
  }

  function captureEditorSnapshot() {
    saveCurrentPageToPagesState();
    return JSON.stringify({
      pageIdx: currentProPageIdx,
      pagesState: proPagesState
    });
  }

  function resetHistoryWithCurrent() {
    proUndoStack = [captureEditorSnapshot()];
    proRedoStack = [];
    updateUndoRedoButtons();
  }

  function pushUndoSnapshot() {
    const snap = captureEditorSnapshot();
    if (proUndoStack.length > 0 && proUndoStack[proUndoStack.length - 1] === snap) {
      return;
    }
    proUndoStack.push(snap);
    if (proUndoStack.length > MAX_UNDO_STEPS) {
      proUndoStack.shift();
    }
    proRedoStack = [];
    updateUndoRedoButtons();
  }

  function applyEmbeddedFontsStylesheet(embeddedFonts) {
    let styleEl = document.getElementById("pro-illustrator-fonts");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pro-illustrator-fonts";
      document.head.appendChild(styleEl);
    }
    function parseVariant(familyName) {
      const raw = String(familyName || "");
      const bold = /(bold|black|heavy|semibold|demi|[-,_]bd\b|[-,_]b\b)/i.test(raw);
      const italic = /(italic|oblique|slanted|inclined|[-,_]it\b)/i.test(raw);
      const stem = raw
        .toLowerCase()
        .replace(/(bolditalic|boldoblique|semibold|demibold|bold|black|heavy|demi|italic|oblique|slanted|inclined|regular|roman|normal|book)/g, "")
        .replace(/[-,_]+(bd|bi|it|b)$/g, "")
        .replace(/[^a-z0-9]/g, "")
        .replace(/(psmt|mt|ps)$/, "");
      return {
        weight: bold ? "bold" : "normal",
        style: italic ? "italic" : "normal",
        stem: stem || raw.toLowerCase().replace(/[^a-z0-9]/g, "")
      };
    }

    const parsed = (embeddedFonts || [])
      .filter(f => f && f.alias && f.data_uri)
      .map(f => ({ ...f, variant: parseVariant(f.family) }));

    const byStem = {};
    parsed.forEach(f => {
      const st = f.variant.stem;
      if (!st) return;
      if (!byStem[st]) byStem[st] = {};
      const slot = `${f.variant.weight}|${f.variant.style}`;
      if (!byStem[st][slot]) byStem[st][slot] = f;
    });

    const rules = [];
    parsed.forEach(f => {
      const alias = String(f.alias).replace(/'/g, "");
      const ownSlot = `${f.variant.weight}|${f.variant.style}`;
      rules.push(
        `@font-face { font-family: '${alias}'; src: url('${f.data_uri}'); font-weight: ${f.variant.weight}; font-style: ${f.variant.style}; font-display: swap; }`
      );
      const siblings = byStem[f.variant.stem] || {};
      Object.keys(siblings).forEach(slotKey => {
        if (slotKey === ownSlot) return;
        const sib = siblings[slotKey];
        rules.push(
          `@font-face { font-family: '${alias}'; src: url('${sib.data_uri}'); font-weight: ${sib.variant.weight}; font-style: ${sib.variant.style}; font-display: swap; }`
        );
      });
    });
    styleEl.textContent = rules.join("\n");
  }

  function syncIllustratorStageVars() {
    if (!proStage) return;
    const isIllus = currentProEditorMode === "illustrator";
    proStage.classList.toggle("illustrator-precision-mode", isIllus);
    proStage.classList.toggle("has-clean-bg", Boolean(isIllus && currentBgLayerDataUrl));
    if (isIllus && currentBgLayerDataUrl) {
      const wPx = roundNum((currentPageSize.width || 595) * currentProScale);
      const hPx = roundNum((currentPageSize.height || 842) * currentProScale);
      proStage.style.setProperty("--illus-bg-image", `url("${currentBgLayerDataUrl}")`);
      proStage.style.setProperty("--illus-bg-w", `${wPx}px`);
      proStage.style.setProperty("--illus-bg-h", `${hPx}px`);
    } else {
      proStage.style.removeProperty("--illus-bg-image");
      proStage.style.removeProperty("--illus-bg-w");
      proStage.style.removeProperty("--illus-bg-h");
    }
  }

  function applyIllustratorBgLayerSlice(el, leftPx, topPx) {
    if (!el) return;
    const lx = parseFloat(leftPx != null ? leftPx : el.style.left) || 0;
    const ty = parseFloat(topPx != null ? topPx : el.style.top) || 0;
    el.style.setProperty("--slice-x", `${roundNum(-lx)}px`);
    el.style.setProperty("--slice-y", `${roundNum(-ty)}px`);
  }

  function rerenderAllEditorLayers() {
    if (proPageImg && currentPageSize.width && currentPageSize.height) {
      proPageImg.style.width = `${currentPageSize.width * currentProScale}px`;
      proPageImg.style.height = `${currentPageSize.height * currentProScale}px`;
    }
    if (proStage && currentPageSize.width && currentPageSize.height) {
      proStage.style.width = `${currentPageSize.width * currentProScale}px`;
      proStage.style.height = `${currentPageSize.height * currentProScale}px`;
    }
    syncIllustratorStageVars();
    if (proZoomLabel) proZoomLabel.textContent = `${Math.round(currentProZoom * 100)}%`;
    renderImageOverlays(currentPageImageBlocks);
    renderTextOverlays(currentPageTextBlocks);
    if (typeof renderHighlights === "function") renderHighlights();
    if (typeof renderDrawings === "function") renderDrawings();
    renderAddedItems();
    if (typeof positionActiveBBoxFrame === "function" && activeEditBlock && activeEditElement) {
      positionActiveBBoxFrame(activeEditBlock, activeEditElement);
    }
  }

  function applyHistorySnapshot(snapStr) {
    if (!snapStr) return;
    const snap = JSON.parse(snapStr);
    proPagesState = snap.pagesState || {};
    if (snap.pageIdx !== currentProPageIdx) {
      currentProPageIdx = snap.pageIdx;
      restorePageFromPagesState(currentProPageIdx);
      loadProPage(currentProPageIdx, false, true);
    } else {
      restorePageFromPagesState(currentProPageIdx);
      rerenderAllEditorLayers();
    }
  }

  function performUndo() {
    if (proUndoStack.length <= 1) return;
    const current = proUndoStack.pop();
    proRedoStack.push(current);
    applyHistorySnapshot(proUndoStack[proUndoStack.length - 1]);
    updateUndoRedoButtons();
  }

  function performRedo() {
    if (proRedoStack.length === 0) return;
    const next = proRedoStack.pop();
    proUndoStack.push(next);
    applyHistorySnapshot(next);
    updateUndoRedoButtons();
  }

  function setEditorToolMode(mode) {
    currentEditorMode = mode || "select";
    document.querySelectorAll(".adobe-dock-btn[data-mode]").forEach(btn => {
      const m = btn.dataset.mode;
      btn.classList.toggle("active", m === currentEditorMode);
    });
    if (proStage) {
      proStage.classList.remove("mode-highlight", "mode-draw", "mode-symbol", "mode-addtext");
      if (currentEditorMode !== "select") {
        proStage.classList.add(`mode-${currentEditorMode}`);
      }
    }
    if (proPropText) proPropText.style.display = (currentEditorMode === "select" || currentEditorMode === "addtext") ? "flex" : "none";
    if (proPropHighlight) proPropHighlight.style.display = (currentEditorMode === "highlight") ? "flex" : "none";
    if (proPropDraw) proPropDraw.style.display = (currentEditorMode === "draw") ? "flex" : "none";
    if (proPropSymbol) proPropSymbol.style.display = (currentEditorMode === "symbol") ? "flex" : "none";

    if (proDetectLabel) {
      if (currentEditorMode === "addtext") {
        proDetectLabel.textContent = "Mode Tambah Teks: Klik pada halaman untuk meletakkan teks";
      } else if (currentEditorMode === "highlight") {
        proDetectLabel.textContent = "Mode Stabilo: Tarik kotak pada area yang ingin disorot";
      } else if (currentEditorMode === "draw") {
        proDetectLabel.textContent = "Mode Pena: Coret atau tandai langsung pada halaman";
      } else if (currentEditorMode === "symbol") {
        proDetectLabel.textContent = `Mode Simbol (${activeSymbolChar}): Klik pada halaman untuk menempel`;
      } else if (!activeEditBlock) {
        proDetectLabel.textContent = "Auto-Detect Font: Klik teks untuk mengedit";
      }
    }
  }

  function setProLoading(visible, percent = 0, title = "", desc = "", fileName = "") {
    if (!proUploadLoading) return;

    if (visible) {
      if (proUploadGrid) proUploadGrid.style.display = "none";
      if (proDropzone) proDropzone.style.display = "none";
      if (proDropzoneIllustrator) proDropzoneIllustrator.style.display = "none";
      proUploadLoading.style.display = "flex";
      if (proEditorView) proEditorView.style.display = "none";
      if (proUploadView) proUploadView.style.display = "block";
    } else {
      proUploadLoading.style.display = "none";
      if (proUploadGrid) proUploadGrid.style.display = "grid";
      if (proDropzone) proDropzone.style.display = "flex";
      if (proDropzoneIllustrator) proDropzoneIllustrator.style.display = "flex";
      return;
    }

    const clampedPct = Math.max(0, Math.min(100, Math.round(percent)));
    if (proLoadingPct) proLoadingPct.textContent = `${clampedPct}%`;
    if (proLoadingProgressBar) proLoadingProgressBar.style.width = `${clampedPct}%`;

    if (proLoadingRingBar) {
      const circumference = 213.63; // 2 * Math.PI * 34
      const offset = circumference - (clampedPct / 100) * circumference;
      proLoadingRingBar.style.strokeDashoffset = offset;
    }

    if (title && proLoadingHeading) proLoadingHeading.textContent = title;
    if (desc && proLoadingSubtext) proLoadingSubtext.textContent = desc;
    if (fileName && proLoadingFileLabel) {
      proLoadingFileLabel.textContent = fileName;
      if (proLoadingFilename) proLoadingFilename.style.display = "inline-flex";
    }
  }

  // Precision Text Measurement Canvas for Dynamic Auto-Expanding Width
  const textMeasureCanvas = document.createElement("canvas");
  const textMeasureCtx = textMeasureCanvas.getContext("2d");

  function measureTextWidth(text, fontSizePx, fontFamily, isBold, isItalic) {
    if (!textMeasureCtx) return (text || "").length * fontSizePx * 0.6;
    const weight = isBold ? "bold " : "normal ";
    const style = isItalic ? "italic " : "";
    textMeasureCtx.font = `${style}${weight}${fontSizePx}px ${fontFamily}`;
    return textMeasureCtx.measureText(text || "").width;
  }

  function getBlockCharSpacingPt(blk) {
    const trk = parseFloat(blk && blk.tracking ? blk.tracking : 0) || 0;
    const krnRaw = blk ? blk.kerning : "auto";
    const krn = (krnRaw != null && krnRaw !== "" && String(krnRaw).toLowerCase() !== "auto") ? (parseFloat(krnRaw) || 0) : 0;
    const sz = parseFloat((blk && (blk.size || blk.font_size)) || 11);
    return ((trk + krn) / 1000.0) * sz;
  }

  function applyCharSpacingAndLeadingStyles(blk, el) {
    if (!blk || !el) return;
    const fSizePt = parseFloat(blk.size || blk.font_size || 11);
    const charPt = getBlockCharSpacingPt(blk);
    el.style.letterSpacing = Math.abs(charPt) > 0.001 ? `${roundNum(charPt * currentProScale)}px` : "0px";
    el.style.fontKerning = (blk.kerning == null || String(blk.kerning).toLowerCase() === "auto") ? "normal" : "none";

    const hScale = Math.max(50, Math.min(200, parseFloat(blk.h_scale || 100) || 100));
    const angleDeg = parseFloat(blk.angle_deg || 0) || 0;
    const transforms = [];
    if (Math.abs(angleDeg) > 0.5) {
      transforms.push(`rotate(${roundNum(-angleDeg)}deg)`);
    }
    if (Math.abs(hScale - 100) > 0.5) {
      transforms.push(`scaleX(${roundNum(hScale / 100)})`);
    }
    if (transforms.length > 0) {
      el.style.transform = transforms.join(" ");
      const al = (blk.align || "left").toLowerCase();
      el.style.transformOrigin = Math.abs(angleDeg) > 0.5
        ? "left bottom"
        : `${al === "center" ? "center" : (al === "right" ? "right" : "left")} center`;
    } else {
      el.style.transform = "";
      el.style.transformOrigin = "";
    }

    const paraGapPt = Math.max(0, parseFloat(blk.para_spacing || 0) || 0);
    el.style.paddingBottom = paraGapPt > 0 ? `${roundNum(paraGapPt * currentProScale)}px` : "0px";

    if (blk.line_height != null && blk.line_height !== "" && String(blk.line_height).toLowerCase() !== "auto" && parseFloat(blk.line_height) > 0) {
      el.style.lineHeight = `${roundNum(parseFloat(blk.line_height) * currentProScale)}px`;
    } else if (blk.is_paragraph) {
      el.style.lineHeight = `${roundNum(fSizePt * 1.25 * currentProScale)}px`;
    } else {
      el.style.lineHeight = "1.08";
    }
  }

  function coalesceRuns(runs) {
    const merged = [];
    (runs || []).forEach(r => {
      if (!r || !r.text) return;
      const last = merged[merged.length - 1];
      if (
        last &&
        r.col_dx == null &&
        Boolean(last.is_bold) === Boolean(r.is_bold) &&
        Boolean(last.is_italic) === Boolean(r.is_italic) &&
        Boolean(last.is_underline) === Boolean(r.is_underline) &&
        (last.color || "#111827") === (r.color || "#111827")
      ) {
        last.text += r.text;
      } else {
        const item = {
          text: String(r.text),
          is_bold: Boolean(r.is_bold),
          is_italic: Boolean(r.is_italic),
          is_underline: Boolean(r.is_underline),
          color: r.color || "#111827"
        };
        if (r.col_dx != null) item.col_dx = r.col_dx;
        if (r.tab_gap != null) item.tab_gap = r.tab_gap;
        merged.push(item);
      }
    });
    return merged;
  }

  function renderRunsToElement(el, runs, fallbackText, baseColor, blk = null) {
    el.textContent = "";
    const cleanRuns = coalesceRuns(runs);
    const hasColTab = cleanRuns.some(r => r.col_dx != null);
    const hasMixed = hasColTab || cleanRuns.length > 1 || (
      cleanRuns.length === 1 && el._hasParagraphMixedCheck
    );
    if (!hasMixed || cleanRuns.length === 0) {
      el.textContent = fallbackText || (cleanRuns[0] ? cleanRuns[0].text : "");
      return;
    }
    const fSizePx = ((blk && (blk.size || blk.font_size)) || 12) * currentProScale;
    const fFam = (el && el.style && el.style.fontFamily) || (blk && (blk.web_font || blk.font)) || "Arial, sans-serif";
    cleanRuns.forEach(r => {
      const sp = document.createElement("span");
      sp.textContent = r.text;
      if (r.is_bold) sp.style.fontWeight = "bold";
      else sp.style.fontWeight = "normal";
      if (r.is_italic) sp.style.fontStyle = "italic";
      else sp.style.fontStyle = "normal";
      if (r.is_underline) sp.style.textDecoration = "underline";
      else sp.style.textDecoration = "none";
      if (r.color && baseColor && r.color.toLowerCase() !== baseColor.toLowerCase()) {
        sp.style.color = r.color;
      }
      if (r.col_dx != null) {
        sp.dataset.colDx = String(r.col_dx);
        if (r.tab_gap != null) {
          sp.dataset.tabGap = String(r.tab_gap);
          const normSpacePx = measureTextWidth(" ", fSizePx, fFam, r.is_bold, r.is_italic);
          const extraPx = (parseFloat(r.tab_gap) * currentProScale) - normSpacePx;
          if (extraPx > 0.3) {
            sp.style.paddingLeft = `${roundNum(extraPx)}px`;
          }
        }
      }
      el.appendChild(sp);
    });
  }

  function extractRunsFromElement(el, blk) {
    const runs = [];
    const baseStyle = {
      is_bold: Boolean(blk.is_bold),
      is_italic: Boolean(blk.is_italic),
      is_underline: Boolean(blk.is_underline),
      color: blk.color || "#111827"
    };

    function walk(node, inherited) {
      if (!node) return;
      if (node.nodeType === 3) {
        if (node.nodeValue) {
          runs.push({ text: node.nodeValue, ...inherited });
        }
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toUpperCase();
      if (tag === "BR") {
        runs.push({ text: "\n", ...inherited });
        return;
      }
      const next = { ...inherited };
      if (node.dataset && node.dataset.colDx != null) {
        next.col_dx = parseFloat(node.dataset.colDx);
      }
      if (node.dataset && node.dataset.tabGap != null) {
        next.tab_gap = parseFloat(node.dataset.tabGap);
      }
      if (tag === "B" || tag === "STRONG") next.is_bold = true;
      else if (node.style && node.style.fontWeight) {
        next.is_bold = (node.style.fontWeight === "bold" || parseInt(node.style.fontWeight, 10) >= 600);
      }
      if (tag === "I" || tag === "EM") next.is_italic = true;
      else if (node.style && node.style.fontStyle) {
        next.is_italic = (node.style.fontStyle === "italic");
      }
      if (tag === "U") next.is_underline = true;
      else if (node.style && node.style.textDecoration) {
        next.is_underline = node.style.textDecoration.includes("underline");
      }
      if (node.style && node.style.color) {
        next.color = node.style.color;
      }
      const isBlockBreak = (tag === "DIV" || tag === "P") && node !== el && runs.length > 0;
      if (isBlockBreak && runs[runs.length - 1].text && !runs[runs.length - 1].text.endsWith("\n")) {
        runs.push({ text: "\n", ...inherited });
      }
      node.childNodes.forEach(child => walk(child, next));
    }

    el.childNodes.forEach(ch => walk(ch, baseStyle));
    return coalesceRuns(runs);
  }

  function mergeParagraphBlocks(lineBlocks, pageWidth, pageIdx) {
    if (!lineBlocks || lineBlocks.length <= 1) {
      return (lineBlocks || []).map(b => ({ ...b, is_paragraph: Boolean(b.is_paragraph) }));
    }
    const formPrefixRe = /^([a-zA-Z0-9]{1,2}\.\s+|:\s*|nip\.|nomor\s*:)/i;
    const sorted = [...lineBlocks].sort((a, b) => {
      const dy = Math.round(a.bbox[1] * 10) - Math.round(b.bbox[1] * 10);
      return dy !== 0 ? dy : (a.bbox[0] - b.bbox[0]);
    });

    const hasNeighbor = new Array(sorted.length).fill(false);
    for (let i = 0; i < sorted.length; i++) {
      const yi = sorted[i].bbox[1];
      for (let j = i + 1; j < sorted.length; j++) {
        if (Math.abs(sorted[j].bbox[1] - yi) < 4.5) {
          hasNeighbor[i] = true;
          hasNeighbor[j] = true;
        } else {
          break;
        }
      }
    }

    const groups = [];
    for (let i = 0; i < sorted.length; i++) {
      const blk = sorted[i];
      const currTxt = (blk.text || "").trim();
      if (hasNeighbor[i] || (blk.align || "left") !== "left" || formPrefixRe.test(currTxt)) {
        groups.push({ lines: [blk], canExtend: false, bodyX0: blk.bbox[0] });
        continue;
      }

      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.canExtend) {
        const prev = lastGroup.lines[lastGroup.lines.length - 1];
        const prevTxt = (prev.text || "").trimEnd();
        const vGap = blk.bbox[1] - prev.bbox[3];
        const sizeOk = Math.abs((prev.size || 11) - (blk.size || 11)) <= 1.5 && prev.font === blk.font;
        const vGapOk = vGap >= -2.5 && vGap <= (prev.size || 11) * 1.25;
        const prevEndsColon = prevTxt.endsWith(":");
        const prevW = prev.bbox[2] - prev.bbox[0];
        const currW = blk.bbox[2] - blk.bbox[0];
        const wideFlow = prevW >= pageWidth * 0.44 || prev.bbox[2] >= pageWidth * 0.65 || (lastGroup.lines.length >= 2 && currW > 60);

        const bodyX0 = lastGroup.bodyX0;
        const dxBody = blk.bbox[0] - bodyX0;
        let xAligned = false;
        let nextBodyX0 = bodyX0;
        if (lastGroup.lines.length === 1) {
          const indentDiff = prev.bbox[0] - blk.bbox[0];
          xAligned = Math.abs(dxBody) <= 20 || (indentDiff > 0 && indentDiff <= 78 && prev.bbox[2] >= pageWidth * 0.62);
          nextBodyX0 = (indentDiff > 0 && indentDiff <= 78) ? blk.bbox[0] : bodyX0;
        } else {
          xAligned = Math.abs(dxBody) <= 22;
          nextBodyX0 = Math.min(bodyX0, blk.bbox[0]);
        }

        if (sizeOk && vGapOk && !prevEndsColon && wideFlow && xAligned) {
          lastGroup.lines.push(blk);
          lastGroup.bodyX0 = nextBodyX0;
          continue;
        }
      }
      groups.push({ lines: [blk], canExtend: !currTxt.endsWith(":"), bodyX0: blk.bbox[0] });
    }

    return groups.map((g, gIdx) => {
      const lines = g.lines;
      if (lines.length === 1) {
        return { ...lines[0], is_paragraph: false };
      }
      const x0 = Math.min(...lines.map(l => l.bbox[0]));
      const y0 = Math.min(...lines.map(l => l.bbox[1]));
      const x1 = Math.max(...lines.map(l => l.bbox[2]));
      const y1 = Math.max(...lines.map(l => l.bbox[3]));

      const rawRuns = [];
      const textParts = [];
      lines.forEach((ln, li) => {
        const cleanLn = (ln.text || "").trim();
        textParts.push(cleanLn);
        const lnRuns = (ln.runs && ln.runs.length > 0) ? ln.runs : [{
          text: cleanLn,
          is_bold: Boolean(ln.is_bold),
          is_italic: Boolean(ln.is_italic),
          is_underline: Boolean(ln.is_underline),
          color: ln.color || "#111827"
        }];
        if (li > 0 && rawRuns.length > 0) {
          rawRuns[rawRuns.length - 1] = { ...rawRuns[rawRuns.length - 1], text: rawRuns[rawRuns.length - 1].text + " " };
        }
        lnRuns.forEach(r => rawRuns.push({ ...r }));
      });
      const coalesced = coalesceRuns(rawRuns);

      const nonFirstX0 = lines.slice(1).map(l => l.bbox[0]);
      const bodyLeft = nonFirstX0.length ? Math.min(...nonFirstX0) : x0;
      let firstIndent = roundNum(Math.max(0, lines[0].bbox[0] - bodyLeft));
      if (firstIndent < 6) firstIndent = 0;

      const steps = [];
      for (let k = 1; k < lines.length; k++) {
        const b1 = lines[k].orig_baseline_y;
        const b0 = lines[k - 1].orig_baseline_y;
        if (b1 != null && b0 != null && b1 > b0) steps.push(b1 - b0);
        else if (lines[k].bbox[1] > lines[k - 1].bbox[1]) steps.push(lines[k].bbox[1] - lines[k - 1].bbox[1]);
      }
      const avgLeading = steps.length
        ? Math.round((steps.reduce((a, b) => a + b, 0) / steps.length) * 10) / 10
        : Math.round((lines[0].size || 11) * 1.25 * 10) / 10;

      const nonLastRights = lines.slice(0, -1).map(l => l.bbox[2]);
      const maxR = Math.max(...nonLastRights);
      const minR = Math.min(...nonLastRights);
      const lastR = lines[lines.length - 1].bbox[2];
      const alignVal = (nonLastRights.length && (maxR - minR) <= 15 && maxR >= pageWidth * 0.62 && lastR < maxR - 14)
        ? "justify"
        : "left";

      const first = lines[0];
      const pBbox = [roundNum(x0), roundNum(y0), roundNum(x1), roundNum(y1)];
      return {
        id: `blk_${first.isOcr ? "ocr" : "c"}_${pageIdx}_p_${gIdx + 1}`,
        bbox: pBbox,
        orig_bbox: [...pBbox],
        text: textParts.join(" "),
        font: first.font,
        web_font: first.web_font,
        font_code: first.font_code,
        size: first.size,
        is_bold: coalesced.every(r => r.is_bold),
        is_italic: coalesced.every(r => r.is_italic),
        is_underline: coalesced.every(r => r.is_underline),
        align: alignVal,
        color: first.color || "#111827",
        bg_color: first.bg_color || "#ffffff",
        isOcr: Boolean(first.isOcr),
        is_paragraph: true,
        text_indent: firstIndent,
        line_height: avgLeading,
        tracking: 0,
        kerning: "auto",
        orig_origin_x: first.orig_origin_x != null ? first.orig_origin_x : null,
        orig_baseline_y: first.orig_baseline_y != null ? first.orig_baseline_y : null,
        ascender: first.ascender != null ? first.ascender : null,
        angle_deg: first.angle_deg || 0,
        has_raster_data: Boolean(first.has_raster_data),
        runs: coalesced
      };
    });
  }

  function updateBlockGeometry(blk, el) {
    if (!blk || !el) return;
    if (blk.isAddedText) {
      const rect = el.getBoundingClientRect();
      blk.w = Math.max(40, Math.round(rect.width / currentProScale) + 12);
      blk.h = Math.max(20, Math.round(rect.height / currentProScale) + 8);
      return;
    }

    if (blk.is_paragraph) {
      const boxW = Math.max(blk.origWidth || 60, el.offsetWidth || blk.origWidth || 60);
      const boxH = Math.max(blk.origHeight || 20, el.scrollHeight || el.offsetHeight || blk.origHeight || 20);
      el.style.left = `${blk.origLeft}px`;
      el.style.width = `${boxW}px`;
      applyIllustratorBgLayerSlice(el, blk.origLeft, blk.origTop);
      blk.expandedBbox = [
        roundNum(blk.origLeft / currentProScale),
        roundNum(blk.origTop / currentProScale),
        roundNum((blk.origLeft + boxW) / currentProScale),
        roundNum((blk.origTop + boxH) / currentProScale)
      ];
      return;
    }

    const currentText = el.textContent || "";
    const fSizePx = (blk.size || 11) * currentProScale;
    const fontFam = blk.web_font || blk.font || "Arial, sans-serif";
    const extraCharPx = Math.max(0, getBlockCharSpacingPt(blk) * currentProScale);
    const hScaleF = Math.max(0.5, Math.min(2.0, (parseFloat(blk.h_scale || 100) || 100) / 100));
    const measuredW = (measureTextWidth(currentText, fSizePx, fontFam, blk.is_bold, blk.is_italic) + (extraCharPx * currentText.length)) * hScaleF + 10;

    // Lebar fleksibel: minimal selebar teks asli agar teks asli tertutup penuh,
    // dan memanjang jika teks baru lebih panjang dari ukuran semula
    const flexWidth = Math.max(blk.origWidth, measuredW);
    const alignVal = blk.align || "left";

    let newLeft = blk.origLeft;
    if (alignVal === "center" || alignVal === "justify-center") {
      // Memanjang ke 2 sisi (kanan dan kiri) secara simetris dari titik tengah awal
      newLeft = blk.origCenterX - flexWidth / 2;
    } else if (alignVal === "right" || alignVal === "justify-right") {
      // Memanjang ke kiri dari batas kanan awal
      newLeft = blk.origRight - flexWidth;
    } else {
      // Rata kiri: memanjang ke kanan dari batas kiri awal
      newLeft = blk.origLeft;
    }

    el.style.left = `${newLeft}px`;
    el.style.width = `${flexWidth}px`;
    applyIllustratorBgLayerSlice(el, newLeft, blk.origTop);

    // Simpan bounding box yang diperluas dalam koordinat PDF (points)
    blk.expandedBbox = [
      roundNum(newLeft / currentProScale),
      blk.bbox[1],
      roundNum((newLeft + flexWidth) / currentProScale),
      blk.bbox[3]
    ];
  }

  // Helper: Client-Side Font Detection (Anti-False Serif + Indonesian Official Docs Support)
  function detectClientFont(fontName, fontFamily, realFontName = "", objBold = false, objItalic = false) {
    const fn = ((realFontName || "") + " " + (fontName || "") + " " + (fontFamily || "")).toLowerCase();
    const isBold = Boolean(objBold) || /(bold|black|heavy|semibold|demi|w7|w8|w9|[-,_]bd\b|[-,_]b\b)/i.test(fn);
    const isItalic = Boolean(objItalic) || /(italic|oblique|slanted|inclined|[-,_]it\b)/i.test(fn);

    // Explicitly check Sans-Serif markers BEFORE checking 'serif' so 'sans-serif' never false-matches 'serif'!
    const hasExplicitSans = /\bsans\b|sans-serif|sans serif|arial|helvetica|tahoma|verdana|calibri|candara|segoe|roboto|inter/i.test(fn);

    let webFont = "Arial, Helvetica, sans-serif";
    let displayName = "Arial";
    let fontCode = isBold ? (isItalic ? "hebi" : "hebo") : (isItalic ? "heit" : "helv");

    if (/bookman|urwbookman/i.test(fn)) {
      webFont = "'Bookman Old Style', 'URW Bookman', Georgia, serif";
      displayName = "Bookman Old Style";
      fontCode = isBold ? (isItalic ? "tibi" : "tibo") : (isItalic ? "tiit" : "tiro");
    } else if (/tahoma/i.test(fn)) {
      webFont = "Tahoma, Geneva, Verdana, sans-serif";
      displayName = "Tahoma";
      fontCode = isBold ? (isItalic ? "hebi" : "hebo") : (isItalic ? "heit" : "helv");
    } else if (/verdana/i.test(fn)) {
      webFont = "Verdana, Geneva, sans-serif";
      displayName = "Verdana";
      fontCode = isBold ? (isItalic ? "hebi" : "hebo") : (isItalic ? "heit" : "helv");
    } else if (/calibri|candara/i.test(fn)) {
      webFont = "Calibri, Candara, sans-serif";
      displayName = "Calibri";
      fontCode = isBold ? (isItalic ? "hebi" : "hebo") : (isItalic ? "heit" : "helv");
    } else if (/segoe/i.test(fn)) {
      webFont = "'Segoe UI', Roboto, sans-serif";
      displayName = "Segoe UI";
      fontCode = isBold ? (isItalic ? "hebi" : "hebo") : (isItalic ? "heit" : "helv");
    } else if (/georgia/i.test(fn)) {
      webFont = "Georgia, serif";
      displayName = "Georgia";
      fontCode = isBold ? (isItalic ? "tibi" : "tibo") : (isItalic ? "tiit" : "tiro");
    } else if (/courier|mono|consolas|menlo|monaco/i.test(fn)) {
      webFont = "'Courier New', Courier, monospace";
      displayName = "Courier New";
      fontCode = isBold ? (isItalic ? "cobi" : "cobo") : (isItalic ? "coit" : "cour");
    } else if (!hasExplicitSans && (/times|roman|cambria|garamond|palatino|minion/i.test(fn) || /serif/i.test(fn))) {
      webFont = "'Times New Roman', Times, serif";
      displayName = "Times New Roman";
      fontCode = isBold ? (isItalic ? "tibi" : "tibo") : (isItalic ? "tiit" : "tiro");
    }

    return { webFont, displayName, fontCode, isBold, isItalic };
  }

  // Helper: Safe Paper Background Sampling (Ignores dark ink, stamps & QR codes)
  function safeSamplePaperBg(ctxRef, x, y, w, h) {
    if (!ctxRef) return "#ffffff";
    try {
      const pts = [
        [x - 2, y - 2], [x + w * 0.25, y - 2], [x + w * 0.5, y - 2], [x + w * 0.75, y - 2], [x + w + 2, y - 2],
        [x - 2, y + h + 2], [x + w * 0.5, y + h + 2], [x + w + 2, y + h + 2],
        [x - 3, y + h * 0.5], [x + w + 3, y + h * 0.5]
      ];
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (const [px, py] of pts) {
        const sx = Math.max(0, Math.min(ctxRef.canvas.width - 1, Math.round(px)));
        const sy = Math.max(0, Math.min(ctxRef.canvas.height - 1, Math.round(py)));
        const d = ctxRef.getImageData(sx, sy, 1, 1).data;
        const bright = (d[0] * 299 + d[1] * 587 + d[2] * 114) / 1000;
        if (bright >= 198) {
          rSum += d[0]; gSum += d[1]; bSum += d[2]; count++;
        }
      }
      if (count >= 2) {
        return `rgb(${Math.round(rSum / count)}, ${Math.round(gSum / count)}, ${Math.round(bSum / count)})`;
      }
      return "#ffffff";
    } catch (e) {
      return "#ffffff";
    }
  }

  // Open modal
  if (btnFloatingPro) {
    btnFloatingPro.addEventListener("click", () => {
      if (isProUnlocked) {
        switchTab("pro");
        return;
      }
      proModal.style.display = "flex";
      proKeyInput.value = "";
      proErrorMsg.style.display = "none";
      setTimeout(() => proKeyInput.focus(), 100);
    });
  }

  // Close modal
  if (proModalClose) {
    proModalClose.addEventListener("click", () => {
      proModal.style.display = "none";
    });
  }
  if (proModal) {
    proModal.addEventListener("click", (e) => {
      if (e.target === proModal) proModal.style.display = "none";
    });
  }

  // Key validation (1507)
  function attemptUnlockPro() {
    const entered = proKeyInput.value.trim();
    if (entered === "1507") {
      isProUnlocked = true;
      proModal.style.display = "none";
      navBtnPro.style.display = "inline-flex";
      switchTab("pro");
      syncProThemeAndLayout("pro");
      btnFloatingPro.innerHTML = `
        <svg class="ui-icon icon-md" viewBox="0 0 24 24" fill="none" stroke="#2dd4bf"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>PRO Aktif</span>
      `;
      btnFloatingPro.style.borderColor = "#14b8a6";
    } else {
      proErrorMsg.style.display = "block";
      proKeyInput.style.borderColor = "#dc2626";
      proKeyInput.focus();
    }
  }

  if (btnSubmitKey) btnSubmitKey.addEventListener("click", attemptUnlockPro);
  if (proKeyInput) {
    proKeyInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attemptUnlockPro();
    });
  }

  function openProPdfFile(file, editorMode = "standard") {
    if (!file) return;
    currentProEditorMode = editorMode === "illustrator" ? "illustrator" : "standard";
    currentBgLayerDataUrl = null;
    currentEmbeddedFonts = [];
    applyEmbeddedFontsStylesheet([]);
    currentProFile = file;
    currentProPageIdx = 0;
    currentProZoom = 1.0;
    currentProScale = BASE_PRO_SCALE;
    currentProEdits = {};
    currentAddedTexts = [];
    currentAddedImages = [];
    currentHighlights = [];
    currentDrawings = [];
    currentAddedSymbols = [];
    currentPageTextBlocks = [];
    currentDocSourceType = "";
    proPagesState = {};
    proUndoStack = [];
    proRedoStack = [];
    selectedDrawingId = null;
    clientPdfDoc = null;
    activeEditBlock = null;
    activeEditElement = null;
    setEditorToolMode("select");
    const loadTitle = currentProEditorMode === "illustrator"
      ? "Membaca PDF Mode Illustrator..."
      : "Membaca Dokumen PDF...";
    const loadSub = currentProEditorMode === "illustrator"
      ? "Mengekstrak layer raster, koordinat vektor presisi & font asli..."
      : "Menyiapkan berkas dan menginisialisasi engine PDF...";
    setProLoading(true, 15, loadTitle, loadSub, currentProFile.name);
    loadProPage(currentProPageIdx);
  }

  // PRO File Drag & Drop: Box 1 (Standar & Smart OCR) & Box 2 (Illustrator Precision)
  setupDropzone(proDropzone, proFileInput, (files) => {
    if (files.length > 0) openProPdfFile(files[0], "standard");
  });

  if (proDropzoneIllustrator && proFileInputIllustrator) {
    setupDropzone(proDropzoneIllustrator, proFileInputIllustrator, (files) => {
      if (files.length > 0) openProPdfFile(files[0], "illustrator");
    });
  }

  if (proBtnChangeDoc) {
    proBtnChangeDoc.addEventListener("click", () => {
      syncProThemeAndLayout("pro");
      currentProEditorMode = "standard";
      currentBgLayerDataUrl = null;
      currentEmbeddedFonts = [];
      applyEmbeddedFontsStylesheet([]);
      syncIllustratorStageVars();
      proEditorView.style.display = "none";
      setProLoading(false);
      proUploadView.style.display = "block";
      if (proFileInput) proFileInput.value = "";
      if (proFileInputIllustrator) proFileInputIllustrator.value = "";
    });
  }

  // Real-Time OCR Engine using WebAssembly Tesseract.js (Word-Level Style Detection + Paragraph Merge)
  async function runRealTimeOCR(canvasEl, onProgress, coordScale = BASE_PRO_SCALE, pageWidth = 595) {
    if (typeof Tesseract === "undefined") {
      console.warn("Tesseract library not loaded.");
      return [];
    }

    if (proOcrCard) {
      proOcrCard.style.display = "block";
      proOcrStatusText.textContent = "Memindai karakter (OCR) pada dokumen scan...";
      proOcrProgressBar.style.width = "8%";
      proOcrPct.textContent = "8%";
    }

    try {
      const worker = await Tesseract.createWorker(["eng", "ind"], 1, {
        logger: m => {
          if (m.status === "recognizing text" && onProgress) {
            const pct = Math.max(8, Math.min(98, Math.round(m.progress * 100)));
            onProgress(pct);
            const overlayPct = Math.round(50 + (pct * 0.45));
            setProLoading(true, overlayPct, `Memindai Karakter OCR (${overlayPct}%)...`, `Mengenali teks scan dokumen secara real-time...`, currentProFile ? currentProFile.name : "");
          }
        }
      });

      let ret = null;
      try {
        ret = await worker.recognize(canvasEl, {}, { blocks: true });
      } catch (recErr) {
        ret = await worker.recognize(canvasEl);
      }
      try {
        await worker.terminate();
      } catch (termErr) {}

      const ocrBlocks = [];
      let ocrIdCounter = 0;

      const ocrCtx = canvasEl ? canvasEl.getContext("2d", { willReadFrequently: true }) : null;

      function measureRowBorderFlags(px0, py0, pw, ph, darkMask, rowDark) {
        const isBorder = new Uint8Array(ph);
        if (!ocrCtx) return isBorder;
        const ext = Math.max(14, Math.round(18 * coordScale));
        const cw = ocrCtx.canvas.width;
        const lx0 = Math.max(0, px0 - ext);
        const rx1 = Math.min(cw, px0 + pw + ext);
        for (let r = 0; r < ph; r++) {
          if (rowDark[r] < pw * 0.72) continue;
          const isEdgeRow = r <= 2 || r >= ph - 3;
          if (!isEdgeRow && rowDark[r] < pw * 0.85) continue;
          const y = py0 + r;
          let leftExtDark = 0;
          let rightExtDark = 0;
          if (px0 - lx0 >= 8) {
            const ld = ocrCtx.getImageData(lx0, y, px0 - lx0, 1).data;
            for (let i = 0; i < ld.length; i += 4) {
              if ((ld[i] * 299 + ld[i + 1] * 587 + ld[i + 2] * 114) / 1000 < 170) leftExtDark++;
            }
          }
          if (rx1 - (px0 + pw) >= 8) {
            const rd = ocrCtx.getImageData(px0 + pw, y, rx1 - (px0 + pw), 1).data;
            for (let i = 0; i < rd.length; i += 4) {
              if ((rd[i] * 299 + rd[i + 1] * 587 + rd[i + 2] * 114) / 1000 < 170) rightExtDark++;
            }
          }
          const leftCov = (px0 - lx0) > 0 ? leftExtDark / (px0 - lx0) : 0;
          const rightCov = (rx1 - (px0 + pw)) > 0 ? rightExtDark / (rx1 - (px0 + pw)) : 0;
          if (leftCov > 0.45 || rightCov > 0.45 || (rowDark[r] >= pw * 0.88 && pw > ph * 2.0)) {
            isBorder[r] = 1;
          }
        }
        return isBorder;
      }

      function inspectOcrVisuals(rawX0, rawY0, rawW, rawH, phraseText) {
        let isUnderline = false;
        let inkColor = "#111827";
        let paperBg = "#ffffff";
        const cleanTxt = (phraseText || "").trim();
        const fallbackH_pt = Math.max(4, rawH / coordScale);
        const hasAsc = /[A-Z0-9bdfhklt\*]/.test(cleanTxt);
        const hasDesc = /[gjpqy,\(\)\/;]/.test(cleanTxt);
        const hasDeepDesc = /[gjpqy]/.test(cleanTxt);
        const hasMidDesc = /[\(\)\/;]/.test(cleanTxt);
        const heightRatio = hasDeepDesc
          ? (hasAsc ? 0.94 : 0.72)
          : (hasMidDesc
            ? (hasAsc ? 0.86 : 0.64)
            : (/[,]/.test(cleanTxt) && hasAsc ? 0.78 : (hasAsc ? 0.74 : 0.52)));

        let tightX0 = rawX0;
        let tightY0 = rawY0;
        let tightX1 = rawX0 + rawW;
        let tightY1 = rawY0 + rawH;
        let estSizePt = Math.max(6, Math.min(72, Math.round((fallbackH_pt / heightRatio) * 2) / 2));
        let strokeRatio = 0.13;
        let strokeMeanPx = 0;
        let italicShear = 0;
        let isItalic = false;

        if (!ocrCtx) {
          return {
            tightX0, tightY0, tightX1, tightY1,
            estSizePt, hasAsc, hasDesc, strokeRatio, strokeMeanPx,
            italicShear, isItalic, isUnderline, inkColor, paperBg
          };
        }

        try {
          const cw = ocrCtx.canvas.width;
          const ch = ocrCtx.canvas.height;
          const px0 = Math.max(0, Math.floor(rawX0));
          const py0 = Math.max(0, Math.floor(rawY0));
          const px1 = Math.min(cw, Math.ceil(rawX0 + rawW));
          const py1 = Math.min(ch, Math.ceil(rawY0 + rawH));
          const pw = Math.max(1, px1 - px0);
          const ph = Math.max(1, py1 - py0);

          const imgData = ocrCtx.getImageData(px0, py0, pw, ph);
          const data = imgData.data;

          let darkCount = 0;
          let neutralDarkCount = 0;
          let darkR = 0, darkG = 0, darkB = 0;
          let neutR = 0, neutG = 0, neutB = 0;
          let lightR = 0, lightG = 0, lightB = 0;
          let lightCount = 0;

          const darkMask = new Uint8Array(pw * ph);
          const chromBlueMask = new Uint8Array(pw * ph);
          const rowDark = new Int32Array(ph);

          for (let r = 0; r < ph; r++) {
            for (let c = 0; c < pw; c++) {
              const idx = (r * pw + c) * 4;
              const rr = data[idx], gg = data[idx + 1], bb = data[idx + 2];
              const brightness = (rr * 299 + gg * 587 + bb * 114) / 1000;
              if (brightness < 168) {
                darkMask[r * pw + c] = 1;
                rowDark[r]++;
                darkCount++;
                darkR += rr; darkG += gg; darkB += bb;
                const chroma = Math.max(rr, gg, bb) - Math.min(rr, gg, bb);
                if (chroma < 38) {
                  neutralDarkCount++;
                  neutR += rr; neutG += gg; neutB += bb;
                } else if (bb - rr > 28 && brightness < 155) {
                  chromBlueMask[r * pw + c] = 1;
                }
              } else {
                lightCount++;
                lightR += rr; lightG += gg; lightB += bb;
              }
            }
          }

          // Ink Color (prefer neutral black/dark-grey when overlapped by blue signature strokes)
          const useNeutralInk = neutralDarkCount >= Math.max(8, darkCount * 0.45);
          if (useNeutralInk) {
            const avgR = Math.round(neutR / neutralDarkCount);
            const avgG = Math.round(neutG / neutralDarkCount);
            const avgB = Math.round(neutB / neutralDarkCount);
            inkColor = avgR < 96 ? "#111827" : `rgb(${avgR}, ${avgG}, ${avgB})`;
            for (let k = 0; k < darkMask.length; k++) {
              if (chromBlueMask[k]) darkMask[k] = 0;
            }
            rowDark.fill(0);
            for (let r = 0; r < ph; r++) {
              let cnt = 0;
              for (let c = 0; c < pw; c++) cnt += darkMask[r * pw + c];
              rowDark[r] = cnt;
            }
          } else if (darkCount > 6) {
            const avgR = Math.round(darkR / darkCount);
            const avgG = Math.round(darkG / darkCount);
            const avgB = Math.round(darkB / darkCount);
            inkColor = (Math.abs(avgR - avgG) < 25 && Math.abs(avgG - avgB) < 25 && avgR < 96)
              ? "#111827"
              : `rgb(${avgR}, ${avgG}, ${avgB})`;
          }

          // Paper Background Color
          if (lightCount > 10) {
            const bgR = Math.round(lightR / lightCount);
            const bgG = Math.round(lightG / lightCount);
            const bgB = Math.round(lightB / lightCount);
            paperBg = `rgb(${bgR}, ${bgG}, ${bgB})`;
          }

          // Filter out table horizontal rules and compute tight ink bounding box
          const isBorder = measureRowBorderFlags(px0, py0, pw, ph, darkMask, rowDark);
          const minRowDark = pw > 16 ? 2 : 1;
          let tightTop = 0;
          while (tightTop < ph && (isBorder[tightTop] || rowDark[tightTop] < minRowDark)) tightTop++;
          let tightBot = ph - 1;
          while (tightBot > tightTop && (isBorder[tightBot] || rowDark[tightBot] < minRowDark)) tightBot--;
          if (tightTop > tightBot) {
            tightTop = 0;
            tightBot = ph - 1;
          }

          const colProj = new Int32Array(pw);
          for (let r = tightTop; r <= tightBot; r++) {
            if (isBorder[r]) continue;
            for (let c = 0; c < pw; c++) {
              if (darkMask[r * pw + c]) colProj[c]++;
            }
          }
          let tightLeft = 0;
          while (tightLeft < pw && colProj[tightLeft] === 0) tightLeft++;
          let tightRight = pw - 1;
          while (tightRight > tightLeft && colProj[tightRight] === 0) tightRight--;
          if (tightLeft > tightRight) {
            tightLeft = 0;
            tightRight = pw - 1;
          }

          tightX0 = px0 + tightLeft;
          tightY0 = py0 + tightTop;
          tightX1 = px0 + tightRight + 1;
          tightY1 = py0 + tightBot + 1;
          const tightH_px = Math.max(4, tightY1 - tightY0);
          const tightH_pt = tightH_px / coordScale;

          // Precision Font Size Calibration (nearest 0.5pt)
          estSizePt = Math.max(6, Math.min(72, Math.round((tightH_pt / heightRatio) * 2) / 2));

          // Horizontal Black Run-Length Stroke Thickness (Normalized by Point Size)
          const maxStemPx = Math.max(2, Math.floor(tightH_px * 0.40));
          let runSum = 0;
          let runCount = 0;
          for (let r = tightTop; r <= tightBot; r++) {
            if (isBorder[r] || rowDark[r] > pw * 0.55) continue;
            let cur = 0;
            for (let c = tightLeft; c <= tightRight; c++) {
              if (darkMask[r * pw + c]) {
                cur++;
              } else {
                if (cur >= 1 && cur <= maxStemPx) {
                  runSum += cur;
                  runCount++;
                }
                cur = 0;
              }
            }
            if (cur >= 1 && cur <= maxStemPx) {
              runSum += cur;
              runCount++;
            }
          }
          if (runCount > 0) {
            strokeMeanPx = runSum / runCount;
            const strokeMeanPt = strokeMeanPx / coordScale;
            strokeRatio = strokeMeanPt / Math.max(6, estSizePt);
          }

          // Italic Slant Shear Detector (top-third vs bottom-third X centroid across vertical glyph slices)
          const shears = [];
          const maxGlyphW = Math.max(5, Math.ceil(tightH_px * 1.35));
          let c = tightLeft;
          while (c <= tightRight) {
            while (c <= tightRight && colProj[c] === 0) c++;
            if (c > tightRight) break;
            const cStart = c;
            while (c <= tightRight && colProj[c] > 0) c++;
            const cEnd = c - 1;
            const gw = cEnd - cStart + 1;
            if (gw < 2 || gw > maxGlyphW) continue;

            let gTop = -1, gBot = -1;
            for (let r = tightTop; r <= tightBot; r++) {
              if (isBorder[r]) continue;
              let rowHas = false;
              for (let x = cStart; x <= cEnd; x++) {
                if (darkMask[r * pw + x]) { rowHas = true; break; }
              }
              if (rowHas) {
                if (gTop === -1) gTop = r;
                gBot = r;
              }
            }
            const gh = gBot - gTop + 1;
            if (gh < Math.max(6, Math.round(tightH_px * 0.45))) continue;

            const third = Math.max(1, Math.floor(gh / 3));
            let topSumX = 0, topCnt = 0;
            let botSumX = 0, botCnt = 0;
            for (let r = gTop; r < gTop + third; r++) {
              for (let x = cStart; x <= cEnd; x++) {
                if (darkMask[r * pw + x]) { topSumX += x; topCnt++; }
              }
            }
            for (let r = gBot - third + 1; r <= gBot; r++) {
              for (let x = cStart; x <= cEnd; x++) {
                if (darkMask[r * pw + x]) { botSumX += x; botCnt++; }
              }
            }
            if (topCnt > 0 && botCnt > 0) {
              const shear = ((topSumX / topCnt) - (botSumX / botCnt)) / Math.max(1, (gh * 2) / 3);
              shears.push(shear);
            }
          }
          if (shears.length >= 3) {
            shears.sort((a, b) => a - b);
            italicShear = shears[Math.floor(shears.length / 2)];
            isItalic = italicShear >= 0.095 && italicShear <= 0.55;
          }

          // Table-Border-Aware Underline Detection below tightY1
          const maxUnderY = Math.min(ch - 1, tightY1 + Math.max(4, Math.round(coordScale * 3.8)));
          const segW = Math.max(1, tightX1 - tightX0);
          const extLimit = Math.round(22 * coordScale);
          const maxAllowedOutside = Math.round(14 * coordScale);
          for (let uy = tightY1; uy <= maxUnderY; uy++) {
            const uData = ocrCtx.getImageData(tightX0, uy, segW, 1).data;
            let uDark = 0;
            for (let i = 0; i < uData.length; i += 4) {
              if ((uData[i] * 299 + uData[i + 1] * 587 + uData[i + 2] * 114) / 1000 < 170) uDark++;
            }
            if (uDark / segW >= 0.62) {
              // Check how far this horizontal rule continues left/right outside phrase bounds
              let leftRun = 0;
              const lStart = Math.max(0, tightX0 - extLimit);
              if (tightX0 > lStart) {
                const lData = ocrCtx.getImageData(lStart, uy, tightX0 - lStart, 1).data;
                for (let x = (tightX0 - lStart) - 1; x >= 0; x--) {
                  const p = x * 4;
                  if ((lData[p] * 299 + lData[p + 1] * 587 + lData[p + 2] * 114) / 1000 < 170) leftRun++;
                  else break;
                }
              }
              let rightRun = 0;
              const rEnd = Math.min(cw, tightX1 + extLimit);
              if (rEnd > tightX1) {
                const rData = ocrCtx.getImageData(tightX1, uy, rEnd - tightX1, 1).data;
                for (let x = 0; x < (rEnd - tightX1); x++) {
                  const p = x * 4;
                  if ((rData[p] * 299 + rData[p + 1] * 587 + rData[p + 2] * 114) / 1000 < 170) rightRun++;
                  else break;
                }
              }
              if (leftRun < maxAllowedOutside && rightRun < maxAllowedOutside) {
                isUnderline = true;
                break;
              }
            }
          }
        } catch (e) {}

        return {
          tightX0, tightY0, tightX1, tightY1,
          estSizePt, hasAsc, hasDesc, strokeRatio, strokeMeanPx,
          italicShear, isItalic, isUnderline, inkColor, paperBg
        };
      }

      function isOcrWordBold(wObj, sizePt, boldThreshold) {
        if (!ocrCtx || !wObj || !wObj.bbox) return false;
        const wTxt = (wObj.text || "").trim();
        if (!wTxt) return false;
        try {
          const x0 = Math.max(0, Math.floor(wObj.bbox.x0));
          const y0 = Math.max(0, Math.floor(wObj.bbox.y0));
          const ww = Math.max(1, Math.min(Math.ceil(wObj.bbox.x1) - x0, ocrCtx.canvas.width - x0));
          const wh = Math.max(1, Math.min(Math.ceil(wObj.bbox.y1) - y0, ocrCtx.canvas.height - y0));
          const data = ocrCtx.getImageData(x0, y0, ww, wh).data;
          const maxStem = Math.max(2, Math.floor(wh * 0.42));
          let runSum = 0, runCnt = 0;
          for (let r = 0; r < wh; r++) {
            let cur = 0, rowDarkCnt = 0;
            for (let c = 0; c < ww; c++) {
              const i = (r * ww + c) * 4;
              const b = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
              if (b < 165) {
                cur++;
                rowDarkCnt++;
              } else {
                if (cur >= 1 && cur <= maxStem) {
                  runSum += cur;
                  runCnt++;
                }
                cur = 0;
              }
            }
            if (cur >= 1 && cur <= maxStem && rowDarkCnt <= ww * 0.65) {
              runSum += cur;
              runCnt++;
            }
          }
          if (runCnt < 3) return false;
          const wordStrokePt = (runSum / runCnt) / coordScale;
          const wordRatio = wordStrokePt / Math.max(6, sizePt || 11);
          return wordRatio >= boldThreshold;
        } catch (e) {
          return false;
        }
      }

      function detectDocumentFontFamily(sampleItems) {
        const FONT_CANDIDATES = [
          { font: "Arial", web: "Arial, Helvetica, sans-serif", isSerif: false },
          { font: "Segoe UI", web: "'Segoe UI', Roboto, sans-serif", isSerif: false },
          { font: "Calibri", web: "Calibri, Candara, sans-serif", isSerif: false },
          { font: "Times New Roman", web: "'Times New Roman', Times, serif", isSerif: true },
          { font: "Tahoma", web: "Tahoma, Geneva, Verdana, sans-serif", isSerif: false },
          { font: "Verdana", web: "Verdana, Geneva, sans-serif", isSerif: false },
          { font: "Georgia", web: "Georgia, serif", isSerif: true },
          { font: "Courier New", web: "'Courier New', Courier, monospace", isSerif: false }
        ];
        if (!ocrCtx || !sampleItems || sampleItems.length === 0) return FONT_CANDIDATES[0];

        try {
          // Prefer clean non-italic alphabetic regular phrases so punctuation/numbers don't bias glyph correlation
          const cleanWordRe = /^[A-Za-z][A-Za-z.,]*$/;
          const validSamples = sampleItems
            .filter(it => !it.vis.isItalic && !it.isBoldGuess && it.phrase.filter(w => cleanWordRe.test(w.text.trim())).length >= 2)
            .sort((a, b) => b.phrase.length - a.phrase.length)
            .slice(0, 3);
          const fallbackSamples = validSamples.length > 0 ? validSamples : sampleItems
            .filter(it => !it.vis.isItalic && it.text.length >= 10 && it.phrase.some(w => (w.text || "").trim().length >= 5))
            .slice(0, 3);
          if (fallbackSamples.length === 0) return FONT_CANDIDATES[0];

          const tmpCanvas = document.createElement("canvas");
          tmpCanvas.width = 480;
          tmpCanvas.height = 80;
          const tmpCtx = tmpCanvas.getContext("2d", { willReadFrequently: true });
          const scores = new Float64Array(FONT_CANDIDATES.length);

          const W_N = 180, H_N = 24;
          function getInkBox(imgBytes, iw, ih, isGrayWhiteBg) {
            let x0 = iw, x1 = -1, y0 = ih, y1 = -1;
            for (let y = 0; y < ih; y++) {
              for (let x = 0; x < iw; x++) {
                const idx = (y * iw + x) * 4;
                const ink = isGrayWhiteBg
                  ? (255 - (imgBytes[idx] * 299 + imgBytes[idx + 1] * 587 + imgBytes[idx + 2] * 114) / 1000)
                  : imgBytes[idx + 3];
                if (ink > 55) {
                  if (x < x0) x0 = x;
                  if (x > x1) x1 = x;
                  if (y < y0) y0 = y;
                  if (y > y1) y1 = y;
                }
              }
            }
            if (x1 <= x0 || y1 <= y0) return null;
            return { x0, y0, bw: x1 - x0 + 1, bh: y1 - y0 + 1, imgBytes, iw, ih, isGrayWhiteBg };
          }

          function sampleFixedAspectGrid(box, scaleToNorm) {
            const outW = Math.min(W_N, Math.max(1, Math.round(box.bw * scaleToNorm)));
            const outH = Math.min(H_N, Math.max(1, Math.round(box.bh * scaleToNorm)));
            const vec = new Float32Array(W_N * H_N);
            let normSq = 0;
            for (let oy = 0; oy < outH; oy++) {
              const sy = Math.min(box.y0 + box.bh - 1, box.y0 + Math.floor(oy / scaleToNorm));
              for (let ox = 0; ox < outW; ox++) {
                const sx = Math.min(box.x0 + box.bw - 1, box.x0 + Math.floor(ox / scaleToNorm));
                const idx = (sy * box.iw + sx) * 4;
                const v = box.isGrayWhiteBg
                  ? Math.max(0, 255 - (box.imgBytes[idx] * 299 + box.imgBytes[idx + 1] * 587 + box.imgBytes[idx + 2] * 114) / 1000) / 255.0
                  : (box.imgBytes[idx + 3] / 255.0);
                vec[oy * W_N + ox] = v;
                normSq += v * v;
              }
            }
            return { vec, norm: Math.sqrt(normSq) || 1 };
          }

          fallbackSamples.forEach(item => {
            // Pick contiguous clean leading alphabetic words (2-3 words)
            const wSlice = [];
            for (let k = 0; k < item.phrase.length && wSlice.length < 3; k++) {
              const t = (item.phrase[k].text || "").trim();
              if (cleanWordRe.test(t) && t.length >= 2) {
                wSlice.push(item.phrase[k]);
              } else if (wSlice.length > 0) {
                break;
              }
            }
            const useSlice = wSlice.length >= 2 ? wSlice : item.phrase.slice(0, Math.min(3, item.phrase.length));
            const subTxt = useSlice.map(w => w.text.trim()).join(" ");
            if (subTxt.length < 6) return;

            const sx0 = Math.max(0, Math.floor(Math.min(...useSlice.map(w => w.bbox.x0))));
            const sy0 = Math.max(0, Math.floor(Math.min(...useSlice.map(w => w.bbox.y0))));
            const sx1 = Math.min(ocrCtx.canvas.width, Math.ceil(Math.max(...useSlice.map(w => w.bbox.x1))));
            const sy1 = Math.min(ocrCtx.canvas.height, Math.ceil(Math.max(...useSlice.map(w => w.bbox.y1))));
            const sw = sx1 - sx0;
            const sh = sy1 - sy0;
            if (sw < 15 || sh < 6) return;

            const refBytes = ocrCtx.getImageData(sx0, sy0, sw, sh).data;
            const refBox = getInkBox(refBytes, sw, sh, true);
            if (!refBox) return;
            const scaleToNorm = H_N / Math.max(8, refBox.bh);
            const refGrid = sampleFixedAspectGrid(refBox, scaleToNorm);

            const weightStr = item.isBoldGuess ? "bold " : "";
            const testPx = item.vis.estSizePt * coordScale;

            FONT_CANDIDATES.forEach((cand, ci) => {
              tmpCtx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);
              tmpCtx.fillStyle = "#000000";
              tmpCtx.font = `${weightStr}${testPx}px ${cand.web}`;
              tmpCtx.fillText(subTxt, 8, 52);
              const candBytes = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height).data;
              const candBox = getInkBox(candBytes, tmpCanvas.width, tmpCanvas.height, false);
              if (!candBox) return;
              // Use identical scaleToNorm so width & height mismatches penalize mis-matched fonts naturally
              const candGrid = sampleFixedAspectGrid(candBox, scaleToNorm);

              let dot = 0;
              for (let k = 0; k < W_N * H_N; k++) dot += refGrid.vec[k] * candGrid.vec[k];
              const cosSim = dot / (refGrid.norm * candGrid.norm);
              const widthDiff = Math.abs(candBox.bw - refBox.bw) / Math.max(12, refBox.bw);
              scores[ci] += cosSim - 0.50 * widthDiff;
            });
          });

          let bestIdx = 0;
          for (let ci = 1; ci < FONT_CANDIDATES.length; ci++) {
            if (scores[ci] > scores[bestIdx]) bestIdx = ci;
          }
          return FONT_CANDIDATES[bestIdx];
        } catch (e) {
          return FONT_CANDIDATES[0];
        }
      }

      const rawPhraseItems = [];
      function collectOcrPhrase(phrase) {
        if (!phrase || phrase.length === 0) return;
        const phraseText = phrase.map(w => w.text.trim()).join(" ").trim();
        if (!phraseText || phraseText.length < 1) return;

        const rawX0 = Math.min(...phrase.map(w => w.bbox.x0));
        const rawY0 = Math.min(...phrase.map(w => w.bbox.y0));
        const rawX1 = Math.max(...phrase.map(w => w.bbox.x1));
        const rawY1 = Math.max(...phrase.map(w => w.bbox.y1));
        const rawW = rawX1 - rawX0;
        const rawH = rawY1 - rawY0;

        // Ignore huge single non-text graphic/signature blobs (> 38pt single phrase height without multi-word line)
        if ((rawH / coordScale) > 48 && phrase.length <= 3) return;

        const vis = inspectOcrVisuals(rawX0, rawY0, rawW, rawH, phraseText);
        rawPhraseItems.push({
          phrase,
          text: phraseText,
          vis,
          isBoldGuess: vis.strokeRatio >= 0.148
        });
      }

      const ocrLines = [];
      if (ret && ret.data) {
        if (Array.isArray(ret.data.lines) && ret.data.lines.length > 0) {
          ret.data.lines.forEach(ln => ocrLines.push(ln));
        } else if (Array.isArray(ret.data.blocks)) {
          ret.data.blocks.forEach(blk => {
            if (Array.isArray(blk.lines)) {
              blk.lines.forEach(ln => ocrLines.push(ln));
            }
            (blk.paragraphs || []).forEach(para => {
              if (Array.isArray(para.lines) && para.lines.length > 0) {
                para.lines.forEach(ln => ocrLines.push(ln));
              } else if (Array.isArray(para.words) && para.words.length > 0) {
                ocrLines.push({ bbox: para.bbox, text: para.text, words: para.words });
              }
            });
          });
        }
      }

      if (ocrLines.length > 0) {
        ocrLines.forEach((line) => {
          const words = (line.words || []).filter(w => w.text && w.text.trim().length > 0);
          if (words.length === 0) {
            const lineTxt = (line.text || "").trim();
            if (lineTxt) {
              collectOcrPhrase([{ bbox: line.bbox, text: lineTxt }]);
            }
            return;
          }

          // Split words into phrases on table vertical dividers or genuine column gaps
          function hasVerticalDividerInGap(wLeft, wRight, lineH) {
            if (!ocrCtx) return false;
            try {
              const gx0 = Math.max(0, Math.floor(wLeft.bbox.x1) + 1);
              const gx1 = Math.min(ocrCtx.canvas.width - 1, Math.ceil(wRight.bbox.x0) - 1);
              const gw = gx1 - gx0 + 1;
              if (gw < 1 || gw > 40 * coordScale) return false;
              const padY = Math.max(4, Math.round(lineH * 0.4));
              const gy0 = Math.max(0, Math.floor(Math.min(wLeft.bbox.y0, wRight.bbox.y0)) - padY);
              const gy1 = Math.min(ocrCtx.canvas.height - 1, Math.ceil(Math.max(wLeft.bbox.y1, wRight.bbox.y1)) + padY);
              const gh = gy1 - gy0 + 1;
              if (gh < 8) return false;
              const gData = ocrCtx.getImageData(gx0, gy0, gw, gh).data;
              for (let c = 0; c < gw; c++) {
                let colDark = 0;
                for (let r = 0; r < gh; r++) {
                  const p = (r * gw + c) * 4;
                  if ((gData[p] * 299 + gData[p + 1] * 587 + gData[p + 2] * 114) / 1000 < 170) colDark++;
                }
                if (colDark >= gh * 0.72) return true;
              }
            } catch (e) {}
            return false;
          }

          let phraseWords = [words[0]];
          for (let i = 1; i < words.length; i++) {
            const prevWord = words[i - 1];
            const currWord = words[i];
            const gap = currWord.bbox.x0 - prevWord.bbox.x1;
            const wordH = Math.max(4, currWord.bbox.y1 - currWord.bbox.y0);
            const gapThreshold = Math.max(11.5 * coordScale, wordH * 1.15);

            if (gap > gapThreshold || hasVerticalDividerInGap(prevWord, currWord, wordH)) {
              collectOcrPhrase(phraseWords);
              phraseWords = [currWord];
            } else {
              phraseWords.push(currWord);
            }
          }
          if (phraseWords.length > 0) {
            collectOcrPhrase(phraseWords);
          }
        });
      }

      // Pass 2: Mode-Clustered Body Font Size + 25th-Percentile Regular Baseline + Detected Font Family
      const regularCandidates = rawPhraseItems
        .filter(it => it.vis.strokeRatio > 0.05 && it.text.length >= 3)
        .map(it => it.vis.strokeRatio)
        .sort((a, b) => a - b);
      const baseStrokeRatio = regularCandidates.length > 0
        ? regularCandidates[Math.floor(regularCandidates.length * 0.25)]
        : 0.130;
      const pageBoldThreshold = Math.max(0.139, Math.min(0.148, baseStrokeRatio * 1.095));

      // Cluster minor ascender/descender height variation onto dominant body font size
      // Preserves real small italic footnotes and Kop Surat small addresses / large headers
      const sizeHist = {};
      rawPhraseItems.forEach(it => {
        const sKey = String(it.vis.estSizePt);
        sizeHist[sKey] = (sizeHist[sKey] || 0) + Math.max(1, it.phrase.length);
      });
      let dominantBodySize = 10.5;
      let maxWeight = -1;
      Object.entries(sizeHist).forEach(([szStr, wt]) => {
        const sVal = parseFloat(szStr);
        if (sVal >= 9.5 && sVal <= 12.5 && wt > maxWeight) {
          maxWeight = wt;
          dominantBodySize = sVal;
        }
      });
      rawPhraseItems.forEach(it => {
        const tightMinY_pt = it.vis.tightY0 / coordScale;
        const diff = Math.abs(it.vis.estSizePt - dominantBodySize);
        if (diff <= 0.6 || (diff <= 1.0 && !it.vis.isItalic && !(it.vis.estSizePt <= 9.5 && tightMinY_pt < 135))) {
          it.vis.estSizePt = dominantBodySize;
        }
      });

      const detectedDocFont = detectDocumentFontFamily(rawPhraseItems);

      rawPhraseItems.forEach((item) => {
        const vis = item.vis;
        const phraseText = item.text;
        const finalSize = vis.estSizePt;
        const finalItalic = vis.isItalic;
        const finalUnderline = vis.isUnderline;
        let finalBold = vis.strokeRatio >= pageBoldThreshold;

        const tightMinX = vis.tightX0 / coordScale;
        const tightMinY = vis.tightY0 / coordScale;
        const tightMaxX = vis.tightX1 / coordScale;
        const tightMaxY = vis.tightY1 / coordScale;
        const phraseWidth = tightMaxX - tightMinX;
        const phraseCenterX = (tightMinX + tightMaxX) / 2;

        // Genuine centered detection only for standalone headings/titles straddling page center
        let textAlign = "left";
        if (
          Math.abs(phraseCenterX - (pageWidth / 2)) < 18 &&
          tightMinX > 110 &&
          phraseWidth < pageWidth * 0.56 &&
          !phraseText.startsWith(":")
        ) {
          textAlign = "center";
        }

        // Convert tight ink box into typographic em-box so CSS & PyMuPDF baseline align sub-pixel
        const topPad = vis.hasAsc ? (finalSize * 0.14) : (finalSize * 0.36);
        const botPad = !vis.hasDesc ? (finalSize * 0.20) : 0.4;
        const emMinY = Math.max(0, tightMinY - topPad);
        const emMaxY = Math.max(tightMaxY + botPad, emMinY + finalSize * 1.10);

        const allowMixedWordBold = item.phrase.length > 1;
        let runs = null;
        if (allowMixedWordBold) {
          const wordThresh = finalBold ? pageBoldThreshold : (pageBoldThreshold * 1.07);
          const wordBolds = item.phrase.map(w => isOcrWordBold(w, finalSize, wordThresh));
          // Pass A: Suppress isolated single-word Bold spikes surrounded by Regular words
          for (let wi = 0; wi < wordBolds.length; wi++) {
            if (!wordBolds[wi]) continue;
            const prevB = wi > 0 && wordBolds[wi - 1];
            const nextB = wi + 1 < wordBolds.length && wordBolds[wi + 1];
            if (!prevB && !nextB) wordBolds[wi] = false;
          }
          // Pass B: Bridge short <=3-char words/numbers inside or starting a Bold run (e.g. '45' and 'di' in '45 Hari ... di Terima')
          for (let wi = 0; wi < wordBolds.length; wi++) {
            if (wordBolds[wi]) continue;
            const wt = (item.phrase[wi].text || "").trim();
            if (wt.length > 3) continue;
            const prevB = wi > 0 && wordBolds[wi - 1];
            const nextB = wi + 1 < wordBolds.length && wordBolds[wi + 1];
            const next2B = wi + 2 < wordBolds.length && wordBolds[wi + 1] && wordBolds[wi + 2];
            if ((prevB && nextB) || (/^\d+$/.test(wt) && next2B)) {
              wordBolds[wi] = true;
            }
          }
          const longRegWords = item.phrase.filter((w, wi) => !wordBolds[wi] && (w.text || "").trim().replace(/[^A-Za-z]/g, "").length >= 4);
          // Uniform short bold cells (e.g. 'Minimal Muatan 50 Ton') keep unified bold run when no >=4-char regular word exists
          if (finalBold && longRegWords.length === 0) {
            runs = [{
              text: phraseText,
              is_bold: true,
              is_italic: finalItalic,
              is_underline: finalUnderline,
              color: vis.inkColor
            }];
          } else {
            runs = coalesceRuns(item.phrase.map((w, wi) => ({
              text: (wi > 0 ? " " : "") + w.text.trim(),
              is_bold: wordBolds[wi],
              is_italic: finalItalic,
              is_underline: finalUnderline,
              color: vis.inkColor
            })));
            finalBold = runs.every(r => r.is_bold);
          }
        } else {
          runs = [{
            text: phraseText,
            is_bold: finalBold,
            is_italic: finalItalic,
            is_underline: finalUnderline,
            color: vis.inkColor
          }];
        }

        const fontDisplay = detectedDocFont.font;
        const webFont = detectedDocFont.web;
        const fontCode = detectedDocFont.isSerif
          ? (finalBold ? (finalItalic ? "tibi" : "tibo") : (finalItalic ? "tiit" : "tiro"))
          : (detectedDocFont.font === "Courier New"
            ? (finalBold ? (finalItalic ? "cobi" : "cobo") : (finalItalic ? "coit" : "cour"))
            : (finalBold ? (finalItalic ? "hebi" : "hebo") : (finalItalic ? "heit" : "helv")));

        // Adobe Horizontal Scaling calibration: match natural line width to scanned ink width when difference is 3%..14%
        let autoHScale = 100;
        if (typeof measureTextWidth === "function" && item.phrase.length >= 2 && phraseWidth > 36) {
          const natW = measureTextWidth(phraseText, finalSize, webFont, finalBold, finalItalic);
          if (natW > 36) {
            const pct = Math.round((phraseWidth / natW) * 100);
            if (Math.abs(pct - 100) >= 3 && Math.abs(pct - 100) <= 14) {
              autoHScale = pct;
            }
          }
        }

        ocrIdCounter++;
        ocrBlocks.push({
          id: `blk_ocr_${currentProPageIdx}_${ocrIdCounter}`,
          bbox: [roundNum(tightMinX), roundNum(emMinY), roundNum(tightMaxX), roundNum(emMaxY)],
          orig_ink_bbox: [roundNum(tightMinX), roundNum(tightMinY), roundNum(tightMaxX), roundNum(tightMaxY)],
          text: phraseText,
          font: fontDisplay,
          web_font: webFont,
          font_code: fontCode,
          size: finalSize,
          is_bold: finalBold,
          is_italic: finalItalic,
          is_underline: finalUnderline,
          align: textAlign,
          color: vis.inkColor,
          bg_color: vis.paperBg,
          h_scale: autoHScale,
          para_spacing: 0,
          bbox_type: /^([a-zA-Z0-9]{1,2}\.\s+|:\s*|nip\.|nomor\s*:)/i.test(phraseText.trim()) ? 2 : 1,
          isOcr: true,
          runs
        });
      });

      const mergedOcrBlocks = mergeParagraphBlocks(ocrBlocks, pageWidth, currentProPageIdx);

      if (proOcrCard) {
        proOcrProgressBar.style.width = "100%";
        proOcrPct.textContent = "100%";
        proOcrStatusText.textContent = `OCR Selesai: ${mergedOcrBlocks.length} blok/paragraf terdeteksi & siap diedit!`;
        setTimeout(() => {
          proOcrCard.style.display = "none";
        }, 2200);
      }

      return mergedOcrBlocks;
    } catch (err) {
      console.error("Tesseract OCR error:", err);
      if (proOcrCard) proOcrCard.style.display = "none";
      return [];
    }
  }

  // Adobe bboxType=3 Detector: Detect non-text logos, QR codes, stamps & signatures on canvas pages
  function detectScannedGraphicRegions(canvasEl, textBlocks, coordScale, pageWidth, pageHeight) {
    const out = [];
    if (!canvasEl || !coordScale) return out;
    try {
      const ctx = canvasEl.getContext("2d", { willReadFrequently: true });
      const cw = canvasEl.width, ch = canvasEl.height;
      const step = Math.max(3, Math.round(cw / 160));
      const gw = Math.floor(cw / step), gh = Math.floor(ch / step);
      // Build coarse dark/colored ink mask via stride-2 max-pooling across each step x step cell
      const data = ctx.getImageData(0, 0, cw, ch).data;
      const grid = new Uint8Array(gw * gh);
      const innerStep = Math.max(1, Math.floor(step / 3));

      for (let gy = 0; gy < gh; gy++) {
        const yEnd = Math.min(ch, (gy + 1) * step);
        for (let gx = 0; gx < gw; gx++) {
          const xEnd = Math.min(cw, (gx + 1) * step);
          let hit = 0;
          for (let sy = gy * step; sy < yEnd && !hit; sy += innerStep) {
            for (let sx = gx * step; sx < xEnd; sx += innerStep) {
              const idx = (sy * cw + sx) * 4;
              const r = data[idx], g = data[idx + 1], b = data[idx + 2];
              const bright = (r * 299 + g * 587 + b * 114) / 1000;
              const chroma = Math.max(r, g, b) - Math.min(r, g, b);
              if (bright < 185 || chroma > 32) {
                hit = 1;
                break;
              }
            }
          }
          grid[gy * gw + gx] = hit;
        }
      }

      // Mask out known text bboxes
      (textBlocks || []).forEach(b => {
        const bx0 = Math.max(0, Math.floor((b.bbox[0] * coordScale) / step));
        const by0 = Math.max(0, Math.floor((b.bbox[1] * coordScale) / step));
        const bx1 = Math.min(gw - 1, Math.ceil((b.bbox[2] * coordScale) / step));
        const by1 = Math.min(gh - 1, Math.ceil((b.bbox[3] * coordScale) / step));
        for (let gy = by0; gy <= by1; gy++) {
          for (let gx = bx0; gx <= bx1; gx++) grid[gy * gw + gx] = 0;
        }
      });

      // Suppress table grid borders: straight horizontal runs >=10 cells thin (height<=2) & vertical runs >=6 cells thin (width<=2)
      for (let gy = 0; gy < gh; gy++) {
        let run = 0;
        for (let gx = 0; gx <= gw; gx++) {
          const val = (gx < gw) ? grid[gy * gw + gx] : 0;
          if (val) {
            run++;
          } else {
            if (run >= 10) {
              for (let x = gx - run; x < gx; x++) {
                const above = gy > 0 ? grid[(gy - 1) * gw + x] : 0;
                const below = gy + 1 < gh ? grid[(gy + 1) * gw + x] : 0;
                if (!(above && below)) grid[gy * gw + x] = 0;
              }
            }
            run = 0;
          }
        }
      }
      for (let gx = 0; gx < gw; gx++) {
        let run = 0;
        for (let gy = 0; gy <= gh; gy++) {
          const val = (gy < gh) ? grid[gy * gw + gx] : 0;
          if (val) {
            run++;
          } else {
            if (run >= 5) {
              for (let y = gy - run; y < gy; y++) {
                const left = gx > 0 ? grid[y * gw + (gx - 1)] : 0;
                const right = gx + 1 < gw ? grid[y * gw + (gx + 1)] : 0;
                if (!(left && right)) grid[y * gw + gx] = 0;
              }
            }
            run = 0;
          }
        }
      }

      // Connected components (2-cell neighborhood dilation so stamp letters/QR stay grouped)
      const visited = new Uint8Array(gw * gh);
      let imgSeq = 0;
      for (let gy = 0; gy < gh; gy++) {
        for (let gx = 0; gx < gw; gx++) {
          if (!grid[gy * gw + gx] || visited[gy * gw + gx]) continue;
          const q = [[gx, gy]];
          visited[gy * gw + gx] = 1;
          let minX = gx, maxX = gx, minY = gy, maxY = gy, area = 0;
          while (q.length) {
            const [cx, cy] = q.pop();
            area++;
            if (cx < minX) minX = cx;
            if (cx > maxX) maxX = cx;
            if (cy < minY) minY = cy;
            if (cy > maxY) maxY = cy;
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nx = cx + dx, ny = cy + dy;
                if (nx >= 0 && nx < gw && ny >= 0 && ny < gh) {
                  const ni = ny * gw + nx;
                  if (grid[ni] && !visited[ni]) {
                    visited[ni] = 1;
                    q.push([nx, ny]);
                  }
                }
              }
            }
          }
          const ptX0 = roundNum((minX * step) / coordScale);
          const ptY0 = roundNum((minY * step) / coordScale);
          const ptX1 = roundNum(((maxX + 1) * step) / coordScale);
          const ptY1 = roundNum(((maxY + 1) * step) / coordScale);
          const ptW = ptX1 - ptX0, ptH = ptY1 - ptY0;
          const boxCells = Math.max(1, (maxX - minX + 1) * (maxY - minY + 1));
          const fillRatio = area / boxCells;
          if (ptW >= 24 && ptH >= 24 && area >= 10 && fillRatio >= 0.08 && (ptW * ptH) < (pageWidth * pageHeight * 0.45)) {
            imgSeq++;
            out.push({
              id: `img_scan_${currentProPageIdx}_${imgSeq}`,
              bbox: [ptX0, ptY0, ptX1, ptY1],
              bbox_type: 3
            });
          }
        }
      }
    } catch (e) {}
    return out;
  }

  // Load and render page data with Precision Font & Coordinate Auto-Detection
  async function loadProPage(pageIdx, forceOcr = false, fromHistory = false) {
    if (!currentProFile) return;
    const renderScale = BASE_PRO_SCALE;
    proPageIndicator.textContent = "Memindai dokumen...";
    setProLoading(true, 25, "Merender Halaman PDF...", "Membuat representasi visual resolusi tinggi...", currentProFile.name);

    // Step A: Attempt server-side PyMuPDF C-engine high-precision extraction
    try {
      const formData = new FormData();
      formData.append("file", currentProFile);
      formData.append("page_idx", pageIdx);
      formData.append("scale", renderScale);
      formData.append("illustrator_mode", currentProEditorMode === "illustrator" ? "true" : "false");

      const response = await fetch("/api/pro/page-data", {
        method: "POST",
        body: formData
      });

      if (response.ok) {
        const serverData = await response.json();
        const serverSaysScanned = /scanned|ocr/i.test(serverData.doc_source_type || "");
        if (serverData.success && serverData.text_blocks && serverData.text_blocks.length > 0 && (!serverSaysScanned || currentProEditorMode === "illustrator") && !forceOcr) {
          setProLoading(true, 100, "Selesai 100%!", "Editor siap digunakan...", currentProFile.name);
          setTimeout(() => {
            setupEditorView(serverData, fromHistory);
          }, 240);
          return;
        }
      }
    } catch (e) {
      // Server not reachable -> continue to instant client-side execution
    }

    // Step B: In-Browser Client Extraction with Precision pdfjsLib Engine
    let pageCanvas = null;
    let renderedDataUrl = "";
    let pageWidth = 595;
    let pageHeight = 842;
    let digitalTextBlocks = [];

    try {
      setProLoading(true, 38, "Menganalisis Struktur Halaman...", "Mengekstrak data halaman dan viewport...", currentProFile.name);
      if (!clientPdfDoc) {
        const arrayBuffer = await currentProFile.arrayBuffer();
        clientPdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      }
      currentProTotalPages = clientPdfDoc.numPages;
      currentProPageIdx = Math.max(0, Math.min(pageIdx, currentProTotalPages - 1));

      const page = await clientPdfDoc.getPage(currentProPageIdx + 1);
      const viewport = page.getViewport({ scale: renderScale });

      pageCanvas = document.createElement("canvas");
      pageCanvas.width = viewport.width;
      pageCanvas.height = viewport.height;
      const ctx = pageCanvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      renderedDataUrl = pageCanvas.toDataURL("image/png");
      pageWidth = page.view[2];
      pageHeight = page.view[3];

      setProLoading(true, 48, "Menganalisis Layer Teks...", "Memindai koordinat kata, perataan, dan gaya font...", currentProFile.name);

      // Extract raw text items with exact viewport coordinates & resolved PDF font names
      const textContent = await page.getTextContent();
      const rawItems = [];

      for (let idx = 0; idx < textContent.items.length; idx++) {
        const item = textContent.items[idx];
        const rawStr = item.str || "";
        if (!rawStr.trim()) continue;

        const pdfX = item.transform[4];
        const pdfY = item.transform[5];
        const rawFontSize = Math.hypot(item.transform[0], item.transform[1]) || item.height || 12;
        const fontSize = Math.round(rawFontSize * 10) / 10;
        const angleDeg = (Math.abs(item.transform[1]) > 0.01)
          ? Math.round((Math.atan2(item.transform[1], item.transform[0]) * 180 / Math.PI) * 100) / 100
          : 0;
        const baseViewportPt = viewport.convertToViewportPoint(pdfX, pdfY);
        const origOriginX = roundNum(baseViewportPt[0] / renderScale);
        const origBaselineY = roundNum(baseViewportPt[1] / renderScale);

        const style = (textContent.styles && textContent.styles[item.fontName]) || {};

        // Inspect resolved font object in commonObjs for true embedded font name (Bookman, Tahoma, Arial-Bold, etc.)
        let realFontName = "";
        let objBold = false;
        let objItalic = false;
        try {
          if (page.commonObjs && page.commonObjs.has(item.fontName)) {
            const fObj = page.commonObjs.get(item.fontName);
            if (fObj) {
              realFontName = fObj.name || "";
              if (fObj.bold || fObj.black) objBold = true;
              if (fObj.italic) objItalic = true;
            }
          }
        } catch (e) {}

        const fontInfo = detectClientFont(item.fontName, style.fontFamily, realFontName, objBold, objItalic);

        const ascent = (typeof style.ascent === "number") ? style.ascent : 0.85;
        const descent = (typeof style.descent === "number") ? style.descent : -0.2;

        const pdfBottom = pdfY + descent * rawFontSize;
        const pdfTop = pdfY + ascent * rawFontSize;
        const pdfRight = pdfX + (item.width || rawFontSize * 0.6 * rawStr.length);

        // Convert PDF coordinates to exact canvas pixel coordinates via viewport
        const rect = viewport.convertToViewportRectangle([pdfX, pdfBottom, pdfRight, pdfTop]);
        const x = Math.min(rect[0], rect[2]) / renderScale;
        const y = Math.min(rect[1], rect[3]) / renderScale;
        const w = Math.max(4, Math.abs(rect[2] - rect[0])) / renderScale;
        const h = Math.max(8, Math.abs(rect[3] - rect[1])) / renderScale;

        rawItems.push({
          text: rawStr.trim(),
          hasLeadingSpace: rawStr.startsWith(" "),
          hasTrailingSpace: rawStr.endsWith(" "),
          x: roundNum(x),
          y: roundNum(y),
          w: roundNum(w),
          h: roundNum(h),
          fontSize: fontSize,
          font: fontInfo.displayName,
          web_font: fontInfo.webFont,
          font_code: fontInfo.fontCode,
          is_bold: fontInfo.isBold,
          is_italic: fontInfo.isItalic,
          hasEOL: Boolean(item.hasEOL),
          orig_origin_x: origOriginX,
          orig_baseline_y: origBaselineY,
          ascender: ascent,
          angle_deg: angleDeg
        });
      }

      // Helper: Detect genuine text underline (filtering horizontal divider lines)
      function detectCanvasUnderline(ctxRef, x, yBottom, w) {
        try {
          if (w < 10) return false;
          const checkY1 = Math.round(yBottom + 1);
          const checkY2 = Math.round(yBottom + 2);
          const startX = Math.round(x + w * 0.15);
          const endX = Math.round(x + w * 0.85);
          const numSamples = 6;
          let darkCount = 0;

          for (let s = 0; s < numSamples; s++) {
            const sx = Math.round(startX + (s / (numSamples - 1)) * (endX - startX));
            const p1 = ctxRef.getImageData(sx, checkY1, 1, 1).data;
            const p2 = ctxRef.getImageData(sx, checkY2, 1, 1).data;
            const b1 = (p1[0] * 299 + p1[1] * 587 + p1[2] * 114) / 1000;
            const b2 = (p2[0] * 299 + p2[1] * 587 + p2[2] * 114) / 1000;
            if (b1 < 170 || b2 < 170) darkCount++;
          }

          let leftDark = false, rightDark = false;
          if (x >= 12) {
            const pL = ctxRef.getImageData(Math.round(x - 8), checkY1, 1, 1).data;
            leftDark = ((pL[0] * 299 + pL[1] * 587 + pL[2] * 114) / 1000) < 170;
          }
          if (x + w + 8 < ctxRef.canvas.width) {
            const pR = ctxRef.getImageData(Math.round(x + w + 8), checkY1, 1, 1).data;
            rightDark = ((pR[0] * 299 + pR[1] * 587 + pR[2] * 114) / 1000) < 170;
          }
          if (leftDark && rightDark) return false;

          return darkCount >= 4;
        } catch (e) {
          return false;
        }
      }

      // Helper: Visual Stroke-Width BOLD Detection & Exact Ink Color Sampling
      function inspectDigitalRegionVisuals(ctxRef, gx, gy, gw, gh, fontSizePx) {
        let detectedBold = false;
        let inkColor = "#111827";
        if (!ctxRef || gw < 4 || gh < 4) return { detectedBold, inkColor };

        try {
          const rx = Math.max(0, Math.round(gx));
          const ry = Math.max(0, Math.round(gy));
          const rw = Math.max(1, Math.min(Math.round(gw), ctxRef.canvas.width - rx));
          const rh = Math.max(1, Math.min(Math.round(gh), ctxRef.canvas.height - ry));
          const imgData = ctxRef.getImageData(rx, ry, rw, rh).data;

          const yStart = Math.floor(rh * 0.2);
          const yEnd = Math.ceil(rh * 0.82);
          let runSum = 0, runCount = 0;
          let darkR = 0, darkG = 0, darkB = 0, darkCount = 0;

          for (let yy = yStart; yy < yEnd; yy++) {
            let currentRun = 0;
            for (let xx = 0; xx < rw; xx++) {
              const pIdx = (yy * rw + xx) * 4;
              const r = imgData[pIdx], g = imgData[pIdx + 1], b = imgData[pIdx + 2];
              const bright = (r * 299 + g * 587 + b * 114) / 1000;
              if (bright < 150) {
                currentRun++;
                darkR += r; darkG += g; darkB += b; darkCount++;
              } else {
                if (currentRun >= 1 && currentRun <= Math.max(6, fontSizePx * 0.38)) {
                  runSum += currentRun;
                  runCount++;
                }
                currentRun = 0;
              }
            }
          }

          if (runCount >= 4) {
            const avgStrokePx = runSum / runCount;
            const strokeRatio = avgStrokePx / Math.max(8, fontSizePx);
            if (strokeRatio >= 0.155) {
              detectedBold = true;
            }
          }

          if (darkCount > 8) {
            const ar = Math.round(darkR / darkCount);
            const ag = Math.round(darkG / darkCount);
            const ab = Math.round(darkB / darkCount);
            if (Math.abs(ar - ag) < 25 && Math.abs(ag - ab) < 25 && ar < 70) {
              inkColor = "#111827";
            } else {
              inkColor = `rgb(${ar}, ${ag}, ${ab})`;
            }
          }
        } catch (e) {}

        return { detectedBold, inkColor };
      }

      // Single unified helper to finalize and push a grouped text block
      let itemCounter = 0;
      function finalizeDigitalGroup(grp) {
        if (!grp || !grp.text || !grp.text.trim()) return;
        itemCounter++;
        const grpX = grp.x * renderScale;
        const grpY = grp.y * renderScale;
        const grpW = grp.w * renderScale;
        const grpH = grp.h * renderScale;

        const isUnderline = ctx ? detectCanvasUnderline(ctx, grpX, grpY + grpH, grpW) : false;
        const sampledBg = safeSamplePaperBg(ctx, grpX, grpY, grpW, grpH);
        const visuals = ctx ? inspectDigitalRegionVisuals(ctx, grpX, grpY, grpW, grpH, grp.fontSize * renderScale) : { detectedBold: false, inkColor: "#111827" };

        const finalBold = grp.is_bold || visuals.detectedBold;
        let finalFont = grp.font;
        let finalWebFont = grp.web_font;
        let finalFontCode = grp.font_code;
        if (finalBold && finalFontCode === "helv") finalFontCode = "hebo";
        else if (finalBold && finalFontCode === "tiro") finalFontCode = "tibo";

        // Prevent colon form values and left-margin body paragraph lines (e.g. "Kelurahan Dukuh Pakis...") from turning centered!
        const boxW = grp.w;
        const midX = grp.x + boxW / 2;
        const cleanTxt = grp.text.trim();
        const isColonVal = cleanTxt.startsWith(":");
        const isFullWidthLine = boxW > pageWidth * 0.58 || grp.x < 100;
        const isKopSuratTop = grp.y < 160 && grp.x > 85 && boxW < pageWidth * 0.72 && /^(pemerintah|kecamatan|kelurahan|jl\.|jalan\s|surabaya)/i.test(cleanTxt);
        const isExplicitTitle = /^(surat keterangan|surat pernyataan|surat tugas|nomor\s*:)/i.test(cleanTxt) && boxW < pageWidth * 0.72;
        const isCenteredGeo = !isFullWidthLine && !isColonVal && Math.abs(midX - pageWidth / 2) < 28;
        const alignVal = (!isColonVal && (isCenteredGeo || isKopSuratTop || isExplicitTitle)) ? "center" : "left";

        // Refine Serif Kop Surat (PEMERINTAH/KECAMATAN/KELURAHAN) to Bookman Old Style look if detected as generic Times
        if (finalFont === "Times New Roman" && grp.y < 140 && /^(PEMERINTAH|KECAMATAN|KELURAHAN)/i.test(cleanTxt)) {
          finalFont = "Bookman Old Style";
          finalWebFont = "'Bookman Old Style', 'URW Bookman', Georgia, serif";
        }

        const lineRuns = coalesceRuns(
          (grp.runs && grp.runs.length > 0)
            ? grp.runs.map(r => ({
                ...r,
                is_underline: r.is_underline || isUnderline,
                color: r.color || visuals.inkColor
              }))
            : [{
                text: cleanTxt,
                is_bold: finalBold,
                is_italic: grp.is_italic,
                is_underline: isUnderline,
                color: visuals.inkColor
              }]
        );

        const cBbox = [grp.x, grp.y, roundNum(grp.x + grp.w), roundNum(grp.y + grp.h)];
        digitalTextBlocks.push({
          id: `blk_c_${currentProPageIdx}_${itemCounter}`,
          bbox: cBbox,
          orig_bbox: [...cBbox],
          text: cleanTxt,
          font: finalFont,
          web_font: finalWebFont,
          font_code: finalFontCode,
          size: grp.fontSize,
          is_bold: lineRuns.every(r => r.is_bold),
          is_italic: lineRuns.every(r => r.is_italic),
          is_underline: lineRuns.every(r => r.is_underline),
          align: alignVal,
          color: visuals.inkColor,
          bg_color: sampledBg,
          isOcr: false,
          orig_origin_x: grp.orig_origin_x != null ? grp.orig_origin_x : null,
          orig_baseline_y: grp.orig_baseline_y != null ? grp.orig_baseline_y : null,
          ascender: grp.ascender != null ? grp.ascender : null,
          angle_deg: grp.angle_deg || 0,
          runs: lineRuns
        });
      }

      // Smart Horizontal Line Grouping: Keep table columns separate on large gaps,
      // while joining adjacent same-line spans including mixed Bold/Regular runs and split opening letters!
      let currentGroup = null;

      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        if (!currentGroup) {
          currentGroup = {
            ...item,
            runs: [{
              text: item.text,
              is_bold: Boolean(item.is_bold),
              is_italic: Boolean(item.is_italic),
              is_underline: false
            }]
          };
          continue;
        }

        const sameLine = Math.abs(item.y - currentGroup.y) < 3.5;
        const gapX = item.x - (currentGroup.x + currentGroup.w);
        const fontFamilyMatch = (
          item.font === currentGroup.font &&
          Math.abs(item.fontSize - currentGroup.fontSize) < 1.5
        );
        const tightSplitWord = (
          currentGroup.text.length <= 2 &&
          gapX >= -5.0 &&
          gapX <= 2.5 &&
          sameLine &&
          Math.abs(item.fontSize - currentGroup.fontSize) < 1.5
        );

        const canMerge = sameLine && gapX >= -5.0 && gapX < (currentGroup.fontSize * 1.1) && (fontFamilyMatch || tightSplitWord);

        if (canMerge) {
          const needSpace = gapX > 1.2 || currentGroup.hasTrailingSpace || item.hasLeadingSpace;
          const spaceStr = needSpace ? " " : "";
          const prevRuns = currentGroup.runs;
          const lastRun = prevRuns[prevRuns.length - 1];
          if (
            lastRun &&
            lastRun.is_bold === Boolean(item.is_bold) &&
            lastRun.is_italic === Boolean(item.is_italic)
          ) {
            lastRun.text += spaceStr + item.text;
          } else {
            if (lastRun && spaceStr) lastRun.text += spaceStr;
            prevRuns.push({
              text: item.text,
              is_bold: Boolean(item.is_bold),
              is_italic: Boolean(item.is_italic),
              is_underline: false
            });
          }
          currentGroup.text = currentGroup.text + spaceStr + item.text;
          currentGroup.hasTrailingSpace = item.hasTrailingSpace;
          const mergedY = Math.min(currentGroup.y, item.y);
          const mergedBot = Math.max(currentGroup.y + currentGroup.h, item.y + item.h);
          currentGroup.y = mergedY;
          currentGroup.h = roundNum(mergedBot - mergedY);
          currentGroup.w = roundNum(Math.max(currentGroup.w, (item.x + item.w) - currentGroup.x));
        } else {
          finalizeDigitalGroup(currentGroup);
          currentGroup = {
            ...item,
            runs: [{
              text: item.text,
              is_bold: Boolean(item.is_bold),
              is_italic: Boolean(item.is_italic),
              is_underline: false
            }]
          };
        }
      }

      if (currentGroup && currentGroup.text.trim()) {
        finalizeDigitalGroup(currentGroup);
      }
      digitalTextBlocks = mergeParagraphBlocks(digitalTextBlocks, pageWidth, currentProPageIdx);
    } catch (err) {
      console.error("Client render error:", err);
    }

    // Auto-detect native editable vector PDF (Adobe Illustrator / Acrobat / Design) vs Scanned OCR
    let finalBlocks = digitalTextBlocks;
    let detectedSourceType = "Editable Digital Vector PDF";
    let hasPageImages = false;
    let isDesignApp = false;
    let isOfficeApp = false;

    if (clientPdfDoc) {
      try {
        const meta = await clientPdfDoc.getMetadata();
        const info = (meta && meta.info) ? meta.info : {};
        const sig = `${info.Creator || ""} ${info.Producer || ""}`.toLowerCase();
        isDesignApp = /illustrator|corel|inkscape|indesign|figma|canva|photoshop|affinity/.test(sig);
        isOfficeApp = /acrobat|adobe|word|libreoffice|writer|excel|powerpoint|foxit|nitro|chrome|pdfkit|reportlab|fpdf|weasyprint|pymupdf/.test(sig);
        if (isDesignApp) {
          detectedSourceType = "Editable Vector PDF (Adobe Illustrator / Design)";
        } else if (isOfficeApp) {
          detectedSourceType = "Editable Vector PDF (Adobe Acrobat / Office)";
        }
      } catch (metaErr) {}

      if (digitalTextBlocks.length > 0 && (currentProEditorMode === "illustrator" || (digitalTextBlocks.length <= 4 && !isDesignApp))) {
        try {
          const opPage = await clientPdfDoc.getPage(currentProPageIdx + 1);
          const opList = await opPage.getOperatorList();
          const imgOps = new Set([
            pdfjsLib.OPS.paintImageXObject,
            pdfjsLib.OPS.paintInlineImageXObject,
            pdfjsLib.OPS.paintImageMaskXObject
          ]);
          hasPageImages = (opList && opList.fnArray) ? opList.fnArray.some(op => imgOps.has(op)) : false;
        } catch (opErr) {}
      }
    }

    const isScannedDocument = forceOcr || digitalTextBlocks.length === 0 || (currentProEditorMode !== "illustrator" && digitalTextBlocks.length <= 4 && hasPageImages && !isDesignApp);
    if (currentProEditorMode === "illustrator" && digitalTextBlocks.length > 0 && !forceOcr) {
      detectedSourceType = hasPageImages
        ? "Illustrator Hybrid (Vektor Teks + Layer Raster)"
        : "Illustrator Precision (Vektor Native)";
    }

    let ocrTargetCanvas = pageCanvas;
    let ocrTargetScale = renderScale;
    let detectedImageBlocks = [];

    try {
      if (isScannedDocument && pageCanvas) {
        if (proOcrStatusBadge) {
          proOcrStatusBadge.innerHTML = `<span class="ocr-dot" style="background:#f59e0b;"></span><span>OCR Sedang Memindai...</span>`;
        }
        // Render offscreen 2.5x DPI canvas so Tesseract LSTM captures opening capitals & thin characters crisply!
        try {
          if (clientPdfDoc) {
            const ocrScale = 2.5;
            const ocrPage = await clientPdfDoc.getPage(currentProPageIdx + 1);
            const ocrVp = ocrPage.getViewport({ scale: ocrScale });
            const hiCanvas = document.createElement("canvas");
            hiCanvas.width = ocrVp.width;
            hiCanvas.height = ocrVp.height;
            await ocrPage.render({ canvasContext: hiCanvas.getContext("2d", { willReadFrequently: true }), viewport: ocrVp }).promise;
            ocrTargetCanvas = hiCanvas;
            ocrTargetScale = ocrScale;
          }
        } catch (hiErr) {}

        const ocrBlocks = await runRealTimeOCR(ocrTargetCanvas, (pct) => {
          if (proOcrProgressBar) proOcrProgressBar.style.width = pct + "%";
          if (proOcrPct) proOcrPct.textContent = pct + "%";
          if (proOcrStatusText) proOcrStatusText.textContent = `Memindai karakter OCR (${pct}%)...`;
        }, ocrTargetScale, pageWidth);

        if (ocrBlocks.length > 0) {
          finalBlocks = ocrBlocks;
          detectedSourceType = `Scanned Document (OCR: ${ocrBlocks.length} Blok/Paragraf)`;
        } else {
          detectedSourceType = digitalTextBlocks.length > 0 ? detectedSourceType : "Dokumen PDF Kosong / Gambar";
        }
      }

      setProLoading(true, 96, "Mendeteksi Area Grafik & Gambar...", "Memisahkan logo, stempel & tanda tangan dari blok teks...", currentProFile ? currentProFile.name : "");

      const graphicSrcCanvas = isScannedDocument ? (ocrTargetCanvas || pageCanvas) : pageCanvas;
      const graphicSrcScale = isScannedDocument ? (ocrTargetScale || renderScale) : renderScale;
      detectedImageBlocks = graphicSrcCanvas
        ? detectScannedGraphicRegions(graphicSrcCanvas, finalBlocks, graphicSrcScale, pageWidth, pageHeight)
        : [];
    } catch (ocrFlowErr) {
      console.error("OCR workflow error:", ocrFlowErr);
      if (finalBlocks.length === 0) {
        detectedSourceType = "Dokumen PDF (Pemindaian Terbatas)";
      }
    }

    const editorData = {
      success: true,
      page_idx: currentProPageIdx,
      total_pages: currentProTotalPages,
      width: pageWidth,
      height: pageHeight,
      scale: BASE_PRO_SCALE,
      doc_source_type: detectedSourceType,
      rendered_image: renderedDataUrl,
      has_raster_data: Boolean(hasPageImages),
      text_blocks: finalBlocks.map(b => ({ ...b, has_raster_data: Boolean(hasPageImages || b.has_raster_data) })),
      image_blocks: detectedImageBlocks
    };

    setProLoading(true, 100, "Selesai 100%!", `${finalBlocks.length} baris teks terdeteksi & siap diedit!`, currentProFile ? currentProFile.name : "");
    setTimeout(() => {
      try {
        setupEditorView(editorData, fromHistory);
      } catch (setupErr) {
        console.error("Setup editor error:", setupErr);
        setProLoading(false);
        alert("Gagal membuka tampilan editor: " + setupErr.message);
      }
    }, 240);
  }

  function buildProSavePayload() {
    saveCurrentPageToPagesState();
    const pagesEditsPayload = {};
    Object.keys(proPagesState).forEach(pKey => {
      const st = proPagesState[pKey];
      if (!st) return;
      const textEdits = Object.values(st.edits || {});
      const imageEdits = Object.values(st.imageEdits || {});
      const addedTexts = st.addedTexts || [];
      const addedImages = st.addedImages || [];
      const highlights = st.highlights || [];
      const drawings = st.drawings || [];
      const symbols = st.symbols || [];
      if (textEdits.length || imageEdits.length || addedTexts.length || addedImages.length || highlights.length || drawings.length || symbols.length) {
        pagesEditsPayload[String(pKey)] = {
          text_edits: textEdits,
          image_edits: imageEdits,
          added_texts: addedTexts,
          added_images: addedImages,
          highlights: highlights,
          drawings: drawings,
          symbols: symbols
        };
      }
    });
    return {
      page_idx: currentProPageIdx,
      illustrator_mode: currentProEditorMode === "illustrator",
      text_edits: Object.values(currentProEdits),
      image_edits: Object.values(currentProImageEdits),
      added_texts: currentAddedTexts,
      added_images: currentAddedImages,
      highlights: currentHighlights,
      drawings: currentDrawings,
      symbols: currentAddedSymbols,
      pages_edits: pagesEditsPayload
    };
  }

  // Force OCR Re-scan Button
  if (proBtnRunOcr) {
    proBtnRunOcr.addEventListener("click", () => {
      if (!currentProFile) return;
      setProLoading(true, 15, "Pindai Ulang OCR...", "Menganalisis ulang seluruh teks dokumen scan...", currentProFile.name);
      loadProPage(currentProPageIdx, true);
    });
  }

  // Live 1:1 PyMuPDF Preview Button (Illustrator Precision Mode)
  if (proBtnLivePreview) {
    proBtnLivePreview.addEventListener("click", async () => {
      if (!currentProFile) return;
      const origHtml = proBtnLivePreview.innerHTML;
      proBtnLivePreview.disabled = true;
      proBtnLivePreview.textContent = "Merender 1:1...";
      try {
        const payload = buildProSavePayload();
        const formData = new FormData();
        formData.append("file", currentProFile);
        formData.append("page_idx", currentProPageIdx);
        formData.append("scale", BASE_PRO_SCALE);
        formData.append("changes", JSON.stringify(payload));
        const res = await fetch("/api/pro/preview-page", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.rendered_image && proPageImg) {
            proPageImg.src = data.rendered_image;
            if (proDetectLabel) {
              proDetectLabel.textContent = "Preview 1:1 diperbarui langsung dari PDF Engine";
            }
          }
        }
      } catch (e) {}
      proBtnLivePreview.disabled = false;
      proBtnLivePreview.innerHTML = origHtml;
    });
  }

  function roundNum(n) { return Math.round(n * 100) / 100; }

  function setupEditorView(data, fromHistory = false) {
    setProLoading(false);
    isProUnlocked = true;
    syncProThemeAndLayout("pro");
    currentProTotalPages = data.total_pages || 1;
    currentProPageIdx = data.page_idx || 0;
    currentPageSize = { width: data.width || 595, height: data.height || 842 };
    currentBgLayerDataUrl = data.rendered_bg_image || null;
    currentEmbeddedFonts = Array.isArray(data.embedded_fonts) ? data.embedded_fonts : [];
    applyEmbeddedFontsStylesheet(currentEmbeddedFonts);

    const hasRaster = Boolean(data.has_raster_data || currentBgLayerDataUrl);
    currentPageTextBlocks = (data.text_blocks || []).map(b => ({
      ...b,
      has_raster_data: Boolean(b.has_raster_data || hasRaster)
    }));
    currentPageImageBlocks = data.image_blocks || [];
    currentDocSourceType = data.doc_source_type || "Editable Digital Vector PDF";

    if (proBtnLivePreview) {
      proBtnLivePreview.style.display = currentProEditorMode === "illustrator" ? "inline-flex" : "none";
    }

    proUploadView.style.display = "none";
    proEditorView.style.display = "block";
    if (proDocFilename) {
      proDocFilename.textContent = currentProFile ? currentProFile.name : "Dokumen PDF";
    }
    proPageIndicator.textContent = `Hal ${currentProPageIdx + 1} / ${currentProTotalPages}`;

    if (proOcrStatusBadge) {
      const isOcrMode = /scan|ocr/i.test(currentDocSourceType);
      const isIllus = currentProEditorMode === "illustrator";
      const dotColor = isIllus ? "#f97316" : (isOcrMode ? "#2dd4bf" : "#14b8a6");
      const labelTxt = isOcrMode
        ? `${currentDocSourceType}`
        : `${currentDocSourceType} · ${currentPageTextBlocks.length} Blok`;
      proOcrStatusBadge.innerHTML = `<span class="ocr-dot" style="background:${dotColor};"></span><span>${labelTxt}</span>`;
    }

    restorePageFromPagesState(currentProPageIdx);
    proPageImg.src = data.rendered_image;
    rerenderAllEditorLayers();

    if (!fromHistory && proUndoStack.length === 0) {
      resetHistoryWithCurrent();
    } else {
      updateUndoRedoButtons();
    }
  }

  // Active Block Selection & Character/Paragraph Panel Synchronization
  function selectActiveBlock(blk, el) {
    activeEditBlock = blk;
    activeEditElement = el;

    // Remove editing class from any other blocks
    document.querySelectorAll(".text-overlay-block.is-editing").forEach(b => {
      if (b !== el) b.classList.remove("is-editing");
    });

    if (!blk.isAddedText) {
      document.querySelectorAll(".added-text-block.is-selected").forEach(b => b.classList.remove("is-selected"));
      el.classList.add("is-editing");
    }

    const sizePt = Math.round((blk.size || blk.font_size || 13) * 100) / 100;

    // Update Auto-Detect Label
    if (proDetectLabel) {
      const styles = [];
      if (blk.is_bold) styles.push("Bold");
      if (blk.is_italic) styles.push("Italic");
      if (blk.is_underline) styles.push("U");
      const styleDesc = styles.length > 0 ? ` [${styles.join("+")}]` : "";
      const prefix = blk.isAddedText ? "Teks Baru" : (blk.is_paragraph ? "Paragraf" : "Auto-Detect");
      proDetectLabel.textContent = `${prefix}: ${blk.font || "Arial"}, ${sizePt}pt${styleDesc}`;
    }

    // Sync Font Family Dropdown
    if (proToolFont) {
      let matched = false;
      const targetFont = (blk.web_font || blk.font || "").toLowerCase();
      for (let i = 0; i < proToolFont.options.length; i++) {
        const optVal = proToolFont.options[i].value.toLowerCase();
        if (targetFont.includes("bookman") && optVal.includes("bookman")) {
          proToolFont.selectedIndex = i; matched = true; break;
        } else if (targetFont.includes("tahoma") && optVal.includes("tahoma")) {
          proToolFont.selectedIndex = i; matched = true; break;
        } else if (targetFont.includes("times") && optVal.includes("times")) {
          proToolFont.selectedIndex = i; matched = true; break;
        } else if (targetFont.includes("courier") && optVal.includes("courier")) {
          proToolFont.selectedIndex = i; matched = true; break;
        } else if (targetFont.includes("calibri") && optVal.includes("calibri")) {
          proToolFont.selectedIndex = i; matched = true; break;
        } else if (targetFont.includes("georgia") && optVal.includes("georgia")) {
          proToolFont.selectedIndex = i; matched = true; break;
        } else if (targetFont.includes("segoe") && optVal.includes("segoe")) {
          proToolFont.selectedIndex = i; matched = true; break;
        } else if (targetFont.includes("verdana") && optVal.includes("verdana")) {
          proToolFont.selectedIndex = i; matched = true; break;
        }
      }
      if (!matched) proToolFont.selectedIndex = 0;
    }

    // Sync Adobe Character 2x2 Panel Values (Size, Leading, Kerning, Tracking)
    if (proToolSizeVal) {
      proToolSizeVal.value = `${sizePt} pt`;
    }
    if (proToolLeadingVal) {
      if (blk.line_height != null && blk.line_height !== "" && String(blk.line_height).toLowerCase() !== "auto" && parseFloat(blk.line_height) > 0) {
        proToolLeadingVal.value = `${Math.round(parseFloat(blk.line_height) * 10) / 10} pt`;
      } else {
        proToolLeadingVal.value = `(${roundNum(sizePt * 1.2)} pt)`;
      }
    }
    if (proToolKerningVal) {
      proToolKerningVal.value = (blk.kerning == null || blk.kerning === "" || String(blk.kerning).toLowerCase() === "auto")
        ? "Auto"
        : String(Math.round(parseFloat(blk.kerning)));
    }
    if (proToolTrackingVal) {
      proToolTrackingVal.value = String(Math.round(parseFloat(blk.tracking || 0)));
    }
    if (proToolHScaleVal) {
      const hs = Math.round(parseFloat(blk.h_scale || 100) || 100);
      proToolHScaleVal.value = `${hs}%`;
    }
    if (proToolParaSpacingVal) {
      const ps = Math.round((parseFloat(blk.para_spacing || 0) || 0) * 10) / 10;
      proToolParaSpacingVal.value = `${ps} pt`;
    }

    // Sync Style & List Toggles
    if (proToolBold) proToolBold.classList.toggle("active", Boolean(blk.is_bold));
    if (proToolItalic) proToolItalic.classList.toggle("active", Boolean(blk.is_italic));
    if (proToolUnderline) proToolUnderline.classList.toggle("active", Boolean(blk.is_underline));

    const txtLines = String((el ? el.textContent : blk.text) || "").split("\n").filter(l => l.trim().length > 0);
    const isBullet = txtLines.length > 0 && txtLines.every(l => /^[•\-\*]\s+/.test(l.trim()));
    const isNumbered = txtLines.length > 0 && txtLines.every(l => /^\d+\.\s+/.test(l.trim()));
    if (proToolBulletList) proToolBulletList.classList.toggle("active", isBullet);
    if (proToolNumberList) proToolNumberList.classList.toggle("active", isNumbered);

    // Sync All 7 Paragraph Alignment Buttons
    const alignVal = blk.align || "left";
    document.querySelectorAll(".adobe-align-btn[data-align]").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.align === alignVal);
    });

    // Sync Color
    if (proToolColor && blk.color) {
      proToolColor.value = blk.color.startsWith("#") ? blk.color : "#000000";
    }

    // Adobe BBoxBoundary Move & Resize Frame for direct PDF text blocks
    if (!blk.isAddedText && typeof positionActiveBBoxFrame === "function") {
      selectedImageBlockId = null;
      document.querySelectorAll(".pdf-image-block.is-selected").forEach(b => b.classList.remove("is-selected"));
      positionActiveBBoxFrame(blk, el);
    }
  }

  function syncPdfFontCode(blk) {
    const fn = ((blk.web_font || "") + " " + (blk.font || "")).toLowerCase();
    const b = Boolean(blk.is_bold);
    const it = Boolean(blk.is_italic);
    if (/times|bookman|georgia|cambria|garamond|palatino|minion|\bserif\b/.test(fn) && !/sans/.test(fn)) {
      blk.font_code = b ? (it ? "tibi" : "tibo") : (it ? "tiit" : "tiro");
    } else if (/courier|mono|consolas/.test(fn)) {
      blk.font_code = b ? (it ? "cobi" : "cobo") : (it ? "coit" : "cour");
    } else {
      blk.font_code = b ? (it ? "hebi" : "hebo") : (it ? "heit" : "helv");
    }
  }

  function requireActiveBlock() {
    if (activeEditBlock && activeEditElement) return true;
    const badge = document.querySelector(".format-detect-badge");
    if (proDetectLabel) {
      proDetectLabel.textContent = "Klik salah satu teks di dokumen terlebih dahulu!";
    }
    if (badge) {
      badge.classList.add("warn-pulse");
      setTimeout(() => badge.classList.remove("warn-pulse"), 1800);
    }
    return false;
  }

  function ensureGhostPatchForBlock(blk, el = null) {
    if (!proTextOverlays || blk.isAddedText || blk.trueOrigLeft == null) return;
    const patchId = `patch_${blk.id}`;
    let patchEl = document.getElementById(patchId);
    const hasEditState = Boolean(currentProEdits[blk.id]) || (el && (el.classList.contains("is-editing") || el.classList.contains("is-modified")));
    const movedDist = Math.abs((blk.origLeft || 0) - blk.trueOrigLeft) + Math.abs((blk.origTop || 0) - (blk.trueOrigTop != null ? blk.trueOrigTop : blk.origTop || 0));
    if (hasEditState && movedDist > 4) {
      if (!patchEl) {
        patchEl = document.createElement("div");
        patchEl.className = "text-ghost-patch";
        patchEl.id = patchId;
        proTextOverlays.appendChild(patchEl);
      }
      const pTop = blk.trueOrigTop != null ? blk.trueOrigTop : (blk.origTop || 0);
      const pLeft = blk.trueOrigLeft - 2;
      const pTopAdj = pTop - 1;
      patchEl.style.left = `${pLeft}px`;
      patchEl.style.top = `${pTopAdj}px`;
      patchEl.style.width = `${blk.trueOrigWidth + 4}px`;
      patchEl.style.height = `${blk.origHeight + 3}px`;
      patchEl.style.setProperty("--bg-inpainting", blk.bg_color || "#ffffff");
      applyIllustratorBgLayerSlice(patchEl, pLeft, pTopAdj);
    } else if (patchEl) {
      patchEl.remove();
    }
  }

  function applyCssAlignmentOnly(el, newAlign) {
    let cssAlign = "left";
    let cssLast = "auto";
    if (newAlign === "center" || newAlign === "right") {
      cssAlign = newAlign;
    } else if (newAlign === "justify") {
      cssAlign = "justify";
      cssLast = "left";
    } else if (newAlign === "justify-center") {
      cssAlign = "justify";
      cssLast = "center";
    } else if (newAlign === "justify-right") {
      cssAlign = "justify";
      cssLast = "right";
    } else if (newAlign === "justify-all") {
      cssAlign = "justify";
      cssLast = "justify";
    }
    el.style.setProperty("text-align", cssAlign, "important");
    el.style.setProperty("text-align-last", cssLast, "important");
    if (newAlign === "center") {
      el.style.setProperty("justify-content", "center", "important");
    } else if (newAlign === "right") {
      el.style.setProperty("justify-content", "flex-end", "important");
    } else {
      el.style.setProperty("justify-content", "flex-start", "important");
    }
    return { cssAlign, cssLast };
  }

  function applyBlockAlignment(blk, el, newAlign) {
    blk.align = newAlign;
    const pageW = proStage ? proStage.offsetWidth : 800;
    const marginPx = 54 * currentProScale;

    const { cssAlign, cssLast } = applyCssAlignmentOnly(el, newAlign);

    if (blk.isAddedText) {
      const box = el.closest(".added-text-block");
      if (box && !blk.boxW) {
        let boxLeft = box.offsetLeft;
        if (newAlign === "center") {
          boxLeft = Math.max(0, (pageW - box.offsetWidth) / 2);
        } else if (newAlign === "right") {
          boxLeft = Math.max(0, pageW - marginPx - box.offsetWidth);
        }
        box.style.left = `${boxLeft}px`;
        blk.x = Math.round((boxLeft + ADDED_TEXT_HANDLE_W) / currentProScale);
      }
      el.style.setProperty("text-align", cssAlign, "important");
      el.style.setProperty("text-align-last", cssLast, "important");
      return;
    }

    el.style.setProperty("text-align", cssAlign, "important");
    el.style.setProperty("text-align-last", cssLast, "important");

    // Multi-line paragraph boxes stay cleanly inside their paragraph column width instead of sliding horizontally!
    if (blk.is_paragraph || cssAlign === "justify") {
      blk.origLeft = blk.trueOrigLeft != null ? blk.trueOrigLeft : blk.origLeft;
      blk.origWidth = blk.trueOrigWidth != null ? blk.trueOrigWidth : blk.origWidth;
      blk.origRight = blk.origLeft + blk.origWidth;
      blk.origCenterX = blk.origLeft + blk.origWidth / 2;
      el.style.setProperty("justify-content", "flex-start", "important");
      updateBlockGeometry(blk, el);
      ensureGhostPatchForBlock(blk, el);
      return;
    }

    if (newAlign === "center") {
      el.style.setProperty("justify-content", "center", "important");
      blk.origCenterX = pageW / 2;
      blk.origLeft = Math.max(0, (pageW - blk.origWidth) / 2);
      blk.origRight = blk.origLeft + blk.origWidth;
    } else if (newAlign === "right") {
      el.style.setProperty("justify-content", "flex-end", "important");
      blk.origRight = Math.max(blk.origWidth, pageW - marginPx);
      blk.origLeft = blk.origRight - blk.origWidth;
      blk.origCenterX = blk.origLeft + blk.origWidth / 2;
    } else {
      el.style.setProperty("justify-content", "flex-start", "important");
      blk.origLeft = (blk.trueOrigLeft != null) ? blk.trueOrigLeft : marginPx;
      blk.origRight = blk.origLeft + blk.origWidth;
      blk.origCenterX = blk.origLeft + blk.origWidth / 2;
    }
    updateBlockGeometry(blk, el);
    ensureGhostPatchForBlock(blk, el);
  }

  function saveCurrentBlockEdit(blk, el) {
    if (blk.isAddedText) {
      blk.text = el.textContent;
      blk.runs = extractRunsFromElement(el, blk);
      blk.font_size = blk.size || blk.font_size || 13;
      const rect = el.getBoundingClientRect();
      blk.w = Math.max(40, Math.round(rect.width / currentProScale) + 12);
      blk.h = Math.max(20, Math.round(rect.height / currentProScale) + 8);
      return;
    }

    const txt = el.textContent;
    const isDeleted = txt.trim().length === 0;
    let extractedRuns = extractRunsFromElement(el, blk);
    if (
      blk.tab_prefix &&
      blk.tab_col_dx != null &&
      !extractedRuns.some(r => r.col_dx != null) &&
      txt.startsWith(blk.tab_prefix + " ")
    ) {
      const restTxt = txt.slice(blk.tab_prefix.length);
      const baseRun = extractedRuns[0] || {
        is_bold: Boolean(blk.is_bold),
        is_italic: Boolean(blk.is_italic),
        is_underline: Boolean(blk.is_underline),
        color: blk.color || "#111827"
      };
      extractedRuns = [
        { ...baseRun, text: blk.tab_prefix },
        { ...baseRun, text: restTxt, col_dx: blk.tab_col_dx, tab_gap: blk.tab_gap }
      ];
    }
    blk.runs = extractedRuns;
    const curColor = (blk.color || "#111827").toLowerCase();
    const curBboxKey = (blk.expandedBbox || blk.bbox || []).join(",");
    const curRunsKey = JSON.stringify(extractedRuns);

    // Strict Diff Protection: Never register an edit if text and styles still match original PDF block
    const snap = blk._baseSnapshot;
    const isUnchanged = snap &&
      txt === snap.text &&
      Math.abs((blk.size || 0) - (snap.size || 0)) < 0.05 &&
      (blk.web_font === snap.web_font) &&
      (Boolean(blk.is_bold) === snap.is_bold) &&
      (Boolean(blk.is_italic) === snap.is_italic) &&
      (Boolean(blk.is_underline) === snap.is_underline) &&
      ((blk.align || "left") === snap.align) &&
      (String(blk.line_height || "auto") === snap.lineHeightKey) &&
      (String(blk.tracking || 0) === snap.trackingKey) &&
      (String(blk.kerning || "auto") === snap.kerningKey) &&
      (String(blk.h_scale || 100) === snap.hScaleKey) &&
      (String(blk.para_spacing || 0) === snap.paraSpacingKey) &&
      (curRunsKey === snap.runsKey) &&
      (curColor === snap.color) &&
      (curBboxKey === snap.bboxKey);

    if (isUnchanged) {
      delete currentProEdits[blk.id];
      el.classList.remove("is-deleted", "is-modified");
      return;
    }

    currentProEdits[blk.id] = {
      id: blk.id,
      bbox: blk.expandedBbox || blk.bbox,
      orig_bbox: blk.orig_ink_bbox || blk.orig_bbox || blk.bbox,
      original: blk.text,
      new_text: txt,
      deleted: isDeleted,
      size: blk.size,
      font: blk.font,
      web_font: blk.web_font,
      font_code: blk.font_code,
      is_bold: Boolean(blk.is_bold),
      is_italic: Boolean(blk.is_italic),
      is_underline: Boolean(blk.is_underline),
      align: blk.align || "left",
      color: blk.color || "#111827",
      bg_color: blk.bg_color || "#ffffff",
      is_paragraph: Boolean(blk.is_paragraph),
      text_indent: blk.text_indent || 0,
      line_height: blk.line_height || null,
      tracking: blk.tracking || 0,
      kerning: blk.kerning || "auto",
      h_scale: parseFloat(blk.h_scale || 100) || 100,
      para_spacing: parseFloat(blk.para_spacing || 0) || 0,
      preserve_bg: currentProEditorMode === "illustrator" || Boolean(blk.has_raster_data),
      orig_x0: blk.bbox ? blk.bbox[0] : null,
      orig_y0: blk.bbox ? blk.bbox[1] : null,
      orig_origin_x: blk.orig_origin_x != null ? blk.orig_origin_x : null,
      orig_baseline_y: blk.orig_baseline_y != null ? blk.orig_baseline_y : null,
      ascender: blk.ascender != null ? blk.ascender : null,
      angle_deg: blk.angle_deg || 0,
      pdf_font_xref: blk.pdf_font_xref || null,
      font_overridden: Boolean(blk.font_overridden),
      orig_is_bold: blk._baseSnapshot ? Boolean(blk._baseSnapshot.orig_is_bold) : Boolean(blk.is_bold),
      orig_is_italic: blk._baseSnapshot ? Boolean(blk._baseSnapshot.orig_is_italic) : Boolean(blk.is_italic),
      user_moved: Boolean(blk._wasMoved),
      align_changed: Boolean(blk._alignChanged),
      isOcr: Boolean(blk.isOcr),
      runs: extractedRuns
    };

    if (isDeleted) {
      el.classList.add("is-deleted");
      el.classList.remove("is-modified");
    } else {
      el.classList.remove("is-deleted");
      el.classList.add("is-modified");
    }
  }

  // Prevent toolbar buttons from stealing text focus / collapsing editing caret
  if (proFormatBar) {
    proFormatBar.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });
    });
  }

  function toggleInlineOrBlockStyle(styleProp) {
    if (!requireActiveBlock()) return;
    const sel = window.getSelection ? window.getSelection() : null;
    const hasRangeInside = sel && !sel.isCollapsed && activeEditElement.contains(sel.anchorNode) && activeEditBlock.is_paragraph;

    if (hasRangeInside) {
      const cmd = styleProp === "bold" ? "bold" : (styleProp === "italic" ? "italic" : "underline");
      try {
        document.execCommand(cmd, false, null);
      } catch (ex) {}
      activeEditBlock.runs = extractRunsFromElement(activeEditElement, activeEditBlock);
      activeEditBlock.is_bold = activeEditBlock.runs.every(r => r.is_bold);
      activeEditBlock.is_italic = activeEditBlock.runs.every(r => r.is_italic);
      activeEditBlock.is_underline = activeEditBlock.runs.every(r => r.is_underline);
    } else {
      if (styleProp === "bold") {
        activeEditBlock.is_bold = !activeEditBlock.is_bold;
        activeEditElement.style.setProperty("font-weight", activeEditBlock.is_bold ? "bold" : "normal", "important");
        activeEditElement.querySelectorAll("span,b,strong").forEach(s => { s.style.fontWeight = activeEditBlock.is_bold ? "bold" : "normal"; });
      } else if (styleProp === "italic") {
        activeEditBlock.is_italic = !activeEditBlock.is_italic;
        activeEditElement.style.setProperty("font-style", activeEditBlock.is_italic ? "italic" : "normal", "important");
        activeEditElement.querySelectorAll("span,i,em").forEach(s => { s.style.fontStyle = activeEditBlock.is_italic ? "italic" : "normal"; });
      } else {
        activeEditBlock.is_underline = !activeEditBlock.is_underline;
        activeEditElement.style.setProperty("text-decoration", activeEditBlock.is_underline ? "underline" : "none", "important");
        activeEditElement.querySelectorAll("span,u").forEach(s => { s.style.textDecoration = activeEditBlock.is_underline ? "underline" : "none"; });
      }
      if (Array.isArray(activeEditBlock.runs)) {
        const flagKey = styleProp === "bold" ? "is_bold" : (styleProp === "italic" ? "is_italic" : "is_underline");
        activeEditBlock.runs = activeEditBlock.runs.map(r => ({ ...r, [flagKey]: Boolean(activeEditBlock[flagKey]) }));
      }
    }
    syncPdfFontCode(activeEditBlock);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  // Wire up Formatting Toolbar Controls
  if (proToolBold) proToolBold.addEventListener("click", () => toggleInlineOrBlockStyle("bold"));
  if (proToolItalic) proToolItalic.addEventListener("click", () => toggleInlineOrBlockStyle("italic"));
  if (proToolUnderline) proToolUnderline.addEventListener("click", () => toggleInlineOrBlockStyle("underline"));

  // Wire up all 7 Adobe Paragraph Alignment & Justify Buttons
  document.querySelectorAll(".adobe-align-btn[data-align]").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!requireActiveBlock()) return;
      activeEditBlock._alignChanged = true;
      applyBlockAlignment(activeEditBlock, activeEditElement, btn.dataset.align || "left");
      saveCurrentBlockEdit(activeEditBlock, activeEditElement);
      selectActiveBlock(activeEditBlock, activeEditElement);
      pushUndoSnapshot();
    });
  });

  function applyFontSizeChange(newSizeVal) {
    if (!requireActiveBlock()) return;
    const clamped = Math.max(6, Math.min(72, Math.round(newSizeVal * 10) / 10));
    activeEditBlock.size = clamped;
    if (activeEditBlock.isAddedText) activeEditBlock.font_size = clamped;
    activeEditElement.style.setProperty("font-size", `${clamped * currentProScale}px`, "important");
    applyCharSpacingAndLeadingStyles(activeEditBlock, activeEditElement);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  function applyLeadingChange(val) {
    if (!requireActiveBlock()) return;
    if (val === "auto" || val === "" || val == null) {
      activeEditBlock.line_height = null;
    } else {
      const n = parseFloat(val);
      if (isNaN(n)) return;
      activeEditBlock.line_height = Math.max(6, Math.min(120, Math.round(n * 10) / 10));
    }
    applyCharSpacingAndLeadingStyles(activeEditBlock, activeEditElement);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  function applyKerningChange(val) {
    if (!requireActiveBlock()) return;
    if (String(val).toLowerCase() === "auto" || val === "" || val == null) {
      activeEditBlock.kerning = "auto";
    } else {
      const n = parseFloat(val);
      if (isNaN(n)) return;
      activeEditBlock.kerning = Math.max(-200, Math.min(400, Math.round(n)));
    }
    applyCharSpacingAndLeadingStyles(activeEditBlock, activeEditElement);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  function applyTrackingChange(val) {
    if (!requireActiveBlock()) return;
    const n = parseFloat(val);
    if (isNaN(n)) return;
    activeEditBlock.tracking = Math.max(-200, Math.min(600, Math.round(n)));
    applyCharSpacingAndLeadingStyles(activeEditBlock, activeEditElement);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  function applyHScaleChange(val) {
    if (!requireActiveBlock()) return;
    const n = parseFloat(val);
    if (isNaN(n)) return;
    activeEditBlock.h_scale = Math.max(50, Math.min(200, Math.round(n)));
    applyCharSpacingAndLeadingStyles(activeEditBlock, activeEditElement);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  function applyParaSpacingChange(val) {
    if (!requireActiveBlock()) return;
    const n = parseFloat(val);
    if (isNaN(n)) return;
    activeEditBlock.para_spacing = Math.max(0, Math.min(48, Math.round(n * 10) / 10));
    applyCharSpacingAndLeadingStyles(activeEditBlock, activeEditElement);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  function toggleBlockListMode(kind) {
    if (!requireActiveBlock()) return;
    const raw = (activeEditElement.textContent || "").replace(/\r\n/g, "\n");
    const lines = raw.split("\n");
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    if (nonEmpty.length === 0) return;

    const bulletRe = /^[•\-\*]\s+/;
    const numRe = /^\d+\.\s+/;
    const alreadyActive = kind === "bullet"
      ? nonEmpty.every(l => bulletRe.test(l.trim()))
      : nonEmpty.every(l => numRe.test(l.trim()));

    let counter = 1;
    const nextLines = lines.map(line => {
      const t = line.trim();
      if (!t) return "";
      const stripped = t.replace(bulletRe, "").replace(numRe, "");
      if (alreadyActive) return stripped;
      if (kind === "bullet") return `• ${stripped}`;
      const res = `${counter}. ${stripped}`;
      counter++;
      return res;
    });
    const newText = nextLines.join("\n");
    if (nextLines.length > 1) {
      activeEditBlock.is_paragraph = true;
      activeEditElement.classList.add("is-paragraph-block");
    }
    const baseRunStyle = (activeEditBlock.runs && activeEditBlock.runs[0]) ? activeEditBlock.runs[0] : {
      is_bold: Boolean(activeEditBlock.is_bold),
      is_italic: Boolean(activeEditBlock.is_italic),
      is_underline: Boolean(activeEditBlock.is_underline),
      color: activeEditBlock.color || "#111827"
    };
    activeEditBlock.runs = [{
      text: newText,
      is_bold: Boolean(baseRunStyle.is_bold),
      is_italic: Boolean(baseRunStyle.is_italic),
      is_underline: Boolean(baseRunStyle.is_underline),
      color: baseRunStyle.color || activeEditBlock.color || "#111827"
    }];
    renderRunsToElement(activeEditElement, activeEditBlock.runs, newText, activeEditBlock.color);
    updateBlockGeometry(activeEditBlock, activeEditElement);
    saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    selectActiveBlock(activeEditBlock, activeEditElement);
    pushUndoSnapshot();
  }

  function bindAdobeCharSpinControl(incBtn, decBtn, valInput, presetSel, getCurrentFn, step, applyFn) {
    if (incBtn) {
      incBtn.addEventListener("click", () => {
        if (!requireActiveBlock()) return;
        applyFn(getCurrentFn() + step);
      });
    }
    if (decBtn) {
      decBtn.addEventListener("click", () => {
        if (!requireActiveBlock()) return;
        applyFn(getCurrentFn() - step);
      });
    }
    if (valInput) {
      const commitInput = () => {
        const raw = (valInput.value || "").replace(/[()%pt\s]/gi, "").trim();
        if (!raw || raw.toLowerCase() === "auto") {
          applyFn("auto");
        } else {
          const parsed = parseFloat(raw);
          if (!isNaN(parsed)) applyFn(parsed);
        }
      };
      valInput.addEventListener("change", commitInput);
      valInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commitInput();
          valInput.blur();
        }
      });
    }
    if (presetSel) {
      presetSel.addEventListener("change", () => {
        const chosen = presetSel.value;
        if (chosen) applyFn(chosen);
        presetSel.value = "";
      });
    }
  }

  bindAdobeCharSpinControl(
    proToolSizeInc, proToolSizeDec, proToolSizeVal, proToolSizePreset,
    () => parseFloat(activeEditBlock.size || activeEditBlock.font_size || 12),
    0.5,
    applyFontSizeChange
  );
  bindAdobeCharSpinControl(
    proToolLeadingInc, proToolLeadingDec, proToolLeadingVal, proToolLeadingPreset,
    () => parseFloat(activeEditBlock.line_height || roundNum((activeEditBlock.size || activeEditBlock.font_size || 12) * 1.2)),
    1,
    applyLeadingChange
  );
  bindAdobeCharSpinControl(
    proToolKerningInc, proToolKerningDec, proToolKerningVal, proToolKerningPreset,
    () => (activeEditBlock.kerning == null || String(activeEditBlock.kerning).toLowerCase() === "auto") ? 0 : parseFloat(activeEditBlock.kerning),
    10,
    applyKerningChange
  );
  bindAdobeCharSpinControl(
    proToolTrackingInc, proToolTrackingDec, proToolTrackingVal, proToolTrackingPreset,
    () => parseFloat(activeEditBlock.tracking || 0),
    10,
    applyTrackingChange
  );
  bindAdobeCharSpinControl(
    proToolHScaleInc, proToolHScaleDec, proToolHScaleVal, proToolHScalePreset,
    () => parseFloat(activeEditBlock.h_scale || 100),
    5,
    applyHScaleChange
  );
  bindAdobeCharSpinControl(
    proToolParaSpacingInc, proToolParaSpacingDec, proToolParaSpacingVal, proToolParaSpacingPreset,
    () => parseFloat(activeEditBlock.para_spacing || 0),
    2,
    applyParaSpacingChange
  );

  if (proToolBulletList) proToolBulletList.addEventListener("click", () => toggleBlockListMode("bullet"));
  if (proToolNumberList) proToolNumberList.addEventListener("click", () => toggleBlockListMode("number"));

  if (proToolFont) {
    proToolFont.addEventListener("change", () => {
      if (!requireActiveBlock()) return;
      activeEditBlock.font_overridden = true;
      activeEditBlock.web_font = proToolFont.value;
      activeEditBlock.font = proToolFont.options[proToolFont.selectedIndex].text.replace(/\s*\([^)]*\)/g, "").trim();
      activeEditElement.style.setProperty("font-family", activeEditBlock.web_font, "important");
      syncPdfFontCode(activeEditBlock);
      updateBlockGeometry(activeEditBlock, activeEditElement);
      saveCurrentBlockEdit(activeEditBlock, activeEditElement);
      selectActiveBlock(activeEditBlock, activeEditElement);
      pushUndoSnapshot();
    });
  }

  if (proToolColor) {
    proToolColor.addEventListener("input", () => {
      if (!requireActiveBlock()) return;
      activeEditBlock.color = proToolColor.value;
      activeEditElement.style.setProperty("color", activeEditBlock.color, "important");
      activeEditElement.style.setProperty("--text-color", activeEditBlock.color);
      if (Array.isArray(activeEditBlock.runs)) {
        activeEditBlock.runs = activeEditBlock.runs.map(r => ({ ...r, color: activeEditBlock.color }));
      }
      saveCurrentBlockEdit(activeEditBlock, activeEditElement);
    });
    proToolColor.addEventListener("change", () => {
      if (activeEditBlock && activeEditElement) {
        pushUndoSnapshot();
      }
    });
  }

  // Undo / Redo & Zoom Top Bar Controls
  if (proBtnUndo) proBtnUndo.addEventListener("click", performUndo);
  if (proBtnRedo) proBtnRedo.addEventListener("click", performRedo);

  function setProZoom(newZoom) {
    currentProZoom = Math.max(0.5, Math.min(2.0, Math.round(newZoom * 100) / 100));
    currentProScale = roundNum(BASE_PRO_SCALE * currentProZoom);
    rerenderAllEditorLayers();
  }
  if (proBtnZoomOut) proBtnZoomOut.addEventListener("click", () => setProZoom(currentProZoom - 0.15));
  if (proBtnZoomIn) proBtnZoomIn.addEventListener("click", () => setProZoom(currentProZoom + 0.15));

  // Keyboard Shortcuts for Formatting & Global Undo/Redo (Ctrl+B/I/U/Z/Y)
  document.addEventListener("keydown", (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : "";
    const isTypingInBox = document.activeElement && (document.activeElement.isContentEditable || activeTag === "INPUT" || activeTag === "TEXTAREA");

    if ((e.ctrlKey || e.metaKey) && !isTypingInBox && proEditorView && proEditorView.style.display !== "none") {
      if ((e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        performUndo();
        return;
      }
      if (e.key === "y" || e.key === "Y" || ((e.key === "z" || e.key === "Z") && e.shiftKey)) {
        e.preventDefault();
        performRedo();
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && activeEditBlock && activeEditElement) {
      if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        proToolBold.click();
      } else if (e.key === "i" || e.key === "I") {
        e.preventDefault();
        proToolItalic.click();
      } else if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        proToolUnderline.click();
      }
    }
  });

  function renderTextOverlays(blocks) {
    proTextOverlays.innerHTML = "";
    (blocks || []).forEach(blk => {
      const baseRuns = coalesceRuns(blk.runs && blk.runs.length ? blk.runs : [{
        text: blk.text || "",
        is_bold: Boolean(blk.is_bold),
        is_italic: Boolean(blk.is_italic),
        is_underline: Boolean(blk.is_underline),
        color: (blk.color || "#111827").toLowerCase()
      }]);

      // Preserve clean baseline snapshot so Undo/Redo reverts cleanly
      if (!blk._baseSnapshot) {
        blk._baseSnapshot = {
          text: blk.text || "",
          font: blk.font,
          web_font: blk.web_font,
          font_code: blk.font_code,
          size: blk.size,
          is_bold: Boolean(blk.is_bold),
          orig_is_bold: Boolean(blk.is_bold),
          is_italic: Boolean(blk.is_italic),
          orig_is_italic: Boolean(blk.is_italic),
          is_underline: Boolean(blk.is_underline),
          align: blk.align || "left",
          color: (blk.color || "#111827").toLowerCase(),
          is_paragraph: Boolean(blk.is_paragraph),
          text_indent: blk.text_indent || 0,
          lineHeightKey: String(blk.line_height || "auto"),
          line_height: blk.line_height || null,
          trackingKey: String(blk.tracking || 0),
          tracking: blk.tracking || 0,
          kerningKey: String(blk.kerning || "auto"),
          kerning: blk.kerning || "auto",
          hScaleKey: String(blk.h_scale || 100),
          h_scale: blk.h_scale || 100,
          paraSpacingKey: String(blk.para_spacing || 0),
          para_spacing: blk.para_spacing || 0,
          font_overridden: Boolean(blk.font_overridden),
          runs: JSON.parse(JSON.stringify(baseRuns)),
          runsKey: JSON.stringify(baseRuns),
          bboxKey: (blk.bbox || []).join(",")
        };
      } else {
        const snap = blk._baseSnapshot;
        blk.font = snap.font;
        blk.web_font = snap.web_font;
        blk.font_code = snap.font_code;
        blk.font_overridden = Boolean(snap.font_overridden);
        blk.size = snap.size;
        blk.is_bold = snap.is_bold;
        blk.is_italic = snap.is_italic;
        blk.is_underline = snap.is_underline;
        blk.align = snap.align;
        blk.color = snap.color;
        blk.line_height = snap.line_height;
        blk.tracking = snap.tracking;
        blk.kerning = snap.kerning;
        blk.h_scale = snap.h_scale;
        blk.para_spacing = snap.para_spacing;
        blk.runs = JSON.parse(JSON.stringify(snap.runs));
        blk._wasMoved = false;
        blk._alignChanged = false;
        delete blk.expandedBbox;
      }

      const el = document.createElement("div");
      el.className = "text-overlay-block" + (blk.isOcr ? " ocr-detected" : "") + (blk.is_paragraph ? " is-paragraph-block" : "");
      el.id = blk.id;
      el.contentEditable = "true";
      el.spellcheck = false;
      blk._wasMoved = false;
      blk._alignChanged = false;

      // Store initial anchor coordinates for dynamic bidirectional stretching
      blk.origLeft = blk.bbox[0] * currentProScale;
      blk.origTop = blk.bbox[1] * currentProScale;
      blk.origWidth = Math.max(16, (blk.bbox[2] - blk.bbox[0]) * currentProScale);
      blk.origHeight = Math.max(12, (blk.bbox[3] - blk.bbox[1]) * currentProScale);
      blk.origRight = blk.origLeft + blk.origWidth;
      blk.origCenterX = blk.origLeft + blk.origWidth / 2;
      blk.trueOrigLeft = blk.origLeft;
      blk.trueOrigTop = blk.origTop;
      blk.trueOrigWidth = blk.origWidth;

      el.style.left = `${blk.origLeft}px`;
      el.style.top = `${blk.origTop}px`;
      el.style.width = `${blk.origWidth}px`;
      if (blk.is_paragraph) {
        el.style.minHeight = `${blk.origHeight}px`;
        if (blk.text_indent) {
          el.style.textIndent = `${roundNum(blk.text_indent * currentProScale)}px`;
        }
      } else {
        el.style.height = `${blk.origHeight}px`;
      }
      const baseWebFam = blk.web_font || "Arial, sans-serif";
      el.style.fontFamily = (blk.pdf_font_alias && !blk.font_overridden && !baseWebFam.includes(blk.pdf_font_alias))
        ? `'${blk.pdf_font_alias}', ${baseWebFam}`
        : baseWebFam;
      el.style.fontSize = `${blk.size * currentProScale}px`;
      el.style.fontWeight = blk.is_bold ? "bold" : "normal";
      el.style.fontStyle = blk.is_italic ? "italic" : "normal";
      el.style.textDecoration = blk.is_underline ? "underline" : "none";
      el.style.setProperty("--text-color", blk.color || "#111827");
      el.style.setProperty("--bg-inpainting", blk.bg_color || "#ffffff");
      applyCharSpacingAndLeadingStyles(blk, el);
      applyIllustratorBgLayerSlice(el, blk.origLeft, blk.origTop);

      const savedEdit = currentProEdits[blk.id];
      const activeRuns = (savedEdit && savedEdit.runs) ? savedEdit.runs : blk.runs;
      el._hasParagraphMixedCheck = Boolean(activeRuns && activeRuns.length > 1);

      if (savedEdit) {
        if (savedEdit.font_overridden) blk.font_overridden = true;
        if (savedEdit.user_moved) blk._wasMoved = true;
        if (savedEdit.align_changed) blk._alignChanged = true;
        if (savedEdit.line_height !== undefined) blk.line_height = savedEdit.line_height;
        if (savedEdit.tracking !== undefined) blk.tracking = savedEdit.tracking;
        if (savedEdit.kerning !== undefined) blk.kerning = savedEdit.kerning;
        if (savedEdit.h_scale !== undefined) blk.h_scale = savedEdit.h_scale;
        if (savedEdit.para_spacing !== undefined) blk.para_spacing = savedEdit.para_spacing;
        if (savedEdit.bbox && savedEdit.bbox.length === 4) {
          blk.origLeft = savedEdit.bbox[0] * currentProScale;
          blk.origTop = savedEdit.bbox[1] * currentProScale;
          blk.origWidth = Math.max(16, (savedEdit.bbox[2] - savedEdit.bbox[0]) * currentProScale);
          el.style.left = `${blk.origLeft}px`;
          el.style.top = `${blk.origTop}px`;
          el.style.width = `${blk.origWidth}px`;
          applyIllustratorBgLayerSlice(el, blk.origLeft, blk.origTop);
        }
        applyCharSpacingAndLeadingStyles(blk, el);

        renderRunsToElement(el, activeRuns, savedEdit.new_text, savedEdit.color || blk.color, blk);
        if (savedEdit.deleted) {
          el.classList.add("is-deleted");
        } else {
          el.classList.add("is-modified");
        }
        if (savedEdit.web_font) {
          blk.web_font = savedEdit.web_font;
          blk.font = savedEdit.font || blk.font;
          const savedCssFont = (blk.pdf_font_alias && !blk.font_overridden && !blk.web_font.includes(blk.pdf_font_alias))
            ? `'${blk.pdf_font_alias}', ${blk.web_font}`
            : blk.web_font;
          el.style.setProperty("font-family", savedCssFont, "important");
        }
        if (savedEdit.size) {
          blk.size = savedEdit.size;
          el.style.setProperty("font-size", `${blk.size * currentProScale}px`, "important");
        }
        if (savedEdit.is_bold != null) {
          blk.is_bold = savedEdit.is_bold;
          if (!el._hasParagraphMixedCheck) {
            el.style.setProperty("font-weight", blk.is_bold ? "bold" : "normal", "important");
          }
        }
        if (savedEdit.is_italic != null) {
          blk.is_italic = savedEdit.is_italic;
          if (!el._hasParagraphMixedCheck) {
            el.style.setProperty("font-style", blk.is_italic ? "italic" : "normal", "important");
          }
        }
        if (savedEdit.is_underline != null) {
          blk.is_underline = savedEdit.is_underline;
          if (!el._hasParagraphMixedCheck) {
            el.style.setProperty("text-decoration", blk.is_underline ? "underline" : "none", "important");
          }
        }
        if (savedEdit.align) {
          applyBlockAlignment(blk, el, savedEdit.align);
        } else {
          updateBlockGeometry(blk, el);
          ensureGhostPatchForBlock(blk, el);
        }
        if (savedEdit.color) {
          blk.color = savedEdit.color;
          el.style.setProperty("--text-color", savedEdit.color);
          el.style.setProperty("color", savedEdit.color, "important");
        }
      } else {
        renderRunsToElement(el, activeRuns, blk.text, blk.color, blk);
        applyCssAlignmentOnly(el, blk.align || "left");
      }

      el.addEventListener("focus", () => {
        selectActiveBlock(blk, el);
      });

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectActiveBlock(blk, el);
      });

      el.addEventListener("input", () => {
        updateBlockGeometry(blk, el);
        saveCurrentBlockEdit(blk, el);
      });

      el.addEventListener("blur", () => {
        saveCurrentBlockEdit(blk, el);
        pushUndoSnapshot();
      });

      proTextOverlays.appendChild(el);
    });
  }

  // Adobe BBoxBoundary Floating Chrome (Move + Resize without polluting contentEditable DOM!)
  function hideActiveBBoxFrame() {
    if (activeBBoxFrameEl) activeBBoxFrameEl.style.display = "none";
  }

  function positionActiveBBoxFrame(blk, el) {
    if (!proStage || !blk || !el || blk.isAddedText) {
      hideActiveBBoxFrame();
      return;
    }
    if (!activeBBoxFrameEl) {
      activeBBoxFrameEl = document.createElement("div");
      activeBBoxFrameEl.className = "adobe-active-box-frame";
      activeBBoxFrameEl.style.cssText = "position:absolute;pointer-events:none;z-index:64;box-sizing:border-box;";
      activeBBoxFrameEl.innerHTML = `
        <div class="text-bbox-move-tab" style="display:flex;pointer-events:auto;" title="Tarik untuk memindahkan blok teks">✥ Geser</div>
        <span class="bbox-resize-dot" data-dir="nw" style="display:block;pointer-events:auto;"></span>
        <span class="bbox-resize-dot" data-dir="ne" style="display:block;pointer-events:auto;"></span>
        <span class="bbox-resize-dot" data-dir="sw" style="display:block;pointer-events:auto;"></span>
        <span class="bbox-resize-dot" data-dir="se" style="display:block;pointer-events:auto;"></span>
        <span class="bbox-resize-dot" data-dir="e"  style="display:block;pointer-events:auto;"></span>
      `;
      proStage.appendChild(activeBBoxFrameEl);

      // Drag-move active text box
      const moveTab = activeBBoxFrameEl.querySelector(".text-bbox-move-tab");
      moveTab.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const curBlk = activeEditBlock, curEl = activeEditElement;
        if (!curBlk || !curEl) return;
        const startX = e.clientX, startY = e.clientY;
        const initL = curEl.offsetLeft, initT = curEl.offsetTop;
        function onMove(mv) {
          const nl = Math.max(0, initL + (mv.clientX - startX));
          const nt = Math.max(0, initT + (mv.clientY - startY));
          curBlk._wasMoved = true;
          curBlk.origLeft = nl;
          curBlk.origTop = nt;
          curBlk.origRight = nl + curEl.offsetWidth;
          curBlk.origCenterX = nl + curEl.offsetWidth / 2;
          curEl.style.left = `${nl}px`;
          curEl.style.top = `${nt}px`;
          applyIllustratorBgLayerSlice(curEl, nl, nt);
          curBlk.expandedBbox = [
            roundNum(nl / currentProScale),
            roundNum(nt / currentProScale),
            roundNum((nl + curEl.offsetWidth) / currentProScale),
            roundNum((nt + curEl.offsetHeight) / currentProScale)
          ];
          ensureGhostPatchForBlock(curBlk, curEl);
          positionActiveBBoxFrame(curBlk, curEl);
        }
        function onUp() {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          saveCurrentBlockEdit(curBlk, curEl);
          pushUndoSnapshot();
        }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });

      // Corner & Edge Resize handles (dynamically adjusts wrap width / scale like Adobe Acrobat)
      activeBBoxFrameEl.querySelectorAll(".bbox-resize-dot").forEach(dot => {
        dot.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const curBlk = activeEditBlock, curEl = activeEditElement;
          if (!curBlk || !curEl) return;
          const dir = dot.dataset.dir;
          const startX = e.clientX, startY = e.clientY;
          const initL = curEl.offsetLeft, initT = curEl.offsetTop;
          const initW = curEl.offsetWidth, initH = curEl.offsetHeight;
          function onMove(mv) {
            const dx = mv.clientX - startX;
            const dy = mv.clientY - startY;
            let nw = initW, nl = initL;
            if (dir.includes("e")) {
              nw = Math.max(24, initW + dx);
            } else if (dir.includes("w")) {
              nw = Math.max(24, initW - dx);
              nl = initL + (initW - nw);
              curBlk._wasMoved = true;
            }
            curBlk.origLeft = nl;
            curBlk.origWidth = nw;
            curBlk.origRight = nl + nw;
            curBlk.origCenterX = nl + nw / 2;
            curEl.style.left = `${nl}px`;
            curEl.style.width = `${nw}px`;
            if (Math.abs(nw - initW) > 6 && !curBlk.is_paragraph) {
              curBlk.is_paragraph = true;
              curEl.classList.add("is-paragraph-block");
            }
            if (dir === "se" || dir === "sw") {
              const nh = Math.max(12, initH + dy);
              curEl.style.minHeight = `${nh}px`;
            }
            curBlk.expandedBbox = [
              roundNum(nl / currentProScale),
              roundNum(initT / currentProScale),
              roundNum((nl + nw) / currentProScale),
              roundNum((initT + Math.max(initH, curEl.offsetHeight)) / currentProScale)
            ];
            ensureGhostPatchForBlock(curBlk, curEl);
            positionActiveBBoxFrame(curBlk, curEl);
          }
          function onUp() {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            saveCurrentBlockEdit(curBlk, curEl);
            pushUndoSnapshot();
          }
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        });
      });
    }
    activeBBoxFrameEl.style.display = "block";
    activeBBoxFrameEl.style.left = `${el.offsetLeft}px`;
    activeBBoxFrameEl.style.top = `${el.offsetTop}px`;
    activeBBoxFrameEl.style.width = `${el.offsetWidth}px`;
    activeBBoxFrameEl.style.height = `${el.offsetHeight}px`;
  }

  // Adobe bboxType=3 Selectable Image/Logo/QR/Stamp Layer
  function captureImageCropFromStage(origBboxPt) {
    if (!proPageImg || !proPageImg.naturalWidth || !currentPageSize.width) return null;
    try {
      const sxRatio = proPageImg.naturalWidth / currentPageSize.width;
      const syRatio = proPageImg.naturalHeight / currentPageSize.height;
      const sx = Math.max(0, Math.floor(origBboxPt[0] * sxRatio));
      const sy = Math.max(0, Math.floor(origBboxPt[1] * syRatio));
      const sw = Math.max(2, Math.ceil((origBboxPt[2] - origBboxPt[0]) * sxRatio));
      const sh = Math.max(2, Math.ceil((origBboxPt[3] - origBboxPt[1]) * syRatio));
      const c = document.createElement("canvas");
      c.width = sw;
      c.height = sh;
      const ctx = c.getContext("2d");
      ctx.drawImage(proPageImg, sx, sy, sw, sh, 0, 0, sw, sh);
      return c.toDataURL("image/png");
    } catch (e) {
      return null;
    }
  }

  function renderImageOverlays(imageBlocks) {
    if (!proImageOverlays) return;
    proImageOverlays.innerHTML = "";

    (imageBlocks || []).forEach(imgBlk => {
      const origB = imgBlk.bbox;
      const saved = currentProImageEdits[imgBlk.id];
      const curB = (saved && saved.bbox) ? saved.bbox : origB;
      const isDeleted = Boolean(saved && saved.deleted);

      // Mask original raster area whenever user moved/resized/replaced/deleted the image
      const movedOrChanged = saved && (
        isDeleted ||
        saved.data_uri ||
        Math.abs(curB[0] - origB[0]) > 1 ||
        Math.abs(curB[1] - origB[1]) > 1 ||
        Math.abs(curB[2] - origB[2]) > 1 ||
        Math.abs(curB[3] - origB[3]) > 1
      );
      if (movedOrChanged) {
        const cover = document.createElement("div");
        cover.style.cssText = `position:absolute;left:${origB[0] * currentProScale - 1}px;top:${origB[1] * currentProScale - 1}px;width:${(origB[2] - origB[0]) * currentProScale + 2}px;height:${(origB[3] - origB[1]) * currentProScale + 2}px;background:#ffffff;pointer-events:none;z-index:1;`;
        proImageOverlays.appendChild(cover);
      }

      const box = document.createElement("div");
      box.className = "pdf-image-block" +
        (selectedImageBlockId === imgBlk.id ? " is-selected" : "") +
        (movedOrChanged && !isDeleted ? " is-modified" : "") +
        (isDeleted ? " is-deleted" : "");
      box.id = imgBlk.id;
      box.dataset.bboxType = "3";
      box.style.left = `${curB[0] * currentProScale}px`;
      box.style.top = `${curB[1] * currentProScale}px`;
      box.style.width = `${Math.max(16, (curB[2] - curB[0]) * currentProScale)}px`;
      box.style.height = `${Math.max(16, (curB[3] - curB[1]) * currentProScale)}px`;
      box.style.zIndex = selectedImageBlockId === imgBlk.id ? "45" : "5";

      if (movedOrChanged && !isDeleted) {
        const previewSrc = (saved && saved.data_uri) || captureImageCropFromStage(origB);
        if (previewSrc) {
          const im = document.createElement("img");
          im.className = "pdf-img-preview";
          im.src = previewSrc;
          box.appendChild(im);
        }
      }

      const bar = document.createElement("div");
      bar.className = "pdf-img-mini-bar";
      bar.innerHTML = `<button type="button" class="pdf-img-action-btn img-replace-btn">🖼 Ganti</button><button type="button" class="pdf-img-action-btn danger img-del-btn">🗑 Hapus</button>`;
      box.appendChild(bar);

      ["nw", "ne", "sw", "se"].forEach(dir => {
        const dot = document.createElement("span");
        dot.className = "bbox-resize-dot";
        dot.dataset.dir = dir;
        dot.addEventListener("mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const startX = e.clientX, startY = e.clientY;
          const iL = box.offsetLeft, iT = box.offsetTop, iW = box.offsetWidth, iH = box.offsetHeight;
          const aspect = iW / Math.max(1, iH);
          function onMove(mv) {
            const dx = mv.clientX - startX;
            const dy = mv.clientY - startY;
            let nw = iW, nh = iH, nl = iL, nt = iT;
            if (dir.includes("e")) nw = Math.max(18, iW + dx);
            else { nw = Math.max(18, iW - dx); nl = iL + (iW - nw); }
            if (dir.includes("s")) nh = mv.shiftKey ? Math.max(18, iH + dy) : Math.max(18, nw / aspect);
            else { nh = mv.shiftKey ? Math.max(18, iH - dy) : Math.max(18, nw / aspect); nt = iT + (iH - nh); }
            box.style.left = `${nl}px`; box.style.top = `${nt}px`;
            box.style.width = `${nw}px`; box.style.height = `${nh}px`;
          }
          function onUp() {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            const prev = currentProImageEdits[imgBlk.id] || { id: imgBlk.id, orig_bbox: origB };
            currentProImageEdits[imgBlk.id] = {
              ...prev,
              orig_bbox: origB,
              bbox: [
                roundNum(box.offsetLeft / currentProScale),
                roundNum(box.offsetTop / currentProScale),
                roundNum((box.offsetLeft + box.offsetWidth) / currentProScale),
                roundNum((box.offsetTop + box.offsetHeight) / currentProScale)
              ],
              data_uri: prev.data_uri || captureImageCropFromStage(origB),
              deleted: false
            };
            renderImageOverlays(currentPageImageBlocks);
            pushUndoSnapshot();
          }
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        });
        box.appendChild(dot);
      });

      bar.querySelector(".img-replace-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = "image/png,image/jpeg,image/webp";
        picker.onchange = () => {
          const f = picker.files && picker.files[0];
          if (!f) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            currentProImageEdits[imgBlk.id] = {
              id: imgBlk.id,
              orig_bbox: origB,
              bbox: curB,
              data_uri: ev.target.result,
              deleted: false
            };
            renderImageOverlays(currentPageImageBlocks);
            pushUndoSnapshot();
          };
          reader.readAsDataURL(f);
        };
        picker.click();
      });

      bar.querySelector(".img-del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        currentProImageEdits[imgBlk.id] = {
          id: imgBlk.id,
          orig_bbox: origB,
          bbox: curB,
          deleted: true
        };
        selectedImageBlockId = null;
        renderImageOverlays(currentPageImageBlocks);
        pushUndoSnapshot();
      });

      box.addEventListener("mousedown", (e) => {
        if (e.target.closest(".bbox-resize-dot") || e.target.closest(".pdf-img-mini-bar")) return;
        e.stopPropagation();
        if (selectedImageBlockId !== imgBlk.id) {
          selectedImageBlockId = imgBlk.id;
          activeEditBlock = null;
          activeEditElement = null;
          hideActiveBBoxFrame();
          renderImageOverlays(currentPageImageBlocks);
          if (proDetectLabel) proDetectLabel.textContent = "Objek Gambar / Stempel / QR (Tarik untuk pindah atau ubah ukuran)";
          return;
        }
        const startX = e.clientX, startY = e.clientY;
        const iL = box.offsetLeft, iT = box.offsetTop;
        let moved = false;
        function onMove(mv) {
          const dx = mv.clientX - startX, dy = mv.clientY - startY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
          box.style.left = `${Math.max(0, iL + dx)}px`;
          box.style.top = `${Math.max(0, iT + dy)}px`;
        }
        function onUp() {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
          if (!moved) return;
          const prev = currentProImageEdits[imgBlk.id] || { id: imgBlk.id, orig_bbox: origB };
          currentProImageEdits[imgBlk.id] = {
            ...prev,
            orig_bbox: origB,
            bbox: [
              roundNum(box.offsetLeft / currentProScale),
              roundNum(box.offsetTop / currentProScale),
              roundNum((box.offsetLeft + box.offsetWidth) / currentProScale),
              roundNum((box.offsetTop + box.offsetHeight) / currentProScale)
            ],
            data_uri: prev.data_uri || captureImageCropFromStage(origB),
            deleted: false
          };
          renderImageOverlays(currentPageImageBlocks);
          pushUndoSnapshot();
        }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      });

      proImageOverlays.appendChild(box);
    });
  }

  // Stage click: Deselect active block only on deliberate background click (not after drag-selecting text)
  if (proStage) {
    let stageMouseDownX = 0, stageMouseDownY = 0;
    proStage.addEventListener("mousedown", (e) => {
      stageMouseDownX = e.clientX;
      stageMouseDownY = e.clientY;
    });
    proStage.addEventListener("click", (e) => {
      if (currentEditorMode !== "select") return;
      const movedDist = Math.hypot(e.clientX - stageMouseDownX, e.clientY - stageMouseDownY);
      if (movedDist > 4) return; // Keep active block selected if user just finished dragging/selecting text!

      if (!e.target.closest(".text-overlay-block") && !e.target.closest(".adobe-active-box-frame") && !e.target.closest(".pdf-image-block") && !e.target.closest(".added-text-block") && !e.target.closest(".added-image-item") && !e.target.closest(".added-symbol-item") && !e.target.closest(".highlight-overlay-box")) {
        if (activeEditElement && !activeEditElement.classList.contains("is-modified") && !activeEditElement.classList.contains("is-deleted")) {
          activeEditElement.classList.remove("is-editing");
        }
        hideActiveBBoxFrame();
        if (selectedImageBlockId) {
          selectedImageBlockId = null;
          renderImageOverlays(currentPageImageBlocks);
        }
        document.querySelectorAll(".added-text-block.is-selected, .added-text-block.is-typing").forEach(b => {
          b.classList.remove("is-selected", "is-typing");
          const ed = b.querySelector(".added-text-editable");
          if (ed) ed.contentEditable = "false";
        });
        if (selectedDrawingId && !e.target.closest("polyline")) {
          selectedDrawingId = null;
          if (typeof renderDrawings === "function") renderDrawings();
        }
        activeEditBlock = null;
        activeEditElement = null;
        if (proDetectLabel) proDetectLabel.textContent = "Auto-Detect Font: Klik teks untuk mengedit";
        if (proToolBold) proToolBold.classList.remove("active");
        if (proToolItalic) proToolItalic.classList.remove("active");
        if (proToolUnderline) proToolUnderline.classList.remove("active");
      }
    });
  }

  // Page Navigation with Multi-Page Edit Preservation
  if (proBtnPrevPage) {
    proBtnPrevPage.addEventListener("click", () => {
      if (currentProPageIdx > 0) {
        saveCurrentPageToPagesState();
        loadProPage(currentProPageIdx - 1);
      }
    });
  }
  if (proBtnNextPage) {
    proBtnNextPage.addEventListener("click", () => {
      if (currentProPageIdx < currentProTotalPages - 1) {
        saveCurrentPageToPagesState();
        loadProPage(currentProPageIdx + 1);
      }
    });
  }

  function selectAddedTextBlock(item, wrapperBox, editableEl) {
    document.querySelectorAll(".text-overlay-block.is-editing").forEach(b => b.classList.remove("is-editing"));
    document.querySelectorAll(".added-text-block.is-selected").forEach(b => b.classList.remove("is-selected"));
    wrapperBox.classList.add("is-selected");
    item.size = item.font_size || 13;
    selectActiveBlock(item, editableEl);
  }

  // Left Dock & Contextual Property Controls
  const dockToolSelect = document.getElementById("dock-tool-select");
  const dockToolHighlight = document.getElementById("dock-tool-highlight");
  const dockToolDraw = document.getElementById("dock-tool-draw");
  const dockToolSign = document.getElementById("dock-tool-sign");
  const dockToolSymbol = document.getElementById("dock-tool-symbol");
  const dockToolImage = document.getElementById("dock-tool-image");

  if (dockToolSelect) dockToolSelect.addEventListener("click", () => setEditorToolMode("select"));
  if (proBtnAddText) {
    proBtnAddText.addEventListener("click", () => {
      setEditorToolMode(currentEditorMode === "addtext" ? "select" : "addtext");
    });
  }
  if (dockToolHighlight) {
    dockToolHighlight.addEventListener("click", () => {
      setEditorToolMode(currentEditorMode === "highlight" ? "select" : "highlight");
    });
  }
  if (dockToolDraw) {
    dockToolDraw.addEventListener("click", () => {
      setEditorToolMode(currentEditorMode === "draw" ? "select" : "draw");
    });
  }
  if (dockToolSymbol) {
    dockToolSymbol.addEventListener("click", () => {
      setEditorToolMode(currentEditorMode === "symbol" ? "select" : "symbol");
    });
  }
  if (dockToolImage && proImageUploadInput) {
    dockToolImage.addEventListener("click", () => {
      setEditorToolMode("select");
      proImageUploadInput.click();
    });
  }

  // Highlight Swatches
  document.querySelectorAll("[data-hl-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeHighlightColor = btn.dataset.hlColor || "#fde047";
      document.querySelectorAll("[data-hl-color]").forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  // Draw Pen Swatches & Thickness
  document.querySelectorAll("[data-draw-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeDrawColor = btn.dataset.drawColor || "#dc2626";
      document.querySelectorAll("[data-draw-color]").forEach(b => b.classList.toggle("active", b === btn));
    });
  });
  document.querySelectorAll("[data-draw-width]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeDrawWidth = parseFloat(btn.dataset.drawWidth) || 2.5;
      document.querySelectorAll("[data-draw-width]").forEach(b => b.classList.toggle("active", b === btn));
    });
  });

  // Symbol Choices & Color
  document.querySelectorAll("[data-symbol-char]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeSymbolChar = btn.dataset.symbolChar || "✓";
      document.querySelectorAll("[data-symbol-char]").forEach(b => b.classList.toggle("active", b === btn));
      if (proDetectLabel && currentEditorMode === "symbol") {
        proDetectLabel.textContent = `Mode Simbol (${activeSymbolChar}): Klik pada halaman untuk menempel`;
      }
    });
  });
  if (proSymbolColor) {
    proSymbolColor.addEventListener("input", () => {
      activeSymbolColor = proSymbolColor.value || "#16a34a";
    });
  }

  // Add Image from PC
  if (proImageUploadInput) {
    proImageUploadInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (evt) => {
          const probe = new Image();
          probe.onload = () => {
            const natRatio = probe.naturalWidth / Math.max(1, probe.naturalHeight);
            const initW = Math.min(180, Math.max(90, Math.round(140 * Math.min(1.5, natRatio))));
            const initH = Math.max(40, Math.round(initW / Math.max(0.25, natRatio)));
            const item = {
              id: "user_img_" + Date.now(),
              data_uri: evt.target.result,
              x: 80,
              y: 80,
              w: initW,
              h: initH
            };
            currentAddedImages.push(item);
            renderAddedItems();
            pushUndoSnapshot();
          };
          probe.src = evt.target.result;
        };
        reader.readAsDataURL(file);
        e.target.value = "";
      }
    });
  }

  // E-Signature Modal Engine (Draw / Type / Upload)
  let activeSigTab = "draw";
  let activeSigColor = "#0f172a";
  let activeTypedSigFont = "'Segoe Script', 'Brush Script MT', cursive";
  let sigHasDrawnStroke = false;
  let uploadedSigDataUri = "";
  let uploadedSigDims = { w: 140, h: 60 };

  function trimCanvasToPng(srcCanvas) {
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const sCtx = srcCanvas.getContext("2d");
    const imgData = sCtx.getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (imgData[(y * w + x) * 4 + 3] > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    const pad = 10;
    const cx = Math.max(0, minX - pad);
    const cy = Math.max(0, minY - pad);
    const cw = Math.min(w - cx, (maxX - minX + 1) + pad * 2);
    const ch = Math.min(h - cy, (maxY - minY + 1) + pad * 2);
    const trimCanvas = document.createElement("canvas");
    trimCanvas.width = cw;
    trimCanvas.height = ch;
    const tCtx = trimCanvas.getContext("2d");
    tCtx.drawImage(srcCanvas, cx, cy, cw, ch, 0, 0, cw, ch);
    return {
      dataUri: trimCanvas.toDataURL("image/png"),
      width: cw,
      height: ch
    };
  }

  function switchSigTab(tab) {
    activeSigTab = tab;
    if (sigTabBtnDraw) sigTabBtnDraw.classList.toggle("active", tab === "draw");
    if (sigTabBtnType) sigTabBtnType.classList.toggle("active", tab === "type");
    if (sigTabBtnUpload) sigTabBtnUpload.classList.toggle("active", tab === "upload");
    if (sigPaneDraw) sigPaneDraw.style.display = tab === "draw" ? "block" : "none";
    if (sigPaneType) sigPaneType.style.display = tab === "type" ? "block" : "none";
    if (sigPaneUpload) sigPaneUpload.style.display = tab === "upload" ? "block" : "none";
  }

  function clearSigPad() {
    if (!sigPadCanvas) return;
    const ctx = sigPadCanvas.getContext("2d");
    ctx.clearRect(0, 0, sigPadCanvas.width, sigPadCanvas.height);
    sigHasDrawnStroke = false;
  }

  function openSignatureModal() {
    if (!proSigModal) return;
    setEditorToolMode("select");
    switchSigTab("draw");
    clearSigPad();
    if (sigTypeInput) sigTypeInput.value = "";
    if (sigTypePreview) sigTypePreview.textContent = "Tanda Tangan Anda";
    if (sigUploadStatus) sigUploadStatus.textContent = "";
    uploadedSigDataUri = "";
    proSigModal.style.display = "flex";
  }

  function closeSignatureModal() {
    if (proSigModal) proSigModal.style.display = "none";
  }

  if (dockToolSign) dockToolSign.addEventListener("click", openSignatureModal);
  if (sigModalClose) sigModalClose.addEventListener("click", closeSignatureModal);
  if (sigBtnCancel) sigBtnCancel.addEventListener("click", closeSignatureModal);
  if (sigTabBtnDraw) sigTabBtnDraw.addEventListener("click", () => switchSigTab("draw"));
  if (sigTabBtnType) sigTabBtnType.addEventListener("click", () => switchSigTab("type"));
  if (sigTabBtnUpload) sigTabBtnUpload.addEventListener("click", () => switchSigTab("upload"));
  if (sigBtnClear) sigBtnClear.addEventListener("click", clearSigPad);

  document.querySelectorAll("[data-sig-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      activeSigColor = btn.dataset.sigColor || "#0f172a";
      document.querySelectorAll("[data-sig-color]").forEach(b => b.classList.toggle("active", b === btn));
      if (sigTypePreview) sigTypePreview.style.color = activeSigColor;
    });
  });

  if (sigPadCanvas) {
    const sCtx = sigPadCanvas.getContext("2d");
    let isDrawingSig = false;
    let lastPt = null;

    function getCanvasPt(clientX, clientY) {
      const rect = sigPadCanvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (sigPadCanvas.width / Math.max(1, rect.width)),
        y: (clientY - rect.top) * (sigPadCanvas.height / Math.max(1, rect.height))
      };
    }

    function startSigStroke(clientX, clientY) {
      isDrawingSig = true;
      lastPt = getCanvasPt(clientX, clientY);
      sCtx.strokeStyle = activeSigColor;
      sCtx.fillStyle = activeSigColor;
      sCtx.lineWidth = 3.2;
      sCtx.lineCap = "round";
      sCtx.lineJoin = "round";
      sCtx.beginPath();
      sCtx.arc(lastPt.x, lastPt.y, 1.5, 0, Math.PI * 2);
      sCtx.fill();
      sigHasDrawnStroke = true;
    }

    function moveSigStroke(clientX, clientY) {
      if (!isDrawingSig || !lastPt) return;
      const pt = getCanvasPt(clientX, clientY);
      sCtx.beginPath();
      sCtx.moveTo(lastPt.x, lastPt.y);
      sCtx.lineTo(pt.x, pt.y);
      sCtx.stroke();
      lastPt = pt;
      sigHasDrawnStroke = true;
    }

    function endSigStroke() {
      isDrawingSig = false;
      lastPt = null;
    }

    sigPadCanvas.addEventListener("mousedown", (e) => { e.preventDefault(); startSigStroke(e.clientX, e.clientY); });
    document.addEventListener("mousemove", (e) => { if (isDrawingSig) moveSigStroke(e.clientX, e.clientY); });
    document.addEventListener("mouseup", endSigStroke);
    sigPadCanvas.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches.length > 0) {
        e.preventDefault();
        startSigStroke(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });
    sigPadCanvas.addEventListener("touchmove", (e) => {
      if (isDrawingSig && e.touches && e.touches.length > 0) {
        e.preventDefault();
        moveSigStroke(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });
    sigPadCanvas.addEventListener("touchend", endSigStroke);
  }

  document.querySelectorAll(".sig-style-option").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTypedSigFont = btn.dataset.sigFont || "'Segoe Script', cursive";
      document.querySelectorAll(".sig-style-option").forEach(b => b.classList.toggle("active", b === btn));
      if (sigTypePreview) sigTypePreview.style.fontFamily = activeTypedSigFont;
    });
  });

  if (sigTypeInput && sigTypePreview) {
    sigTypeInput.addEventListener("input", () => {
      const val = sigTypeInput.value.trim();
      sigTypePreview.textContent = val || "Tanda Tangan Anda";
      sigTypePreview.style.fontFamily = activeTypedSigFont;
      sigTypePreview.style.color = activeSigColor;
    });
  }

  if (sigUploadInput) {
    sigUploadInput.addEventListener("change", (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const f = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (evt) => {
        const probe = new Image();
        probe.onload = () => {
          const ratio = probe.naturalWidth / Math.max(1, probe.naturalHeight);
          const w = 150;
          const h = Math.max(30, Math.round(w / Math.max(0.25, ratio)));
          uploadedSigDataUri = evt.target.result;
          uploadedSigDims = { w, h };
          if (sigUploadStatus) sigUploadStatus.textContent = `Siap dipasang: ${f.name} (${probe.naturalWidth}x${probe.naturalHeight}px)`;
        };
        probe.src = evt.target.result;
      };
      reader.readAsDataURL(f);
    });
  }

  if (sigBtnInsert) {
    sigBtnInsert.addEventListener("click", () => {
      let resultPng = null;
      let targetW = 140;
      let targetH = 60;

      if (activeSigTab === "draw") {
        if (!sigHasDrawnStroke || !sigPadCanvas) {
          alert("Silakan gambar tanda tangan di kanvas terlebih dahulu.");
          return;
        }
        const trimmed = trimCanvasToPng(sigPadCanvas);
        if (!trimmed) {
          alert("Silakan gambar tanda tangan di kanvas terlebih dahulu.");
          return;
        }
        resultPng = trimmed.dataUri;
        const ratio = trimmed.width / Math.max(1, trimmed.height);
        targetW = Math.min(180, Math.max(90, Math.round(trimmed.width * 0.45)));
        targetH = Math.max(24, Math.round(targetW / Math.max(0.2, ratio)));
      } else if (activeSigTab === "type") {
        const typedText = sigTypeInput ? sigTypeInput.value.trim() : "";
        if (!typedText) {
          alert("Ketik nama tanda tangan Anda terlebih dahulu.");
          return;
        }
        const tmp = document.createElement("canvas");
        tmp.width = 760;
        tmp.height = 200;
        const tCtx = tmp.getContext("2d");
        tCtx.fillStyle = activeSigColor || "#0f172a";
        tCtx.font = `italic 64px ${activeTypedSigFont}`;
        tCtx.textBaseline = "middle";
        tCtx.textAlign = "center";
        tCtx.fillText(typedText, tmp.width / 2, tmp.height / 2);
        const trimmed = trimCanvasToPng(tmp);
        if (!trimmed) return;
        resultPng = trimmed.dataUri;
        const ratio = trimmed.width / Math.max(1, trimmed.height);
        targetW = Math.min(200, Math.max(100, Math.round(trimmed.width * 0.42)));
        targetH = Math.max(24, Math.round(targetW / Math.max(0.2, ratio)));
      } else {
        if (!uploadedSigDataUri) {
          alert("Pilih file gambar tanda tangan terlebih dahulu.");
          return;
        }
        resultPng = uploadedSigDataUri;
        targetW = uploadedSigDims.w;
        targetH = uploadedSigDims.h;
      }

      const defaultX = Math.max(40, Math.round((currentPageSize.width - targetW) * 0.65));
      const defaultY = Math.max(60, Math.round(currentPageSize.height * 0.72));
      currentAddedImages.push({
        id: "user_sig_" + Date.now(),
        data_uri: resultPng,
        x: defaultX,
        y: defaultY,
        w: targetW,
        h: targetH,
        isSignature: true
      });
      closeSignatureModal();
      renderAddedItems();
      pushUndoSnapshot();
    });
  }

  // Generic Corner Resize Helper
  function makeResizable(containerEl, handleEl, options) {
    if (!containerEl || !handleEl) return;
    function startResize(clientX, clientY, preventFn) {
      if (preventFn) preventFn();
      const startX = clientX;
      const startY = clientY;
      const origW = containerEl.offsetWidth;
      const origH = containerEl.offsetHeight;
      const lockAspect = Boolean(options && options.lockAspect);
      const ratio = origW / Math.max(1, origH);
      const minW = (options && options.minW) || 20;
      const minH = (options && options.minH) || 18;
      let resized = false;

      function doMove(mx, my, pFn) {
        if (pFn) pFn();
        resized = true;
        const stageW = proStage ? proStage.offsetWidth : 2000;
        const stageH = proStage ? proStage.offsetHeight : 3000;
        const maxW = Math.max(minW, stageW - containerEl.offsetLeft);
        const maxH = Math.max(minH, stageH - containerEl.offsetTop);

        let newW = Math.max(minW, Math.min(maxW, origW + (mx - startX)));
        let newH = lockAspect
          ? Math.max(minH, Math.min(maxH, Math.round(newW / Math.max(0.15, ratio))))
          : Math.max(minH, Math.min(maxH, origH + (my - startY)));
        if (lockAspect && newH >= maxH) {
          newW = Math.max(minW, Math.round(newH * ratio));
        }
        if (options && options.onResize) {
          options.onResize(newW, newH);
        }
      }

      function onMM(ev) { doMove(ev.clientX, ev.clientY, () => ev.preventDefault()); }
      function onTM(ev) { if (ev.touches && ev.touches[0]) doMove(ev.touches[0].clientX, ev.touches[0].clientY, () => ev.preventDefault()); }
      function onUp() {
        document.removeEventListener("mousemove", onMM);
        document.removeEventListener("mouseup", onUp);
        document.removeEventListener("touchmove", onTM);
        document.removeEventListener("touchend", onUp);
        if (resized && options && options.onEnd) options.onEnd();
      }
      document.addEventListener("mousemove", onMM);
      document.addEventListener("mouseup", onUp);
      document.addEventListener("touchmove", onTM, { passive: false });
      document.addEventListener("touchend", onUp);
    }

    handleEl.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      startResize(e.clientX, e.clientY, () => e.preventDefault());
    });
    handleEl.addEventListener("touchstart", (e) => {
      e.stopPropagation();
      if (e.touches && e.touches[0]) startResize(e.touches[0].clientX, e.touches[0].clientY, null);
    }, { passive: true });
  }

  function renderHighlights() {
    if (!proHighlightOverlays) return;
    proHighlightOverlays.innerHTML = "";

    currentHighlights.forEach((hl, idx) => {
      const hlBox = document.createElement("div");
      hlBox.className = "highlight-overlay-box";
      hlBox.style.left = `${hl.x * currentProScale}px`;
      hlBox.style.top = `${hl.y * currentProScale}px`;
      hlBox.style.width = `${Math.max(8, hl.w * currentProScale)}px`;
      hlBox.style.height = `${Math.max(8, hl.h * currentProScale)}px`;
      hlBox.style.backgroundColor = hl.color || "#fde047";

      const del = document.createElement("div");
      del.className = "added-item-del-btn";
      del.innerHTML = "&times;";
      del.title = "Hapus stabilo";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        currentHighlights.splice(idx, 1);
        renderHighlights();
        pushUndoSnapshot();
      });
      hlBox.appendChild(del);

      const res = document.createElement("div");
      res.className = "resize-handle-se";
      hlBox.appendChild(res);

      makeResizable(hlBox, res, {
        minW: 12,
        minH: 8,
        onResize: (nw, nh) => {
          hlBox.style.width = `${nw}px`;
          hlBox.style.height = `${nh}px`;
          hl.w = roundNum(nw / currentProScale);
          hl.h = roundNum(nh / currentProScale);
        },
        onEnd: () => pushUndoSnapshot()
      });

      makeDraggable(hlBox, (newLeft, newTop) => {
        hl.x = roundNum(newLeft / currentProScale);
        hl.y = roundNum(newTop / currentProScale);
      });

      proHighlightOverlays.appendChild(hlBox);
    });
  }

  function renderDrawings() {
    if (!proDrawSvg) return;
    proDrawSvg.innerHTML = "";
    proDrawSvg.setAttribute("viewBox", `0 0 ${currentPageSize.width} ${currentPageSize.height}`);
    proDrawSvg.setAttribute("preserveAspectRatio", "none");

    currentDrawings.forEach((dr) => {
      if (!dr.points || dr.points.length < 2) return;
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      poly.setAttribute("points", dr.points.map(p => `${p[0]},${p[1]}`).join(" "));
      poly.setAttribute("fill", "none");
      poly.setAttribute("stroke", dr.color || "#dc2626");
      poly.setAttribute("stroke-width", String(dr.width || 2.5));
      poly.setAttribute("stroke-linecap", "round");
      poly.setAttribute("stroke-linejoin", "round");
      poly.style.pointerEvents = currentEditorMode === "select" ? "stroke" : "none";
      poly.style.cursor = "pointer";
      if (selectedDrawingId === dr.id) {
        poly.setAttribute("stroke-dasharray", "4 3");
      }
      poly.addEventListener("click", (e) => {
        if (currentEditorMode !== "select") return;
        e.stopPropagation();
        selectedDrawingId = (selectedDrawingId === dr.id) ? null : dr.id;
        renderDrawings();
        renderAddedItems();
      });
      proDrawSvg.appendChild(poly);
    });
  }

  // Interactive Stage Capture Controller for Add-Text, Highlight, Freehand Draw, & Symbols
  if (proStage) {
    function getStageCoords(clientX, clientY) {
      const rect = proStage.getBoundingClientRect();
      const pxX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const pxY = Math.max(0, Math.min(rect.height, clientY - rect.top));
      return {
        pxX, pxY,
        pdfX: roundNum(pxX / currentProScale),
        pdfY: roundNum(pxY / currentProScale)
      };
    }

    function handleStageToolStart(clientX, clientY, target, preventFn) {
      if (currentEditorMode === "select") return;
      if (target.closest(".added-item-del-btn")) return;
      if (preventFn) preventFn();

      const startPt = getStageCoords(clientX, clientY);

      if (currentEditorMode === "addtext") {
        const item = {
          id: "user_txt_" + Date.now(),
          text: "Ketik teks baru di sini...",
          x: Math.max(10, Math.round(startPt.pdfX - 4)),
          y: Math.max(10, Math.round(startPt.pdfY - 10)),
          w: 190,
          h: 30,
          font: "Arial",
          web_font: "Arial, Helvetica, sans-serif",
          font_code: "hebo",
          font_size: 13,
          size: 13,
          is_bold: true,
          is_italic: false,
          is_underline: false,
          align: "left",
          color: "#0f172a",
          isAddedText: true
        };
        currentAddedTexts.push(item);
        setEditorToolMode("select");
        renderAddedItems(item.id);
        pushUndoSnapshot();
        return;
      }

      if (currentEditorMode === "symbol") {
        const symSize = 22;
        currentAddedSymbols.push({
          id: "sym_" + Date.now(),
          char: activeSymbolChar,
          x: Math.max(4, Math.round(startPt.pdfX - symSize * 0.55)),
          y: Math.max(4, Math.round(startPt.pdfY - symSize * 0.55)),
          size: symSize,
          color: activeSymbolColor
        });
        renderAddedItems();
        pushUndoSnapshot();
        return;
      }

      if (currentEditorMode === "highlight" && proHighlightOverlays) {
        const preview = document.createElement("div");
        preview.className = "highlight-overlay-box";
        preview.style.left = `${startPt.pxX}px`;
        preview.style.top = `${startPt.pxY}px`;
        preview.style.width = "2px";
        preview.style.height = "2px";
        preview.style.backgroundColor = activeHighlightColor;
        preview.style.outline = "1px dashed #2563eb";
        proHighlightOverlays.appendChild(preview);

        let endPt = startPt;
        function onMoveH(mx, my) {
          endPt = getStageCoords(mx, my);
          const lx = Math.min(startPt.pxX, endPt.pxX);
          const ly = Math.min(startPt.pxY, endPt.pxY);
          const lw = Math.abs(endPt.pxX - startPt.pxX);
          const lh = Math.abs(endPt.pxY - startPt.pxY);
          preview.style.left = `${lx}px`;
          preview.style.top = `${ly}px`;
          preview.style.width = `${lw}px`;
          preview.style.height = `${lh}px`;
        }
        const mmH = (ev) => { ev.preventDefault(); onMoveH(ev.clientX, ev.clientY); };
        const tmH = (ev) => { if (ev.touches && ev.touches[0]) { ev.preventDefault(); onMoveH(ev.touches[0].clientX, ev.touches[0].clientY); } };
        const endH = () => {
          document.removeEventListener("mousemove", mmH);
          document.removeEventListener("mouseup", endH);
          document.removeEventListener("touchmove", tmH);
          document.removeEventListener("touchend", endH);
          preview.remove();
          const hx = roundNum(Math.min(startPt.pdfX, endPt.pdfX));
          const hy = roundNum(Math.min(startPt.pdfY, endPt.pdfY));
          const hw = roundNum(Math.abs(endPt.pdfX - startPt.pdfX));
          const hh = roundNum(Math.abs(endPt.pdfY - startPt.pdfY));
          if (hw > 6 && hh > 4) {
            currentHighlights.push({
              id: "hl_" + Date.now(),
              x: hx, y: hy, w: hw, h: hh,
              color: activeHighlightColor
            });
            renderHighlights();
            pushUndoSnapshot();
          }
        };
        document.addEventListener("mousemove", mmH);
        document.addEventListener("mouseup", endH);
        document.addEventListener("touchmove", tmH, { passive: false });
        document.addEventListener("touchend", endH);
        return;
      }

      if (currentEditorMode === "draw" && proDrawSvg) {
        proDrawSvg.setAttribute("viewBox", `0 0 ${currentPageSize.width} ${currentPageSize.height}`);
        proDrawSvg.setAttribute("preserveAspectRatio", "none");
        const points = [[startPt.pdfX, startPt.pdfY]];
        const livePoly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        livePoly.setAttribute("points", `${startPt.pdfX},${startPt.pdfY}`);
        livePoly.setAttribute("fill", "none");
        livePoly.setAttribute("stroke", activeDrawColor);
        livePoly.setAttribute("stroke-width", String(activeDrawWidth));
        livePoly.setAttribute("stroke-linecap", "round");
        livePoly.setAttribute("stroke-linejoin", "round");
        proDrawSvg.appendChild(livePoly);

        function onMoveD(mx, my) {
          const cur = getStageCoords(mx, my);
          const prev = points[points.length - 1];
          if (Math.hypot(cur.pdfX - prev[0], cur.pdfY - prev[1]) >= 1.2) {
            points.push([cur.pdfX, cur.pdfY]);
            livePoly.setAttribute("points", points.map(p => `${p[0]},${p[1]}`).join(" "));
          }
        }
        const mmD = (ev) => { ev.preventDefault(); onMoveD(ev.clientX, ev.clientY); };
        const tmD = (ev) => { if (ev.touches && ev.touches[0]) { ev.preventDefault(); onMoveD(ev.touches[0].clientX, ev.touches[0].clientY); } };
        const endD = () => {
          document.removeEventListener("mousemove", mmD);
          document.removeEventListener("mouseup", endD);
          document.removeEventListener("touchmove", tmD);
          document.removeEventListener("touchend", endD);
          if (points.length >= 2) {
            currentDrawings.push({
              id: "draw_" + Date.now(),
              points,
              color: activeDrawColor,
              width: activeDrawWidth
            });
            renderDrawings();
            pushUndoSnapshot();
          } else {
            livePoly.remove();
          }
        };
        document.addEventListener("mousemove", mmD);
        document.addEventListener("mouseup", endD);
        document.addEventListener("touchmove", tmD, { passive: false });
        document.addEventListener("touchend", endD);
      }
    }

    proStage.addEventListener("mousedown", (e) => {
      handleStageToolStart(e.clientX, e.clientY, e.target, () => e.preventDefault());
    }, true);
    proStage.addEventListener("touchstart", (e) => {
      if (currentEditorMode !== "select" && e.touches && e.touches[0]) {
        handleStageToolStart(e.touches[0].clientX, e.touches[0].clientY, e.target, () => e.preventDefault());
      }
    }, { capture: true, passive: false });
  }

  const ADDED_TEXT_HANDLE_W = 22;

  function renderAddedItems(focusItemId = null) {
    proAddedOverlays.innerHTML = "";

    // Added Texts
    currentAddedTexts.forEach((item, idx) => {
      item.isAddedText = true;
      item.size = item.font_size || item.size || 13;

      const box = document.createElement("div");
      box.className = "added-text-block";
      // Position box left shifted by handle width so editable text aligns with item.x
      const boxLeft = Math.max(0, (item.x * currentProScale) - ADDED_TEXT_HANDLE_W);
      box.style.left = `${boxLeft}px`;
      box.style.top = `${item.y * currentProScale}px`;

      // Built-in Drag Handle Strip positioned inside left edge (never clipped)
      const handle = document.createElement("div");
      handle.className = "added-text-drag-handle";
      handle.title = "Tarik untuk memindahkan posisi teks";
      handle.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><circle cx="9" cy="5" r="1.8"/><circle cx="9" cy="12" r="1.8"/><circle cx="9" cy="19" r="1.8"/><circle cx="15" cy="5" r="1.8"/><circle cx="15" cy="12" r="1.8"/><circle cx="15" cy="19" r="1.8"/></svg>`;
      box.appendChild(handle);

      // Editable text area starts with contentEditable="false" so drag moves smoothly without browser focus steal!
      const editable = document.createElement("div");
      editable.className = "added-text-editable";
      editable.contentEditable = "false";
      editable.spellcheck = false;
      editable.textContent = item.text;
      editable.style.fontFamily = item.web_font || "Arial, Helvetica, sans-serif";
      editable.style.fontSize = `${item.size * currentProScale}px`;
      editable.style.fontWeight = item.is_bold !== false ? "bold" : "normal";
      editable.style.fontStyle = item.is_italic ? "italic" : "normal";
      editable.style.textDecoration = item.is_underline ? "underline" : "none";
      editable.style.textAlign = item.align || "left";
      editable.style.color = item.color || "#0f172a";
      if (item.boxW) editable.style.width = `${item.boxW * currentProScale}px`;
      box.appendChild(editable);

      function enterTypingMode(selectAllPlaceholder = false) {
        selectAddedTextBlock(item, box, editable);
        box.classList.add("is-typing");
        editable.contentEditable = "true";
        editable.focus();
        if (selectAllPlaceholder || editable.textContent.trim() === "Ketik teks baru di sini...") {
          const range = document.createRange();
          range.selectNodeContents(editable);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }

      function exitTypingMode() {
        box.classList.remove("is-typing");
        editable.contentEditable = "false";
      }

      // Delete button outside editable area
      const del = document.createElement("div");
      del.className = "added-item-del-btn";
      del.innerHTML = "&times;";
      del.title = "Hapus teks ini";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        if (activeEditBlock === item) {
          activeEditBlock = null;
          activeEditElement = null;
        }
        currentAddedTexts.splice(idx, 1);
        renderAddedItems();
        pushUndoSnapshot();
      });
      box.appendChild(del);

      const res = document.createElement("div");
      res.className = "resize-handle-se";
      res.title = "Tarik untuk atur lebar kotak teks";
      box.appendChild(res);

      makeResizable(box, res, {
        minW: 90,
        minH: 26,
        onResize: (nw) => {
          const textW = Math.max(60, nw - ADDED_TEXT_HANDLE_W - 10);
          editable.style.width = `${textW}px`;
          item.boxW = roundNum(textW / currentProScale);
          item.w = Math.max(40, Math.round(textW / currentProScale) + 12);
        },
        onEnd: () => pushUndoSnapshot()
      });

      editable.addEventListener("blur", () => {
        exitTypingMode();
        pushUndoSnapshot();
      });

      editable.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        enterTypingMode(true);
      });

      editable.addEventListener("input", () => {
        item.text = editable.textContent;
        const rect = editable.getBoundingClientRect();
        item.w = Math.max(40, Math.round(rect.width / currentProScale) + 12);
        item.h = Math.max(20, Math.round(rect.height / currentProScale) + 8);
      });

      makeDraggable(
        box,
        (newLeft, newTop) => {
          item.x = Math.round((newLeft + ADDED_TEXT_HANDLE_W) / currentProScale);
          item.y = Math.round(newTop / currentProScale);
        },
        handle,
        editable,
        () => {
          // Single click without drag enters typing mode cleanly!
          enterTypingMode(false);
        }
      );

      proAddedOverlays.appendChild(box);

      if (focusItemId && item.id === focusItemId) {
        enterTypingMode(true);
      }
    });

    // Added Images & Signatures
    currentAddedImages.forEach((imgItem, idx) => {
      const imgBox = document.createElement("div");
      imgBox.className = "added-image-item";
      imgBox.style.left = `${imgItem.x * currentProScale}px`;
      imgBox.style.top = `${imgItem.y * currentProScale}px`;
      imgBox.style.width = `${imgItem.w * currentProScale}px`;
      imgBox.style.height = `${imgItem.h * currentProScale}px`;

      const imgTag = document.createElement("img");
      imgTag.src = imgItem.data_uri;
      imgBox.appendChild(imgTag);

      const del = document.createElement("div");
      del.className = "added-item-del-btn";
      del.innerHTML = "&times;";
      del.title = "Hapus gambar / tanda tangan";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        currentAddedImages.splice(idx, 1);
        renderAddedItems();
        pushUndoSnapshot();
      });
      imgBox.appendChild(del);

      const res = document.createElement("div");
      res.className = "resize-handle-se";
      res.title = "Tarik untuk ubah ukuran";
      imgBox.appendChild(res);

      makeResizable(imgBox, res, {
        minW: 28,
        minH: 20,
        lockAspect: true,
        onResize: (nw, nh) => {
          imgBox.style.width = `${nw}px`;
          imgBox.style.height = `${nh}px`;
          imgItem.w = roundNum(nw / currentProScale);
          imgItem.h = roundNum(nh / currentProScale);
        },
        onEnd: () => pushUndoSnapshot()
      });

      makeDraggable(imgBox, (newLeft, newTop) => {
        imgItem.x = Math.round(newLeft / currentProScale);
        imgItem.y = Math.round(newTop / currentProScale);
      });

      proAddedOverlays.appendChild(imgBox);
    });

    // Added Fill Symbols (✓, ✕, ●, ◯)
    currentAddedSymbols.forEach((sym, idx) => {
      const symBox = document.createElement("div");
      symBox.className = "added-symbol-item";
      const boxDim = Math.max(20, (sym.size || 22) * 1.35 * currentProScale);
      symBox.style.left = `${sym.x * currentProScale}px`;
      symBox.style.top = `${sym.y * currentProScale}px`;
      symBox.style.width = `${boxDim}px`;
      symBox.style.height = `${boxDim}px`;
      symBox.style.fontSize = `${(sym.size || 22) * currentProScale}px`;
      symBox.style.color = sym.color || "#16a34a";

      const glyph = document.createElement("span");
      glyph.textContent = sym.char || "✓";
      glyph.style.pointerEvents = "none";
      glyph.style.lineHeight = "1";
      symBox.appendChild(glyph);

      const del = document.createElement("div");
      del.className = "added-item-del-btn";
      del.innerHTML = "&times;";
      del.title = "Hapus simbol";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        currentAddedSymbols.splice(idx, 1);
        renderAddedItems();
        pushUndoSnapshot();
      });
      symBox.appendChild(del);

      const res = document.createElement("div");
      res.className = "resize-handle-se";
      symBox.appendChild(res);

      makeResizable(symBox, res, {
        minW: 18,
        minH: 18,
        lockAspect: true,
        onResize: (nw) => {
          const newPtSize = Math.max(10, Math.min(120, roundNum(nw / (1.35 * currentProScale))));
          sym.size = newPtSize;
          symBox.style.width = `${nw}px`;
          symBox.style.height = `${nw}px`;
          symBox.style.fontSize = `${newPtSize * currentProScale}px`;
        },
        onEnd: () => pushUndoSnapshot()
      });

      makeDraggable(symBox, (newLeft, newTop) => {
        sym.x = Math.round(newLeft / currentProScale);
        sym.y = Math.round(newTop / currentProScale);
      });

      proAddedOverlays.appendChild(symBox);
    });

    // Selected Freehand Drawing Delete Badge
    if (selectedDrawingId) {
      const drIdx = currentDrawings.findIndex(d => d.id === selectedDrawingId);
      if (drIdx !== -1 && currentDrawings[drIdx].points && currentDrawings[drIdx].points.length > 0) {
        const pts = currentDrawings[drIdx].points;
        const maxX = Math.max(...pts.map(p => p[0]));
        const minY = Math.min(...pts.map(p => p[1]));
        const drDel = document.createElement("button");
        drDel.type = "button";
        drDel.className = "added-item-del-btn";
        drDel.style.cssText = `opacity:1; position:absolute; left:${maxX * currentProScale + 4}px; top:${Math.max(0, minY * currentProScale - 12)}px; width:22px; height:22px;`;
        drDel.innerHTML = "&times;";
        drDel.title = "Hapus coretan ini";
        drDel.addEventListener("click", (e) => {
          e.stopPropagation();
          currentDrawings.splice(drIdx, 1);
          selectedDrawingId = null;
          renderDrawings();
          renderAddedItems();
          pushUndoSnapshot();
        });
        proAddedOverlays.appendChild(drDel);
      }
    }
  }

  function makeDraggable(wrapperEl, onMove, handleEl = null, editableEl = null, onClickWithoutDrag = null) {
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    function startDrag(clientX, clientY, target, preventDefaultFn) {
      if (currentEditorMode !== "select") return;
      if (target.closest(".added-item-del-btn") || target.closest(".resize-handle-se")) return;

      const isHandleClick = handleEl && (target === handleEl || handleEl.contains(target));
      const isBorderClick = (target === wrapperEl);
      const isCurrentlyTyping = wrapperEl.classList.contains("is-typing");

      // While user is actively typing inside editableEl, allow text selection unless grabbing handle/border
      if (!isHandleClick && !isBorderClick && isCurrentlyTyping) {
        return;
      }

      startX = clientX;
      startY = clientY;
      initialLeft = wrapperEl.offsetLeft;
      initialTop = wrapperEl.offsetTop;
      let isActuallyDragging = isHandleClick || isBorderClick || !editableEl;
      let hasMoved = false;

      if (isActuallyDragging) {
        if (preventDefaultFn) preventDefaultFn();
        wrapperEl.classList.add("is-dragging");
      }

      function handleMove(moveX, moveY, movePreventDefaultFn) {
        const dx = moveX - startX;
        const dy = moveY - startY;

        if (!isActuallyDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          isActuallyDragging = true;
          hasMoved = true;
          wrapperEl.classList.add("is-dragging");
          if (editableEl) {
            wrapperEl.classList.remove("is-typing");
            editableEl.contentEditable = "false";
            editableEl.blur();
          }
          if (window.getSelection) window.getSelection().removeAllRanges();
        }

        if (isActuallyDragging) {
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) hasMoved = true;
          if (movePreventDefaultFn) movePreventDefaultFn();

          const stageW = proStage ? proStage.offsetWidth : 2000;
          const stageH = proStage ? proStage.offsetHeight : 3000;
          const maxLeft = Math.max(0, stageW - wrapperEl.offsetWidth);
          const maxTop = Math.max(0, stageH - wrapperEl.offsetHeight);

          const newLeft = Math.max(0, Math.min(maxLeft, initialLeft + dx));
          const newTop = Math.max(0, Math.min(maxTop, initialTop + dy));
          wrapperEl.style.left = `${newLeft}px`;
          wrapperEl.style.top = `${newTop}px`;
          if (onMove) onMove(newLeft, newTop);
        }
      }

      function onMouseMove(moveEvent) {
        handleMove(moveEvent.clientX, moveEvent.clientY, () => moveEvent.preventDefault());
      }

      function onTouchMove(touchEvent) {
        if (touchEvent.touches && touchEvent.touches.length > 0) {
          handleMove(touchEvent.touches[0].clientX, touchEvent.touches[0].clientY, () => touchEvent.preventDefault());
        }
      }

      function onEnd() {
        wrapperEl.classList.remove("is-dragging");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onEnd);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onEnd);

        // Single click without drag switches into typing/edit mode seamlessly!
        if (!hasMoved && !isHandleClick && editableEl && onClickWithoutDrag) {
          onClickWithoutDrag();
        } else if (hasMoved) {
          pushUndoSnapshot();
        }
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    }

    wrapperEl.addEventListener("mousedown", (e) => {
      startDrag(e.clientX, e.clientY, e.target, () => e.preventDefault());
    });

    wrapperEl.addEventListener("touchstart", (e) => {
      if (e.touches && e.touches.length > 0) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY, e.target, null);
      }
    }, { passive: true });
  }

  // Save & Download PRO Changes (Vector-Preserving Multi-Page Engine)
  const SAVE_BTN_HTML = `<svg class="ui-icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Simpan & Download PDF`;

  function parseCssColorToRgb01(colorStr) {
    const s = (colorStr || "#111827").trim();
    if (s.startsWith("#")) {
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) || 0;
        const g = parseInt(hex.slice(2, 4), 16) || 0;
        const b = parseInt(hex.slice(4, 6), 16) || 0;
        return [r / 255, g / 255, b / 255];
      }
    }
    const m = s.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) {
      return [
        Math.min(1, parseInt(m[1], 10) / 255),
        Math.min(1, parseInt(m[2], 10) / 255),
        Math.min(1, parseInt(m[3], 10) / 255)
      ];
    }
    return [0.067, 0.094, 0.153];
  }

  function renderTextPatchCanvasPng(textStr, opts) {
    const scale = 3.0;
    const fSize = (opts.size || 12) * scale;
    const weight = opts.bold ? "bold " : "";
    const style = opts.italic ? "italic " : "";
    const fontFam = opts.webFont || "Arial, sans-serif";
    const tmp = document.createElement("canvas");
    const mCtx = tmp.getContext("2d");
    mCtx.font = `${style}${weight}${fSize}px ${fontFam}`;
    const textW = Math.max(8, Math.ceil(mCtx.measureText(textStr).width));
    const padX = Math.ceil(6 * scale);
    const padY = Math.ceil(4 * scale);
    tmp.width = textW + padX * 2;
    tmp.height = Math.ceil(fSize * 1.45) + padY * 2;
    const c = tmp.getContext("2d");
    c.font = `${style}${weight}${fSize}px ${fontFam}`;
    c.fillStyle = opts.color || "#111827";
    c.textBaseline = "alphabetic";
    const baseY = padY + fSize * 0.95;
    c.fillText(textStr, padX, baseY);
    if (opts.underline) {
      c.beginPath();
      c.strokeStyle = opts.color || "#111827";
      c.lineWidth = Math.max(1.5, fSize * 0.07);
      c.moveTo(padX, baseY + fSize * 0.14);
      c.lineTo(padX + textW, baseY + fSize * 0.14);
      c.stroke();
    }
    return {
      dataUrl: tmp.toDataURL("image/png"),
      ptWidth: tmp.width / scale,
      ptHeight: tmp.height / scale,
      padXPt: padX / scale,
      baseFromTopPt: baseY / scale
    };
  }

  if (proBtnSaveDownload) {
    proBtnSaveDownload.addEventListener("click", async () => {
      if (!currentProFile) return;

      proBtnSaveDownload.disabled = true;
      proBtnSaveDownload.textContent = "Menyimpan & Merender Dokumen...";

      const payload = buildProSavePayload();

      // Try Server API first (PyMuPDF surgical vector redaction & overlay)
      try {
        const formData = new FormData();
        formData.append("file", currentProFile);
        formData.append("changes", JSON.stringify(payload));
        const res = await fetch("/api/pro/save-visual-editor", {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            proBtnSaveDownload.disabled = false;
            proBtnSaveDownload.innerHTML = SAVE_BTN_HTML;
            showSimpleDownload(data.download_url, data.filename, "Hasil editan PDF berhasil dirender secara presisi (vektor asli tetap terjaga) dan siap diunduh!");
            return;
          }
        }
      } catch (e) {}

      // Client-side vector-preserving fallback: Load original PDF bytes cleanly via PDFLib
      try {
        const origBytes = await currentProFile.arrayBuffer();
        const outDoc = await PDFLib.PDFDocument.load(origBytes, { ignoreEncryption: true });

        if (!clientPdfDoc) {
          clientPdfDoc = await pdfjsLib.getDocument({ data: origBytes.slice(0) }).promise;
        }

        const fontCache = {};
        async function getStdFont(webFont, fontName, fontCode, isBold, isItalic) {
          const sig = `${fontCode || ""} ${webFont || ""} ${fontName || ""}`.toLowerCase();
          let stdKey = PDFLib.StandardFonts.Helvetica;
          if (/tiro|tibo|tiit|tibi|times|bookman|georgia|cambria|garamond|palatino|minion/.test(sig) || (/serif/.test(sig) && !/sans/.test(sig))) {
            stdKey = isBold ? (isItalic ? PDFLib.StandardFonts.TimesRomanBoldItalic : PDFLib.StandardFonts.TimesRomanBold) : (isItalic ? PDFLib.StandardFonts.TimesRomanItalic : PDFLib.StandardFonts.TimesRoman);
          } else if (/cour|cobo|coit|cobi|mono|consolas/.test(sig)) {
            stdKey = isBold ? (isItalic ? PDFLib.StandardFonts.CourierBoldOblique : PDFLib.StandardFonts.CourierBold) : (isItalic ? PDFLib.StandardFonts.CourierOblique : PDFLib.StandardFonts.Courier);
          } else {
            stdKey = isBold ? (isItalic ? PDFLib.StandardFonts.HelveticaBoldOblique : PDFLib.StandardFonts.HelveticaBold) : (isItalic ? PDFLib.StandardFonts.HelveticaOblique : PDFLib.StandardFonts.Helvetica);
          }
          if (!fontCache[stdKey]) {
            fontCache[stdKey] = await outDoc.embedFont(stdKey);
          }
          return fontCache[stdKey];
        }

        async function drawRichParagraphPdfLib(pdfPage, rectHtml, itemData, fallbackText, toPdfPt, boxToPdfRect) {
          const fSize = parseFloat(itemData.size || itemData.font_size || 11);
          const leadingRaw = itemData.line_height;
          const leadingPt = (leadingRaw != null && leadingRaw !== "" && String(leadingRaw).toLowerCase() !== "auto" && parseFloat(leadingRaw) > 0)
            ? Math.max(fSize * 0.8, parseFloat(leadingRaw))
            : roundNum(fSize * 1.25);

          const trkVal = parseFloat(itemData.tracking || 0) || 0;
          const krnRaw = itemData.kerning;
          const krnVal = (krnRaw != null && krnRaw !== "" && String(krnRaw).toLowerCase() !== "auto") ? (parseFloat(krnRaw) || 0) : 0;
          const extraCharPt = ((trkVal + krnVal) / 1000.0) * fSize;
          const hScaleF = Math.max(0.5, Math.min(2.0, (parseFloat(itemData.h_scale || 100) || 100) / 100));
          const paraSpacingPt = Math.max(0, parseFloat(itemData.para_spacing || 0) || 0);
          const textIndent = Math.max(0, parseFloat(itemData.text_indent || 0) || 0);
          const alignStr = (itemData.align || "left").toLowerCase();
          const wrapLines = Boolean(itemData.is_paragraph) || String(fallbackText || "").includes("\n") || alignStr.startsWith("justify");

          const runsInput = (Array.isArray(itemData.runs) && itemData.runs.length > 0) ? itemData.runs : [{
            text: fallbackText || "",
            is_bold: Boolean(itemData.is_bold),
            is_italic: Boolean(itemData.is_italic),
            is_underline: Boolean(itemData.is_underline),
            color: itemData.color || "#111827"
          }];

          const hardParas = [[]];
          let currentCluster = [];
          function flushCluster() {
            if (currentCluster.length > 0) {
              const totalW = currentCluster.reduce((acc, p) => acc + p.w, 0);
              hardParas[hardParas.length - 1].push({ parts: currentCluster, w: totalW });
              currentCluster = [];
            }
          }

          const basePlainFont = await getStdFont(itemData.web_font, itemData.font, itemData.font_code, false, false);
          function measureWithFont(txt, fObj) {
            let w = 0;
            try {
              fObj.encodeText(txt);
              w = fObj.widthOfTextAtSize(txt, fSize) * hScaleF;
            } catch (e) {
              w = txt.length * fSize * 0.55 * hScaleF;
            }
            if (Math.abs(extraCharPt) > 0.001) w += extraCharPt * txt.length;
            return Math.max(0, w);
          }

          for (const r of runsInput) {
            const rBold = Boolean(r.is_bold !== undefined ? r.is_bold : itemData.is_bold);
            const rItalic = Boolean(r.is_italic !== undefined ? r.is_italic : itemData.is_italic);
            const rUnder = Boolean(r.is_underline !== undefined ? r.is_underline : itemData.is_underline);
            const rColor = r.color || itemData.color || "#111827";
            const [tr, tg, tb] = parseCssColorToRgb01(rColor);
            const rRgb = PDFLib.rgb(tr, tg, tb);
            const rFont = await getStdFont(itemData.web_font, itemData.font, itemData.font_code, rBold, rItalic);
            const rStr = String(r.text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
            const hardSegs = rStr.split("\n");

            for (let si = 0; si < hardSegs.length; si++) {
              if (si > 0) {
                flushCluster();
                hardParas.push([]);
              }
              const pieces = hardSegs[si].match(/\S+|\s+/g) || [];
              for (const tok of pieces) {
                if (/^\s+$/.test(tok)) {
                  flushCluster();
                } else {
                  currentCluster.push({
                    text: tok,
                    font: rFont,
                    rgb: rRgb,
                    colorStr: rColor,
                    bold: rBold,
                    italic: rItalic,
                    underline: rUnder,
                    w: measureWithFont(tok, rFont)
                  });
                }
              }
            }
          }
          flushCluster();

          const spaceW = measureWithFont(" ", basePlainFont);
          const boxW = Math.max(20, rectHtml.w);
          const visualLines = [];

          for (const pWords of hardParas) {
            if (pWords.length === 0) {
              visualLines.push({ words: [], isHardEnd: true, indent: 0 });
              continue;
            }
            let curWords = [];
            let curW = 0;
            let lineIndent = textIndent;
            let availW = Math.max(18, boxW - lineIndent);

            for (const wObj of pWords) {
              const needW = curWords.length === 0 ? wObj.w : (curW + spaceW + wObj.w);
              if (wrapLines && curWords.length > 0 && needW > availW + 1.5) {
                visualLines.push({ words: curWords, isHardEnd: false, indent: lineIndent });
                curWords = [wObj];
                curW = wObj.w;
                lineIndent = 0;
                availW = boxW;
              } else {
                curWords.push(wObj);
                curW = needW;
              }
            }
            if (curWords.length > 0) {
              visualLines.push({ words: curWords, isHardEnd: true, indent: lineIndent });
            }
          }

          let curHtmlBaselineY = itemData.is_paragraph
            ? (rectHtml.y + fSize * 0.90)
            : (rectHtml.y + (rectHtml.h * (visualLines.length === 1 ? 0.80 : 0.0) || fSize * 0.88));
          for (let li = 0; li < visualLines.length; li++) {
            const vline = visualLines[li];
            const words = vline.words;
            if (words.length === 0) {
              curHtmlBaselineY += leadingPt + paraSpacingPt;
              continue;
            }

            const baselineHtmlY = curHtmlBaselineY;
            curHtmlBaselineY += leadingPt + (vline.isHardEnd ? paraSpacingPt : 0);

            const indentPt = vline.indent;
            const availW = Math.max(15, boxW - indentPt);
            const wordsW = words.reduce((acc, w) => acc + w.w, 0);
            const nGaps = Math.max(0, words.length - 1);
            const isLast = vline.isHardEnd || (li === visualLines.length - 1);

            const doJustify = (alignStr === "justify-all" && nGaps >= 1) || (
              (alignStr === "justify" || alignStr === "justify-left" || alignStr === "justify-center" || alignStr === "justify-right") &&
              !isLast && nGaps >= 1
            );

            let gapPt = spaceW;
            let curHtmlX = rectHtml.x + indentPt;
            if (doJustify) {
              gapPt = Math.max(spaceW * 0.65, (availW - wordsW) / nGaps);
            } else if (alignStr === "center" || (alignStr === "justify-center" && isLast)) {
              const totalW = wordsW + nGaps * spaceW;
              curHtmlX = rectHtml.x + indentPt + (availW - totalW) / 2;
            } else if (alignStr === "right" || (alignStr === "justify-right" && isLast)) {
              const totalW = wordsW + nGaps * spaceW;
              curHtmlX = rectHtml.x + boxW - totalW;
            }

            for (let wi = 0; wi < words.length; wi++) {
              const wObj = words[wi];
              for (const part of wObj.parts) {
                try {
                  part.font.encodeText(part.text);
                  let drawnW = 0;
                  if (Math.abs(extraCharPt) <= 0.005) {
                    const [px, py] = toPdfPt(curHtmlX, baselineHtmlY);
                    pdfPage.drawText(part.text, { x: px, y: py, size: fSize, font: part.font, color: part.rgb });
                    drawnW = part.font.widthOfTextAtSize(part.text, fSize);
                  } else {
                    let cx = curHtmlX;
                    for (const ch of part.text) {
                      const [px, py] = toPdfPt(cx, baselineHtmlY);
                      pdfPage.drawText(ch, { x: px, y: py, size: fSize, font: part.font, color: part.rgb });
                      cx += Math.max(0.5, part.font.widthOfTextAtSize(ch, fSize) + extraCharPt);
                    }
                    drawnW = cx - curHtmlX;
                  }
                  if (part.underline && drawnW > 0) {
                    const uY = baselineHtmlY + Math.max(1.2, fSize * 0.14);
                    const [ux0, uy] = toPdfPt(curHtmlX, uY);
                    const [ux1] = toPdfPt(curHtmlX + drawnW, uY);
                    pdfPage.drawLine({ start: { x: ux0, y: uy }, end: { x: ux1, y: uy }, thickness: Math.max(0.7, fSize * 0.065), color: part.rgb });
                  }
                  curHtmlX += drawnW;
                } catch (encErr) {
                  const patch = renderTextPatchCanvasPng(part.text, {
                    size: fSize,
                    bold: part.bold,
                    italic: part.italic,
                    underline: part.underline,
                    webFont: itemData.web_font || itemData.font,
                    color: part.colorStr
                  });
                  const pngBytes = await fetch(patch.dataUrl).then(r => r.arrayBuffer());
                  const emb = await outDoc.embedPng(pngBytes);
                  const hLeft = curHtmlX - patch.padXPt;
                  const hTop = baselineHtmlY - patch.baseFromTopPt;
                  const pRect = boxToPdfRect(hLeft, hTop, hLeft + patch.ptWidth, hTop + patch.ptHeight);
                  pdfPage.drawImage(emb, { x: pRect.x, y: pRect.y, width: pRect.width, height: pRect.height });
                  curHtmlX += Math.max(part.w, patch.ptWidth - patch.padXPt * 2);
                }
              }
              if (wi < words.length - 1) curHtmlX += gapPt;
            }
          }
        }

        const totalPdfPages = outDoc.getPageCount();
        for (const pKey of Object.keys(pagesEditsPayload)) {
          const pIdx = parseInt(pKey, 10);
          if (isNaN(pIdx) || pIdx < 0 || pIdx >= totalPdfPages) continue;
          const st = pagesEditsPayload[pKey];
          const pdfPage = outDoc.getPage(pIdx);
          const jsPage = await clientPdfDoc.getPage(pIdx + 1);
          const vp1 = jsPage.getViewport({ scale: 1.0 });

          function toPdfPt(vx, vy) {
            return vp1.convertToPdfPoint(vx, vy);
          }
          function boxToPdfRect(vx0, vy0, vx1, vy1) {
            const pA = toPdfPt(vx0, vy0);
            const pB = toPdfPt(vx1, vy1);
            return {
              x: Math.min(pA[0], pB[0]),
              y: Math.min(pA[1], pB[1]),
              width: Math.abs(pB[0] - pA[0]),
              height: Math.abs(pB[1] - pA[1])
            };
          }

          // 1. Highlights (translucent vector rectangles)
          for (const hl of (st.highlights || [])) {
            const r = boxToPdfRect(hl.x, hl.y, hl.x + hl.w, hl.y + hl.h);
            const [cr, cg, cb] = parseCssColorToRgb01(hl.color || "#fde047");
            pdfPage.drawRectangle({
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              color: PDFLib.rgb(cr, cg, cb),
              opacity: 0.38
            });
          }

          // 2. Modified Existing Text Blocks & Unified Paragraphs
          for (const edit of (st.text_edits || [])) {
            const origB = edit.orig_bbox || edit.bbox;
            const newB = edit.bbox || origB;
            const [br, bg, bb] = parseCssColorToRgb01(edit.bg_color || "#ffffff");

            const rOrig = boxToPdfRect(origB[0] - 1.5, origB[1] - 1, origB[2] + 1.5, origB[3] + 2.0);
            pdfPage.drawRectangle({
              x: rOrig.x, y: rOrig.y, width: rOrig.width, height: rOrig.height,
              color: PDFLib.rgb(br, bg, bb)
            });

            if (Math.abs(newB[0] - origB[0]) > 2 || Math.abs((newB[2] - newB[0]) - (origB[2] - origB[0])) > 2 || Math.abs(newB[3] - origB[3]) > 3) {
              const rNew = boxToPdfRect(newB[0] - 1.5, newB[1] - 1, newB[2] + 1.5, newB[3] + 2.0);
              pdfPage.drawRectangle({
                x: rNew.x, y: rNew.y, width: rNew.width, height: rNew.height,
                color: PDFLib.rgb(br, bg, bb)
              });
            }

            if (!edit.deleted && (edit.new_text || (edit.runs && edit.runs.length))) {
              await drawRichParagraphPdfLib(
                pdfPage,
                { x: newB[0], y: newB[1], w: newB[2] - newB[0], h: newB[3] - newB[1] },
                edit,
                edit.new_text,
                toPdfPt,
                boxToPdfRect
              );
            }
          }

          // 2b. Adobe bboxType=3 Modified/Moved/Resized/Deleted PDF Image Objects
          for (const imgEd of (st.image_edits || [])) {
            const ob = imgEd.orig_bbox || imgEd.bbox;
            const nb = imgEd.bbox || ob;
            if (!ob || ob.length !== 4) continue;
            const rO = boxToPdfRect(ob[0] - 1, ob[1] - 1, ob[2] + 1, ob[3] + 1);
            pdfPage.drawRectangle({ x: rO.x, y: rO.y, width: rO.width, height: rO.height, color: PDFLib.rgb(1, 1, 1) });
            if (!imgEd.deleted && imgEd.data_uri && imgEd.data_uri.includes(",")) {
              const rawBytes = await fetch(imgEd.data_uri).then(r => r.arrayBuffer());
              const isPng = imgEd.data_uri.startsWith("data:image/png");
              const emb = isPng ? await outDoc.embedPng(rawBytes) : await outDoc.embedJpg(rawBytes);
              const rN = boxToPdfRect(nb[0], nb[1], nb[2], nb[3]);
              pdfPage.drawImage(emb, { x: rN.x, y: rN.y, width: rN.width, height: rN.height });
            }
          }

          // 3. Added Freehand Vector Drawings
          for (const dr of (st.drawings || [])) {
            const pts = dr.points || [];
            if (pts.length < 2) continue;
            const [cr, cg, cb] = parseCssColorToRgb01(dr.color || "#dc2626");
            const strokeColor = PDFLib.rgb(cr, cg, cb);
            const thick = parseFloat(dr.width || 2.5);
            for (let i = 1; i < pts.length; i++) {
              const p0 = toPdfPt(pts[i - 1][0], pts[i - 1][1]);
              const p1 = toPdfPt(pts[i][0], pts[i][1]);
              pdfPage.drawLine({
                start: { x: p0[0], y: p0[1] },
                end: { x: p1[0], y: p1[1] },
                thickness: thick,
                color: strokeColor,
                lineCap: PDFLib.LineCapStyle ? PDFLib.LineCapStyle.Round : undefined
              });
            }
          }

          // 4. Added Vector Fill & Sign Symbols (✓, ✕, ●, ◯)
          for (const sym of (st.symbols || [])) {
            const sz = parseFloat(sym.size || 22);
            const cx = sym.x + sz * 0.675;
            const cy = sym.y + sz * 0.675;
            const [pcx, pcy] = toPdfPt(cx, cy);
            const [cr, cg, cb] = parseCssColorToRgb01(sym.color || "#16a34a");
            const symColor = PDFLib.rgb(cr, cg, cb);
            const thick = Math.max(1.8, sz * 0.13);
            const ch = sym.char || "✓";

            if (ch === "✓" || ch === "\u2713") {
              const p1 = toPdfPt(cx - sz * 0.32, cy);
              const p2 = toPdfPt(cx - sz * 0.06, cy + sz * 0.28);
              const p3 = toPdfPt(cx + sz * 0.36, cy - sz * 0.28);
              pdfPage.drawLine({ start: { x: p1[0], y: p1[1] }, end: { x: p2[0], y: p2[1] }, thickness: thick, color: symColor });
              pdfPage.drawLine({ start: { x: p2[0], y: p2[1] }, end: { x: p3[0], y: p3[1] }, thickness: thick, color: symColor });
            } else if (ch === "✕" || ch === "\u2715" || ch === "×" || ch === "X") {
              const d = sz * 0.28;
              const a1 = toPdfPt(cx - d, cy - d), a2 = toPdfPt(cx + d, cy + d);
              const b1 = toPdfPt(cx + d, cy - d), b2 = toPdfPt(cx - d, cy + d);
              pdfPage.drawLine({ start: { x: a1[0], y: a1[1] }, end: { x: a2[0], y: a2[1] }, thickness: thick, color: symColor });
              pdfPage.drawLine({ start: { x: b1[0], y: b1[1] }, end: { x: b2[0], y: b2[1] }, thickness: thick, color: symColor });
            } else if (ch === "●" || ch === "\u25cf") {
              pdfPage.drawCircle({ x: pcx, y: pcy, size: sz * 0.28, color: symColor });
            } else {
              pdfPage.drawCircle({ x: pcx, y: pcy, size: sz * 0.30, borderColor: symColor, borderWidth: thick });
            }
          }

          // 5. Added Custom Texts (Vector with Unicode fallback & full typography)
          for (const item of (st.added_texts || [])) {
            const textStr = (item.text || "").trim();
            if (!textStr) continue;
            const itemW = Math.max(80, parseFloat(item.boxW || item.w || 200));
            await drawRichParagraphPdfLib(
              pdfPage,
              { x: item.x + 4, y: item.y + 3, w: itemW, h: 0 },
              { ...item, is_bold: item.is_bold !== false, is_paragraph: Boolean(item.boxW) || textStr.includes("\n") },
              textStr,
              toPdfPt,
              boxToPdfRect
            );
          }

          // 6. Added Images & Transparent E-Signatures
          for (const imgItem of (st.added_images || [])) {
            const uri = imgItem.data_uri || "";
            if (!uri) continue;
            let embeddedImg = null;
            if (uri.startsWith("data:image/jpeg") || uri.startsWith("data:image/jpg")) {
              const bytes = await fetch(uri).then(r => r.arrayBuffer());
              embeddedImg = await outDoc.embedJpg(bytes);
            } else if (uri.startsWith("data:image/png")) {
              const bytes = await fetch(uri).then(r => r.arrayBuffer());
              embeddedImg = await outDoc.embedPng(bytes);
            } else {
              // Convert WebP / GIF / BMP via offscreen canvas to lossless PNG
              const probe = new Image();
              probe.src = uri;
              await new Promise(res => { probe.onload = res; });
              const c = document.createElement("canvas");
              c.width = probe.naturalWidth || 200;
              c.height = probe.naturalHeight || 200;
              c.getContext("2d").drawImage(probe, 0, 0);
              const pngBytes = await fetch(c.toDataURL("image/png")).then(r => r.arrayBuffer());
              embeddedImg = await outDoc.embedPng(pngBytes);
            }
            if (embeddedImg) {
              const r = boxToPdfRect(imgItem.x, imgItem.y, imgItem.x + imgItem.w, imgItem.y + imgItem.h);
              pdfPage.drawImage(embeddedImg, { x: r.x, y: r.y, width: r.width, height: r.height });
            }
          }
        }

        const outPdfBytes = await outDoc.save();
        const blob = new Blob([outPdfBytes], { type: "application/pdf" });

        proBtnSaveDownload.disabled = false;
        proBtnSaveDownload.innerHTML = SAVE_BTN_HTML;

        showSimpleDownload(URL.createObjectURL(blob), `edited_${currentProFile.name}`, "Hasil editan PDF berhasil dirender secara presisi (vektor asli tetap terjaga) dan siap diunduh!");
      } catch (clientErr) {
        proBtnSaveDownload.disabled = false;
        proBtnSaveDownload.innerHTML = SAVE_BTN_HTML;
        alert("Error merender PDF: " + clientErr.message);
      }
    });
  }

  // Sleek Auto-Download Toast Notification (Non-blocking, top-center)
  function showAutoDownloadToast(filename, message) {
    const existing = document.getElementById("auto-download-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "auto-download-toast";
    toast.style.cssText = `
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #059669;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px rgba(5, 150, 105, 0.40);
      z-index: 99999;
      font-size: 13.5px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: none;
      animation: toastSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    const label = filename
      ? `Mengunduh otomatis: ${filename}`
      : (message || "Proses berhasil! Mengunduh berkas otomatis...");
    toast.innerHTML = `
      <svg class="ui-icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px; height:18px;"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>${label}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(-10px)";
      setTimeout(() => {
        try { toast.remove(); } catch (e) {}
      }, 350);
    }, 3200);
  }

  // Universal Auto-Download Trigger (Directly triggers download and removes bottom-right banner)
  function triggerAutoDownload(url, filename, message = "") {
    if (!url) return;
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "document.pdf";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { a.remove(); } catch (e) {}
      }, 300);
    } catch (e) {
      console.warn("Auto download trigger error:", e);
    }

    showAutoDownloadToast(filename, message);
  }

  // Universal Download Handler (Now automatically initiates download)
  function showSimpleDownload(url, filename, message) {
    triggerAutoDownload(url, filename, message);
  }
});
