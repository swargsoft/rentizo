import { useState, useCallback, useEffect, useMemo } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Button, Typography, IconButton, CircularProgress } from '@mui/material'
import RotateLeftIcon from '@mui/icons-material/RotateLeft'
import RotateRightIcon from '@mui/icons-material/RotateRight'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import CropIcon from '@mui/icons-material/Crop'
import CloseIcon from '@mui/icons-material/Close'
import { createCanvasFromImage } from '@/utils/imageCropUtils.js'
import Cropper from 'react-easy-crop'

// Normalize rotation to 0-360 range for display
const normalizeRotation = (r) => ((r % 360) + 360) % 360

export default function ImageCropDialog({ open, imageSrc, onClose, onCrop, aspectRatio = 1, title = 'Crop Image' }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [crop, setCrop] = useState({ x: 0, y: 0 })

  // Initialize when dialog opens
  useEffect(() => {
    if (open && imageSrc) {
      // Short delay to ensure DOM is ready
      const timer = setTimeout(() => {
        setIsReady(true)
      }, 50)
      return () => clearTimeout(timer)
    }
    return () => setIsReady(false)
  }, [open, imageSrc])

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setZoom(1)
      setRotation(0)
      setCroppedAreaPixels(null)
      setIsReady(false)
    }
  }, [open])

  const handleCropComplete = useCallback((cropArea, pixels) => {
    // Guard: only set if we have valid pixel data
    if (pixels && typeof pixels.x === 'number' && pixels.width > 0) {
      setCroppedAreaPixels({ ...pixels })
    }
  }, [])

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels || typeof croppedAreaPixels.x !== 'number') {
      console.warn('No valid crop area')
      return
    }
    try {
      const blob = await createCanvasFromImage(imageSrc, croppedAreaPixels, rotation)
      onCrop(blob)
      onClose()
    } catch (err) {
      console.error('Crop error:', err)
    }
  }, [croppedAreaPixels, imageSrc, rotation, onCrop, onClose])

  // Don't render if not ready or no image
  const canRender = open && imageSrc && isReady

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        {title}
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2, pb: 2 }}>
        <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: '#1a1a1a', borderRadius: 1, overflow: 'hidden' }}>
          {!canRender ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <CircularProgress size={32} sx={{ color: '#fff' }} />
            </Box>
          ) : (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={handleCropComplete}
            />
          )}
        </Box>

        {/* Controls */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: { xs: 1, md: 3 },
          mt: 3,
          flexWrap: 'wrap'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => setZoom(z => Math.max(1, z - 0.2))} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'center' }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton size="small" onClick={() => setZoom(z => Math.min(3, z + 0.2))} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 1, height: 24, bgcolor: 'divider' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={() => setRotation(r => r - 90)} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <RotateLeftIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'center' }}>
              {normalizeRotation(rotation)}°
            </Typography>
            <IconButton size="small" onClick={() => setRotation(r => r + 90)} sx={{ border: '1px solid', borderColor: 'divider' }}>
              <RotateRightIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          size='small'
          startIcon={<CropIcon />}
          onClick={handleCrop}
          disabled={!croppedAreaPixels || typeof croppedAreaPixels.x !== 'number'}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  )
}