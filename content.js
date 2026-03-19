// Guard against double-injection
if (window.__claudeTabSwitcherLoaded) {
  // Already loaded — skip
} else {
  window.__claudeTabSwitcherLoaded = true;

  // Helper: send a message to background and optionally fire a response event
  function send(action, data, responseEvent) {
    chrome.runtime.sendMessage({ action, ...data }, (response) => {
      if (responseEvent) {
        window.dispatchEvent(new CustomEvent(responseEvent, { detail: response }));
      }
    });
  }

  // Helper: register a window event listener that calls send()
  function on(eventName, action, getPayload, responseEvent) {
    window.addEventListener(eventName, (e) => {
      send(action, getPayload ? getPayload(e.detail) : {}, responseEvent);
    });
  }

  // ── Tab control ────────────────────────────────────────────────────────────
  on('claude-switch-tab',   'switchTab',   d => ({ tabId: d.tabId }),          'claude-switch-tab-response');
  on('claude-get-tabs',     'getTabs',     null,                                'claude-get-tabs-response');
  on('claude-open-tab',     'openTab',     d => ({ url: d?.url }),              'claude-open-tab-response');
  on('claude-close-tab',    'closeTab',    d => ({ tabId: d.tabId }),           'claude-close-tab-response');
  on('claude-reload-tab',   'reloadTab',   d => ({ tabId: d.tabId }),           'claude-reload-tab-response');
  on('claude-pin-tab',      'pinTab',      d => ({ tabId: d.tabId, pinned: d.pinned }), 'claude-pin-tab-response');
  on('claude-mute-tab',     'muteTab',     d => ({ tabId: d.tabId, muted: d.muted }),   'claude-mute-tab-response');
  on('claude-inject-script','injectScript',d => ({ tabId: d.tabId }),           'claude-inject-script-response');

  // ── Window control ─────────────────────────────────────────────────────────
  on('claude-focus-window', 'focusWindow',  d => ({ windowId: d.windowId }),               'claude-focus-window-response');
  on('claude-create-window','createWindow', d => ({ url: d?.url, focused: d?.focused }),    'claude-create-window-response');
  on('claude-move-tab',     'moveTab',      d => ({ tabId: d.tabId, windowId: d.windowId, index: d.index }), 'claude-move-tab-response');

  // ── Tab groups ─────────────────────────────────────────────────────────────
  on('claude-get-tab-groups',    'getTabGroups',   null, 'claude-get-tab-groups-response');
  on('claude-create-tab-group',  'createTabGroup', d => ({ tabIds: d.tabIds, title: d.title, color: d.color }), 'claude-create-tab-group-response');
  on('claude-update-tab-group',  'updateTabGroup', d => ({ groupId: d.groupId, title: d.title, color: d.color }), 'claude-update-tab-group-response');
  on('claude-ungroup-tabs',      'ungroupTabs',    d => ({ tabIds: d.tabIds }), 'claude-ungroup-tabs-response');

  // ── Content reading ────────────────────────────────────────────────────────
  on('claude-read-tab-content',  'readTabContent', d => ({ tabId: d.tabId, contentType: d.contentType }), 'claude-read-tab-content-response');

  // ── Scroll ─────────────────────────────────────────────────────────────────
  on('claude-scroll-tab', 'scrollTab', d => ({
    tabId: d.tabId, get: d.get,
    x: d.x, y: d.y, behavior: d.behavior
  }), 'claude-scroll-tab-response');

  // ── CSS injection ──────────────────────────────────────────────────────────
  on('claude-inject-css', 'injectCSS', d => ({ tabId: d.tabId, css: d.css }), 'claude-inject-css-response');
  on('claude-remove-css', 'removeCSS', d => ({ tabId: d.tabId, css: d.css }), 'claude-remove-css-response');

  // ── Bookmarks ──────────────────────────────────────────────────────────────
  on('claude-get-bookmarks',    'getBookmarks',    null,                                       'claude-get-bookmarks-response');
  on('claude-search-bookmarks', 'searchBookmarks', d => ({ query: d.query }),                  'claude-search-bookmarks-response');
  on('claude-add-bookmark',     'addBookmark',     d => ({ title: d.title, url: d.url, parentId: d.parentId }), 'claude-add-bookmark-response');
  on('claude-remove-bookmark',  'removeBookmark',  d => ({ id: d.id }),                        'claude-remove-bookmark-response');

  // ── Downloads & file safety ────────────────────────────────────────────────
  on('claude-check-file-safety', 'checkFileSafety', d => ({ url: d.url, filename: d.filename }),                                        'claude-check-file-safety-response');
  on('claude-download-file',     'downloadFile',    d => ({ url: d.url, filename: d.filename, saveAs: d.saveAs, forceDownload: d.forceDownload }), 'claude-download-file-response');

  // ── Notifications & dialogs ────────────────────────────────────────────────
  on('claude-block-site-notifications', 'blockSiteNotifications', d => ({ url: d.url, pattern: d.pattern }), 'claude-block-site-notifications-response');
  on('claude-allow-site-notifications', 'allowSiteNotifications', d => ({ url: d.url, pattern: d.pattern }), 'claude-allow-site-notifications-response');
  on('claude-suppress-dialogs',         'suppressDialogs',        d => ({ tabId: d.tabId }),                  'claude-suppress-dialogs-response');

  // ── Extension badge ────────────────────────────────────────────────────────
  on('claude-set-badge', 'setBadge', d => ({ text: d.text, color: d.color }), 'claude-set-badge-response');

}
