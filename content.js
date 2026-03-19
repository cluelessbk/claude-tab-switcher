// Bridge between Claude's page-level JavaScript and the extension's background worker.
// Claude dispatches CustomEvents on the page; this script forwards them to the background,
// then fires a response event back to the page so Claude can read the result.

// Switch to a tab by ID
// Usage: window.dispatchEvent(new CustomEvent('claude-switch-tab', { detail: { tabId: 123 } }))
window.addEventListener('claude-switch-tab', (event) => {
  const { tabId } = event.detail;
  chrome.runtime.sendMessage({ action: 'switchTab', tabId }, (response) => {
    window.dispatchEvent(new CustomEvent('claude-switch-tab-response', { detail: response }));
  });
});

// Get all open tabs
// Usage: window.dispatchEvent(new CustomEvent('claude-get-tabs'))
// Result fires as: window event 'claude-get-tabs-response' with detail.tabs array
window.addEventListener('claude-get-tabs', () => {
  chrome.runtime.sendMessage({ action: 'getTabs' }, (response) => {
    window.dispatchEvent(new CustomEvent('claude-get-tabs-response', { detail: response }));
  });
});
