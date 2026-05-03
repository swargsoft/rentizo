import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import db from '@/db/index.js'
import useAuthStore from '@/store/authStore.js'
import { subscribeToIncomingDMs } from '@/nostr/subscribe.js'
import { decryptAndParseDM } from '@/nostr/encrypt.js'
import useNostrStore from '@/store/nostrStore.js'

// Owner: watch incoming DMs for new booking requests
export function useIncomingBookings() {
  const { pubkey, secretKey, role } = useAuthStore()
  const addSubscription = useNostrStore(s => s.addSubscription)

  useEffect(() => {
    if (!pubkey || !secretKey || role === 'rider') return
    const unsub = subscribeToIncomingDMs(pubkey, async (event) => {
      const payload = await decryptAndParseDM(event, secretKey)
      if (!payload) return
      if (payload.type === 'BOOKING_REQUEST') {
        const exists = await db.bookings.get(payload.id)
        if (!exists) await db.bookings.put({ ...payload, nostrEventId: event.id, type: undefined })
      } else if (payload.type === 'BOOKING_UPDATE') {
        await db.bookings.update(payload.bookingId, { status: payload.status })
      }
    })
    addSubscription(unsub)
    return unsub
  }, [pubkey, secretKey, role])
}

export function useOwnerBookings(status) {
  const pubkey = useAuthStore(s => s.pubkey)
  return useLiveQuery(() => {
    if (!pubkey) return []
    const q = db.bookings.where('ownerPubkey').equals(pubkey)
    return status ? q.filter(b => b.status === status).toArray() : q.toArray()
  }, [pubkey, status])
}

export function useRiderBookings() {
  const pubkey = useAuthStore(s => s.pubkey)
  return useLiveQuery(
    () => pubkey ? db.bookings.where('riderPubkey').equals(pubkey).sortBy('createdAt') : [],
    [pubkey]
  )
}

export function useBooking(bookingId) {
  return useLiveQuery(() => bookingId ? db.bookings.get(bookingId) : null, [bookingId])
}
