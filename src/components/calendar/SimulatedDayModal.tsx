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
import {
  Close as CloseIcon,
  PieChart as PieChartIcon,
  Tune as TuneIcon,
  RestartAlt as ResetIcon,
  Save as SaveIcon,
  Science as ScienceIcon,
  TrendingDown as TrendingDownIcon,
  Add as PlusIcon,
  Remove as MinusIcon,
} from "@mui/icons-material";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { UserAppliance, SimulatedApplianceUsage, ApplianceList } from "../../types";
import {
  formatDateToKey,
  calculateApplianceKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
} from "../../lib/dailyUsageService";
import { batchSaveSimulatedDay, clearSimulatedDay } from "../../lib/simulationService";
import { useToast } from "../common/ToastProvider";

interface SimulatedDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  initialSimulatedRecords?: SimulatedApplianceUsage[];
  spaces?: ApplianceList[];
  selectedSpaceId?: string;
  onSimulationSaved?: () => void;
}

const PIE_COLORS = [
  "#00e5c9", "#38bdf8", "#a78bfa", "#fbbf24", "#34d399",
  "#f472b6", "#f97316", "#818cf8", "#a3e635", "#e879f9",
];

export const SimulatedDayModal: React.FC<SimulatedDayModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  initialSimulatedRecords = [],
  spaces = [],
  selectedSpaceId = "all",
  onSimulationSaved,
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

  const activeAppliances = useMemo(() => {
    const list =
      selectedSpaceId === "all"
        ? appliances
        : appliances.filter((a) => a.list_id === selectedSpaceId);
    return list.filter((a) => a.is_active !== false);
  }, [appliances, selectedSpaceId]);

  const [simulatedHours, setSimulatedHours] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      const recordsForDay = initialSimulatedRecords.filter((r) => r.usage_date === dateKey);
      const initialMap: Record<string, number> = {};

      activeAppliances.forEach((app) => {
        const found = recordsForDay.find((r) => r.appliance_id === app.id);
        if (found) {
          initialMap[app.id] = Number(found.hours_used) || 0;
        } else {
          initialMap[app.id] = Number(app.hours_per_day) || 0;
        }
      });

      setSimulatedHours(initialMap);
    }
  }, [isOpen, dateKey, initialSimulatedRecords, activeAppliances]);

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

  const handleResetToBaseline = async () => {
    const baselineMap: Record<string, number> = {};
    activeAppliances.forEach((app) => {
      baselineMap[app.id] = Number(app.hours_per_day) || 0;
    });
    setSimulatedHours(baselineMap);
    await clearSimulatedDay(dateKey);
    showInfo("Reset day plan to registered baseline quotas.");
    if (onSimulationSaved) onSimulationSaved();
  };

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

    breakdown.sort((a, b) => b.kwh - a.kwh);

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
          source: "simulation_plan" as const,
          notes: `Simulated day plan (${hours}h)`,
          user_id: app.user_id || null,
        };
      });

      await batchSaveSimulatedDay(dateKey, entriesToSave);

      showSuccess(`Saved simulation plan for ${formattedDate}!`, "Simulation Saved");
      if (onSimulationSaved) onSimulationSaved();
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
            borderRadius: 2.5,
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
            <ScienceIcon sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#ffffff") }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {formattedDate}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Simulated Day Plan & What-If Forecast
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        {/* KPI Strip */}
        <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                SIMULATED BILL
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "primary.main" }}>
                ₱{simulatedTotalCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                @ ₱14.82/kWh rate
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                CONSUMPTION
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "warning.main" }}>
                {simulatedTotalKwh.toFixed(2)} kWh
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {activeAppliances.length} Devices active
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                PEAK LOAD
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "info.main" }}>
                {peakConcurrentWatts} W
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Max Concurrent Draw
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                SIMULATION SAVINGS
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 900,
                  color: savings > 0 ? "success.main" : savings < 0 ? "error.main" : "text.secondary",
                }}
              >
                {savings > 0 ? `₱${savings.toFixed(2)}` : savings < 0 ? `-₱${Math.abs(savings).toFixed(2)}` : "₱0.00"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                vs ₱{baselineTotalCost.toFixed(2)} baseline
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab icon={<TuneIcon fontSize="small" />} iconPosition="start" label="Simulated Day Plan" />
            <Tab icon={<PieChartIcon fontSize="small" />} iconPosition="start" label="Simulated Breakdown" />
          </Tabs>
        </Box>

        {/* Tab 0: Simulated Day Plan */}
        {activeTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Fine-tune appliance target hours for {formattedDate} to test what-if scenarios
              </Typography>
              <Button size="small" variant="outlined" startIcon={<ResetIcon />} onClick={handleResetToBaseline}>
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
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1.5,
                      borderColor: isModified ? "primary.main" : "divider",
                    }}
                  >
                    <Box sx={{ minWidth: 180 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          {item.app.name}
                        </Typography>
                        {isModified && (
                          <Chip label="Modified" size="small" color="primary" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }} />
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Baseline: {item.baseHours}h/day • {item.app.watts}W
                      </Typography>
                    </Box>

                    {/* Steppers & Presets */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleUpdateHours(item.app.id, -0.5)} disabled={currentH <= 0}>
                          <MinusIcon fontSize="small" />
                        </IconButton>
                        <Typography variant="subtitle2" sx={{ width: 50, textAlign: "center", fontWeight: 900, fontFamily: "monospace" }}>
                          {currentH}h
                        </Typography>
                        <IconButton size="small" onClick={() => handleUpdateHours(item.app.id, 0.5)} disabled={currentH >= 24}>
                          <PlusIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {[0, 2, 4, 8, 12].map((preset) => (
                          <Chip
                            key={preset}
                            label={`${preset}h`}
                            size="small"
                            variant={currentH === preset ? "filled" : "outlined"}
                            color={currentH === preset ? "primary" : "default"}
                            onClick={() => handleSetExactHours(item.app.id, preset)}
                            sx={{ height: 24, fontSize: "0.6875rem", fontWeight: 700 }}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Cost Preview */}
                    <Box sx={{ textAlign: "right", minWidth: 85 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, fontFamily: "monospace" }}>
                        ₱{item.cost.toFixed(2)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {item.kwh.toFixed(2)} kWh
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Tab 1: Breakdown Pie */}
        {activeTab === 1 && (
          <Box sx={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {pieChartData.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No active energy consumption in this simulated plan.
              </Typography>
            ) : (
              <Grid container spacing={2} sx={{ alignItems: "center" }}>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                    {pieChartData.map((d) => (
                      <Box key={d.name} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: d.color }} />
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {d.name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 800 }}>
                          {d.percentage}% (₱{d.cost.toFixed(2)})
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between" }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 1.25, fontWeight: 700 }}>
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSimulation}
          disabled={isSaving}
          sx={{ borderRadius: 1.25, fontWeight: 800, px: 3 }}
        >
          {isSaving ? "Saving Plan..." : "Commit Simulation Plan"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SimulatedDayModal;
