// trayManager.js (Main Process)
// Creates and manages the system tray icon and its context menu.

const { Tray, Menu, nativeImage, app } = require('electron')

/**
 * Creates a 16x16 tray icon using raw RGBA buffer — guaranteed to work on all
 * platforms without file dependencies or SVG decoder availability concerns.
 * Draws a blue (#4A9EFF) rounded square with a white center pixel pattern.
 */
function createTrayIcon() {
  const SIZE = 16
  const buf = Buffer.alloc(SIZE * SIZE * 4)

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4
      // Simple rounded-corner mask: corners of a 2px radius rect are transparent
      const corner = (x < 2 || x >= SIZE - 2) && (y < 2 || y >= SIZE - 2)
      if (corner) {
        // transparent
        buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 0
      } else {
        // Blue #4A9EFF background
        buf[i] = 74; buf[i + 1] = 158; buf[i + 2] = 255; buf[i + 3] = 255
      }
    }
  }

  // Draw a minimal "D" shape in white pixels (7x9 area centered at 8,8)
  const white = [[4,3],[4,4],[4,5],[4,6],[4,7],[4,8],[4,9],[4,10],[4,11],
                  [5,3],[5,11],[6,3],[6,11],[7,3],[7,4],[7,10],[7,11],
                  [8,4],[8,5],[8,9],[8,10],[9,5],[9,6],[9,7],[9,8],[9,9]]
  for (const [px, py] of white) {
    if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
      const i = (py * SIZE + px) * 4
      buf[i] = 255; buf[i + 1] = 255; buf[i + 2] = 255; buf[i + 3] = 255
    }
  }

  return nativeImage.createFromBuffer(buf, { width: SIZE, height: SIZE })
}

let trayInstance = null

/**
 * Creates the system tray icon.
 * @param {object} opts
 * @param {Function} opts.openMainWindow  - callback to show/focus the main window
 */
function createTray({ openMainWindow }) {
  const icon = createTrayIcon()

  trayInstance = new Tray(icon)
  trayInstance.setToolTip('RAS Dictionary')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dictionary',
      click: () => openMainWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Remove the close interceptor before quitting so windows actually close
        app.quit()
      }
    }
  ])

  trayInstance.setContextMenu(contextMenu)

  // Double-click on tray icon opens the main window (Windows behaviour)
  trayInstance.on('double-click', () => openMainWindow())

  return trayInstance
}

function destroyTray() {
  if (trayInstance) {
    trayInstance.destroy()
    trayInstance = null
  }
}

module.exports = { createTray, destroyTray }
