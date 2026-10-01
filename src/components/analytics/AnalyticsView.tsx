import React, { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import LinearProgress from "@mui/material/LinearProgress";
import TooltipMui from "@mui/material/Tooltip";
import ButtonGroup from "@mui/material/ButtonGroup";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import {
  BarChart as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  Bolt as BoltIcon,
  EnergySavingsLeaf as LeafIcon,
  Lightbulb as LightbulbIcon,
  Download as DownloadIcon,
  PieChart as PieChartIcon,
  ReceiptLong as ReceiptIcon,
  PowerSettingsNew as StandbyIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Category as CategoryIcon,
  FormatListBulleted as ListIcon,
  ElectricMeter as MeterIcon,
  FileDownload as FileDownloadIcon,
  AutoAwesome as SparklesIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { UserAppliance, ApplianceList, UserCalendarEvent, DailyApplianceUsage } from "../../types";
import { useList } from "@refinedev/core";
import { computeHourlyLoadCurve } from "../../lib/loadCurveService";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { MetricCard } from "../common/MetricCard";

export const AnalyticsView: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("all");
  const [zoomPreset, setZoomPreset] = useState<"24h" | "morning" | "day" | "evening">("24h");
  const [breakdownView, setBreakdownView] = useState<"category" | "appliances">("category");
  const [resolutionMinutes] = useState<1 | 5 | 15 | 30>(5);

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const eventsRes = useList<UserCalendarEvent>({
    resource: "user_calendar_events",
    pagination: { mode: "off" },
  }) as any;

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    pagination: { mode: "off" },
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];
  const events: UserCalendarEvent[] = eventsRes?.data?.data || eventsRes?.result?.data || [];
  const dailyUsageRecords: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];

  // Filter target appliances based on active space selection (excluding blacklisted appliances)
  const targetAppliances = useMemo(() => {
    const list =
      selectedSpaceId === "all"
        ? appliances
        : appliances.filter(
            (a) => a.list_id === selectedSpaceId || (!a.list_id && spaces.find((s) => s.id === selectedSpaceId)?.is_default)
          );
    return list.filter((a) => a.is_active !== false);
  }, [appliances, spaces, selectedSpaceId]);

  const activeSpace = spaces.find((s) => s.id === selectedSpaceId);
  const isCommercialSelected = selectedSpaceId !== "all" && activeSpace?.tariff_type === "commercial";
  const tariffType: "residential" | "commercial" = isCommercialSelected ? "commercial" : "residential";

  // Appliance monthly kWh helper
  const getApplianceMonthlyKwh = (a: UserAppliance): number => {
    if (a.monthly_kwh !== undefined && a.monthly_kwh !== null && a.monthly_kwh > 0) {
      return Number(a.monthly_kwh);
    }
    const hours = Number(a.hours_per_day) || 0;
    const days = Number(a.days_per_month) || 30;
    const qty = Number(a.quantity) || 1;
    const watts = Number(a.watts) || 0;
    return (watts * hours * days * qty) / 1000;
  };

  // 1. Calculate space-by-space and consolidated monthly energy (strictly active appliances)
  const spaceAnalytics = useMemo(() => {
    let resTotalKwh = 0;
    let resTotalBill = 0;
    let comTotalKwh = 0;
    let comTotalBill = 0;

    const breakdownBySpace = spaces.map((space) => {
      const spaceApps = appliances.filter(
        (a) => (a.list_id === space.id || (!a.list_id && space.is_default)) && a.is_active !== false
      );
      const kwh = spaceApps.reduce((acc, curr) => acc + getApplianceMonthlyKwh(curr), 0);
      const billResult = calculateMeralcoBill(kwh, undefined, 0, false, space.tariff_type);

      if (space.tariff_type === "commercial") {
        comTotalKwh += kwh;
        comTotalBill += billResult.totalBill;
      } else {
        resTotalKwh += kwh;
        resTotalBill += billResult.totalBill;
      }

      return {
        space,
        kwh: Math.round(kwh * 10) / 10,
        bill: billResult.totalBill,
        devicesCount: spaceApps.length,
      };
    });

    const consolidatedTotalBill = breakdownBySpace.reduce((acc, curr) => acc + curr.bill, 0);
    const consolidatedTotalKwh = resTotalKwh + comTotalKwh;

    return {
      breakdownBySpace,
      consolidatedTotalBill,
      consolidatedTotalKwh,
      resTotalBill,
      comTotalBill,
      resTotalKwh,
      comTotalKwh,
    };
  }, [appliances, spaces]);

  // Target monthly kWh & Bill
  const totalMonthlyKwh = useMemo(() => {
    if (selectedSpaceId === "all") {
      return spaceAnalytics.consolidatedTotalKwh;
    }
    return targetAppliances.reduce((acc, curr) => acc + getApplianceMonthlyKwh(curr), 0);
  }, [selectedSpaceId, spaceAnalytics, targetAppliances]);

  const bill = useMemo(() => {
    if (selectedSpaceId === "all") {
      // Calculate consolidated unbundled bill
      return calculateMeralcoBill(totalMonthlyKwh, undefined, 0, false, "residential");
    }
    return calculateMeralcoBill(totalMonthlyKwh, undefined, 0, false, tariffType);
  }, [selectedSpaceId, totalMonthlyKwh, tariffType]);

  const totalCost = selectedSpaceId === "all" ? spaceAnalytics.consolidatedTotalBill : bill.totalBill;
  const effectiveRate = totalMonthlyKwh > 0 ? totalCost / totalMonthlyKwh : bill.effectiveRatePerKwh || 14.8261;

  // Running appliances count
  const runningAppliances = targetAppliances.filter((a) => a.is_currently_on);

  // Distribution Tier detection
  const distributionTierInfo = useMemo(() => {
    if (tariffType === "commercial") {
      return { tier: "Commercial GP", label: "Flat ₱1.652/kWh", color: "info.main" };
    }
    if (totalMonthlyKwh <= 0) {
      return { tier: "No Active Load", label: "0 kWh configured", color: "text.secondary" };
    }
    if (totalMonthlyKwh <= 100) {
      return { tier: "Lifeline Tier", label: "≤100 kWh (Subsidized)", color: "success.main" };
    }
    if (totalMonthlyKwh <= 200) {
      return { tier: "Tier 1 (0-200)", label: "Base ₱0.9803/kWh", color: "primary.main" };
    }
    if (totalMonthlyKwh <= 300) {
      return { tier: "Tier 2 (201-300)", label: "Dist. ₱1.2908/kWh", color: "info.main" };
    }
    if (totalMonthlyKwh <= 400) {
      return { tier: "Tier 3 (301-400)", label: "Dist. ₱1.5837/kWh", color: "warning.main" };
    }
    return { tier: "Tier 4 (401+)", label: "Peak Dist. ₱2.0941/kWh", color: "error.main" };
  }, [totalMonthlyKwh, tariffType]);

  // DOE PELP & Energy Efficiency Ratio
  const efficiencyMetrics = useMemo(() => {
    if (targetAppliances.length === 0) {
      return { efficiencyPct: 100, inverterCount: 0, totalCount: 0, grade: "A+" };
    }
    const inverterOrPelpCount = targetAppliances.filter((a) => {
      const name = (a.name || "").toLowerCase();
      const cat = (a.category || "").toLowerCase();
      const rating = (a.energy_rating || "").toLowerCase();
      const source = a.source || "";
      return (
        name.includes("inverter") ||
        cat.includes("inverter") ||
        rating.includes("star") ||
        rating.includes("5") ||
        rating.includes("4") ||
        source === "pelp_db"
      );
    }).length;

    const efficiencyPct = Math.round((inverterOrPelpCount / targetAppliances.length) * 100);
    let grade = "B";
    if (efficiencyPct >= 80) grade = "A+";
    else if (efficiencyPct >= 60) grade = "A";
    else if (efficiencyPct >= 40) grade = "B";
    else grade = "C";

    return {
      efficiencyPct,
      inverterCount: inverterOrPelpCount,
      totalCount: targetAppliances.length,
      grade,
    };
  }, [targetAppliances]);

  // Standby & Vampire Load calculation
  const vampireLoadMetrics = useMemo(() => {
    let standbyWattsTotal = 0;
    let vampireDevicesCount = 0;

    targetAppliances.forEach((a) => {
      const cat = (a.category || "").toLowerCase();
      const name = (a.name || "").toLowerCase();
      const qty = a.quantity || 1;

      let standbyPerUnit = 0;
      if (cat.includes("tv") || cat.includes("television") || cat.includes("audio") || name.includes("tv")) {
        standbyPerUnit = 5;
      } else if (cat.includes("kitchen") || name.includes("microwave") || name.includes("coffee")) {
        standbyPerUnit = 3;
      } else if (cat.includes("computer") || name.includes("pc") || name.includes("laptop")) {
        standbyPerUnit = 8;
      } else if (name.includes("charger") || name.includes("adapter") || cat.includes("electronic")) {
        standbyPerUnit = 2;
      }

      if (standbyPerUnit > 0) {
        const idleHours = Math.max(0, 24 - (Number(a.hours_per_day) || 4));
        standbyWattsTotal += (standbyPerUnit * qty * idleHours) / 24;
        vampireDevicesCount += qty;
      }
    });

    const standbyMonthlyKwh = (standbyWattsTotal * 24 * 30) / 1000;
    const standbyMonthlyCost = standbyMonthlyKwh * effectiveRate;

    return {
      standbyWattsTotal: Math.round(standbyWattsTotal),
      standbyMonthlyKwh: Math.round(standbyMonthlyKwh * 10) / 10,
      standbyMonthlyCost: Math.round(standbyMonthlyCost * 100) / 100,
      vampireDevicesCount,
    };
  }, [targetAppliances, effectiveRate]);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const catMap: Record<string, { kwh: number; count: number }> = {};
    targetAppliances.forEach((a) => {
      const cat = a.category || "General";
      const kwh = getApplianceMonthlyKwh(a);
      if (!catMap[cat]) catMap[cat] = { kwh: 0, count: 0 };
      catMap[cat].kwh += kwh;
      catMap[cat].count += a.quantity || 1;
    });

    const totalKwh = Object.values(catMap).reduce((acc, curr) => acc + curr.kwh, 0) || 1;
    return Object.entries(catMap)
      .map(([category, data]) => ({
        name: category,
        kwh: data.kwh,
        cost: data.kwh * effectiveRate,
        percentage: Math.round((data.kwh / totalKwh) * 100),
        count: data.count,
      }))
      .sort((a, b) => b.kwh - a.kwh);
  }, [targetAppliances, effectiveRate]);

  // Individual Top Appliances Breakdown (Pareto)
  const topAppliancesBreakdown = useMemo(() => {
    const totalKwh = totalMonthlyKwh || 1;
    return [...targetAppliances]
      .map((a) => {
        const kwh = getApplianceMonthlyKwh(a);
        return {
          id: a.id,
          name: a.name,
          category: a.category,
          watts: a.watts,
          quantity: a.quantity || 1,
          hours: a.hours_per_day,
          kwh: kwh,
          cost: kwh * effectiveRate,
          percentage: Math.round((kwh / totalKwh) * 100),
          isCurrentlyOn: a.is_currently_on,
        };
      })
      .sort((a, b) => b.kwh - a.kwh);
  }, [targetAppliances, totalMonthlyKwh, effectiveRate]);

  // Unbundled Rate Components breakdown
  const rateComponents = useMemo(() => {
    return [
      { name: "Generation Charge", amount: bill.generationTotal, color: "#00e5c9", desc: "Cost of producing electricity by generation power plants" },
      { name: "Transmission Charge", amount: bill.transmissionTotal, color: "#26c6da", desc: "High-voltage transmission grid wheeling fee (NGCP)" },
      { name: "System Loss Charge", amount: bill.systemLossTotal, color: "#38bdf8", desc: "Technical & non-technical line losses allowed by ERC" },
      { name: "Distribution Network", amount: bill.distributionTotal, color: "#009e88", desc: "Meralco poles, wires, meters, customer billing & supply" },
      { name: "Government Taxes & VAT", amount: bill.totalVat + bill.localFranchiseTax, color: "#fbbf24", desc: "12% National Value Added Tax & Local Franchise Tax" },
      { name: "Universal & FIT-All Charges", amount: bill.universalCharges.total + bill.fitAll + bill.lifelineSubsidy, color: "#8b949e", desc: "Missionary electrification, stranded debts, and RE Feed-in Tariff" },
    ];
  }, [bill]);

  // Load curve zoom parameters
  let startHour = 0;
  let endHour = 24;
  if (zoomPreset === "morning") {
    startHour = 0;
    endHour = 8;
  } else if (zoomPreset === "day") {
    startHour = 8;
    endHour = 16;
  } else if (zoomPreset === "evening") {
    startHour = 16;
    endHour = 24;
  }

  const HOURLY_LOAD_DATA = useMemo(() => {
    const simulatedCurve = computeHourlyLoadCurve({
      appliances: targetAppliances,
      events,
      resolutionMinutes,
      startHour,
      endHour,
      effectiveRate,
    });

    const baselineCurve = computeHourlyLoadCurve({
      appliances: targetAppliances,
      events: [],
      resolutionMinutes,
      startHour,
      endHour,
      effectiveRate,
    });

    return simulatedCurve.map((pt, idx) => {
      const basePt = baselineCurve[idx];
      const baselineWatts = basePt ? basePt.watts : pt.watts;
      return {
        ...pt,
        baselineWatts,
        simulatedWatts: pt.watts,
      };
    });
  }, [targetAppliances, events, resolutionMinutes, startHour, endHour, effectiveRate]);

  // Pure Appliance Baseline Multi-Month Trend & Predictions (No fake past months, No weather multipliers)
  const MONTHLY_TREND_DATA = useMemo(() => {
    const points = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();
    const currentDay = now.getDate();
    const daysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // 1. Group daily_appliance_usage records by YYYY-MM
    const usageByMonthKey: Record<string, { kwh: number; cost: number; daysCount: number }> = {};
    dailyUsageRecords.forEach((r) => {
      if (!r.usage_date) return;
      const monthKey = r.usage_date.substring(0, 7);
      if (!usageByMonthKey[monthKey]) {
        usageByMonthKey[monthKey] = { kwh: 0, cost: 0, daysCount: 0 };
      }
      usageByMonthKey[monthKey].kwh += Number(r.kwh_consumed) || 0;
      usageByMonthKey[monthKey].cost += Number(r.estimated_cost) || 0;
      usageByMonthKey[monthKey].daysCount += 1;
    });

    // 2. Prior Months (Past 6 Months)
    for (let offset = 6; offset >= 1; offset--) {
      const targetDate = new Date(currentYear, currentMonthIdx - offset, 1);
      const tYear = targetDate.getFullYear();
      const tMonthIdx = targetDate.getMonth();
      const monthKey = `${tYear}-${String(tMonthIdx + 1).padStart(2, "0")}`;
      const monthStr = monthNames[tMonthIdx];

      const recorded = usageByMonthKey[monthKey];
      if (recorded && recorded.kwh > 0) {
        points.push({
          month: monthStr,
          kwh: Math.round(recorded.kwh),
          cost: Math.round(recorded.cost),
          status: "Recorded Actuals",
          type: "recorded",
          fillColor: isDark ? "#009e88" : "#0d9488",
        });
      }
    }

    // 3. Current Active Month (e.g., Aug)
    const currentMonthKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, "0")}`;
    const currentRecorded = usageByMonthKey[currentMonthKey];
    const mtdKwh = currentRecorded && currentRecorded.kwh > 0
      ? currentRecorded.kwh
      : totalMonthlyKwh * (currentDay / daysInCurrentMonth);
    const remainingKwh = totalMonthlyKwh * ((daysInCurrentMonth - currentDay) / daysInCurrentMonth);
    const totalActiveKwh = mtdKwh + remainingKwh;
    const totalActiveCost = totalActiveKwh * effectiveRate;

    points.push({
      month: `${monthNames[currentMonthIdx]} (Active)`,
      kwh: Math.round(totalActiveKwh),
      cost: Math.round(totalActiveCost),
      status: `Active Cycle • Day ${currentDay} of ${daysInCurrentMonth} (MTD + Projected)`,
      type: "active",
      fillColor: isDark ? "#00e5c9" : "#14b8a6",
    });

    // 4. Future Months (Next 5 Months): Pure Baseline Prediction from registered appliance routines
    for (let offset = 1; offset <= 5; offset++) {
      const targetDate = new Date(currentYear, currentMonthIdx + offset, 1);
      const tMonthIdx = targetDate.getMonth();
      const monthStr = monthNames[tMonthIdx];

      points.push({
        month: `${monthStr} (Predicted)`,
        kwh: Math.round(totalMonthlyKwh),
        cost: Math.round(totalCost),
        status: "Predicted Cycle • Based on active appliance baseline routine",
        type: "predicted",
        fillColor: isDark ? "#2a2f38" : "#cbd5e1",
      });
    }

    return points;
  }, [dailyUsageRecords, totalMonthlyKwh, totalCost, effectiveRate, isDark]);

  // AI Energy Insights & Actionable Recommendations
  const actionableInsights = useMemo(() => {
    const list = [];

    // 1. Air Conditioning Check
    const acApps = targetAppliances.filter(
      (a) => (a.category || "").toLowerCase().includes("air") || (a.name || "").toLowerCase().includes("ac")
    );
    const acKwh = acApps.reduce((acc, a) => acc + getApplianceMonthlyKwh(a), 0);
    if (acApps.length > 0 && totalMonthlyKwh > 0) {
      const acPct = Math.round((acKwh / totalMonthlyKwh) * 100);
      const acCost = acKwh * effectiveRate;
      const thermostatSaving = acCost * 0.15; // 15% savings setting thermostat to 25°C
      list.push({
        id: "cooling",
        title: `Cooling accounts for ${acPct}% of your electricity`,
        description: `Air conditioning consumes ~${acKwh.toFixed(0)} kWh (₱${acCost.toFixed(2)}/mo). Setting your thermostat to 25°C and cleaning filters monthly can save up to ₱${thermostatSaving.toFixed(2)}/mo.`,
        saving: `Save ~₱${thermostatSaving.toFixed(0)}/mo`,
        badgeColor: "warning",
      });
    }

    // 2. Peak Hours Shifting (Meralco 11 AM - 4 PM & 6 PM - 9 PM)
    const heavyLoads = targetAppliances.filter((a) => {
      const cat = (a.category || "").toLowerCase();
      const watts = a.watts * (a.quantity || 1);
      return cat.includes("wash") || cat.includes("laundry") || cat.includes("iron") || cat.includes("heater") || watts >= 1000;
    });
    if (heavyLoads.length > 0) {
      list.push({
        id: "peak_shift",
        title: "Shift heavy loads to Off-Peak hours",
        description: `High-wattage devices (${heavyLoads.map((h) => h.name).slice(0, 2).join(", ")}) should be operated during off-peak windows (before 11:00 AM or after 9:00 PM) to avoid grid strain and maximize system efficiency.`,
        saving: "Peak Load Optimization",
        badgeColor: "info",
      });
    }

    // 3. Standby / Vampire Load
    if (vampireLoadMetrics.standbyMonthlyCost > 40) {
      list.push({
        id: "vampire",
        title: `Standby vampire loads cost ~₱${vampireLoadMetrics.standbyMonthlyCost.toFixed(2)}/month`,
        description: `${vampireLoadMetrics.vampireDevicesCount} idle electronics draw continuous standby power. Using master switch power strips can eliminate this cost completely.`,
        saving: `Save ~₱${vampireLoadMetrics.standbyMonthlyCost.toFixed(0)}/mo`,
        badgeColor: "success",
      });
    }

    // 4. Inverter Upgrade Advice
    const nonInverters = targetAppliances.filter((a) => {
      const name = (a.name || "").toLowerCase();
      const cat = (a.category || "").toLowerCase();
      return (cat.includes("air") || cat.includes("ref")) && !name.includes("inverter");
    });
    if (nonInverters.length > 0) {
      const nonInverterKwh = nonInverters.reduce((acc, a) => acc + getApplianceMonthlyKwh(a), 0);
      const upgradeSavings = nonInverterKwh * 0.35 * effectiveRate;
      list.push({
        id: "inverter",
        title: "Inverter upgrade potential for legacy cooling",
        description: `You have ${nonInverters.length} non-inverter appliance(s) (${nonInverters.map((n) => n.name).slice(0, 2).join(", ")}). Upgrading to DOE PELP certified inverter units can reduce their power draw by up to 35%.`,
        saving: `Save ~₱${upgradeSavings.toFixed(0)}/mo`,
        badgeColor: "primary",
      });
    }

    return list;
  }, [targetAppliances, totalMonthlyKwh, effectiveRate, vampireLoadMetrics]);

  // Export CSV handler
  const handleExportCsv = () => {
    let csv = `PowerForecast Energy Analytics Report\n`;
    csv += `Generated Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`;
    csv += `Scope: ${selectedSpaceId === "all" ? "All Spaces (Consolidated)" : activeSpace?.name || "Selected Space"}\n`;
    csv += `Tariff Type: ${tariffType.toUpperCase()}\n`;
    csv += `Total Monthly kWh: ${totalMonthlyKwh.toFixed(2)} kWh\n`;
    csv += `Forecasted Bill: PHP ${totalCost.toFixed(2)}\n`;
    csv += `Effective Rate: PHP ${effectiveRate.toFixed(4)} / kWh\n\n`;

    csv += `--- APPLIANCE INVENTORY BREAKDOWN ---\n`;
    csv += `Appliance Name,Category,Rated Watts,Qty,Hours/Day,Monthly kWh,Monthly Cost (PHP)\n`;
    topAppliancesBreakdown.forEach((a) => {
      csv += `"${a.name}","${a.category}",${a.watts},${a.quantity},${a.hours},${a.kwh.toFixed(2)},${a.cost.toFixed(2)}\n`;
    });

    csv += `\n--- CATEGORY BREAKDOWN ---\n`;
    csv += `Category,Devices Count,Monthly kWh,Cost (PHP),Percentage Share\n`;
    categoryBreakdown.forEach((c) => {
      csv += `"${c.name}",${c.count},${c.kwh.toFixed(2)},${c.cost.toFixed(2)},${c.percentage}%\n`;
    });

    csv += `\n--- ERC UNBUNDLED TARIFF CHARGES ---\n`;
    csv += `Charge Component,Amount (PHP),Share of Bill\n`;
    rateComponents.forEach((r) => {
      const pct = totalCost > 0 ? ((r.amount / totalCost) * 100).toFixed(1) : "0.0";
      csv += `"${r.name}",${r.amount.toFixed(2)},${pct}%\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PowerForecast_Analytics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3, md: 3.5 } }}>
      {/* 1. Header Banner & Action Buttons */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <AnalyticsIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Energy Analytics & Cost Distribution
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Telemetry breakdown, DOE PELP inventory efficiency, ERC unbundled cost allocation, and diurnal load profiles.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleExportCsv}
            startIcon={<FileDownloadIcon />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => window.print()}
            startIcon={<DownloadIcon />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Print Report
          </Button>
        </Box>
      </Box>

      {/* 2. Space Filter Tabs */}
      <Paper
        elevation={0}
        sx={{
          p: 0.75,
          borderRadius: 3,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          overflowX: "auto",
        }}
      >
        <Tabs
          value={selectedSpaceId}
          onChange={(_, val) => setSelectedSpaceId(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              minHeight: 40,
              fontWeight: 700,
              fontSize: "0.85rem",
              textTransform: "none",
              borderRadius: 2,
              px: 2,
            },
          }}
        >
          <Tab
            value="all"
            icon={<AnalyticsIcon fontSize="small" />}
            iconPosition="start"
            label={`All Spaces (${appliances.length} devices)`}
          />
          {spaces.map((space) => {
            const count = appliances.filter((a) => a.list_id === space.id || (!a.list_id && space.is_default)).length;
            const isCommercial = space.tariff_type === "commercial";
            return (
              <Tab
                key={space.id}
                value={space.id}
                icon={isCommercial ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
                iconPosition="start"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{space.name}</span>
                    <Chip
                      label={isCommercial ? "Commercial" : "Residential"}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: "0.68rem",
                        fontWeight: 800,
                        bgcolor: isCommercial ? "rgba(245, 158, 11, 0.15)" : "rgba(0, 229, 201, 0.15)",
                        color: isCommercial ? "secondary.main" : "primary.main",
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      ({count})
                    </Typography>
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* 3. KPI Metrics Cards */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }}>
        {/* Monthly Volume */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Monthly Energy Volume"
            value={`${totalMonthlyKwh.toFixed(1)} kWh`}
            subtitle={`${targetAppliances.length} appliances • ${runningAppliances.length} live ON`}
            icon={<BoltIcon sx={{ color: "#ffd54f" }} />}
            trend={{
              value: distributionTierInfo.tier,
              direction: distributionTierInfo.tier.includes("Lifeline") ? "up" : "neutral",
              label: distributionTierInfo.label,
            }}
          />
        </Grid>

        {/* Forecasted Bill */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="Forecasted Monthly Bill"
            value={`₱${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={`Effective: ₱${effectiveRate.toFixed(2)}/kWh`}
            icon={<TrendingUpIcon sx={{ color: "primary.light" }} />}
            trend={{
              value: `₱${(totalCost / 30).toFixed(0)}/day`,
              direction: "neutral",
              label: isCommercialSelected ? "Commercial GP" : "Meralco Unbundled",
            }}
          />
        </Grid>

        {/* DOE PELP Efficiency */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title="DOE PELP & Inverter Rating"
            value={`${efficiencyMetrics.efficiencyPct}%`}
            subtitle={`${efficiencyMetrics.inverterCount} of ${efficiencyMetrics.totalCount} certified efficient`}
            icon={<LeafIcon sx={{ color: "success.main" }} />}
            trend={{
              value: `Grade ${efficiencyMetrics.grade}`,
              direction: efficiencyMetrics.grade.includes("A") ? "up" : "neutral",
              label: "Inverter ratio",
            }}
          />
        </Grid>

        {/* Standby & Vampire Load */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }} data-tour="analytics-vampire-load">
          <MetricCard
            title="Standby Vampire Loss"
            value={`₱${vampireLoadMetrics.standbyMonthlyCost.toFixed(2)}`}
            subtitle={`~${vampireLoadMetrics.standbyMonthlyKwh} kWh/mo (${vampireLoadMetrics.standbyWattsTotal}W idle)`}
            icon={<StandbyIcon sx={{ color: "warning.main" }} />}
            trend={{
              value: `${vampireLoadMetrics.vampireDevicesCount} Devices`,
              direction: "down",
              label: "Potential cutoff savings",
            }}
          />
        </Grid>
      </Grid>

      {/* 4. Grouped Category / Pareto Ranking & Unbundled Cost Distribution */}
      <Grid container spacing={{ xs: 2.5, sm: 3 }}>
        {/* Left: Appliance Category Share & Top Consumers (Pareto) */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            data-tour="analytics-category-bars"
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 2.5,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <PieChartIcon sx={{ color: "primary.main" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                  {breakdownView === "category" ? "Energy Usage by Category" : "Top Consuming Appliances (Pareto)"}
                </Typography>
              </Box>

              <ButtonGroup size="small" variant="outlined">
                <Button
                  variant={breakdownView === "category" ? "contained" : "outlined"}
                  onClick={() => setBreakdownView("category")}
                  startIcon={<CategoryIcon />}
                  sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                >
                  Categories
                </Button>
                <Button
                  variant={breakdownView === "appliances" ? "contained" : "outlined"}
                  onClick={() => setBreakdownView("appliances")}
                  startIcon={<ListIcon />}
                  sx={{ fontWeight: 700, fontSize: "0.75rem" }}
                >
                  Top Devices
                </Button>
              </ButtonGroup>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, justifyContent: "center" }}>
              {targetAppliances.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  No appliances registered in this space. Add appliances to inspect category shares.
                </Typography>
              ) : breakdownView === "category" ? (
                categoryBreakdown.map((item) => (
                  <Box key={item.name} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                        {item.name} ({item.count} unit{item.count > 1 ? "s" : ""})
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        {item.kwh.toFixed(1)} kWh ({item.percentage}%) •{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                            fontFamily: "monospace",
                            fontWeight: 800,
                          }}
                        >
                          ₱{item.cost.toFixed(2)}
                        </Typography>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.1)" : "rgba(13, 148, 136, 0.1)",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 1,
                          background: "linear-gradient(90deg, #00e5c9, #26c6da)",
                        },
                      }}
                    />
                  </Box>
                ))
              ) : (
                topAppliancesBreakdown.slice(0, 6).map((app) => (
                  <Box key={app.id} sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "text.primary" }}>
                          {app.name}
                        </Typography>
                        {app.isCurrentlyOn && (
                          <Chip label="LIVE ON" size="small" color="success" sx={{ height: 16, fontSize: "0.6rem", fontWeight: 800 }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>
                        {app.kwh.toFixed(1)} kWh ({app.percentage}%) •{" "}
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{
                            color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                            fontFamily: "monospace",
                            fontWeight: 800,
                          }}
                        >
                          ₱{app.cost.toFixed(2)}
                        </Typography>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={app.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 1,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 1,
                          background: "linear-gradient(90deg, #00e5c9, #26c6da)",
                        },
                      }}
                    />
                  </Box>
                ))
              )}
            </Box>
          </Card>
        </Grid>

        {/* Right: Unbundled Rate Component Distribution */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card
            sx={{
              p: { xs: 2.5, sm: 3 },
              borderRadius: 1.5,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                Unbundled Tariff Split
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                ERC regulated breakdown of your projected monthly bill
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
              {rateComponents.map((c) => (
                <Box key={c.name} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: c.color }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                      {c.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                    ₱{c.amount.toFixed(2)}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Total Projected Bill
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#00e5c9" }}>
                ₱{totalCost.toFixed(2)}
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* 5. 24-Hour Load Curve Simulation */}
      <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              24-Hour Daily Load Curve Simulation
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Appliance hourly draw and peak pricing stress test
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mr: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 12, height: 2, bgcolor: "#818cf8", borderTop: "2px dashed #818cf8" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                  Baseline Quota
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 12, height: 3, bgcolor: "#00e5c9", borderRadius: 1 }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                  Simulated Plan
                </Typography>
              </Box>
            </Box>

            <ButtonGroup size="small" variant="outlined">
              {[
                { label: "All 24h", val: "24h" },
                { label: "Morning", val: "morning" },
                { label: "Daytime", val: "day" },
                { label: "Night", val: "evening" },
              ].map((b) => (
                <Button
                  key={b.val}
                  variant={zoomPreset === b.val ? "contained" : "outlined"}
                  onClick={() => setZoomPreset(b.val as any)}
                  sx={{ fontWeight: 700 }}
                >
                  {b.label}
                </Button>
              ))}
            </ButtonGroup>
          </Box>
        </Box>

        <Box sx={{ height: 280, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HOURLY_LOAD_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBaselineLoad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorLoadCurve" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5c9" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#00e5c9" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" W" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const diff = (d.baselineWatts || 0) - (d.simulatedWatts || 0);
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
                          maxWidth: 280,
                        }}
                      >
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5, gap: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800 }}>
                            {d.timeLabel}
                          </Typography>
                          {d.isPeak && (
                            <Chip label="PEAK HOUR" size="small" color="error" sx={{ height: 16, fontSize: "0.6rem", fontWeight: 800 }} />
                          )}
                        </Box>
                        
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", my: 0.5 }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                            Baseline: {d.baselineWatts ?? d.watts} W
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: "primary.main", fontWeight: 900, fontFamily: "monospace", fontSize: "0.95rem" }}
                          >
                            {d.simulatedWatts ?? d.watts} W
                          </Typography>
                        </Box>

                        {diff !== 0 && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              fontWeight: 800,
                              color: diff > 0 ? "success.main" : "warning.main",
                              fontSize: "0.75rem",
                              mb: 0.5,
                            }}
                          >
                            {diff > 0 ? `Peak Shaved: -${diff}W (Off-Peak)` : `+${Math.abs(diff)}W Load Shift`}
                          </Typography>
                        )}

                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
                          Running Cost: ₱{d.costPerHour.toFixed(2)}/hr
                        </Typography>

                        {d.activeDevices && d.activeDevices.length > 0 && (
                          <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid", borderTopColor: "divider" }}>
                            <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "primary.main", mb: 0.5 }}>
                              Active Devices ({d.activeDevices.length}):
                            </Typography>
                            {d.activeDevices.slice(0, 4).map((dev: any, idx: number) => (
                              <Typography key={idx} variant="caption" sx={{ display: "block", fontSize: "0.7rem", color: "text.primary" }}>
                                • {dev.name} ({dev.watts}W)
                              </Typography>
                            ))}
                            {d.activeDevices.length > 4 && (
                              <Typography variant="caption" sx={{ display: "block", fontSize: "0.68rem", color: "text.secondary" }}>
                                +{d.activeDevices.length - 4} more
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="baselineWatts" stroke="#818cf8" strokeDasharray="3 3" strokeWidth={2} fillOpacity={1} fill="url(#colorBaselineLoad)" />
              <Area type="monotone" dataKey="simulatedWatts" stroke="#00e5c9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLoadCurve)" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* 6. Multi-Month Trend & Predictive Baseline Forecast */}
      <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Multi-Month Consumption Trend & Predictive Forecast
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Active billing cycle telemetry alongside forward-looking baseline predictions based on your registered appliance routines
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            {MONTHLY_TREND_DATA.some((d) => d.type === "recorded") && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: isDark ? "#009e88" : "#0d9488" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Recorded History</Typography>
              </Box>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: isDark ? "#00e5c9" : "#14b8a6" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Active Billing Cycle</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: isDark ? "#2a2f38" : "#cbd5e1" }} />
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>Predicted (Appliance Baseline)</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ height: 260, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MONTHLY_TREND_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.12} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" kWh" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 1.25,
                          bgcolor: isDark ? "#17191d" : "#ffffff",
                          border: isDark ? "1px solid rgba(0, 229, 201, 0.35)" : "1px solid #e2e8f0",
                          color: isDark ? "#ffffff" : "#0f172a",
                          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.6)" : "0 8px 24px rgba(15, 23, 42, 0.08)",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.85rem" }}>
                            {d.month}
                          </Typography>
                          {d.type === "predicted" && (
                            <Chip
                              label="PREDICTED"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: "0.6rem",
                                fontWeight: 800,
                                bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
                                color: "text.secondary",
                              }}
                            />
                          )}
                          {d.type === "active" && (
                            <Chip
                              label="ACTIVE"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: "0.6rem",
                                fontWeight: 800,
                                bgcolor: isDark ? "#00e5c9" : "primary.main",
                                color: isDark ? "#0c1b18" : "#ffffff",
                              }}
                            />
                          )}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            color: isDark ? "#00e5c9" : "primary.main",
                            fontWeight: 800,
                            fontFamily: "monospace",
                            fontSize: "0.95rem",
                          }}
                        >
                          {d.kwh} kWh (~₱{d.cost.toLocaleString()})
                        </Typography>
                        <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.5, fontSize: "0.72rem" }}>
                          {d.status}
                        </Typography>
                      </Box>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="kwh" radius={[6, 6, 0, 0]}>
                {MONTHLY_TREND_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card>

      {/* 7. Actionable AI Energy Recommendations */}
      <Card data-tour="analytics-insights" sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          <SparklesIcon sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706") }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              AI Smart Energy Audit & Actionable Insights
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Practical recommendations based on your appliance load profile and Meralco tariff structure
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {actionableInsights.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 2 }}>
                Register appliances to generate customized energy-saving recommendations.
              </Typography>
            </Grid>
          ) : (
            actionableInsights.map((rec) => (
              <Grid key={rec.id} size={{ xs: 12, md: 6 }}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.65)" : "#ffffff",
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                    boxShadow: (theme) =>
                      theme.palette.mode === "dark" ? "none" : "0 2px 10px rgba(15, 23, 42, 0.04)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 0.75 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
                        {rec.title}
                      </Typography>
                      <Chip
                        label={rec.saving}
                        size="small"
                        color={rec.badgeColor as any}
                        sx={{ height: 22, fontWeight: 800, fontSize: "0.72rem", flexShrink: 0 }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.5, display: "block" }}>
                      {rec.description}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))
          )}
        </Grid>
      </Card>
    </Box>
  );
};

export default AnalyticsView;
