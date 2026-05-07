import { create } from 'zustand'
import { onRelayStatusChange, getRelayStatuses, getLiveRelayCount } from '@/nostr/client.js'

const useNostrStore = create((set, get) => ({
  hydrated:      false,
  syncing:       false,
  relayHealth:   {},
  subscriptions: [],
  lastSyncAt:    null,
  syncTrigger:   0,

  // Live relay connection state — updated by client.js listeners
  relayStatuses:  {},
  liveRelayCount: 0,

  setHydrated:   (v)  => set({ hydrated: v }),
  setSyncing:    (v)  => set({ syncing: v }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),

  refreshSync() {
    set(s => ({ syncTrigger: s.syncTrigger + 1, hydrated: false }))
  },

  /**
   * Start listening to relay connection changes from client.js.
   * Call once on app mount — same as worknotes useSyncStore.init().
   */
  initRelayListener() {
    const unsub = onRelayStatusChange(() => {
      set({
        relayStatuses:  getRelayStatuses(),
        liveRelayCount: getLiveRelayCount(),
      })
    })
    return unsub
  },

  setRelayHealthBatch(results) {
    const health = {}
    results.forEach(r => { health[r.relay] = { ok: r.ok, latencyMs: r.latencyMs } })
    set(s => ({ relayHealth: { ...s.relayHealth, ...health } }))
  },

  addSubscription(unsubFn) {
    set(s => ({ subscriptions: [...s.subscriptions, unsubFn] }))
  },

  clearSubscriptions() {
    get().subscriptions.forEach(fn => { try { fn() } catch {} })
    set({ subscriptions: [] })
  },
}))

export default useNostrStore