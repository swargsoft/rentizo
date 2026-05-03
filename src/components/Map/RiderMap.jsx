import { useEffect, useRef } from 'react'
import { Box } from '@mui/material'

export default function RiderMap({ branches, userLocation, onBranchClick, selectedBranchId }) {
  const mapRef     = useRef(null)
  const leafletMap = useRef(null)
  const markersRef = useRef({})

  useEffect(() => {
    async function initMap() {
      if (!mapRef.current) return
      const L = (await import('leaflet')).default ?? (await import('leaflet'))

      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const center = userLocation ? [userLocation.lat, userLocation.lng] : [19.076, 72.8777]
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null }

      const map = L.map(mapRef.current, { zoomControl: false }).setView(center, 13)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      leafletMap.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 19,
      }).addTo(map)

      // User location marker
      if (userLocation) {
        const userIcon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#4FC3F7;border:3px solid #fff;box-shadow:0 0 0 4px rgba(79,195,247,0.3)"></div>`,
          iconSize: [16, 16], iconAnchor: [8, 8], className: '',
        })
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon }).addTo(map)
      }
    }
    initMap()
    return () => { if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null } }
  }, [])

  // Update branch markers when branches change
  useEffect(() => {
    const map = leafletMap.current
    if (!map) return

    async function updateMarkers() {
      const L = (await import('leaflet')).default ?? (await import('leaflet'))

      // Remove old markers
      Object.values(markersRef.current).forEach(m => m.remove())
      markersRef.current = {}

      branches?.forEach(branch => {
        if (!branch.lat || !branch.lng) return
        const isSelected = branch.id === selectedBranchId
        const icon = L.divIcon({
          html: `<div style="
            width:${isSelected ? 44 : 36}px;height:${isSelected ? 44 : 36}px;
            border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            background:${isSelected ? 'linear-gradient(135deg,#FF5722,#E64A19)' : 'linear-gradient(135deg,#1E1E1E,#333)'};
            border:${isSelected ? '3px' : '2px'} solid ${isSelected ? '#fff' : '#FF5722'};
            box-shadow:0 4px 12px rgba(255,87,34,${isSelected ? '0.6' : '0.3'})"></div>`,
          iconSize: [isSelected ? 44 : 36, isSelected ? 44 : 36],
          iconAnchor: [isSelected ? 22 : 18, isSelected ? 44 : 36],
          className: '',
        })
        const marker = L.marker([branch.lat, branch.lng], { icon })
          .addTo(map)
          .on('click', () => onBranchClick?.(branch))
        markersRef.current[branch.id] = marker
      })
    }
    updateMarkers()
  }, [branches, selectedBranchId])

  // Pan to user location
  useEffect(() => {
    if (leafletMap.current && userLocation) {
      leafletMap.current.setView([userLocation.lat, userLocation.lng], 13, { animate: true })
    }
  }, [userLocation?.lat, userLocation?.lng])

  return <Box ref={mapRef} sx={{ width: '100%', height: '100%' }} />
}
