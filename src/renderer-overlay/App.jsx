// App.jsx (Renderer Process — overlay window)
// Minimal floating card showing the current word.
// Hover detection for the "Mark Learned" button uses CSS classes, not useState,
// to avoid triggering React re-renders on every mouse-move event.

import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function App() {
  const [word, setWord] = useState(null)
  const [allLearned, setAllLearned] = useState(false)
  const [marking, setMarking] = useState(false)
  const cardRef = useRef(null)

  // ─── IPC Subscriptions ──────────────────────────────────────────────────────

  useEffect(() => {
    // Fetch the word that was set before this component mounted
    window.overlayApi.getCurrentWord().then(w => {
      if (w) setWord(w)
    })

    // Main process pushes a new word every 3 minutes (or after markLearned)
    const unsubShow = window.overlayApi.onShowWord((newWord) => {
      setAllLearned(false)
      setWord(newWord)
    })

    // Main process fires this when all words are learned
    const unsubAll = window.overlayApi.onAllLearned(() => {
      setAllLearned(true)
      setWord(null)
    })

    return () => {
      if (typeof unsubShow === 'function') unsubShow()
      if (typeof unsubAll === 'function') unsubAll()
    }
  }, [])

  // ─── Hover: toggle CSS class on card element ─────────────────────────────────
  // Using DOM manipulation here intentionally: we want zero React re-renders for
  // mouse-move-adjacent events. The CSS class drives the button visibility.

  const handleMouseEnter = useCallback(() => {
    cardRef.current?.classList.add('hovered')
  }, [])

  const handleMouseLeave = useCallback(() => {
    cardRef.current?.classList.remove('hovered')
  }, [])

  // ─── Mark Learned ────────────────────────────────────────────────────────────

  async function handleMarkLearned() {
    if (!word || marking) return
    setMarking(true)
    try {
      await window.overlayApi.markLearned(word.id)
      // The main process will push a new word via onShowWord
    } catch (err) {
      console.error('[overlay] markLearned failed:', err)
      setMarking(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (allLearned) {
    return (
      <div style={cardStyle}>
        <div style={styles.allLearnedText}>All words learned!</div>
      </div>
    )
  }

  if (!word) {
    // Nothing to show — the window should be hidden by main process already
    return null
  }

  return (
    <div
      ref={cardRef}
      className="overlay-card"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Word content — keyed by id so it re-animates on word change */}
      <div className="word-content" key={word.id} style={styles.content}>
        <div style={styles.wordText}>{word.word}</div>
        <div style={styles.translationText}>{word.translation}</div>
        {word.example ? (
          <div style={styles.exampleText}>{word.example}</div>
        ) : null}
      </div>

      {/* Mark Learned button — visibility controlled by CSS .hovered class */}
      <button
        className="btn-learned"
        style={{
          ...styles.learnedBtn,
          cursor: marking ? 'default' : 'pointer'
        }}
        onClick={handleMarkLearned}
        disabled={marking}
      >
        {marking ? '...' : 'Learned'}
      </button>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle = {
  width: '100%',
  height: '100%',
  background: 'rgba(20, 20, 20, 0.92)',
  borderRadius: 12,
  padding: '12px 14px 10px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
  position: 'relative',
  overflow: 'hidden'
}

const styles = {
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    flex: 1
  },
  wordText: {
    fontSize: 20,
    fontWeight: 700,
    color: '#ffffff',
    lineHeight: 1.2,
    letterSpacing: '-0.3px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  translationText: {
    fontSize: 14,
    color: '#cccccc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  exampleText: {
    fontSize: 11,
    color: '#888888',
    fontStyle: 'italic',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 1.4,
    marginTop: 2,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  learnedBtn: {
    alignSelf: 'flex-end',
    padding: '3px 10px',
    background: 'rgba(74, 158, 255, 0.2)',
    border: '1px solid rgba(74, 158, 255, 0.4)',
    borderRadius: 6,
    color: '#4A9EFF',
    fontSize: 11,
    fontWeight: 600,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    letterSpacing: 0.3,
    transition: 'background 0.15s',
    flexShrink: 0
  },
  allLearnedText: {
    fontSize: 13,
    color: '#3ecf8e',
    fontWeight: 600,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    textAlign: 'center',
    margin: 'auto'
  }
}
