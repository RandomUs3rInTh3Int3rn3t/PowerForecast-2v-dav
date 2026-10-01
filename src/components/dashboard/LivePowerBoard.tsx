import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import {
  PowerSettingsNew as PowerIcon,
  Bolt as BoltIcon,
  Air as WindIcon,
  Kitchen as RefrigeratorIcon,
  Tv as TvIcon,
  LocalLaundryService as WashingMachineIcon,
  Lightbulb as LightbulbIcon,
  Add as PlusIcon,
  AccessTime as ClockIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  Laptop as LaptopIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList } from "../../types";
import { useUpdate, useList } from "@refinedev/core";
import { devLog } from "../../lib/devLogger";
import { calculateSimultaneousDemand } from "../../lib/meralcoCalculator";
import { supabaseClient } from "../../lib/supabaseClient";
import { accumulateLiveSessionDailyUsage, calculateKwh, calculateApplianceKwh, calculateCost } from "../../lib/dailyUsageService";

interface LivePowerBoardProps {
  onOpenAddModal: () => void;
}

export const LivePowerBoard: React.FC<LivePowerBoardProps> = ({ onOpenAddModal }) => {
  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const { mutate: updateAppliance } = useUpdate();
  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Memoize demand calculation to avoid running on every second tick
  const demand = useMemo(() => calculateSimultaneousDemand(appliances, 9.2), [appliances]);

  // Replace O(N*M) space lookup with O(N) map building and O(1) lookup
  const spacesMap = useMemo(() => {
    const map: Record<string, ApplianceList> = {};
    spaces.forEach((s) => {
      map[s.id] = s;
    });
    return map;
  }, [spaces]);

  const getCategoryIcon = (category: string) => {
    const c = category?.toLowerCase() || "";
    if (c.includes("air condition") || c.includes("aircon")) {
      return <WindIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("refrigerat") || c.includes("freezer") || c.includes("chiller")) {
      return <RefrigeratorIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("fan") || c.includes("cool")) {
      return <SpeedIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("wash") || c.includes("laundry")) {
      return <WashingMachineIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    if (c.includes("computer") || c.includes("laptop") || c.includes("pc")) {
      return <LaptopIcon fontSize="small" sx={{ color: "#818cf8" }} />;
    }
    if (c.includes("tv") || c.includes("televis") || c.includes("entertain") || c.includes("office")) {
      return <TvIcon fontSize="small" sx={{ color: "primary.light" }} />;
    }
    return <LightbulbIcon fontSize="small" sx={{ color: "primary.light" }} />;
  };

  const togglePower = async (app: UserAppliance) => {
    const newState = !app.is_currently_on;
    const nowIso = newState ? new Date().toISOString() : null;

    if (!newState && app.last_turned_on_at) {
      // Circuit is being DE-ENERGIZED / TURNED OFF! Save active session to logs & daily usage
      const start = new Date(app.last_turned_on_at);
      const end = new Date();
      if (!isNaN(start.getTime())) {
        const diffMs = Math.max(1000, end.getTime() - start.getTime());
        const durationMinutes = Math.max(1, Math.round(diffMs / 60000));
        const durationHours = diffMs / 3600000;
        const appKwh = calculateApplianceKwh(app, durationHours);
        const effectiveRate = app.tariff_type === "commercial" ? 15.2 : 14.8261;
        const appCost = calculateCost(appKwh, effectiveRate);

        try {
          // 1. Insert session log
          await supabaseClient.from("appliance_usage_logs").insert({
            appliance_id: app.id,
            user_id: app.user_id || null,
            started_at: start.toISOString(),
            ended_at: end.toISOString(),
            duration_minutes: durationMinutes,
            kwh_consumed: appKwh,
            estimated_cost: appCost,
            source: "live_session",
          });

          // 2. Accumulate in daily_appliance_usage
          await accumulateLiveSessionDailyUsage({
            appliance_id: app.id,
            durationMinutes,
            watts: app.watts,
            quantity: app.quantity || 1,
            effectiveRate,
            user_id: app.user_id,
            startTime: start,
            endTime: end,
          });

          // 3. Dispatch global sync event
          if (typeof window !== "undefined") {
            const syncDetail = {
              rolledOverCount: 1,
              affectedDates: [start.toISOString().split("T")[0], end.toISOString().split("T")[0]],
            };
            window.dispatchEvent(new CustomEvent("powerforecast_session_sync", { detail: syncDetail }));
            window.dispatchEvent(new CustomEvent("powerforecast_stopwatch_rollover", { detail: syncDetail }));
          }
        } catch (err: any) {
          devLog.warn("LivePowerBoard", `Error auto-saving stopped session: ${err?.message}`);
        }
      }
    }

    devLog.telemetry("Telemetry", `Circuit ${newState ? "energized [ACTIVE]" : "de-energized [IDLE]"}: "${app.name}" (${app.watts}W @ 230V)`, {
      applianceId: app.id,
      name: app.name,
      category: app.category,
      watts: app.watts,
      is_currently_on: newState,
      last_turned_on_at: nowIso,
      ratePerHourPHP: ((app.watts * (app.quantity || 1) / 1000) * 14.8261).toFixed(2),
    });

    updateAppliance({
      resource: "user_appliances",
      id: app.id,
      values: {
        is_currently_on: newState,
        last_turned_on_at: nowIso,
      },
    });
  };

  const getRunningDuration = (turnedOnAt?: string | null) => {
    if (!turnedOnAt) return "00:00:00";
    const start = new Date(turnedOnAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(diffSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    const effectiveRate = app.tariff_type === "commercial" ? 15.2 : 14.8261;
    return accumulatedKwh * effectiveRate;
  };

  return (
    <Card sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 1.5, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 1,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BoltIcon sx={{ color: "#ffd54f" }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Live Circuit Power Board
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Real-time demand gauge and active appliance circuit controls
              </Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            size="small"
            onClick={onOpenAddModal}
            startIcon={<PlusIcon />}
            sx={{ fontWeight: 700 }}
          >
            Add Appliance
          </Button>
        </Box>

        {/* Real-time Simultaneous Demand Gauge */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 1.75, sm: 2 },
            mb: 2.5,
            borderRadius: 1.25,
            bgcolor: demand.isOverloaded
              ? "rgba(239, 68, 68, 0.1)"
              : demand.loadPercentage > 75
              ? "rgba(245, 158, 11, 0.1)"
              : "action.hover",
            borderColor: demand.isOverloaded
              ? "error.main"
              : demand.loadPercentage > 75
              ? "warning.main"
              : "divider",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1, flexWrap: "wrap", gap: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Real-Time Household Demand
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: demand.isOverloaded ? "error.main" : "text.primary" }}>
                {demand.simultaneousWatts.toLocaleString()} W <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>({(demand.simultaneousWatts / 230).toFixed(1)}A / 40A)</Typography>
              </Typography>
            </Box>
            <Chip
              label={`${demand.loadPercentage.toFixed(1)}% Capacity`}
              color={demand.isOverloaded ? "error" : demand.loadPercentage > 75 ? "warning" : "success"}
              size="small"
              sx={{ fontWeight: 800, fontFamily: "monospace" }}
            />
          </Box>

          <LinearProgress
            variant="determinate"
            value={Math.min(100, demand.loadPercentage)}
            color={demand.isOverloaded ? "error" : demand.loadPercentage > 75 ? "warning" : "primary"}
            sx={{ height: 8, borderRadius: 1, mb: 1 }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
              {demand.activeCircuitsCount} circuits active • 40A Main Breaker Rating
            </Typography>
            {demand.isOverloaded ? (
              <Chip
                icon={<WarningIcon sx={{ fontSize: "14px !important" }} />}
                label="Breaker Overload Warning"
                size="small"
                color="error"
                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 800 }}
              />
            ) : (
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700, fontFamily: "monospace" }}>
                ₱{demand.hourlyRunningCost.toFixed(2)}/hr combined draw
              </Typography>
            )}
          </Box>
        </Paper>

        <Divider sx={{ mb: 2 }} />

        {/* Grid of circuit switches */}
        {appliances.length === 0 ? (
          <Box sx={{ py: 6, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {spaces.length === 0
                ? "Set up your first space to start adding appliances."
                : "No appliances configured in your household yet."}
            </Typography>
            <Button variant="contained" size="small" onClick={onOpenAddModal} startIcon={<PlusIcon />}>
              {spaces.length === 0 ? "Set Up Space & Add Appliance" : "Add First Appliance"}
            </Button>
          </Box>
        ) : (
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {appliances.map((app: UserAppliance) => {
              const isOn = app.is_currently_on;
              const totalWatts = app.watts * (app.quantity || 1);
              const appSpace = app.list_id ? spacesMap[app.list_id] : undefined;
              const effectiveRate = app.tariff_type === "commercial" ? 15.2 : 14.8261;
              const hourlyRate = ((totalWatts / 1000) * effectiveRate).toFixed(2);
              const liveSpent = getAccumulatedPesos(app);

              return (
                <Grid size={{ xs: 12, sm: 6 }} key={app.id}>
                  <Card
                    variant="outlined"
                    sx={{
                      p: { xs: 1.75, sm: 2 },
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      borderColor: isOn
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.28)" : "rgba(13, 148, 136, 0.25)")
                        : "divider",
                      bgcolor: isOn
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.05)" : "rgba(13, 148, 136, 0.04)")
                        : "transparent",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        borderColor: isOn
                          ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.45)" : "rgba(13, 148, 136, 0.4)")
                          : (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "primary.main"),
                        transform: "translateY(-1px)",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0, flexGrow: 1 }}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1,
                          bgcolor: "action.hover",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {getCategoryIcon(app.category)}
                      </Box>

                      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                          {app.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                          {totalWatts}W {appSpace ? `• ${appSpace.name}` : ""}
                        </Typography>

                        {isOn && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                            <ClockIcon sx={{ fontSize: 12, color: "success.main" }} />
                            <Typography variant="caption" sx={{ color: "success.main", fontWeight: 700, fontFamily: "monospace", fontSize: "0.6875rem" }}>
                              {getRunningDuration(app.last_turned_on_at)} (₱{liveSpent.toFixed(3)})
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, flexShrink: 0 }}>
                      <Chip
                        label={`₱${hourlyRate}/hr`}
                        size="small"
                        sx={{ fontWeight: 700, fontFamily: "monospace", height: 20, fontSize: "0.6875rem" }}
                      />

                      <Tooltip title={isOn ? "Power OFF Circuit" : "Power ON Circuit"}>
                        <IconButton
                          size="small"
                          onClick={() => togglePower(app)}
                          sx={{
                            bgcolor: isOn ? "success.main" : "action.hover",
                            color: isOn ? "#ffffff" : "text.secondary",
                            border: "1px solid",
                            borderColor: isOn ? "success.dark" : "divider",
                            "&:hover": {
                              bgcolor: isOn ? "success.dark" : "action.selected",
                              transform: "scale(1.08)",
                            },
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                          }}
                        >
                          <PowerIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Card>
  );
};

export default LivePowerBoard;
