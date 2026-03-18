// storage.js (Main Process)
// Handles persistent JSON storage with write-queue to prevent concurrent writes

const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const DEFAULT_DATA = {
  version: 1,
  words: [],
  lastShownId: null,
  settings: { overlayMode: 'classic', overlayTheme: 'dark', overlayInterval: 180, overlayPositions: { classic: null, taskbar: null } }
}

let dataFilePath = null
let cachedData = null
let isWriting = false
let pendingData = null

function getDataFilePath() {
  if (!dataFilePath) {
    dataFilePath = path.join(app.getPath('userData'), 'words.json')
  }
  return dataFilePath
}

function loadData() {
  const filePath = getDataFilePath()

  if (!fs.existsSync(filePath)) {
    cachedData = JSON.parse(JSON.stringify(DEFAULT_DATA))
    return cachedData
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)

    // Basic schema validation
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.words)) {
      console.warn('[storage] Invalid data file, resetting to defaults')
      cachedData = JSON.parse(JSON.stringify(DEFAULT_DATA))
      return cachedData
    }

    cachedData = parsed
    return cachedData
  } catch (err) {
    console.error('[storage] Failed to read data file:', err)
    cachedData = JSON.parse(JSON.stringify(DEFAULT_DATA))
    return cachedData
  }
}

function saveData(data) {
  // Write-queue: if a write is in progress, store latest data as pending
  if (isWriting) {
    pendingData = data
    return
  }

  isWriting = true
  cachedData = data

  const filePath = getDataFilePath()
  const json = JSON.stringify(data, null, 2)

  // Use async write to avoid blocking main process
  fs.writeFile(filePath, json, 'utf-8', (err) => {
    if (err) {
      console.error('[storage] Failed to write data file:', err)
    }

    isWriting = false

    // If there was a pending write, flush it now
    if (pendingData !== null) {
      const toWrite = pendingData
      pendingData = null
      saveData(toWrite)
    }
  })
}

function getData() {
  if (!cachedData) {
    loadData()
  }
  return cachedData
}

function setData(data) {
  saveData(data)
}

/**
 * Creates a new word object with a generated UUID.
 * @param {string} word
 * @param {string} translation
 * @param {string} [example]
 * @returns {object}
 */
function createWord(word, translation, example = '') {
  return {
    id: crypto.randomUUID(),
    word: word.trim(),
    translation: translation.trim(),
    example: example ? example.trim() : '',
    learned: false,
    addedAt: Date.now(),
    learnedAt: null
  }
}

function getSettings() {
  const data = getData()
  if (!data.settings || typeof data.settings !== 'object') {
    data.settings = { overlayMode: 'classic', overlayTheme: 'dark', overlayPositions: { classic: null, taskbar: null } }
  }
  if (!data.settings.overlayPositions) {
    data.settings.overlayPositions = { classic: null, taskbar: null }
  }
  if (!data.settings.overlayTheme) {
    data.settings.overlayTheme = 'dark'
  }
  if (!data.settings.overlayInterval) {
    data.settings.overlayInterval = 180
  }
  return data.settings
}

function getOverlayPosition(mode) {
  return getSettings().overlayPositions?.[mode] ?? null
}

function saveOverlayPosition(mode, pos) {
  const settings = getSettings()
  settings.overlayPositions[mode] = pos
  saveSettings(settings)
}

function saveSettings(settings) {
  const data = getData()
  data.settings = settings
  setData(data)
}

module.exports = { loadData, saveData, getData, setData, createWord, getSettings, saveSettings, getOverlayPosition, saveOverlayPosition }
