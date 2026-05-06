const CACHE_KEY = 'rentizo-relay-health'

/**
 * Probe a single relay by opening a WebSocket and measuring connect time.
 */
function probeRelay(relay, timeoutMs = 5000) {
  return new Promise(resolve => {
    const start = Date.now()
    let settled = false

    const settle = (ok) => {
      if (settled) return
      settled = true
      const latencyMs = ok ? Date.now() - start : Infinity
      resolve({ relay, ok, latencyMs })
    }

    try {
      const ws = new WebSocket(relay)
      const timer = setTimeout(() => { ws.close(); settle(false) }, timeoutMs)
      ws.onopen  = () => { clearTimeout(timer); ws.close(); settle(true) }
      ws.onerror = () => { clearTimeout(timer); settle(false) }
    } catch { settle(false) }
  })
}

/**
 * Probe all relays in parallel.
 * @param {string[]} relays
 * @returns {Promise<Array<{ relay, ok, latencyMs }>>}
 */
export async function probeRelays(relays) {
  const results = await Promise.all(relays.map(r => probeRelay(r)))
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(results)) } catch {}
  return results
}

/**
 * Get cached relay health from sessionStorage.
 */
export function getCachedRelayHealth() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

/**
 * From probe results, pick top N relays by latency (online only).
 * Falls back to all online relays if fewer than N are available,
 * and further falls back to all relays if none are online.
 */
export function getTopRelays(results, n = 3) {
  const online = results
    .filter(r => r.ok && r.latencyMs !== Infinity)
    .sort((a, b) => a.latencyMs - b.latencyMs)
    .map(r => r.relay)

  if (online.length > 0) return online.slice(0, n)

  // All offline — return all of them so the app doesn't break
  return results.map(r => r.relay).slice(0, n)
}