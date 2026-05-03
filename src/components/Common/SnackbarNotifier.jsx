import { Snackbar, Alert } from '@mui/material'
import useUiStore from '@/store/uiStore.js'

export default function SnackbarNotifier() {
  const { snackbar, closeSnackbar } = useUiStore()
  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={3500}
      onClose={closeSnackbar}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 80, sm: 24 } }}
    >
      <Alert
        onClose={closeSnackbar}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  )
}
