import { Box, Typography, Stack, Button } from '@mui/material'
import { QRCodeSVG } from 'qrcode.react'
import ShareIcon from '@mui/icons-material/Share'
import { formatINR } from '@/utils/upi.js'

export default function UPIQRCode({ upiLink, amount, label = 'Security Deposit', ownerName, bookingId }) {
  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: 'Rentizo Payment', text: `Pay ${formatINR(amount)} for booking ${bookingId}`, url: upiLink })
    } else {
      await navigator.clipboard.writeText(upiLink)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, bgcolor: '#141414', borderRadius: 3, border: '1px solid #2A2A2A' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main', mb: 2 }}>
        {formatINR(amount)}
      </Typography>

      {/* QR */}
      <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: 2, mb: 2 }}>
        <QRCodeSVG value={upiLink} size={180} fgColor="#0A0A0A" bgColor="#FFFFFF" level="M" />
      </Box>

      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>Pay to: {ownerName}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 2 }}>
        Scan with any UPI app (GPay, PhonePe, Paytm…)
      </Typography>

      <Button variant="outlined" size="small" startIcon={<ShareIcon />} onClick={handleShare}
        sx={{ borderColor: '#333', color: 'text.secondary' }}>
        Share Payment Link
      </Button>
    </Box>
  )
}
