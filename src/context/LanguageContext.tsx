import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "tl";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Sidebar
    "nav.dashboard": "Dashboard",
    "nav.calculator": "Bill Calculator",
    "nav.appliances": "Appliance Hub",
    "nav.calendar": "Smart Calendar",
    "nav.analytics": "Analytics",
    "nav.forecasting": "Forecasting",
    "nav.docs": "API Docs",
    "nav.settings": "Settings",
    "nav.circuitsOnline": "Circuits Online",
    "nav.liveLoad": "Live Load",
    "nav.mobile.dashboard": "Dashboard",
    "nav.mobile.calculator": "Calculator",
    "nav.mobile.appliances": "Appliances",
    "nav.mobile.calendar": "Calendar",
    "nav.mobile.analytics": "Analytics",
    "nav.mobile.more": "More",

    // Header
    "header.dbLive": "Supabase Live",
    "header.localMode": "Local Mode",
    "header.rateBadge": "Meralco Tariff",
    "header.settings": "Settings",
    "header.signOut": "Sign Out",
    "header.ownerBadge": "Household Owner",
    "header.memberBadge": "Family Member",
    "header.confirmSignOut": "Confirm Sign Out",
    "header.signOutPrompt": "Are you sure you want to sign out and end your active session on PowerForecast?",
    "header.cancel": "Cancel",

    // Dashboard
    "dash.gridTelemetry": "Active Grid Telemetry",
    "dash.title": "Energy & Tariff Dashboard",
    "dash.subtitle": "Real-time household & business telemetry, Meralco unbundled tariff projections, DOE PELP certified inventory, and sub-metering cost split.",
    "dash.addAppliance": "Add Appliance",
    "dash.pelpCatalog": "PELP Catalog",
    "dash.aiScanner": "AI Scanner",
    "dash.currentDraw": "CURRENT DRAW LOAD",
    "dash.runningRate": "running rate",
    "dash.consolidatedBill": "Consolidated Monthly Bill",
    "dash.monthlyVolume": "Monthly Energy Volume",
    "dash.activeAppliances": "Active Appliances",
    "dash.dailyAvg": "Daily Avg Energy",
    "dash.combinedAcross": "Combined across",
    "dash.spaces": "Spaces",
    "dash.totalRegistered": "Total registered inventory",
    "dash.projectedPacing": "Projected billing cycle pacing",

    // Settings
    "settings.title": "Account & Household Settings",
    "settings.subtitle": "Manage your language preferences, invite family members with tailored roles, and manage your account security.",
    "settings.langTitle": "Language & Localization (Wika)",
    "settings.langSubtitle": "Choose your preferred interface and notification language.",
    "settings.householdTitle": "Household Sharing & Multi-User Access",
    "settings.householdSubtitle": "Invite family members to simulate usage schedules and log daily consumption while keeping master billing locked",
    "settings.inviteMember": "Invite Family Member",
    "settings.member": "MEMBER",
    "settings.email": "EMAIL",
    "settings.role": "ROLE & PERMISSIONS",
    "settings.status": "STATUS",
    "settings.actions": "ACTIONS",
    "settings.active": "Active",
    "settings.pending": "Pending",
    "settings.primaryAdmin": "Primary Admin",
    "settings.remove": "Remove",
    "settings.permMatrix": "HOUSEHOLD PERMISSION MATRIX",
    "settings.ownerDesc": "Complete access to ALL features: inventory, billing rates, spaces, AI Scanner, CSV exports, invite members, and account settings.",
    "settings.memberDesc": "Can simulate appliance usage, log daily hours on Smart Calendar, and view load curves. Restricted from master rate changes and account deletion.",
    "settings.dangerTitle": "Danger Zone: Account Deletion",
    "settings.dangerSubtitle": "Permanently erase your account, registered appliances, daily calendar logs, usage simulation history, and analytics records. This action is irreversible.",
    "settings.deleteAccount": "Delete My Account",
    "settings.inviteModalTitle": "Invite Household Family Member",
    "settings.inviteModalDesc": "Enter the name and email address of the family member you want to add. They will receive permission to simulate appliance schedules and log daily hours.",
    "settings.fullName": "Full Name",
    "settings.emailAddr": "Email Address",
    "settings.generateInvite": "Generate Invitation",
    "settings.inviteCodeLabel": "HOUSEHOLD INVITE CODE:",
    "settings.copyLink": "Copy Link",
    "settings.linkCopied": "Copied",
    "settings.sharePrompt": "Share this link on Messenger or Viber. When they register, they will automatically be joined to your household.",
    "settings.done": "Done",
    "settings.deleteModalTitle": "Confirm Permanent Account Deletion",
    "settings.deleteWarning": "This action is permanent and cannot be undone. All your appliances, daily logs, simulation records, and analytics telemetry will be deleted.",
    "settings.step1Password": "STEP 1: ENTER YOUR ACCOUNT PASSWORD",
    "settings.step2Confirm": "STEP 2: TYPE Confirm TO AUTHORIZE DELETION",
    "settings.deleteExecuting": "Deleting Account...",
    "settings.deletePerm": "Permanently Delete My Account",

    // Forecasting
    "fc.title": "Predictive Energy Forecasting",
    "fc.subtitle": "Data-driven Meralco bill projections based on actual logged days and your registered appliance routines.",
    "fc.activeCycle": "Active Billing Cycle",
    "fc.mtdLogged": "MONTH-TO-DATE LOGGED (ACTUAL)",
    "fc.projectedMonthEnd": "PROJECTED MONTH-END BILL",
    "fc.confidenceScore": "CONFIDENCE SCORE",
    "fc.dailyBurn": "Est. Daily Burn",
    "fc.daysRemaining": "Days Remaining",
    "fc.tierBreakdown": "Lifeline & Stepped Tier Breakdown",
    "fc.lifelineEligible": "Lifeline Subsidy Eligible (<= 100 kWh)",
    "fc.standardTier": "Standard Residential Tier (> 100 kWh)",
    "fc.aiInsights": "AI Energy Optimization Advice",
    "fc.exportForecast": "Export Forecast PDF",
    "fc.dailyBurnRate": "DAILY BURN RATE & PACING",
    "fc.genVolatilityTitle": "Generation Rate Volatility Simulator",
    "fc.scenariosTitle": "Data-Driven Forecast Scenarios & Stress Tests",
    "fc.scenarioTrajectory": "CURRENT TRAJECTORY",
    "fc.scenarioBaseline": "ROUTINE BASELINE",
    "fc.scenarioSmart": "SMART ENERGY AUDIT",
    "fc.scenarioStress": "HEAVY LOAD STRESS",
    "fc.whatIfTitle": "Interactive \"What-If\" Appliance Studio",
    "fc.whatIfSubtitle": "Adjust operating hours on individual appliances to simulate instant month-end bill impacts",
    "fc.resetDefaults": "Reset Defaults",
    "fc.paretoTitle": "Appliance Monthly Energy Share (Pareto Breakdown)",
    "fc.paretoSubtitle": "Ranked breakdown of which registered devices contribute the highest share of your monthly power consumption.",

    // PWA & Updates
    "pwa.updateTitle": "New PowerForecast Update Available",
    "pwa.updateSubtitle": "A new release is ready with performance improvements, bug fixes, and latest features.",
    "pwa.changelogTitle": "Log of Changes & Release Notes",
    "pwa.restartButton": "Restart & Update Now",
    "pwa.updatingButton": "Updating App...",
    "pwa.laterButton": "Later",
    "pwa.readyBadge": "Ready to install",

    // What's New Release Popup
    "whatsNew.title": "What's New in PowerForecast",
    "whatsNew.highlightsHeader": "Key Updates & Features Created",
    "whatsNew.loading": "Loading release highlights...",
    "whatsNew.viewFullLogs": "View All Changelogs",
    "whatsNew.gotItButton": "Awesome, Got It!",

    // Common
    "common.save": "Save",
    "common.close": "Close",
    "common.back": "Back",
    "common.loading": "Loading...",

    // System Testing Phase Banner
    "banner.lead": "Active Testing Phase:",
    "banner.message": "Expect occasional delays or Vercel serverless timeouts due to heavy concurrent user traffic.",
    "banner.learnMore": "Learn more",
    "banner.modalTitle": "System Testing & Server Load Advisory",
    "banner.modalSubtitle": "Information regarding active user testing, Vercel serverless load, and reliability tips.",
    "banner.gotIt": "Got it",
  },
  tl: {
    // Navigation & Sidebar
    "nav.dashboard": "Dashboard",
    "nav.calculator": "Kalkulador ng Kuryente",
    "nav.appliances": "Sentro ng Kagamitan",
    "nav.calendar": "Matalinong Kalendaryo",
    "nav.analytics": "Pagsusuri ng Konsumo",
    "nav.forecasting": "Pagtataya ng Bill",
    "nav.docs": "Dokumentasyon ng API",
    "nav.settings": "Mga Setting",
    "nav.circuitsOnline": "Aktibong Linya",
    "nav.liveLoad": "Kasalukuyang Gamit",
    "nav.mobile.dashboard": "Dashboard",
    "nav.mobile.calculator": "Kalkulador",
    "nav.mobile.appliances": "Kagamitan",
    "nav.mobile.calendar": "Kalendaryo",
    "nav.mobile.analytics": "Pagsusuri",
    "nav.mobile.more": "Iba pa",

    // Header
    "header.dbLive": "Konektado sa Supabase",
    "header.localMode": "Lokal na Mode",
    "header.rateBadge": "Taripa ng Meralco",
    "header.settings": "Mga Setting",
    "header.signOut": "Mag-sign Out",
    "header.ownerBadge": "May-ari ng Bahay (Admin)",
    "header.memberBadge": "Miyembro ng Pamilya",
    "header.confirmSignOut": "Kumpirmahin ang Pag-sign Out",
    "header.signOutPrompt": "Sigurado ka bang nais mong mag-sign out at tapusin ang iyong aktibong session sa PowerForecast?",
    "header.cancel": "Kanselahin",

    // Dashboard
    "dash.gridTelemetry": "Aktibong Telemetriya ng Grid",
    "dash.title": "Dashboard ng Enerhiya at Taripa",
    "dash.subtitle": "Real-time na konsumo sa bahay at negosyo, unbundled na forecast sa Meralco, PELP certified na kagamitan, at sub-metering cost split.",
    "dash.addAppliance": "Magdagdag ng Kagamitan",
    "dash.pelpCatalog": "Katalogo ng PELP",
    "dash.aiScanner": "AI Scanner",
    "dash.currentDraw": "KASALUKUYANG GINAGAMIT NA KURYENTE",
    "dash.runningRate": "singil kada oras",
    "dash.consolidatedBill": "Kabuuang Buwanang Bill",
    "dash.monthlyVolume": "Buwanang Dami ng Enerhiya",
    "dash.activeAppliances": "Mga Aktibong Kagamitan",
    "dash.dailyAvg": "Araw-araw na Karaniwang Konsumo",
    "dash.combinedAcross": "Pinagsama sa",
    "dash.spaces": "Espasyo / Bahay",
    "dash.totalRegistered": "Kabuuang rehistradong kagamitan",
    "dash.projectedPacing": "Inaasahang bilis ng konsumo sa billing cycle",

    // Settings
    "settings.title": "Mga Setting ng Account at Kasambahay",
    "settings.subtitle": "Pamahalaan ang iyong wika, mag-imbita ng mga kapamilya na may angkop na access, at pamahalaan ang seguridad ng account.",
    "settings.langTitle": "Wika at Lokalisasyon (Language)",
    "settings.langSubtitle": "Piliin ang nais mong wika para sa interface at mga abiso.",
    "settings.householdTitle": "Pagbabahagi sa Kasambahay at Pamilya",
    "settings.householdSubtitle": "Mag-imbita ng mga kapamilya para makapag-simulate ng iskedyul at mag-log ng oras habang ligtas ang master billing",
    "settings.inviteMember": "Mag-imbita ng Kapamilya",
    "settings.member": "MIYEMBRO",
    "settings.email": "EMAIL",
    "settings.role": "TUNGKULIN AT PAHINTULOT",
    "settings.status": "KATAYUAN",
    "settings.actions": "MGA AKSYON",
    "settings.active": "Aktibo",
    "settings.pending": "Nakabinbin",
    "settings.primaryAdmin": "Pangunahing Admin",
    "settings.remove": "Tanggalin",
    "settings.permMatrix": "MATRIX NG MGA PAHINTULOT SA BAHAY",
    "settings.ownerDesc": "Buong access sa LAHAT ng features: kagamitan, taripa ng kuryente, espasyo, AI Scanner, CSV exports, pag-imbita, at pagbura ng account.",
    "settings.memberDesc": "Maaaring mag-simulate ng kagamitan, mag-log ng daily hours sa Kalendaryo, at tumingin ng graph. Naka-lock ang pagbabago ng rate at pagbura ng account.",
    "settings.dangerTitle": "Delikadong Bahagi: Pagbura ng Account",
    "settings.dangerSubtitle": "Permanenteng buburahin ang iyong account, rehistradong kagamitan, tala sa kalendaryo, talaan ng simulation, at datos sa pagsusuri. Hindi na ito maibabalik.",
    "settings.deleteAccount": "Burahin ang Aking Account",
    "settings.inviteModalTitle": "Mag-imbita ng Miyembro ng Pamilya",
    "settings.inviteModalDesc": "Ilagay ang pangalan at email address ng kapamilya na nais mong idagdag. Mabibigyan sila ng access na mag-log ng kagamitan at mag-simulate ng konsumo.",
    "settings.fullName": "Buong Pangalan",
    "settings.emailAddr": "Email Address",
    "settings.generateInvite": "Gumawa ng Imbitasyon",
    "settings.inviteCodeLabel": "HOUSEHOLD INVITE CODE:",
    "settings.copyLink": "Kopyahin ang Link",
    "settings.linkCopied": "Nakopya Na",
    "settings.sharePrompt": "I-share ang link na ito sa Messenger o Viber. Kapag nag-rehistro sila, awtomatiko silang mapapasama sa iyong household.",
    "settings.done": "Tapos Na",
    "settings.deleteModalTitle": "Kumpirmahin ang Permanenteng Pagbura ng Account",
    "settings.deleteWarning": "Ang aksyong ito ay permanente at hindi na mababawi. Lahat ng kagamitan, araw-araw na logs, datos ng simulation, at telemetriya ay mabubura.",
    "settings.step1Password": "HAKBANG 1: ILAGAY ANG IYONG PASSWORD",
    "settings.step2Confirm": "HAKBANG 2: I-TYPE ANG Confirm PARA PAHINTULUTAN ANG PAGBURA",
    "settings.deleteExecuting": "Binubura ang Account...",
    "settings.deletePerm": "Permanenteng Burahin ang Aking Account",

    // Forecasting
    "fc.title": "Panghuhula ng Konsumo at Bill sa Kuryente",
    "fc.subtitle": "Pagtataya ng Meralco bill batay sa totoong naitalang araw at karaniwang gawi ng iyong kagamitan.",
    "fc.activeCycle": "Aktibong Billing Cycle",
    "fc.mtdLogged": "NAITALA SA BUWAN HANGGANG NGAYON",
    "fc.projectedMonthEnd": "INAASAHANG BILL SA KATAPUSAN NG BUWAN",
    "fc.dailyBurnRate": "ARAW-ARAW NA BILIS NG KONSUMO",
    "fc.genVolatilityTitle": "Simulator ng Pagbabago sa Singil sa Henerasyon",
    "fc.scenariosTitle": "Mga Senaryo at Pagsusuri Batay sa Datos",
    "fc.scenarioTrajectory": "KASALUKUYANG TAKBO",
    "fc.scenarioBaseline": "KARANIWANG TAKBO",
    "fc.scenarioSmart": "MATALINONG PAGTITIPID",
    "fc.scenarioStress": "MABIGAT NA PAGGAMIT",
    "fc.whatIfTitle": "Interaktibong \"Paano Kung\" Studio ng Kagamitan",
    "fc.whatIfSubtitle": "Baguhin ang oras ng paggamit sa bawat kagamitan upang makita agad ang epekto sa buwanang bill",
    "fc.resetDefaults": "Ibalik sa Orihinal",
    "fc.paretoTitle": "Bahagi ng Kagamitan sa Konsumo (Pareto Breakdown)",
    "fc.paretoSubtitle": "Ranggo ng mga rehistradong kagamitan na may pinakamalaking ambag sa buwanang konsumo ng kuryente.",

    // PWA & Updates
    "pwa.updateTitle": "May Bagong Update ang PowerForecast",
    "pwa.updateSubtitle": "Handa na ang bagong bersyon na may kasamang mga pagpapahusay, pag-aayos ng bug, at pinakabagong mga tampok.",
    "pwa.changelogTitle": "Talaan ng mga Pagbabago at Release Notes",
    "pwa.restartButton": "I-restart at I-update Ngayon",
    "pwa.updatingButton": "Ina-update ang App...",
    "pwa.laterButton": "Mamaya na",
    "pwa.readyBadge": "Handa nang i-install",

    // What's New Release Popup
    "whatsNew.title": "Mga Bagong Tampok sa PowerForecast",
    "whatsNew.highlightsHeader": "Mga Pangunahing Update at Bagong Tampok",
    "whatsNew.loading": "Kinukuha ang mga detalye ng release...",
    "whatsNew.viewFullLogs": "Tingnan ang Lahat ng Talaan",
    "whatsNew.gotItButton": "Ayos, Naintindihan Ko!",

    // Common
    "common.save": "I-save",
    "common.close": "Isara",
    "common.back": "Bumalik",
    "common.loading": "Naglo-load...",

    // System Testing Phase Banner
    "banner.lead": "Testing Phase Notice:",
    "banner.message": "Maaaring makaranas ng panandaliang pagbagal o timeouts dahil dagsa ang mga gumagamit sa Vercel server.",
    "banner.learnMore": "Alamin pa",
    "banner.modalTitle": "Paunawa Ukol sa Testing Phase at Server Load",
    "banner.modalSubtitle": "Impormasyon patungkol sa dagsang gumagamit, Vercel serverless load, at tips sa paggamit.",
    "banner.gotIt": "Naintindihan ko",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("powerforecast_language");
    return (saved === "tl" || saved === "en" ? saved : "en") as Language;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("powerforecast_language", lang);
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (dict[key]) return dict[key];
    if (TRANSLATIONS.en[key]) return TRANSLATIONS.en[key];
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
