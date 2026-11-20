import type { Panel, PanelPatch } from '../types'
import { BookmarkPanel } from './BookmarkPanel'
import { PdfPanel } from './PdfPanel'
import { TextPanel } from './TextPanel'
import { TodoPanel } from './TodoPanel'

interface PanelContentProps {
  panel: Panel
  onPatch: (id: string, patch: PanelPatch) => void
}

export function PanelContent({ panel, onPatch }: PanelContentProps) {
  switch (panel.type) {
    case 'text':
      return <TextPanel panel={panel} onPatch={onPatch} />
    case 'pdf':
      return <PdfPanel panel={panel} onPatch={onPatch} />
    case 'bookmarks':
      return <BookmarkPanel panel={panel} onPatch={onPatch} />
    case 'todo':
      return <TodoPanel panel={panel} onPatch={onPatch} />
  }
}
