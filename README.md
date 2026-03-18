# Slovariken

Slovariken is a desktop vocabulary learning tool built with Electron and React. It sits quietly in the system tray and surfaces words from your personal dictionary through a floating overlay that cycles automatically every 3 minutes, keeping vocabulary practice unobtrusive while you work in other apps. All data is stored locally in JSON — no accounts, no internet connection required.

## Features

- Add, edit, and delete words with translations and optional example sentences
- Floating overlay cycles through unlearned words every 3 minutes; mark a word as learned on hover
- Learned words can be returned to rotation ("unlearned") from the dictionary UI
- Filter word list by All, Pending, or Learned
- Bulk import from JSON
- Overlay position persisted per mode
- Dark and light overlay themes, switchable in Settings
- English and Russian UI languages, toggled from the header
- Tray-only operation — no taskbar icon, no menu bar

## Overlay Modes

Two modes are available and configurable in Settings:

**Classic** — a small floating card anchored to the bottom-right corner of the screen, above the taskbar. Draggable to any position on screen.

**Taskbar** — a slim bar overlaid directly on top of the Windows taskbar, centered horizontally. Draggable along the taskbar.

## Getting Started

**Requirements:** Node.js with npm.

Install dependencies:

```
npm install
```

Run in development mode (renderer + main process with hot reload):

```
npm run dev
```

Build the renderer and main process:

```
npm run build
```

Package to a Windows executable:

```
npx electron-builder --dir
```

Output is placed in `release/win-unpacked/`.

> **Note:** electron-builder requires winCodeSign. If the build fails with a symlink error on Windows, locate the winCodeSign archive in `%APPDATA%\Local\electron-builder\Cache\winCodeSign\` and extract it manually using 7-Zip. Ignore symlink errors on the two `.dylib` files — they are macOS artifacts and do not affect the Windows build.

## Tech Stack

- Electron 34, React 19, Vite 6
- Data stored in JSON in the OS user data folder (`app.getPath('userData')`)

## JSON Import Format

Words can be imported in bulk via JSON. Each entry requires `word` and `translation`; `example` is optional.

```json
[
  { "word": "ubiquitous", "translation": "вездесущий", "example": "Smartphones are ubiquitous." },
  { "word": "ephemeral", "translation": "эфемерный" }
]
```

The array can also be wrapped in an object:

```json
{ "words": [ ... ] }
```
