import { queryRelays, subscribeToRelays } from './client.js'
import { KIND } from './eventKinds.js'

export async function hydrateUserData(pubkey) {
  // Use longer timeout for hydration — cold WebSocket connections need time
  const HYDRATION_TIMEOUT = 12000

  const [profiles, branches, listings, sentDMs, receivedDMs] = await Promise.all([
    queryRelays({ kinds: [KIND.METADATA, KIND.OWNER_PROFILE, KIND.RIDER_PROFILE], authors: [pubkey] }, HYDRATION_TIMEOUT),
    queryRelays({ kinds: [KIND.BRANCH], authors: [pubkey] }, HYDRATION_TIMEOUT),
    queryRelays({ kinds: [KIND.LISTING], authors: [pubkey] }, HYDRATION_TIMEOUT),
    queryRelays({ kinds: [KIND.ENCRYPTED_DM], authors: [pubkey] }, HYDRATION_TIMEOUT),
    queryRelays({ kinds: [KIND.ENCRYPTED_DM], '#p': [pubkey] }, HYDRATION_TIMEOUT),
  ])
  return { profiles, branches, listings, sentDMs, receivedDMs }
}

export async function fetchNearbyBranches() {
  // Don't filter by tag — many relays don't index custom tags reliably
  // Fetch all kind 30101 events and let the client filter by content
  return queryRelays([{ kinds: [KIND.BRANCH], limit: 500 }], 12000)
}

export async function fetchListingsForBranch(branchId, ownerPubkey) {
  const events = await queryRelays([{
    kinds: [KIND.LISTING],
    ...(ownerPubkey ? { authors: [ownerPubkey] } : {}),
    limit: 200,
  }], 10000)

  // Filter by branchId from content since e-tag was removed
  return events.filter(ev => {
    try { return JSON.parse(ev.content).branchId === branchId }
    catch { return false }
  })
}

export async function fetchListingsByOwner(ownerPubkey) {
  return queryRelays({ kinds: [KIND.LISTING], authors: [ownerPubkey], '#t': ['rentizo-listing'] })
}

export async function fetchBranchReviews(branchId) {
  return queryRelays({ kinds: [KIND.BRANCH_REVIEW], '#e': [branchId], limit: 100 })
}

export async function fetchOwnerProfile(pubkey) {
  return queryRelays({ kinds: [KIND.OWNER_PROFILE, KIND.METADATA], authors: [pubkey] })
}

export async function fetchRiderProfile(pubkey) {
  return queryRelays({ kinds: [KIND.RIDER_PROFILE, KIND.METADATA], authors: [pubkey] })
}

export function subscribeToIncomingDMs(pubkey, onMessage) {
  return subscribeToRelays(
    { kinds: [KIND.ENCRYPTED_DM], '#p': [pubkey], since: Math.floor(Date.now() / 1000) - 1 },
    onMessage
  )
}

export function subscribeToLiveBranches(onBranch) {
  return subscribeToRelays(
    { kinds: [KIND.BRANCH], '#t': ['rentizo-branch'], since: Math.floor(Date.now() / 1000) - 3600 },
    onBranch
  )
}
