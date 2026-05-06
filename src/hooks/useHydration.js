import { useEffect } from 'react'
import { hydrateUserData } from '@/nostr/subscribe.js'
import { decryptAndParseDM } from '@/nostr/encrypt.js'
import {
  publishOwnerProfile,
  publishRiderProfile,
  publishBranch,
  publishListing,
} from '@/nostr/publish.js'
import db from '@/db/index.js'
import useAuthStore from '@/store/authStore.js'
import useNostrStore from '@/store/nostrStore.js'
import { KIND } from '@/nostr/eventKinds.js'
import { storeListingImagesFromBase64 } from '@/db/cache.js'

function parseContent(event) {
  try { return JSON.parse(event.content) } catch { return null }
}

function resolveWinner(localUpdatedAt, nostrUpdatedAt) {
  const local = localUpdatedAt ?? 0
  const nostr = nostrUpdatedAt ?? 0
  if (nostr > local)  return 'nostr'
  if (local > nostr)  return 'local'
  return 'equal'
}

// Safe publish — never throws, just logs
async function safePublish(label, fn) {
  try {
    await fn()
    console.log(`[Sync] ✓ Published ${label}`)
  } catch (err) {
    console.warn(`[Sync] ✗ Failed to publish ${label}:`, err.message)
  }
}

export function useHydration() {
  const { pubkey, secretKey, sessionUnlocked, role } = useAuthStore()
  const { setHydrated, setSyncing, setLastSyncAt, syncTrigger } = useNostrStore()

  useEffect(() => {
    if (!pubkey || !secretKey || !sessionUnlocked) return
    let cancelled = false

    async function run(attempt = 1) {
      setSyncing(true)
      console.log(`[Sync] Attempt ${attempt} — ${pubkey.slice(0, 8)}…`)

      try {
        const { profiles, branches, listings, sentDMs, receivedDMs } =
          await hydrateUserData(pubkey)

        if (cancelled) return

        const totalFromNostr = profiles.length + branches.length + listings.length
        const relaysResponding = totalFromNostr > 0

        console.log(`[Sync] Nostr: ${profiles.length} profiles, ${branches.length} branches, ${listings.length} listings, ${sentDMs.length + receivedDMs.length} DMs | relaysResponding: ${relaysResponding}`)

        // ── OWNER PROFILE ────────────────────────────────────────────────
        if (role === 'owner' || role === 'both') {
          const nostrEv   = profiles.find(e => e.kind === KIND.OWNER_PROFILE)
          const nostrData = nostrEv ? parseContent(nostrEv) : null
          const local     = await db.ownerProfiles.get(pubkey)

          if (nostrData && local) {
            const winner = resolveWinner(local.updatedAt, nostrData.updatedAt)
            if (winner === 'nostr') {
              console.log('[Sync] Owner profile → Nostr wins, updating local')
              await db.ownerProfiles.put({ pubkey, ...nostrData })
            } else if (winner === 'local') {
              console.log('[Sync] Owner profile → Local wins, publishing')
              await safePublish('owner profile', () => publishOwnerProfile(local, secretKey))
            } else {
              console.log('[Sync] Owner profile → equal, no action')
            }
          } else if (nostrData && !local) {
            console.log('[Sync] Owner profile → pulling from Nostr')
            await db.ownerProfiles.put({ pubkey, ...nostrData })
          } else if (!nostrData && local && relaysResponding) {
            // Only publish if relays are actually up — otherwise we'd spam on every offline boot
            console.log('[Sync] Owner profile → missing on Nostr, publishing')
            await safePublish('owner profile', () => publishOwnerProfile(local, secretKey))
          }
        }

        // ── RIDER PROFILE ────────────────────────────────────────────────
        if (role === 'rider' || role === 'both') {
          const nostrEv   = profiles.find(e => e.kind === KIND.RIDER_PROFILE)
          const nostrData = nostrEv ? parseContent(nostrEv) : null
          const local     = await db.riderProfiles.get(pubkey)

          if (nostrData && local) {
            const winner = resolveWinner(local.updatedAt, nostrData.updatedAt)
            if (winner === 'nostr') {
              console.log('[Sync] Rider profile → Nostr wins, updating local')
              await db.riderProfiles.put({ pubkey, ...nostrData })
            } else if (winner === 'local') {
              console.log('[Sync] Rider profile → Local wins, publishing')
              await safePublish('rider profile', () => publishRiderProfile(local, secretKey))
            } else {
              console.log('[Sync] Rider profile → equal, no action')
            }
          } else if (nostrData && !local) {
            console.log('[Sync] Rider profile → pulling from Nostr')
            await db.riderProfiles.put({ pubkey, ...nostrData })
          } else if (!nostrData && local && relaysResponding) {
            console.log('[Sync] Rider profile → missing on Nostr, publishing')
            await safePublish('rider profile', () => publishRiderProfile(local, secretKey))
          }
        }

        // ── BRANCHES ────────────────────────────────────────────────────
        const nostrBranchMap = {}
        for (const ev of branches) {
          const dTag = ev.tags.find(t => t[0] === 'd')?.[1]
          if (!dTag) continue
          const data = parseContent(ev)
          if (!data) continue
          nostrBranchMap[dTag] = { ev, data }
        }

        const localBranches = await db.branches.where('ownerPubkey').equals(pubkey).toArray()
        const localBranchMap = Object.fromEntries(localBranches.map(b => [b.id, b]))

        const allBranchIds = new Set([
          ...Object.keys(nostrBranchMap),
          ...Object.keys(localBranchMap),
        ])

        for (const id of allBranchIds) {
          const nostr = nostrBranchMap[id]
          const local = localBranchMap[id]

          if (nostr && local) {
            const winner = resolveWinner(local.updatedAt, nostr.data.updatedAt)
            if (winner === 'nostr') {
              console.log(`[Sync] Branch ${id.slice(0,8)} → Nostr wins, updating local`)
              await db.branches.put({ id, ownerPubkey: pubkey, ...nostr.data, nostrEventId: nostr.ev.id })
            } else if (winner === 'local') {
              console.log(`[Sync] Branch ${id.slice(0,8)} → Local wins, publishing`)
              await safePublish(`branch ${id.slice(0,8)}`, () => publishBranch(local, secretKey))
            } else {
              console.log(`[Sync] Branch ${id.slice(0,8)} → equal, no action`)
            }
          } else if (nostr && !local) {
            console.log(`[Sync] Branch ${id.slice(0,8)} → pulling from Nostr`)
            await db.branches.put({ id, ownerPubkey: pubkey, ...nostr.data, nostrEventId: nostr.ev.id })
          } else if (!nostr && local && relaysResponding) {
            console.log(`[Sync] Branch ${id.slice(0,8)} → missing on Nostr, publishing`)
            await safePublish(`branch ${id.slice(0,8)}`, () => publishBranch(local, secretKey))
          }
        }

        // ── LISTINGS ────────────────────────────────────────────────────
        const nostrListingMap = {}
        for (const ev of listings) {
          const dTag = ev.tags.find(t => t[0] === 'd')?.[1]
          if (!dTag) continue
          const data = parseContent(ev)
          if (!data) continue
          nostrListingMap[dTag] = { ev, data }
        }

        const localListings = await db.listings.where('ownerPubkey').equals(pubkey).toArray()
        const localListingMap = Object.fromEntries(localListings.map(l => [l.id, l]))

        const allListingIds = new Set([
          ...Object.keys(nostrListingMap),
          ...Object.keys(localListingMap),
        ])

        for (const id of allListingIds) {
          const nostr = nostrListingMap[id]
          const local = localListingMap[id]

          if (nostr && local) {
            const winner = resolveWinner(local.updatedAt, nostr.data.updatedAt)
            if (winner === 'nostr') {
              console.log(`[Sync] Listing ${id.slice(0,8)} → Nostr wins, updating local`)
              await db.listings.put({ id, ownerPubkey: pubkey, ...nostr.data, nostrEventId: nostr.ev.id })
              if (nostr.data.images?.length) storeListingImagesFromBase64(id, nostr.data.images).catch(() => {})
            } else if (winner === 'local') {
              console.log(`[Sync] Listing ${id.slice(0,8)} → Local wins, publishing`)
              await safePublish(`listing ${id.slice(0,8)}`, () => publishListing(local, secretKey))
            } else {
              console.log(`[Sync] Listing ${id.slice(0,8)} → equal, no action`)
            }
          } else if (nostr && !local) {
            console.log(`[Sync] Listing ${id.slice(0,8)} → pulling from Nostr`)
            await db.listings.put({ id, ownerPubkey: pubkey, ...nostr.data, nostrEventId: nostr.ev.id })
            if (nostr.data.images?.length) storeListingImagesFromBase64(id, nostr.data.images).catch(() => {})
          } else if (!nostr && local && relaysResponding) {
            console.log(`[Sync] Listing ${id.slice(0,8)} → missing on Nostr, publishing`)
            await safePublish(`listing ${id.slice(0,8)}`, () => publishListing(local, secretKey))
          }
        }

        // ── DMs / BOOKINGS ───────────────────────────────────────────────
        const allDMs = [...sentDMs, ...receivedDMs]
        for (const ev of allDMs) {
          try {
            const payload = await decryptAndParseDM(ev, secretKey)
            if (!payload) continue
            if (payload.type === 'BOOKING_REQUEST') {
              const existing = await db.bookings.get(payload.id)
              if (!existing) await db.bookings.put({ ...payload, nostrEventId: ev.id, type: undefined })
            } else if (payload.type === 'BOOKING_UPDATE') {
              const existing = await db.bookings.get(payload.bookingId)
              if (existing && payload.status !== existing.status) {
                await db.bookings.update(payload.bookingId, { status: payload.status })
              }
            }
          } catch (err) {
            console.warn('[Sync] DM parse error:', err.message)
          }
        }

        // ── Retry if relays returned nothing ────────────────────────────
        if (!relaysResponding && attempt < 2 && !cancelled) {
          console.log('[Sync] Relays returned nothing, retrying in 4s…')
          setTimeout(() => { if (!cancelled) run(2) }, 4000)
          return
        }

        if (!cancelled) {
          setHydrated(true)
          setLastSyncAt(Date.now())
          console.log('[Sync] Complete ✓')
        }
      } catch (err) {
        console.error('[Sync] Fatal error:', err)
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [pubkey, secretKey, sessionUnlocked, syncTrigger])
}
