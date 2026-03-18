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
 * Calculates overlay window bounds and alwaysOnTop level based on mode.
 * @param {'classic'|'taskbar'} mode
 * @returns {{ x, y, width, height, alwaysOnTopLevel }}
 */
function getOverlayBounds(mode) {
  const display = screen.getPrimaryDisplay()
  const { workArea, bounds } = display

  if (mode === 'taskbar') {
    // Taskbar occupies the strip below workArea
    const taskbarHeight = bounds.height - (workArea.y + workArea.height)
    const height = Math.max(taskbarHeight > 0 ? taskbarHeight : 48, 40)
    const width = 320
    return {
      width,
      height,
      x: workArea.x + workArea.width - width,
      y: workArea.y + workArea.height,
      alwaysOnTopLevel: 'screen-saver'
    }
  }

  // classic: floating card just above taskbar, bottom-right
  return {
    width: 320,
    height: 130,
    x: workArea.x + workArea.width - 325,
    y: workArea.y + workArea.height - 130,
    alwaysOnTopLevel: 'floating'
  }
}

/**
 * Repositions and resizes an existing overlay window to match the given mode.
 * @param {BrowserWindow} win
 * @param {'classic'|'taskbar'} mode
 */
function repositionOverlay(win, mode) {
  if (!win || win.isDestroyed()) return
  const { x, y, width, height, alwaysOnTopLevel } = getOverlayBounds(mode)
  win.setBounds({ x, y, width, height })
  win.setAlwaysOnTop(true, alwaysOnTopLevel)
}

/**
 * Creates the always-on-top transparent overlay window.
 * @param {'classic'|'taskbar'} mode
 * @returns {BrowserWindow}
 */
function createOverlayWindow(mode = 'classic') {
  const { x, y, width, height, alwaysOnTopLevel } = getOverlayBounds(mode)
  const preloadPath = getPreloadPath('preload-overlay.js')

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  // Apply precise always-on-top level (screen-saver goes above taskbar)
  win.setAlwaysOnTop(true, alwaysOnTopLevel)

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

module.exports = { createOverlayWindow, createMainWindow, repositionOverlay }
