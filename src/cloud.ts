import type { User } from 'firebase/auth'
import { initializeFirebase } from './firebase'
import { SCHEMA_VERSION, parseWorkspace } from './storage'
import type { WorkspaceData } from './types'

/** One shared document: everyone can read it, only signed-in users can write. */
const WORKSPACE_COLLECTION = 'workspaces'
const WORKSPACE_ID = 'main'

export async function loadCloudWorkspace(): Promise<WorkspaceData | null> {
  const services = await initializeFirebase()
  if (!services) return null

  const { doc, getDoc } = await import('firebase/firestore')
  const snapshot = await getDoc(doc(services.db, WORKSPACE_COLLECTION, WORKSPACE_ID))
  if (!snapshot.exists()) return null

  return parseWorkspace(snapshot.data())
}

export async function saveCloudWorkspace(workspace: WorkspaceData): Promise<void> {
  const services = await initializeFirebase()
  if (!services) throw new Error('Cloud storage is not configured.')

  const { doc, serverTimestamp, setDoc } = await import('firebase/firestore')
  await setDoc(doc(services.db, WORKSPACE_COLLECTION, WORKSPACE_ID), {
    version: SCHEMA_VERSION,
    columns: workspace.columns,
    panels: workspace.panels,
    updatedAt: serverTimestamp(),
    updatedBy: services.auth.currentUser?.uid ?? null,
  })
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
      return 'Cloud request failed. Your changes are saved locally.'
  }
}
