import { useState, useEffect, useCallback } from "react";
import { devLog } from "./devLogger";

let registrationInstance: ServiceWorkerRegistration | null = null;
const updateListeners = new Set<(waitingWorker: ServiceWorker | null) => void>();

/**
 * Registers the PowerForecast Service Worker for PWA capabilities, offline caching & auto-updates
 */
export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const doRegister = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registrationInstance = registration;
        devLog.info("PWA", "Service Worker registered successfully with scope:", registration.scope);

        // Check if there is already a waiting worker
        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdateAvailable(registration.waiting);
        }

        // Listen for new service worker installation
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              devLog.info("PWA", "New update detected and installed, waiting for activation.");
              notifyUpdateAvailable(installingWorker);
            }
          });
        });

        // Background Periodic Update Check (every 15 minutes)
        setInterval(() => {
          checkForPwaUpdate();
        }, 15 * 60 * 1000);

        // Background Check on Window Focus & Visibility Change
        window.addEventListener("focus", () => checkForPwaUpdate());
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            checkForPwaUpdate();
          }
        });

        // Background Check on Online Reconnection
        window.addEventListener("online", () => {
          devLog.info("PWA", "Network reconnected — checking for updates...");
          checkForPwaUpdate();
        });
      })
      .catch((err) => {
        devLog.warn("PWA", "Service Worker registration failed:", err);
      });
  };

  if (document.readyState === "complete") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister);
  }
}

function notifyUpdateAvailable(worker: ServiceWorker) {
  updateListeners.forEach((listener) => listener(worker));
}

/**
 * Manually trigger a Service Worker update check
 */
export async function checkForPwaUpdate(): Promise<boolean> {
  if (!registrationInstance) return false;
  try {
    devLog.info("PWA", "Checking for Service Worker updates...");
    await registrationInstance.update();
    return true;
  } catch (err) {
    devLog.warn("PWA", "Update check failed:", err);
    return false;
  }
}

/**
 * React hook to manage PWA Update state, auto-detection, and activation
 */
export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleUpdate = (worker: ServiceWorker | null) => {
      setWaitingWorker(worker);
      setUpdateAvailable(true);
      setDismissed(false);
    };

    updateListeners.add(handleUpdate);

    // If registration is already waiting when hook mounts
    if (registrationInstance?.waiting && navigator.serviceWorker?.controller) {
      handleUpdate(registrationInstance.waiting);
    }

    return () => {
      updateListeners.delete(handleUpdate);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker && registrationInstance?.waiting) {
      setWaitingWorker(registrationInstance.waiting);
    }

    const workerToActivate = waitingWorker || registrationInstance?.waiting;
    if (!workerToActivate) {
      // Fallback reload if worker isn't immediately identified
      window.location.reload();
      return;
    }

    setIsUpdating(true);

    // When the new worker takes control, reload immediately
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    // Send skip waiting command
    workerToActivate.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  const dismissUpdate = useCallback(() => {
    setDismissed(true);
  }, []);

  return {
    updateAvailable: updateAvailable && !dismissed,
    isUpdating,
    applyUpdate,
    dismissUpdate,
    checkForUpdate: checkForPwaUpdate,
  };
}

/**
 * React hook to listen for Android / Desktop beforeinstallprompt events
 */
export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      devLog.info("PWA", "App install prompt ready.");
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      devLog.info("PWA", "PowerForecast PWA was successfully installed.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    devLog.info("PWA", `User response to install prompt: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === "accepted";
  };

  return { isInstallable, triggerInstall };
}
