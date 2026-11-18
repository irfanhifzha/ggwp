export type PanelType = 'text' | 'pdf' | 'bookmarks'

export interface Bookmark {
  id: string
  title: string
  url: string
  note: string
}

interface PanelCommon {
  id: string
  title: string
  /** How many grid columns the panel occupies. */
  colSpan: number
  /** How many grid rows the panel occupies. */
  rowSpan: number
}

export interface TextPanel extends PanelCommon {
  type: 'text'
  text: string
}

export interface PdfPanel extends PanelCommon {
  type: 'pdf'
  url: string
}

export interface BookmarksPanel extends PanelCommon {
  type: 'bookmarks'
  bookmarks: Bookmark[]
}

export type Panel = TextPanel | PdfPanel | BookmarksPanel

export type PanelPatch = Partial<Panel>

export interface WorkspaceData {
  version: 1
  columns: number
  panels: Panel[]
}
