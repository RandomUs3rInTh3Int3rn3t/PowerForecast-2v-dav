import React, { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  DateRange as DateRangeIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  Repeat as RepeatIcon,
  Tune as TuneIcon,
  CheckCircle as CheckCircleIcon,
  RestartAlt as RestartAltIcon,
  Bolt as BoltIcon,
} from "@mui/icons-material";
import {
  BillingPeriodConfig,
  BillingPeriodMode,
  CycleEndOffset,
} from "../../types";
import {
  resolveBillingPeriodWindow,
  formatDateToKey,
  DEFAULT_BILLING_PERIOD_CONFIG,
} from "../../lib/dailyUsageService";

interface BillingPeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelectedDate: Date;
  currentConfig: BillingPeriodConfig;
  onSaveConfig: (newConfig: BillingPeriodConfig) => void;
}

export const BillingPeriodModal: React.FC<BillingPeriodModalProps> = ({
  isOpen,
  onClose,
  currentSelectedDate,
  currentConfig,
  onSaveConfig,
}) => {
  const [mode, setMode] = useState<BillingPeriodMode>(currentConfig.mode);
  const [cycleStartDay, setCycleStartDay] = useState<number>(currentConfig.cycleStartDay || 15);
  const [cycleEndOffset, setCycleEndOffset] = useState<CycleEndOffset>(currentConfig.cycleEndOffset || "same_day");

  const todayStr = formatDateToKey(new Date());
  const year = currentSelectedDate.getFullYear();
  const month = currentSelectedDate.getMonth();
  const firstOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastOfMonthStr = formatDateToKey(new Date(year, month + 1, 0));

  const [customStartDate, setCustomStartDate] = useState<string>(
    currentConfig.customStartDate || firstOfMonthStr
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    currentConfig.customEndDate || lastOfMonthStr
  );

  // Sync internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(currentConfig.mode);
      setCycleStartDay(currentConfig.cycleStartDay || 15);
      setCycleEndOffset(currentConfig.cycleEndOffset || "same_day");
      setCustomStartDate(currentConfig.customStartDate || firstOfMonthStr);
      setCustomEndDate(currentConfig.customEndDate || lastOfMonthStr);
    }
  }, [isOpen, currentConfig, firstOfMonthStr, lastOfMonthStr]);

  // Live preview calculation based on temporary settings
  const tempConfig: BillingPeriodConfig = useMemo(() => {
    return {
      mode,
      cycleStartDay,
      cycleEndOffset,
      customStartDate,
      customEndDate,
    };
  }, [mode, cycleStartDay, cycleEndOffset, customStartDate, customEndDate]);

  const previewWindow = useMemo(() => {
    return resolveBillingPeriodWindow(currentSelectedDate, tempConfig);
  }, [currentSelectedDate, tempConfig]);

  const handleApply = () => {
    onSaveConfig(tempConfig);
    onClose();
  };

  const handleResetToStandard = () => {
    setMode("calendar_month");
    setCycleStartDay(15);
    setCycleEndOffset("same_day");
    onSaveConfig(DEFAULT_BILLING_PERIOD_CONFIG);
    onClose();
  };

  const quickCyclePresets = [1, 5, 10, 15, 20, 25, 28];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "rgba(0, 229, 201, 0.3)",
            backdropFilter: "blur(24px)",
            p: 0.5,
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
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.25,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DateRangeIcon sx={{ fontSize: 20, color: "#ffd54f" }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Billing Period & Cutoff Settings
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Tailor calendar calculations to match your exact utility meter cutoff dates
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1.5 }}>
        {/* Mode Selector Bento Cards */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
            Select Billing Calculation Mode
          </Typography>

          {/* Option 1: Standard Calendar Month */}
          <Paper
            onClick={() => setMode("calendar_month")}
            sx={{
              p: 1.5,
              borderRadius: 1.25,
              cursor: "pointer",
              border: "1.5px solid",
              borderColor: mode === "calendar_month" ? "primary.main" : "divider",
              bgcolor: mode === "calendar_month"
                ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)"
                : "background.paper",
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "primary.light" },
            }}
          >
            <CalendarIcon sx={{ mt: 0.25, color: mode === "calendar_month" ? "primary.main" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Standard Calendar Month
                </Typography>
                {mode === "calendar_month" && (
                  <Chip size="small" label="Active Mode" color="primary" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                Computes energy draw and bills from the 1st to the last day of each month (e.g. Oct 1 – Oct 31).
              </Typography>
            </Box>
          </Paper>

          {/* Option 2: Monthly Recurring Cycle (Cutoff Day) */}
          <Paper
            onClick={() => setMode("recurring_cycle")}
            sx={{
              p: 1.5,
              borderRadius: 1.25,
              cursor: "pointer",
              border: "1.5px solid",
              borderColor: mode === "recurring_cycle" ? "primary.main" : "divider",
              bgcolor: mode === "recurring_cycle"
                ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)"
                : "background.paper",
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "primary.light" },
            }}
          >
            <RepeatIcon sx={{ mt: 0.25, color: mode === "recurring_cycle" ? "primary.main" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Monthly Recurring Billing Cycle (e.g. 15th to 15th)
                </Typography>
                {mode === "recurring_cycle" && (
                  <Chip size="small" label="Active Mode" color="primary" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                Automatically computes your exact monthly billing cycle across month boundaries (e.g. Sep 15 to Oct 15) for every month.
              </Typography>
            </Box>
          </Paper>

          {/* Option 3: Custom Date Range */}
          <Paper
            onClick={() => setMode("custom_range")}
            sx={{
              p: 1.5,
              borderRadius: 1.25,
              cursor: "pointer",
              border: "1.5px solid",
              borderColor: mode === "custom_range" ? "primary.main" : "divider",
              bgcolor: mode === "custom_range"
                ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)"
                : "background.paper",
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              transition: "all 0.15s ease",
              "&:hover": { borderColor: "primary.light" },
            }}
          >
            <TuneIcon sx={{ mt: 0.25, color: mode === "custom_range" ? "primary.main" : "text.secondary" }} />
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Custom Specific Date Range
                </Typography>
                {mode === "custom_range" && (
                  <Chip size="small" label="Active Mode" color="primary" sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }} />
                )}
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                Select an arbitrary start and end date for special audits, sub-meter billing, or irregular cutoff dates.
              </Typography>
            </Box>
          </Paper>
        </Box>

        {/* Dynamic Controls based on selected mode */}
        {mode === "recurring_cycle" && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* Start Day of Cycle */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                1. Billing Cutoff / Start Day of Month
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: 1 }}>
                {quickCyclePresets.map((dayNum) => (
                  <Button
                    key={dayNum}
                    size="small"
                    variant={cycleStartDay === dayNum ? "contained" : "outlined"}
                    onClick={() => setCycleStartDay(dayNum)}
                    sx={{
                      minWidth: 44,
                      px: 1,
                      py: 0.4,
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      borderRadius: 1,
                    }}
                  >
                    Day {dayNum}
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1.5 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8125rem" }}>
                  Custom Day:
                </Typography>
                <TextField
                  type="number"
                  size="small"
                  value={cycleStartDay}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setCycleStartDay(Math.max(1, Math.min(31, val)));
                    }
                  }}
                  slotProps={{
                    htmlInput: { min: 1, max: 31, style: { width: 60, textAlign: "center", fontWeight: 700 } },
                  }}
                />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  (Enter 1 to 31)
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Cycle End Day Offset Toggle */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                2. Cycle End Day Convention
              </Typography>
              <RadioGroup
                value={cycleEndOffset}
                onChange={(e) => setCycleEndOffset(e.target.value as CycleEndOffset)}
                sx={{ mt: 0.75 }}
              >
                <FormControlLabel
                  value="same_day"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Same Day of Next Month (Recommended)
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Example: Day {cycleStartDay} to Day {cycleStartDay} (e.g. Sep {cycleStartDay} to Oct {cycleStartDay})
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: "flex-start" }}
                />
                <FormControlLabel
                  value="day_before"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Day Before in Next Month
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Example: Day {cycleStartDay} to Day {Math.max(1, cycleStartDay - 1)} (e.g. Sep {cycleStartDay} to Oct {Math.max(1, cycleStartDay - 1)})
                      </Typography>
                    </Box>
                  }
                  sx={{ mb: 1, alignItems: "flex-start" }}
                />
                <FormControlLabel
                  value="day_after"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        Day After in Next Month
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Example: Day {cycleStartDay} to Day {cycleStartDay + 1} (e.g. Sep {cycleStartDay} to Oct {cycleStartDay + 1})
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: "flex-start" }}
                />
              </RadioGroup>
            </Box>
          </Box>
        )}

        {mode === "custom_range" && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
              Specify Custom Billing Window
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField
                label="Start Date"
                type="date"
                size="small"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="End Date"
                type="date"
                size="small"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>
          </Box>
        )}

        {/* Live Preview Bento Box */}
        <Paper
          sx={{
            p: 2,
            borderRadius: 1.25,
            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.06)" : "rgba(13, 148, 136, 0.05)",
            border: "1px solid",
            borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <BoltIcon sx={{ color: "primary.main", fontSize: 24 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Active Calculation Preview
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
              {previewWindow.label}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              {previewWindow.subLabel || `${previewWindow.days.length} days timeframe`} • Telemetry and savings calculated strictly within these dates.
            </Typography>
          </Box>
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button
          size="small"
          color="inherit"
          startIcon={<RestartAltIcon />}
          onClick={handleResetToStandard}
          sx={{ fontWeight: 700, textTransform: "none" }}
        >
          Reset to Standard Month
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" onClick={onClose} sx={{ fontWeight: 700, textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleApply}
            startIcon={<CheckCircleIcon />}
            sx={{ fontWeight: 800, textTransform: "none", px: 2.5 }}
          >
            Apply Billing Period
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
