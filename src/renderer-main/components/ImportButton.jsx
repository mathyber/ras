// ImportButton.jsx (Renderer Process — main window)
// Triggers the JSON import flow via IPC and reports the result upward.

import React, { useState } from 'react'

export default function ImportButton({ onImport }) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const result = await window.api.importWords()
      onImport(result)
    } catch (err) {
      onImport({ error: err.message, imported: 0, skipped: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      style={{ ...styles.btn, opacity: loading ? 0.65 : 1 }}
      onClick={handleClick}
      disabled={loading}
      title="Import words from a JSON file"
    >
      {loading ? 'Importing…' : 'Import JSON'}
    </button>
  )
}

const styles = {
  btn: {
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
    letterSpacing: 0.3
  }
}
