import { supabaseClient } from "./supabaseClient";
import {
  DailyApplianceUsage,
  UserAppliance,
  UserCalendarEvent,
  BillingPeriodConfig,
  BillingPeriodWindow,
  BillingPeriodMode,
  CycleEndOffset,
} from "../types";
import { devLog } from "./devLogger";

export const DEFAULT_EFFECTIVE_RATE = 14.8261;

/**
 * Formats a Date object into a YYYY-MM-DD string according to local timezone.
 */
export function formatDateToKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a Date object at local midnight
 */
export function parseKeyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Inverter / Appliance calculation options
 */
export interface ApplianceKwhOptions {
  isInverter?: boolean;
  category?: string;
  energy_rating?: string;
  name?: string;
  model?: string;
  ai_metadata?: Record<string, any>;
  cruising_watts?: number;
}

/**
 * Checks if an appliance category supports Inverter compressor or motor duty cycles
 */
export function isCompressorInverterCategory(category: string = ""): boolean {
  const c = category.toLowerCase();
  return (
    c.includes("air condition") ||
    c.includes("aircon") ||
    c.includes("refrigerat") ||
    c.includes("freezer") ||
    c.includes("chiller") ||
    c.includes("wash") ||
    c.includes("laundry")
  );
}

/**
 * Normalizes legacy category strings into the 8 streamlined everyday categories
 */
export function normalizeApplianceCategory(category: string = "", name: string = "", model: string = ""): string {
  const c = category.toLowerCase().trim();
  const extra = `${name} ${model}`.toLowerCase();

  if (c.includes("condition") || c.includes("aircon") || c.includes("split") || c.includes("window")) {
    return "Air Conditioners";
  }
  if (c.includes("refrig") || c.includes("freezer") || c.includes("chiller")) {
    return "Refrigerators & Freezers";
  }
  if (
    c.includes("computer") ||
    c.includes("laptop") ||
    c.includes("pc") ||
    c.includes("desktop") ||
    c.includes("workstation") ||
    extra.includes("laptop") ||
    extra.includes("pc") ||
    extra.includes("ryzen") ||
    extra.includes("geforce") ||
    extra.includes("rtx") ||
    extra.includes("macbook")
  ) {
    return "Computers & Laptops";
  }
  if (c.includes("fan") || c.includes("ventilat") || c.includes("exhaust")) {
    return "Electric Fans";
  }
  if (c.includes("cook") || c.includes("rice") || c.includes("microwave") || c.includes("oven") || c.includes("blender") || c.includes("kettle") || c.includes("air fry") || c.includes("kitchen")) {
    return "Kitchen Appliances";
  }
  if (c.includes("wash") || c.includes("dryer") || c.includes("laundry") || c.includes("iron") || c.includes("vacuum")) {
    return "Laundry & Cleaning";
  }
  if (c.includes("tv") || c.includes("televis") || c.includes("screen") || c.includes("sound") || c.includes("entertain") || c.includes("audio") || c.includes("speaker")) {
    return "TV & Entertainment";
  }
  return "Lighting & Other";
}

/**
 * Computes energy in kWh given watts and hours, accounting for Inverter compressor time-decay, refrigeration duty cycles, and computer workload factors.
 */
export function calculateKwh(
  watts: number,
  hours: number,
  quantity: number = 1,
  options?: ApplianceKwhOptions | boolean | string
): number {
  const qty = quantity || 1;
  const h = Math.max(0, hours);
  if (h === 0 || watts === 0) return 0;

  let isInverter = false;
  let category = "";

  if (typeof options === "boolean") {
    isInverter = options;
  } else if (typeof options === "string") {
    category = options;
    isInverter = isCompressorInverterCategory(category);
  } else if (options && typeof options === "object") {
    category = options.category || "";
    const supports = isCompressorInverterCategory(category);
    isInverter = supports && Boolean(
      options.isInverter === true ||
      (options.energy_rating && /inverter/i.test(options.energy_rating)) ||
      (options.ai_metadata?.is_inverter === true) ||
      (options.name && /inverter/i.test(options.name)) ||
      (options.model && /inverter/i.test(options.model))
    );
  }

  const catLower = category.toLowerCase();
  const isFridge = catLower.includes("refrigerat") || catLower.includes("fridge") || catLower.includes("freezer") || catLower.includes("chiller");
  const isWasher = catLower.includes("wash") || catLower.includes("laundry");
  const isComputer = catLower.includes("computer") || catLower.includes("laptop") || catLower.includes("desktop") || catLower.includes("pc");

  // Custom user cruising wattage if provided (e.g. commercial chest freezer or PC effective running watts)
  const customCruisingWatts =
    options && typeof options === "object"
      ? (Number(options.cruising_watts) > 0
          ? Number(options.cruising_watts)
          : Number(options.ai_metadata?.cruising_watts) > 0
          ? Number(options.ai_metadata?.cruising_watts)
          : undefined)
      : undefined;

  // If explicit cruising / effective running wattage is defined, calculate based on that
  if (customCruisingWatts !== undefined && customCruisingWatts > 0) {
    return Number(((customCruisingWatts * qty * h) / 1000).toFixed(4));
  }

  if (isInverter) {
    if (isFridge) {
      // 24/7 Linear Inverter Refrigerator / Freezer: steady thermal maintenance (1/3 ~33.3% standard cycle or custom cruising watts)
      const runningWatts = customCruisingWatts !== undefined ? customCruisingWatts : (watts / 3);
      return Number(((runningWatts * qty * h) / 1000).toFixed(4));
    }

    if (isWasher) {
      // Inverter Direct Drive variable motor (~50% variable cycle during active wash/spin)
      const runningWatts = customCruisingWatts !== undefined ? customCruisingWatts : (watts * 0.50);
      return Number(((runningWatts * qty * h) / 1000).toFixed(4));
    }

    // Inverter AC / General Inverter Compressor time-decay:
    // 1st hour: 100% capacity (pull-down cooldown)
    // Hours > 1: Cruising maintenance capacity (default 42% or custom user cruising wattage)
    const cruisingWatts = customCruisingWatts !== undefined ? customCruisingWatts : (watts * 0.42);
    if (h <= 1) {
      return Number(((watts * qty * h) / 1000).toFixed(4));
    }
    const pullDownKwh = (watts * qty * 1) / 1000;
    const cruisingKwh = (cruisingWatts * qty * (h - 1)) / 1000;
    return Number((pullDownKwh + cruisingKwh).toFixed(4));
  }

  // Computers & Laptops default workload factor (45% of peak/charger rating if no cruising_watts is specified)
  if (isComputer) {
    const runningWatts = Math.round(watts * 0.45);
    return Number(((runningWatts * qty * h) / 1000).toFixed(4));
  }

  // Non-inverter standard calculation
  return Number(((watts * qty * h) / 1000).toFixed(4));
}

/**
 * Calculates accurate kWh directly from a UserAppliance object with automatic Inverter detection
 */
export function calculateApplianceKwh(
  app: Partial<UserAppliance>,
  hours?: number
): number {
  const h = hours !== undefined ? hours : Number(app.hours_per_day) || 0;
  const qty = app.quantity || 1;
  const watts = app.watts || 0;

  const supports = isCompressorInverterCategory(app.category);

  return calculateKwh(watts, h, qty, {
    isInverter: supports && Boolean(app.is_inverter ?? (app.ai_metadata?.is_inverter === true)),
    category: app.category,
    energy_rating: app.energy_rating,
    name: app.name,
    model: app.model,
    ai_metadata: app.ai_metadata,
    cruising_watts: app.cruising_watts ?? app.ai_metadata?.cruising_watts,
  });
}

/**
 * Computes estimated peso cost given kWh and effective rate
 */
export function calculateCost(kwh: number, effectiveRate: number = DEFAULT_EFFECTIVE_RATE): number {
  return Number((kwh * effectiveRate).toFixed(2));
}

/**
 * Converts total seconds into { hours, minutes, seconds } components
 */
export function secondsToHms(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return { hours: h, minutes: m, seconds: s };
}

/**
 * Converts HH:MM:SS components into decimal hours (e.g. 8h 30m 15s → 8.5042)
 */
export function hmsToDecimalHours(h: number, m: number, s: number): number {
  return Number((h + m / 60 + s / 3600).toFixed(6));
}

/**
 * Converts decimal hours into HH:MM:SS components (e.g. 8.5042 → { hours: 8, minutes: 30, seconds: 15 })
 */
export function decimalHoursToHms(decimal: number): { hours: number; minutes: number; seconds: number } {
  const totalSeconds = Math.round(decimal * 3600);
  return secondsToHms(totalSeconds);
}

/**
 * Formats HH:MM:SS components into a padded display string (e.g. "08:00:32")
 */
export function formatHmsString(h: number, m: number, s: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Upserts a single daily appliance usage record in Supabase
 */
export async function upsertDailyUsageRecord(params: {
  appliance_id: string;
  usage_date: string;
  hours_used: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  source?: "manual" | "live_session" | "schedule_autofill" | "routine_default";
  notes?: string;
  user_id?: string | null;
}): Promise<DailyApplianceUsage | null> {
  const quantity = params.quantity || 1;
  const clampedHours = Math.max(0, Math.min(24, Number(params.hours_used.toFixed(2))));
  const kwh = calculateKwh(params.watts, clampedHours, quantity);
  const cost = calculateCost(kwh, params.effectiveRate || DEFAULT_EFFECTIVE_RATE);

  const payload: Partial<DailyApplianceUsage> = {
    appliance_id: params.appliance_id,
    usage_date: params.usage_date,
    hours_used: clampedHours,
    kwh_consumed: kwh,
    estimated_cost: cost,
    source: params.source || "manual",
    notes: params.notes || null,
    updated_at: new Date().toISOString(),
  };

  if (params.user_id) {
    payload.user_id = params.user_id;
  }

  try {
    const { data, error } = await supabaseClient
      .from("daily_appliance_usage")
      .upsert(payload, {
        onConflict: "user_id,appliance_id,usage_date",
      })
      .select()
      .single();

    if (error) {
      devLog.warn("DailyUsageService", `Failed to upsert usage record: ${error.message}`, payload);
      return null;
    }

    devLog.info("DailyUsageService", `Saved daily usage: ${clampedHours}h (${kwh} kWh / ₱${cost})`, data);
    return data as DailyApplianceUsage;
  } catch (err: any) {
    devLog.error("DailyUsageService", `Exception in upsertDailyUsageRecord: ${err?.message}`, err);
    return null;
  }
}

/**
 * Batch saves multiple appliance usage rows for a specific date
 */
export async function batchSaveDailyUsage(
  usage_date: string,
  entries: Array<{
    appliance_id: string;
    hours_used: number;
    watts: number;
    quantity?: number;
    effectiveRate?: number;
    source?: "manual" | "live_session" | "schedule_autofill" | "routine_default";
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
      source: e.source || "manual",
      notes: e.notes || null,
      user_id: e.user_id || null,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    const { error } = await supabaseClient
      .from("daily_appliance_usage")
      .upsert(rows, {
        onConflict: "user_id,appliance_id,usage_date",
      });

    if (error) {
      devLog.warn("DailyUsageService", `Batch save error: ${error.message}`, rows);
      return false;
    }

    devLog.info("DailyUsageService", `Batch saved ${rows.length} appliance usage rows for ${usage_date}`);
    return true;
  } catch (err: any) {
    devLog.error("DailyUsageService", `Exception in batchSaveDailyUsage: ${err?.message}`, err);
    return false;
  }
}

/**
 * Batch saves appliance routine baseline defaults across a multi-day date range (e.g. Aug 1 - Aug 23 or Aug 1 - Aug 31)
 */
export async function batchSaveDailyUsageAcrossRange(params: {
  startDate: Date;
  endDate: Date;
  appliances: UserAppliance[];
  effectiveRate?: number;
  source?: "routine_default" | "manual";
  overwriteExisting?: boolean;
  excludeToday?: boolean;
  userId?: string | null;
}): Promise<{ success: boolean; totalDays: number; totalRows: number }> {
  const {
    startDate,
    endDate,
    appliances,
    effectiveRate = DEFAULT_EFFECTIVE_RATE,
    source = "routine_default",
    overwriteExisting = true,
    excludeToday = false,
    userId = null,
  } = params;

  if (appliances.length === 0 || endDate < startDate) {
    return { success: true, totalDays: 0, totalRows: 0 };
  }

  // Generate list of dates in the range
  const dateKeys: string[] = [];
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const todayKey = formatDateToKey(new Date());

  while (current <= end) {
    const dKey = formatDateToKey(current);
    if (!excludeToday || dKey !== todayKey) {
      dateKeys.push(dKey);
    }
    current.setDate(current.getDate() + 1);
  }

  if (dateKeys.length === 0) {
    return { success: true, totalDays: 0, totalRows: 0 };
  }

  // If not overwriting existing, find dates that already have logged data
  let existingKeys = new Set<string>();
  if (!overwriteExisting) {
    try {
      const { data } = await supabaseClient
        .from("daily_appliance_usage")
        .select("usage_date, appliance_id")
        .in("usage_date", dateKeys);

      if (data) {
        data.forEach((row: any) => existingKeys.add(`${row.usage_date}_${row.appliance_id}`));
      }
    } catch (e) {
      devLog.warn("DailyUsageService", "Could not check existing records:", e);
    }
  }

  const allRows: any[] = [];
  const sessionLogRows: any[] = [];

  dateKeys.forEach((dKey) => {
    const isPastOrToday = dKey <= todayKey;
    const [y, m, d] = dKey.split("-").map(Number);

    appliances.forEach((app) => {
      if (!overwriteExisting && existingKeys.has(`${dKey}_${app.id}`)) {
        return; // skip existing
      }

      const hours = Math.max(0, Math.min(24, Number(app.hours_per_day) || 0));
      const kwh = calculateApplianceKwh(app, hours);
      const cost = calculateCost(kwh, effectiveRate);

      allRows.push({
        appliance_id: app.id,
        usage_date: dKey,
        hours_used: hours,
        kwh_consumed: kwh,
        estimated_cost: cost,
        source,
        notes: `Routine default baseline (${hours}h/day)`,
        user_id: app.user_id || userId,
        updated_at: new Date().toISOString(),
      });

      // If date is in the past, also log a tangible timestamped session in appliance_usage_logs
      if (isPastOrToday && hours > 0) {
        const startHour = app.start_hour !== undefined ? app.start_hour : 8;
        const startTime = new Date(y, m - 1, d, startHour, 0, 0);
        const durationMinutes = Math.round(hours * 60);
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

        sessionLogRows.push({
          appliance_id: app.id,
          user_id: app.user_id || userId,
          started_at: startTime.toISOString(),
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          kwh_consumed: kwh,
          estimated_cost: cost,
          source: "routine_autofill",
        });
      }
    });
  });

  if (allRows.length === 0) {
    return { success: true, totalDays: dateKeys.length, totalRows: 0 };
  }

  try {
    // 1. Chunk inserts for daily_appliance_usage in batches of 200 rows
    const chunkSize = 200;
    for (let i = 0; i < allRows.length; i += chunkSize) {
      const chunk = allRows.slice(i, i + chunkSize);
      const { error } = await supabaseClient
        .from("daily_appliance_usage")
        .upsert(chunk, {
          onConflict: "user_id,appliance_id,usage_date",
        });

      if (error) {
        devLog.error("DailyUsageService", `Error bulk upserting chunk ${i}: ${error.message}`, error);
        return { success: false, totalDays: dateKeys.length, totalRows: i };
      }
    }

    // 2. Also insert corresponding timestamped session logs into appliance_usage_logs
    if (sessionLogRows.length > 0) {
      for (let i = 0; i < sessionLogRows.length; i += chunkSize) {
        const logChunk = sessionLogRows.slice(i, i + chunkSize);
        const { error: logErr } = await supabaseClient
          .from("appliance_usage_logs")
          .insert(logChunk);

        if (logErr) {
          devLog.warn("DailyUsageService", `Non-fatal: could not write session logs batch: ${logErr.message}`);
        }
      }
    }

    devLog.info("DailyUsageService", `Successfully batch saved ${allRows.length} rows across ${dateKeys.length} days (${sessionLogRows.length} session logs created).`);
    return { success: true, totalDays: dateKeys.length, totalRows: allRows.length };
  } catch (err: any) {
    devLog.error("DailyUsageService", `Exception in batchSaveDailyUsageAcrossRange: ${err?.message}`, err);
    return { success: false, totalDays: dateKeys.length, totalRows: 0 };
  }
}


export interface DaySessionSlice {
  dateKey: string;
  hours: number;
  startHourFrac: number;
  endHourFrac: number;
  startTime: Date;
  endTime: Date;
}

/**
 * Splits any session (single-day, overnight, or multi-day) across 12:00 AM midnight boundaries
 */
export function splitSessionAcrossDays(startTime: Date, endTime: Date): DaySessionSlice[] {
  const slices: DaySessionSlice[] = [];
  if (endTime.getTime() <= startTime.getTime()) return slices;

  let currentStart = new Date(startTime);

  while (currentStart < endTime) {
    const dateKey = formatDateToKey(currentStart);

    // Midnight end of the current day
    const endOfDay = new Date(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate() + 1, 0, 0, 0, 0);
    const sliceEnd = endTime < endOfDay ? new Date(endTime) : endOfDay;

    const startHourFrac = currentStart.getHours() + currentStart.getMinutes() / 60 + currentStart.getSeconds() / 3600;
    const isEndOfDay = sliceEnd.getTime() === endOfDay.getTime();
    const endHourFrac = isEndOfDay ? 24 : (sliceEnd.getHours() + sliceEnd.getMinutes() / 60 + sliceEnd.getSeconds() / 3600);

    const hours = Math.max(0.001, (sliceEnd.getTime() - currentStart.getTime()) / 3600000);

    slices.push({
      dateKey,
      hours: Number(hours.toFixed(4)),
      startHourFrac,
      endHourFrac,
      startTime: new Date(currentStart),
      endTime: new Date(sliceEnd),
    });

    currentStart = endOfDay;
  }

  return slices;
}

export interface TimeInterval {
  startHour: number;
  endHour: number;
}

/**
 * Finds available non-overlapping time intervals throughout a 24-hour day (0 to 24)
 * to place desired hours, prioritizing starting near preferredStartHour.
 */
export function allocateNonOverlappingSlots(
  occupiedIntervals: TimeInterval[],
  neededHours: number,
  preferredStartHour: number = 8
): TimeInterval[] {
  if (neededHours <= 0.001) return [];

  // Normalize occupied intervals and filter out zero/negative duration
  const sortedOccupied = [...occupiedIntervals]
    .map((iv) => ({
      startHour: Math.max(0, Math.min(24, iv.startHour)),
      endHour: Math.max(0, Math.min(24, iv.endHour)),
    }))
    .filter((iv) => iv.endHour > iv.startHour)
    .sort((a, b) => a.startHour - b.startHour);

  // Merge overlapping or contiguous occupied intervals
  const mergedOccupied: TimeInterval[] = [];
  for (const iv of sortedOccupied) {
    if (mergedOccupied.length === 0) {
      mergedOccupied.push({ ...iv });
    } else {
      const last = mergedOccupied[mergedOccupied.length - 1];
      if (iv.startHour <= last.endHour + 0.001) {
        last.endHour = Math.max(last.endHour, iv.endHour);
      } else {
        mergedOccupied.push({ ...iv });
      }
    }
  }

  // Find all free gaps in the 24-hour period [0, 24]
  const freeGaps: TimeInterval[] = [];
  let currentPos = 0;

  for (const occ of mergedOccupied) {
    if (occ.startHour > currentPos + 0.001) {
      freeGaps.push({ startHour: currentPos, endHour: occ.startHour });
    }
    currentPos = Math.max(currentPos, occ.endHour);
  }
  if (currentPos < 24 - 0.001) {
    freeGaps.push({ startHour: currentPos, endHour: 24 });
  }

  if (freeGaps.length === 0) return [];

  // Score free gaps based on proximity to preferredStartHour
  const scoredGaps = freeGaps
    .map((gap) => {
      let dist = 0;
      if (preferredStartHour < gap.startHour) {
        dist = gap.startHour - preferredStartHour;
      } else if (preferredStartHour >= gap.endHour) {
        dist = preferredStartHour - gap.endHour + 24;
      }
      return { gap, dist };
    })
    .sort((a, b) => a.dist - b.dist);

  let hoursRemaining = Math.min(24, neededHours);
  const allocated: TimeInterval[] = [];

  for (const { gap } of scoredGaps) {
    if (hoursRemaining <= 0.001) break;

    // If preferred start hour falls within this gap, start there
    let start = gap.startHour;
    if (preferredStartHour >= gap.startHour && preferredStartHour < gap.endHour) {
      start = preferredStartHour;
    }

    const availableFromStart = gap.endHour - start;
    const take = Math.min(hoursRemaining, availableFromStart);

    if (take > 0.001) {
      allocated.push({
        startHour: start,
        endHour: start + take,
      });
      hoursRemaining -= take;
    }

    // If space remains before preferredStartHour in this same gap:
    if (hoursRemaining > 0.001 && start > gap.startHour) {
      const takeBefore = Math.min(hoursRemaining, start - gap.startHour);
      if (takeBefore > 0.001) {
        allocated.push({
          startHour: start - takeBefore,
          endHour: start,
        });
        hoursRemaining -= takeBefore;
      }
    }
  }

  return allocated.sort((a, b) => a.startHour - b.startHour);
}

/**
 * Accumulates live stopwatch runtime into the daily usage table across midnight boundaries
 */
export async function accumulateLiveSessionDailyUsage(params: {
  appliance_id: string;
  durationMinutes: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
  startTime?: Date;
  endTime?: Date;
}): Promise<void> {
  const quantity = params.quantity || 1;
  const rate = params.effectiveRate || DEFAULT_EFFECTIVE_RATE;

  const endTime = params.endTime || new Date();
  const startTime = params.startTime || new Date(endTime.getTime() - params.durationMinutes * 60000);

  const slices = splitSessionAcrossDays(startTime, endTime);

  for (const slice of slices) {
    try {
      let query = supabaseClient
        .from("daily_appliance_usage")
        .select("*")
        .eq("appliance_id", params.appliance_id)
        .eq("usage_date", slice.dateKey);

      if (params.user_id) {
        query = query.eq("user_id", params.user_id);
      }

      const { data: existing } = await query.maybeSingle();

      const currentHours = existing ? Number(existing.hours_used || 0) : 0;
      const totalHours = Math.max(0, Math.min(24, Number((currentHours + slice.hours).toFixed(2))));
      const kwh = calculateKwh(params.watts, totalHours, quantity);
      const cost = calculateCost(kwh, rate);

      await supabaseClient.from("daily_appliance_usage").upsert(
        {
          appliance_id: params.appliance_id,
          user_id: params.user_id || null,
          usage_date: slice.dateKey,
          hours_used: totalHours,
          kwh_consumed: kwh,
          estimated_cost: cost,
          source: "live_session",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,appliance_id,usage_date",
        }
      );

      devLog.info(
        "DailyUsageService",
        `Accumulated live slice for ${params.appliance_id} on ${slice.dateKey}: +${slice.hours.toFixed(2)}h -> Total: ${totalHours}h`
      );
    } catch (err: any) {
      devLog.warn("DailyUsageService", `Failed to accumulate live session for ${slice.dateKey}: ${err?.message}`);
    }
  }
}

/**
 * Deducts a session's hours from the daily usage table across midnight boundaries (e.g. when a log is deleted)
 */
export async function deductSessionDailyUsage(params: {
  appliance_id: string;
  durationMinutes: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
  startTime?: Date;
  endTime?: Date;
}): Promise<void> {
  const quantity = params.quantity || 1;
  const rate = params.effectiveRate || DEFAULT_EFFECTIVE_RATE;

  const endTime = params.endTime || new Date();
  const startTime = params.startTime || new Date(endTime.getTime() - params.durationMinutes * 60000);

  const slices = splitSessionAcrossDays(startTime, endTime);

  for (const slice of slices) {
    try {
      let query = supabaseClient
        .from("daily_appliance_usage")
        .select("*")
        .eq("appliance_id", params.appliance_id)
        .eq("usage_date", slice.dateKey);

      if (params.user_id) {
        query = query.eq("user_id", params.user_id);
      }

      const { data: existing } = await query.maybeSingle();
      if (!existing) continue;

      const currentHours = Number(existing.hours_used || 0);
      const totalHours = Math.max(0, Number((currentHours - slice.hours).toFixed(2)));
      const kwh = calculateKwh(params.watts, totalHours, quantity);
      const cost = calculateCost(kwh, rate);

      await supabaseClient.from("daily_appliance_usage").upsert(
        {
          appliance_id: params.appliance_id,
          user_id: params.user_id || null,
          usage_date: slice.dateKey,
          hours_used: totalHours,
          kwh_consumed: kwh,
          estimated_cost: cost,
          source: existing.source || "live_session",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,appliance_id,usage_date",
        }
      );

      devLog.info(
        "DailyUsageService",
        `Deducted session slice for ${params.appliance_id} on ${slice.dateKey}: -${slice.hours.toFixed(2)}h -> Total: ${totalHours}h`
      );
    } catch (err: any) {
      devLog.warn("DailyUsageService", `Failed to deduct session for ${slice.dateKey}: ${err?.message}`);
    }
  }
}

/**
 * Reconciles an updated session log by removing old duration slices and applying new duration slices
 */
export async function reconcileUpdatedSessionLog(params: {
  appliance_id: string;
  oldDurationMinutes: number;
  newDurationMinutes: number;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
  startTime: Date;
}): Promise<void> {
  const oldEndTime = new Date(params.startTime.getTime() + params.oldDurationMinutes * 60000);
  const newEndTime = new Date(params.startTime.getTime() + params.newDurationMinutes * 60000);

  // 1. Deduct old slice(s)
  await deductSessionDailyUsage({
    appliance_id: params.appliance_id,
    durationMinutes: params.oldDurationMinutes,
    watts: params.watts,
    quantity: params.quantity,
    effectiveRate: params.effectiveRate,
    user_id: params.user_id,
    startTime: params.startTime,
    endTime: oldEndTime,
  });

  // 2. Accumulate new slice(s)
  await accumulateLiveSessionDailyUsage({
    appliance_id: params.appliance_id,
    durationMinutes: params.newDurationMinutes,
    watts: params.watts,
    quantity: params.quantity,
    effectiveRate: params.effectiveRate,
    user_id: params.user_id,
    startTime: params.startTime,
    endTime: newEndTime,
  });
}

/**
 * Saves an exact past session with anti-duplication allocation support (Option 1).
 * If allocationMode is 'allocate_inside' and existing daily usage exists, it ensures the total daily hours
 * is max(existingHours, sessionHours) rather than adding blindly on top, preventing data doubling.
 */
export async function savePastSessionWithAllocation(params: {
  appliance_id: string;
  startDate: Date;
  endDate: Date;
  watts: number;
  quantity?: number;
  effectiveRate?: number;
  user_id?: string | null;
  allocationMode?: "allocate_inside" | "add_additional";
}): Promise<{ totalMinutes: number; totalKwh: number; totalCost: number }> {
  const quantity = params.quantity || 1;
  const rate = params.effectiveRate || DEFAULT_EFFECTIVE_RATE;
  const allocationMode = params.allocationMode || "allocate_inside";

  const totalMinutes = Math.max(1, Math.round((params.endDate.getTime() - params.startDate.getTime()) / 60000));
  const totalKwh = calculateKwh(params.watts, totalMinutes / 60, quantity);
  const totalCost = calculateCost(totalKwh, rate);

  // 1. Insert log in appliance_usage_logs
  try {
    await supabaseClient.from("appliance_usage_logs").insert({
      appliance_id: params.appliance_id,
      user_id: params.user_id || null,
      started_at: params.startDate.toISOString(),
      ended_at: params.endDate.toISOString(),
      duration_minutes: totalMinutes,
      kwh_consumed: totalKwh,
      estimated_cost: totalCost,
      source: "past_time_range",
    });
  } catch (logErr: any) {
    devLog.warn("DailyUsageService", `Failed to insert past session log: ${logErr?.message}`);
  }

  // 2. Distribute across daily_appliance_usage
  const slices = splitSessionAcrossDays(params.startDate, params.endDate);

  for (const slice of slices) {
    try {
      let query = supabaseClient
        .from("daily_appliance_usage")
        .select("*")
        .eq("appliance_id", params.appliance_id)
        .eq("usage_date", slice.dateKey);

      if (params.user_id) {
        query = query.eq("user_id", params.user_id);
      }

      const { data: existing } = await query.maybeSingle();
      const existingHours = existing ? Number(existing.hours_used || 0) : 0;

      let newHours: number;
      if (allocationMode === "allocate_inside" && existingHours > 0) {
        // Keep existing total unless session exceeds it
        newHours = Math.max(existingHours, slice.hours);
      } else {
        // Additive
        newHours = existingHours + slice.hours;
      }

      const clampedHours = Math.max(0, Math.min(24, Number(newHours.toFixed(2))));
      const kwh = calculateKwh(params.watts, clampedHours, quantity);
      const cost = calculateCost(kwh, rate);

      await supabaseClient.from("daily_appliance_usage").upsert(
        {
          appliance_id: params.appliance_id,
          user_id: params.user_id || null,
          usage_date: slice.dateKey,
          hours_used: clampedHours,
          kwh_consumed: kwh,
          estimated_cost: cost,
          source: existingHours > 0 && allocationMode === "allocate_inside" ? existing?.source || "manual" : "live_session",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,appliance_id,usage_date",
        }
      );

      devLog.info(
        "DailyUsageService",
        `Saved past session slice (${allocationMode}) for ${params.appliance_id} on ${slice.dateKey}: ${clampedHours}h (₱${cost})`
      );
    } catch (err: any) {
      devLog.warn("DailyUsageService", `Error writing daily usage slice for ${slice.dateKey}: ${err?.message}`);
    }
  }

  return { totalMinutes, totalKwh, totalCost };
}

let isReconcilingStopwatches = false;

/**
 * Reconciles running stopwatches that crossed midnight (11:59:59 PM).
 * Automatically finalizes yesterday's usage rows into appliance_usage_logs & daily_appliance_usage,
 * and advances the appliance's last_turned_on_at to 00:00:00 of the new day.
 */
export async function reconcileOvernightRunningStopwatches(
  appliances: UserAppliance[],
  effectiveRate: number = DEFAULT_EFFECTIVE_RATE
): Promise<{ rolledOverCount: number; affectedDates: string[] }> {
  if (isReconcilingStopwatches) {
    return { rolledOverCount: 0, affectedDates: [] };
  }

  const now = new Date();
  const todayKey = formatDateToKey(now);
  const affectedDatesSet = new Set<string>();
  let rolledOverCount = 0;

  // Filter running appliances started before today
  const overnightAppliances = appliances.filter((app) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return false;
    const start = new Date(app.last_turned_on_at);
    if (isNaN(start.getTime())) return false;
    return formatDateToKey(start) < todayKey;
  });

  if (overnightAppliances.length === 0) {
    return { rolledOverCount: 0, affectedDates: [] };
  }

  isReconcilingStopwatches = true;
  try {
    for (const app of overnightAppliances) {
      const start = new Date(app.last_turned_on_at!);
      const slices = splitSessionAcrossDays(start, now);
      const pastSlices = slices.filter((s) => s.dateKey < todayKey);

      if (pastSlices.length === 0) continue;

      for (const slice of pastSlices) {
        const sliceMinutes = Math.max(1, Math.round(slice.hours * 60));
        const sliceKwh = calculateApplianceKwh(app, slice.hours);
        const sliceCost = calculateCost(sliceKwh, effectiveRate);

        // 1. Insert completed log for yesterday/past day
        await supabaseClient.from("appliance_usage_logs").insert({
          appliance_id: app.id,
          user_id: app.user_id || null,
          started_at: slice.startTime.toISOString(),
          ended_at: slice.endTime.toISOString(),
          duration_minutes: sliceMinutes,
          kwh_consumed: sliceKwh,
          estimated_cost: sliceCost,
          source: "stopwatch_midnight_rollover",
        });

        // 2. Accumulate/Upsert into daily_appliance_usage
        const { data: existing } = await supabaseClient
          .from("daily_appliance_usage")
          .select("*")
          .eq("appliance_id", app.id)
          .eq("usage_date", slice.dateKey)
          .maybeSingle();

        const currentHours = existing ? Number(existing.hours_used || 0) : 0;
        const totalHours = Math.max(0, Math.min(24, Number((currentHours + slice.hours).toFixed(2))));
        const kwh = calculateApplianceKwh(app, totalHours);
        const cost = calculateCost(kwh, effectiveRate);

        await supabaseClient.from("daily_appliance_usage").upsert(
          {
            appliance_id: app.id,
            user_id: app.user_id || null,
            usage_date: slice.dateKey,
            hours_used: totalHours,
            kwh_consumed: kwh,
            estimated_cost: cost,
            source: "live_session",
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,appliance_id,usage_date",
          }
        );

        affectedDatesSet.add(slice.dateKey);
      }

      // 3. Advance last_turned_on_at to today midnight 00:00:00.000
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      await supabaseClient
        .from("user_appliances")
        .update({
          last_turned_on_at: todayMidnight.toISOString(),
          is_currently_on: true,
        })
        .eq("id", app.id);

      rolledOverCount += 1;
      devLog.info(
        "DailyUsageService",
        `Auto-rolled over stopwatch for ${app.name}: Finalized ${pastSlices.length} past slice(s), advanced timer to 00:00:00.`
      );
    }

    if (rolledOverCount > 0 && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("powerforecast_stopwatch_rollover", {
          detail: {
            rolledOverCount,
            affectedDates: Array.from(affectedDatesSet),
          },
        })
      );
    }
  } catch (err: any) {
    devLog.error("DailyUsageService", `Exception during overnight stopwatch reconciliation: ${err?.message}`, err);
  } finally {
    isReconcilingStopwatches = false;
  }

  return {
    rolledOverCount,
    affectedDates: Array.from(affectedDatesSet),
  };
}

export interface DayMetricSummary {
  kwh: number;
  cost: number;
  baselineKwh: number;
  baselineCost: number;
  savings: number;
  isLogged: boolean;
  isSimulated: boolean;
  isPeak: boolean;
  applianceCount: number;
  source: "actual_logged" | "simulation" | "projected_routine" | "projected_schedule";
}

/**
 * Calculates day metrics for a calendar cell.
 * If actual logged or simulated rows exist -> returns Simulated/Logged sum and calculates savings vs baseline.
 * Else -> returns Projected baseline from routine inventory defaults + scheduled tasks.
 */
export function computeDayMetrics(
  dateKey: string,
  date: Date,
  loggedUsageForDay: DailyApplianceUsage[],
  appliances: UserAppliance[],
  events: UserCalendarEvent[],
  effectiveRate: number = DEFAULT_EFFECTIVE_RATE
): DayMetricSummary {
  const activeAppliances = appliances.filter((a) => a.is_active !== false);
  const targetApplianceIds = new Set(activeAppliances.map((a) => a.id));
  const filteredLogged = (loggedUsageForDay || []).filter((u) => targetApplianceIds.has(u.appliance_id));

  // 1. Calculate Pure Baseline from default registered hours
  const pureBaselineKwh = Number(
    activeAppliances
      .reduce((acc, app) => acc + calculateApplianceKwh(app, Number(app.hours_per_day) || 0), 0)
      .toFixed(2)
  );
  const pureBaselineCost = Number((pureBaselineKwh * effectiveRate).toFixed(2));

  // 2. If we have logged or simulated usage records in the database
  if (filteredLogged.length > 0) {
    const totalKwh = filteredLogged.reduce((acc, curr) => acc + (Number(curr.kwh_consumed) || 0), 0);
    const totalCost = filteredLogged.reduce((acc, curr) => acc + (Number(curr.estimated_cost) || 0), 0);
    const activeCount = filteredLogged.filter((u) => Number(u.hours_used) > 0).length;
    const isSim = filteredLogged.some((r) => r.source === "schedule_autofill" || r.source === "routine_default");

    return {
      kwh: Number(totalKwh.toFixed(2)),
      cost: Number(totalCost.toFixed(2)),
      baselineKwh: pureBaselineKwh,
      baselineCost: pureBaselineCost,
      savings: Number((pureBaselineCost - totalCost).toFixed(2)),
      isLogged: true,
      isSimulated: isSim,
      isPeak: totalKwh > 18 || totalCost > 270,
      applianceCount: activeCount,
      source: isSim ? "simulation" : "actual_logged",
    };
  }

  // 3. Otherwise return Projected Baseline
  const dayOfWeekMap: Record<number, "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat"> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };
  const dayStr = dayOfWeekMap[date.getDay()];
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  let projectedKwh = activeAppliances.reduce((acc, app) => {
    const defaultHours = Number(app.hours_per_day) || 0;
    const hours = isWeekend ? Math.min(24, defaultHours * 1.15) : defaultHours;
    return acc + calculateApplianceKwh(app, hours);
  }, 0);

  const dayEvents = (events || []).filter((e) => e.day === dayStr || e.is_recurring);
  dayEvents.forEach((ev) => {
    const app = appliances.find((a) => a.id === ev.appliance_id);
    if (app && app.is_active !== false) {
      projectedKwh += calculateApplianceKwh(app, ev.duration_hours || 1);
    } else if (!app) {
      projectedKwh += calculateKwh(500, ev.duration_hours || 1, 1);
    }
  });

  const projectedCost = projectedKwh * effectiveRate;

  return {
    kwh: Number(projectedKwh.toFixed(2)),
    cost: Number(projectedCost.toFixed(2)),
    baselineKwh: pureBaselineKwh,
    baselineCost: pureBaselineCost,
    savings: 0,
    isLogged: false,
    isSimulated: false,
    isPeak: projectedKwh > 18 || projectedCost > 270,
    applianceCount: activeAppliances.length,
    source: dayEvents.length > 0 ? "projected_schedule" : "projected_routine",
  };
}

export const BILLING_PERIOD_STORAGE_KEY = "powerforecast_calendar_billing_period_config";

export const DEFAULT_BILLING_PERIOD_CONFIG: BillingPeriodConfig = {
  mode: "calendar_month",
  cycleStartDay: 15,
  cycleEndOffset: "same_day",
};

export function getStoredBillingPeriodConfig(): BillingPeriodConfig {
  if (typeof window === "undefined") return DEFAULT_BILLING_PERIOD_CONFIG;
  try {
    const raw = localStorage.getItem(BILLING_PERIOD_STORAGE_KEY);
    if (!raw) return DEFAULT_BILLING_PERIOD_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      mode: (parsed.mode as BillingPeriodMode) || "calendar_month",
      cycleStartDay: Number(parsed.cycleStartDay) || 15,
      cycleEndOffset: (parsed.cycleEndOffset as CycleEndOffset) || "same_day",
      customStartDate: parsed.customStartDate,
      customEndDate: parsed.customEndDate,
    };
  } catch (err) {
    return DEFAULT_BILLING_PERIOD_CONFIG;
  }
}

export function setStoredBillingPeriodConfig(config: BillingPeriodConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BILLING_PERIOD_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    // ignore
  }
}

/**
 * Resolves a date window and array of Date objects based on the user's Billing Period settings.
 */
export function resolveBillingPeriodWindow(
  anchorDate: Date,
  config: BillingPeriodConfig = DEFAULT_BILLING_PERIOD_CONFIG
): BillingPeriodWindow {
  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNamesLong = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();

  if (config.mode === "custom_range" && config.customStartDate && config.customEndDate) {
    const start = parseKeyToDate(config.customStartDate);
    const end = parseKeyToDate(config.customEndDate);

    const safeStart = start <= end ? start : end;
    const safeEnd = start <= end ? end : start;

    const days: Date[] = [];
    const cur = new Date(safeStart.getFullYear(), safeStart.getMonth(), safeStart.getDate());
    const endD = new Date(safeEnd.getFullYear(), safeEnd.getMonth(), safeEnd.getDate());

    let guard = 0;
    while (cur <= endD && guard < 90) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }

    const startLabel = `${monthNamesShort[safeStart.getMonth()]} ${safeStart.getDate()}, ${safeStart.getFullYear()}`;
    const endLabel = `${monthNamesShort[safeEnd.getMonth()]} ${safeEnd.getDate()}, ${safeEnd.getFullYear()}`;
    const isCrossMonth = safeStart.getMonth() !== safeEnd.getMonth() || safeStart.getFullYear() !== safeEnd.getFullYear();

    return {
      startDate: safeStart,
      endDate: safeEnd,
      days,
      label: `${startLabel} – ${endLabel}`,
      subLabel: `Custom Window • ${days.length} Days`,
      isCrossMonth,
    };
  }

  if (config.mode === "recurring_cycle") {
    const startDayReq = Math.max(1, Math.min(31, config.cycleStartDay || 15));

    // Previous month anchor
    const prevMonthDate = new Date(year, month - 1, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    const maxDaysPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
    const safeStartDay = Math.min(startDayReq, maxDaysPrev);
    const startDate = new Date(prevYear, prevMonth, safeStartDay);

    // Target end date with cycleEndOffset
    // 'same_day' => offset 0 (e.g. Sep 15 to Oct 15)
    // 'day_before' => offset -1 (e.g. Sep 15 to Oct 14)
    // 'day_after' => offset +1 (e.g. Sep 15 to Oct 16)
    let dayOffset = 0;
    if (config.cycleEndOffset === "day_before") dayOffset = -1;
    else if (config.cycleEndOffset === "day_after") dayOffset = 1;

    const endDate = new Date(year, month, startDayReq + dayOffset);

    const days: Date[] = [];
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endD = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    let guard = 0;
    while (cur <= endD && guard < 60) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      guard++;
    }

    const startLabel = `${monthNamesShort[startDate.getMonth()]} ${startDate.getDate()}`;
    const endYearStr = endDate.getFullYear() !== startDate.getFullYear() ? `, ${startDate.getFullYear()}` : "";
    const endLabel = `${monthNamesShort[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;

    let offsetText = "Exact Day Parity";
    if (config.cycleEndOffset === "day_before") offsetText = "Cutoff Day Before";
    if (config.cycleEndOffset === "day_after") offsetText = "Cutoff Day After";

    return {
      startDate,
      endDate,
      days,
      label: `${startLabel}${endYearStr} – ${endLabel}`,
      subLabel: `Billing Cycle (Day ${startDayReq} • ${offsetText}) • ${days.length} Days`,
      isCrossMonth: true,
    };
  }

  // Default: Calendar Month (1st to last day)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month, daysInMonth);
  const days: Date[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(new Date(year, month, d));
  }

  return {
    startDate,
    endDate,
    days,
    label: `${monthNamesLong[month]} ${year}`,
    subLabel: `Standard Month • ${days.length} Days`,
    isCrossMonth: false,
  };
}
