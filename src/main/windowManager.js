// windowManager.js (Main Process)
// Factory functions for creating BrowserWindow instances.

const { BrowserWindow, screen } = require('electron')
const path = require('path')

// Vite dev server URL is injected by vite-plugin-electron at build time
const DEV_URL = process.env.VITE_DEV_SERVER_URL

function getPreloadPath(filename) {
  // In dev mode vite-plugin-electron writes preloads next to main.js in dist-electron
  // In production they land in the same directory as main.js after packaging
  return path.join(__dirname, '../../dist-electron/preload', filename)
}

/**
 * Creates the always-on-top transparent overlay window.
 * Positioned in the bottom-right corner of the primary display work area.
 * @returns {BrowserWindow}
 */
function createOverlayWindow() {
  const { workArea } = screen.getPrimaryDisplay()
  const preloadPath = getPreloadPath('preload-overlay.js')

  const win = new BrowserWindow({
    width: 320,
    height: 130,
    x: workArea.x + workArea.width - 325,
    y: workArea.y + workArea.height - 130, // flush with taskbar top, no gap
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    show: false, // shown by wordScheduler once a word is ready
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Prevent the window from being destroyed — hide it instead
  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })

  if (DEV_URL) {
    win.loadURL(`${DEV_URL}src/renderer-overlay/index.html`)
  } else {
    win.loadFile(path.join(__dirname, '../../dist/src/renderer-overlay/index.html'))
  }

  return win
}

/**
 * Creates the main dictionary management window.
 * Lazily instantiated the first time the user opens it from the tray.
 * @returns {BrowserWindow}
 */
function createMainWindow() {
  const preloadPath = getPreloadPath('preload-main.js')

  const win = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 600,
    minHeight: 400,
    title: 'RAS — Dictionary',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Hide instead of close so the app keeps running in the tray
  win.on('close', (e) => {
    e.preventDefault()
    win.hide()
  })

  if (DEV_URL) {
    win.loadURL(`${DEV_URL}src/renderer-main/index.html`)
  } else {
    win.loadFile(path.join(__dirname, '../../dist/src/renderer-main/index.html'))
  }

  return win
}

module.exports = { createOverlayWindow, createMainWindow }
