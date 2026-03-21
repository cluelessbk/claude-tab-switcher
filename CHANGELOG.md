# Changelog

## v4.3.0
- Removed auto-focus of sender's window on every message — relay tab no longer jumps to front when dispatching commands
- Added active-tab hardstop to all content actions (reloadTab, readTabContent, scrollTab, injectCSS, removeCSS, suppressDialogs, navigateTab, screenshotTab, zoomTab) — blocks execution if target tab is not active
- openTab now supports windowId parameter — tabs open in the correct window instead of defaulting to the wrong one

## v4.2.0
- Auto-focus sender's window on every extension event — Claude's working window always comes to front

## v4.1.0
- Auto-focus tab and window before all visible actions (reload, navigate, scroll, zoom, CSS inject/remove, screenshot, suppress dialogs, read content)
- Fixed bug: `await` used in non-async callback in `scrollTab`

## v4.0.0
- Security hardening: sensitive domain blocklist (banking, payments, crypto), password field detection
- New actions: executeJS, navigateTab, duplicateTab, getTabStatus, screenshotTab, zoomTab, copyToClipboard, getAuditLog, closeWindow, getWindows
- Popup blocker: overrides `Notification.requestPermission` and Google One-Tap in MAIN world
- Auto-block notifications globally on every tab load
- Audit log (last 200 actions)

## v3.0.0
- Content reading, windows, tab groups, bookmarks, downloads, CSS injection, file safety check, dialog suppression, notification blocking

## v2.0.0
- Auto-inject content script into all open tabs on install/startup
- Double-injection guard

## v1.0.0
- Initial release: tab switching, listing, open/close/reload/pin/mute
