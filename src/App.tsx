import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import { Workspace } from './components/Workspace'
import {
  MAX_COLUMNS,
  MIN_COLUMNS,
  clampColumns,
  clearWorkspace,
  createPanel,
  downloadWorkspace,
  loadWorkspace,
  parseWorkspace,
  saveWorkspace,
} from './storage'
import type { Panel, PanelPatch, PanelType, WorkspaceData } from './types'

const ADD_BUTTONS: { type: PanelType; label: string }[] = [
  { type: 'text', label: '+ Text' },
  { type: 'pdf', label: '+ PDF' },
  { type: 'bookmarks', label: '+ Bookmarks' },
]

function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(loadWorkspace)
  const [notice, setNotice] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => saveWorkspace(workspace), 400)
    return () => clearTimeout(timer)
  }, [workspace])

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

  const importFile = async (file: File) => {
    try {
      const parsed = parseWorkspace(JSON.parse(await file.text()))
      if (!parsed) {
        setNotice('That file is not a valid workspace export.')
        return
      }

      setWorkspace(parsed)
      setNotice(`Imported ${parsed.panels.length} panel(s).`)
    } catch {
      setNotice('Could not read that file as JSON.')
    }
  }

  const clearAll = () => {
    if (!window.confirm('Delete the entire workspace from this browser? This cannot be undone.')) {
      return
    }

    clearWorkspace()
    setWorkspace({ version: 1, columns: 2, panels: [] })
    setNotice('Workspace cleared.')
  }

  return (
    <div className="app">
      <header className="app-bar">
        <h1 className="app-title">GreatGridWorkspace</h1>
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
            onClick={() => downloadWorkspace(workspace)}
          >
            Export
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Import
          </button>
          <button type="button" className="text-button text-button-danger" onClick={clearAll}>
            Clear all
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importFile(file)
              event.target.value = ''
            }}
          />
        </div>

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
    </div>
  )
}

export default App
