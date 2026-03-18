// main.js (Main Process)
// Application entry point. Bootstraps storage, windows, tray, IPC, and the word scheduler.

const { app, screen } = require('electron')
const { loadData, getOverlayPosition, saveOverlayPosition } = require('./storage')
const { createOverlayWindow, createMainWindow, getOverlayBounds } = require('./windowManager')
const { createTray, destroyTray } = require('./trayManager')
const { registerIpcHandlers } = require('./ipcHandlers')
const scheduler = require('./wordScheduler')

let overlayWindow = null
let mainWindow = null  // lazy — only created when user opens from tray
let cursorPollingHandle = null
let overlayMode = 'classic'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the main window, creating it lazily on first access.
 */
function getMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow()
  }
  return mainWindow
}

/**
 * Shows and focuses the main window (creates it if needed).
 */
function openMainWindow() {
  const win = getMainWindow()
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

// ─── Cursor Polling for Overlay Click-Through ─────────────────────────────────
// Electron doesn't have built-in hover events for frameless windows with
// setIgnoreMouseEvents. We poll the cursor position every 100ms and toggle
// mouse-event passthrough based on whether the cursor is over the overlay.

function startCursorPolling() {
  let topTickCounter = 0

  cursorPollingHandle = setInterval(() => {
    if (!overlayWindow || overlayWindow.isDestroyed() || !overlayWindow.isVisible()) return

    const cursor = screen.getCursorScreenPoint()
    const bounds = overlayWindow.getBounds()

    const isHovered = (
      cursor.x >= bounds.x &&
      cursor.x <= bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y <= bounds.y + bounds.height
    )

    // When hovered: accept mouse events (so the "Mark Learned" button is clickable)
    // When not hovered: forward mouse events through (click-through behaviour)
    overlayWindow.setIgnoreMouseEvents(!isHovered, { forward: true })

    // In taskbar mode re-assert z-order every second so the overlay doesn't sink
    // behind the taskbar when the user clicks on it (Windows resets z-order).
    if (overlayMode === 'taskbar') {
      topTickCounter++
      if (topTickCounter >= 10) {
        topTickCounter = 0
        overlayWindow.moveTop()
      }
    } else {
      topTickCounter = 0
    }
  }, 100)
}

// ─── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // 1. Load persisted data into the in-memory cache
  const data = loadData()
  overlayMode = data?.settings?.overlayMode || 'classic'

  // 2. Register all IPC handlers before any window is created
  registerIpcHandlers({
    getMainWindow,
    getOverlayWindow: () => overlayWindow,
    onModeChange: (m) => { overlayMode = m }
  })

  // 3. Create the always-on-top overlay (hidden until a word is ready)
  overlayWindow = createOverlayWindow(overlayMode, getOverlayPosition(overlayMode))

  // Save position when user drags the overlay.
  // For taskbar mode: snap y back to the taskbar strip, persist only x.
  // For classic mode: persist both x and y.
  overlayWindow.on('moved', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const b = overlayWindow.getBounds()
    if (overlayMode === 'taskbar') {
      const { y, height } = getOverlayBounds('taskbar')
      if (b.y !== y || b.height !== height) {
        overlayWindow.setBounds({ ...b, y, height })
      }
      saveOverlayPosition('taskbar', { x: b.x })
    } else {
      saveOverlayPosition('classic', { x: b.x, y: b.y })
    }
  })

  // 4. Start the word scheduler — it will show the first word once the overlay loads
  scheduler.startScheduler(overlayWindow)

  // 5. Create the system tray icon
  createTray({ openMainWindow })

  // 6. Start polling cursor for overlay hover detection
  startCursorPolling()
})

// Keep the app alive in the tray even when all windows are closed
app.on('window-all-closed', () => {
  // Intentionally do NOT call app.quit() here — the app lives in the tray
})

app.on('before-quit', () => {
  // WARN-001: stop all intervals to avoid resource leaks
  if (cursorPollingHandle) {
    clearInterval(cursorPollingHandle)
    cursorPollingHandle = null
  }
  scheduler.stopScheduler()

  // Allow overlay and main window to actually close on quit
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.removeAllListeners('close')
    overlayWindow.close()
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close')
    mainWindow.close()
  }

  destroyTray()
})

// macOS: re-create main window on dock icon click if all windows are hidden
app.on('activate', () => {
  openMainWindow()
})
