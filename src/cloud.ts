import type { User } from 'firebase/auth'
import { initializeFirebase } from './firebase'
import { SCHEMA_VERSION, parseWorkspace } from './storage'
import type { WorkspaceData } from './types'

/**
 * Each document in this collection is a saved workspace. A save writes into the
 * chosen document (overwriting it) or creates a new one. Anyone can read them;
 * only signed-in users can write.
 */
const WORKSPACE_COLLECTION = 'workspaces'

export interface CloudVersion {
  id: string
  savedAt: string
  savedBy: string
  panelCount: number
}

export async function saveCloudVersion(
  workspace: WorkspaceData,
  id: string,
): Promise<CloudVersion> {
  const services = await initializeFirebase()
  if (!services) throw new Error('Cloud storage is not configured.')

  const name = id.trim()
  if (!name || name.includes('/') || name === '.' || name === '..') {
    throw new Error('Choose a name that is not empty and does not contain "/".')
  }

  const { doc, setDoc } = await import('firebase/firestore')
  const user = services.auth.currentUser
  const savedAt = new Date().toISOString()
  const savedBy = user?.email ?? user?.uid ?? 'unknown'

  await setDoc(doc(services.db, WORKSPACE_COLLECTION, name), {
    version: SCHEMA_VERSION,
    columns: workspace.columns,
    panels: workspace.panels,
    savedAt,
    savedBy,
  })

  return { id: name, savedAt, savedBy, panelCount: workspace.panels.length }
}

function readDate(value: unknown): string {
  if (typeof value === 'string') return value
  if (
    value !== null &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString()
    } catch {
      return ''
    }
  }
  return ''
}

export async function listCloudVersions(): Promise<CloudVersion[]> {
  const services = await initializeFirebase()
  if (!services) return []

  const { collection, getDocs } = await import('firebase/firestore')
  const snapshot = await getDocs(collection(services.db, WORKSPACE_COLLECTION))

  return snapshot.docs
    .map((entry) => {
      const data = entry.data()
      return {
        id: entry.id,
        // Older snapshots stored a server `updatedAt` timestamp instead.
        savedAt: readDate(data.savedAt) || readDate(data.updatedAt),
        savedBy: typeof data.savedBy === 'string' ? data.savedBy : '',
        panelCount: Array.isArray(data.panels) ? data.panels.length : 0,
      }
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function loadCloudVersion(id: string): Promise<WorkspaceData | null> {
  const services = await initializeFirebase()
  if (!services) return null

  const { doc, getDoc } = await import('firebase/firestore')
  const snapshot = await getDoc(doc(services.db, WORKSPACE_COLLECTION, id))
  if (!snapshot.exists()) return null

  return parseWorkspace(snapshot.data())
}

export async function watchCloudUser(
  callback: (user: User | null) => void,
): Promise<() => void> {
  const services = await initializeFirebase()
  if (!services) return () => {}

  const { onAuthStateChanged } = await import('firebase/auth')
  return onAuthStateChanged(services.auth, callback)
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const services = await initializeFirebase()
  if (!services) throw new Error('Cloud storage is not configured.')

  const { signInWithEmailAndPassword } = await import('firebase/auth')
  await signInWithEmailAndPassword(services.auth, email, password)
}

export async function signOutCloud(): Promise<void> {
  const services = await initializeFirebase()
  if (!services) return

  const { signOut } = await import('firebase/auth')
  await signOut(services.auth)
}

/** Turns Firebase errors into something a user can act on. */
export function cloudErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : ''

  switch (code) {
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/missing-password':
      return 'Enter your password.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/operation-not-allowed':
    case 'auth/unauthorized-domain':
      return 'Email/password sign-in is not enabled for this project. Enable it in Firebase Authentication.'
    case 'permission-denied':
      return 'Your account is not allowed to save to the cloud.'
    case 'unavailable':
      return 'The cloud is unreachable right now. Your changes are saved locally.'
    case 'failed-precondition':
    case 'not-found':
      return 'The cloud database is not ready. Create a Firestore database in the Firebase console.'
    default:
      if (!code && error instanceof Error && error.message) return error.message
      return 'Cloud request failed. Your changes are saved locally.'
  }
}
