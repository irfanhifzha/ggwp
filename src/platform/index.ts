import type { PickedFile, PlatformApi, SaveResult } from './types'

const isDesktopApp = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** True when running inside the Tauri shell rather than a browser tab. */
export const isDesktop = isDesktopApp

let platformPromise: Promise<PlatformApi> | null = null

/**
 * Resolves the platform implementation once, lazily. The desktop module is only
 * downloaded when actually running in the shell, so the web bundle stays free of
 * the Tauri client code.
 */
export function platform(): Promise<PlatformApi> {
  platformPromise ??= isDesktopApp
    ? import('./desktop').then((module) => module.desktopPlatform)
    : import('./browser').then((module) => module.browserPlatform)
  return platformPromise
}

export async function openExternal(url: string): Promise<void> {
  return (await platform()).openExternal(url)
}

export async function saveTextFile(filename: string, contents: string): Promise<SaveResult> {
  return (await platform()).saveTextFile(filename, contents)
}

export async function openTextFile(): Promise<PickedFile | null> {
  return (await platform()).openTextFile()
}

export async function confirmAction(message: string, title?: string): Promise<boolean> {
  return (await platform()).confirmAction(message, title)
}

export async function onBeforeQuit(handler: () => void): Promise<() => void> {
  return (await platform()).onBeforeQuit(handler)
}

export type { PickedFile, SaveResult }
