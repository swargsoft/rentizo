import { create } from 'zustand'

const useNostrStore = create((set, get) => ({
  hydrated:      false,
  syncing:       false,
  relayStatuses: {},
  subscriptions: [],
  lastSyncAt:    null,

  setHydrated:   (v)        => set({ hydrated: v }),
  setSyncing:    (v)        => set({ syncing: v }),
  setLastSyncAt: (ts)       => set({ lastSyncAt: ts }),

  updateRelayStatus(relay, status) {
    set(s => ({ relayStatuses: { ...s.relayStatuses, [relay]: status } }))
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
