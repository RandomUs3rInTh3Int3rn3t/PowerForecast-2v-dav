import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import {
  Timeline as TimelineIcon,
  FlashOn as FlashOnIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon,
  Timer as TimerIcon,
  Tune as TuneIcon,
  Delete as TrashIcon,
} from "@mui/icons-material";
import { useList, useDelete } from "@refinedev/core";
import { UserAppliance, ApplianceUsageLog, DailyApplianceUsage } from "../../types";
import {
  formatDateToKey,
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  splitSessionAcrossDays,
  deductSessionDailyUsage,
  accumulateLiveSessionDailyUsage,
} from "../../lib/dailyUsageService";
import { supabaseClient } from "../../lib/supabaseClient";
import { useToast } from "../common/ToastProvider";

interface TodayActivityTimelineProps {
  appliances: UserAppliance[];
}

interface TimelineSessionBlock {
  id: string;
  logId?: string;
  rawLog?: ApplianceUsageLog;
  type: "live_active" | "live_stopwatch" | "logged_session";
  startHour: number;
  endHour: number;
  durationHours: number;
  kwh: number;
  cost: number;
  startTimeStr: string;
  endTimeStr: string;
}

export const TodayActivityTimeline: React.FC<TodayActivityTimelineProps> = ({ appliances }) => {
  const [, setLiveTick] = useState(0);
  const { showSuccess, showInfo, showError } = useToast();
  const { mutate: deleteLog } = useDelete();

  // Block Inspector State
  const [selectedBlockForAction, setSelectedBlockForAction] = useState<{
    block: TimelineSessionBlock;
    appliance: UserAppliance;
  } | null>(null);
  const [isEditingBlockRange, setIsEditingBlockRange] = useState(false);
  const [blockEditStartDateTime, setBlockEditStartDateTime] = useState("");
  const [blockEditEndDateTime, setBlockEditEndDateTime] = useState("");
  const [isSavingBlockAction, setIsSavingBlockAction] = useState(false);

  const todayKey = formatDateToKey(new Date());

  const logsRes = useList<ApplianceUsageLog>({
    resource: "appliance_usage_logs",
    pagination: { pageSize: 500 },
  }) as any;

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    filters: [{ field: "usage_date", operator: "eq", value: todayKey }],
  }) as any;

  const logs: ApplianceUsageLog[] = logsRes?.data?.data || logsRes?.result?.data || [];
  const dailyUsage: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];

  const hasActiveCircuit = appliances.some((a) => a.is_currently_on && a.last_turned_on_at);

  // Live real-time 1-second ticker when circuits are actively drawing power today
  useEffect(() => {
    if (!hasActiveCircuit) return;
    const interval = setInterval(() => {
      setLiveTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasActiveCircuit]);

  // Refetch on session sync / rollover
  useEffect(() => {
    const handleRollover = () => {
      if (logsRes?.refetch) logsRes.refetch();
      if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
    };
    window.addEventListener("powerforecast_session_sync", handleRollover);
    window.addEventListener("powerforecast_stopwatch_rollover", handleRollover);
    window.addEventListener("powerforecast_circuit_toggled", handleRollover);
    return () => {
      window.removeEventListener("powerforecast_session_sync", handleRollover);
      window.removeEventListener("powerforecast_stopwatch_rollover", handleRollover);
      window.removeEventListener("powerforecast_circuit_toggled", handleRollover);
    };
  }, [logsRes, dailyUsageRes]);

  const handleBlockClick = (block: TimelineSessionBlock, appliance: UserAppliance) => {
    setSelectedBlockForAction({ block, appliance });
    setIsEditingBlockRange(false);

    if (block.rawLog) {
      const s = new Date(block.rawLog.started_at);
      const e = block.rawLog.ended_at
        ? new Date(block.rawLog.ended_at)
        : new Date(s.getTime() + (block.rawLog.duration_minutes || 60) * 60000);

      const sIso = `${formatDateToKey(s)}T${String(s.getHours()).padStart(2, "0")}:${String(s.getMinutes()).padStart(2, "0")}`;
      const eIso = `${formatDateToKey(e)}T${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`;

      setBlockEditStartDateTime(sIso);
      setBlockEditEndDateTime(eIso);
    }
  };

  const handleDeleteBlockSession = async () => {
    if (!selectedBlockForAction) return;
    const { block, appliance } = selectedBlockForAction;

    if (block.logId && block.rawLog) {
      try {
        await deductSessionDailyUsage({
          appliance_id: appliance.id,
          durationMinutes: block.rawLog.duration_minutes || 60,
          watts: appliance.watts,
          quantity: appliance.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: appliance.user_id || null,
          startTime: new Date(block.rawLog.started_at),
          endTime: block.rawLog.ended_at ? new Date(block.rawLog.ended_at) : new Date(new Date(block.rawLog.started_at).getTime() + (block.rawLog.duration_minutes || 60) * 60000),
        });

        deleteLog(
          {
            resource: "appliance_usage_logs",
            id: block.logId,
          },
          {
            onSuccess: () => {
              showInfo("Session log removed and daily usage updated.");
              if (logsRes?.refetch) logsRes.refetch();
              if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
              setSelectedBlockForAction(null);
            },
          }
        );
      } catch (err: any) {
        showError(`Failed to delete session: ${err?.message}`);
      }
    }
  };

  const handleSaveBlockEdit = async () => {
    if (!selectedBlockForAction) return;
    const { block, appliance } = selectedBlockForAction;
    const start = new Date(blockEditStartDateTime);
    const end = new Date(blockEditEndDateTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      showError("Please enter a valid start and end time (end must be after start).");
      return;
    }

    const durationMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
    const kwh = calculateKwh(appliance.watts, durationMinutes / 60, appliance.quantity || 1);
    const cost = calculateCost(kwh, DEFAULT_EFFECTIVE_RATE);

    setIsSavingBlockAction(true);
    try {
      if (block.logId && block.rawLog) {
        const oldMinutes = block.rawLog.duration_minutes || 60;
        const oldStart = new Date(block.rawLog.started_at);
        const oldEnd = block.rawLog.ended_at
          ? new Date(block.rawLog.ended_at)
          : new Date(oldStart.getTime() + oldMinutes * 60000);

        await deductSessionDailyUsage({
          appliance_id: appliance.id,
          durationMinutes: oldMinutes,
          watts: appliance.watts,
          quantity: appliance.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: appliance.user_id || null,
          startTime: oldStart,
          endTime: oldEnd,
        });

        await supabaseClient
          .from("appliance_usage_logs")
          .update({
            started_at: start.toISOString(),
            ended_at: end.toISOString(),
            duration_minutes: durationMinutes,
            kwh_consumed: kwh,
            estimated_cost: cost,
          })
          .eq("id", block.logId);

        await accumulateLiveSessionDailyUsage({
          appliance_id: appliance.id,
          durationMinutes,
          watts: appliance.watts,
          quantity: appliance.quantity || 1,
          effectiveRate: DEFAULT_EFFECTIVE_RATE,
          user_id: appliance.user_id || null,
          startTime: start,
          endTime: end,
        });

        showSuccess(`Updated session for ${appliance.name} (${(durationMinutes / 60).toFixed(1)} hrs)!`);
      }

      if (logsRes?.refetch) logsRes.refetch();
      if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
      setSelectedBlockForAction(null);
    } catch (err: any) {
      showError(`Failed to save session edit: ${err?.message}`);
    } finally {
      setIsSavingBlockAction(false);
    }
  };

  // Compute 24-hour pure activity session blocks for each appliance today
  const timelineData = useMemo(() => {
    return appliances.map((app) => {
      const sessionBlocks: TimelineSessionBlock[] = [];

      // 1. Logged Activity Sessions for Today (using splitSessionAcrossDays for exact midnight slices)
      (logs || []).forEach((log) => {
        if (log.appliance_id !== app.id) return;
        const start = new Date(log.started_at);
        const end = log.ended_at ? new Date(log.ended_at) : new Date(start.getTime() + (log.duration_minutes || 60) * 60000);
        const slices = splitSessionAcrossDays(start, end);
        const matchingSlice = slices.find((s) => s.dateKey === todayKey);

        if (matchingSlice) {
          const sliceKwh = calculateKwh(app.watts, matchingSlice.hours, app.quantity || 1);
          const sliceCost = calculateCost(sliceKwh, DEFAULT_EFFECTIVE_RATE);

          sessionBlocks.push({
            id: `${log.id}-${matchingSlice.dateKey}`,
            logId: log.id,
            rawLog: log,
            type: "logged_session",
            startHour: matchingSlice.startHourFrac,
            endHour: matchingSlice.endHourFrac,
            durationHours: matchingSlice.hours,
            kwh: sliceKwh,
            cost: sliceCost,
            startTimeStr: matchingSlice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            endTimeStr: matchingSlice.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }
      });

      // 2. Currently Running Active Circuit
      if (app.is_currently_on && app.last_turned_on_at) {
        const start = new Date(app.last_turned_on_at);
        const now = new Date();
        const slices = splitSessionAcrossDays(start, now);
        const matchingSlice = slices.find((s) => s.dateKey === todayKey);

        if (matchingSlice) {
          const liveKwh = calculateKwh(app.watts, matchingSlice.hours, app.quantity || 1);
          const liveCost = calculateCost(liveKwh, DEFAULT_EFFECTIVE_RATE);

          sessionBlocks.push({
            id: `live-${app.id}`,
            type: "live_active",
            startHour: matchingSlice.startHourFrac,
            endHour: matchingSlice.endHourFrac,
            durationHours: matchingSlice.hours,
            kwh: liveKwh,
            cost: liveCost,
            startTimeStr: matchingSlice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            endTimeStr: "LIVE ACTIVE",
          });
        }
      }

      // Sort session blocks chronologically
      sessionBlocks.sort((a, b) => a.startHour - b.startHour);

      const totalDayHours = Math.min(
        24,
        sessionBlocks.reduce((acc, curr) => acc + curr.durationHours, 0)
      );

      const dayRecord = dailyUsage.find((d) => d.appliance_id === app.id);
      const totalLoggedHours = Number(dayRecord?.hours_used) || totalDayHours;

      return {
        app,
        sessionBlocks,
        totalDayHours,
        totalLoggedHours,
      };
    });
  }, [appliances, logs, dailyUsage, todayKey]);

  // Peak simultaneous wattage demand
  const peakDemand = useMemo(() => {
    let maxWatts = 0;
    for (let h = 0; h < 24; h += 0.5) {
      let currentDraw = 0;
      timelineData.forEach(({ app, sessionBlocks }) => {
        const isActive = sessionBlocks.some((b) => h >= b.startHour && h <= b.endHour);
        if (isActive) {
          currentDraw += app.watts * (app.quantity || 1);
        }
      });
      if (currentDraw > maxWatts) maxWatts = currentDraw;
    }
    return maxWatts;
  }, [timelineData]);

  const activeLiveCount = appliances.filter((a) => a.is_currently_on).length;

  return (
    <Card
      sx={{
        p: { xs: 2.5, sm: 3 },
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: (theme) =>
          activeLiveCount > 0
            ? theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.2)"
            : theme.palette.mode === "dark"
            ? "rgba(255, 255, 255, 0.06)"
            : "#e2e8f0",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.85)" : "#ffffff",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 4px 20px rgba(0, 0, 0, 0.4)"
            : "0 2px 12px rgba(15, 23, 42, 0.04)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 1,
              bgcolor: activeLiveCount > 0 ? "rgba(0, 229, 201, 0.15)" : "rgba(0, 229, 201, 0.1)",
              color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <TimelineIcon fontSize="small" />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                Today's 24-Hour Activity & Load Timeline
              </Typography>
              {activeLiveCount > 0 && (
                <Chip
                  icon={<FlashOnIcon sx={{ fontSize: "13px !important", color: "primary.contrastText !important" }} />}
                  label={`${activeLiveCount} Live Active`}
                  size="small"
                  sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 800, bgcolor: "primary.main", color: "primary.contrastText" }}
                />
              )}
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Real-time active circuits and logged daily activity sessions (00:00 – 24:00) with second-by-second live updates
            </Typography>
          </Box>
        </Box>

        {/* Legend & Smart Calendar Link */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  boxShadow: (theme) => `0 0 6px ${theme.palette.primary.main}`,
                }}
              />
              <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary", fontWeight: 700 }}>
                Active Live Circuit
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#009e88" }} />
              <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary", fontWeight: 700 }}>
                Logged Activity Session
              </Typography>
            </Box>
          </Box>

          <Button
            component={Link}
            to="/calendar"
            size="small"
            variant="outlined"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            sx={{ borderRadius: 1, fontWeight: 700, fontSize: "0.75rem", py: 0.5 }}
          >
            Calendar Details
          </Button>
        </Box>
      </Box>

      {/* 24-Hour Time Axis Labels */}
      <Box sx={{ display: "flex", justifyContent: "space-between", pl: { xs: 15, sm: 22 }, pr: 1, mb: 1 }}>
        {["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "12 AM"].map((time, idx) => (
          <Typography key={idx} variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary", fontWeight: 700 }}>
            {time}
          </Typography>
        ))}
      </Box>

      {/* Appliances Gantt Rows */}
      {timelineData.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 1.25 }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            No appliances configured yet.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {timelineData.map(({ app, sessionBlocks, totalDayHours }) => {
            const targetHours = Number(app.hours_per_day) || 0;

            return (
              <Box
                key={app.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: 1.25,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.02)" : "#f8fafc",
                  border: "1px solid",
                  borderColor: (theme) =>
                    app.is_currently_on
                      ? "rgba(52, 211, 153, 0.4)"
                      : theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "#e2e8f0",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.04)" : "#f1f5f9",
                  },
                  transition: "all 0.2s ease",
                }}
              >
                {/* Appliance Label Column */}
                <Box sx={{ width: { xs: 110, sm: 160 }, minWidth: { xs: 110, sm: 160 } }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.75rem" }} noWrap>
                    {app.name}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 0.25, flexWrap: "wrap" }}>
                    <Chip
                      label={`${app.watts}W`}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: "0.5625rem",
                        fontWeight: 800,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                        color: (theme) => (theme.palette.mode === "dark" ? "primary.main" : "#0d9488"),
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem", fontWeight: 700 }}>
                      {totalDayHours > 0 ? `${totalDayHours.toFixed(1)}h metered` : targetHours > 0 ? `${targetHours}h target` : "On-Demand"}
                    </Typography>
                  </Box>
                </Box>

                {/* 24-Hour Gantt Track */}
                <Box
                  sx={{
                    flexGrow: 1,
                    height: 26,
                    borderRadius: 1,
                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#f1f5f9"),
                    border: "1px solid",
                    borderColor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* 3-hour grid dividing lines */}
                  {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pct) => (
                    <Box
                      key={pct}
                      sx={{
                        position: "absolute",
                        left: `${pct}%`,
                        top: 0,
                        bottom: 0,
                        width: "1px",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)",
                      }}
                    />
                  ))}

                  {/* Empty state for track */}
                  {sessionBlocks.length === 0 && (
                    <Box sx={{ height: "100%", display: "flex", alignItems: "center", px: 2 }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", opacity: 0.35, fontSize: "0.625rem" }}>
                        No activity sessions
                      </Typography>
                    </Box>
                  )}

                  {/* Session Blocks */}
                  {sessionBlocks.map((block) => {
                    const leftPct = (block.startHour / 24) * 100;
                    const widthPct = Math.max(1.5, ((block.endHour - block.startHour) / 24) * 100);

                    const isLive = block.type === "live_active" || block.type === "live_stopwatch";

                    const bgGradient =
                      isLive
                        ? "linear-gradient(90deg, #00e5c9 0%, #26c6da 100%)"
                        : "linear-gradient(90deg, #009e88 0%, #00e5c9 100%)";

                    const glowColor =
                      isLive
                        ? "0 0 10px rgba(0, 229, 201, 0.6)"
                        : "0 0 8px rgba(0, 158, 136, 0.4)";

                    return (
                      <Tooltip
                        key={block.id}
                        arrow
                        title={
                          <Box sx={{ p: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#fff" }}>
                              {app.name} ({isLive ? "Live Active Circuit" : "Logged Activity Session (Click to Edit / Delete)"})
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                              {block.startTimeStr} – {block.endTimeStr} ({block.durationHours.toFixed(2)} hrs)
                            </Typography>
                            <Typography variant="caption" sx={{ display: "block", color: "#ffd54f", fontWeight: 800, mt: 0.5 }}>
                              {block.kwh.toFixed(3)} kWh • ₱{block.cost.toFixed(2)}
                            </Typography>
                            {block.type === "logged_session" && (
                              <Typography variant="caption" sx={{ display: "block", color: "primary.light", fontWeight: 800, mt: 0.5 }}>
                                Click block to inspect / edit / delete
                              </Typography>
                            )}
                          </Box>
                        }
                      >
                        <Box
                          onClick={() => handleBlockClick(block, app)}
                          sx={{
                            position: "absolute",
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            top: 2,
                            bottom: 2,
                            borderRadius: 1.5,
                            background: bgGradient,
                            boxShadow: glowColor,
                            cursor: block.type === "logged_session" ? "pointer" : "default",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              transform: "scaleY(1.15)",
                              zIndex: 10,
                              boxShadow: "0 0 14px rgba(255, 255, 255, 0.6)",
                            },
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Footer Demand Indicator */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, pt: 1.5, borderTop: "1px solid rgba(255, 255, 255, 0.05)", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Peak Live Demand: <strong style={{ color: "#ffd54f" }}>{peakDemand} W</strong> (₱{((peakDemand / 1000) * DEFAULT_EFFECTIVE_RATE).toFixed(2)}/hr rate)
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
          Active circuit sessions automatically update live energy costs and calculate real-time concurrency.
        </Typography>
      </Box>

      {/* Interactive Timeline Block Inspector & Editor Dialog */}
      {selectedBlockForAction && (
        <Dialog
          open={Boolean(selectedBlockForAction)}
          onClose={() => {
            setSelectedBlockForAction(null);
            setIsEditingBlockRange(false);
          }}
          fullWidth
          maxWidth="sm"
          slotProps={{
            paper: {
              sx: {
                borderRadius: 1.5,
                bgcolor: "background.paper",
                border: (theme) =>
                  theme.palette.mode === "dark"
                    ? "1px solid rgba(0, 229, 201, 0.35)"
                    : "1px solid rgba(13, 148, 136, 0.25)",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark" ? "0 24px 64px rgba(0, 0, 0, 0.6)" : "0 12px 32px rgba(0, 0, 0, 0.12)",
                color: "text.primary",
                p: 1,
              },
            },
          }}
        >
          <DialogTitle sx={{ pb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 1,
                  bgcolor: (selectedBlockForAction.block.type === "live_active" || selectedBlockForAction.block.type === "live_stopwatch") ? "rgba(0, 229, 201, 0.2)" : "rgba(0, 229, 201, 0.15)",
                  color: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TimerIcon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                  {selectedBlockForAction.appliance.name}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {selectedBlockForAction.appliance.watts}W • {(selectedBlockForAction.block.type === "live_active" || selectedBlockForAction.block.type === "live_stopwatch") ? "Active Live Circuit" : "Timestamped Activity Log"}
                </Typography>
              </Box>
            </Box>
            <IconButton size="small" onClick={() => setSelectedBlockForAction(null)}>
              <CloseIcon sx={{ color: "text.secondary" }} />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1.5 }}>
            {/* Metrics Card */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 1.25,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "action.hover"),
                borderColor: "divider",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 1.5,
                textAlign: "center",
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>DURATION</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main" }}>
                  {selectedBlockForAction.block.durationHours >= 1 ? `${selectedBlockForAction.block.durationHours.toFixed(1)} hrs` : `${Math.round(selectedBlockForAction.block.durationHours * 60)} mins`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>ENERGY</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "secondary.main" }}>
                  {selectedBlockForAction.block.kwh.toFixed(3)} kWh
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>EST. COST</Typography>
                <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main" }}>
                  ₱{selectedBlockForAction.block.cost.toFixed(2)}
                </Typography>
              </Box>
            </Paper>

            {/* Time Range Info or Edit Form */}
            {!isEditingBlockRange ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.25,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.06)" : "rgba(13, 148, 136, 0.06)",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.2)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800 }}>ACTIVE TIME WINDOW</Typography>
                  {selectedBlockForAction.block.type !== "live_active" && selectedBlockForAction.block.type !== "live_stopwatch" && (
                    <Button
                      size="small"
                      startIcon={<TuneIcon sx={{ fontSize: 15 }} />}
                      onClick={() => setIsEditingBlockRange(true)}
                      sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.75rem" }}
                    >
                      Edit Time Range
                    </Button>
                  )}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                  {selectedBlockForAction.block.startTimeStr} ➔ {selectedBlockForAction.block.endTimeStr}
                </Typography>
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.25,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.08)",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main" }}>
                  Adjust Start & End Timestamps
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                  <TextField
                    type="datetime-local"
                    label="Session Start Time"
                    value={blockEditStartDateTime}
                    onChange={(e) => setBlockEditStartDateTime(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    type="datetime-local"
                    label="Session End Time"
                    value={blockEditEndDateTime}
                    onChange={(e) => setBlockEditEndDateTime(e.target.value)}
                    size="small"
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Box>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                  <Button size="small" onClick={() => setIsEditingBlockRange(false)} disabled={isSavingBlockAction}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleSaveBlockEdit}
                    disabled={isSavingBlockAction}
                    sx={{ fontWeight: 800 }}
                  >
                    {isSavingBlockAction ? "Saving..." : "Save Time Window"}
                  </Button>
                </Box>
              </Paper>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2, pt: 1, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            {selectedBlockForAction.block.type === "logged_session" && selectedBlockForAction.block.logId ? (
              <Button
                color="error"
                variant="outlined"
                startIcon={<TrashIcon />}
                onClick={handleDeleteBlockSession}
                disabled={isSavingBlockAction}
                sx={{ borderRadius: 1, fontWeight: 800 }}
              >
                Delete Session Log
              </Button>
            ) : <Box />}

            <Button
              variant="outlined"
              onClick={() => setSelectedBlockForAction(null)}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Card>
  );
};

export default TodayActivityTimeline;
