import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  cloudErrorMessage,
  loadCloudWorkspace,
  saveCloudWorkspace,
  signOutCloud,
  watchCloudUser,
} from './cloud'
import { AuthModal } from './components/AuthModal'
import { ExportModal } from './components/ExportModal'
import { ImportModal } from './components/ImportModal'
import { Workspace } from './components/Workspace'
import { initializeFirebase } from './firebase'
import { confirmAction, onBeforeQuit } from './platform'
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

type CloudStatus = 'loading' | 'ready' | 'saving' | 'saved' | 'error' | 'disabled'

function App() {
  const [workspace, setWorkspaceState] = useState<WorkspaceData>(loadWorkspace)
  const [cloudUser, setCloudUser] = useState<string | null>(null)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('loading')
  const [notice, setNotice] = useState('')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const workspaceRef = useRef(workspace)
  const dirtyRef = useRef(false)

  // User edits go through here so a cloud load can never be written straight back.
  const setWorkspace = useCallback((updater: (current: WorkspaceData) => WorkspaceData) => {
    dirtyRef.current = true
    setWorkspaceState(updater)
  }, [])

  useEffect(() => {
    workspaceRef.current = workspace
    const timer = setTimeout(() => {
      saveWorkspace(workspace)

      if (!dirtyRef.current || !cloudUser) return
      setCloudStatus('saving')
      saveCloudWorkspace(workspace)
        .then(() => setCloudStatus('saved'))
        .catch((error: unknown) => {
          setCloudStatus('error')
          setNotice(cloudErrorMessage(error))
        })
    }, 400)
    return () => clearTimeout(timer)
  }, [workspace, cloudUser])

  // Cloud data is the shared source of truth; without a config file the app stays local-only.
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

      void watchCloudUser((user) => {
        if (cancelled) return
        setCloudUser(user ? user.displayName || user.email || 'Signed in' : null)
      })
        .then((stop) => {
          if (cancelled) stop()
          else unsubscribe = stop
        })
        .catch(() => {})

      try {
        const remote = await loadCloudWorkspace()
        if (cancelled) return
        if (remote) {
          setWorkspaceState(remote)
          dirtyRef.current = false
        }
        setCloudStatus('ready')
      } catch (error) {
        if (cancelled) return
        setCloudStatus('error')
        setNotice(cloudErrorMessage(error))
      }
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
  }, [setWorkspace])

  const patchPanel = useCallback((id: string, patch: PanelPatch) => {
    setWorkspace((current) => ({
      ...current,
      panels: current.panels.map((panel) =>
        panel.id === id ? ({ ...panel, ...patch } as Panel) : panel,
      ),
    }))
  }, [setWorkspace])

  const removePanel = useCallback((id: string) => {
    setWorkspace((current) => ({
      ...current,
      panels: current.panels.filter((panel) => panel.id !== id),
    }))
  }, [setWorkspace])

  const movePanel = useCallback((id: string, direction: -1 | 1) => {
    setWorkspace((current) => {
      const index = current.panels.findIndex((panel) => panel.id === id)
      const target = index + direction
      if (index === -1 || target < 0 || target >= current.panels.length) return current

      const panels = [...current.panels]
      ;[panels[index], panels[target]] = [panels[target], panels[index]]
      return { ...current, panels }
    })
  }, [setWorkspace])

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
  }, [setWorkspace])

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
  }, [setWorkspace])

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
    setWorkspace(() => ({ columns: 2, panels: [] }))
    setNotice('Workspace cleared.')
  }

  return (
    <div className="app">
      <header className="app-bar">
        <h1 className="app-title">ggwplab.pages.dev</h1>
        <div className="columns-control" role="group" aria-label="Grid columns">
          <span className="columns-label">Columns</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Use fewer columns"
            disabled={workspace.columns <= MIN_COLUMNS}
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
            disabled={workspace.columns >= MAX_COLUMNS}
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
          <button type="button" className="text-button text-button-danger" onClick={clearAll}>
            Clear all
          </button>
        </div>

        {cloudStatus !== 'disabled' && (
          <div className="cloud-control">
            <span className={`cloud-dot cloud-dot-${cloudStatus}`} aria-hidden="true" />
            <span className="cloud-label" title={cloudUser ?? undefined}>
              {cloudStatus === 'loading'
                ? 'Loading cloud…'
                : cloudStatus === 'saving'
                  ? 'Saving…'
                  : cloudStatus === 'saved'
                    ? 'Saved to cloud'
                    : cloudStatus === 'error'
                      ? 'Cloud error'
                      : cloudUser
                        ? `Cloud · ${cloudUser}`
                        : 'Read-only'}
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
        <Workspace
          workspace={workspace}
          onPatch={patchPanel}
          onRemove={removePanel}
          onMove={movePanel}
          onReorder={reorderPanel}
          onAdd={addPanel}
        />
      </main>

      {isAuthOpen && <AuthModal onClose={() => setIsAuthOpen(false)} />}

      <ExportModal
        isOpen={isExportOpen}
        workspace={workspace}
        onClose={() => setIsExportOpen(false)}
        onNotice={(msg) => setNotice(msg)}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={(imported) => {
          setWorkspace(() => imported)
          setNotice(`Imported ${imported.panels.length} panel(s).`)
        }}
      />
    </div>
  )
}

export default App
