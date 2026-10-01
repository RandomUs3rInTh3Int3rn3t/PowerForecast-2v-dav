import React, { useEffect, useState } from "react";
import { APP_VERSION, checkSupabaseConnection, SUPABASE_URL } from "../../lib/supabaseClient";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Fade from "@mui/material/Fade";
import {
  Storage as DatabaseIcon,
  VerifiedUser as ShieldIcon,
  Wifi as WifiIcon,
  AutoAwesome as SparklesIcon,
  CheckCircle as CheckCircleIcon,
  WarningAmber as AlertIcon,
  Close as CloseIcon,
  HistoryEdu as ChangelogIcon,
} from "@mui/icons-material";
import { SystemChangelogModal } from "../changelog/SystemChangelogModal";

export const VersionBadge: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<{
    checked: boolean;
    connected: boolean;
    message: string;
  }>({
    checked: false,
    connected: false,
    message: "Initializing...",
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    checkSupabaseConnection().then((res) => {
      if (isMounted) {
        setDbStatus({
          checked: true,
          connected: res.ok,
          message: res.message,
        });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: { xs: "calc(64px + env(safe-area-inset-bottom, 8px))", lg: 16 },
        right: { xs: 12, lg: 16 },
        zIndex: 1400,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 1,
        userSelect: "none",
        "@media print": { display: "none" },
      }}
    >
      {/* Expanded status card */}
      <Fade in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            display: isOpen ? "block" : "none",
            p: 2,
            width: 290,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(23, 26, 31, 0.98)" : "rgba(255, 255, 255, 0.98)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(0, 229, 201, 0.25)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 12px 36px rgba(0,0,0,0.4)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <SparklesIcon sx={{ fontSize: 16, color: "warning.main" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "primary.light" }}>
                PowerForecast MUI
              </Typography>
            </Box>
            <Chip
              label={APP_VERSION}
              size="small"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: "0.6875rem",
                bgcolor: "rgba(0, 229, 201, 0.12)",
                color: "#00e5c9",
                border: "1px solid rgba(0, 229, 201, 0.3)",
              }}
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, my: 1.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Template / UI:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Material UI v6 Templates
              </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Database:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <DatabaseIcon sx={{ fontSize: 14, color: "success.main" }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: "success.main" }}>
                  Supabase Cloud
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Live Connection:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {dbStatus.connected ? (
                  <>
                    <CheckCircleIcon sx={{ fontSize: 14, color: "success.main" }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "success.main" }}>
                      Connected
                    </Typography>
                  </>
                ) : (
                  <>
                    <AlertIcon sx={{ fontSize: 14, color: "warning.main" }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: "warning.main" }}>
                      Hybrid / Local
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* GitHub Changelogs Button */}
          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<ChangelogIcon sx={{ fontSize: 16, color: (theme) => theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488" }} />}
            onClick={() => {
              setIsOpen(false);
              setIsChangelogModalOpen(true);
            }}
            sx={{
              my: 1,
              py: 0.75,
              fontSize: "0.75rem",
              fontWeight: 800,
              textTransform: "none",
              color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0f766e"),
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.08)",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.3)",
              borderRadius: 1.25,
              "&:hover": {
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.16)" : "rgba(13, 148, 136, 0.15)",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
              },
            }}
          >
            View Version Changelogs
          </Button>

          <Divider sx={{ my: 1 }} />

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pt: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <ShieldIcon sx={{ fontSize: 14, color: "success.light" }} />
              <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "success.light" }}>
                Auto-sync active
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{ minWidth: "auto", p: "2px 6px", fontSize: "0.6875rem" }}
            >
              Close
            </Button>
          </Box>
        </Paper>
      </Fade>

      {/* Persistent Bottom-Right Tag */}
      <Box
        component="button"
        onClick={() => setIsOpen((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 0.75, sm: 1 },
          px: { xs: 1.25, sm: 1.5 },
          py: { xs: 0.5, sm: 0.75 },
          borderRadius: 1,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.92)" : "rgba(255, 255, 255, 0.95)",
          color: "text.primary",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.45)" : "rgba(0, 229, 201, 0.3)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
          backdropFilter: "blur(12px)",
          cursor: "pointer",
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            borderColor: "primary.main",
            transform: "translateY(-1px)",
            boxShadow: "0 6px 20px rgba(0, 229, 201, 0.25)",
          },
        }}
        title="Click to view version & database connection telemetry"
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: dbStatus.connected ? "success.main" : "info.main",
            boxShadow: (theme) =>
              `0 0 8px ${dbStatus.connected ? theme.palette.success.main : theme.palette.info.main}`,
          }}
        />

        <Typography
          variant="caption"
          sx={{
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "0.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          {APP_VERSION}
        </Typography>

        <Chip
          icon={<WifiIcon sx={{ fontSize: "12px !important", color: "#00e5c9 !important" }} />}
          label="MUI"
          size="small"
          sx={{
            height: 18,
            fontSize: "0.625rem",
            fontWeight: 700,
            bgcolor: "rgba(0, 229, 201, 0.12)",
            color: "primary.light",
            border: "1px solid rgba(0, 229, 201, 0.25)",
            "& .MuiChip-icon": { ml: "4px" },
          }}
        />
      </Box>

      {/* GitHub Version Changelogs Modal */}
      <SystemChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
      />
    </Box>
  );
};

export default VersionBadge;
