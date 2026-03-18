// ipcHandlers.js (Main Process)
// Registers all ipcMain handlers. Called once from main.js after app is ready.

const { ipcMain, dialog } = require('electron')
const fs = require('fs')
const { getData, setData, createWord } = require('./storage')
const scheduler = require('./wordScheduler')

let mainWindowRef = null

/**
 * Pushes a 'words:changed' event to the main window renderer if it exists.
 */
function notifyMainWindow() {
  if (mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef.webContents) {
    mainWindowRef.webContents.send('words:changed')
  }
}

/**
 * Registers all IPC handlers.
 * @param {object} opts
 * @param {Function} opts.getMainWindow  - returns the current mainWindow (may be null/lazy)
 */
function registerIpcHandlers({ getMainWindow }) {
  // Keep a live reference so notifyMainWindow always uses the latest window
  ipcMain.handle('words:getAll', () => {
    const data = getData()
    return data.words
  })

  ipcMain.handle('words:add', (_event, { word, translation, example }) => {
    if (!word || !translation) {
      throw new Error('word and translation are required')
    }

    const data = getData()
    const newWord = createWord(word, translation, example)
    data.words.push(newWord)
    setData(data)

    mainWindowRef = getMainWindow()
    notifyMainWindow()

    return newWord
  })

  ipcMain.handle('words:update', (_event, { id, word, translation, example }) => {
    if (!id || !word || !translation) {
      throw new Error('id, word and translation are required')
    }

    const data = getData()
    const idx = data.words.findIndex(w => w.id === id)

    if (idx === -1) throw new Error(`Word not found: ${id}`)

    data.words[idx] = {
      ...data.words[idx],
      word: word.trim(),
      translation: translation.trim(),
      example: example ? example.trim() : ''
    }

    setData(data)

    mainWindowRef = getMainWindow()
    notifyMainWindow()

    return data.words[idx]
  })

  ipcMain.handle('words:delete', (_event, id) => {
    if (!id) throw new Error('id is required')

    const data = getData()
    const idx = data.words.findIndex(w => w.id === id)

    if (idx === -1) throw new Error(`Word not found: ${id}`)

    const wasCurrentWord = data.lastShownId === id
    data.words.splice(idx, 1)

    // If we deleted the word that was currently shown, advance to the next one
    if (wasCurrentWord) {
      data.lastShownId = null
      setData(data)
      scheduler.showNext()
    } else {
      setData(data)
    }

    mainWindowRef = getMainWindow()
    notifyMainWindow()

    return { success: true }
  })

  ipcMain.handle('words:import', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import words from JSON',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { imported: 0, skipped: 0 }
    }

    const filePath = result.filePaths[0]
    let parsed

    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      parsed = JSON.parse(raw)
    } catch (err) {
      throw new Error(`Failed to read or parse file: ${err.message}`)
    }

    // Accept either an array of words or an object with a words array
    const incoming = Array.isArray(parsed) ? parsed : parsed.words

    if (!Array.isArray(incoming)) {
      throw new Error('JSON must be an array of words or an object with a "words" array')
    }

    const data = getData()
    let imported = 0
    let skipped = 0

    for (const item of incoming) {
      if (!item.word || !item.translation) {
        skipped++
        continue
      }
      const newWord = createWord(item.word, item.translation, item.example || '')
      // Preserve learned state if present in the import
      if (item.learned === true) {
        newWord.learned = true
        newWord.learnedAt = item.learnedAt || Date.now()
      }
      data.words.push(newWord)
      imported++
    }

    setData(data)

    mainWindowRef = getMainWindow()
    notifyMainWindow()

    return { imported, skipped }
  })

  ipcMain.handle('overlay:getCurrentWord', () => {
    return scheduler.getCurrentWord()
  })

  ipcMain.handle('overlay:markLearned', (_event, id) => {
    if (!id) throw new Error('id is required')

    const data = getData()
    const idx = data.words.findIndex(w => w.id === id)

    if (idx === -1) throw new Error(`Word not found: ${id}`)

    data.words[idx].learned = true
    data.words[idx].learnedAt = Date.now()
    setData(data)

    // Reset the 3-minute timer and show the next word immediately
    scheduler.resetTimer()
    scheduler.showNext()

    mainWindowRef = getMainWindow()
    notifyMainWindow()

    return { success: true }
  })
}

module.exports = { registerIpcHandlers }
