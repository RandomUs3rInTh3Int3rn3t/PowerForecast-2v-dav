import { devLog } from "./devLogger";

export type NotificationLevel = "relaxed" | "standard" | "proactive" | "strict";
export type AlertUrgency = "info" | "normal" | "high" | "critical";

export interface NotificationPreferences {
  enabled: boolean;
  notificationLevel: NotificationLevel;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  runtimeAlert: boolean;
  runtimeThresholdHours: number; // 6 (relaxed), 4 (standard), 2 (proactive), 1 (strict)
  /** @deprecated Backward-compatible alias for runtimeAlert */
  stopwatchAlert?: boolean;
  /** @deprecated Backward-compatible alias for runtimeThresholdHours */
  stopwatchThresholdHours?: number;
  /** Alert when running stopwatch runtime exceeds today's simulated plan quota */
  planQuotaAlert?: boolean;
  budgetAlert: boolean;
  budgetThresholdPercent: number; // 90 (relaxed), 80 (standard), 70 (proactive), 50 (strict)
  scheduleAlert: boolean;
  peakHourAlert: boolean;
  surgeAlert: boolean; // Alert on high concurrent wattage load
  surgeThresholdWatts: number; // 2500W (proactive), 2000W (strict)
  emailAlertsEnabled: boolean; // Send critical alerts via Resend SMTP
  alertEmailAddress?: string;
}

const PREF_STORAGE_KEY = "powerforecast_notification_preferences";

export const NOTIFICATION_LEVEL_PRESETS: Record<NotificationLevel, Partial<NotificationPreferences>> = {
  relaxed: {
    notificationLevel: "relaxed",
    soundEnabled: false,
    vibrationEnabled: false,
    runtimeAlert: true,
    runtimeThresholdHours: 6,
    stopwatchAlert: true,
    stopwatchThresholdHours: 6,
    planQuotaAlert: false,
    budgetAlert: true,
    budgetThresholdPercent: 90,
    scheduleAlert: false,
    peakHourAlert: false,
    surgeAlert: false,
    surgeThresholdWatts: 3000,
    emailAlertsEnabled: false,
  },
  standard: {
    notificationLevel: "standard",
    soundEnabled: true,
    vibrationEnabled: true,
    runtimeAlert: true,
    runtimeThresholdHours: 4,
    stopwatchAlert: true,
    stopwatchThresholdHours: 4,
    planQuotaAlert: true,
    budgetAlert: true,
    budgetThresholdPercent: 80,
    scheduleAlert: true,
    peakHourAlert: true,
    surgeAlert: false,
    surgeThresholdWatts: 2500,
    emailAlertsEnabled: false,
  },
  proactive: {
    notificationLevel: "proactive",
    soundEnabled: true,
    vibrationEnabled: true,
    runtimeAlert: true,
    runtimeThresholdHours: 2,
    stopwatchAlert: true,
    stopwatchThresholdHours: 2,
    planQuotaAlert: true,
    budgetAlert: true,
    budgetThresholdPercent: 70,
    scheduleAlert: true,
    peakHourAlert: true,
    surgeAlert: true,
    surgeThresholdWatts: 2500,
    emailAlertsEnabled: true,
  },
  strict: {
    notificationLevel: "strict",
    soundEnabled: true,
    vibrationEnabled: true,
    runtimeAlert: true,
    runtimeThresholdHours: 1,
    stopwatchAlert: true,
    stopwatchThresholdHours: 1,
    planQuotaAlert: true,
    budgetAlert: true,
    budgetThresholdPercent: 50,
    scheduleAlert: true,
    peakHourAlert: true,
    surgeAlert: true,
    surgeThresholdWatts: 2000,
    emailAlertsEnabled: true,
  },
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  notificationLevel: "standard",
  soundEnabled: true,
  vibrationEnabled: true,
  runtimeAlert: true,
  runtimeThresholdHours: 4,
  stopwatchAlert: true,
  stopwatchThresholdHours: 4,
  planQuotaAlert: true,
  budgetAlert: true,
  budgetThresholdPercent: 80,
  scheduleAlert: true,
  peakHourAlert: true,
  surgeAlert: false,
  surgeThresholdWatts: 2500,
  emailAlertsEnabled: false,
};

/**
 * Checks if the browser environment supports Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Gets current browser notification permission status
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Requests browser permission for notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) {
    devLog.warn("Notifications", "Web Notifications API is not supported in this browser.");
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    devLog.info("Notifications", `Notification permission response: ${permission}`);
    return permission;
  } catch (err: any) {
    devLog.error("Notifications", `Error requesting notification permission: ${err?.message}`, err);
    return "denied";
  }
}

/**
 * Gets stored notification preferences
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = localStorage.getItem(PREF_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

/**
 * Saves updated notification preferences
 */
export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const current = getNotificationPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(updated));
    devLog.info("Notifications", "Saved notification preferences", updated);
    return updated;
  } catch (err: any) {
    devLog.warn("Notifications", `Failed to save preferences: ${err?.message}`);
    return getNotificationPreferences();
  }
}

/**
 * Web Audio API synthesized alert chimes (requires 0 external assets, works offline)
 */
export function playNotificationSound(type: "chime" | "warning" | "urgent" = "chime"): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === "urgent") {
      // Urgent two-tone alarm: 880Hz (A5) -> 1174.66Hz (D6)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1174.66, now + 0.14);
      osc1.frequency.setValueAtTime(880, now + 0.28);
      osc1.frequency.setValueAtTime(1174.66, now + 0.42);

      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.65);
    } else if (type === "warning") {
      // Two-step warning chime: 659.25Hz (E5) -> 830.6Hz (G#5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(830.6, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    } else {
      // Pleasant harmonic chime: 587.33Hz (D5) -> 880Hz (A5)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    // AudioContext blocked by browser autoplay policy if un-interacted
  }
}

/**
 * Mobile Android haptic vibration patterns
 */
export function triggerNotificationVibration(urgency: AlertUrgency = "normal"): void {
  if (typeof window === "undefined" || !("vibrate" in navigator)) return;
  try {
    switch (urgency) {
      case "critical":
        navigator.vibrate([300, 100, 300, 100, 500]);
        break;
      case "high":
        navigator.vibrate([200, 100, 200]);
        break;
      case "normal":
      default:
        navigator.vibrate(150);
        break;
    }
  } catch {
    // Ignore if vibration is restricted
  }
}

/**
 * Sends a native browser notification if permission is granted and feature is enabled.
 * Prefers navigator.serviceWorker.ready.showNotification(...) so notifications persist
 * in the Windows Action Center / Android notification tray even when the app is minimized or closed.
 * Falls back to standard window Notification if Service Worker is unavailable.
 */
export function sendNotification(options: {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  urgency?: AlertUrgency;
  soundType?: "chime" | "warning" | "urgent";
  onClick?: () => void;
  data?: any;
}): void {
  const prefs = getNotificationPreferences();
  if (!prefs.enabled) return;

  const urgency = options.urgency || "normal";
  const soundType = options.soundType || (urgency === "critical" ? "urgent" : urgency === "high" ? "warning" : "chime");

  // Trigger synthesized audio if sound is enabled
  if (prefs.soundEnabled) {
    playNotificationSound(soundType);
  }

  // Trigger mobile haptic vibration if enabled
  if (prefs.vibrationEnabled) {
    triggerNotificationVibration(urgency);
  }

  if (!isNotificationSupported()) return;
  if (Notification.permission !== "granted") return;

  const notifOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || "/Assets/LOGO.png",
    tag: options.tag,
    badge: "/Assets/LOGO.png",
    requireInteraction: urgency === "critical" || urgency === "high",
    data: options.data || {
      url: "/dashboard",
      tag: options.tag,
      timestamp: Date.now(),
    },
  };

  // If Service Worker is supported, route via registration.showNotification
  // for persistence in Windows Action Center & background click-to-focus
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        return registration.showNotification(options.title, notifOptions);
      })
      .then(() => {
        devLog.info("Notifications", `Dispatched persistent SW notification (${urgency}): "${options.title}"`, options);
      })
      .catch((err) => {
        devLog.warn("Notifications", `SW showNotification failed, falling back to window Notification: ${err?.message}`);
        fallbackWindowNotification(options, notifOptions);
      });
    return;
  }

  fallbackWindowNotification(options, notifOptions);
}

function fallbackWindowNotification(
  options: { title: string; onClick?: () => void },
  notifOptions: NotificationOptions
): void {
  try {
    const notif = new Notification(options.title, notifOptions);
    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }
    devLog.info("Notifications", `Triggered fallback browser notification: "${options.title}"`);
  } catch (err: any) {
    devLog.warn("Notifications", `Failed to display fallback notification: ${err?.message}`);
  }
}
