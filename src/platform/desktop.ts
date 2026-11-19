import { getCurrentWindow } from '@tauri-apps/api/window'
import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { openUrl } from '@tauri-apps/plugin-opener'
import type { PickedFile, PlatformApi, SaveResult } from './types'

const JSON_FILTER = [{ name: 'Workspace JSON', extensions: ['json'] }]

/** Only ever loaded through the dynamic import in ./index.ts. */
export const desktopPlatform: PlatformApi = {
  async openExternal(url) {
    await openUrl(url)
  },

  async saveTextFile(filename, contents): Promise<SaveResult> {
    const path = await save({ defaultPath: filename, filters: JSON_FILTER })
    if (!path) return { canceled: true }
    await writeTextFile(path, contents)
    return { path }
  },

  async openTextFile(): Promise<PickedFile | null> {
    const selected = await open({ multiple: false, directory: false, filters: JSON_FILTER })
    const path = Array.isArray(selected) ? selected[0] : selected
    if (!path) return null
    return {
      name: path.split(/[\\/]/).pop() ?? 'workspace.json',
      text: await readTextFile(path),
    }
  },

  async confirmAction(message, title = 'ggwp') {
    return confirm(message, { title, kind: 'warning' })
  },

  async onBeforeQuit(handler) {
    const appWindow = getCurrentWindow()
    return appWindow.onCloseRequested(async (event) => {
      // Give the debounced autosave a chance to flush before the webview goes away.
      event.preventDefault()
      try {
        handler()
      } finally {
        await appWindow.destroy()
      }
    })
  },
}
