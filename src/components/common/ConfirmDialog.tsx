import React from "react";
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
import {
  Close as CloseIcon,
  WarningAmber as WarningIcon,
  DeleteForever as DeleteIcon,
  Info as InfoIcon,
  HelpOutlined as QuestionIcon,
} from "@mui/icons-material";

export type ConfirmSeverity = "error" | "warning" | "info";

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode | string;
  detail?: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  severity?: ConfirmSeverity;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  options: ConfirmOptions | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  options,
  onConfirm,
  onCancel,
}) => {
  if (!options) return null;

  const {
    title = "Confirm Action",
    message,
    detail,
    itemName,
    confirmText = "Confirm",
    cancelText = "Cancel",
    severity = "warning",
  } = options;

  // Severity color mapping
  const severityConfig = {
    error: {
      color: "#f43f5e",
      bgRgba: "rgba(244, 63, 94, 0.12)",
      borderRgba: "rgba(244, 63, 94, 0.35)",
      btnBg: "#e11d48",
      btnHover: "#f43f5e",
      btnColor: "#ffffff",
      icon: <DeleteIcon sx={{ fontSize: 24, color: "#f43f5e" }} />,
    },
    warning: {
      color: "#fbbf24",
      bgRgba: "rgba(251, 191, 36, 0.12)",
      borderRgba: "rgba(251, 191, 36, 0.35)",
      btnBg: "#d97706",
      btnHover: "#f59e0b",
      btnColor: "#ffffff",
      icon: <WarningIcon sx={{ fontSize: 24, color: "#fbbf24" }} />,
    },
    info: {
      color: "#00e5c9",
      bgRgba: "rgba(0, 229, 201, 0.12)",
      borderRgba: "rgba(0, 229, 201, 0.35)",
      btnBg: "#00e5c9",
      btnHover: "#00c4aa",
      btnColor: "#0c1b18",
      icon: <InfoIcon sx={{ fontSize: 24, color: "#00e5c9" }} />,
    },
  }[severity];

  return (
    <Dialog
      open={isOpen}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        },
        paper: {
          sx: {
            borderRadius: 3,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#13161c" : "#ffffff"),
            backgroundImage: "none",
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? "#282f3c" : "#e2e8f0"),
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 24px 64px rgba(0, 0, 0, 0.85)"
                : "0 24px 64px rgba(15, 23, 42, 0.15)",
            p: 1,
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 2,
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: severityConfig.bgRgba,
              border: `1px solid ${severityConfig.borderRgba}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {severityConfig.icon}
          </Box>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: "1.05rem",
                color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#0f172a"),
              }}
            >
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
              Action Confirmation & Verification
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onCancel}
          size="small"
          sx={{
            color: "text.secondary",
            "&:hover": {
              color: "text.primary",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"),
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Body */}
      <DialogContent sx={{ p: 2, pt: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {itemName && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase" }}>
              Target:
            </Typography>
            <Chip
              label={itemName}
              size="small"
              sx={{
                fontWeight: 800,
                fontFamily: "inherit",
                fontSize: "0.75rem",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#f1f5f9"),
                color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#0f172a"),
                border: "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "#2e3544" : "#e2e8f0"),
              }}
            />
          </Box>
        )}

        <Typography
          variant="body2"
          sx={{
            color: (theme) => (theme.palette.mode === "dark" ? "#e2e8f0" : "#334155"),
            fontSize: "0.875rem",
            lineHeight: 1.6,
          }}
        >
          {message}
        </Typography>

        {detail && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#181c24" : "#f8fafc"),
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#262c37" : "#e2e8f0"),
            }}
          >
            <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5, display: "block" }}>
              {detail}
            </Typography>
          </Paper>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ p: 2, pt: 1, display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={onCancel}
          sx={{
            borderRadius: 2,
            px: 2,
            py: 0.8,
            fontWeight: 700,
            fontSize: "0.8125rem",
            textTransform: "none",
            color: (theme) => (theme.palette.mode === "dark" ? "#94a3b8" : "#475569"),
            borderColor: (theme) => (theme.palette.mode === "dark" ? "#2e3544" : "#cbd5e1"),
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#f1f5f9"),
            "&:hover": {
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#475569" : "#94a3b8"),
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#242a35" : "#e2e8f0"),
              color: "text.primary",
            },
          }}
        >
          {cancelText}
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={onConfirm}
          sx={{
            borderRadius: 2,
            px: 2.5,
            py: 0.8,
            fontWeight: 800,
            fontSize: "0.8125rem",
            textTransform: "none",
            bgcolor: severityConfig.btnBg,
            color: severityConfig.btnColor,
            boxShadow: `0 4px 14px ${severityConfig.bgRgba}`,
            "&:hover": {
              bgcolor: severityConfig.btnHover,
            },
          }}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
