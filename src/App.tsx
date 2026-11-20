import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { cloudErrorMessage, signOutCloud, watchCloudUser } from './cloud'
import { AuthModal } from './components/AuthModal'
import { ExportModal } from './components/ExportModal'
import { ImportModal } from './components/ImportModal'
import { Workspace } from './components/Workspace'
import { initializeFirebase } from './firebase'
import { confirmAction, onBeforeQuit } from './platform'
import { ReadOnlyContext } from './read-only'
import {
  MAX_COLUMNS,
  MIN_COLUMNS,
  clampColumns,
  clearWorkspace,
  createPanel,
  loadWorkspace,
  saveWorkspace,
} from './storage'
import type { Panel, PanelPatch, PanelType, WorkspaceData } from './types'

const ADD_BUTTONS: { type: PanelType; label: string }[] = [
  { type: 'text', label: '+ Text' },
  { type: 'pdf', label: '+ PDF' },
  { type: 'bookmarks', label: '+ Bookmarks' },
  { type: 'todo', label: '+ Todo' },
]

type CloudStatus = 'loading' | 'ready' | 'disabled'

function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(loadWorkspace)
  const [cloudUser, setCloudUser] = useState<string | null>(null)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('loading')
  const [notice, setNotice] = useState('')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const workspaceRef = useRef(workspace)

  // Signed-out users with cloud available get a read-only workspace; a build
  // without Firebase config stays a normal local-only app.
  const readOnly = cloudStatus === 'ready' && !cloudUser

  useEffect(() => {
    workspaceRef.current = workspace
    const timer = setTimeout(() => saveWorkspace(workspace), 400)
    return () => clearTimeout(timer)
  }, [workspace])

  useEffect(() => {
    let cancelled = false
    let unsubscribe = () => {}

    void (async () => {
      const services = await initializeFirebase()
      if (cancelled) return
      if (!services) {
        setCloudStatus('disabled')
        return
      }

      setCloudStatus('ready')
      void watchCloudUser((user) => {
        if (cancelled) return
        setCloudUser(user ? user.displayName || user.email || 'Signed in' : null)
      })
        .then((stop) => {
          if (cancelled) stop()
          else unsubscribe = stop
        })
        .catch(() => {})
    })()

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  // Desktop windows can actually exit, so flush the pending debounced save on close
  // instead of losing the last keystrokes.
  useEffect(() => {
    const flush = () => saveWorkspace(workspaceRef.current)
    const handleUnload = () => flush()
    window.addEventListener('beforeunload', handleUnload)

    let unsubscribe: (() => void) | undefined
    void onBeforeQuit(flush).then((unlisten) => {
      unsubscribe = unlisten
    })

    return () => {
      unsubscribe?.()
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const addPanel = useCallback((type: PanelType) => {
    setWorkspace((current) => ({
      ...current,
      panels: [...current.panels, createPanel(type)],
    }))
  }, [])

  const patchPanel = useCallback((id: string, patch: PanelPatch) => {
    setWorkspace((current) => ({
      ...current,
      panels: current.panels.map((panel) =>
        panel.id === id ? ({ ...panel, ...patch } as Panel) : panel,
      ),
    }))
  }, [])

  const removePanel = useCallback((id: string) => {
    setWorkspace((current) => ({
      ...current,
      panels: current.panels.filter((panel) => panel.id !== id),
    }))
  }, [])

  const movePanel = useCallback((id: string, direction: -1 | 1) => {
    setWorkspace((current) => {
      const index = current.panels.findIndex((panel) => panel.id === id)
      const target = index + direction
      if (index === -1 || target < 0 || target >= current.panels.length) return current

      const panels = [...current.panels]
      ;[panels[index], panels[target]] = [panels[target], panels[index]]
      return { ...current, panels }
    })
  }, [])

  const setColumns = useCallback((next: number) => {
    setWorkspace((current) => {
      const columns = clampColumns(next)
      return {
        ...current,
        columns,
        panels: current.panels.map((panel) =>
          panel.colSpan > columns ? ({ ...panel, colSpan: columns } as Panel) : panel,
        ),
      }
    })
  }, [])

  const reorderPanel = useCallback((id: string, targetId: string) => {
    setWorkspace((current) => {
      const from = current.panels.findIndex((panel) => panel.id === id)
      const to = current.panels.findIndex((panel) => panel.id === targetId)
      if (from === -1 || to === -1 || from === to) return current

      const panels = [...current.panels]
      const [moved] = panels.splice(from, 1)
      panels.splice(to, 0, moved)
      return { ...current, panels }
    })
  }, [])

  const handleSignIn = useCallback(() => setIsAuthOpen(true), [])

  const handleSignOut = useCallback(() => {
    void signOutCloud().catch((error: unknown) => setNotice(cloudErrorMessage(error)))
  }, [])

  const clearAll = async () => {
    const confirmed = await confirmAction(
      'Delete the entire workspace from this device? This cannot be undone.',
    )
    if (!confirmed) return

    clearWorkspace()
    setWorkspace({ columns: 2, panels: [] })
    setNotice('Workspace cleared.')
  }

  return (
    <div className="app">
      <header className="app-bar">
        <h1 className="app-title">ggez</h1>
        <div className="columns-control" role="group" aria-label="Grid columns">
          <span className="columns-label">Columns</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Use fewer columns"
            disabled={readOnly || workspace.columns <= MIN_COLUMNS}
            onClick={() => setColumns(workspace.columns - 1)}
          >
            −
          </button>
          <span className="columns-value" aria-live="polite">
            {workspace.columns}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Use more columns"
            disabled={readOnly || workspace.columns >= MAX_COLUMNS}
            onClick={() => setColumns(workspace.columns + 1)}
          >
            +
          </button>
        </div>
        <div className="app-actions">
          {ADD_BUTTONS.map((button) => (
            <button
              key={button.type}
              type="button"
              className="toolbar-button"
              disabled={readOnly}
              onClick={() => addPanel(button.type)}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div className="data-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => setIsExportOpen(true)}
          >
            Export
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => setIsImportOpen(true)}
          >
            Import
          </button>
          <button
            type="button"
            className="text-button text-button-danger"
            disabled={readOnly}
            onClick={clearAll}
          >
            Clear all
          </button>
        </div>

        {cloudStatus !== 'disabled' && (
          <div className="cloud-control">
            <span
              className={`cloud-dot${cloudStatus === 'ready' ? ' cloud-dot-ready' : ''}`}
              aria-hidden="true"
            />
            <span className="cloud-label" title={cloudUser ?? undefined}>
              {cloudStatus === 'loading'
                ? 'Cloud…'
                : cloudUser
                  ? `Cloud · ${cloudUser}`
                  : 'Read-only · sign in to edit'}
            </span>
            {cloudUser ? (
              <button type="button" className="text-button" onClick={handleSignOut}>
                Sign out
              </button>
            ) : (
              <button type="button" className="text-button" onClick={handleSignIn}>
                Sign in
              </button>
            )}
          </div>
        )}

        {notice && (
          <p className="app-notice" role="status">
            {notice}
          </p>
        )}
      </header>

      <main className="app-main">
        <ReadOnlyContext.Provider value={readOnly}>
          <Workspace
            workspace={workspace}
            onPatch={patchPanel}
            onRemove={removePanel}
            onMove={movePanel}
            onReorder={reorderPanel}
            onAdd={addPanel}
          />
        </ReadOnlyContext.Provider>
      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}

      <ExportModal
        isOpen={isExportOpen}
        workspace={workspace}
        cloudEnabled={cloudStatus === 'ready'}
        cloudUser={cloudUser}
        onClose={() => setIsExportOpen(false)}
        onNotice={(msg) => setNotice(msg)}
      />

      <ImportModal
        isOpen={isImportOpen}
        cloudEnabled={cloudStatus === 'ready'}
        onClose={() => setIsImportOpen(false)}
        onImport={(imported) => {
          setWorkspace(imported)
          setNotice(`Loaded ${imported.panels.length} panel(s).`)
        }}
      />
    </div>
  )
}

export default App
