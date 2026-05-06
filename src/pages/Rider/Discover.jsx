import { useState } from 'react'
import { Box, Typography, Stack, Card, CardActionArea, Chip, IconButton, Drawer, ToggleButtonGroup, ToggleButton, TextField, InputAdornment } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import RiderMap from '@/components/Map/RiderMap.jsx'
import BranchCard from '@/components/Branch/BranchCard.jsx'
import { FullPageLoader } from '@/components/Common/LoadingSkeleton.jsx'
import { useGeolocation } from '@/hooks/useGeolocation.js'
import { useNearbyBranches } from '@/hooks/useBranches.js'
import { useLiveQuery } from 'dexie-react-hooks'
import db from '@/db/index.js'
import MapIcon    from '@mui/icons-material/Map'
import ListIcon   from '@mui/icons-material/List'
import SearchIcon from '@mui/icons-material/Search'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import { formatDistance } from '@/utils/geo.js'

const DEFAULT_RADIUS = Number(import.meta.env.VITE_DEFAULT_RADIUS_KM ?? 10)

export default function RiderDiscover() {
  const navigate = useNavigate()
  const { location, loading: locLoading } = useGeolocation()
  const { branches, loading: branchLoading } = useNearbyBranches(location, DEFAULT_RADIUS)
  const [view,           setView]           = useState('list')
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [search,         setSearch]         = useState('')

  // Replace the two problematic useLiveQuery calls:

const listingCounts = useLiveQuery(async () => {
  if (!branches?.length) return {}
  const counts = {}
  await Promise.all(branches.map(async b => {
    counts[b.id] = await db.listings
      .where('branchId').equals(b.id)
      .filter(l => l.isPublished)
      .count()
  }))
  return counts
}, [branches?.map(b => b.id).join(',')])  // ← stable string dep, not array reference

const reviewAverages = useLiveQuery(async () => {
  if (!branches?.length) return {}
  const avgs = {}
  await Promise.all(branches.map(async b => {
    const reviews = await db.reviews.where('branchId').equals(b.id).toArray()
    avgs[b.id] = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null
  }))
  return avgs
}, [branches?.map(b => b.id).join(',')])  // ← same stable dep

  const filtered = (branches ?? []).filter(b =>
    !search || b.branchName.toLowerCase().includes(search.toLowerCase()) || b.address.toLowerCase().includes(search.toLowerCase())
  )

  function handleBranchSelect(branch) {
    setSelectedBranch(branch)
  }

  function handleBranchOpen(branch) {
    navigate(`/rider/branches/${branch.id}`)
  }

  if (locLoading) return <FullPageLoader />

  return (
    <AppLayout title="Discover">
      <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 120px)' }}>

        {/* Search + View Toggle */}
        <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.default', zIndex: 10 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Search branches or vehicles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              sx={{ flex: 1 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} /></InputAdornment>,
                sx: { borderRadius: 2, bgcolor: '#1E1E1E' }
              }}
            />
            <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
              <ToggleButton value="map" sx={{ px: 1.5, color: view === 'map' ? 'primary.main' : 'text.secondary' }}>
                <MapIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="list" sx={{ px: 1.5, color: view === 'list' ? 'primary.main' : 'text.secondary' }}>
                <ListIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>

        {view === 'map' ? (
          <Box sx={{ flex: 1, position: 'relative' }}>
            {/* Map */}
            <Box sx={{ width: '100%', height: '100%' }}>
              <RiderMap
                branches={filtered}
                userLocation={location}
                onBranchClick={handleBranchSelect}
                selectedBranchId={selectedBranch?.id}
              />
            </Box>

            {/* Selected branch bottom card */}
            {selectedBranch && (
              <Box sx={{ position: 'absolute', bottom: 16, left: 12, right: 12, zIndex: 20 }}>
                <BranchCard
                  branch={selectedBranch}
                  listingCount={listingCounts?.[selectedBranch.id] ?? 0}
                  rating={reviewAverages?.[selectedBranch.id]}
                  onPress={() => handleBranchOpen(selectedBranch)}
                />
              </Box>
            )}

            {/* Nearby count badge */}
            <Box sx={{ position: 'absolute', top: 12, left: 12, zIndex: 20, bgcolor: 'rgba(0,0,0,0.75)', borderRadius: 10, px: 1.5, py: 0.5, backdropFilter: 'blur(8px)' }}>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                {branchLoading ? 'Loading…' : `${filtered.length} branches nearby`}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1 }}>
            {!filtered.length
              ? <Box sx={{ textAlign: 'center', pt: 6 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {branchLoading ? 'Fetching branches from relays…' : `No branches found within ${DEFAULT_RADIUS} km.`}
                  </Typography>
                </Box>
              : filtered.map(branch => (
                  <BranchCard
                    key={branch.id}
                    branch={branch}
                    listingCount={listingCounts?.[branch.id] ?? 0}
                    rating={reviewAverages?.[branch.id]}
                    onPress={() => handleBranchOpen(branch)}
                  />
                ))
            }
          </Box>
        )}
      </Box>
    </AppLayout>
  )
}
