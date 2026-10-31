
class OverlayEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.clearBox = null;
  }

  init() {
    if (document.getElementById('gs-highlight-pro-canvas')) {
      this.canvas = document.getElementById('gs-highlight-pro-canvas');
      this.ctx = this.canvas.getContext('2d');
    } else {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'gs-highlight-pro-canvas';
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '9999';
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
    }

    // Dedicated color-dodge neutralizer element that cancels Google Sheets' native bluish selection fill
    if (document.getElementById('gs-highlight-pro-clear-box')) {
      this.clearBox = document.getElementById('gs-highlight-pro-clear-box');
    } else {
      this.clearBox = document.createElement('div');
      this.clearBox.id = 'gs-highlight-pro-clear-box';
      this.clearBox.style.position = 'fixed';
      this.clearBox.style.pointerEvents = 'none';
      this.clearBox.style.zIndex = '9998';
      this.clearBox.style.backgroundColor = 'rgb(28, 20, 5)';
      this.clearBox.style.mixBlendMode = 'color-dodge';
      this.clearBox.style.display = 'none';
      document.body.appendChild(this.clearBox);
    }

    this.resizeCanvas();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    if (
      this.canvas.width !== window.innerWidth ||
      this.canvas.height !== window.innerHeight
    ) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }

  clear() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    if (this.clearBox) {
      this.clearBox.style.display = 'none';
    }
    if (document.body && document.body.classList) {
      document.body.classList.remove('gshp-multi-select');
    }
  }

  render(cellRect, gridBounds, settings, meta = {}) {
    this.resizeCanvas();

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (
      !settings ||
      !settings.enabled ||
      settings.mode === 'none' ||
      !cellRect ||
      !gridBounds
    ) {
      this.clear();
      return;
    }

    if (settings.pauseOnTyping && meta.isEditing) {
      this.clear();
      return;
    }

    const gridTop = Math.round(gridBounds.top);
    const gridBottom = Math.round(gridBounds.bottom);
    const gridLeft = Math.round(gridBounds.left);
    const gridRight = Math.round(gridBounds.right);

    if (gridRight <= gridLeft || gridBottom <= gridTop) {
      this.clear();
      return;
    }

    if (meta.pinnedRect) {
      this.renderPinnedReference(
        meta.pinnedRect,
        { gridTop, gridBottom, gridLeft, gridRight },
        settings
      );
    }

    const rowColorHex = settings.color || '#4285F4';
    const colColorHex = settings.useSeparateColors
      ? settings.colColor || '#10B981'
      : rowColorHex;
    const opacity = settings.opacity !== undefined ? settings.opacity : 0.25;

    const rowFillColor = this.hexToRgba(rowColorHex, opacity);
    const colFillColor = this.hexToRgba(colColorHex, opacity);
    const rowStrokeColor = this.hexToRgba(
      rowColorHex,
      Math.min(1.0, opacity + 0.35)
    );
    const colStrokeColor = this.hexToRgba(
      colColorHex,
      Math.min(1.0, opacity + 0.35)
    );

    const rawRowHeight = cellRect.height < 10 ? 22 : cellRect.height;
    const rawColWidth = cellRect.width < 10 ? 100 : cellRect.width;

    const selLeft = Math.max(Math.floor(cellRect.left), gridLeft);
    const selRight = Math.min(
      Math.ceil(cellRect.left + rawColWidth),
      gridRight
    );
    const selTop = Math.max(Math.floor(cellRect.top), gridTop);
    const selBottom = Math.min(
      Math.ceil(cellRect.top + rawRowHeight),
      gridBottom
    );

    const selWidth = Math.max(0, selRight - selLeft);
    const selHeight = Math.max(0, selBottom - selTop);

    const keepTransparent =
      settings.keepActiveCellTransparent !== undefined
        ? Boolean(settings.keepActiveCellTransparent)
        : !settings.highlightActiveCell;

    // Neutralize Google Sheets' native light-blue multi-cell selection tint inside [selLeft..selRight, selTop..selBottom]
    if (this.clearBox) {
      if (keepTransparent && selWidth > 0 && selHeight > 0) {
        this.clearBox.style.left = `${selLeft}px`;
        this.clearBox.style.top = `${selTop}px`;
        this.clearBox.style.width = `${selWidth}px`;
        this.clearBox.style.height = `${selHeight}px`;
        this.clearBox.style.display = 'block';
      } else {
        this.clearBox.style.display = 'none';
      }
    }

    if (document.body && document.body.classList) {
      document.body.classList.toggle(
        'gshp-multi-select',
        Boolean(keepTransparent && meta.isMultiCell)
      );
    }

    const styleMode = settings.styleMode || 'fill';
    const borderWidth = settings.borderWidth || 2;
    const borderStyle = settings.borderStyle || 'solid';

    this.ctx.save();
    this.ctx.lineWidth = borderWidth;
    if (borderStyle === 'dashed') {
      this.ctx.setLineDash([8, 4]);
    } else if (borderStyle === 'dotted') {
      this.ctx.setLineDash([3, 3]);
    } else {
      this.ctx.setLineDash([]);
    }

    const showRow =
      settings.mode === 'row' || settings.mode === 'row_column';
    const showCol =
      settings.mode === 'column' || settings.mode === 'row_column';

    if (styleMode === 'spotlight') {
      const veilColor = `rgba(15, 23, 42, ${Math.min(0.65, Math.max(0.12, opacity))})`;
      this.ctx.fillStyle = veilColor;

      if (showRow && showCol) {
        if (selLeft > gridLeft && selTop > gridTop) {
          this.ctx.fillRect(
            gridLeft,
            gridTop,
            selLeft - gridLeft,
            selTop - gridTop
          );
        }
        if (gridRight > selRight && selTop > gridTop) {
          this.ctx.fillRect(
            selRight,
            gridTop,
            gridRight - selRight,
            selTop - gridTop
          );
        }
        if (selLeft > gridLeft && gridBottom > selBottom) {
          this.ctx.fillRect(
            gridLeft,
            selBottom,
            selLeft - gridLeft,
            gridBottom - selBottom
          );
        }
        if (gridRight > selRight && gridBottom > selBottom) {
          this.ctx.fillRect(
            selRight,
            selBottom,
            gridRight - selRight,
            gridBottom - selBottom
          );
        }
      } else if (showRow) {
        if (selTop > gridTop) {
          this.ctx.fillRect(
            gridLeft,
            gridTop,
            gridRight - gridLeft,
            selTop - gridTop
          );
        }
        if (gridBottom > selBottom) {
          this.ctx.fillRect(
            gridLeft,
            selBottom,
            gridRight - gridLeft,
            gridBottom - selBottom
          );
        }
      } else if (showCol) {
        if (selLeft > gridLeft) {
          this.ctx.fillRect(
            gridLeft,
            gridTop,
            selLeft - gridLeft,
            gridBottom - gridTop
          );
        }
        if (gridRight > selRight) {
          this.ctx.fillRect(
            selRight,
            gridTop,
            gridRight - selRight,
            gridBottom - gridTop
          );
        }
      }
    } else if (styleMode === 'fill') {
      if (keepTransparent) {
        // Row arms strictly outside [selLeft..selRight]
        if (showRow && selHeight > 0) {
          this.ctx.fillStyle = rowFillColor;
          if (selLeft > gridLeft) {
            this.ctx.fillRect(gridLeft, selTop, selLeft - gridLeft, selHeight);
          }
          if (gridRight > selRight) {
            this.ctx.fillRect(
              selRight,
              selTop,
              gridRight - selRight,
              selHeight
            );
          }
        }

        // Column arms strictly outside [selTop..selBottom]
        if (showCol && selWidth > 0) {
          this.ctx.fillStyle = colFillColor;
          if (selTop > gridTop) {
            this.ctx.fillRect(selLeft, gridTop, selWidth, selTop - gridTop);
          }
          if (gridBottom > selBottom) {
            this.ctx.fillRect(
              selLeft,
              selBottom,
              selWidth,
              gridBottom - selBottom
            );
          }
        }
      } else {
        if (showRow && selHeight > 0) {
          this.ctx.fillStyle = rowFillColor;
          this.ctx.fillRect(
            gridLeft,
            selTop,
            gridRight - gridLeft,
            selHeight
          );
        }
        if (showCol && selWidth > 0) {
          if (showRow && selHeight > 0) {
            this.ctx.clearRect(selLeft, selTop, selWidth, selHeight);
          }
          this.ctx.fillStyle = colFillColor;
          this.ctx.fillRect(
            selLeft,
            gridTop,
            selWidth,
            gridBottom - gridTop
          );
        }
      }
    } else {
      if (showRow && selHeight > 0) {
        this.ctx.strokeStyle = rowStrokeColor;
        if (keepTransparent) {
          if (selLeft > gridLeft) {
            this.ctx.strokeRect(
              gridLeft,
              selTop,
              selLeft - gridLeft,
              selHeight
            );
          }
          if (gridRight > selRight) {
            this.ctx.strokeRect(
              selRight,
              selTop,
              gridRight - selRight,
              selHeight
            );
          }
        } else {
          this.ctx.strokeRect(
            gridLeft,
            selTop,
            gridRight - gridLeft,
            selHeight
          );
        }
      }

      if (showCol && selWidth > 0) {
        this.ctx.strokeStyle = colStrokeColor;
        if (keepTransparent) {
          if (selTop > gridTop) {
            this.ctx.strokeRect(selLeft, gridTop, selWidth, selTop - gridTop);
          }
          if (gridBottom > selBottom) {
            this.ctx.strokeRect(
              selLeft,
              selBottom,
              selWidth,
              gridBottom - selBottom
            );
          }
        } else {
          this.ctx.strokeRect(
            selLeft,
            gridTop,
            selWidth,
            gridBottom - gridTop
          );
        }
      }
    }

    // Ensure canvas has zero pixels inside the selected cells
    if (keepTransparent && selWidth > 0 && selHeight > 0) {
      this.ctx.clearRect(selLeft, selTop, selWidth, selHeight);

      if (settings.selectionFrame !== false) {
        this.ctx.setLineDash([]);
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeStyle = rowStrokeColor;
        this.ctx.strokeRect(
          selLeft - 0.5,
          selTop - 0.5,
          selWidth + 1,
          selHeight + 1
        );
      }
    }

    this.ctx.restore();

    // Compact 1-word badge if enabled
    if (settings.showRangeBadge && meta.badgeText) {
      this.renderRangeBadge(
        meta.badgeText,
        { gridTop, gridBottom, gridLeft, gridRight },
        rowColorHex
      );
    }
  }

  renderPinnedReference(pinnedRect, grid, settings) {
    const { gridTop, gridBottom, gridLeft, gridRight } = grid;
    const pLeft = Math.max(Math.floor(pinnedRect.left), gridLeft);
    const pRight = Math.min(
      Math.ceil(pinnedRect.left + pinnedRect.width),
      gridRight
    );
    const pTop = Math.max(Math.floor(pinnedRect.top), gridTop);
    const pBottom = Math.min(
      Math.ceil(pinnedRect.top + pinnedRect.height),
      gridBottom
    );
    const pW = Math.max(0, pRight - pLeft);
    const pH = Math.max(0, pBottom - pTop);

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
    this.ctx.strokeStyle = 'rgba(217, 119, 6, 0.75)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([6, 4]);

    if (settings.mode === 'row' || settings.mode === 'row_column') {
      if (pH > 0) {
        if (pLeft > gridLeft) {
          this.ctx.fillRect(gridLeft, pTop, pLeft - gridLeft, pH);
        }
        if (gridRight > pRight) {
          this.ctx.fillRect(pRight, pTop, gridRight - pRight, pH);
        }
      }
    }

    if (settings.mode === 'column' || settings.mode === 'row_column') {
      if (pW > 0) {
        if (pTop > gridTop) {
          this.ctx.fillRect(pLeft, gridTop, pW, pTop - gridTop);
        }
        if (gridBottom > pBottom) {
          this.ctx.fillRect(pLeft, pBottom, pW, gridBottom - pBottom);
        }
      }
    }

    if (pW > 0 && pH > 0) {
      this.ctx.clearRect(pLeft, pTop, pW, pH);
    }
    this.ctx.restore();
  }

  renderRangeBadge(text, grid, accentHex) {
    this.ctx.save();
    this.ctx.font =
      '600 11px "Google Sans", Roboto, -apple-system, BlinkMacSystemFont, sans-serif';
    const paddingX = 8;
    const badgeHeight = 18;
    const textWidth = this.ctx.measureText(text).width;
    const badgeWidth = Math.ceil(textWidth + paddingX * 2 + 8);

    const badgeX = Math.max(
      grid.gridLeft + 12,
      grid.gridRight - badgeWidth - 20
    );
    const badgeY = grid.gridTop + 8;

    this.ctx.fillStyle = 'rgba(18, 18, 22, 0.9)';
    this.drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 9);
    this.ctx.fill();

    this.ctx.fillStyle = accentHex || '#4285F4';
    this.ctx.beginPath();
    this.ctx.arc(badgeX + 8, badgeY + badgeHeight / 2, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, badgeX + 15, badgeY + badgeHeight / 2 + 0.5);
    this.ctx.restore();
  }

  drawRoundedRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
  }

  hexToRgba(hex, alpha) {
    let c = (hex || '#4285F4').replace('#', '');
    if (c.length === 3) {
      c = c
        .split('')
        .map((char) => char + char)
        .join('');
    }
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}