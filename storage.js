/**
 * Storage Abstraction Layer using chrome.storage.sync
 */

const DEFAULT_SETTINGS = {
  mode: 'row_column',              // 'none', 'row', 'column', 'row_column'
  color: '#4285F4',                // Primary / Row highlight color
  useSeparateColors: false,        // Distinct color for Column vs Row
  colColor: '#10B981',             // Column highlight color when useSeparateColors is true
  opacity: 0.25,                   // Highlight opacity (0.05 to 0.75)
  animation: true,
  enabled: true,
  keepActiveCellTransparent: true, // Always keep selected cells 100% clear/transparent
  highlightActiveCell: false,
  styleMode: 'fill',               // 'fill', 'border', 'spotlight'
  borderWidth: 2,                  // 1, 2, 3, 4 pixels
  borderStyle: 'solid',            // 'solid', 'dashed', 'dotted'
  showRangeBadge: false,           // Off by default to avoid extra floating text
  selectionFrame: true,            // Clean outer border around the selected block
  pauseOnTyping: false,
  shortcutsEnabled: true
};

class StorageManager {
  static async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        if (items.keepActiveCellTransparent === undefined) {
          items.keepActiveCellTransparent = true;
        }
        resolve(items);
      });
    });
  }

  static async setSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set(settings, () => {
        resolve();
      });
    });
  }

  static onChange(callback) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        const updated = {};
        for (const [key, value] of Object.entries(changes)) {
          updated[key] = value.newValue;
        }
        callback(updated);
      }
    });
  }
}