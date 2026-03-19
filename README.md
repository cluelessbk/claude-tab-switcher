# Claude Tab Switcher

A companion Chrome extension for [Claude in Chrome](https://claude.ai) that gives Claude comprehensive control over your browser.

By default, Claude can only interact with content *inside* a single tab. This extension bridges that gap — giving Claude awareness of and control over all tabs, windows, bookmarks, downloads, and more.

---

## How it works

Claude fires JavaScript `CustomEvent`s on the page. This extension's content script catches them and forwards them to a background service worker, which has the permissions needed to act on them (switch tabs, read content, download files, etc.), then fires a response event back.

---

## Installation

> **Requires Chrome** (or any Chromium-based browser: Edge, Brave, Arc, etc.)

1. **Download this extension**
   - Click the green **Code** button → **Download ZIP**
   - Unzip the folder somewhere on your computer (e.g. your Desktop)

2. **Open Chrome Extensions**
   - Go to `chrome://extensions` in your address bar

3. **Enable Developer Mode**
   - Toggle the **Developer mode** switch in the top-right corner

4. **Load the extension**
   - Click **Load unpacked**
   - Select the `claude-tab-switcher` folder you unzipped

5. **Done!** The extension auto-injects itself into all open tabs immediately — no need to refresh anything.

---

## Features

### Tab control
1. **Switch to any tab** — by tab ID or name
2. **List all open tabs** — titles, URLs, IDs, pinned/muted state, group, window
3. **Open a new tab** — with or without a URL
4. **Close a tab**
5. **Reload a tab**
6. **Pin / unpin a tab**
7. **Mute / unmute a tab**

### Window control
8. **Focus a window** — bring a browser window to the front
9. **Create a new window** — with or without a URL
10. **Move a tab to another window**

### Tab groups
11. **Create a tab group** — group tabs with a name and color (grey/blue/red/yellow/green/pink/purple/cyan/orange)
12. **List all tab groups**
13. **Rename or recolor a group**
14. **Remove tabs from a group**

### Content reading
15. **Read any tab's content without switching to it** — get full text, HTML, or title from background tabs

### Scroll
16. **Get scroll position** of any tab
17. **Scroll any tab** to a position (without switching to it)

### CSS injection
18. **Inject custom CSS** into any tab — hide ads, change layout, dark mode, etc.
19. **Remove injected CSS**

### Bookmarks
20. **Get all bookmarks**
21. **Search bookmarks**
22. **Add a bookmark**
23. **Remove a bookmark**

### Downloads & file safety
24. **Check if a file is safe** before downloading — validates HTTPS, checks extension against known safe/dangerous lists
25. **Download a file** — with automatic safety check built in (blocks dangerous executables by default)

### Popups & dialogs
26. **Block notification popups** for any site — prevents the "wants to show notifications" prompt from ever appearing
27. **Allow notifications** for a site
28. **Suppress JS dialogs** (alert / confirm / prompt) in any tab

### Misc
29. **Set extension badge** — display a text label on the extension icon

---

## Important: Tabs refresh automatically

The extension auto-injects into all open tabs on install and on every browser startup. You don't need to refresh tabs manually.

---

## Notes

- Permissions used: `tabs`, `scripting`, `windows`, `tabGroups`, `bookmarks`, `downloads`, `contentSettings`
- Does **not** collect or transmit any data
- File safety check is local — it checks HTTPS and file extension. For deep malware scanning, an external service (e.g. VirusTotal API) would be needed
- If Chrome shows a Developer Mode warning on startup, just dismiss it — normal for unpacked extensions
