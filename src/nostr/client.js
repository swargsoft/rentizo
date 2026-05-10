import { Relay } from 'nostr-tools'

// ── State ─────────────────────────────────────────────────────────────────────

export const DEFAULT_RELAYS = (import.meta.env.VITE_DEFAULT_RELAYS ?? '')
  .split(',')
  .map(r => r.trim())
  .filter(r => r.startsWith('wss://'))

let _relays = [...DEFAULT_RELAYS]
const _status = new Map()        // url → 'connecting' | 'connected' | 'error'
const _connections = new Map()   // url → Relay instance (live)
const _listeners = new Set()     // () => void

// ── Helpers ───────────────────────────────────────────────────────────────────

function notify() {
  _listeners.forEach(fn => fn())
}

export function onRelayStatusChange(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export function getRelayStatuses() {
  return Object.fromEntries(_status)
}

export function getLiveRelayCount() {
  return [..._status.values()].filter(s => s === 'connected').length
}

export function getRelays() { return _relays }

export function setRelays(relays) {
  if (!Array.isArray(relays) || !relays.length) return
  _relays = relays
  // Clear stale connections — will reconnect on next use
  _connections.clear()
  _status.clear()
  notify()
  console.log('[relay] relay list updated:', _relays)
}

// ── Connect ───────────────────────────────────────────────────────────────────

/**
 * Explicitly connect to all configured relays.
 * Call once after login/unlock — same pattern as worknotes connectRelays().
 * Updates status map so UI can show connection state.
 */
export async function connectRelays(relayUrls) {
  const urls = relayUrls ?? _relays
  if (!urls?.length) return

  _relays = urls
  console.log('[relay] connecting to:', urls)

  // Connect all relays in parallel — don't await sequentially
  await Promise.allSettled(urls.map(async url => {
    _status.set(url, 'connecting')
    notify()
    try {
      const relay = await Relay.connect(url)
      _connections.set(url, relay)
      _status.set(url, 'connected')
      console.log('[relay] ✅ connected:', url)
    } catch {
      _status.set(url, 'error')
      console.warn('[relay] ❌ failed:', url)
    }
    notify()
  }))
}

/**
 * Get a cached connection — or create a new one if not cached / dropped.
 * This is the internal helper used by publish/query.
 */
async function getRelay(url) {
  const cached = _connections.get(url)
  if (cached) {
    // nostr-tools Relay exposes connection state via websocket
    // If still connected, reuse it
    try {
      if (cached.connected) return cached
    } catch {}
    // Stale connection — remove and reconnect
    console.log(`[relay] stale connection detected for ${url}, reconnecting…`)
    _connections.delete(url)
    _status.set(url, 'connecting')
    notify()
  }

  try {
    const relay = await Relay.connect(url)
    _connections.set(url, relay)
    _status.set(url, 'connected')
    notify()
    return relay
  } catch (err) {
    _status.set(url, 'error')
    notify()
    throw err
  }
}

export async function disconnectAll() {
  _connections.clear()
  _status.clear()
  _relays = [...DEFAULT_RELAYS]
  notify()
}

// ── Publish ───────────────────────────────────────────────────────────────────

/**
 * Publish to all relays — reuses cached connections.
 * Per-relay confirmation — same pattern as worknotes publishEvent().
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
  const bad = results.filter(r => r.status === 'rejected')
    .map(r => r.reason?.message ?? String(r.reason))

  if (bad.length) console.warn(`[publish] ✗ ${bad.length} relays:`, bad)
  console.log(`[publish] kind:${signedEvent.kind} → ${ok}/${_relays.length} confirmed`)

  if (ok === 0) throw new Error('Failed to publish to any relay')
  return ok
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/**
 * Fetch events from all relays in parallel.
 * Each relay gets its own connection + EOSE handler — same as worknotes fetchEvents().
 * Deduplicates by event ID.
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
        // Remove from cache — stale connection
        _connections.delete(url)
        _status.set(url, 'error')
        notify()
        console.warn(`[query] failed on ${url}:`, err.message)
      }
    })
  )

  const result = Array.from(events.values())
    .sort((a, b) => b.created_at - a.created_at)
  console.log(`[query] kinds:${filterArray.map(f => f.kinds).flat()} → ${result.length} events`)
  return result
}

// ── Subscribe (live) ──────────────────────────────────────────────────────────

/**
 * Subscribe to live events — per-relay, same as worknotes subscribeToNote().
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
      _status.set(url, 'error')
      notify()
      console.warn(`[subscribe] failed on ${url}:`, err.message)
    }
  })

  return () => unsubs.forEach(fn => fn())
}

export async function fetchEventById(eventId) {
  const events = await queryRelays({ ids: [eventId] }, 5000)
  return events[0] ?? null
}