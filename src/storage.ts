import type { Bookmark, Panel, PanelType, WorkspaceData } from './types'

export const STORAGE_KEY = 'greatgridworkspace:workspace'
export const SCHEMA_VERSION = 1

export const MIN_COLUMNS = 1
export const MAX_COLUMNS = 6
export const MAX_ROW_SPAN = 4
export const MAX_PANELS = 60

export function createId(): string {
  return crypto.randomUUID()
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
    version: SCHEMA_VERSION,
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

function readBookmarks(value: unknown): Bookmark[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).map((item) => ({
    id: readString(item.id) || createId(),
    title: readString(item.title),
    url: readString(item.url),
    note: readString(item.note),
  }))
}

function readPanel(value: unknown, columns: number): Panel | null {
  if (!isRecord(value)) return null

  const type = value.type
  if (type !== 'text' && type !== 'pdf' && type !== 'bookmarks') return null

  const base = {
    id: readString(value.id) || createId(),
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
  }
}

/**
 * Accepts untrusted data (localStorage or an imported file) and returns a valid
 * workspace, or null when the shape is not a workspace at all.
 */
export function parseWorkspace(value: unknown): WorkspaceData | null {
  if (!isRecord(value)) return null
  if (!Array.isArray(value.panels)) return null

  const columns = clampColumns(Number(value.columns))
  const panels = value.panels
    .slice(0, MAX_PANELS)
    .map((panel) => readPanel(panel, columns))
    .filter((panel): panel is Panel => panel !== null)

  return { version: SCHEMA_VERSION, columns, panels }
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

/** Builds the portable, versioned JSON payload used for export. */
export function serializeWorkspace(workspace: WorkspaceData): string {
  return JSON.stringify(
    {
      app: 'greatgridworkspace',
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      columns: workspace.columns,
      panels: workspace.panels,
    },
    null,
    2,
  )
}

export function downloadWorkspace(workspace: WorkspaceData): void {
  const blob = new Blob([serializeWorkspace(workspace)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `greatgridworkspace-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
