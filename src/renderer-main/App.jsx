// App.jsx (Renderer Process — main window)
import React, { useState, useEffect, useCallback } from 'react'
import WordList from './components/WordList.jsx'
import WordForm from './components/WordForm.jsx'
import ImportButton from './components/ImportButton.jsx'

const TABS = {
  LIST: 'list',
  ADD: 'add'
}

export default function App() {
  const [words, setWords] = useState([])
  const [activeTab, setActiveTab] = useState(TABS.LIST)
  const [editingWord, setEditingWord] = useState(null) // word object being edited
  const [notification, setNotification] = useState(null) // { message, type: 'success'|'error' }

  // ─── Data Loading ───────────────────────────────────────────────────────────

  const loadWords = useCallback(async () => {
    try {
      const all = await window.api.getWords()
      setWords(all)
    } catch (err) {
      showNotification('Failed to load words: ' + err.message, 'error')
    }
  }, [])

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

  // ─── Word Operations ────────────────────────────────────────────────────────

  async function handleSaveWord({ word, translation, example }) {
    try {
      if (editingWord) {
        await window.api.updateWord(editingWord.id, word, translation, example)
        showNotification('Word updated successfully')
      } else {
        await window.api.addWord(word, translation, example)
        showNotification('Word added successfully')
      }
      setEditingWord(null)
      setActiveTab(TABS.LIST)
      // NOTE-002: loadWords() is called via onWordsChanged push from main — no duplicate call needed
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  async function handleDeleteWord(id) {
    try {
      await window.api.deleteWord(id)
      showNotification('Word deleted')
      // NOTE-002: loadWords() is called via onWordsChanged push from main — no duplicate call needed
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
    if (result.error) {
      showNotification(result.error, 'error')
      return
    }
    showNotification(`Imported ${result.imported} word(s), skipped ${result.skipped}`)
    // NOTE-002: loadWords() is called via onWordsChanged push from main — no duplicate call needed
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const totalWords = words.length
  const learnedWords = words.filter(w => w.learned).length
  const unlearnedWords = totalWords - learnedWords

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>RAS</span>
          <span style={styles.headerTitle}>Dictionary</span>
        </div>
        <div style={styles.stats}>
          <StatBadge label="Total" value={totalWords} color="var(--accent)" />
          <StatBadge label="Pending" value={unlearnedWords} color="var(--text-secondary)" />
          <StatBadge label="Learned" value={learnedWords} color="var(--success)" />
        </div>
      </header>

      {/* Tab Bar */}
      <nav style={styles.tabBar}>
        <TabButton
          active={activeTab === TABS.LIST}
          onClick={() => { setActiveTab(TABS.LIST); setEditingWord(null) }}
        >
          All Words
        </TabButton>
        <TabButton
          active={activeTab === TABS.ADD}
          onClick={() => { setActiveTab(TABS.ADD); setEditingWord(null) }}
        >
          {editingWord ? 'Edit Word' : 'Add Word'}
        </TabButton>
        <div style={styles.tabBarRight}>
          <ImportButton onImport={handleImport} />
        </div>
      </nav>

      {/* Content */}
      <main style={styles.content}>
        {activeTab === TABS.LIST && (
          <WordList
            words={words}
            onEdit={handleEditWord}
            onDelete={handleDeleteWord}
          />
        )}
        {activeTab === TABS.ADD && (
          <WordForm
            initialValues={editingWord}
            onSave={handleSaveWord}
            onCancel={handleCancelEdit}
          />
        )}
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
    padding: '12px 20px',
    background: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
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
    gap: 20
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
  }
}
