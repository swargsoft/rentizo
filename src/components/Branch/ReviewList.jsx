import { Box, Typography, Stack, Avatar, Divider } from '@mui/material'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'

function StarRating({ value }) {
  return (
    <Stack direction="row" spacing={0.25}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < value
          ? <StarIcon key={i} sx={{ fontSize: 14, color: '#FFD740' }} />
          : <StarBorderIcon key={i} sx={{ fontSize: 14, color: '#444' }} />
      )}
    </Stack>
  )
}

export default function ReviewList({ reviews = [] }) {
  if (!reviews.length) {
    return <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>No reviews yet.</Typography>
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <StarIcon sx={{ color: '#FFD740' }} />
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{avg.toFixed(1)}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</Typography>
      </Stack>

      {reviews.map((r, i) => (
        <Box key={r.id ?? i}>
          {i > 0 && <Divider sx={{ my: 1.5 }} />}
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#FF5722', fontSize: '0.8rem' }}>
              {r.reviewerPubkey?.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <StarRating value={r.rating} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {new Date(r.createdAt * 1000).toLocaleDateString()}
                </Typography>
              </Stack>
              {r.comment && (
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{r.comment}</Typography>
              )}
            </Box>
          </Stack>
        </Box>
      ))}
    </Box>
  )
}
