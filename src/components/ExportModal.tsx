import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { saveTextFile } from '../platform'
import { exportFileName, serializeWorkspace } from '../storage'
import type { WorkspaceData } from '../types'

interface ExportModalProps {
  isOpen: boolean
  workspace: WorkspaceData
  onClose: () => void
  onNotice?: (message: string) => void
}

type Tab = 'file' | 'text'

export function ExportModal({ isOpen, workspace, onClose, onNotice }: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('file')
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const jsonString = useMemo(() => serializeWorkspace(workspace), [workspace])
  const byteSize = useMemo(() => new Blob([jsonString]).size, [jsonString])
  const formattedSize = byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`

  const closeModal = useCallback(() => {
    setCopied(false)
    onClose()
  }, [onClose])

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

  // Select all or focus textarea when switching to text tab
  useEffect(() => {
    if (isOpen && activeTab === 'text') {
      textareaRef.current?.focus()
      textareaRef.current?.select()
    }
  }, [isOpen, activeTab])

  if (!isOpen) return null

  const handleDownload = async () => {
    try {
      const result = await saveTextFile(exportFileName(), jsonString)
      if (result.canceled) return
      onNotice?.(result.path ? `Workspace saved to ${result.path}` : 'Workspace downloaded as JSON.')
      closeModal()
    } catch {
      onNotice?.('Could not save the workspace file.')
    }
  }

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonString)
      } else {
        textareaRef.current?.select()
        document.execCommand('copy')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onNotice?.('Workspace JSON copied to clipboard.')
    } catch {
      // Fallback
      textareaRef.current?.select()
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      onNotice?.('Workspace JSON copied to clipboard.')
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
        aria-labelledby="export-dialog-title"
      >
        <div className="modal-head">
          <h2 id="export-dialog-title" className="modal-title">
            Export Workspace
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

        <div className="modal-tabs" role="tablist" aria-label="Export methods">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'file'}
            className={`modal-tab ${activeTab === 'file' ? 'active' : ''}`}
            onClick={() => setActiveTab('file')}
          >
            JSON File
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'text'}
            className={`modal-tab ${activeTab === 'text' ? 'active' : ''}`}
            onClick={() => setActiveTab('text')}
          >
            Copy Text
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'file' ? (
            <div className="export-file-pane">
              <div className="export-file-icon" aria-hidden="true">
                💾
              </div>
              <p className="export-file-label">
                Download your workspace as a portable <strong>.json</strong> file.
              </p>
              <div className="export-meta">
                <span className="export-meta-item">{workspace.panels.length} panel(s)</span>
                <span className="export-meta-dot">•</span>
                <span className="export-meta-item">{workspace.columns} column(s)</span>
                <span className="export-meta-dot">•</span>
                <span className="export-meta-item">{formattedSize}</span>
              </div>
            </div>
          ) : (
            <div className="export-copy-pane">
              <div className="export-copy-header">
                <span className="panel-hint">Workspace JSON payload ({formattedSize}):</span>
              </div>
              <textarea
                ref={textareaRef}
                className="field import-textarea"
                rows={8}
                readOnly
                value={jsonString}
                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              />
              <div className="import-paste-toolbar">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    textareaRef.current?.focus()
                    textareaRef.current?.select()
                  }}
                >
                  Select all
                </button>
                <span className="panel-hint import-shortcut-hint">
                  Click text to select all
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="text-button" onClick={closeModal}>
            Cancel
          </button>
          {activeTab === 'file' ? (
            <button
              type="button"
              className="toolbar-button"
              onClick={() => void handleDownload()}
            >
              Download File
            </button>
          ) : (
            <button
              type="button"
              className="toolbar-button"
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : 'Copy to Clipboard'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
