/**
 * Extension Options Studio Controller
 * Features instant auto-sync, segmented studio buttons, and an interactive live spreadsheet preview.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const optEnabled = document.getElementById('opt-enabled');
  const optTransparentCell = document.getElementById('opt-transparent-cell');
  const optSelectionFrame = document.getElementById('opt-selection-frame');
  const optRangeBadge = document.getElementById('opt-range-badge');
  const optPauseTyping = document.getElementById('opt-pause-typing');
  const optShortcuts = document.getElementById('opt-shortcuts');
  const optMode = document.getElementById('opt-mode');
  const optStyleMode = document.getElementById('opt-style-mode');
  const optBorderWidth = document.getElementById('opt-border-width');
  const optBorderStyle = document.getElementById('opt-border-style');
  const optColor = document.getElementById('opt-color');
  const optSeparateColors = document.getElementById('opt-separate-colors');
  const optColColor = document.getElementById('opt-col-color');
  const optOpacity = document.getElementById('opt-opacity');
  const saveBtn = document.getElementById('save-btn');
  const resetBtn = document.getElementById('reset-btn');
  const statusMsg = document.getElementById('status-msg');

  const rowHexLabel = document.getElementById('row-hex-label');
  const colHexLabel = document.getElementById('col-hex-label');
  const opacityReadout = document.getElementById('opacity-readout');
  const previewModeLabel = document.getElementById('preview-mode-label');
  const previewStyleLabel = document.getElementById('preview-style-label');
  const previewRangeText = document.getElementById('preview-range-text');
  const previewGrid = document.getElementById('preview-grid');

  // Interactive preview selection state (0-based 6x6 grid)
  let previewSel = { r1: 2, c1: 2, r2: 3, c2: 3 };
  let isPreviewDragging = false;

  function buildPreviewGrid() {
    if (!previewGrid) return;
    previewGrid.innerHTML = '';

    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const corner = document.createElement('div');
    corner.className = 'p-hdr';
    previewGrid.appendChild(corner);

    for (let c = 0; c < 6; c++) {
      const ch = document.createElement('div');
      ch.className = 'p-hdr';
      ch.textContent = cols[c];
      previewGrid.appendChild(ch);
    }

    const sampleData = [
      ['Q1', '142', '198', '210', '184', '934'],
      ['Q2', '165', '220', '245', '190', '820'],
      ['Q3', '188', '264', '312', '230', '994'],
      ['Q4', '210', '295', '340', '275', '1120'],
      ['YTD', '705', '977', '1107', '879', '3868'],
      ['AVG', '176', '244', '276', '219', '967']
    ];

    for (let r = 0; r < 6; r++) {
      const rh = document.createElement('div');
      rh.className = 'p-hdr';
      rh.textContent = String(r + 1);
      previewGrid.appendChild(rh);

      for (let c = 0; c < 6; c++) {
        const cell = document.createElement('div');
        cell.className = 'p-cell';
        cell.dataset.r = String(r);
        cell.dataset.c = String(c);
        cell.textContent = sampleData[r][c];

        cell.addEventListener('mousedown', () => {
          isPreviewDragging = true;
          previewSel = { r1: r, c1: c, r2: r, c2: c };
          renderLivePreview();
        });

        cell.addEventListener('mouseenter', () => {
          if (!isPreviewDragging) return;
          previewSel.r2 = r;
          previewSel.c2 = c;
          renderLivePreview();
        });

        previewGrid.appendChild(cell);
      }
    }

    document.addEventListener('mouseup', () => {
      isPreviewDragging = false;
    });
  }

  function hexToRgba(hex, alpha) {
    let c = (hex || '#4285F4').replace('#', '');
    if (c.length === 3) {
      c = c
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
  }

  function renderLivePreview() {
    if (!previewGrid) return;
    const s = collectCurrentSettings();

    const minR = Math.min(previewSel.r1, previewSel.r2);
    const maxR = Math.max(previewSel.r1, previewSel.r2);
    const minC = Math.min(previewSel.c1, previewSel.c2);
    const maxC = Math.max(previewSel.c1, previewSel.c2);

    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const label =
      minR === maxR && minC === maxC
        ? `${cols[minC]}${minR + 1}`
        : `${cols[minC]}${minR + 1}:${cols[maxC]}${maxR + 1}`;
    if (previewRangeText) previewRangeText.textContent = label;

    if (previewModeLabel) {
      const mMap = {
        row_column: 'BOTH',
        row: 'ROW',
        column: 'COLUMN',
        none: 'OFF'
      };
      previewModeLabel.textContent = mMap[s.mode] || 'BOTH';
    }
    if (previewStyleLabel) {
      const sMap = { fill: 'FILL', border: 'BORDER', spotlight: 'FOCUS' };
      previewStyleLabel.textContent = sMap[s.styleMode] || 'FILL';
    }

    const rowRgba = hexToRgba(s.color, s.opacity);
    const colRgba = hexToRgba(
      s.useSeparateColors ? s.colColor : s.color,
      s.opacity
    );

    const cells = previewGrid.querySelectorAll('.p-cell');
    cells.forEach((cell) => {
      const r = parseInt(cell.dataset.r, 10);
      const c = parseInt(cell.dataset.c, 10);

      const inRow = r >= minR && r <= maxR;
      const inCol = c >= minC && c <= maxC;
      const inSel = inRow && inCol;

      cell.style.background = '#ffffff';
      cell.style.boxShadow = 'none';

      if (!s.enabled || s.mode === 'none') return;

      const showRow = s.mode === 'row' || s.mode === 'row_column';
      const showCol = s.mode === 'column' || s.mode === 'row_column';

      if (inSel && s.keepActiveCellTransparent) {
        // 100% pure white/transparent inside selected cells
        cell.style.background = '#ffffff';
        if (s.selectionFrame) {
          cell.style.boxShadow = `inset 0 0 0 1.5px ${s.color}`;
        }
        return;
      }

      if (s.styleMode === 'spotlight') {
        const activeBand = (showRow && inRow) || (showCol && inCol);
        if (!activeBand) {
          cell.style.background = `rgba(15, 23, 42, ${Math.min(0.45, s.opacity)})`;
        }
      } else if (s.styleMode === 'fill') {
        if (showRow && inRow) {
          cell.style.background = rowRgba;
        } else if (showCol && inCol) {
          cell.style.background = colRgba;
        }
      } else if (s.styleMode === 'border') {
        if ((showRow && inRow) || (showCol && inCol)) {
          cell.style.boxShadow = `inset 0 0 0 1.5px ${s.color}`;
        }
      }
    });
  }

  function syncSegmentedButtons(mode, styleMode) {
    document.querySelectorAll('#mode-cards .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.querySelectorAll('#style-cards .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.style === styleMode);
    });
  }

  function collectCurrentSettings() {
    const keepTransparent = optTransparentCell
      ? optTransparentCell.checked
      : true;
    return {
      enabled: optEnabled ? optEnabled.checked : true,
      keepActiveCellTransparent: keepTransparent,
      highlightActiveCell: !keepTransparent,
      selectionFrame: optSelectionFrame ? optSelectionFrame.checked : true,
      showRangeBadge: optRangeBadge ? optRangeBadge.checked : false,
      pauseOnTyping: optPauseTyping ? optPauseTyping.checked : false,
      shortcutsEnabled: optShortcuts ? optShortcuts.checked : true,
      mode: optMode ? optMode.value : 'row_column',
      styleMode: optStyleMode ? optStyleMode.value : 'fill',
      borderWidth: optBorderWidth ? parseInt(optBorderWidth.value, 10) : 2,
      borderStyle: optBorderStyle ? optBorderStyle.value : 'solid',
      color: optColor ? optColor.value : '#4285F4',
      useSeparateColors: optSeparateColors ? optSeparateColors.checked : false,
      colColor: optColColor ? optColColor.value : '#10B981',
      opacity: optOpacity ? parseFloat(optOpacity.value) : 0.25
    };
  }

  function applySettingsToUI(settings) {
    if (optEnabled) optEnabled.checked = Boolean(settings.enabled);
    if (optTransparentCell) {
      optTransparentCell.checked =
        settings.keepActiveCellTransparent !== false;
    }
    if (optSelectionFrame) {
      optSelectionFrame.checked = settings.selectionFrame !== false;
    }
    if (optRangeBadge) {
      optRangeBadge.checked = Boolean(settings.showRangeBadge);
    }
    if (optPauseTyping) {
      optPauseTyping.checked = Boolean(settings.pauseOnTyping);
    }
    if (optShortcuts) {
      optShortcuts.checked = settings.shortcutsEnabled !== false;
    }
    if (optMode) optMode.value = settings.mode || 'row_column';
    if (optStyleMode) optStyleMode.value = settings.styleMode || 'fill';
    if (optBorderWidth) optBorderWidth.value = settings.borderWidth || 2;
    if (optBorderStyle) optBorderStyle.value = settings.borderStyle || 'solid';
    if (optColor) optColor.value = settings.color || '#4285F4';
    if (optSeparateColors) {
      optSeparateColors.checked = Boolean(settings.useSeparateColors);
    }
    if (optColColor) optColColor.value = settings.colColor || '#10B981';
    if (optOpacity) {
      optOpacity.value =
        settings.opacity !== undefined ? settings.opacity : 0.25;
    }

    if (rowHexLabel) {
      rowHexLabel.textContent = (settings.color || '#4285F4').toUpperCase();
    }
    if (colHexLabel) {
      colHexLabel.textContent = (settings.colColor || '#10B981').toUpperCase();
    }
    if (opacityReadout) {
      const pct = Math.round(
        (settings.opacity !== undefined ? settings.opacity : 0.25) * 100
      );
      opacityReadout.textContent = `${pct}%`;
    }

    syncSegmentedButtons(
      settings.mode || 'row_column',
      settings.styleMode || 'fill'
    );
    renderLivePreview();
  }

  async function saveAll(label = '● SYNCED') {
    const updated = collectCurrentSettings();
    if (rowHexLabel) rowHexLabel.textContent = updated.color.toUpperCase();
    if (colHexLabel) colHexLabel.textContent = updated.colColor.toUpperCase();
    if (opacityReadout) {
      opacityReadout.textContent = `${Math.round(updated.opacity * 100)}%`;
    }
    renderLivePreview();
    await StorageManager.setSettings(updated);
    if (statusMsg) {
      statusMsg.textContent = label;
    }
  }

  buildPreviewGrid();
  const initialSettings = await StorageManager.getSettings();
  applySettingsToUI(initialSettings);

  // Mode segmented cards
  document.querySelectorAll('#mode-cards .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (optMode) optMode.value = btn.dataset.mode;
      if (optEnabled && btn.dataset.mode !== 'none') optEnabled.checked = true;
      syncSegmentedButtons(
        btn.dataset.mode,
        optStyleMode ? optStyleMode.value : 'fill'
      );
      saveAll();
    });
  });

  // Style segmented cards
  document.querySelectorAll('#style-cards .seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (optStyleMode) optStyleMode.value = btn.dataset.style;
      syncSegmentedButtons(
        optMode ? optMode.value : 'row_column',
        btn.dataset.style
      );
      saveAll();
    });
  });

  // Preset swatches
  document.querySelectorAll('.swatch-btn').forEach((sw) => {
    sw.addEventListener('click', () => {
      if (optColor) optColor.value = sw.dataset.color;
      saveAll();
    });
  });

  // Auto-save on any input change
  [
    optEnabled,
    optTransparentCell,
    optSelectionFrame,
    optRangeBadge,
    optPauseTyping,
    optShortcuts,
    optBorderWidth,
    optBorderStyle,
    optColor,
    optSeparateColors,
    optColColor,
    optOpacity
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener('input', () => saveAll());
    el.addEventListener('change', () => saveAll());
  });

  if (saveBtn) {
    saveBtn.addEventListener('click', () => saveAll('● SAVED'));
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const defaults = {
        mode: 'row_column',
        color: '#4285F4',
        useSeparateColors: false,
        colColor: '#10B981',
        opacity: 0.25,
        animation: true,
        enabled: true,
        keepActiveCellTransparent: true,
        highlightActiveCell: false,
        styleMode: 'fill',
        borderWidth: 2,
        borderStyle: 'solid',
        showRangeBadge: false,
        selectionFrame: true,
        pauseOnTyping: false,
        shortcutsEnabled: true
      };
      await StorageManager.setSettings(defaults);
      applySettingsToUI(defaults);
      if (statusMsg) statusMsg.textContent = '● RESET';
    });
  }
});