import { useEffect } from 'react'
import { probeRelays } from '@/nostr/relayHealth.js'
import useNostrStore from '@/store/nostrStore.js'

/**
 * Automatically probes relay health on mount and at a given interval.
 */
export function useRelayHealthCheck(relays, intervalMs = 5 * 60 * 1000) {
  const setRelayHealthBatch = useNostrStore(s => s.setRelayHealthBatch)

  useEffect(() => {
    if (!relays?.length) return

    async function probe() {
      const results = await probeRelays(relays)
      setRelayHealthBatch(results)
    }

    probe()
    const timer = setInterval(probe, intervalMs)
    return () => clearInterval(timer)
  }, [relays, intervalMs])
}