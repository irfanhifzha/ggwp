import { useState } from 'react'
import { useReadOnly } from '../read-only'
import type { PanelPatch, PanelType, WorkspaceData } from '../types'
import { PanelContent } from './PanelContent'
import { PanelShell } from './PanelShell'

interface WorkspaceProps {
  workspace: WorkspaceData
  onPatch: (id: string, patch: PanelPatch) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onReorder: (id: string, targetId: string) => void
  onAdd: (type: PanelType) => void
}

export function Workspace({ workspace, onPatch, onRemove, onMove, onReorder, onAdd }: WorkspaceProps) {
  const readOnly = useReadOnly()
  const [draggingId, setDraggingId] = useState('')
  const [overId, setOverId] = useState('')

  if (workspace.panels.length === 0) {
    return (
      <div className="workspace-empty">
        <p>Your workspace is empty.</p>
        <div className="workspace-empty-actions">
          <button
            type="button"
            className="text-button"
            disabled={readOnly}
            onClick={() => onAdd('text')}
          >
            Add text panel
          </button>
          <button
            type="button"
            className="text-button"
            disabled={readOnly}
            onClick={() => onAdd('pdf')}
          >
            Add PDF panel
          </button>
          <button
            type="button"
            className="text-button"
            disabled={readOnly}
            onClick={() => onAdd('bookmarks')}
          >
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
          isDropTarget={Boolean(draggingId) && panel.id === overId && panel.id !== draggingId}
          onDragStart={setDraggingId}
          onDragEnd={() => {
            setDraggingId('')
            setOverId('')
          }}
          onDragOverPanel={setOverId}
          onDropOn={(targetId) => {
            if (draggingId && draggingId !== targetId) onReorder(draggingId, targetId)
            setDraggingId('')
            setOverId('')
          }}
        >
          <PanelContent panel={panel} onPatch={onPatch} />
        </PanelShell>
      ))}
    </div>
  )
}
