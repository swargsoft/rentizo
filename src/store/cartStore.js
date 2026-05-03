import { create } from 'zustand'
import { getCart, setCart, clearCart } from '@/db/index.js'

const useCartStore = create((set, get) => ({
  branchId:   null,
  branchName: null,
  items:      [],
  loaded:     false,

  async loadCart() {
    const saved = await getCart()
    if (saved) set({ branchId: saved.branchId, branchName: saved.branchName, items: saved.items })
    set({ loaded: true })
  },

  async addItem(branchId, branchName, listing, qty = 1) {
    const s = get()
    if (s.branchId && s.branchId !== branchId) {
      await clearCart()
      set({ branchId: null, branchName: null, items: [] })
    }
    const existing = get().items.find(i => i.listingId === listing.id)
    const newItems = existing
      ? get().items.map(i => i.listingId === listing.id
          ? { ...i, quantity: Math.min(i.quantity + qty, listing.quantity) }
          : i)
      : [...get().items, {
          listingId:      listing.id,
          vehicleName:    listing.vehicleName,
          vehicleNumber:  listing.vehicleNumber,
          vehicleType:    listing.vehicleType,
          pricePerDay:    listing.pricePerDay,
          securityAmount: listing.securityAmount,
          quantity:       qty,
          maxQuantity:    listing.quantity,
        }]
    await setCart({ branchId, branchName, items: newItems })
    set({ branchId, branchName, items: newItems })
  },

  async updateQuantity(listingId, qty) {
    const { items, branchId, branchName } = get()
    const newItems = qty <= 0
      ? items.filter(i => i.listingId !== listingId)
      : items.map(i => i.listingId === listingId ? { ...i, quantity: Math.min(qty, i.maxQuantity) } : i)
    await setCart({ branchId, branchName, items: newItems })
    set({ items: newItems })
    if (newItems.length === 0) { await clearCart(); set({ branchId: null, branchName: null }) }
  },

  async removeItem(listingId) {
    const { items, branchId, branchName } = get()
    const newItems = items.filter(i => i.listingId !== listingId)
    if (newItems.length === 0) { await clearCart(); set({ branchId: null, branchName: null, items: [] }) }
    else { await setCart({ branchId, branchName, items: newItems }); set({ items: newItems }) }
  },

  async clearCartStore() {
    await clearCart()
    set({ branchId: null, branchName: null, items: [] })
  },

  get totalItems() { return get().items.reduce((s, i) => s + i.quantity, 0) },
  isInCart:    (id) => get().items.some(i => i.listingId === id),
  getQuantity: (id) => get().items.find(i => i.listingId === id)?.quantity ?? 0,
}))

export default useCartStore
