// Settings.jsx — overlay display mode picker
import React, { useState, useEffect } from 'react'
import { tr } from '../i18n.js'

// ─── Preview mini-styles ──────────────────────────────────────────────────────
// Must be declared before MODES which references them in JSX

const p = {
  classicPreview: {
    width: '100%',
    height: 90,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  screen: {
    width: 140,
    height: 80,
    background: '#1a1a2e',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)'
  },
  taskbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
    background: '#111'
  },
  classicCard: {
    position: 'absolute',
    bottom: 14,
    right: 3,
    width: 48,
    background: 'rgba(20,20,20,0.95)',
    borderRadius: 3,
    padding: '3px 5px',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  cardWord: { fontSize: 7, fontWeight: 700, color: '#fff' },
  cardTrans: { fontSize: 6, color: '#aaa' },
  taskbarWithOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 14,
    background: '#111',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  taskbarOverlay: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    paddingRight: 4,
    borderLeft: '1.5px solid rgba(74,158,255,0.7)',
    paddingLeft: 4,
    height: '100%'
  },
  tbWord: { fontSize: 6, fontWeight: 700, color: '#fff' },
  tbDot:  { fontSize: 6, color: '#555' },
  tbTrans:{ fontSize: 6, color: '#aaa' }
}

export default function Settings({ lang }) {
  const t = tr[lang] || tr.en
  const [currentMode, setCurrentMode] = useState('classic')
  const [currentTheme, setCurrentTheme] = useState('dark')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const MODES = [
    {
      id: 'classic',
      title: t.modeClassicTitle,
      description: t.modeClassicDesc,
      preview: (
        <div style={p.classicPreview}>
          <div style={p.screen}>
            <div style={p.taskbar} />
            <div style={p.classicCard}>
              <div style={p.cardWord}>word</div>
              <div style={p.cardTrans}>перевод</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'taskbar',
      title: t.modeTaskbarTitle,
      description: t.modeTaskbarDesc,
      preview: (
        <div style={p.classicPreview}>
          <div style={p.screen}>
            <div style={p.taskbarWithOverlay}>
              <div style={p.taskbarOverlay}>
                <span style={p.tbWord}>word</span>
                <span style={p.tbDot}>·</span>
                <span style={p.tbTrans}>перевод</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  useEffect(() => {
    window.api.getSettings().then(s => {
      if (s?.overlayMode) setCurrentMode(s.overlayMode)
      if (s?.overlayTheme) setCurrentTheme(s.overlayTheme)
    })
  }, [])

  async function handleThemeSelect(theme) {
    if (theme === currentTheme || saving) return
    setSaving(true)
    setSaved(false)
    try {
      await window.api.setOverlayTheme(theme)
      setCurrentTheme(theme)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('[settings] setOverlayTheme failed:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSelect(mode) {
    if (mode === currentMode || saving) return
    setSaving(true)
    setSaved(false)
    try {
      await window.api.setOverlayMode(mode)
      setCurrentMode(mode)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('[settings] setOverlayMode failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const THEMES = [
    { id: 'dark',  title: t.themeDarkTitle,  description: t.themeDarkDesc },
    { id: 'light', title: t.themeLightTitle, description: t.themeLightDesc },
  ]

  return (
    <div style={st.container}>
      <h2 style={st.heading}>{t.settingsModeTitle}</h2>
      <p style={st.sub}>{t.settingsModeSubtitle}</p>

      <div style={st.cards}>
        {MODES.map(m => {
          const active = currentMode === m.id
          return (
            <button
              key={m.id}
              style={{
                ...st.card,
                ...(active ? st.cardActive : {}),
                ...(saving ? { opacity: 0.6, cursor: 'wait' } : {})
              }}
              onClick={() => handleSelect(m.id)}
              disabled={saving}
            >
              {m.preview}
              <div style={st.cardLabel}>
                <div style={{ ...st.cardTitle, ...(active ? st.cardTitleActive : {}) }}>
                  {active && <span style={st.dot} />}
                  {m.title}
                </div>
                <div style={st.cardDesc}>{m.description}</div>
              </div>
            </button>
          )
        })}
      </div>

      <h2 style={{ ...st.heading, marginTop: 28 }}>{t.settingsThemeTitle}</h2>
      <p style={st.sub}>{t.settingsThemeSubtitle}</p>

      <div style={st.cards}>
        {THEMES.map(theme => {
          const active = currentTheme === theme.id
          return (
            <button
              key={theme.id}
              style={{
                ...st.card,
                ...(active ? st.cardActive : {}),
                ...(saving ? { opacity: 0.6, cursor: 'wait' } : {})
              }}
              onClick={() => handleThemeSelect(theme.id)}
              disabled={saving}
            >
              <div style={{ ...st.themePreview, background: theme.id === 'dark' ? 'rgba(20,20,20,0.92)' : 'rgba(248,248,248,0.96)', border: '1px solid ' + (theme.id === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)') }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: theme.id === 'dark' ? '#fff' : '#111' }}>word</span>
                <span style={{ fontSize: 10, color: theme.id === 'dark' ? '#ccc' : '#444', marginTop: 2 }}>перевод</span>
              </div>
              <div style={st.cardLabel}>
                <div style={{ ...st.cardTitle, ...(active ? st.cardTitleActive : {}) }}>
                  {active && <span style={st.dot} />}
                  {theme.title}
                </div>
                <div style={st.cardDesc}>{theme.description}</div>
              </div>
            </button>
          )
        })}
      </div>

      {saved && <div style={st.toast}>{t.settingsApplied}</div>}
    </div>
  )
}

// ─── Component styles ─────────────────────────────────────────────────────────

const st = {
  container: {
    padding: '28px 28px',
    maxWidth: 620
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '0 0 6px'
  },
  sub: {
    fontSize: 13,
    color: 'var(--text-secondary)',
    margin: '0 0 24px'
  },
  cards: {
    display: 'flex',
    gap: 16
  },
  card: {
    flex: 1,
    background: 'var(--bg-secondary)',
    border: '2px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '0 0 14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background 0.15s',
    overflow: 'hidden'
  },
  cardActive: {
    borderColor: 'var(--accent)',
    background: 'rgba(74, 158, 255, 0.06)'
  },
  cardLabel: {
    padding: '0 14px'
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  cardTitleActive: {
    color: 'var(--accent)'
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--accent)',
    flexShrink: 0
  },
  cardDesc: {
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.5
  },
  toast: {
    marginTop: 16,
    display: 'inline-block',
    padding: '6px 14px',
    background: 'var(--success)',
    color: '#fff',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 500
  },
  themePreview: {
    width: '100%',
    height: 70,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    margin: '10px 10px 10px'
  },
}
