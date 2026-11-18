import type { PickedFile, PlatformApi, SaveResult } from './types'

function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.style.display = 'none'
    document.body.appendChild(input)

    let settled = false
    const finish = (file: File | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('focus', handleFocus)
      input.remove()
      resolve(file)
    }
    // The change event never fires when the picker is dismissed; regaining window
    // focus without a file is the only reliable cancel signal.
    const handleFocus = () => setTimeout(() => finish(input.files?.[0] ?? null), 300)

    window.addEventListener('focus', handleFocus)
    input.addEventListener('change', () => finish(input.files?.[0] ?? null))
    input.click()
  })
}

export const browserPlatform: PlatformApi = {
  async openExternal(url) {
    window.open(url, '_blank', 'noopener,noreferrer')
  },

  async saveTextFile(filename, contents): Promise<SaveResult> {
    const blob = new Blob([contents], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return {}
  },

  async openTextFile(): Promise<PickedFile | null> {
    const file = await pickFile('application/json,.json')
    if (!file) return null
    return { name: file.name, text: await file.text() }
  },

  async confirmAction(message) {
    return window.confirm(message)
  },

  async onBeforeQuit() {
    return () => {}
  },
}
