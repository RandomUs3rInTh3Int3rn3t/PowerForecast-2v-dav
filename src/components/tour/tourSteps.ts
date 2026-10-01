// Tour Step Definitions — 30 comprehensive steps across 6 pages in English & Tagalog
// Each step targets a `data-tour="<id>"` attribute on the corresponding page

export type TourLanguage = 'en' | 'tl';

export interface TourStepCopy {
  title: string;
  description: string;
}

export interface TourStep {
  id: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  copy: Record<TourLanguage, TourStepCopy>;
}

export interface PageTour {
  pageName: string;
  pageTitle: Record<TourLanguage, string>;
  steps: TourStep[];
}

// ─── 1. DASHBOARD ───────────────────────────────────────────
const dashboardTour: PageTour = {
  pageName: 'dashboard',
  pageTitle: {
    en: 'Dashboard & Live Telemetry Tour',
    tl: 'Gabay sa Dashboard at Live Telemetry',
  },
  steps: [
    {
      id: 'dashboard-hero',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Live Power Load & Instant Burn Rate',
          description:
            'This real-time telemetry card monitors your aggregate household draw right now. See total running wattage (W), the number of active appliances, and your live billing velocity (₱/hour) computed against your actual Meralco tariff.',
        },
        tl: {
          title: 'Live Konsumo ng Kuryente at Halaga Bawat Oras',
          description:
            'Ipinapakita sa real-time telemetry card na ito ang kabuuang lakas ng kuryente na ginagamit ngayon. Makikita rito ang kabuuang wattage (W), bilang ng nakabukas na gamit, at bilis ng gastos (₱/oras) batay sa iyong Meralco rate.',
        },
      },
    },
    {
      id: 'dashboard-kpi-cards',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Month-to-Date Audited Consumption & Goals',
          description:
            'Track your cumulative monthly kWh, current accrued bill cost, and remaining projected cost for the billing cycle. These meters balance your audited actual consumption logs with daily baseline routine quotas.',
        },
        tl: {
          title: 'Buwanang Naitalang Konsumo at Target',
          description:
            'Subaybayan ang naipong kWh ngayong buwan, kasalukuyang naipong bayarin sa kuryente, at projected na babayaran sa katapusan ng buwan. Binabalanse nito ang aktwal na na-log na konsumo at ang iyong baseline target quota.',
        },
      },
    },
    {
      id: 'dashboard-space-split',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Spaces & Sub-Meter Distribution',
          description:
            'Compare energy usage across sub-meters such as your Residential Main House, Commercial Sari-Sari Store, or Rental Units. Each space maintains independent tariff rates and separate billing calculators.',
        },
        tl: {
          title: 'Paghahati ayon sa Spaces at Sub-Meters',
          description:
            'Ikumpara ang konsumo ng kuryente sa iba\'t ibang sub-meters tulad ng Pangunahing Bahay (Residential), Tindahan (Commercial), o Paupahan. Bawat space ay may sariling tariff rate at hiwalay na kalkulasyon ng bill.',
        },
      },
    },
    {
      id: 'dashboard-live-board',
      placement: 'top',
      copy: {
        en: {
          title: 'Live Circuit Control & Real-Time Monitoring',
          description:
            'Monitor active appliances and instantaneous load draw in real time. Energize circuits on high-draw appliances to observe active watts, continuous runtime, and instantaneous rate per hour.',
        },
        tl: {
          title: 'Live Circuit Control at Real-Time Monitoring',
          description:
            'Subaybayan ang mga nakabukas na appliance at kabuuang draw sa real-time. Buksan ang circuit sa mga heavy appliances upang makita ang aktibong wattage, tagal ng andar, at halaga bawat oras.',
        },
      },
    },
    {
      id: 'dashboard-donut',
      placement: 'left',
      copy: {
        en: {
          title: 'Appliance Category Energy Load Distribution',
          description:
            'Visual breakdown of your home energy share across categories like Cooling, Refrigeration, Cooking, Lighting, and Entertainment. Instantly identify which device classes drive the largest portion of your electric bill.',
        },
        tl: {
          title: 'Distribusyon ng Konsumo ayon sa Kategorya',
          description:
            'Visual na paghahati-hati ng konsumo sa mga kategorya tulad ng Pagpapalamig (Aircon/Fan), Refrigerator, Pagluluto, Ilaw, at Libangan. Madaling matutukoy kung aling uri ng gamit ang may pinakamalaking ambag sa bayarin.',
        },
      },
    },
    {
      id: 'dashboard-quick-actions',
      placement: 'top',
      copy: {
        en: {
          title: 'Quick Navigation & Smart Tools',
          description:
            'One-click shortcuts to add new certified appliances from the DOE PELP catalog, jump into the Smart Calendar telemetry studio, or run Monte Carlo billing simulations in Forecasting.',
        },
        tl: {
          title: 'Mabilisang Aksyon at Smart Tools',
          description:
            'Mabilisang daan upang magdagdag ng mga certified appliance mula sa DOE PELP catalog, pumunta sa Smart Calendar para magtala ng oras, o magsagawa ng Monte Carlo billing simulation sa Forecasting.',
        },
      },
    },
  ],
};

// ─── 2. BILL CALCULATOR ─────────────────────────────────────
const calculatorTour: PageTour = {
  pageName: 'calculator',
  pageTitle: {
    en: 'Meralco Bill Calculator Tour',
    tl: 'Gabay sa Meralco Bill Calculator',
  },
  steps: [
    {
      id: 'calculator-summary',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Full Meralco Unbundled Bill Summary',
          description:
            'Accurate breakdown reflecting official Meralco unbundled billing regulations. View your estimated total monthly amount, overall effective rate per kWh, and total monthly energy draw.',
        },
        tl: {
          title: 'Buod ng Opisyal na Meralco Unbundled Bill',
          description:
            'Tumpak na kalkulasyon ayon sa opisyal na unbundled billing system ng Meralco. Makikita rito ang tinatayang kabuuang babayarin sa buwan, pangkalahatang rate bawat kWh, at buwanang konsumo.',
        },
      },
    },
    {
      id: 'calculator-kwh-slider',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Interactive Monthly Consumption Slider',
          description:
            'Drag the slider to simulate monthly kWh consumption levels and see how your bill escalates through higher generation and distribution price brackets in real time.',
        },
        tl: {
          title: 'Interactive na Slider ng Konsumo (kWh)',
          description:
            'I-drag ang slider upang subukan ang iba\'t ibang antas ng konsumo (kWh) at makita kung paano tumataas ang bayarin sa iba\'t ibang antas ng generation at distribution charges.',
        },
      },
    },
    {
      id: 'calculator-unbundled-rates',
      placement: 'top',
      copy: {
        en: {
          title: '12-Component Unbundled Tariff Breakdown',
          description:
            'Inspect exact regulatory line items: Generation Charge, Transmission Charge, System Loss, Distribution, Supply, Metering, Universal Charges, FIT-All, and 12% Government VAT.',
        },
        tl: {
          title: 'Detalyadong 12 Bahagi ng Meralco Charges',
          description:
            'Suriin ang bawat bahagi ng bayarin: Generation Charge, Transmission Charge, System Loss, Distribution, Supply, Metering, Universal Charges, FIT-All, at 12% Value Added Tax (VAT).',
        },
      },
    },
    {
      id: 'calculator-space-comparison',
      placement: 'top',
      copy: {
        en: {
          title: 'Residential vs. Commercial Space Comparison',
          description:
            'Toggle between Residential tariffs and General Power Commercial tariffs to evaluate cost differences for business spaces, sub-metered rentals, or mixed-use properties.',
        },
        tl: {
          title: 'Paghahambing ng Residential at Commercial Rates',
          description:
            'Magpalipat-lipat sa Residential tariff at General Commercial tariff upang suriin ang pagkakaiba ng singil para sa negosyo, paupahan, o commercial spaces.',
        },
      },
    },
    {
      id: 'calculator-lifeline-tier',
      placement: 'top',
      copy: {
        en: {
          title: 'Lifeline Subsidy & Senior Citizen Discounts',
          description:
            'Automatic deduction applied for low-income brackets consuming below 100 kWh/month, alongside 5% Senior Citizen energy discount rules.',
        },
        tl: {
          title: 'Lifeline Subsidy at Diskwento para sa Senior Citizen',
          description:
            'Awtomatikong diskwento para sa mga tahanang kumukonsumo ng mas mababa sa 100 kWh bawat buwan, kasama ang 5% diskwento para sa mga kwalipikadong Senior Citizen.',
        },
      },
    },
  ],
};

// ─── 3. APPLIANCE HUB ───────────────────────────────────────
const appliancesTour: PageTour = {
  pageName: 'appliances',
  pageTitle: {
    en: 'Appliance Hub & Inventory Tour',
    tl: 'Gabay sa Appliance Hub at Imbentaryo',
  },
  steps: [
    {
      id: 'appliance-space-tabs',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Organize by Spaces & Sub-Meters',
          description:
            'Group your devices into spaces like "Main Residence", "Sari-Sari Store", or "Apartment Unit". Each space maintains its own tariff structure, wattage capacity, and energy budgets.',
        },
        tl: {
          title: 'Ayusin ayon sa Spaces at Sub-Meters',
          description:
            'Pangkatin ang mga gamit sa mga space tulad ng "Pangunahing Bahay", "Tindahan", o "Paupahan". Bawat space ay may sariling tariff rate, kapasidad ng kuryente, at badyet.',
        },
      },
    },
    {
      id: 'appliance-add-buttons',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Certified PELP Database & AI Scanner',
          description:
            'Import from thousands of certified Philippine DOE PELP models with official laboratory-tested wattages and star ratings, create custom manual devices, or scan energy stickers with AI Vision.',
        },
        tl: {
          title: 'DOE PELP Database at AI Scanner',
          description:
            'Pumili mula sa libu-libong sertipikadong modelo sa opisyal na DOE PELP database na may subok na wattage at star rating, maglagay ng custom na gamit, o kumuha ng litrato ng energy sticker gamit ang AI Scanner.',
        },
      },
    },
    {
      id: 'appliance-card',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Daily Target Quotas & Habit Benchmarks',
          description:
            'When adding or editing appliances, set your Daily Target Quota (e.g. 8h/day). This serves as your budget benchmark for over/under budget tracking. You can also backfill past dates in the current month via the Mini Calendar.',
        },
        tl: {
          title: 'Pang-araw-araw na Target Quota at Badyet',
          description:
            'Sa pagdaragdag o pag-edit ng gamit, itakda ang Daily Target Quota (hal. 8 oras/araw). Ito ang magsisilbing basehang badyet. Maaari ding mag-backfill ng nakaraang mga araw sa kasalukuyang buwan gamit ang Mini Calendar.',
        },
      },
    },
    {
      id: 'appliance-filters',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Category & Room Location Filters',
          description:
            'Quickly filter devices by functional category (Air Conditioners, Refrigerators, Lighting, Kitchen) or room location (Living Room, Kitchen, Bedroom).',
        },
        tl: {
          title: 'Pagsala ayon sa Kategorya at Lokasyon ng Silid',
          description:
            'Mabilisang i-filter ang mga gamit ayon sa kategorya (Aircon, Refrigerator, Ilaw, Kusina) o lokasyon sa bahay (Sala, Kusina, Silid-tulugan).',
        },
      },
    },
    {
      id: 'appliance-space-manage',
      placement: 'left',
      copy: {
        en: {
          title: 'Space & Tariff Rate Management',
          description:
            'Create new sub-metered areas, assign Residential or Commercial tariffs, set default spaces, and customize effective electricity rates per kWh.',
        },
        tl: {
          title: 'Pamamahala ng Space at Rate ng Kuryente',
          description:
            'Gumawa ng mga bagong sub-meter area, magtakda kung Residential o Commercial rate, pumili ng default space, at i-customize ang halaga bawat kWh.',
        },
      },
    },
  ],
};

// ─── 4. SMART CALENDAR ──────────────────────────────────────
const calendarTour: PageTour = {
  pageName: 'calendar',
  pageTitle: {
    en: 'Smart Calendar & Telemetry Studio Tour',
    tl: 'Gabay sa Smart Calendar at Telemetry Studio',
  },
  steps: [
    {
      id: 'calendar-grid',
      placement: 'top',
      copy: {
        en: {
          title: '3-Mode Contextual Calendar Telemetry',
          description:
            'Click any day to open the telemetry studio. It adapts automatically:\n• TODAY: Real-time active circuit draw, budget countdown, and running kWh.\n• PAST DAYS: Historical records, retrospective [h:m:s] input, and + Log Past Time Range.\n• FUTURE DAYS: Projected baseline allocations and simulation schedules.',
        },
        tl: {
          title: 'Tatlong Antas ng Kalendaryo (Kasalukuyan, Nakalipas, Hinaharap)',
          description:
            'Pindutin ang anumang araw upang buksan ang telemetry studio:\n• NGAYON: Real-time na konsumo ng kuryente, natitirang badyet, at naipong kWh.\n• NAKALIPAS: Kasaysayan ng nagamit, manual na oras, at pagtatala ng nakaraang sesyon.\n• HINAHARAP: Projected na kalkulasyon at simulation schedules.',
        },
      },
    },
    {
      id: 'calendar-routine-autofill',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Smart Routine Autofill with Exclude Today',
          description:
            'Batch apply routine quotas across the calendar. Option 1 applies baseline hours from the 1st of the month to yesterday while keeping Today clean and ready for real-time tracking and custom simulation.',
        },
        tl: {
          title: 'Smart Routine Autofill (Ihiwalay ang Araw Ngayon)',
          description:
            'Mabilisang ilapat ang routine quota sa buong kalendaryo. Ang Option 1 ay naglalagay ng baseline mula ika-1 ng buwan hanggang kahapon habang pinananatiling malinis ang araw ngayon para sa real-time tracking at simulation.',
        },
      },
    },
    {
      id: 'calendar-live-sessions',
      placement: 'bottom',
      copy: {
        en: {
          title: '24-Hour Activity Timeline & Progressive Routines',
          description:
            'Inspect meter tracks (00:00 – 24:00). On past days, click any unlogged appliance track to log exact start and end times. Logging a session on an On-Demand device will intelligently offer to set it as your daily routine!',
        },
        tl: {
          title: '24-Oras na Timeline at Progressive Routine Conversion',
          description:
            'Suriin ang 24-oras na timeline (00:00 – 24:00). Sa nakalipas na araw, pindutin ang unlogged track upang maglagay ng eksaktong oras ng simula at tapos. Kapag nag-log sa gamit na walang routine, awtomatiko itong mag-aalok na gawin itong pang-araw-araw na routine!',
        },
      },
    },
    {
      id: 'calendar-day-modal',
      placement: 'top',
      copy: {
        en: {
          title: 'Appliance Quota Gauges & Over-Budget Alerts',
          description:
            'Adjust operating hours with instant preset chips or fine-grained [h:m:s] inputs. Red gauges alert you immediately when usage exceeds your daily target quota.',
        },
        tl: {
          title: 'Quota Gauge at Alerto sa Sobrang Paggamit',
          description:
            'Baguhin ang oras ng gamit gamit ang preset buttons o eksaktong [oras:minuto]. Ang pulang alerto ay agad magbababala kapag lumagpas ang nagamit sa itinakdang daily target quota.',
        },
      },
    },
    {
      id: 'calendar-legend',
      placement: 'top',
      copy: {
        en: {
          title: 'Calendar Day Badges & Color Cues',
          description:
            'Days marked with ~ indicate estimated routine projections, while checkmarked days represent audited actual logs. Flame badges highlight high-consumption peak load days.',
        },
        tl: {
          title: 'Mga Palatandaan at Kulay sa Kalendaryo',
          description:
            'Ang simbolong ~ ay nagpapahiwatig ng projected na konsumo, habang ang may checkmark ay audited na aktwal na naitala. Ang simbolo ng apoy ay nagbababala ng mataas na konsumo sa araw na iyon.',
        },
      },
    },
  ],
};

// ─── 5. ANALYTICS ───────────────────────────────────────────
const analyticsTour: PageTour = {
  pageName: 'analytics',
  pageTitle: {
    en: 'Analytics & Consumption Profiling Tour',
    tl: 'Gabay sa Analytics at Pagsusuri ng Konsumo',
  },
  steps: [
    {
      id: 'analytics-kpi-row',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Key Performance Telemetry Indicators',
          description:
            'Instant high-level summary of your average daily kWh load, average daily cost, maximum peak power demand, and overall monthly active appliance count.',
        },
        tl: {
          title: 'Mahahalagang Sukatan sa Paggamit ng Kuryente',
          description:
            'Mabilisang buod ng karaniwang konsumo bawat araw (kWh), karaniwang gastos bawat araw, pinakamataas na sabay-sabay na lakas ng kuryente (Peak Watts), at bilang ng aktibong gamit.',
        },
      },
    },
    {
      id: 'analytics-load-curve',
      placement: 'bottom',
      copy: {
        en: {
          title: '24-Hour Peak Load Curve (Meralco Peak Hours)',
          description:
            'Visualizes your household electricity demand by hour of the day. Highlights critical peak window hours (6:00 PM – 10:00 PM) to help you shift heavy tasks to off-peak periods.',
        },
        tl: {
          title: '24-Oras na Load Curve (Oras ng Peak Demand)',
          description:
            'Ipinapakita ang lakas ng kuryente sa bawat oras ng maghapon. Binibigyang-diin ang Peak Hours (6:00 PM hanggang 10:00 PM) upang mailipat ang paggamit ng mabibigat na gamit sa mas murang oras.',
        },
      },
    },
    {
      id: 'analytics-category-chart',
      placement: 'top',
      copy: {
        en: {
          title: 'Consumption by Category Breakdown',
          description:
            'Compare the percentage and total peso cost attributed to Cooling, Food Preservation, Laundry, Cooking, and Entertainment systems.',
        },
        tl: {
          title: 'Paghahati-hati ng Gastos ayon sa Kategorya',
          description:
            'Ikumpara ang porsyento at kabuuang halaga sa piso ng konsumo para sa Pagpapalamig, Refrigerator, Paglalaba, Pagluluto, at Libangan.',
        },
      },
    },
    {
      id: 'analytics-space-distribution',
      placement: 'top',
      copy: {
        en: {
          title: 'Multi-Space Sub-Meter Analytics',
          description:
            'Examine energy share between separate spaces. Essential for landlords tracking rental units or homeowners managing a home business alongside their residential quarters.',
        },
        tl: {
          title: 'Pagsusuri sa Iba\'t Ibang Spaces at Sub-Meters',
          description:
            'Suriin ang hatian ng kuryente sa iba\'t ibang lugar. Mahalaga para sa mga nagpapaupa o may-ari ng bahay na may kasabay na negosyo tulad ng tindahan.',
        },
      },
    },
    {
      id: 'analytics-historical-trend',
      placement: 'top',
      copy: {
        en: {
          title: 'Historical Billing & Consumption Trends',
          description:
            'Track your progress over consecutive months to verify if your energy conservation habits successfully lowered your overall Meralco electric bill.',
        },
        tl: {
          title: 'Kasaysayan at Trend ng Buwanang Konsumo',
          description:
            'Subaybayan ang pagbabago sa nakaraang mga buwan upang makita kung naging epektibo ang pagtitipid sa pagbaba ng iyong Meralco bill.',
        },
      },
    },
  ],
};

// ─── 6. FORECASTING ─────────────────────────────────────────
const forecastingTour: PageTour = {
  pageName: 'forecasting',
  pageTitle: {
    en: 'AI Forecasting & Monte Carlo Simulation Tour',
    tl: 'Gabay sa AI Forecasting at Simulation',
  },
  steps: [
    {
      id: 'forecasting-hero-kpi',
      placement: 'bottom',
      copy: {
        en: {
          title: 'End-of-Month Bill Projection',
          description:
            'Predictive engine projecting your final month bill with confidence intervals, combining audited past actuals with remaining future habit baselines.',
        },
        tl: {
          title: 'Pagtataya sa Kabuuang Bill sa Katapusan ng Buwan',
          description:
            'Predictive engine na nagtataya ng iyong magiging bayarin sa katapusan ng buwan, pinagsasama ang naitala nang mga araw at ang inaasahang gawi sa natitirang mga araw.',
        },
      },
    },
    {
      id: 'forecasting-monte-carlo',
      placement: 'bottom',
      copy: {
        en: {
          title: 'Monte Carlo Probabilistic Risk Modeling',
          description:
            'Runs 500+ stochastic iterations considering temperature variations and usage fluctuations to display Best-Case, Expected, and Worst-Case billing scenarios.',
        },
        tl: {
          title: 'Monte Carlo Probabilistic Simulation',
          description:
            'Nagsasagawa ng mahigit 500 simulasyon na isinasaalang-alang ang init ng panahon at pabago-bagong paggamit upang ipakita ang Pinakamababang Halaga, Karaniwang Halaga, at Pinakamataas na Posibleng Gastos.',
        },
      },
    },
    {
      id: 'forecasting-concurrency-risk',
      placement: 'top',
      copy: {
        en: {
          title: 'Peak Demand & Breaker Concurrency Risk',
          description:
            'Detects high-risk time windows where multiple high-wattage appliances (like Water Heater + AC + Induction Cooker) might overlap and trip your main circuit breaker.',
        },
        tl: {
          title: 'Alerto sa Sobrang Sabay-sabay na Kuryente (Peak Overload)',
          description:
            'Natutukoy ang mga oras kung kailan maaaring magkasabay-sabay ang mabibigat na gamit (tulad ng Shower Heater, Aircon, at Induction Cooker) na maaaring magdulot ng pag-trip ng circuit breaker.',
        },
      },
    },
    {
      id: 'forecasting-budget-alarm',
      placement: 'top',
      copy: {
        en: {
          title: 'Budget Cap Limit & Early Warning Thresholds',
          description:
            'Set your monthly spending ceiling (e.g. ₱5,000). The system alerts you if your current pacing threatens to breach your budget before the billing cycle concludes.',
        },
        tl: {
          title: 'Limitasyon sa Badyet at Maagang Alerto',
          description:
            'Magtakda ng pinakamataas na nais mong bayaran (hal. ₱5,000). Magbibigay ng babala ang system kung ang kasalukuyang bilis ng paggamit ay maaaring lumampas sa iyong itinakdang badyet.',
        },
      },
    },
    {
      id: 'forecasting-ai-recommendations',
      placement: 'top',
      copy: {
        en: {
          title: 'AI-Driven Actionable Energy Saving Insights',
          description:
            'Customized energy-saving advice tailored to your specific appliances — such as shifting thermostat settings by 1°C to save up to ₱450/month without sacrificing comfort.',
        },
        tl: {
          title: 'Mga Mungkahi ng AI para sa Pagtitipid ng Kuryente',
          description:
            'Mga praktikal na payo sa pagtitipid na nakabatay sa iyong mga gamit — tulad ng pag-adjust ng thermostat ng aircon nang 1°C upang makatipid ng hanggang ₱450 bawat buwan.',
        },
      },
    },
  ],
};

// ─── Export Registry ─────────────────────────────────────────
export const ALL_PAGE_TOURS: Record<string, PageTour> = {
  dashboard: dashboardTour,
  calculator: calculatorTour,
  appliances: appliancesTour,
  calendar: calendarTour,
  analytics: analyticsTour,
  forecasting: forecastingTour,
};

export const ROUTE_TO_TOUR_PAGE: Record<string, string> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/calculator': 'calculator',
  '/appliances': 'appliances',
  '/calendar': 'calendar',
  '/analytics': 'analytics',
  '/forecasting': 'forecasting',
};

export function getTourForPage(pageName: string): PageTour | null {
  return ALL_PAGE_TOURS[pageName] || null;
}
