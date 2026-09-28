import React, { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Tooltip from "@mui/material/Tooltip";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import {
  Close as CloseIcon,
  Bolt as BoltIcon,
  PieChart as PieChartIcon,
  Tune as TuneIcon,
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  CalendarMonth as CalendarIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Add as PlusIcon,
  Remove as MinusIcon,
} from "@mui/icons-material";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { UserAppliance, DailyApplianceUsage, ApplianceList } from "../../types";
import {
  formatDateToKey,
  calculateApplianceKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  batchSaveDailyUsage,
} from "../../lib/dailyUsageService";
import { useToast } from "../common/ToastProvider";

interface DateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  events?: any[];
  initialUsageRecords?: DailyApplianceUsage[];
  spaces?: ApplianceList[];
  selectedSpaceId?: string;
  logs?: any[];
  onUsageSaved?: () => void;
}

const PIE_COLORS = [
  "#00e5c9", // Cyan / Teal Primary
  "#38bdf8", // Sky Blue
  "#a78bfa", // Purple
  "#fbbf24", // Amber
  "#34d399", // Emerald
  "#f472b6", // Pink
  "#f97316", // Orange
  "#818cf8", // Indigo
  "#a3e635", // Lime
  "#e879f9", // Fuchsia
];

export const DateAnalyticsModal: React.FC<DateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  initialUsageRecords = [],
  spaces = [],
  selectedSpaceId = "all",
  onUsageSaved,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const { showSuccess, showError, showInfo } = useToast();

  const dateKey = formatDateToKey(selectedDate);
  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Filter active appliances for the selected space
  const activeAppliances = useMemo(() => {
    const list =
      selectedSpaceId === "all"
        ? appliances
        : appliances.filter((a) => a.list_id === selectedSpaceId);
    return list.filter((a) => a.is_active !== false);
  }, [appliances, selectedSpaceId]);

  // Initial simulated hours map from database records or baseline routines
  const [simulatedHours, setSimulatedHours] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      const recordsForDay = initialUsageRecords.filter((r) => r.usage_date === dateKey);
      const initialMap: Record<string, number> = {};

      activeAppliances.forEach((app) => {
        const found = recordsForDay.find((r) => r.appliance_id === app.id);
        if (found) {
          initialMap[app.id] = Number(found.hours_used) || 0;
        } else {
          // Default to registered baseline hours
          initialMap[app.id] = Number(app.hours_per_day) || 0;
        }
      });

      setSimulatedHours(initialMap);
    }
  }, [isOpen, dateKey, initialUsageRecords, activeAppliances]);

  // Handle hour adjustments
  const handleUpdateHours = (appId: string, delta: number) => {
    setSimulatedHours((prev) => {
      const current = prev[appId] ?? 0;
      const next = Math.max(0, Math.min(24, Math.round((current + delta) * 2) / 2));
      return { ...prev, [appId]: next };
    });
  };

  const handleSetExactHours = (appId: string, hours: number) => {
    setSimulatedHours((prev) => ({
      ...prev,
      [appId]: Math.max(0, Math.min(24, hours)),
    }));
  };

  // Revert all appliances on this date to their default baseline hours
  const handleResetToBaseline = () => {
    const baselineMap: Record<string, number> = {};
    activeAppliances.forEach((app) => {
      baselineMap[app.id] = Number(app.hours_per_day) || 0;
    });
    setSimulatedHours(baselineMap);
    showInfo("Reset all appliances to registered baseline quotas.");
  };

  // Calculations: Baseline vs Simulated
  const {
    baselineTotalCost,
    baselineTotalKwh,
    simulatedTotalCost,
    simulatedTotalKwh,
    peakConcurrentWatts,
    savings,
    applianceBreakdown,
    pieChartData,
  } = useMemo(() => {
    let baseCost = 0;
    let baseKwh = 0;
    let simCost = 0;
    let simKwh = 0;
    let peakWatts = 0;

    const breakdown = activeAppliances.map((app) => {
      const bHours = Number(app.hours_per_day) || 0;
      const sHours = simulatedHours[app.id] !== undefined ? simulatedHours[app.id] : bHours;

      const appBaseKwh = calculateApplianceKwh(app, bHours);
      const appBaseCost = calculateCost(appBaseKwh, DEFAULT_EFFECTIVE_RATE);

      const appSimKwh = calculateApplianceKwh(app, sHours);
      const appSimCost = calculateCost(appSimKwh, DEFAULT_EFFECTIVE_RATE);

      baseKwh += appBaseKwh;
      baseCost += appBaseCost;
      simKwh += appSimKwh;
      simCost += appSimCost;

      if (sHours > 0) {
        peakWatts += (app.watts || 0) * (app.quantity || 1);
      }

      return {
        app,
        baseHours: bHours,
        simHours: sHours,
        baseKwh: appBaseKwh,
        baseCost: appBaseCost,
        kwh: appSimKwh,
        cost: appSimCost,
        isModified: sHours !== bHours,
      };
    });

    // Sort descending by consumption for the ranked list
    breakdown.sort((a, b) => b.kwh - a.kwh);

    // Prepare Recharts Pie data
    const pieData = breakdown
      .filter((item) => item.kwh > 0)
      .map((item, idx) => ({
        name: item.app.name,
        value: Number(item.kwh.toFixed(3)),
        cost: item.cost,
        percentage: simKwh > 0 ? ((item.kwh / simKwh) * 100).toFixed(1) : "0",
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }));

    return {
      baselineTotalCost: Number(baseCost.toFixed(2)),
      baselineTotalKwh: Number(baseKwh.toFixed(2)),
      simulatedTotalCost: Number(simCost.toFixed(2)),
      simulatedTotalKwh: Number(simKwh.toFixed(2)),
      peakConcurrentWatts: peakWatts,
      savings: Number((baseCost - simCost).toFixed(2)),
      applianceBreakdown: breakdown,
      pieChartData: pieData,
    };
  }, [activeAppliances, simulatedHours]);

  // Save the day simulation to database
  const handleSaveSimulation = async () => {
    setIsSaving(true);
    try {
      const entriesToSave = activeAppliances.map((app) => {
        const hours = simulatedHours[app.id] !== undefined ? simulatedHours[app.id] : (Number(app.hours_per_day) || 0);

        return {
          appliance_id: app.id,
          hours_used: hours,
          watts: app.watts,
          quantity: app.quantity || 1,
          source: "schedule_autofill" as const,
          notes: `Simulated day override (${hours}h)`,
          user_id: app.user_id || null,
        };
      });

      await batchSaveDailyUsage(dateKey, entriesToSave);

      showSuccess(`Saved simulation plan for ${formattedDate}!`, "Simulation Saved");
      if (onUsageSaved) onUsageSaved();
      onClose();
    } catch (err: any) {
      showError(`Failed to save simulation: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 2,
            bgcolor: "background.paper",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 32px 80px rgba(0, 0, 0, 0.85)"
                : "0 20px 60px rgba(15, 23, 42, 0.14)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "#e2e8f0",
          },
        },
      }}
    >
      {/* 1. Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.25,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CalendarIcon sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#ffffff") }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {formattedDate}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Daily Consumption Insight & Schedule Simulation
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      {/* 2. Top Diagnostic Metrics Bar */}
      <Box sx={{ p: { xs: 2, sm: 2.5 }, bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.6)" : "#f8fafc") }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.25, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                DAY TOTAL BILL
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main" }}>
                ₱{simulatedTotalCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                @ ₱14.82/kWh rate
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.25, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                CONSUMPTION
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706") }}>
                {simulatedTotalKwh.toFixed(2)} kWh
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                {activeAppliances.length} Devices active
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.25, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, display: "block" }}>
                PEAK LOAD
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: (theme) => (theme.palette.mode === "dark" ? "#38bdf8" : "#0284c7") }}>
                {peakConcurrentWatts} W
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                Max Concurrent Draw
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 1.25,
                textAlign: "center",
                borderColor: savings > 0 ? "success.main" : "divider",
                bgcolor: savings > 0 ? (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.08)" : "rgba(16, 185, 129, 0.05)") : "transparent",
              }}
            >
              <Typography variant="caption" sx={{ color: savings > 0 ? "success.main" : "text.secondary", fontWeight: 700, display: "block" }}>
                SIMULATION SAVINGS
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: savings > 0 ? "success.main" : savings < 0 ? "warning.main" : "text.secondary",
                }}
              >
                {savings > 0 ? `-₱${savings.toFixed(2)}` : savings < 0 ? `+₱${Math.abs(savings).toFixed(2)}` : "₱0.00"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                vs ₱{baselineTotalCost.toFixed(2)} baseline
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* 3. Navigation Tabs */}
      <Box sx={{ px: { xs: 2, sm: 3 }, borderBottom: "1px solid", borderColor: "divider" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 800,
              fontSize: "0.8125rem",
              minHeight: 44,
              py: 1,
            },
          }}
        >
          <Tab icon={<PieChartIcon fontSize="small" />} iconPosition="start" label="Daily Breakdown (Hati)" />
          <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label="Simulated Day Plan" />
        </Tabs>
      </Box>

      {/* 4. Tab Content */}
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* TAB 0: PIE GRAPH / DONUT CHART BREAKDOWN */}
        {activeTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {pieChartData.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <BoltIcon sx={{ fontSize: 44, color: "text.secondary", opacity: 0.4, mb: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  No active energy load on this date
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  All appliances have 0 operating hours simulated for this day.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3} sx={{ alignItems: "center" }}>
                {/* Donut / Pie Chart Visual */}
                <Grid size={{ xs: 12, md: 5 }}>
                  <Box sx={{ height: 260, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const data = payload[0].payload;
                            return (
                              <Paper
                                sx={{
                                  p: 1.25,
                                  borderRadius: 1,
                                  bgcolor: "background.paper",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  boxShadow: 4,
                                }}
                              >
                                <Typography variant="caption" sx={{ fontWeight: 800, display: "block", color: data.color }}>
                                  {data.name}
                                </Typography>
                                <Typography variant="caption" sx={{ display: "block", fontWeight: 700 }}>
                                  {data.value} kWh ({data.percentage}%)
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                                  ₱{Number(data.cost).toFixed(2)}
                                </Typography>
                              </Paper>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Centered Energy Load Metric */}
                    <Box sx={{ position: "absolute", textAlign: "center", pointerEvents: "none" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.6875rem", display: "block" }}>
                        TOTAL LOAD
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
                        {simulatedTotalKwh.toFixed(1)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                        kWh / day
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Ranked Breakdown List */}
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.05em", mb: 1.5, display: "block" }}>
                    ENERGY LOAD HATI (RANKED BY CONSUMPTION):
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, maxHeight: 320, overflowY: "auto", pr: 0.5 }}>
                    {applianceBreakdown.map((item, idx) => {
                      const sharePct = simulatedTotalKwh > 0 ? (item.kwh / simulatedTotalKwh) * 100 : 0;
                      const color = PIE_COLORS[idx % PIE_COLORS.length];

                      return (
                        <Paper
                          key={item.app.id}
                          variant="outlined"
                          sx={{
                            p: 1.25,
                            borderRadius: 1.25,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                            transition: "all 0.15s ease",
                            "&:hover": {
                              borderColor: color,
                            },
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.8125rem", lineHeight: 1.2 }}>
                                  {item.app.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                                  {item.app.room_location || "General"} • {item.app.watts}W • {item.simHours}h
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: "monospace", fontSize: "0.8125rem" }}>
                                ₱{item.cost.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                                {item.kwh.toFixed(2)} kWh ({sharePct.toFixed(1)}%)
                              </Typography>
                            </Box>
                          </Box>

                          <LinearProgress
                            variant="determinate"
                            value={Math.min(100, sharePct)}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0"),
                              "& .MuiLinearProgress-bar": {
                                bgcolor: color,
                                borderRadius: 2,
                              },
                            }}
                          />
                        </Paper>
                      );
                    })}
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        )}

        {/* TAB 1: SIMULATED DAY PLAN OVERRIDES */}
        {activeTab === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Adjust Operating Hours for {formattedDate}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Fine-tune individual appliance hours to simulate different schedules or what-if scenarios.
                </Typography>
              </Box>
              <Button
                size="small"
                variant="outlined"
                startIcon={<ResetIcon />}
                onClick={handleResetToBaseline}
                sx={{ borderRadius: 1, textTransform: "none", fontWeight: 700 }}
              >
                Reset to Baseline
              </Button>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 380, overflowY: "auto", pr: 0.5 }}>
              {applianceBreakdown.map((item) => {
                const currentH = item.simHours;
                const isModified = item.isModified;

                return (
                  <Paper
                    key={item.app.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 1.25,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1.5,
                      borderColor: isModified ? "primary.main" : "divider",
                      bgcolor: isModified
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.04)" : "rgba(13, 148, 136, 0.03)")
                        : "background.paper",
                    }}
                  >
                    <Box sx={{ minWidth: 180 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {item.app.name}
                        </Typography>
                        {isModified && (
                          <Chip
                            label="Modified"
                            size="small"
                            color="primary"
                            sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }}
                          />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        Baseline: {item.baseHours}h/day • {item.app.watts}W
                      </Typography>
                    </Box>

                    {/* Quick Stepper & Presets */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateHours(item.app.id, -0.5)}
                          disabled={currentH <= 0}
                          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 0.5 }}
                        >
                          <MinusIcon fontSize="small" />
                        </IconButton>

                        <Typography
                          variant="subtitle2"
                          sx={{
                            width: 54,
                            textAlign: "center",
                            fontWeight: 900,
                            fontFamily: "monospace",
                          }}
                        >
                          {currentH}h
                        </Typography>

                        <IconButton
                          size="small"
                          onClick={() => handleUpdateHours(item.app.id, 0.5)}
                          disabled={currentH >= 24}
                          sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 0.5 }}
                        >
                          <PlusIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {/* Presets */}
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {[0, 2, 4, 8, 12].map((preset) => (
                          <Chip
                            key={preset}
                            label={`${preset}h`}
                            size="small"
                            variant={currentH === preset ? "filled" : "outlined"}
                            color={currentH === preset ? "primary" : "default"}
                            onClick={() => handleSetExactHours(item.app.id, preset)}
                            sx={{
                              height: 24,
                              fontSize: "0.6875rem",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Individual Cost Preview */}
                    <Box sx={{ textAlign: "right", minWidth: 90 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: "monospace" }}>
                        ₱{item.cost.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                        {item.kwh.toFixed(2)} kWh
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>

      <Divider />

      {/* 5. Footer Actions */}
      <DialogActions sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between" }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 1.25, fontWeight: 700 }}>
          Close
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? undefined : <SaveIcon />}
          onClick={handleSaveSimulation}
          disabled={isSaving}
          sx={{ borderRadius: 1.25, fontWeight: 800, px: 3 }}
        >
          {isSaving ? "Saving Simulation..." : "Save Day Simulation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DateAnalyticsModal;
