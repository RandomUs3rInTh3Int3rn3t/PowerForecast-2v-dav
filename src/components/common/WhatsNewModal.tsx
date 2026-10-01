import React, { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import type { Theme } from "@mui/material/styles";
import {
  RocketLaunch as RocketIcon,
  AutoAwesome as SparklesIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  HistoryEdu as HistoryIcon,
  AccessTime as TimeIcon,
  Verified as VerifiedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import { useWhatsNew } from "../../lib/changelogService";
import { SystemChangelogModal } from "../changelog/SystemChangelogModal";
import { useLanguage } from "../../context/LanguageContext";

interface WhatsNewModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  targetVersion?: string;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  forceOpen,
  onClose,
  targetVersion,
}) => {
  const {
    isOpen: hookIsOpen,
    activeVersion,
    changelogEntry,
    parsedRelease,
    isLoading,
    dismiss,
    openForVersion,
  } = useWhatsNew();

  const { t } = useLanguage();
  const [showFullRaw, setShowFullRaw] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Controlled vs Uncontrolled open state
  const isModalOpen = forceOpen !== undefined ? forceOpen : hookIsOpen;
  const currentVer = targetVersion || activeVersion;

  const handleDismiss = () => {
    dismiss();
    if (onClose) onClose();
  };

  const handleOpenHistory = () => {
    handleDismiss();
    setIsHistoryModalOpen(true);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Recent update";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "Recent update";
    }
  };

  return (
    <>
      <Dialog
        open={isModalOpen}
        onClose={handleDismiss}
        maxWidth="sm"
        fullWidth
        slotProps={{
          backdrop: {
            sx: {
              backdropFilter: "blur(14px)",
              backgroundColor: "rgba(0, 0, 0, 0.78)",
            },
          },
          paper: {
            sx: {
              borderRadius: { xs: 3, sm: 4 },
              bgcolor: (theme: Theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(11, 13, 27, 0.97)"
                  : "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(28px)",
              border: "1px solid",
              borderColor: (theme: Theme) =>
                theme.palette.mode === "dark"
                  ? "rgba(0, 229, 201, 0.35)"
                  : "rgba(0, 229, 201, 0.4)",
              boxShadow: (theme: Theme) =>
                theme.palette.mode === "dark"
                  ? "0 28px 72px rgba(0, 0, 0, 0.85), 0 0 36px rgba(0, 229, 201, 0.18)"
                  : "0 28px 72px rgba(0, 0, 0, 0.16)",
              overflow: "hidden",
              p: { xs: 2.5, sm: 3.5 },
            },
          },
        }}
      >
        {/* Top Banner Header */}
        <DialogTitle sx={{ p: 0, pb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Glowing Icon Badge */}
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, rgba(0, 229, 201, 0.28) 0%, rgba(99, 102, 241, 0.35) 100%)",
                  border: "1px solid rgba(0, 229, 201, 0.55)",
                  boxShadow: (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 0 24px rgba(0, 229, 201, 0.35)"
                      : "none",
                  flexShrink: 0,
                }}
              >
                <RocketIcon sx={{ fontSize: 26, color: "primary.main" }} />
              </Box>

              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: "-0.02em",
                      background:
                        "linear-gradient(90deg, #ffffff 0%, #00e5c9 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: (theme: Theme) =>
                        theme.palette.mode === "dark"
                          ? "transparent"
                          : theme.palette.text.primary,
                    }}
                  >
                    {t("whatsNew.title", "What's New in PowerForecast")}
                  </Typography>
                  <Chip
                    label={currentVer}
                    size="small"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(0, 229, 201, 0.15)"
                          : "rgba(13, 148, 136, 0.12)",
                      color: "primary.main",
                      border: "1px solid",
                      borderColor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(0, 229, 201, 0.4)"
                          : "rgba(13, 148, 136, 0.35)",
                    }}
                  />
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mt: 0.5,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TimeIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                    >
                      {formatDate(changelogEntry?.created_at)}
                    </Typography>
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{ color: "text.disabled", fontSize: "0.7rem" }}
                  >
                    •
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <VerifiedIcon
                      sx={{ fontSize: 13, color: "primary.main" }}
                    />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {changelogEntry?.deployed_by || "Verified Release"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <IconButton
              onClick={handleDismiss}
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
              aria-label="Close What's New"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <Divider sx={{ borderColor: "divider", mb: 2 }} />

        {/* Changes & Highlights Content */}
        <DialogContent sx={{ p: 0, py: 1 }}>
          {isLoading ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 4,
                gap: 1.5,
              }}
            >
              <CircularProgress size={28} sx={{ color: "primary.main" }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {t("whatsNew.loading", "Loading release highlights...")}
              </Typography>
            </Box>
          ) : (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 3,
                bgcolor: (theme: Theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(17, 20, 39, 0.75)"
                    : "rgba(241, 245, 249, 0.8)",
                border: "1px solid",
                borderColor: (theme: Theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.08)"
                    : "rgba(0, 0, 0, 0.08)",
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.75,
                }}
              >
                <SparklesIcon sx={{ fontSize: 18, color: "primary.main" }} />
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700, color: "text.primary" }}
                >
                  {t(
                    "whatsNew.highlightsHeader",
                    "Key Updates & Features Created"
                  )}
                </Typography>
              </Box>

              {/* Bullet list of highlights */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {parsedRelease && parsedRelease.highlights.length > 0 ? (
                  parsedRelease.highlights.map((highlight, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1.25,
                      }}
                    >
                      <CheckIcon
                        sx={{
                          fontSize: 16,
                          color: "primary.main",
                          mt: 0.3,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.primary",
                          fontSize: "0.875rem",
                          lineHeight: 1.55,
                        }}
                      >
                        {highlight}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.25,
                    }}
                  >
                    <CheckIcon
                      sx={{
                        fontSize: 16,
                        color: "primary.main",
                        mt: 0.3,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.primary",
                        fontSize: "0.875rem",
                        lineHeight: 1.55,
                      }}
                    >
                      {changelogEntry?.description ||
                        "Production stability improvements and performance optimizations."}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Raw Commit Message Expandable Toggle */}
              {changelogEntry?.description &&
                parsedRelease &&
                parsedRelease.highlights.length > 1 && (
                  <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px dashed", borderColor: "divider" }}>
                    <Button
                      size="small"
                      onClick={() => setShowFullRaw(!showFullRaw)}
                      endIcon={
                        showFullRaw ? (
                          <ExpandLessIcon fontSize="small" />
                        ) : (
                          <ExpandMoreIcon fontSize="small" />
                        )
                      }
                      sx={{
                        textTransform: "none",
                        fontSize: "0.75rem",
                        color: "text.secondary",
                        p: 0,
                        minWidth: 0,
                        "&:hover": { bgcolor: "transparent", color: "text.primary" },
                      }}
                    >
                      {showFullRaw ? "Hide Full Commit Message" : "View Full Commit Message"}
                    </Button>
                    <Collapse in={showFullRaw}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 1,
                          p: 1.25,
                          borderRadius: 1.5,
                          fontFamily: "monospace",
                          fontSize: "0.75rem",
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(0, 0, 0, 0.4)"
                              : "rgba(0, 0, 0, 0.05)",
                          color: "text.secondary",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {changelogEntry.description}
                      </Typography>
                    </Collapse>
                  </Box>
                )}
            </Paper>
          )}
        </DialogContent>

        <Divider sx={{ borderColor: "divider", mt: 2.5, mb: 2 }} />

        {/* Action Buttons */}
        <DialogActions
          sx={{
            p: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Button
            variant="text"
            onClick={handleOpenHistory}
            startIcon={<HistoryIcon sx={{ fontSize: 18 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8125rem",
              color: "text.secondary",
              "&:hover": { color: "text.primary" },
            }}
          >
            {t("whatsNew.viewFullLogs", "View All Changelogs")}
          </Button>

          <Button
            variant="contained"
            onClick={handleDismiss}
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
                theme.palette.mode === "dark"
                  ? "0 0 20px rgba(0, 229, 201, 0.4)"
                  : "0 4px 14px rgba(13, 148, 136, 0.3)",
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 0 28px rgba(0, 229, 201, 0.6)"
                    : "0 6px 20px rgba(13, 148, 136, 0.4)",
                transform: "translateY(-1px)",
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            {t("whatsNew.gotItButton", "Awesome, Got It!")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Audit Log Modal */}
      {isHistoryModalOpen && (
        <SystemChangelogModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
        />
      )}
    </>
  );
};

export default WhatsNewModal;
