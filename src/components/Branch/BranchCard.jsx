import { Card, Box, Typography, Stack, Chip, IconButton } from '@mui/material'
import StorefrontIcon  from '@mui/icons-material/Storefront'
import EditIcon        from '@mui/icons-material/Edit'
import StarIcon        from '@mui/icons-material/Star'
import LocationOnIcon  from '@mui/icons-material/LocationOn'
import TwoWheelerIcon  from '@mui/icons-material/TwoWheeler'

export default function BranchCard({ branch, listingCount = 0, rating = null, onEdit, onPress, showEdit = false }) {
  return (
    <Card sx={{ mb: 1.5, cursor: onPress ? 'pointer' : 'default' }} onClick={onPress}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box sx={{
            width: 48, height: 48, borderRadius: 2, bgcolor: 'rgba(255,87,34,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <StorefrontIcon sx={{ color: 'primary.main' }} />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {branch.branchName}
              </Typography>
              {showEdit && (
                <IconButton
                  size="small"
                  onClick={e => { e.stopPropagation(); onEdit?.() }}
                  sx={{ color: 'text.secondary' }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
              <LocationOnIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography variant="caption" sx={{
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {branch.address}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
              <Chip
                icon={<TwoWheelerIcon sx={{ fontSize: '14px !important' }} />}
                label={`${listingCount} vehicle${listingCount !== 1 ? 's' : ''}`}
                size="small"
                sx={{ bgcolor: '#1E1E1E', color: 'text.secondary', fontWeight: 600 }}
              />
              {rating !== null && (
                <Chip
                  icon={<StarIcon sx={{ fontSize: '14px !important', color: '#FFD740 !important' }} />}
                  label={rating.toFixed(1)}
                  size="small"
                  sx={{ bgcolor: '#1E1E1E', color: '#FFD740', fontWeight: 700 }}
                />
              )}
              {!branch.isActive && (
                <Chip
                  label="Inactive"
                  size="small"
                  sx={{ bgcolor: '#1E1E1E', color: 'error.main', fontWeight: 600 }}
                />
              )}
              {branch.distanceKm !== undefined && (
                <Chip
                  label={branch.distanceKm < 1 ? `${Math.round(branch.distanceKm * 1000)} m` : `${branch.distanceKm.toFixed(1)} km`}
                  size="small"
                  sx={{ bgcolor: '#1E1E1E', color: 'text.secondary', fontWeight: 600 }}
                />
              )}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Card>
  )
}
