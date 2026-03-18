// preload-overlay.js (Preload Script — overlay window)
// Exposes only the overlay-specific API. Kept intentionally narrow.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('overlayApi', {
  /**
   * Returns the word currently queued for display.
   * @returns {Promise<object|null>}
   */
  getCurrentWord: () => ipcRenderer.invoke('overlay:getCurrentWord'),

  /**
   * Marks a word as learned and advances to the next one.
   * @param {string} id
   * @returns {Promise<{success: boolean}>}
   */
  markLearned: (id) => ipcRenderer.invoke('overlay:markLearned', id),

  /**
   * Registers a callback that fires when the main process pushes a new word.
   * @param {Function} callback  receives the word object
   * @returns {Function} unsubscribe
   */
  onShowWord: (callback) => {
    const handler = (_event, word) => callback(word)
    ipcRenderer.on('overlay:showWord', handler)
    return () => ipcRenderer.removeListener('overlay:showWord', handler)
  },

  /**
   * Registers a callback that fires when all words have been learned.
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  onAllLearned: (callback) => {
    const handler = (_event) => callback()
    ipcRenderer.on('overlay:allLearned', handler)
    return () => ipcRenderer.removeListener('overlay:allLearned', handler)
  },

  getMode: () => ipcRenderer.invoke('overlay:getMode'),

  onModeChanged: (callback) => {
    const handler = (_event, mode) => callback(mode)
    ipcRenderer.on('overlay:modeChanged', handler)
    return () => ipcRenderer.removeListener('overlay:modeChanged', handler)
  }
})
