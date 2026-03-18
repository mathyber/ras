// App.jsx (Renderer Process — overlay window)
import React, { useState, useEffect, useRef, useCallback } from 'react'

export default function App() {
  const [word, setWord] = useState(null)
  const [allLearned, setAllLearned] = useState(false)
  const [marking, setMarking] = useState(false)
  const [mode, setMode] = useState('classic')
  const cardRef = useRef(null)

  // ─── IPC Subscriptions ──────────────────────────────────────────────────────

  useEffect(() => {
    window.overlayApi.getMode().then(m => setMode(m || 'classic'))
    window.overlayApi.getCurrentWord().then(w => { if (w) setWord(w) })

    const unsubShow = window.overlayApi.onShowWord((newWord) => {
      setAllLearned(false)
      setMarking(false)
      setWord(newWord)
    })

    const unsubAll = window.overlayApi.onAllLearned(() => {
      setAllLearned(true)
      setWord(null)
    })

    const unsubMode = window.overlayApi.onModeChanged((m) => setMode(m))

    return () => {
      if (typeof unsubShow === 'function') unsubShow()
      if (typeof unsubAll === 'function') unsubAll()
      if (typeof unsubMode === 'function') unsubMode()
    }
  }, [])

  // ─── Hover (CSS class, no re-render) ────────────────────────────────────────

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
    } catch (err) {
      console.error('[overlay] markLearned failed:', err)
      setMarking(false)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (allLearned) {
    return (
      <div style={mode === 'taskbar' ? taskbarCardStyle : classicCardStyle}>
        <div style={s.allLearnedText}>All words learned!</div>
      </div>
    )
  }

  if (!word) return null

  if (mode === 'taskbar') {
    return (
      <div
        ref={cardRef}
        className="overlay-card"
        style={taskbarCardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={s.taskbarContent}>
          <span style={s.taskbarWord}>{word.word}</span>
          <span style={s.taskbarSep}>·</span>
          <span style={s.taskbarTranslation}>{word.translation}</span>
          {word.example && (
            <span style={s.taskbarExample} title={word.example}>
              {word.example}
            </span>
          )}
        </div>
        <button
          className="btn-learned"
          style={{ ...s.taskbarBtn, cursor: marking ? 'default' : 'pointer' }}
          onClick={handleMarkLearned}
          disabled={marking}
        >
          {marking ? '…' : '✓'}
        </button>
      </div>
    )
  }

  // classic mode
  return (
    <div
      ref={cardRef}
      className="overlay-card"
      style={classicCardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="word-content" key={word.id} style={s.classicContent}>
        <div style={s.wordText}>{word.word}</div>
        <div style={s.translationText}>{word.translation}</div>
        {word.example ? <div style={s.exampleText}>{word.example}</div> : null}
      </div>

      <button
        className="btn-learned"
        style={{ ...s.learnedBtn, cursor: marking ? 'default' : 'pointer' }}
        onClick={handleMarkLearned}
        disabled={marking}
      >
        {marking ? '...' : 'Learned'}
      </button>
    </div>
  )
}

// ─── Shared base ──────────────────────────────────────────────────────────────

const BASE = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  overflow: 'hidden',
  position: 'relative',
  boxSizing: 'border-box'
}

// ─── Classic card ─────────────────────────────────────────────────────────────

const classicCardStyle = {
  ...BASE,
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'stretch',
  background: 'rgba(20, 20, 20, 0.92)',
  borderRadius: 12,
  padding: '12px 14px 10px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
  WebkitAppRegion: 'drag'
}

// ─── Taskbar card ─────────────────────────────────────────────────────────────

const taskbarCardStyle = {
  ...BASE,
  flexDirection: 'row',
  justifyContent: 'space-between',
  background: 'rgba(24, 24, 24, 0.97)',
  borderRadius: 0,
  padding: '0 10px 0 12px',
  borderLeft: '2px solid rgba(74, 158, 255, 0.6)',
  WebkitAppRegion: 'drag'
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  // classic
  classicContent: {
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
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  translationText: {
    fontSize: 14,
    color: '#cccccc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  exampleText: {
    fontSize: 11,
    color: '#888888',
    fontStyle: 'italic',
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
    letterSpacing: 0.3,
    transition: 'background 0.15s',
    flexShrink: 0,
    WebkitAppRegion: 'no-drag'
  },

  // taskbar
  taskbarContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden'
  },
  taskbarWord: {
    fontSize: 13,
    fontWeight: 700,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  taskbarSep: {
    color: '#555',
    fontSize: 12,
    flexShrink: 0
  },
  taskbarTranslation: {
    fontSize: 12,
    color: '#aaaaaa',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flexShrink: 1
  },
  taskbarExample: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flexShrink: 2,
    cursor: 'default'
  },
  taskbarBtn: {
    padding: '2px 8px',
    background: 'transparent',
    border: '1px solid rgba(74, 158, 255, 0.35)',
    borderRadius: 4,
    color: '#4A9EFF',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginLeft: 6,
    WebkitAppRegion: 'no-drag'
  },

  // shared
  allLearnedText: {
    fontSize: 12,
    color: '#3ecf8e',
    fontWeight: 600,
    textAlign: 'center',
    margin: 'auto'
  }
}
