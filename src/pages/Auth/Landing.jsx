import { Box, Typography, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import useAuthStore from "@/store/authStore.js";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";

export default function Landing() {
  const navigate = useNavigate();
  const { pubkey, sessionUnlocked, role } = useAuthStore();

  useEffect(() => {
    if (pubkey && sessionUnlocked) {
      navigate(role === "owner" ? "/owner" : "/rider/discover", {
        replace: true,
      });
    } else if (pubkey && !sessionUnlocked) {
      navigate("/unlock", { replace: true });
    }
  }, [pubkey, sessionUnlocked, role]);

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
      {/* Hero */}
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
          src="/images/logo-without-name.png"
          alt="vehicle"
          sx={{
            width: 200,
            height: 200,
            mb: 1,
          }}
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

        {/* Feature pills */}
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

      {/* CTAs */}
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 360 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          onClick={() => navigate("/generate")}
          sx={{ py: 1.5, fontSize: "1rem" }}
        >
          Create New Account
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          onClick={() => navigate("/login")}
          sx={{
            py: 1.5,
            fontSize: "1rem",
            borderColor: "#333",
            color: "text.primary",
          }}
        >
          I Have a Identity Key
        </Button>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", textAlign: "center" }}
        >
          Your identity = your keys. No email, no password.
        </Typography>
      </Stack>
    </Box>
  );
}
