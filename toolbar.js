/**
 * Google Sheets Dynamic Toolbar Injector
 * Uses pure inline SVG icons (encoding-safe) and concise 1-word labels.
 */

class ToolbarInjector {
  constructor(onSettingsChange, onPinToggle = null) {
    this.onSettingsChange = onSettingsChange;
    this.onPinToggle = onPinToggle;
    this.dropdownOpen = false;
  }

  inject(currentSettings) {
    if (document.getElementById('gs-highlight-pro-btn')) return;

    const targetContainer =
      document.querySelector('#docs-toolbar') ||
      document.querySelector('[role="toolbar"]') ||
      document.querySelector('#docs-menubar');

    if (!targetContainer) return;

    const btnWrapper = document.createElement('div');
    btnWrapper.id = 'gs-highlight-pro-btn';
    btnWrapper.className = 'goog-inline-block';
    btnWrapper.innerHTML = `
      <div class="gshp-toolbar-button" id="gshp-main-button" title="DeepHighlight Pro (Alt+H)">
        <svg class="gshp-svg-icon" width="14" height="14" viewBox="30 20 570 590" fill="none" stroke="#38bdf8" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
            <path d="M 247,103 C 204,108 143,104 107,137 C 118,125 153,123 271,148 L 300,163 Z" />
            <path d="M 244.0,358.0 C 172.1,418.6 98.3,492.5 80.0,589.0 C 109.0,502.3 199.0,457.0 270.0,409.0 Z M 545.0,252.0 C 493.6,376.0 421.8,493.3 325.0,587.0 C 427.1,499.6 525.4,390.7 545.0,252.0 Z M 247.0,103.0 C 206.8,64.2 117.7,74.1 107.0,137.0 C 129.9,73.6 201.1,123.7 247.0,103.0 Z" />
            <path d="M 363,374 L 337,398 L 384,518 Z M 401,310 L 384,354 L 421,407 Z M 271,300 L 250,355 L 280,403 L 332,380 Z M 417,255 L 403,303 L 474,339 L 451,283 Z M 284,242 L 280,281 L 330,370 L 308,283 Z M 483,231 L 523,261 L 546,238 Z M 359,228 L 366,356 L 391,287 Z M 457,227 L 454,260 L 509,269 Z M 394,188 L 378,221 L 436,253 Z M 403,181 L 451,215 L 490,214 Z M 434,172 L 553,218 L 547,206 L 480,167 Z M 281,147 L 360,208 L 311,149 Z M 170,128 L 208,149 L 278,234 L 291,232 L 290,239 L 339,318 L 315,241 L 301,226 L 293,230 L 287,211 L 242,174 L 245,167 L 278,156 Z M 392,133 L 540,163 L 449,123 Z M 385,107 L 335,133 L 256,109 L 265,135 L 297,131 L 341,137 Z M 365,95 L 388,105 L 511,110 L 427,81 Z M 227,56 L 191,78 L 225,77 Z M 364,79 L 340,50 L 261,100 L 316,77 Z M 388,47 L 477,73 Z M 269,45 L 230,55 L 251,96 Z" />
            <path d="M 363,99 L 348,90 L 320,96 L 303,111 L 319,122 L 338,123 L 352,117 Z" fill="#38bdf8" stroke="none" />
            <ellipse cx="334" cy="110" rx="12" ry="10" fill="#000000" stroke="none" />
          </svg>
        <span class="gshp-label">DeepHighlight</span>
        <svg class="gshp-svg-caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
      <div class="gshp-dropdown-menu" id="gshp-dropdown" style="display: none;">
        <div class="gshp-menu-header">01 / MODE</div>
        <div class="gshp-mode-grid">
          <button class="gshp-menu-item" data-mode="row_column">Both</button>
          <button class="gshp-menu-item" data-mode="row">Row</button>
          <button class="gshp-menu-item" data-mode="column">Column</button>
          <button class="gshp-menu-item" data-mode="none">Off</button>
        </div>

        <div class="gshp-divider"></div>
        <div class="gshp-menu-header">02 / STYLE</div>
        <div class="gshp-style-pills">
          <button class="gshp-pill-btn" data-style="fill">Fill</button>
          <button class="gshp-pill-btn" data-style="border">Border</button>
          <button class="gshp-pill-btn" data-style="spotlight">Focus</button>
        </div>

        <div class="gshp-divider"></div>
        <div class="gshp-menu-section">
          <label>03 / COLOR</label>
          <div class="gshp-color-grid">
            <button class="gshp-color-btn" title="Blue" data-color="#4285F4" style="background:#4285F4"></button>
            <button class="gshp-color-btn" title="Emerald" data-color="#10B981" style="background:#10B981"></button>
            <button class="gshp-color-btn" title="Amber" data-color="#F59E0B" style="background:#F59E0B"></button>
            <button class="gshp-color-btn" title="Ruby" data-color="#EF4444" style="background:#EF4444"></button>
            <button class="gshp-color-btn" title="Indigo" data-color="#6366F1" style="background:#6366F1"></button>
            <button class="gshp-color-btn" title="Slate" data-color="#475569" style="background:#475569"></button>
            <input type="color" id="gshp-custom-color" title="Custom" value="${currentSettings.color || '#4285F4'}">
          </div>
        </div>

        <div class="gshp-menu-section">
          <label>04 / OPACITY</label>
          <input type="range" id="gshp-opacity" min="0.05" max="0.75" step="0.05" value="${currentSettings.opacity !== undefined ? currentSettings.opacity : 0.25}">
        </div>

        <div class="gshp-divider"></div>
        <div class="gshp-menu-section gshp-toggles">
          <label class="gshp-check-row">
            <span>Clear</span>
            <input type="checkbox" id="gshp-transparent-cell" ${currentSettings.keepActiveCellTransparent !== false ? 'checked' : ''}>
          </label>
          <label class="gshp-check-row">
            <span>Dual</span>
            <input type="checkbox" id="gshp-dual-color" ${currentSettings.useSeparateColors ? 'checked' : ''}>
          </label>
          <label class="gshp-check-row">
            <span>Badge</span>
            <input type="checkbox" id="gshp-range-badge" ${currentSettings.showRangeBadge ? 'checked' : ''}>
          </label>
        </div>

        <div class="gshp-divider"></div>
        <div class="gshp-bottom-actions">
          <button class="gshp-action-btn gshp-pin-btn" id="gshp-pin-btn">Pin</button>
          <button class="gshp-action-btn gshp-reset-btn" id="gshp-reset-btn">Reset</button>
        </div>
      </div>
    `;

    targetContainer.appendChild(btnWrapper);
    this.bindEvents();
    this.updateActiveState(currentSettings);
  }

  bindEvents() {
    const mainBtn = document.getElementById('gshp-main-button');
    const dropdown = document.getElementById('gshp-dropdown');

    if (!mainBtn || !dropdown) return;

    mainBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dropdownOpen = !this.dropdownOpen;
      dropdown.style.display = this.dropdownOpen ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#gs-highlight-pro-btn')) {
        this.dropdownOpen = false;
        dropdown.style.display = 'none';
      }
    });

    dropdown.querySelectorAll('.gshp-menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const mode = item.getAttribute('data-mode');
        this.onSettingsChange({ mode, enabled: mode !== 'none' });
      });
    });

    dropdown.querySelectorAll('.gshp-pill-btn').forEach((pill) => {
      pill.addEventListener('click', () => {
        const styleMode = pill.getAttribute('data-style');
        this.onSettingsChange({ styleMode });
      });
    });

    dropdown.querySelectorAll('.gshp-color-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        const customInput = document.getElementById('gshp-custom-color');
        if (customInput) customInput.value = color;
        this.onSettingsChange({ color });
      });
    });

    const customColorInput = document.getElementById('gshp-custom-color');
    if (customColorInput) {
      customColorInput.addEventListener('input', (e) => {
        this.onSettingsChange({ color: e.target.value });
      });
    }

    const opacityInput = document.getElementById('gshp-opacity');
    if (opacityInput) {
      opacityInput.addEventListener('input', (e) => {
        this.onSettingsChange({ opacity: parseFloat(e.target.value) });
      });
    }

    const transparentCheck = document.getElementById('gshp-transparent-cell');
    if (transparentCheck) {
      transparentCheck.addEventListener('change', (e) => {
        this.onSettingsChange({
          keepActiveCellTransparent: e.target.checked,
          highlightActiveCell: !e.target.checked
        });
      });
    }

    const badgeCheck = document.getElementById('gshp-range-badge');
    if (badgeCheck) {
      badgeCheck.addEventListener('change', (e) => {
        this.onSettingsChange({ showRangeBadge: e.target.checked });
      });
    }

    const dualColorCheck = document.getElementById('gshp-dual-color');
    if (dualColorCheck) {
      dualColorCheck.addEventListener('change', (e) => {
        this.onSettingsChange({ useSeparateColors: e.target.checked });
      });
    }

    const pinBtn = document.getElementById('gshp-pin-btn');
    if (pinBtn) {
      pinBtn.addEventListener('click', () => {
        if (typeof this.onPinToggle === 'function') {
          const isPinned = this.onPinToggle();
          pinBtn.textContent = isPinned ? 'Unpin' : 'Pin';
          pinBtn.classList.toggle('active', isPinned);
        }
      });
    }

    const resetBtn = document.getElementById('gshp-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.onSettingsChange({
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
        });
      });
    }
  }

  updateActiveState(settings) {
    const dropdown = document.getElementById('gshp-dropdown');
    if (!dropdown) return;

    dropdown.querySelectorAll('.gshp-menu-item').forEach((item) => {
      if (item.getAttribute('data-mode') === settings.mode) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    dropdown.querySelectorAll('.gshp-pill-btn').forEach((pill) => {
      if (pill.getAttribute('data-style') === (settings.styleMode || 'fill')) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });

    const transparentCheck = document.getElementById('gshp-transparent-cell');
    if (transparentCheck) {
      transparentCheck.checked = settings.keepActiveCellTransparent !== false;
    }

    const badgeCheck = document.getElementById('gshp-range-badge');
    if (badgeCheck) {
      badgeCheck.checked = Boolean(settings.showRangeBadge);
    }

    const dualColorCheck = document.getElementById('gshp-dual-color');
    if (dualColorCheck) {
      dualColorCheck.checked = Boolean(settings.useSeparateColors);
    }
  }
}