// Guard against double-injection
if (window.__claudeTabSwitcherLoaded) {
  // Already loaded, do nothing
} else {
  window.__claudeTabSwitcherLoaded = true;

  function sendMsg(action, data, responseEvent) {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (responseEvent) {
        window.dispatchEvent(new CustomEvent(responseEvent, { detail: response }));
      }
    });
  }

  // 1. Switch to a tab
  // window.dispatchEvent(new CustomEvent('claude-switch-tab', { detail: { tabId: 123 } }))
  window.addEventListener('claude-switch-tab', (e) => {
    sendMsg('switchTab', { tabId: e.detail.tabId }, 'claude-switch-tab-response');
  });

  // 2. Get all open tabs
  // window.dispatchEvent(new CustomEvent('claude-get-tabs'))
  window.addEventListener('claude-get-tabs', () => {
    sendMsg('getTabs', {}, 'claude-get-tabs-response');
  });

  // 3. Open a new tab
  // window.dispatchEvent(new CustomEvent('claude-open-tab', { detail: { url: 'https://...' } }))
  window.addEventListener('claude-open-tab', (e) => {
    sendMsg('openTab', { url: e.detail?.url }, 'claude-open-tab-response');
  });

  // 4. Close a tab
  // window.dispatchEvent(new CustomEvent('claude-close-tab', { detail: { tabId: 123 } }))
  window.addEventListener('claude-close-tab', (e) => {
    sendMsg('closeTab', { tabId: e.detail.tabId }, 'claude-close-tab-response');
  });

  // 5. Reload a tab
  // window.dispatchEvent(new CustomEvent('claude-reload-tab', { detail: { tabId: 123 } }))
  window.addEventListener('claude-reload-tab', (e) => {
    sendMsg('reloadTab', { tabId: e.detail.tabId }, 'claude-reload-tab-response');
  });

  // 6. Focus a window (bring to front)
  // window.dispatchEvent(new CustomEvent('claude-focus-window', { detail: { windowId: 456 } }))
  window.addEventListener('claude-focus-window', (e) => {
    sendMsg('focusWindow', { windowId: e.detail.windowId }, 'claude-focus-window-response');
  });

  // 7. Move a tab to a different window
  // window.dispatchEvent(new CustomEvent('claude-move-tab', { detail: { tabId: 123, windowId: 456, index: -1 } }))
  window.addEventListener('claude-move-tab', (e) => {
    sendMsg('moveTab', { tabId: e.detail.tabId, windowId: e.detail.windowId, index: e.detail.index }, 'claude-move-tab-response');
  });

  // 8. Pin or unpin a tab
  // window.dispatchEvent(new CustomEvent('claude-pin-tab', { detail: { tabId: 123, pinned: true } }))
  window.addEventListener('claude-pin-tab', (e) => {
    sendMsg('pinTab', { tabId: e.detail.tabId, pinned: e.detail.pinned }, 'claude-pin-tab-response');
  });

  // 9. Inject content script into a tab that doesn't have it yet
  // window.dispatchEvent(new CustomEvent('claude-inject-script', { detail: { tabId: 123 } }))
  window.addEventListener('claude-inject-script', (e) => {
    sendMsg('injectScript', { tabId: e.detail.tabId }, 'claude-inject-script-response');
  });

}
