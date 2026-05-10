import { create } from 'zustand'
import { getPublicKey } from 'nostr-tools'
import { nip19 } from 'nostr-tools'
import db from '@/db/index.js'
import { encryptPrivateKey, decryptPrivateKey } from '@/utils/keyEncryption.js'
import { generateKeypair } from '@/nostr/publish.js'
import { setRelays, DEFAULT_RELAYS, connectRelays } from '@/nostr/client.js'
import { getSetting } from '@/db/index.js'
import { fetchGoogleProfile, setGoogleToken, setGoogleProfile, clearGoogleSession } from '@/utils/googleAuth.js'
import driveApi from '@/utils/driveApi.js'

const useAuthStore = create((set, get) => ({
  pubkey:           null,
  secretKey:        null,
  role:             null,
  profileComplete:  false,
  loading:          false,
  error:            null,
  sessionUnlocked:  false,
  googleProfile:    null,  // { email, name, picture }

  // ── Google login (primary auth flow) ─────────────────────────────────────

  /**
   * Called after Google OAuth succeeds.
   * 1. Fetches Google profile
   * 2. Sets Drive token
   * 3. Tries to load existing Nostr key from appDataFolder
   * 4. If no key → generates new keypair → saves to Drive
   * 5. Sets up local session
   *
   * Returns true if new user (needs role selection), false if returning user.
   */
// loginWithGoogle now receives profile object (not access_token)
// tokenManager owns the token — authStore just handles Nostr + app state
  async loginWithGoogle(profile) {
    set({ loading: true, error: null })
    try {
      // Ensure Drive token is fresh before using Drive
      const { refreshDriveToken } = await import('@/utils/tokenManager.js')
      await refreshDriveToken()

      // Try loading existing Nostr key from Drive appDataFolder
      let secretKey = null
      let isNewUser = false

      try {
        secretKey = await driveApi.loadNostrKey()
      } catch (err) {
        console.warn('[Auth] Key load attempt:', err.message)
      }

      if (!secretKey) {
        isNewUser = true
        const kp  = generateKeypair()
        secretKey = kp.secretKey
        await driveApi.saveNostrKey(secretKey)
        console.log('[Auth] New user — keypair generated and saved to Drive')
      }

      const pubkey = getPublicKey(secretKey)

      const existingIdentity = await db.identities.get(pubkey)
      const role = existingIdentity?.role ?? null

      if (!existingIdentity) {
        await db.identities.put({
          pubkey,
          role:        null,
          authMethod:  'google',
          googleEmail: profile.email,
          createdAt:   Date.now(),
        })
      }

      const savedRelays = await getSetting('relays')
      connectRelays(savedRelays?.length ? savedRelays : DEFAULT_RELAYS).catch(() => {})

      set({
        pubkey,
        secretKey,
        role,
        profileComplete: !!existingIdentity,
        sessionUnlocked: true,
        loading:         false,
        error:           null,
        googleProfile:   profile,
      })

      return isNewUser || !role
    } catch (err) {
      set({ loading: false, error: err.message })
      throw err
    }
  },

  // ── Restore Google session (app restart) ─────────────────────────────────

  /**
   * On app restart, user must re-authenticate with Google to get a new token.
   * We cannot store the access token persistently (security).
   * So on restart we only restore pubkey/role from Dexie — user must
   * click "Continue with Google" again to get full session.
   */
  async restoreSession() {
    const identities = await db.identities.toArray()
    const googleIdentity = identities.find(i => i.authMethod === 'google')
    if (googleIdentity) {
      set({ pubkey: googleIdentity.pubkey, role: googleIdentity.role })
      // sessionUnlocked stays false → PinUnlock redirect for PIN users,
      // but for Google users we go back to Landing to re-auth
    }
  },

  // ── PIN flow (kept for future nsec users) ────────────────────────────────

  generateNewKeypair() {
    const { secretKey, publicKey } = generateKeypair()
    set({ pubkey: publicKey, secretKey, error: null })
    return { nsec: nip19.nsecEncode(secretKey), npub: nip19.npubEncode(publicKey) }
  },

  loginWithNsec(secretKey, pubkey) {
    set({ secretKey, pubkey, error: null })
  },

  async saveIdentity(role, pin) {
    const { secretKey, pubkey } = get()
    if (!secretKey || !pubkey) throw new Error('No keypair in memory')
    set({ loading: true, error: null })
    try {
      const enc = await encryptPrivateKey(secretKey, pin)
      await db.identities.put({
        pubkey, role, authMethod: 'pin',
        encryptedKey: enc.encryptedKey, salt: enc.salt, iv: enc.iv,
        createdAt: Date.now(),
      })
      set({ role, profileComplete: false, sessionUnlocked: true, loading: false })
    } catch (err) {
      set({ loading: false, error: err.message })
      throw err
    }
  },

  async unlockWithPin(pubkey, pin) {
    set({ loading: true, error: null })
    try {
      const identity = await db.identities.get(pubkey)
      if (!identity) throw new Error('Identity not found')

      const secretKey = await decryptPrivateKey(
        { encryptedKey: identity.encryptedKey, salt: identity.salt, iv: identity.iv }, pin
      )

      // Load saved relays, fall back to defaults
      const savedRelays = await getSetting('relays')
      connectRelays(savedRelays?.length ? savedRelays : DEFAULT_RELAYS).catch(() => {})
      set({ pubkey, secretKey, role: identity.role, sessionUnlocked: true, loading: false, error: null })
      return identity.role
    } catch (err) {
      set({ loading: false, error: err.message })
      throw err
    }
  },

  async getStoredIdentities() {
    return db.identities.toArray()
  },

  async updateRole(role) {
    const { pubkey } = get()
    if (!pubkey) return
    await db.identities.where('pubkey').equals(pubkey).modify({ role })
    set({ role })
  },

  setProfileComplete: (v) => set({ profileComplete: v }),
  setError:           (e) => set({ error: e }),
  setLoading:         (v) => set({ loading: v }),

  logout() {
    clearGoogleSession()
    driveApi.setToken(null)
    set({
      pubkey: null, secretKey: null, role: null,
      profileComplete: false, sessionUnlocked: false,
      googleProfile: null, error: null,
    })
  },
}))

export default useAuthStore
