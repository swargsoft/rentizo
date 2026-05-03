import { useState, useEffect } from 'react'
import { Box, Typography, Button, Stack, TextField, Switch, FormControlLabel, Alert, CircularProgress, Divider } from '@mui/material'
import MyLocationIcon from '@mui/icons-material/MyLocation'
import { useNavigate, useParams } from 'react-router-dom'
import AppLayout from '@/components/Common/AppLayout.jsx'
import BranchPinMap from '@/components/Map/BranchPinMap.jsx'
import useAuthStore from '@/store/authStore.js'
import useUiStore from '@/store/uiStore.js'
import { publishBranch } from '@/nostr/publish.js'
import { getCurrentPosition, reverseGeocode } from '@/utils/geo.js'
import db from '@/db/index.js'
import { nanoid } from '@/utils/nanoid.js'

export default function BranchForm() {
  const navigate         = useNavigate()
  const { branchId }     = useParams()
  const { pubkey, secretKey } = useAuthStore()
  const showSnackbar     = useUiStore(s => s.showSnackbar)
  const isEdit           = !!branchId

  const [branchName, setBranchName] = useState('')
  const [address,    setAddress]    = useState('')
  const [phone,      setPhone]      = useState('')
  const [lat,        setLat]        = useState(null)
  const [lng,        setLng]        = useState(null)
  const [isActive,   setIsActive]   = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [locating,   setLocating]   = useState(false)
  const [errors,     setErrors]     = useState({})

  useEffect(() => {
    if (isEdit) {
      db.branches.get(branchId).then(b => {
        if (!b) return
        setBranchName(b.branchName); setAddress(b.address)
        setPhone(b.phone ?? ''); setLat(b.lat); setLng(b.lng); setIsActive(b.isActive)
      })
    }
  }, [branchId])

  async function handleUseMyLocation() {
    setLocating(true)
    const pos = await getCurrentPosition()
    if (pos) {
      setLat(pos.lat); setLng(pos.lng)
      const addr = await reverseGeocode(pos.lat, pos.lng)
      if (!address) setAddress(addr)
    } else {
      showSnackbar('Could not get location', 'error')
    }
    setLocating(false)
  }

  function handleMapPin(newLat, newLng) {
    setLat(newLat); setLng(newLng)
  }

  function validate() {
    const errs = {}
    if (!branchName.trim()) errs.branchName = 'Branch name is required'
    if (!address.trim())    errs.address    = 'Address is required'
    if (!lat || !lng)       errs.location   = 'Pin a location on the map'
    setErrors(errs)
    return !Object.keys(errs).length
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true)
    try {
      const id = branchId ?? nanoid()
      const branchData = { id, ownerPubkey: pubkey, branchName: branchName.trim(), address: address.trim(), phone: phone.trim(), lat, lng, isActive, updatedAt: Math.floor(Date.now()/1000) }
      await publishBranch(branchData, secretKey)
      await db.branches.put(branchData)
      showSnackbar(isEdit ? 'Branch updated!' : 'Branch created!', 'success')
      navigate('/owner/branches')
    } catch (err) {
      showSnackbar('Error: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title={isEdit ? 'Edit Branch' : 'New Branch'} showBack>
      <Box sx={{ p: 2, pb: 4 }}>
        <Stack spacing={2.5}>
          <TextField label="Branch Name" value={branchName} onChange={e => setBranchName(e.target.value)}
            placeholder="e.g. Bandra West Branch" error={!!errors.branchName} helperText={errors.branchName} />

          <TextField label="Full Address" value={address} onChange={e => setAddress(e.target.value)}
            multiline rows={2} placeholder="Street, Area, City, Pincode"
            error={!!errors.address} helperText={errors.address} />

          <TextField label="Branch Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)} type="tel" />

          <Divider><Typography variant="caption" sx={{ color: 'text.secondary' }}>Pin Location on Map</Typography></Divider>

          <Button
            variant="outlined"
            startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
            onClick={handleUseMyLocation}
            disabled={locating}
            sx={{ borderColor: '#333', color: 'text.primary' }}
          >
            {locating ? 'Getting location…' : 'Use My Current Location'}
          </Button>

          {errors.location && <Alert severity="error" sx={{ borderRadius: 2 }}>{errors.location}</Alert>}

          <BranchPinMap lat={lat} lng={lng} onLocationChange={handleMapPin} />

          {lat && lng && (
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              📍 {lat.toFixed(5)}, {lng.toFixed(5)} — drag pin to adjust
            </Typography>
          )}

          <FormControlLabel
            control={<Switch checked={isActive} onChange={e => setIsActive(e.target.checked)} color="primary" />}
            label={<Typography variant="body2">Branch is Active (visible to riders)</Typography>}
          />

          <Button variant="contained" size="large" onClick={handleSave} disabled={saving} sx={{ py: 1.5 }}>
            {saving ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : isEdit ? 'Update Branch' : 'Create Branch'}
          </Button>
        </Stack>
      </Box>
    </AppLayout>
  )
}
