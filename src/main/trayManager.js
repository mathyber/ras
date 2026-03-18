// trayManager.js (Main Process)
// Creates and manages the system tray icon and its context menu.

const { Tray, Menu, nativeImage, app } = require('electron')

// Inline SVG encoded as a base64 PNG via nativeImage so we have zero file dependencies.
// The SVG is a simple book icon on a transparent background, 16x16.
const TRAY_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <rect width="16" height="16" rx="2" fill="#4A9EFF"/>
  <text x="8" y="12" font-family="Arial" font-size="11" font-weight="bold"
        text-anchor="middle" fill="white">D</text>
</svg>
`

function svgToNativeImage(svgString) {
  const base64 = Buffer.from(svgString.trim()).toString('base64')
  const dataUrl = `data:image/svg+xml;base64,${base64}`
  return nativeImage.createFromDataURL(dataUrl)
}

let trayInstance = null

/**
 * Creates the system tray icon.
 * @param {object} opts
 * @param {Function} opts.openMainWindow  - callback to show/focus the main window
 */
function createTray({ openMainWindow }) {
  const icon = svgToNativeImage(TRAY_ICON_SVG)

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
