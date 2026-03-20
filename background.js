// ─── Security Configuration ──────────────────────────────────────────────────

const SENSITIVE_DOMAINS = [
  // Bulgarian banking
  'postbank.bg', 'dskbank.bg', 'ubb.bg', 'fibank.bg', 'raiffeisen.bg', 'ccbank.bg',
  // Generic banking keywords (matched as substrings)
  'bank', 'banking',
  // Global payments
  'paypal.com', 'stripe.com', 'revolut.com', 'wise.com', 'transferwise.com',
  'square.com', 'checkout.com', 'adyen.com', 'klarna.com', 'braintree.com',
  // Checkout / billing keywords
  'checkout', 'payment', 'billing', 'invoice',
  // Password managers
  '1password.com', 'lastpass.com', 'bitwarden.com', 'dashlane.com', 'keeper.io', 'nordpass.com',
  // Crypto
  'coinbase.com', 'binance.com', 'kraken.com', 'blockchain.com',
  'wallet', 'crypto',
];

function isSensitiveDomain(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SENSITIVE_DOMAINS.some(pattern => hostname.includes(pattern));
  } catch (e) {
    return false;
  }
}

// Auto-focus a tab and its window before performing visible actions
// This ensures the user always sees what Claude is doing
async function autoFocus(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.update(tabId, { active: true }, (tab) => {
      if (!tab) { resolve(); return; }
      chrome.windows.update(tab.windowId, { focused: true }, resolve);
    });
  });
}

async function hasPasswordFields(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.querySelectorAll('input[type="password"]').length > 0
    });
    return results[0]?.result === true;
  } catch (e) {
    return false;
  }
}


// ─── Audit Log ───────────────────────────────────────────────────────────────

const auditLog = [];

function logAction(action, url, details = {}) {
  auditLog.push({
    timestamp: new Date().toISOString(),
    action,
    url: url || 'unknown',
    ...details
  });
  if (auditLog.length > 200) auditLog.shift();
}


// ─── File Safety Check ───────────────────────────────────────────────────────

const SAFE_EXTENSIONS     = ['jpg','jpeg','png','gif','webp','svg','pdf','txt','csv','json','mp4','mp3','wav','zip','docx','xlsx','pptx','md'];
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


// ─── Auto-block notifications globally ───────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && tab.url.startsWith('http')) {
    try {
      const pattern = new URL(tab.url).origin + '/*';
      chrome.contentSettings.notifications.set({ primaryPattern: pattern, setting: 'block' });
    } catch (e) { /* ignore invalid URLs */ }
  }
});


// ─── Message Handler ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message.action;

  // Always focus the sender's window so the user can see Claude working
  if (sender.tab?.windowId) {
    chrome.windows.update(sender.tab.windowId, { focused: true });
  }

  // 1. Switch to a tab (also focuses its window)
  if (action === 'switchTab') {
    chrome.tabs.update(message.tabId, { active: true }, (tab) => {
      chrome.windows.update(tab.windowId, { focused: true }, () => {
        logAction('switchTab', tab.url);
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // 2. Get all open tabs
  if (action === 'getTabs') {
    chrome.tabs.query({}, (tabs) => {
      sendResponse({ success: true, tabs: tabs.map(t => ({
        id: t.id, title: t.title, url: t.url,
        active: t.active, pinned: t.pinned, muted: t.mutedInfo?.muted,
        windowId: t.windowId, groupId: t.groupId, status: t.status
      }))});
    });
    return true;
  }

  // 3. Open a new tab
  if (action === 'openTab') {
    chrome.tabs.create({ url: message.url || undefined }, (tab) => {
      logAction('openTab', message.url);
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  // 4. Close a tab
  if (action === 'closeTab') {
    chrome.tabs.get(message.tabId, (tab) => {
      logAction('closeTab', tab?.url);
      chrome.tabs.remove(message.tabId, () => sendResponse({ success: true }));
    });
    return true;
  }

  // 5. Reload a tab (auto-focuses so user can see)
  if (action === 'reloadTab') {
    (async () => {
      await autoFocus(message.tabId);
      chrome.tabs.reload(message.tabId, {}, () => sendResponse({ success: true }));
    })();
    return true;
  }

  // 6. Focus a window
  if (action === 'focusWindow') {
    chrome.windows.update(message.windowId, { focused: true }, () => sendResponse({ success: true }));
    return true;
  }

  // 7. Move a tab to another window
  if (action === 'moveTab') {
    chrome.tabs.move(message.tabId, { windowId: message.windowId, index: message.index ?? -1 }, (tab) => {
      sendResponse({ success: true, tab });
    });
    return true;
  }

  // 8. Pin / unpin a tab
  if (action === 'pinTab') {
    chrome.tabs.update(message.tabId, { pinned: message.pinned }, (tab) => {
      sendResponse({ success: true, pinned: tab.pinned });
    });
    return true;
  }

  // 9. Inject content script manually
  if (action === 'injectScript') {
    chrome.scripting.executeScript({ target: { tabId: message.tabId }, files: ['content.js'] })
      .then(() => sendResponse({ success: true }))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  // 10. Read content from any tab (auto-focuses so user can see)
  if (action === 'readTabContent') {
    (async () => {
      await autoFocus(message.tabId);
    })();
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
  if (action === 'createWindow') {
    chrome.windows.create({ url: message.url || undefined, focused: message.focused !== false }, (win) => {
      logAction('createWindow', message.url);
      sendResponse({ success: true, windowId: win.id });
    });
    return true;
  }

  // 12. Mute / unmute a tab
  if (action === 'muteTab') {
    chrome.tabs.update(message.tabId, { muted: message.muted }, (tab) => {
      sendResponse({ success: true, muted: tab.mutedInfo.muted });
    });
    return true;
  }

  // 13. Create a tab group
  if (action === 'createTabGroup') {
    chrome.tabs.group({ tabIds: message.tabIds }, (groupId) => {
      const update = {};
      if (message.title) update.title = message.title;
      if (message.color) update.color = message.color;
      if (Object.keys(update).length) {
        chrome.tabGroups.update(groupId, update, () => sendResponse({ success: true, groupId }));
      } else {
        sendResponse({ success: true, groupId });
      }
    });
    return true;
  }

  // 14. Get all tab groups
  if (action === 'getTabGroups') {
    chrome.tabGroups.query({}, (groups) => sendResponse({ success: true, groups }));
    return true;
  }

  // 15. Update a tab group
  if (action === 'updateTabGroup') {
    const update = {};
    if (message.title !== undefined) update.title = message.title;
    if (message.color !== undefined) update.color = message.color;
    chrome.tabGroups.update(message.groupId, update, (group) => sendResponse({ success: true, group }));
    return true;
  }

  // 16. Ungroup tabs
  if (action === 'ungroupTabs') {
    chrome.tabs.ungroup(message.tabIds, () => sendResponse({ success: true }));
    return true;
  }

  // 17. Get bookmarks
  if (action === 'getBookmarks') {
    chrome.bookmarks.getTree((tree) => sendResponse({ success: true, bookmarks: tree }));
    return true;
  }

  // 18. Search bookmarks
  if (action === 'searchBookmarks') {
    chrome.bookmarks.search(message.query, (results) => sendResponse({ success: true, bookmarks: results }));
    return true;
  }

  // 19. Add a bookmark
  if (action === 'addBookmark') {
    chrome.bookmarks.create({ title: message.title, url: message.url, parentId: message.parentId }, (bookmark) => {
      logAction('addBookmark', message.url);
      sendResponse({ success: true, bookmark });
    });
    return true;
  }

  // 20. Remove a bookmark
  if (action === 'removeBookmark') {
    chrome.bookmarks.remove(message.id, () => {
      logAction('removeBookmark', null, { id: message.id });
      sendResponse({ success: true });
    });
    return true;
  }

  // 21. Scroll any tab (auto-focuses so user can see)
  if (action === 'scrollTab') {
    (async () => {
      await autoFocus(message.tabId);
    })();
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

  // 22. Inject CSS (blocked on sensitive domains; auto-focuses so user can see)
  if (action === 'injectCSS') {
    chrome.tabs.get(message.tabId, async (tab) => {
      if (isSensitiveDomain(tab.url)) {
        sendResponse({ success: false, blocked: true, error: 'Security: CSS injection blocked on sensitive domain.' });
        return;
      }
      await autoFocus(message.tabId);
      chrome.scripting.insertCSS({ target: { tabId: message.tabId }, css: message.css })
        .then(() => { logAction('injectCSS', tab.url); sendResponse({ success: true }); })
        .catch(e => sendResponse({ success: false, error: e.message }));
    });
    return true;
  }

  // 23. Remove CSS (auto-focuses so user can see)
  if (action === 'removeCSS') {
    (async () => {
      await autoFocus(message.tabId);
      chrome.scripting.removeCSS({ target: { tabId: message.tabId }, css: message.css })
        .then(() => sendResponse({ success: true }))
        .catch(e => sendResponse({ success: false, error: e.message }));
    })();
    return true;
  }

  // 24. Set extension badge
  if (action === 'setBadge') {
    chrome.action.setBadgeText({ text: message.text || '' });
    if (message.color) chrome.action.setBadgeBackgroundColor({ color: message.color });
    sendResponse({ success: true });
    return true;
  }

  // 25. Check file safety
  if (action === 'checkFileSafety') {
    sendResponse({ success: true, ...checkFileSafety(message.url, message.filename) });
    return true;
  }

  // 26. Download a file (with safety check)
  if (action === 'downloadFile') {
    const safety = checkFileSafety(message.url, message.filename);
    if (!safety.safe && !message.forceDownload) {
      sendResponse({ success: false, safety, error: 'File failed safety check. Pass forceDownload: true to override.' });
      return true;
    }
    logAction('downloadFile', message.url, { filename: message.filename });
    chrome.downloads.download({ url: message.url, filename: message.filename || undefined, saveAs: message.saveAs || false },
      (downloadId) => sendResponse({ success: true, downloadId, safety }));
    return true;
  }

  // 27. Block notifications for a site
  if (action === 'blockSiteNotifications') {
    const pattern = message.pattern || (new URL(message.url).origin + '/*');
    chrome.contentSettings.notifications.set({ primaryPattern: pattern, setting: 'block' }, () => {
      sendResponse({ success: true, pattern });
    });
    return true;
  }

  // 28. Allow notifications for a site
  if (action === 'allowSiteNotifications') {
    const pattern = message.pattern || (new URL(message.url).origin + '/*');
    chrome.contentSettings.notifications.set({ primaryPattern: pattern, setting: 'allow' }, () => {
      sendResponse({ success: true, pattern });
    });
    return true;
  }

  // 29. Suppress JS dialogs in a tab (auto-focuses so user can see)
  if (action === 'suppressDialogs') {
    (async () => { await autoFocus(message.tabId); })();
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

  // 30. Close a window
  if (action === 'closeWindow') {
    logAction('closeWindow', null, { windowId: message.windowId });
    chrome.windows.remove(message.windowId, () => sendResponse({ success: true }));
    return true;
  }

  // 31. Get all windows
  if (action === 'getWindows') {
    chrome.windows.getAll({ populate: false }, (windows) => {
      sendResponse({ success: true, windows: windows.map(w => ({
        id: w.id, focused: w.focused, state: w.state, type: w.type
      }))});
    });
    return true;
  }

  // 32. Execute JS — active tab only, security-gated
  if (action === 'executeJS') {
    chrome.tabs.get(message.tabId, async (tab) => {
      if (!tab.active) {
        sendResponse({ success: false, error: 'Security: JS execution only allowed on the active tab.' });
        return;
      }
      if (isSensitiveDomain(tab.url)) {
        sendResponse({ success: false, blocked: true, error: 'Security: JS execution blocked on sensitive domains.' });
        return;
      }
      const hasPwFields = await hasPasswordFields(message.tabId);
      if (hasPwFields) {
        sendResponse({ success: false, blocked: true, error: 'Security: JS execution blocked — page contains password fields.' });
        return;
      }
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: message.tabId },
          func: (code) => {
            // Block form submission — requires human to click submit themselves
            HTMLFormElement.prototype.submit = () => {
              throw new Error('Form submission blocked. Ask the user to click Submit.');
            };
            document.querySelectorAll('[type="submit"], [type="button"]').forEach(el => {
              el.addEventListener('click', e => e.stopImmediatePropagation(), true);
            });
            return eval(code); // eslint-disable-line no-eval
          },
          args: [message.code]
        });
        logAction('executeJS', tab.url, { preview: message.code.slice(0, 100) });
        sendResponse({ success: true, result: results[0]?.result });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    });
    return true;
  }

  // 33. Navigate a tab to a new URL (auto-focuses so user can see)
  if (action === 'navigateTab') {
    (async () => {
      await autoFocus(message.tabId);
      logAction('navigateTab', message.url);
      chrome.tabs.update(message.tabId, { url: message.url }, (tab) => {
        sendResponse({ success: true, tabId: tab.id });
      });
    })();
    return true;
  }

  // 34. Duplicate a tab
  if (action === 'duplicateTab') {
    chrome.tabs.duplicate(message.tabId, (tab) => {
      sendResponse({ success: true, tabId: tab.id });
    });
    return true;
  }

  // 35. Check if a tab is still loading
  if (action === 'getTabStatus') {
    chrome.tabs.get(message.tabId, (tab) => {
      sendResponse({ success: true, status: tab.status, title: tab.title, url: tab.url });
    });
    return true;
  }

  // 36. Screenshot active tab → download as PNG (blocked on sensitive domains; auto-focuses)
  if (action === 'screenshotTab') {
    chrome.tabs.get(message.tabId, async (tab) => {
      if (isSensitiveDomain(tab.url)) {
        sendResponse({ success: false, blocked: true, error: 'Security: screenshots blocked on sensitive domains.' });
        return;
      }
      await autoFocus(message.tabId);
      chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' }, (dataUrl) => {
        const filename = message.filename || `screenshot-${Date.now()}.png`;
        chrome.downloads.download({ url: dataUrl, filename }, (downloadId) => {
          logAction('screenshotTab', tab.url, { filename });
          sendResponse({ success: true, downloadId, filename });
        });
      });
    });
    return true;
  }

  // 37. Zoom a tab (auto-focuses so user can see)
  if (action === 'zoomTab') {
    (async () => {
      await autoFocus(message.tabId);
      chrome.tabs.setZoom(message.tabId, message.zoom, () => {
        sendResponse({ success: true, zoom: message.zoom });
      });
    })();
    return true;
  }

  // 38. Copy text to clipboard (write-only — never reads clipboard)
  if (action === 'copyToClipboard') {
    chrome.scripting.executeScript({
      target: { tabId: message.tabId },
      func: (text) => navigator.clipboard.writeText(text),
      args: [message.text]
    }).then(() => {
      logAction('copyToClipboard', null, { length: message.text?.length });
      sendResponse({ success: true });
    }).catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  // 39. Get audit log
  if (action === 'getAuditLog') {
    sendResponse({ success: true, log: auditLog });
    return true;
  }

});
