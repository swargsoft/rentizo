import { useState, useEffect } from 'react'
import { Box, Typography, Stack, Button, TextField, Card, Divider, Alert, CircularProgress } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { addDays, format, differenceInCalendarDays } from 'date-fns'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useCartStore from '@/store/cartStore.js'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { useRiderProfile } from '@/hooks/useNostrProfile.js'
import { publishBookingRequest } from '@/nostr/publish.js'
import { generateBookingId, formatINR } from '@/utils/upi.js'
import { buildBookingPaymentLink } from '@/utils/upi.js'
import { validatePhone, formatPhone } from '@/utils/nostrValidation.js'
import db from '@/db/index.js'

export default function RiderCheckout() {
  const navigate     = useNavigate()
  const { items, branchId, branchName, clearCartStore } = useCartStore()
  const { pubkey, secretKey } = useAuthStore()
  const showSnackbar = useUiStore(s => s.showSnackbar)
  const riderProfile = useRiderProfile()

  const [riderName,  setRiderName]  = useState('')
  const [riderPhone, setRiderPhone] = useState('')
  const [startDate,  setStartDate]  = useState(new Date())
  const [endDate,    setEndDate]    = useState(addDays(new Date(), 1))
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState({})

  useEffect(() => {
    if (riderProfile) {
      setRiderName(riderProfile.name ?? '')
      setRiderPhone(riderProfile.phone ?? '')
    }
  }, [riderProfile])

  const durationDays = Math.max(1, differenceInCalendarDays(endDate, startDate))
  const totalAmount  = items.reduce((s, i) => s + i.pricePerDay * durationDays * i.quantity, 0)
  const securityAmount = items.reduce((s, i) => s + i.securityAmount * i.quantity, 0)
  const grandTotal   = totalAmount + securityAmount

  function validate() {
    const errs = {}
    if (!riderName.trim())          errs.riderName  = 'Name is required'
    if (!validatePhone(riderPhone).valid) errs.riderPhone = 'Enter a valid phone number'
    if (durationDays < 1)           errs.dates      = 'End date must be after start date'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  async function handleSubmit() {
    if (!validate() || !items.length) return
    setSubmitting(true)
    try {
      // Get owner pubkey from branch
      const branch = await db.branches.get(branchId)
      if (!branch) throw new Error('Branch not found')

      const bookingId = generateBookingId()
      const booking = {
        id:              bookingId,
        riderPubkey:     pubkey,
        ownerPubkey:     branch.ownerPubkey,
        branchId,
        branchName,
        items:           items.map(i => ({
          listingId:      i.listingId,
          vehicleName:    i.vehicleName,
          vehicleNumber:  i.vehicleNumber,
          quantity:       i.quantity,
          pricePerDay:    i.pricePerDay,
          securityAmount: i.securityAmount,
        })),
        riderName:       riderName.trim(),
        riderPhone:      formatPhone(riderPhone),
        startDate:       format(startDate, 'yyyy-MM-dd'),
        endDate:         format(endDate,   'yyyy-MM-dd'),
        durationDays,
        totalAmount,
        securityAmount,
        grandTotal,
        status:          'pending',
        createdAt:       Math.floor(Date.now() / 1000),
      }

      await publishBookingRequest(booking, branch.ownerPubkey, secretKey)
      await db.bookings.put(booking)
      await clearCartStore()

      navigate(`/rider/booking/${bookingId}`, { replace: true })
    } catch (err) {
      showSnackbar('Failed to submit: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (!items.length) {
    navigate('/rider/cart', { replace: true })
    return null
  }

  return (
    <AppLayout title="Checkout" showBack>
      <Box sx={{ p: 2, pb: 4 }}>
        <Stack spacing={2.5}>
          {/* Rider info */}
          <Typography variant="subtitle1">Your Details</Typography>
          <TextField label="Your Name" value={riderName} onChange={e => setRiderName(e.target.value)}
            error={!!errors.riderName} helperText={errors.riderName} />
          <TextField label="Phone Number" value={riderPhone} onChange={e => setRiderPhone(e.target.value)}
            type="tel" error={!!errors.riderPhone} helperText={errors.riderPhone} />

          <Divider />

          {/* Dates */}
          <Typography variant="subtitle1">Rental Dates</Typography>
          <DatePicker
            label="Start Date"
            value={startDate}
            onChange={d => { setStartDate(d); if (d >= endDate) setEndDate(addDays(d, 1)) }}
            minDate={new Date()}
            slotProps={{ textField: { fullWidth: true } }}
          />
          <DatePicker
            label="End Date"
            value={endDate}
            onChange={d => setEndDate(d)}
            minDate={addDays(startDate, 1)}
            slotProps={{ textField: { fullWidth: true, error: !!errors.dates, helperText: errors.dates } }}
          />

          <Alert severity="info" icon={false} sx={{ borderRadius: 2, bgcolor: '#141414', border: '1px solid #2A2A2A' }}>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>Duration: {durationDays} day{durationDays !== 1 ? 's' : ''}</Typography>
          </Alert>

          <Divider />

          {/* Summary */}
          <Typography variant="subtitle1">Order Summary</Typography>
          <Card sx={{ p: 2 }}>
            <Stack spacing={1}>
              {items.map(i => (
                <Stack key={i.listingId} direction="row" justifyContent="space-between">
                  <Typography variant="body2">{i.vehicleName} ×{i.quantity} ×{durationDays}d</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(i.pricePerDay * i.quantity * durationDays)}</Typography>
                </Stack>
              ))}
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Rental total</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(totalAmount)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Security deposit</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.main' }}>{formatINR(securityAmount)}</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="subtitle2">Grand Total</Typography>
                <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>{formatINR(grandTotal)}</Typography>
              </Stack>
            </Stack>
          </Card>

          <Button variant="contained" size="large" onClick={handleSubmit} disabled={submitting} sx={{ py: 1.5 }}>
            {submitting ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Send Booking Request'}
          </Button>
        </Stack>
      </Box>
    </AppLayout>
  )
}
