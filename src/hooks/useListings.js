import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import db from '@/db/index.js'
import { fetchListingsForBranch } from '@/nostr/subscribe.js'
import { upsertByTimestamp } from '@/db/index.js'
import { storeListingImagesFromBase64 } from '@/db/cache.js'

export function useListingsByBranch(branchId) {
  // Fetch from relays on mount
  useEffect(() => {
    if (!branchId) return
    fetchListingsForBranch(branchId).then(async events => {
      for (const ev of events) {
        try {
          const data = JSON.parse(ev.content)
          if (!data.isPublished) continue
          const dTag = ev.tags.find(t => t[0] === 'd')?.[1]
          if (!dTag) continue
          await upsertByTimestamp('listings', {
            id: dTag, ownerPubkey: ev.pubkey, ...data, nostrEventId: ev.id, updatedAt: ev.created_at,
          })
          if (data.images?.length) storeListingImagesFromBase64(dTag, data.images).catch(() => {})
        } catch {}
      }
    }).catch(() => {})
  }, [branchId])

  return useLiveQuery(
    () => branchId
      ? db.listings.where('branchId').equals(branchId).filter(l => l.isPublished).toArray()
      : [],
    [branchId]
  )
}

// Owner sees all listings (including drafts)
export function useOwnerListingsByBranch(branchId) {
  return useLiveQuery(
    () => branchId ? db.listings.where('branchId').equals(branchId).toArray() : [],
    [branchId]
  )
}

export function useListing(listingId) {
  return useLiveQuery(() => listingId ? db.listings.get(listingId) : null, [listingId])
}
