import React, { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Whatshot as FlameIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Public as PublicIcon,
  AutoAwesome as SparklesIcon,
  Bolt as BoltIcon,
  TrendingDown as TrendingDownIcon,
  Savings as SavingsIcon,
  DateRange as DateRangeIcon,
} from "@mui/icons-material";
import {
  UserCalendarEvent,
  UserAppliance,
  DailyApplianceUsage,
  ApplianceList,
  BillingPeriodConfig,
  BillingPeriodWindow,
} from "../../types";
import { useList } from "@refinedev/core";
import { DateAnalyticsModal } from "./DateAnalyticsModal";
import { RoutineAutofillModal } from "./RoutineAutofillModal";
import { BillingPeriodModal } from "./BillingPeriodModal";
import {
  formatDateToKey,
  computeDayMetrics,
  DEFAULT_EFFECTIVE_RATE,
  getStoredBillingPeriodConfig,
  setStoredBillingPeriodConfig,
  resolveBillingPeriodWindow,
} from "../../lib/dailyUsageService";

export const SmartCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [mobileViewMode, setMobileViewMode] = useState<"projected" | "simulated">("simulated");

  // Billing Period state & config modal
  const [billingConfig, setBillingConfig] = useState<BillingPeriodConfig>(getStoredBillingPeriodConfig());
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Modals state
  const [isRoutineAutofillOpen, setIsRoutineAutofillOpen] = useState(false);

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
    pagination: { mode: "off" },
  }) as any;

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    pagination: { mode: "off" },
  }) as any;

  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];
  const allAppliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const dailyUsageList: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  // Filter appliances by selected space (excluding inactive/blacklisted)
  const appliances = useMemo(() => {
    const spaceFiltered = selectedSpaceId === "all" ? allAppliances : allAppliances.filter((a) => a.list_id === selectedSpaceId);
    return spaceFiltered.filter((a) => a.is_active !== false);
  }, [allAppliances, selectedSpaceId]);

  // Group daily usage by dateKey
  const dailyUsageMap = useMemo(() => {
    const map: Record<string, DailyApplianceUsage[]> = {};
    dailyUsageList.forEach((item) => {
      if (!map[item.usage_date]) {
        map[item.usage_date] = [];
      }
      map[item.usage_date].push(item);
    });
    return map;
  }, [dailyUsageList]);

  const handleSaveBillingConfig = (newConfig: BillingPeriodConfig) => {
    setBillingConfig(newConfig);
    setStoredBillingPeriodConfig(newConfig);
  };

  // Active Billing Window resolution
  const billingWindow: BillingPeriodWindow = useMemo(() => {
    return resolveBillingPeriodWindow(currentDate, billingConfig);
  }, [currentDate, billingConfig]);

  const firstDayIndex = billingWindow.startDate.getDay();

  const handlePrevPeriod = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextPeriod = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Billing Period / Month aggregations: Baseline Projected vs Simulated Scenario
  const periodSummary = useMemo(() => {
    let baselinePeriodKwh = 0;
    let baselinePeriodCost = 0;
    let simulatedPeriodKwh = 0;
    let simulatedPeriodCost = 0;
    let simulatedDaysCount = 0;

    billingWindow.days.forEach((dayDate) => {
      const dateKey = formatDateToKey(dayDate);
      const metrics = computeDayMetrics(
        dateKey,
        dayDate,
        dailyUsageMap[dateKey] || [],
        appliances,
        events,
        DEFAULT_EFFECTIVE_RATE
      );

      baselinePeriodKwh += metrics.baselineKwh;
      baselinePeriodCost += metrics.baselineCost;
      simulatedPeriodKwh += metrics.kwh;
      simulatedPeriodCost += metrics.cost;

      if (metrics.isSimulated || metrics.isLogged) {
        simulatedDaysCount += 1;
      }
    });

    const periodSavings = baselinePeriodCost - simulatedPeriodCost;
    const periodSavingsPct = baselinePeriodCost > 0 ? (periodSavings / baselinePeriodCost) * 100 : 0;

    return {
      baselinePeriodKwh: Number(baselinePeriodKwh.toFixed(1)),
      baselinePeriodCost: Number(baselinePeriodCost.toFixed(2)),
      simulatedPeriodKwh: Number(simulatedPeriodKwh.toFixed(1)),
      simulatedPeriodCost: Number(simulatedPeriodCost.toFixed(2)),
      simulatedDaysCount,
      totalDays: billingWindow.days.length,
      periodSavings: Number(periodSavings.toFixed(2)),
      periodSavingsPct: Number(periodSavingsPct.toFixed(1)),
    };
  }, [billingWindow, dailyUsageMap, appliances, events]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
      {/* 1. Header Banner & Simulate Schedule Action */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.25,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalendarIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Smart Energy Calendar & Simulation
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Plan daily appliance schedules, compare baseline quotas against simulated scenarios, and project month-end bill savings.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DateRangeIcon sx={{ color: billingConfig.mode !== "calendar_month" ? "primary.main" : "#ffd54f" }} />}
            onClick={() => setIsBillingModalOpen(true)}
            sx={{
              borderRadius: 1.25,
              fontWeight: 800,
              px: 2,
              py: 0.85,
              borderColor: billingConfig.mode !== "calendar_month" ? "primary.main" : "divider",
              bgcolor: billingConfig.mode !== "calendar_month"
                ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.08)"
                : (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
              color: billingConfig.mode !== "calendar_month" ? "primary.main" : "text.primary",
              boxShadow: billingConfig.mode !== "calendar_month" ? "0 2px 8px rgba(0, 229, 201, 0.2)" : "none",
              "&:hover": {
                borderColor: "primary.light",
                bgcolor: billingConfig.mode !== "calendar_month"
                  ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.15)"
                  : (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
              },
            }}
          >
            {billingConfig.mode === "recurring_cycle"
              ? `Billing Cycle (Day ${billingConfig.cycleStartDay})`
              : billingConfig.mode === "custom_range"
              ? "Custom Range"
              : "Billing Period: Month"}
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={<SparklesIcon sx={{ color: "#ffd54f" }} />}
            onClick={() => setIsRoutineAutofillOpen(true)}
            sx={{
              borderRadius: 1.25,
              fontWeight: 800,
              px: 2,
              py: 0.85,
              bgcolor: "primary.main",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(0, 229, 201, 0.25)",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            ⚡ Simulate Schedule
          </Button>
        </Box>
      </Box>

      {/* 1.5. Space Switcher Bento Pill Bar */}
      {spaces.length > 1 && (
        <Box
          sx={{
            p: { xs: 0.75, sm: 1 },
            borderRadius: 2,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#14171c" : "background.paper"),
            border: "1px solid",
            borderColor: "divider",
            boxShadow: (theme) =>
              theme.palette.mode === "dark" ? "none" : "0 2px 8px rgba(15, 23, 42, 0.04)",
            display: "flex",
            alignItems: "center",
            gap: { xs: 0.75, sm: 1 },
            overflowX: "auto",
            "&::-webkit-scrollbar": { height: 4 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
          }}
        >
          <Button
            size="small"
            onClick={() => setSelectedSpaceId("all")}
            startIcon={<PublicIcon sx={{ fontSize: 15 }} />}
            sx={{
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.45, sm: 0.6 },
              borderRadius: 2,
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              bgcolor: (theme) =>
                selectedSpaceId === "all"
                  ? theme.palette.mode === "dark"
                    ? "rgba(0, 229, 201, 0.15)"
                    : "rgba(13, 148, 136, 0.1)"
                  : "transparent",
              color: (theme) =>
                selectedSpaceId === "all"
                  ? theme.palette.mode === "dark"
                    ? "#00e5c9"
                    : "#0f766e"
                  : "text.secondary",
              border: "1px solid",
              borderColor: (theme) =>
                selectedSpaceId === "all"
                  ? theme.palette.mode === "dark"
                    ? "rgba(0, 229, 201, 0.4)"
                    : "rgba(13, 148, 136, 0.3)"
                  : "transparent",
              "&:hover": {
                bgcolor: (theme) =>
                  selectedSpaceId === "all"
                    ? theme.palette.mode === "dark"
                      ? "rgba(0, 229, 201, 0.2)"
                      : "rgba(13, 148, 136, 0.15)"
                    : theme.palette.mode === "dark"
                    ? "rgba(255, 255, 255, 0.05)"
                    : "#f1f5f9",
                color: (theme) =>
                  selectedSpaceId === "all"
                    ? theme.palette.mode === "dark"
                      ? "#00e5c9"
                      : "#0f766e"
                    : "text.primary",
              },
            }}
          >
            All Spaces ({allAppliances.length})
          </Button>

          {spaces.map((space) => {
            const count = allAppliances.filter((a) => a.list_id === space.id).length;
            const isSelected = selectedSpaceId === space.id;
            return (
              <Button
                key={space.id}
                size="small"
                onClick={() => setSelectedSpaceId(space.id)}
                startIcon={
                  space.tariff_type === "commercial" ? (
                    <StoreIcon sx={{ fontSize: 15 }} />
                  ) : (
                    <HomeIcon sx={{ fontSize: 15 }} />
                  )
                }
                sx={{
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 0.45, sm: 0.6 },
                  borderRadius: 2,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  bgcolor: (theme) =>
                    isSelected
                      ? theme.palette.mode === "dark"
                        ? "rgba(0, 229, 201, 0.15)"
                        : "rgba(13, 148, 136, 0.1)"
                      : "transparent",
                  color: (theme) =>
                    isSelected
                      ? theme.palette.mode === "dark"
                        ? "#00e5c9"
                        : "#0f766e"
                      : "text.secondary",
                  border: "1px solid",
                  borderColor: (theme) =>
                    isSelected
                      ? theme.palette.mode === "dark"
                        ? "rgba(0, 229, 201, 0.4)"
                        : "rgba(13, 148, 136, 0.3)"
                      : "transparent",
                  "&:hover": {
                    bgcolor: (theme) =>
                      isSelected
                        ? theme.palette.mode === "dark"
                          ? "rgba(0, 229, 201, 0.2)"
                          : "rgba(13, 148, 136, 0.15)"
                        : theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "#f1f5f9",
                    color: (theme) =>
                      isSelected
                        ? theme.palette.mode === "dark"
                          ? "#00e5c9"
                          : "#0f766e"
                        : "text.primary",
                  },
                }}
              >
                {space.name} ({count})
              </Button>
            );
          })}
        </Box>
      )}

      {/* 2. TOP KPI CARDS: BASELINE VS SIMULATED TELEMETRY */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {/* Card 1: Baseline Projected Period */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "#ffffff",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 10px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <ClockIcon sx={{ fontSize: 16, color: (theme) => theme.palette.mode === "dark" ? "#818cf8" : "#6366f1" }} />
              Baseline {billingConfig.mode === "calendar_month" ? "Month" : "Cycle"}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: (theme) => (theme.palette.mode === "dark" ? "#a5b4fc" : "#4f46e5"),
                mt: 0.5,
                fontFamily: "monospace",
              }}
            >
              ~₱{periodSummary.baselinePeriodCost.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              {billingConfig.mode === "calendar_month" ? "Full-month" : "Billing cycle"} quota ({periodSummary.baselinePeriodKwh} kWh)
            </Typography>
          </Paper>
        </Grid>

        {/* Card 2: Simulated Period Bill */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "#ffffff",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 10px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <BoltIcon sx={{ fontSize: 16, color: (theme) => theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488" }} />
              Simulated {billingConfig.mode === "calendar_month" ? "Month" : "Cycle"}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                mt: 0.5,
                fontFamily: "monospace",
              }}
            >
              ₱{periodSummary.simulatedPeriodCost.toFixed(2)}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              With planned routines ({periodSummary.simulatedPeriodKwh} kWh)
            </Typography>
          </Paper>
        </Grid>

        {/* Card 3: Projected Savings */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "#ffffff",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 10px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <SavingsIcon sx={{ fontSize: 16, color: periodSummary.periodSavings >= 0 ? "#34d399" : "#fbbf24" }} /> Projected Savings
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: periodSummary.periodSavings >= 0 ? "#34d399" : "#f59e0b",
                mt: 0.5,
                fontFamily: "monospace",
              }}
            >
              {periodSummary.periodSavings >= 0
                ? `-₱${periodSummary.periodSavings.toFixed(2)}`
                : `+₱${Math.abs(periodSummary.periodSavings).toFixed(2)}`}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              {periodSummary.periodSavings >= 0
                ? `${periodSummary.periodSavingsPct}% reduction vs baseline`
                : `${Math.abs(periodSummary.periodSavingsPct)}% higher vs baseline`}
            </Typography>
          </Paper>
        </Grid>

        {/* Card 4: Simulation Coverage */}
        <Grid size={{ xs: 6, sm: 3 }}>
          <Paper
            sx={{
              p: 2,
              borderRadius: 1.25,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "#ffffff",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 10px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.75 }}>
              <CheckCircleIcon sx={{ fontSize: 16, color: "#ffd54f" }} />
              {billingConfig.mode === "calendar_month" ? "Simulation Coverage" : "Cycle Coverage"}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 900,
                color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                mt: 0.5,
                fontFamily: "monospace",
              }}
            >
              {periodSummary.simulatedDaysCount} / {periodSummary.totalDays} Days
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
              {Math.round((periodSummary.simulatedDaysCount / periodSummary.totalDays) * 100)}% of timeframe tailored
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 3. Calendar Controls & Month/Cycle Navigator Card */}
      <Card sx={{ p: 2, borderRadius: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <IconButton onClick={handlePrevPeriod} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ChevronLeftIcon />
            </IconButton>

            <Box sx={{ textAlign: "center", minWidth: { xs: 180, sm: 240 } }}>
              <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                {billingWindow.label}
              </Typography>
              {billingWindow.subLabel && (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, mt: 0.25 }}>
                  <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, fontSize: "0.7rem" }}>
                    {billingWindow.subLabel}
                  </Typography>
                  <Chip
                    size="small"
                    label="Edit"
                    onClick={() => setIsBillingModalOpen(true)}
                    sx={{
                      height: 18,
                      fontSize: "0.625rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.1)",
                      color: "primary.main",
                      "&:hover": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.2)",
                      }
                    }}
                  />
                </Box>
              )}
            </Box>

            <IconButton onClick={handleNextPeriod} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          {/* Visual Legend */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#818cf8" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                ~₱ Baseline
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#00e5c9" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                ⚡ ₱ Simulated
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#34d399" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Savings Diff
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#fbbf24" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Heavy Peak Load
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      {/* 4. Mobile Responsive View Mode Segmented Pill (xs & sm only) */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          p: 0.75,
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f1f5f9"),
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", mr: 0.5 }}>
          Cell Display:
        </Typography>
        <Button
          size="small"
          variant={mobileViewMode === "projected" ? "contained" : "text"}
          onClick={() => setMobileViewMode("projected")}
          sx={{
            borderRadius: 1.5,
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "none",
            py: 0.35,
            px: 1.5,
          }}
        >
          📊 Baseline
        </Button>
        <Button
          size="small"
          variant={mobileViewMode === "simulated" ? "contained" : "text"}
          onClick={() => setMobileViewMode("simulated")}
          sx={{
            borderRadius: 1.5,
            fontSize: "0.72rem",
            fontWeight: 700,
            textTransform: "none",
            py: 0.35,
            px: 1.5,
          }}
        >
          ⚡ Simulated
        </Button>
      </Box>

      {/* 5. Monthly Grid View */}
      <Card data-tour="calendar-grid" sx={{ p: { xs: 1, sm: 2.5 }, borderRadius: 1.5 }}>
        {/* Day of week headers */}
        <Grid container columns={7} spacing={{ xs: 0.5, sm: 1 }} sx={{ mb: 1, textAlign: "center" }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
            <Grid size={1} key={day}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: idx === 0 || idx === 6 ? "primary.light" : "text.secondary",
                  textTransform: "uppercase",
                  fontSize: { xs: "0.625rem", sm: "0.6875rem" },
                  letterSpacing: "0.02em",
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Days grid */}
        <Grid container columns={7} spacing={{ xs: 0.5, sm: 1 }}>
          {/* Empty cells before 1st day */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <Grid size={1} key={`empty-${idx}`}>
              <Box sx={{ minHeight: { xs: 76, sm: 98 }, opacity: 0.2 }} />
            </Grid>
          ))}

          {/* Actual day cells */}
          {billingWindow.days.map((dayDate, idx) => {
            const dayNum = dayDate.getDate();
            const realToday = new Date();
            const isCurrentToday =
              dayNum === realToday.getDate() &&
              dayDate.getMonth() === realToday.getMonth() &&
              dayDate.getFullYear() === realToday.getFullYear();
            const dateKey = formatDateToKey(dayDate);
            const metrics = computeDayMetrics(
              dateKey,
              dayDate,
              dailyUsageMap[dateKey] || [],
              appliances,
              events,
              DEFAULT_EFFECTIVE_RATE
            );

            return (
              <Grid size={1} key={`day-${dateKey}-${idx}`}>
                <Paper
                  data-tour={isCurrentToday ? "calendar-day-click" : undefined}
                  variant="outlined"
                  onClick={() => setSelectedDateForModal(dayDate)}
                  sx={{
                    minHeight: { xs: 76, sm: 98 },
                    p: { xs: 0.5, sm: 1, md: 1.25 },
                    borderRadius: { xs: 1, sm: 1.25 },
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
                    bgcolor: isCurrentToday
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.15)"
                            : "rgba(13, 148, 136, 0.08)"
                      : metrics.isSimulated || metrics.isLogged
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.06)"
                            : "rgba(13, 148, 136, 0.05)"
                      : "background.paper",
                    border: isCurrentToday ? "2px solid" : "1px solid",
                    borderColor: isCurrentToday
                      ? "primary.main"
                      : metrics.isSimulated || metrics.isLogged
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.35)"
                            : "rgba(13, 148, 136, 0.3)"
                      : "divider",
                    boxShadow: isCurrentToday
                      ? (theme) =>
                          theme.palette.mode === "dark"
                            ? "0 0 16px rgba(0, 229, 201, 0.35), 0 0 4px rgba(0, 229, 201, 0.2)"
                            : "0 0 16px rgba(13, 148, 136, 0.25), 0 2px 8px rgba(13, 148, 136, 0.15)"
                      : "none",
                    "&:hover": {
                      borderColor: "primary.light",
                      transform: "translateY(-2px)",
                      boxShadow: isCurrentToday
                        ? (theme) =>
                            theme.palette.mode === "dark"
                              ? "0 0 20px rgba(0, 229, 201, 0.45), 0 4px 12px rgba(0, 229, 201, 0.2)"
                              : "0 0 20px rgba(13, 148, 136, 0.35), 0 4px 12px rgba(13, 148, 136, 0.2)"
                        : (theme) =>
                            theme.palette.mode === "dark"
                              ? "0 4px 12px rgba(0, 229, 201, 0.15)"
                              : "0 4px 12px rgba(13, 148, 136, 0.12)",
                    },
                  }}
                >
                  {/* TODAY badge */}
                  {isCurrentToday && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: "primary.main",
                          color: "#fff",
                          fontSize: { xs: "0.5rem", sm: "0.5625rem" },
                          fontWeight: 900,
                          px: 0.75,
                          py: 0.1,
                          borderRadius: "0 0 4px 4px",
                          letterSpacing: "0.06em",
                          lineHeight: 1.3,
                        }}
                      >
                        TODAY
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: isCurrentToday ? 0.75 : 0 }}>
                    <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                      {billingWindow.isCrossMonth && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: { xs: "0.55rem", sm: "0.625rem" },
                            fontWeight: 800,
                            color: isCurrentToday ? "primary.main" : "text.secondary",
                            textTransform: "uppercase",
                            letterSpacing: "0.02em",
                          }}
                        >
                          {dayDate.toLocaleDateString("en-US", { month: "short" })}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isCurrentToday ? 900 : 700,
                          color: isCurrentToday ? "primary.main" : "text.primary",
                          fontSize: { xs: "0.75rem", sm: "0.875rem" },
                          lineHeight: 1.2,
                        }}
                      >
                        {dayNum}
                      </Typography>
                      {(metrics.isSimulated || metrics.isLogged) && (
                        <Tooltip title="Custom Simulation Active">
                          <Box sx={{ width: { xs: 5, sm: 6 }, height: { xs: 5, sm: 6 }, borderRadius: "50%", bgcolor: "#00e5c9" }} />
                        </Tooltip>
                      )}
                    </Box>

                    {metrics.isPeak ? (
                      <Tooltip title="Heavy Load Day">
                        <FlameIcon sx={{ fontSize: { xs: 13, sm: 15 }, color: "warning.main" }} />
                      </Tooltip>
                    ) : (
                      <ClockIcon sx={{ fontSize: { xs: 11, sm: 13 }, color: metrics.isSimulated ? "primary.main" : "text.secondary" }} />
                    )}
                  </Box>

                  {/* DESKTOP VIEW: Dual values (Baseline vs Simulated) */}
                  <Box sx={{ display: { xs: "none", md: "block" }, textAlign: "right", mt: 0.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.6875rem",
                          fontFamily: "monospace",
                          lineHeight: 1.1,
                        }}
                      >
                        ~₱{metrics.baselineCost.toFixed(2)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 800,
                          fontFamily: "monospace",
                          color: (theme) =>
                            metrics.isSimulated
                              ? theme.palette.mode === "dark"
                                ? "#00e5c9"
                                : "#0d9488"
                              : theme.palette.mode === "dark"
                              ? "#ffd54f"
                              : "#d97706",
                          fontSize: "0.8125rem",
                          lineHeight: 1.1,
                        }}
                      >
                        ⚡ ₱{metrics.cost.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.25 }}>
                      {metrics.savings !== 0 ? (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.625rem",
                            fontWeight: 800,
                            fontFamily: "monospace",
                            color: metrics.savings > 0 ? "#34d399" : "#fbbf24",
                          }}
                        >
                          {metrics.savings > 0 ? `-₱${metrics.savings.toFixed(0)}` : `+₱${Math.abs(metrics.savings).toFixed(0)}`}
                        </Typography>
                      ) : (
                        <Box />
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.625rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {metrics.kwh} kWh
                      </Typography>
                    </Box>
                  </Box>

                  {/* MOBILE VIEW: Segmented display based on mobileViewMode */}
                  <Box sx={{ display: { xs: "block", md: "none" }, textAlign: "right", mt: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: (theme) =>
                          mobileViewMode === "simulated"
                            ? theme.palette.mode === "dark"
                              ? "#00e5c9"
                              : "#0d9488"
                            : theme.palette.mode === "dark"
                            ? "#a5b4fc"
                            : "#4f46e5",
                        display: "block",
                        fontSize: "0.6875rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: 1.1,
                      }}
                    >
                      {mobileViewMode === "projected"
                        ? `~₱${Math.round(metrics.baselineCost)}`
                        : `⚡ ₱${Math.round(metrics.cost)}`}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        fontSize: "0.55rem",
                        display: "block",
                        lineHeight: 1,
                        mt: 0.25,
                      }}
                    >
                      {metrics.kwh} kWh
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Card>

      {/* Date Analytics Modal (Tab 1: Donut Breakdown "Hati" + Tab 2: Simulated Day Plan) */}
      {selectedDateForModal && (
        <DateAnalyticsModal
          isOpen={Boolean(selectedDateForModal)}
          onClose={() => setSelectedDateForModal(null)}
          selectedDate={selectedDateForModal}
          appliances={appliances}
          events={events}
          initialUsageRecords={dailyUsageList}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          onUsageSaved={() => {
            if (dailyUsageRes?.refetch) {
              dailyUsageRes.refetch();
            }
          }}
        />
      )}

      {/* Routine Defaults Autofill Modal across Date Ranges */}
      <RoutineAutofillModal
        isOpen={isRoutineAutofillOpen}
        onClose={() => setIsRoutineAutofillOpen(false)}
        currentSelectedDate={currentDate}
        appliances={appliances}
        spaces={spaces}
        billingWindow={billingWindow}
        onApplyToCurrentDay={() => {
          if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
        }}
        onBatchSaved={() => {
          if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
        }}
      />

      {/* Billing Period & Cutoff Settings Modal */}
      <BillingPeriodModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        currentSelectedDate={currentDate}
        currentConfig={billingConfig}
        onSaveConfig={handleSaveBillingConfig}
      />
    </Box>
  );
};

export default SmartCalendar;
