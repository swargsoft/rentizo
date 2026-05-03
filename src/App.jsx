import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import useAuthStore from '@/store/authStore.js'
import useCartStore from '@/store/cartStore.js'
import { useHydration } from '@/hooks/useHydration.js'
import { useOfflineQueue } from '@/hooks/useOfflineQueue.js'
import { useIncomingBookings } from '@/hooks/useBookings.js'
import SnackbarNotifier from '@/components/Common/SnackbarNotifier.jsx'
import ConfirmDialog    from '@/components/Common/ConfirmDialog.jsx'
import OfflineBanner    from '@/components/Common/OfflineBanner.jsx'

// Auth
import Landing     from '@/pages/Auth/Landing.jsx'
import Login       from '@/pages/Auth/Login.jsx'
import GenerateKey from '@/pages/Auth/GenerateKey.jsx'
import PinSetup    from '@/pages/Auth/PinSetup.jsx'
import PinUnlock   from '@/pages/Auth/PinUnlock.jsx'
import RoleSelect  from '@/pages/Auth/RoleSelect.jsx'

// Owner
import OwnerDashboard        from '@/pages/Owner/Dashboard.jsx'
import OwnerProfile          from '@/pages/Owner/Profile.jsx'
import OwnerBranches         from '@/pages/Owner/Branches.jsx'
import OwnerBranchForm       from '@/pages/Owner/BranchForm.jsx'
import OwnerListings         from '@/pages/Owner/Listings.jsx'
import OwnerListingForm      from '@/pages/Owner/ListingForm.jsx'
import OwnerBookingMgmt      from '@/pages/Owner/BookingManagement.jsx'

// Rider
import RiderDiscover         from '@/pages/Rider/Discover.jsx'
import RiderProfile          from '@/pages/Rider/Profile.jsx'
import RiderBranchDetail     from '@/pages/Rider/BranchDetail.jsx'
import RiderCart             from '@/pages/Rider/Cart.jsx'
import RiderCheckout         from '@/pages/Rider/Checkout.jsx'
import RiderBookingConfirm   from '@/pages/Rider/BookingConfirm.jsx'
import RiderMyBookings       from '@/pages/Rider/MyBookings.jsx'

// Shared
import Settings from '@/pages/Shared/Settings.jsx'
import NotFound from '@/pages/Shared/NotFound.jsx'

function AppInner() {
  useHydration()
  useOfflineQueue()
  useIncomingBookings()
  return null
}

function RequireAuth({ children, requiredRole }) {
  const { pubkey, role, sessionUnlocked } = useAuthStore()
  if (!pubkey) return <Navigate to="/" replace />
  if (!sessionUnlocked) return <Navigate to="/unlock" replace />
  if (requiredRole && role !== requiredRole && role !== 'both') {
    return <Navigate to={role === 'owner' ? '/owner' : '/rider/discover'} replace />
  }
  return children
}

export default function App() {
  const { pubkey, role, sessionUnlocked } = useAuthStore()
  const loadCart = useCartStore(s => s.loadCart)

  useEffect(() => { loadCart() }, [])

  return (
    <>
      <OfflineBanner />
      {pubkey && sessionUnlocked && <AppInner />}
      <Routes>
        {/* ── Public ─────────────────────────────────────────────── */}
        <Route path="/"         element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/generate" element={<GenerateKey />} />
        <Route path="/pin-setup"element={<PinSetup />} />
        <Route path="/unlock"   element={<PinUnlock />} />
        <Route path="/role"     element={<RoleSelect />} />

        {/* ── Owner ──────────────────────────────────────────────── */}
        <Route path="/owner" element={<RequireAuth><OwnerDashboard /></RequireAuth>} />
        <Route path="/owner/profile" element={<RequireAuth><OwnerProfile /></RequireAuth>} />
        <Route path="/owner/branches" element={<RequireAuth><OwnerBranches /></RequireAuth>} />
        <Route path="/owner/branches/new" element={<RequireAuth><OwnerBranchForm /></RequireAuth>} />
        <Route path="/owner/branches/:branchId/edit" element={<RequireAuth><OwnerBranchForm /></RequireAuth>} />
        <Route path="/owner/branches/:branchId/listings" element={<RequireAuth><OwnerListings /></RequireAuth>} />
        <Route path="/owner/branches/:branchId/listings/new" element={<RequireAuth><OwnerListingForm /></RequireAuth>} />
        <Route path="/owner/listings/:listingId/edit" element={<RequireAuth><OwnerListingForm /></RequireAuth>} />
        <Route path="/owner/bookings" element={<RequireAuth><OwnerBookingMgmt /></RequireAuth>} />

        {/* ── Rider ──────────────────────────────────────────────── */}
        <Route path="/rider/discover" element={<RequireAuth><RiderDiscover /></RequireAuth>} />
        <Route path="/rider/profile"  element={<RequireAuth><RiderProfile /></RequireAuth>} />
        <Route path="/rider/branches/:branchId" element={<RequireAuth><RiderBranchDetail /></RequireAuth>} />
        <Route path="/rider/cart"     element={<RequireAuth><RiderCart /></RequireAuth>} />
        <Route path="/rider/checkout" element={<RequireAuth><RiderCheckout /></RequireAuth>} />
        <Route path="/rider/booking/:bookingId" element={<RequireAuth><RiderBookingConfirm /></RequireAuth>} />
        <Route path="/rider/bookings" element={<RequireAuth><RiderMyBookings /></RequireAuth>} />

        {/* ── Shared ─────────────────────────────────────────────── */}
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*"         element={<NotFound />} />
      </Routes>
      <SnackbarNotifier />
      <ConfirmDialog />
    </>
  )
}
