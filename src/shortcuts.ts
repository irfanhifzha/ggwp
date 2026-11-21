/**
 * Keyboard-first command map.
 *
 * Everything starts with the leader key (Ctrl+A / Cmd+A outside a text field),
 * followed by one key. Keeping the list in one place means the help dialog,
 * the leader overlay and the actual handler cannot drift apart.
 */

export interface ShortcutItem {
  /** Keys shown after the leader. Multi-key hints are rendered as separate chips. */
  keys: string[]
  label: string
}

export interface ShortcutGroup {
  title: string
  items: ShortcutItem[]
}

const BASE_GROUPS: ShortcutGroup[] = [
  {
    title: 'Add panel',
    items: [
      { keys: ['T'], label: '+ Text' },
      { keys: ['P'], label: '+ PDF' },
      { keys: ['B'], label: '+ Bookmarks' },
      { keys: ['D'], label: '+ Todo' },
    ],
  },
  {
    title: 'Select panel',
    items: [
      { keys: ['J'], label: 'Next panel' },
      { keys: ['K'], label: 'Previous panel' },
      { keys: ['Enter'], label: 'Focus selected panel' },
      { keys: ['R'], label: 'Rename selected panel' },
    ],
  },
  {
    title: 'Arrange layout',
    items: [
      { keys: ['H'], label: 'Move panel back' },
      { keys: ['L'], label: 'Move panel forward' },
      { keys: ['-'], label: 'Make narrower' },
      { keys: ['+'], label: 'Make wider' },
      { keys: ['['], label: 'Make shorter' },
      { keys: [']'], label: 'Make taller' },
      { keys: ['X'], label: 'Close selected panel' },
    ],
  },
  {
    title: 'Columns',
    items: [
      { keys: [','], label: 'Fewer columns' },
      { keys: ['.'], label: 'More columns' },
      { keys: ['1', '…', '6'], label: 'Set exact columns' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { keys: ['E'], label: 'Export workspace' },
      { keys: ['I'], label: 'Import workspace' },
      { keys: ['C'], label: 'Clear all (confirm)' },
    ],
  },
  {
    title: 'Help',
    items: [
      { keys: ['?'], label: 'All shortcuts' },
      { keys: ['Esc'], label: 'Close leader' },
    ],
  },
]

const CLOUD_GROUP: ShortcutGroup = {
  title: 'Cloud',
  items: [{ keys: ['S'], label: 'Sign in / sign out' }],
}

/** Returns the groups shown in the UI. Cloud commands only appear when cloud is enabled. */
export function shortcutGroups(options: { cloud?: boolean } = {}): ShortcutGroup[] {
  if (!options.cloud) return BASE_GROUPS

  const groups = [...BASE_GROUPS]
  groups.splice(groups.length - 1, 0, CLOUD_GROUP)
  return groups
}
