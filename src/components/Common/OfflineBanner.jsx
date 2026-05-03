import { useState, useEffect } from 'react'
import { Collapse, Box, Typography } from '@mui/material'
import WifiOffIcon from '@mui/icons-material/WifiOff'

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on  = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  return (
    <Collapse in={offline}>
      <Box sx={{ bgcolor: '#FF8F00', px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
        <WifiOffIcon sx={{ fontSize: 16, color: '#000' }} />
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#000' }}>
          You're offline — showing cached data
        </Typography>
      </Box>
    </Collapse>
  )
}
