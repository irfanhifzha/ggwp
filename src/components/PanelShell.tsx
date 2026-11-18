import type { ReactNode } from 'react'
import type { Panel, PanelPatch } from '../types'

interface PanelShellProps {
  panel: Panel
  columns: number
  canMoveUp: boolean
  canMoveDown: boolean
  onPatch: (id: string, patch: PanelPatch) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragOverPanel: (id: string) => void
  onDropOn: (id: string) => void
  isDragging: boolean
  isDropTarget: boolean
  children: ReactNode
}

export function PanelShell({
  panel,
  columns,
  canMoveUp,
  canMoveDown,
  onPatch,
  onRemove,
  onMove,
  onDragStart,
  onDragEnd,
  onDragOverPanel,
  onDropOn,
  isDragging,
  isDropTarget,
  children,
}: PanelShellProps) {
  return (
    <article
      className={`panel${isDragging ? ' panel-dragging' : ''}${
        isDropTarget ? ' panel-drop-target' : ''
      }`}
      style={{
        gridColumn: `span ${Math.min(panel.colSpan, columns)}`,
        gridRow: `span ${panel.rowSpan}`,
      }}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes('text/plain')) return
        event.preventDefault()
        onDragOverPanel(panel.id)
      }}
      onDrop={(event) => {
        event.preventDefault()
        onDropOn(panel.id)
      }}
    >
      <header className="panel-head">
        <span
          className="panel-grip"
          draggable
          aria-hidden="true"
          title="Drag to rearrange"
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/plain', panel.id)
            onDragStart(panel.id)
          }}
          onDragEnd={onDragEnd}
        >
          ⠿
        </span>

        <input
          className="panel-title"
          value={panel.title}
          aria-label="Panel title"
          placeholder={panel.type === 'text' ? 'Untitled note' : 'Untitled panel'}
          onChange={(event) => onPatch(panel.id, { title: event.target.value })}
        />

        <div className="panel-actions">
          <button
            type="button"
            className="icon-button"
            title="Move panel back"
            aria-label="Move panel back"
            disabled={!canMoveUp}
            onClick={() => onMove(panel.id, -1)}
          >
            ←
          </button>
          <button
            type="button"
            className="icon-button"
            title="Move panel forward"
            aria-label="Move panel forward"
            disabled={!canMoveDown}
            onClick={() => onMove(panel.id, 1)}
          >
            →
          </button>
          <button
            type="button"
            className="icon-button"
            title="Make narrower"
            aria-label="Make panel narrower"
            disabled={panel.colSpan <= 1}
            onClick={() => onPatch(panel.id, { colSpan: panel.colSpan - 1 })}
          >
            ◄
          </button>
          <button
            type="button"
            className="icon-button"
            title="Make wider"
            aria-label="Make panel wider"
            disabled={panel.colSpan >= columns}
            onClick={() => onPatch(panel.id, { colSpan: panel.colSpan + 1 })}
          >
            ►
          </button>
          <button
            type="button"
            className="icon-button"
            title="Make shorter"
            aria-label="Make panel shorter"
            disabled={panel.rowSpan <= 1}
            onClick={() => onPatch(panel.id, { rowSpan: panel.rowSpan - 1 })}
          >
            ▲
          </button>
          <button
            type="button"
            className="icon-button"
            title="Make taller"
            aria-label="Make panel taller"
            disabled={panel.rowSpan >= 4}
            onClick={() => onPatch(panel.id, { rowSpan: panel.rowSpan + 1 })}
          >
            ▼
          </button>
          <button
            type="button"
            className="icon-button icon-button-danger"
            title="Remove panel"
            aria-label={`Remove ${panel.title || panel.type} panel`}
            onClick={() => onRemove(panel.id)}
          >
            ✕
          </button>
        </div>
      </header>

      <div className="panel-body">{children}</div>
    </article>
  )
}
