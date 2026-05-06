import { useState, useEffect } from 'react'
import { Box, Typography, Button, Stack, Alert, CircularProgress, Avatar } from '@mui/material'
import { useNavigate, useLocation } from 'react-router-dom'
import LockIcon from '@mui/icons-material/Lock'
import useAuthStore from '@/store/authStore.js'
import { pubkeyToNpub } from '@/utils/nostrValidation.js'

function PinDots({ value, shake }) {
  return (
    <Stack direction="row" spacing={1.5} justifyContent="center" sx={{
      my: 2,
      animation: shake ? 'shake 0.4s ease' : 'none',
      '@keyframes shake': {
        '0%,100%': { transform: 'translateX(0)' },
        '20%,60%': { transform: 'translateX(-8px)' },
        '40%,80%': { transform: 'translateX(8px)' },
      },
    }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Box key={i} sx={{
          width: 16, height: 16, borderRadius: '50%',
          bgcolor: i < value.length ? 'primary.main' : '#2A2A2A',
          border: `2px solid ${i < value.length ? '#FF5722' : '#444'}`,
          transition: 'all 0.15s ease',
        }} />
      ))}
    </Stack>
  )
}

function PinPad({ onPress }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫']
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, maxWidth: 280, mx: 'auto' }}>
      {keys.map((k, i) => (
        k === '' ? <Box key={`empty-${i}`} /> :
        <Button key={`key-${i}`} variant="outlined" onClick={() => onPress(k)} sx={{
          height: 70, fontSize: k === '⌫' ? '1.4rem' : '1.5rem', fontWeight: 700,
          borderColor: '#2A2A2A', color: 'text.primary', bgcolor: '#141414', borderRadius: 10,
          '&:active': { bgcolor: 'rgba(255,87,34,0.15)', borderColor: 'primary.main' },
        }}>
          {k}
        </Button>
      ))}
    </Box>
  )
}

export default function PinUnlock() {
  const navigate      = useNavigate()
  const location      = useLocation()
  const { unlockWithPin, loading, error, setError } = useAuthStore()
  const [pin, setPin]   = useState('')
  const [shake, setShake] = useState(false)
  const [storedIds, setStoredIds] = useState([])
  const [targetPubkey, setTargetPubkey] = useState(null)

  const { getStoredIdentities } = useAuthStore()

  useEffect(() => {
    setError(null)
    getStoredIdentities().then(ids => {
      setStoredIds(ids)
      const pk = location.state?.pubkey ?? ids[0]?.pubkey
      setTargetPubkey(pk)
    })
  }, [])

  async function handlePress(k) {
    if (k === '⌫') { setPin(p => p.slice(0,-1)); return }
    if (pin.length >= 6) return
    const next = pin + k
    setPin(next)
    if (next.length === 6) {
      setTimeout(() => tryUnlock(next), 150)
    }
  }

  async function tryUnlock(pinVal) {
    if (!targetPubkey) return
    try {
      const role = await unlockWithPin(targetPubkey, pinVal)
      navigate(role === 'owner' ? '/owner' : '/rider/discover', { replace: true })
    } catch {
      setShake(true)
      setTimeout(() => { setShake(false); setPin('') }, 500)
    }
  }

  const displayKey = targetPubkey ? pubkeyToNpub(targetPubkey).slice(0,20) + '…' : ''

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', px: 3, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Avatar sx={{ bgcolor: '#1E1E1E', border: '2px solid #333', width: 64, height: 64, mb: 2 }}>
        <LockIcon sx={{ color: 'primary.main', fontSize: 30 }} />
      </Avatar>

      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Enter PIN</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
        {displayKey}
      </Typography>

      <PinDots value={pin} shake={shake} />

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, width: '100%', maxWidth: 320 }}>
          {error}
        </Alert>
      )}

      {loading
        ? <CircularProgress sx={{ color: 'primary.main', mt: 4 }} />
        : <PinPad onPress={handlePress} />
      }

      <Button variant="text" onClick={() => navigate('/login')} sx={{ mt: 3, color: 'text.secondary' }}>
        Use a different key
      </Button>
    </Box>
  )
}
