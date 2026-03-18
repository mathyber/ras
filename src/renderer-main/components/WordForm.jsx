// WordForm.jsx (Renderer Process — main window)
// Form for adding a new word or editing an existing one.

import React, { useState, useEffect } from 'react'
import { tr } from '../i18n.js'

export default function WordForm({ initialValues, onSave, onCancel, lang }) {
  const t = tr[lang] || tr.en
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [example, setExample] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isEditing = !!initialValues

  // Populate form when editing an existing word
  useEffect(() => {
    if (initialValues) {
      setWord(initialValues.word || '')
      setTranslation(initialValues.translation || '')
      setExample(initialValues.example || '')
    } else {
      setWord('')
      setTranslation('')
      setExample('')
    }
    setErrors({})
  }, [initialValues])

  function validate() {
    const errs = {}
    if (!word.trim()) errs.word = t.fieldWordRequired
    if (!translation.trim()) errs.translation = t.fieldTranslationRequired
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      await onSave({ word, translation, example })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>
          {isEditing ? t.formHeadingEdit : t.formHeadingAdd}
        </h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <Field
            label={t.fieldWord}
            required
            error={errors.word}
            hint={t.fieldWordHint}
          >
            <input
              style={{ ...styles.input, ...(errors.word ? styles.inputError : {}) }}
              type="text"
              value={word}
              onChange={e => { setWord(e.target.value); setErrors(prev => ({ ...prev, word: null })) }}
              placeholder="e.g. ubiquitous"
              autoFocus
            />
          </Field>

          <Field
            label={t.fieldTranslation}
            required
            error={errors.translation}
            hint={t.fieldTranslationHint}
          >
            <input
              style={{ ...styles.input, ...(errors.translation ? styles.inputError : {}) }}
              type="text"
              value={translation}
              onChange={e => { setTranslation(e.target.value); setErrors(prev => ({ ...prev, translation: null })) }}
              placeholder="e.g. вездесущий"
            />
          </Field>

          <Field
            label={t.fieldExample}
            hint={t.fieldExampleHint}
          >
            <textarea
              style={{ ...styles.input, ...styles.textarea }}
              value={example}
              onChange={e => setExample(e.target.value)}
              placeholder="e.g. Smartphones have become ubiquitous in modern life."
              rows={3}
            />
          </Field>

          <div style={styles.formActions}>
            {isEditing && (
              <button
                type="button"
                style={styles.btnSecondary}
                onClick={onCancel}
              >
                {t.btnCancel}
              </button>
            )}
            <button
              type="submit"
              style={{ ...styles.btnPrimary, opacity: saving ? 0.7 : 1 }}
              disabled={saving}
            >
              {saving ? t.btnSaving : (isEditing ? t.btnSaveChanges : t.btnAddWord)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, required, error, hint, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>
        {label}
        {required && <span style={styles.required}>*</span>}
      </label>
      {children}
      {error ? (
        <span style={styles.errorText}>{error}</span>
      ) : hint ? (
        <span style={styles.hintText}>{hint}</span>
      ) : null}
    </div>
  )
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px',
    display: 'flex',
    justifyContent: 'center'
  },
  card: {
    width: '100%',
    maxWidth: 500
  },
  heading: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 24
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  required: {
    color: 'var(--accent)',
    marginLeft: 3
  },
  input: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: 14,
    padding: '9px 12px',
    outline: 'none',
    transition: 'border-color 0.15s',
    width: '100%'
  },
  inputError: {
    borderColor: 'var(--danger)'
  },
  textarea: {
    resize: 'vertical',
    minHeight: 72,
    fontFamily: 'inherit',
    lineHeight: 1.5
  },
  errorText: {
    fontSize: 11,
    color: 'var(--danger)'
  },
  hintText: {
    fontSize: 11,
    color: 'var(--text-muted)'
  },
  formActions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 8
  },
  btnPrimary: {
    padding: '9px 22px',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s'
  },
  btnSecondary: {
    padding: '9px 22px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: 14,
    cursor: 'pointer'
  }
}
