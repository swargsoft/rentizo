import { useState } from 'react'
import { Box, Typography, Button, Stack, Card, CardActionArea } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler'
import StorefrontIcon from '@mui/icons-material/Storefront'
import SwapHorizIcon  from '@mui/icons-material/SwapHoriz'
import useAuthStore from '@/store/authStore.js'

const ROLES = [
  {
    value: 'rider',
    icon: <TwoWheelerIcon sx={{ fontSize: 40 }} />,
    title: 'Rider',
    description: 'Discover and rent vehicles near you',
  },
  {
    value: 'owner',
    icon: <StorefrontIcon sx={{ fontSize: 40 }} />,
    title: 'Owner',
    description: 'List your vehicles and manage bookings',
  },
  {
    value: 'both',
    icon: <SwapHorizIcon sx={{ fontSize: 40 }} />,
    title: 'Both',
    description: 'Switch between renting and owning',
  },
]

export default function RoleSelect() {
  const navigate    = useNavigate()
  const { updateRole, pubkey } = useAuthStore()
  const [selected, setSelected] = useState('rider')

  async function handleContinue() {
    if (pubkey) {
      await updateRole(selected)
      navigate('/pin-setup')
    } else {
      navigate('/pin-setup')
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', px: 3, py: 6, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>How will you use Rentizo?</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        You can change this later in settings.
      </Typography>

      <Stack spacing={2} sx={{ flex: 1 }}>
        {ROLES.map(role => {
          const isSelected = selected === role.value
          return (
            <Card
              key={role.value}
              sx={{
                border: `2px solid ${isSelected ? '#FF5722' : '#2A2A2A'}`,
                bgcolor: isSelected ? 'rgba(255,87,34,0.08)' : '#141414',
                transition: 'all 0.2s ease',
              }}
            >
              <CardActionArea onClick={() => setSelected(role.value)} sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box sx={{ color: isSelected ? 'primary.main' : 'text.secondary' }}>
                    {role.icon}
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isSelected ? 'primary.main' : 'text.primary' }}>
                      {role.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {role.description}
                    </Typography>
                  </Box>
                  {isSelected && (
                    <Box sx={{ ml: 'auto', width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</Typography>
                    </Box>
                  )}
                </Stack>
              </CardActionArea>
            </Card>
          )
        })}
      </Stack>

      <Button
        variant="contained"
        size="large"
        fullWidth
        onClick={handleContinue}
        sx={{ py: 1.5, mt: 3 }}
      >
        Continue as {ROLES.find(r => r.value === selected)?.title}
      </Button>
    </Box>
  )
}
