import { supabaseClient } from "./supabaseClient";
import { SimulatedApplianceUsage, UserAppliance } from "../types";
import { calculateKwh, calculateCost, DEFAULT_EFFECTIVE_RATE } from "./dailyUsageService";
import { devLog } from "./devLogger";

/**
 * Saves or updates a simulated plan for a single appliance on a specific date
 */
export async function saveSimulatedAppliance(params: {
  appliance_id: string;
  usage_date: string; // YYYY-MM-DD
  hours_used: number;
  watts: number;
  quantity?: number;
  start_hour?: number | null;
  end_hour?: number | null;
  effectiveRate?: number;
  source?: "simulation_plan" | "test_run";
  notes?: string;
  user_id?: string | null;
}): Promise<boolean> {
  const qty = params.quantity || 1;
  const clampedHours = Math.max(0, Math.min(24, Number(params.hours_used.toFixed(2))));
  const kwh = calculateKwh(params.watts, clampedHours, qty);
  const cost = calculateCost(kwh, params.effectiveRate || DEFAULT_EFFECTIVE_RATE);

  try {
    const row = {
      appliance_id: params.appliance_id,
      usage_date: params.usage_date,
      hours_used: clampedHours,
      kwh_consumed: kwh,
      estimated_cost: cost,
      start_hour: params.start_hour !== undefined ? params.start_hour : null,
      end_hour: params.end_hour !== undefined ? params.end_hour : null,
      source: params.source || "simulation_plan",
      notes: params.notes || null,
      user_id: params.user_id || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseClient
      .from("simulated_appliance_usage")
      .upsert(row, {
        onConflict: "user_id,appliance_id,usage_date",
      });

    if (error) {
      // Graceful fallback if table not yet migrated
      devLog.warn("SimulationService", `Failed to save simulated appliance: ${error.message}`, row);
      return false;
    }

    devLog.info("SimulationService", `Saved simulated usage for ${params.appliance_id} on ${params.usage_date}: ${clampedHours}h`);
    
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date: params.usage_date, appliance_id: params.appliance_id },
        })
      );
    }
    return true;
  } catch (err: any) {
    devLog.error("SimulationService", `Exception in saveSimulatedAppliance: ${err?.message}`, err);
    return false;
  }
}

/**
 * Saves a full day's simulation plan for multiple appliances in batch
 */
export async function batchSaveSimulatedDay(
  usage_date: string,
  entries: Array<{
    appliance_id: string;
    hours_used: number;
    watts: number;
    quantity?: number;
    start_hour?: number | null;
    end_hour?: number | null;
    effectiveRate?: number;
    source?: "simulation_plan" | "test_run";
    notes?: string;
    user_id?: string | null;
  }>
): Promise<boolean> {
  if (entries.length === 0) return true;

  const rows = entries.map((e) => {
    const qty = e.quantity || 1;
    const clampedHours = Math.max(0, Math.min(24, Number(e.hours_used.toFixed(2))));
    const kwh = calculateKwh(e.watts, clampedHours, qty);
    const cost = calculateCost(kwh, e.effectiveRate || DEFAULT_EFFECTIVE_RATE);

    return {
      appliance_id: e.appliance_id,
      usage_date,
      hours_used: clampedHours,
      kwh_consumed: kwh,
      estimated_cost: cost,
      start_hour: e.start_hour !== undefined ? e.start_hour : null,
      end_hour: e.end_hour !== undefined ? e.end_hour : null,
      source: e.source || "simulation_plan",
      notes: e.notes || null,
      user_id: e.user_id || null,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    const { error } = await supabaseClient
      .from("simulated_appliance_usage")
      .upsert(rows, {
        onConflict: "user_id,appliance_id,usage_date",
      });

    if (error) {
      devLog.warn("SimulationService", `Batch simulated save warning: ${error.message}`);
      return false;
    }

    devLog.info("SimulationService", `Batch saved ${rows.length} simulated rows for ${usage_date}`);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date },
        })
      );
    }
    return true;
  } catch (err: any) {
    devLog.error("SimulationService", `Exception in batchSaveSimulatedDay: ${err?.message}`, err);
    return false;
  }
}

/**
 * Fetches simulated appliance usage records within a date range
 */
export async function fetchSimulatedUsageRange(
  startDate: string,
  endDate: string,
  userId?: string | null
): Promise<SimulatedApplianceUsage[]> {
  try {
    let query = supabaseClient
      .from("simulated_appliance_usage")
      .select("*")
      .gte("usage_date", startDate)
      .lte("usage_date", endDate);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      devLog.warn("SimulationService", `Error fetching simulated usage range: ${error.message}`);
      return [];
    }
    return (data || []) as SimulatedApplianceUsage[];
  } catch (err: any) {
    devLog.error("SimulationService", `Exception in fetchSimulatedUsageRange: ${err?.message}`, err);
    return [];
  }
}

/**
 * Resets / clears custom simulated entries for a date, reverting it to baseline routine
 */
export async function clearSimulatedDay(
  usage_date: string,
  userId?: string | null
): Promise<boolean> {
  try {
    let query = supabaseClient
      .from("simulated_appliance_usage")
      .delete()
      .eq("usage_date", usage_date);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { error } = await query;
    if (error) {
      devLog.warn("SimulationService", `Error clearing simulated day: ${error.message}`);
      return false;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_simulation_updated", {
          detail: { usage_date, cleared: true },
        })
      );
    }
    return true;
  } catch (err: any) {
    devLog.error("SimulationService", `Exception in clearSimulatedDay: ${err?.message}`, err);
    return false;
  }
}

/**
 * Computes pure baseline quota for a list of appliances on any given day
 */
export function computeBaselineQuota(
  appliances: UserAppliance[],
  effectiveRate: number = DEFAULT_EFFECTIVE_RATE
): { baselineKwh: number; baselineCost: number } {
  const active = appliances.filter((a) => a.is_active !== false);
  const kwh = active.reduce((sum, app) => {
    const hours = Number(app.hours_per_day) || 0;
    return sum + calculateKwh(app.watts, hours, app.quantity || 1);
  }, 0);
  const cost = calculateCost(kwh, effectiveRate);
  return {
    baselineKwh: Number(kwh.toFixed(2)),
    baselineCost: Number(cost.toFixed(2)),
  };
}
