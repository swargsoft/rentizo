import { useState, useEffect, useRef } from 'react'
import { Box, Typography, Button, Stack, TextField, Select, MenuItem, FormControl, InputLabel,
         Switch, FormControlLabel, Alert, CircularProgress, IconButton, Grid } from '@mui/material'
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon   from '@mui/icons-material/Delete'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { publishListing } from '@/nostr/publish.js'
import { processListingImages, isValidImageFile } from '@/utils/imageCompression.js'
import { storeListingImage, blobToBase64, getListingImageUrls } from '@/db/cache.js'
import db from '@/db/index.js'
import { nanoid } from '@/utils/nanoid.js'

const VEHICLE_TYPES = ['bike','scooter','cycle','car','other']

export default function ListingForm() {
  const navigate              = useNavigate()
  const { branchId, listingId } = useParams()
  const { pubkey, secretKey } = useAuthStore()
  const showSnackbar          = useUiStore(s => s.showSnackbar)
  const showConfirm           = useUiStore(s => s.showConfirm)
  const isEdit                = !!listingId

  const [vehicleName,    setVehicleName]    = useState('')
  const [vehicleNumber,  setVehicleNumber]  = useState('')
  const [vehicleType,    setVehicleType]    = useState('bike')
  const [pricePerDay,    setPricePerDay]    = useState('')
  const [securityAmount, setSecurityAmount] = useState('')
  const [quantity,       setQuantity]       = useState('1')
  const [description,    setDescription]    = useState('')
  const [isPublished,    setIsPublished]    = useState(false)
  const [images,         setImages]         = useState([])   // [{ previewUrl, blob, base64 }]
  const [saving,         setSaving]         = useState(false)
  const [errors,         setErrors]         = useState({})
  const [targetBranchId, setTargetBranchId] = useState(branchId)
  const fileRef = useRef()

  useEffect(() => {
    if (isEdit) {
      db.listings.get(listingId).then(async l => {
        if (!l) return
        setVehicleName(l.vehicleName); setVehicleNumber(l.vehicleNumber)
        setVehicleType(l.vehicleType); setPricePerDay(String(l.pricePerDay))
        setSecurityAmount(String(l.securityAmount)); setQuantity(String(l.quantity))
        setDescription(l.description ?? ''); setIsPublished(l.isPublished)
        setTargetBranchId(l.branchId)
        const urls = await getListingImageUrls(listingId, 5)
        setImages(urls.map(u => ({ previewUrl: u, blob: null, base64: null })))
      })
    }
  }, [listingId])

  async function handleImageSelect(e) {
    const files = Array.from(e.target.files ?? []).filter(isValidImageFile)
    if (!files.length) return
    const remaining = 5 - images.length
    const processed = await processListingImages(files.slice(0, remaining))
    setImages(prev => [...prev, ...processed.map(p => ({ ...p, base64: null }))])
    e.target.value = ''
  }

  function removeImage(i) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  function validate() {
    const errs = {}
    if (!vehicleName.trim())       errs.vehicleName    = 'Vehicle name required'
    if (!vehicleNumber.trim())     errs.vehicleNumber  = 'Vehicle number required'
    if (!pricePerDay || isNaN(+pricePerDay) || +pricePerDay <= 0) errs.pricePerDay = 'Enter valid price'
    if (isNaN(+securityAmount) || +securityAmount < 0) errs.securityAmount = 'Enter valid security amount'
    if (!quantity || isNaN(+quantity) || +quantity < 1) errs.quantity = 'Quantity must be at least 1'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const id = listingId ?? nanoid()
      // Process images to base64 for Nostr event
      const base64Images = await Promise.all(images.map(async img => {
        if (img.base64) return img.base64
        if (img.blob)   return blobToBase64(img.blob)
        return null
      }))
      const validBase64 = base64Images.filter(Boolean)
      console.log("this is test log");

      // Store in Cache API
      await Promise.all(images.map(async (img, idx) => {
        if (img.blob) await storeListingImage(id, idx, img.blob)
      }))
      
        

      const listingData = {
        id, branchId: targetBranchId, ownerPubkey: pubkey,
        vehicleName: vehicleName.trim(), vehicleNumber: vehicleNumber.trim(),
        vehicleType, pricePerDay: +pricePerDay, securityAmount: +securityAmount,
        quantity: +quantity, description: description.trim(),
        images: validBase64, isPublished, updatedAt: Math.floor(Date.now()/1000),
      }

      await publishListing(listingData, secretKey)
      await db.listings.put(listingData)
      showSnackbar(isEdit ? 'Listing updated!' : 'Listing created!', 'success')
      navigate(-1)
    } catch (err) {
      showSnackbar('Error: ' + err.message, 'error')
      console.log(err);
      
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    showConfirm('Delete Listing?', 'This will remove the listing from Nostr and your device.', async () => {
      try {
        const l = await db.listings.get(listingId)
        if (l?.nostrEventId) {
          const { publishDeletion } = await import('@/nostr/publish.js')
          await publishDeletion([l.nostrEventId], secretKey)
        }
        await db.listings.delete(listingId)
        showSnackbar('Listing deleted', 'info')
        navigate(-1)
      } catch (err) { showSnackbar('Error: ' + err.message, 'error') }
    })
  }

  return (
    <AppLayout title={isEdit ? 'Edit Listing' : 'New Listing'} showBack>
      <Box sx={{ p: 2, pb: 4 }}>
        <Stack spacing={2.5}>
          <TextField label="Vehicle Name" value={vehicleName} onChange={e => setVehicleName(e.target.value)}
            placeholder="e.g. Honda Activa 6G" error={!!errors.vehicleName} helperText={errors.vehicleName} />

          <TextField label="Vehicle Number" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)}
            placeholder="e.g. MH12AB1234" inputProps={{ style: { textTransform: 'uppercase' } }}
            error={!!errors.vehicleNumber} helperText={errors.vehicleNumber} />

          <FormControl fullWidth>
            <InputLabel>Vehicle Type</InputLabel>
            <Select value={vehicleType} onChange={e => setVehicleType(e.target.value)} label="Vehicle Type"
              sx={{ bgcolor: '#1E1E1E', borderRadius: 2 }}>
              {VEHICLE_TYPES.map(t => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2}>
            <TextField label="Price / Day (₹)" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)}
              type="number" inputProps={{ min: 1 }} error={!!errors.pricePerDay} helperText={errors.pricePerDay} />
            <TextField label="Security (₹)" value={securityAmount} onChange={e => setSecurityAmount(e.target.value)}
              type="number" inputProps={{ min: 0 }} error={!!errors.securityAmount} helperText={errors.securityAmount} />
          </Stack>

          <TextField label="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)}
            type="number" inputProps={{ min: 1, max: 99 }}
            error={!!errors.quantity} helperText={errors.quantity ?? 'How many of this vehicle you have'} />

          <TextField label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
            multiline rows={2} inputProps={{ maxLength: 500 }}
            helperText={`${description.length}/500`} />

          {/* Image Upload */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Photos ({images.length}/5)
            </Typography>
            <Grid container spacing={1} sx={{ mt: 0.5 }}>
              {images.map((img, i) => (
                <Grid item xs={4} key={i}>
                  <Box sx={{ position: 'relative', paddingTop: '75%', borderRadius: 2, overflow: 'hidden', bgcolor: '#1E1E1E' }}>
                    <img src={img.previewUrl} alt="" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <IconButton size="small" onClick={() => removeImage(i)}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', width: 24, height: 24 }}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
              {images.length < 5 && (
                <Grid item xs={4}>
                  <Box onClick={() => fileRef.current?.click()} sx={{
                    paddingTop: '75%', position: 'relative', borderRadius: 2,
                    border: '2px dashed #333', cursor: 'pointer', bgcolor: '#141414',
                    '&:hover': { borderColor: '#FF5722' },
                  }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <AddPhotoIcon sx={{ color: '#444' }} />
                    </Box>
                  </Box>
                  <input ref={fileRef} type="file" hidden multiple accept="image/*" onChange={handleImageSelect} />
                </Grid>
              )}
            </Grid>
          </Box>

          <FormControlLabel
            control={<Switch checked={isPublished} onChange={e => setIsPublished(e.target.checked)} color="primary" />}
            label={<Box><Typography variant="body2" sx={{ fontWeight: 600 }}>Published</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Visible to riders when enabled</Typography></Box>}
          />

          <Button variant="contained" size="large" onClick={handleSave} disabled={saving} sx={{ py: 1.5 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : isEdit ? 'Update Listing' : 'Create Listing'}
          </Button>

          {isEdit && (
            <Button variant="outlined" color="error" onClick={handleDelete} sx={{ borderColor: '#FF5252', color: 'error.main' }}>
              Delete Listing
            </Button>
          )}
        </Stack>
      </Box>
    </AppLayout>
  )
}
