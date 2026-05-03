import { create } from 'zustand'

const useUiStore = create((set) => ({
  // Snackbar
  snackbar: { open: false, message: '', severity: 'info' },
  showSnackbar(message, severity = 'info') {
    set({ snackbar: { open: true, message, severity } })
  },
  closeSnackbar() {
    set(s => ({ snackbar: { ...s.snackbar, open: false } }))
  },

  // Confirm dialog
  confirm: { open: false, title: '', message: '', onConfirm: null },
  showConfirm(title, message, onConfirm) {
    set({ confirm: { open: true, title, message, onConfirm } })
  },
  closeConfirm() {
    set(s => ({ confirm: { ...s.confirm, open: false, onConfirm: null } }))
  },

  // Global loading overlay
  globalLoading: false,
  setGlobalLoading: (v) => set({ globalLoading: v }),

  // Bottom nav value (for owner/rider tabs)
  bottomNav: 0,
  setBottomNav: (v) => set({ bottomNav: v }),

  // Discover view toggle: 'map' | 'list'
  discoverView: 'map',
  setDiscoverView: (v) => set({ discoverView: v }),
}))

export default useUiStore
