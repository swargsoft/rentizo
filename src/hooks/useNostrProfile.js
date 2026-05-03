import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/db/index.js'
import useAuthStore from '@/store/authStore.js'

export function useOwnerProfile(pubkey) {
  const activePubkey = useAuthStore(s => s.pubkey)
  const pk = pubkey ?? activePubkey
  return useLiveQuery(() => pk ? db.ownerProfiles.get(pk) : null, [pk])
}

export function useRiderProfile(pubkey) {
  const activePubkey = useAuthStore(s => s.pubkey)
  const pk = pubkey ?? activePubkey
  return useLiveQuery(() => pk ? db.riderProfiles.get(pk) : null, [pk])
}
