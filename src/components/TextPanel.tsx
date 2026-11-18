import { useEffect, useRef, useState } from 'react'
import type { PanelPatch, TextPanel as TextPanelData } from '../types'

interface TextPanelProps {
  panel: TextPanelData
  onPatch: (id: string, patch: PanelPatch) => void
}

const SAVE_DELAY = 300

export function TextPanel({ panel, onPatch }: TextPanelProps) {
  const [draft, setDraft] = useState(panel.text)
  const committed = useRef(panel.text)

  // Keep the editor in sync when the stored text changes from outside the panel
  // (import, clear all, or another panel's update).
  useEffect(() => {
    if (panel.text !== committed.current) {
      committed.current = panel.text
      setDraft(panel.text)
    }
  }, [panel.text])

  useEffect(() => {
    if (draft === committed.current) return

    const timer = setTimeout(() => {
      committed.current = draft
      onPatch(panel.id, { text: draft })
    }, SAVE_DELAY)

    return () => clearTimeout(timer)
  }, [draft, panel.id, onPatch])

  return (
    <textarea
      className="text-editor"
      value={draft}
      aria-label={panel.title || 'Text panel'}
      placeholder="Start writing…"
      spellCheck
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft === committed.current) return
        committed.current = draft
        onPatch(panel.id, { text: draft })
      }}
    />
  )
}
