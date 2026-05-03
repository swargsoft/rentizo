import { useState } from 'react'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import AppLayout from '@/components/Common/AppLayout.jsx'
import BookingCard from '@/components/Booking/BookingCard.jsx'
import { ListSkeleton } from '@/components/Common/LoadingSkeleton.jsx'
import { useOwnerBookings } from '@/hooks/useBookings.js'
import { publishBookingUpdate } from '@/nostr/publish.js'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import db from '@/db/index.js'

const TABS = ['pending','confirmed','completed','rejected']

export default function OwnerBookingMgmt() {
  const [tab, setTab]             = useState(0)
  const { secretKey }             = useAuthStore()
  const showSnackbar              = useUiStore(s => s.showSnackbar)
  const bookings                  = useOwnerBookings(TABS[tab])

  async function updateStatus(booking, status) {
    try {
      await publishBookingUpdate(
        { bookingId: booking.id, status },
        booking.riderPubkey,
        secretKey
      )
      await db.bookings.update(booking.id, { status })
      showSnackbar(`Booking ${status}`, 'success')
    } catch (err) {
      showSnackbar('Error: ' + err.message, 'error')
    }
  }

  return (
    <AppLayout title="Bookings">
      <Tabs
        value={tab} onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ borderBottom: '1px solid #2A2A2A', bgcolor: '#141414' }}
        TabIndicatorProps={{ sx: { bgcolor: 'primary.main' } }}
      >
        {TABS.map((t, i) => (
          <Tab key={t} label={t.charAt(0).toUpperCase() + t.slice(1)}
            sx={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '0.78rem', color: tab === i ? 'primary.main' : 'text.secondary' }} />
        ))}
      </Tabs>

      <Box sx={{ p: 2, pb: 4 }}>
        {bookings === undefined
          ? <ListSkeleton />
          : !bookings.length
            ? <Box sx={{ textAlign: 'center', pt: 6 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No {TABS[tab]} bookings.
                </Typography>
              </Box>
            : bookings.map(b => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  isOwnerView
                  onConfirm={b => updateStatus(b, 'confirmed')}
                  onReject={b => updateStatus(b, 'rejected')}
                  onComplete={b => updateStatus(b, 'completed')}
                />
              ))
        }
      </Box>
    </AppLayout>
  )
}
