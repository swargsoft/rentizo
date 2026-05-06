import Dexie from 'dexie'

export const db = new Dexie('RentizoDB')

db.version(1).stores({
  identities:     '&pubkey, role, createdAt',
  ownerProfiles:  '&pubkey, updatedAt',
  riderProfiles:  '&pubkey, updatedAt',
  branches:       '&id, ownerPubkey, isActive, updatedAt',
  listings:       '&id, branchId, ownerPubkey, isPublished, vehicleType, updatedAt',
  bookings:       '&id, riderPubkey, ownerPubkey, branchId, status, createdAt',
  reviews:        '&id, branchId, reviewerPubkey, rating',
  cart:           '&id',
  pendingPublish: '&id, retryCount, createdAt',
  settings:       '&key',
})

export async function upsertByTimestamp(table, record, tsField = 'updatedAt') {
  try {
    const key = record.id ?? record.pubkey
    const existing = await db[table].get(key)
    if (existing && existing[tsField] >= record[tsField]) return
    await db[table].put(record)
  } catch (err) {
    if (err.name === 'AbortError' || err.message?.includes('QuotaExceeded')) {
      console.warn(`[DB] Quota exceeded writing to ${table} — skipping`)
      return // don't throw — let caller continue
    }
    throw err
  }
}

export const getListingsByBranch  = (branchId)    => db.listings.where('branchId').equals(branchId).toArray()
export const getBranchesByOwner   = (ownerPubkey) => db.branches.where('ownerPubkey').equals(ownerPubkey).toArray()
export const getBookingsByOwner   = (pubkey, status) => {
  const q = db.bookings.where('ownerPubkey').equals(pubkey)
  return status ? q.filter(b => b.status === status).toArray() : q.toArray()
}
export const getBookingsByRider   = (pubkey)      => db.bookings.where('riderPubkey').equals(pubkey).sortBy('createdAt')
export const getCart              = ()             => db.cart.get('active')
export const setCart              = (cart)         => db.cart.put({ ...cart, id: 'active' })
export const clearCart            = ()             => db.cart.delete('active')
export const getSetting           = async (key, def = null) => { const r = await db.settings.get(key); return r?.value ?? def }
export const setSetting           = (key, value)  => db.settings.put({ key, value })
export const queueEventForPublish = (ev)           => db.pendingPublish.put({ id: ev.id, eventJson: JSON.stringify(ev), retryCount: 0, createdAt: Date.now() })
export const getPendingEvents     = ()             => db.pendingPublish.orderBy('createdAt').toArray()
export const removePendingEvent   = (id)           => db.pendingPublish.delete(id)

export default db
