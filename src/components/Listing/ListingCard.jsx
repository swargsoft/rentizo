import { Card, CardActionArea, Box, Typography, Stack, Chip, IconButton } from '@mui/material'
import EditIcon       from '@mui/icons-material/Edit'
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler'
import { formatINR } from '@/utils/upi.js'

const TYPE_LABELS = { bike:'Bike', scooter:'Scooter', cycle:'Cycle', car:'Car', other:'Other' }

export default function ListingCard({ listing, imageUrl, onEdit, onPress, showEdit = false }) {
  const isAvailable = !listing.isBooked && listing.isPublished

  return (
    <Card sx={{ mb: 1.5 }}>
      <CardActionArea onClick={onPress} sx={{ display: 'flex', alignItems: 'stretch', p: 0 }}>
        {/* Image */}
        <Box sx={{
          width: 90, flexShrink: 0, bgcolor: '#1E1E1E', borderRadius: '12px 0 0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {imageUrl
            ? <img src={imageUrl} alt={listing.vehicleName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <TwoWheelerIcon sx={{ color: '#333', fontSize: 36 }} />
          }
        </Box>

        {/* Info */}
        <Box sx={{ flex: 1, p: 1.5, minWidth: 0 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, noWrap: true }}>{listing.vehicleName}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>{listing.vehicleNumber}</Typography>
            </Box>
            {showEdit && (
              <IconButton component="span" size="small" onClick={e => { e.stopPropagation(); onEdit?.() }} sx={{ color: 'text.secondary', mt: -0.5 }}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>

          <Stack direction="row" spacing={0.75} sx={{ mt: 1 }} flexWrap="wrap" gap={0.5}>
            <Chip label={TYPE_LABELS[listing.vehicleType] ?? listing.vehicleType} size="small"
              sx={{ bgcolor: '#1E1E1E', color: 'text.secondary', fontWeight: 600, height: 20 }} />
            <Chip label={`Qty: ${listing.quantity}`} size="small"
              sx={{ bgcolor: '#1E1E1E', color: 'text.secondary', fontWeight: 600, height: 20 }} />
            <Chip
              label={!listing.isPublished ? 'Draft' : isAvailable ? 'Available' : 'Booked'}
              size="small"
              sx={{
                height: 20, fontWeight: 700,
                bgcolor: !listing.isPublished ? '#1E1E1E' : isAvailable ? 'rgba(105,240,174,0.12)' : 'rgba(255,82,82,0.12)',
                color: !listing.isPublished ? 'text.secondary' : isAvailable ? 'success.main' : 'error.main',
              }}
            />
          </Stack>

          <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', mt: 0.75 }}>
            {formatINR(listing.pricePerDay)}<Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 400 }}>/day</Typography>
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  )
}
