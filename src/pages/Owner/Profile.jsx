import { useState, useEffect } from 'react'
import { Box, Typography, Button, Stack, TextField, Avatar, Alert, CircularProgress, IconButton } from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { useOwnerProfile } from '@/hooks/useNostrProfile.js'
import { publishOwnerProfile } from '@/nostr/publish.js'
import { validatePhone, validateUpiId, formatPhone } from '@/utils/nostrValidation.js'
import db from '@/db/index.js'
import driveApi from '@/utils/driveApi.js'


export default function OwnerProfile() {
  const { pubkey, secretKey } = useAuthStore()
  const showSnackbar = useUiStore(s => s.showSnackbar)
  const profile = useOwnerProfile()

  const [name,    setName]    = useState('')
  const [phone,   setPhone]   = useState('')
  const [upiId,   setUpiId]   = useState('')
  const [avatar,  setAvatar]  = useState(null)   // base64 or blob URL
  const [saving,  setSaving]  = useState(false)
  const [errors,  setErrors]  = useState({})
  const [avatarFile,  setAvatarFile]  = useState(null)
  const [bannerFile,  setBannerFile]  = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setPhone(profile.phone ?? '')
      setUpiId(profile.upiId ?? '')
      // Restore avatar from Drive CDN URL when no local blob selected
      if (profile.profilePicture && !avatarFile) {
        setAvatar(driveApi.constructor.imageUrl(profile.profilePicture))
      }
      // Restore banner preview from Drive CDN URL
      if (profile.bannerImage && !bannerFile) {
        setBannerPreview(driveApi.constructor.imageUrl(profile.bannerImage))
      }
    }
  }, [profile])

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const { compressProfileImage } = await import('@/utils/imageCompression.js')
    const compressed = await compressProfileImage(file)
    setAvatarFile(compressed)
    setAvatar(URL.createObjectURL(compressed))
  }

  async function handleBannerChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }
  function validate() {
    const errs = {}
    if (!name.trim())           errs.name  = 'Name is required'
    if (!validatePhone(phone).valid) errs.phone = validatePhone(phone).error
    if (!validateUpiId(upiId).valid) errs.upiId = validateUpiId(upiId).error
    setErrors(errs)
    return !Object.keys(errs).length
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      let profilePicture = profile?.profilePicture ?? ''
      let bannerImage    = profile?.bannerImage    ?? ''

      if (avatarFile) {
        profilePicture = await driveApi.uploadProfilePhoto(avatarFile)
      }
      if (bannerFile) {
        bannerImage = await driveApi.uploadBanner(bannerFile)
      }

      const ts   = Math.floor(Date.now() / 1000)
      const data = { name: name.trim(), phone: formatPhone(phone), upiId: upiId.trim(), profilePicture, bannerImage, updatedAt: ts }
      await publishOwnerProfile(data, secretKey)
      await db.ownerProfiles.put({ pubkey, ...data })
      showSnackbar('Profile saved!', 'success')
    } catch (err) {
      showSnackbar('Error: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="Owner Profile">
      <Box sx={{ p: 2, pb: 4 }}>

        {/* Banner + Avatar Section */}
        <Box sx={{ position: 'relative', mb: 8 }}>
          {/* Banner */}
          <Box
            sx={{
              width: '100%',
              height: 180,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderBottomLeftRadius: 8,
              borderBottomRightRadius: 8,
              overflow: 'hidden',
              position: 'relative',
              bgcolor: '#1E1E1E',
              border: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('banner-input').click()}
          >
            {(bannerPreview || profile?.bannerImage) ? (
              <img
                src={
                  bannerPreview ||
                  driveApi.constructor.imageUrl(profile.bannerImage)
                }
                alt="banner"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#0F172A',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  Add Banner Image
                </Typography>
              </Box>
            )}

            {/* Banner Edit Button */}
            <IconButton
              component="label"
              sx={{
                position: 'absolute',
                top: 12,
                right: 12,
                bgcolor: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                width: 38,
                height: 38,
                '&:hover': {
                  bgcolor: 'rgba(0,0,0,0.8)',
                },
              }}
            >
              <CameraAltIcon sx={{ fontSize: 18 }} />
              <input
                id="banner-input"
                type="file"
                hidden
                accept="image/*"
                onChange={handleBannerChange}
              />
            </IconButton>
          </Box>

          {/* Profile Avatar */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -55,
              left: 24,
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Avatar
                imgProps={{
                  referrerPolicy: 'no-referrer',
                }}
                src={
                  avatar ||
                  (profile?.profilePicture
                    ? driveApi.constructor.imageUrl(profile.profilePicture)
                    : null)
                }
                sx={{
                  width: 110,
                  height: 110,
                  border: '5px solid',
                  borderColor: 'background.paper',
                  bgcolor: '#333',
                  fontSize: 42,
                  boxShadow: 4,
                }}
              >
                {name?.[0]?.toUpperCase() ?? '?'}
              </Avatar>

              {/* Avatar Edit Button */}
              <IconButton
                component="label"
                sx={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  bgcolor: '#fff',
                  color: '#111',
                  width: 34,
                  height: 34,
                  boxShadow: 3,
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  },
                }}
              >
                <CameraAltIcon sx={{ fontSize: 18 }} />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </IconButton>
            </Box>
          </Box>
        </Box>

        <Stack spacing={2.5}>
          <TextField
            label="Full Name" value={name} onChange={e => setName(e.target.value)}
            error={!!errors.name} helperText={errors.name}
          />
          <TextField
            label="Phone Number" value={phone} onChange={e => setPhone(e.target.value)}
            type="tel" placeholder="+91 98765 43210"
            error={!!errors.phone} helperText={errors.phone}
          />
          <TextField
            label="UPI ID" value={upiId} onChange={e => setUpiId(e.target.value)}
            placeholder="yourname@upi"
            error={!!errors.upiId} helperText={errors.upiId}
          />

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Your UPI ID is shared with riders only in encrypted booking messages.
          </Alert>

          <Button variant="contained" size="large" onClick={handleSave} disabled={saving} sx={{ py: 1.5 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Save Profile'}
          </Button>
        </Stack>
      </Box>
    </AppLayout>
  )
}
