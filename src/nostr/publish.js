import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools'
import * as nip04 from 'nostr-tools/nip04'
import { publishToRelays } from './client.js'
import { KIND, D_TAG, E_TAG, P_TAG, T_TAG, APP_TAG } from './eventKinds.js'

function now() { return Math.floor(Date.now() / 1000) }

async function buildAndPublish(kind, content, tags, secretKey) {
  const event = finalizeEvent({
    kind,
    created_at: now(),
    tags: [...tags, APP_TAG],
    content,
  }, secretKey)
  await publishToRelays(event)
  return event
}

export function generateKeypair() {
  const secretKey = generateSecretKey()
  const publicKey = getPublicKey(secretKey)
  return { secretKey, publicKey }
}

export async function publishMetadata({ name, picture }, secretKey) {
  return buildAndPublish(KIND.METADATA, JSON.stringify({ name, picture: picture ?? '' }), [], secretKey)
}

export async function publishOwnerProfile({ name, phone, upiId, profilePicture }, secretKey) {
  const pubkey = getPublicKey(secretKey)
  await publishMetadata({ name, picture: profilePicture }, secretKey)
  return buildAndPublish(
    KIND.OWNER_PROFILE,
    JSON.stringify({ name, phone, upiId, profilePicture: profilePicture ?? '' }),
    [[D_TAG, pubkey]],
    secretKey
  )
}

export async function publishRiderProfile({ name, phone, profilePicture }, secretKey) {
  const pubkey = getPublicKey(secretKey)
  await publishMetadata({ name, picture: profilePicture }, secretKey)
  return buildAndPublish(
    KIND.RIDER_PROFILE,
    JSON.stringify({ name, phone, profilePicture: profilePicture ?? '' }),
    [[D_TAG, pubkey]],
    secretKey
  )
}

export async function publishBranch(branch, secretKey) {
  return buildAndPublish(
    KIND.BRANCH,
    JSON.stringify({
      branchName: branch.branchName,
      address:    branch.address,
      lat:        branch.lat,
      lng:        branch.lng,
      phone:      branch.phone ?? '',
      isActive:   branch.isActive ?? true,
      updatedAt:  now(),
    }),
    [
      [D_TAG, branch.id],
      ['lat', String(branch.lat)],
      ['lon', String(branch.lng)],
      [T_TAG, 'rentizo-branch'],
    ],
    secretKey
  )
}

export async function publishListing(listing, secretKey) {
  return buildAndPublish(
    KIND.LISTING,
    JSON.stringify({
      vehicleName:    listing.vehicleName,
      vehicleNumber:  listing.vehicleNumber,
      vehicleType:    listing.vehicleType,
      pricePerDay:    listing.pricePerDay,
      securityAmount: listing.securityAmount,
      quantity:       listing.quantity,
      images:         listing.images ?? [],
      description:    listing.description ?? '',
      isPublished:    listing.isPublished ?? false,
      branchId:       listing.branchId,
      updatedAt:      now(),
    }),
    [
      [D_TAG, listing.id],
      [E_TAG, listing.branchId],
      [T_TAG, listing.vehicleType],
      [T_TAG, 'rentizo-listing'],
      ['price', String(listing.pricePerDay), 'INR'],
    ],
    secretKey
  )
}

export async function publishBookingRequest(booking, ownerPubkey, secretKey) {
  const ciphertext = await nip04.encrypt(secretKey, ownerPubkey,
    JSON.stringify({ type: 'BOOKING_REQUEST', ...booking })
  )
  const event = finalizeEvent({
    kind: KIND.ENCRYPTED_DM,
    created_at: now(),
    tags: [[P_TAG, ownerPubkey]],
    content: ciphertext,
  }, secretKey)
  await publishToRelays(event)
  return event
}

export async function publishBookingUpdate({ bookingId, status, message }, riderPubkey, secretKey) {
  const ciphertext = await nip04.encrypt(secretKey, riderPubkey,
    JSON.stringify({ type: 'BOOKING_UPDATE', bookingId, status, message: message ?? '' })
  )
  const event = finalizeEvent({
    kind: KIND.ENCRYPTED_DM,
    created_at: now(),
    tags: [[P_TAG, riderPubkey]],
    content: ciphertext,
  }, secretKey)
  await publishToRelays(event)
  return event
}

export async function publishReview(review, secretKey) {
  const pubkey = getPublicKey(secretKey)
  return buildAndPublish(
    KIND.BRANCH_REVIEW,
    JSON.stringify({
      rating:    review.rating,
      comment:   review.comment ?? '',
      bookingId: review.bookingId,
      createdAt: now(),
    }),
    [
      [D_TAG, `${review.branchId}:${pubkey}`],
      [E_TAG, review.branchId],
      [P_TAG, review.ownerPubkey],
      [T_TAG, 'rentizo-review'],
    ],
    secretKey
  )
}

export async function publishDeletion(eventIds, secretKey) {
  return buildAndPublish(
    KIND.DELETION,
    'deleted by author',
    eventIds.map(id => [E_TAG, id]),
    secretKey
  )
}
