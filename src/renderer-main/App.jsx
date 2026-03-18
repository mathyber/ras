// App.jsx (Renderer Process — main window)
import React, { useState, useEffect, useCallback } from 'react'
import WordList from './components/WordList.jsx'
import WordForm from './components/WordForm.jsx'
import ImportButton from './components/ImportButton.jsx'
import Settings from './components/Settings.jsx'
import { tr } from './i18n.js'

const TABS = {
  LIST: 'list',
  ADD: 'add',
  SETTINGS: 'settings'
}

export default function App() {
  const [words, setWords] = useState([])
  const [activeTab, setActiveTab] = useState(TABS.LIST)
  const [editingWord, setEditingWord] = useState(null) // word object being edited
  const [notification, setNotification] = useState(null) // { message, type: 'success'|'error' }
  const [lang, setLang] = useState(() => localStorage.getItem('slvk_lang') || 'en')

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadWords = useCallback(async () => {
    try {
      const all = await window.api.getWords()
      setWords(all)
    } catch (err) {
      showNotification(tr[lang].notifLoadFail + ': ' + err.message, 'error')
    }
  }, [lang])

  useEffect(() => {
    loadWords()

    // Subscribe to push updates from main process (e.g. after import or overlay interaction)
    const unsubscribe = window.api.onWordsChanged(() => {
      loadWords()
    })

    // Clean up listener on unmount to prevent memory leaks
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
    }
  }, [loadWords])

  // ─── Notifications ──────────────────────────────────────────────────────────

  function showNotification(message, type = 'success') {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }

  // ─── Lang Toggle ────────────────────────────────────────────────────────────

  function toggleLang() {
    const next = lang === 'en' ? 'ru' : 'en'
    setLang(next)
    localStorage.setItem('slvk_lang', next)
  }

  // ─── Word Operations ────────────────────────────────────────────────────────

  async function handleSaveWord({ word, translation, example }) {
    const t = tr[lang]
    try {
      if (editingWord) {
        await window.api.updateWord(editingWord.id, word, translation, example)
        showNotification(t.notifUpdated)
      } else {
        await window.api.addWord(word, translation, example)
        showNotification(t.notifAdded)
      }
      setEditingWord(null)
      setActiveTab(TABS.LIST)
      // NOTE-002: loadWords() is called via onWordsChanged push from main — no duplicate call needed
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  async function handleDeleteWord(id) {
    const t = tr[lang]
    try {
      await window.api.deleteWord(id)
      showNotification(t.notifDeleted)
      // NOTE-002: loadWords() is called via onWordsChanged push from main — no duplicate call needed
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  async function handleUnlearnWord(id) {
    const t = tr[lang]
    try {
      await window.api.unlearnWord(id)
      showNotification(t.notifUnlearned)
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  function handleEditWord(word) {
    setEditingWord(word)
    setActiveTab(TABS.ADD)
  }

  function handleCancelEdit() {
    setEditingWord(null)
    setActiveTab(TABS.LIST)
  }

  async function handleImport(result) {
    const t = tr[lang]
    if (result.error) {
      showNotification(result.error, 'error')
      return
    }
    showNotification(t.notifImported(result.imported, result.skipped))
    // NOTE-002: loadWords() is called via onWordsChanged push from main — no duplicate call needed
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalWords = words.length
  const learnedWords = words.filter(w => w.learned).length
  const unlearnedWords = totalWords - learnedWords

  // ─── Render ─────────────────────────────────────────────────────────────────

  const t = tr[lang]

  return (
    <div style={styles.container}>
      {/* Header — also acts as the drag region for the frameless window */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>Slovariken</span>
          <span style={styles.headerTitle}>{t.appSubtitle}</span>
        </div>
        <div style={styles.stats}>
          <StatBadge label={t.statTotal} value={totalWords} color="var(--accent)" />
          <StatBadge label={t.statPending} value={unlearnedWords} color="var(--text-secondary)" />
          <StatBadge label={t.statLearned} value={learnedWords} color="var(--success)" />
        </div>
        <div style={styles.headerRight}>
          <button onClick={toggleLang} style={styles.langToggle}>
            {lang === 'en' ? 'RU' : 'EN'}
          </button>
          <button onClick={() => window.api.minimizeWindow()} style={styles.winBtn} title="Minimize">─</button>
          <button onClick={() => window.api.closeWindow()} style={{ ...styles.winBtn, ...styles.winBtnClose }} title="Close">✕</button>
        </div>
      </header>

      {/* Tab Bar */}
      <nav style={styles.tabBar}>
        <TabButton
          active={activeTab === TABS.LIST}
          onClick={() => { setActiveTab(TABS.LIST); setEditingWord(null) }}
        >
          {t.tabWords}
        </TabButton>
        <TabButton
          active={activeTab === TABS.ADD}
          onClick={() => { setActiveTab(TABS.ADD); setEditingWord(null) }}
        >
          {editingWord ? t.tabEdit : t.tabAdd}
        </TabButton>
        <TabButton
          active={activeTab === TABS.SETTINGS}
          onClick={() => { setActiveTab(TABS.SETTINGS); setEditingWord(null) }}
        >
          {t.tabSettings}
        </TabButton>
        <div style={styles.tabBarRight}>
          <ImportButton onImport={handleImport} lang={lang} />
        </div>
      </nav>

      {/* Content */}
      <main style={styles.content}>
        {activeTab === TABS.LIST && (
          <WordList
            words={words}
            onEdit={handleEditWord}
            onDelete={handleDeleteWord}
            onUnlearn={handleUnlearnWord}
            lang={lang}
          />
        )}
        {activeTab === TABS.ADD && (
          <WordForm
            initialValues={editingWord}
            onSave={handleSaveWord}
            onCancel={handleCancelEdit}
            lang={lang}
          />
        )}
        {activeTab === TABS.SETTINGS && <Settings lang={lang} />}
      </main>

      {/* Toast Notification */}
      {notification && (
        <div style={{
          ...styles.notification,
          background: notification.type === 'error' ? 'var(--danger)' : 'var(--success)'
        }}>
          {notification.message}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatBadge({ label, value, color }) {
  return (
    <div style={styles.statBadge}>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      style={{
        ...styles.tab,
        ...(active ? styles.tabActive : {})
      }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-primary)',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0 10px 20px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    WebkitAppRegion: 'drag'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    WebkitAppRegion: 'no-drag'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    alignSelf: 'stretch',
    WebkitAppRegion: 'no-drag'
  },
  logo: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--accent)',
    letterSpacing: 2
  },
  headerTitle: {
    fontSize: 14,
    color: 'var(--text-secondary)'
  },
  stats: {
    display: 'flex',
    gap: 20,
    WebkitAppRegion: 'no-drag'
  },
  statBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1
  },
  statValue: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1
  },
  statLabel: {
    fontSize: 10,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  tabBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0
  },
  tab: {
    padding: '10px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
    marginBottom: -1
  },
  tabActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)'
  },
  tabBarRight: {
    marginLeft: 'auto'
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  notification: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    padding: '10px 18px',
    borderRadius: 'var(--radius)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    zIndex: 9999,
    animation: 'fadeIn 0.2s ease'
  },
  langToggle: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 700,
    padding: '3px 8px',
    cursor: 'pointer',
    letterSpacing: 1,
    marginRight: 8
  },
  winBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 14,
    lineHeight: 1,
    width: 46,
    alignSelf: 'stretch',
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  winBtnClose: {
    fontSize: 13
  }
}
