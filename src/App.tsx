import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { cloudErrorMessage, signOutCloud, watchCloudUser } from './cloud'
import { AuthModal } from './components/AuthModal'
import { ExportModal } from './components/ExportModal'
import { ImportModal } from './components/ImportModal'
import { ShortcutLeader, ShortcutsModal } from './components/Shortcuts'
import { Workspace } from './components/Workspace'
import { initializeFirebase } from './firebase'
import { confirmAction, onBeforeQuit } from './platform'
import { ReadOnlyContext } from './read-only'
import {
  MAX_COLUMNS,
  MAX_ROW_SPAN,
  MIN_COLUMNS,
  clampColumns,
  clearWorkspace,
  createPanel,
  loadWorkspace,
  saveWorkspace,
} from './storage'
import type { Panel, PanelPatch, PanelType, WorkspaceData } from './types'

const APP_VERSION = '0.1.5-cloud'

const ADD_BUTTONS: { type: PanelType; label: string }[] = [
  { type: 'text', label: '+ Text' },
  { type: 'pdf', label: '+ PDF' },
  { type: 'bookmarks', label: '+ Bookmarks' },
  { type: 'todo', label: '+ Todo' },
]

type CloudStatus = 'loading' | 'ready' | 'disabled'

interface FocusRequest {
  id: string
  target: 'title' | 'content'
}

function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(loadWorkspace)
  const [cloudUser, setCloudUser] = useState<string | null>(null)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>('loading')
  const [notice, setNotice] = useState('')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
  const [leaderOpen, setLeaderOpen] = useState(false)
  const [activePanelId, setActivePanelId] = useState(() => workspace.panels[0]?.id ?? '')
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const [shortcutStatus, setShortcutStatus] = useState('')
  const workspaceRef = useRef(workspace)
  const handledFocusRequest = useRef<FocusRequest | null>(null)

  // Signed-out users with cloud available get a read-only workspace; a build
  // without Firebase config stays a normal local-only app.
  const readOnly = cloudStatus === 'ready' && !cloudUser
  const activePanel =
    workspace.panels.find((panel) => panel.id === activePanelId) ?? workspace.panels[0]
  const resolvedActivePanelId = activePanel?.id ?? ''

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

  // Move real DOM focus after a shortcut asks for the title or panel body.
  useEffect(() => {
    if (!focusRequest || handledFocusRequest.current === focusRequest) return
    handledFocusRequest.current = focusRequest

    const article = Array.from(
      document.querySelectorAll<HTMLElement>('[data-panel-id]'),
    ).find((element) => element.dataset.panelId === focusRequest.id)

    const target =
      focusRequest.target === 'title'
        ? article?.querySelector<HTMLElement>('.panel-title')
        : article?.querySelector<HTMLElement>(
            '.panel-body textarea, .panel-body input, .panel-body button, .panel-body a[href], .panel-body [tabindex]:not([tabindex="-1"])',
          )

    const focusTarget = target ?? article
    focusTarget?.focus()
  }, [focusRequest, workspace.panels])

  const addPanel = useCallback((type: PanelType, focus = false) => {
    const panel = createPanel(type)
    setWorkspace((current) => ({
      ...current,
      panels: [...current.panels, panel],
    }))
    setActivePanelId(panel.id)
    if (focus) setFocusRequest({ id: panel.id, target: 'content' })
    setShortcutStatus(`Added ${type} panel.`)
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

  const handleSignIn = useCallback(() => {
    setLeaderOpen(false)
    setIsAuthOpen(true)
  }, [])

  const openExport = useCallback(() => {
    setLeaderOpen(false)
    setIsExportOpen(true)
  }, [])

  const openImport = useCallback(() => {
    setLeaderOpen(false)
    setIsImportOpen(true)
  }, [])

  const openShortcuts = useCallback(() => {
    setLeaderOpen(false)
    setIsShortcutsOpen(true)
  }, [])

  const handleSignOut = useCallback(() => {
    void signOutCloud().catch((error: unknown) => setNotice(cloudErrorMessage(error)))
  }, [])

  const clearAll = useCallback(async () => {
    const confirmed = await confirmAction(
      'Delete the entire workspace from this device? This cannot be undone.',
    )
    if (!confirmed) return

    clearWorkspace()
    setWorkspace({ columns: 2, panels: [] })
    setActivePanelId('')
    setNotice('Workspace cleared.')
  }, [])

  const selectPanel = useCallback(
    (direction: -1 | 1) => {
      const panels = workspace.panels
      if (panels.length === 0) {
        setShortcutStatus('The workspace is empty.')
        return
      }

      const index = panels.findIndex((panel) => panel.id === resolvedActivePanelId)
      const nextIndex = index === -1 ? 0 : (index + direction + panels.length) % panels.length
      const next = panels[nextIndex]
      setActivePanelId(next.id)
      setShortcutStatus(`Selected ${next.title || next.type} panel.`)
    },
    [workspace.panels, resolvedActivePanelId],
  )

  const moveActivePanel = useCallback(
    (direction: -1 | 1) => {
      if (!activePanel) return

      const index = workspace.panels.findIndex((panel) => panel.id === activePanel.id)
      const target = index + direction
      if (target < 0 || target >= workspace.panels.length) {
        setShortcutStatus(direction === -1 ? 'Panel is already first.' : 'Panel is already last.')
        return
      }

      movePanel(activePanel.id, direction)
      setShortcutStatus(direction === -1 ? 'Moved panel back.' : 'Moved panel forward.')
    },
    [activePanel, workspace.panels, movePanel],
  )

  const resizeActivePanel = useCallback(
    (dimension: 'col' | 'row', delta: -1 | 1) => {
      if (!activePanel) return

      if (dimension === 'col') {
        const next = Math.max(1, Math.min(workspace.columns, activePanel.colSpan + delta))
        if (next !== activePanel.colSpan) patchPanel(activePanel.id, { colSpan: next })
        setShortcutStatus(`Panel width: ${next} of ${workspace.columns}.`)
        return
      }

      const next = Math.max(1, Math.min(MAX_ROW_SPAN, activePanel.rowSpan + delta))
      if (next !== activePanel.rowSpan) patchPanel(activePanel.id, { rowSpan: next })
      setShortcutStatus(`Panel height: ${next} row${next === 1 ? '' : 's'}.`)
    },
    [activePanel, workspace.columns, patchPanel],
  )

  const closeActivePanel = useCallback(() => {
    if (!activePanel) return
    removePanel(activePanel.id)
    setShortcutStatus('Panel closed.')
  }, [activePanel, removePanel])

  const focusActivePanel = useCallback(
    (target: 'title' | 'content') => {
      if (!activePanel) {
        setNotice('Add or select a panel first.')
        return
      }

      setFocusRequest({ id: activePanel.id, target })
      setShortcutStatus(target === 'title' ? 'Renaming selected panel.' : 'Focused selected panel.')
    },
    [activePanel],
  )

  const handleShortcut = useCallback(
    (key: string): boolean => {
      const canEdit = !readOnly
      const requireEdit = () => {
        setNotice('Sign in to edit this workspace.')
        return false
      }

      switch (key) {
        case 't':
          if (!canEdit) return requireEdit()
          addPanel('text', true)
          return true
        case 'p':
          if (!canEdit) return requireEdit()
          addPanel('pdf', true)
          return true
        case 'b':
          if (!canEdit) return requireEdit()
          addPanel('bookmarks', true)
          return true
        case 'd':
          if (!canEdit) return requireEdit()
          addPanel('todo', true)
          return true
        case 'j':
          selectPanel(1)
          return true
        case 'k':
          selectPanel(-1)
          return true
        case 'h':
          if (!canEdit) return requireEdit()
          moveActivePanel(-1)
          return true
        case 'l':
          if (!canEdit) return requireEdit()
          moveActivePanel(1)
          return true
        case '-':
          if (!canEdit) return requireEdit()
          resizeActivePanel('col', -1)
          return true
        case '=':
        case '+':
          if (!canEdit) return requireEdit()
          resizeActivePanel('col', 1)
          return true
        case '[':
          if (!canEdit) return requireEdit()
          resizeActivePanel('row', -1)
          return true
        case ']':
          if (!canEdit) return requireEdit()
          resizeActivePanel('row', 1)
          return true
        case 'x':
          if (!canEdit) return requireEdit()
          closeActivePanel()
          return true
        case 'r':
          if (!canEdit) return requireEdit()
          focusActivePanel('title')
          return true
        case 'Enter':
          focusActivePanel('content')
          return true
        case ',':
          if (!canEdit) return requireEdit()
          setColumns(workspace.columns - 1)
          return true
        case '.':
          if (!canEdit) return requireEdit()
          setColumns(workspace.columns + 1)
          return true
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          if (!canEdit) return requireEdit()
          setColumns(Number(key))
          return true
        case 'e':
          openExport()
          return true
        case 'i':
          openImport()
          return true
        case 'c':
          if (!canEdit) return requireEdit()
          void clearAll()
          return true
        case 's':
          if (cloudStatus === 'disabled') return false
          if (cloudUser) handleSignOut()
          else handleSignIn()
          return true
        case '?':
          openShortcuts()
          return true
        default:
          return false
      }
    },
    [
      readOnly,
      addPanel,
      selectPanel,
      moveActivePanel,
      resizeActivePanel,
      closeActivePanel,
      focusActivePanel,
      setColumns,
      workspace.columns,
      clearAll,
      openExport,
      openImport,
      openShortcuts,
      cloudStatus,
      cloudUser,
      handleSignOut,
      handleSignIn,
    ],
  )

  // Ctrl/Cmd+A is the leader outside text fields. Inside a text field the same
  // gesture keeps its native select-all behaviour.
  useEffect(() => {
    const modalOpen = isImportOpen || isExportOpen || isAuthOpen || isShortcutsOpen

    const isEditable = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      return (
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      )
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return

      if (leaderOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setLeaderOpen(false)
          return
        }

        // Ignore modifier-only keys so the leader waits for a real command.
        if (event.key.length > 1 && event.key !== 'Enter') return

        event.preventDefault()
        setLeaderOpen(false)

        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
        if (!handleShortcut(key)) {
          setNotice(`No shortcut for “${event.key}”. Press Ctrl+A then ? for help.`)
        }
        return
      }

      if (modalOpen) return

      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'a'
      ) {
        if (isEditable(event.target)) return
        event.preventDefault()
        setLeaderOpen(true)
        setShortcutStatus('Leader active. Press a key, or ? for help.')
        return
      }

      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (isEditable(event.target)) return
        event.preventDefault()
        openShortcuts()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    leaderOpen,
    handleShortcut,
    isImportOpen,
    isExportOpen,
    isAuthOpen,
    isShortcutsOpen,
    openShortcuts,
  ])

  return (
    <div className="app">
      <header className="app-bar">
        <h1 className="app-title">
          ggez <span className="app-version">v{APP_VERSION}</span>
        </h1>
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
            aria-haspopup="dialog"
            aria-keyshortcuts="Control+A"
            title="Keyboard shortcuts (Ctrl+A, then ?)"
            onClick={openShortcuts}
          >
            Shortcuts
          </button>
          <button
            type="button"
            className="text-button"
            onClick={openExport}
          >
            Export
          </button>
          <button
            type="button"
            className="text-button"
            onClick={openImport}
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
        <p className="visually-hidden" role="status" aria-live="polite">
          {shortcutStatus}
        </p>
      </header>

      <main className="app-main">
        <ReadOnlyContext.Provider value={readOnly}>
          <Workspace
            workspace={workspace}
            activePanelId={resolvedActivePanelId}
            onActivate={setActivePanelId}
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

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        cloudEnabled={cloudStatus === 'ready'}
        readOnly={readOnly}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <ShortcutLeader
        isOpen={leaderOpen}
        cloudEnabled={cloudStatus === 'ready'}
        readOnly={readOnly}
        onClose={() => setLeaderOpen(false)}
      />
    </div>
  )
}

export default App
