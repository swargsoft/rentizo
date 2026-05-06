import { useState } from 'react'
import { Box, Typography, Button, Stack, Alert, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'

function PinDots({ value, length = 6 }) {
  return (
    <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ my: 2 }}>
      {Array.from({ length }).map((_, i) => (
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
        <Button
          key={`key-${i}`}
          variant="outlined"
          onClick={() => onPress(k)}
          sx={{
            height: 70, fontSize: k === '⌫' ? '1.4rem' : '1.5rem',
            fontWeight: 700, borderColor: '#2A2A2A', color: 'text.primary',
            bgcolor: '#141414', borderRadius: 10,
            '&:active': { bgcolor: 'rgba(255,87,34,0.15)', borderColor: 'primary.main' },
          }}
        >
          {k}
        </Button>
      ))}
    </Box>
  )
}

export default function PinSetup() {
  const navigate = useNavigate()
  const { saveIdentity, role, loading, error } = useAuthStore()
  const showSnackbar = useUiStore(s => s.showSnackbar)
  const [pin, setPin]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep]       = useState('enter') // 'enter' | 'confirm'

  function handlePress(k) {
    if (k === '⌫') {
      if (step === 'enter')   setPin(p => p.slice(0,-1))
      else                    setConfirm(p => p.slice(0,-1))
      return
    }
    if (step === 'enter' && pin.length < 6) {
      const next = pin + k
      setPin(next)
      if (next.length === 6) setTimeout(() => setStep('confirm'), 200)
    } else if (step === 'confirm' && confirm.length < 6) {
      const next = confirm + k
      setConfirm(next)
      if (next.length === 6) setTimeout(() => handleFinish(next), 200)
    }
  }

  async function handleFinish(confirmPin) {
    if (pin !== confirmPin) {
      showSnackbar('PINs do not match — try again', 'error')
      setConfirm('')
      setStep('enter')
      setPin('')
      return
    }
    try {
      await saveIdentity(role ?? 'rider', pin)
      navigate(role === 'owner' ? '/owner' : '/rider/discover', { replace: true })
    } catch {}
  }

  const currentPin  = step === 'enter' ? pin : confirm
  const title       = step === 'enter' ? 'Set a PIN' : 'Confirm PIN'
  const subtitle    = step === 'enter'
    ? 'This PIN encrypts your private key on this device.'
    : 'Enter your PIN again to confirm.'

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', px: 3, py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5, textAlign: 'center' }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, textAlign: 'center', maxWidth: 280 }}>
        {subtitle}
      </Typography>

      <PinDots value={currentPin} />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2, width: '100%', maxWidth: 320 }}>{error}</Alert>}

      {loading
        ? <CircularProgress sx={{ color: 'primary.main', mt: 4 }} />
        : <PinPad onPress={handlePress} />
      }
    </Box>
  )
}
