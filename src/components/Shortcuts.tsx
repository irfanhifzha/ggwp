import { useEffect, useRef } from 'react'
import { shortcutGroups, type ShortcutGroup } from '../shortcuts'

function KeyChips({ keys }: { keys: string[] }) {
  return (
    <span className="shortcut-keys">
      {keys.map((key, index) => (
        <kbd key={`${key}-${index}`}>{key}</kbd>
      ))}
    </span>
  )
}

function ShortcutList({ groups }: { groups: ShortcutGroup[] }) {
  return (
    <div className="shortcut-grid">
      {groups.map((group) => (
        <section key={group.title} className="shortcut-group" aria-label={group.title}>
          <h3 className="shortcut-group-title">{group.title}</h3>
          <ul className="shortcut-list">
            {group.items.map((item) => (
              <li key={item.label} className="shortcut-item">
                <KeyChips keys={item.keys} />
                <span className="shortcut-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

interface ShortcutsModalProps {
  isOpen: boolean
  cloudEnabled?: boolean
  readOnly?: boolean
  onClose: () => void
}

/**
 * Full cheat sheet, also reachable with the ? key. Focus is trapped while the
 * dialog is open so keyboard users cannot tab into the workspace behind it.
 */
export function ShortcutsModal({
  isOpen,
  cloudEnabled = false,
  readOnly = false,
  onClose,
}: ShortcutsModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return

    closeRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !cardRef.current) return

      const focusable = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null)

      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={cardRef}
        className="modal-card shortcuts-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-dialog-title"
      >
        <div className="modal-head">
          <h2 id="shortcuts-dialog-title" className="modal-title">
            Keyboard shortcuts
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            aria-label="Close keyboard shortcuts"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body shortcuts-body">
          <p className="shortcut-lead">
            Press <kbd>Ctrl</kbd>
            <span className="shortcut-plus">+</span>
            <kbd>A</kbd> to start the leader, then press one key.
          </p>

          <ShortcutList groups={shortcutGroups({ cloud: cloudEnabled })} />

          <p className="panel-hint">
            The leader is available when focus is outside a text field, so Ctrl+A still selects
            text while typing. On macOS, Cmd+A works too.
          </p>
          {readOnly && (
            <p className="panel-hint">
              This workspace is read-only. Sign in to use the editing shortcuts.
            </p>
          )}
        </div>

        <div className="modal-foot">
          <button type="button" className="toolbar-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

interface ShortcutLeaderProps {
  isOpen: boolean
  cloudEnabled?: boolean
  readOnly?: boolean
  onClose: () => void
}

/** Compact cheat sheet shown while the leader key is waiting for the next key. */
export function ShortcutLeader({
  isOpen,
  cloudEnabled = false,
  readOnly = false,
  onClose,
}: ShortcutLeaderProps) {
  if (!isOpen) return null

  return (
    <div
      className="shortcut-leader"
      role="dialog"
      aria-modal="false"
      aria-label="Keyboard shortcut leader"
    >
      <div className="shortcut-leader-head">
        <p className="shortcut-leader-title">Leader active — press a key</p>
        <button type="button" className="text-button" onClick={onClose}>
          Esc
        </button>
      </div>

      <ShortcutList groups={shortcutGroups({ cloud: cloudEnabled })} />

      <p className="shortcut-leader-hint">
        {readOnly ? 'Read-only: sign in to edit. ' : ''}
        Press <kbd>?</kbd> for the full list or <kbd>Esc</kbd> to cancel.
      </p>
    </div>
  )
}
