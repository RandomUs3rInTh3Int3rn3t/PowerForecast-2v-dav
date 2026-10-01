# ⚡ PowerForecast Refine — Project Handover & Architecture Summary

## 📌 Project Overview
* **Application Path**: `D:\Powerforecast\refine-app`
* **Original Reference Path**: `D:\Powerforecast`
* **Technology Stack**:
  * **Framework**: Refine v4.58.0 (`@refinedev/core`, `@refinedev/react-router-v6`, `@refinedev/supabase`)
  * **Core Dependencies**: React 18.3.1, React Router 6.22.3, Vite 8, Tailwind CSS v4, Lucide Icons, Recharts, Tesseract.js
  * **Persistence**: Safe Isolated Local Mode (`localStorage` data provider)
  * **SQL Migration Script**: `D:\Powerforecast\refine-app\powerforecast_supabase_setup.sql`
  * **Local Dev Server**: `http://localhost:5173`
  * **Build Status**: Verified 100% clean TypeScript build (`tsc -b && vite build` in ~2s)

---

## 🎨 1. Full-Featured Dual-Theme System (Light & Dark Modes)
* **Tokens Defined in `src/index.css`**:
  * **Dark Mode (`[data-theme="dark"]`)**:
    * Page BG: `#090938`
    * Top Header BG: `#07072e`
    * Sidebar BG: `#050524`
    * Card Glass BG: `rgba(15, 14, 58, 0.75)`
    * Text Primary: `#ffffff` | Secondary: `#94a3b8` | Muted: `#64748b`
  * **Light Mode (`[data-theme="light"]`)**:
    * Page BG: `#f4f5fc` (Clean soft periwinkle)
    * Top Header BG: `#1c1d70` (Deep indigo)
    * Sidebar BG: `#121350` (Deep navy)
    * Card Glass BG: `rgba(255, 255, 255, 0.94)` (Solid crisp white glass)
    * Text Primary: `#100b46` (Deep navy text) | Secondary: `#333668` | Muted: `#5e6094`
* **Theme Synchronization**:
  * Header toggle switch with live icon animation.
  * Synchronized with `localStorage.getItem("powerforecast_theme")` and `data-theme` attribute on `<html>`.
  * Applied across **100% of the application**: Dashboard, Live Power Board, Consumption Donut, Metric Cards, Appliance Hub, Smart Calendar, Analytics, Modals, Calculator, Landing Page, and Auth screens.

---

## ⚡ 2. Meralco Unbundled Bill Calculator (`MeralcoCalculator.tsx`)
* **Accurate ERC Tariff Computation**:
  * Generation, Transmission, System Loss, Distribution, Supply, Metering, Subsidies (Lifeline & Senior Citizen 5% discount), and Government Taxes (VAT & LFT).
* **Interactive UI**:
  * **Parameter Card**: Monthly kWh slider/input, customizable generation rate, other charges, and Senior Citizen toggle.
  * **TOTAL AMOUNT DUE Glow Card**: Dynamic total bill, effective rate per kWh, and lifeline badge.
  * **Cost Distribution Bar**: Visual percentage breakdown of bill components.
  * **Itemized Receipt Breakdown Table**: Collapsible receipt table detailing unbundled rates and kilowatt-hour costs.
  * **What-If Energy Saving Simulator**: Real-time monthly savings simulation.

---

## 📅 3. Smart Calendar with Multi-View Modes (`SmartCalendar.tsx`)
* **Three View Modes**:
  1. **Month Grid View (`month`)**:
     * 30-day month grid with Prior (`—`), Today focal card with live consumption and accumulated Pesos, and Upcoming scheduled windows.
     * Header banner with Background Month-End Projection calculation (`Proj. Month-End: X kWh • ₱Y`).
  2. **7-Day Week Columns View (`week`)**:
     * Sunday to Saturday vertical column breakdown.
     * Displays scheduled appliances with active wattages, daily kWh, and estimated daily Peso costs.
     * Click-to-inspect daily analytics for any day.
  3. **Day Timeline View (`timeline`)**:
     * 24-Hour minute-level load curve.
     * **Time Zoom Controls**: `24H Full Day`, `Morning (00:00 - 08:00)`, `Day (08:00 - 16:00)`, `Evening (16:00 - 24:00)`.
     * **Resolution Switcher**: `1m`, `5m`, `15m`, `30m`.
     * **Meralco Peak Overlays**: Red gradient highlight bands for **11:00 AM – 4:00 PM** and **6:00 PM – 9:00 PM**.
     * **Live Appliance Telemetry Grid**: Active circuits, wattage, and estimated monthly load.

---

## 🖼️ 4. Portal-Based Modal System & DevLogger Fixes
* **React `createPortal` Integration (`Modal.tsx`)**:
  * All modals (`DateAnalyticsModal`, `ApplianceModal`, `PelpCatalogModal`, `AiVisionScannerModal`) now mount directly at `document.body` level with `z-[9999]`.
  * Completely resolved the issue where the sidebar overlaid the left side of dialogs.
* **Asynchronous DevLogger Dispatch (`devLogger.ts`)**:
  * `DevLoggerManager.notify` dispatches listener callbacks asynchronously using `queueMicrotask`.
  * Telemetry logging in `MeralcoCalculator.tsx` moved to `useEffect`.
  * Completely eliminated React "Cannot update a component while rendering a different component" warnings.

---

## 🚀 5. Public Landing Page & Auth Architecture
* **Landing Page (`LandingPage.tsx`)**:
  * Professional, minimalist UI showcasing all 7 core modules, interactive quick appliance estimator, system impact, and ISO software quality verification.
* **Authentication Provider (`authProvider.ts`)**:
  * `authProvider.check()` allows unauthenticated public access to `/` and `/landing` without unwanted redirects.
  * 1-Click "Instant Demo" guest login and full registration flows.

---

## 🏛️ 6. Official DOE PELP Catalog Engine
* **Files**: `src/lib/pelpService.ts`, `src/components/appliances/PelpCatalogModal.tsx`
* **Datasets Ingested (`public/pelp_data/parsed_json/`)**:
  * 🌬️ **1,787 Air Conditioners**
  * 📺 **1,320 Television Sets**
  * 🧊 **827 Refrigerators & Freezers**
  * 🌀 **153 Electric Fans**
  * 🧺 **10 Washing Machines**
  * 💡 **2,722 Lighting Products**
* **Features**: Multi-schema field normalizer, category pills, search bar, and 1-click import into user inventory.

---

## 📸 7. AI Multi-Angle Vision & In-Browser OCR Scanner
* **Files**: `src/lib/visionService.ts`, `src/components/vision/AiVisionScannerModal.tsx`
* **Features**:
  * **Up to 3 Photos**: Staging area with drag-and-drop support (Energy Guide label, Nameplate, Full View).
  * **Manual Confirmation**: Scan triggers only when user clicks **"Start AI Scan"**.
  * **Dual Engine**: In-browser local OCR (Tesseract.js) + Optional Google Gemini 2.0 Flash Multimodal Vision.

---

## 📂 Source Code Tree
```
D:\Powerforecast\refine-app\
├── public/
│   ├── Assets/                     # Brand logos & icons
│   └── pelp_data/parsed_json/      # 6 official DOE PELP JSON datasets
├── src/
│   ├── components/
│   │   ├── analytics/
│   │   │   └── AnalyticsView.tsx   # Monthly trends & 24h load curve
│   │   ├── appliances/
│   │   │   ├── ApplianceList.tsx   # Multi-space inventory & routine quotas
│   │   │   ├── ApplianceModal.tsx  # Add/edit appliance modal
│   │   │   └── PelpCatalogModal.tsx# Official DOE PELP search & import
│   │   ├── calculator/
│   │   │   └── MeralcoCalculator.tsx# Unbundled tariff calculator
│   │   ├── calendar/
│   │   │   ├── SmartCalendar.tsx   # Month/week grid & 24h timeline
│   │   │   └── DateAnalyticsModal.tsx# Date drilldown & task scheduler
│   │   ├── common/
│   │   │   ├── Badge.tsx           # Status badge component
│   │   │   ├── Button.tsx          # Themed button component
│   │   │   ├── GlassCard.tsx       # Standardized glassmorphic container
│   │   │   ├── MetricCard.tsx      # KPI stat card
│   │   │   └── Modal.tsx           # React Portal modal with z-[9999]
│   │   ├── dashboard/
│   │   │   ├── LivePowerBoard.tsx  # Circuit switches & active draw
│   │   │   └── ConsumptionDonut.tsx# Category distribution
│   │   ├── devlogs/
│   │   │   └── DevLogsFloatingWidget.tsx # Telemetry debugger bubble
│   │   ├── layout/
│   │   │   ├── Header.tsx          # Peak badges & AI scanner button
│   │   │   ├── Sidebar.tsx         # Navigation & live wattage telemetry
│   │   │   └── Layout.tsx          # Root shell layout
│   │   └── vision/
│   │       └── AiVisionScannerModal.tsx # 3-photo staging & OCR scanner
│   ├── lib/
│   │   ├── devLogger.ts            # Async queueMicrotask telemetry manager
│   │   ├── loadCurveService.ts     # Load curve generation & peak windows
│   │   ├── meralcoCalculator.ts    # Unbundled ERC formula engine
│   │   ├── pelpService.ts          # DOE PELP dataset normalizer
│   │   └── visionService.ts        # Dual-engine OCR & Gemini Vision
│   ├── pages/
│   │   ├── AnalyticsPage.tsx
│   │   ├── AppliancesPage.tsx
│   │   ├── CalculatorPage.tsx
│   │   ├── CalendarPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── SignupPage.tsx
│   ├── providers/
│   │   ├── authProvider.ts         # Authentication provider
│   │   └── dataProvider.ts         # Isolated Local Mode provider
│   ├── types/
│   │   └── index.ts                # TypeScript interfaces
│   ├── App.tsx                     # Refine configuration & routing
│   ├── index.css                   # Theme tokens & utilities
│   └── main.tsx                    # React DOM root entry
├── HANDOVER_SUMMARY.md             # Project handover documentation
├── powerforecast_supabase_setup.sql# Standalone Supabase migration script
└── package.json
```
