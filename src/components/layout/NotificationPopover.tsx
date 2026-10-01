import React from "react";
import Popover from "@mui/material/Popover";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import {
  NotificationsActive as NotificationsActiveIcon,
  Timer as TimerIcon,
  AccountBalanceWallet as BudgetIcon,
  CalendarMonth as CalendarIcon,
  Bolt as BoltIcon,
  VolumeUp as SoundIcon,
  Vibration as VibrationIcon,
  FlashOn as SurgeIcon,
  Shield as ShieldIcon,
  Speed as SpeedIcon,
  CloudDone as CloudDoneIcon,
  Sensors as SensorsIcon,
  MobileFriendly as DeviceIcon,
} from "@mui/icons-material";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationLevel } from "../../lib/notificationService";
import {
  isPushSupported,
  getPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  sendTestBackgroundPush,
} from "../../lib/pushNotificationService";

interface NotificationPopoverProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
}

const LEVEL_CONFIG: Record<
  NotificationLevel,
  { label: string; sub: string; color: string; bg: string; border: string }
> = {
  relaxed: {
    label: "Relaxed (L1)",
    sub: "Passive & silent; high thresholds only (6h timer, 90% budget)",
    color: "#60a5fa",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.35)",
  },
  standard: {
    label: "Standard (L2)",
    sub: "Balanced household tracking (4h timer, 80% budget, peak hours)",
    color: "#00e5c9",
    bg: "rgba(0, 229, 201, 0.12)",
    border: "rgba(0, 229, 201, 0.35)",
  },
  proactive: {
    label: "Proactive (L3)",
    sub: "Energy saver; 2h timer, 70% budget, >2.5kW surge, chimes & haptics",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
  },
  strict: {
    label: "Strict (L4)",
    sub: "Maximum vigilance; 1h timer, 50% budget, >2.0kW surge, urgent alarms",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.15)",
    border: "rgba(239, 68, 68, 0.4)",
  },
};

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ anchorEl, onClose }) => {
  const {
    permission,
    isSupported,
    prefs,
    setLevel,
    requestPermission,
    updatePrefs,
    testNotification,
    previewSound,
    previewVibration,
  } = useNotifications();

  const open = Boolean(anchorEl);
  const currentLevelConfig = LEVEL_CONFIG[prefs.notificationLevel || "standard"];

  const [isPushSubscribed, setIsPushSubscribed] = React.useState(false);
  const [isPushLoading, setIsPushLoading] = React.useState(false);
  const [pushCountdown, setPushCountdown] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open && isPushSupported()) {
      getPushSubscription().then((sub) => {
        setIsPushSubscribed(Boolean(sub));
      });
    }
  }, [open]);

  const handleTogglePush = async () => {
    setIsPushLoading(true);
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush();
        setIsPushSubscribed(false);
      } else {
        const res = await subscribeToPush();
        if (res.success) {
          setIsPushSubscribed(true);
        }
      }
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleTestBackgroundPush = async () => {
    setPushCountdown(5);
    sendTestBackgroundPush({ delaySeconds: 5 }).catch(() => {});
    const interval = setInterval(() => {
      setPushCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "calc(100vw - 24px)", sm: 380 },
            maxHeight: "85vh",
            p: 2.5,
            borderRadius: 1.5,
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "divider",
            boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
            overflowY: "auto",
          },
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsActiveIcon sx={{ color: currentLevelConfig.color, fontSize: 22 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
            Smart Energy Alerts
          </Typography>
        </Box>
        <Chip
          label={permission === "granted" ? "Active" : permission === "denied" ? "Blocked" : "Needs Permission"}
          size="small"
          color={permission === "granted" ? "success" : permission === "denied" ? "error" : "warning"}
          sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
        />
      </Box>

      {!isSupported && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 1, fontSize: "0.75rem" }}>
          Web Notifications are not supported in this browser environment.
        </Alert>
      )}

      {isSupported && permission === "default" && (
        <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.25, bgcolor: "rgba(0, 229, 201, 0.08)", border: "1px solid rgba(0, 229, 201, 0.25)" }}>
          <Typography variant="caption" sx={{ color: "text.primary", display: "block", mb: 1 }}>
            Allow browser alerts to receive active circuit extended runtime warnings, surge spikes, and schedule reminders.
          </Typography>
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={requestPermission}
            sx={{ fontWeight: 800, borderRadius: 1 }}
          >
            Enable Browser Alerts
          </Button>
        </Box>
      )}

      {isSupported && permission === "denied" && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1.25, fontSize: "0.75rem" }}>
          Notifications are blocked in your browser settings. Please allow notifications for this site to receive smart alerts.
        </Alert>
      )}

      {/* Master Switch & Active Level Badge */}
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          mb: 1.5,
          borderRadius: 1.25,
          bgcolor: currentLevelConfig.bg,
          borderColor: currentLevelConfig.border,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShieldIcon sx={{ fontSize: 18, color: currentLevelConfig.color }} />
            <Typography variant="body2" sx={{ fontWeight: 800, color: "text.primary" }}>
              Alert Sensitivity Level
            </Typography>
          </Box>
          <Chip
            label={currentLevelConfig.label}
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: "0.6875rem",
              bgcolor: currentLevelConfig.color,
              color: "#000",
            }}
          />
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", lineHeight: 1.2 }}>
          {currentLevelConfig.sub}
        </Typography>

        {/* 4-Tier Level Selector Bar */}
        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
          {(["relaxed", "standard", "proactive", "strict"] as NotificationLevel[]).map((lvl) => {
            const isSelected = (prefs.notificationLevel || "standard") === lvl;
            const cfg = LEVEL_CONFIG[lvl];
            return (
              <Button
                key={lvl}
                size="small"
                onClick={() => setLevel(lvl)}
                sx={{
                  flex: 1,
                  py: 0.4,
                  px: 0.5,
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  borderRadius: 1,
                  textTransform: "none",
                  bgcolor: isSelected ? cfg.color : "rgba(255, 255, 255, 0.05)",
                  color: isSelected ? "#000" : "text.secondary",
                  border: "1px solid",
                  borderColor: isSelected ? cfg.color : "rgba(255, 255, 255, 0.08)",
                  "&:hover": {
                    bgcolor: isSelected ? cfg.color : "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                {lvl === "relaxed" ? "Relaxed" : lvl === "standard" ? "Standard" : lvl === "proactive" ? "Proactive" : "Strict"}
              </Button>
            );
          })}
        </Box>
      </Paper>

      <Stack spacing={1.25}>
        {/* Master Switch */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Master Notifications
          </Typography>
          <Switch
            checked={prefs.enabled}
            onChange={(e) => updatePrefs({ enabled: e.target.checked })}
            color="primary"
            size="small"
          />
        </Box>

        <Divider />

        {/* Sound & Mobile Haptics Toggles */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SoundIcon sx={{ fontSize: 18, color: "primary.light" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Synthesized Audio Chimes
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="Preview Audio Chime">
                <Button
                  size="small"
                  onClick={() => previewSound(prefs.notificationLevel === "strict" ? "urgent" : "chime")}
                  sx={{ minWidth: "auto", px: 1, py: 0.2, fontSize: "0.65rem", fontWeight: 700 }}
                >
                  Play
                </Button>
              </Tooltip>
              <Switch
                checked={prefs.soundEnabled}
                disabled={!prefs.enabled}
                onChange={(e) => updatePrefs({ soundEnabled: e.target.checked })}
                size="small"
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <VibrationIcon sx={{ fontSize: 18, color: "#a855f7" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Mobile Haptic Vibration
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="Test Vibration Pattern">
                <Button
                  size="small"
                  onClick={() => previewVibration(prefs.notificationLevel === "strict" ? "critical" : "high")}
                  sx={{ minWidth: "auto", px: 1, py: 0.2, fontSize: "0.65rem", fontWeight: 700 }}
                >
                  Vibrate
                </Button>
              </Tooltip>
              <Switch
                checked={prefs.vibrationEnabled}
                disabled={!prefs.enabled}
                onChange={(e) => updatePrefs({ vibrationEnabled: e.target.checked })}
                size="small"
              />
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Live Power Load Surge Spike Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SurgeIcon sx={{ fontSize: 18, color: "#f87171" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Live Load Surge Alert
              </Typography>
            </Box>
            <Switch
              checked={prefs.surgeAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ surgeAlert: e.target.checked })}
              size="small"
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, pl: 3.25 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Alert if concurrent draw exceeds:
            </Typography>
            <TextField
              type="number"
              size="small"
              disabled={!prefs.enabled || !prefs.surgeAlert}
              value={prefs.surgeThresholdWatts || 2500}
              onChange={(e) =>
                updatePrefs({ surgeThresholdWatts: Math.max(500, parseInt(e.target.value) || 2500) })
              }
              sx={{ width: 68, "& input": { py: 0.25, px: 1, fontSize: "0.75rem", textAlign: "center" } }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Watts
            </Typography>
          </Box>
        </Box>

        {/* Extended Runtime Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TimerIcon sx={{ fontSize: 18, color: "warning.main" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Extended Runtime Alert
              </Typography>
            </Box>
            <Switch
              checked={prefs.runtimeAlert ?? prefs.stopwatchAlert ?? true}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ runtimeAlert: e.target.checked, stopwatchAlert: e.target.checked })}
              size="small"
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, pl: 3.25 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Alert after:
            </Typography>
            <TextField
              type="number"
              size="small"
              disabled={!prefs.enabled || !(prefs.runtimeAlert ?? prefs.stopwatchAlert ?? true)}
              value={prefs.runtimeThresholdHours ?? prefs.stopwatchThresholdHours ?? 4}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value) || 4);
                updatePrefs({ runtimeThresholdHours: val, stopwatchThresholdHours: val });
              }}
              sx={{ width: 60, "& input": { py: 0.25, px: 1, fontSize: "0.75rem", textAlign: "center" } }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              hours
            </Typography>
          </Box>
        </Box>

        {/* Budget Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BudgetIcon sx={{ fontSize: 18, color: "#34d399" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Budget Milestones (Multi-Tier)
              </Typography>
            </Box>
            <Switch
              checked={prefs.budgetAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ budgetAlert: e.target.checked })}
              size="small"
            />
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, pl: 3.25 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Base threshold:
            </Typography>
            <TextField
              type="number"
              size="small"
              disabled={!prefs.enabled || !prefs.budgetAlert}
              value={prefs.budgetThresholdPercent}
              onChange={(e) =>
                updatePrefs({ budgetThresholdPercent: Math.max(30, Math.min(100, parseInt(e.target.value) || 80)) })
              }
              sx={{ width: 60, "& input": { py: 0.25, px: 1, fontSize: "0.75rem", textAlign: "center" } }}
            />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              % of target budget
            </Typography>
          </Box>
        </Box>

        {/* Schedule Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CalendarIcon sx={{ fontSize: 18, color: "#818cf8" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Schedule Reminders (5m before)
              </Typography>
            </Box>
            <Switch
              checked={prefs.scheduleAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ scheduleAlert: e.target.checked })}
              size="small"
            />
          </Box>
        </Box>

        {/* Peak Hours Alert */}
        <Box sx={{ opacity: prefs.enabled ? 1 : 0.4, transition: "opacity 0.2s" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BoltIcon sx={{ fontSize: 18, color: "#ffd54f" }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Meralco Peak Hours Warning
              </Typography>
            </Box>
            <Switch
              checked={prefs.peakHourAlert}
              disabled={!prefs.enabled}
              onChange={(e) => updatePrefs({ peakHourAlert: e.target.checked })}
              size="small"
            />
          </Box>
        </Box>
      </Stack>

      {/* Background Web Push Notification Channel (Windows Action Center / Mobile Tray) */}
      {isPushSupported() && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mt: 2,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.05)" : "rgba(13, 148, 136, 0.04)",
            borderColor: isPushSubscribed ? "primary.main" : "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CloudDoneIcon sx={{ fontSize: 18, color: isPushSubscribed ? "primary.main" : "text.secondary" }} />
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                Background Web Push (OS / PWA)
              </Typography>
            </Box>
            <Switch
              size="small"
              checked={isPushSubscribed}
              disabled={isPushLoading}
              onChange={handleTogglePush}
            />
          </Box>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.25 }}>
            Receives alerts directly in Windows Action Center or mobile tray even when this app/browser is completely closed.
          </Typography>

          {pushCountdown !== null ? (
            <Alert severity="info" sx={{ py: 0.5, px: 1, fontSize: "0.72rem", borderRadius: 1 }}>
              Dispatched to cloud! Close browser or PWA window right now! Arriving in {pushCountdown}s...
            </Alert>
          ) : (
            <Button
              size="small"
              variant="outlined"
              fullWidth
              disabled={!isPushSubscribed}
              onClick={handleTestBackgroundPush}
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "none",
                borderRadius: 1,
                py: 0.35,
              }}
            >
              Test Closed-App Push (5s Countdown)
            </Button>
          )}
        </Paper>
      )}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Button
          size="small"
          variant="outlined"
          onClick={testNotification}
          disabled={permission !== "granted"}
          sx={{ borderRadius: 1.5, fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
        >
          Test Alert & Haptics
        </Button>
        <Button
          size="small"
          onClick={onClose}
          sx={{ borderRadius: 1.5, fontSize: "0.75rem", textTransform: "none", fontWeight: 700 }}
        >
          Close
        </Button>
      </Box>
    </Popover>
  );
};

export default NotificationPopover;
