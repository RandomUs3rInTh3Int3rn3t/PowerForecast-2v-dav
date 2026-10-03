import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Calculator,
  Layers,
  Camera,
  Clock,
  ChartColumn,
  Cpu,
  ArrowRight,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  AirVent,
  Refrigerator,
  Tv,
  Lightbulb,
  Moon,
  Sun,
  CircleCheck,
  Activity,
  Zap,
  WandSparkles,
  ScanText,
  BookOpen,
  Gauge,
  Monitor,
  ShowerHead,
  Flame,
  Fan,
  Check,
} from "lucide-react";
import { useColorMode } from "../theme/AppTheme";
import { APP_VERSION } from "../lib/supabaseClient";
import { SystemTestingBanner } from "../components/common/SystemTestingBanner";
import { Button, buttonVariants } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { cn } from "../lib/utils";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  // Quick estimator state
  const [selectedWatts, setSelectedWatts] = useState<number>(1050);
  const [estimatorHours, setEstimatorHours] = useState<number>(8);
  const [estimatorRate, setEstimatorRate] = useState<number>(14.8261);

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // FAQ open state (accordion)
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({ 0: true });

  const toggleFaq = (index: number) => {
    setOpenFaqs((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const applianceOptions = [
    { label: "Inverter Split AC (1.5 HP)", value: 1050, icon: AirVent, desc: "Dual Inverter, CSPF 5.8" },
    { label: "Window Non-Inverter AC (1.0 HP)", value: 950, icon: AirVent, desc: "Fixed Speed, Standard EER" },
    { label: "Two-Door Inverter Refrigerator", value: 120, icon: Refrigerator, desc: "Linear Compressor (24/7)" },
    { label: "55-inch 4K Smart OLED TV", value: 110, icon: Tv, desc: "HDR Gaming & Streaming" },
    { label: "Induction Cooker", value: 1800, icon: Flame, desc: "Rapid High-Power Boil" },
    { label: "Workstation & Gaming PC", value: 550, icon: Monitor, desc: "GPU Rendering Load" },
    { label: "Electric Stand Fan (16-inch)", value: 60, icon: Fan, desc: "Standard Speed 3" },
    { label: "Instant Multipoint Water Heater", value: 3500, icon: ShowerHead, desc: "High Draw Heating" },
  ];

  const estimatorCalc = useMemo(() => {
    const dailyKwh = (selectedWatts * estimatorHours) / 1000;
    const monthlyKwh = dailyKwh * 30;
    const monthlyCost = monthlyKwh * estimatorRate;
    const hourlyCost = (selectedWatts / 1000) * estimatorRate;
    const annualCost = monthlyCost * 12;

    return {
      dailyKwh: dailyKwh.toFixed(2),
      monthlyKwh: monthlyKwh.toFixed(1),
      hourlyCost: hourlyCost.toFixed(2),
      monthlyCost: monthlyCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      annualCost: annualCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  }, [selectedWatts, estimatorHours, estimatorRate]);

  // Active section tracking for header scrollspy
  const [activeSection, setActiveSection] = useState<string>("estimator");

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -72; // Offset for sticky navbar
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const sectionIds = ["estimator", "features", "faq"];
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (scrollY < 250) {
        setActiveSection("estimator");
        return;
      }
      if (window.innerHeight + scrollY >= document.body.scrollHeight - 150) {
        setActiveSection("faq");
        return;
      }

      const scrollPosition = scrollY + 140;
      let current = "";
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            current = id;
          }
        }
      }
      if (current) {
        setActiveSection(current);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { id: "estimator", label: "Estimator" },
    { id: "features", label: "Core Modules" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <div className="pf-landing min-h-screen bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* 1. Header (Reference: multi-tenant-starter-template landing-page-header) */}
      <header className="fixed top-0 z-50 w-full border-b border-border/80 bg-background/80 px-4 backdrop-blur md:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          {/* Left: Mobile trigger + Logo */}
          <div className="flex items-center gap-3 md:gap-8">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Link to="/" className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-90">
              <img src="/Assets/LOGO.png" alt="PowerForecast Logo" className="h-7 w-7 object-contain" />
              <span className="text-base font-bold tracking-tight sm:text-lg">PowerForecast</span>
              <Badge variant="secondary" className="font-mono text-[10px] font-semibold">
                {APP_VERSION}
              </Badge>
            </Link>

            {/* Desktop Navigation items */}
            <nav className="hidden items-center gap-1 md:flex lg:gap-2">
              {navLinks.map((nav) => {
                const isActive = activeSection === nav.id;
                return (
                  <button
                    key={nav.id}
                    onClick={() => scrollToSection(nav.id)}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {nav.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleColorMode}
              aria-label={`Switch to ${isDark ? "Light" : "Dark"} mode`}
              className="text-muted-foreground hover:text-foreground"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Link
              to="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
            >
              Sign In
            </Link>

            <Link to="/signup" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Dropdown Sheet */}
        {mobileOpen && (
          <div className="fixed inset-x-0 top-16 z-50 border-b border-border bg-background p-6 shadow-xl animate-in slide-in-from-top-2 md:hidden">
            <nav className="flex flex-col gap-2">
              {navLinks.map((nav) => {
                const isActive = activeSection === nav.id;
                return (
                  <button
                    key={nav.id}
                    onClick={() => {
                      setMobileOpen(false);
                      setTimeout(() => scrollToSection(nav.id), 120);
                    }}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-left text-sm font-medium transition-colors",
                      isActive ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {nav.label}
                  </button>
                );
              })}
              <Separator className="my-2" />
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className={cn(buttonVariants({ variant: "outline", size: "default" }), "w-full justify-center")}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className={cn(buttonVariants({ variant: "default", size: "default" }), "w-full justify-center")}
                >
                  Get Started
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* 2. System Testing Banner Strip */}
      <div className="pt-16">
        <SystemTestingBanner variant="landing" />
      </div>

      <main className="flex-1">
        {/* 3. Hero Section (Reference: multi-tenant-starter-template components/hero.tsx) */}
        <section className="space-y-8 py-20 md:py-28 lg:py-32">
          <div className="container mx-auto flex max-w-[64rem] flex-col items-center gap-5 px-4 text-center">
            {/* Capsule pill */}
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-foreground" />
              <span>Next-Gen Meralco Energy Intelligence & Appliance Tracking Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Master Your Electricity & Meralco Power Bills
            </h1>

            {/* Subtitle */}
            <p className="max-w-[44rem] text-sm leading-relaxed text-muted-foreground sm:text-lg sm:leading-8">
              High-precision appliance telemetry with <strong className="font-semibold text-foreground">24-hour visual activity tracking</strong>,{" "}
              <strong className="font-semibold text-foreground">smart auto-midnight session splitting</strong>,{" "}
              <strong className="font-semibold text-foreground">routine defaults batch autofill</strong>, official{" "}
              <strong className="font-semibold text-foreground">ERC unbundled tariff formulas</strong>, and{" "}
              <strong className="font-semibold text-foreground">DOE PELP energy efficiency star ratings</strong>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link to="/signup" className={cn(buttonVariants({ variant: "default", size: "lg" }))}>
                <span>Get Started Free</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/calculator" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                <Calculator className="h-4 w-4" />
                <span>Unbundled Calculator</span>
              </Link>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => scrollToSection("features")}
                className="text-muted-foreground hover:text-foreground"
              >
                <Gauge className="h-4 w-4" />
                <span>Core Modules</span>
              </Button>
            </div>

            {/* Quick trust metrics row */}
            <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "100+ DOE PELP Catalog Models", icon: Layers },
                { label: "ERC Unbundled Centavo Precision", icon: Check },
                { label: "24-Hour Visual Activity Timeline", icon: Activity },
                { label: "Smart Overnight Split Engine", icon: Clock },
              ].map((metric, i) => {
                const IconComp = metric.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-xs font-medium text-foreground shadow-xs backdrop-blur-sm"
                  >
                    <IconComp className="h-3.5 w-3.5 text-foreground" />
                    <span>{metric.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Live Estimator Section */}
        <section id="estimator" className="container mx-auto max-w-5xl scroll-mt-24 px-4 pb-20">
          <Card className="border-border shadow-md">
            <CardHeader className="space-y-2 border-b border-border pb-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted">
                    <Zap className="h-4 w-4 text-foreground" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl">
                    Real-Time Appliance Bill & Running Cost Estimator
                  </CardTitle>
                </div>
                <Badge variant="secondary" className="gap-1 font-medium">
                  <Sparkles className="h-3 w-3" />
                  <span>Dynamic Telemetry Engine</span>
                </Badge>
              </div>
              <CardDescription className="text-sm">
                Adjust appliance wattage, daily runtime, and effective Meralco tariff rate to see live cost projections.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-8 p-6 md:grid-cols-12 md:p-8">
              {/* Controls Column (7 cols) */}
              <div className="space-y-6 md:col-span-7">
                {/* Appliance Preset Selector */}
                <div className="space-y-2">
                  <label htmlFor="appliance-preset" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Select Standard Appliance Preset
                  </label>
                  <select
                    id="appliance-preset"
                    value={selectedWatts}
                    onChange={(e) => setSelectedWatts(Number(e.target.value))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {applianceOptions.map((opt) => (
                      <option key={opt.value + opt.label} value={opt.value}>
                        {opt.label} — {opt.value}W ({opt.desc})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Pick a common household load or customize daily runtime and rate below.
                  </p>
                </div>

                {/* Daily Runtime Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="uppercase tracking-wider text-muted-foreground">Daily Runtime (Duty Cycle)</span>
                    <span className="font-mono text-foreground">{estimatorHours} hours / day</span>
                  </div>
                  <div className="relative flex items-center py-2">
                    <input
                      type="range"
                      min={0.5}
                      max={24}
                      step={0.5}
                      value={estimatorHours}
                      onChange={(e) => setEstimatorHours(Number(e.target.value))}
                      className="lp-range h-2 w-full cursor-pointer rounded-full bg-secondary accent-primary"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>30 min (Quick Use)</span>
                    <span>8 hrs (Typical)</span>
                    <span>24 hrs (Continuous)</span>
                  </div>
                </div>

                {/* Meralco Tariff Rate Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="uppercase tracking-wider text-muted-foreground">
                      Effective Meralco Tariff Rate (₱ / kWh)
                    </span>
                    <span className="font-mono text-foreground">₱{estimatorRate.toFixed(4)} / kWh</span>
                  </div>
                  <div className="relative flex items-center py-2">
                    <input
                      type="range"
                      min={8.0}
                      max={20.0}
                      step={0.05}
                      value={estimatorRate}
                      onChange={(e) => setEstimatorRate(Number(e.target.value))}
                      className="lp-range h-2 w-full cursor-pointer rounded-full bg-secondary accent-primary"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>₱8.50 (Lifeline)</span>
                    <span>₱14.82 (Standard 200kWh+)</span>
                    <span>₱20.00 (High Peak)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Projection Result Card (5 cols) */}
              <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/40 p-6 md:col-span-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Projected Monthly Spend
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      Unbundled Est.
                    </Badge>
                  </div>

                  <div>
                    <div className="font-mono text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                      ₱{estimatorCalc.monthlyCost}
                      <span className="ml-1 text-sm font-normal text-muted-foreground">/ mo</span>
                    </div>
                  </div>

                  <Separator />

                  <dl className="space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Continuous Hourly Cost:</dt>
                      <dd className="font-mono font-semibold text-foreground">₱{estimatorCalc.hourlyCost} / hour</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Daily Energy Load:</dt>
                      <dd className="font-mono font-semibold text-foreground">{estimatorCalc.dailyKwh} kWh / day</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Monthly Consumption:</dt>
                      <dd className="font-mono font-semibold text-foreground">{estimatorCalc.monthlyKwh} kWh / mo</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Annual Spend (12-Mo):</dt>
                      <dd className="font-mono font-semibold text-foreground">₱{estimatorCalc.annualCost} / yr</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <Button onClick={() => navigate("/calculator")} className="w-full justify-center">
                    Open Full Unbundled Bill Calculator
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/appliances")} className="w-full justify-center">
                    Compare with DOE PELP Catalog
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. Philippine Utility & Regulatory Standards Strip */}
        <section className="border-y border-border bg-muted/30 py-10">
          <div className="container mx-auto max-w-6xl px-4">
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              BUILT AROUND PHILIPPINE DOE PELP STANDARDS & ERC UNBUNDLED TARIFF PROTOCOLS
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "DOE PELP Star Ratings", sub: "Philippine Energy Labeling" },
                { label: "ERC Unbundled Framework", sub: "Itemized Centavo Formulas" },
                { label: "RA 11285 Framework", sub: "Appliance Efficiency & Labeling" },
                { label: "Meralco Tariff Schedule", sub: "Residential & Commercial" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-4 text-center shadow-xs"
                >
                  <div className="mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-foreground" />
                    <span className="text-sm font-bold text-foreground">{item.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.sub}</span>
                </div>
              ))}
            </div>
          </div>
        </section>



        {/* 7. Core Platform Modules (Reference: multi-tenant-starter-template components/features.tsx FeatureGrid) */}
        <section id="features" className="container mx-auto max-w-6xl scroll-mt-24 space-y-6 px-4 py-16 md:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Engineered for Complete Energy Control
            </h2>
            <p className="max-w-[85%] text-sm text-muted-foreground sm:text-lg">
              Explore the full suite of specialized tools built to track, forecast, audit, and optimize your monthly electric bills.
            </p>
          </div>

          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[
              {
                icon: Activity,
                title: "24-Hour Live Activity Timeline",
                description: "Live hourly load telemetry bar chart, dynamic ₱/hr running rate ticker, and instantaneous circuit load monitoring on the dashboard.",
              },
              {
                icon: Clock,
                title: "Smart Calendar & Midnight Splitting",
                description: "Overnight appliance runs are automatically split at 23:59:59 into two accurate day logs, keeping calendar metrics 100% truthful.",
              },
              {
                icon: WandSparkles,
                title: "Multi-Range Routine Autofill",
                description: "Batch populate usage records from 1st to Today, Full Month, or Custom Date Range in 1 click using your appliances' default routine hours.",
              },
              {
                icon: Calculator,
                title: "ERC Unbundled Tariff Calculator",
                description: "Centavo-accurate unbundled billing covering Generation, Transmission, Distribution, System Loss, Subsidies, FIT-All, and 12% VAT.",
              },
              {
                icon: Layers,
                title: "DOE PELP Energy Catalog",
                description: "Compare verified Energy Efficiency Ratios (EER) and CSPF star ratings for over 100+ inverter air conditioners and refrigerators.",
              },
              {
                icon: Camera,
                title: "AI Vision OCR Label Scanner",
                description: "Capture physical appliance nameplates and DOE Energy Guide yellow labels with optical AI recognition, confidence verification, and auto-populated specs.",
              },
              {
                icon: Cpu,
                title: "Live Circuit Breaker Load Monitor",
                description: "Track simultaneous active circuit amperage and wattage against standard household breaker ratings (30A, 40A, 60A) with instant overload warnings.",
              },
              {
                icon: ChartColumn,
                title: "3-Scenario What-If Forecasting",
                description: "Model your month-end bill across Baseline, Eco-Saver (15% reduction), and Summer Heat Surge (25% increase) scenarios with ERC bracket tracking.",
              },
            ].map((f, idx) => {
              const IconComp = f.icon;
              return (
                <div key={idx} className="relative overflow-hidden rounded-lg border border-border bg-background p-2 transition-colors hover:border-foreground/40">
                  <div className="flex h-full min-h-[200px] flex-col justify-between rounded-md p-6 gap-4">
                    <div className="space-y-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
                        <IconComp className="h-5 w-5 text-foreground" />
                      </div>
                      <h3 className="font-bold text-base leading-snug">{f.title}</h3>
                      <p className="text-xs leading-relaxed text-muted-foreground">{f.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>



        {/* 9. Architecture & Developer Ecosystem */}
        <section className="border-y border-border bg-muted/30 py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-foreground" />
                  <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                    Developer Ecosystem & Built-in OpenAPI Docs
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Explore comprehensive API specifications, unbundled ERC calculation formulas, telemetry schemas, and database changelogs in our integrated interactive documentation portal.
                </p>
              </div>
              <Link to="/docs" className={cn(buttonVariants({ variant: "default", size: "lg" }), "shrink-0")}>
                <BookOpen className="h-4 w-4" />
                <span>Open API Docs</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 10. FAQ Section */}
        <section id="faq" className="container mx-auto max-w-4xl scroll-mt-24 px-4 py-16 md:py-24">
          <div className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center mb-10">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Answers to common questions about power calculation accuracy, multi-day session splitting, and Philippine regulatory modeling.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How does the 24-Hour Activity Timeline calculate live running costs?",
                a: "The dashboard aggregates the wattage of all active circuits in real-time, multiplies the cumulative load by your effective Meralco tariff rate (₱/kWh), and computes continuous ₱/hr running costs and active circuit breaker amperage loads.",
              },
              {
                q: "How does the smart auto-midnight multi-day splitting engine work?",
                a: "When you log an overnight session (e.g. 10:00 PM to 2:00 AM), PowerForecast automatically detects the 23:59:59 crossing and splits the session into 2 distinct records: 2 hours attributed to Day 1, and 2 hours attributed to Day 2. This guarantees 100% calendar accuracy.",
              },
              {
                q: "What is the multi-range Routine Defaults autofill feature?",
                a: "Routine Defaults allows you to set standard daily hours for each appliance (e.g., Refrigerator 24h, AC 8h, Fan 10h). You can then batch autofill records for '1st to Today', 'Full Month', or any 'Custom Range' in a single click with full edit and delete support.",
              },
              {
                q: "How accurate is the ERC unbundled Meralco calculation formula?",
                a: "PowerForecast implements the official Energy Regulatory Commission (ERC) unbundled billing framework, factoring in Generation Charges, Transmission Wheeling, System Loss, Distribution Charges, Lifeline Subsidies, FIT-All, Universal Charges, and 12% VAT down to the exact centavo.",
              },
              {
                q: "What is the DOE PELP Database integration?",
                a: "PELP stands for the Philippine Energy Labeling Program mandated by the Department of Energy. PowerForecast incorporates verified CSPF and EER ratings for top air conditioners and refrigerators so you can accurately model inverter efficiency and real-world power consumption.",
              },
              {
                q: "How does the AI Vision OCR Scanner work?",
                a: "The built-in AI Vision Scanner allows you to snap a photo or upload an image of any appliance manufacturer nameplate or DOE Energy Guide yellow label. The optical AI engine automatically extracts rated wattage, voltage, amperage, brand, and energy star rating directly into your inventory.",
              },
              {
                q: "Is my household energy data stored securely?",
                a: "Yes. All appliance inventories and schedule records are stored securely in Supabase Cloud DB with automatic fallback to offline browser storage.",
              },
            ].map((faq, idx) => {
              const isOpen = !!openFaqs[idx];
              return (
                <div key={idx} className="rounded-lg border border-border bg-card transition-colors">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="flex w-full items-center justify-between p-4 text-left font-semibold text-sm sm:text-base cursor-pointer hover:bg-muted/40 rounded-lg transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={cn("h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground", isOpen && "rotate-180")}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 11. Final Call to Action */}
        <section className="border-t border-border bg-muted/40 py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Take Total Control of Your Power Bill Today
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Join households across the Philippines tracking their circuits, stopping peak overloads, and computing unbundled Meralco bills with centavo precision.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link to="/signup" className={cn(buttonVariants({ variant: "default", size: "lg" }))}>
                <span>Create Free Account</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/calculator" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Try Unbundled Calculator
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 12. Footer (Reference: multi-tenant-starter-template components/footer.tsx) */}
      <footer className="border-t border-border bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-5">
            {/* Col 1 & 2: Brand */}
            <div className="space-y-3 sm:col-span-2">
              <div className="flex items-center gap-2">
                <img src="/Assets/LOGO.png" alt="PowerForecast Logo" className="h-6 w-6 object-contain" />
                <span className="font-bold text-base tracking-tight">PowerForecast</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {APP_VERSION}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground max-w-sm">
                Next-generation Meralco energy intelligence, real-time circuit power telemetry, and ERC unbundled bill forecasting platform for Philippine households.
              </p>
            </div>

            {/* Col 3: Platform Views */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Platform Views</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>
                  <Link to="/dashboard" className="transition-colors hover:text-foreground hover:underline">
                    Live Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/calendar" className="transition-colors hover:text-foreground hover:underline">
                    Smart Calendar
                  </Link>
                </li>
                <li>
                  <Link to="/appliances" className="transition-colors hover:text-foreground hover:underline">
                    Appliances Hub
                  </Link>
                </li>
                <li>
                  <Link to="/calculator" className="transition-colors hover:text-foreground hover:underline">
                    Unbundled Calculator
                  </Link>
                </li>
                <li>
                  <Link to="/forecasting" className="transition-colors hover:text-foreground hover:underline">
                    Forecast & Anomaly
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Documentation */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Documentation</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>
                  <Link to="/docs" className="transition-colors hover:text-foreground hover:underline">
                    OpenAPI Specs
                  </Link>
                </li>
                <li>
                  <Link to="/docs" className="transition-colors hover:text-foreground hover:underline">
                    ERC Tariff Formulas
                  </Link>
                </li>
                <li>
                  <Link to="/docs" className="transition-colors hover:text-foreground hover:underline">
                    System Audit Logs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 5: Support & Contact */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Support & Contact</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>
                  <Link to="/login" className="transition-colors hover:text-foreground hover:underline">
                    Sign In to Household
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="transition-colors hover:text-foreground hover:underline">
                    Create Free Account
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row">
            <p>
              © {new Date().getFullYear()} PowerForecast • Developed by AJ Umali • Built with Refine, React, Tailwind CSS, and Supabase.
            </p>
            <div className="font-mono text-[11px]">Version {APP_VERSION}</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
