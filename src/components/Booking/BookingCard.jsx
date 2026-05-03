import { Card, Box, Typography, Stack, Chip, Button, Divider } from '@mui/material'
import PersonIcon      from '@mui/icons-material/Person'
import PhoneIcon       from '@mui/icons-material/Phone'
import CalendarIcon    from '@mui/icons-material/CalendarToday'
import { formatINR }   from '@/utils/upi.js'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'success' },
  rejected:  { label: 'Rejected',  color: 'error' },
  completed: { label: 'Completed', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'default' },
}

export default function BookingCard({ booking, onConfirm, onReject, onComplete, isOwnerView = false }) {
  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending
  return (
    <Card sx={{ mb: 2 }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            BK-{booking.id?.slice(0,8).toUpperCase()}
          </Typography>
          <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700, height: 22 }} />
        </Stack>

        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          {booking.items?.map((item, i) => (
            <Typography key={i} variant="body2" sx={{ fontWeight: 600 }}>
              {item.vehicleName} <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>×{item.quantity}</Typography>
            </Typography>
          ))}
        </Stack>

        <Divider sx={{ my: 1 }} />

        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {booking.startDate} → {booking.endDate} ({booking.durationDays}d)
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption">{booking.riderName}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" component="a" href={`tel:${booking.riderPhone}`} sx={{ color: 'primary.main', textDecoration: 'none' }}>
              {booking.riderPhone}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Rental</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(booking.totalAmount)}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Security</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>{formatINR(booking.securityAmount)}</Typography>
          </Box>
        </Stack>

        {isOwnerView && booking.status === 'pending' && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="outlined" color="error" size="small" fullWidth onClick={() => onReject?.(booking)}
              sx={{ borderColor: '#FF5252' }}>Reject</Button>
            <Button variant="contained" size="small" fullWidth onClick={() => onConfirm?.(booking)}>Confirm</Button>
          </Stack>
        )}
        {isOwnerView && booking.status === 'confirmed' && (
          <Button variant="outlined" size="small" fullWidth sx={{ mt: 2, borderColor: '#69F0AE', color: 'success.main' }}
            onClick={() => onComplete?.(booking)}>
            Mark as Completed
          </Button>
        )}
      </Box>
    </Card>
  )
}
