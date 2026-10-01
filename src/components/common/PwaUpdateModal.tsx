import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import type { Theme } from "@mui/material/styles";
import {
  RocketLaunch as RocketIcon,
  AutoAwesome as SparklesIcon,
  CheckCircle as CheckIcon,
  HistoryEdu as ChangelogIcon,
} from "@mui/icons-material";
import { usePwaUpdate } from "../../lib/pwaService";
import { APP_VERSION, supabaseClient } from "../../lib/supabaseClient";
import { useLanguage } from "../../context/LanguageContext";
import { parseReleaseHighlights } from "../../lib/changelogService";
import { COMPLETE_GITHUB_DEPLOYMENTS } from "../../lib/changelogManifest";

export const PwaUpdateModal: React.FC = () => {
  const { updateAvailable, isUpdating, applyUpdate, dismissUpdate } = usePwaUpdate();
  const { t } = useLanguage();

  const topManifest = COMPLETE_GITHUB_DEPLOYMENTS[0];
  const initialParsed = parseReleaseHighlights(
    topManifest?.description || "",
    topManifest?.version || APP_VERSION
  );

  const [changelogItems, setChangelogItems] = useState<string[]>(initialParsed.highlights);
  const [latestVersion, setLatestVersion] = useState<string>(topManifest?.version || APP_VERSION);

  // Fetch the latest changelog description from Supabase when update is available
  useEffect(() => {
    if (!updateAvailable) return;

    let isMounted = true;
    async function fetchLatestChangelog() {
      try {
        const { data, error } = await supabaseClient
          .from("system_changelogs")
          .select("version, description")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0 && isMounted) {
          const item = data[0];
          if (item.version) setLatestVersion(item.version);

          if (item.description) {
            const parsed = parseReleaseHighlights(item.description, item.version);
            if (parsed.highlights.length > 0) {
              setChangelogItems(parsed.highlights);
            }
          }
        }
      } catch {
        // Fallback to initial manifest highlights
      }
    }

    fetchLatestChangelog();
    return () => {
      isMounted = false;
    };
  }, [updateAvailable]);

  if (!updateAvailable) {
    return null;
  }

  return (
    <Dialog
      open={updateAvailable}
      onClose={dismissUpdate}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(12px)",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        },
        paper: {
          sx: {
            borderRadius: { xs: 3, sm: 4 },
            bgcolor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(11, 13, 27, 0.96)" : "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(24px)",
            border: "1px solid",
            borderColor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(0, 229, 201, 0.4)",
            boxShadow: (theme: Theme) =>
              theme.palette.mode === "dark"
                ? "0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(0, 229, 201, 0.15)"
                : "0 24px 64px rgba(0, 0, 0, 0.15)",
            overflow: "hidden",
            p: { xs: 2.5, sm: 3.5 },
          },
        },
      }}
    >
      {/* Top Banner Header */}
      <DialogTitle sx={{ p: 0, pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
            {/* Glowing Icon Badge */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, rgba(0, 229, 201, 0.25) 0%, rgba(99, 102, 241, 0.35) 100%)",
                border: "1px solid rgba(0, 229, 201, 0.5)",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark" ? "0 0 20px rgba(0, 229, 201, 0.3)" : "none",
              }}
            >
              <RocketIcon sx={{ fontSize: 26, color: "primary.main" }} />
            </Box>

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    background: "linear-gradient(90deg, #ffffff 0%, #00e5c9 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: (theme: Theme) =>
                      theme.palette.mode === "dark" ? "transparent" : theme.palette.text.primary,
                  }}
                >
                  {t("pwa.updateTitle", "New PowerForecast Update Available")}
                </Typography>
                <Chip
                  label={latestVersion || APP_VERSION}
                  size="small"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.12)",
                    color: "primary.main",
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.4)" : "rgba(13, 148, 136, 0.35)",
                  }}
                />
              </Box>

              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                {t(
                  "pwa.updateSubtitle",
                  "A new release is ready with performance improvements, bug fixes, and latest features."
                )}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogTitle>

      <Divider sx={{ borderColor: "divider", mb: 2 }} />

      {/* Changelog & Release Notes Card */}
      <DialogContent sx={{ p: 0, py: 1 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 3,
            bgcolor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(17, 20, 39, 0.75)" : "rgba(241, 245, 249, 0.8)",
            border: "1px solid",
            borderColor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
            maxHeight: 240,
            overflowY: "auto",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <ChangelogIcon sx={{ fontSize: 18, color: "primary.main" }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.primary" }}>
              {t("pwa.changelogTitle", "Log of Changes & Release Notes")}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {changelogItems.map((item, idx) => (
              <Box key={idx} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                <CheckIcon sx={{ fontSize: 16, color: "primary.main", mt: 0.25, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.875rem", lineHeight: 1.5 }}>
                  {item}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </DialogContent>

      <Divider sx={{ borderColor: "divider", mt: 2.5, mb: 2 }} />

      {/* Action Buttons */}
      <DialogActions sx={{ p: 0, display: "flex", gap: 1.5, justifyContent: "flex-end" }}>
        <Button
          variant="outlined"
          onClick={dismissUpdate}
          disabled={isUpdating}
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 700,
            color: "text.secondary",
            borderColor: (theme: Theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
            "&:hover": {
              borderColor: "text.primary",
              bgcolor: (theme: Theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
            },
          }}
        >
          {t("pwa.laterButton", "Later")}
        </Button>

        <Button
          variant="contained"
          onClick={applyUpdate}
          disabled={isUpdating}
          startIcon={
            isUpdating ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SparklesIcon sx={{ fontSize: 18, color: "primary.contrastText !important" }} />
            )
          }
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 800,
            fontSize: "0.9375rem",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            boxShadow: (theme) =>
              theme.palette.mode === "dark" ? "0 0 20px rgba(0, 229, 201, 0.4)" : "0 4px 14px rgba(13, 148, 136, 0.3)",
            "&:hover": {
              bgcolor: "primary.dark",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "0 0 28px rgba(0, 229, 201, 0.6)" : "0 6px 20px rgba(13, 148, 136, 0.4)",
              transform: "translateY(-1px)",
            },
            transition: "all 0.2s ease-in-out",
          }}
        >
          {isUpdating
            ? t("pwa.updatingButton", "Updating App...")
            : t("pwa.restartButton", "Restart & Update Now")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PwaUpdateModal;
