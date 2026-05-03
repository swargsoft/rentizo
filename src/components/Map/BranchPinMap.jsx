import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'

// Dynamically import Leaflet to avoid SSR issues
let L = null

export default function BranchPinMap({ lat, lng, onLocationChange, height = 220 }) {
  const mapRef       = useRef(null)
  const leafletMap   = useRef(null)
  const markerRef    = useRef(null)

  useEffect(() => {
    async function initMap() {
      if (!mapRef.current) return
      L = await import('leaflet').then(m => m.default ?? m)

      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const center = lat && lng ? [lat, lng] : [19.076, 72.8777]
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null }

      const map = L.map(mapRef.current, { zoomControl: true }).setView(center, 15)
      leafletMap.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const customIcon = L.divIcon({
        html: `<div style="
          width:36px;height:36px;border-radius:50% 50% 50% 0;
          background:linear-gradient(135deg,#FF5722,#E64A19);
          border:3px solid #fff;transform:rotate(-45deg);
          box-shadow:0 4px 12px rgba(255,87,34,0.5)"></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        className: '',
      })

      const marker = L.marker(center, { icon: customIcon, draggable: true }).addTo(map)
      markerRef.current = marker

      marker.on('dragend', () => {
        const { lat: newLat, lng: newLng } = marker.getLatLng()
        onLocationChange?.(newLat, newLng)
      })

      map.on('click', (e) => {
        marker.setLatLng(e.latlng)
        onLocationChange?.(e.latlng.lat, e.latlng.lng)
      })
    }

    initMap()
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null } }
  }, [])

  // Update marker when lat/lng props change externally
  useEffect(() => {
    if (markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng])
      leafletMap.current?.setView([lat, lng], 15)
    }
  }, [lat, lng])

  return (
    <Box ref={mapRef} sx={{ width: '100%', height, borderRadius: 2, overflow: 'hidden', border: '1px solid #2A2A2A' }} />
  )
}
