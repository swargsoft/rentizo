import { useState, useEffect } from 'react'
import { getCurrentPosition, DEFAULT_LOCATION } from '@/utils/geo.js'
import { getSetting, setSetting } from '@/db/index.js'

export function useGeolocation() {
  const [location, setLocation] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    let cancelled = false
    async function fetchLocation() {
      // Try to restore last known location for instant display
      const cached = await getSetting('lastLocation')
      if (cached && !cancelled) setLocation(cached)

      const pos = await getCurrentPosition()
      if (cancelled) return
      if (pos) {
        setLocation(pos)
        setSetting('lastLocation', pos)
      } else {
        setError('Location unavailable')
        if (!cached) setLocation(DEFAULT_LOCATION)
      }
      setLoading(false)
    }
    fetchLocation()
    return () => { cancelled = true }
  }, [])

  return { location, loading, error }
}
