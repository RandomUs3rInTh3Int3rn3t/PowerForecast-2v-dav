// Tour Step Definitions — Comprehensive Guided Tours across all PowerForecast modules
// Each step targets a verified `data-tour="<id>"` attribute in the DOM
// Bilingual support: English (en) and Filipino/Tagalog (tl)

export type TourLanguage = 'en' | 'tl';

export type TourPage =
  | 'dashboard'
  | 'calculator'
  | 'appliances'
  | 'calendar'
  | 'analytics'
  | 'forecasting';

export interface TourStepCopy {
  title: string;
  description: string;
}

export interface TourStep {
  id: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  copy: Record<TourLanguage, TourStepCopy>;
  page?: TourPage;
}

export interface PageTour {
  pageName: TourPage;
  pageTitle: Record<TourLanguage, string>;
  steps: TourStep[];
}

export const FULL_TOUR_PAGE_ORDER: TourPage[] = [
  'dashboard',
  'calculator',
  'appliances',
  'calendar',
  'analytics',
  'forecasting',
];

export const PAGE_TO_ROUTE: Record<TourPage, string> = {
  dashboard: '/dashboard',
  calculator: '/calculator',
  appliances: '/appliances',
  calendar: '/calendar',
  analytics: '/analytics',
  forecasting: '/forecasting',
};

export const ROUTE_TO_TOUR_PAGE: Record<string, TourPage> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/calculator': 'calculator',
  '/appliances': 'appliances',
  '/calendar': 'calendar',
  '/analytics': 'analytics',
  '/forecasting': 'forecasting',
};

export const PAGE_METADATA: Record<TourPage, { title: Record<TourLanguage, string>; icon: string }> = {
  dashboard: {
    title: { en: 'Dashboard & Telemetry', tl: 'Dashboard at Telemetry' },
    icon: 'Dashboard',
  },
  calculator: {
    title: { en: 'Meralco Bill Calculator', tl: 'Kalkulador ng Meralco Bill' },
    icon: 'Calculate',
  },
  appliances: {
    title: { en: 'Appliances Hub & Spaces', tl: 'Sentro ng Kagamitan at Espasyo' },
    icon: 'Bolt',
  },
  calendar: {
    title: { en: 'Smart Calendar & TOU', tl: 'Matalinong Kalendaryo' },
    icon: 'CalendarToday',
  },
  analytics: {
    title: { en: 'Analytics & Vampire Loss', tl: 'Pagsusuri at Vampire Load' },
    icon: 'Insights',
  },
  forecasting: {
    title: { en: 'Predictive Forecasting', tl: 'Prediksyon at Sitwasyon' },
    icon: 'AutoGraph',
  },
};

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
      page: 'dashboard',
      copy: {
        en: {
          title: 'Live Power Load & Instant Telemetry',
          description:
            'This real-time telemetry card monitors your aggregate household draw right now. See total running wattage (W), the number of active appliances, and your live billing velocity (₱/hour) computed against your actual Meralco tariff.',
        },
        tl: {
          title: 'Live Konsumo ng Kuryente at Real-Time Telemetry',
          description:
            'Ipinapakita sa real-time telemetry card na ito ang kabuuang lakas ng kuryente na ginagamit ngayon. Makikita rito ang kabuuang wattage (W), bilang ng nakabukas na gamit, at bilis ng gastos (₱/oras) batay sa iyong Meralco rate.',
        },
      },
    },
    {
      id: 'nav-sidebar',
      placement: 'right',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Unified Navigation Hub',
          description:
            'Quickly switch across all PowerForecast modules: Bill Calculator, Appliance Inventory, Smart Calendar, Analytics, Forecasting, and API Documentation.',
        },
        tl: {
          title: 'Menu ng Navigasyon',
          description:
            'Mabilis na lumipat sa iba\'t ibang bahagi ng app: Bill Calculator, Sentro ng Kagamitan, Smart Calendar, Analytics, Forecasting, at Dokumentasyon.',
        },
      },
    },
    {
      id: 'header-db-status',
      placement: 'bottom',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Database Cloud Sync & Offline Resilience',
          description:
            'Live connectivity indicator monitoring Supabase cloud sync and network latency. PowerForecast operates seamlessly offline using local caching and synchronizes changes automatically upon reconnection.',
        },
        tl: {
          title: 'Koneksyon sa Cloud at Offline Mode',
          description:
            'Palatandaan ng live na koneksyon sa Supabase cloud. Gumagana pa rin ang PowerForecast kahit walang internet gamit ang lokal na memorya at awtomatikong magsi-sync muli pagbalik ng koneksyon.',
        },
      },
    },
    {
      id: 'dashboard-kpi-cards',
      placement: 'bottom',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Month-to-Date Audited Consumption & Goals',
          description:
            'Track cumulative monthly energy (kWh), current accrued cost, active circuits online, and daily average pacing. These metrics balance recorded telemetry with your baseline quota.',
        },
        tl: {
          title: 'Buwanang Naitalang Konsumo at Target',
          description:
            'Subaybayan ang naipong kWh ngayong buwan, kasalukuyang bayarin, bilang ng bukas na kagamitan, at arawang takbo. Binabalanse nito ang naitalang konsumo at ang iyong itinakdang quota.',
        },
      },
    },
    {
      id: 'dashboard-live-board',
      placement: 'top',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Interactive Appliance Control Board',
          description:
            'Turn appliances on and off in real time with a single click. PowerForecast automatically calculates running time and live cost accumulation with midnight rollover protection.',
        },
        tl: {
          title: 'Interactive na Kontrol ng mga Kagamitan',
          description:
            'I-on o i-off ang mga kagamitan sa isang pindot lang sa real-time. Awtomatikong kinakalkula ng PowerForecast ang tagal ng paggamit at naipong halaga nang may proteksyon sa midnight rollover.',
        },
      },
    },
    {
      id: 'dashboard-donut',
      placement: 'left',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Energy Distribution Breakdown',
          description:
            'Visual breakdown of your energy consumption by category — discover whether cooling, refrigeration, laundry, or entertainment accounts for the bulk of your power draw.',
        },
        tl: {
          title: 'Hatid ng Konsumo Bawat Kategorya',
          description:
            'Visual na distribusyon ng iyong kuryente bawat kategorya — alamin kung cooling, refrigeration, laundry, o entertainment ang pinakamalaking humihigop ng kuryente.',
        },
      },
    },
    {
      id: 'dashboard-quick-actions',
      placement: 'top',
      page: 'dashboard',
      copy: {
        en: {
          title: 'Quick Module Launchpad',
          description:
            'Shortcuts to quickly open the Meralco Bill Calculator, manage appliances, schedule calendar routines, or explore deep analytics.',
        },
        tl: {
          title: 'Mabilis na Aksyon at Shortcut',
          description:
            'Diretsong shortcut patungo sa Bill Calculator, pamamahala ng kagamitan, pag-iskedyul sa kalendaryo, o pagsusuri sa analytics.',
        },
      },
    },
  ],
};

// ─── 2. CALCULATOR ──────────────────────────────────────────
const calculatorTour: PageTour = {
  pageName: 'calculator',
  pageTitle: {
    en: 'Meralco Bill Calculator Tour',
    tl: 'Gabay sa Kalkulador ng Meralco Bill',
  },
  steps: [
    {
      id: 'calculator-space-comparison',
      placement: 'bottom',
      page: 'calculator',
      copy: {
        en: {
          title: 'Tariff Mode Selection',
          description:
            'Toggle between standard Meralco Residential rates and General Power Commercial tariffs with unbundled demand and generation structures.',
        },
        tl: {
          title: 'Pagpili ng Taripa (Residential vs Komersyal)',
          description:
            'Pumili sa pagitan ng karaniwang Meralco Residential rate at General Power Commercial tariff na may unbundled demand at generation structure.',
        },
      },
    },
    {
      id: 'calculator-subsidies',
      placement: 'bottom',
      page: 'calculator',
      copy: {
        en: {
          title: 'Base Generation Charge & Pass-Through',
          description:
            'Customize or inspect the generation charge per kWh. Meralco generation costs fluctuate monthly per ERC pass-through rules — adjust or test scenario rates here.',
        },
        tl: {
          title: 'Base Generation Charge at ERC Pass-Through',
          description:
            'Baguhin o suriin ang generation charge kada kWh. Ang singil sa generation ng Meralco ay nagbabago buwan-buwan ayon sa ERC — maaari mong subukan ang iba\'t ibang presyo rito.',
        },
      },
    },
    {
      id: 'calculator-kwh-slider',
      placement: 'bottom',
      page: 'calculator',
      copy: {
        en: {
          title: 'Monthly Consumption Slider',
          description:
            'Quickly adjust monthly kWh consumption from 0 to 1,000+ kWh to see instant projected charges and observe lifeline subsidy thresholds (≤100 kWh).',
        },
        tl: {
          title: 'Slider ng Buwanang Konsumo (kWh)',
          description:
            'Mabilisang i-adjust ang konsumo mula 0 hanggang 1,000+ kWh upang makita agad ang halaga ng kuryente at ang mga diskwento sa lifeline subsidy (≤100 kWh).',
        },
      },
    },
    {
      id: 'calculator-summary',
      placement: 'left',
      page: 'calculator',
      copy: {
        en: {
          title: 'Total Projected Amount Due',
          description:
            'Your complete projected Meralco electric bill with effective rate per kWh, power supply costs, and other regulated grid pass-through fees.',
        },
        tl: {
          title: 'Kabuuang Tinatayang Halaga ng Bill',
          description:
            'Ang kumpletong projected electric bill sa Meralco kasama ang effective rate bawat kWh, power supply costs, at iba pang bayarin sa grid.',
        },
      },
    },
    {
      id: 'calculator-unbundled',
      placement: 'top',
      page: 'calculator',
      copy: {
        en: {
          title: 'ERC Unbundled Cost Share Distribution',
          description:
            'Full transparent breakdown of statutory bill components: Generation, Transmission, System Loss, Distribution, Subsidies, Government Taxes (VAT), and Universal Charges.',
        },
        tl: {
          title: 'Distribusyon ng Unbundled Charges ng ERC',
          description:
            'Maliwanag na breakdown ng lahat ng bahagi ng singil sa kuryente: Generation, Transmission, System Loss, Distribution, Subsidies, Buwis ng Gobyerno (VAT), at Universal Charges.',
        },
      },
    },
    {
      id: 'calculator-whatif',
      placement: 'top',
      page: 'calculator',
      copy: {
        en: {
          title: 'What-If Savings Simulator',
          description:
            'Simulate monthly bill savings by trimming daily usage hours across your appliances. See immediate peso and kWh reductions.',
        },
        tl: {
          title: 'Simulator ng Pagtitipid (What-If)',
          description:
            'I-simulate kung gaano kalaki ang matitipid sa buwanang bill sa pamamagitan ng pagbawas ng oras ng paggamit ng mga kagamitan. Makikita agad ang bawas sa piso at kWh.',
        },
      },
    },
  ],
};

// ─── 3. APPLIANCES ──────────────────────────────────────────
const appliancesTour: PageTour = {
  pageName: 'appliances',
  pageTitle: {
    en: 'Appliances Hub & Spaces Tour',
    tl: 'Gabay sa Sentro ng Kagamitan at Espasyo',
  },
  steps: [
    {
      id: 'appliance-space-tabs',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Multi-Space Sub-Metering Tabs',
          description:
            'Organize your appliances across different properties or zones — like Main House, Rental Suite, Garage Workshop, or Commercial Unit — each with its own tariff.',
        },
        tl: {
          title: 'Mga Espasyo at Sub-Meter Tabs',
          description:
            'Ayusin ang mga kagamitan ayon sa iba\'t ibang lugar o sub-meter — tulad ng Bahay, Paupahan, Tindahan/Negosyo, o Workshop — bawat isa ay may sariling taripa.',
        },
      },
    },
    {
      id: 'appliance-space-manage',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Space Configuration & Tariffs',
          description:
            'Configure space names, assign residential or commercial rates, or adjust sub-meter parameters for dedicated space accounting.',
        },
        tl: {
          title: 'Pamamahala at Setting ng Espasyo',
          description:
            'I-customize ang pangalan ng espasyo, magtalaga ng residential o commercial tariff, o mag-ayos ng sub-meter parameters para sa tumpak na pagtutuos.',
        },
      },
    },
    {
      id: 'appliance-add-buttons',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Pre-Loaded Appliance Library & Custom Add',
          description:
            'Add custom appliances or choose from hundreds of pre-calibrated Philippine household presets with verified wattage, standby draws, and DOE PELP ratings.',
        },
        tl: {
          title: 'Magdagdag ng Kagamitan at Library ng Presets',
          description:
            'Magdagdag ng sariling gamit o pumili mula sa daan-daang pre-calibrated na gamit sa Pilipinas na may tamang wattage, standby loss, at DOE PELP ratings.',
        },
      },
    },
    {
      id: 'appliance-filters',
      placement: 'bottom',
      page: 'appliances',
      copy: {
        en: {
          title: 'Search, Room Filtering & Sorting',
          description:
            'Instantly search through your devices or filter by room (Living Room, Kitchen, Bedroom, Office). Sort by wattage or cost impact.',
        },
        tl: {
          title: 'Paghahanap at Pag-filter ayon sa Kwarto',
          description:
            'Mabilis na hanapin ang kagamitan gamit ang search bar o i-filter ayon sa kwarto (Sala, Kusina, Kwarto, Opisina). I-sort ayon sa lakas ng konsumo o gastos.',
        },
      },
    },
    {
      id: 'appliance-card',
      placement: 'top',
      page: 'appliances',
      copy: {
        en: {
          title: 'Appliance Card & Real-Time Controls',
          description:
            'Inspect wattage, daily operational hours, monthly cost share, and inverter efficiency grade. Toggle the switch to track live running sessions.',
        },
        tl: {
          title: 'Card ng Kagamitan at Live Kontrol',
          description:
            'Tingnan ang wattage, oras ng paggamit bawat araw, buwanang halaga, at inverter efficiency grade. I-click ang switch para simulan ang pagtatala ng konsumo.',
        },
      },
    },
  ],
};

// ─── 4. CALENDAR ────────────────────────────────────────────
const calendarTour: PageTour = {
  pageName: 'calendar',
  pageTitle: {
    en: 'Smart Calendar & Time-of-Use Tour',
    tl: 'Gabay sa Matalinong Kalendaryo',
  },
  steps: [
    {
      id: 'calendar-billing-period',
      placement: 'bottom',
      page: 'calendar',
      copy: {
        en: {
          title: 'Billing Cycle & Window Navigator',
          description:
            'Navigate between billing cycles or calendar months. Customize your exact Meralco meter read cutoff dates for cycle-accurate cost matching.',
        },
        tl: {
          title: 'Tagapamahala ng Billing Cycle',
          description:
            'Magpalipat-lipat sa billing cycles o buwan. Itakda ang eksaktong araw ng meter reading ng Meralco para sa tumpak na pagtutugma ng bill.',
        },
      },
    },
    {
      id: 'calendar-legend',
      placement: 'bottom',
      page: 'calendar',
      copy: {
        en: {
          title: 'Visual Status Legend',
          description:
            'Color-coded indicators distinguish baseline quota, simulated schedule, net savings, and heavy peak load days at a single glance.',
        },
        tl: {
          title: 'Gabay sa Kulay ng Konsumo at Peak Status',
          description:
            'Mga palatandaan sa kulay upang madaling makilala ang baseline quota, simulated schedule, matitipid, at mga araw na may mataas na peak load.',
        },
      },
    },
    {
      id: 'calendar-kpi-summary',
      placement: 'bottom',
      page: 'calendar',
      copy: {
        en: {
          title: 'Baseline vs Simulated Telemetry',
          description:
            'Compare your expected baseline period cost against simulated schedule totals, showing your net projected savings or variance.',
        },
        tl: {
          title: 'Paghahambing ng Baseline at Na-simulate na Konsumo',
          description:
            'Ikumpara ang inaasahang baseline cost laban sa na-simulate na iskedyul, at makita ang kabuuang tinatayang matitipid o diperensya.',
        },
      },
    },
    {
      id: 'calendar-grid',
      placement: 'top',
      page: 'calendar',
      copy: {
        en: {
          title: 'Monthly Heatmap & Load Calendar',
          description:
            'Day-by-day interactive calendar displaying logged energy draw (kWh) and peso value for each day of the month.',
        },
        tl: {
          title: 'Buwanang Kalendaryo ng Konsumo',
          description:
            'Araw-araw na kalendaryo na nagpapakita ng naitalang kuryente (kWh) at halaga sa piso para sa bawat araw ng buwan.',
        },
      },
    },
    {
      id: 'calendar-day-click',
      placement: 'top',
      page: 'calendar',
      copy: {
        en: {
          title: 'Daily Log & Hourly Time-of-Use Details',
          description:
            'Click any day cell to open an hourly breakdown modal, view active appliances, or log actual meter readings for that date.',
        },
        tl: {
          title: 'Arawang Tala at Oras-oras na Detalye',
          description:
            'Pindutin ang anumang araw upang buksan ang oras-oras na breakdown, makita ang ginamit na appliances, o magtala ng metro reading.',
        },
      },
    },
  ],
};

// ─── 5. ANALYTICS ───────────────────────────────────────────
const analyticsTour: PageTour = {
  pageName: 'analytics',
  pageTitle: {
    en: 'Analytics & Energy Audit Tour',
    tl: 'Gabay sa Pagsusuri at Energy Audit',
  },
  steps: [
    {
      id: 'analytics-kpi-row',
      placement: 'bottom',
      page: 'analytics',
      copy: {
        en: {
          title: 'Energy Volume & Inverter Efficiency KPIs',
          description:
            'High-level audit metrics covering total monthly kWh, forecasted bill, DOE PELP compliance rating, and standby loss totals.',
        },
        tl: {
          title: 'Mga KPI ng Konsumo at Kahusayan sa Enerhiya',
          description:
            'Mahahalagang sukatan tulad ng buwanang kWh volume, tinatayang bill, marka sa DOE PELP efficiency, at kabuuang standby loss.',
        },
      },
    },
    {
      id: 'analytics-vampire-load',
      placement: 'bottom',
      page: 'analytics',
      copy: {
        en: {
          title: 'Standby Vampire Load Audit',
          description:
            'Audit phantom energy consumed by appliances left plugged in on standby mode. See monthly and annual costs, plus potential cutoff savings.',
        },
        tl: {
          title: 'Pagsusuri ng Vampire Load at Standby Loss',
          description:
            'Alamin ang kuryenteng nasasayang sa mga nakasaksak na kagamitan kahit nakapatay. Makikita ang buwanan at taunang halaga at potensyal na matitipid.',
        },
      },
    },
    {
      id: 'analytics-category-bars',
      placement: 'top',
      page: 'analytics',
      copy: {
        en: {
          title: 'Pareto Ranking (80/20 Rule) & Categories',
          description:
            'Identifies your top energy-consuming devices following the 80/20 rule. Focus your energy-saving efforts where they make the largest financial impact.',
        },
        tl: {
          title: 'Ranggo ng Gamit (Pareto 80/20) at Bahagi ng Kategorya',
          description:
            'Tinutukoy ang mga kagamitang pinakamalakas kumonsumo batay sa 80/20 rule. Ipunla ang pagtitipid sa mga gamit na may pinakamalaking epekto sa bill.',
        },
      },
    },
    {
      id: 'analytics-load-curve',
      placement: 'top',
      page: 'analytics',
      copy: {
        en: {
          title: '24-Hour Load Curve Simulation',
          description:
            'Simulate hourly power demand across a full 24-hour cycle. Identify peak consumption spikes and opportunities to shift heavy appliances to off-peak hours.',
        },
        tl: {
          title: 'Simulasyon ng 24-Oras na Load Curve',
          description:
            'Visual na hugis ng konsumo sa buong 24 oras. Alamin kung kailan ang peak hours at ilipat ang mabibigat na gamit sa mga oras na mas mababa ang demand.',
        },
      },
    },
    {
      id: 'analytics-historical-trend',
      placement: 'top',
      page: 'analytics',
      copy: {
        en: {
          title: 'Multi-Month Trend & Baseline Forecast',
          description:
            'Compare active billing cycle telemetry alongside recorded history and forward-looking baseline projections based on your appliance routines.',
        },
        tl: {
          title: 'Kasaysayan ng Konsumo at Baseline Trend',
          description:
            'Subaybayan ang takbo ng kuryente sa mga nakaraang buwan at ihambing ang kasalukuyang billing cycle sa iyong karaniwang baseline.',
        },
      },
    },
    {
      id: 'analytics-insights',
      placement: 'top',
      page: 'analytics',
      copy: {
        en: {
          title: 'AI Smart Energy Audit & Actionable Insights',
          description:
            'Practical, tailored recommendations based on your appliance load profile and Meralco tariff structure to optimize your monthly expenses.',
        },
        tl: {
          title: 'Matalinong Payo at Rekomendasyon ng AI',
          description:
            'Mga partikular at praktikal na payo na binuo batay sa iyong mga kagamitan at Meralco tariff para mapababa ang buwanang bill.',
        },
      },
    },
  ],
};

// ─── 6. FORECASTING ─────────────────────────────────────────
const forecastingTour: PageTour = {
  pageName: 'forecasting',
  pageTitle: {
    en: 'Predictive Energy Forecasting Tour',
    tl: 'Gabay sa Prediksyon ng Enerhiya',
  },
  steps: [
    {
      id: 'forecasting-space-tabs',
      placement: 'bottom',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Forecast Scope & Target Space',
          description:
            'Switch forecast models between individual spaces or evaluate consolidated projections across all properties combined.',
        },
        tl: {
          title: 'Saklaw ng Prediksyon at Pagpili ng Espasyo',
          description:
            'Pumili kung para sa partikular na espasyo o para sa pinagsama-samang konsumo ng lahat ng ari-arian ang prediksyon.',
        },
      },
    },
    {
      id: 'forecasting-hero-kpi',
      placement: 'bottom',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Active Billing Cycle Run-Rate Telemetry',
          description:
            'Blends month-to-date recorded actuals with remaining days projection based on your daily appliance routines for maximum forecasting accuracy.',
        },
        tl: {
          title: 'Telemetry ng Kasalukuyang Ikot ng Pagsingil',
          description:
            'Pinagsasama ang naitalang aktwal na konsumo at ang prediksyon para sa mga natitirang araw batay sa iyong pang-araw-araw na routine.',
        },
      },
    },
    {
      id: 'forecasting-trajectory-chart',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Cumulative Trajectory: Baseline vs Simulated Path',
          description:
            'Track cumulative month-end bill run rate comparing baseline quota against your simulated routine schedule to catch budget overruns early.',
        },
        tl: {
          title: 'Tala ng Trajectory: Karaniwan vs Plano ng Simulasyon',
          description:
            'Tingnan ang takbo ng bill kada araw kung susundin ang karaniwang quota laban sa na-simulate na routine upang maagapan ang labis na gastos.',
        },
      },
    },
    {
      id: 'forecasting-rate-slider',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Meralco Rate Fluctuation Simulator',
          description:
            'Stress-test your bill against seasonal Meralco rate spikes or WESM generation increases (e.g. summer demand increases).',
        },
        tl: {
          title: 'Simulator ng Pagbabago sa Presyo ng Meralco',
          description:
            'Subukan kung paano maaapektuhan ang bill kapag tumaas o bumaba ang singil ng Meralco o WESM generation rate (hal. tuwing tag-init).',
        },
      },
    },
    {
      id: 'forecasting-scenarios',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'Data-Driven Forecast Scenarios & Stress Tests',
          description:
            'Side-by-side comparison of 4 projection models: Actual Trajectory, Conservative Saver, Baseline Routine, and Worst-Case High Usage.',
        },
        tl: {
          title: 'Apat na Sitwasyon ng Prediksyon at Stress-Test',
          description:
            'Paghahambing ng 4 na modelo: Kasalukuyang Takbo, Matipid na Sitwasyon, Karaniwang Routine, at Pinakamataas na Konsumo.',
        },
      },
    },
    {
      id: 'forecasting-advisory',
      placement: 'top',
      page: 'forecasting',
      copy: {
        en: {
          title: 'ERC & Meralco Regulatory Advisory',
          description:
            'Contextual advisories explaining regulatory pass-through charges, fuel cost adjustments, and energy conservation tips.',
        },
        tl: {
          title: 'Opisyal na Abiso ng ERC at Meralco',
          description:
            'Mga paliwanag ukol sa mga pass-through charges, fuel adjustments, at opisyal na gabay sa matalinong paggamit ng kuryente.',
        },
      },
    },
  ],
};

// ─── Export Registry ─────────────────────────────────────────
export const ALL_PAGE_TOURS: Record<TourPage, PageTour> = {
  dashboard: dashboardTour,
  calculator: calculatorTour,
  appliances: appliancesTour,
  calendar: calendarTour,
  analytics: analyticsTour,
  forecasting: forecastingTour,
};

export function getTourForPage(pageName: string): PageTour | null {
  return (ALL_PAGE_TOURS as Record<string, PageTour>)[pageName] || null;
}

export function getNextPageInTour(currentPage: TourPage): TourPage | null {
  const currentIndex = FULL_TOUR_PAGE_ORDER.indexOf(currentPage);
  if (currentIndex === -1 || currentIndex >= FULL_TOUR_PAGE_ORDER.length - 1) {
    return null;
  }
  return FULL_TOUR_PAGE_ORDER[currentIndex + 1];
}

export function getPrevPageInTour(currentPage: TourPage): TourPage | null {
  const currentIndex = FULL_TOUR_PAGE_ORDER.indexOf(currentPage);
  if (currentIndex <= 0) {
    return null;
  }
  return FULL_TOUR_PAGE_ORDER[currentIndex - 1];
}
