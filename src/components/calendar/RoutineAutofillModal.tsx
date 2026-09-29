import React, { useState, useMemo } from "react";
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
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import {
  AutoAwesome as SparklesIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  DateRange as DateRangeIcon,
  Bolt as BoltIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList, BillingPeriodWindow } from "../../types";
import {
  formatDateToKey,
  parseKeyToDate,
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  batchSaveDailyUsageAcrossRange,
} from "../../lib/dailyUsageService";
import { useToast } from "../common/ToastProvider";

export type AutofillRangeType = "month_to_today" | "full_month" | "billing_period" | "custom" | "single_day";

interface RoutineAutofillModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSelectedDate: Date;
  appliances: UserAppliance[];
  spaces?: ApplianceList[];
  billingWindow?: BillingPeriodWindow;
  onApplyToCurrentDay: () => void;
  onBatchSaved: () => void;
}

export const RoutineAutofillModal: React.FC<RoutineAutofillModalProps> = ({
  isOpen,
  onClose,
  currentSelectedDate,
  appliances,
  billingWindow,
  onApplyToCurrentDay,
  onBatchSaved,
}) => {
  const [rangeType, setRangeType] = useState<AutofillRangeType>(
    billingWindow && billingWindow.isCrossMonth ? "billing_period" : "month_to_today"
  );
  const [selectedSpaceFilter, setSelectedSpaceFilter] = useState<string>("all");
  const [overwriteExisting, setOverwriteExisting] = useState<boolean>(true);
  const [excludeToday, setExcludeToday] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const year = currentSelectedDate.getFullYear();
  const month = currentSelectedDate.getMonth();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const currentDayNum = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();

  // Custom date inputs
  const firstOfMonthStr = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastOfMonthStr = formatDateToKey(new Date(year, month + 1, 0));
  const todayStr = formatDateToKey(today);

  const [customStartDate, setCustomStartDate] = useState<string>(firstOfMonthStr);
  const [customEndDate, setCustomEndDate] = useState<string>(isCurrentMonth ? todayStr : lastOfMonthStr);

  // Sync custom date state whenever modal opens or currentSelectedDate changes
  React.useEffect(() => {
    if (isOpen) {
      setCustomStartDate(firstOfMonthStr);
      setCustomEndDate(isCurrentMonth ? todayStr : lastOfMonthStr);
    }
  }, [isOpen, firstOfMonthStr, isCurrentMonth, todayStr, lastOfMonthStr]);

  const { showSuccess, showError } = useToast();

  // Filter appliances by space if specified
  const targetAppliances = useMemo(() => {
    if (selectedSpaceFilter === "all") return appliances;
    return appliances.filter((a) => a.tariff_type === selectedSpaceFilter);
  }, [appliances, selectedSpaceFilter]);

  // Compute active date boundaries based on selected rangeType
  const { startDate, endDate, dateCount, rangeLabel } = useMemo(() => {
    const monthName = currentSelectedDate.toLocaleDateString("en-US", { month: "short" });
    let start = new Date(year, month, 1);
    let end = new Date(year, month, currentDayNum);
    let label = `${monthName} 1 – Today (${currentDayNum} days)`;

    if (rangeType === "month_to_today") {
      start = new Date(year, month, 1);
      if (isCurrentMonth) {
        if (excludeToday && today.getDate() > 1) {
          end = new Date(year, month, today.getDate() - 1);
          label = `${monthName} 1 – Yesterday (${monthName} ${today.getDate() - 1})`;
        } else {
          end = new Date(year, month, today.getDate());
          label = `${monthName} 1 – Today (${monthName} ${today.getDate()})`;
        }
      } else {
        end = new Date(year, month + 1, 0);
        label = `Full Month (${monthName} 1 – ${monthName} ${end.getDate()})`;
      }
    } else if (rangeType === "full_month") {
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
      label = `Entire Month (${monthName} 1 – ${monthName} ${end.getDate()})`;
    } else if (rangeType === "billing_period" && billingWindow) {
      start = billingWindow.startDate;
      end = billingWindow.endDate;
      label = `Active Cycle (${billingWindow.label})`;
    } else if (rangeType === "custom") {
      start = parseKeyToDate(customStartDate || firstOfMonthStr);
      end = parseKeyToDate(customEndDate || lastOfMonthStr);
      label = `${customStartDate} to ${customEndDate}`;
    } else if (rangeType === "single_day") {
      start = new Date(currentSelectedDate);
      end = new Date(currentSelectedDate);
      label = currentSelectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    // Count days (accounting for excludeToday if range covers today)
    let count = 0;
    if (end >= start) {
      const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endD = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const todayK = formatDateToKey(new Date());
      while (cur <= endD) {
        if (!excludeToday || rangeType === "single_day" || formatDateToKey(cur) !== todayK) {
          count += 1;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    return {
      startDate: start,
      endDate: end,
      dateCount: Math.max(0, count),
      rangeLabel: label,
    };
  }, [rangeType, year, month, currentDayNum, isCurrentMonth, today, currentSelectedDate, customStartDate, customEndDate, firstOfMonthStr, lastOfMonthStr, excludeToday]);

  // Compute daily metrics from routine baselines
  const dailyMetrics = useMemo(() => {
    let dailyKwh = 0;
    let activeDeviceCount = 0;

    targetAppliances.forEach((app) => {
      const hours = Number(app.hours_per_day) || 0;
      if (hours > 0) {
        activeDeviceCount += 1;
        dailyKwh += calculateKwh(app.watts, hours, app.quantity || 1);
      }
    });

    const dailyCost = calculateCost(dailyKwh, DEFAULT_EFFECTIVE_RATE);
    const totalKwh = dailyKwh * dateCount;
    const totalCost = dailyCost * dateCount;

    return {
      dailyKwh,
      dailyCost,
      totalKwh,
      totalCost,
      activeDeviceCount,
    };
  }, [targetAppliances, dateCount]);

  const handleBatchSave = async () => {
    if (rangeType === "single_day") {
      onApplyToCurrentDay();
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const result = await batchSaveDailyUsageAcrossRange({
        startDate,
        endDate,
        appliances: targetAppliances,
        effectiveRate: DEFAULT_EFFECTIVE_RATE,
        source: "routine_default",
        overwriteExisting,
        excludeToday,
      });

      if (result.success) {
        showSuccess(
          `Batch logged routine defaults for ${result.totalDays} days (${result.totalRows} appliance records, ₱${dailyMetrics.totalCost.toFixed(2)})!`,
          "Routine Defaults Logged"
        );
        onBatchSaved();
        onClose();
      } else {
        showError("Failed to save some daily logs across the selected range. Please try again.");
      }
    } catch (err: any) {
      showError(`Error during batch routine save: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

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
            borderColor: "rgba(129, 140, 248, 0.25)",
            backdropFilter: "blur(24px)",
            p: 0.5,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SparklesIcon sx={{ color: "#ffd54f" }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Smart Routine Autofill & Batch Logger
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Quickly populate daily usage based on your registered appliance operating hours
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ color: "text.secondary" }} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* 1. Range Preset Options */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mb: 1, display: "block" }}>
            1. Select Target Date Range:
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.25 }}>
            {/* Option 1: 1st to Today / Yesterday */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("month_to_today")}
              sx={{
                p: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "month_to_today" ? "primary.main" : "divider",
                bgcolor: rangeType === "month_to_today" ? "rgba(0, 229, 201, 0.12)" : "rgba(24, 27, 32, 0.65)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CalendarIcon sx={{ fontSize: 18, color: rangeType === "month_to_today" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "month_to_today" ? "primary.light" : "text.primary" }}>
                  {isCurrentMonth && excludeToday && today.getDate() > 1 ? "1st of Month to Yesterday" : "1st of Month to Today"}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                {isCurrentMonth && excludeToday && today.getDate() > 1
                  ? `Fills Day 1 up to yesterday (${today.getDate() - 1} days), preserving Today for live stopwatch`
                  : `Fills Day 1 up to today (${isCurrentMonth ? today.getDate() : currentDayNum} days)`}
              </Typography>
            </Paper>

            {/* Option 2: Full Month */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("full_month")}
              sx={{
                p: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "full_month" ? "primary.main" : "divider",
                bgcolor: rangeType === "full_month" ? "rgba(0, 229, 201, 0.12)" : "rgba(24, 27, 32, 0.65)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <DateRangeIcon sx={{ fontSize: 18, color: rangeType === "full_month" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "full_month" ? "primary.light" : "text.primary" }}>
                  Entire Month
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Fills all days (Day 1 to 31) for this month
              </Typography>
            </Paper>

            {/* Option 2.5: Active Billing Cycle (if available) */}
            {billingWindow && (
              <Paper
                variant="outlined"
                onClick={() => setRangeType("billing_period")}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: rangeType === "billing_period" ? "primary.main" : "divider",
                  bgcolor: rangeType === "billing_period" ? "rgba(0, 229, 201, 0.12)" : "rgba(24, 27, 32, 0.65)",
                  transition: "all 0.15s ease",
                  "&:hover": { borderColor: "primary.light" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <DateRangeIcon sx={{ fontSize: 18, color: rangeType === "billing_period" ? "primary.main" : "text.secondary" }} />
                  <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "billing_period" ? "primary.light" : "text.primary" }}>
                    Active Billing Cycle
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  {billingWindow.label} ({billingWindow.days.length} days)
                </Typography>
              </Paper>
            )}

            {/* Option 3: Custom Range */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("custom")}
              sx={{
                p: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "custom" ? "primary.main" : "divider",
                bgcolor: rangeType === "custom" ? "rgba(0, 229, 201, 0.12)" : "rgba(24, 27, 32, 0.65)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <DateRangeIcon sx={{ fontSize: 18, color: rangeType === "custom" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "custom" ? "primary.light" : "text.primary" }}>
                  Custom Date Range
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Select custom start and end dates
              </Typography>
            </Paper>

            {/* Option 4: Single Day */}
            <Paper
              variant="outlined"
              onClick={() => setRangeType("single_day")}
              sx={{
                p: 1.5,
                borderRadius: 1,
                cursor: "pointer",
                border: "1px solid",
                borderColor: rangeType === "single_day" ? "primary.main" : "divider",
                bgcolor: rangeType === "single_day" ? "rgba(0, 229, 201, 0.12)" : "rgba(24, 27, 32, 0.65)",
                transition: "all 0.15s ease",
                "&:hover": { borderColor: "primary.light" },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 18, color: rangeType === "single_day" ? "primary.main" : "text.secondary" }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: rangeType === "single_day" ? "primary.light" : "text.primary" }}>
                  This Selected Day Only
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Applies baseline to open modal sliders
              </Typography>
            </Paper>
          </Box>
        </Box>

        {/* Custom Date Pickers (Shown if Custom selected) */}
        {rangeType === "custom" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              size="small"
              fullWidth
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              fullWidth
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        )}

        {/* Space / Tariff Filter Chips */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
            APPLIANCE SCOPE:
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Chip
              label={`All Appliances (${appliances.length})`}
              size="small"
              clickable
              onClick={() => setSelectedSpaceFilter("all")}
              color={selectedSpaceFilter === "all" ? "primary" : "default"}
              variant={selectedSpaceFilter === "all" ? "filled" : "outlined"}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              icon={<HomeIcon sx={{ fontSize: "14px !important" }} />}
              label="Residential"
              size="small"
              clickable
              onClick={() => setSelectedSpaceFilter("residential")}
              color={selectedSpaceFilter === "residential" ? "primary" : "default"}
              variant={selectedSpaceFilter === "residential" ? "filled" : "outlined"}
              sx={{ fontWeight: 700 }}
            />
            <Chip
              icon={<StoreIcon sx={{ fontSize: "14px !important" }} />}
              label="Commercial"
              size="small"
              clickable
              onClick={() => setSelectedSpaceFilter("commercial")}
              color={selectedSpaceFilter === "commercial" ? "secondary" : "default"}
              variant={selectedSpaceFilter === "commercial" ? "filled" : "outlined"}
              sx={{ fontWeight: 700 }}
            />
          </Box>
        </Box>

        {/* Impact Live Calculation Preview Banner */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 1.25,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "background.paper"),
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", display: "flex", alignItems: "center", gap: 0.5 }}>
              <BoltIcon sx={{ fontSize: 16 }} />
              Calculated Routine Projection:
            </Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "warning.dark") }}
            >
              {rangeLabel} ({dateCount} day{dateCount > 1 ? "s" : ""})
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, textAlign: "center" }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "action.hover"),
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Active Devices
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "text.primary" }}>
                {dailyMetrics.activeDeviceCount} of {targetAppliances.length}
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "action.hover"),
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Daily Estimate
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main" }}>
                ₱{dailyMetrics.dailyCost.toFixed(2)}/day
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "action.hover"),
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Total Range Cost
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "warning.main"),
                }}
              >
                ₱{dailyMetrics.totalCost.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          {rangeType !== "single_day" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={excludeToday}
                    onChange={(e) => setExcludeToday(e.target.checked)}
                    size="small"
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
                        Exclude Today (Keep Today empty for live stopwatch tracking)
                      </Typography>
                      <Chip label="Recommended" size="small" color="primary" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                      Preserves Today for real-time tracking instead of marking it 100% finished in advance.
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: "flex-start", m: 0 }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Overwrite days that already have logged data (Uncheck to only fill unlogged/empty days)
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Box>
          )}
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 1, fontWeight: 700 }}>
          Cancel
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          {rangeType !== "single_day" && (
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => {
                onApplyToCurrentDay();
                onClose();
              }}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Apply to Today Only
            </Button>
          )}

          <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleBatchSave}
            disabled={isSaving}
            sx={{ borderRadius: 1, fontWeight: 800, px: 3 }}
          >
            {isSaving
              ? "Batch Saving Logs..."
              : rangeType === "single_day"
              ? "Apply Routine Defaults"
              : `Batch Save & Log (${dateCount} Days)`}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default RoutineAutofillModal;
