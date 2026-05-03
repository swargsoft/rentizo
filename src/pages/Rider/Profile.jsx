import { useState, useEffect } from 'react'
import { Box, Typography, Button, Stack, TextField, Avatar, CircularProgress, IconButton } from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { useRiderProfile } from '@/hooks/useNostrProfile.js'
import { publishRiderProfile } from '@/nostr/publish.js'
import { validatePhone, formatPhone } from '@/utils/nostrValidation.js'
import { compressProfileImage } from '@/utils/imageCompression.js'
import { storeProfileImage, blobToBase64 } from '@/db/cache.js'
import db from '@/db/index.js'

export default function RiderProfile() {
  const { pubkey, secretKey } = useAuthStore()
  const showSnackbar = useUiStore(s => s.showSnackbar)
  const profile = useRiderProfile()

  const [name,       setName]       = useState('')
  const [phone,      setPhone]      = useState('')
  const [avatar,     setAvatar]     = useState(null)
  const [avatarBlob, setAvatarBlob] = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [errors,     setErrors]     = useState({})

  useEffect(() => {
    if (profile) { setName(profile.name ?? ''); setPhone(profile.phone ?? '') }
  }, [profile])

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const compressed = await compressProfileImage(file)
    setAvatarBlob(compressed)
    setAvatar(URL.createObjectURL(compressed))
  }

  function validate() {
    const errs = {}
    if (!name.trim()) errs.name = 'Name is required'
    if (!validatePhone(phone).valid) errs.phone = validatePhone(phone).error
    setErrors(errs)
    return !Object.keys(errs).length
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      let profilePicture = profile?.profilePicture ?? ''
      if (avatarBlob) {
        await storeProfileImage(pubkey, avatarBlob)
        profilePicture = await blobToBase64(avatarBlob)
      }
      const data = { name: name.trim(), phone: formatPhone(phone), profilePicture }
      await publishRiderProfile(data, secretKey)
      await db.riderProfiles.put({ pubkey, ...data, updatedAt: Math.floor(Date.now()/1000) })
      showSnackbar('Profile saved!', 'success')
    } catch (err) {
      showSnackbar('Error: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="My Profile">
      <Box sx={{ p: 2, pb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar src={avatar || profile?.profilePicture} sx={{ width: 80, height: 80, bgcolor: '#FF5722', fontSize: '2rem' }}>
              {name?.[0]?.toUpperCase() ?? '?'}
            </Avatar>
            <IconButton component="label"
              sx={{ position: 'absolute', bottom: -4, right: -4, bgcolor: '#FF5722', width: 28, height: 28, '&:hover': { bgcolor: '#E64A19' } }}>
              <CameraAltIcon sx={{ fontSize: 14, color: '#fff' }} />
              <input type="file" hidden accept="image/*" onChange={handleAvatarChange} />
            </IconButton>
          </Box>
        </Box>

        <Stack spacing={2.5}>
          <TextField label="Your Name" value={name} onChange={e => setName(e.target.value)}
            error={!!errors.name} helperText={errors.name} />
          <TextField label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)}
            type="tel" placeholder="+91 98765 43210"
            error={!!errors.phone} helperText={errors.phone} />
          <Button variant="contained" size="large" onClick={handleSave} disabled={saving} sx={{ py: 1.5 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Save Profile'}
          </Button>
        </Stack>
      </Box>
    </AppLayout>
  )
}
