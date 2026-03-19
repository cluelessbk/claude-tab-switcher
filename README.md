# Claude Tab Switcher

A companion Chrome extension for [Claude in Chrome](https://claude.ai) that lets Claude switch between your browser tabs.

By default, Claude can only interact with the content *inside* a tab — it can't switch between tabs. This extension bridges that gap.

---

## How it works

When Claude wants to switch tabs, it fires a JavaScript event on the page. This extension's content script catches that event and passes it to a background worker, which has the permissions needed to actually switch the active tab.

---

## Installation

> **Requires Chrome** (or any Chromium-based browser: Edge, Brave, Arc, etc.)

1. **Download this extension**
   - Click the green **Code** button on this GitHub page → **Download ZIP**
   - Unzip the folder somewhere on your computer (e.g. your Desktop)

2. **Open Chrome Extensions**
   - Go to `chrome://extensions` in your address bar

3. **Enable Developer Mode**
   - Toggle the **Developer mode** switch in the top-right corner

4. **Load the extension**
   - Click **Load unpacked**
   - Select the `claude-tab-switcher` folder you unzipped

5. **Done!** You should see "Claude Tab Switcher" appear in your extensions list.

---

## Usage

Once installed, Claude can:

1. **Switch to any tab** — tell Claude which tab you want and it switches instantly
2. **List all open tabs** — Claude can see all tab titles, URLs, and IDs across all windows
3. **Open a new tab** — with or without a URL
4. **Close a tab** — by name or description
5. **Reload a tab** — without you touching the keyboard
6. **Focus a window** — bring a different browser window to the front
7. **Move a tab to another window** — reorganize tabs between windows
8. **Pin / unpin a tab** — toggle the pinned state of any tab
9. **Auto-inject** — the extension automatically injects itself into all existing tabs on install and browser startup, so Claude can always switch tabs without asking you to refresh first

No setup needed beyond installation — it works automatically alongside Claude in Chrome.

---

## Important: Refresh your tabs after installing

The content script is only injected into tabs that are opened or refreshed **after** the extension is installed. Tabs that were already open won't have it.

**After installing, refresh any tab you want Claude to be able to switch from.** Claude always fires the switch command from the current active tab, so that tab needs the content script loaded.

---

## Notes

- The extension only requires the `tabs` permission (to read tab info and switch between them)
- It does **not** collect or transmit any data
- If Chrome shows a warning about Developer Mode extensions on startup, just dismiss it — this is normal for unpacked extensions
