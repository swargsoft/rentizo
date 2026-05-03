import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import useUiStore from '@/store/uiStore.js'

export default function ConfirmDialog() {
  const { confirm, closeConfirm } = useUiStore()

  const handleConfirm = () => {
    confirm.onConfirm?.()
    closeConfirm()
  }

  return (
    <Dialog
      open={confirm.open}
      onClose={closeConfirm}
      PaperProps={{ sx: { borderRadius: 3, bgcolor: '#141414', border: '1px solid #2A2A2A', mx: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{confirm.title}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ color: 'text.secondary' }}>{confirm.message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={closeConfirm} variant="outlined" sx={{ borderColor: '#333', color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="error">
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  )
}
