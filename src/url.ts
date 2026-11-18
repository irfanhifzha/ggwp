/** Returns a normalized http(s) URL, or null when the input cannot be one. */
export function normalizeHttpUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}
