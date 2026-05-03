import { Box, Typography, Card, Stack, Chip, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import { useRiderBookings } from '@/hooks/useBookings.js'
import { ListSkeleton } from '@/components/Common/LoadingSkeleton.jsx'
import { formatINR } from '@/utils/upi.js'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: 'warning' },
  confirmed: { label: 'Confirmed', color: 'success' },
  rejected:  { label: 'Rejected',  color: 'error' },
  completed: { label: 'Completed', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'default' },
}

export default function RiderMyBookings() {
  const navigate  = useNavigate()
  const bookings  = useRiderBookings()

  return (
    <AppLayout title="My Bookings">
      <Box sx={{ p: 2, pb: 4 }}>
        {bookings === undefined
          ? <ListSkeleton />
          : !bookings.length
            ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 8, gap: 2 }}>
                <ReceiptLongIcon sx={{ fontSize: 64, color: '#2A2A2A' }} />
                <Typography variant="h6" sx={{ color: 'text.secondary' }}>No bookings yet</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Browse vehicles to make your first booking.</Typography>
              </Box>
            )
            : [...bookings].reverse().map(b => {
                const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending
                return (
                  <Card key={b.id} sx={{ mb: 1.5, cursor: 'pointer' }} onClick={() => navigate(`/rider/booking/${b.id}`)}>
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{b.branchName}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                            BK-{b.id?.slice(0,8).toUpperCase()}
                          </Typography>
                        </Box>
                        <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700, height: 22 }} />
                      </Stack>
                      <Stack spacing={0.25}>
                        {b.items?.slice(0,2).map((item, i) => (
                          <Typography key={i} variant="caption" sx={{ color: 'text.secondary' }}>
                            {item.vehicleName} ×{item.quantity}
                          </Typography>
                        ))}
                        {b.items?.length > 2 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>+{b.items.length - 2} more</Typography>
                        )}
                      </Stack>
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{b.startDate} → {b.endDate}</Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{formatINR(b.grandTotal ?? b.totalAmount)}</Typography>
                      </Stack>
                    </Box>
                  </Card>
                )
              })
        }
      </Box>
    </AppLayout>
  )
}
