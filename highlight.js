/**
 * Active Cell & Multi-Cell Selection Range Detection Engine
 */

class HighlightManager {
  constructor(overlayEngine, onSettingsUpdateCallback = null) {
    this.overlay = overlayEngine;
    this.onSettingsUpdateCallback = onSettingsUpdateCallback;
    this.settings = {};

    this.anchorCell = null;
    this.pinnedRect = null;
    this.pinnedLabel = null;

    this.isDragging = false;
    this.hasActiveDragSelection = false;
    this.dragCurrentX = null;
    this.dragCurrentY = null;
    this.lastDragSpan = {
      colsLeft: 0,
      colsRight: 0,
      rowsAbove: 0,
      rowsBelow: 0
    };

    this.initSelectionTracking();
  }

  initSelectionTracking() {
    document.addEventListener(
      'mousedown',
      (e) => {
        if (e.button !== 0) return;
        if (this.isUIControlEvent(e)) return;

        const gridBounds = this.getGridBoundingBox();
        if (!this.isPointInRect(e.clientX, e.clientY, gridBounds)) {
          return;
        }

        this.isDragging = true;
        this.dragCurrentX = e.clientX;
        this.dragCurrentY = e.clientY;

        if (e.shiftKey) {
          this.hasActiveDragSelection = true;
          this.updateDragSpanFromPoint(e.clientX, e.clientY);
        } else {
          this.hasActiveDragSelection = false;
          this.resetDragSpan();
        }
      },
      true
    );

    document.addEventListener(
      'mousemove',
      (e) => {
        if (!this.isDragging) return;

        this.dragCurrentX = e.clientX;
        this.dragCurrentY = e.clientY;

        const activeRect = this.getSingleActiveCellRect();
        if (activeRect) {
          const outsideActive =
            e.clientX < activeRect.left - 2 ||
            e.clientX > activeRect.right + 2 ||
            e.clientY < activeRect.top - 2 ||
            e.clientY > activeRect.bottom + 2;

          if (outsideActive || this.hasActiveDragSelection) {
            this.hasActiveDragSelection = true;
            this.updateDragSpanFromPoint(e.clientX, e.clientY, activeRect);
            this.refresh();
          }
        }
      },
      true
    );

    document.addEventListener(
      'mouseup',
      (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.dragCurrentX = e.clientX;
        this.dragCurrentY = e.clientY;

        if (this.hasActiveDragSelection) {
          this.updateDragSpanFromPoint(e.clientX, e.clientY);
        }
        this.refresh();
      },
      true
    );

    document.addEventListener(
      'keydown',
      (e) => {
        if (
          this.settings.shortcutsEnabled !== false &&
          e.altKey &&
          !e.ctrlKey &&
          !e.metaKey
        ) {
          const code = (e.code || '').toLowerCase();
          const key = (e.key || '').toLowerCase();

          if (key === 'h' || code === 'keyh') {
            e.preventDefault();
            this.emitSettingChange({ enabled: !this.settings.enabled });
            return;
          }
          if (key === 'm' || code === 'keym') {
            e.preventDefault();
            const modes = ['row_column', 'row', 'column', 'none'];
            const idx = modes.indexOf(this.settings.mode || 'row_column');
            const nextMode = modes[(idx + 1) % modes.length];
            this.emitSettingChange({ mode: nextMode, enabled: true });
            return;
          }
          if (key === 's' || code === 'keys') {
            e.preventDefault();
            const styles = ['fill', 'border', 'spotlight'];
            const idx = styles.indexOf(this.settings.styleMode || 'fill');
            const nextStyle = styles[(idx + 1) % styles.length];
            this.emitSettingChange({ styleMode: nextStyle });
            return;
          }
          if (key === 'p' || code === 'keyp') {
            e.preventDefault();
            this.togglePinSelection();
            return;
          }
        }

        const navKeys = [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'PageUp',
          'PageDown',
          'Home',
          'End'
        ];

        if (navKeys.includes(e.key)) {
          if (e.shiftKey) {
            this.hasActiveDragSelection = true;
            this.updateSpanFromShiftArrow(e.key);
          } else {
            this.hasActiveDragSelection = false;
            this.resetDragSpan();
          }
        } else if (e.key === 'Escape') {
          this.hasActiveDragSelection = false;
          this.resetDragSpan();
        }
      },
      true
    );
  }

  emitSettingChange(partialSettings) {
    this.updateSettings(partialSettings);
    if (typeof this.onSettingsUpdateCallback === 'function') {
      this.onSettingsUpdateCallback(partialSettings);
    } else if (typeof StorageManager !== 'undefined') {
      StorageManager.setSettings(partialSettings);
    }
  }

  togglePinSelection() {
    if (this.pinnedRect) {
      this.pinnedRect = null;
      this.pinnedLabel = null;
    } else {
      const currentRect = this.getActiveCellBoundingBox();
      if (currentRect) {
        this.pinnedRect = { ...currentRect };
        const parsed = this.parseNameBoxSelection();
        this.pinnedLabel = parsed && parsed.raw ? parsed.raw : 'Pin';
      }
    }
    this.refresh();
    return Boolean(this.pinnedRect);
  }

  hasPin() {
    return Boolean(this.pinnedRect);
  }

  isUIControlEvent(e) {
    if (!e.target || typeof e.target.closest !== 'function') return false;
    return Boolean(
      e.target.closest(
        '#gs-highlight-pro-btn, #docs-chrome, #docs-toolbar-wrapper, #docs-menubar, #formula-bar, .waffle-name-box-container'
      )
    );
  }

  isPointInRect(x, y, rect) {
    if (!rect) return false;
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }

  resetDragSpan() {
    this.lastDragSpan = {
      colsLeft: 0,
      colsRight: 0,
      rowsAbove: 0,
      rowsBelow: 0
    };
  }

  updateDragSpanFromPoint(clientX, clientY, providedActiveRect = null) {
    const activeRect = providedActiveRect || this.getSingleActiveCellRect();
    if (!activeRect) return;

    const cellW = Math.max(activeRect.width, 20);
    const cellH = Math.max(activeRect.height < 10 ? 22 : activeRect.height, 16);

    let colsLeft = 0;
    let colsRight = 0;
    let rowsAbove = 0;
    let rowsBelow = 0;

    if (clientX > activeRect.right + 2) {
      colsRight = Math.ceil((clientX - activeRect.right) / cellW);
    } else if (clientX < activeRect.left - 2) {
      colsLeft = Math.ceil((activeRect.left - clientX) / cellW);
    }

    if (clientY > activeRect.bottom + 2) {
      rowsBelow = Math.ceil((clientY - activeRect.bottom) / cellH);
    } else if (clientY < activeRect.top - 2) {
      rowsAbove = Math.ceil((activeRect.top - clientY) / cellH);
    }

    this.lastDragSpan = { colsLeft, colsRight, rowsAbove, rowsBelow };
  }

  updateSpanFromShiftArrow(key) {
    const s = { ...this.lastDragSpan };
    if (key === 'ArrowRight') {
      if (s.colsLeft > 0) s.colsLeft--;
      else s.colsRight++;
    } else if (key === 'ArrowLeft') {
      if (s.colsRight > 0) s.colsRight--;
      else s.colsLeft++;
    } else if (key === 'ArrowDown') {
      if (s.rowsAbove > 0) s.rowsAbove--;
      else s.rowsBelow++;
    } else if (key === 'ArrowUp') {
      if (s.rowsBelow > 0) s.rowsBelow--;
      else s.rowsAbove++;
    }
    this.lastDragSpan = s;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.refresh();
  }

  refresh() {
    if (!this.settings.enabled || this.settings.mode === 'none') {
      this.overlay.clear();
      return;
    }

    const selectionRect = this.getActiveCellBoundingBox();
    const gridBounds = this.getGridBoundingBox();

    if (selectionRect && gridBounds) {
      const meta = this.getSelectionMetadata();
      this.overlay.render(selectionRect, gridBounds, this.settings, meta);
    } else {
      this.overlay.clear();
    }
  }

  /**
   * Builds concise 1-word metadata for the HUD badge, multi-cell state, and pinned reference.
   */
  getSelectionMetadata() {
    const parsed = this.parseNameBoxSelection();
    const rows =
      1 +
      (this.lastDragSpan.rowsAbove || 0) +
      (this.lastDragSpan.rowsBelow || 0);
    const cols =
      1 +
      (this.lastDragSpan.colsLeft || 0) +
      (this.lastDragSpan.colsRight || 0);

    let isMultiCell = rows > 1 || cols > 1;
    let badgeText = '';

    if (parsed) {
      if (parsed.type === 'single' && !this.hasActiveDragSelection) {
        badgeText = parsed.raw;
        isMultiCell = false;
      } else if (parsed.type === 'dimensions') {
        badgeText = `${parsed.rows}\u00D7${parsed.cols}`;
        isMultiCell = parsed.rows > 1 || parsed.cols > 1;
      } else if (parsed.type === 'range') {
        badgeText = parsed.raw;
        isMultiCell = true;
      } else if (parsed.type === 'rows' || parsed.type === 'cols') {
        badgeText = parsed.raw;
        isMultiCell = true;
      }
    } else if (rows > 1 || cols > 1) {
      badgeText = `${rows}\u00D7${cols}`;
    }

    return {
      badgeText,
      isMultiCell,
      pinnedRect: this.pinnedRect,
      isEditing: this.isEditingCell()
    };
  }

  isEditingCell() {
    const gridEditor = document.querySelector(
      '#waffle-rich-text-editor, .waffle-Grid-container .cell-input'
    );
    if (!gridEditor) return false;
    const activeEl = document.activeElement;
    if (activeEl && gridEditor.contains(activeEl)) {
      return (gridEditor.textContent || '').trim().length > 0;
    }
    return false;
  }

  getActiveCellBoundingBox() {
    const selectedGridCells = document.querySelectorAll(
      '[role="gridcell"][aria-selected="true"], td.selected, .cell-selected'
    );
    if (selectedGridCells.length > 1) {
      const union = this.computeUnionRect(Array.from(selectedGridCells));
      if (union) return union;
    }

    const activeRect = this.getSingleActiveCellRect();
    if (!activeRect) return null;

    const cellW = Math.max(activeRect.width, 20);
    const cellH = Math.max(activeRect.height < 10 ? 22 : activeRect.height, 16);
    const normalizedActiveRect = {
      top: activeRect.top,
      left: activeRect.left,
      right: activeRect.left + cellW,
      bottom: activeRect.top + cellH,
      width: cellW,
      height: cellH
    };

    const nameBoxRange = this.parseNameBoxSelection();

    if (nameBoxRange) {
      if (nameBoxRange.type === 'single') {
        this.anchorCell = {
          col: nameBoxRange.col,
          row: nameBoxRange.row
        };

        if (this.isDragging && this.hasActiveDragSelection) {
          return this.applySpanToRect(normalizedActiveRect, this.lastDragSpan);
        }

        this.resetDragSpan();
        return normalizedActiveRect;
      }

      if (nameBoxRange.type === 'dimensions') {
        const rowCount = Math.max(1, nameBoxRange.rows);
        const colCount = Math.max(1, nameBoxRange.cols);

        const dragLeft =
          this.dragCurrentX !== null &&
          this.dragCurrentX < normalizedActiveRect.left - 2;
        const dragUp =
          this.dragCurrentY !== null &&
          this.dragCurrentY < normalizedActiveRect.top - 2;

        const span = {
          colsLeft: dragLeft ? colCount - 1 : 0,
          colsRight: dragLeft ? 0 : colCount - 1,
          rowsAbove: dragUp ? rowCount - 1 : 0,
          rowsBelow: dragUp ? 0 : rowCount - 1
        };
        this.lastDragSpan = span;
        this.hasActiveDragSelection = true;

        return this.applySpanToRect(normalizedActiveRect, span);
      }

      if (nameBoxRange.type === 'range') {
        const { minCol, maxCol, minRow, maxRow } = nameBoxRange;

        let anchorCol = minCol;
        let anchorRow = minRow;

        if (
          this.anchorCell &&
          this.anchorCell.col >= minCol &&
          this.anchorCell.col <= maxCol &&
          this.anchorCell.row >= minRow &&
          this.anchorCell.row <= maxRow
        ) {
          anchorCol = this.anchorCell.col;
          anchorRow = this.anchorCell.row;
        }

        const span = {
          colsLeft: Math.max(0, anchorCol - minCol),
          colsRight: Math.max(0, maxCol - anchorCol),
          rowsAbove: Math.max(0, anchorRow - minRow),
          rowsBelow: Math.max(0, maxRow - anchorRow)
        };

        this.lastDragSpan = span;
        this.hasActiveDragSelection =
          span.colsLeft > 0 ||
          span.colsRight > 0 ||
          span.rowsAbove > 0 ||
          span.rowsBelow > 0;

        return this.applySpanToRect(normalizedActiveRect, span, true);
      }

      if (nameBoxRange.type === 'rows') {
        const { minRow, maxRow } = nameBoxRange;
        const anchorRow =
          this.anchorCell &&
          this.anchorCell.row >= minRow &&
          this.anchorCell.row <= maxRow
            ? this.anchorCell.row
            : minRow;

        const gridBounds = this.getGridBoundingBox();
        const span = {
          colsLeft: 0,
          colsRight: 0,
          rowsAbove: Math.max(0, anchorRow - minRow),
          rowsBelow: Math.max(0, maxRow - anchorRow)
        };
        this.lastDragSpan = span;
        const rect = this.applySpanToRect(normalizedActiveRect, span, true);
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: gridBounds.left,
          right: gridBounds.right,
          width: gridBounds.right - gridBounds.left,
          height: rect.bottom - rect.top
        };
      }

      if (nameBoxRange.type === 'cols') {
        const { minCol, maxCol } = nameBoxRange;
        const anchorCol =
          this.anchorCell &&
          this.anchorCell.col >= minCol &&
          this.anchorCell.col <= maxCol
            ? this.anchorCell.col
            : minCol;

        const gridBounds = this.getGridBoundingBox();
        const span = {
          colsLeft: Math.max(0, anchorCol - minCol),
          colsRight: Math.max(0, maxCol - anchorCol),
          rowsAbove: 0,
          rowsBelow: 0
        };
        this.lastDragSpan = span;
        const rect = this.applySpanToRect(normalizedActiveRect, span, true);
        return {
          top: gridBounds.top,
          bottom: gridBounds.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.right - rect.left,
          height: gridBounds.bottom - gridBounds.top
        };
      }
    }

    if (this.hasActiveDragSelection) {
      return this.applySpanToRect(
        normalizedActiveRect,
        this.lastDragSpan,
        !this.isDragging
      );
    }

    return normalizedActiveRect;
  }

  applySpanToRect(activeRect, span, allowHandleRefinement = false) {
    const cellW = activeRect.width;
    const cellH = activeRect.height;

    const left = activeRect.left - span.colsLeft * cellW;
    let right = activeRect.right + span.colsRight * cellW;
    const top = activeRect.top - span.rowsAbove * cellH;
    let bottom = activeRect.bottom + span.rowsBelow * cellH;

    if (allowHandleRefinement && (span.colsRight > 0 || span.rowsBelow > 0)) {
      const handleRect = this.getAutofillHandleRect();
      if (handleRect) {
        const handleCenterX = handleRect.left + handleRect.width / 2;
        const handleCenterY = handleRect.top + handleRect.height / 2;

        if (span.colsRight > 0 && handleCenterX > activeRect.right + 4) {
          right = handleCenterX;
        }
        if (span.rowsBelow > 0 && handleCenterY > activeRect.bottom + 4) {
          bottom = handleCenterY;
        }
      }
    }

    return {
      top,
      left,
      right,
      bottom,
      width: Math.max(right - left, cellW),
      height: Math.max(bottom - top, cellH)
    };
  }

  getSingleActiveCellRect() {
    const borderNodes = document.querySelectorAll(
      '.grid-active-cell-highlight, .active-cell-border'
    );
    if (borderNodes.length > 0) {
      const rects = [];
      let firstRect = null;
      let firstParent = null;

      for (const node of borderNodes) {
        const r = node.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.top > 0 && r.left > 0) {
          if (!firstRect) {
            firstRect = r;
            firstParent = node.parentElement;
            rects.push(r);
          } else if (
            node.parentElement === firstParent ||
            (Math.abs(r.left - firstRect.left) <= 500 &&
              Math.abs(r.top - firstRect.top) <= 500)
          ) {
            rects.push(r);
          }
        }
      }

      if (rects.length > 0) {
        const minLeft = Math.min(...rects.map((r) => r.left));
        const minTop = Math.min(...rects.map((r) => r.top));
        const maxRight = Math.max(...rects.map((r) => r.right));
        const maxBottom = Math.max(...rects.map((r) => r.bottom));

        const width = Math.max(maxRight - minLeft, 20);
        let height = maxBottom - minTop;

        if (height < 10) {
          height = 22;
        }

        return {
          top: minTop,
          left: minLeft,
          right: minLeft + width,
          bottom: minTop + height,
          width,
          height
        };
      }
    }

    const selectedCell = document.querySelector(
      '[role="gridcell"][aria-selected="true"]'
    );
    if (selectedCell) {
      const r = selectedCell.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return r;
    }

    const gridInputs = document.querySelectorAll('.input-box, .cell-input');
    for (const el of gridInputs) {
      if (typeof el.closest === 'function' && el.closest('#formula-bar')) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        return r;
      }
    }

    return null;
  }

  getAutofillHandleRect() {
    const handle = document.querySelector(
      '#waffle-grid-container .autofill-handle, #waffle-grid-container .autofill-cover, .autofill-handle, .autofill-cover'
    );
    if (!handle) return null;
    const rect = handle.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return rect;
    }
    return null;
  }

  computeUnionRect(elements) {
    const rects = elements
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);

    if (rects.length === 0) return null;

    const top = Math.min(...rects.map((r) => r.top));
    const left = Math.min(...rects.map((r) => r.left));
    const right = Math.max(...rects.map((r) => r.right));
    const bottom = Math.max(...rects.map((r) => r.bottom));

    return {
      top,
      left,
      right,
      bottom,
      width: right - left,
      height: bottom - top
    };
  }

  parseNameBoxSelection() {
    const nameBox =
      document.getElementById('t-name-box') ||
      document.querySelector('input.waffle-name-box') ||
      document.querySelector('#t-name-box-input') ||
      document.querySelector('[aria-label="Name box"], [aria-label="Name Box"]');

    if (!nameBox || !nameBox.value) return null;

    let raw = nameBox.value.trim();
    if (!raw) return null;

    if (raw.includes(',')) {
      const parts = raw.split(',');
      raw = parts[parts.length - 1].trim();
    }

    if (raw.includes('!')) {
      raw = raw.split('!').pop().trim();
    }

    const dimMatch = raw.match(/^(\d+)\s*R\s*[x×X]\s*(\d+)\s*C$/i);
    if (dimMatch) {
      return {
        type: 'dimensions',
        raw,
        rows: parseInt(dimMatch[1], 10),
        cols: parseInt(dimMatch[2], 10)
      };
    }

    const rangeMatch = raw.match(
      /^\$?([A-Za-z]+)\$?(\d+)\s*:\s*\$?([A-Za-z]+)\$?(\d+)$/
    );
    if (rangeMatch) {
      const col1 = this.columnLettersToIndex(rangeMatch[1]);
      const row1 = parseInt(rangeMatch[2], 10);
      const col2 = this.columnLettersToIndex(rangeMatch[3]);
      const row2 = parseInt(rangeMatch[4], 10);

      const minCol = Math.min(col1, col2);
      const maxCol = Math.max(col1, col2);
      const minRow = Math.min(row1, row2);
      const maxRow = Math.max(row1, row2);

      if (minCol === maxCol && minRow === maxRow) {
        return { type: 'single', raw, col: minCol, row: minRow };
      }

      return {
        type: 'range',
        raw: `${rangeMatch[1].toUpperCase()}${row1}:${rangeMatch[3].toUpperCase()}${row2}`,
        minCol,
        maxCol,
        minRow,
        maxRow
      };
    }

    const singleMatch = raw.match(/^\$?([A-Za-z]+)\$?(\d+)$/);
    if (singleMatch) {
      return {
        type: 'single',
        raw: `${singleMatch[1].toUpperCase()}${singleMatch[2]}`,
        col: this.columnLettersToIndex(singleMatch[1]),
        row: parseInt(singleMatch[2], 10)
      };
    }

    const rowRangeMatch = raw.match(/^\$?(\d+)\s*:\s*\$?(\d+)$/);
    if (rowRangeMatch) {
      const r1 = parseInt(rowRangeMatch[1], 10);
      const r2 = parseInt(rowRangeMatch[2], 10);
      return {
        type: 'rows',
        raw: `${Math.min(r1, r2)}:${Math.max(r1, r2)}`,
        minRow: Math.min(r1, r2),
        maxRow: Math.max(r1, r2)
      };
    }

    const colRangeMatch = raw.match(/^\$?([A-Za-z]+)\s*:\s*\$?([A-Za-z]+)$/);
    if (colRangeMatch) {
      const c1 = this.columnLettersToIndex(colRangeMatch[1]);
      const c2 = this.columnLettersToIndex(colRangeMatch[2]);
      return {
        type: 'cols',
        raw: `${colRangeMatch[1].toUpperCase()}:${colRangeMatch[2].toUpperCase()}`,
        minCol: Math.min(c1, c2),
        maxCol: Math.max(c1, c2)
      };
    }

    return null;
  }

  columnLettersToIndex(letters) {
    const clean = letters.toUpperCase();
    let index = 0;
    for (let i = 0; i < clean.length; i++) {
      index = index * 26 + (clean.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  getGridBoundingBox() {
    const gridContainer =
      document.querySelector('.grid-scrollable-wrapper') ||
      document.querySelector('#waffle-grid-container') ||
      document.querySelector('#grid-table') ||
      document.querySelector('.docs-sheet-container');
    if (gridContainer) {
      return gridContainer.getBoundingClientRect();
    }

    return {
      top: 0,
      left: 0,
      right: window.innerWidth,
      bottom: window.innerHeight
    };
  }
}