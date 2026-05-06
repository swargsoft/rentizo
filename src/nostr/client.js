import { Relay } from 'nostr-tools'

export const DEFAULT_RELAYS = (import.meta.env.VITE_DEFAULT_RELAYS ?? '')
  .split(',')
  .map(r => r.trim())
  .filter(r => r.startsWith('wss://'))

let _relays = [...DEFAULT_RELAYS]

// Connection cache — reuse open relay connections
const _connections = new Map() // url → Relay instance

export function getRelays() { return _relays }

export function setRelays(relays) {
  if (!Array.isArray(relays) || !relays.length) return
  _relays = relays
  // Clear stale connections when relay list changes
  _connections.clear()
  console.log('[relay] active relays:', _relays)
}

/**
 * Get or create a cached relay connection.
 * Reuses existing open connections instead of reconnecting every time.
 */
async function getRelay(url) {
  const existing = _connections.get(url)

  // Reuse if already connected
  if (existing) {
    try {
      // Check if still alive by reading the internal ws status
      if (existing.connected) return existing
    } catch {}
  }

  // Create new connection and cache it
  const relay = await Relay.connect(url)
  _connections.set(url, relay)
  return relay
}

/**
 * Publish to all relays — reuses cached connections.
 */
export async function publishToRelays(signedEvent) {
  if (!_relays.length) throw new Error('No relays configured')

  const results = await Promise.allSettled(
    _relays.map(async url => {
      const relay = await getRelay(url)
      await relay.publish(signedEvent)
      console.log(`[publish] ✓ kind:${signedEvent.kind} confirmed by ${url}`)
      return url
    })
  )

  const ok  = results.filter(r => r.status === 'fulfilled').length
  const bad = results.filter(r => r.status === 'rejected').map(r => r.reason?.message ?? String(r.reason))

  if (bad.length) console.warn(`[publish] ✗ ${bad.length} relays rejected:`, bad)
  console.log(`[publish] kind:${signedEvent.kind} → ${ok}/${_relays.length} confirmed`)

  if (ok === 0) throw new Error('Failed to publish to any relay')
  return ok
}

/**
 * Query relays — reuses cached connections per relay, each resolves on EOSE.
 */
export async function queryRelays(filters, timeoutMs = 10000) {
  if (!_relays.length) return []

  const filterArray = Array.isArray(filters) ? filters : [filters]
  const events = new Map()

  await Promise.allSettled(
    _relays.map(async url => {
      try {
        const relay = await getRelay(url)
        await new Promise(resolve => {
          const timer = setTimeout(() => {
            console.warn(`[query] timeout on ${url}`)
            resolve()
          }, timeoutMs)

          const sub = relay.subscribe(filterArray, {
            onevent(event) {
              events.set(event.id, event)
            },
            oneose() {
              clearTimeout(timer)
              sub.close()
              resolve()
            },
          })
        })
      } catch (err) {
        // Connection failed — remove from cache so next call retries
        _connections.delete(url)
        console.warn(`[query] failed on ${url}:`, err.message)
      }
    })
  )

  const result = Array.from(events.values()).sort((a, b) => b.created_at - a.created_at)
  console.log(`[query] kinds:${filterArray.map(f => f.kinds).flat()} → ${result.length} events`)
  return result
}

/**
 * Live subscription — reuses cached connections.
 */
export function subscribeToRelays(filters, onEvent, onEose) {
  const filterArray = Array.isArray(filters) ? filters : [filters]
  const seen = new Set()
  const unsubs = []

  _relays.forEach(async url => {
    try {
      const relay = await getRelay(url)
      const sub = relay.subscribe(filterArray, {
        onevent(event) {
          if (!seen.has(event.id)) {
            seen.add(event.id)
            onEvent(event)
          }
        },
        oneose() { onEose?.() },
      })
      unsubs.push(() => sub.close())
    } catch (err) {
      _connections.delete(url)
      console.warn(`[subscribe] failed on ${url}:`, err.message)
    }
  })

  return () => unsubs.forEach(fn => fn())
}

export async function fetchEventById(eventId) {
  const events = await queryRelays({ ids: [eventId] }, 5000)
  return events[0] ?? null
}