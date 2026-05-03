import { useState, useEffect } from 'react'
import { Box, Typography, Button, Stack, TextField, Alert, Divider, List, ListItemButton, ListItemText, ListItemAvatar, Avatar } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import useAuthStore from '@/store/authStore.js'
import { validateNsec } from '@/utils/nostrValidation.js'
import { pubkeyToNpub } from '@/utils/nostrValidation.js'

export default function Login() {
  const navigate = useNavigate()
  const { loginWithNsec, getStoredIdentities, pubkey, sessionUnlocked, role } = useAuthStore()
  const [nsec, setNsec]             = useState('')
  const [error, setError]           = useState('')
  const [storedIds, setStoredIds]   = useState([])

  useEffect(() => {
    if (pubkey && sessionUnlocked) {
      navigate(role === 'owner' ? '/owner' : '/rider/discover', { replace: true })
    }
    getStoredIdentities().then(setStoredIds)
  }, [])

  function handleLogin() {
    const result = validateNsec(nsec.trim())
    if (!result.valid) { setError(result.error); return }
    loginWithNsec(result.secretKey, result.publicKey)
    navigate('/role')
  }

  function handleExistingAccount(identity) {
    navigate('/unlock', { state: { pubkey: identity.pubkey } })
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', px: 3, py: 4, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Welcome Back</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Enter your Nostr private key to continue.
      </Typography>

      {/* Existing accounts on this device */}
      {storedIds.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
            Accounts on this device
          </Typography>
          <List disablePadding sx={{ mt: 1 }}>
            {storedIds.map(id => (
              <ListItemButton
                key={id.pubkey}
                onClick={() => handleExistingAccount(id)}
                sx={{ borderRadius: 2, border: '1px solid #2A2A2A', mb: 1, bgcolor: '#141414' }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: '#FF5722', width: 36, height: 36 }}>
                    <VpnKeyIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.72rem' }}>
                      {pubkeyToNpub(id.pubkey).slice(0, 24)}…
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                      {id.role.charAt(0).toUpperCase() + id.role.slice(1)}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>or use a different key</Typography>
          </Divider>
        </Box>
      )}

      <Stack spacing={2}>
        {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}

        <TextField
          label="Private Key (nsec1...)"
          value={nsec}
          onChange={e => { setNsec(e.target.value); setError('') }}
          type="password"
          multiline
          rows={2}
          placeholder="nsec1..."
          inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
        />

        <Button variant="contained" size="large" onClick={handleLogin} disabled={!nsec.trim()} sx={{ py: 1.5 }}>
          Login
        </Button>

        <Button variant="text" onClick={() => navigate('/')} sx={{ color: 'text.secondary' }}>
          Back
        </Button>
      </Stack>
    </Box>
  )
}
