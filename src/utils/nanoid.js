// Minimal nanoid — generates URL-safe unique IDs without the package
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
export function nanoid(size = 21) {
  const bytes = crypto.getRandomValues(new Uint8Array(size))
  return Array.from(bytes).map(b => ALPHABET[b % ALPHABET.length]).join('')
}
