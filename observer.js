/**
 * MutationObserver & Event Debouncer for Google Sheets UI Detection
 */

class DOMObserver {
  constructor(onSelectionOrLayoutChange, onToolbarReset) {
    this.onSelectionOrLayoutChange = onSelectionOrLayoutChange;
    this.onToolbarReset = onToolbarReset;
    this.observer = null;
    this.debounceTimer = null;
    this.followUpTimers = [];
  }

  start() {
    const targetNode = document.body;
    if (!targetNode) return;

    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'aria-selected', 'value']
    };

    this.observer = new MutationObserver((mutations) => {
      let triggerLayout = false;
      let triggerToolbar = false;

      for (const mutation of mutations) {
        const target = mutation.target;
        if (!target || !target.classList) continue;

        // Detect grid canvas, active cell, autofill handle, or selection indicator mutations
        if (
          target.id === 'grid-table' ||
          target.id === 't-name-box' ||
          target.classList.contains('grid-scrollable-wrapper') ||
          target.classList.contains('active-cell-border') ||
          target.classList.contains('grid-active-cell-highlight') ||
          target.classList.contains('autofill-handle') ||
          target.classList.contains('autofill-cover') ||
          target.classList.contains('waffle-name-box') ||
          target.getAttribute('role') === 'gridcell' ||
          target.classList.contains('cell-input') ||
          target.classList.contains('input-box')
        ) {
          triggerLayout = true;
        }

        // Detect if toolbar is re-rendered by Google Sheets
        if (
          target.id === 'docs-toolbar' ||
          target.getAttribute('role') === 'toolbar'
        ) {
          triggerToolbar = true;
        }
      }

      if (triggerLayout) {
        this.debounce(() => this.onSelectionOrLayoutChange(), 16);
      }

      if (triggerToolbar) {
        this.debounce(() => this.onToolbarReset(), 100);
      }
    });

    this.observer.observe(targetNode, config);

    // Event listeners for window resize, scrolling, keyboard, and mouse selection in Google Sheets
    window.addEventListener('resize', this.handleEvent);
    document.addEventListener('scroll', this.handleEvent, true);
    document.addEventListener('keydown', this.handleSelectionEvent, true);
    document.addEventListener('keyup', this.handleSelectionEvent, true);
    document.addEventListener('mousedown', this.handleSelectionEvent, true);
    document.addEventListener('mouseup', this.handleSelectionEvent, true);
  }

  handleEvent = () => {
    this.debounce(() => this.onSelectionOrLayoutChange(), 16);
  };

  handleSelectionEvent = () => {
    this.debounce(() => this.onSelectionOrLayoutChange(), 16);

    // Schedule follow-up checks to catch async Google Sheets Name Box (.value) and autofill updates
    this.clearFollowUpTimers();
    this.followUpTimers.push(
      setTimeout(() => this.onSelectionOrLayoutChange(), 60),
      setTimeout(() => this.onSelectionOrLayoutChange(), 150)
    );
  };

  clearFollowUpTimers() {
    for (const timer of this.followUpTimers) {
      clearTimeout(timer);
    }
    this.followUpTimers = [];
  }

  debounce(fn, delay) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(fn, delay);
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.clearFollowUpTimers();
    window.removeEventListener('resize', this.handleEvent);
    document.removeEventListener('scroll', this.handleEvent, true);
    document.removeEventListener('keydown', this.handleSelectionEvent, true);
    document.removeEventListener('keyup', this.handleSelectionEvent, true);
    document.removeEventListener('mousedown', this.handleSelectionEvent, true);
    document.removeEventListener('mouseup', this.handleSelectionEvent, true);
  }
}