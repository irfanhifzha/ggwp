import { useState } from 'react'
import type { Panel, PanelPatch, PanelType, WorkspaceData } from '../types'
import { PanelShell } from './PanelShell'

interface WorkspaceProps {
  workspace: WorkspaceData
  onPatch: (id: string, patch: PanelPatch) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onReorder: (id: string, targetId: string) => void
  onAdd: (type: PanelType) => void
}

function PanelPlaceholder({ panel }: { panel: Panel }) {
  return <p className="panel-placeholder">{panel.type} panel</p>
}

export function Workspace({ workspace, onPatch, onRemove, onMove, onReorder, onAdd }: WorkspaceProps) {
  const [draggingId, setDraggingId] = useState('')

  if (workspace.panels.length === 0) {
    return (
      <div className="workspace-empty">
        <p>Your workspace is empty.</p>
        <div className="workspace-empty-actions">
          <button type="button" className="text-button" onClick={() => onAdd('text')}>
            Add text panel
          </button>
          <button type="button" className="text-button" onClick={() => onAdd('pdf')}>
            Add PDF panel
          </button>
          <button type="button" className="text-button" onClick={() => onAdd('bookmarks')}>
            Add bookmarks panel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="workspace"
      style={{ gridTemplateColumns: `repeat(${workspace.columns}, minmax(0, 1fr))` }}
    >
      {workspace.panels.map((panel, index) => (
        <PanelShell
          key={panel.id}
          panel={panel}
          columns={workspace.columns}
          canMoveUp={index > 0}
          canMoveDown={index < workspace.panels.length - 1}
          onPatch={onPatch}
          onRemove={onRemove}
          onMove={onMove}
          isDragging={panel.id === draggingId}
          onDragStart={setDraggingId}
          onDropOn={(targetId) => {
            if (draggingId && draggingId !== targetId) onReorder(draggingId, targetId)
            setDraggingId('')
          }}
        >
          <PanelPlaceholder panel={panel} />
        </PanelShell>
      ))}
    </div>
  )
}
