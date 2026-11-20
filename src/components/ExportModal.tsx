import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  cloudErrorMessage,
  listCloudVersions,
  saveCloudVersion,
  type CloudVersion,
} from '../cloud'
import { saveTextFile } from '../platform'
import { exportFileName, serializeWorkspace } from '../storage'
import type { WorkspaceData } from '../types'

interface ExportModalProps {
  isOpen: boolean
  workspace: WorkspaceData
  cloudEnabled: boolean
  cloudUser: string | null
  onClose: () => void
  onNotice?: (message: string) => void
}

type Tab = 'file' | 'text' | 'cloud'

function defaultSaveName(): string {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')
  return `workspace-${stamp}`
}

function formatSavedAt(value: string): string {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function ExportModal({
  isOpen,
  workspace,
  cloudEnabled,
  cloudUser,
  onClose,
  onNotice,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('file')
  const [copied, setCopied] = useState(false)
  const [savingId, setSavingId] = useState('')
  const [cloudError, setCloudError] = useState('')
  const [cloudSaved, setCloudSaved] = useState('')
  const [saveName, setSaveName] = useState('')
  const [cloudVersions, setCloudVersions] = useState<CloudVersion[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const jsonString = useMemo(() => serializeWorkspace(workspace), [workspace])
  const byteSize = useMemo(() => new Blob([jsonString]).size, [jsonString])
  const formattedSize = byteSize < 1024 ? `${byteSize} B` : `${(byteSize / 1024).toFixed(1)} KB`

  const closeModal = useCallback(() => {
    setCopied(false)
    setCloudSaved('')
    setCloudError('')
    onClose()
  }, [onClose])

  // Existing documents are shown as overwrite targets.
  useEffect(() => {
    if (!isOpen || activeTab !== 'cloud' || !cloudEnabled) return
    let cancelled = false

    void listCloudVersions()
      .then((list) => {
        if (!cancelled) setCloudVersions(list)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [isOpen, activeTab, cloudEnabled])

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

  const handleCloudSave = async (name: string) => {
    if (!name.trim()) {
      setCloudError('Enter a name for this save.')
      return
    }

    setSavingId(name.trim())
    setCloudError('')
    setCloudSaved('')

    try {
      const saved = await saveCloudVersion(workspace, name)
      setCloudSaved(saved.id)
      onNotice?.(`Saved to ${saved.id}.`)
      setCloudVersions(await listCloudVersions())
    } catch (error) {
      setCloudError(cloudErrorMessage(error))
    } finally {
      setSavingId('')
    }
  }

  const trimmedSaveName = saveName.trim()
  const willOverwrite = cloudVersions.some((version) => version.id === trimmedSaveName)

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
          {cloudEnabled && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'cloud'}
              className={`modal-tab ${activeTab === 'cloud' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('cloud')
                if (!saveName) setSaveName(defaultSaveName())
              }}
            >
              Cloud Save
            </button>
          )}
        </div>

        <div className="modal-body">
          {activeTab === 'cloud' ? (
            <div className="cloud-save-pane">
              <p className="panel-hint">
                Save this workspace as a new document, or overwrite an existing one.
              </p>

              <label className="auth-label" htmlFor="cloud-save-name">
                Save as
              </label>
              <input
                id="cloud-save-name"
                className="field"
                value={saveName}
                placeholder="workspace-name"
                spellCheck={false}
                onChange={(event) => {
                  setSaveName(event.target.value)
                  setCloudSaved('')
                }}
              />
              <p className="panel-hint">
                {willOverwrite
                  ? 'An existing document will be overwritten.'
                  : 'A new document will be created.'}
              </p>

              <div className="export-meta">
                <span className="export-meta-item">{workspace.panels.length} panel(s)</span>
                <span className="export-meta-dot">•</span>
                <span className="export-meta-item">{workspace.columns} column(s)</span>
              </div>
              <p className="panel-hint">
                {cloudUser ? `Signed in as ${cloudUser}.` : 'Sign in from the header to save.'}
              </p>

              {cloudVersions.length > 0 && (
                <div className="cloud-versions-pane">
                  <p className="panel-hint">Or overwrite an existing document:</p>
                  <ul className="cloud-versions">
                    {cloudVersions.map((version) => (
                      <li key={version.id} className="cloud-version">
                        <div className="cloud-version-info">
                          <p className="cloud-version-name">{version.id}</p>
                          <p className="cloud-version-meta">
                            {formatSavedAt(version.savedAt)} · {version.panelCount} panel(s)
                            {version.savedBy ? ` · ${version.savedBy}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="text-button"
                          disabled={!cloudUser || Boolean(savingId)}
                          onClick={() => void handleCloudSave(version.id)}
                        >
                          {savingId === version.id ? 'Saving…' : 'Overwrite'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {cloudError && (
                <p className="form-error" role="alert">
                  {cloudError}
                </p>
              )}
              {cloudSaved && (
                <p className="panel-hint" role="status">
                  Saved to {cloudSaved}.
                </p>
              )}
            </div>
          ) : activeTab === 'file' ? (
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
          ) : activeTab === 'text' ? (
            <button
              type="button"
              className="toolbar-button"
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : 'Copy to Clipboard'}
            </button>
          ) : (
            <button
              type="button"
              className="toolbar-button"
              disabled={!cloudUser || Boolean(savingId) || !trimmedSaveName}
              onClick={() => void handleCloudSave(saveName)}
            >
              {savingId ? 'Saving…' : willOverwrite ? 'Overwrite' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
