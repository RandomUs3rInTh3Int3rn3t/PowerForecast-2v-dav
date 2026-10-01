import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import {
  Close as CloseIcon,
  Bolt as BoltIcon,
  Speed as SpeedIcon,
  CloudQueue as CloudIcon,
  CameraAlt as CameraIcon,
  VerifiedUser as ShieldCheckIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningIcon,
} from "@mui/icons-material";
import { useColorMode } from "../../theme/AppTheme";
import { useLanguage } from "../../context/LanguageContext";

interface SystemTestingBannerProps {
  forceVisible?: boolean;
  variant?: "app" | "landing" | "auth";
}

export const SystemTestingBanner: React.FC<SystemTestingBannerProps> = ({
  forceVisible = false,
  variant = "app",
}) => {
  const { mode } = useColorMode();
  const { t } = useLanguage();
  const isDark = mode === "dark";

  // Purely in-memory state: resets upon page refresh (F5/Ctrl+R), logout, or restart
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Clean up any legacy sessionStorage key so old sessions don't suppress the banner
  useEffect(() => {
    try {
      sessionStorage.removeItem("powerforecast_testing_banner_dismissed");
      localStorage.removeItem("powerforecast_testing_banner_dismissed");
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  if (isDismissed && !forceVisible) {
    return null;
  }

  return (
    <>
      {/* HubSpot-Inspired Sleek Full-Width Announcement Banner Strip */}
      <Box
        component="aside"
        aria-label="Testing phase system advisory banner"
        sx={{
          width: "100%",
          position: "relative",
          zIndex: 1050,
          boxSizing: "border-box",
          px: { xs: 2, sm: 3, md: 4 },
          py: { xs: 1.25, md: 1 },
          // HubSpot muted sage / amber tint in light mode, deep obsidian-teal in dark mode
          bgcolor: isDark
            ? "rgba(11, 26, 25, 0.96)"
            : "#e3ece6",
          borderBottom: "1px solid",
          borderColor: isDark
            ? "rgba(0, 229, 201, 0.22)"
            : "rgba(16, 185, 129, 0.25)",
          color: isDark ? "#e2e8f0" : "#1e293b",
          backdropFilter: "blur(12px)",
          transition: "all 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            minHeight: { xs: "auto", md: 36 },
            maxWidth: 1360,
            mx: "auto",
          }}
        >
          {/* Centered Message Area */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              textAlign: "center",
              gap: { xs: 0.75, sm: 1.25 },
              pr: { xs: 4, md: 5 }, // give room so close button never overlaps
              pl: { xs: 0, sm: 2 },
            }}
          >
            {/* Live Indicator Icon */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <BoltIcon
                sx={{
                  fontSize: 18,
                  color: isDark ? "#00e5c9" : "#059669",
                  filter: isDark
                    ? "drop-shadow(0 0 6px rgba(0, 229, 201, 0.6))"
                    : "none",
                }}
              />
              <Typography
                component="span"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "0.8125rem", sm: "0.875rem" },
                  color: isDark ? "#ffffff" : "#0f172a",
                  letterSpacing: "-0.01em",
                }}
              >
                {t("banner.lead", "Active Testing Phase:")}
              </Typography>
            </Box>

            {/* Context Message */}
            <Typography
              component="span"
              sx={{
                fontSize: { xs: "0.78125rem", sm: "0.875rem" },
                color: isDark ? "#cbd5e1" : "#334155",
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {t(
                "banner.message",
                "Expect occasional delays or Vercel serverless timeouts due to heavy concurrent user traffic."
              )}
            </Typography>

            {/* HubSpot-Style Inline Pill Button */}
            <Button
              onClick={() => setModalOpen(true)}
              size="small"
              sx={{
                borderRadius: "9999px",
                textTransform: "none",
                fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                fontWeight: 700,
                px: { xs: 1.5, sm: 2 },
                py: { xs: 0.35, sm: 0.4 },
                minWidth: "auto",
                bgcolor: isDark ? "#1e293b" : "#111827",
                color: isDark ? "#00e5c9" : "#ffffff",
                border: "1px solid",
                borderColor: isDark ? "rgba(0, 229, 201, 0.4)" : "#111827",
                boxShadow: isDark
                  ? "0 2px 8px rgba(0, 0, 0, 0.4)"
                  : "0 2px 6px rgba(0, 0, 0, 0.12)",
                "&:hover": {
                  bgcolor: isDark ? "rgba(0, 229, 201, 0.16)" : "#1f2937",
                  borderColor: isDark ? "#00e5c9" : "#1f2937",
                },
                ml: { xs: 0, sm: 0.5 },
              }}
            >
              {t("banner.learnMore", "Learn more")}
            </Button>
          </Box>

          {/* Discreet Right-Aligned Dismiss Button */}
          <IconButton
            size="small"
            onClick={handleDismiss}
            aria-label="Dismiss announcement banner"
            sx={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(15, 23, 42, 0.5)",
              p: 0.75,
              borderRadius: "50%",
              "&:hover": {
                color: isDark ? "#ffffff" : "#0f172a",
                bgcolor: isDark
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.06)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* "Learn More" High-Traffic & Serverless Advisory Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              p: { xs: 1.5, sm: 2.5 },
              bgcolor: isDark ? "rgba(17, 24, 39, 0.98)" : "#ffffff",
              backdropFilter: "blur(20px)",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(0, 229, 201, 0.25)"
                : "rgba(0, 0, 0, 0.08)",
              boxShadow: isDark
                ? "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 229, 201, 0.15)"
                : "0 20px 40px rgba(0, 0, 0, 0.12)",
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: 1,
            pt: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: isDark
                  ? "rgba(245, 158, 11, 0.15)"
                  : "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              <WarningIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {t("banner.modalTitle", "System Testing & Server Load Advisory")}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", fontSize: "0.75rem" }}
              >
                {t(
                  "banner.modalSubtitle",
                  "Information regarding active user testing, Vercel serverless load, and reliability tips."
                )}
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setModalOpen(false)}
            sx={{ color: "text.secondary" }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Context Box */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: isDark
                  ? "rgba(245, 158, 11, 0.08)"
                  : "rgba(245, 158, 11, 0.06)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: isDark ? "#fef3c7" : "#92400e",
                  lineHeight: 1.5,
                }}
              >
                ⚡ <strong>PowerForecast is currently in an active testing phase</strong> with a
                growing community of concurrent evaluators and testers.
                Because our backend runs on serverless architecture (Vercel & Supabase Cloud),
                heavy simultaneous testing can occasionally trigger cold-start queues or execution
                timeouts.
              </Typography>
            </Paper>

            {/* Technical Breakdown Bento Grid */}
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.75,
                    height: "100%",
                    boxSizing: "border-box",
                    borderRadius: 2,
                    bgcolor: isDark
                      ? "rgba(30, 41, 59, 0.5)"
                      : "rgba(241, 245, 249, 0.8)",
                    border: "1px solid",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <CloudIcon sx={{ fontSize: 18, color: "#38bdf8" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Vercel Serverless Limits
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", lineHeight: 1.45, display: "block" }}
                  >
                    Serverless API endpoints have a strict 10-second timeout. Heavy concurrent calculations
                    may occasionally trigger 504 gateway delays while functions scale up.
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.75,
                    height: "100%",
                    boxSizing: "border-box",
                    borderRadius: 2,
                    bgcolor: isDark
                      ? "rgba(30, 41, 59, 0.5)"
                      : "rgba(241, 245, 249, 0.8)",
                    border: "1px solid",
                    borderColor: isDark
                      ? "rgba(255, 255, 255, 0.08)"
                      : "rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <CameraIcon sx={{ fontSize: 18, color: "#a855f7" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      AI Vision & OCR Rotation
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", lineHeight: 1.45, display: "block" }}
                  >
                    Appliance rating label scanning dynamically pools multiple Gemini keys. Simultaneous
                    photo uploads are handled in sequential worker queues.
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.75,
                    borderRadius: 2,
                    bgcolor: isDark
                      ? "rgba(16, 185, 129, 0.08)"
                      : "rgba(16, 185, 129, 0.06)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                    <ShieldCheckIcon sx={{ fontSize: 18, color: "#10b981" }} />
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: isDark ? "#34d399" : "#065f46" }}
                    >
                      Your Data is 100% Safe & Persisted
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", lineHeight: 1.45, display: "block" }}
                  >
                    All registered appliances, customized tariffs, sub-metering configurations, and
                    calendar logs are safely saved to PostgreSQL with automatic local browser cache fallbacks.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Quick Troubleshooting Guide */}
            <Box
              sx={{
                p: 1.75,
                borderRadius: 2,
                bgcolor: isDark ? "rgba(15, 23, 42, 0.6)" : "#f8fafc",
                border: "1px dashed",
                borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: "text.primary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  display: "block",
                  mb: 0.5,
                }}
              >
                💡 Recommended Quick Tips:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.2, color: "text.secondary", fontSize: "0.8125rem", lineHeight: 1.6 }}>
                <li>
                  If a calculation or save times out, <strong>wait 5–10 seconds</strong> and click Retry.
                </li>
                <li>
                  If the interface becomes unresponsive, press <strong>Ctrl + F5</strong> (or pull down to refresh on mobile) to fetch a fresh serverless instance.
                </li>
                <li>
                  Telemetry and local timers continue ticking even if an individual API sync is delayed.
                </li>
              </Box>
            </Box>

            {/* Dev Team Note */}
            <Box
              sx={{
                textAlign: "center",
                py: 0.5,
                px: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontStyle: "italic",
                  color: isDark ? "rgba(226, 232, 240, 0.85)" : "#334155",
                  fontSize: "0.84rem",
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                }}
              >
                &ldquo;Sorry bruvs, the devs are broke asf&rdquo;
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: isDark ? "#00e5c9" : "#0f766e",
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  display: "inline-block",
                  mt: 0.25,
                  letterSpacing: "0.04em",
                }}
              >
                &mdash; Devs
              </Typography>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: "space-between" }}>
          <Chip
            size="small"
            label="Infrastructure: Vercel + Supabase"
            sx={{
              fontWeight: 700,
              fontSize: "0.6875rem",
              bgcolor: isDark ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
            }}
          />
          <Button
            variant="contained"
            onClick={() => setModalOpen(false)}
            sx={{
              borderRadius: 1.5,
              fontWeight: 800,
              textTransform: "none",
              px: 3,
              bgcolor: isDark ? "#00e5c9" : "#0f766e",
              color: isDark ? "#0a0a24" : "#ffffff",
              "&:hover": {
                bgcolor: isDark ? "#00c4ac" : "#0d9488",
              },
            }}
          >
            {t("banner.gotIt", "Got it 👍")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SystemTestingBanner;
