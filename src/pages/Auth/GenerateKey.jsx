import { useState } from 'react'
import { Box, Typography, Button, Stack, Alert, IconButton, Tooltip, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import VisibilityIcon  from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import useAuthStore from '@/store/authStore.js'

export default function GenerateKey() {
  const navigate = useNavigate()
  const generateNewKeypair = useAuthStore(s => s.generateNewKeypair)
  const [keys, setKeys]       = useState(null)
  const [showNsec, setShowNsec] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  function handleGenerate() {
    const kp = generateNewKeypair()
    setKeys(kp)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(keys.nsec)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', px: 3, py: 4, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.5 }}>Create Account</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Your <strong>Identity keypair</strong> is your identity on Rentizo.
      </Typography>

      {!keys ? (
        <Stack spacing={3}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            We'll generate a private key for you. <strong>Save it somewhere safe</strong> — it's the only way to recover your account.
          </Alert>
          <Button variant="contained" size="large" onClick={handleGenerate} sx={{ py: 1.5 }}>
            Generate My Keys
          </Button>
        </Stack>
      ) : (
        <Stack spacing={3} sx={{ flex: 1 }}>
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: 2 }}>
            <strong>Save your private key now.</strong> It cannot be recovered if lost.
          </Alert>

          {/* Public key */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Public Key (npub) — safe to share
            </Typography>
            <Box sx={{ mt: 0.5, p: 1.5, bgcolor: '#1E1E1E', borderRadius: 2, border: '1px solid #2A2A2A' }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'success.main', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                {keys.npub}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Private key */}
          <Box>
            <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Private Key (nsec) — NEVER share this
            </Typography>
            <Box sx={{ mt: 0.5, p: 1.5, bgcolor: '#1A0A0A', borderRadius: 2, border: '1px solid #FF5252', position: 'relative' }}>
              <Typography variant="caption" sx={{
                fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.7rem',
                color: showNsec ? 'error.light' : 'transparent',
                textShadow: showNsec ? 'none' : '0 0 8px rgba(255,82,82,0.5)',
                filter: showNsec ? 'none' : 'blur(4px)',
                userSelect: showNsec ? 'text' : 'none',
              }}>
                {keys.nsec}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Tooltip title={showNsec ? 'Hide' : 'Reveal'}>
                  <IconButton size="small" onClick={() => setShowNsec(v => !v)} sx={{ color: 'error.main' }}>
                    {showNsec ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={copied ? 'Copied!' : 'Copy nsec'}>
                  <IconButton size="small" onClick={handleCopy} sx={{ color: copied ? 'success.main' : 'text.secondary' }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Box>

          {/* Confirm checkbox */}
          <Box
            onClick={() => setConfirmed(v => !v)}
            sx={{
              display: 'flex', alignItems: 'flex-start', gap: 1.5, cursor: 'pointer',
              p: 1.5, borderRadius: 2, border: `1px solid ${confirmed ? '#FF5722' : '#2A2A2A'}`,
              bgcolor: confirmed ? 'rgba(255,87,34,0.08)' : '#141414',
            }}
          >
            <Box sx={{
              width: 20, height: 20, borderRadius: 1, border: `2px solid ${confirmed ? '#FF5722' : '#444'}`,
              bgcolor: confirmed ? '#FF5722' : 'transparent', flexShrink: 0, mt: 0.2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {confirmed && <Typography sx={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</Typography>}
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
              I have saved my private key. I understand it cannot be recovered if lost.
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            disabled={!confirmed}
            onClick={() => navigate('/role')}
            sx={{ py: 1.5, mt: 'auto' }}
          >
            Continue
          </Button>
        </Stack>
      )}
    </Box>
  )
}
