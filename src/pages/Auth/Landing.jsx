import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore.js";

export default function Landing() {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.BASE_URL;
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const { pubkey, sessionUnlocked, role } = useAuthStore();

  const [initializing, setInitializing] = useState(true);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (pubkey && sessionUnlocked) {
      navigate(role === "owner" ? "/owner" : "/rider/discover", {
        replace: true,
      });
    }
  }, [pubkey, sessionUnlocked, role]);

  // Check session on load - redirect to login if needed
  useEffect(() => {
    async function checkSession() {
      try {
        const { restoreSession, loadPersistedMeta } =
          await import("@/utils/tokenManager.js");
        const { restored, profile, needsReauth } = await restoreSession();

        if (restored && profile) {
          if (needsReauth) {
            // Session exists but token expired - go to login
            navigate("/login", { replace: true });
          } else {
            // Session is valid - try to login with stored profile
            await loginWithGoogle(profile);
            const currentRole = useAuthStore.getState().role;
            navigate(
              currentRole
                ? currentRole === "owner"
                  ? "/owner"
                  : "/rider/discover"
                : "/role",
              { replace: true },
            );
          }
        }
      } catch (err) {
        console.warn("[Landing] Session check failed:", err.message);
      } finally {
        setInitializing(false);
      }
    }

    // Only check if not already handled by first useEffect
    if (!pubkey) {
      checkSession();
    } else {
      setInitializing(false);
    }
  }, []);

  if (initializing) {
    return (
      <Box
        sx={{
          minHeight: "100dvh",
          bgcolor: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        bgcolor: "background.default",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 6,
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Box
          component="img"
          src={`${baseUrl}images/logo-without-name.png`}
          alt="Rentizo"
          sx={{ width: 200, height: 200, mb: 1 }}
        />

        <Typography
          variant="h3"
          sx={{
            fontWeight: 900,
            marginTop: "-50px",
            letterSpacing: "-1px",
            color: "#fff",
          }}
        >
          Rentizo
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "text.secondary",
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          Rent, Ride & Repeat
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.6,
          }}
        >
          Community Powered Vehicle Rental Hub
        </Typography>

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1}
          justifyContent="center"
          sx={{ mt: 2 }}
        >
          {[
            "No middleman",
            "Own your data",
            "UPI payments",
            "Works offline",
          ].map((tag) => (
            <Box
              key={tag}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 10,
                border: "1px solid #2A2A2A",
                bgcolor: "#141414",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                {tag}
              </Typography>
            </Box>
          ))}
        </Stack>

        <Stack spacing={1} sx={{ mt: 4, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            For riders: Rent vehicles from locals
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            For owners: Earn by listing your vehicle
          </Typography>
        </Stack>
      </Box>

      <Stack spacing={2} sx={{ width: "100%", maxWidth: 360 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate("/login")}
          sx={{
            py: 1.75,
            fontSize: "1rem",
            fontWeight: 700,
            bgcolor: "#fff",
            color: "#1a1a1a",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            "&:hover": { bgcolor: "#f5f5f5" },
          }}
        >
          Get Started
        </Button>
      </Stack>
    </Box>
  );
}
