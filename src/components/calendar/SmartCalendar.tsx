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
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Whatshot as FlameIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Bolt as BoltIcon,
  Savings as SavingsIcon,
  DateRange as DateRangeIcon,
  Science as ScienceIcon,
  Timeline as TimelineIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";
import {
  UserCalendarEvent,
  UserAppliance,
  DailyApplianceUsage,
  SimulatedApplianceUsage,
  ApplianceList,
  ApplianceUsageLog,
  BillingPeriodConfig,
} from "../../types";
import { useList } from "@refinedev/core";
import { DateAnalyticsModal } from "./DateAnalyticsModal";
import { SimulatedDayModal } from "./SimulatedDayModal";
import { SimulateApplianceModal } from "./SimulateApplianceModal";
import { BillingPeriodModal } from "./BillingPeriodModal";
import {
  formatDateToKey,
  computeActualDayMetrics,
  computeSimulatedDayMetrics,
  DEFAULT_EFFECTIVE_RATE,
  getStoredBillingPeriodConfig,
  setStoredBillingPeriodConfig,
  resolveBillingPeriodWindow,
} from "../../lib/dailyUsageService";

export const SmartCalendar: React.FC = () => {
  // Calendar Tab: Actual Tracker vs Simulation Plan
  const [calendarTab, setCalendarTab] = useState<"actual" | "simulation">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("powerforecast_calendar_tab") as "actual" | "simulation") || "actual";
    }
    return "actual";
  });

  const handleTabChange = (newTab: "actual" | "simulation") => {
    setCalendarTab(newTab);
    if (typeof window !== "undefined") {
      localStorage.setItem("powerforecast_calendar_tab", newTab);
    }
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateForActualModal, setSelectedDateForActualModal] = useState<Date | null>(null);
  const [selectedDateForSimModal, setSelectedDateForSimModal] = useState<Date | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");

  // Billing Period state & config modal
  const [billingConfig, setBillingConfig] = useState<BillingPeriodConfig>(getStoredBillingPeriodConfig());
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);

  // Simulate Appliance modal state
  const [isSimulateApplianceOpen, setIsSimulateApplianceOpen] = useState(false);

  // Queries
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

  const simulatedUsageRes = useList<SimulatedApplianceUsage>({
    resource: "simulated_appliance_usage",
    pagination: { mode: "off" },
  }) as any;

  const logsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
    pagination: { mode: "off" },
  }) as any;

  const allAppliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const dailyUsageList: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];
  const simulatedUsageList: SimulatedApplianceUsage[] = simulatedUsageRes?.data?.data || simulatedUsageRes?.result?.data || [];
  const usageLogs: ApplianceUsageLog[] = logsRes?.data?.data || logsRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  // Filter appliances by selected space
  const appliances = useMemo(() => {
    const spaceFiltered = selectedSpaceId === "all" ? allAppliances : allAppliances.filter((a) => a.list_id === selectedSpaceId);
    return spaceFiltered.filter((a) => a.is_active !== false);
  }, [allAppliances, selectedSpaceId]);

  // Group actual daily usage by dateKey
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

  // Group simulated daily usage by dateKey
  const simulatedUsageMap = useMemo(() => {
    const map: Record<string, SimulatedApplianceUsage[]> = {};
    simulatedUsageList.forEach((item) => {
      if (!map[item.usage_date]) {
        map[item.usage_date] = [];
      }
      map[item.usage_date].push(item);
    });
    return map;
  }, [simulatedUsageList]);

  // Resolve custom billing window
  const billingWindow = useMemo(() => {
    return resolveBillingPeriodWindow(currentDate, billingConfig);
  }, [currentDate, billingConfig]);

  const handleSaveBillingConfig = (newConfig: BillingPeriodConfig) => {
    setBillingConfig(newConfig);
    setStoredBillingPeriodConfig(newConfig);
    setIsBillingModalOpen(false);
  };

  const handlePrevPeriod = () => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() - 1);
    setCurrentDate(nextDate);
  };

  const handleNextPeriod = () => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    setCurrentDate(nextDate);
  };

  const realToday = new Date();
  const realTodayKey = formatDateToKey(realToday);

  // Period Summaries
  const actualPeriodSummary = useMemo(() => {
    let totCost = 0;
    let totKwh = 0;
    let loggedDays = 0;

    billingWindow.days.forEach((dayDate) => {
      const dKey = formatDateToKey(dayDate);
      const metrics = computeActualDayMetrics(dKey, dailyUsageMap[dKey] || [], appliances, DEFAULT_EFFECTIVE_RATE);
      if (metrics.isLogged) {
        totCost += metrics.cost;
        totKwh += metrics.kwh;
        loggedDays++;
      }
    });

    const runningCount = appliances.filter((a) => a.is_currently_on).length;

    return {
      actualCost: Number(totCost.toFixed(2)),
      actualKwh: Number(totKwh.toFixed(2)),
      loggedDaysCount: loggedDays,
      runningCircuitsCount: runningCount,
      totalDays: billingWindow.days.length,
    };
  }, [billingWindow.days, dailyUsageMap, appliances]);

  const simPeriodSummary = useMemo(() => {
    let baseCost = 0;
    let baseKwh = 0;
    let simCost = 0;
    let simKwh = 0;
    let customSimCount = 0;

    billingWindow.days.forEach((dayDate) => {
      const dKey = formatDateToKey(dayDate);
      const metrics = computeSimulatedDayMetrics(dKey, dayDate, simulatedUsageMap[dKey] || [], appliances, DEFAULT_EFFECTIVE_RATE);
      baseCost += metrics.baselineCost;
      baseKwh += metrics.baselineKwh;
      simCost += metrics.cost;
      simKwh += metrics.kwh;
      if (metrics.isCustomSimulated) customSimCount++;
    });

    const savings = baseCost - simCost;
    const savingsPct = baseCost > 0 ? ((savings / baseCost) * 100).toFixed(1) : "0.0";

    return {
      baselinePeriodCost: Number(baseCost.toFixed(2)),
      baselinePeriodKwh: Number(baseKwh.toFixed(2)),
      simulatedPeriodCost: Number(simCost.toFixed(2)),
      simulatedPeriodKwh: Number(simKwh.toFixed(2)),
      periodSavings: Number(savings.toFixed(2)),
      periodSavingsPct: savingsPct,
      simulatedDaysCount: customSimCount,
      totalDays: billingWindow.days.length,
    };
  }, [billingWindow.days, simulatedUsageMap, appliances]);

  // Calendar Grid Setup
  const firstDayOfPeriod = billingWindow.days[0];
  const firstDayIndex = firstDayOfPeriod.getDay();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      {/* 1. Header with Mode Toggle & Actions */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.25,
                bgcolor: calendarTab === "actual" ? "success.main" : "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {calendarTab === "actual" ? <TimelineIcon /> : <ScienceIcon />}
            </Box>
            Smart Energy Calendar
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {calendarTab === "actual"
              ? "Actual Tracker: Verified stopwatch sessions, real-time circuit switches, and authentic measured telemetry."
              : "Simulation Plan: Design what-if schedules, test appliance runtimes, and forecast Meralco monthly quotas."}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          {/* Top Segmented Navigation Tab */}
          <Paper
            variant="outlined"
            sx={{
              display: "flex",
              p: 0.5,
              borderRadius: 2,
              bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.03)",
            }}
          >
            <Button
              size="small"
              onClick={() => handleTabChange("actual")}
              startIcon={<TimerIcon />}
              sx={{
                borderRadius: 1.5,
                fontWeight: 800,
                px: 2,
                py: 0.6,
                textTransform: "none",
                bgcolor: calendarTab === "actual" ? (theme) => theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.2)" : "rgba(16, 185, 129, 0.15)" : "transparent",
                color: calendarTab === "actual" ? "#34d399" : "text.secondary",
                "&:hover": {
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.25)" : "rgba(16, 185, 129, 0.2)",
                },
              }}
            >
              Actual Tracker (Live)
            </Button>
            <Button
              size="small"
              onClick={() => handleTabChange("simulation")}
              startIcon={<ScienceIcon />}
              sx={{
                borderRadius: 1.5,
                fontWeight: 800,
                px: 2,
                py: 0.6,
                textTransform: "none",
                bgcolor: calendarTab === "simulation" ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.15)" : "transparent",
                color: calendarTab === "simulation" ? "primary.main" : "text.secondary",
                "&:hover": {
                  bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.2)",
                },
              }}
            >
              Simulation Plan (What-If)
            </Button>
          </Paper>

          {/* Billing Period Selector */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DateRangeIcon />}
            onClick={() => setIsBillingModalOpen(true)}
            sx={{ borderRadius: 1.25, fontWeight: 700, px: 2, py: 0.8 }}
          >
            {billingConfig.mode === "recurring_cycle"
              ? `Cycle (Day ${billingConfig.cycleStartDay})`
              : billingConfig.mode === "custom_range"
              ? "Custom Range"
              : "Monthly Period"}
          </Button>

          {/* Simulate Appliance Button (Visible in Simulation Tab) */}
          {calendarTab === "simulation" && (
            <Button
              variant="contained"
              size="small"
              startIcon={<ScienceIcon />}
              onClick={() => setIsSimulateApplianceOpen(true)}
              sx={{
                borderRadius: 1.25,
                fontWeight: 800,
                px: 2,
                py: 0.8,
                bgcolor: "primary.main",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(0, 229, 201, 0.25)",
              }}
            >
              Simulate Appliance
            </Button>
          )}
        </Box>
      </Box>

      {/* 2. Space Switcher Bento Pill Bar */}
      {spaces.length > 1 && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflowX: "auto", pb: 0.5 }}>
          <Button
            size="small"
            onClick={() => setSelectedSpaceId("all")}
            startIcon={<StoreIcon sx={{ fontSize: 15 }} />}
            sx={{
              px: 2,
              py: 0.5,
              borderRadius: 2,
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "none",
              bgcolor: selectedSpaceId === "all" ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.1)" : "transparent",
              color: selectedSpaceId === "all" ? "primary.main" : "text.secondary",
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
                startIcon={space.tariff_type === "commercial" ? <StoreIcon sx={{ fontSize: 15 }} /> : <HomeIcon sx={{ fontSize: 15 }} />}
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "none",
                  bgcolor: isSelected ? (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.1)" : "transparent",
                  color: isSelected ? "primary.main" : "text.secondary",
                }}
              >
                {space.name} ({count})
              </Button>
            );
          })}
        </Box>
      )}

      {/* 3. Top KPI Cards */}
      {calendarTab === "actual" ? (
        /* Actual Tracker KPI Cards */
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                ACTUAL SPEND TO DATE
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#34d399", mt: 0.5, fontFamily: "monospace" }}>
                ₱{actualPeriodSummary.actualCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Verified measured sessions
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                MEASURED ENERGY
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "warning.main", mt: 0.5, fontFamily: "monospace" }}>
                {actualPeriodSummary.actualKwh} kWh
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Across {actualPeriodSummary.loggedDaysCount} logged day(s)
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: actualPeriodSummary.runningCircuitsCount > 0 ? "#34d399" : "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                CIRCUITS STATUS
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: actualPeriodSummary.runningCircuitsCount > 0 ? "#34d399" : "text.secondary", mt: 0.5, fontFamily: "monospace" }}>
                {actualPeriodSummary.runningCircuitsCount > 0 ? `${actualPeriodSummary.runningCircuitsCount} Stopwatch Active` : "All Idle"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Real-time active load
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                TIMEFRAME DAYS
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "info.main", mt: 0.5, fontFamily: "monospace" }}>
                {actualPeriodSummary.loggedDaysCount} / {actualPeriodSummary.totalDays} Days
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Days with verified records
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      ) : (
        /* Simulation Plan KPI Cards */
        <Grid container spacing={{ xs: 1.5, sm: 2 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                BASELINE QUOTA
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#818cf8", mt: 0.5, fontFamily: "monospace" }}>
                ~₱{simPeriodSummary.baselinePeriodCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Routine defaults ({simPeriodSummary.baselinePeriodKwh} kWh)
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "primary.main" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                SIMULATED PERIOD BILL
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "primary.main", mt: 0.5, fontFamily: "monospace" }}>
                ₱{simPeriodSummary.simulatedPeriodCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                With tailored schedules ({simPeriodSummary.simulatedPeriodKwh} kWh)
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                SIMULATED SAVINGS
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: simPeriodSummary.periodSavings >= 0 ? "#34d399" : "#f59e0b", mt: 0.5, fontFamily: "monospace" }}>
                {simPeriodSummary.periodSavings >= 0 ? `Saves ₱${simPeriodSummary.periodSavings.toFixed(2)}` : `+₱${Math.abs(simPeriodSummary.periodSavings).toFixed(2)}`}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                {simPeriodSummary.periodSavingsPct}% delta vs baseline
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase" }}>
                CUSTOM PLAN COVERAGE
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "#ffd54f", mt: 0.5, fontFamily: "monospace" }}>
                {simPeriodSummary.simulatedDaysCount} / {simPeriodSummary.totalDays} Days
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Days with tailored plans
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 4. Calendar Controls Navigator */}
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
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, fontSize: "0.7rem", display: "block" }}>
                  {billingWindow.subLabel}
                </Typography>
              )}
            </Box>

            <IconButton onClick={handleNextPeriod} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            {calendarTab === "actual" ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#34d399" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Logged Actuals
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#818cf8" }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    ~₱ Routine Quota
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#00e5c9" }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                    Custom Simulation
                  </Typography>
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Card>

      {/* 5. Calendar Month Grid */}
      <Card sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: 1.5 }}>
        {/* Days of week header */}
        <Grid container columns={7} spacing={{ xs: 0.5, sm: 1 }} sx={{ mb: 1 }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
            <Grid size={1} key={day} sx={{ textAlign: "center", py: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 800,
                  color: idx === 0 || idx === 6 ? "primary.light" : "text.secondary",
                  textTransform: "uppercase",
                  fontSize: { xs: "0.625rem", sm: "0.6875rem" },
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Days grid */}
        <Grid container columns={7} spacing={{ xs: 0.5, sm: 1 }}>
          {/* Empty spacer cells */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <Grid size={1} key={`empty-${idx}`}>
              <Box sx={{ minHeight: { xs: 76, sm: 98 }, opacity: 0.2 }} />
            </Grid>
          ))}

          {/* Actual day cells */}
          {billingWindow.days.map((dayDate, idx) => {
            const dayNum = dayDate.getDate();
            const dateKey = formatDateToKey(dayDate);
            const isCurrentToday = dateKey === realTodayKey;
            const isFuture = dateKey > realTodayKey;

            // In Actual Tracker tab
            if (calendarTab === "actual") {
              const actualMetrics = computeActualDayMetrics(
                dateKey,
                dailyUsageMap[dateKey] || [],
                appliances,
                DEFAULT_EFFECTIVE_RATE
              );

              return (
                <Grid size={1} key={`actual-${dateKey}-${idx}`}>
                  <Paper
                    variant="outlined"
                    onClick={() => {
                      if (!isFuture) {
                        setSelectedDateForActualModal(dayDate);
                      }
                    }}
                    sx={{
                      minHeight: { xs: 76, sm: 98 },
                      p: { xs: 0.5, sm: 1 },
                      borderRadius: 1.5,
                      cursor: isFuture ? "not-allowed" : "pointer",
                      opacity: isFuture ? 0.45 : 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      bgcolor: isCurrentToday
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.12)" : "rgba(16, 185, 129, 0.08)")
                        : actualMetrics.isLogged
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#ffffff")
                        : "background.paper",
                      borderColor: isCurrentToday
                        ? "#34d399"
                        : actualMetrics.isLogged
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.3)" : "rgba(16, 185, 129, 0.25)")
                        : "divider",
                      "&:hover": {
                        borderColor: isFuture ? "divider" : "#34d399",
                        transform: isFuture ? "none" : "translateY(-2px)",
                      },
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: isCurrentToday ? 900 : 700, color: isCurrentToday ? "#34d399" : "text.primary" }}>
                          {dayNum}
                        </Typography>
                        {isCurrentToday && (
                          <Chip label="TODAY" size="small" sx={{ height: 16, fontSize: "0.5rem", fontWeight: 900, bgcolor: "#34d399", color: "#fff" }} />
                        )}
                      </Box>
                      {actualMetrics.hasActiveLiveCircuits && (
                        <Tooltip title="Stopwatch Running Live">
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#34d399", animation: "pulse 1.5s infinite" }} />
                        </Tooltip>
                      )}
                    </Box>

                    {/* Content */}
                    <Box sx={{ textAlign: "right", mt: 1 }}>
                      {isFuture ? (
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                          Future Day
                        </Typography>
                      ) : actualMetrics.isLogged ? (
                        <>
                          <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#34d399" }}>
                            ₱{actualMetrics.cost.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                            {actualMetrics.kwh.toFixed(1)} kWh • {actualMetrics.applianceCount} dev
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                          No sessions
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              );
            }

            // In Simulation Plan tab
            const simMetrics = computeSimulatedDayMetrics(
              dateKey,
              dayDate,
              simulatedUsageMap[dateKey] || [],
              appliances,
              DEFAULT_EFFECTIVE_RATE
            );

            return (
              <Grid size={1} key={`sim-${dateKey}-${idx}`}>
                <Paper
                  variant="outlined"
                  onClick={() => setSelectedDateForSimModal(dayDate)}
                  sx={{
                    minHeight: { xs: 76, sm: 98 },
                    p: { xs: 0.5, sm: 1 },
                    borderRadius: 1.5,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    bgcolor: isCurrentToday
                      ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.08)")
                      : simMetrics.isCustomSimulated
                      ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.06)" : "rgba(13, 148, 136, 0.05)")
                      : "background.paper",
                    borderColor: isCurrentToday
                      ? "primary.main"
                      : simMetrics.isCustomSimulated
                      ? "primary.main"
                      : "divider",
                    "&:hover": {
                      borderColor: "primary.light",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {/* Header */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: isCurrentToday ? 900 : 700, color: isCurrentToday ? "primary.main" : "text.primary" }}>
                        {dayNum}
                      </Typography>
                      {isCurrentToday && (
                        <Chip label="TODAY" size="small" sx={{ height: 16, fontSize: "0.5rem", fontWeight: 900, bgcolor: "primary.main", color: "#fff" }} />
                      )}
                    </Box>
                    {simMetrics.isCustomSimulated && (
                      <Tooltip title="Custom Simulation Plan Active">
                        <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#00e5c9" }} />
                      </Tooltip>
                    )}
                  </Box>

                  {/* Content */}
                  <Box sx={{ textAlign: "right", mt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main" }}>
                      ₱{simMetrics.cost.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                      {simMetrics.kwh.toFixed(1)} kWh
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Card>

      {/* MODAL 1: Actual Tab Day Inspector with 24H Timeline & Stopwatch Switches */}
      {selectedDateForActualModal && (
        <DateAnalyticsModal
          isOpen={Boolean(selectedDateForActualModal)}
          onClose={() => setSelectedDateForActualModal(null)}
          selectedDate={selectedDateForActualModal}
          appliances={appliances}
          initialUsageRecords={dailyUsageList}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          logs={usageLogs}
          onUsageSaved={() => {
            if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
            if (logsRes?.refetch) logsRes.refetch();
            if (appliancesRes?.refetch) appliancesRes.refetch();
          }}
        />
      )}

      {/* MODAL 2: Simulation Tab Day Plan Inspector */}
      {selectedDateForSimModal && (
        <SimulatedDayModal
          isOpen={Boolean(selectedDateForSimModal)}
          onClose={() => setSelectedDateForSimModal(null)}
          selectedDate={selectedDateForSimModal}
          appliances={appliances}
          initialSimulatedRecords={simulatedUsageList}
          spaces={spaces}
          selectedSpaceId={selectedSpaceId}
          onSimulationSaved={() => {
            if (simulatedUsageRes?.refetch) simulatedUsageRes.refetch();
          }}
        />
      )}

      {/* MODAL 3: Simulate Appliance Modal */}
      <SimulateApplianceModal
        isOpen={isSimulateApplianceOpen}
        onClose={() => setIsSimulateApplianceOpen(false)}
        appliances={appliances}
        selectedDate={currentDate}
        onSimulationSaved={() => {
          if (simulatedUsageRes?.refetch) simulatedUsageRes.refetch();
        }}
      />

      {/* MODAL 4: Billing Period & Cutoff Settings */}
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
