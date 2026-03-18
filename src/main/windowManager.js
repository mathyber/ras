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
 * Detects taskbar edge (bottom/top/left/right) from workArea vs bounds delta.
 * @param {'classic'|'taskbar'} mode
 * @param {{x:number,y:number}|null} [savedPos]  persisted position (x only for taskbar)
 * @returns {{ x, y, width, height, alwaysOnTopLevel }}
 */
function getOverlayBounds(mode, savedPos) {
  const display = screen.getPrimaryDisplay()
  const { workArea: wa, bounds: b } = display

  if (mode === 'taskbar') {
    const trimBottom = (b.y + b.height) - (wa.y + wa.height)
    const trimTop    = wa.y - b.y
    const trimRight  = (b.x + b.width)  - (wa.x + wa.width)
    const trimLeft   = wa.x - b.x

    const OVERLAY_WIDTH = 320

    function clampX(x, width) {
      return Math.max(wa.x, Math.min(x, wa.x + wa.width - width))
    }

    if (trimBottom >= trimTop && trimBottom >= trimRight && trimBottom >= trimLeft && trimBottom > 0) {
      const height = Math.max(trimBottom, 40)
      const width  = Math.min(OVERLAY_WIDTH, wa.width)
      const x = savedPos ? clampX(savedPos.x, width) : wa.x + Math.floor((wa.width - width) / 2)
      return { width, height, x, y: wa.y + wa.height, alwaysOnTopLevel: 'screen-saver' }
    }

    if (trimTop >= trimBottom && trimTop >= trimRight && trimTop >= trimLeft && trimTop > 0) {
      const height = Math.max(trimTop, 40)
      const width  = Math.min(OVERLAY_WIDTH, wa.width)
      const x = savedPos ? clampX(savedPos.x, width) : wa.x + Math.floor((wa.width - width) / 2)
      return { width, height, x, y: b.y, alwaysOnTopLevel: 'screen-saver' }
    }

    if (trimRight >= trimLeft && trimRight > 0) {
      const width  = Math.max(trimRight, 40)
      const height = Math.min(120, wa.height)
      const y = savedPos ? Math.max(wa.y, Math.min(savedPos.y, wa.y + wa.height - height)) : wa.y + wa.height - height
      return { width, height, x: wa.x + wa.width, y, alwaysOnTopLevel: 'screen-saver' }
    }

    if (trimLeft > 0) {
      const width  = Math.max(trimLeft, 40)
      const height = Math.min(120, wa.height)
      const y = savedPos ? Math.max(wa.y, Math.min(savedPos.y, wa.y + wa.height - height)) : wa.y + wa.height - height
      return { width, height, x: b.x, y, alwaysOnTopLevel: 'screen-saver' }
    }

    return {
      width: OVERLAY_WIDTH, height: 48,
      x: b.x + b.width - OVERLAY_WIDTH, y: b.y + b.height - 48,
      alwaysOnTopLevel: 'screen-saver'
    }
  }

  // classic: floating card, default bottom-right, or saved position
  const defaultX = wa.x + wa.width - 325
  const defaultY = wa.y + wa.height - 100
  return {
    width: 300,
    height: 100,
    x: savedPos ? savedPos.x : defaultX,
    y: savedPos ? savedPos.y : defaultY,
    alwaysOnTopLevel: 'floating'
  }
}

/**
 * Repositions and resizes an existing overlay window to match the given mode.
 * @param {BrowserWindow} win
 * @param {'classic'|'taskbar'} mode
 * @param {{x:number,y:number}|null} [savedPos]
 */
function repositionOverlay(win, mode, savedPos) {
  if (!win || win.isDestroyed()) return
  const { x, y, width, height, alwaysOnTopLevel } = getOverlayBounds(mode, savedPos)
  win.setBounds({ x, y, width, height })
  win.setAlwaysOnTop(true, alwaysOnTopLevel)
}

/**
 * Creates the always-on-top transparent overlay window.
 * @param {'classic'|'taskbar'} mode
 * @param {{x:number,y:number}|null} [savedPos]
 * @returns {BrowserWindow}
 */
function createOverlayWindow(mode = 'classic', savedPos) {
  const { x, y, width, height, alwaysOnTopLevel } = getOverlayBounds(mode, savedPos)
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
    movable: true,
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
    title: 'Slovariken',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
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

module.exports = { createOverlayWindow, createMainWindow, repositionOverlay, getOverlayBounds }
