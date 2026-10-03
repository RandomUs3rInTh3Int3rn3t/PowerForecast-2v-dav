import { devLog } from "./devLogger";
import { executeWithGeminiKeyRotation } from "./geminiKeyService";
import { UserAppliance } from "../types";

export interface AiEnergyTip {
  id: string;
  title: string;
  description: string;
  saving: string;
  badgeColor: "primary" | "secondary" | "success" | "warning" | "info";
  category?: "cooling" | "peak_shift" | "vampire" | "hardware" | "behavior" | "live_load";
}

export interface LiveTrackerMetrics {
  runningCount: number;
  liveWattsNow: number;
  runningApplianceNames: string[];
  todayMeasuredKwh: number;
  todayMeasuredCost: number;
  hasActualHistory: boolean;
  totalMeasuredKwh: number;
  totalMeasuredCost: number;
}

export interface EnergyAuditContext {
  appliances: UserAppliance[];
  totalMonthlyKwh: number;
  totalCost: number;
  effectiveRate: number;
  tariffType: string;
  distributionTier?: { tier: string; label: string };
  efficiencyMetrics?: {
    efficiencyPct: number;
    inverterCount: number;
    totalCount: number;
    grade: string;
  };
  vampireMetrics?: {
    standbyMonthlyCost: number;
    vampireDevicesCount: number;
    standbyWattsTotal?: number;
    vampireWatts?: number;
  };
  liveTrackerMetrics?: LiveTrackerMetrics;
  spaceId?: string;
  userId?: string;
}

export interface PersistedEnergyAudit {
  tips: AiEnergyTip[];
  isFallback: boolean;
  generatedAt: string;
  generatedDate: string;
  inventoryHash: string;
  userId?: string;
  spaceId?: string;
}

export const MAX_DAILY_AI_GENERATIONS = 5;

/**
 * Calculates a deterministic fingerprint hash of the user's appliance inventory & telemetry.
 * Used to detect additions, deletions, or edits to notify the user when an audit is stale.
 */
export function computeInventoryFingerprint(appliances: UserAppliance[], totalKwh: number): string {
  const summary = appliances
    .map(
      (a) =>
        `${a.id}:${a.name}:${a.watts}:${a.quantity || 1}:${a.hours_per_day}:${a.is_inverter ? 1 : 0}:${
          a.is_active !== false ? 1 : 0
        }`
    )
    .sort()
    .join("|");
  return `fp_${appliances.length}_${Math.round(totalKwh)}_${summary}`;
}

/**
 * Helper to get local YYYY-MM-DD date key
 */
function getTodayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Retrieves the daily AI generation quota for the user.
 * Automatically resets at 12:00 AM midnight.
 */
export function getDailyAiQuota(userId?: string): {
  used: number;
  remaining: number;
  max: number;
  resetTime: string;
} {
  if (typeof window === "undefined" || !window.localStorage) {
    return { used: 0, remaining: MAX_DAILY_AI_GENERATIONS, max: MAX_DAILY_AI_GENERATIONS, resetTime: "12:00 AM" };
  }
  const key = `powerforecast_ai_quota_${userId || "local"}_${getTodayDateKey()}`;
  try {
    const val = Number(localStorage.getItem(key)) || 0;
    const remaining = Math.max(0, MAX_DAILY_AI_GENERATIONS - val);
    return {
      used: val,
      remaining,
      max: MAX_DAILY_AI_GENERATIONS,
      resetTime: "12:00 AM",
    };
  } catch {
    return { used: 0, remaining: MAX_DAILY_AI_GENERATIONS, max: MAX_DAILY_AI_GENERATIONS, resetTime: "12:00 AM" };
  }
}

/**
 * Consumes 1 credit from the user's daily quota. Returns true if successful, false if quota exceeded.
 */
export function consumeDailyAiQuota(userId?: string): boolean {
  if (typeof window === "undefined" || !window.localStorage) return true;
  const quota = getDailyAiQuota(userId);
  if (quota.remaining <= 0) return false;
  const key = `powerforecast_ai_quota_${userId || "local"}_${getTodayDateKey()}`;
  try {
    localStorage.setItem(key, String(quota.used + 1));
    return true;
  } catch {
    return true;
  }
}

/**
 * Key for long-term persistent storage in localStorage
 */
function getPersistentStorageKey(userId?: string, spaceId?: string): string {
  return `powerforecast_persisted_ai_tips_${userId || "local"}_${spaceId || "all"}`;
}

/**
 * Read persisted AI tips from localStorage (retained across logout, refresh, and system close)
 */
export function getPersistedAiTips(userId?: string, spaceId?: string): PersistedEnergyAudit | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const key = getPersistentStorageKey(userId, spaceId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tips) && parsed.tips.length > 0) {
      return parsed as PersistedEnergyAudit;
    }
  } catch (err) {
    devLog.warn("AI Tips Persistence", "Failed to load persisted AI tips", { error: err });
  }
  return null;
}

/**
 * Save persisted AI tips to localStorage
 */
export function setPersistedAiTips(
  userId: string | undefined,
  spaceId: string | undefined,
  audit: PersistedEnergyAudit
): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  const key = getPersistentStorageKey(userId, spaceId);
  try {
    localStorage.setItem(key, JSON.stringify(audit));
  } catch (err) {
    devLog.warn("AI Tips Persistence", "Failed to save persisted AI tips", { error: err });
  }
}

// Backward compatible aliases
export const getCachedAiTips = (spaceId?: string) => getPersistedAiTips(undefined, spaceId);
export const setCachedAiTips = (spaceId: string | undefined, result: any) =>
  setPersistedAiTips(undefined, spaceId, {
    tips: result.tips,
    isFallback: result.isFallback,
    generatedAt: result.generatedAt,
    generatedDate: new Date().toISOString(),
    inventoryHash: "",
    spaceId,
  });

/**
 * Resilient Multi-Alias Parser: Extracts recommendations from any JSON response structure.
 * Synthesizes rich descriptions if the model returns concise or missing details so cards are never blank.
 */
export function parseGeminiTipsResult(raw: any, ctx: EnergyAuditContext): AiEnergyTip[] {
  let candidateList: any[] = [];
  if (Array.isArray(raw)) {
    candidateList = raw;
  } else if (raw && typeof raw === "object") {
    candidateList =
      raw.recommendations ||
      raw.tips ||
      raw.insights ||
      raw.actions ||
      raw.audit ||
      raw.data ||
      raw.suggestions ||
      [];
  }

  if (!Array.isArray(candidateList) || candidateList.length === 0) {
    return [];
  }

  return candidateList.map((item: any, idx: number) => {
    // Multi-alias title resolution
    const rawTitle =
      item.title ||
      item.recommendation ||
      item.tip ||
      item.headline ||
      item.topic ||
      item.action_title ||
      item.name ||
      `Energy Optimization Strategy #${idx + 1}`;

    // Multi-alias description resolution
    let rawDesc =
      item.description ||
      item.details ||
      item.advice ||
      item.action ||
      item.actionable_steps ||
      item.summary ||
      item.text ||
      item.explanation ||
      item.notes ||
      item.content ||
      "";

    // Auto-synthesis guard: If description is blank or too short, synthesize a tailored explanation
    if (!rawDesc || String(rawDesc).trim().length < 15) {
      const liveMetrics = ctx.liveTrackerMetrics;
      const topApp = ctx.appliances[idx % Math.max(1, ctx.appliances.length)];

      if (idx === 0 && liveMetrics && liveMetrics.runningCount > 0) {
        rawDesc = `You currently have ${liveMetrics.runningCount} active device(s) drawing ~${liveMetrics.liveWattsNow}W live (${liveMetrics.runningApplianceNames.slice(0, 2).join(", ")}). Shifting non-urgent runtimes outside Meralco peak hours directly curtails your monthly ₱${Math.round(ctx.totalCost)} projected bill.`;
      } else if (topApp) {
        const topKwh = Math.round(topApp.monthly_kwh || (topApp.watts * (topApp.quantity || 1) * topApp.hours_per_day * 30) / 1000);
        rawDesc = `Your ${topApp.name} consumes approximately ${topKwh} kWh/month. Calibrating thermostat settings or operating during off-peak windows can reduce active consumption by up to 25%.`;
      } else {
        rawDesc = `Optimizing your active household load profile and unplugging idle standby electronics can trim unnecessary consumption and lower your distribution billing tier.`;
      }
    }

    // Multi-alias saving resolution
    const rawSaving =
      item.saving ||
      item.savings ||
      item.estimated_savings ||
      item.monthly_savings ||
      item.potential_savings ||
      item.impact ||
      (idx === 0 ? "Peak Load Optimization" : `Save ~₱${Math.max(150, Math.round(ctx.totalCost * 0.08))}/mo`);

    // Badge color validation
    const rawBadge = (item.badgeColor || item.badge_color || item.color || "").toLowerCase();
    const validBadge: "primary" | "secondary" | "success" | "warning" | "info" =
      ["primary", "secondary", "success", "warning", "info"].includes(rawBadge)
        ? rawBadge
        : idx === 0
        ? "warning"
        : idx === 1
        ? "primary"
        : "info";

    return {
      id: item.id || `ai_tip_${idx}_${Date.now()}`,
      title: String(rawTitle).trim(),
      description: String(rawDesc).trim(),
      saving: String(rawSaving).trim(),
      badgeColor: validBadge,
      category: item.category || (idx === 0 ? "peak_shift" : "behavior"),
    };
  });
}

/**
 * Fallback generator using smart deterministic heuristics (used if offline or Gemini API keys exhausted)
 */
export function generateFallbackTips(ctx: EnergyAuditContext): AiEnergyTip[] {
  const { appliances, totalMonthlyKwh, effectiveRate, vampireMetrics, liveTrackerMetrics, distributionTier } = ctx;
  const list: AiEnergyTip[] = [];

  // 1. Live Running Tracker Optimization (If devices are currently ON)
  if (liveTrackerMetrics && liveTrackerMetrics.runningCount > 0) {
    list.push({
      id: "live_load_fallback",
      title: `Live Load: ${liveTrackerMetrics.liveWattsNow}W actively running right now`,
      description: `You currently have ${liveTrackerMetrics.runningCount} device(s) running (${liveTrackerMetrics.runningApplianceNames.slice(0, 3).join(", ")}). Today's measured spend is ₱${liveTrackerMetrics.todayMeasuredCost.toFixed(2)} (${liveTrackerMetrics.todayMeasuredKwh.toFixed(1)} kWh). Keep timers active to prevent accidental runaways.`,
      saving: `${liveTrackerMetrics.runningCount} Active Devices`,
      badgeColor: "warning",
      category: "live_load",
    });
  }

  // 2. Air Conditioning Check
  const acApps = appliances.filter(
    (a) => (a.category || "").toLowerCase().includes("air") || (a.name || "").toLowerCase().includes("ac")
  );
  const acKwh = acApps.reduce((acc, a) => acc + (a.monthly_kwh || (a.watts * a.quantity * a.hours_per_day * 30) / 1000), 0);
  if (acApps.length > 0 && totalMonthlyKwh > 0) {
    const acPct = Math.round((acKwh / totalMonthlyKwh) * 100);
    const acCost = acKwh * effectiveRate;
    const thermostatSaving = acCost * 0.15;
    list.push({
      id: "cooling_fallback",
      title: `Cooling accounts for ${acPct}% of your electricity`,
      description: `Air conditioning consumes ~${acKwh.toFixed(0)} kWh (₱${acCost.toFixed(2)}/mo). Setting your thermostat to 25°C and cleaning filters monthly can save up to ₱${thermostatSaving.toFixed(2)}/mo.`,
      saving: `Save ~₱${thermostatSaving.toFixed(0)}/mo`,
      badgeColor: "primary",
      category: "cooling",
    });
  }

  // 3. Peak Hours Shifting (Meralco 11 AM - 4 PM & 6 PM - 9 PM)
  const heavyLoads = appliances.filter((a) => {
    const cat = (a.category || "").toLowerCase();
    const watts = a.watts * (a.quantity || 1);
    return cat.includes("wash") || cat.includes("laundry") || cat.includes("iron") || cat.includes("heater") || watts >= 1000;
  });
  if (heavyLoads.length > 0) {
    list.push({
      id: "peak_shift_fallback",
      title: "Shift heavy loads to Off-Peak hours",
      description: `High-wattage devices (${heavyLoads.map((h) => h.name).slice(0, 2).join(", ")}) should be operated during off-peak windows (before 11:00 AM or after 9:00 PM) to avoid grid strain and maximize system efficiency.`,
      saving: "Peak Load Optimization",
      badgeColor: "info",
      category: "peak_shift",
    });
  }

  // 4. Standby / Vampire Load
  if (vampireMetrics && vampireMetrics.standbyMonthlyCost > 30) {
    list.push({
      id: "vampire_fallback",
      title: `Standby vampire loads cost ~₱${vampireMetrics.standbyMonthlyCost.toFixed(2)}/month`,
      description: `${vampireMetrics.vampireDevicesCount} idle electronics draw continuous standby power (~${vampireMetrics.standbyWattsTotal ?? 40}W). Using master switch power strips can eliminate this cost completely.`,
      saving: `Save ~₱${vampireMetrics.standbyMonthlyCost.toFixed(0)}/mo`,
      badgeColor: "success",
      category: "vampire",
    });
  }

  // 5. Inverter Upgrade Advice
  const nonInverters = appliances.filter((a) => {
    const name = (a.name || "").toLowerCase();
    const cat = (a.category || "").toLowerCase();
    return (cat.includes("air") || cat.includes("ref")) && !a.is_inverter && !name.includes("inverter");
  });
  if (nonInverters.length > 0) {
    const nonInverterKwh = nonInverters.reduce(
      (acc, a) => acc + (a.monthly_kwh || (a.watts * a.quantity * a.hours_per_day * 30) / 1000),
      0
    );
    const upgradeSavings = nonInverterKwh * 0.35 * effectiveRate;
    list.push({
      id: "inverter_fallback",
      title: "Inverter upgrade potential for legacy cooling",
      description: `You have ${nonInverters.length} non-inverter appliance(s) (${nonInverters.map((n) => n.name).slice(0, 2).join(", ")}). Upgrading to DOE PELP certified inverter units can reduce their power draw by up to 35%.`,
      saving: `Save ~₱${upgradeSavings.toFixed(0)}/mo`,
      badgeColor: "primary",
      category: "hardware",
    });
  }

  if (list.length === 0) {
    list.push({
      id: "general_fallback",
      title: `Optimal Energy Profile (${distributionTier?.tier || "Standard Tier"})`,
      description: "Your appliance consumption profile is well-balanced. Continue maintaining clean filters and unplugging idle chargers to keep baseline costs low.",
      saving: "Optimal Baseline",
      badgeColor: "success",
      category: "behavior",
    });
  }

  return list.slice(0, 4);
}

/**
 * Builds a prompt for Gemini AI with the user's real energy data and live tracker telemetry
 */
function buildGeminiAuditPrompt(ctx: EnergyAuditContext): string {
  const {
    appliances,
    totalMonthlyKwh,
    totalCost,
    effectiveRate,
    tariffType,
    distributionTier,
    efficiencyMetrics,
    vampireMetrics,
    liveTrackerMetrics,
  } = ctx;

  // Summarize top 15 appliances in a clean, compact tabular format (<600 tokens)
  const sortedAppliances = [...appliances]
    .sort((a, b) => {
      const aVal = a.estimated_cost || a.monthly_kwh || a.watts;
      const bVal = b.estimated_cost || b.monthly_kwh || b.watts;
      return bVal - aVal;
    })
    .slice(0, 15)
    .map((a) => {
      const monthlyKwh = Math.round(
        a.monthly_kwh || (a.watts * (a.quantity || 1) * a.hours_per_day * 30) / 1000
      );
      const monthlyCost = Math.round(
        a.estimated_cost || ((a.watts * (a.quantity || 1) * a.hours_per_day * 30) / 1000) * effectiveRate
      );
      return `- ${a.name} (${a.category || "General"}): ${a.watts}W x ${a.quantity || 1}, ${a.hours_per_day}h/day, ~${monthlyKwh} kWh/mo (₱${monthlyCost}/mo) | Inverter: ${a.is_inverter ? "Yes" : "No"} | Room: ${a.room_location || "General"}`;
    })
    .join("\n");

  return `You are a certified Philippine Energy Efficiency Auditor & Electrical Engineer specializing in Meralco tariff structures and DOE PELP standards.
Analyze the user's REAL system energy telemetry, live stopwatch tracker, and registered appliance inventory.
Provide 3 to 4 high-impact, practical, and highly specific energy-saving recommendations.

=== USER SYSTEM TELEMETRY ===
- Tariff: ${tariffType.toUpperCase()}
- Effective Meralco Rate: ₱${effectiveRate.toFixed(2)}/kWh
- Total Projected Monthly Load: ${Math.round(totalMonthlyKwh)} kWh
- Projected Monthly Bill: ₱${Math.round(totalCost)}
${distributionTier ? `- Meralco Distribution Tier: ${distributionTier.tier} (${distributionTier.label})` : ""}
${efficiencyMetrics ? `- DOE PELP Rating: Grade ${efficiencyMetrics.grade} (${efficiencyMetrics.inverterCount} of ${efficiencyMetrics.totalCount} devices are Inverters, ${efficiencyMetrics.efficiencyPct}% efficiency)` : ""}
${vampireMetrics ? `- Standby Vampire Draw: ~${vampireMetrics.standbyWattsTotal ?? 40}W across ${vampireMetrics.vampireDevicesCount} idle electronics (costs ~₱${Math.round(vampireMetrics.standbyMonthlyCost)}/mo)` : ""}

=== LIVE ACTUAL TRACKER STATUS ===
${
  liveTrackerMetrics && liveTrackerMetrics.runningCount > 0
    ? `- Active Circuits ON Right Now: ${liveTrackerMetrics.runningCount} device(s) drawing ~${liveTrackerMetrics.liveWattsNow}W live (${liveTrackerMetrics.runningApplianceNames.join(", ")})
- Today's Measured Stopwatch Usage: ${liveTrackerMetrics.todayMeasuredKwh.toFixed(1)} kWh (₱${liveTrackerMetrics.todayMeasuredCost.toFixed(2)} spent today)`
    : "- Live Tracker: No devices currently running on the live stopwatch right now."
}
${
  liveTrackerMetrics?.hasActualHistory
    ? `- Cumulative Measured Tracker History: ${liveTrackerMetrics.totalMeasuredKwh.toFixed(1)} kWh (₱${liveTrackerMetrics.totalMeasuredCost.toFixed(2)})`
    : ""
}

=== REGISTERED APPLIANCE INVENTORY (${appliances.length} devices) ===
${sortedAppliances}

=== AUDIT INSTRUCTIONS ===
1. MUST cite real appliance names from the inventory above (e.g. mention actual names like aircon, refrigerator, fan, etc.).
2. If devices are actively running right now, address live load management or timer shutoffs.
3. If user has high cooling/refrigeration draw, evaluate inverter retrofits or 25°C thermostat adjustments with exact savings in ₱/month.
4. For high-wattage heating/laundry, address shifting to Meralco off-peak hours (before 11 AM or after 9 PM).
5. For vampire loads, propose master switch power strips with exact monthly savings.
6. Provide a concise, punchy title and 2 complete sentences of actionable advice in description.

=== MANDATORY OUTPUT FORMAT ===
Return ONLY a valid JSON array of objects with these exact keys:
[
  {
    "title": "Concise Recommendation Title (max 7 words)",
    "description": "2-3 sentences explaining exactly what to do, citing specific user appliances and realistic savings.",
    "saving": "Save ~₱XXX/mo",
    "badgeColor": "primary" | "secondary" | "success" | "warning" | "info"
  }
]`;
}

/**
 * Generate Actionable Energy Saving Tips using Google Gemini AI on-demand
 * Includes dual-tier failover (Serverless -> Client Rotation -> Heuristic Fallback)
 * Persists results long-term across logout, refresh, and system close.
 */
export async function generateAiEnergyTips(
  ctx: EnergyAuditContext,
  forceRefresh = false
): Promise<PersistedEnergyAudit> {
  const currentFingerprint = computeInventoryFingerprint(ctx.appliances, ctx.totalMonthlyKwh);

  // 1. Check long-term persistence in localStorage if not forcing refresh
  if (!forceRefresh) {
    const persisted = getPersistedAiTips(ctx.userId, ctx.spaceId);
    if (persisted && persisted.tips && persisted.tips.length > 0) {
      devLog.info("Energy AI", "Restoring persisted AI energy audit tips", {
        userId: ctx.userId,
        spaceId: ctx.spaceId,
        generatedAt: persisted.generatedAt,
      });
      return persisted;
    }
  }

  // If user has zero appliances, return empty immediately
  if (!ctx.appliances || ctx.appliances.length === 0) {
    const emptyResult: PersistedEnergyAudit = {
      tips: [],
      isFallback: false,
      generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      generatedDate: new Date().toISOString(),
      inventoryHash: currentFingerprint,
      userId: ctx.userId,
      spaceId: ctx.spaceId,
    };
    setPersistedAiTips(ctx.userId, ctx.spaceId, emptyResult);
    return emptyResult;
  }

  // Check and consume daily quota (5 generations per user per day)
  const quota = getDailyAiQuota(ctx.userId);
  if (quota.remaining <= 0) {
    devLog.warn("Energy AI", "Daily AI generation limit reached (5/5). Serving fallback.", {
      userId: ctx.userId,
    });
    const fallbackList = generateFallbackTips(ctx);
    const quotaResult: PersistedEnergyAudit = {
      tips: fallbackList,
      isFallback: true,
      generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      generatedDate: new Date().toISOString(),
      inventoryHash: currentFingerprint,
      userId: ctx.userId,
      spaceId: ctx.spaceId,
    };
    return quotaResult;
  }

  const prompt = buildGeminiAuditPrompt(ctx);
  devLog.info("Energy AI", "Requesting data-driven Gemini AI energy audit...", {
    applianceCount: ctx.appliances.length,
    monthlyKwh: ctx.totalMonthlyKwh,
    liveWatts: ctx.liveTrackerMetrics?.liveWattsNow,
    remainingQuota: quota.remaining,
  });

  // 2. Primary: Vercel Serverless Endpoint (/api/analyze)
  try {
    const sRes = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        category: "other",
        preset: "other",
        model: "gemini-2.5-flash",
      }),
    });

    if (sRes.ok) {
      const json = await sRes.json();
      const rawData = json.data;
      const parsedTips = parseGeminiTipsResult(rawData, ctx);

      if (parsedTips.length > 0) {
        consumeDailyAiQuota(ctx.userId);
        const result: PersistedEnergyAudit = {
          tips: parsedTips,
          isFallback: false,
          generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          generatedDate: new Date().toISOString(),
          inventoryHash: currentFingerprint,
          userId: ctx.userId,
          spaceId: ctx.spaceId,
        };
        setPersistedAiTips(ctx.userId, ctx.spaceId, result);
        devLog.success("Energy AI", "Received and parsed AI recommendations via serverless endpoint");
        return result;
      }
    }
  } catch (err: any) {
    devLog.warn("Energy AI", "Serverless endpoint unavailable, attempting client rotation pool", {
      error: err?.message,
    });
  }

  // 3. Secondary: Client execution with multi-key rotation and multi-model cascade
  try {
    const { result: rawText } = await executeWithGeminiKeyRotation<string>(
      async (activeKey, activeModel) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${activeKey.trim()}`;
        const payload = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            response_mime_type: "application/json",
            maxOutputTokens: 1500,
          },
        };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      },
      {
        callerName: "EnergyAiAuditor",
        preferredModels: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"],
      }
    );

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\[[\s\S]*\]/) || rawText.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawText);
    const parsedTips = parseGeminiTipsResult(parsed, ctx);

    if (parsedTips.length > 0) {
      consumeDailyAiQuota(ctx.userId);
      const result: PersistedEnergyAudit = {
        tips: parsedTips,
        isFallback: false,
        generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        generatedDate: new Date().toISOString(),
        inventoryHash: currentFingerprint,
        userId: ctx.userId,
        spaceId: ctx.spaceId,
      };
      setPersistedAiTips(ctx.userId, ctx.spaceId, result);
      devLog.success("Energy AI", "Received and parsed AI recommendations via client rotation pool");
      return result;
    }
  } catch (directErr: any) {
    devLog.warn("Energy AI", `Gemini API execution failed: ${directErr?.message}. Falling back to rule-based engine.`);
  }

  // 4. Graceful Fallback: Deterministic intelligent rule engine
  const fallbackList = generateFallbackTips(ctx);
  const fallbackResult: PersistedEnergyAudit = {
    tips: fallbackList,
    isFallback: true,
    generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    generatedDate: new Date().toISOString(),
    inventoryHash: currentFingerprint,
    userId: ctx.userId,
    spaceId: ctx.spaceId,
  };
  setPersistedAiTips(ctx.userId, ctx.spaceId, fallbackResult);
  return fallbackResult;
}
