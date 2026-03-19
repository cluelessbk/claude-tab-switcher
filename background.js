chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // Switch to a specific tab by ID
  if (message.action === 'switchTab') {
    chrome.tabs.update(message.tabId, { active: true }, (tab) => {
      sendResponse({ success: true, tab });
    });
    return true; // keeps the message channel open for async response
  }

  // Return a list of all open tabs
  if (message.action === 'getTabs') {
    chrome.tabs.query({}, (tabs) => {
      const simplified = tabs.map(t => ({
        id: t.id,
        title: t.title,
        url: t.url,
        active: t.active,
        windowId: t.windowId
      }));
      sendResponse({ success: true, tabs: simplified });
    });
    return true;
  }

});
