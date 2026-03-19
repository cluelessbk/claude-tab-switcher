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

- **Switch to any tab** — just tell Claude which tab you want to switch to
- **List all open tabs** — Claude can see your tab titles and URLs to find the right one

No setup needed beyond installation — it works automatically alongside Claude in Chrome.

---

## Notes

- The extension only requires the `tabs` permission (to read tab info and switch between them)
- It does **not** collect or transmit any data
- If Chrome shows a warning about Developer Mode extensions on startup, just dismiss it — this is normal for unpacked extensions
