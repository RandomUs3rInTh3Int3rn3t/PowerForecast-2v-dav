export interface ApplianceList {
  id: string;
  user_id: string;
  name: string;
  tariff_type: 'residential' | 'commercial';
  is_default: boolean;
  created_at?: string;
}

export interface UserAppliance {
  id: string;
  user_id: string;
  list_id?: string | null;
  tariff_type?: 'residential' | 'commercial';
  name: string;
  category: string;
  brand?: string;
  model?: string;
  control_no?: string;
  source?: 'manual_entry' | 'pelp_db' | 'ai_vision' | 'catalog';
  watts: number;
  voltage?: number;
  quantity: number;
  hours_per_day: number;
  days_per_month: number;
  monthly_kwh: number;
  estimated_cost?: number;
  energy_rating?: string;
  room_location?: string;
  start_hour?: number;
  is_active: boolean;
  is_currently_on?: boolean;
  last_turned_on_at?: string | null;
  is_inverter?: boolean;
  cruising_watts?: number;
  ai_metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export const STREAMLINED_CATEGORIES = [
  "Air Conditioners",
  "Refrigerators & Freezers",
  "Computers & Laptops",
  "Electric Fans",
  "Kitchen Appliances",
  "Laundry & Cleaning",
  "TV & Entertainment",
  "Lighting & Other",
] as const;

export type StreamlinedCategory = (typeof STREAMLINED_CATEGORIES)[number];

export interface CpuHardwareItem {
  id: string;
  name: string;
  brand: string;
  family: string;
  tdp: number;
  gaming_w: number;
  idle_w: number;
}

export interface GpuHardwareItem {
  id: string;
  name: string;
  brand: string;
  series: string;
  tgp: number;
  gaming_w: number;
  idle_w: number;
}

export interface ApplianceUsageLog {
  id: string;
  user_id: string;
  appliance_id: string;
  started_at: string;
  ended_at?: string | null;
  duration_minutes?: number;
  kwh_consumed?: number;
  is_peak_window?: boolean;
  estimated_cost?: number;
  source?: string;
  notes?: string | null;
  created_at?: string;
}

export interface DailyApplianceUsage {
  id: string;
  user_id?: string | null;
  appliance_id: string;
  usage_date: string; // YYYY-MM-DD
  hours_used: number;
  kwh_consumed: number;
  estimated_cost: number;
  source?: 'manual' | 'live_session' | 'past_time_range' | 'schedule_autofill' | 'routine_default';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SimulatedApplianceUsage {
  id: string;
  user_id?: string | null;
  appliance_id: string;
  usage_date: string; // YYYY-MM-DD
  hours_used: number;
  kwh_consumed: number;
  estimated_cost: number;
  start_hour?: number | null;
  end_hour?: number | null;
  source?: 'simulation_plan' | 'test_run' | 'schedule_autofill' | 'routine_default';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserCalendarEvent {
  id: string;
  user_id: string;
  appliance_id?: string | null;
  title: string;
  category: 'appliance' | 'billing' | 'peak' | 'audit';
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  hour: number;
  duration_hours: number;
  is_recurring: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeralcoRateTier {
  kwh: number;
  rate: number;
  generation_rate: number;
  rate_change: number;
  rate_change_percent: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface BillBreakdown {
  kwh: number;
  tariffType?: 'residential' | 'commercial';
  generationRate: number;
  otherCharges: number;
  isSeniorCitizen?: boolean;
  
  // Generation & Transmission
  generationTotal: number;
  transmissionTotal: number;
  systemLossTotal: number;
  
  // Distribution
  distributionTotal: number;
  distributionCharge: number;
  supplyCharge: number;
  meteringCharge: number;
  
  // Subsidies & Adjustments
  lifelineSubsidy: number;
  seniorSubsidy: number;
  isLifelineEligible: boolean;
  
  // Universal Charges & Government Mandates
  universalCharges: {
    missionary: number;
    environmental: number;
    strandedDebts: number;
    npcStrandedCont: number;
    redci: number;
    total: number;
  };
  fitAll: number;
  
  // Taxes
  generationVat: number;
  transmissionVat: number;
  systemLossVat: number;
  distributionVat: number;
  otherVat: number;
  totalVat: number;
  localFranchiseTax: number;
  
  // Final Totals
  subtotalBeforeTaxes: number;
  totalTaxesAndSubsidies: number;
  totalBill: number;
  effectiveRatePerKwh: number;
}

export interface PelpItem {
  control_no: string;
  brand: string;
  model: string;
  category: string;
  category_slug?: string;
  type?: string;
  monthly_energy_consumption_kwh?: number;
  cooling_capacity_kj_h?: number;
  cspf?: number;
  energy_efficiency_rating?: number;
  star_rating?: number;
  power_watts?: number;
  test_standard?: string;
  raw_specs?: Record<string, any>;
}

export interface PelpCategory {
  slug: string;
  name: string;
  icon: string;
  count: number;
  file: string;
}

export interface VisionScanResult {
  detected_brand?: string;
  detected_model?: string;
  detected_category?: string;
  detected_watts?: number;
  detected_voltage?: number;
  detected_monthly_kwh?: number;
  detected_energy_rating?: string;
  detected_star_rating?: number;
  is_inverter?: boolean;
  inverter_type?: string | null;
  cruising_watts?: number | null;
  pc_metadata?: Record<string, any> | null;
  cooling_capacity_kj_h?: number;
  cooling_capacity_btu?: number;
  cspf?: number;
  eer?: number;
  rated_current_amps?: number;
  raw_markdown?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export type BillingPeriodMode = 'calendar_month' | 'recurring_cycle' | 'custom_range';
export type CycleEndOffset = 'same_day' | 'day_before' | 'day_after';

export interface BillingPeriodConfig {
  mode: BillingPeriodMode;
  cycleStartDay: number; // 1 to 31
  cycleEndOffset: CycleEndOffset; // 'same_day' | 'day_before' | 'day_after'
  customStartDate?: string; // 'YYYY-MM-DD'
  customEndDate?: string;   // 'YYYY-MM-DD'
}

export interface BillingPeriodWindow {
  startDate: Date;
  endDate: Date;
  days: Date[];
  label: string;
  subLabel?: string;
  isCrossMonth: boolean;
}
