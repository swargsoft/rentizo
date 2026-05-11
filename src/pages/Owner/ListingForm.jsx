import { useState, useEffect, useRef } from 'react'
import { Box, Typography, Button, Stack, TextField, Select, MenuItem, FormControl, InputLabel,
         Switch, FormControlLabel, CircularProgress, IconButton, Grid } from '@mui/material'
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon   from '@mui/icons-material/Delete'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import ImageCropDialog from '@/components/Common/ImageCropDialog.jsx'
import { CROP_PRESETS } from '@/components/Common/ProfileMedia.jsx'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { publishListing, publishDeletion } from '@/nostr/publish.js'
import { isValidImageFile } from '@/utils/imageCompression.js'
import { getListingImageUrl } from '@/db/cache.js'
import db from '@/db/index.js'
import { nanoid } from '@/utils/nanoid.js'
import driveApi from '@/utils/driveApi.js'
import { VEHICLE_TYPES } from '@/utils/constants.js'

export default function ListingForm() {
  const navigate              = useNavigate()
  const { branchId, listingId } = useParams()
  const { pubkey, secretKey } = useAuthStore()
  const showSnackbar          = useUiStore(s => s.showSnackbar)
  const showConfirm           = useUiStore(s => s.showConfirm)
  const isEdit                = !!listingId

  const [vehicleName,    setVehicleName]    = useState('')
  const [vehicleNumbers, setVehicleNumbers]  = useState([''])
  const [vehicleType,    setVehicleType]    = useState('bike')
  const [pricePerDay,    setPricePerDay]    = useState('')
  const [discountedPrice, setDiscountedPrice] = useState('')
  const [securityAmount, setSecurityAmount] = useState('')
  const [quantity,       setQuantity]       = useState('1')
  const [description,    setDescription]    = useState('')
  const [isPublished,    setIsPublished]    = useState(false)
  // images: [{ previewUrl, blob, fileId }]
  // - blob: new image blob to upload
  // - fileId: existing Drive file ID (from edit mode)
  // - previewUrl: blob URL or Drive URL
  const [images,         setImages]         = useState([])
  const [saving,         setSaving]         = useState(false)
  const [errors,         setErrors]         = useState({})
  const [targetBranchId, setTargetBranchId] = useState(branchId)

  // Crop dialog state
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    if (isEdit) {
      db.listings.get(listingId).then(async l => {
        if (!l) return
        setVehicleName(l.vehicleName || '')
        setVehicleNumbers(l.vehicleNumbers?.length ? l.vehicleNumbers : (l.vehicleNumber ? [l.vehicleNumber] : ['']))
        setVehicleType(l.vehicleType); setPricePerDay(String(l.pricePerDay))
        setDiscountedPrice(l.discountedPrice ? String(l.discountedPrice) : '')
        setSecurityAmount(String(l.securityAmount)); setQuantity(String(l.quantity || 1))
        setDescription(l.description ?? ''); setIsPublished(l.isPublished)
        setTargetBranchId(l.branchId)

        // Load existing images with their fileIds
        if (l.images && l.images.length > 0) {
          const loadedImages = await Promise.all(
            l.images.map(async (fileId, idx) => {
              // Try local cache first, fall back to Drive URL
              const localUrl = await getListingImageUrl(listingId, idx)
              return {
                previewUrl: localUrl || driveApi.constructor.imageUrl(fileId),
                blob: null,
                fileId: fileId,
              }
            })
          )
          setImages(loadedImages.filter(img => img.previewUrl))
        }
      })
    }
  }, [listingId])

  // Update vehicle numbers array when quantity changes
  useEffect(() => {
    const qty = parseInt(quantity) || 0
    setVehicleNumbers(prev => {
      const newArr = [...prev]
      while (newArr.length < qty) newArr.push('')
      while (newArr.length > qty) newArr.pop()
      return newArr
    })
  }, [quantity])

  function handleImageSelect(e) {
    const files = Array.from(e.target.files ?? []).filter(isValidImageFile)
    if (!files.length) return

    const remaining = 5 - images.length
    if (remaining <= 0) return

    // Take only as many as we can fit
    const file = files[0]
    const objectUrl = URL.createObjectURL(file)
    setCropImageSrc(objectUrl)
    setCropDialogOpen(true)

    e.target.value = ''
  }

  function handleCropComplete(croppedBlob) {
    setImages(prev => [...prev, {
      previewUrl: URL.createObjectURL(croppedBlob),
      blob: croppedBlob,
      fileId: null,
    }])
    setCropDialogOpen(false)
    setCropImageSrc(null)
  }

  function closeCropDialog() {
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc)
      setCropImageSrc(null)
    }
    setCropDialogOpen(false)
  }

  function removeImage(i) {
    setImages(prev => {
      const img = prev[i]
      // Cleanup blob URLs to prevent memory leaks
      if (img?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(img.previewUrl)
      }
      return prev.filter((_, idx) => idx !== i)
    })
  }

  function validate() {
    const errs = {}
    if (!vehicleName.trim())       errs.vehicleName    = 'Vehicle name required'
    const emptyVehicleNumbers = (vehicleNumbers || []).filter(v => !v?.trim())
    if (emptyVehicleNumbers.length > 0) errs.vehicleNumbers = `${emptyVehicleNumbers.length} vehicle number${emptyVehicleNumbers.length > 1 ? 's' : ''} missing`
    if (!pricePerDay || isNaN(+pricePerDay) || +pricePerDay <= 0) errs.pricePerDay = 'Enter valid price'
    if (discountedPrice) {
      if (isNaN(+discountedPrice) || +discountedPrice <= 0) errs.discountedPrice = 'Enter valid discounted price'
      else if (+discountedPrice >= +pricePerDay) errs.discountedPrice = 'Must be less than regular price'
    }
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

      // Process images - upload new blobs to Drive, keep existing fileIds
      const finalImages = await Promise.all(
        images.map(async (img, idx) => {
          if (img.fileId) return img.fileId  // already on Drive, keep it
          if (!img.blob) return null
          // Upload new blob
          return driveApi.uploadListingImage(img.blob, id, idx)
        })
      )

      const validFileIds = finalImages.filter(Boolean)

      const listingData = {
        id, branchId: targetBranchId, ownerPubkey: pubkey,
        vehicleName: vehicleName.trim(), vehicleNumbers: vehicleNumbers.map(v => v.trim()),
        vehicleType, pricePerDay: +pricePerDay,
        discountedPrice: discountedPrice ? +discountedPrice : null,
        securityAmount: +securityAmount,
        quantity: +quantity, description: description.trim(),
        images: validFileIds, isPublished, updatedAt: Math.floor(Date.now()/1000),
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
    showConfirm('Delete Listing?', 'This will remove the listing from Nostr and delete all images from Drive.', async () => {
      try {
        const l = await db.listings.get(listingId)

        // Publish deletion to Nostr
        if (l?.nostrEventId) {
          await publishDeletion([l.nostrEventId], secretKey)
        }

        // Delete images from Drive
        await driveApi.deleteListing(listingId)

        // Delete from local DB
        await db.listings.delete(listingId)

        showSnackbar('Listing deleted', 'info')
        navigate(-1)
      } catch (err) {
        showSnackbar('Error: ' + err.message, 'error')
      }
    })
  }

  return (
    <>
    <AppLayout title={isEdit ? 'Edit Listing' : 'New Listing'} showBack>
      <Box sx={{ p: 2, pb: 4 }}>
        <Stack spacing={2.5}>
          <TextField label="Vehicle Name" value={vehicleName} onChange={e => setVehicleName(e.target.value)}
            placeholder="e.g. Honda Activa 6G" error={!!errors.vehicleName} helperText={errors.vehicleName} />

          <FormControl fullWidth>
            <InputLabel>Vehicle Type</InputLabel>
            <Select value={vehicleType} onChange={e => setVehicleType(e.target.value)} label="Vehicle Type"
              sx={{ bgcolor: '#1E1E1E', borderRadius: 1 }}>
              {VEHICLE_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={2}>
            <TextField label="Regular Price / Day (₹)" value={pricePerDay} onChange={e => setPricePerDay(e.target.value)}
              type="number" inputProps={{ min: 1 }} error={!!errors.pricePerDay} helperText={errors.pricePerDay} fullWidth />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField label="Discounted Price (₹)" value={discountedPrice} onChange={e => setDiscountedPrice(e.target.value)}
              type="number" inputProps={{ min: 1 }} error={!!errors.discountedPrice} helperText={errors.discountedPrice ?? 'Optional: leave empty for no discount'}
              fullWidth />
            <TextField label="Security (₹)" value={securityAmount} onChange={e => setSecurityAmount(e.target.value)}
              type="number" inputProps={{ min: 0 }} error={!!errors.securityAmount} helperText={errors.securityAmount} fullWidth />
          </Stack>

          <TextField label="Quantity" value={quantity} onChange={e => setQuantity(e.target.value)}
            type="number" inputProps={{ min: 1, max: 99 }}
            error={!!errors.quantity} helperText={errors.quantity ?? 'How many of this vehicle you have'} />

          {/* Dynamic Vehicle Numbers */}
          {vehicleNumbers.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                Vehicle Numbers
              </Typography>
              <Stack spacing={1.5}>
                {vehicleNumbers.map((vn, idx) => (
                  <TextField
                    key={idx}
                    label={`Vehicle No. ${idx + 1}`}
                    value={vn}
                    onChange={e => {
                      const newArr = [...vehicleNumbers]
                      newArr[idx] = e.target.value
                      setVehicleNumbers(newArr)
                    }}
                    placeholder="e.g. MH12AB1234"
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                    error={!!errors.vehicleNumbers}
                    helperText={idx === 0 ? errors.vehicleNumbers : ''}
                  />
                ))}
              </Stack>
            </Box>
          )}

          <TextField label="Description (optional)" value={description} onChange={e => setDescription(e.target.value)}
            multiline rows={2} inputProps={{ maxLength: 500 }}
            helperText={`${description.length}/500`} />

          {/* Image Upload */}
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
              Photos ({images.length}/5)
            </Typography>

            {/* Horizontal Carousel of Images */}
            {images.length > 0 && (
              <Box sx={{
                mt: 1,
                mb: 2,
                display: 'flex',
                gap: 1,
                overflowX: 'auto',
                pb: 1,
                '&::-webkit-scrollbar': { display: 'none' },
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}>
                {images.map((img, i) => (
                  <Box key={i} sx={{ position: 'relative', minWidth: 80, height: 80, borderRadius: 1, overflow: 'hidden', bgcolor: '#1E1E1E', flexShrink: 0 }}>
                    <img src={img.previewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
                      <IconButton size="small" onClick={() => removeImage(i)}
                        sx={{ bgcolor: 'rgba(0,0,0,0.7)', color: '#fff', width: 24, height: 24, '&:hover': { bgcolor: 'rgba(244,67,54,0.8)' } }}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Upload Button */}
            {images.length < 5 && (
              <Button
                variant="outlined"
                onClick={() => fileRef.current?.click()}
                sx={{
                  width: '100%',
                  height: 120,
                  border: '2px dashed #333',
                  borderRadius: 1,
                  bgcolor: '#141414',
                  color: '#666',
                  '&:hover': {
                    borderColor: '#FF5722',
                    bgcolor: 'rgba(255,87,34,0.05)',
                    color: '#FF5722'
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1
                }}
              >
                <AddPhotoIcon sx={{ fontSize: 32 }} />
                <Typography variant="body2">Add Photos</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>Up to 5 images</Typography>
              </Button>
            )}
            <input ref={fileRef} type="file" hidden accept="image/*" onChange={handleImageSelect} />
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

    {/* Image Crop Dialog */}
    <ImageCropDialog
      open={cropDialogOpen}
      imageSrc={cropImageSrc}
      onClose={closeCropDialog}
      onCrop={handleCropComplete}
      {...CROP_PRESETS.listing}
    />
    </>
  )
}