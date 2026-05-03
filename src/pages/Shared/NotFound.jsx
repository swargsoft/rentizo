import { Box, Typography, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
      <Typography variant="h1" sx={{ fontWeight: 900, color: '#1E1E1E', fontSize: '6rem' }}>404</Typography>
      <Typography variant="h6" sx={{ color: 'text.secondary', mb: 3 }}>Page not found</Typography>
      <Button variant="contained" onClick={() => navigate('/')}>Go Home</Button>
    </Box>
  )
}
