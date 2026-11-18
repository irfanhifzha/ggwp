/** The handful of browser capabilities a desktop webview does not provide. */

export interface SaveResult {
  /** Absolute path chosen in the desktop save dialog, when there is one. */
  path?: string
  /** True when the user dismissed the save dialog. */
  canceled?: boolean
}

export interface PickedFile {
  name: string
  text: string
}

export interface PlatformApi {
  /** Open an http(s) URL in the user's browser, never inside the app window. */
  openExternal(url: string): Promise<void>
  /** Save text to a file: real dialog + disk on desktop, blob download on the web. */
  saveTextFile(filename: string, contents: string): Promise<SaveResult>
  /** Ask the user for a JSON file and return its text, or null if they cancel. */
  openTextFile(): Promise<PickedFile | null>
  /** Blocking yes/no confirmation. */
  confirmAction(message: string, title?: string): Promise<boolean>
  /**
   * Run `handler` before the app window closes (last-moment save) and resolve with an
   * unsubscribe function. No-op in the browser.
   */
  onBeforeQuit(handler: () => void): Promise<() => void>
}
