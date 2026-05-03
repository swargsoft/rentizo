import { Box, Typography, Fab, Stack } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import ListingCard from '@/components/Listing/ListingCard.jsx'
import { ListSkeleton } from '@/components/Common/LoadingSkeleton.jsx'
import { useOwnerListingsByBranch } from '@/hooks/useListings.js'
import { useListingImages } from '@/hooks/useImageCache.js'
import { useBranch } from '@/hooks/useBranches.js'

function ListingRow({ listing, branchId }) {
  const navigate = useNavigate()
  const { urls } = useListingImages(listing.id, 1)
  return (
    <ListingCard
      listing={listing}
      imageUrl={urls[0]}
      showEdit
      onPress={() => navigate(`/owner/listings/${listing.id}/edit`)}
      onEdit={() => navigate(`/owner/listings/${listing.id}/edit`)}
    />
  )
}

export default function OwnerListings() {
  const navigate      = useNavigate()
  const { branchId }  = useParams()
  const branch        = useBranch(branchId)
  const listings      = useOwnerListingsByBranch(branchId)

  return (
    <AppLayout title={branch?.branchName ?? 'Listings'} showBack>
      <Box sx={{ p: 2, pb: 10 }}>
        {listings === undefined
          ? <ListSkeleton />
          : !listings.length
            ? (
              <Box sx={{ textAlign: 'center', pt: 8 }}>
                <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No vehicles yet</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Tap + to add your first vehicle listing.
                </Typography>
              </Box>
            )
            : listings.map(l => <ListingRow key={l.id} listing={l} branchId={branchId} />)
        }
      </Box>

      <Fab
        color="primary"
        onClick={() => navigate(`/owner/branches/${branchId}/listings/new`)}
        sx={{ position: 'fixed', bottom: 80, right: 20 }}
      >
        <AddIcon />
      </Fab>
    </AppLayout>
  )
}
