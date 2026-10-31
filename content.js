/**
 * Main Content Script Controller Initialization (Corporate Edition)
 */

(async function () {
  const overlay = new OverlayEngine();
  overlay.init();

  const highlightManager = new HighlightManager(
    overlay,
    async (updatedSettings) => {
      await StorageManager.setSettings(updatedSettings);
    }
  );

  const toolbarInjector = new ToolbarInjector(
    async (updatedSettings) => {
      await StorageManager.setSettings(updatedSettings);
    },
    () => highlightManager.togglePinSelection()
  );

  // Load initial settings
  let currentSettings = await StorageManager.getSettings();
  highlightManager.updateSettings(currentSettings);
  toolbarInjector.inject(currentSettings);

  // Setup DOM Mutation Observer
  const observer = new DOMObserver(
    () => highlightManager.refresh(),
    () => toolbarInjector.inject(currentSettings)
  );
  observer.start();

  // Listen to Storage sync changes across windows/popups
  StorageManager.onChange((newSettings) => {
    currentSettings = { ...currentSettings, ...newSettings };
    highlightManager.updateSettings(currentSettings);
    toolbarInjector.updateActiveState(currentSettings);
  });
})();