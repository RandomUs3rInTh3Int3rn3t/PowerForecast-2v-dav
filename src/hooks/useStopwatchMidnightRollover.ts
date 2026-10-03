import { useEffect, useCallback, useRef } from "react";
import { useList } from "@refinedev/core";
import { UserAppliance } from "../types";
import { reconcileOvernightRunningStopwatches } from "../lib/dailyUsageService";
import { useToast } from "../components/common/ToastProvider";
import { sendNotification } from "../lib/notificationService";
import { devLog } from "../lib/devLogger";

/**
 * Global hook to manage automatic 11:59 PM / midnight active circuit session rollover.
 * Automatically saves yesterday's completed slice and seamlessly advances active circuit sessions into today.
 */
export function useStopwatchMidnightRollover() {
  const { data: appliancesData, refetch: refetchAppliances } = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  });

  const appliances = appliancesData?.data || [];
  const { showInfo } = useToast();
  const isRunningRef = useRef(false);

  const triggerReconciliation = useCallback(async () => {
    if (isRunningRef.current || appliances.length === 0) return;

    try {
      isRunningRef.current = true;
      const result = await reconcileOvernightRunningStopwatches(appliances);

      if (result.rolledOverCount > 0) {
        devLog.info(
          "useStopwatchMidnightRollover",
          `Midnight Rollover executed: Saved ${result.rolledOverCount} overnight active session(s) across dates: ${result.affectedDates.join(", ")}`
        );

        showInfo(
          `⏱️ Midnight Rollover: Yesterday's active circuit session was automatically saved to daily records. Today's live tracking continues seamlessly.`,
          "Active Session Midnight Rollover"
        );

        // Fire overnight push & audio/vibration notification for still-running appliances
        const stillRunning = appliances.filter((a) => a.is_currently_on);
        stillRunning.forEach((app) => {
          sendNotification({
            title: `🌙 Running Overnight: ${app.name}`,
            body: `Yesterday's session was auto-saved at midnight. The stopwatch is still active today. Did you leave it running?`,
            tag: `midnight-rollover-${app.id}-${new Date().toDateString()}`,
            urgency: "high",
          });
        });

        if (refetchAppliances) {
          refetchAppliances();
        }
      }
    } catch (err: any) {
      devLog.error("useStopwatchMidnightRollover", `Rollover check failed: ${err?.message}`, err);
    } finally {
      isRunningRef.current = false;
    }
  }, [appliances, refetchAppliances, showInfo]);

  // 1. Run on initial mount and when appliances change
  useEffect(() => {
    triggerReconciliation();
  }, [triggerReconciliation]);

  // 2. Run on window focus / visibility change / Android app resume (pageshow) / online reconnection
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (document.visibilityState === "visible" || !document.hidden) {
        triggerReconciliation();
      }
    };

    window.addEventListener("focus", handleFocusOrVisible);
    window.addEventListener("pageshow", handleFocusOrVisible);
    window.addEventListener("online", handleFocusOrVisible);
    document.addEventListener("visibilitychange", handleFocusOrVisible);

    return () => {
      window.removeEventListener("focus", handleFocusOrVisible);
      window.removeEventListener("pageshow", handleFocusOrVisible);
      window.removeEventListener("online", handleFocusOrVisible);
      document.removeEventListener("visibilitychange", handleFocusOrVisible);
    };
  }, [triggerReconciliation]);

  // 3. Periodic 15-second heartbeat
  useEffect(() => {
    const interval = setInterval(triggerReconciliation, 15000);
    return () => clearInterval(interval);
  }, [triggerReconciliation]);

  // 4. Exact precision midnight timer (fires right when 11:59:59 PM turns into 12:00:00 AM)
  useEffect(() => {
    const scheduleMidnightTimer = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        1,
        0
      );
      const msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());

      devLog.info(
        "useStopwatchMidnightRollover",
        `Scheduled exact midnight rollover timer in ${Math.round(msUntilMidnight / 1000)}s`
      );

      const timeoutId = setTimeout(() => {
        triggerReconciliation();
        scheduleMidnightTimer();
      }, msUntilMidnight);

      return timeoutId;
    };

    const timeoutId = scheduleMidnightTimer();
    return () => clearTimeout(timeoutId);
  }, [triggerReconciliation]);
}
