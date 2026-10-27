import type { SupabaseClient } from '@supabase/supabase-js'
import { liveQuery, type Subscription } from 'dexie'
import { db, exportProgress, importProgress } from '../progress/db'
import { mergeProgress, type CloudProgress } from './merge'

// Accounts and cloud sync, through Supabase. They are switched on by setting
// VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY at build time (see
// the README); without them the app keeps progress in this browser only.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const accountsEnabled = Boolean(SUPABASE_URL && KEY)

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export type AccountState = {
  status: 'off' | 'loading' | 'signed-out' | 'signed-in'
  email?: string
  sync: SyncStatus
  syncedAt?: number
}

let state: AccountState = {
  status: accountsEnabled ? 'loading' : 'off',
  sync: 'idle',
}
const listeners = new Set<() => void>()

function set(next: Partial<AccountState>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

export function getAccount(): AccountState {
  return state
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The Supabase client is only loaded when accounts are switched on.
let client: Promise<SupabaseClient> | null = null
function supabase(): Promise<SupabaseClient> {
  if (!accountsEnabled) throw new Error('Accounts are not set up.')
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL!, KEY!),
  )
  return client
}

// Restores a saved sign-in and starts syncing. Called once at startup.
export async function initAccount(): Promise<void> {
  if (!accountsEnabled) return
  const sb = await supabase()
  sb.auth.onAuthStateChange((event, session) => {
    // Supabase asks that no other calls are awaited inside this callback.
    setTimeout(() => {
      if (session?.user) {
        set({ status: 'signed-in', email: session.user.email })
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')
          startSync(session.user.id)
      } else {
        stopSync()
        set({ status: 'signed-out', email: undefined, sync: 'idle' })
      }
    })
  })
}

// ---- Sync ----
//
// When you sign in, or open the app signed in, the progress on this device
// and in your account are merged. After that every change on this device is
// saved to your account a moment later.

let syncing: { user: string; changes: Subscription } | null = null
let resetAt = 0
let pushTimer: ReturnType<typeof setTimeout> | undefined

async function startSync(user: string): Promise<void> {
  if (syncing?.user === user) return
  stopSync()
  const changes = liveQuery(exportProgress).subscribe({
    next: () => {
      if (syncing?.user !== user || state.sync === 'syncing') return
      clearTimeout(pushTimer)
      pushTimer = setTimeout(() => push(), 1500)
    },
  })
  syncing = { user, changes }
  await pull()
}

function stopSync() {
  clearTimeout(pushTimer)
  syncing?.changes.unsubscribe()
  syncing = null
}

function failed(e: unknown) {
  console.error(e)
  set({ sync: navigator.onLine ? 'error' : 'offline' })
}

async function pull(): Promise<void> {
  const user = syncing?.user
  if (!user) return
  set({ sync: 'syncing' })
  try {
    const sb = await supabase()
    const { data, error } = await sb
      .from('progress')
      .select('data')
      .eq('user_id', user)
      .maybeSingle()
    if (error) throw error
    const local = await exportProgress()
    const cloud = data?.data as CloudProgress | undefined
    const merged = cloud ? mergeProgress(local, cloud) : { ...local, resetAt }
    resetAt = merged.resetAt
    if (syncing?.user !== user) return
    await importProgress(merged)
    await upload(user, merged)
  } catch (e) {
    failed(e)
  }
}

async function push(): Promise<void> {
  const user = syncing?.user
  if (!user) return
  set({ sync: 'syncing' })
  try {
    await upload(user, { ...(await exportProgress()), resetAt })
  } catch (e) {
    failed(e)
  }
}

async function upload(user: string, data: CloudProgress): Promise<void> {
  const sb = await supabase()
  const { error } = await sb
    .from('progress')
    .upsert({ user_id: user, data, updated_at: new Date().toISOString() })
  if (error) throw error
  set({ sync: 'synced', syncedAt: Date.now() })
}

// Call after resetting progress, so other devices drop their old progress
// instead of bringing it back.
export function noteReset(now = Date.now()): void {
  resetAt = now
  if (syncing) push()
}

// Tries again after a failed sync.
export function retrySync(): Promise<void> {
  return pull()
}

// ---- Signing up and in ----
//
// Supabase sends the emails. Its "Confirm signup" and "Reset password"
// templates should show the code ({{ .Token }}); links work as well.

async function auth() {
  return (await supabase()).auth
}

function check<T extends { error: Error | null }>(result: T): T {
  if (result.error) throw result.error
  return result
}

export async function signUp(email: string, password: string): Promise<void> {
  check(
    await (
      await auth()
    ).signUp({
      email,
      password,
      options: { emailRedirectTo: location.origin + location.pathname },
    }),
  )
}

// Confirms a new account with the code from the email, and signs in.
export async function confirmSignUp(
  email: string,
  code: string,
): Promise<void> {
  check(await (await auth()).verifyOtp({ email, token: code, type: 'email' }))
}

export async function resendCode(email: string): Promise<void> {
  check(await (await auth()).resend({ type: 'signup', email }))
}

export async function signIn(email: string, password: string): Promise<void> {
  check(await (await auth()).signInWithPassword({ email, password }))
}

export async function sendPasswordReset(email: string): Promise<void> {
  check(
    await (
      await auth()
    ).resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname,
    }),
  )
}

// Signs in with the code from a password reset email and sets a new password.
export async function resetPassword(
  email: string,
  code: string,
  password: string,
): Promise<void> {
  const a = await auth()
  check(await a.verifyOtp({ email, token: code, type: 'recovery' }))
  check(await a.updateUser({ password }))
}

// Saves any last changes, signs out, and clears this device: your progress
// stays in your account for when you sign in again.
export async function signOut(): Promise<void> {
  clearTimeout(pushTimer)
  if (syncing) await push()
  stopSync()
  await (await auth()).signOut({ scope: 'local' })
  await db.transaction(
    'rw',
    [db.cards, db.activity, db.repertoire, db.lessons],
    async () => {
      await db.cards.clear()
      await db.activity.clear()
      await db.repertoire.clear()
      await db.lessons.clear()
    },
  )
}
