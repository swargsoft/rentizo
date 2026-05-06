import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import db, { upsertByTimestamp } from '@/db/index.js'
import useAuthStore from '@/store/authStore.js'
import { queryRelays } from '@/nostr/client.js'
import { KIND, T_TAG } from '@/nostr/eventKinds.js'
import { filterBranchesByRadius, haversineDistance } from '@/utils/geo.js'

export function useOwnerBranches() {
  const pubkey = useAuthStore(s => s.pubkey)
  return useLiveQuery(
    () => pubkey ? db.branches.where('ownerPubkey').equals(pubkey).toArray() : [],
    [pubkey]
  )
}

export function useNearbyBranches(location, radiusKm = 10) {
  const fetchedRef = useRef(false)
  const [loading, setLoading] = useState(true)
  const locationKey = location
    ? `${location.lat.toFixed(3)},${location.lng.toFixed(3)}`
    : null

  useEffect(() => {
    if (!location || fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)

    queryRelays([{
      kinds: [KIND.BRANCH],
      '#t': ['rentizo-branch'],  // tag filter — reduces results dramatically
      limit: 100,                // hard cap — don't fetch 500
    }], 12000)
      .then(async events => {
        console.log(`[Discovery] Fetched ${events.length} branch events from Nostr`)

        // Parse and geo-filter BEFORE writing to Dexie
        const nearbyEvents = events.filter(ev => {
          try {
            const data = JSON.parse(ev.content)
            if (!data.lat || !data.lng || data.isActive === false) return false
            const dist = haversineDistance(location.lat, location.lng, data.lat, data.lng)
            return dist <= radiusKm * 3 // store up to 3x radius, display filters to 1x
          } catch { return false }
        })

        console.log(`[Discovery] ${nearbyEvents.length} branches within range`)

        // Only persist nearby branches — not all 500
        for (const ev of nearbyEvents) {
          try {
            const data = JSON.parse(ev.content)
            const dTag = ev.tags.find(t => t[0] === 'd')?.[1]
            if (!dTag) continue
            await upsertByTimestamp('branches', {
              id:           dTag,
              ownerPubkey:  ev.pubkey,
              branchName:   data.branchName,
              address:      data.address,
              lat:          data.lat,
              lng:          data.lng,
              phone:        data.phone ?? '',
              isActive:     data.isActive ?? true,
              updatedAt:    data.updatedAt ?? ev.created_at,
              nostrEventId: ev.id,
            })
          } catch (err) {
            if (err.name === 'AbortError' || err.message?.includes('QuotaExceeded')) {
              console.warn('[Discovery] IndexedDB quota hit — stopping branch writes')
              break // stop writing, display what we have in memory
            }
          }
        }
      })
      .catch(err => console.warn('[Discovery] fetch error:', err))
      .finally(() => setLoading(false))
  }, [locationKey])

  const storedBranches = useLiveQuery(
    () => db.branches.filter(b => b.isActive !== false).toArray(),
    []
  )

  const nearby = storedBranches && location
    ? filterBranchesByRadius(storedBranches, location.lat, location.lng, radiusKm)
    : []

  return { branches: nearby, loading }
}

export function useBranch(branchId) {
  return useLiveQuery(
    () => branchId ? db.branches.get(branchId) : null,
    [branchId]
  )
}