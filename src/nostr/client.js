import { SimplePool } from 'nostr-tools/pool'

export const DEFAULT_RELAYS = (import.meta.env.VITE_DEFAULT_RELAYS ?? '')
  .split(',')
  .map(r => r.trim())
  .filter(r => r.startsWith('wss://'))

let _pool = null
let _relays = [...DEFAULT_RELAYS]

export function getPool() {
  if (!_pool) _pool = new SimplePool()
  return _pool
}

export function getRelays() { return _relays }

export function setRelays(relays) {
  if (!Array.isArray(relays) || !relays.length) return
  _relays = relays
}

export function closePool() {
  if (_pool) { _pool.close(_relays); _pool = null }
}

export async function publishToRelays(signedEvent) {
  const pool = getPool()
  const results = await Promise.allSettled(pool.publish(_relays, signedEvent))
  const ok = results.filter(r => r.status === 'fulfilled').length
  console.log(`[Publish] kind:${signedEvent.kind} → ${ok}/${_relays.length} relays`)
  if (ok === 0) throw new Error('Failed to publish to any relay')
  return ok
}

export async function queryRelays(filters, timeoutMs = 10000) {
  const pool = getPool()
  const filterArray = Array.isArray(filters) ? filters : [filters]
  const activeRelays = [..._relays]

  return new Promise((resolve) => {
    const events = []
    const seen = new Set()
    let settled = false
    let eoseCount = 0

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { sub.close() } catch {}
      resolve(events.sort((a, b) => b.created_at - a.created_at))
    }

    const sub = pool.subscribeMany(activeRelays, filterArray, {
      onevent(event) {
        if (!seen.has(event.id)) {
          seen.add(event.id)
          events.push(event)
        }
      },
      oneose() {
        // In nostr-tools v2, oneose fires per relay
        // Wait for ALL relays to EOSE before resolving
        eoseCount++
        if (eoseCount >= activeRelays.length) {
          finish()
        }
      }
    })

    const timer = setTimeout(finish, timeoutMs)
  })
}

export function subscribeToRelays(filters, onEvent, onEose) {
  const pool = getPool()
  const filterArray = Array.isArray(filters) ? filters : [filters]
  const seen = new Set()
  const sub = pool.subscribeMany([..._relays], filterArray, {
    onevent(event) {
      if (!seen.has(event.id)) {
        seen.add(event.id)
        onEvent(event)
      }
    },
    oneose() { onEose?.() }
  })
  return () => sub.close()
}

export async function fetchEventById(eventId) {
  const events = await queryRelays({ ids: [eventId] }, 5000)
  return events[0] ?? null
}
