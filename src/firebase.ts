import type { FirebaseApp } from 'firebase/app'
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  db: Firestore
}

let servicesPromise: Promise<FirebaseServices | null> | null = null

/**
 * Loads the public Firebase web config and the SDK lazily. Returns null when no
 * config is available, so the workspace keeps working purely from localStorage.
 */
export function initializeFirebase(): Promise<FirebaseServices | null> {
  servicesPromise ??= (async () => {
    try {
      const response = await fetch('./firebase-config.json', { cache: 'no-store' })
      if (!response.ok) return null

      const config: unknown = await response.json()
      if (!config || typeof config !== 'object') return null

      const { apiKey, projectId } = config as Record<string, unknown>
      if (typeof apiKey !== 'string' || typeof projectId !== 'string') return null

      const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ])

      const app = initializeApp(config as Record<string, string>)
      return { app, auth: getAuth(app), db: getFirestore(app) }
    } catch {
      return null
    }
  })()

  return servicesPromise
}
