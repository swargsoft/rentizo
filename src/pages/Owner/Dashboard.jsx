import { Box, Typography, Stack, Card, CardActionArea, Chip, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useAuthStore from '@/store/authStore.js'
import useNostrStore from '@/store/nostrStore.js'
import db from '@/db/index.js'
import StorefrontIcon  from '@mui/icons-material/Storefront'
import TwoWheelerIcon  from '@mui/icons-material/TwoWheeler'
import BookmarksIcon   from '@mui/icons-material/Bookmarks'
import SyncIcon        from '@mui/icons-material/Sync'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

function StatCard({ icon, label, value, color = 'primary.main', onClick }) {
  return (
    <Card sx={{ flex: 1 }}>
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Box sx={{ color, mb: 1 }}>{icon}</Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color }}>{value ?? '—'}</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      </CardActionArea>
    </Card>
  )
}

export default function OwnerDashboard() {
  const navigate   = useNavigate()
  const { pubkey } = useAuthStore()
  const { syncing, lastSyncAt } = useNostrStore()

  const branches = useLiveQuery(() =>
    pubkey ? db.branches.where('ownerPubkey').equals(pubkey).count() : 0, [pubkey])

  const listings = useLiveQuery(() =>
    pubkey ? db.listings.where('ownerPubkey').equals(pubkey).count() : 0, [pubkey])

  const pendingBookings = useLiveQuery(() =>
    pubkey ? db.bookings.where('ownerPubkey').equals(pubkey).filter(b => b.status === 'pending').count() : 0, [pubkey])

  const confirmedBookings = useLiveQuery(() =>
    pubkey ? db.bookings.where('ownerPubkey').equals(pubkey).filter(b => b.status === 'confirmed').count() : 0, [pubkey])

  const recentBookings = useLiveQuery(() =>
    pubkey ? db.bookings.where('ownerPubkey').equals(pubkey).reverse().limit(3).toArray() : [], [pubkey])

  const syncLabel = lastSyncAt
    ? `Synced ${dayjs(lastSyncAt).fromNow()}`
    : 'Not yet synced'

  return (
    <AppLayout title="Rentizo">
      <Box sx={{ p: 2 }}>
        {/* Sync status */}
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
          {syncing
            ? <SyncIcon sx={{ fontSize: 14, color: 'warning.main', animation: 'spin 1s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />
            : <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
          }
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {syncing ? 'Syncing with relays…' : syncLabel}
          </Typography>
        </Stack>

        {/* Stats grid */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
          <StatCard icon={<StorefrontIcon />} label="Branches" value={branches}
            onClick={() => navigate('/owner/branches')} />
          <StatCard icon={<TwoWheelerIcon />} label="Listings" value={listings}
            onClick={() => navigate('/owner/branches')} />
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
          <StatCard icon={<BookmarksIcon />} label="Pending" value={pendingBookings}
            color="warning.main" onClick={() => navigate('/owner/bookings')} />
          <StatCard icon={<CheckCircleIcon />} label="Active" value={confirmedBookings}
            color="success.main" onClick={() => navigate('/owner/bookings')} />
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Recent bookings */}
        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Recent Bookings</Typography>
        {!recentBookings?.length
          ? <Typography variant="body2" sx={{ color: 'text.secondary' }}>No bookings yet.</Typography>
          : recentBookings.map(b => (
              <Card key={b.id} sx={{ mb: 1 }}>
                <CardActionArea onClick={() => navigate('/owner/bookings')} sx={{ p: 1.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{b.riderName}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {b.items?.[0]?.vehicleName} · {b.startDate} → {b.endDate}
                      </Typography>
                    </Box>
                    <Chip
                      label={b.status}
                      size="small"
                      sx={{
                        fontWeight: 700, fontSize: '0.65rem',
                        bgcolor: b.status === 'pending' ? 'rgba(255,193,7,0.15)' : b.status === 'confirmed' ? 'rgba(105,240,174,0.15)' : '#1E1E1E',
                        color: b.status === 'pending' ? 'warning.main' : b.status === 'confirmed' ? 'success.main' : 'text.secondary',
                      }}
                    />
                  </Stack>
                </CardActionArea>
              </Card>
            ))
        }
      </Box>
    </AppLayout>
  )
}
