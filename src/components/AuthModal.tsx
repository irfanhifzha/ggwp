import { useEffect, useState } from 'react'
import { cloudErrorMessage, signInWithEmail } from '../cloud'

interface AuthModalProps {
  onClose: () => void
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const submit = async () => {
    setBusy(true)
    setError('')

    try {
      await signInWithEmail(email.trim(), password)
      onClose()
    } catch (caught) {
      setError(cloudErrorMessage(caught) || 'Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="modal-head">
          <h2 id="auth-title" className="modal-title">
            Sign in to save
          </h2>
          <button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <form
            className="auth-form"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <p className="panel-hint">
              This workspace is shared and readable by anyone. Sign in to save changes to the
              cloud.
            </p>

            <label className="auth-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              className="field"
              type="email"
              value={email}
              required
              autoComplete="email"
              autoFocus
              onChange={(event) => setEmail(event.target.value)}
            />

            <label className="auth-label" htmlFor="auth-password">
              Password
            </label>
            <input
              id="auth-password"
              className="field"
              type="password"
              value={password}
              required
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="toolbar-button auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
