import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import MenuItem from "@mui/material/MenuItem";
import Autocomplete from "@mui/material/Autocomplete";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import {
  Laptop as LaptopIcon,
  DesktopWindows as DesktopIcon,
  Memory as CpuIcon,
  VideogameAsset as GpuIcon,
  Tv as MonitorIcon,
  AutoAwesome as SparklesIcon,
  Bolt as BoltIcon,
  Speed as SpeedIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import { CpuHardwareItem, GpuHardwareItem } from "../../types";
import {
  calculateDesktopPcWatts,
  calculateLaptopRunningWatts,
  resolvePcHwWithAi,
  PcWorkloadProfile,
} from "../../lib/pcHardwareService";
import { CPU_CATALOG, GPU_CATALOG } from "../../lib/pcHardwareData";

interface PcSpecBuilderSectionProps {
  initialType?: "laptop" | "desktop_pc";
  initialRatedWatts?: number;
  initialCruisingWatts?: number;
  initialMetadata?: Record<string, any>;
  onSpecChange: (data: {
    deviceType: "laptop" | "desktop_pc";
    ratedWatts: number;
    runningWatts: number;
    metadata: Record<string, any>;
  }) => void;
}

export const PcSpecBuilderSection: React.FC<PcSpecBuilderSectionProps> = ({
  initialType = "laptop",
  initialRatedWatts = 120,
  initialCruisingWatts,
  initialMetadata,
  onSpecChange,
}) => {
  const [deviceType, setDeviceType] = useState<"laptop" | "desktop_pc">(
    initialMetadata?.device_type || initialType
  );
  const [workload, setWorkload] = useState<PcWorkloadProfile>(
    initialMetadata?.workload_profile || "standard"
  );

  // Laptop state
  const [chargerWatts, setChargerWatts] = useState<number>(
    initialMetadata?.charger_watts || initialRatedWatts || 120
  );

  // Desktop hardware catalogs (synchronous local dataset)
  const [cpus] = useState<CpuHardwareItem[]>(CPU_CATALOG);
  const [gpus] = useState<GpuHardwareItem[]>(GPU_CATALOG);

  const [selectedCpu, setSelectedCpu] = useState<CpuHardwareItem | null>(() => {
    if (initialMetadata?.cpu) {
      const match = CPU_CATALOG.find((c) => c.name.toLowerCase() === initialMetadata.cpu.toLowerCase());
      if (match) return match;
    }
    return CPU_CATALOG.find((c) => c.id.includes("5600")) || CPU_CATALOG[0];
  });

  const [selectedGpu, setSelectedGpu] = useState<GpuHardwareItem | null>(() => {
    if (initialMetadata?.gpu) {
      const match = GPU_CATALOG.find((g) => g.name.toLowerCase() === initialMetadata.gpu.toLowerCase());
      if (match) return match;
    }
    return GPU_CATALOG.find((g) => g.id.includes("3060")) || GPU_CATALOG[0];
  });

  const [monitorCount, setMonitorCount] = useState<number>(initialMetadata?.monitors ?? 1);

  // AI Prompt lookup state
  const [aiQuery, setAiQuery] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const [aiSuccessMsg, setAiSuccessMsg] = useState<string>("");

  // Update parent whenever laptop or desktop parameters change
  useEffect(() => {
    if (deviceType === "laptop") {
      const running = calculateLaptopRunningWatts(chargerWatts, workload);
      onSpecChange({
        deviceType: "laptop",
        ratedWatts: chargerWatts,
        runningWatts: running,
        metadata: {
          device_type: "laptop",
          workload_profile: workload,
          charger_watts: chargerWatts,
          running_watts: running,
        },
      });
    } else {
      const result = calculateDesktopPcWatts(selectedCpu, selectedGpu, monitorCount, workload);
      onSpecChange({
        deviceType: "desktop_pc",
        ratedWatts: result.peakSystemWatts,
        runningWatts: result.totalRunningWatts,
        metadata: {
          device_type: "desktop_pc",
          cpu: selectedCpu?.name || "Standard CPU",
          cpu_tdp: selectedCpu?.tdp || 65,
          gpu: selectedGpu?.name || "Standard GPU",
          gpu_tgp: selectedGpu?.tgp ?? 160,
          monitors: monitorCount,
          workload_profile: workload,
          running_watts: result.totalRunningWatts,
          breakdown: result,
        },
      });
    }
  }, [deviceType, workload, chargerWatts, selectedCpu, selectedGpu, monitorCount]);

  const handleAiLookup = async () => {
    if (!aiQuery.trim()) return;
    setIsAiLoading(true);
    setAiError("");
    setAiSuccessMsg("");

    try {
      const res = await resolvePcHwWithAi(aiQuery);
      if (res.device_type === "laptop") {
        setDeviceType("laptop");
        setChargerWatts(res.total_estimated_running_watts ? Math.round(res.total_estimated_running_watts / 0.45) : 100);
      } else {
        setDeviceType("desktop_pc");
        if (res.cpu_name) {
          const match = cpus.find((c) => c.name.toLowerCase().includes(res.cpu_name!.toLowerCase()));
          if (match) {
            setSelectedCpu(match);
          } else if (res.cpu_tdp) {
            setSelectedCpu({
              id: "ai-cpu",
              name: res.cpu_name,
              brand: res.cpu_name.includes("AMD") ? "AMD" : "Intel",
              family: "Custom",
              tdp: res.cpu_tdp,
              gaming_w: Math.round(res.cpu_tdp * 0.85),
              idle_w: 15,
            });
          }
        }
        if (res.gpu_name) {
          const match = gpus.find((g) => g.name.toLowerCase().includes(res.gpu_name!.toLowerCase()));
          if (match) {
            setSelectedGpu(match);
          } else if (res.gpu_tgp !== undefined) {
            setSelectedGpu({
              id: "ai-gpu",
              name: res.gpu_name,
              brand: res.gpu_name.includes("AMD") ? "AMD" : "NVIDIA",
              series: "Custom",
              tgp: res.gpu_tgp,
              gaming_w: Math.round(res.gpu_tgp * 0.9),
              idle_w: 12,
            });
          }
        }
        if (res.monitors !== undefined) {
          setMonitorCount(res.monitors);
        }
      }
      setAiSuccessMsg(res.explanation || "Hardware specifications parsed successfully!");
    } catch (err: any) {
      setAiError(err.message || "Failed to resolve hardware with AI.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const desktopCalc = calculateDesktopPcWatts(selectedCpu, selectedGpu, monitorCount, workload);
  const laptopRunning = calculateLaptopRunningWatts(chargerWatts, workload);

  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      {/* Device Type Segmented Switch */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
          <SpeedIcon fontSize="small" color="primary" /> Computer Device Type:
        </Typography>
        <ToggleButtonGroup
          value={deviceType}
          exclusive
          onChange={(_, val) => val && setDeviceType(val)}
          size="small"
        >
          <ToggleButton value="laptop" sx={{ px: 2, textTransform: "none", fontWeight: 600 }}>
            <LaptopIcon fontSize="small" sx={{ mr: 1 }} /> Laptop
          </ToggleButton>
          <ToggleButton value="desktop_pc" sx={{ px: 2, textTransform: "none", fontWeight: 600 }}>
            <DesktopIcon fontSize="small" sx={{ mr: 1 }} /> Desktop PC
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Workload Profile Selector */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, display: "block", mb: 1 }}>
          Typical Usage Profile / Workload Intensity:
        </Typography>
        <Grid container spacing={1}>
          <Grid size={{ xs: 4 }}>
            <Paper
              onClick={() => setWorkload("light")}
              sx={{
                p: 1.25,
                textAlign: "center",
                cursor: "pointer",
                border: "2px solid",
                borderColor: workload === "light" ? "primary.main" : "transparent",
                bgcolor: workload === "light" ? "rgba(0, 229, 201, 0.08)" : "background.paper",
                transition: "all 0.15s ease-in-out",
                borderRadius: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Light</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                Browsing / School
              </Typography>
              <Chip label={deviceType === "laptop" ? "~25%" : "~100W"} size="small" sx={{ mt: 0.5, height: 18, fontSize: "0.65rem" }} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper
              onClick={() => setWorkload("standard")}
              sx={{
                p: 1.25,
                textAlign: "center",
                cursor: "pointer",
                border: "2px solid",
                borderColor: workload === "standard" ? "primary.main" : "transparent",
                bgcolor: workload === "standard" ? "rgba(0, 229, 201, 0.08)" : "background.paper",
                transition: "all 0.15s ease-in-out",
                borderRadius: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Standard</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                Daily Work / WFH
              </Typography>
              <Chip label={deviceType === "laptop" ? "~45%" : "~180W"} size="small" color="primary" sx={{ mt: 0.5, height: 18, fontSize: "0.65rem" }} />
            </Paper>
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Paper
              onClick={() => setWorkload("heavy")}
              sx={{
                p: 1.25,
                textAlign: "center",
                cursor: "pointer",
                border: "2px solid",
                borderColor: workload === "heavy" ? "primary.main" : "transparent",
                bgcolor: workload === "heavy" ? "rgba(0, 229, 201, 0.08)" : "background.paper",
                transition: "all 0.15s ease-in-out",
                borderRadius: 1.5,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Heavy</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                Gaming / 3D / Render
              </Typography>
              <Chip label={deviceType === "laptop" ? "~80%" : "~320W+"} size="small" color="secondary" sx={{ mt: 0.5, height: 18, fontSize: "0.65rem" }} />
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* LAPTOP MODE */}
      {deviceType === "laptop" && (
        <Paper sx={{ p: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Charger / Adapter Rating (Watts)"
                type="number"
                fullWidth
                size="small"
                value={chargerWatts}
                onChange={(e) => setChargerWatts(Math.max(15, Number(e.target.value) || 0))}
                helperText="Look at your laptop power brick (e.g. 45W, 65W, 120W, 230W)"
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">Watts</InputAdornment>,
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: "rgba(0, 229, 201, 0.05)", border: "1px dashed", borderColor: "primary.main", borderRadius: 1.5 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                  Real-World Power Consumption:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main" }}>
                  ~{laptopRunning} Watts
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  ({workload === "light" ? "25% load" : workload === "standard" ? "45% balanced load" : "80% high load"} of {chargerWatts}W charger)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* DESKTOP PC MODE */}
      {deviceType === "desktop_pc" && (
        <Paper sx={{ p: 2, bgcolor: "background.default", border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 2 }}>
          {/* AI Quick Query Helper */}
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "rgba(99, 102, 241, 0.06)", borderRadius: 1.5, border: "1px solid rgba(99, 102, 241, 0.2)" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75, flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 0.5 }}>
                <SparklesIcon sx={{ fontSize: 16 }} /> Quick Spec Detection via AI:
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="e.g. Ryzen 5 5600 + RTX 3060, or i5 12400F"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAiLookup();
                  }
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleAiLookup}
                disabled={isAiLoading || !aiQuery.trim()}
                sx={{ whiteSpace: "nowrap", bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
              >
                {isAiLoading ? <CircularProgress size={18} color="inherit" /> : "Identify Specs"}
              </Button>
            </Box>
            {aiSuccessMsg && (
              <Typography variant="caption" sx={{ color: "success.light", display: "block", mt: 0.5 }}>
                ✓ {aiSuccessMsg}
              </Typography>
            )}
            {aiError && (
              <Typography variant="caption" sx={{ color: "error.light", display: "block", mt: 0.5 }}>
                {aiError}
              </Typography>
            )}
          </Box>

          <Grid container spacing={2}>
            {/* CPU Autocomplete */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete<CpuHardwareItem, false, false, false>
                options={cpus}
                value={selectedCpu}
                onChange={(_, newVal) => setSelectedCpu(newVal)}
                isOptionEqualToValue={(option, value) => option?.id === value?.id || option?.name === value?.name}
                getOptionLabel={(option) => {
                  if (typeof option === "string") return option;
                  if (!option || !option.name) return "";
                  return `${option.name} (${option.tdp}W TDP)`;
                }}
                filterOptions={(options, state) => {
                  const q = state.inputValue.toLowerCase().trim().replace(/\s+/g, "");
                  if (!q) return options;
                  return options.filter((c) => {
                    const target = `${c.name} ${c.brand} ${c.family}`.toLowerCase().replace(/\s+/g, "");
                    return target.includes(q);
                  });
                }}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key || option.id}
                      {...otherProps}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        py: 0.75,
                        px: 1.5,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                          {option.brand} • {option.family}
                        </Typography>
                      </Box>
                      <Chip
                        label={`${option.tdp}W TDP`}
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700, ml: 1 }}
                      />
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Processor (CPU)"
                    size="small"
                    placeholder="Search AMD Ryzen / Intel Core..."
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps?.input,
                        startAdornment: (
                          <>
                            <CpuIcon fontSize="small" sx={{ color: "primary.main", mr: 0.5 }} />
                            {params.slotProps?.input?.startAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* GPU Autocomplete */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Autocomplete<GpuHardwareItem, false, false, false>
                options={gpus}
                value={selectedGpu}
                onChange={(_, newVal) => setSelectedGpu(newVal)}
                isOptionEqualToValue={(option, value) => option?.id === value?.id || option?.name === value?.name}
                getOptionLabel={(option) => {
                  if (typeof option === "string") return option;
                  if (!option || !option.name) return "";
                  return option.tgp === 0 ? option.name : `${option.name} (${option.tgp}W)`;
                }}
                filterOptions={(options, state) => {
                  const q = state.inputValue.toLowerCase().trim().replace(/\s+/g, "");
                  if (!q) return options;
                  return options.filter((g) => {
                    const target = `${g.name} ${g.brand} ${g.series}`.toLowerCase().replace(/\s+/g, "");
                    return target.includes(q);
                  });
                }}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  return (
                    <Box
                      component="li"
                      key={key || option.id}
                      {...otherProps}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        py: 0.75,
                        px: 1.5,
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                          {option.brand} • {option.series}
                        </Typography>
                      </Box>
                      <Chip
                        label={option.tgp === 0 ? "Integrated" : `${option.tgp}W TGP`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ height: 20, fontSize: "0.7rem", fontWeight: 700, ml: 1 }}
                      />
                    </Box>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Graphics Card (GPU)"
                    size="small"
                    placeholder="Search NVIDIA RTX / AMD RX..."
                    slotProps={{
                      ...params.slotProps,
                      input: {
                        ...params.slotProps?.input,
                        startAdornment: (
                          <>
                            <GpuIcon fontSize="small" sx={{ color: "secondary.main", mr: 0.5 }} />
                            {params.slotProps?.input?.startAdornment}
                          </>
                        ),
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Monitor Count */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Connected Monitors"
                size="small"
                fullWidth
                value={monitorCount}
                onChange={(e) => setMonitorCount(Number(e.target.value))}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MonitorIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              >
                <MenuItem value={0}>No Monitor (Headless Server)</MenuItem>
                <MenuItem value={1}>1 Monitor (~30 Watts)</MenuItem>
                <MenuItem value={2}>2 Monitors (~60 Watts)</MenuItem>
                <MenuItem value={3}>3 Monitors (~90 Watts)</MenuItem>
              </TextField>
            </Grid>

            {/* Total Calculated Running Wattage Result */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "rgba(0, 229, 201, 0.06)",
                  border: "1px dashed",
                  borderColor: "primary.main",
                  borderRadius: 1.5,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Active Running Power:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main" }}>
                    ~{desktopCalc.totalRunningWatts} W
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", display: "block" }}>
                  Base (50W) + CPU ({desktopCalc.cpuWatts}W) + GPU ({desktopCalc.gpuWatts}W) + Monitor ({desktopCalc.monitorWatts}W)
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};
