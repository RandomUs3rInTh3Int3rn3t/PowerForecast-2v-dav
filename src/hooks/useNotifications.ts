import { useState, useEffect, useCallback, useRef } from "react";
import { UserAppliance, UserCalendarEvent } from "../types";
import {
  NotificationPreferences,
  NotificationLevel,
  NOTIFICATION_LEVEL_PRESETS,
  getNotificationPermission,
  getNotificationPreferences,
  saveNotificationPreferences,
  requestNotificationPermission,
  sendNotification,
  isNotificationSupported,
  playNotificationSound,
  triggerNotificationVibration,
} from "../lib/notificationService";
import { sendSurgeAlertEmail, sendEnergyBudgetAlertEmail } from "../lib/emailService";
import { devLog } from "../lib/devLogger";

interface UseNotificationsProps {
  appliances?: UserAppliance[];
  events?: UserCalendarEvent[];
  monthlyBudget?: number;
  projectedBill?: number;
}

export function useNotifications({
  appliances = [],
  events = [],
  monthlyBudget,
  projectedBill,
}: UseNotificationsProps = {}) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    getNotificationPermission()
  );
  const [prefs, setPrefs] = useState<NotificationPreferences>(() => getNotificationPreferences());
  const sentAlertsRef = useRef<Set<string>>(new Set());

  // Refresh permission state on focus
  useEffect(() => {
    const handleFocus = () => {
      setPermission(getNotificationPermission());
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const handleRequestPermission = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    return result;
  }, []);

  const handleUpdatePrefs = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    setPrefs((prev) => {
      const updated = { ...prev, ...newPrefs };
      saveNotificationPreferences(updated);
      return updated;
    });
  }, []);

  const handleSetLevel = useCallback((level: NotificationLevel) => {
    const preset = NOTIFICATION_LEVEL_PRESETS[level];
    if (!preset) return;
    setPrefs((prev) => {
      const updated = { ...prev, ...preset };
      saveNotificationPreferences(updated);
      devLog.info("Notifications", `Switched notification level to "${level}"`, updated);
      return updated;
    });
  }, []);

  const handleTestNotification = useCallback(() => {
    const urgency = prefs.notificationLevel === "strict" ? "critical" : prefs.notificationLevel === "proactive" ? "high" : "normal";
    sendNotification({
      title: `PowerForecast Alert (${prefs.notificationLevel.toUpperCase()} Level)`,
      body: `Smart Energy Notifications are active with sound & haptic telemetry enabled.`,
      tag: `test-${Date.now()}`,
      urgency,
    });
  }, [prefs.notificationLevel]);

  const handlePreviewSound = useCallback((type: "chime" | "warning" | "urgent" = "chime") => {
    playNotificationSound(type);
  }, []);

  const handlePreviewVibration = useCallback((urgency: "normal" | "high" | "critical" = "high") => {
    triggerNotificationVibration(urgency);
  }, []);

  // 1. Stopwatch Over-run Monitor (Every 30s)
  useEffect(() => {
    if (!prefs.enabled || !prefs.stopwatchAlert) return;

    const checkStopwatches = () => {
      const running = appliances.filter((a) => a.is_currently_on && a.last_turned_on_at);
      const now = Date.now();
      const thresholdHours = prefs.stopwatchThresholdHours || 4;
      const thresholdMs = thresholdHours * 3600 * 1000;

      running.forEach((app) => {
        const startTime = new Date(app.last_turned_on_at!).getTime();
        const elapsedMs = now - startTime;

        // In Proactive/Strict level: Heavy appliances (>1000W) alert earlier at half threshold
        const isHeavy = (app.watts * (app.quantity || 1)) >= 1000;
        const adjustedThresholdMs =
          (prefs.notificationLevel === "strict" || prefs.notificationLevel === "proactive") && isHeavy
            ? Math.max(1800000, thresholdMs * 0.5) // 30m or half threshold
            : thresholdMs;

        if (elapsedMs >= adjustedThresholdMs) {
          const hoursElapsed = Math.floor(elapsedMs / (3600 * 1000));
          const alertKey = `stopwatch-${app.id}-${hoursElapsed}`;

          if (!sentAlertsRef.current.has(alertKey)) {
            sentAlertsRef.current.add(alertKey);

            const hours = (elapsedMs / (3600 * 1000)).toFixed(1);
            const kwh = ((app.watts * (app.quantity || 1) * (elapsedMs / (3600 * 1000))) / 1000).toFixed(2);
            const cost = (parseFloat(kwh) * 14.8261).toFixed(2);
            const urgency = isHeavy || parseFloat(hours) >= 4 ? "critical" : "high";

            sendNotification({
              title: `⚡ Stopwatch Alert: ${app.name} (${app.watts}W)`,
              body: `Running for ${hours} hrs (${kwh} kWh / ~₱${cost}). Did you leave it on?`,
              tag: `stopwatch-${app.id}`,
              urgency,
            });
          }
        }
      });
    };

    checkStopwatches();
    const interval = setInterval(checkStopwatches, 30000);
    return () => clearInterval(interval);
  }, [appliances, prefs.enabled, prefs.stopwatchAlert, prefs.stopwatchThresholdHours, prefs.notificationLevel]);

  // 2. Real-Time High Wattage Surge Spike Monitor (Every 15s)
  useEffect(() => {
    if (!prefs.enabled || !prefs.surgeAlert) return;

    const checkSurge = () => {
      const running = appliances.filter((a) => a.is_currently_on);
      const totalWatts = running.reduce((sum, a) => sum + (a.watts * (a.quantity || 1)), 0);
      const limit = prefs.surgeThresholdWatts || 2500;

      if (totalWatts >= limit) {
        const now10m = Math.floor(Date.now() / (10 * 60 * 1000));
        const surgeKey = `surge-${now10m}-${Math.floor(totalWatts / 500)}`;

        if (!sentAlertsRef.current.has(surgeKey)) {
          sentAlertsRef.current.add(surgeKey);

          sendNotification({
            title: `🚨 High Power Draw Alert (${totalWatts} W)`,
            body: `Concurrent draw exceeded ${limit}W across ${running.length} active devices. Potential spike in Meralco stepped rates!`,
            tag: "surge-spike",
            urgency: "critical",
          });

          // Dispatch email alert via Resend if enabled
          if (prefs.emailAlertsEnabled) {
            try {
              const activeUser = JSON.parse(localStorage.getItem("powerforecast_active_user") || "{}");
              const targetEmail = prefs.alertEmailAddress || activeUser?.email;
              if (targetEmail) {
                sendSurgeAlertEmail({
                  toEmail: targetEmail,
                  currentWatts: totalWatts,
                  thresholdWatts: limit,
                });
              }
            } catch (emailErr) {
              devLog.warn("Notifications", "Failed to dispatch surge email alert:", emailErr);
            }
          }
        }
      }
    };

    checkSurge();
    const interval = setInterval(checkSurge, 15000);
    return () => clearInterval(interval);
  }, [appliances, prefs.enabled, prefs.surgeAlert, prefs.surgeThresholdWatts, prefs.emailAlertsEnabled, prefs.alertEmailAddress]);

  // 3. Multi-Tiered Budget Threshold Alert
  useEffect(() => {
    if (!prefs.enabled || !prefs.budgetAlert || !monthlyBudget || !projectedBill) return;

    const percentage = (projectedBill / monthlyBudget) * 100;
    const triggerPct = prefs.budgetThresholdPercent || 80;

    // Check multi-tier milestones: 50%, 75%, 90%, 100%
    const tiers = [50, 70, 80, 90, 100].filter((t) => t >= triggerPct || percentage >= t);

    tiers.forEach((tier) => {
      if (percentage >= tier) {
        const monthKey = `budget-${new Date().getFullYear()}-${new Date().getMonth()}-${tier}`;
        if (!sentAlertsRef.current.has(monthKey)) {
          sentAlertsRef.current.add(monthKey);

          const urgency = tier >= 100 ? "critical" : tier >= 85 ? "high" : "normal";

          sendNotification({
            title: `📊 Meralco Budget Milestone (${tier}% Target)`,
            body: `Projected bill ₱${projectedBill.toFixed(2)} reached ${percentage.toFixed(0)}% of your ₱${monthlyBudget} monthly budget!`,
            tag: `budget-tier-${tier}`,
            urgency,
          });

          // Dispatch email alert via Resend if enabled for high tiers (>=80%)
          if (prefs.emailAlertsEnabled && tier >= 80) {
            try {
              const activeUser = JSON.parse(localStorage.getItem("powerforecast_active_user") || "{}");
              const targetEmail = prefs.alertEmailAddress || activeUser?.email;
              if (targetEmail) {
                sendEnergyBudgetAlertEmail({
                  toEmail: targetEmail,
                  userName: activeUser?.name || "PowerForecast Member",
                  currentKwh: monthlyBudget ? Math.round(projectedBill / 12) : 0,
                  budgetLimitKwh: monthlyBudget ? Math.round(monthlyBudget / 12) : 0,
                  percentConsumed: percentage,
                  projectedBill: `₱${projectedBill.toFixed(2)}`,
                });
              }
            } catch (emailErr) {
              devLog.warn("Notifications", "Failed to dispatch budget email alert:", emailErr);
            }
          }
        }
      }
    });
  }, [monthlyBudget, projectedBill, prefs.enabled, prefs.budgetAlert, prefs.budgetThresholdPercent, prefs.emailAlertsEnabled, prefs.alertEmailAddress]);

  // 4. Schedule Queue Reminders (Every 60s)
  useEffect(() => {
    if (!prefs.enabled || !prefs.scheduleAlert || events.length === 0) return;

    const checkSchedule = () => {
      const now = new Date();
      const currentDay = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()];
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();

      events.forEach((ev) => {
        if (ev.day === currentDay || ev.is_recurring) {
          // Alert if scheduled task starts in 5 minutes
          if (ev.hour === currentHour + 1 && currentMin >= 55) {
            const alertKey = `sched-${ev.id}-${now.toDateString()}-${ev.hour}`;
            if (!sentAlertsRef.current.has(alertKey)) {
              sentAlertsRef.current.add(alertKey);

              sendNotification({
                title: `📅 Task Reminder: ${ev.title}`,
                body: `Starts in 5 minutes (${ev.hour}:00). Estimated run: ${ev.duration_hours}h.`,
                tag: `sched-${ev.id}`,
                urgency: "normal",
              });
            }
          }
        }
      });
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [events, prefs.enabled, prefs.scheduleAlert]);

  // 5. Peak Hour Warning (Every 15m)
  useEffect(() => {
    if (!prefs.enabled || !prefs.peakHourAlert) return;

    const checkPeakHour = () => {
      const now = new Date();
      const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
      const hour = now.getHours();

      // Meralco Afternoon Peak (13:00 - 16:00) & Evening Peak (18:00 - 21:00)
      const isPeakStart = isWeekday && (hour === 13 || hour === 18) && now.getMinutes() < 15;
      if (isPeakStart) {
        const peakKey = `peak-${now.toDateString()}-${hour}`;
        if (!sentAlertsRef.current.has(peakKey)) {
          sentAlertsRef.current.add(peakKey);

          sendNotification({
            title: "⚡ Meralco Peak Demand Window Active",
            body: `Grid demand is currently elevated (${hour}:00 - ${hour + 3}:00). Consider deferring high-load circuits to off-peak hours.`,
            tag: `peak-${hour}`,
            urgency: "high",
          });
        }
      }
    };

    checkPeakHour();
    const interval = setInterval(checkPeakHour, 15 * 60000);
    return () => clearInterval(interval);
  }, [prefs.enabled, prefs.peakHourAlert]);

  return {
    permission,
    isSupported: isNotificationSupported(),
    prefs,
    setLevel: handleSetLevel,
    requestPermission: handleRequestPermission,
    updatePrefs: handleUpdatePrefs,
    testNotification: handleTestNotification,
    previewSound: handlePreviewSound,
    previewVibration: handlePreviewVibration,
  };
}
