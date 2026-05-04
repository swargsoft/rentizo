import { create } from 'zustand'

const useNostrStore = create((set, get) => ({
  hydrated:      false,
  syncing:       false,
  relayStatuses: {},
  relayHealth:   {},
  subscriptions: [],
  lastSyncAt:    null,

  setHydrated:   (v)  => set({ hydrated: v }),
  setSyncing:    (v)  => set({ syncing: v }),
  setLastSyncAt: (ts) => set({ lastSyncAt: ts }),

  updateRelayStatus(relay, status) {
    set(s => ({ relayStatuses: { ...s.relayStatuses, [relay]: status } }))
  },

  setRelayHealthBatch(results) {
    // results: [{ relay, ok, latencyMs }]
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