import { useCallback, useEffect, useRef, useState } from 'react'
import { parseWorkspaceText } from '../storage'
import type { WorkspaceData } from '../types'

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (workspace: WorkspaceData) => void
}

type Tab = 'file' | 'paste'

export function ImportModal({ isOpen, onClose, onImport }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('file')
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const closeModal = useCallback(() => {
    setError('')
    onClose()
  }, [onClose])

  // Focus textarea when switching to paste tab
  useEffect(() => {
    if (isOpen && activeTab === 'paste') {
      textareaRef.current?.focus()
    }
  }, [isOpen, activeTab])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeModal])

  // Allow paste event anywhere on modal to switch to paste tab
  useEffect(() => {
    if (!isOpen) return

    const handleWindowPaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return
      }
      const text = e.clipboardData?.getData('text')
      if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
        e.preventDefault()
        setActiveTab('paste')
        setPasteText(text)
        setError('')
      }
    }

    window.addEventListener('paste', handleWindowPaste)
    return () => window.removeEventListener('paste', handleWindowPaste)
  }, [isOpen])

  if (!isOpen) return null

  const handleProcessText = (rawText: string) => {
    const result = parseWorkspaceText(rawText)
    if (result.error || !result.data) {
      setError(result.error ?? 'Invalid workspace data.')
      return false
    }

    onImport(result.data)
    closeModal()
    return true
  }

  const handleFile = async (file: File) => {
    try {
      const text = await file.text()
      handleProcessText(text)
    } catch {
      setError('Could not read file.')
    }
  }

  const handleImportText = () => {
    handleProcessText(pasteText)
  }

  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setError('Clipboard access is not available in your browser. Please use Ctrl+V / ⌘+V.')
        return
      }
      const clipText = await navigator.clipboard.readText()
      if (!clipText.trim()) {
        setError('Clipboard is empty.')
        return
      }
      setPasteText(clipText)
      setError('')
      textareaRef.current?.focus()
    } catch {
      setError('Clipboard permission denied. Please paste manually with Ctrl+V / ⌘+V.')
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal()
      }}
    >
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
      >
        <div className="modal-head">
          <h2 id="import-dialog-title" className="modal-title">
            Import Workspace
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={closeModal}
          >
            ✕
          </button>
        </div>

        <div className="modal-tabs" role="tablist" aria-label="Import methods">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'file'}
            className={`modal-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('file')
              setError('')
            }}
          >
            JSON File
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'paste'}
            className={`modal-tab ${activeTab === 'paste' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('paste')
              setError('')
            }}
          >
            Paste Text
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'file' ? (
            <div
              className={`import-dropzone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragOver(true)
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void handleFile(file)
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="import-dropzone-icon" aria-hidden="true">
                📁
              </div>
              <p className="import-dropzone-label">
                Drag and drop a <strong>.json</strong> workspace file here, or click to browse.
              </p>
              <button
                type="button"
                className="toolbar-button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                  e.target.value = ''
                }}
              />
            </div>
          ) : (
            <div className="import-paste-pane">
              <label htmlFor="import-paste-input" className="panel-hint">
                Paste workspace JSON exported from GreatGridWorkspace:
              </label>
              <textarea
                id="import-paste-input"
                ref={textareaRef}
                className="field import-textarea"
                rows={8}
                value={pasteText}
                spellCheck={false}
                placeholder={'{\n  "columns": 2,\n  "panels": [\n    {\n      "id": "1",\n      "type": "text",\n      "title": "Notes",\n      "text": "..."\n    }\n  ]\n}'}
                onChange={(e) => {
                  setPasteText(e.target.value)
                  if (error) setError('')
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault()
                    if (pasteText.trim()) handleImportText()
                  }
                }}
              />
              <div className="import-paste-toolbar">
                <button
                  type="button"
                  className="text-button"
                  onClick={handlePasteClipboard}
                >
                  Paste from clipboard
                </button>
                {pasteText && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setPasteText('')
                      setError('')
                      textareaRef.current?.focus()
                    }}
                  >
                    Clear
                  </button>
                )}
                <span className="panel-hint import-shortcut-hint">
                  Tip: ⌘+Enter to import
                </span>
              </div>
            </div>
          )}

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="text-button" onClick={closeModal}>
            Cancel
          </button>
          {activeTab === 'paste' && (
            <button
              type="button"
              className="toolbar-button"
              disabled={!pasteText.trim()}
              onClick={handleImportText}
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
