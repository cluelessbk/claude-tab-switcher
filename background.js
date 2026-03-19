// Auto-inject content script into all existing tabs on install or browser startup
async function injectIntoAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (e) {
        // Skip tabs that can't be injected (e.g. browser internal pages)
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(injectIntoAllTabs);
chrome.runtime.onStartup.addListener(injectIntoAllTabs);

// Handle all messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // 1. Switch to a tab
  if (message.action === 'switchTab') {
    chrome.tabs.update(message.tabId, { active: true }, (tab) => {
      // Also focus the window that contains the tab
      chrome.windows.update(tab.windowId, { focused: true }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // 2. Get all open tabs
  if (message.action === 'getTabs') {
    chrome.tabs.query({}, (tabs) => {
      const simplified = tabs.map(t => ({
        id: t.id,
        title: t.title,
        url: t.url,
        active: t.active,
        pinned: t.pinned,
        windowId: t.windowId
      }));
      sendResponse({ success: true, tabs: simplified });
    });
    return true;
  }

  // 3. Open a new tab (optionally with a URL)
  if (message.action === 'openTab') {
    chrome.tabs.create({ url: message.url || undefined }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  // 4. Close a tab
  if (message.action === 'closeTab') {
    chrome.tabs.remove(message.tabId, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // 5. Reload a tab
  if (message.action === 'reloadTab') {
    chrome.tabs.reload(message.tabId, {}, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // 6. Focus a window (bring it to the front)
  if (message.action === 'focusWindow') {
    chrome.windows.update(message.windowId, { focused: true }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // 7. Move a tab to a different window
  if (message.action === 'moveTab') {
    chrome.tabs.move(message.tabId, { windowId: message.windowId, index: message.index ?? -1 }, (tab) => {
      sendResponse({ success: true, tab });
    });
    return true;
  }

  // 8. Pin or unpin a tab
  if (message.action === 'pinTab') {
    chrome.tabs.update(message.tabId, { pinned: message.pinned }, (tab) => {
      sendResponse({ success: true, pinned: tab.pinned });
    });
    return true;
  }

  // 9. Inject content script into a specific tab (manual trigger)
  if (message.action === 'injectScript') {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      files: ['content.js']
    }).then(() => sendResponse({ success: true }))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }

});
