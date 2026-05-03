import { useEffect } from 'react'
import { hydrateUserData } from '@/nostr/subscribe.js'
import { decryptAndParseDM } from '@/nostr/encrypt.js'
import db, { upsertByTimestamp } from '@/db/index.js'
import useAuthStore from '@/store/authStore.js'
import useNostrStore from '@/store/nostrStore.js'
import { KIND } from '@/nostr/eventKinds.js'
import { storeListingImagesFromBase64 } from '@/db/cache.js'

function parseContent(event) {
  try { return JSON.parse(event.content) } catch { return null }
}

export function useHydration() {
  const { pubkey, secretKey } = useAuthStore()
  const { setHydrated, setSyncing, setLastSyncAt } = useNostrStore()

  useEffect(() => {
    if (!pubkey || !secretKey) return
    let cancelled = false

    async function run() {
      setSyncing(true)
      try {
        const { profiles, branches, listings, sentDMs, receivedDMs } = await hydrateUserData(pubkey)
        if (cancelled) return

        // ── Profiles ──────────────────────────────────────────────────────
        for (const ev of profiles) {
          const data = parseContent(ev)
          if (!data) continue
          if (ev.kind === KIND.OWNER_PROFILE) {
            await upsertByTimestamp('ownerProfiles', { pubkey: ev.pubkey, ...data, updatedAt: ev.created_at })
          } else if (ev.kind === KIND.RIDER_PROFILE) {
            await upsertByTimestamp('riderProfiles', { pubkey: ev.pubkey, ...data, updatedAt: ev.created_at })
          }
        }

        // ── Branches ──────────────────────────────────────────────────────
        for (const ev of branches) {
          const data = parseContent(ev)
          if (!data) continue
          const dTag = ev.tags.find(t => t[0] === 'd')?.[1]
          if (!dTag) continue
          await upsertByTimestamp('branches', {
            id: dTag, ownerPubkey: ev.pubkey, ...data, nostrEventId: ev.id, updatedAt: ev.created_at,
          })
        }

        // ── Listings ──────────────────────────────────────────────────────
        for (const ev of listings) {
          const data = parseContent(ev)
          if (!data) continue
          const dTag = ev.tags.find(t => t[0] === 'd')?.[1]
          if (!dTag) continue
          await upsertByTimestamp('listings', {
            id: dTag, ownerPubkey: ev.pubkey, ...data, nostrEventId: ev.id, updatedAt: ev.created_at,
          })
          if (data.images?.length) {
            storeListingImagesFromBase64(dTag, data.images).catch(() => {})
          }
        }

        // ── DMs (bookings) ────────────────────────────────────────────────
        const allDMs = [...sentDMs, ...receivedDMs]
        for (const ev of allDMs) {
          const payload = await decryptAndParseDM(ev, secretKey)
          if (!payload) continue

          if (payload.type === 'BOOKING_REQUEST') {
            const existing = await db.bookings.get(payload.id)
            if (!existing) {
              await db.bookings.put({ ...payload, nostrEventId: ev.id, type: undefined })
            }
          } else if (payload.type === 'BOOKING_UPDATE') {
            const existing = await db.bookings.get(payload.bookingId)
            if (existing) {
              await db.bookings.update(payload.bookingId, { status: payload.status })
            }
          }
        }

        if (!cancelled) {
          setHydrated(true)
          setLastSyncAt(Date.now())
        }
      } catch (err) {
        console.error('[Hydration] Error:', err)
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [pubkey, secretKey])
}
