import * as nip04 from 'nostr-tools/nip04'

export async function encryptDM(secretKey, recipientPubkey, plaintext) {
  return nip04.encrypt(secretKey, recipientPubkey, plaintext)
}

export async function decryptDM(secretKey, senderPubkey, ciphertext) {
  return nip04.decrypt(secretKey, senderPubkey, ciphertext)
}

export function parseDMPayload(plaintext) {
  try { return JSON.parse(plaintext) } catch { return null }
}

export async function decryptAndParseDM(event, secretKey) {
  try {
    const plaintext = await decryptDM(secretKey, event.pubkey, event.content)
    return parseDMPayload(plaintext)
  } catch { return null }
}
