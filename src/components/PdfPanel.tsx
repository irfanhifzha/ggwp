import { useState } from 'react'
import { openExternal } from '../platform'
import { useReadOnly } from '../read-only'
import type { PanelPatch, PdfPanel as PdfPanelData } from '../types'
import { normalizeHttpUrl } from '../url'

interface PdfPanelProps {
  panel: PdfPanelData
  onPatch: (id: string, patch: PanelPatch) => void
}

export function PdfPanel({ panel, onPatch }: PdfPanelProps) {
  const readOnly = useReadOnly()
  const [field, setField] = useState({ value: panel.url, source: panel.url })
  const [error, setError] = useState('')

  // Reflect external changes (import, clear all) without an effect.
  if (field.source !== panel.url) setField({ value: panel.url, source: panel.url })
  const draftUrl = field.value

  const loadPdf = (url: string) => {
    const normalized = normalizeHttpUrl(url)

    if (url.trim() && !normalized) {
      setError('Enter a valid http(s) link to a PDF.')
      return
    }

    setError('')
    onPatch(panel.id, { url: normalized ?? '' })
  }

  return (
    <div className="pdf-body">
      <form
        className="pdf-form"
        onSubmit={(event) => {
          event.preventDefault()
          loadPdf(draftUrl)
        }}
      >
        <input
          className="field"
          value={draftUrl}
          aria-label="PDF URL"
          placeholder="https://example.com/document.pdf"
          inputMode="url"
          spellCheck={false}
          disabled={readOnly}
          onChange={(event) => setField({ ...field, value: event.target.value })}
        />
        <button type="submit" className="toolbar-button" disabled={readOnly}>
          Load
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {panel.url ? (
        <>
          <iframe
            className="pdf-frame"
            src={panel.url}
            title={panel.title || 'PDF document'}
            loading="lazy"
          />
          <p className="panel-hint">
            Document not showing?{' '}
            <a
              href={panel.url}
              onClick={(event) => {
                event.preventDefault()
                void openExternal(panel.url)
              }}
            >
              Open it in your browser
            </a>
            . Some sites block embedding.
          </p>
        </>
      ) : (
        <div className="panel-empty">
          <p>Paste a link to a PDF to read it here.</p>
          <p className="panel-hint">Uses the browser&apos;s built-in PDF viewer.</p>
        </div>
      )}
    </div>
  )
}
