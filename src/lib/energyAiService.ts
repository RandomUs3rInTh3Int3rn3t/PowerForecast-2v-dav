import { devLog } from "./devLogger";
import { executeWithGeminiKeyRotation } from "./geminiKeyService";
import { UserAppliance } from "../types";

export interface AiEnergyTip {
  id: string;
  title: string;
  description: string;
  saving: string;
  badgeColor: "primary" | "secondary" | "success" | "warning" | "info";
  category?: "cooling" | "peak_shift" | "vampire" | "hardware" | "behavior";
}

export interface EnergyAuditContext {
  appliances: UserAppliance[];
  totalMonthlyKwh: number;
  totalCost: number;
  effectiveRate: number;
  tariffType: string;
  vampireMetrics?: {
    standbyMonthlyCost: number;
    vampireDevicesCount: number;
    standbyWattsTotal?: number;
    vampireWatts?: number;
  };
  spaceId?: string;
}

export interface EnergyAuditResult {
  tips: AiEnergyTip[];
  isFallback: boolean;
  generatedAt: string;
  source: "gemini" | "cache" | "heuristic_fallback";
}

/**
 * Generate a cache key for session caching based on space and inventory state
 */
function getCacheKey(spaceId?: string): string {
  return `powerforecast_ai_energy_tips_${spaceId || "all"}`;
}

/**
 * Read cached AI tips from sessionStorage to prevent unnecessary token consumption
 */
export function getCachedAiTips(spaceId?: string): EnergyAuditResult | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = sessionStorage.getItem(getCacheKey(spaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.tips) && parsed.tips.length > 0) {
      return {
        tips: parsed.tips,
        isFallback: !!parsed.isFallback,
        generatedAt: parsed.generatedAt || new Date().toISOString(),
        source: "cache",
      };
    }
  } catch (err) {
    devLog.warn("AI Tips Cache", "Failed to parse cached AI energy tips", { error: err });
  }
  return null;
}

/**
 * Save generated tips to sessionStorage
 */
export function setCachedAiTips(spaceId: string | undefined, result: EnergyAuditResult): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    sessionStorage.setItem(
      getCacheKey(spaceId),
      JSON.stringify({
        tips: result.tips,
        isFallback: result.isFallback,
        generatedAt: result.generatedAt,
      })
    );
  } catch (err) {
    devLog.warn("AI Tips Cache", "Failed to cache AI energy tips", { error: err });
  }
}

/**
 * Fallback generator using smart deterministic heuristics (used if offline or Gemini API keys exhausted)
 */
export function generateFallbackTips(ctx: EnergyAuditContext): AiEnergyTip[] {
  const { appliances, totalMonthlyKwh, effectiveRate, vampireMetrics } = ctx;
  const list: AiEnergyTip[] = [];

  // 1. Air Conditioning Check
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
      badgeColor: "warning",
      category: "cooling",
    });
  }

  // 2. Peak Hours Shifting (Meralco 11 AM - 4 PM & 6 PM - 9 PM)
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

  // 3. Standby / Vampire Load
  if (vampireMetrics && vampireMetrics.standbyMonthlyCost > 40) {
    list.push({
      id: "vampire_fallback",
      title: `Standby vampire loads cost ~₱${vampireMetrics.standbyMonthlyCost.toFixed(2)}/month`,
      description: `${vampireMetrics.vampireDevicesCount} idle electronics draw continuous standby power. Using master switch power strips can eliminate this cost completely.`,
      saving: `Save ~₱${vampireMetrics.standbyMonthlyCost.toFixed(0)}/mo`,
      badgeColor: "success",
      category: "vampire",
    });
  }

  // 4. Inverter Upgrade Advice
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
      title: "Balanced Daily Energy Profile",
      description: "Your appliance consumption profile is well-balanced. Continue maintaining clean filters and unplugging idle chargers to keep baseline costs low.",
      saving: "Optimal Baseline",
      badgeColor: "success",
      category: "behavior",
    });
  }

  return list;
}

/**
 * Builds a prompt for Gemini AI with the user's real energy data
 */
function buildGeminiAuditPrompt(ctx: EnergyAuditContext): string {
  const { appliances, totalMonthlyKwh, totalCost, effectiveRate, tariffType, vampireMetrics } = ctx;

  // Select top 12 appliances by estimated cost or kWh to keep token payload tight (<400 tokens)
  const sortedAppliances = [...appliances]
    .sort((a, b) => {
      const aVal = a.estimated_cost || a.monthly_kwh || a.watts;
      const bVal = b.estimated_cost || b.monthly_kwh || b.watts;
      return bVal - aVal;
    })
    .slice(0, 12)
    .map((a) => ({
      name: a.name,
      category: a.category,
      watts: a.watts,
      qty: a.quantity || 1,
      hoursPerDay: a.hours_per_day,
      monthlyKwh: Math.round(a.monthly_kwh || (a.watts * (a.quantity || 1) * a.hours_per_day * 30) / 1000),
      monthlyCostPhp: Math.round((a.estimated_cost || ((a.watts * (a.quantity || 1) * a.hours_per_day * 30) / 1000) * effectiveRate)),
      isInverter: !!a.is_inverter,
    }));

  return `You are a certified Philippine Energy Efficiency Auditor & Electrical Engineer specializing in Meralco tariff structures and DOE PELP standards.
Analyze the user's electrical consumption inventory and provide 2 to 4 high-impact, practical, and highly specific energy-saving recommendations.

USER ENERGY TELEMETRY:
- Tariff: ${tariffType.toUpperCase()}
- Effective Meralco Rate: ₱${effectiveRate.toFixed(2)}/kWh
- Total Monthly Consumption: ${Math.round(totalMonthlyKwh)} kWh
- Projected Monthly Bill: ₱${Math.round(totalCost)}
${vampireMetrics ? `- Standby / Vampire Load: ~${vampireMetrics.standbyWattsTotal ?? vampireMetrics.vampireWatts ?? 0}W across ${vampireMetrics.vampireDevicesCount} devices (costs ~₱${Math.round(vampireMetrics.standbyMonthlyCost)}/mo)` : ""}

REGISTERED APPLIANCES (${sortedAppliances.length} items):
${JSON.stringify(sortedAppliances, null, 1)}

ENGINEERING AUDIT RULES:
1. Reference actual appliance names, wattages, or schedules from the list above.
2. Provide quantifiable estimated monthly savings in PHP (e.g. "Save ~₱450/mo", "Save ~₱1,200/mo") or optimization badge (e.g. "Peak Load Optimization").
3. For cooling/refrigeration, evaluate inverter conversions, thermostat 25°C settings, or maintenance.
4. For high-wattage heating/laundry/ironing, address shifting to Meralco off-peak hours (before 11 AM or after 9 PM).
5. For vampire loads or entertainment devices, suggest master switches or smart plugs.
6. Keep descriptions concise, factual, and actionable (2 sentences each).

OUTPUT FORMAT:
Return ONLY a valid JSON array of objects with this schema:
[
  {
    "id": "short_unique_id",
    "title": "Concise Recommendation Title (max 7 words)",
    "description": "2-3 sentences explaining exactly what to do, citing specific appliances and realistic savings.",
    "saving": "Save ~₱XXX/mo",
    "badgeColor": "primary" | "success" | "warning" | "info",
    "category": "cooling" | "peak_shift" | "vampire" | "hardware" | "behavior"
  }
]`;
}

/**
 * Generate Actionable Energy Saving Tips using Google Gemini AI on-demand
 * Includes dual-tier failover (Serverless -> Client Rotation -> Heuristic Fallback)
 */
export async function generateAiEnergyTips(
  ctx: EnergyAuditContext,
  forceRefresh = false
): Promise<EnergyAuditResult> {
  // 1. Check session cache if not forcing refresh
  if (!forceRefresh) {
    const cached = getCachedAiTips(ctx.spaceId);
    if (cached) {
      devLog.info("Energy AI", "Serving cached AI energy audit tips", { spaceId: ctx.spaceId });
      return cached;
    }
  }

  // If user has zero appliances, return empty immediately
  if (!ctx.appliances || ctx.appliances.length === 0) {
    return {
      tips: [],
      isFallback: false,
      generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      source: "gemini",
    };
  }

  const prompt = buildGeminiAuditPrompt(ctx);
  devLog.info("Energy AI", "Requesting on-demand Gemini AI energy audit...", {
    applianceCount: ctx.appliances.length,
    monthlyKwh: ctx.totalMonthlyKwh,
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
      const candidateList = Array.isArray(rawData) ? rawData : rawData?.recommendations || rawData?.tips || rawData?.insights;
      if (Array.isArray(candidateList) && candidateList.length > 0) {
        const validatedTips: AiEnergyTip[] = candidateList.map((item: any, idx: number) => ({
          id: item.id || `ai_tip_${idx}`,
          title: item.title || "Energy Saving Recommendation",
          description: item.description || "",
          saving: item.saving || "Save Energy",
          badgeColor: ["primary", "secondary", "success", "warning", "info"].includes(item.badgeColor)
            ? item.badgeColor
            : "primary",
          category: item.category || "behavior",
        }));

        const result: EnergyAuditResult = {
          tips: validatedTips,
          isFallback: false,
          generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          source: "gemini",
        };
        setCachedAiTips(ctx.spaceId, result);
        devLog.success("Energy AI", "Received AI recommendations via serverless endpoint");
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
            maxOutputTokens: 1024,
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

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || rawText.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawText);

    if (Array.isArray(parsed) && parsed.length > 0) {
      const validatedTips: AiEnergyTip[] = parsed.map((item: any, idx: number) => ({
        id: item.id || `ai_tip_${idx}`,
        title: item.title || "Energy Saving Recommendation",
        description: item.description || "",
        saving: item.saving || "Save Energy",
        badgeColor: ["primary", "secondary", "success", "warning", "info"].includes(item.badgeColor)
          ? item.badgeColor
          : "primary",
        category: item.category || "behavior",
      }));

      const result: EnergyAuditResult = {
        tips: validatedTips,
        isFallback: false,
        generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: "gemini",
      };
      setCachedAiTips(ctx.spaceId, result);
      devLog.success("Energy AI", "Received AI recommendations via client rotation pool");
      return result;
    }
  } catch (directErr: any) {
    devLog.warn("Energy AI", `Gemini API execution failed: ${directErr?.message}. Falling back to rule-based engine.`);
  }

  // 4. Graceful Fallback: Deterministic intelligent rule engine
  const fallbackList = generateFallbackTips(ctx);
  const fallbackResult: EnergyAuditResult = {
    tips: fallbackList,
    isFallback: true,
    generatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    source: "heuristic_fallback",
  };
  setCachedAiTips(ctx.spaceId, fallbackResult);
  return fallbackResult;
}
