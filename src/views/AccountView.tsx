import { useState, type FormEvent } from 'react'
import {
  confirmSignUp,
  resendCode,
  resetPassword,
  retrySync,
  sendPasswordReset,
  signIn,
  signOut,
  signUp,
} from '../account/account'
import { useAccount } from '../account/useAccount'

type Step = 'sign-in' | 'sign-up' | 'confirm' | 'forgot' | 'reset'

const MIN_PASSWORD = 8

const SYNC_TEXT = {
  idle: 'Not synced yet.',
  syncing: 'Syncing…',
  synced: 'Progress is saved to your account.',
  offline: 'Offline. Changes are saved here and sync when you are back online.',
  error: 'Sync failed.',
}

// Signing up with an email address and password, confirmed by a code sent
// to that address; signing in; resetting a forgotten password; and, once
// signed in, the sync status.
export function AccountView({ onDone }: { onDone: () => void }) {
  const account = useAccount()
  const [step, setStep] = useState<Step>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const go = (next: Step, message: string | null = null) => {
    setStep(next)
    setError(null)
    setInfo(message)
    setCode('')
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(explain(e))
    } finally {
      setBusy(false)
    }
  }

  const submit = (action: () => Promise<void>) => (e: FormEvent) => {
    e.preventDefault()
    run(action)
  }

  if (account.status === 'loading')
    return <p className="note">Loading account…</p>

  if (account.status === 'signed-in')
    return (
      <section className="account">
        <h2>Your account</h2>
        <p>
          Signed in as <strong>{account.email}</strong>.
        </p>
        <p className="note" role="status">
          {SYNC_TEXT[account.sync]}
          {account.sync === 'synced' && account.syncedAt
            ? ` Last synced at ${new Date(account.syncedAt).toLocaleTimeString()}.`
            : ''}
        </p>
        <div className="controls">
          <button type="button" className="primary" onClick={onDone}>
            Continue
          </button>
          {(account.sync === 'error' || account.sync === 'offline') && (
            <button type="button" onClick={() => run(retrySync)}>
              Sync now
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => run(signOut)}>
            Sign out
          </button>
        </div>
        <p className="note">
          Signing out removes your progress from this device. It stays in your
          account for when you sign in again.
        </p>
        {error && <p className="wrong">{error}</p>}
      </section>
    )

  const emailField = (
    <label>
      Email
      <input
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value.trim())}
      />
    </label>
  )

  const codeField = (
    <label>
      Confirmation code
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6,10}"
        required
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
      />
    </label>
  )

  const newPassword = (
    <>
      <label>
        Password
        <input
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label>
        Repeat password
        <input
          type="password"
          autoComplete="new-password"
          required
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
        />
      </label>
      <p className="note">At least {MIN_PASSWORD} characters.</p>
    </>
  )

  const samePassword = () => {
    if (password !== repeat) throw new Error('The passwords do not match.')
  }

  return (
    <section className="account">
      {step === 'sign-in' && (
        <form onSubmit={submit(() => signInOrConfirm())}>
          <h2>Sign in</h2>
          <p className="note">
            Sign in to save your progress and use it on any device.
          </p>
          {emailField}
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="primary" disabled={busy}>
            Sign in
          </button>
          <p>
            <button type="button" className="link" onClick={() => go('forgot')}>
              Forgot password?
            </button>
          </p>
          <p>
            New here?{' '}
            <button
              type="button"
              className="link"
              onClick={() => go('sign-up')}
            >
              Create an account
            </button>
          </p>
        </form>
      )}

      {step === 'sign-up' && (
        <form
          onSubmit={submit(async () => {
            samePassword()
            await signUp(email, password)
            go('confirm', `We sent a confirmation code to ${email}.`)
          })}
        >
          <h2>Create an account</h2>
          <p className="note">
            Progress you have made in this browser is added to your new account.
          </p>
          {emailField}
          {newPassword}
          <button type="submit" className="primary" disabled={busy}>
            Create account
          </button>
          <p>
            Already have an account?{' '}
            <button
              type="button"
              className="link"
              onClick={() => go('sign-in')}
            >
              Sign in
            </button>
          </p>
        </form>
      )}

      {step === 'confirm' && (
        <form
          onSubmit={submit(async () => {
            await confirmSignUp(email, code)
            onDone()
          })}
        >
          <h2>Confirm your email</h2>
          <p className="note">
            Enter the code from the email we sent to <strong>{email}</strong>.
            It can take a minute to arrive; check your spam folder too.
          </p>
          {codeField}
          <button type="submit" className="primary" disabled={busy}>
            Confirm
          </button>
          <p>
            <button
              type="button"
              className="link"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await resendCode(email)
                  setInfo(`We sent a new code to ${email}.`)
                })
              }
            >
              Send a new code
            </button>
          </p>
        </form>
      )}

      {step === 'forgot' && (
        <form
          onSubmit={submit(async () => {
            await sendPasswordReset(email)
            go('reset', `If ${email} has an account, we sent it a code.`)
          })}
        >
          <h2>Reset your password</h2>
          <p className="note">
            We will email you a code to set a new password.
          </p>
          {emailField}
          <button type="submit" className="primary" disabled={busy}>
            Send code
          </button>
          <p>
            <button
              type="button"
              className="link"
              onClick={() => go('sign-in')}
            >
              Back to sign in
            </button>
          </p>
        </form>
      )}

      {step === 'reset' && (
        <form
          onSubmit={submit(async () => {
            samePassword()
            await resetPassword(email, code, password)
            onDone()
          })}
        >
          <h2>Choose a new password</h2>
          {codeField}
          {newPassword}
          <button type="submit" className="primary" disabled={busy}>
            Set password and sign in
          </button>
        </form>
      )}

      {info && (
        <p className="note" role="status">
          {info}
        </p>
      )}
      {error && (
        <p className="wrong" role="alert">
          {error}
        </p>
      )}
    </section>
  )

  async function signInOrConfirm() {
    try {
      await signIn(email, password)
      onDone()
    } catch (e) {
      // An account that was never confirmed: send a fresh code.
      if (!/not confirmed/i.test(String((e as Error).message))) throw e
      await resendCode(email)
      go('confirm', `Your email is not confirmed yet. We sent a new code.`)
    }
  }
}

function explain(e: unknown): string {
  const message = String((e as Error)?.message ?? e)
  if (/invalid login credentials/i.test(message))
    return 'Wrong email or password.'
  if (/expired or is invalid/i.test(message))
    return 'That code is wrong or has expired. Send a new one and try again.'
  if (/already registered/i.test(message))
    return 'There is already an account with this email. Sign in instead.'
  if (/failed to fetch|network/i.test(message))
    return 'Could not reach the server. Check your connection and try again.'
  return message
}
