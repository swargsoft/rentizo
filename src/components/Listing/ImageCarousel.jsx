import { useState } from 'react'
import { Box, IconButton, Typography } from '@mui/material'
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TwoWheelerIcon   from '@mui/icons-material/TwoWheeler'

export default function ImageCarousel({ urls = [], height = 220 }) {
  const [idx, setIdx] = useState(0)
  if (!urls.length) {
    return (
      <Box sx={{ height, bgcolor: '#1E1E1E', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
        <TwoWheelerIcon sx={{ fontSize: 56, color: '#333' }} />
      </Box>
    )
  }
  return (
    <Box sx={{ position: 'relative', height, borderRadius: 2, overflow: 'hidden', bgcolor: '#1E1E1E' }}>
      <img src={urls[idx]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {urls.length > 1 && (
        <>
          <IconButton onClick={() => setIdx(i => (i - 1 + urls.length) % urls.length)}
            sx={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', width: 32, height: 32 }}>
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={() => setIdx(i => (i + 1) % urls.length)}
            sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', bgcolor: 'rgba(0,0,0,0.6)', color: '#fff', width: 32, height: 32 }}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
          <Box sx={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 0.75 }}>
            {urls.map((_, i) => (
              <Box key={i} onClick={() => setIdx(i)} sx={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, bgcolor: i === idx ? '#FF5722' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.2s' }} />
            ))}
          </Box>
        </>
      )}
      <Box sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(0,0,0,0.6)', borderRadius: 10, px: 1, py: 0.25 }}>
        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700 }}>{idx + 1}/{urls.length}</Typography>
      </Box>
    </Box>
  )
}
