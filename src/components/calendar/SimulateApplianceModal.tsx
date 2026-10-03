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
import Slider from "@mui/material/Slider";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import {
  Close as CloseIcon,
  Science as ScienceIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Timer as TimerIcon,
  Save as SaveIcon,
  Bolt as BoltIcon,
  TrendingDown as TrendingDownIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";
import { UserAppliance } from "../../types";
import { formatDateToKey, calculateApplianceKwh, calculateCost, DEFAULT_EFFECTIVE_RATE } from "../../lib/dailyUsageService";
import { saveSimulatedAppliance, batchSaveSimulatedDay } from "../../lib/simulationService";
import { useToast } from "../common/ToastProvider";
import { formatElapsedHms } from "../../hooks/useLiveTicker";

interface SimulateApplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appliances: UserAppliance[];
  selectedDate?: Date;
  onSimulationSaved?: () => void;
}

export const SimulateApplianceModal: React.FC<SimulateApplianceModalProps> = ({
  isOpen,
  onClose,
  appliances,
  selectedDate = new Date(),
  onSimulationSaved,
}) => {
  const { showSuccess, showError } = useToast();
  const activeAppliances = useMemo(() => appliances.filter((a) => a.is_active !== false), [appliances]);

  // Selected appliance
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const selectedAppliance = useMemo(
    () => activeAppliances.find((a) => a.id === selectedAppId) || activeAppliances[0],
    [activeAppliances, selectedAppId]
  );

  // Target date range mode
  const [rangeMode, setRangeMode] = useState<"single_day" | "remainder_of_month" | "custom_range">("single_day");
  const [customStartDate, setCustomStartDate] = useState<string>(() => formatDateToKey(selectedDate));
  const [customEndDate, setCustomEndDate] = useState<string>(() => formatDateToKey(selectedDate));

  // Simulated parameters
  const [simulatedHours, setSimulatedHours] = useState<number>(4);
  const [startHour, setStartHour] = useState<number>(8); // 8:00 AM

  // Live Test-Run Stopwatch State
  const [isTestRunning, setIsTestRunning] = useState<boolean>(false);
  const [testStartTime, setTestStartTime] = useState<number | null>(null);
  const [testElapsedMs, setTestElapsedMs] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initialize selected appliance
  useEffect(() => {
    if (isOpen && activeAppliances.length > 0) {
      if (!selectedAppId || !activeAppliances.some((a) => a.id === selectedAppId)) {
        setSelectedAppId(activeAppliances[0].id);
        setSimulatedHours(Number(activeAppliances[0].hours_per_day) || 4);
      }
    }
  }, [isOpen, activeAppliances, selectedAppId]);

  // Sync simulated hours when changing appliance
  const handleSelectAppliance = (appId: string) => {
    setSelectedAppId(appId);
    const app = activeAppliances.find((a) => a.id === appId);
    if (app) {
      setSimulatedHours(Number(app.hours_per_day) || 4);
    }
  };

  // Test-Run Stopwatch Interval
  useEffect(() => {
    let interval: any = null;
    if (isTestRunning && testStartTime) {
      interval = setInterval(() => {
        setTestElapsedMs(Date.now() - testStartTime);
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTestRunning, testStartTime]);

  const handleStartTest = () => {
    setIsTestRunning(true);
    setTestStartTime(Date.now() - testElapsedMs);
  };

  const handleStopTest = () => {
    setIsTestRunning(false);
    if (testElapsedMs > 1000) {
      const elapsedHours = Math.max(0.1, Number((testElapsedMs / 3600000).toFixed(2)));
      setSimulatedHours(elapsedHours);
      showSuccess(`Test run completed (${formatElapsedHms(testElapsedMs)}). Applied ${elapsedHours}h to plan!`);
    }
  };

  const handleResetTest = () => {
    setIsTestRunning(false);
    setTestStartTime(null);
    setTestElapsedMs(0);
  };

  // Calculations
  const calculations = useMemo(() => {
    if (!selectedAppliance) return { baselineKwh: 0, simKwh: 0, baselineCost: 0, simCost: 0, deltaCost: 0 };
    const baseHours = Number(selectedAppliance.hours_per_day) || 0;
    const baseKwh = calculateApplianceKwh(selectedAppliance, baseHours);
    const baseCost = calculateCost(baseKwh, DEFAULT_EFFECTIVE_RATE);

    const simKwh = calculateApplianceKwh(selectedAppliance, simulatedHours);
    const simCost = calculateCost(simKwh, DEFAULT_EFFECTIVE_RATE);
    const delta = simCost - baseCost;

    return {
      baselineKwh: baseKwh,
      simKwh,
      baselineCost: baseCost,
      simCost,
      deltaCost: delta,
    };
  }, [selectedAppliance, simulatedHours]);

  const handleSaveSimulation = async () => {
    if (!selectedAppliance) return;
    setIsSaving(true);

    try {
      const datesToApply: string[] = [];

      if (rangeMode === "single_day") {
        datesToApply.push(formatDateToKey(selectedDate));
      } else if (rangeMode === "remainder_of_month") {
        const start = new Date(selectedDate);
        const year = start.getFullYear();
        const month = start.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = start.getDate(); d <= daysInMonth; d++) {
          datesToApply.push(formatDateToKey(new Date(year, month, d)));
        }
      } else {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        const curr = new Date(start);
        while (curr <= end) {
          datesToApply.push(formatDateToKey(curr));
          curr.setDate(curr.getDate() + 1);
        }
      }

      if (datesToApply.length === 1) {
        await saveSimulatedAppliance({
          appliance_id: selectedAppliance.id,
          usage_date: datesToApply[0],
          hours_used: simulatedHours,
          watts: selectedAppliance.watts,
          quantity: selectedAppliance.quantity || 1,
          start_hour: startHour,
          end_hour: Math.min(24, startHour + simulatedHours),
          source: "simulation_plan",
          notes: `Simulated via Simulate Appliance (${simulatedHours}h)`,
          user_id: selectedAppliance.user_id,
        });
      } else {
        const entries = datesToApply.map((dKey) => ({
          appliance_id: selectedAppliance.id,
          hours_used: simulatedHours,
          watts: selectedAppliance.watts,
          quantity: selectedAppliance.quantity || 1,
          start_hour: startHour,
          end_hour: Math.min(24, startHour + simulatedHours),
          source: "simulation_plan" as const,
          notes: `Simulated batch schedule (${simulatedHours}h)`,
          user_id: selectedAppliance.user_id,
        }));

        for (const dKey of datesToApply) {
          await batchSaveSimulatedDay(dKey, [
            {
              appliance_id: selectedAppliance.id,
              hours_used: simulatedHours,
              watts: selectedAppliance.watts,
              quantity: selectedAppliance.quantity || 1,
              start_hour: startHour,
              end_hour: Math.min(24, startHour + simulatedHours),
              source: "simulation_plan",
              notes: `Simulated schedule (${simulatedHours}h)`,
              user_id: selectedAppliance.user_id,
            },
          ]);
        }
      }

      showSuccess(
        `Saved simulation plan for ${selectedAppliance.name} across ${datesToApply.length} day(s)!`,
        "Simulation Saved"
      );

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
      maxWidth="sm"
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
      {/* 1. Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ScienceIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Simulate Appliance Schedule
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Fine-tune target hours or test-run a stopwatch to forecast Meralco bill impact
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Step 1: Select Appliance */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
            1. Select Appliance to Simulate
          </Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedAppId}
            onChange={(e) => handleSelectAppliance(e.target.value)}
            sx={{ mt: 1 }}
          >
            {activeAppliances.map((app) => (
              <MenuItem key={app.id} value={app.id}>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {app.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {app.watts}W • Baseline: {app.hours_per_day}h/day
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Step 2: Target Dates */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5 }}>
            2. Simulation Target Scope
          </Typography>
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip
              label={`Selected Day (${formatDateToKey(selectedDate)})`}
              color={rangeMode === "single_day" ? "primary" : "default"}
              variant={rangeMode === "single_day" ? "filled" : "outlined"}
              onClick={() => setRangeMode("single_day")}
              clickable
            />
            <Chip
              label="Remaining Days of Month"
              color={rangeMode === "remainder_of_month" ? "primary" : "default"}
              variant={rangeMode === "remainder_of_month" ? "filled" : "outlined"}
              onClick={() => setRangeMode("remainder_of_month")}
              clickable
            />
            <Chip
              label="Custom Date Range"
              color={rangeMode === "custom_range" ? "primary" : "default"}
              variant={rangeMode === "custom_range" ? "filled" : "outlined"}
              onClick={() => setRangeMode("custom_range")}
              clickable
            />
          </Box>

          {rangeMode === "custom_range" && (
            <Box sx={{ display: "flex", gap: 1.5, mt: 1.5 }}>
              <TextField
                type="date"
                size="small"
                label="Start Date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                type="date"
                size="small"
                label="End Date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
            </Box>
          )}
        </Box>

        {/* Step 3: Interactive Hours & Test-Run Stopwatch */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
              Operating Hours Quota: <span style={{ color: "#00e5c9" }}>{simulatedHours} hrs/day</span>
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {[0, 2, 4, 8, 12].map((preset) => (
                <Chip
                  key={preset}
                  label={`${preset}h`}
                  size="small"
                  variant={simulatedHours === preset ? "filled" : "outlined"}
                  color={simulatedHours === preset ? "primary" : "default"}
                  onClick={() => setSimulatedHours(preset)}
                  sx={{ height: 22, fontSize: "0.6875rem", fontWeight: 700 }}
                />
              ))}
            </Box>
          </Box>

          <Slider
            value={simulatedHours}
            min={0}
            max={24}
            step={0.5}
            onChange={(_, val) => setSimulatedHours(val as number)}
            sx={{ color: "primary.main" }}
          />

          <Divider sx={{ my: 1.5 }} />

          {/* Integrated Test-Run Stopwatch */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
                <TimerIcon fontSize="inherit" /> Test-Run Live Stopwatch
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "monospace", fontSize: "1.1rem" }}>
                {formatElapsedHms(testElapsedMs)}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1 }}>
              {!isTestRunning ? (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<PlayIcon />}
                  onClick={handleStartTest}
                  sx={{ borderRadius: 1.25, fontWeight: 700 }}
                >
                  Start Test
                </Button>
              ) : (
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={handleStopTest}
                  sx={{ borderRadius: 1.25, fontWeight: 700 }}
                >
                  Stop & Apply
                </Button>
              )}
              {testElapsedMs > 0 && !isTestRunning && (
                <Button size="small" variant="text" onClick={handleResetTest} sx={{ fontWeight: 700 }}>
                  Reset
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Step 4: Projected Impact Preview */}
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.05)" : "rgba(13, 148, 136, 0.05)", border: "1px solid", borderColor: "primary.main" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                DAILY ESTIMATE
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "primary.main" }}>
                ₱{calculations.simCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {calculations.simKwh.toFixed(2)} kWh / day
              </Typography>
            </Box>

            <Box sx={{ textAlign: "right" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                VS. REGISTERED BASELINE
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, justifyContent: "flex-end" }}>
                {calculations.deltaCost < 0 ? (
                  <Chip
                    size="small"
                    color="success"
                    icon={<TrendingDownIcon fontSize="small" />}
                    label={`Saves ₱${Math.abs(calculations.deltaCost).toFixed(2)}/day`}
                    sx={{ fontWeight: 800 }}
                  />
                ) : calculations.deltaCost > 0 ? (
                  <Chip
                    size="small"
                    color="warning"
                    icon={<TrendingUpIcon fontSize="small" />}
                    label={`+₱${calculations.deltaCost.toFixed(2)}/day Increase`}
                    sx={{ fontWeight: 800 }}
                  />
                ) : (
                  <Chip size="small" label="Matches Baseline" sx={{ fontWeight: 700 }} />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, px: 3, display: "flex", justifyContent: "space-between" }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 1.25, fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSimulation}
          disabled={isSaving}
          sx={{ borderRadius: 1.25, fontWeight: 800, px: 3 }}
        >
          {isSaving ? "Saving Plan..." : "Commit to Simulation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SimulateApplianceModal;
