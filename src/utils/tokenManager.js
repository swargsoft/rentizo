/**
 * tokenManager.js
 * ──────────────────────────────────────────────────────────────────────────
 * Google OAuth token lifecycle manager for pure frontend SPAs.
 *
 * WHY NOT PKCE CODE EXCHANGE:
 *   Google's /token endpoint requires client_secret even with PKCE for
 *   "Web application" OAuth client types. There is no way to exchange an
 *   auth code without exposing client_secret in frontend code — which
 *   defeats its purpose entirely.
 *
 * CORRECT SPA APPROACH — Google Identity Services (GIS) Token Model:
 *   - google.accounts.oauth2.initTokenClient() requests an access token
 *     directly via the browser without code exchange
 *   - Token arrives in the browser callback — no server needed
 *   - Silent refresh via prompt='' when session is active
 *   - Falls back to full consent screen when session expires
 *
 * REFRESH TOKEN REALITY:
 *   Google does NOT issue refresh tokens to pure SPAs.
 *   GIS handles re-auth by:
 *     1. prompt='' — silent if Google session cookie is alive (~2 weeks)
 *     2. prompt='consent' — full screen if session expired
 *   This is the officially supported SPA pattern per Google's docs.
 */

import db from '@/db/index.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const CLIENT_ID           = import.meta.env.VITE_GOOGLE_CLIENT_ID
const REVOKE_ENDPOINT     = 'https://oauth2.googleapis.com/revoke'
const USERINFO_URL        = 'https://www.googleapis.com/oauth2/v3/userinfo'

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.file',
].join(' ')

/** Redirect URI for OAuth callback */
const REDIRECT_URI = window.location.origin + window.location.pathname.replace(/\/$/, '') + '/'

/** State key for OAuth state parameter */
const STATE_KEY = 'google_oauth_state'

/** Refresh 5 minutes before expiry */
const REFRESH_AHEAD_MS = 5 * 60 * 1000

/** Dexie settings keys */
const DB_KEY_EXPIRY   = 'google_token_expiry'
const DB_KEY_PROFILE  = 'google_profile'
const DB_KEY_TOKEN    = 'google_access_token'

// ── In-memory state ───────────────────────────────────────────────────────────

let _accessToken  = null   // string | null
let _expiresAt    = null   // ms timestamp | null
let _profile      = null   // { id, email, name, picture } | null
let _refreshTimer = null   // setTimeout handle
let _refreshLock  = null   // Promise — race condition prevention
let _tokenClient  = null   // GIS TokenClient instance
let _onSessionExpired = null  // callback → called when silent refresh fails

// ── GIS Script Loader ─────────────────────────────────────────────────────────

/**
 * Load Google Identity Services script dynamically.
 * Returns when window.google.accounts is ready.
 */
function loadGISScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve()
      return
    }

    const existing = document.getElementById('gis-script')
    if (existing) {
      existing.addEventListener('load', resolve)
      existing.addEventListener('error', reject)
      return
    }

    const script    = document.createElement('script')
    script.id       = 'gis-script'
    script.src      = 'https://accounts.google.com/gsi/client'
    script.async    = true
    script.defer    = true
    script.onload   = resolve
    script.onerror  = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

// ── TokenClient factory ───────────────────────────────────────────────────────

/**
 * Get or create the GIS TokenClient.
 * Using popup mode - more reliable than redirect for SPAs.
 */
async function getTokenClient() {
  if (_tokenClient) return _tokenClient

  await loadGISScript()

  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope:     SCOPES,
      ux_mode:   'popup',
      callback:  (response) => {
        // Token response handled in requestToken
      },
      error_callback: (err) => {
        console.error('[TokenManager] GIS error:', err)
      },
    })

    _tokenClient = client
    resolve(client)
  })
}

// ── Core token request ────────────────────────────────────────────────────────

/**
 * Request a fresh access token via GIS.
 *
 * @param {'consent' | 'select_account' | ''} prompt
 *   ''              → silent (no UI) — works if Google session cookie alive
 *   'consent'       → full consent screen
 *   'select_account'→ account picker
 *
 * @param {string} hint — email hint for silent refresh
 * @returns {Promise<string>} access_token
 */
function requestToken(prompt = 'consent', hint = '') {
  // Race-condition prevention
  if (_refreshLock && prompt === '') {
    console.log('[TokenManager] Silent refresh in progress — waiting on lock')
    return _refreshLock
  }

  const p = new Promise(async (resolve, reject) => {
    const client = await getTokenClient().catch(reject)
    if (!client) return

    client.callback = (response) => {
      if (response.error) {
        reject(new Error(response.error))
        return
      }
      resolve(response.access_token)
    }

    client.requestAccessToken({
      prompt,
      ...(hint ? { login_hint: hint } : {}),
    })
  })

  if (prompt === '') {
    _refreshLock = p.finally(() => { _refreshLock = null })
    return _refreshLock
  }

  return p
}

// ── Internal token state management ──────────────────────────────────────────

function setToken(accessToken, expiresIn, profile) {
  const expiresAt = Date.now() + expiresIn * 1000

  _accessToken = accessToken
  _expiresAt   = expiresAt
  _profile     = profile

  scheduleProactiveRefresh(expiresAt)
  persistMeta(expiresAt, profile, accessToken).catch(() => {})

  console.log(`[TokenManager] Token set ✓ — expires in ${Math.round(expiresIn / 60)}min`)
}

function clearTokenState() {
  clearScheduledRefresh()
  _accessToken = null
  _expiresAt   = null
  _profile     = null
  _refreshLock = null
}

// ── Proactive refresh scheduling ──────────────────────────────────────────────

function scheduleProactiveRefresh(expiresAt) {
  clearScheduledRefresh()

  const msUntilRefresh = Math.max(0, (expiresAt - Date.now()) - REFRESH_AHEAD_MS)

  console.log(`[TokenManager] Proactive refresh in ${Math.round(msUntilRefresh / 1000)}s`)

  _refreshTimer = setTimeout(async () => {
    console.log('[TokenManager] Proactive refresh triggered')
    try {
      await silentRefresh()
    } catch (err) {
      console.warn('[TokenManager] Proactive refresh failed:', err.message)
      // Don't force logout here — let getAccessToken() handle it on next API call
    }
  }, msUntilRefresh)
}

function clearScheduledRefresh() {
  if (_refreshTimer) {
    clearTimeout(_refreshTimer)
    _refreshTimer = null
  }
}

// ── Persistence (token + metadata) ───────────────────────────────────────────

async function persistMeta(expiresAt, profile, accessToken) {
  await Promise.all([
    db.settings.put({ key: DB_KEY_EXPIRY,  value: expiresAt }),
    db.settings.put({ key: DB_KEY_PROFILE, value: JSON.stringify(profile) }),
    db.settings.put({ key: DB_KEY_TOKEN,   value: accessToken }),
  ]).catch(err => console.warn('[TokenManager] Persist failed:', err.message))
}

async function loadPersistedMeta() {
  try {
    const [expiryRow, profileRow, tokenRow] = await Promise.all([
      db.settings.get(DB_KEY_EXPIRY),
      db.settings.get(DB_KEY_PROFILE),
      db.settings.get(DB_KEY_TOKEN),
    ])
    return {
      expiresAt:   expiryRow?.value  ?? null,
      profile:     profileRow?.value ? JSON.parse(profileRow.value) : null,
      accessToken: tokenRow?.value    ?? null,
    }
  } catch {
    return { expiresAt: null, profile: null, accessToken: null }
  }
}

async function clearPersistedMeta() {
  await Promise.all([
    db.settings.delete(DB_KEY_EXPIRY),
    db.settings.delete(DB_KEY_PROFILE),
    db.settings.delete(DB_KEY_TOKEN),
  ]).catch(() => {})
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a callback for when the session fully expires
 * and silent refresh is no longer possible.
 * Use this to redirect to login page.
 */
export function onSessionExpired(callback) {
  _onSessionExpired = callback
}

/**
 * Generate a random state string for OAuth security
 */
function generateState() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Check if this is an OAuth redirect callback (token in URL hash)
 * Returns the access_token if found, null otherwise.
 */
export function checkOAuthCallback() {
  const hash = window.location.hash
  if (!hash || !hash.includes('access_token=')) {
    return null
  }

  // Parse the hash: #access_token=xxx&expires_in=3599&token_type=Bearer&scope=...
  const params = new URLSearchParams(hash.substring(1))
  const accessToken = params.get('access_token')

  if (!accessToken) return null

  // Clear the hash to clean up the URL (do it silently)
  window.history.replaceState(null, '', window.location.pathname)

  return accessToken
}

/**
 * Full login with popup flow - triggers a popup to Google.
 * Call this from user interaction handler.
 */
export async function login() {
  const state = generateState()
  sessionStorage.setItem(STATE_KEY, state)

  const client = await getTokenClient()

  return new Promise((resolve, reject) => {
    client.callback = async (response) => {
      if (response.error) {
        reject(new Error(response.error))
        return
      }

      try {
        // Token received via popup - fetch profile and set token
        const profile = await fetchProfile(response.access_token)
        setToken(response.access_token, 3599, profile)
        sessionStorage.removeItem(STATE_KEY)
        resolve({ accessToken: response.access_token, profile })
      } catch (err) {
        reject(err)
      }
    }

    // Request with popup - GIS will open a popup window
    client.requestAccessToken({
      prompt: 'select_account',
    })
  })
}

/**
 * Handle OAuth callback - call this on app load to process redirect.
 * Returns { accessToken, profile } if successful, null otherwise.
 */
export async function handleOAuthCallback() {
  const accessToken = checkOAuthCallback()
  if (!accessToken) return null

  console.log('[TokenManager] Processing OAuth callback...')

  try {
    const profile = await fetchProfile(accessToken)
    setToken(accessToken, 3599, profile)
    sessionStorage.removeItem(STATE_KEY)
    return { accessToken, profile }
  } catch (err) {
    console.error('[TokenManager] OAuth callback error:', err.message)
    return null
  }
}

/**
 * Silent refresh — attempts to get a new token without user interaction.
 * Works while Google session cookie is alive (~2 weeks).
 * Throws 'SESSION_EXPIRED' if session is gone.
 */
export async function silentRefresh() {
  const hint = _profile?.email ?? ''
  console.log('[TokenManager] Attempting silent refresh…')

  try {
    // prompt='' → GIS will use existing Google session cookie silently
    const accessToken = await requestToken('', hint)
    const profile     = _profile ?? await fetchProfile(accessToken)
    setToken(accessToken, 3599, profile)
    console.log('[TokenManager] Silent refresh succeeded ✓')
    return accessToken
  } catch (err) {
    // 'user_cancel', 'access_denied', 'immediate_failed' mean session gone
    console.warn('[TokenManager] Silent refresh failed:', err.message)
    clearTokenState()
    await clearPersistedMeta()
    _onSessionExpired?.()
    throw new Error('SESSION_EXPIRED')
  }
}

/**
 * Get a valid access token — main entry point for all API calls.
 * First tries silent refresh, then falls back to silent re-auth.
 * Throws 'SESSION_EXPIRED' if no session → redirect to login.
 */
export async function getAccessToken() {
  // Valid token in memory
  if (_accessToken && _expiresAt && Date.now() < _expiresAt - 60_000) {
    return _accessToken
  }

  // Token expired or missing — try silent refresh first
  if (_profile?.email) {
    try {
      console.log('[TokenManager] Token expired, attempting silent refresh...')
      return await silentRefresh()
    } catch (err) {
      if (err.message === 'SESSION_EXPIRED') {
        console.log('[TokenManager] Silent refresh failed, trying silent re-auth...')
        // Silent re-auth also needs user gesture, but we try anyway
        try {
          return await reauthSilently()
        } catch {
          // Both failed — session truly expired
        }
      }
    }
  }

  // No session or both refreshes failed
  throw new Error('SESSION_EXPIRED')
}

export function getCachedProfile() { return _profile }

export function isAuthenticated() {
  return !!(_accessToken && _expiresAt && Date.now() < _expiresAt)
}

/**
 * Restore session on app reload.
 *
 * Strategy:
 *   1. If token is still valid in memory → already restored (nothing to do)
 *   2. If persisted token exists + not yet expired → restore token + profile
 *   3. If token expired → return needsReauth=true, show "Welcome back" UI
 *      User clicks button → GIS popup opens
 */
export async function restoreSession() {
  // Already have a valid token in memory (e.g. navigation within same session)
  if (_accessToken && _expiresAt && Date.now() < _expiresAt - 60_000) {
    return { restored: true, profile: _profile, needsLogin: false, needsReauth: false }
  }

  const { expiresAt, profile, accessToken } = await loadPersistedMeta()

  if (!profile) {
    // First time user — no session ever created
    return { restored: false, profile: null, needsLogin: true, needsReauth: false }
  }

  const msRemaining = (expiresAt ?? 0) - Date.now()

  if (msRemaining > 60_000 && accessToken) {
    // Token still valid — restore full session (token + profile)
    _accessToken = accessToken
    _expiresAt   = expiresAt
    _profile     = profile
    console.log('[TokenManager] Token restored from storage — no popup needed!')
    return { restored: true, profile, needsLogin: false, needsReauth: false }
  }

  // Token expired — user must click to re-auth
  console.log('[TokenManager] Persisted session expired — user must re-authenticate')
  _profile = profile  // keep profile for "Welcome back" UI
  return { restored: false, profile, needsLogin: false, needsReauth: true }
}

/**
 * Silent re-auth triggered by a user gesture (button click).
 * Uses prompt='' which avoids showing the account picker if session is alive.
 * Returns null if silent fails (no popup).
 *
 * MUST be called from a user interaction handler.
 */
export async function reauthSilently() {
  const hint = _profile?.email ?? ''
  if (!hint) {
    console.log('[TokenManager] No email hint, cannot attempt silent re-auth')
    return null
  }

  try {
    const accessToken = await requestToken('', hint)
    const profile     = _profile ?? await fetchProfile(accessToken)
    setToken(accessToken, 3599, profile)
    return { accessToken, profile }
  } catch (err) {
    // Silent failed - return null so caller can decide what to do
    console.warn('[TokenManager] Silent reauth failed:', err.message)
    return null
  }
}

/**
 * Logout — revokes token, clears all state.
 */
export async function logout({ revokeToken = true } = {}) {
  const tokenToRevoke = _accessToken

  clearTokenState()
  await clearPersistedMeta()

  if (revokeToken && tokenToRevoke) {
    fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(tokenToRevoke)}`, {
      method: 'POST',
    }).catch(() => {})

    // Also revoke via GIS (cleaner)
    try {
      await loadGISScript()
      window.google?.accounts.oauth2.revoke(tokenToRevoke, () => {})
    } catch {}
  }

  console.log('[TokenManager] Logged out ✓')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchProfile(accessToken) {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
  const d = await res.json()
  return { id: d.sub, email: d.email, name: d.name, picture: d.picture }
}

/**
 * Authenticated fetch — injects fresh token + handles 401 with one retry.
 */
export async function authenticatedFetch(url, options = {}) {
  const token = await getAccessToken()

  const doFetch = (t) => fetch(url, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${t}` }
  })

  let res = await doFetch(token)

  if (res.status === 401) {
    console.warn('[TokenManager] 401 — retrying with fresh token')
    try {
      // Force refresh even if not expired
      _accessToken = null
      const newToken = await getAccessToken()
      res = await doFetch(newToken)
    } catch {
      throw new Error('AUTH_REQUIRED')
    }
  }

  return res
}

/**
 * Set fresh token on driveApi before any Drive operation.
 */
export async function refreshDriveToken() {
  const { default: driveApi } = await import('./driveApi.js')
  const token = await getAccessToken()
  driveApi.setToken(token)
  return token
}