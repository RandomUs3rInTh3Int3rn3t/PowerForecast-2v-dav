import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import LinearProgress from "@mui/material/LinearProgress";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Calculate as CalculateIcon,
  Layers as LayersIcon,
  CameraAlt as CameraIcon,
  Schedule as ClockIcon,
  BarChart as BarChartIcon,
  Memory as CpuIcon,
  ArrowForward as ArrowForwardIcon,
  ExpandMore as ExpandMoreIcon,
  Security as ShieldIcon,
  AutoAwesome as SparklesIcon,
  AcUnit as AcIcon,
  Kitchen as FridgeIcon,
  Tv as TvIcon,
  Lightbulb as BulbIcon,
  Brightness4 as MoonIcon,
  Brightness7 as SunIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  ElectricBolt as ElectricBoltIcon,
  AutoFixHigh as AutoFixHighIcon,
  Science as ScienceIcon,
  DocumentScanner as DocumentScannerIcon,
  MenuBook as DocsIcon,
  Speed as SpeedIcon,
  Computer as ComputerIcon,
  Shower as ShowerIcon,
} from "@mui/icons-material";
import { useColorMode } from "../theme/AppTheme";
import { APP_VERSION } from "../lib/supabaseClient";
import { SystemTestingBanner } from "../components/common/SystemTestingBanner";

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  // Quick estimator state
  const [selectedWatts, setSelectedWatts] = useState<number>(1050);
  const [estimatorHours, setEstimatorHours] = useState<number>(8);
  const [estimatorRate, setEstimatorRate] = useState<number>(14.8261);

  // Interactive showcase active tab
  const [activeTab, setActiveTab] = useState<number>(0);

  const applianceOptions = [
    { label: "Inverter Split AC (1.5 HP)", value: 1050, icon: <AcIcon fontSize="small" />, desc: "Dual Inverter, CSPF 5.8" },
    { label: "Window Non-Inverter AC (1.0 HP)", value: 950, icon: <AcIcon fontSize="small" />, desc: "Fixed Speed, Standard EER" },
    { label: "Two-Door Inverter Refrigerator", value: 120, icon: <FridgeIcon fontSize="small" />, desc: "Linear Compressor (24/7)" },
    { label: "55-inch 4K Smart OLED TV", value: 110, icon: <TvIcon fontSize="small" />, desc: "HDR Gaming & Streaming" },
    { label: "Induction Cooker", value: 1800, icon: <CalculateIcon fontSize="small" />, desc: "Rapid High-Power Boil" },
    { label: "Workstation & Gaming PC", value: 550, icon: <ComputerIcon fontSize="small" />, desc: "GPU Rendering Load" },
    { label: "Electric Stand Fan (16-inch)", value: 60, icon: <BulbIcon fontSize="small" />, desc: "Standard Speed 3" },
    { label: "Instant Multipoint Water Heater", value: 3500, icon: <ShowerIcon fontSize="small" />, desc: "High Draw Heating" },
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

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Active section tracking for header scrollspy
  const [activeSection, setActiveSection] = useState<string>("estimator");

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -80; // Offset for sticky AppBar height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const sectionIds = ["estimator", "showcase", "features", "tariffs", "faq"];
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
    { id: "showcase", label: "Platform Showcase" },
    { id: "features", label: "Core Modules" },
    { id: "tariffs", label: "Tariff Tiers" },
    { id: "faq", label: "FAQ" },
  ];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", color: "text.primary" }}>
      {/* 1. Sticky Navigation Header */}
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          backdropFilter: "blur(20px)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(10, 10, 36, 0.82)" : "rgba(255, 255, 255, 0.88)",
          borderBottom: "1px solid",
          borderColor: "divider",
          zIndex: 1100,
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: "space-between", px: { xs: 0, sm: 2 }, minHeight: { xs: 58, sm: 64 } }}>
            {/* Left: Mobile Menu & Logo */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                onClick={() => setMobileOpen(true)}
                size="small"
                sx={{
                  display: { xs: "inline-flex", md: "none" },
                  border: "1px solid",
                  borderColor: "divider",
                  p: 0.75,
                }}
                aria-label="Open navigation menu"
              >
                <MenuIcon sx={{ fontSize: 20 }} />
              </IconButton>

              <Box
                component={Link}
                to="/"
                sx={{ display: "flex", alignItems: "center", gap: 1.5, textDecoration: "none", color: "inherit" }}
              >
                <Box
                  component="img"
                  src="/Assets/LOGO.png"
                  alt="PowerForecast Logo"
                  sx={{ width: 34, height: 34, objectFit: "contain" }}
                />
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                  Power<Box component="span" sx={{ color: "primary.main" }}>Forecast</Box>
                </Typography>
                <Chip
                  label={APP_VERSION}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: "0.6875rem",
                    fontWeight: 800,
                    bgcolor: "rgba(0, 229, 201, 0.15)",
                    color: "primary.main",
                    border: "1px solid rgba(0, 229, 201, 0.3)",
                  }}
                />
              </Box>
            </Box>

            {/* Desktop Navigation Links */}
            <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
              {navLinks.map((nav) => {
                const isActive = activeSection === nav.id;
                return (
                  <Button
                    key={nav.id}
                    onClick={() => scrollToSection(nav.id)}
                    variant="text"
                    size="small"
                    sx={{
                      color: isActive ? "primary.main" : "text.secondary",
                      fontWeight: isActive ? 800 : 600,
                      fontSize: "0.875rem",
                      textTransform: "none",
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 1,
                      bgcolor: isActive
                        ? (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(0, 229, 201, 0.12)"
                              : "rgba(0, 158, 136, 0.08)"
                        : "transparent",
                      border: "1px solid",
                      borderColor: isActive ? "rgba(0, 229, 201, 0.3)" : "transparent",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        color: "primary.main",
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.08)"
                            : "rgba(0, 158, 136, 0.04)",
                        borderColor: "rgba(0, 229, 201, 0.2)",
                      },
                    }}
                  >
                    {nav.label}
                  </Button>
                );
              })}
            </Box>

            {/* Right Action Group */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} mode`}>
                <IconButton onClick={toggleColorMode} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
                  {isDark ? <SunIcon sx={{ color: "#ffd54f", fontSize: 18 }} /> : <MoonIcon sx={{ color: "#4f46e5", fontSize: 18 }} />}
                </IconButton>
              </Tooltip>

              <Button
                component={Link}
                to="/login"
                variant="outlined"
                size="small"
                sx={{ display: { xs: "none", sm: "inline-flex" }, fontWeight: 700 }}
              >
                Sign In
              </Button>

              <Button
                component={Link}
                to="/signup"
                variant="contained"
                size="small"
                endIcon={<ArrowForwardIcon />}
                sx={{ fontWeight: 700 }}
              >
                Get Started
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* HubSpot-Style System Testing Announcement Banner Strip */}
      <SystemTestingBanner variant="landing" />

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "#0f172a" : "#ffffff"),
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            },
          },
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box component="img" src="/Assets/LOGO.png" alt="PowerForecast" sx={{ width: 28, height: 28 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>
                Power<Box component="span" sx={{ color: "primary.main" }}>Forecast</Box>
              </Typography>
            </Box>
            <IconButton onClick={() => setMobileOpen(false)} size="small" aria-label="Close menu">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <List sx={{ display: "flex", flexDirection: "column", gap: 0.5, p: 0 }}>
            {navLinks.map((nav) => {
              const isActive = activeSection === nav.id;
              return (
                <ListItem key={nav.id} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setMobileOpen(false);
                      setTimeout(() => scrollToSection(nav.id), 120);
                    }}
                    sx={{
                      borderRadius: 2,
                      bgcolor: isActive ? "action.selected" : "transparent",
                      color: isActive ? "primary.main" : "text.primary",
                      fontWeight: isActive ? 800 : 600,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography sx={{ fontWeight: isActive ? 800 : 600, fontSize: "0.9375rem" }}>
                          {nav.label}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Button
            component={Link}
            to="/login"
            variant="outlined"
            fullWidth
            onClick={() => setMobileOpen(false)}
            sx={{ fontWeight: 700 }}
          >
            Sign In
          </Button>
          <Button
            component={Link}
            to="/signup"
            variant="contained"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            onClick={() => setMobileOpen(false)}
            sx={{ fontWeight: 800 }}
          >
            Get Started
          </Button>
        </Box>
      </Drawer>

      {/* 2. Hero Section */}
      <Box
        sx={{
          pt: { xs: 6, sm: 8, md: 10 },
          pb: { xs: 6, sm: 8, md: 10 },
          position: "relative",
          overflow: "hidden",
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 229, 201, 0.2), transparent)"
              : "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 158, 136, 0.12), transparent)",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 920, mx: "auto", mb: { xs: 5, md: 7 } }}>
            <Chip
              icon={<SparklesIcon sx={{ color: "#ffd54f !important", fontSize: "16px !important" }} />}
              label="Next-Gen Meralco Energy Intelligence & Appliance Tracking Platform"
              sx={{
                mb: 2.5,
                fontWeight: 700,
                fontSize: "0.8125rem",
                bgcolor: "rgba(0, 229, 201, 0.12)",
                color: "primary.main",
                border: "1px solid rgba(0, 229, 201, 0.25)",
                px: 1,
              }}
            />

            <Typography
              variant="h1"
              sx={{
                fontWeight: 900,
                fontSize: { xs: "2.25rem", sm: "3.25rem", md: "4.15rem" },
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                mb: 2.5,
              }}
            >
              Master Your Electricity &{" "}
              <Box
                component="span"
                sx={{
                  background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #eab308 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Meralco Power Bills
              </Box>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                fontSize: { xs: "1rem", sm: "1.18rem" },
                color: "text.secondary",
                lineHeight: 1.65,
                maxWidth: 820,
                mx: "auto",
                mb: 4,
              }}
            >
              High-precision appliance telemetry with <strong>24-hour visual activity tracking</strong>, 
              <strong> smart auto-midnight session splitting</strong>, <strong>isolated Simulate Appliance engine</strong>, 
              official <strong>ERC unbundled tariff formulas</strong>, and <strong>DOE PELP energy efficiency star ratings</strong>.
            </Typography>

            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2, mb: 4 }}>
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ px: 4, py: 1.4, fontSize: "1.025rem", borderRadius: 1, fontWeight: 800 }}
              >
                Get Started Free
              </Button>
              <Button
                component={Link}
                to="/calculator"
                variant="outlined"
                size="large"
                startIcon={<CalculateIcon />}
                sx={{ px: 3.5, py: 1.4, fontSize: "1.025rem", borderRadius: 1, fontWeight: 800 }}
              >
                Unbundled Calculator
              </Button>
              <Button
                onClick={() => scrollToSection("showcase")}
                variant="text"
                size="large"
                startIcon={<SpeedIcon />}
                sx={{ px: 2.5, py: 1.4, fontSize: "1.025rem", borderRadius: 1, fontWeight: 700 }}
              >
                Interactive Tour
              </Button>
            </Box>

            {/* Quick trust metrics row */}
            <Grid container spacing={2} sx={{ justifyContent: "center", pt: 2 }}>
              {[
                { label: "100+ DOE PELP Catalog Models", icon: <LayersIcon fontSize="small" sx={{ color: "primary.main" }} /> },
                { label: "ERC Unbundled Centavo Precision", icon: <CheckCircleIcon fontSize="small" sx={{ color: "#ffd54f" }} /> },
                { label: "24-Hour Visual Activity Timeline", icon: <TimelineIcon fontSize="small" sx={{ color: "success.main" }} /> },
                { label: "Smart Overnight Split Engine", icon: <ClockIcon fontSize="small" sx={{ color: "secondary.main" }} /> },
              ].map((metric, i) => (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {metric.icon}
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                      {metric.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Interactive Live Estimator Card */}
          <Card
            id="estimator"
            sx={{
              scrollMarginTop: { xs: "72px", sm: "84px" },
              p: { xs: 2.5, sm: 4 },
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 20px 60px rgba(0, 0, 0, 0.45)"
                  : "0 20px 60px rgba(0, 158, 136, 0.1)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1.5 }}>
              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ElectricBoltIcon sx={{ color: "#ffd54f" }} />
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>
                    Real-Time Appliance Bill & Running Cost Estimator
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                  Adjust appliance wattage, daily runtime, and effective Meralco tariff rate to see live cost projections.
                </Typography>
              </Box>
              <Chip
                icon={<SparklesIcon sx={{ fontSize: "14px !important", color: "inherit" }} />}
                label="Dynamic Telemetry Engine"
                color="secondary"
                size="small"
                sx={{ fontWeight: 800 }}
              />
            </Box>

            <Grid container spacing={{ xs: 2.5, sm: 3.5 }}>
              {/* Controls Column */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Select Standard Appliance Preset"
                    value={selectedWatts}
                    onChange={(e) => setSelectedWatts(Number(e.target.value))}
                    size="small"
                    helperText="Pick a common household load or customize wattage below"
                  >
                    {applianceOptions.map((opt) => (
                      <MenuItem key={opt.value + opt.label} value={opt.value}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", justifyContent: "space-between" }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                            {opt.icon}
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {opt.label}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
                            {opt.value}W • {opt.desc}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </TextField>

                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.05em" }}>
                        DAILY RUNTIME (DUTY CYCLE)
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: "primary.main" }}>
                        {estimatorHours} hours / day
                      </Typography>
                    </Box>
                    <Slider
                      value={estimatorHours}
                      min={0.5}
                      max={24}
                      step={0.5}
                      onChange={(_, val) => setEstimatorHours(val as number)}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(x) => `${x}h`}
                    />
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>30 min (Quick Use)</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>8 hrs (Typical)</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>24 hrs (Continuous)</Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.05em" }}>
                        EFFECTIVE MERALCO TARIFF RATE (₱ / kWh)
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: "#eab308" }}>
                        ₱{estimatorRate.toFixed(4)} / kWh
                      </Typography>
                    </Box>
                    <Slider
                      value={estimatorRate}
                      min={8.0}
                      max={20.0}
                      step={0.05}
                      onChange={(_, val) => setEstimatorRate(val as number)}
                      valueLabelDisplay="auto"
                      valueLabelFormat={(x) => `₱${x.toFixed(2)}`}
                    />
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>₱8.50 (Lifeline)</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>₱14.82 (Standard 200kWh+)</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>₱20.00 (High Peak)</Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>

              {/* Dynamic Projection Result Card */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper
                  sx={{
                    p: { xs: 2.5, sm: 3 },
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(0, 158, 136, 0.06)",
                    border: "1px solid",
                    borderColor: "primary.main",
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.light", textTransform: "uppercase" }}>
                        Projected Monthly Spend
                      </Typography>
                      <Chip label="Unbundled Est." size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700 }} />
                    </Box>
                    <Typography
                      variant="h3"
                      sx={{
                        fontWeight: 900,
                        fontFamily: "monospace",
                        color: "#ffd54f",
                        my: 1,
                        fontSize: { xs: "2.1rem", sm: "2.6rem" },
                      }}
                    >
                      ₱{estimatorCalc.monthlyCost}
                      <Typography component="span" variant="body2" sx={{ color: "text.secondary", ml: 1 }}>
                        / mo
                      </Typography>
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Continuous Hourly Cost:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "success.light", fontFamily: "monospace" }}>
                        ₱{estimatorCalc.hourlyCost} / hour
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Daily Energy Load:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                        {estimatorCalc.dailyKwh} kWh / day
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Monthly Consumption:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>
                        {estimatorCalc.monthlyKwh} kWh / mo
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>Annual Spend (12-Mo):</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", color: "#eab308" }}>
                        ₱{estimatorCalc.annualCost} / yr
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      size="small"
                      onClick={() => navigate("/calculator")}
                      sx={{ fontWeight: 800, py: 1 }}
                    >
                      Open Full Unbundled Bill Calculator
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => navigate("/appliances")}
                      sx={{ fontWeight: 700 }}
                    >
                      Compare with DOE PELP Catalog
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Card>
        </Container>
      </Box>

      {/* 3. Philippine Utility & Regulatory Standards */}
      <Box sx={{ py: 5, borderY: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
        <Container maxWidth="lg">
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              fontWeight: 800,
              color: "text.secondary",
              letterSpacing: "0.08em",
              mb: 3,
            }}
          >
            BUILT AROUND PHILIPPINE DOE PELP STANDARDS & ERC UNBUNDLED TARIFF PROTOCOLS
          </Typography>
          <Grid container spacing={2} sx={{ justifyContent: "center", alignItems: "center" }}>
            {[
              { label: "DOE PELP Star Ratings", sub: "Philippine Energy Labeling" },
              { label: "ERC Unbundled Framework", sub: "Itemized Centavo Formulas" },
              { label: "RA 11285 Framework", sub: "Appliance Efficiency & Labeling" },
              { label: "Meralco Tariff Schedule", sub: "Residential & Commercial" },
            ].map((item, i) => (
              <Grid size={{ xs: 6, sm: 3 }} key={i} sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    <ShieldIcon sx={{ color: "primary.main", fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      {item.label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                    {item.sub}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 4. Interactive Platform Showcase (Tabbed Walkthrough) */}
      <Box id="showcase" sx={{ py: { xs: 8, md: 11 }, scrollMarginTop: { xs: "72px", sm: "84px" } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 780, mx: "auto", mb: { xs: 4, md: 6 } }}>
            <Chip
              label="Interactive Platform Capabilities"
              color="primary"
              size="small"
              sx={{ mb: 1.5, fontWeight: 800 }}
            />
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 1.5, letterSpacing: "-0.02em" }}>
              Explore the PowerForecast Platform & Energy Tools
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Click through the core engines built to eliminate bill shocks and optimize your household power consumption.
            </Typography>
          </Box>

          <Paper
            sx={{
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
            }}
          >
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
                px: 2,
                "& .MuiTab-root": { fontWeight: 700, textTransform: "none", py: 2 },
              }}
            >
              <Tab icon={<TimelineIcon />} iconPosition="start" label="24-Hour Activity & Cost Ticker" />
              <Tab icon={<ClockIcon />} iconPosition="start" label="Smart Calendar & Midnight Splitting" />
              <Tab icon={<ScienceIcon />} iconPosition="start" label="Simulate Appliance & What-If Planner" />
              <Tab icon={<CalculateIcon />} iconPosition="start" label="Unbundled ERC Calculator" />
              <Tab icon={<LayersIcon />} iconPosition="start" label="DOE PELP Energy Catalog" />
              <Tab icon={<DocumentScannerIcon />} iconPosition="start" label="AI Vision OCR Scanner" />
            </Tabs>

            <Box sx={{ p: { xs: 3, sm: 5 } }}>
              {/* Tab 0: 24h Activity Timeline */}
              {activeTab === 0 && (
                <Grid container spacing={4} sx={{ alignItems: "center" }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Chip label="Real-Time Telemetry" color="success" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
                      24-Hour Activity Timeline & Dynamic Cost Ticker
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
                      Monitor your household's active power footprint in real-time. The dashboard renders an hourly 24-hour visual activity track, computes instant running cost per hour (₱/hr), and tracks simultaneous circuit breaker capacity.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                      {[
                        "Live ₱/hr running rate ticker synchronized to active circuits",
                        "24-hour visual energy load distribution bars across morning, afternoon, and night",
                        "Active breaker load percentage with overload alert warnings",
                      ].map((item, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component={Link}
                      to="/dashboard"
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 800 }}
                    >
                      View Live Dashboard
                    </Button>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    {/* Simulated 24h Timeline Widget Mock */}
                    <Card sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                          Today's Live Power Ticker
                        </Typography>
                        <Chip label="LIVE MONITOR" color="error" size="small" sx={{ fontWeight: 800, height: 20 }} />
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", bgcolor: "action.hover", p: 2, borderRadius: 1.25, mb: 2.5 }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>ACTIVE RUNNING RATE</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "success.light" }}>
                            ₱15.57 / hr
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>SIMULTANEOUS LOAD</Typography>
                          <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f" }}>
                            1,050 W (4.77A)
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>Circuit Breaker Load (30A Limit)</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: "success.main" }}>15.2% Safe</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={15.2} color="success" sx={{ height: 8, borderRadius: 1 }} />
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Tab 1: Smart Calendar & Midnight Splitting */}
              {activeTab === 1 && (
                <Grid container spacing={4} sx={{ alignItems: "center" }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Chip label="Overnight Session Engine" color="secondary" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
                      Smart Calendar with Auto-Midnight Multi-Day Splitting
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
                      Running an air conditioner from 10:00 PM to 2:00 AM? PowerForecast automatically splits overnight sessions at the 23:59:59 boundary, attributing exactly 2 hours to Day 1 and 2 hours to Day 2 with flawless calendar parity.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                      {[
                        "Smart midnight crossing detector automatically creates balanced multi-day usage logs",
                        "Interactive Smart Calendar Simulation Engine with built-in 24-hour visual load curve",
                        "Detailed date analytics modal showing exact kWh, cost, and session breakdown per day",
                      ].map((item, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleIcon sx={{ color: "secondary.main", fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component={Link}
                      to="/calendar"
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 800 }}
                    >
                      Open Smart Calendar
                    </Button>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                        Auto-Midnight Crossing Split Visualizer
                      </Typography>
                      <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1.25, mb: 2 }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>LOGGED SESSION</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: "primary.light" }}>
                          Master Bedroom AC: 10:00 PM → 02:00 AM (4.0 hrs Total)
                        </Typography>
                      </Box>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 6 }}>
                          <Paper sx={{ p: 2, border: "1px solid", borderColor: "primary.main", borderRadius: 1.25 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main" }}>DAY 1 LOG (Aug 23)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace" }}>2.0 hrs</Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>22:00 - 23:59 (2.10 kWh)</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Paper sx={{ p: 2, border: "1px solid", borderColor: "secondary.main", borderRadius: 1.25 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: "secondary.main" }}>DAY 2 LOG (Aug 24)</Typography>
                            <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace" }}>2.0 hrs</Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>00:00 - 02:00 (2.10 kWh)</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Tab 2: Simulate Appliance & What-If Planner */}
              {activeTab === 2 && (
                <Grid container spacing={4} sx={{ alignItems: "center" }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Chip label="Isolated What-If Modeling" color="primary" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
                      Simulate Appliance & Dual-Tab Calendar Engine
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
                      Experiment freely without contaminating your verified actual records. Model appliance schedules, measure tasks with a live test-run stopwatch, and plan future billing cycles in a dedicated simulation layer.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                      {[
                        "Dual-Tab Calendar: Strict isolation between measured Actuals and What-If Simulations",
                        "Test-Run Stopwatch: Time appliance cycles in real-time and apply duration directly to your plan",
                        "Blended Forecasting: Combines actuals-to-date with remaining simulation days for exact predictions",
                      ].map((item, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleIcon sx={{ color: "primary.main", fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component={Link}
                      to="/calendar"
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 800 }}
                    >
                      Explore Simulation Plan
                    </Button>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                        3 Pillars of PowerForecast Simulation
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        <Paper sx={{ p: 2, border: "1px solid", borderColor: "primary.main", bgcolor: "rgba(0, 229, 201, 0.08)", borderRadius: 1.25 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main" }}>Pillar 1: 100% Data Isolation</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Simulated plans commit exclusively to isolated tables so verified stopwatch sessions are never overwritten.
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Pillar 2: Test-Run Stopwatch</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Time chore durations or inverter cool-down periods with a built-in stopwatch to craft realistic routine targets.
                          </Typography>
                        </Paper>
                        <Paper sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Pillar 3: Plan Quota Alerts</Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary" }}>
                            Receive automated audio, push, and haptic notifications if live stopwatch runtime exceeds your simulated quota.
                          </Typography>
                        </Paper>
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Tab 3: Unbundled ERC Calculator */}
              {activeTab === 3 && (
                <Grid container spacing={4} sx={{ alignItems: "center" }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Chip label="ERC Centavo Accuracy" color="warning" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
                      Official ERC Unbundled Tariff Calculator
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
                      PowerForecast breaks down electricity charges into their exact legal components according to official Energy Regulatory Commission (ERC) guidelines.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                      {[
                        "Generation Charges (IPP & WESM energy market rates)",
                        "Transmission Wheeling & Ancillary Grid Services (NGCP)",
                        "Distribution Wheeling, Metering & Supply Charges (Meralco)",
                        "Universal Charges, FIT-All, Lifeline Subsidies, and 12% VAT",
                      ].map((item, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleIcon sx={{ color: "#eab308", fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component={Link}
                      to="/calculator"
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 800 }}
                    >
                      Calculate Your Bill
                    </Button>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                        Unbundled Cost Component Breakdown (200 kWh)
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {[
                          { name: "Generation Charge", pct: 54, val: "₱1,580.40", color: "#6366f1" },
                          { name: "Distribution Charge (Meralco)", pct: 18, val: "₱526.80", color: "#a855f7" },
                          { name: "Government Taxes (12% VAT)", pct: 12, val: "₱351.20", color: "#ec4899" },
                          { name: "Transmission (NGCP)", pct: 9, val: "₱263.40", color: "#eab308" },
                          { name: "System Loss & Universal", pct: 7, val: "₱204.86", color: "#22c55e" },
                        ].map((c, i) => (
                          <Box key={i}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 700 }}>{c.name} ({c.pct}%)</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace" }}>{c.val}</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={c.pct}
                              sx={{
                                height: 8,
                                borderRadius: 1,
                                bgcolor: "action.selected",
                                "& .MuiLinearProgress-bar": { bgcolor: c.color },
                              }}
                            />
                          </Box>
                        ))}
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Tab 4: DOE PELP Catalog */}
              {activeTab === 4 && (
                <Grid container spacing={4} sx={{ alignItems: "center" }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Chip label="DOE Energy Star Database" color="info" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
                      DOE PELP Verified Rating Catalog
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
                      Access verified Philippine Energy Labeling Program ratings directly. Compare CSPF (Cooling Seasonal Performance Factor) and EER ratings for top air conditioning and refrigeration brands in the Philippines.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                      {[
                        "Over 100+ verified inverter and non-inverter appliance models",
                        "Energy Star rating lookup (1-Star to 5-Star efficiency)",
                        "Autofill appliance specifications into your personal inventory with 1 click",
                      ].map((item, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleIcon sx={{ color: "info.main", fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component={Link}
                      to="/appliances"
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 800 }}
                    >
                      Browse PELP Catalog
                    </Button>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                        Verified Inverter Efficiency Ratings
                      </Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {[
                          { brand: "Panasonic Premium Inverter 1.5HP", cspf: "CSPF 6.10", stars: "★★★★★ (5-Star)", watts: "920W Avg" },
                          { brand: "Carrier Aura Inverter 1.0HP", cspf: "CSPF 5.85", stars: "★★★★★ (5-Star)", watts: "780W Avg" },
                          { brand: "Daikin D-Smart King 1.5HP", cspf: "CSPF 5.92", stars: "★★★★★ (5-Star)", watts: "980W Avg" },
                          { brand: "Standard Window Non-Inverter", cspf: "EER 9.80", stars: "★★☆☆☆ (2-Star)", watts: "1,150W Peak" },
                        ].map((m, i) => (
                          <Paper key={i} sx={{ p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1.25 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{m.brand}</Typography>
                              <Typography variant="caption" sx={{ color: "#ffd54f", fontWeight: 800 }}>{m.stars}</Typography>
                            </Box>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>Rating: {m.cspf}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>{m.watts}</Typography>
                            </Box>
                          </Paper>
                        ))}
                      </Box>
                    </Card>
                  </Grid>
                </Grid>
              )}

              {/* Tab 5: AI Vision Scanner */}
              {activeTab === 5 && (
                <Grid container spacing={4} sx={{ alignItems: "center" }}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Chip label="Optical AI Recognition" color="secondary" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 2 }}>
                      AI Vision OCR Appliance & Label Scanner
                    </Typography>
                    <Typography variant="body1" sx={{ color: "text.secondary", lineHeight: 1.7, mb: 3 }}>
                      Point your phone or webcam at any appliance manufacturer rating plate, inverter badge, or DOE Energy Guide yellow label. The optical AI parser extracts wattage, voltage, amps, star rating, and monthly estimated kWh automatically into your inventory.
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
                      {[
                        "Optical Character Recognition (OCR) with confidence score validation",
                        "Automatic extraction of Rated Power (Watts), Voltage (V), and Amperage (A)",
                        "Direct 1-click sync to your active appliance spaces and inventory list",
                      ].map((item, idx) => (
                        <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <CheckCircleIcon sx={{ color: "secondary.main", fontSize: 18 }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component={Link}
                      to="/appliances"
                      variant="contained"
                      endIcon={<ArrowForwardIcon />}
                      sx={{ fontWeight: 800 }}
                    >
                      Scan an Appliance
                    </Button>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card sx={{ p: 3, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                        AI OCR Plate Extraction Preview
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: "action.hover", border: "1px dashed", borderColor: "primary.main", borderRadius: 1.25, mb: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.light" }}>NAMEPLATE OCR DETECTED</Typography>
                          <Chip label="98.4% Confidence" color="success" size="small" sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700 }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>
                          Model: CS/CU-XPU12XKQ • 230V ~ 60Hz
                        </Typography>
                      </Paper>
                      <Grid container spacing={1.5}>
                        <Grid size={{ xs: 4 }}>
                          <Paper sx={{ p: 1.5, textAlign: "center", borderRadius: 1.25 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>Power</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "#ffd54f" }}>1,050 W</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper sx={{ p: 1.5, textAlign: "center", borderRadius: 1.25 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>Current</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.light" }}>4.75 A</Typography>
                          </Paper>
                        </Grid>
                        <Grid size={{ xs: 4 }}>
                          <Paper sx={{ p: 1.5, textAlign: "center", borderRadius: 1.25 }}>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>Type</Typography>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "success.light" }}>Inverter</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          </Paper>
        </Container>
      </Box>

      {/* 5. Core Platform Modules Grid */}
      <Box id="features" sx={{ py: { xs: 8, md: 11 }, bgcolor: "action.hover", scrollMarginTop: { xs: "72px", sm: "84px" } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 750, mx: "auto", mb: { xs: 5, md: 7 } }}>
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 1.5, letterSpacing: "-0.02em" }}>
              Engineered for Complete Energy Control
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              Explore the full suite of specialized tools built to track, forecast, audit, and optimize your monthly electric bills.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2.5, sm: 3 }}>
            {[
              {
                icon: <TimelineIcon sx={{ fontSize: 28, color: "#ffd54f" }} />,
                title: "24-Hour Live Activity Timeline",
                desc: "Live hourly load telemetry bar chart, dynamic ₱/hr running rate ticker, and instantaneous circuit load monitoring on the dashboard.",
              },
              {
                icon: <ClockIcon sx={{ fontSize: 28, color: "secondary.main" }} />,
                title: "Smart Calendar & Midnight Splitting",
                desc: "Overnight appliance runs are automatically split at 23:59:59 into two accurate day logs, keeping calendar metrics 100% truthful.",
              },
              {
                icon: <ScienceIcon sx={{ fontSize: 28, color: "primary.light" }} />,
                title: "Simulate Appliance & What-If Planner",
                desc: "Experiment with what-if schedules and test-run stopwatches in an isolated simulation layer without altering your verified measured telemetry.",
              },
              {
                icon: <CalculateIcon sx={{ fontSize: 28, color: "warning.main" }} />,
                title: "ERC Unbundled Tariff Calculator",
                desc: "Centavo-accurate unbundled billing covering Generation, Transmission, Distribution, System Loss, Subsidies, FIT-All, and 12% VAT.",
              },
              {
                icon: <LayersIcon sx={{ fontSize: 28, color: "info.main" }} />,
                title: "DOE PELP Energy Catalog",
                desc: "Compare verified Energy Efficiency Ratios (EER) and CSPF star ratings for over 100+ inverter air conditioners and refrigerators.",
              },
              {
                icon: <CameraIcon sx={{ fontSize: 28, color: "success.main" }} />,
                title: "AI Vision OCR Label Scanner",
                desc: "Capture physical appliance nameplates and DOE Energy Guide yellow labels with optical AI recognition, confidence verification, and auto-populated specs.",
              },
              {
                icon: <CpuIcon sx={{ fontSize: 28, color: "error.main" }} />,
                title: "Live Circuit Breaker Load Monitor",
                desc: "Track simultaneous active circuit amperage and wattage against standard household breaker ratings (30A, 40A, 60A) with instant overload warnings.",
              },
              {
                icon: <BarChartIcon sx={{ fontSize: 28, color: "#a855f7" }} />,
                title: "3-Scenario What-If Forecasting",
                desc: "Model your month-end bill across Baseline, Eco-Saver (15% reduction), and Summer Heat Surge (25% increase) scenarios with ERC bracket tracking.",
              },
            ].map((f, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                <Card
                  sx={{
                    height: "100%",
                    p: 3,
                    display: "flex",
                    flexDirection: "column",
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      borderColor: "primary.main",
                      boxShadow: "0 10px 30px rgba(0, 229, 201, 0.15)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "action.hover",
                      border: "1px solid",
                      borderColor: "divider",
                      mb: 2,
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, fontSize: "0.875rem" }}>
                    {f.desc}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 6. Tariff Tiers Comparison */}
      <Box id="tariffs" sx={{ py: { xs: 8, md: 11 }, scrollMarginTop: { xs: "72px", sm: "84px" } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", maxWidth: 720, mx: "auto", mb: { xs: 5, md: 7 } }}>
            <Chip label="Official Rate Brackets" color="secondary" size="small" sx={{ mb: 1.5, fontWeight: 800 }} />
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 1.5, letterSpacing: "-0.02em" }}>
              Meralco Residential Tariff Brackets
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary" }}>
              PowerForecast models the unbundled rate structures across all residential and small commercial brackets.
            </Typography>
          </Box>

          <Grid container spacing={{ xs: 2.5, sm: 3 }}>
            {[
              {
                title: "Lifeline Subsidy Tier",
                kwh: "0 - 100 kWh",
                price: "₱8.50 - ₱10.20",
                desc: "Eligible for qualified low-income households with 20% to 100% subsidies on generation and distribution charges.",
                popular: false,
                badge: "Subsidized",
              },
              {
                title: "Standard Residential",
                kwh: "101 - 300 kWh",
                price: "₱12.45 - ₱14.82",
                desc: "Standard household rate with full unbundled generation, transmission, system loss, universal, and 12% VAT charges.",
                popular: true,
                badge: "Most Common",
              },
              {
                title: "Heavy Residential",
                kwh: "301+ kWh",
                price: "₱14.80 - ₱16.50",
                desc: "Higher consumption households with multi-split air conditioners, continuous appliances, and marginal bracket rates.",
                popular: false,
                badge: "High Load",
              },
              {
                title: "Small Commercial / Mixed",
                kwh: "Multi-Space",
                price: "₱13.80 - ₱15.50",
                desc: "Sari-sari stores, workshops, and rental spaces with flat commercial distribution and fixed customer meter charges.",
                popular: false,
                badge: "Business",
              },
            ].map((tier, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                <Card
                  sx={{
                    p: 3.5,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: 1.5,
                    position: "relative",
                    border: "1px solid",
                    borderColor: tier.popular ? "primary.main" : "divider",
                    boxShadow: tier.popular ? "0 10px 30px rgba(0, 229, 201, 0.2)" : "none",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Chip
                        label={tier.badge}
                        color={tier.popular ? "primary" : "default"}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
                        {tier.kwh}
                      </Typography>
                    </Box>

                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 1.5 }}>
                      {tier.title}
                    </Typography>

                    <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: "monospace", my: 1.5, color: "#ffd54f" }}>
                      {tier.price} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>/kWh</Typography>
                    </Typography>

                    <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.85rem", lineHeight: 1.6, mb: 3 }}>
                      {tier.desc}
                    </Typography>
                  </Box>

                  <Button
                    component={Link}
                    to="/signup"
                    variant={tier.popular ? "contained" : "outlined"}
                    fullWidth
                    size="small"
                    sx={{ fontWeight: 800, py: 1 }}
                  >
                    Select Tier
                  </Button>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 7. Architecture & Developer Ecosystem */}
      <Box sx={{ py: 6, borderY: "1px solid", borderColor: "divider", bgcolor: "action.hover" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ alignItems: "center" }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                <DocsIcon sx={{ color: "primary.main" }} />
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Developer Ecosystem & Built-in OpenAPI Docs
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                Explore comprehensive API specifications, unbundled ERC calculation formulas, telemetry schemas, and database changelogs in our integrated interactive documentation portal.
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: { xs: "left", md: "right" } }}>
              <Button
                component={Link}
                to="/docs"
                variant="contained"
                size="large"
                startIcon={<DocsIcon />}
                sx={{ fontWeight: 800, borderRadius: 1 }}
              >
                Open API Docs
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 8. FAQ Section */}
      <Box id="faq" sx={{ py: { xs: 8, md: 11 }, scrollMarginTop: { xs: "72px", sm: "84px" } }}>
        <Container maxWidth="md">
          <Typography variant="h3" sx={{ fontWeight: 900, textAlign: "center", mb: { xs: 4, md: 6 }, letterSpacing: "-0.02em" }}>
            Frequently Asked Questions
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
                q: "How does the Simulate Appliance and Dual-Tab Calendar work?",
                a: "PowerForecast isolates real telemetry from budget planning. The Actual Tracker tab records verified stopwatch sessions and measured kWh, while the Simulation Plan tab lets you experiment with what-if runtimes, test-run stopwatches, and quota targets without distorting your actual records. Forecasting then blends both to deliver the most accurate month-end bill projection.",
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
            ].map((faq, idx) => (
              <Accordion key={idx} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.25, "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {faq.q}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.7 }}>
                    {faq.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </Container>
      </Box>

      {/* 9. Final Call to Action Banner */}
      <Box sx={{ py: { xs: 8, md: 10 }, bgcolor: "primary.main", color: "primary.contrastText" }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, letterSpacing: "-0.02em" }}>
              Take Total Control of Your Power Bill Today
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: 650, mx: "auto", mb: 4, lineHeight: 1.6 }}>
              Join households across the Philippines tracking their circuits, stopping peak overloads, and computing unbundled Meralco bills with centavo precision.
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
              <Button
                component={Link}
                to="/signup"
                variant="contained"
                size="large"
                sx={{
                  bgcolor: "#ffffff",
                  color: "#1e1b4b",
                  fontWeight: 900,
                  px: 4,
                  py: 1.4,
                  borderRadius: 1,
                  "&:hover": { bgcolor: "#f1f5f9" },
                }}
              >
                Create Free Account
              </Button>
              <Button
                component={Link}
                to="/calculator"
                variant="outlined"
                size="large"
                sx={{
                  borderColor: "rgba(255,255,255,0.7)",
                  color: "#ffffff",
                  fontWeight: 800,
                  px: 3.5,
                  py: 1.4,
                  borderRadius: 1,
                  "&:hover": { borderColor: "#ffffff", bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                Try Unbundled Calculator
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 10. Footer */}
      <Box sx={{ py: 6, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.default" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 4 }}>
            {/* Col 1: Brand */}
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Box component="img" src="/Assets/LOGO.png" alt="PowerForecast Logo" sx={{ width: 32, height: 32, objectFit: "contain" }} />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Power<Box component="span" sx={{ color: "primary.main" }}>Forecast</Box>
                </Typography>
                <Chip label={APP_VERSION} size="small" sx={{ fontFamily: "monospace", fontWeight: 800 }} />
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 2 }}>
                Next-generation Meralco energy intelligence, real-time circuit power telemetry, and ERC unbundled bill forecasting platform for Philippine households.
              </Typography>
            </Grid>

            {/* Col 2: Navigation */}
            <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                Platform Views
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography component={Link} to="/dashboard" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  Live Dashboard
                </Typography>
                <Typography component={Link} to="/calendar" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  Smart Calendar
                </Typography>
                <Typography component={Link} to="/appliances" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  Appliances Hub
                </Typography>
                <Typography component={Link} to="/calculator" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  Unbundled Calculator
                </Typography>
                <Typography component={Link} to="/forecasting" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  Forecast & Anomaly
                </Typography>
              </Box>
            </Grid>

            {/* Col 3: Resources & Docs */}
            <Grid size={{ xs: 6, sm: 4, md: 2.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                Documentation
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography component={Link} to="/docs" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  OpenAPI Specs
                </Typography>
                <Typography component={Link} to="/docs" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  ERC Tariff Formulas
                </Typography>
                <Typography component={Link} to="/docs" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  System Audit Logs
                </Typography>
              </Box>
            </Grid>

            {/* Col 4: Developer & Support */}
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
                Support & Contact
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography component={Link} to="/login" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  Sign In to Household
                </Typography>
                <Typography component={Link} to="/signup" variant="body2" sx={{ color: "text.secondary", textDecoration: "none", "&:hover": { color: "primary.main" } }}>
                  Create Free Account
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              © {new Date().getFullYear()} PowerForecast • Developed by AJ Umali • Built with Refine, React 19, Material UI, and Supabase.
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
              Version {APP_VERSION}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
