import { create } from 'zustand'
import { getPublicKey } from 'nostr-tools'
import { nip19 } from 'nostr-tools'
import db from '@/db/index.js'
import { encryptPrivateKey, decryptPrivateKey } from '@/utils/keyEncryption.js'
import { generateKeypair } from '@/nostr/publish.js'
import { setRelays, DEFAULT_RELAYS, connectRelays } from '@/nostr/client.js'
import { getSetting } from '@/db/index.js'

const useAuthStore = create((set, get) => ({
  pubkey:          null,
  secretKey:       null,
  role:            null,
  profileComplete: false,
  loading:         false,
  error:           null,
  sessionUnlocked: false,

  generateNewKeypair() {
    const { secretKey, publicKey } = generateKeypair()
    set({ pubkey: publicKey, secretKey, error: null })
    return {
      nsec: nip19.nsecEncode(secretKey),
      npub: nip19.npubEncode(publicKey),
    }
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
        pubkey,
        role,
        encryptedKey: enc.encryptedKey,
        salt:         enc.salt,
        iv:           enc.iv,
        createdAt:    Date.now(),
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
        { encryptedKey: identity.encryptedKey, salt: identity.salt, iv: identity.iv },
        pin
      )

      // Load saved relays, fall back to defaults
      const savedRelays = await getSetting('relays')
      const relayUrls = savedRelays?.length ? savedRelays : DEFAULT_RELAYS

      // Explicitly connect — same as worknotes connectRelays() on identity load
      // Don't await — let it connect in background while app loads
      connectRelays(relayUrls).catch(err =>
        console.warn('[auth] relay connect error:', err.message)
      )

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
  setError:          (e) => set({ error: e }),
  setLoading:        (v) => set({ loading: v }),

  logout() {
    set({ pubkey: null, secretKey: null, role: null, profileComplete: false, sessionUnlocked: false, error: null })
  },
}))

export default useAuthStore
