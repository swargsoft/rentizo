import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  Chip,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import AppLayout from "@/components/Common/AppLayout.jsx";
import useAuthStore from "@/store/authStore.js";
import useNostrStore from "@/store/nostrStore.js";
import useUiStore from "@/store/uiStore.js";
import { useRelayHealthCheck } from "@/hooks/useRelayHealthCheck.js";
import { getSetting, setSetting } from "@/db/index.js";
import { setRelays, DEFAULT_RELAYS } from "@/nostr/client.js";
import { probeRelays, getCachedRelayHealth } from "@/nostr/relayHealth.js";
import { pubkeyToNpub, secretKeyToNsec } from "@/utils/nostrValidation.js";
import { secretKeyToHex } from "@/utils/keyEncryption.js";

export default function Settings() {
  const navigate = useNavigate();
  const { pubkey, secretKey, role, logout, updateRole } = useAuthStore();
  const { relayHealth, setRelayHealthBatch } = useNostrStore();
  const showSnackbar = useUiStore((s) => s.showSnackbar);
  const showConfirm = useUiStore((s) => s.showConfirm);
  const [currentRelays, setCurrentRelays] = useState(DEFAULT_RELAYS);
  const [relayInput, setRelayInput] = useState(DEFAULT_RELAYS.join(","));
  const [showNsec, setShowNsec] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    getSetting("relays").then((saved) => {
      if (saved?.length) {
        setCurrentRelays(saved);
        setRelayInput(saved.join(","));
      }
    });
    // Load cached relay health
    const cached = getCachedRelayHealth();
    if (cached?.length) {
      setRelayHealthBatch(cached);
    }
  }, []);

  // Automatically probe relay health every 5 minutes
  useRelayHealthCheck(currentRelays, 5 * 60 * 1000);

  async function handleProbeRelays() {
    setProbing(true);
    try {
      const results = await probeRelays(currentRelays);
      setRelayHealthBatch(results);
      showSnackbar("Relay health checked", "success");
    } catch (err) {
      showSnackbar("Failed to probe relays", "error");
    } finally {
      setProbing(false);
    }
  }

  async function handleSaveRelays() {
    const relays = relayInput
      .split(",")
      .map((r) => r.trim())
      .filter((r) => r.startsWith("wss://"));
    if (!relays.length) {
      showSnackbar("Enter at least one valid wss:// relay", "error");
      return;
    }
    await setSetting("relays", relays);
    setRelays(relays);
    setCurrentRelays(relays);
    setEditOpen(false);
    showSnackbar("Relays updated", "success");
    // Probe new relays
    setProbing(true);
    try {
      const results = await probeRelays(relays);
      setRelayHealthBatch(results);
    } finally {
      setProbing(false);
    }
  }

  function handleLogout() {
    showConfirm(
      "Log Out?",
      "Your encrypted key stays on this device. You can log back in with your PIN.",
      () => {
        logout();
        navigate("/", { replace: true });
      },
    );
  }

  const nsec = secretKey ? secretKeyToNsec(secretKey) : "";
  const connectedCount = currentRelays.filter((r) => relayHealth[r]?.ok).length;

  const getRelayDisplay = (relay) => {
    const health = relayHealth[relay];
    if (!health)
      return {
        label: "Probing…",
        color: "warning.main",
        bg: "rgba(255,193,7,0.15)",
      };
    if (!health.ok)
      return {
        label: "Offline",
        color: "error.main",
        bg: "rgba(244,67,54,0.15)",
      };
    if (health.latencyMs > 2000)
      return {
        label: `${health.latencyMs}ms`,
        color: "warning.main",
        bg: "rgba(255,193,7,0.15)",
      };
    return {
      label: "Connected",
      color: "success.main",
      bg: "rgba(105,240,174,0.15)",
    };
  };

  return (
    <AppLayout title="Settings" showBack>
      <Box sx={{ p: 2, pb: 4 }}>
        <Stack spacing={3}>
          {/* Identity */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              Identity
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#141414",
                borderRadius: 1,
                border: "1px solid #2A2A2A",
                mb: 1.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontWeight: 600 }}
              >
                Public Key (npub)
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontFamily: "monospace",
                  color: "success.main",
                  wordBreak: "break-all",
                  fontSize: "0.65rem",
                  mt: 0.5,
                }}
              >
                {pubkey ? pubkeyToNpub(pubkey) : "—"}
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowNsec((v) => !v)}
              sx={{
                borderColor: "#333",
                color: "warning.main",
                mb: showNsec ? 1 : 0,
              }}
            >
              {showNsec ? "Hide" : "Show"} Private Key (nsec)
            </Button>

            {showNsec && (
              <Alert severity="warning" sx={{ mt: 1, borderRadius: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: "monospace",
                    wordBreak: "break-all",
                    display: "block",
                  }}
                >
                  {nsec}
                </Typography>
              </Alert>
            )}
          </Box>

          <Divider />

          {/* Role */}
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
              Role
            </Typography>
            <Stack direction="row" spacing={1}>
              {["owner", "rider", "both"].map((r) => (
                <Button
                  key={r}
                  variant={role === r ? "contained" : "outlined"}
                  size="small"
                  onClick={() => updateRole(r)}
                  sx={{
                    textTransform: "capitalize",
                    borderColor: "#333",
                    flex: 1,
                  }}
                >
                  {r}
                </Button>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Relays */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Box>
                <Typography variant="subtitle1">Nostr Relays</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {connectedCount} of {currentRelays.length} connected
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  startIcon={
                    probing ? <CircularProgress size={16} /> : <RefreshIcon />
                  }
                  variant="outlined"
                  size="small"
                  onClick={handleProbeRelays}
                  disabled={probing}
                  sx={{ borderColor: "#333" }}
                >
                  {probing ? "Checking..." : "Check"}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={async () => {
                    await setSetting("relays", null);
                    setRelayInput(DEFAULT_RELAYS.join(","));
                    setCurrentRelays(DEFAULT_RELAYS);
                    setRelays(DEFAULT_RELAYS);
                    showSnackbar("Relays reset to defaults", "success");
                  }}
                  sx={{ borderColor: "#333", color: "text.secondary" }}
                >
                  Reset to Defaults
                </Button>
                <Button
                  startIcon={<EditIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => setEditOpen(true)}
                  sx={{ borderColor: "#333" }}
                >
                  Edit
                </Button>
              </Stack>
            </Stack>

            <TableContainer
              sx={{
                borderRadius: 1,
                border: "1px solid #2A2A2A",
                bgcolor: "#141414",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#1E1E1E" }}>
                    <TableCell
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      Relay URL
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: "text.secondary",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      Status
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentRelays.map((relay) => {
                    const display = getRelayDisplay(relay);
                    return (
                      <TableRow
                        key={relay}
                        sx={{ "&:hover": { bgcolor: "#1A1A1A" } }}
                      >
                        <TableCell
                          sx={{
                            color: "text.primary",
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            wordBreak: "break-all",
                          }}
                        >
                          {relay}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={display.label}
                            size="small"
                            sx={{
                              bgcolor: display.bg,
                              color: display.color,
                              fontWeight: 600,
                              fontSize: "0.7rem",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {/* Active relays being used */}
            {(() => {
              const online = currentRelays
                .filter((r) => relayHealth[r]?.ok)
                .sort(
                  (a, b) =>
                    (relayHealth[a]?.latencyMs ?? Infinity) -
                    (relayHealth[b]?.latencyMs ?? Infinity),
                )
                .slice(0, 3);

              if (!online.length) return null;

              return (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    bgcolor: "rgba(105,240,174,0.06)",
                    borderRadius: 1,
                    border: "1px solid rgba(105,240,174,0.15)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "success.main",
                      fontWeight: 700,
                      display: "block",
                      mb: 0.75,
                    }}
                  >
                    ⚡ Top 3 Active Relays
                  </Typography>
                  {online.map((r) => (
                    <Typography
                      key={r}
                      variant="caption"
                      sx={{
                        display: "block",
                        fontFamily: "monospace",
                        color: "text.secondary",
                        fontSize: "0.7rem",
                      }}
                    >
                      {r} — {relayHealth[r]?.latencyMs}ms
                    </Typography>
                  ))}
                </Box>
              );
            })()}
          </Box>

          <Divider />

          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            sx={{ borderColor: "#FF5252", py: 1.5 }}
          >
            Log Out
          </Button>
        </Stack>
      </Box>

      {/* Edit Relays Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Relays</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block", mb: 1 }}
              >
                One relay URL per line Comma-separated (wss://…)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                value={relayInput}
                onChange={(e) => setRelayInput(e.target.value)}
                placeholder={`wss://relay.damus.io,
                              wss://relay.nostr.band`}
                inputProps={{
                  style: { fontFamily: "monospace", fontSize: "0.8rem" },
                }}
              />
            </Box>
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#1E1E1E",
                borderRadius: 1,
                border: "1px solid #2A2A2A",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", display: "block", mb: 0.5 }}
              >
                Need help finding relays?
              </Typography>
              <Link
                href="https://nostr.watch"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "primary.main",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Visit nostr.watch <OpenInNewIcon sx={{ fontSize: "0.9rem" }} />
              </Link>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setEditOpen(false)}
            sx={{ color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSaveRelays}>
            Save Relays
          </Button>
        </DialogActions>
      </Dialog>
    </AppLayout>
  );
}
