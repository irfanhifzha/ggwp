import { useState } from 'react'
import { createId } from '../storage'
import type { Bookmark, BookmarksPanel, PanelPatch } from '../types'
import { normalizeHttpUrl } from '../url'

interface BookmarkPanelProps {
  panel: BookmarksPanel
  onPatch: (id: string, patch: PanelPatch) => void
}

interface Draft {
  title: string
  url: string
  note: string
}

const EMPTY_DRAFT: Draft = { title: '', url: '', note: '' }

export function BookmarkPanel({ panel, onPatch }: BookmarkPanelProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editDraft, setEditDraft] = useState<Draft>(EMPTY_DRAFT)
  const [editError, setEditError] = useState('')

  const saveBookmarks = (bookmarks: Bookmark[]) => onPatch(panel.id, { bookmarks })

  const addBookmark = () => {
    const url = normalizeHttpUrl(draft.url)
    if (!url) {
      setError('Enter a valid link.')
      return
    }

    saveBookmarks([
      ...panel.bookmarks,
      { id: createId(), title: draft.title.trim(), url, note: draft.note.trim() },
    ])
    setDraft(EMPTY_DRAFT)
    setError('')
  }

  const startEdit = (bookmark: Bookmark) => {
    setEditingId(bookmark.id)
    setEditDraft({ title: bookmark.title, url: bookmark.url, note: bookmark.note })
    setEditError('')
  }

  const saveEdit = (id: string) => {
    const url = normalizeHttpUrl(editDraft.url)
    if (!url) {
      setEditError('Enter a valid link.')
      return
    }

    saveBookmarks(
      panel.bookmarks.map((bookmark) =>
        bookmark.id === id
          ? { ...bookmark, title: editDraft.title.trim(), url, note: editDraft.note.trim() }
          : bookmark,
      ),
    )
    setEditingId('')
  }

  return (
    <div className="bookmarks-body">
      <form
        className="bookmark-form"
        onSubmit={(event) => {
          event.preventDefault()
          addBookmark()
        }}
      >
        <input
          className="field"
          value={draft.title}
          aria-label="Bookmark title"
          placeholder="Title (optional)"
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
        <div className="bookmark-form-row">
          <input
            className="field"
            value={draft.url}
            aria-label="Bookmark URL"
            placeholder="https://example.com"
            inputMode="url"
            spellCheck={false}
            onChange={(event) => setDraft({ ...draft, url: event.target.value })}
          />
          <button type="submit" className="toolbar-button">
            Add
          </button>
        </div>
        <input
          className="field"
          value={draft.note}
          aria-label="Bookmark note"
          placeholder="Note (optional)"
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
        />
        {error && <p className="form-error">{error}</p>}
      </form>

      {panel.bookmarks.length === 0 ? (
        <p className="panel-empty">No links saved yet.</p>
      ) : (
        <ul className="bookmark-list">
          {panel.bookmarks.map((bookmark) =>
            editingId === bookmark.id ? (
              <li key={bookmark.id} className="bookmark-item">
                <form
                  className="bookmark-form"
                  onSubmit={(event) => {
                    event.preventDefault()
                    saveEdit(bookmark.id)
                  }}
                >
                  <input
                    className="field"
                    value={editDraft.title}
                    aria-label="Bookmark title"
                    placeholder="Title (optional)"
                    onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
                  />
                  <input
                    className="field"
                    value={editDraft.url}
                    aria-label="Bookmark URL"
                    inputMode="url"
                    spellCheck={false}
                    onChange={(event) => setEditDraft({ ...editDraft, url: event.target.value })}
                  />
                  <input
                    className="field"
                    value={editDraft.note}
                    aria-label="Bookmark note"
                    placeholder="Note (optional)"
                    onChange={(event) => setEditDraft({ ...editDraft, note: event.target.value })}
                  />
                  {editError && <p className="form-error">{editError}</p>}
                  <div className="bookmark-form-actions">
                    <button type="submit" className="toolbar-button">
                      Save
                    </button>
                    <button
                      type="button"
                      className="toolbar-button"
                      onClick={() => setEditingId('')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li key={bookmark.id} className="bookmark-item">
                <a
                  className="bookmark-link"
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {bookmark.title || bookmark.url}
                </a>
                {bookmark.note && <p className="bookmark-note">{bookmark.note}</p>}
                <div className="bookmark-item-actions">
                  <button
                    type="button"
                    className="icon-button"
                    title="Edit bookmark"
                    aria-label={`Edit ${bookmark.title || bookmark.url}`}
                    onClick={() => startEdit(bookmark)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    title="Delete bookmark"
                    aria-label={`Delete ${bookmark.title || bookmark.url}`}
                    onClick={() =>
                      saveBookmarks(panel.bookmarks.filter((item) => item.id !== bookmark.id))
                    }
                  >
                    ✕
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  )
}
