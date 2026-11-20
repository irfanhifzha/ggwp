import type { Bookmark, Panel, PanelType, Todo, WorkspaceData } from './types'

export const STORAGE_KEY = 'greatgridworkspace:workspace'
export const SCHEMA_VERSION = 1

export const MIN_COLUMNS = 1
export const MAX_COLUMNS = 6
export const MAX_ROW_SPAN = 4
export const MAX_PANELS = 60

export function createId(): string {
  return Math.random().toString(36).slice(2, 8)
}

export function clampColumns(value: number): number {
  if (!Number.isFinite(value)) return MIN_COLUMNS
  return Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, Math.round(value)))
}

export function clampSpan(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(max, Math.max(1, Math.round(value)))
}

const TITLES: Record<PanelType, string> = {
  text: 'Notes',
  pdf: 'PDF',
  bookmarks: 'Bookmarks',
  todo: 'Todo list',
}

const emptyBookmarks = (): Bookmark[] => []

export function createPanel(type: PanelType): Panel {
  const common = { id: createId(), colSpan: 1, rowSpan: 1, title: TITLES[type] }

  switch (type) {
    case 'text':
      return { ...common, type, text: '' }
    case 'pdf':
      return { ...common, type, url: '' }
    case 'bookmarks':
      return { ...common, type, bookmarks: emptyBookmarks() }
    case 'todo':
      return { ...common, type, todos: [] }
  }
}

export function createTextPanel(text: string, colSpan = 1): Panel {
  return {
    id: createId(),
    type: 'text',
    title: TITLES.text,
    text,
    colSpan,
    rowSpan: 1,
  }
}

export function defaultWorkspace(): WorkspaceData {
  return {
    columns: 2,
    panels: [
      createTextPanel('', 1),
      { ...createPanel('bookmarks'), colSpan: 1 },
    ],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function readId(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (typeof value === 'number') return String(value)
  return createId()
}

function readBookmarks(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((item) => ({
    id: readId(item.id),
    title: readString(item.title),
    url: readString(item.url),
    note: readString(item.note),
  }))
}

function readTodos(value: unknown): Todo[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((item) => ({
    id: readId(item.id),
    title: readString(item.title),
    description: readString(item.description),
    done: item.done === true,
  }))
}

function readPanel(value: unknown, columns: number): Panel | null {
  if (!isRecord(value)) return null

  const type = value.type
  if (type !== 'text' && type !== 'pdf' && type !== 'bookmarks' && type !== 'todo') return null

  const base = {
    id: readId(value.id),
    title: readString(value.title, TITLES[type]).slice(0, 200),
    colSpan: clampSpan(Number(value.colSpan), columns),
    rowSpan: clampSpan(Number(value.rowSpan), MAX_ROW_SPAN),
  }

  switch (type) {
    case 'text':
      return { ...base, type, text: readString(value.text) }
    case 'pdf':
      return { ...base, type, url: isHttpUrl(readString(value.url)) ? readString(value.url) : '' }
    case 'bookmarks':
      return { ...base, type, bookmarks: readBookmarks(value.bookmarks) }
    case 'todo':
      return { ...base, type, todos: readTodos(value.todos) }
  }
}

/**
 * Accepts untrusted data (localStorage or an imported file) and returns a valid
 * workspace, or null when the shape is not a workspace at all.
 */
export function parseWorkspace(value: unknown): WorkspaceData | null {
  if (Array.isArray(value)) {
    value = { columns: 2, panels: value }
  }
  if (!isRecord(value)) return null
  if (!Array.isArray(value.panels)) return null
  // Refuse files from a newer schema rather than silently dropping their data.
  if (typeof value.version === 'number' && value.version > SCHEMA_VERSION) return null

  const columns = clampColumns(Number(value.columns ?? 2))
  const panels = value.panels
    .slice(0, MAX_PANELS)
    .map((panel) => readPanel(panel, columns))
    .filter((panel): panel is Panel => panel !== null)

  return { columns, panels }
}

/**
 * Parses raw JSON string (supporting optional markdown code blocks or raw panel arrays)
 * into a valid workspace or returns an error message.
 */
export function parseWorkspaceText(text: string): { data: WorkspaceData | null; error?: string } {
  const trimmed = text.trim()
  if (!trimmed) {
    return { data: null, error: 'Please enter JSON text.' }
  }

  let cleaned = trimmed
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }

  let json: unknown
  try {
    json = JSON.parse(cleaned)
  } catch {
    return { data: null, error: 'Could not read that text as JSON.' }
  }

  const workspace = parseWorkspace(json)
  if (!workspace) {
    return { data: null, error: 'That data is not a valid workspace export.' }
  }

  return { data: workspace }
}

export function loadWorkspace(): WorkspaceData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultWorkspace()
    return parseWorkspace(JSON.parse(raw)) ?? defaultWorkspace()
  } catch {
    return defaultWorkspace()
  }
}

export function saveWorkspace(workspace: WorkspaceData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    return true
  } catch {
    return false
  }
}

export function clearWorkspace(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode); nothing else to clean up.
  }
}

/** Builds the clean, portable JSON payload used for export. */
export function serializeWorkspace(workspace: WorkspaceData): string {
  return JSON.stringify(
    {
      columns: workspace.columns,
      panels: workspace.panels.map((panel, index) => {
        const id = String(index + 1)
        if (panel.type === 'bookmarks') {
          return {
            ...panel,
            id,
            bookmarks: panel.bookmarks.map((bm, bmIndex) => ({
              ...bm,
              id: String(bmIndex + 1),
            })),
          }
        }
        return { ...panel, id }
      }),
    },
    null,
    2,
  )
}

/** Portable default file name for an export, used by both web and desktop saves. */
export function exportFileName(): string {
  return `ggez-${new Date().toISOString().slice(0, 10)}.json`
}
