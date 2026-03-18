// preload-main.js (Preload Script — main window)
// Exposes a minimal, typed API surface to the renderer via contextBridge.
// Never expose ipcRenderer directly — that would allow the renderer to send
// arbitrary IPC messages, which is a security risk.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  /**
   * Fetches all words from storage.
   * @returns {Promise<Array>}
   */
  getWords: () => ipcRenderer.invoke('words:getAll'),

  /**
   * Adds a new word.
   * @param {string} word
   * @param {string} translation
   * @param {string} [example]
   * @returns {Promise<object>} the created word object
   */
  addWord: (word, translation, example) =>
    ipcRenderer.invoke('words:add', { word, translation, example }),

  /**
   * Updates an existing word by id.
   * @param {string} id
   * @param {string} word
   * @param {string} translation
   * @param {string} [example]
   * @returns {Promise<object>} the updated word object
   */
  updateWord: (id, word, translation, example) =>
    ipcRenderer.invoke('words:update', { id, word, translation, example }),

  /**
   * Deletes a word by id.
   * @param {string} id
   * @returns {Promise<{success: boolean}>}
   */
  deleteWord: (id) => ipcRenderer.invoke('words:delete', id),

  /**
   * Opens a file picker dialog and imports words from a JSON file.
   * @returns {Promise<{imported: number, skipped: number}>}
   */
  importWords: () => ipcRenderer.invoke('words:import'),

  /**
   * Registers a callback that fires whenever the words list changes.
   * Returns a cleanup function — call it when the component unmounts to avoid leaks.
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  onWordsChanged: (callback) => {
    const handler = (_event) => callback()
    ipcRenderer.on('words:changed', handler)
    return () => ipcRenderer.removeListener('words:changed', handler)
  },

  getSettings: () => ipcRenderer.invoke('settings:get'),
  setOverlayMode: (mode) => ipcRenderer.invoke('settings:setOverlayMode', mode),
  setOverlayTheme: (theme) => ipcRenderer.invoke('settings:setOverlayTheme', theme),
  unlearnWord: (id) => ipcRenderer.invoke('words:unlearn', id)
})
