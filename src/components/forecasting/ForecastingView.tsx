import React, { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import { Link } from "react-router-dom";
import {
  AutoGraph as AutoGraphIcon,
  Tune as TuneIcon,
  Bolt as BoltIcon,
  EnergySavingsLeaf as LeafIcon,
  WbSunny as SunIcon,
  InfoOutlined as InfoIcon,
  Security as ShieldIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  ElectricBolt as ElectricBoltIcon,
  RestartAlt as ResetIcon,
  Science as ScienceIcon,
  TipsAndUpdates as TipsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckIcon,
  WarningAmber as WarningIcon,
  Timeline as TimelineIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { UserAppliance, ApplianceList, DailyApplianceUsage, ApplianceUsageLog } from "../../types";
import { useList } from "@refinedev/core";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { calculateKwh, calculateApplianceKwh, calculateCost, DEFAULT_EFFECTIVE_RATE } from "../../lib/dailyUsageService";
import { useLanguage } from "../../context/LanguageContext";

export const ForecastingView: React.FC = () => {
  const { t, language } = useLanguage();
  const [genRateDelta, setGenRateDelta] = useState<number>(0);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [whatIfHours, setWhatIfHours] = useState<Record<string, number>>({});

  // 1. Fetch Real User Inventory, Spaces, Daily Usage Records, and Telemetry & Session Logs
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

  const usageLogsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
    pagination: { mode: "off" },
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];
  const dailyRecords: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];
  const sessionLogs: ApplianceUsageLog[] = usageLogsRes?.data?.data || usageLogsRes?.result?.data || [];

  // Filter target appliances based on space selection (excluding blacklisted / inactive appliances)
  const allSpaceAppliances = useMemo(() => {
    if (selectedSpaceId === "all") return appliances;
    return appliances.filter((a) => a.list_id === selectedSpaceId);
  }, [appliances, selectedSpaceId]);

  const targetAppliances = useMemo(() => {
    return allSpaceAppliances.filter((a) => a.is_active !== false);
  }, [allSpaceAppliances]);

  const blacklistedCount = useMemo(() => {
    return allSpaceAppliances.filter((a) => a.is_active === false).length;
  }, [allSpaceAppliances]);

  const targetApplianceIds = useMemo(() => {
    return new Set(targetAppliances.map((a) => a.id));
  }, [targetAppliances]);

  // Active Billing Cycle Timeline Telemetry (e.g. Current Month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentMonthStr = String(currentMonthIdx + 1).padStart(2, "0");
  const activeMonthKey = `${currentYear}-${currentMonthStr}`;
  const daysInActiveMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const elapsedDays = Math.min(now.getDate(), daysInActiveMonth);
  const remainingDays = Math.max(0, daysInActiveMonth - elapsedDays);

  const activeMonthName = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Base generation rate and simulated shift
  const baseGenRate = 7.1246;
  const simulatedGenRate = Math.max(4.0, baseGenRate + genRateDelta);

  // Active space tariff
  const activeSpace = spaces.find((s) => s.id === selectedSpaceId);
  const tariffType = activeSpace?.tariff_type || "residential";

  // 2. Month-To-Date (MTD) Actual Logged Telemetry
  const mtdActuals = useMemo(() => {
    let actualKwh = 0;
    let actualCost = 0;
    const loggedDatesSet = new Set<string>();

    dailyRecords.forEach((rec) => {
      if (rec.usage_date && rec.usage_date.startsWith(activeMonthKey) && targetApplianceIds.has(rec.appliance_id)) {
        actualKwh += Number(rec.kwh_consumed) || 0;
        actualCost += Number(rec.estimated_cost) || 0;
        if (Number(rec.hours_used) > 0) {
          loggedDatesSet.add(rec.usage_date);
        }
      }
    });

    const loggedDaysCount = loggedDatesSet.size;
    const avgDailyLoggedKwh = loggedDaysCount > 0 ? actualKwh / loggedDaysCount : 0;

    return {
      actualKwh: Number(actualKwh.toFixed(3)),
      actualCost: Number(actualCost.toFixed(2)),
      loggedDaysCount,
      avgDailyLoggedKwh: Number(avgDailyLoggedKwh.toFixed(3)),
      hasLoggedRecords: actualKwh > 0,
    };
  }, [dailyRecords, activeMonthKey, targetApplianceIds]);

  // 3. Daily Routine Baseline from User's Registered Inventory
  const routineBaseline = useMemo(() => {
    let dailyKwh = 0;
    let dailyStandbyKwh = 0;

    targetAppliances.forEach((app) => {
      const hours = app.hours_per_day || 0;
      const qty = app.quantity || 1;
      const kwh = calculateApplianceKwh(app, hours);
      dailyKwh += kwh;

      // Standby / vampire load estimation for non-operating hours
      const standbyWatts = (app.ai_metadata?.standby_watts as number | undefined) ?? 2.5;
      const nonOperatingHours = Math.max(0, 24 - hours);
      dailyStandbyKwh += (standbyWatts * nonOperatingHours * qty) / 1000;
    });

    const monthlyBaselineKwh = Number((dailyKwh * daysInActiveMonth).toFixed(3));
    const monthlyBaselineBill = calculateMeralcoBill(monthlyBaselineKwh, simulatedGenRate, 0, false, tariffType).totalBill;

    return {
      dailyKwh: Number(dailyKwh.toFixed(3)),
      dailyStandbyKwh: Number(dailyStandbyKwh.toFixed(3)),
      monthlyBaselineKwh,
      monthlyBaselineBill,
    };
  }, [targetAppliances, daysInActiveMonth, simulatedGenRate, tariffType]);

  // 4. Composite End-of-Month Forecast (Actual Logged + Remaining Unlogged Routine Days)
  const trajectoryForecast = useMemo(() => {
    let forecastedKwh = 0;
    let projectedRemainingKwh = 0;
    const unloggedDaysCount = Math.max(0, daysInActiveMonth - mtdActuals.loggedDaysCount);

    if (mtdActuals.hasLoggedRecords) {
      projectedRemainingKwh = Number((routineBaseline.dailyKwh * unloggedDaysCount).toFixed(3));
      forecastedKwh = Number((mtdActuals.actualKwh + projectedRemainingKwh).toFixed(3));
    } else {
      // If zero logs recorded for this month yet, projection runs on pure inventory routine
      forecastedKwh = routineBaseline.monthlyBaselineKwh;
      projectedRemainingKwh = forecastedKwh;
    }

    const forecastedBill = calculateMeralcoBill(forecastedKwh, simulatedGenRate, 0, false, tariffType).totalBill;
    const effectiveBurnRate = daysInActiveMonth > 0 ? forecastedKwh / daysInActiveMonth : 0;

    return {
      forecastedKwh,
      projectedRemainingKwh,
      forecastedBill,
      unloggedDaysCount,
      effectiveBurnRate: Number(effectiveBurnRate.toFixed(3)),
    };
  }, [mtdActuals, routineBaseline, daysInActiveMonth, simulatedGenRate, tariffType]);

  // 5. Data-Driven Scenarios Based on Actual System Capabilities
  const scenarios = useMemo(() => {
    // Sort appliances by consumption to find real top heavy energy hogs
    const sortedHogs = [...targetAppliances].sort((a, b) => {
      const aKwh = (a.watts * (a.hours_per_day || 0) * (a.quantity || 1));
      const bKwh = (b.watts * (b.hours_per_day || 0) * (b.quantity || 1));
      return bKwh - aKwh;
    });

    const topAppliance = sortedHogs[0] || null;
    const secondAppliance = sortedHogs[1] || null;

    // Smart Optimization Scenario: Kill vampire loads + reduce top 2 heavy devices by 1h/day
    const daysMultiplier = mtdActuals.hasLoggedRecords ? remainingDays : daysInActiveMonth;
    let smartSavingsDailyKwh = routineBaseline.dailyStandbyKwh * 0.85; // 85% vampire load reduction

    if (topAppliance) {
      smartSavingsDailyKwh += (topAppliance.watts * 1 * (topAppliance.quantity || 1)) / 1000;
    }
    if (secondAppliance) {
      smartSavingsDailyKwh += (secondAppliance.watts * 1 * (secondAppliance.quantity || 1)) / 1000;
    }

    const smartKwh = Math.max(10, trajectoryForecast.forecastedKwh - (smartSavingsDailyKwh * daysMultiplier));
    const smartBill = calculateMeralcoBill(smartKwh, simulatedGenRate, 0, false, tariffType).totalBill;
    const smartSavings = Math.max(0, trajectoryForecast.forecastedBill - smartBill);

    // Heavy Load Stress Scenario: What if top heavy device runs +2 hours/day
    let stressExtraDailyKwh = 0;
    if (topAppliance) {
      stressExtraDailyKwh += (topAppliance.watts * 2 * (topAppliance.quantity || 1)) / 1000;
    } else {
      stressExtraDailyKwh += 1.5;
    }

    const stressKwh = trajectoryForecast.forecastedKwh + (stressExtraDailyKwh * daysMultiplier);
    const stressBill = calculateMeralcoBill(stressKwh, simulatedGenRate, 0, false, tariffType).totalBill;
    const stressExtra = Math.max(0, stressBill - trajectoryForecast.forecastedBill);

    return {
      topAppliance,
      secondAppliance,
      smartKwh: Number(smartKwh.toFixed(1)),
      smartBill,
      smartSavings: Number(smartSavings.toFixed(2)),
      stressKwh: Number(stressKwh.toFixed(1)),
      stressBill,
      stressExtra: Number(stressExtra.toFixed(2)),
    };
  }, [targetAppliances, mtdActuals, remainingDays, daysInActiveMonth, routineBaseline, trajectoryForecast, simulatedGenRate, tariffType]);

  // 6. Interactive What-If Simulator Math
  const whatIfSimulation = useMemo(() => {
    let whatIfDailyKwh = 0;

    targetAppliances.forEach((app) => {
      const activeHours = whatIfHours[app.id] !== undefined ? whatIfHours[app.id] : (app.hours_per_day || 0);
      whatIfDailyKwh += calculateApplianceKwh(app, activeHours);
    });

    const daysMultiplier = mtdActuals.hasLoggedRecords ? remainingDays : daysInActiveMonth;
    const simulatedRemainingKwh = whatIfDailyKwh * daysMultiplier;
    const whatIfTotalKwh = Number(((mtdActuals.hasLoggedRecords ? mtdActuals.actualKwh : 0) + simulatedRemainingKwh).toFixed(3));
    const whatIfBill = calculateMeralcoBill(whatIfTotalKwh, simulatedGenRate, 0, false, tariffType).totalBill;
    const billDelta = whatIfBill - trajectoryForecast.forecastedBill;

    return {
      whatIfTotalKwh,
      whatIfBill,
      billDelta,
    };
  }, [targetAppliances, whatIfHours, mtdActuals, remainingDays, daysInActiveMonth, simulatedGenRate, tariffType, trajectoryForecast]);

  // Trajectory Curve Data: Cumulative Day-by-Day comparison (Baseline vs Simulated)
  const trajectoryCurveData = useMemo(() => {
    const points = [];
    const dailyBaseBill = routineBaseline.monthlyBaselineBill / Math.max(1, daysInActiveMonth);
    const dailySimulatedBill = scenarios.smartBill / Math.max(1, daysInActiveMonth);

    let cumBaselineCost = 0;
    let cumSimulatedCost = 0;

    for (let day = 1; day <= daysInActiveMonth; day++) {
      cumBaselineCost += dailyBaseBill;
      cumSimulatedCost += dailySimulatedBill;

      points.push({
        day: `D${day}`,
        dayNum: day,
        isPast: day <= elapsedDays,
        baselineCost: Math.round(cumBaselineCost),
        simulatedCost: Math.round(cumSimulatedCost),
        savingsDiff: Math.max(0, Math.round(cumBaselineCost - cumSimulatedCost)),
      });
    }

    return points;
  }, [daysInActiveMonth, elapsedDays, routineBaseline.monthlyBaselineBill, scenarios.smartBill]);

  // 7. Appliance Pareto Breakdown (Ranked by Forecasted Energy Share)
  const paretoBreakdown = useMemo(() => {
    return targetAppliances
      .map((app) => {
        const hours = app.hours_per_day || 0;
        const monthlyKwh = calculateApplianceKwh(app, hours) * daysInActiveMonth;
        const cost = calculateCost(monthlyKwh, DEFAULT_EFFECTIVE_RATE);
        const sharePercent = routineBaseline.monthlyBaselineKwh > 0 ? (monthlyKwh / routineBaseline.monthlyBaselineKwh) * 100 : 0;

        return {
          app,
          monthlyKwh: Number(monthlyKwh.toFixed(2)),
          cost: Number(cost.toFixed(2)),
          sharePercent: Math.min(100, Number(sharePercent.toFixed(1))),
        };
      })
      .sort((a, b) => b.monthlyKwh - a.monthlyKwh);
  }, [targetAppliances, daysInActiveMonth, routineBaseline]);

  const handleResetWhatIf = () => {
    setWhatIfHours({});
  };

  const handleWhatIfHourChange = (appId: string, hours: number) => {
    setWhatIfHours((prev) => ({
      ...prev,
      [appId]: Math.max(0, Math.min(24, Number(hours.toFixed(1)))),
    }));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3, md: 3.5 } }}>
      {/* 1. Header Banner */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2, pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1.5 }}>
            <AutoGraphIcon sx={{ color: "primary.main" }} />
            {t("fc.title", "Predictive Energy Forecasting")}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {t("fc.subtitle", "Data-driven Meralco bill projections based on actual logged days and your registered appliance routines.")}
          </Typography>
        </Box>
        <Chip
          icon={<BoltIcon sx={{ fontSize: "16px !important", color: "#00e5c9 !important" }} />}
          label={`Forecast Load: ${trajectoryForecast.forecastedKwh.toFixed(1)} kWh/mo`}
          variant="outlined"
          sx={{ fontWeight: 700, borderColor: "rgba(0, 229, 201, 0.4)", bgcolor: "rgba(0, 229, 201, 0.08)", color: "#00e5c9" }}
        />
      </Box>

      {/* 2. Space Selector Tabs (When spaces exist) */}
      {spaces.length > 0 && (
        <Box data-tour="forecasting-space-tabs">
          <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1, letterSpacing: "0.05em" }}>
            FORECAST SCOPE / TARGET SPACE
          </Typography>
          <Tabs
            value={selectedSpaceId}
            onChange={(_, val) => setSelectedSpaceId(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 40,
              "& .MuiTab-root": {
                minHeight: 40,
                borderRadius: 1,
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                mr: 1,
              },
            }}
          >
            <Tab value="all" label={language === "tl" ? `Lahat ng Espasyo (${spaces.length})` : `All Spaces Combined (${spaces.length})`} />
            {spaces.map((s) => (
              <Tab
                key={s.id}
                value={s.id}
                icon={s.tariff_type === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
                iconPosition="start"
                label={`${s.name} (${s.tariff_type === "commercial" ? "Commercial GP" : "Residential"})`}
              />
            ))}
          </Tabs>
        </Box>
      )}

      {/* 3. Zero Active Appliances Empty State */}
      {targetAppliances.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 4, sm: 6 },
            borderRadius: 1.5,
            textAlign: "center",
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.6)" : "background.paper"),
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          {blacklistedCount > 0 ? (
            <BlockIcon sx={{ fontSize: 52, color: "warning.main", opacity: 0.9 }} />
          ) : (
            <ElectricBoltIcon sx={{ fontSize: 52, color: "primary.light", opacity: 0.8 }} />
          )}
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {blacklistedCount > 0
              ? language === "tl"
                ? "Lahat ng Kagamitan ay Naka-Blacklist"
                : "All Appliances in this Space are Blacklisted"
              : language === "tl"
              ? "Walang Rehistradong Kagamitan"
              : "No Registered Appliances Found"}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 460 }}>
            {blacklistedCount > 0
              ? language === "tl"
                ? `Kasalukuyang may ${blacklistedCount} kagamitan na naka-blacklist at hindi kasama sa kalkulasyon ng prediksyon. I-unblock ang mga ito sa Sentro ng Kagamitan upang makita ang forecast.`
                : `You currently have ${blacklistedCount} appliance(s) blacklisted and excluded from forecasting calculations. Restore them in the Appliances Hub to generate a forecast.`
              : language === "tl"
              ? "Magrehistro ng iyong mga kagamitan sa bahay o negosyo sa Sentro ng Kagamitan para magsimulang makatanggap ng data-driven na prediksyon sa bill."
              : "Register your household or business appliances in the Appliances Hub to start receiving real-time data-driven energy forecasts and Meralco bill projections."}
          </Typography>
          <Button
            component={Link}
            to="/appliances"
            variant="contained"
            color={blacklistedCount > 0 ? "warning" : "primary"}
            startIcon={blacklistedCount > 0 ? <BlockIcon /> : <BoltIcon />}
            sx={{ borderRadius: 1, fontWeight: 800, px: 3, py: 1, mt: 1 }}
          >
            {language === "tl" ? "Pumunta sa Sentro ng Kagamitan" : "Go to Appliances Hub"}
          </Button>
        </Paper>
      ) : (
        <>
          {/* Blacklisted Appliances Exclusion Notice Banner */}
          {blacklistedCount > 0 && (
            <Paper
              variant="outlined"
              sx={{
                p: 1.75,
                mb: 2.5,
                borderRadius: 1.5,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.08)" : "rgba(245, 158, 11, 0.06)"),
                borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.3)" : "rgba(245, 158, 11, 0.25)"),
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <BlockIcon sx={{ color: "warning.main", fontSize: 22 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                    {blacklistedCount} appliance{blacklistedCount > 1 ? "s are" : " is"} currently blacklisted
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Excluded from routine baseline, energy hog ranking, what-if simulations, and month-end projected bill calculations.
                  </Typography>
                </Box>
              </Box>
              <Button
                component={Link}
                to="/appliances"
                size="small"
                variant="outlined"
                color="warning"
                sx={{ fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
              >
                Manage in Appliances Hub
              </Button>
            </Paper>
          )}

          {/* 4. Active Billing Cycle Run-Rate Telemetry Banner */}
          <Card
            data-tour="forecasting-hero-kpi"
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "#e2e8f0",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.78)" : "#ffffff",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <TimelineIcon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                  {t("fc.activeCycleTitle", "Active Billing Cycle Run-Rate Telemetry")}
                </Typography>
              </Box>
              <Chip
                label={`${mtdActuals.loggedDaysCount} Days In • ${remainingDays} Days Left`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                  color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0f766e"),
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
                }}
              />
            </Box>

            <Grid container spacing={2}>
              {/* MTD Actual */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    {language === "tl" ? "NAITALANG MTD" : "RECORDED MTD ACTUAL"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                      my: 0.5,
                    }}
                  >
                    {mtdActuals.actualKwh.toFixed(1)} <Typography component="span" variant="caption">kWh</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {mtdActuals.loggedDaysCount} {language === "tl" ? "araw na may log" : "days logged"} (₱{mtdActuals.actualCost.toFixed(2)})
                  </Typography>
                </Paper>
              </Grid>

              {/* Projected Remaining */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    {language === "tl" ? "TINATAYANG NATITIRA" : "PROJECTED REMAINING"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                      my: 0.5,
                    }}
                  >
                    {trajectoryForecast.projectedRemainingKwh.toFixed(1)} <Typography component="span" variant="caption">kWh</Typography>
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {remainingDays} {language === "tl" ? "natitirang araw sa cycle" : "days remaining in cycle"}
                  </Typography>
                </Paper>
              </Grid>

              {/* Composite Forecast */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                      fontWeight: 800,
                    }}
                  >
                    {language === "tl" ? "KABUUANG PREDIKSYON SA BILL" : "COMPOSITE FORECASTED BILL"}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 900,
                      fontFamily: "monospace",
                      color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                      my: 0.5,
                    }}
                  >
                    ₱{trajectoryForecast.forecastedBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {trajectoryForecast.forecastedKwh.toFixed(1)} kWh {language === "tl" ? "kabuuang buwan" : "month total"} ({trajectoryForecast.effectiveBurnRate} kWh/d)
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Card>

          {/* 4.5. Dual Trajectory Forecast: Baseline Path vs Simulated Plan */}
          <Card
            data-tour="forecasting-trajectory-chart"
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "#e2e8f0",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.78)" : "#ffffff",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                  <TimelineIcon sx={{ color: "primary.main" }} />
                  {language === "tl" ? "Tala ng Trajectory: Karaniwan vs Plano ng Simulasyon" : "Cumulative Trajectory: Baseline Trend vs Simulated Path"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {language === "tl"
                    ? "Tingnan ang takbo ng bill kada araw kung susundin ang karaniwang quota laban sa na-simulate na routine."
                    : "Track cumulative month-end bill run rate comparing baseline quota against your simulated routine schedule."}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 2, bgcolor: "#818cf8", borderTop: "2px dashed #818cf8" }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    Baseline Trend
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box sx={{ width: 12, height: 3, bgcolor: "#00e5c9", borderRadius: 1 }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                    Simulated Path
                  </Typography>
                </Box>
                <Chip
                  label={
                    scenarios.smartSavings > 0
                      ? `Net Savings: -₱${scenarios.smartSavings.toFixed(2)}`
                      : "Quota Matched"
                  }
                  size="small"
                  color="success"
                  sx={{ fontWeight: 800, fontSize: "0.72rem" }}
                />
              </Box>
            </Box>

            <Box sx={{ height: 240, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trajectoryCurveData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBaselineTraj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorSimulatedTraj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5c9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#00e5c9" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" ₱" />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 1.25,
                              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#17191d" : "background.paper"),
                              border: "1px solid",
                              borderColor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(13, 148, 136, 0.35)",
                              color: "text.primary",
                              boxShadow: (theme) =>
                                theme.palette.mode === "dark" ? "0 8px 32px rgba(0,0,0,0.6)" : "0 8px 24px rgba(0,0,0,0.12)",
                              minWidth: 200,
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 800, display: "block", mb: 0.5 }}>
                              {d.day} {d.isPast ? "• Past / Logged" : "• Forward Projection"}
                            </Typography>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                Baseline:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                                ₱{d.baselineCost}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                              <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
                                Simulated:
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "primary.main" }}>
                                ₱{d.simulatedCost}
                              </Typography>
                            </Box>
                            {d.savingsDiff > 0 && (
                              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mt: 0.5, pt: 0.5, borderTop: "1px solid", borderColor: "divider" }}>
                                <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700 }}>
                                  Savings Diff:
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "success.main" }}>
                                  -₱{d.savingsDiff}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="baselineCost" name="Baseline Quota" stroke="#818cf8" strokeDasharray="3 3" strokeWidth={2} fillOpacity={1} fill="url(#colorBaselineTraj)" />
                  <Area type="monotone" dataKey="simulatedCost" name="Simulated Plan" stroke="#00e5c9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSimulatedTraj)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Card>

          {/* 5. Meralco Rate Fluctuation Simulator */}
          <Card
            data-tour="forecasting-rate-slider"
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: 1.5,
              position: "relative",
              overflow: "hidden",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.18)" : "rgba(13, 148, 136, 0.18)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <TuneIcon sx={{ color: "primary.main" }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                    {t("fc.genVolatilityTitle", "Generation Rate Volatility Simulator")}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Simulated Generation Charge: ₱{simulatedGenRate.toFixed(4)}/kWh (Base Meralco ERC: ₱7.1246/kWh)
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={`${genRateDelta >= 0 ? "+" : ""}₱${genRateDelta.toFixed(2)}/kWh Shift`}
                color={genRateDelta > 0 ? "warning" : genRateDelta < 0 ? "success" : "primary"}
                sx={{ fontWeight: 800, fontSize: "0.85rem", px: 1 }}
              />
            </Box>

            <Box sx={{ px: { xs: 3.5, sm: 6, md: 7 }, pt: 1, pb: 2.5 }}>
              <Slider
                value={genRateDelta}
                min={-2.0}
                max={3.0}
                step={0.25}
                marks={[
                  { value: -2.0, label: "-₱2.00 (Refund)" },
                  { value: -1.0, label: "-₱1.00" },
                  { value: 0, label: "₱0.00 (Published)" },
                  { value: 1.5, label: "+₱1.50" },
                  { value: 3.0, label: "+₱3.00 (Spike)" },
                ]}
                onChange={(_, val) => setGenRateDelta(val as number)}
                sx={{
                  height: 8,
                  "& .MuiSlider-track": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                    borderColor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                  },
                  "& .MuiSlider-rail": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#242a35" : "#e2e8f0"),
                    opacity: 1,
                  },
                  "& .MuiSlider-thumb": {
                    width: 22,
                    height: 22,
                    bgcolor: "#ffffff",
                    border: (theme) =>
                      `3px solid ${theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"}`,
                    boxShadow: (theme) =>
                      theme.palette.mode === "dark"
                        ? "0 0 16px rgba(0, 229, 201, 0.7)"
                        : "0 0 14px rgba(13, 148, 136, 0.4)",
                    "&:hover, &.Mui-focusVisible": {
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 0 20px rgba(0, 229, 201, 0.9)"
                          : "0 0 18px rgba(13, 148, 136, 0.6)",
                    },
                  },
                  "& .MuiSlider-mark": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#384152" : "#cbd5e1"),
                    width: 3,
                    height: 8,
                  },
                  "& .MuiSlider-markActive": {
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                  },
                  "& .MuiSlider-markLabel": {
                    fontSize: { xs: "0.6875rem", sm: "0.75rem" },
                    fontWeight: 700,
                    color: "text.secondary",
                    mt: 1,
                  },
                  "& .MuiSlider-markLabel[data-index='0']": {
                    transform: { xs: "translateX(0%)", sm: "translateX(0%)" },
                    textAlign: "left",
                  },
                  "& .MuiSlider-markLabel[data-index='4']": {
                    transform: { xs: "translateX(-100%)", sm: "translateX(-100%)" },
                    textAlign: "right",
                  },
                }}
              />
            </Box>

            <Box sx={{ mt: 3, p: 2, borderRadius: 1.25, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)", border: "1px solid", borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.2)", display: "flex", alignItems: "center", gap: 2 }}>
              <InfoIcon sx={{ color: "primary.main", fontSize: 20, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5 }}>
                Generation costs are adjusted monthly per ERC guidelines to reflect fuel pass-through and WESM spot market rates. Your forecasted bill dynamically recalculates across all ERC unbundled brackets.
              </Typography>
            </Box>
          </Card>

          {/* 6. Four Data-Grounded Forecast Scenarios */}
          <Box data-tour="forecasting-scenarios">
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
              <ScienceIcon sx={{ color: "primary.main" }} />
              {t("fc.scenariosTitle", "Data-Driven Forecast Scenarios & Stress Tests")}
            </Typography>

            <Grid container spacing={{ xs: 2.5, sm: 3 }}>
              {/* Scenario 1: Actual Trajectory */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: "1px solid",
                    borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.3)"),
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.85)" : "#ffffff"),
                    boxShadow: (theme) => (theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)"),
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(0, 229, 201, 0.08)"
                          : "0 8px 24px rgba(13, 148, 136, 0.15)",
                    },
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "primary.light" : "primary.main", letterSpacing: 0.5 }}>
                        {t("fc.scenarioTrajectory", "CURRENT TRAJECTORY")}
                      </Typography>
                      <Chip label={language === "tl" ? "Tala + Karaniwan" : "Real Logs + Routine"} size="small" color="primary" sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "text.primary", mb: 0.5, fontFamily: "monospace" }}>
                      ₱{trajectoryForecast.forecastedBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {mtdActuals.hasLoggedRecords
                        ? `${mtdActuals.loggedDaysCount} ${language === "tl" ? "naitalang araw" : "logged days"} + ${remainingDays} ${language === "tl" ? "karaniwang araw" : "routine days"}`
                        : `Pure ${daysInActiveMonth}-day baseline`}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{language === "tl" ? "Kabuuang Enerhiya:" : "Total Energy:"}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                      {trajectoryForecast.forecastedKwh.toFixed(1)} kWh
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Scenario 2: Pure Routine Baseline */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: "1px solid",
                    borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0"),
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "#ffffff"),
                    boxShadow: (theme) => (theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)"),
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": { transform: "translateY(-3px)", boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35)" },
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: 0.5 }}>
                        {t("fc.scenarioBaseline", "ROUTINE BASELINE")}
                      </Typography>
                      <Chip label={language === "tl" ? "100% Karaniwang Oras" : "100% Habit Adherence"} size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "text.primary", mb: 0.5, fontFamily: "monospace" }}>
                      ₱{routineBaseline.monthlyBaselineBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl" ? "Kung 100% nasusunod ang rehistradong oras araw-araw" : "Assuming registered inventory daily hours are kept 100%"}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{language === "tl" ? "Karaniwang Load:" : "Standard Load:"}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                      {routineBaseline.monthlyBaselineKwh.toFixed(1)} kWh
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Scenario 3: Smart Energy Audit & Efficiency */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: "1px solid",
                    borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.3)" : "rgba(5, 150, 105, 0.3)"),
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 30, 28, 0.85)" : "#ffffff"),
                    boxShadow: (theme) => (theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)"),
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(52, 211, 153, 0.08)"
                          : "0 8px 24px rgba(52, 211, 153, 0.15)",
                    },
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "success.light" : "success.main", letterSpacing: 0.5 }}>
                        {t("fc.scenarioSmart", "SMART ENERGY AUDIT")}
                      </Typography>
                      <Chip icon={<LeafIcon sx={{ fontSize: "12px !important", color: "white !important" }} />} label={language === "tl" ? "Tipid Load" : "Save Load"} color="success" size="small" sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: (theme) => theme.palette.mode === "dark" ? "#34d399" : "#059669", mb: 0.5, fontFamily: "monospace" }}>
                      ₱{scenarios.smartBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? `Alisin ang standby + bawas 1h/day sa ${scenarios.topAppliance?.name || "top AC"}`
                        : `Kill vampire standby + reduce ${scenarios.topAppliance?.name || "top AC"} by 1h/day`}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid", borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.2)" : "#e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{language === "tl" ? "Buwanang Matitipid:" : "Monthly Savings:"}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "#34d399" : "#059669", fontFamily: "monospace" }}>
                      -₱{scenarios.smartSavings.toFixed(2)}
                    </Typography>
                  </Box>
                </Card>
              </Grid>

              {/* Scenario 4: Heavy Load Stress Test */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card
                  sx={{
                    p: 2.5,
                    borderRadius: 1.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: "1px solid",
                    borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.3)" : "rgba(217, 119, 6, 0.3)"),
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(30, 26, 22, 0.85)" : "#ffffff"),
                    boxShadow: (theme) => (theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)"),
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(251, 191, 36, 0.08)"
                          : "0 8px 24px rgba(217, 119, 6, 0.15)",
                    },
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "warning.light" : "warning.main", letterSpacing: 0.5 }}>
                        {t("fc.scenarioStress", "HEAVY LOAD STRESS")}
                      </Typography>
                      <Chip icon={<SunIcon sx={{ fontSize: "12px !important", color: "white !important" }} />} label={language === "tl" ? "Peligro sa Bill" : "Surge Risk"} color="warning" size="small" sx={{ fontWeight: 700, fontSize: "0.65rem", height: 20 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: (theme) => theme.palette.mode === "dark" ? "#fbbf24" : "#d97706", mb: 0.5, fontFamily: "monospace" }}>
                      ₱{scenarios.stressBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {language === "tl"
                        ? `Kung ang ${scenarios.topAppliance?.name || "top AC"} ay gagamitin ng +2h araw-araw`
                        : `If ${scenarios.topAppliance?.name || "top AC"} runs +2h daily for remaining days`}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2.5, pt: 1.5, borderTop: "1px solid", borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(251, 191, 36, 0.2)" : "#e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>{language === "tl" ? "Dagdag sa Bill:" : "Bill Increase:"}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "#fbbf24" : "#d97706", fontFamily: "monospace" }}>
                      +₱{scenarios.stressExtra.toFixed(2)}
                    </Typography>
                  </Box>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* 7. Interactive What-If Appliance Runtime Studio */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)"),
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff"),
              boxShadow: (theme) => (theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)"),
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1 }}>
                  <TuneIcon sx={{ color: "primary.main" }} />
                  {t("fc.whatIfTitle", 'Interactive "What-If" Appliance Studio')}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {t("fc.whatIfSubtitle", "Adjust operating hours on individual appliances to simulate instant month-end bill impacts")}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ResetIcon sx={{ fontSize: 16 }} />}
                  onClick={handleResetWhatIf}
                  sx={{ borderRadius: 1, fontSize: "0.75rem", fontWeight: 700 }}
                >
                  {t("fc.resetDefaults", "Reset Defaults")}
                </Button>
                <Chip
                  label={
                    whatIfSimulation.billDelta === 0
                      ? language === "tl" ? "Eksaktong Target (₱0.00)" : "Neutral Target (₱0.00)"
                      : whatIfSimulation.billDelta < 0
                      ? `${language === "tl" ? "Makakatipid ng" : "Saves"} ₱${Math.abs(whatIfSimulation.billDelta).toFixed(2)}/mo`
                      : `+₱${whatIfSimulation.billDelta.toFixed(2)}/mo ${language === "tl" ? "Dagdag" : "Increase"}`
                  }
                  color={whatIfSimulation.billDelta < 0 ? "success" : whatIfSimulation.billDelta > 0 ? "warning" : "default"}
                  sx={{ fontWeight: 900, fontSize: "0.8rem", px: 1 }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            <Grid container spacing={2}>
              {targetAppliances.map((app) => {
                const currentHours = whatIfHours[app.id] !== undefined ? whatIfHours[app.id] : (app.hours_per_day || 0);
                const defaultHours = app.hours_per_day || 0;
                const isModified = whatIfHours[app.id] !== undefined && whatIfHours[app.id] !== defaultHours;

                return (
                  <Grid key={app.id} size={{ xs: 12, md: 6 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 1.25,
                        bgcolor: isModified ? "rgba(0, 229, 201, 0.12)" : "rgba(255, 255, 255, 0.02)",
                        borderColor: isModified ? "primary.main" : "rgba(255, 255, 255, 0.08)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
                          <Typography noWrap variant="body2" sx={{ fontWeight: 800 }}>
                            {app.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            {app.category} • {app.watts}W {app.room_location ? `(${app.room_location})` : ""}
                          </Typography>
                        </Box>
                        <Chip
                          label={`${currentHours.toFixed(1)}h/day`}
                          size="small"
                          color={isModified ? "primary" : "default"}
                          variant={isModified ? "filled" : "outlined"}
                          sx={{ fontWeight: 800, fontSize: "0.75rem", fontFamily: "monospace" }}
                        />
                      </Box>

                      <Slider
                        value={currentHours}
                        min={0}
                        max={24}
                        step={0.5}
                        onChange={(_, val) => handleWhatIfHourChange(app.id, val as number)}
                        sx={{
                          my: 0.5,
                          "& .MuiSlider-thumb": { width: 16, height: 16 },
                        }}
                      />
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Card>

          {/* 8. Appliance Pareto Energy Contribution Breakdown */}
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.65)" : "#ffffff",
              boxShadow: (theme) =>
                theme.palette.mode === "dark" ? "none" : "0 2px 12px rgba(15, 23, 42, 0.04)",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", mb: 1 }}>
              {t("fc.paretoTitle", "Appliance Monthly Energy Share (Pareto Breakdown)")}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
              {t("fc.paretoSubtitle", "Ranked breakdown of which registered devices contribute the highest share of your monthly power consumption.")}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {paretoBreakdown.map(({ app, monthlyKwh, cost, sharePercent }, idx) => (
                <Paper
                  key={app.id}
                  variant="outlined"
                  sx={{
                    p: 1.75,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          bgcolor: (theme) =>
                            idx < 3
                              ? theme.palette.mode === "dark"
                                ? "primary.main"
                                : "#0d9488"
                              : theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.1)"
                              : "#e2e8f0",
                          color: (theme) =>
                            idx < 3
                              ? "#ffffff"
                              : theme.palette.mode === "dark"
                              ? "#ffffff"
                              : "#0f172a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 900,
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          {app.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {app.category} • {app.watts}W • {app.hours_per_day || 0}h/day routine
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 900,
                          fontFamily: "monospace",
                          color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                        }}
                      >
                        ₱{cost.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                        {monthlyKwh.toFixed(1)} kWh ({sharePercent}%)
                      </Typography>
                    </Box>
                  </Box>

                  <LinearProgress
                    variant="determinate"
                    value={sharePercent}
                    sx={{
                      height: 6,
                      borderRadius: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 1,
                        bgcolor: idx === 0 ? "#ef4444" : idx === 1 ? "#f59e0b" : "primary.main",
                      },
                    }}
                  />
                </Paper>
              ))}
            </Box>
          </Card>

          {/* 9. Advisory Insights Box */}
          <Paper
            data-tour="forecasting-advisory"
            sx={{
              p: 3,
              borderRadius: 1.5,
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: 2.5,
            }}
          >
            <Box sx={{ p: 1.5, borderRadius: 1, bgcolor: "rgba(0, 229, 201, 0.15)", color: "primary.main", flexShrink: 0 }}>
              <ShieldIcon sx={{ fontSize: 28 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                ERC & Meralco Monthly Tariff Pass-Through Advisory
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block", lineHeight: 1.6 }}>
                In the Philippines, the generation charge is an automatic pass-through cost adjusted every billing cycle based on fuel costs (coal, natural gas) and WESM spot market rates. Meralco distributes electricity but does not profit from the generation charge. During hot dry months, higher grid demand pushes generation rates upward.
              </Typography>
            </Box>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default ForecastingView;
