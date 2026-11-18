# GreatGridWorkspace

A minimalist, local-first grid workspace for reading, writing and organizing information in one
place. Notes, PDFs and bookmarks live side by side in resizable panels, and everything is stored in
your browser — no account, no backend.

## Features

- **Flexible grid** — 1–6 columns; each panel spans one or more columns and rows.
- **Panel types**
  - **Text** — distraction-free plain-text note with automatic saving.
  - **PDF** — reads a PDF from a URL using the browser's built-in viewer.
  - **Bookmarks** — save links with an optional title and note; edit or delete them inline.
- **Layout control** — add, remove, resize, and reorder panels (drag the grip or use the arrows).
- **Autosave** — the workspace and all content are saved to `localStorage` shortly after each change.
- **Export / import** — download a versioned JSON snapshot and restore it later, with validation.
- **Clear all data** — wipes the saved workspace after confirmation.
- **Responsive** — the grid collapses to a single scrollable column on narrow screens.
- **Light / dark** — follows the operating system color scheme.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and build to dist/
npm run preview  # serve the production build
npm run lint     # oxlint
```

## Using the workspace

| Action | How |
| --- | --- |
| Add a panel | Use **+ Text**, **+ PDF**, **+ Bookmarks** in the header. |
| Rename a panel | Edit the title directly in its header. |
| Resize | **◄ ►** change column span, **▲ ▼** change row span. |
| Reorder | Drag the **⠿** grip, or use **← →**. |
| Change columns | **Columns − / +** in the header (spans are clamped to fit). |
| Read a PDF | Paste a URL and press **Load**, or Enter. |
| Save a bookmark | Fill in the URL (title and note optional) and press **Add**. |
| Remove a panel | **✕** in the panel header. |

On mobile the panels stack vertically and each one fills most of the viewport; the header stays
compact and touch targets are larger.

## Data and privacy

Everything stays in this browser. The workspace is stored under the `greatgridworkspace:workspace`
key in `localStorage` and written on a 400 ms debounce.

**Export** produces a JSON file named `ggwp-YYYY-MM-DD.json` like this:

```json
{
  "columns": 2,
  "panels": [
    {
      "id": "1",
      "type": "text",
      "title": "Notes",
      "text": "…",
      "colSpan": 1,
      "rowSpan": 1
    }
  ]
}
```

**Import** accepts any file matching that shape. Data is sanitized first: unknown panel types are
dropped, spans are clamped, non-http(s) URLs are ignored, and missing fields fall back to defaults.
An invalid file shows a notice instead of replacing the workspace. Import replaces the current
workspace — export first if you want to keep it.

**Clear all** removes the stored workspace and empties the grid; it cannot be undone.

## Project structure

```
src/
  App.tsx                 workspace state, autosave, import/export actions
  types.ts                workspace and panel data model
  storage.ts              localStorage, validation, JSON export
  url.ts                  http(s) URL normalization
  components/
    Workspace.tsx         CSS Grid shell, drag state, empty state
    PanelShell.tsx        shared panel header, spans, reorder, remove
    PanelContent.tsx      switches on panel type
    TextPanel.tsx         debounced plain-text editor
    PdfPanel.tsx          URL field + native PDF iframe
    BookmarkPanel.tsx     add / edit / delete bookmark list
  index.css               design tokens and base styles
  App.css                 layout, panels and content styles
```

The data model is a single `WorkspaceData` object (`columns` + ordered `panels`). Panels are rendered
in array order, so "reorder" simply means moving an entry. Panel content is edited locally inside
each panel component and committed upward on a short debounce, which keeps the grid from
re-rendering on every keystroke. Adding a panel type means adding a variant to the `Panel` union and
one case in `PanelContent`.

## Design decisions

These answer the open questions in `PLAN.md` with the simplest maintainable option:

1. **Grid** — plain CSS Grid with an ordered panel list and column/row spans. No layout library.
2. **Resizing** — predefined spans rather than free pixel positioning: predictable, keyboard
   accessible, and trivially serializable. "Merging" is a wider/taller span, not merged content.
3. **Mobile** — one shared layout, forced to a single column below 720 px. No separate config.
4. **Editor** — plain text in a textarea, debounced autosave, no toolbar.
5. **PDF** — the browser's native viewer in an iframe, so no PDF.js dependency or bundle weight.
6. **Storage** — `localStorage` with a schema version. Fine for notes and URLs; migrate to IndexedDB
   only if large attachments are ever supported (PDFs are referenced by URL, not stored).
7. **State** — React state in `App` passed as props. No store; the app is a single tree.
8. **Import/export** — versioned JSON, sanitized on import, no merge mode.
9. **Performance** — no dependencies beyond React, local edit state per panel, and lazy `loading`
   on iframes. The production bundle is ~76 kB gzipped.
10. **Structure** — workspace manager / panel shell / panel content / storage, as suggested.

## Known limitations

- The native PDF viewer can't display documents from sites that forbid embedding; the panel offers
  an "open in a new tab" fallback.
- Local PDF files are not supported — only URLs.
- `localStorage` is per-browser and per-device; use export/import to move a workspace.
- Drag reordering uses a mouse; on touch devices use the arrow buttons.
