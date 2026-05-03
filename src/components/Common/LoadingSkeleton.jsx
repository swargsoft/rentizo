import { Skeleton, Box, Stack } from '@mui/material'

export function CardSkeleton() {
  return (
    <Box sx={{ p: 2, bgcolor: '#141414', borderRadius: 2, border: '1px solid #2A2A2A' }}>
      <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2, bgcolor: '#1E1E1E', mb: 1.5 }} />
      <Skeleton variant="text" width="70%" sx={{ bgcolor: '#1E1E1E' }} />
      <Skeleton variant="text" width="40%" sx={{ bgcolor: '#1E1E1E' }} />
    </Box>
  )
}

export function ListSkeleton({ count = 3 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </Stack>
  )
}

export function ProfileSkeleton() {
  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <Skeleton variant="circular" width={80} height={80} sx={{ bgcolor: '#1E1E1E' }} />
      <Skeleton variant="text" width={140} height={28} sx={{ bgcolor: '#1E1E1E' }} />
      <Skeleton variant="text" width={200} sx={{ bgcolor: '#1E1E1E' }} />
    </Box>
  )
}

export function FullPageLoader() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
      <Box sx={{
        width: 48, height: 48, borderRadius: '50%',
        border: '3px solid #2A2A2A',
        borderTopColor: '#FF5722',
        animation: 'spin 0.8s linear infinite',
        '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
      }} />
    </Box>
  )
}
