// ─── Auto-inject on install / startup ────────────────────────────────────────

async function injectIntoAllTabs() {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      } catch (e) { /* skip restricted pages */ }
    }
  }
}

chrome.runtime.onInstalled.addListener(injectIntoAllTabs);
chrome.runtime.onStartup.addListener(injectIntoAllTabs);


// ─── File safety check ───────────────────────────────────────────────────────

const SAFE_EXTENSIONS    = ['jpg','jpeg','png','gif','webp','svg','pdf','txt','csv','json','mp4','mp3','wav','zip','docx','xlsx','pptx','md'];
const DANGEROUS_EXTENSIONS = ['exe','bat','cmd','sh','ps1','vbs','jar','msi','dmg','deb','rpm','dll','scr','com','pif','apk','ipa'];

function checkFileSafety(url, filename) {
  const result = { safe: true, warnings: [], url, filename };

  if (!url.startsWith('https://')) {
    result.warnings.push('URL is not HTTPS — connection is not encrypted');
    result.safe = false;
  }

  const rawName = filename || url.split('/').pop().split('?')[0];
  const ext = rawName.split('.').pop().toLowerCase();
  result.extension = ext;
  result.filename = rawName;

  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    result.warnings.push(`".${ext}" is an executable file type — high risk`);
    result.safe = false;
  } else if (!SAFE_EXTENSIONS.includes(ext)) {
    result.warnings.push(`".${ext}" is an unknown file type — proceed with caution`);
  }

  return result;
}


// ─── Message handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // 1. Switch to a tab (also focuses its window)
  if (message.action === 'switchTab') {
    chrome.tabs.update(message.tabId, { active: true }, (tab) => {
      chrome.windows.update(tab.windowId, { focused: true }, () => sendResponse({ success: true }));
    });
    return true;
  }

  // 2. Get all open tabs
  if (message.action === 'getTabs') {
    chrome.tabs.query({}, (tabs) => {
      sendResponse({ success: true, tabs: tabs.map(t => ({
        id: t.id, title: t.title, url: t.url,
        active: t.active, pinned: t.pinned, muted: t.mutedInfo?.muted,
        windowId: t.windowId, groupId: t.groupId
      }))});
    });
    return true;
  }

  // 3. Open a new tab
  if (message.action === 'openTab') {
    chrome.tabs.create({ url: message.url || undefined }, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  // 4. Close a tab
  if (message.action === 'closeTab') {
    chrome.tabs.remove(message.tabId, () => sendResponse({ success: true }));
    return true;
  }

  // 5. Reload a tab
  if (message.action === 'reloadTab') {
    chrome.tabs.reload(message.tabId, {}, () => sendResponse({ success: true }));
    return true;
  }

  // 6. Focus a window
  if (message.action === 'focusWindow') {
    chrome.windows.update(message.windowId, { focused: true }, () => sendResponse({ success: true }));
    return true;
  }

  // 7. Move a tab to another window
  if (message.action === 'moveTab') {
    chrome.tabs.move(message.tabId, { windowId: message.windowId, index: message.index ?? -1 }, (tab) => {
      sendResponse({ success: true, tab });
    });
    return true;
  }

  // 8. Pin / unpin a tab
  if (message.action === 'pinTab') {
    chrome.tabs.update(message.tabId, { pinned: message.pinned }, (tab) => {
      sendResponse({ success: true, pinned: tab.pinned });
    });
    return true;
  }

  // 9. Inject content script into a specific tab manually
  if (message.action === 'injectScript') {
    chrome.scripting.executeScript({ target: { tabId: message.tabId }, files: ['content.js'] })
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  // 10. Read content from any tab (without switching to it)
  if (message.action === 'readTabContent') {
    const type = message.contentType || 'all';
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      func: (type) => {
        if (type === 'html')  return document.documentElement.outerHTML;
        if (type === 'text')  return document.body.innerText;
        if (type === 'title') return document.title;
        return { title: document.title, url: location.href, text: document.body.innerText };
      },
      args: [type]
    }).then(r => sendResponse({ success: true, content: r[0].result }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  // 11. Create a new window
  if (message.action === 'createWindow') {
    chrome.windows.create({ url: message.url || undefined, focused: message.focused !== false }, (win) => {
      sendResponse({ success: true, windowId: win.id });
    });
    return true;
  }

  // 12. Mute / unmute a tab
  if (message.action === 'muteTab') {
    chrome.tabs.update(message.tabId, { muted: message.muted }, (tab) => {
      sendResponse({ success: true, muted: tab.mutedInfo.muted });
    });
    return true;
  }

  // 13. Create a tab group
  if (message.action === 'createTabGroup') {
    chrome.tabs.group({ tabIds: message.tabIds }, (groupId) => {
      const update = {};
      if (message.title) update.title = message.title;
      if (message.color) update.color = message.color; // grey|blue|red|yellow|green|pink|purple|cyan|orange
      if (Object.keys(update).length) {
        chrome.tabGroups.update(groupId, update, () => sendResponse({ success: true, groupId }));
      } else {
        sendResponse({ success: true, groupId });
      }
    });
    return true;
  }

  // 14. Get all tab groups
  if (message.action === 'getTabGroups') {
    chrome.tabGroups.query({}, (groups) => sendResponse({ success: true, groups }));
    return true;
  }

  // 15. Update a tab group (rename / recolor)
  if (message.action === 'updateTabGroup') {
    const update = {};
    if (message.title !== undefined) update.title = message.title;
    if (message.color !== undefined) update.color = message.color;
    chrome.tabGroups.update(message.groupId, update, (group) => sendResponse({ success: true, group }));
    return true;
  }

  // 16. Remove tabs from their group
  if (message.action === 'ungroupTabs') {
    chrome.tabs.ungroup(message.tabIds, () => sendResponse({ success: true }));
    return true;
  }

  // 17. Get bookmarks
  if (message.action === 'getBookmarks') {
    chrome.bookmarks.getTree((tree) => sendResponse({ success: true, bookmarks: tree }));
    return true;
  }

  // 18. Search bookmarks
  if (message.action === 'searchBookmarks') {
    chrome.bookmarks.search(message.query, (results) => sendResponse({ success: true, bookmarks: results }));
    return true;
  }

  // 19. Add a bookmark
  if (message.action === 'addBookmark') {
    chrome.bookmarks.create({ title: message.title, url: message.url, parentId: message.parentId }, (bookmark) => {
      sendResponse({ success: true, bookmark });
    });
    return true;
  }

  // 20. Remove a bookmark
  if (message.action === 'removeBookmark') {
    chrome.bookmarks.remove(message.id, () => sendResponse({ success: true }));
    return true;
  }

  // 21. Get / set scroll position of any tab
  if (message.action === 'scrollTab') {
    if (message.get) {
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: () => ({ x: window.scrollX, y: window.scrollY, maxX: document.body.scrollWidth, maxY: document.body.scrollHeight })
      }).then(r => sendResponse({ success: true, scroll: r[0].result }))
        .catch(e => sendResponse({ success: false, error: e.message }));
    } else {
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        func: (x, y, behavior) => window.scrollTo({ left: x, top: y, behavior }),
        args: [message.x ?? 0, message.y ?? 0, message.behavior || 'smooth']
      }).then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
    }
    return true;
  }

  // 22. Inject CSS into any tab
  if (message.action === 'injectCSS') {
    chrome.scripting.insertCSS({ target: { tabId: message.tabId }, css: message.css })
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  // 23. Remove previously injected CSS
  if (message.action === 'removeCSS') {
    chrome.scripting.removeCSS({ target: { tabId: message.tabId }, css: message.css })
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  // 24. Set extension badge text and color
  if (message.action === 'setBadge') {
    chrome.action.setBadgeText({ text: message.text || '' });
    if (message.color) chrome.action.setBadgeBackgroundColor({ color: message.color });
    sendResponse({ success: true });
    return true;
  }

  // 25. Check if a file/URL is safe to download
  if (message.action === 'checkFileSafety') {
    sendResponse({ success: true, ...checkFileSafety(message.url, message.filename) });
    return true;
  }

  // 26. Download a file (with built-in safety check)
  if (message.action === 'downloadFile') {
    const safety = checkFileSafety(message.url, message.filename);
    if (!safety.safe && !message.forceDownload) {
      sendResponse({ success: false, safety, error: 'File failed safety check. Pass forceDownload: true to override.' });
      return true;
    }
    chrome.downloads.download({
      url: message.url,
      filename: message.filename || undefined,
      saveAs: message.saveAs || false
    }, (downloadId) => sendResponse({ success: true, downloadId, safety }));
    return true;
  }

  // 27. Block notification popups for a site (prevents the permission prompt from appearing)
  if (message.action === 'blockSiteNotifications') {
    const pattern = message.pattern || (new URL(message.url).origin + '/*');
    chrome.contentSettings.notifications.set({ primaryPattern: pattern, setting: 'block' }, () => {
      sendResponse({ success: true, pattern });
    });
    return true;
  }

  // 28. Allow notifications for a site
  if (message.action === 'allowSiteNotifications') {
    const pattern = message.pattern || (new URL(message.url).origin + '/*');
    chrome.contentSettings.notifications.set({ primaryPattern: pattern, setting: 'allow' }, () => {
      sendResponse({ success: true, pattern });
    });
    return true;
  }

  // 29. Suppress JS dialogs (alert / confirm / prompt) in a tab
  if (message.action === 'suppressDialogs') {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      func: () => {
        window.alert   = (msg) => console.log('[Claude] alert suppressed:', msg);
        window.confirm = (msg) => { console.log('[Claude] confirm suppressed:', msg); return true; };
        window.prompt  = (msg) => { console.log('[Claude] prompt suppressed:', msg); return null; };
      }
    }).then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

});
