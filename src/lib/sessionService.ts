import { supabaseClient } from "./supabaseClient";
import { UserAppliance } from "../types";
import { devLog } from "./devLogger";
import {
  splitSessionAcrossDays,
  calculateApplianceKwh,
  calculateCost,
  accumulateLiveSessionDailyUsage,
  deductSessionDailyUsage,
  savePastSessionWithAllocation,
  DEFAULT_EFFECTIVE_RATE,
} from "./dailyUsageService";

// In-flight locking mechanism to prevent race conditions & double-clicks
const activeSessionLocks = new Set<string>();

/**
 * Resolves the effective rate per kWh based on space/appliance tariff type
 */
export function getEffectiveApplianceRate(app: UserAppliance): number {
  if (app.tariff_type === "commercial") {
    return 15.2;
  }
  return DEFAULT_EFFECTIVE_RATE; // 14.8261 PHP / kWh
}

/**
 * Energizes / turns ON an appliance circuit and starts the stopwatch
 */
export async function switchOnCircuit(
  app: UserAppliance
): Promise<{ success: boolean; last_turned_on_at: string | null }> {
  if (activeSessionLocks.has(app.id)) {
    devLog.warn("SessionService", `Circuit lock active for ${app.id}, ignoring duplicate switch ON`);
    return { success: false, last_turned_on_at: null };
  }

  activeSessionLocks.add(app.id);
  const nowIso = new Date().toISOString();

  try {
    const { error } = await supabaseClient
      .from("user_appliances")
      .update({
        is_currently_on: true,
        last_turned_on_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", app.id);

    if (error) {
      devLog.error("SessionService", `Failed to energize circuit: ${error.message}`, error);
      return { success: false, last_turned_on_at: null };
    }

    devLog.telemetry("Telemetry", `Circuit ENERGIZED [ACTIVE]: "${app.name}" (${app.watts}W @ 230V)`, {
      applianceId: app.id,
      name: app.name,
      category: app.category,
      watts: app.watts,
      is_currently_on: true,
      last_turned_on_at: nowIso,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_circuit_toggled", {
          detail: { applianceId: app.id, state: true, timestamp: nowIso },
        })
      );
    }

    return { success: true, last_turned_on_at: nowIso };
  } finally {
    activeSessionLocks.delete(app.id);
  }
}

/**
 * De-energizes / turns OFF an appliance circuit, stops the stopwatch,
 * and automatically logs session duration + kWh + cost into appliance_usage_logs & daily_appliance_usage
 */
export async function switchOffCircuit(
  app: UserAppliance,
  effectiveRate?: number
): Promise<{
  success: boolean;
  durationMinutes: number;
  kwh: number;
  cost: number;
}> {
  if (activeSessionLocks.has(app.id)) {
    devLog.warn("SessionService", `Circuit lock active for ${app.id}, ignoring duplicate switch OFF`);
    return { success: false, durationMinutes: 0, kwh: 0, cost: 0 };
  }

  activeSessionLocks.add(app.id);
  const rate = effectiveRate || getEffectiveApplianceRate(app);

  try {
    let durationMinutes = 0;
    let appKwh = 0;
    let appCost = 0;

    if (app.last_turned_on_at) {
      const start = new Date(app.last_turned_on_at);
      const end = new Date();

      if (!isNaN(start.getTime())) {
        const diffMs = Math.max(1000, end.getTime() - start.getTime());
        durationMinutes = Math.max(1, Math.round(diffMs / 60000));
        const durationHours = diffMs / 3600000;
        appKwh = calculateApplianceKwh(app, durationHours);
        appCost = calculateCost(appKwh, rate);

        // 1. Insert detailed session log
        const { error: logErr } = await supabaseClient.from("appliance_usage_logs").insert({
          appliance_id: app.id,
          user_id: app.user_id || null,
          started_at: start.toISOString(),
          ended_at: end.toISOString(),
          duration_minutes: durationMinutes,
          kwh_consumed: appKwh,
          estimated_cost: appCost,
          source: "calendar_timeline_stopwatch",
        });

        if (logErr) {
          devLog.warn("SessionService", `Warning writing session log: ${logErr.message}`);
        }

        // 2. Accumulate in daily_appliance_usage across midnight boundaries
        await accumulateLiveSessionDailyUsage({
          appliance_id: app.id,
          durationMinutes,
          watts: app.watts,
          quantity: app.quantity || 1,
          effectiveRate: rate,
          user_id: app.user_id,
          startTime: start,
          endTime: end,
        });

        devLog.info(
          "SessionService",
          `Stopwatch saved: ${app.name} (${durationMinutes} mins / ${appKwh.toFixed(3)} kWh / ₱${appCost.toFixed(2)})`
        );
      }
    }

    // 3. Update appliance status to OFF in database
    const { error: appErr } = await supabaseClient
      .from("user_appliances")
      .update({
        is_currently_on: false,
        last_turned_on_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    if (appErr) {
      devLog.error("SessionService", `Error de-energizing appliance record: ${appErr.message}`);
    }

    // 4. Dispatch global sync events
    if (typeof window !== "undefined") {
      const syncDetail = {
        rolledOverCount: 1,
        applianceId: app.id,
        durationMinutes,
      };
      window.dispatchEvent(new CustomEvent("powerforecast_session_sync", { detail: syncDetail }));
      window.dispatchEvent(
        new CustomEvent("powerforecast_circuit_toggled", {
          detail: { applianceId: app.id, state: false, durationMinutes },
        })
      );
    }

    return { success: true, durationMinutes, kwh: appKwh, cost: appCost };
  } finally {
    activeSessionLocks.delete(app.id);
  }
}

/**
 * Manually logs a completed past session for a day (e.g. if the user forgot to start the stopwatch)
 */
export async function addManualPastSession(params: {
  appliance: UserAppliance;
  startDate: Date;
  endDate: Date;
  effectiveRate?: number;
}): Promise<{ totalMinutes: number; totalKwh: number; totalCost: number }> {
  const rate = params.effectiveRate || getEffectiveApplianceRate(params.appliance);

  const result = await savePastSessionWithAllocation({
    appliance_id: params.appliance.id,
    startDate: params.startDate,
    endDate: params.endDate,
    watts: params.appliance.watts,
    quantity: params.appliance.quantity || 1,
    effectiveRate: rate,
    user_id: params.appliance.user_id,
    allocationMode: "add_additional",
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("powerforecast_session_sync", {
        detail: { applianceId: params.appliance.id, manuallyAdded: true },
      })
    );
  }

  return result;
}

/**
 * Deletes a session log and reverses its hours from daily_appliance_usage
 */
export async function deleteSessionLog(params: {
  logId: string;
  appliance: UserAppliance;
  durationMinutes: number;
  startTime: Date;
  endTime: Date;
  effectiveRate?: number;
}): Promise<boolean> {
  const rate = params.effectiveRate || getEffectiveApplianceRate(params.appliance);

  try {
    // 1. Delete session from appliance_usage_logs
    const { error: delErr } = await supabaseClient
      .from("appliance_usage_logs")
      .delete()
      .eq("id", params.logId);

    if (delErr) {
      devLog.error("SessionService", `Failed to delete session log: ${delErr.message}`);
      return false;
    }

    // 2. Deduct hours from daily_appliance_usage across midnight slices
    await deductSessionDailyUsage({
      appliance_id: params.appliance.id,
      durationMinutes: params.durationMinutes,
      watts: params.appliance.watts,
      quantity: params.appliance.quantity || 1,
      effectiveRate: rate,
      user_id: params.appliance.user_id,
      startTime: params.startTime,
      endTime: params.endTime,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_session_sync", {
          detail: { logId: params.logId, deleted: true },
        })
      );
    }

    return true;
  } catch (err: any) {
    devLog.error("SessionService", `Exception deleting session: ${err?.message}`, err);
    return false;
  }
}
