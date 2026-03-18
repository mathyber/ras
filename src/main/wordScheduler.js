// wordScheduler.js (Main Process)
// Manages the timed cycling of words shown in the overlay window

const { getData, setData } = require('./storage')

let intervalMs = 180_000 // default 3 minutes, configurable via setIntervalMs()

let overlayWindowRef = null
let timerHandle = null
let currentWord = null

/**
 * Picks the next unlearned word in round-robin order starting after lastShownId.
 * Returns null if there are no unlearned words.
 * @param {Array} words
 * @param {string|null} lastShownId
 * @returns {object|null}
 */
function getNextWord(words, lastShownId) {
  const unlearned = words.filter(w => !w.learned)

  if (unlearned.length === 0) return null

  const lastIndex = unlearned.findIndex(w => w.id === lastShownId)
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % unlearned.length

  return unlearned[nextIndex]
}

/**
 * Shows the next word in the overlay.
 * If no unlearned words remain, sends the allLearned event and hides the overlay.
 */
function showNext() {
  if (!overlayWindowRef || overlayWindowRef.isDestroyed()) return

  const data = getData()
  const next = getNextWord(data.words, data.lastShownId)

  if (!next) {
    currentWord = null
    // Notify overlay that all words are learned
    if (!overlayWindowRef.isDestroyed()) {
      overlayWindowRef.webContents.send('overlay:allLearned')
      overlayWindowRef.hide()
    }
    return
  }

  currentWord = next

  // Persist lastShownId so we resume from the same position after restart
  data.lastShownId = next.id
  setData(data)

  if (!overlayWindowRef.isDestroyed()) {
    overlayWindowRef.show()
    overlayWindowRef.webContents.send('overlay:showWord', next)
  }
}

/**
 * Clears the existing timer and starts a new one.
 */
function resetTimer() {
  if (timerHandle) {
    clearInterval(timerHandle)
    timerHandle = null
  }

  timerHandle = setInterval(() => {
    showNext()
  }, intervalMs)
}

/**
 * Initialises the scheduler.
 * Call once after the overlay window is ready to receive IPC messages.
 * @param {BrowserWindow} overlayWindow
 */
function startScheduler(overlayWindow) {
  overlayWindowRef = overlayWindow

  // BUG-004: start timer only after first word is shown so the 3-min window
  // is counted from the moment the user first sees the word, not from app launch
  overlayWindow.webContents.on('did-finish-load', () => {
    showNext()
    resetTimer()
  })
}

/**
 * Stops the scheduler timer. Call on app quit.
 */
function stopScheduler() {
  if (timerHandle) {
    clearInterval(timerHandle)
    timerHandle = null
  }
}

/**
 * If the currently displayed word was edited, re-sends it to the overlay.
 * Called after words:update so the overlay reflects the change immediately.
 */
function refreshCurrentWord() {
  if (!currentWord || !overlayWindowRef || overlayWindowRef.isDestroyed()) return
  const data = getData()
  const updated = data.words.find(w => w.id === currentWord.id)
  if (updated && !updated.learned) {
    currentWord = updated
    overlayWindowRef.webContents.send('overlay:showWord', updated)
  }
}

function getCurrentWord() {
  return currentWord
}

function setIntervalMs(ms) {
  intervalMs = ms
  resetTimer()
}

module.exports = { startScheduler, stopScheduler, resetTimer, showNext, getCurrentWord, getNextWord, refreshCurrentWord, setIntervalMs }
