import { VisionScanResult } from '../types';
import { devLog } from './devLogger';
import { executeWithGeminiKeyRotation } from './geminiKeyService';
import { isCompressorInverterCategory } from './dailyUsageService';
import { compressImageFile } from './imageOptimization';

export interface ImageItem {
  id: string;
  base64: string;
  file?: File;
  name?: string;
}

export interface MultiScanOptions {
  images: ImageItem[];
  apiKey?: string;
  categoryHint?: string;
  preset?: string; // backwards compatibility
}

export function sanitizeAndReconcileSpecs(d: any): {
  watts: number;
  monthlyKwh: number;
  category: string;
  voltage: number;
  starRating: number;
  isInverter: boolean;
  inverterType?: string | null;
  cruisingWatts?: number | null;
  pcMetadata?: Record<string, any> | null;
  coolingCapacityKjH?: number;
  coolingCapacityBtu?: number;
  cspf?: number;
  eer?: number;
  currentAmps?: number;
} {
  let cat = String(d.category || 'Other').trim();
  // Normalize categories to standard PowerForecast catalog
  if (/fan|ventilat|exhaust/i.test(cat)) cat = 'Electric Fans';
  else if (/condition|aircon|split|window/i.test(cat)) cat = 'Air Conditioners';
  else if (/refrig|freezer|chiller/i.test(cat)) cat = 'Refrigerators & Freezers';
  else if (/wash|dryer|laundry/i.test(cat)) cat = 'Clothes Washing Machines';
  else if (/cook|rice|microwave|oven|blender|kettle|air\s*fry|kitchen/i.test(cat)) cat = 'Kitchen Appliances';
  else if (/computer|pc|laptop|workstation/i.test(cat)) cat = 'Computers & Laptops';
  else if (/tv|television|screen|display|sound|audio|speaker/i.test(cat)) cat = 'Television Sets';
  else if (/water\s*heater|shower\s*heater|pump/i.test(cat)) cat = 'Water Heaters & Pumps';
  else if (/light|bulb|lamp|led/i.test(cat)) cat = 'Lighting Products';
  else cat = 'Other';

  const isInverter = isCompressorInverterCategory(cat) && Boolean(
    d.is_inverter === true ||
    /inverter/i.test(d.energy_rating || '') ||
    /inverter/i.test(d.notes || '') ||
    /inverter/i.test(d.model || '') ||
    /inverter/i.test(d.inverter_type || '')
  );

  let rawWatts = Number(d.power_watts || d.watts || 0);
  const voltage = Number(d.voltage) || 230;
  const currentAmps = Number(d.current_amps || d.amps || 0);

  // If power_watts is missing or 0, compute from Voltage x Current x Power Factor
  if ((!rawWatts || rawWatts <= 0) && currentAmps > 0) {
    const pf = cat.includes('Air Condition') || cat.includes('Refrigerat') ? 0.9 : 0.95;
    rawWatts = Math.round(voltage * currentAmps * pf);
  }

  // Unit disambiguation & physical sanity clamps
  if (cat.includes('Air Condition')) {
    // If rawWatts > 4000, model likely read cooling capacity in kJ/h or BTU/h by mistake
    if (rawWatts > 4000) {
      if (rawWatts >= 7000 && rawWatts <= 28000) {
        // kJ/h or BTU/h conversion estimate: thermal capacity / ~10.5 average EER
        rawWatts = Math.round(rawWatts / 10.5);
      } else {
        rawWatts = 950;
      }
    } else if (rawWatts < 250) {
      rawWatts = 850;
    }
  } else if (cat.includes('Electric Fan')) {
    if (rawWatts > 250 || rawWatts < 15) rawWatts = 70;
  } else if (cat.includes('Television') || cat.includes('TV')) {
    if (rawWatts > 500 || rawWatts < 15) rawWatts = 75;
  } else if (cat.includes('Computer') || cat.includes('Laptop')) {
    if (rawWatts > 1200 || rawWatts < 20) rawWatts = 120;
  } else if (cat.includes('Refrigerat')) {
    if (rawWatts > 600 || rawWatts < 20) rawWatts = isInverter ? 95 : 130;
  } else if (cat.includes('Washing') || cat.includes('Laundry')) {
    if (rawWatts > 2500 || rawWatts < 50) rawWatts = 450;
  }

  if (!rawWatts || rawWatts <= 0) rawWatts = 100;

  // Calibrated Cruising Watts:
  // For Inverter AC: ~42% of rated watts (e.g. 350W for an 850W unit)
  // For Inverter Fridge: ~33% (1/3 duty cycle)
  // For Computers: ~45% standard running factor
  let cruisingWatts = Number(d.cruising_watts || d.cruisingWatts || 0);
  if ((!cruisingWatts || cruisingWatts <= 0) && isInverter) {
    if (cat.includes('Air Condition')) {
      cruisingWatts = Math.round(rawWatts * 0.42);
    } else if (cat.includes('Refrigerat')) {
      cruisingWatts = Math.round(rawWatts / 3);
    } else if (cat.includes('Computer') || cat.includes('Laptop')) {
      cruisingWatts = Math.round(rawWatts * 0.45);
    } else if (cat.includes('Washing') || cat.includes('Laundry')) {
      cruisingWatts = Math.round(rawWatts * 0.50);
    }
  }

  const inverterType = d.inverter_type || (isInverter ? 'Variable Frequency Inverter' : null);

  // Monthly kWh calculation
  let monthlyKwh = Number(d.monthly_kwh);
  if (!monthlyKwh || monthlyKwh <= 0) {
    if (cat.includes('Refrigerat')) {
      const duty = isInverter ? 0.33 : 0.45;
      monthlyKwh = Math.round(((rawWatts * 24 * duty * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Air Condition')) {
      // Inverter AC: 1st hr 100%, subsequent hrs cruising at ~42%
      const effectiveDraw = isInverter ? Math.round(rawWatts * 0.42) : Math.round(rawWatts * 0.85);
      monthlyKwh = Math.round(((effectiveDraw * 8 * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Fan')) {
      monthlyKwh = Math.round(((rawWatts * 10 * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Television') || cat.includes('TV')) {
      monthlyKwh = Math.round(((rawWatts * 5 * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Computer') || cat.includes('Laptop')) {
      monthlyKwh = Math.round((((cruisingWatts || rawWatts * 0.45) * 8 * 30) / 1000) * 10) / 10;
    } else if (cat.includes('Washing') || cat.includes('Laundry')) {
      monthlyKwh = Math.round(((rawWatts * 1 * 15) / 1000) * 10) / 10;
    } else {
      monthlyKwh = Math.round(((rawWatts * 6 * 30) / 1000) * 10) / 10;
    }
  }

  let starRating = Number(d.star_rating);
  if (!starRating || starRating < 1 || starRating > 5) {
    starRating = isInverter ? 5 : 4;
  }

  const pcMetadata = d.pc_metadata || (cat.includes('Computer') || cat.includes('Laptop') ? {
    device_type: /laptop/i.test(d.model || '') || /laptop/i.test(d.brand || '') ? 'laptop' : 'desktop_pc',
    cpu: d.cpu_name || null,
    gpu: d.gpu_name || null,
    charger_watts: d.charger_watts || rawWatts,
    workload_profile: 'standard',
    running_watts: cruisingWatts || Math.round(rawWatts * 0.45),
  } : null);

  return {
    watts: rawWatts,
    monthlyKwh,
    category: cat,
    voltage,
    starRating,
    isInverter,
    inverterType,
    cruisingWatts: cruisingWatts > 0 ? cruisingWatts : null,
    pcMetadata,
    coolingCapacityKjH: Number(d.cooling_capacity_kj_h) || undefined,
    coolingCapacityBtu: Number(d.cooling_capacity_btu) || undefined,
    cspf: Number(d.cspf) || undefined,
    eer: Number(d.eer || d.cspf_or_eer) || undefined,
    currentAmps: currentAmps > 0 ? currentAmps : undefined,
  };
}

export function buildVisionPrompt(categoryHint?: string, imageCount: number = 1): string {
  const multiNotice =
    imageCount > 1
      ? `\nNOTE: The user provided ${imageCount} multi-angle photos (e.g. Energy Guide yellow label, technical nameplate, and full appliance body). Cross-reference all ${imageCount} images to extract the most accurate brand, model, rated electrical wattage, voltage, and energy rating.\n`
      : '';

  const catNotice = categoryHint && categoryHint !== 'Auto-Detect from Photo'
    ? `\nTARGET APPLIANCE CATEGORY HINT: The user specified this appliance is "${categoryHint}". Prioritize technical interpretation and specifications typical for this category.\n`
    : '';

  return `You are ApplianceSpec AI, an elite electrical engineer and energy auditor specializing in Philippine Department of Energy (DOE) PELP standards, Energy Guide yellow labels, and electrical appliance specification nameplates (e.g. Carrier, Condura, Panasonic, LG, Samsung, Sharp, Daikin, Asahi, Astron, Standard, Hanabishi, TCL, Midea, Kolin, Haier, etc.).${multiNotice}${catNotice}

Examine all uploaded appliance photo(s). Extract real, high-precision technical data visible across the image(s) following these strict engineering rules:

### 1. POWER & UNIT DISAMBIGUATION (CRITICAL)
- DO NOT confuse Cooling Capacity (kJ/h, BTU/h, HP, or cooling kW) with Electrical Power Input (Watts).
  * If the label shows "Cooling Capacity: 9500 kJ/h" or "10,000 BTU/h", that is THERMAL capacity, NOT electric power consumption.
  * Look for "Rated Power Input (W)", "Power Consumption (W)", "Input (W)", "Total Input (W)", or "Rated Input".
  * If electric power (Watts) is not explicitly printed, calculate: Power (W) = Voltage (V) × Current (A) × Power Factor (0.9 for motors/compressors, 1.0 for heaters). Example: 230V × 3.8A × 0.9 ≈ 786W.
  * Realistic electric input wattage ranges for Philippine residential units:
    - Air Conditioners (Window/Split): 450W - 2200W (NEVER 5000W - 18000W; values >3500W indicate thermal kJ/h or BTU was misread!)
    - Refrigerators & Freezers: 60W - 250W
    - Electric Fans (Desk/Stand/Ceiling/Orbit): 35W - 110W
    - Television Sets (32"-75" LED/OLED): 30W - 180W
    - Clothes Washing Machines: 250W - 650W (Motor/Spin), 1200W-2000W (Heater if present)

### 2. PHILIPPINE DOE ENERGY GUIDE & PELP EXTRACTION
- Look for the yellow Philippine DOE Energy Guide label:
  * Extract exact "Monthly Energy Consumption: [X] kWh/month" directly from the yellow label test result box.
  * Extract Star Rating (1 to 5 stars displayed on the top yellow banner).
  * Extract CSPF (Cooling Seasonal Performance Factor) or EER (Energy Efficiency Ratio) if visible.

### 3. TECHNOLOGY & INVERTER TELEMETRY
- Check if the appliance has Inverter technology ("Inverter", "Dual Inverter", "DC Inverter", "Digital Inverter", "Smart Inverter", "Direct Drive Inverter"). Set "is_inverter": true if detected.
- Extract or estimate "cruising_watts":
  * For Inverter Air Conditioners: estimated cruising draw once room temperature setpoint is satisfied (typically ~35% to 45% of rated input Watts, e.g. 350W for an 850W unit).
  * For Inverter Refrigerators: steady thermal maintenance cruising draw (typically ~30% to 35% of rated compressor power, e.g. 35W - 75W).
  * For non-inverter fixed-speed units: set to null or equal to rated power.

### 4. CATEGORY NORMALIZATION
Categorize strictly as one of:
- "Air Conditioners"
- "Refrigerators & Freezers"
- "Television Sets"
- "Electric Fans"
- "Clothes Washing Machines"
- "Lighting Products"
- "Kitchen Appliances"
- "Water Heaters & Pumps"
- "Computers & Laptops"
- "Other"

Respond ONLY with a valid JSON object inside a \`\`\`json block with these keys:
{
  "brand": "Exact brand string (e.g. Astron, Standard, Asahi, Carrier, Panasonic, LG, Sharp, Daikin, Samsung, Condura, etc.)",
  "model": "Exact model number/code visible on label (e.g. WCONX008EEV, BRONCO 18, etc.)",
  "category": "Standard category name from list above",
  "power_watts": number (e.g. 70 for fan, 850 for AC, 110 for refrigerator),
  "voltage": number (e.g. 230),
  "current_amps": number or null,
  "is_inverter": boolean,
  "inverter_type": "string (e.g. Dual Inverter Compressor, DC Inverter, or Fixed Speed)",
  "cruising_watts": number or null,
  "cooling_capacity_kj_h": number or null,
  "cooling_capacity_btu": number or null,
  "cspf": number or null,
  "eer": number or null,
  "monthly_kwh": number (e.g. 16.8 for fan @ 10h/day, 160 for 850W inverter AC @ 8h/day, 28 for inverter refrigerator),
  "energy_rating": "e.g. 5-Star DOE Certified, Inverter, CSPF 5.85, or PS Mark",
  "star_rating": number between 1 and 5,
  "room_location": "Living Room | Master Bedroom | Kitchen | Laundry Area | Home Office",
  "confidence": "high | medium | low",
  "notes": "Detailed engineering audit notes: detected rated power, cruising power, voltage, current, frequency (60Hz), serial number, PELP registration, and energy efficiency summary."
}`;
}

export async function analyzeMultipleApplianceImages(options: MultiScanOptions): Promise<VisionScanResult> {
  const { images, apiKey, categoryHint, preset } = options;
  if (!images || images.length === 0) {
    devLog.error('AI Scanner', 'Analysis failed: No images provided.');
    throw new Error('No images provided for analysis.');
  }

  const effectiveCategory = categoryHint || preset || 'Auto-Detect from Photo';

  devLog.info('AI Scanner', `Initiating Google Gemini Multimodal AI Analysis (${images.length} photo(s)) [Category: ${effectiveCategory}]`, {
    photoCount: images.length,
    categoryHint: effectiveCategory,
    files: images.map((i) => i.name || 'Appliance photo'),
  });

  let serverlessError: string | null = null;

  // 1. First Priority: Vercel Serverless /api/analyze Endpoint
  try {
    const safeImages: { base64: string; mimeType: string }[] = [];

    for (const img of images.slice(0, 3)) {
      let cleanBase64 = img.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      const approxBytes = Math.round(cleanBase64.length * 0.75);

      // If an individual image exceeds 1.2MB, ensure it gets compressed down before sending
      if (approxBytes > 1.2 * 1024 * 1024) {
        devLog.warn('AI Scanner', `Image "${img.name || 'unnamed'}" is oversized (${(approxBytes / 1024 / 1024).toFixed(2)} MB), applying dynamic pre-flight compression...`);
        try {
          if (img.file) {
            const comp = await compressImageFile(img.file);
            cleanBase64 = comp.cleanBase64;
          } else {
            const byteCharacters = atob(cleanBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });
            const comp = await compressImageFile(blob);
            cleanBase64 = comp.cleanBase64;
          }
        } catch (compErr) {
          devLog.warn('AI Scanner', 'Dynamic pre-flight compression skipped:', compErr);
        }
      }

      safeImages.push({
        base64: cleanBase64,
        mimeType: 'image/jpeg',
      });
    }

    const totalPayloadBytes = safeImages.reduce((acc, img) => acc + Math.round(img.base64.length * 0.75), 0);
    devLog.info('AI Scanner', `Routing image payload to Vercel Serverless API (/api/analyze)... Total payload size: ${(totalPayloadBytes / 1024).toFixed(1)} KB`);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: safeImages,
        categoryHint: effectiveCategory,
        model: 'gemini-2.5-flash',
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.data && (json.data.brand || json.data.model || json.data.power_watts || json.data.watts)) {
        const reconciled = sanitizeAndReconcileSpecs(json.data);

        devLog.success('AI Scanner', `Vercel Serverless Gemini AI extracted specs successfully`, {
          model: json.model_used || 'gemini-2.5-flash',
          extracted: json.data,
          reconciled,
        });

        return {
          detected_brand: json.data.brand || 'Detected Brand',
          detected_model: json.data.model || 'Standard Unit',
          detected_category: reconciled.category,
          detected_watts: reconciled.watts,
          detected_voltage: reconciled.voltage,
          detected_monthly_kwh: reconciled.monthlyKwh,
          detected_energy_rating: json.data.energy_rating || (reconciled.isInverter ? 'Inverter Energy Certified' : 'DOE Energy Certified'),
          detected_star_rating: reconciled.starRating,
          is_inverter: reconciled.isInverter,
          inverter_type: reconciled.inverterType,
          cruising_watts: reconciled.cruisingWatts,
          pc_metadata: reconciled.pcMetadata,
          cooling_capacity_kj_h: reconciled.coolingCapacityKjH,
          cooling_capacity_btu: reconciled.coolingCapacityBtu,
          cspf: reconciled.cspf,
          eer: reconciled.eer,
          rated_current_amps: reconciled.currentAmps,
          confidence: (json.data.confidence as any) || 'high',
          raw_markdown: json.data.notes || json.raw_markdown || 'Analyzed via Google Gemini AI',
        };
      }
    } else {
      if (res.status === 413) {
        serverlessError = 'Serverless returned HTTP 413 (Payload Too Large). Photos exceeded Vercel size limit.';
      } else {
        const errData = await res.json().catch(() => ({}));
        serverlessError = errData.error || `Serverless returned HTTP ${res.status}`;
      }
      devLog.warn('AI Scanner', `Vercel serverless /api/analyze unavailable: ${serverlessError}`);
    }
  } catch (err: any) {
    serverlessError = err.message;
    devLog.warn('AI Scanner', `Serverless endpoint not reachable (${err.message}). Checking client Gemini key pool...`);
  }

  // 2. Second Priority: Direct Client Gemini Call with Automatic Multi-Key Rotation Pool
  try {
    devLog.info('AI Scanner', 'Invoking direct Gemini Multimodal Vision API with key rotation pool...');
    return await callGeminiMultiVision(images, effectiveCategory, apiKey);
  } catch (directErr: any) {
    devLog.error('AI Scanner', `Direct Google Gemini API rotation failed: ${directErr.message}`, { error: directErr });
    const failureReason = serverlessError
      ? `Serverless API: ${serverlessError}. Direct Call: ${directErr.message}`
      : directErr.message;

    if (/413|payload too large/i.test(failureReason)) {
      throw new Error(
        `Gemini AI Spec Extraction Error: The uploaded photo(s) exceeded the network upload limit. The photos have now been compressed; please try re-scanning or upload a single clear photo.`
      );
    }

    throw new Error(
      `Gemini AI Spec Extraction Error: ${failureReason}. Please verify GEMINI_API_KEY in Vercel or configure an API key in the scanner.`
    );
  }
}

async function callGeminiMultiVision(
  images: ImageItem[],
  categoryHint: string = 'Auto-Detect from Photo',
  explicitApiKey?: string
): Promise<VisionScanResult> {
  const parts: any[] = [];

  // Add all images (up to 3) as inline_data
  images.slice(0, 3).forEach((img) => {
    const cleanBase64 = img.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: cleanBase64,
      },
    });
  });

  const prompt = buildVisionPrompt(categoryHint, images.length);
  parts.push({ text: prompt });

  const payload = {
    contents: [
      {
        parts: parts,
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
    },
  };

  const { result } = await executeWithGeminiKeyRotation<VisionScanResult>(
    async (activeKey, activeModel) => {
      const effectiveKey = explicitApiKey || activeKey;
      const startTime = Date.now();

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${activeModel}:generateContent?key=${effectiveKey.trim()}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}`);
      }

      const resData = await res.json();
      const textOutput = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const jsonMatch = textOutput.match(/```json\s*([\s\S]*?)\s*```/) || textOutput.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON specs from Gemini AI response.');
      }

      const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      const reconciled = sanitizeAndReconcileSpecs(parsed);

      devLog.success('AI Scanner', `Gemini Multimodal Vision extracted specs successfully (${durationMs}ms)`, {
        model: activeModel,
        durationMs,
        extracted: parsed,
        reconciled,
      }, durationMs);

      return {
        detected_brand: parsed.brand || 'Detected Appliance',
        detected_model: parsed.model || 'Standard Unit',
        detected_category: reconciled.category,
        detected_watts: reconciled.watts,
        detected_voltage: reconciled.voltage,
        detected_monthly_kwh: reconciled.monthlyKwh,
        detected_energy_rating: parsed.energy_rating || (reconciled.isInverter ? 'Inverter Energy Certified' : 'DOE Certified'),
        detected_star_rating: reconciled.starRating,
        is_inverter: reconciled.isInverter,
        inverter_type: reconciled.inverterType,
        cruising_watts: reconciled.cruisingWatts,
        pc_metadata: reconciled.pcMetadata,
        cooling_capacity_kj_h: reconciled.coolingCapacityKjH,
        cooling_capacity_btu: reconciled.coolingCapacityBtu,
        cspf: reconciled.cspf,
        eer: reconciled.eer,
        rated_current_amps: reconciled.currentAmps,
        confidence: (parsed.confidence as any) || 'high',
        raw_markdown: parsed.notes || textOutput,
      };
    },
    {
      callerName: 'Vision Scanner AI',
      preferredModels: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    }
  );

  return result;
}
