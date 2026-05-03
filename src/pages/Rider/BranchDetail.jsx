import { useState, useEffect } from 'react'
import { Box, Typography, Stack, Button, Chip, Divider, Avatar, IconButton } from '@mui/material'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import ImageCarousel from '@/components/Listing/ImageCarousel.jsx'
import ReviewList from '@/components/Branch/ReviewList.jsx'
import { ListSkeleton } from '@/components/Common/LoadingSkeleton.jsx'
import { useBranch } from '@/hooks/useBranches.js'
import { useListingsByBranch } from '@/hooks/useListings.js'
import { useListingImages } from '@/hooks/useImageCache.js'
import { useLiveQuery } from 'dexie-react-hooks'
import { fetchBranchReviews } from '@/nostr/subscribe.js'
import useCartStore from '@/store/cartStore.js'
import useUiStore from '@/store/uiStore.js'
import db from '@/db/index.js'
import { formatINR } from '@/utils/upi.js'
import AddIcon      from '@mui/icons-material/Add'
import RemoveIcon   from '@mui/icons-material/Remove'
import PhoneIcon    from '@mui/icons-material/Phone'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import StarIcon     from '@mui/icons-material/Star'
import TwoWheelerIcon from '@mui/icons-material/TwoWheeler'

function VehicleRow({ listing, branchId, branchName }) {
  const { urls } = useListingImages(listing.id, 5)
  const { addItem, updateQuantity, getQuantity, isInCart, branchId: cartBranchId } = useCartStore()
  const showConfirm  = useUiStore(s => s.showConfirm)
  const showSnackbar = useUiStore(s => s.showSnackbar)
  const qty = getQuantity(listing.id)

  async function handleAdd() {
    if (cartBranchId && cartBranchId !== branchId) {
      showConfirm('Replace Cart?', 'Adding this item will clear vehicles from another branch.', async () => {
        await addItem(branchId, branchName, listing, 1)
      })
      return
    }
    await addItem(branchId, branchName, listing, 1)
    showSnackbar('Added to cart', 'success')
  }

  const available = !listing.isBooked

  return (
    <Box sx={{ mb: 2 }}>
      <ImageCarousel urls={urls} height={180} />
      <Box sx={{ mt: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{listing.vehicleName}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{listing.vehicleNumber}</Typography>
          </Box>
          <Chip
            label={available ? `${listing.quantity} avail.` : 'Booked'}
            size="small"
            sx={{ fontWeight: 700, bgcolor: available ? 'rgba(105,240,174,0.12)' : 'rgba(255,82,82,0.12)', color: available ? 'success.main' : 'error.main' }}
          />
        </Stack>

        {listing.description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{listing.description}</Typography>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
              {formatINR(listing.pricePerDay)}<Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 400 }}>/day</Typography>
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>Security: {formatINR(listing.securityAmount)}</Typography>
          </Box>

          {!available
            ? <Chip label="Unavailable" size="small" sx={{ color: 'error.main' }} />
            : qty === 0
              ? <Button variant="contained" size="small" onClick={handleAdd} startIcon={<AddIcon />} sx={{ px: 2 }}>Add</Button>
              : (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IconButton size="small" onClick={() => updateQuantity(listing.id, qty - 1)}
                    sx={{ bgcolor: '#1E1E1E', width: 30, height: 30 }}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{qty}</Typography>
                  <IconButton size="small" onClick={() => updateQuantity(listing.id, qty + 1)}
                    disabled={qty >= listing.quantity}
                    sx={{ bgcolor: '#FF5722', width: 30, height: 30, '&:hover': { bgcolor: '#E64A19' } }}>
                    <AddIcon fontSize="small" sx={{ color: '#fff' }} />
                  </IconButton>
                </Stack>
              )
          }
        </Stack>
      </Box>
    </Box>
  )
}

export default function RiderBranchDetail() {
  const navigate     = useNavigate()
  const { branchId } = useParams()
  const branch       = useBranch(branchId)
  const listings     = useListingsByBranch(branchId)
  const cartItems    = useCartStore(s => s.items.reduce((n, i) => n + i.quantity, 0))
  const [reviews, setReviews] = useState([])

  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null

  useEffect(() => {
    if (!branchId) return
    fetchBranchReviews(branchId).then(async events => {
      const parsed = events.map(ev => {
        try { return { ...JSON.parse(ev.content), id: ev.id, reviewerPubkey: ev.pubkey } } catch { return null }
      }).filter(Boolean)
      setReviews(parsed)
      for (const r of parsed) {
        await db.reviews.put({ ...r, branchId }).catch(() => {})
      }
    }).catch(() => {})
  }, [branchId])

  return (
    <AppLayout title={branch?.branchName ?? 'Branch'} showBack>
      <Box sx={{ p: 2, pb: cartItems ? 10 : 4 }}>
        {/* Branch header */}
        {branch && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{branch.address}</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              {branch.phone && (
                <Button size="small" startIcon={<PhoneIcon />} component="a" href={`tel:${branch.phone}`}
                  sx={{ color: 'primary.main', p: 0, minWidth: 0 }}>
                  Call Branch
                </Button>
              )}
              {avgRating && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <StarIcon sx={{ fontSize: 14, color: '#FFD740' }} />
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{avgRating.toFixed(1)}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>({reviews.length})</Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Vehicles */}
        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Available Vehicles</Typography>
        {listings === undefined
          ? <ListSkeleton count={2} />
          : !listings.length
            ? <Box sx={{ textAlign: 'center', py: 4 }}>
                <TwoWheelerIcon sx={{ fontSize: 48, color: '#333', mb: 1 }} />
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>No vehicles listed yet.</Typography>
              </Box>
            : listings.map(l => (
                <VehicleRow key={l.id} listing={l} branchId={branchId} branchName={branch?.branchName ?? ''} />
              ))
        }

        <Divider sx={{ my: 3 }} />

        {/* Reviews */}
        <Typography variant="subtitle1" sx={{ mb: 1.5 }}>Reviews</Typography>
        <ReviewList reviews={reviews} />
      </Box>

      {/* Sticky cart button */}
      {cartItems > 0 && (
        <Box sx={{ position: 'fixed', bottom: 72, left: 12, right: 12, zIndex: 30 }}>
          <Button variant="contained" fullWidth size="large" onClick={() => navigate('/rider/cart')}
            sx={{ py: 1.5, boxShadow: '0 8px 24px rgba(255,87,34,0.4)' }}>
            View Cart ({cartItems} item{cartItems !== 1 ? 's' : ''})
          </Button>
        </Box>
      )}
    </AppLayout>
  )
}
