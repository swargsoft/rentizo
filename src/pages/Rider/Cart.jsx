import { Box, Typography, Stack, Button, Card, IconButton, Divider } from '@mui/material'
import AddIcon    from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import DeleteIcon from '@mui/icons-material/Delete'
import { useNavigate } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useCartStore from '@/store/cartStore.js'
import { formatINR } from '@/utils/upi.js'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'

export default function RiderCart() {
  const navigate = useNavigate()
  const { items, branchName, updateQuantity, removeItem, clearCartStore } = useCartStore()

  const subtotal  = items.reduce((s, i) => s + i.pricePerDay * i.quantity, 0)
  const security  = items.reduce((s, i) => s + i.securityAmount * i.quantity, 0)

  if (!items.length) {
    return (
      <AppLayout title="Cart">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 2 }}>
          <ShoppingCartIcon sx={{ fontSize: 64, color: '#2A2A2A' }} />
          <Typography variant="h6" sx={{ color: 'text.secondary' }}>Your cart is empty</Typography>
          <Button variant="contained" onClick={() => navigate('/rider/discover')}>Browse Vehicles</Button>
        </Box>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Cart">
      <Box sx={{ p: 2, pb: 12 }}>
        {/* Branch label */}
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 2, p: 1.5, bgcolor: '#141414', borderRadius: 2, border: '1px solid #2A2A2A' }}>
          <LocationOnIcon sx={{ fontSize: 16, color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{branchName}</Typography>
        </Stack>

        {/* Items */}
        {items.map(item => (
          <Card key={item.listingId} sx={{ mb: 1.5 }}>
            <Box sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.vehicleName}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.vehicleNumber}</Typography>
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700, mt: 0.5 }}>
                    {formatINR(item.pricePerDay)}/day
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Security: {formatINR(item.securityAmount)}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => removeItem(item.listingId)} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 1.5 }}>
                <IconButton size="small" onClick={() => updateQuantity(item.listingId, item.quantity - 1)}
                  sx={{ bgcolor: '#1E1E1E', width: 32, height: 32 }}>
                  <RemoveIcon fontSize="small" />
                </IconButton>
                <Typography sx={{ fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                <IconButton size="small" onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                  disabled={item.quantity >= item.maxQuantity}
                  sx={{ bgcolor: '#FF5722', width: 32, height: 32 }}>
                  <AddIcon fontSize="small" sx={{ color: '#fff' }} />
                </IconButton>
                <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700 }}>
                  {formatINR(item.pricePerDay * item.quantity)}/day
                </Typography>
              </Stack>
            </Box>
          </Card>
        ))}

        <Divider sx={{ my: 2 }} />

        {/* Summary */}
        <Stack spacing={1} sx={{ mb: 1 }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Rental (per day)</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{formatINR(subtotal)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Security deposit</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main' }}>{formatINR(security)}</Typography>
          </Stack>
        </Stack>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          * Rental total depends on number of days selected at checkout
        </Typography>
      </Box>

      {/* Sticky actions */}
      <Box sx={{ position: 'fixed', bottom: 64, left: 0, right: 0, p: 2, bgcolor: '#0A0A0A', borderTop: '1px solid #1E1E1E' }}>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={clearCartStore} sx={{ borderColor: '#333', color: 'error.main', flexShrink: 0 }}>
            Clear
          </Button>
          <Button variant="contained" fullWidth size="large" onClick={() => navigate('/rider/checkout')}>
            Checkout
          </Button>
        </Stack>
      </Box>
    </AppLayout>
  )
}
