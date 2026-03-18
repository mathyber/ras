// App.jsx (Renderer Process — overlay window)
import React, { useState, useEffect, useRef, useCallback } from 'react'

function getColors(theme) {
  if (theme === 'light') {
    return {
      classicBg: 'rgba(248, 248, 248, 0.96)',
      classicShadow: '0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.07)',
      taskbarBg: 'rgba(240, 240, 240, 0.98)',
      taskbarBorderColor: 'rgba(37, 99, 235, 0.7)',
      word: '#111111',
      translation: '#444444',
      example: '#777777',
      sep: '#aaaaaa',
      btnColor: '#2563eb',
      btnBorder: 'rgba(37, 99, 235, 0.4)',
      btnBg: 'rgba(37, 99, 235, 0.1)',
      btnBgBorder: 'rgba(37, 99, 235, 0.3)',
      allLearned: '#059669',
    }
  }
  return {
    classicBg: 'rgba(20, 20, 20, 0.92)',
    classicShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',
    taskbarBg: 'rgba(24, 24, 24, 0.97)',
    taskbarBorderColor: 'rgba(74, 158, 255, 0.6)',
    word: '#ffffff',
    translation: '#cccccc',
    example: '#888888',
    sep: '#555555',
    btnColor: '#4A9EFF',
    btnBorder: 'rgba(74, 158, 255, 0.35)',
    btnBg: 'rgba(74, 158, 255, 0.2)',
    btnBgBorder: 'rgba(74, 158, 255, 0.4)',
    allLearned: '#3ecf8e',
  }
}

export default function App() {
  const [word, setWord] = useState(null)
  const [allLearned, setAllLearned] = useState(false)
  const [marking, setMarking] = useState(false)
  const [mode, setMode] = useState('classic')
  const [theme, setTheme] = useState('dark')
  const cardRef = useRef(null)

  // ─── IPC Subscriptions ──────────────────────────────────────────────────────

  useEffect(() => {
    window.overlayApi.getMode().then(m => setMode(m || 'classic'))
    window.overlayApi.getTheme().then(t => setTheme(t || 'dark'))
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

    const unsubTheme = window.overlayApi.onThemeChanged((t) => setTheme(t))

    return () => {
      if (typeof unsubShow === 'function') unsubShow()
      if (typeof unsubAll === 'function') unsubAll()
      if (typeof unsubMode === 'function') unsubMode()
      if (typeof unsubTheme === 'function') unsubTheme()
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

  const c = getColors(theme)

  const classicCard = {
    ...BASE,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: 6,
    background: c.classicBg,
    borderRadius: 12,
    padding: '8px 12px',
    boxShadow: c.classicShadow,
    WebkitAppRegion: 'drag'
  }

  const taskbarCard = {
    ...BASE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    background: c.taskbarBg,
    borderRadius: 0,
    padding: '0 10px 0 12px',
    borderLeft: `2px solid ${c.taskbarBorderColor}`,
    WebkitAppRegion: 'drag'
  }

  if (allLearned) {
    return (
      <div style={mode === 'taskbar' ? taskbarCard : classicCard}>
        <div style={{ ...s.allLearnedText, color: c.allLearned }}>All words learned!</div>
      </div>
    )
  }

  if (!word) return null

  if (mode === 'taskbar') {
    return (
      <div
        ref={cardRef}
        className="overlay-card"
        style={taskbarCard}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div style={s.taskbarContent}>
          <span style={{ ...s.taskbarWord, color: c.word }}>{word.word}</span>
          <span style={{ ...s.taskbarSep, color: c.sep }}>·</span>
          <span style={{ ...s.taskbarTranslation, color: c.translation }}>{word.translation}</span>
          {word.example && (
            <span style={s.taskbarExample} title={word.example}>
              {word.example}
            </span>
          )}
        </div>
        <button
          className="btn-learned"
          style={{ ...s.taskbarBtn, color: c.btnColor, border: `1px solid ${c.btnBorder}`, cursor: marking ? 'default' : 'pointer' }}
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
      style={classicCard}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="word-content" key={word.id} style={s.classicContent}>
        <div style={{ ...s.wordText, color: c.word }}>{word.word}</div>
        <div style={{ ...s.translationText, color: c.translation }}>{word.translation}</div>
        {word.example ? <div style={{ ...s.exampleText, color: c.example }}>{word.example}</div> : null}
      </div>

      <button
        className="btn-learned"
        style={{ ...s.learnedBtn, color: c.btnColor, background: c.btnBg, border: `1px solid ${c.btnBgBorder}`, cursor: marking ? 'default' : 'pointer' }}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  // classic
  classicContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2
  },
  wordText: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  translationText: {
    fontSize: 14,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  exampleText: {
    fontSize: 11,
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
    borderRadius: 6,
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
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  taskbarSep: {
    fontSize: 12,
    flexShrink: 0
  },
  taskbarTranslation: {
    fontSize: 12,
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
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginLeft: 6,
    WebkitAppRegion: 'no-drag'
  },

  // shared
  allLearnedText: {
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
    margin: 'auto'
  }
}
