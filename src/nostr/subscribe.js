import { queryRelays, subscribeToRelays } from './client.js'
import { KIND } from './eventKinds.js'

export async function hydrateUserData(pubkey) {
  const [profiles, branches, listings, sentDMs, receivedDMs] = await Promise.all([
    queryRelays({ kinds: [KIND.METADATA, KIND.OWNER_PROFILE, KIND.RIDER_PROFILE], authors: [pubkey] }),
    queryRelays({ kinds: [KIND.BRANCH], authors: [pubkey] }),
    queryRelays({ kinds: [KIND.LISTING], authors: [pubkey] }),
    queryRelays({ kinds: [KIND.ENCRYPTED_DM], authors: [pubkey] }),
    queryRelays({ kinds: [KIND.ENCRYPTED_DM], '#p': [pubkey] }),
  ])
  return { profiles, branches, listings, sentDMs, receivedDMs }
}

export async function fetchNearbyBranches() {
  return queryRelays({ kinds: [KIND.BRANCH], '#t': ['rentizo-branch'], limit: 500 }, 8000)
}

export async function fetchListingsForBranch(branchId) {
  return queryRelays({ kinds: [KIND.LISTING], '#e': [branchId], '#t': ['rentizo-listing'] })
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
