import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main:        '#FF5722',
      light:       '#FF8A65',
      dark:        '#E64A19',
      contrastText:'#FFFFFF',
    },
    secondary: {
      main:        '#FFC107',
      light:       '#FFD54F',
      dark:        '#FF8F00',
      contrastText:'#000000',
    },
    background: {
      default: '#0A0A0A',
      paper:   '#141414',
    },
    surface: {
      main: '#1E1E1E',
    },
    text: {
      primary:   '#FFFFFF',
      secondary: '#AAAAAA',
    },
    error:   { main: '#FF5252' },
    success: { main: '#69F0AE' },
    warning: { main: '#FFD740' },
    divider: '#2A2A2A',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 700, textTransform: 'none', letterSpacing: '0.3px' },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0A0A0A',
          overscrollBehavior: 'none',
          WebkitTapHighlightColor: 'transparent',
        },
        '*::-webkit-scrollbar': { width: '4px' },
        '*::-webkit-scrollbar-track': { background: '#141414' },
        '*::-webkit-scrollbar-thumb': { background: '#333', borderRadius: '4px' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
          fontSize: '0.95rem',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)',
          boxShadow: '0 4px 15px rgba(255,87,34,0.3)',
          '&:hover': { boxShadow: '0 6px 20px rgba(255,87,34,0.45)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#141414',
          border: '1px solid #2A2A2A',
          borderRadius: 16,
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#1E1E1E',
            '& fieldset': { borderColor: '#333' },
            '&:hover fieldset': { borderColor: '#FF5722' },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600 },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#141414',
          borderTop: '1px solid #2A2A2A',
          height: 64,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#666',
          '&.Mui-selected': { color: '#FF5722' },
          minWidth: 60,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#0A0A0A',
          backgroundImage: 'none',
          borderBottom: '1px solid #1E1E1E',
          boxShadow: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#141414', backgroundImage: 'none' },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(135deg, #FF5722 0%, #E64A19 100%)',
          boxShadow: '0 4px 15px rgba(255,87,34,0.4)',
          '&:hover': { boxShadow: '0 6px 20px rgba(255,87,34,0.55)' },
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: '#2A2A2A' } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&:hover': { backgroundColor: '#1E1E1E' },
          '&.Mui-selected': { backgroundColor: 'rgba(255,87,34,0.12)' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { '&.Mui-checked': { color: '#FF5722' } },
        track: { '.Mui-checked.Mui-checked + &': { backgroundColor: '#FF5722' } },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: '#2A2A2A', borderRadius: 4 },
        bar: { backgroundColor: '#FF5722' },
      },
    },
  },
})

export default theme
