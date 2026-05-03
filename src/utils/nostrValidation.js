import { nip19 } from 'nostr-tools'
import { getPublicKey } from 'nostr-tools'

export function validateNsec(nsec) {
  if (!nsec?.trim().startsWith('nsec1')) return { valid: false, error: 'Key must start with nsec1' }
  try {
    const decoded = nip19.decode(nsec.trim())
    if (decoded.type !== 'nsec') return { valid: false, error: 'Invalid nsec format' }
    return { valid: true, secretKey: decoded.data, publicKey: getPublicKey(decoded.data) }
  } catch (e) {
    return { valid: false, error: 'Invalid key: ' + e.message }
  }
}

export function validateNpub(npub) {
  if (!npub?.trim().startsWith('npub1')) return { valid: false, error: 'Must start with npub1' }
  try {
    const decoded = nip19.decode(npub.trim())
    return decoded.type === 'npub' ? { valid: true, publicKey: decoded.data } : { valid: false, error: 'Invalid npub' }
  } catch (e) { return { valid: false, error: e.message } }
}

export const secretKeyToNsec = sk => nip19.nsecEncode(sk)
export const pubkeyToNpub    = pk => nip19.npubEncode(pk)

export function validateUpiId(id) {
  if (!id) return { valid: false, error: 'UPI ID required' }
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(id.trim())
    ? { valid: true }
    : { valid: false, error: 'Invalid UPI ID (e.g. name@upi)' }
}

export function validatePhone(phone) {
  const digits = phone?.replace(/\D/g, '') ?? ''
  return digits.length >= 10 && digits.length <= 15
    ? { valid: true }
    : { valid: false, error: 'Enter a valid phone number' }
}

export function formatPhone(phone) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 10) return `+91${d}`
  if (d.startsWith('91') && d.length === 12) return `+${d}`
  return `+${d}`
}
