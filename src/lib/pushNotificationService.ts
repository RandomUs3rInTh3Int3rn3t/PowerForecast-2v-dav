import { supabaseClient } from "./supabaseClient";
import { devLog } from "./devLogger";

export const VAPID_PUBLIC_KEY =
  "BAZbltM0P405IEIBD7LY6eTU9yVZTZt4Zj6eJsL0zhCFl5FffSuJIGvmrAjIkmKU0i32s4H0DCR_gdGW6jP2duk";

/**
 * Converts a base64 URL-safe string to a Uint8Array for VAPID subscription
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the current browser and operating system support W3C Web Push & Service Workers
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Retrieves the current push subscription if registered on this device
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err: any) {
    devLog.warn("PushNotifications", "Failed to retrieve push subscription:", err);
    return null;
  }
}

/**
 * Subscribes the current device to Web Push notifications and saves the token to Supabase
 */
export async function subscribeToPush(
  userId?: string
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushSupported()) {
    return {
      success: false,
      error: "Web Push notifications are not supported on this browser or platform.",
    };
  }

  try {
    // 1. Request Notification Permission
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      return {
        success: false,
        error: "Notification permission was denied. Please allow notifications in your browser settings.",
      };
    }

    // 2. Ensure Service Worker is active
    const registration = await navigator.serviceWorker.ready;

    // 3. Subscribe or get existing push subscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint;
    const p256dh = subJson.keys?.p256dh;
    const auth = subJson.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return {
        success: false,
        error: "Failed to generate valid cryptographic push keys from browser.",
      };
    }

    // 4. Resolve current user ID
    let currentUserId = userId;
    if (!currentUserId) {
      try {
        const { data } = await supabaseClient.auth.getUser();
        currentUserId = data?.user?.id;
      } catch {}
    }
    if (!currentUserId) {
      try {
        const cached = localStorage.getItem("powerforecast_active_user");
        if (cached) {
          currentUserId = JSON.parse(cached)?.id;
        }
      } catch {}
    }

    // 5. Store / Upsert in Supabase push_subscriptions table
    const { error: dbError } = await supabaseClient.from("push_subscriptions").upsert(
      {
        user_id: currentUserId || null,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );

    if (dbError) {
      devLog.warn("PushNotifications", "Failed to sync push subscription to database:", dbError);
    } else {
      devLog.info("PushNotifications", "Push subscription synced to database successfully.");
    }

    // 6. Optionally register Periodic Background Sync if supported (Chromium PWA)
    if ("periodicSync" in (registration as any)) {
      try {
        await (registration as any).periodicSync.register("powerforecast-check", {
          minInterval: 12 * 60 * 60 * 1000, // 12 hours
        });
        devLog.info("PushNotifications", "Periodic background sync registered.");
      } catch (syncErr) {
        devLog.warn("PushNotifications", "Periodic sync registration skipped:", syncErr);
      }
    }

    return {
      success: true,
      subscription,
    };
  } catch (err: any) {
    devLog.error("PushNotifications", "Error during push subscription:", err);
    return {
      success: false,
      error: err?.message || "An unexpected error occurred while subscribing to push notifications.",
    };
  }
}

/**
 * Unsubscribes the current device from Web Push and removes it from Supabase
 */
export async function unsubscribeFromPush(
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Delete from Supabase
      if (endpoint) {
        await supabaseClient.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
    }

    devLog.info("PushNotifications", "Device unsubscribed from push notifications.");
    return { success: true };
  } catch (err: any) {
    devLog.warn("PushNotifications", "Error unsubscribing device:", err);
    return {
      success: false,
      error: err?.message || "Failed to unsubscribe device.",
    };
  }
}

/**
 * Dispatches a real background Web Push alert via the Supabase Edge Function.
 * Includes an optional delay so the user can close the browser/PWA and test reception while closed.
 */
export async function sendTestBackgroundPush(options: {
  delaySeconds?: number;
  title?: string;
  message?: string;
  userId?: string;
}): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    let currentUserId = options.userId;
    if (!currentUserId) {
      const cached = localStorage.getItem("powerforecast_active_user");
      if (cached) {
        currentUserId = JSON.parse(cached)?.id;
      }
    }

    const { data, error } = await supabaseClient.functions.invoke("send-push-notification", {
      body: {
        delaySeconds: options.delaySeconds ?? 5,
        title: options.title || "PowerForecast Background Alert",
        message:
          options.message ||
          "This push alert was delivered to your OS notification center while the app was closed!",
        url: "/#/dashboard",
        userId: currentUserId || undefined,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: data?.success ?? true,
      count: data?.count,
      error: data?.message || data?.error,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to trigger background test push.",
    };
  }
}
