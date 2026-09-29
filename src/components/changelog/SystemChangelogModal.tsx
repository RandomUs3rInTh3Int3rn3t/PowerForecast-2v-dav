import React, { useState, useEffect, useMemo } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import {
  Close as CloseIcon,
  Search as SearchIcon,
  GitHub as GitHubIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  HistoryEdu as ChangelogIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon,
  Verified as VerifiedIcon,
  Terminal as TerminalIcon,
  FiberManualRecord as DotIcon,
  RocketLaunch as DeploymentIcon,
} from "@mui/icons-material";
import { supabaseClient, APP_VERSION } from "../../lib/supabaseClient";

export interface SystemChangelogEntry {
  id?: string;
  version: string;
  description: string;
  git_commit_tag?: string;
  deployed_by?: string;
  created_at?: string;
  source?: "github" | "database" | "local";
}

// Master compiled GitHub deployment history covering all releases
const COMPLETE_GITHUB_DEPLOYMENTS: SystemChangelogEntry[] = [
  {
    id: "3.4.5v",
    version: "3.4.5v",
    git_commit_tag: "3.4.5v",
    created_at: "2026-09-29T23:20:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.4.5v - Smart Calendar Billing Period: Customizable monthly recurring billing cycles (e.g., Sept 15 to Oct 15) with cycle end day offsets (Same Day, Day Before, Day After), custom date ranges, cycle navigation, and Routine Autofill integration",
  },
  {
    id: "3.4.4v",
    version: "3.4.4v",
    git_commit_tag: "3.4.4v",
    created_at: "2026-09-29T22:45:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.4.4v - Fix Auth Session Missing: Automatically extract and initialize Supabase session from recovery tokens across single and double-hash URLs in HashRouter",
  },
  {
    id: "3.4.3v",
    version: "3.4.3v",
    git_commit_tag: "3.4.3v",
    created_at: "2026-09-29T22:30:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.4.3v - Branded HTML Email Templates: Modern PowerForecast dark theme with official logo, emerald accents, and responsive layout for Supabase Auth and transactional alerts",
  },
  {
    id: "3.4.2v",
    version: "3.4.2v",
    git_commit_tag: "3.4.2v",
    created_at: "2026-09-29T21:50:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.4.2v - Production Custom Domain SMTP: Connect verified comugallery.me domain to Resend & Supabase Auth, lifting sandbox restrictions for worldwide recipient delivery and smart energy alerts",
  },
  {
    id: "3.4.0 - BETAv",
    version: "3.4.0 - BETAv",
    git_commit_tag: "3.4.0-BETAv",
    created_at: "2026-09-28T19:53:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.4.0 - BETAv - Kickstart Simulation Architecture: Declutter Appliance Hub bento cards, remove live stopwatch power buttons and schedule queue modal, and streamline PELP quota setup",
  },
  {
    id: "3.3.8v",
    version: "3.3.8v",
    git_commit_tag: "3.3.8v",
    created_at: "2026-09-21T13:10:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.8v - Implement Mobile & Supabase Auth Diagnostic Suite, Service Worker auth bypass, and storage-hardened session resilience",
  },
  {
    id: "3.3.7v",
    version: "3.3.7v",
    git_commit_tag: "3.3.7v",
    created_at: "2026-09-20T12:20:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.7v - Implement persistent Remember Me login credentials, upgrade PWA notifications to Service Worker registration with Windows Action Center persistence, and add background notificationclick window focus handler",
  },
  {
    id: "3.3.6v",
    version: "3.3.6v",
    git_commit_tag: "3.3.6v",
    created_at: "2026-09-20T12:00:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.6v - Align Inverter status with category-adaptive switch (isCompressorInverterCategory), remove redundant bolt emojis across UI in favor of SVG icons, implement SemVer sorting for changelogs, and replace dynamic dates with fixed timestamps",
  },
  {
    id: "3.3.5v",
    version: "3.3.5v",
    git_commit_tag: "3.3.5v",
    created_at: "2026-09-12T14:14:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.5v - System-wide UI layout responsiveness & fluidity overhaul, complete dark & light mode color harmony, theme-adaptive modal papers, tooltips, dialogs, and filters",
  },
  {
    id: "3.3.4v",
    version: "3.3.4v",
    git_commit_tag: "3.3.4v",
    created_at: "2026-09-12T13:39:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.4v - Add appliance Blacklist toggle to exclude inactive or decommissioned devices from Smart Calendar, Forecasting calculations, and Dashboard energy metrics.",
  },
  {
    id: "3.3.3v",
    version: "3.3.3v",
    git_commit_tag: "3.3.3v",
    created_at: "2026-09-11T19:25:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.3v - Security hardening: remove client Gemini key config modal, revert Vite envPrefix, purge browser storage, and keep API keys 100% server-side.",
  },
  {
    id: "3.3.2v",
    version: "3.3.2v",
    git_commit_tag: "3.3.2v",
    created_at: "2026-09-10T12:00:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.2v - Add Inverter technology switch, live cruising telemetry, and custom running wattage override to ApplianceRoutineModal for DOE PELP additions.",
  },
  {
    id: "3.3.1v",
    version: "3.3.1v",
    git_commit_tag: "3.3.1v",
    created_at: "2026-09-09T14:30:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.1v - Centralize Gemini AI multi-key rotation and automated failover pool; replace Scan Mode with streamlined categories, dynamic inverter switch, and cruising telemetry; extract cruising draw via gemini-2.5-flash; add English scanning advisory notice banner; and integrate inverter telemetry into DOE PELP catalog.",
  },
  {
    id: "3.3.0v",
    version: "3.3.0v",
    git_commit_tag: "3.3.0v",
    created_at: "2026-09-08T10:00:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.3.0v - Introduce dedicated Computers & Laptops category with modular PC Hardware Spec Builder (CPU, GPU, baseline, and monitor load states), curated local JSON hardware catalog, Gemini AI fallback, and decluttered streamlined categories.",
  },
  {
    id: "3.2.6v",
    version: "3.2.6v",
    git_commit_tag: "3.2.6v",
    created_at: "2026-09-07T16:00:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.2.6v - Fix Supabase is_inverter schema cache issue: self-healing DataProvider with automatic unmigrated column recovery and migration of inverter telemetry into JSONB ai_metadata.",
  },
  {
    id: "3.2.5v",
    version: "3.2.5v",
    git_commit_tag: "3.2.5v",
    created_at: "2026-09-07T12:00:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.2.5v - Fix appliance creation modal by adding sticky action footer, enabling scrollable DialogContent with dividers, adding instant name validation feedback, and ensuring schema-safe payload handling.",
  },
  {
    id: "3.2.4v",
    version: "3.2.4v",
    git_commit_tag: "3.2.4v",
    created_at: "2026-09-07T08:00:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.2.4v - Implement Manual Cruising Wattage Input, 1/3 Duty-Cycle Calibrated Refrigeration Engine, Category-Adaptive Inverter Logic, and 7 Streamlined Everyday Appliance Categories.",
  },
  {
    id: "3.2.2v",
    version: "3.2.2v",
    git_commit_tag: "3.2.2v",
    created_at: "2026-09-06T15:00:00.000Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.2.2v - Redesign Mobile 'More' navigation drawer with right-side slide-in (anchor=right), remove redundant tabs present on mobile dock, and integrate user profile with logout, settings, live grid load telemetry, Meralco generation rate, and direct version changelogs access.",
  },
  {
    id: "3.2.1v",
    version: "3.2.1v",
    git_commit_tag: "3.2.1v",
    created_at: "2026-09-06T12:00:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.2.1v - Upgrade PWA App Manifest & Desktop Shell Branding: Generate native 1:1 square high-DPI icons (192x192, 512x512, and 512x512 maskable safe-zone) centered from official PowerForecast vector emblem to replace generic browser fallback on Windows Desktop, Taskbar, and Mobile PWA installations.",
  },
  {
    id: "3.2.0v",
    version: "3.2.0v",
    git_commit_tag: "3.2.0v",
    created_at: "2026-09-01T12:59:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.2.0v - Implement Smart Inverter Energy Engine & Dynamic Duty Cycle Calculation: Realistic compressor time-decay modeling (1st hr pull-down vs cruising mode @ ~42%), 24/7 continuous linear refrigeration factor, universal interactive fallback toggles across Manual, AI Vision Scanner, and DOE PELP modals with educational telemetry callouts.",
  },
  {
    id: "3.1.1v",
    version: "3.1.1v",
    git_commit_tag: "3.1.1v",
    created_at: "2026-09-01T07:49:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.1.1v - Refactor Feedback & Direct Support Modal into Developer Bento Hub featuring custom avatars with aspect-ratio preservation, exact member titles, AJ Umali quote banner, and direct Facebook Messenger PM channels for AJ Umali, Dave Villegas, and Mehojeriel Lacerna.",
  },
  {
    id: "3.1.0v",
    version: "3.1.0v",
    git_commit_tag: "3.1.0v",
    created_at: "2026-09-01T07:25:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.1.0v - Implement PWA automatic background update detection, Service Worker lifecycle synchronization, and interactive 'What's New & Restart to Update' popup modal with embedded live changelog notes and 1-click cache activation.",
  },
  {
    id: "3.0.4v",
    version: "3.0.4v",
    git_commit_tag: "3.0.4v",
    created_at: "2026-08-31T23:48:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.0.4v - Integrate Developer Direct PM channel (AJ Umali Facebook PM) and universal interactive Feedback & Support Modal across Header action bar, User profile menu, Sidebar navigation drawer, Settings view, and Landing page footer.",
  },
  {
    id: "3.0.3v",
    version: "3.0.3v",
    git_commit_tag: "3.0.3v",
    created_at: "2026-08-31T23:31:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.0.3v - Implement 4-Tier Smart Notification Level System (Relaxed, Standard, Proactive, Strict) with Web Audio API synthesized alert chimes, Android mobile haptic vibrations, real-time load surge spike warnings, and multi-tier budget pacing alerts.",
  },
  {
    id: "3.0.2v",
    version: "3.0.2v",
    git_commit_tag: "3.0.2v",
    created_at: "2026-08-31T22:47:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.0.2v - Implement inline expandable dropdown studio for appliances in Date Analytics modal on mobile viewports: selecting an appliance expands settings, quota telemetry, stopwatch sessions, and runtime controls directly underneath its card.",
  },
  {
    id: "3.0.1v",
    version: "3.0.1v",
    git_commit_tag: "3.0.1v",
    created_at: "2026-08-31T22:37:00Z",
    deployed_by: "Antigravity Pair Programmer",
    source: "github",
    description:
      "3.0.1v - Fix mobile bottom navigation label 2-line word wrapping collisions, Smart Calendar day cell price text truncation on small mobile screens, Space Switcher Bento pill bar padding and border clipping, and expand mobile layout scroll bottom clearance.",
  },
  {
    id: "3.0.0v",
    version: "3.0.0v",
    description: "3.0.0v - PowerForecast Mobile & PWA Generation: Implement Web App Manifest, Service Worker offline caching, fluid glassmorphic mobile bottom navigation dock, Android native camera capture for AI scanner, 100dvh dynamic viewport, and persistent state lifecycle reconciliation",
    git_commit_tag: "3.0.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-31T20:00:00.000Z",
    source: "github",
  },
  {
    id: "2.13.16v",
    version: "2.13.16v",
    description: "2.13.16v - Fix hover flickering logic on Meralco rate popover by bypassing modal backdrop interception and adding debounced mouse transition",
    git_commit_tag: "2.13.16v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-31T14:10:00.000Z",
    source: "github",
  },
  {
    id: "2.13.15v",
    version: "2.13.15v",
    description: "2.13.15v - Implement Meralco Generation Rate interactive hover breakdown popover and click-to-refetch mechanism in header",
    git_commit_tag: "2.13.15v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T13:55:00.000Z",
    source: "github",
  },
  {
    id: "2.13.14v",
    version: "2.13.14v",
    description: "2.13.14v - Reorder Settings layout to place Account Security & Credentials directly above the Danger Zone section",
    git_commit_tag: "2.13.14v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T13:45:00.000Z",
    source: "github",
  },
  {
    id: "2.13.13v",
    version: "2.13.13v",
    description: "2.13.13v - Fix Light Mode color contrasts across User Profile Menu, Sign Out dialog, GitHub Changelogs modal, and Version Badge status cards",
    git_commit_tag: "2.13.13v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T13:40:00.000Z",
    source: "github",
  },
  {
    id: "2.13.12v",
    version: "2.13.12v",
    description: "2.13.12v - Remove sidebar on Settings page for dedicated full-width view and add Account Security settings for password and security challenge updates",
    git_commit_tag: "2.13.12v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T13:30:00.000Z",
    source: "github",
  },
  {
    id: "2.13.11v",
    version: "2.13.11v",
    description: "2.13.11v - Fix auth validation, duplicate email detection, and direct security question password reset via Supabase RPC",
    git_commit_tag: "2.13.11v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T13:20:00.000Z",
    source: "github",
  },
  {
    id: "2.13.10v",
    version: "2.13.10v",
    description: "2.13.10v - Consolidate Manual Entry, DOE PELP Catalog, and AI Vision Scan into unified [+ Add Appliance] button with multi-tab popup window",
    git_commit_tag: "2.13.10v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T12:45:00.000Z",
    source: "github",
  },
  {
    id: "2.13.9v",
    version: "2.13.9v",
    description: "2.13.9v - Enhance AI vision scanner prompt with Philippine DOE yellow label standards, unit disambiguation, inverter detection, and schema parity",
    git_commit_tag: "2.13.9v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T12:35:00.000Z",
    source: "github",
  },
  {
    id: "2.13.8v",
    version: "2.13.8v",
    description: "2.13.8v - Revamp ApplianceRoutineModal for Light Mode with theme-adaptive dialog surfaces, white cards, high-contrast calendar grid, and emerald highlights",
    git_commit_tag: "2.13.8v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-30T12:00:00.000Z",
    source: "github",
  },
  {
    id: "2.13.1v",
    version: "2.13.1v",
    description: "2.13.1v - Overnight stopwatch 11:59 PM auto-save rollover, live multi-day timeline previews, and Option 1 smart allocation anti-duplication sync",
    git_commit_tag: "2.13.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-28T02:02:33.000Z",
    source: "github",
  },
  {
    id: "2.13.0v",
    version: "2.13.0v",
    description: "2.13.0v - Fix calculator, popover, auth, and component color schemes to match graphite and cyan palette",
    git_commit_tag: "2.13.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-27T03:03:51.000Z",
    source: "github",
  },
  {
    id: "2.12.2v",
    version: "2.12.2v",
    description: "2.12.2v - Bento corner radius harmonization across entire application, complete emoji removal, and theme aesthetics refinement",
    git_commit_tag: "2.12.2v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-27T02:44:46.000Z",
    source: "github",
  },
  {
    id: "2.12.1v",
    version: "2.12.1v",
    description: "2.12.1v - Add live stopwatch start/stop controls inside DateAnalyticsModal for Today with real-time session logging",
    git_commit_tag: "2.12.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T23:09:53.000Z",
    source: "github",
  },
  {
    id: "2.12.0v",
    version: "2.12.0v",
    description: "2.12.0v - Release 2.12.0: Appliance Target Quota system with interactive Mini Calendar historical backfill, contextual calendar telemetry, and comprehensive English & Tagalog guided tours",
    git_commit_tag: "2.12.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T23:02:09.000Z",
    source: "github",
  },
  {
    id: "2.11.1cv",
    version: "2.11.1cv",
    description: "2.11.1cv - Comprehensive system-flow aligned overhaul of guided tours across all 6 pages with pure English and Tagalog support (Taglish removed)",
    git_commit_tag: "2.11.1cv",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T22:59:50.000Z",
    source: "github",
  },
  {
    id: "2.11.1bv",
    version: "2.11.1bv",
    description: "2.11.1bv - Replace from-to date inputs with interactive Mini Calendar Grid date selector locked to current account month",
    git_commit_tag: "2.11.1bv",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T22:51:49.000Z",
    source: "github",
  },
  {
    id: "2.11.1v",
    version: "2.11.1v",
    description: "2.11.1v - Add ApplianceRoutineModal for target quotas & elaborated backfill, graceful 0h save warning, remove Use Routine Defaults toolbar button, and add interactive past timeline tracks with Progressive Routine prompt",
    git_commit_tag: "2.11.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T22:36:29.000Z",
    source: "github",
  },
  {
    id: "2.11.0bv",
    version: "2.11.0bv",
    description: "2.11.0bv - Implement Smart Date-Aware Autofill with Exclude Today toggle, decouple routine target quota from stopwatch runtime, and add date-contextual telemetry modes",
    git_commit_tag: "2.11.0bv",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T21:44:41.000Z",
    source: "github",
  },
  {
    id: "2.11.0v",
    version: "2.11.0v",
    description: "2.11.0v - Release PowerForecast 2.11.0 with refactored 24h activity timeline, enhanced calendar telemetry modal, and live stopwatch tracking",
    git_commit_tag: "2.11.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T21:23:39.000Z",
    source: "github",
  },
  {
    id: "2.10.7v",
    version: "2.10.7v",
    description: "2.10.7v - Refactor 24-hour activity timeline and calendar analytics modal to remove simulated routine slots, optimize live stopwatch telemetry, and streamline session inspections",
    git_commit_tag: "2.10.7v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T21:15:25.000Z",
    source: "github",
  },
  {
    id: "2.10.6v",
    version: "2.10.6v",
    description: "2.10.6v - Remove email verification requirement and redirect on registration to allow immediate post-signup access to dashboard",
    git_commit_tag: "2.10.6v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T17:43:44.000Z",
    source: "github",
  },
  {
    id: "2.10.5v",
    version: "2.10.5v",
    description: "2.10.5v - Fix calendar space filter leakage, resolve DateAnalyticsModal slider lock-in override, and include live running stopwatches in Today cell metrics",
    git_commit_tag: "2.10.5v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T17:14:46.000Z",
    source: "github",
  },
  {
    id: "2.10.4v",
    version: "2.10.4v",
    description: "2.10.4v - Implement registration timestamp guard, global token invalidation on auto-confirm, and database connection telemetry",
    git_commit_tag: "2.10.4v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T17:04:49.000Z",
    source: "github",
  },
  {
    id: "2.10.3v",
    version: "2.10.3v",
    description: "2.10.3v - Add interactive 24h timeline block inspector with edit/delete, auto-log past routines into appliance_usage_logs, and add inline editing to Schedule Queue",
    git_commit_tag: "2.10.3v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T16:23:20.000Z",
    source: "github",
  },
  {
    id: "2.10.2v",
    version: "2.10.2v",
    description: "2.10.2v - Fix 24-hour activity timeline calculation and visual collision bugs: enforce 24.0h daily cap, prevent duplicate manual block accounting, implement non-overlapping idle slot allocation algorithm, and refine timeline in-bar label typography",
    git_commit_tag: "2.10.2v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T15:52:09.000Z",
    source: "github",
  },
  {
    id: "2.10.1v",
    version: "2.10.1v",
    description: "2.10.1v - Resolve 7 calendar & daily usage logic loopholes: fix double-counting on log updates, reconcile orphaned usage on log delete, prevent passive timer drift in stopwatch edit mode, fix 24h load curve modulo collapse, prevent live session overwrite in date analytics, parse routine autofill dates at local midnight, and await bulk async deletes",
    git_commit_tag: "2.10.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T15:23:48.000Z",
    source: "github",
  },
  {
    id: "2.10.0v",
    version: "2.10.0v",
    description: "2.10.0v - Implement user registration email verification flow with cross-tab sync, optimize live power demand memoization, and add comprehensive auth documentation",
    git_commit_tag: "2.10.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-26T14:52:33.000Z",
    source: "github",
  },
  {
    id: "2.9.1v",
    version: "2.9.1v",
    description: "2.9.1v - Full UI Tagalog translation support and remove redundant sidebar settings link",
    git_commit_tag: "2.9.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-25T10:50:41.000Z",
    source: "github",
  },
  {
    id: "2.9.0v",
    version: "2.9.0v",
    description: "2.9.0v - Add dedicated Settings page, Household Sharing with invite links, strict 2-step account deletion, and sign out confirmation",
    git_commit_tag: "2.9.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-25T10:40:00.000Z",
    source: "github",
  },
  {
    id: "2.8.0v",
    version: "2.8.0v",
    description: "2.8.0v - Revamp Forecasting engine to be strictly data-driven based on actual logged telemetry, inventory routine baselines, and ERC unbundled calculations",
    git_commit_tag: "2.8.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-25T09:17:28.000Z",
    source: "github",
  },
  {
    id: "2.7.2v",
    version: "2.7.2v",
    description: "2.7.2v - Implement Master-Detail layout for daily usage log in DateAnalyticsModal",
    git_commit_tag: "2.7.2v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-25T08:49:23.000Z",
    source: "github",
  },
  {
    id: "2.7.1v",
    version: "2.7.1v",
    description: "2.7.1v - Refine multi-month trend to baseline predictions, remove weather multipliers and fake past months",
    git_commit_tag: "2.7.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-25T08:27:37.000Z",
    source: "github",
  },
  {
    id: "2.7.0v",
    version: "2.7.0v",
    description: "2.7.0v - Update version to 2.7.0v across system constants and package manifests",
    git_commit_tag: "2.7.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-25T08:19:03.000Z",
    source: "github",
  },
  {
    id: "2.6.2v",
    version: "2.6.2v",
    description: "2.6.2v - Remove hardcoded values and nonsenses on Analytics tab, add multi-space support, dynamic seasonal forecasting, and DOE PELP audit",
    git_commit_tag: "2.6.2v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-25T08:14:11.000Z",
    source: "github",
  },
  {
    id: "2.6.1cv",
    version: "2.6.1cv",
    description: "2.6.1cv - Align landing page copy with actual system capabilities, add mobile navigation drawer, and refine scrollspy boundary calculations",
    git_commit_tag: "2.6.1cv",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-24T14:02:52.000Z",
    source: "github",
  },
  {
    id: "2.6.1bv",
    version: "2.6.1bv",
    description: "2.6.1bv - Reorder landing page navigation headers to Estimator first and Platform Showcase second ([Estimator, Platform Showcase, Core Modules, Tariff Tiers, FAQ]) and update scrollspy initial state",
    git_commit_tag: "2.6.1bv",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-24T13:39:31.000Z",
    source: "github",
  },
  {
    id: "2.6.1v",
    version: "2.6.1v",
    description: "2.6.1v - Fix landing page header navigation logic with smooth scroll offsets and active scrollspy, reorder headers to Platform Showcase, Estimator, Core Modules, Tariff Tiers, FAQ, and remove API Docs link",
    git_commit_tag: "2.6.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-24T13:30:48.000Z",
    source: "github",
  },
  {
    id: "2.6.0v",
    version: "2.6.0v",
    description: "2.6.0v - Release major version 2.6.0 with interactive multi-language guided tour and onboarding system across Dashboard to Forecasting",
    git_commit_tag: "2.6.0v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-24T12:53:02.000Z",
    source: "github",
  },
  {
    id: "2.5.1v",
    version: "2.5.1v",
    description: "2.5.1v - Add interactive guided tour and spotlight walkthrough system across Dashboard to Forecasting with English, Tagalog, and Taglish language support",
    git_commit_tag: "2.5.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-24T12:46:16.000Z",
    source: "github",
  },
  {
    id: "2.1.5v",
    version: "2.1.5v",
    description: "2.1.5v - Fix missing useNavigate hook in LandingPage to resolve Vercel build failure",
    git_commit_tag: "2.1.5v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-22T14:46:29.000Z",
    source: "github",
  },
  {
    id: "2.1.4v",
    version: "2.1.4v",
    description: "2.1.4v - Fix TS2304 build error by removing unused useLogin and useNavigate references in LandingPage",
    git_commit_tag: "2.1.4v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-22T14:41:30.000Z",
    source: "github",
  },
  {
    id: "2.1.3v",
    version: "2.1.3v",
    description: "2.1.3v - Enforce strict Supabase authentication validation, eliminate login bypasses, and add Authenticated route guards",
    git_commit_tag: "2.1.3v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-22T14:36:55.000Z",
    source: "github",
  },
  {
    id: "2.1.2v",
    version: "2.1.2v",
    description: "2.1.2v - Fix blank screen on Vercel by migrating vercel.json routes to rewrites and setting Vite base path to /",
    git_commit_tag: "2.1.2v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-22T14:25:57.000Z",
    source: "github",
  },
  {
    id: "2.1.1v",
    version: "2.1.1v",
    description: "2.1.1v - Integrate energy calculation & accuracy solutions document, live tracking optimizations, and push to PowerForecast-2v repository",
    git_commit_tag: "2.1.1v",
    deployed_by: "hAizen-Nibba",
    created_at: "2026-08-22T14:20:22.000Z",
    source: "github",
  },
];

const GITHUB_REPO_URL = "https://github.com/hAizen-Nibba/PowerForecast-2v";

function parseVersion(v: string): [number, number, number, string] {
  const clean = v.replace(/^v/i, "").replace(/v$/i, "");
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return [0, 0, 0, clean];
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] || ""];
}

function compareVersions(vA: string, vB: string): number {
  const [majA, minA, patchA, sufA] = parseVersion(vA);
  const [majB, minB, patchB, sufB] = parseVersion(vB);
  if (majA !== majB) return majB - majA;
  if (minA !== minB) return minB - minA;
  if (patchA !== patchB) return patchB - patchA;
  return sufB.localeCompare(sufA);
}

interface SystemChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemChangelogModal: React.FC<SystemChangelogModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [changelogs, setChangelogs] = useState<SystemChangelogEntry[]>(COMPLETE_GITHUB_DEPLOYMENTS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchChangelogs = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from Supabase system_changelogs
      const { data: dbLogs } = await supabaseClient
        .from("system_changelogs")
        .select("*")
        .order("created_at", { ascending: false });

      // 2. Fetch live commits from GitHub API
      let gitLogs: SystemChangelogEntry[] = [];
      try {
        const ghRes = await fetch("https://api.github.com/repos/hAizen-Nibba/PowerForecast-2v/commits?per_page=60", {
          headers: { Accept: "application/vnd.github.v3+json" },
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (Array.isArray(ghData)) {
            gitLogs = ghData
              .filter((c: any) => c.commit && c.commit.message)
              .map((c: any) => {
                const fullMsg = c.commit.message || "";
                const firstLine = fullMsg.split("\n")[0];
                const match = firstLine.match(/^([0-9]+\.[0-9]+\.[0-9a-zA-Z\-_]+v?)\s*[-:]?\s*(.*)$/);
                const version = match ? match[1] : firstLine.slice(0, 15);
                return {
                  id: c.sha,
                  version: version.startsWith("2.") || version.startsWith("3.") ? version : `commit-${c.sha.slice(0, 7)}`,
                  description: fullMsg,
                  git_commit_tag: match ? match[1] : c.sha.slice(0, 7),
                  deployed_by: c.commit.author?.name || c.author?.login || "GitHub Committer",
                  created_at: c.commit.author?.date || c.commit.committer?.date,
                  source: "github" as const,
                };
              })
              .filter((entry) => entry.version.startsWith("2.") || entry.version.startsWith("3."));
          }
        }
      } catch {
        // GitHub API network error or rate limit, continue with DB/manifest
      }

      // 3. Merge: Live GitHub Commits + Database Records + Master Deployment Manifest
      const mergedMap = new Map<string, SystemChangelogEntry>();

      // Base manifest first
      COMPLETE_GITHUB_DEPLOYMENTS.forEach((item) => {
        mergedMap.set(item.version, item);
      });

      // DB logs override / augment
      if (dbLogs && Array.isArray(dbLogs)) {
        dbLogs.forEach((item: any) => {
          if (!mergedMap.has(item.version)) {
            mergedMap.set(item.version, { ...item, source: "database" });
          } else {
            const existing = mergedMap.get(item.version)!;
            mergedMap.set(item.version, {
              ...existing,
              ...item,
              source: "database",
            });
          }
        });
      }

      // Git API live logs override / augment
      gitLogs.forEach((item) => {
        if (!mergedMap.has(item.version)) {
          mergedMap.set(item.version, item);
        }
      });

      // Ensure active APP_VERSION is always in the map
      if (!mergedMap.has(APP_VERSION)) {
        mergedMap.set(APP_VERSION, {
          id: "current-runtime",
          version: APP_VERSION,
          description: `${APP_VERSION} - Active runtime development version with live database and GitHub synchronization`,
          git_commit_tag: APP_VERSION,
          deployed_by: "Antigravity Pair Programmer",
          created_at: "2026-09-20T12:00:00.000Z",
          source: "local",
        });
      }

      const sorted = Array.from(mergedMap.values()).sort((a, b) => {
        const verDiff = compareVersions(a.version, b.version);
        if (verDiff !== 0) return verDiff;
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      setChangelogs(sorted);
    } catch {
      setChangelogs(COMPLETE_GITHUB_DEPLOYMENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChangelogs();
    }
  }, [isOpen]);

  const handleCopyChangelog = (item: SystemChangelogEntry) => {
    const text = `[PowerForecast Release ${item.version}]\nDate: ${item.created_at ? new Date(item.created_at).toLocaleString() : "Recent"}\nAuthor: ${item.deployed_by || "Developer"}\n\n${item.description}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id || item.version);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter options for fast version series navigation
  const filterOptions = [
    { id: "all", label: "All Deployments" },
    { id: "3.3", label: "v3.3.x" },
    { id: "3.2", label: "v3.2.x" },
    { id: "3.1", label: "v3.1.x" },
    { id: "3.0", label: "v3.0.x" },
    { id: "2.13", label: "v2.13.x" },
    { id: "2.12", label: "v2.12.x" },
    { id: "2.11", label: "v2.11.x" },
    { id: "2.10", label: "v2.10.x" },
    { id: "2.9", label: "v2.9.x" },
    { id: "2.8", label: "v2.8.x" },
    { id: "2.7", label: "v2.7.x" },
    { id: "2.6", label: "v2.6.x" },
    { id: "2.5", label: "v2.5.x" },
    { id: "2.1", label: "v2.1.x" },
  ];

  const filteredChangelogs = useMemo(() => {
    return changelogs.filter((entry) => {
      const matchesSearch =
        searchQuery === "" ||
        entry.version.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.deployed_by && entry.deployed_by.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTag =
        selectedTagFilter === "all" ||
        entry.version.toLowerCase().startsWith(selectedTagFilter.toLowerCase());

      return matchesSearch && matchesTag;
    });
  }, [changelogs, searchQuery, selectedTagFilter]);

  const openGitHubTag = (tag?: string) => {
    if (tag && (tag.startsWith("2.") || tag.startsWith("3."))) {
      window.open(`${GITHUB_REPO_URL}/releases/tag/${tag}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: "blur(8px)",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          },
        },
        paper: {
          sx: {
            borderRadius: 2.5,
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#13161c" : "#ffffff"),
            backgroundImage: "none",
            border: "1px solid",
            borderColor: (theme) => (theme.palette.mode === "dark" ? "#262c37" : "#e2e8f0"),
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 24px 64px rgba(0, 0, 0, 0.7)"
                : "0 20px 50px rgba(0, 0, 0, 0.15)",
            color: "text.primary",
            maxHeight: "88vh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: (theme) => (theme.palette.mode === "dark" ? "#242934" : "#e2e8f0"),
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#181c23" : "#f8fafc"),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)"),
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)"),
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DeploymentIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: "text.primary" }}>
                GitHub Deployment & Version Changelogs
              </Typography>
              <Chip
                label={`${APP_VERSION} • Current`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  fontFamily: "monospace",
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.12)"),
                  color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(13, 148, 136, 0.3)"),
                }}
              />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.75rem", display: "block" }}>
              Complete deployment audit trail synchronized with GitHub Releases, Tags, and Supabase DB
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<GitHubIcon sx={{ fontSize: 16 }} />}
            endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
            onClick={() => window.open(GITHUB_REPO_URL, "_blank", "noopener,noreferrer")}
            sx={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "none",
              color: "text.primary",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#2e3542" : "#cbd5e1"),
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#ffffff"),
              "&:hover": {
                borderColor: "primary.main",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "#242a35" : "#f1f5f9"),
              },
            }}
          >
            GitHub Repo
          </Button>
          <IconButton
            size="small"
            onClick={fetchChangelogs}
            disabled={isLoading}
            title="Refresh deployments from GitHub & Database"
            sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
          >
            <RefreshIcon sx={{ fontSize: 18, animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ color: "text.secondary", "&:hover": { color: "text.primary", bgcolor: "action.hover" } }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Search & Filter Toolbar */}
      <Box
        sx={{
          p: 2,
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#15181f" : "#f8fafc"),
          borderBottom: "1px solid",
          borderColor: (theme) => (theme.palette.mode === "dark" ? "#242934" : "#e2e8f0"),
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <TextField
            size="small"
            placeholder="Search deployments by version (e.g. 2.9, 2.7, 2.13), keyword, module, or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery("")}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                sx: {
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#ffffff"),
                  borderRadius: 1.5,
                  fontSize: "0.8125rem",
                  "& fieldset": { borderColor: (theme) => (theme.palette.mode === "dark" ? "#2e3542" : "#cbd5e1") },
                  "&:hover fieldset": { borderColor: "primary.main" },
                  "&.Mui-focused fieldset": { borderColor: "primary.main" },
                },
              },
            }}
          />
        </Box>

        {/* Filter Pills */}
        <Box sx={{ display: "flex", gap: 0.75, overflowX: "auto", pb: 0.25 }}>
          {filterOptions.map((opt) => (
            <Chip
              key={opt.id}
              label={opt.label}
              size="small"
              clickable
              onClick={() => setSelectedTagFilter(opt.id)}
              sx={{
                height: 24,
                fontSize: "0.6875rem",
                fontWeight: 700,
                borderRadius: 1.5,
                bgcolor: selectedTagFilter === opt.id ? "primary.main" : (theme) => (theme.palette.mode === "dark" ? "#1c2028" : "#ffffff"),
                color: selectedTagFilter === opt.id ? "#ffffff" : "text.secondary",
                border: "1px solid",
                borderColor: selectedTagFilter === opt.id ? "primary.main" : (theme) => (theme.palette.mode === "dark" ? "#282e3a" : "#cbd5e1"),
                "&:hover": {
                  bgcolor: selectedTagFilter === opt.id ? "primary.dark" : (theme) => (theme.palette.mode === "dark" ? "#242a35" : "#f1f5f9"),
                  color: selectedTagFilter === opt.id ? "#ffffff" : "text.primary",
                },
              }}
            />
          ))}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem", fontFamily: "monospace" }}>
              Showing {filteredChangelogs.length} of {changelogs.length} deployment(s)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Changelog Feed */}
      <DialogContent
        sx={{
          p: 2.5,
          flex: 1,
          overflowY: "auto",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#13161c" : "#f8fafc"),
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {isLoading && changelogs.length === 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 8, gap: 1.5 }}>
            <CircularProgress size={32} sx={{ color: "primary.main" }} />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Loading deployment audit changelogs from GitHub & Database...
            </Typography>
          </Box>
        ) : filteredChangelogs.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <TerminalIcon sx={{ fontSize: 40, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              No deployments matching "{searchQuery}"
            </Typography>
            <Typography variant="caption">
              Try adjusting your search query or tag filter above.
            </Typography>
          </Box>
        ) : (
          filteredChangelogs.map((item, idx) => {
            const isLatest = idx === 0;
            const isCurrentRuntime = item.version === APP_VERSION;
            const isCopied = copiedId === (item.id || item.version);
            const dateStr = item.created_at
              ? new Date(item.created_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Recent";

            return (
              <Paper
                key={item.id || item.version}
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 1.5,
                  bgcolor: isCurrentRuntime
                    ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.04)" : "rgba(13, 148, 136, 0.05)")
                    : (theme) => (theme.palette.mode === "dark" ? "#181c23" : "#ffffff"),
                  borderColor: isCurrentRuntime
                    ? "primary.main"
                    : (theme) => (theme.palette.mode === "dark" ? "#242a34" : "#e2e8f0"),
                  boxShadow: isCurrentRuntime
                    ? (theme) => (theme.palette.mode === "dark" ? "0 4px 20px rgba(0, 229, 201, 0.08)" : "0 4px 16px rgba(13, 148, 136, 0.08)")
                    : (theme) => (theme.palette.mode === "dark" ? "none" : "0 1px 3px rgba(0,0,0,0.05)"),
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: isCurrentRuntime
                      ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.06)" : "rgba(13, 148, 136, 0.08)")
                      : (theme) => (theme.palette.mode === "dark" ? "#1b1f27" : "#ffffff"),
                  },
                }}
              >
                {/* Release Card Header */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1.25 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      icon={isLatest ? <DotIcon sx={{ fontSize: "10px !important", color: "#10b981 !important" }} /> : undefined}
                      label={item.version}
                      size="small"
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 800,
                        fontSize: "0.75rem",
                        bgcolor: isCurrentRuntime
                          ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.18)" : "rgba(13, 148, 136, 0.12)")
                          : (theme) => (theme.palette.mode === "dark" ? "#202530" : "#f1f5f9"),
                        color: isCurrentRuntime
                          ? (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488")
                          : "text.primary",
                        border: "1px solid",
                        borderColor: isCurrentRuntime
                          ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.45)" : "rgba(13, 148, 136, 0.35)")
                          : (theme) => (theme.palette.mode === "dark" ? "#2e3544" : "#cbd5e1"),
                      }}
                    />
                    {isCurrentRuntime && (
                      <Chip
                        label="ACTIVE UI VERSION"
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          fontWeight: 800,
                          bgcolor: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.72rem" }}>
                      • {dateStr}
                    </Typography>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    {item.deployed_by && (
                      <Chip
                        icon={<VerifiedIcon sx={{ fontSize: "12px !important", color: "#06b6d4 !important" }} />}
                        label={item.deployed_by}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.625rem",
                          fontWeight: 600,
                          bgcolor: "rgba(6, 182, 212, 0.1)",
                          color: (theme) => (theme.palette.mode === "dark" ? "#22d3ee" : "#0891b2"),
                          border: "1px solid rgba(6, 182, 212, 0.2)",
                        }}
                      />
                    )}
                    <Tooltip title={isCopied ? "Copied to clipboard!" : "Copy release details"}>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyChangelog(item)}
                        sx={{
                          p: 0.5,
                          borderRadius: 1.5,
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e232c" : "#f1f5f9"),
                          color: isCopied ? "#10b981" : "text.secondary",
                          border: "1px solid",
                          borderColor: (theme) => (theme.palette.mode === "dark" ? "#29303d" : "#cbd5e1"),
                          "&:hover": { color: "primary.main", bgcolor: (theme) => (theme.palette.mode === "dark" ? "#262c37" : "#e2e8f0") },
                        }}
                      >
                        {isCopied ? <CheckIcon sx={{ fontSize: 14 }} /> : <CopyIcon sx={{ fontSize: 14 }} />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View on GitHub">
                      <IconButton
                        size="small"
                        onClick={() => openGitHubTag(item.git_commit_tag || item.version)}
                        sx={{
                          p: 0.5,
                          borderRadius: 1.5,
                          bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e232c" : "#f1f5f9"),
                          color: "text.secondary",
                          border: "1px solid",
                          borderColor: (theme) => (theme.palette.mode === "dark" ? "#29303d" : "#cbd5e1"),
                          "&:hover": { color: "primary.main", bgcolor: (theme) => (theme.palette.mode === "dark" ? "#262c37" : "#e2e8f0") },
                        }}
                      >
                        <GitHubIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Description Body */}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.8125rem",
                    lineHeight: 1.6,
                    color: "text.primary",
                    fontFamily: "inherit",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {item.description}
                </Typography>
              </Paper>
            );
          })
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SystemChangelogModal;
