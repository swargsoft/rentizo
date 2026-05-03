import { useState, useEffect } from 'react'
import { Box, Typography, Stack, Button, Chip, Alert, Divider } from '@mui/material'
import { useParams, useNavigate } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import UPIQRCode from '@/components/Booking/UPIQRCode.jsx'
import { useBooking } from '@/hooks/useBookings.js'
import { formatINR, buildBookingPaymentLink } from '@/utils/upi.js'
import db from '@/db/index.js'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassIcon   from '@mui/icons-material/HourglassEmpty'
import CancelIcon      from '@mui/icons-material/Cancel'

const STATUS_UI = {
  pending:   { icon: <HourglassIcon sx={{ color: '#FFD740', fontSize: 40 }} />,   label: 'Pending Confirmation', color: 'warning', msg: 'Your request has been sent. Waiting for the owner to confirm.' },
  confirmed: { icon: <CheckCircleIcon sx={{ color: '#69F0AE', fontSize: 40 }} />, label: 'Booking Confirmed!',    color: 'success', msg: 'Show the QR below at pickup and pay the security deposit.' },
  rejected:  { icon: <CancelIcon sx={{ color: '#FF5252', fontSize: 40 }} />,      label: 'Booking Rejected',     color: 'error',   msg: 'The owner could not accommodate your request.' },
  completed: { icon: <CheckCircleIcon sx={{ color: '#69F0AE', fontSize: 40 }} />, label: 'Completed',            color: 'success', msg: 'Ride complete. Thank you for using Rentizo!' },
}

export default function RiderBookingConfirm() {
  const { bookingId } = useParams()
  const navigate      = useNavigate()
  const booking       = useBooking(bookingId)
  const [ownerProfile, setOwnerProfile] = useState(null)

  useEffect(() => {
    if (booking?.ownerPubkey) {
      db.ownerProfiles.get(booking.ownerPubkey).then(setOwnerProfile)
    }
  }, [booking?.ownerPubkey])

  if (!booking) return null

  const ui = STATUS_UI[booking.status] ?? STATUS_UI.pending
  const upiLink = ownerProfile ? buildBookingPaymentLink(booking, ownerProfile) : null

  return (
    <AppLayout title="Booking" showBack>
      <Box sx={{ p: 2, pb: 4 }}>
        {/* Status header */}
        <Box sx={{ textAlign: 'center', py: 3 }}>
          {ui.icon}
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>{ui.label}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 280, mx: 'auto' }}>{ui.msg}</Typography>
        </Box>

        {/* Booking ID */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Chip label={`BK-${booking.id?.slice(0,8).toUpperCase()}`} sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: '#1E1E1E' }} />
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Details */}
        <Stack spacing={0.75} sx={{ mb: 2 }}>
          {booking.items?.map((item, i) => (
            <Stack key={i} direction="row" justifyContent="space-between">
              <Typography variant="body2">{item.vehicleName} ×{item.quantity}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatINR(item.pricePerDay * item.quantity)}/day</Typography>
            </Stack>
          ))}
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{booking.startDate} → {booking.endDate} ({booking.durationDays}d)</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Rental</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(booking.totalAmount)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Security</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>{formatINR(booking.securityAmount)}</Typography>
          </Stack>
        </Stack>

        {/* QR Code — show for pending and confirmed */}
        {(booking.status === 'pending' || booking.status === 'confirmed') && upiLink && (
          <Box sx={{ mt: 2 }}>
            <UPIQRCode
              upiLink={upiLink}
              amount={booking.securityAmount}
              ownerName={ownerProfile?.name ?? 'Owner'}
              bookingId={booking.id}
            />
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              Pay the security deposit when you pick up the vehicle. The owner will confirm payment.
            </Alert>
          </Box>
        )}

        {booking.status === 'completed' && (
          <Button variant="outlined" fullWidth onClick={() => navigate('/rider/bookings')} sx={{ mt: 2 }}>
            View All Bookings
          </Button>
        )}
      </Box>
    </AppLayout>
  )
}
