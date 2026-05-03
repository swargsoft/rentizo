const ITERATIONS = 100_000
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer

async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false, ['encrypt', 'decrypt']
  )
}

export async function encryptPrivateKey(secretKey, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv   = crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await deriveKey(pin, salt)
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, secretKey)
  return { encryptedKey: b64(encrypted), salt: b64(salt), iv: b64(iv) }
}

export async function decryptPrivateKey({ encryptedKey, salt, iv }, pin) {
  const aesKey = await deriveKey(pin, new Uint8Array(unb64(salt)))
  try {
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(unb64(iv)) }, aesKey, unb64(encryptedKey))
    return new Uint8Array(dec)
  } catch {
    throw new Error('Incorrect PIN or corrupted key')
  }
}

export const secretKeyToHex = sk => Array.from(sk).map(b => b.toString(16).padStart(2,'0')).join('')
export const hexToSecretKey  = hex => Uint8Array.from(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
