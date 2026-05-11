import {
  Box,
  Typography,
  IconButton,
  CardMedia,
  Avatar,
} from '@mui/material'
import CameraAltIcon from '@mui/icons-material/CameraAlt'
import { styled } from '@mui/material/styles'

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
})

// Crop presets configuration
export const CROP_PRESETS = {
  avatar: {
    aspectRatio: 1,
    title: 'Crop Profile Photo',
    width: 400,
    height: 400,
  },
  banner: {
    aspectRatio: 2,
    title: 'Crop Banner Image',
    width: 1200,
    height: 600,
  },
  listing: {
    aspectRatio: 16 / 9,
    title: 'Crop Listing Image',
    width: 1200,
    height: 675,
  },
}

// Normalize Google Drive / Googleusercontent URLs
const normalizeImageUrl = (url, cacheKey) => {
  if (!url) return ''

  if (url.startsWith('blob:')) return url

  let finalUrl = url

  // Google image sizing
  if (url.includes('lh3.googleusercontent.com') && !url.includes('=')) {
    finalUrl = `${url}=w1200`
  }

  // Google Drive links
  else if (url.includes('drive.google.com')) {
    const match = url.match(/[-\w]{25,}/)

    if (match?.[0]) {
      finalUrl = `https://drive.google.com/thumbnail?id=${match[0]}&sz=w1200`
    }
  }

  // Cache busting
  if (cacheKey) {
    finalUrl += `${finalUrl.includes('?') ? '&' : '?'}v=${cacheKey}`
  }

  return finalUrl
}

export default function ProfileMedia({
  avatarSrc,
  bannerSrc,
  cacheKey,
  editable = false,
  onAvatarChange,
  onBannerChange,
  name = '',
  bannerHeight = 180,
  avatarSize = 110,
  avatarOffset = -55,
  avatarBorderWidth = 5,
}) {
const finalAvatarSrc = normalizeImageUrl(avatarSrc, cacheKey)
const finalBannerSrc = normalizeImageUrl(bannerSrc, cacheKey)

  const hasBanner = !!finalBannerSrc
  const hasAvatar = !!finalAvatarSrc

  return (
    <Box sx={{ position: 'relative', mb: 8 }}>
      {/* Banner */}
      <Box
        sx={{
          width: '100%',
          height: bannerHeight,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '16px 16px 8px 8px',
          bgcolor: '#1E1E1E',
          border: '1px solid',
          borderColor: 'divider',
        }}
    >
        {hasBanner ? (
          <CardMedia
            component="img"
            image={finalBannerSrc}
            alt="banner"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '16px 16px 8px 8px',
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
        {editable && onBannerChange && (
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

            <VisuallyHiddenInput
              type="file"
              accept="image/*"
              onChange={onBannerChange}
            />
          </IconButton>
        )}
      </Box>

      {/* Avatar */}
      <Box
        sx={{
          position: 'absolute',
          bottom: avatarOffset,
          left: 24,
        }}
      >
        <Box sx={{ position: 'relative' }}>
          {hasAvatar ? (
            <Avatar
              src={finalAvatarSrc}
              alt="avatar"
              imgProps={{
                crossOrigin: 'anonymous',
                referrerPolicy: 'no-referrer',
              }}
              sx={{
                width: avatarSize,
                height: avatarSize,
                border: `${avatarBorderWidth}px solid`,
                borderColor: 'background.paper',
                boxShadow: 4,
                bgcolor: '#333',
                fontSize: avatarSize * 0.38,
                fontWeight: 'bold',
              }}
            >
              {name?.[0]?.toUpperCase() ?? '?'}
            </Avatar>
          ) : (
            <Avatar
              sx={{
                width: avatarSize,
                height: avatarSize,
                border: `${avatarBorderWidth}px solid`,
                borderColor: 'background.paper',
                bgcolor: '#333',
                boxShadow: 4,
                fontSize: avatarSize * 0.38,
                color: '#fff',
                fontWeight: 'bold',
              }}
            >
              {name?.[0]?.toUpperCase() ?? '?'}
            </Avatar>
          )}

          {/* Avatar Edit Button */}
          {editable && onAvatarChange && (
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

              <VisuallyHiddenInput
                type="file"
                accept="image/*"
                onChange={onAvatarChange}
              />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  )
}