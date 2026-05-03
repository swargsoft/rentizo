import { useState, useEffect } from 'react'
import { Box, Typography, Stack, Button, TextField, Switch, FormControlLabel, Divider, Alert } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { getSetting, setSetting } from '@/db/index.js'
import { setRelays, DEFAULT_RELAYS } from '@/nostr/client.js'
import { pubkeyToNpub, secretKeyToNsec } from '@/utils/nostrValidation.js'
import { secretKeyToHex } from '@/utils/keyEncryption.js'

export default function Settings() {
  const navigate     = useNavigate()
  const { pubkey, secretKey, role, logout, updateRole } = useAuthStore()
  const showSnackbar = useUiStore(s => s.showSnackbar)
  const showConfirm  = useUiStore(s => s.showConfirm)
  const [relayInput, setRelayInput] = useState(DEFAULT_RELAYS.join('\n'))
  const [showNsec,   setShowNsec]   = useState(false)

  useEffect(() => {
    getSetting('relays').then(saved => { if (saved?.length) setRelayInput(saved.join('\n')) })
  }, [])

  async function handleSaveRelays() {
    const relays = relayInput.split('\n').map(r => r.trim()).filter(r => r.startsWith('wss://'))
    if (!relays.length) { showSnackbar('Enter at least one valid wss:// relay', 'error'); return }
    await setSetting('relays', relays)
    setRelays(relays)
    showSnackbar('Relays updated', 'success')
  }

  function handleLogout() {
    showConfirm('Log Out?', 'Your encrypted key stays on this device. You can log back in with your PIN.', () => {
      logout()
      navigate('/', { replace: true })
    })
  }

  const nsec = secretKey ? secretKeyToNsec(secretKey) : ''

  return (
    <AppLayout title="Settings" showBack>
      <Box sx={{ p: 2, pb: 4 }}>
        <Stack spacing={3}>
          {/* Identity */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Identity</Typography>
            <Box sx={{ p: 1.5, bgcolor: '#141414', borderRadius: 2, border: '1px solid #2A2A2A', mb: 1.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>Public Key (npub)</Typography>
              <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', color: 'success.main', wordBreak: 'break-all', fontSize: '0.65rem', mt: 0.5 }}>
                {pubkey ? pubkeyToNpub(pubkey) : '—'}
              </Typography>
            </Box>

            <Button variant="outlined" size="small" onClick={() => setShowNsec(v => !v)}
              sx={{ borderColor: '#333', color: 'warning.main', mb: showNsec ? 1 : 0 }}>
              {showNsec ? 'Hide' : 'Show'} Private Key (nsec)
            </Button>

            {showNsec && (
              <Alert severity="warning" sx={{ mt: 1, borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}>
                  {nsec}
                </Typography>
              </Alert>
            )}
          </Box>

          <Divider />

          {/* Role */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Role</Typography>
            <Stack direction="row" spacing={1}>
              {['owner','rider','both'].map(r => (
                <Button key={r} variant={role === r ? 'contained' : 'outlined'}
                  size="small" onClick={() => updateRole(r)}
                  sx={{ textTransform: 'capitalize', borderColor: '#333', flex: 1 }}>
                  {r}
                </Button>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Relays */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>Nostr Relays</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
              One relay URL per line (wss://…)
            </Typography>
            <TextField multiline rows={5} value={relayInput} onChange={e => setRelayInput(e.target.value)}
              inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.75rem' } }} />
            <Button variant="outlined" size="small" onClick={handleSaveRelays} sx={{ mt: 1, borderColor: '#333' }}>
              Save Relays
            </Button>
          </Box>

          <Divider />

          <Button variant="outlined" color="error" onClick={handleLogout} sx={{ borderColor: '#FF5252', py: 1.5 }}>
            Log Out
          </Button>
        </Stack>
      </Box>
    </AppLayout>
  )
}
