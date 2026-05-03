import { Box, Typography, Fab, Stack } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import AppLayout from '@/components/Common/AppLayout.jsx'
import BranchCard from '@/components/Branch/BranchCard.jsx'
import { ListSkeleton } from '@/components/Common/LoadingSkeleton.jsx'
import useAuthStore from '@/store/authStore.js'
import useNostrStore from '@/store/nostrStore.js'
import db from '@/db/index.js'

export default function OwnerBranches() {
  const navigate   = useNavigate()
  const { pubkey } = useAuthStore()
  const hydrated   = useNostrStore(s => s.hydrated)

  const branches = useLiveQuery(
    () => pubkey ? db.branches.where('ownerPubkey').equals(pubkey).toArray() : [],
    [pubkey]
  )

  const listingCounts = useLiveQuery(async () => {
    if (!branches?.length) return {}
    const counts = {}
    for (const b of branches) {
      counts[b.id] = await db.listings.where('branchId').equals(b.id).count()
    }
    return counts
  }, [branches])

  return (
    <AppLayout title="My Branches">
      <Box sx={{ p: 2, pb: 10 }}>
        {!hydrated && !branches?.length
          ? <ListSkeleton count={2} />
          : !branches?.length
            ? (
              <Box sx={{ textAlign: 'center', pt: 8 }}>
                <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>No branches yet</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Add your first branch to start listing vehicles.
                </Typography>
              </Box>
            )
            : (
              <Stack spacing={0}>
                {branches.map(branch => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    listingCount={listingCounts?.[branch.id] ?? 0}
                    showEdit
                    onPress={() => navigate(`/owner/branches/${branch.id}/listings`)}
                    onEdit={() => navigate(`/owner/branches/${branch.id}/edit`)}
                  />
                ))}
              </Stack>
            )
        }
      </Box>

      <Fab
        color="primary"
        onClick={() => navigate('/owner/branches/new')}
        sx={{ position: 'fixed', bottom: 80, right: 20 }}
      >
        <AddIcon />
      </Fab>
    </AppLayout>
  )
}
