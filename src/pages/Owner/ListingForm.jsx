import { useState, useEffect, useRef } from 'react'
import { Box, Typography, Button, Stack, TextField, Select, MenuItem, FormControl, InputLabel,
         Switch, FormControlLabel, Alert, CircularProgress, IconButton, Grid, Drawer, Slider } from '@mui/material'
import AddPhotoIcon from '@mui/icons-material/AddPhotoAlternate'
import DeleteIcon   from '@mui/icons-material/Delete'
import ZoomInIcon   from '@mui/icons-material/ZoomIn'
import ZoomOutIcon  from '@mui/icons-material/ZoomOut'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { publishListing } from '@/nostr/publish.js'
import { processListingImages, isValidImageFile } from '@/utils/imageCompression.js'
import { storeListingImage, blobToBase64, getListingImageUrls } from '@/db/cache.js'
import db from '@/db/index.js'
import { nanoid } from '@/utils/nanoid.js'
import driveApi from '@/utils/driveApi.js'


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
  const [cropImage,      setCropImage]      = useState(null) // { src, blob, tempIndex }
  const [pendingImages,  setPendingImages]  = useState([])   // images waiting to be cropped
  const [cropZoom,       setCropZoom]       = useState(1)
  const [cropPosition,   setCropPosition]   = useState({ x: 0, y: 0 })
  const fileRef = useRef()
  const canvasRef = useRef()

  useEffect(() => {
    if (cropImage && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const scale = cropZoom
        const x = (canvas.width - img.width * scale) / 2 + cropPosition.x
        const y = (canvas.height - img.height * scale) / 2 + cropPosition.y
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale)
      }
      img.src = cropImage.src
    }
  }, [cropImage, cropZoom, cropPosition])

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
    const newImages = files.slice(0, 5 - images.length).map(file => ({
      previewUrl: URL.createObjectURL(file),
      fileId:     null,
      file,
    }))
    setImages(prev => [...prev, ...newImages])
    e.target.value = ''
  }


  useEffect(() => {
    if (pendingImages.length > 0 && !cropImage) {
      const nextImage = pendingImages[0]
      setCropImage({ src: nextImage.previewUrl, blob: nextImage.blob, tempIndex: 0 })
      setCropZoom(1)
      setCropPosition({ x: 0, y: 0 })
    }
  }, [pendingImages, cropImage])

  function closeCrop() {
    setPendingImages(prev => prev.slice(1))
    setCropImage(null)
  }

  function zoomIn() {
    setCropZoom(prev => Math.min(3, prev + 0.2))
  }

  function zoomOut() {
    setCropZoom(prev => Math.max(0.5, prev - 0.2))
  }

  function applyCrop() {
    if (!cropImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Create a new canvas for the cropped square image
    const croppedCanvas = document.createElement('canvas')
    const croppedCtx = croppedCanvas.getContext('2d')
    const size = Math.min(canvas.width, canvas.height)
    
    croppedCanvas.width = size
    croppedCanvas.height = size
    
    // Get the current image data from the canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    // Create a temporary canvas to hold the full image
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    tempCtx.putImageData(imageData, 0, 0)
    
    // Calculate the crop area (center square)
    const cropX = (canvas.width - size) / 2
    const cropY = (canvas.height - size) / 2
    
    // Draw the cropped square
    croppedCtx.drawImage(tempCanvas, cropX, cropY, size, size, 0, 0, size, size)
    
    croppedCanvas.toBlob(async (blob) => {
      const base64 = await blobToBase64(blob)
      const previewUrl = URL.createObjectURL(blob)
      
      // Add the cropped image to the main images array
      setImages(prev => [...prev, { previewUrl, blob, base64 }])
      
      // Remove this image from pending and move to next
      setPendingImages(prev => prev.slice(1))
      setCropImage(null)
    }, 'image/jpeg', 0.9)
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
      const finalImages = await Promise.all(
        images.map(async (img, idx) => {
          if (img.fileId) return img.fileId     // already on Drive
          if (!img.file)  return null
          const { compressListingImage } = await import('@/utils/imageCompression.js')
          const compressed = await compressListingImage(img.file)
          return driveApi.uploadListingImage(compressed, id, idx)
        })
      )

      const validFileIds = finalImages.filter(Boolean)
      
        

      const listingData = {
        id, branchId: targetBranchId, ownerPubkey: pubkey,
        vehicleName: vehicleName.trim(), vehicleNumber: vehicleNumber.trim(),
        vehicleType, pricePerDay: +pricePerDay, securityAmount: +securityAmount,
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
    <>
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
              sx={{ bgcolor: '#1E1E1E', borderRadius: 1 }}>
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
            <input ref={fileRef} type="file" hidden multiple accept="image/*" onChange={handleImageSelect} />
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

    {/* Image Cropping Drawer */}
    <Drawer anchor="bottom" open={!!cropImage} onClose={closeCrop} PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxWidth: 640, mx: 'auto', width: '100%', pb: 2 } }}>
      <Box sx={{ px: 3, pt: 3, pb: 1 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Crop Image</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <Box sx={{ position: 'relative', width: 340, height: 340, border: '2px solid #333', borderRadius: 3, overflow: 'hidden', bgcolor: '#111' }}>
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              style={{ display: 'block', width: '100%', height: '100%', cursor: 'grab' }}
              onMouseDown={(e) => {
                const startX = e.clientX - cropPosition.x
                const startY = e.clientY - cropPosition.y
                const handleMouseMove = (e) => {
                  setCropPosition({ x: e.clientX - startX, y: e.clientY - startY })
                }
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove)
                  document.removeEventListener('mouseup', handleMouseUp)
                }
                document.addEventListener('mousemove', handleMouseMove)
                document.addEventListener('mouseup', handleMouseUp)
              }}
            />
          </Box>

          <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <IconButton onClick={zoomOut} size="small" sx={{ bgcolor: '#222', color: '#fff', '&:hover': { bgcolor: '#333' } }}>
              <ZoomOutIcon />
            </IconButton>
            <Slider
              value={cropZoom}
              onChange={(e, v) => setCropZoom(v)}
              min={0.5}
              max={3}
              step={0.1}
              sx={{ flex: 1, mx: 1 }}
            />
            <IconButton onClick={zoomIn} size="small" sx={{ bgcolor: '#222', color: '#fff', '&:hover': { bgcolor: '#333' } }}>
              <ZoomInIcon />
            </IconButton>
          </Box>

          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Button variant="outlined" fullWidth onClick={closeCrop}>Cancel</Button>
            <Button variant="contained" fullWidth onClick={applyCrop}>Save Crop</Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
    </>
  )
}
