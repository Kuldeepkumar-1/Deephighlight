/**
 * Google Sheets DeepHighlight Pro - Background Service Worker
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set({
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
  } else if (details.reason === 'update') {
    chrome.storage.sync.set({
      keepActiveCellTransparent: true,
      highlightActiveCell: false,
      showRangeBadge: false
    });
  }
});