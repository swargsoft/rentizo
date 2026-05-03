import { useEffect } from 'react'
import { getPendingEvents, removePendingEvent } from '@/db/index.js'
import { publishToRelays } from '@/nostr/client.js'

export function useOfflineQueue() {
  useEffect(() => {
    async function flush() {
      if (!navigator.onLine) return
      const pending = await getPendingEvents()
      for (const item of pending) {
        try {
          const event = JSON.parse(item.eventJson)
          await publishToRelays(event)
          await removePendingEvent(item.id)
        } catch {
          // Will retry on next online event
        }
      }
    }

    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])
}
