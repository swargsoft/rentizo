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
      const timer = setTimeout(() => {
        ws.close()
        settle(false)
      }, timeoutMs)

      ws.onopen = () => {
        clearTimeout(timer)
        ws.close()
        settle(true)
      }
      ws.onerror = () => {
        clearTimeout(timer)
        settle(false)
      }
    } catch {
      settle(false)
    }
  })
}

/**
 * Probe all relays in parallel.
 * @param {string[]} relays
 * @returns {Promise<Array<{ relay, ok, latencyMs }>>}
 */
export async function probeRelays(relays) {
  const results = await Promise.all(relays.map(r => probeRelay(r)))
  // Cache to sessionStorage
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(results))
  } catch {}
  return results
}

/**
 * Get cached relay health from sessionStorage.
 */
export function getCachedRelayHealth() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}