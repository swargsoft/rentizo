import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import GoogleIcon from "@mui/icons-material/Google";
import useAuthStore from "@/store/authStore.js";
import { login, handleOAuthCallback } from "@/utils/tokenManager.js";

export default function Login() {
  const navigate = useNavigate();
  const baseUrl = import.meta.env.BASE_URL;
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const { pubkey, sessionUnlocked, role } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [welcomeBack, setWelcomeBack] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (pubkey && sessionUnlocked) {
      navigate(role === "owner" ? "/owner" : "/rider/discover", {
        replace: true,
      });
    } else if (pubkey && !sessionUnlocked) {
      navigate("/unlock", { replace: true });
    }
  }, [pubkey, sessionUnlocked, role]);

  useEffect(() => {
    async function initAuth() {
      try {
        const callbackResult = await handleOAuthCallback();
        if (callbackResult) {
          await doLogin(callbackResult.profile);
          return;
        }

        const { restoreSession } = await import("@/utils/tokenManager.js");
        const { restored, profile, needsReauth } = await restoreSession();

        if (restored && profile && needsReauth) {
          setWelcomeBack(profile);
        } else if (restored && profile && !needsReauth) {
          await doLogin(profile);
        }
      } catch (err) {
        console.warn("[Login] Auth init failed:", err.message);
      } finally {
        setInitializing(false);
      }
    }

    initAuth();
  }, []);

  async function doLogin(profile) {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle(profile);
      const currentRole = useAuthStore.getState().role;
      const isNewUser = !currentRole;
      navigate(
        isNewUser
          ? "/role"
          : currentRole === "owner"
            ? "/owner"
            : "/rider/discover",
        { replace: true },
      );
    } catch (err) {
      console.error("[Login] Login failed:", err.message);
      setError("Sign-in failed. Please try again.");
      setWelcomeBack(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    try {
      const { reauthSilently, login } = await import("@/utils/tokenManager.js");

      const result = await reauthSilently();

      if (result?.profile) {
        await doLogin(result.profile);
        return;
      }

      const loginResult = await login();
      if (loginResult?.profile) {
        await doLogin(loginResult.profile);
      }
    } catch (err) {
      console.error("[Login] Login failed:", err.message);
      setError("Sign-in failed. Please try again.");
      setLoading(false);
    }
  }

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
      </Box>

      <Stack spacing={2} sx={{ width: "100%", maxWidth: 360 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          fullWidth
          startIcon={
            loading ? (
              <CircularProgress size={20} color="inherit" />
            ) : welcomeBack ? null : (
              <GoogleIcon />
            )
          }
          onClick={handleGoogleLogin}
          disabled={loading}
          sx={{
            py: 1.75,
            fontSize: "1rem",
            fontWeight: 700,
            bgcolor: "#fff",
            color: "#1a1a1a",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            "&:hover": { bgcolor: "#f5f5f5" },
            "&:disabled": { bgcolor: "#ccc", color: "#888" },
          }}
        >
          {loading
            ? "Signing in…"
            : welcomeBack
              ? `Continue with ${welcomeBack.name?.split(" ")[0] || "Google"}`
              : "Continue with Google"}
        </Button>

        {!welcomeBack && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            By continuing, you agree to our{" "}
            <a
              href="/rentizo/terms"
              target="_blank"
              style={{ color: "#fff", textDecoration: "underline" }}
            >
              Terms of Service
            </a>{" "}
            and acknowledge that you have read our{" "}
            <a
              href="/rentizo/privacy"
              target="_blank"
              style={{ color: "#fff", textDecoration: "underline" }}
            >
              Privacy Policy
            </a>
            .
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
