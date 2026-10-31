/**
 * Extension Popup Page Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const enableToggle = document.getElementById('enable-toggle');
  const transparentToggle = document.getElementById('transparent-toggle');
  const badgeToggle = document.getElementById('badge-toggle');
  const modeSelect = document.getElementById('mode-select');
  const styleSelect = document.getElementById('style-select');
  const colorPicker = document.getElementById('color-picker');
  const opacitySlider = document.getElementById('opacity-slider');
  const optionsBtn = document.getElementById('options-btn');
  const resetBtn = document.getElementById('reset-btn');

  const settings = await StorageManager.getSettings();

  enableToggle.checked = Boolean(settings.enabled);
  if (transparentToggle) {
    transparentToggle.checked = settings.keepActiveCellTransparent !== false;
  }
  if (badgeToggle) {
    badgeToggle.checked = Boolean(settings.showRangeBadge);
  }
  modeSelect.value = settings.mode || 'row_column';
  if (styleSelect) {
    styleSelect.value = settings.styleMode || 'fill';
  }
  colorPicker.value = settings.color || '#4285F4';
  opacitySlider.value = settings.opacity !== undefined ? settings.opacity : 0.25;

  enableToggle.addEventListener('change', (e) => {
    StorageManager.setSettings({ enabled: e.target.checked });
  });

  if (transparentToggle) {
    transparentToggle.addEventListener('change', (e) => {
      StorageManager.setSettings({
        keepActiveCellTransparent: e.target.checked,
        highlightActiveCell: !e.target.checked
      });
    });
  }

  if (badgeToggle) {
    badgeToggle.addEventListener('change', (e) => {
      StorageManager.setSettings({ showRangeBadge: e.target.checked });
    });
  }

  modeSelect.addEventListener('change', (e) => {
    StorageManager.setSettings({ mode: e.target.value });
  });

  if (styleSelect) {
    styleSelect.addEventListener('change', (e) => {
      StorageManager.setSettings({ styleMode: e.target.value });
    });
  }

  colorPicker.addEventListener('input', (e) => {
    StorageManager.setSettings({ color: e.target.value });
  });

  opacitySlider.addEventListener('input', (e) => {
    StorageManager.setSettings({ opacity: parseFloat(e.target.value) });
  });

  optionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });

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
    enableToggle.checked = defaults.enabled;
    if (transparentToggle) transparentToggle.checked = true;
    if (badgeToggle) badgeToggle.checked = false;
    modeSelect.value = defaults.mode;
    if (styleSelect) styleSelect.value = defaults.styleMode;
    colorPicker.value = defaults.color;
    opacitySlider.value = defaults.opacity;
  });
});