import React, { useState, useMemo } from "react";
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
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import {
  Close as CloseIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  CalendarMonth as CalendarIcon,
  Add as PlusIcon,
  Delete as DeleteIcon,
  Bolt as BoltIcon,
  Timer as TimerIcon,
} from "@mui/icons-material";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { UserAppliance, DailyApplianceUsage, ApplianceList, ApplianceUsageLog } from "../../types";
import {
  formatDateToKey,
  splitSessionAcrossDays,
  calculateApplianceKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
} from "../../lib/dailyUsageService";
import {
  switchOnCircuit,
  switchOffCircuit,
  addManualPastSession,
  deleteSessionLog,
  getEffectiveApplianceRate,
} from "../../lib/sessionService";
import { useToast } from "../common/ToastProvider";
import { useLiveTicker, formatElapsedHms } from "../../hooks/useLiveTicker";

interface DateAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  appliances: UserAppliance[];
  events?: any[];
  initialUsageRecords?: DailyApplianceUsage[];
  spaces?: ApplianceList[];
  selectedSpaceId?: string;
  logs?: ApplianceUsageLog[];
  onUsageSaved?: () => void;
}

interface TimelineSessionBlock {
  id: string;
  logId?: string;
  rawLog?: ApplianceUsageLog;
  type: "logged_session" | "live_stopwatch";
  startHour: number;
  endHour: number;
  durationHours: number;
  kwh: number;
  cost: number;
  startTimeStr: string;
  endTimeStr: string;
}

const PIE_COLORS = [
  "#00e5c9", "#38bdf8", "#a78bfa", "#fbbf24", "#34d399",
  "#f472b6", "#f97316", "#818cf8", "#a3e635", "#e879f9",
];

export const DateAnalyticsModal: React.FC<DateAnalyticsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  appliances,
  initialUsageRecords = [],
  spaces = [],
  selectedSpaceId = "all",
  logs = [],
  onUsageSaved,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const { showSuccess, showError, showInfo } = useToast();

  const dateKey = formatDateToKey(selectedDate);
  const todayKey = formatDateToKey(new Date());
  const isToday = dateKey === todayKey;

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Filter active appliances by selected space
  const filteredAppliances = useMemo(() => {
    const list =
      selectedSpaceId === "all"
        ? appliances
        : appliances.filter((a) => a.list_id === selectedSpaceId);
    return list.filter((a) => a.is_active !== false);
  }, [appliances, selectedSpaceId]);

  // Live 1-second ticker when modal is open and today has active circuits
  const hasAnyRunningCircuit = useMemo(
    () => isToday && filteredAppliances.some((a) => a.is_currently_on),
    [isToday, filteredAppliances]
  );
  const nowTicker = useLiveTicker(isOpen && hasAnyRunningCircuit);

  // Modal State: Past Session Logging
  const [isPastModalOpen, setIsPastModalOpen] = useState(false);
  const [targetPastApp, setTargetPastApp] = useState<UserAppliance | null>(null);
  const [pastStartHour, setPastStartHour] = useState("08:00");
  const [pastEndHour, setPastEndHour] = useState("10:00");

  // Modal State: Session Inspection / Deletion
  const [inspectingSession, setInspectingSession] = useState<{
    block: TimelineSessionBlock;
    appliance: UserAppliance;
  } | null>(null);

  // Compute 24-Hour Stopwatch Activity Timeline Data
  const timelineData = useMemo(() => {
    return filteredAppliances.map((app) => {
      const sessionBlocks: TimelineSessionBlock[] = [];

      // 1. Logged/Recorded sessions from database
      (logs || []).forEach((log) => {
        if (log.appliance_id !== app.id) return;
        const start = new Date(log.started_at);
        const end = log.ended_at ? new Date(log.ended_at) : new Date(start.getTime() + (log.duration_minutes || 60) * 60000);
        const slices = splitSessionAcrossDays(start, end);
        const matchingSlice = slices.find((s) => s.dateKey === dateKey);

        if (matchingSlice && matchingSlice.hours > 0) {
          const appKwh = calculateApplianceKwh(app, matchingSlice.hours);
          const appCost = calculateCost(appKwh, getEffectiveApplianceRate(app));

          sessionBlocks.push({
            id: `log-${log.id}-${matchingSlice.startHourFrac}`,
            logId: log.id,
            rawLog: log,
            type: "logged_session",
            startHour: matchingSlice.startHourFrac,
            endHour: matchingSlice.endHourFrac,
            durationHours: matchingSlice.hours,
            kwh: appKwh,
            cost: appCost,
            startTimeStr: matchingSlice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            endTimeStr: matchingSlice.endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          });
        }
      });

      // 2. Currently Turned ON Stopwatch session (if Today)
      if (isToday && app.is_currently_on && app.last_turned_on_at) {
        const start = new Date(app.last_turned_on_at);
        const now = new Date(nowTicker);
        if (!isNaN(start.getTime()) && now > start) {
          const slices = splitSessionAcrossDays(start, now);
          const matchingSlice = slices.find((s) => s.dateKey === dateKey);

          if (matchingSlice && matchingSlice.hours > 0) {
            const appKwh = calculateApplianceKwh(app, matchingSlice.hours);
            const appCost = calculateCost(appKwh, getEffectiveApplianceRate(app));

            sessionBlocks.push({
              id: `live-${app.id}`,
              type: "live_stopwatch",
              startHour: matchingSlice.startHourFrac,
              endHour: matchingSlice.endHourFrac,
              durationHours: matchingSlice.hours,
              kwh: appKwh,
              cost: appCost,
              startTimeStr: matchingSlice.startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              endTimeStr: "Now (Live)",
            });
          }
        }
      }

      sessionBlocks.sort((a, b) => a.startHour - b.startHour);

      const totalH = sessionBlocks.reduce((acc, s) => acc + s.durationHours, 0);
      const totalK = sessionBlocks.reduce((acc, s) => acc + s.kwh, 0);
      const totalC = sessionBlocks.reduce((acc, s) => acc + s.cost, 0);

      return {
        appliance: app,
        sessions: sessionBlocks,
        totalHours: totalH,
        totalKwh: totalK,
        totalCost: totalC,
      };
    });
  }, [filteredAppliances, logs, dateKey, isToday, nowTicker]);

  // Overall Day Totals from Timeline Data
  const daySummary = useMemo(() => {
    let totKwh = 0;
    let totCost = 0;
    let runningCount = 0;

    timelineData.forEach((item) => {
      totKwh += item.totalKwh;
      totCost += item.totalCost;
      if (item.appliance.is_currently_on) runningCount++;
    });

    // Breakdown for Pie Chart
    const pieItems = timelineData
      .filter((item) => item.totalKwh > 0)
      .map((item, idx) => ({
        name: item.appliance.name,
        value: Number(item.totalKwh.toFixed(3)),
        cost: Number(item.totalCost.toFixed(2)),
        percentage: totKwh > 0 ? ((item.totalKwh / totKwh) * 100).toFixed(1) : "0",
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }));

    return {
      dayTotalCost: Number(totCost.toFixed(2)),
      dayTotalKwh: Number(totKwh.toFixed(2)),
      runningAppliancesCount: runningCount,
      pieChartData: pieItems,
    };
  }, [timelineData]);

  // Live Power Switch Toggle
  const handleTogglePower = async (app: UserAppliance) => {
    if (!isToday) {
      showInfo("Live stopwatch switches can only be operated on today's date.");
      return;
    }

    if (app.is_currently_on) {
      const res = await switchOffCircuit(app);
      if (res.success) {
        showSuccess(
          `Stopped stopwatch for ${app.name}: ${res.durationMinutes} mins (~₱${res.cost.toFixed(2)}) auto-logged to today!`,
          "Session Logged"
        );
        if (onUsageSaved) onUsageSaved();
      }
    } else {
      const res = await switchOnCircuit(app);
      if (res.success) {
        showInfo(`Started stopwatch for ${app.name}. Live tracking active.`);
        if (onUsageSaved) onUsageSaved();
      }
    }
  };

  // Open Past Session Modal
  const handleOpenPastSessionModal = (app: UserAppliance) => {
    setTargetPastApp(app);
    setIsPastModalOpen(true);
  };

  // Save Past Session
  const handleSavePastSession = async () => {
    if (!targetPastApp) return;

    const [sh, sm] = pastStartHour.split(":").map(Number);
    const [eh, em] = pastEndHour.split(":").map(Number);

    const [y, m, d] = dateKey.split("-").map(Number);
    const start = new Date(y, m - 1, d, sh, sm, 0);
    const end = new Date(y, m - 1, d, eh, em, 0);

    if (end <= start) {
      showError("End time must be after start time!");
      return;
    }

    try {
      const res = await addManualPastSession({
        appliance: targetPastApp,
        startDate: start,
        endDate: end,
      });

      showSuccess(`Added ${res.totalMinutes} min past session for ${targetPastApp.name}!`);
      setIsPastModalOpen(false);
      if (onUsageSaved) onUsageSaved();
    } catch (err: any) {
      showError(`Failed to save past session: ${err?.message}`);
    }
  };

  // Delete Session Block
  const handleDeleteSession = async () => {
    if (!inspectingSession || !inspectingSession.block.logId) return;
    const { block, appliance } = inspectingSession;
    const logId = block.logId;
    if (!logId) return;

    const start = block.rawLog?.started_at ? new Date(block.rawLog.started_at) : new Date();
    const end = block.rawLog?.ended_at ? new Date(block.rawLog.ended_at) : new Date();

    const ok = await deleteSessionLog({
      logId,
      appliance,
      durationMinutes: Math.round(block.durationHours * 60),
      startTime: start,
      endTime: end,
    });

    if (ok) {
      showSuccess(`Deleted session for ${appliance.name}.`);
      setInspectingSession(null);
      if (onUsageSaved) onUsageSaved();
    } else {
      showError("Failed to delete session log.");
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
              {isToday ? "Live Stopwatch Tracking & Actual Usage Timeline" : "Actual Measured Usage & Stopwatch Logs"}
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
          <Grid size={{ xs: 6, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                ACTUAL DAY COST
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "primary.main" }}>
                ₱{daySummary.dayTotalCost.toFixed(2)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Verified Measured Total
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 6, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                MEASURED USAGE
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "warning.main" }}>
                {daySummary.dayTotalKwh.toFixed(2)} kWh
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Cumulative Stopwatch Sum
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5, textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                CIRCUIT STATUS
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: daySummary.runningAppliancesCount > 0 ? "#34d399" : "text.secondary" }}>
                {isToday
                  ? daySummary.runningAppliancesCount > 0
                    ? `${daySummary.runningAppliancesCount} Running Active`
                    : "All Circuits Idle"
                  : "Completed Day"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {isToday ? "Real-time Telemetry" : "Historical Record"}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
            <Tab icon={<TimelineIcon fontSize="small" />} iconPosition="start" label="24-Hour Stopwatch Activity Timeline" />
            <Tab icon={<PieChartIcon fontSize="small" />} iconPosition="start" label="Actual Breakdown (Hati)" />
          </Tabs>
        </Box>

        {/* TAB 0: 24-HOUR STOPWATCH TIMELINE */}
        {activeTab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Header & Legend */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Toggle switch ON to start stopwatch. Toggling OFF auto-logs session to this day.
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "#34d399" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#34d399", fontSize: "0.6875rem" }}>
                    Live Running
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: "#818cf8" }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#818cf8", fontSize: "0.6875rem" }}>
                    Logged Session
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* 24-Hour Time Axis Labels */}
            <Box sx={{ pl: { xs: 0, sm: "240px" }, pr: 1 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                {["12 AM", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM", "12 AM"].map((label, idx) => (
                  <Typography key={idx} variant="caption" sx={{ fontSize: "0.625rem", color: "text.secondary", fontFamily: "monospace" }}>
                    {label}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Appliance Timeline Rows */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
              {timelineData.map(({ appliance, sessions, totalHours, totalCost }) => {
                const isRunning = isToday && appliance.is_currently_on;
                const runningMs = isRunning && appliance.last_turned_on_at ? Math.max(0, nowTicker - new Date(appliance.last_turned_on_at).getTime()) : 0;

                return (
                  <Paper
                    key={appliance.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      alignItems: { xs: "stretch", sm: "center" },
                      gap: 1.5,
                      borderColor: isRunning ? "#34d399" : "divider",
                      bgcolor: isRunning
                        ? (theme) => (theme.palette.mode === "dark" ? "rgba(52, 211, 153, 0.05)" : "rgba(16, 185, 129, 0.04)")
                        : "background.paper",
                    }}
                  >
                    {/* Left: Info + Live Switch */}
                    <Box sx={{ minWidth: { xs: "100%", sm: 225 }, maxWidth: { xs: "100%", sm: 225 } }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Typography noWrap variant="body2" sx={{ fontWeight: 800 }}>
                          {appliance.name}
                        </Typography>
                        {isToday ? (
                          <Switch
                            size="small"
                            checked={Boolean(isRunning)}
                            onChange={() => handleTogglePower(appliance)}
                            color="success"
                          />
                        ) : (
                          <Chip
                            label="+ Log"
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenPastSessionModal(appliance)}
                            sx={{ height: 20, fontSize: "0.625rem", cursor: "pointer" }}
                          />
                        )}
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
                        <Chip
                          label={`${appliance.watts}W`}
                          size="small"
                          sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700 }}
                        />
                        {isRunning ? (
                          <Typography variant="caption" sx={{ color: "#34d399", fontWeight: 800, fontFamily: "monospace" }}>
                            ⏱ {formatElapsedHms(runningMs)}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                            {totalHours > 0 ? `${totalHours.toFixed(1)}h (₱${totalCost.toFixed(2)})` : "No sessions"}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    {/* Right: 24-Hour Visual Track Bar */}
                    <Box
                      sx={{
                        flex: 1,
                        height: 32,
                        borderRadius: 1.5,
                        bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)"),
                        border: "1px solid",
                        borderColor: "divider",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {/* Grid Lines */}
                      {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pct) => (
                        <Box
                          key={pct}
                          sx={{
                            position: "absolute",
                            left: `${pct}%`,
                            top: 0,
                            bottom: 0,
                            width: "1px",
                            bgcolor: "rgba(255, 255, 255, 0.05)",
                            pointerEvents: "none",
                          }}
                        />
                      ))}

                      {/* Meralco Peak Window Overlays (11 AM - 4 PM & 6 PM - 9 PM) */}
                      <Box
                        sx={{
                          position: "absolute",
                          left: `${(11 / 24) * 100}%`,
                          width: `${(5 / 24) * 100}%`,
                          top: 0,
                          bottom: 0,
                          bgcolor: "rgba(245, 158, 11, 0.08)",
                          borderLeft: "1px dashed rgba(245, 158, 11, 0.2)",
                          borderRight: "1px dashed rgba(245, 158, 11, 0.2)",
                          pointerEvents: "none",
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          left: `${(18 / 24) * 100}%`,
                          width: `${(3 / 24) * 100}%`,
                          top: 0,
                          bottom: 0,
                          bgcolor: "rgba(239, 68, 68, 0.08)",
                          borderLeft: "1px dashed rgba(239, 68, 68, 0.2)",
                          borderRight: "1px dashed rgba(239, 68, 68, 0.2)",
                          pointerEvents: "none",
                        }}
                      />

                      {/* Session Blocks */}
                      {sessions.map((block) => {
                        const leftPct = Math.max(0, Math.min(100, (block.startHour / 24) * 100));
                        const widthPct = Math.max(1.5, Math.min(100 - leftPct, ((block.endHour - block.startHour) / 24) * 100));
                        const isLive = block.type === "live_stopwatch";

                        return (
                          <Tooltip
                            key={block.id}
                            title={`${block.startTimeStr} – ${block.endTimeStr} (${block.durationHours.toFixed(1)}h • ₱${block.cost.toFixed(2)})`}
                          >
                            <Box
                              onClick={() => {
                                if (block.logId) {
                                  setInspectingSession({ block, appliance });
                                }
                              }}
                              sx={{
                                position: "absolute",
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                top: 3,
                                bottom: 3,
                                borderRadius: 1,
                                bgcolor: isLive ? "#34d399" : "#6366f1",
                                cursor: block.logId ? "pointer" : "default",
                                transition: "all 0.15s",
                                "&:hover": {
                                  filter: "brightness(1.15)",
                                },
                              }}
                            />
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}

        {/* TAB 1: ACTUAL BREAKDOWN (HATI) PIE */}
        {activeTab === 1 && (
          <Box sx={{ minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {daySummary.pieChartData.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No measured stopwatch usage recorded on this day.
              </Typography>
            ) : (
              <Grid container spacing={2} sx={{ alignItems: "center" }}>
                <Grid size={{ xs: 12, sm: 6 }} sx={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={daySummary.pieChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {daySummary.pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Box sx={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                    {daySummary.pieChartData.map((d) => (
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

      <DialogActions sx={{ p: 2, px: 3 }}>
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 1.25, fontWeight: 700 }}>
          Close
        </Button>
      </DialogActions>

      {/* SUB-MODAL 1: Add Past Session */}
      <Dialog open={isPastModalOpen} onClose={() => setIsPastModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1rem" }}>
          Log Past Session: {targetPastApp?.name}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Add a completed session if you forgot to start the stopwatch.
          </Typography>
          <TextField
            label="Start Time"
            type="time"
            size="small"
            value={pastStartHour}
            onChange={(e) => setPastStartHour(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            label="End Time"
            type="time"
            size="small"
            value={pastEndHour}
            onChange={(e) => setPastEndHour(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsPastModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSavePastSession}>Save Session</Button>
        </DialogActions>
      </Dialog>

      {/* SUB-MODAL 2: Inspect / Delete Session Block */}
      <Dialog open={Boolean(inspectingSession)} onClose={() => setInspectingSession(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: "1rem" }}>
          Session: {inspectingSession?.appliance.name}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Time: {inspectingSession?.block.startTimeStr} – {inspectingSession?.block.endTimeStr}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Duration: {inspectingSession?.block.durationHours.toFixed(2)} hrs
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Consumed: {inspectingSession?.block.kwh.toFixed(3)} kWh (~₱{inspectingSession?.block.cost.toFixed(2)})
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          <Button color="error" startIcon={<DeleteIcon />} onClick={handleDeleteSession}>
            Delete Session
          </Button>
          <Button onClick={() => setInspectingSession(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DateAnalyticsModal;
