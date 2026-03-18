// WordList.jsx (Renderer Process — main window)
// Displays words in a table with filtering and action buttons.

import React, { useState } from 'react'
import { tr } from '../i18n.js'

const FILTERS = {
  ALL: 'all',
  UNLEARNED: 'unlearned',
  LEARNED: 'learned'
}

export default function WordList({ words, onEdit, onDelete, onUnlearn, lang }) {
  const t = tr[lang] || tr.en
  const [filter, setFilter] = useState(FILTERS.ALL)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const filtered = words.filter(w => {
    if (filter === FILTERS.UNLEARNED) return !w.learned
    if (filter === FILTERS.LEARNED) return w.learned
    return true
  })

  function handleDeleteClick(id) {
    setConfirmDeleteId(id)
  }

  function handleConfirmDelete() {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId)
      setConfirmDeleteId(null)
    }
  }

  return (
    <div style={styles.container}>
      {/* Filter Row */}
      <div style={styles.filterRow}>
        <FilterChip active={filter === FILTERS.ALL} onClick={() => setFilter(FILTERS.ALL)}>
          {t.filterAll(words.length)}
        </FilterChip>
        <FilterChip active={filter === FILTERS.UNLEARNED} onClick={() => setFilter(FILTERS.UNLEARNED)}>
          {t.filterPending(words.filter(w => !w.learned).length)}
        </FilterChip>
        <FilterChip active={filter === FILTERS.LEARNED} onClick={() => setFilter(FILTERS.LEARNED)}>
          {t.filterLearned(words.filter(w => w.learned).length)}
        </FilterChip>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} t={t} />
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.headerRow}>
                <Th style={{ width: '18%' }}>{t.colWord}</Th>
                <Th style={{ width: '20%' }}>{t.colTranslation}</Th>
                <Th style={{ width: '28%' }}>{t.colExample}</Th>
                <Th style={{ width: '10%', textAlign: 'center' }}>{t.colStatus}</Th>
                <Th style={{ width: '24%', textAlign: 'right' }}>{t.colActions}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(word => (
                <WordRow
                  key={word.id}
                  word={word}
                  onEdit={() => onEdit(word)}
                  onDeleteClick={() => handleDeleteClick(word.id)}
                  onUnlearn={() => onUnlearn(word.id)}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <p style={styles.modalText}>{t.deleteConfirm}</p>
            <div style={styles.modalActions}>
              <button style={styles.btnCancel} onClick={() => setConfirmDeleteId(null)}>
                {t.btnCancel}
              </button>
              <button style={styles.btnDanger} onClick={handleConfirmDelete}>
                {t.btnDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WordRow({ word, onEdit, onDeleteClick, onUnlearn, t }) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      style={{ ...styles.row, background: hovered ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={styles.cell}>
        <span style={styles.wordText}>{word.word}</span>
      </td>
      <td style={styles.cell}>
        <span style={styles.translationText}>{word.translation}</span>
      </td>
      <td style={styles.cell}>
        <span style={styles.exampleText}>{word.example || '—'}</span>
      </td>
      <td style={{ ...styles.cell, textAlign: 'center' }}>
        {word.learned ? (
          <span style={styles.badgeLearned}>{t.badgeLearned}</span>
        ) : (
          <span style={styles.badgePending}>{t.badgePending}</span>
        )}
      </td>
      <td style={{ ...styles.cell, textAlign: 'right' }}>
        <div style={styles.actions}>
          {word.learned && (
            <ActionButton onClick={onUnlearn} title={t.btnUnlearn}>
              {t.btnUnlearn}
            </ActionButton>
          )}
          <ActionButton onClick={onEdit} title={t.btnEdit}>
            {t.btnEdit}
          </ActionButton>
          <ActionButton onClick={onDeleteClick} title={t.btnDel} danger>
            {t.btnDel}
          </ActionButton>
        </div>
      </td>
    </tr>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      style={{ ...styles.chip, ...(active ? styles.chipActive : {}) }}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function Th({ children, style }) {
  return <th style={{ ...styles.th, ...style }}>{children}</th>
}

function ActionButton({ onClick, children, danger }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      style={{
        ...styles.actionBtn,
        color: danger
          ? (hovered ? 'var(--danger-hover)' : 'var(--danger)')
          : (hovered ? 'var(--accent-hover)' : 'var(--accent)'),
        opacity: hovered ? 1 : 0.75
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </button>
  )
}

function EmptyState({ filter, t }) {
  const messages = {
    [FILTERS.ALL]: t.emptyAll,
    [FILTERS.UNLEARNED]: t.emptyPending,
    [FILTERS.LEARNED]: t.emptyLearned
  }
  return (
    <div style={styles.emptyState}>
      <div style={styles.emptyIcon}>📚</div>
      <p style={styles.emptyText}>{messages[filter]}</p>
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 20px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0
  },
  chip: {
    padding: '4px 12px',
    border: '1px solid var(--border)',
    borderRadius: 20,
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  chipActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#fff'
  },
  tableWrapper: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed'
  },
  headerRow: {
    position: 'sticky',
    top: 0,
    background: 'var(--bg-secondary)',
    zIndex: 1
  },
  th: {
    padding: '10px 20px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottom: '1px solid var(--border)'
  },
  row: {
    transition: 'background 0.1s',
    borderBottom: '1px solid var(--border)'
  },
  cell: {
    padding: '10px 20px',
    verticalAlign: 'middle',
    overflow: 'hidden'
  },
  wordText: {
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontSize: 14,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block'
  },
  translationText: {
    color: 'var(--text-secondary)',
    fontSize: 14,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: 'block'
  },
  exampleText: {
    color: 'var(--text-muted)',
    fontSize: 12,
    fontStyle: 'italic',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  },
  badgeLearned: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(62, 207, 142, 0.15)',
    color: 'var(--success)'
  },
  badgePending: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(74, 158, 255, 0.12)',
    color: 'var(--text-muted)'
  },
  actions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end'
  },
  actionBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '3px 6px',
    borderRadius: 4,
    transition: 'all 0.15s',
    letterSpacing: 0.3
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40
  },
  emptyIcon: {
    fontSize: 40,
    opacity: 0.4
  },
  emptyText: {
    color: 'var(--text-muted)',
    textAlign: 'center',
    maxWidth: 300
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    padding: 24,
    minWidth: 300,
    border: '1px solid var(--border)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  modalText: {
    color: 'var(--text-primary)',
    marginBottom: 20
  },
  modalActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end'
  },
  btnCancel: {
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 13
  },
  btnDanger: {
    padding: '8px 18px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--danger)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600
  }
}
