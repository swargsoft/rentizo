import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import db from '@/db/index.js'
import useAuthStore from '@/store/authStore.js'
import { fetchNearbyBranches } from '@/nostr/subscribe.js'
import { upsertByTimestamp } from '@/db/index.js'
import { filterBranchesByRadius } from '@/utils/geo.js'

// Owner: get own branches live from Dexie
export function useOwnerBranches() {
  const pubkey = useAuthStore(s => s.pubkey)
  return useLiveQuery(
    () => pubkey ? db.branches.where('ownerPubkey').equals(pubkey).toArray() : [],
    [pubkey]
  )
}

// Rider: get nearby branches with geo filter
export function useNearbyBranches(location, radiusKm = 10) {
  const [loading, setLoading] = useState(false)

  // Fetch from relays and store in Dexie when location changes
  useEffect(() => {
    if (!location) return
    setLoading(true)
    fetchNearbyBranches()
      .then(async events => {
        for (const ev of events) {
          try {
            const data = JSON.parse(ev.content)
            const dTag = ev.tags.find(t => t[0] === 'd')?.[1]
            if (!dTag) continue
            await upsertByTimestamp('branches', {
              id: dTag, ownerPubkey: ev.pubkey, ...data, nostrEventId: ev.id, updatedAt: ev.created_at,
            })
          } catch {}
        }
      })
      .finally(() => setLoading(false))
  }, [location?.lat, location?.lng])

  const allBranches = useLiveQuery(() => db.branches.where('isActive').equals(1).toArray(), [])

  const nearby = allBranches && location
    ? filterBranchesByRadius(allBranches, location.lat, location.lng, radiusKm)
    : []

  return { branches: nearby, loading }
}

export function useBranch(branchId) {
  return useLiveQuery(() => branchId ? db.branches.get(branchId) : null, [branchId])
}
