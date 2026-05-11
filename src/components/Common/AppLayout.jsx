import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemo, useEffect, useState } from "react";
import useAuthStore from "@/store/authStore.js";
import useCartStore from "@/store/cartStore.js";
import {
  getRelayStatuses,
  getLiveRelayCount,
  onRelayStatusChange,
} from "@/nostr/client.js";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { Tooltip } from "@mui/material";

// Owner nav icons
import DashboardIcon from "@mui/icons-material/Dashboard";
import StorefrontIcon from "@mui/icons-material/Storefront";
import BookmarksIcon from "@mui/icons-material/Bookmarks";
import PersonIcon from "@mui/icons-material/Person";
// Rider nav icons
import ExploreIcon from "@mui/icons-material/Explore";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
// Common
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SettingsIcon from "@mui/icons-material/Settings";
import { FmdGoodRounded } from "@mui/icons-material";

const OWNER_TABS = [
  { label: "Dashboard", icon: <DashboardIcon />, path: "/owner" },
  { label: "Branches", icon: <FmdGoodRounded />, path: "/owner/branches" },
  { label: "Bookings", icon: <BookmarksIcon />, path: "/owner/bookings" },
  { label: "Profile", icon: <PersonIcon />, path: "/owner/profile" },
];

const RIDER_TABS = [
  { label: "Discover", icon: <ExploreIcon />, path: "/rider/discover" },
  { label: "Cart", icon: <ShoppingCartIcon />, path: "/rider/cart" },
  { label: "Bookings", icon: <ReceiptLongIcon />, path: "/rider/bookings" },
  { label: "Profile", icon: <PersonIcon />, path: "/rider/profile" },
];

function RelayStatusDot() {
  const [liveCount, setLiveCount] = useState(getLiveRelayCount());
  const [statuses, setStatuses] = useState(getRelayStatuses());

  useEffect(() => {
    return onRelayStatusChange(() => {
      setLiveCount(getLiveRelayCount());
      setStatuses(getRelayStatuses());
    });
  }, []);

  const isOnline = liveCount > 0;
  const tooltipText =
    Object.entries(statuses)
      .map(
        ([url, s]) =>
          `${s === "connected" ? "✅" : s === "connecting" ? "⏳" : "❌"} ${url}`,
      )
      .join("\n") || "No relays configured";

  return (
    <Tooltip
      title={<span style={{ whiteSpace: "pre-line" }}>{tooltipText}</span>}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {isOnline ? (
          <CloudDoneIcon sx={{ fontSize: 16, color: "success.main" }} />
        ) : (
          <CloudOffIcon sx={{ fontSize: 16, color: "text.disabled" }} />
        )}
      </Box>
    </Tooltip>
  );
}

export default function AppLayout({ children, title, showBack = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAuthStore((s) => s.role);
  const cartItems = useCartStore((s) =>
    s.items.reduce((n, i) => n + i.quantity, 0),
  );

  const tabs = role === "owner" ? OWNER_TABS : RIDER_TABS;

  const currentTab = useMemo(() => {
    const idx = tabs.findIndex(
      (t) =>
        location.pathname.startsWith(t.path) &&
        t.path !== "/owner" &&
        t.path !== "/rider",
    );
    if (idx !== -1) return idx;
    return tabs.findIndex((t) => location.pathname === t.path);
  }, [location.pathname, tabs]);

  const handleTabChange = (_, newValue) => {
    navigate(tabs[newValue].path);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        bgcolor: "background.default",
      }}
    >
      {/* Top AppBar */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 1, minHeight: "56px !important" }}>
          {showBack && (
            <IconButton
              edge="start"
              onClick={() => navigate(-1)}
              sx={{ color: "text.primary", mr: 0.5 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              fontWeight: 800,
              color: "primary.main",
              letterSpacing: "-0.5px",
            }}
          >
            {title || "Rentizo"}
          </Typography>
          <RelayStatusDot />
          <IconButton
            onClick={() => navigate("/settings")}
            sx={{ color: "text.secondary" }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Page Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {children}
      </Box>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={currentTab}
        onChange={handleTabChange}
        sx={{ flexShrink: 0 }}
      >
        {tabs.map((tab, i) => (
          <BottomNavigationAction
            key={tab.label}
            label={tab.label}
            icon={
              tab.label === "Cart" ? (
                <Badge badgeContent={cartItems} color="primary" max={9}>
                  <ShoppingCartIcon />
                </Badge>
              ) : (
                tab.icon
              )
            }
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
