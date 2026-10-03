import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import {
  Bolt as BoltIcon,
  Calculate as CalculatorIcon,
  CalendarMonth as CalendarIcon,
  AutoAwesome as SparklesIcon,
  Storage as DatabaseIcon,
  TrendingUp as TrendingUpIcon,
  Speed as SpeedIcon,
  AccessTime as ClockIcon,
  Add as PlusIcon,
  ArrowForward as ArrowForwardIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  AccountBalanceWallet as WalletIcon,
} from "@mui/icons-material";
import { MetricCard } from "../components/common/MetricCard";
import { LivePowerBoard } from "../components/dashboard/LivePowerBoard";
import { ConsumptionDonut } from "../components/dashboard/ConsumptionDonut";
import { TodayActivityTimeline } from "../components/dashboard/TodayActivityTimeline";
import { ApplianceModal } from "../components/appliances/ApplianceModal";
import { PelpCatalogModal } from "../components/appliances/PelpCatalogModal";
import { SpaceManagementModal } from "../components/appliances/SpaceManagementModal";
import { AiVisionScannerModal } from "../components/vision/AiVisionScannerModal";
import { useList } from "@refinedev/core";
import { UserAppliance, ApplianceList, DailyApplianceUsage } from "../types";
import { calculateMeralcoBill } from "../lib/meralcoCalculator";
import { useNotifications } from "../hooks/useNotifications";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../components/common/ToastProvider";
import { formatDateToKey, DEFAULT_EFFECTIVE_RATE } from "../lib/dailyUsageService";
import { getMeralcoTariff, MeralcoTariffData, DEFAULT_MERALCO_TARIFF } from "../lib/meralcoRateService";
import { getEffectiveApplianceRate } from "../lib/sessionService";

export const DashboardPage: React.FC = () => {
  const { t } = useLanguage();
  const { showSuccess } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPelpModalOpen, setIsPelpModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [pendingAddApplianceAfterSpace, setPendingAddApplianceAfterSpace] = useState(false);
  const [selectedSpaceIdForAdd, setSelectedSpaceIdForAdd] = useState<string | null>(null);

  const listResponse = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesResponse = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const todayKey = formatDateToKey(new Date());

  const dailyUsageRes = useList<DailyApplianceUsage>({
    resource: "daily_appliance_usage",
    filters: [{ field: "usage_date", operator: "eq", value: todayKey }],
  }) as any;

  const todayUsageRecords: DailyApplianceUsage[] = dailyUsageRes?.data?.data || dailyUsageRes?.result?.data || [];

  // Meralco Tariff Telemetry
  const [tariff, setTariff] = useState<MeralcoTariffData>(DEFAULT_MERALCO_TARIFF);
  useEffect(() => {
    getMeralcoTariff(false).then((data) => setTariff(data));
  }, []);

  const effectiveRate = tariff.totalEffectiveRate || DEFAULT_EFFECTIVE_RATE;

  const appliances: UserAppliance[] = listResponse?.data?.data || listResponse?.result?.data || [];
  const spaces: ApplianceList[] = spacesResponse?.data?.data || spacesResponse?.result?.data || [];

  // Live 1-second ticker for active running stopwatches
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const hasRunning = appliances.some((a) => a.is_currently_on);
    if (!hasRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [appliances]);

  // Synchronize circuit toggles across views
  useEffect(() => {
    const handleCircuitToggled = () => {
      if (listResponse?.refetch) listResponse.refetch();
      if (dailyUsageRes?.refetch) dailyUsageRes.refetch();
    };
    window.addEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
    return () => window.removeEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
  }, [listResponse, dailyUsageRes]);

  const handleOpenAddModal = () => {
    if (spaces.length === 0) {
      setPendingAddApplianceAfterSpace(true);
      setIsSpaceModalOpen(true);
    } else {
      setSelectedSpaceIdForAdd(spaces[0]?.id || null);
      setIsAddModalOpen(true);
    }
  };

  const activeAppliances = appliances.filter((a: UserAppliance) => a.is_active !== false);
  const runningAppliances = activeAppliances.filter((a: UserAppliance) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce(
    (acc: number, curr: UserAppliance) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  // Today's Measured Spend = saved daily_appliance_usage records today + live running stopwatches
  const liveSessionCost = runningAppliances.reduce((acc, curr) => {
    if (!curr.last_turned_on_at) return acc;
    const start = new Date(curr.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = curr.watts * (curr.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    const rate = getEffectiveApplianceRate(curr);
    return acc + accumulatedKwh * rate;
  }, 0);

  const liveSessionKwh = runningAppliances.reduce((acc, curr) => {
    if (!curr.last_turned_on_at) return acc;
    const start = new Date(curr.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = curr.watts * (curr.quantity || 1);
    return acc + (totalWatts / 1000) * (diffSeconds / 3600);
  }, 0);

  const loggedTodayCost = todayUsageRecords.reduce((acc, curr) => acc + (Number(curr.estimated_cost) || 0), 0);
  const loggedTodayKwh = todayUsageRecords.reduce((acc, curr) => acc + (Number(curr.kwh_consumed) || 0), 0);

  const todayTotalCost = loggedTodayCost + liveSessionCost;
  const todayTotalKwh = loggedTodayKwh + liveSessionKwh;

  const totalMonthlyKwh = activeAppliances.reduce(
    (acc: number, curr: UserAppliance) => acc + (Number(curr.monthly_kwh) || ((curr.watts * curr.hours_per_day * (curr.quantity || 1) * 30) / 1000)),
    0
  );

  // Calculate space-by-space bills and cost split (strictly active appliances)
  const spaceAnalytics = useMemo(() => {
    let resTotalKwh = 0;
    let resTotalBill = 0;
    let comTotalKwh = 0;
    let comTotalBill = 0;

    const breakdownBySpace = spaces.map((space) => {
      const spaceApps = activeAppliances.filter((a) => a.list_id === space.id || (!a.list_id && space.is_default));
      const kwh = spaceApps.reduce((acc, curr) => {
        return acc + (Number(curr.monthly_kwh) || ((curr.watts * curr.hours_per_day * (curr.quantity || 1) * 30) / 1000));
      }, 0);

      const bill = calculateMeralcoBill(kwh, undefined, 0, false, space.tariff_type);

      if (space.tariff_type === "commercial") {
        comTotalKwh += kwh;
        comTotalBill += bill.totalBill;
      } else {
        resTotalKwh += kwh;
        resTotalBill += bill.totalBill;
      }

      return {
        space,
        kwh: Math.round(kwh * 10) / 10,
        bill: bill.totalBill,
        devicesCount: spaceApps.length,
      };
    });

    const consolidatedTotalBill = breakdownBySpace.reduce((acc, curr) => acc + curr.bill, 0);

    return {
      breakdownBySpace,
      consolidatedTotalBill,
      resTotalBill,
      comTotalBill,
      resTotalKwh,
      comTotalKwh,
      resPercent: consolidatedTotalBill > 0 ? (resTotalBill / consolidatedTotalBill) * 100 : 100,
      comPercent: consolidatedTotalBill > 0 ? (comTotalBill / consolidatedTotalBill) * 100 : 0,
    };
  }, [appliances, spaces]);

  // Activate smart energy notification monitors
  useNotifications({
    appliances: activeAppliances,
    projectedBill: spaceAnalytics.consolidatedTotalBill,
  });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3, md: 3.5 } }}>
      {/* 1. Hero Welcome Header Card */}
      <Card
        data-tour="dashboard-hero"
        sx={{
          p: { xs: 2.5, sm: 3.5, md: 4 },
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: { xs: 2.5, md: 3.5 },
          borderRadius: 1.5,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box sx={{ maxWidth: 660 }}>
          <Chip
            icon={<BoltIcon sx={{ color: "#00e5c9 !important", fontSize: "14px !important" }} />}
            label={t("dash.gridTelemetry", "Active Grid Telemetry")}
            size="small"
            sx={{
              mb: 1.5,
              fontWeight: 700,
              fontSize: "0.75rem",
              bgcolor: "rgba(0, 229, 201, 0.12)",
              color: "#00e5c9",
              border: "1px solid rgba(0, 229, 201, 0.3)",
              height: 24,
            }}
          />

          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 0.75 }}>
            {t("dash.title", "Energy & Tariff Dashboard")}
          </Typography>

          <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6, mb: 2.5 }}>
            {t("dash.subtitle", "Real-time household & business telemetry, Meralco unbundled tariff projections, DOE PELP certified inventory, and sub-metering cost split.")}
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
            {spaces.length === 0 ? (
              <Button
                component={Link}
                to="/appliances"
                variant="contained"
                size="small"
                startIcon={<PlusIcon />}
                sx={{ fontWeight: 800 }}
              >
                Create Your First Space
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => setIsAddModalOpen(true)}
                  startIcon={<PlusIcon />}
                >
                  {t("dash.addAppliance", "Add Appliance")}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setIsPelpModalOpen(true)}
                  startIcon={<DatabaseIcon sx={{ color: "primary.light" }} />}
                >
                  {t("dash.pelpCatalog", "PELP Catalog")}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setIsAiScannerOpen(true)}
                  startIcon={<SparklesIcon sx={{ color: "#00e5c9" }} />}
                >
                  {t("dash.aiScanner", "AI Scanner")}
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Live Draw summary pill */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.88)" : "rgba(240, 243, 246, 0.8)",
            border: "1px solid",
            borderColor: "divider",
            minWidth: { xs: "100%", md: 240 },
            textAlign: { xs: "left", md: "right" },
            boxSizing: "border-box",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main", textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
            {t("dash.currentDraw", "CURRENT DRAW LOAD")}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: "monospace", my: 0.5, letterSpacing: "-0.02em" }}>
            {activeWattage} <Typography component="span" variant="body2" sx={{ color: "text.secondary", fontWeight: 600 }}>Watts</Typography>
          </Typography>
          <Typography variant="caption" sx={{ color: "#00e5c9", fontWeight: 700, fontFamily: "monospace", display: "block" }}>
            ₱{((activeWattage / 1000) * effectiveRate).toFixed(2)}/hr {t("dash.runningRate", "running rate")}
          </Typography>
        </Paper>
      </Card>

      {/* 2. Main KPI Stat Cards */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }} data-tour="dashboard-kpi-cards">
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title={t("dash.consolidatedBill", "Consolidated Monthly Bill")}
            value={`₱${spaceAnalytics.consolidatedTotalBill.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            subtitle={spaces.length > 1 ? `${t("dash.combinedAcross", "Combined across")} ${spaces.length} ${t("dash.spaces", "spaces")}` : "Household projected bill"}
            icon={<BoltIcon sx={{ color: "#00e5c9" }} />}
            trend={{ value: `${spaces.length} Spaces`, direction: "neutral" }}
            highlight
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title={t("dash.monthlyVolume", "Monthly Energy Volume")}
            value={`${totalMonthlyKwh.toFixed(1)} kWh`}
            subtitle={t("dash.totalRegistered", "Total registered load")}
            icon={<TrendingUpIcon sx={{ color: "primary.light" }} />}
            trend={{ value: totalMonthlyKwh <= 100 ? "Lifeline" : "Standard", direction: "neutral" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title={t("dash.activeAppliances", "Active Appliances")}
            value={`${runningAppliances.length} / ${appliances.length}`}
            subtitle={t("nav.circuitsOnline", "Circuits online")}
            icon={<SpeedIcon sx={{ color: "success.main" }} />}
            trend={{ value: `${runningAppliances.length} ON`, direction: "up" }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MetricCard
            title={t("dash.todaySpend", "Today's Measured Spend")}
            value={`₱${todayTotalCost.toFixed(2)}`}
            subtitle={`${todayTotalKwh.toFixed(2)} kWh recorded today`}
            icon={<ClockIcon sx={{ color: runningAppliances.length > 0 ? "#00e5c9" : "success.main" }} />}
            trend={{
              value: runningAppliances.length > 0 ? `${runningAppliances.length} Live Active` : `${todayUsageRecords.length} Logged`,
              direction: runningAppliances.length > 0 ? "up" : "neutral",
            }}
          />
        </Grid>
      </Grid>

      {/* 3. Sub-Metering & Space Cost Allocation (When Multiple Spaces Exist) */}
      {spaces.length > 1 && (
        <Card
          data-tour="dashboard-space-split"
          sx={{
            p: { xs: 2.5, sm: 3 },
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.18)" : "rgba(13, 148, 136, 0.18)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ p: 1, borderRadius: 1, bgcolor: "primary.main", color: "#0c1b18", display: "flex" }}>
                <WalletIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Space Sub-Billing & Expense Split
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Cost allocation between residential living and commercial / business operations
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                icon={<HomeIcon sx={{ fontSize: "14px !important" }} />}
                label={`Residential: ₱${spaceAnalytics.resTotalBill.toFixed(2)} (${spaceAnalytics.resPercent.toFixed(0)}%)`}
                color="primary"
                size="small"
                sx={{ fontWeight: 700 }}
              />
              {spaceAnalytics.comTotalBill > 0 && (
                <Chip
                  icon={<StoreIcon sx={{ fontSize: "14px !important" }} />}
                  label={`Commercial: ₱${spaceAnalytics.comTotalBill.toFixed(2)} (${spaceAnalytics.comPercent.toFixed(0)}%)`}
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>

          <LinearProgress
            variant="determinate"
            value={spaceAnalytics.resPercent}
            sx={{
              height: 10,
              borderRadius: 1,
              bgcolor: "secondary.main",
              "& .MuiLinearProgress-bar": {
                bgcolor: "primary.main",
              },
              mb: 2.5,
            }}
          />

          <Grid container spacing={2}>
            {spaceAnalytics.breakdownBySpace.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.space.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.25,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 1.5,
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {item.space.tariff_type === "commercial" ? (
                        <StoreIcon fontSize="small" sx={{ color: "secondary.main" }} />
                      ) : (
                        <HomeIcon fontSize="small" sx={{ color: "primary.main" }} />
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {item.space.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.25, display: "block" }}>
                      {item.devicesCount} devices • {item.kwh} kWh
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: item.space.tariff_type === "commercial" ? "secondary.main" : "primary.main" }}>
                      ₱{item.bill.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                      {item.space.tariff_type === "commercial" ? "General Power" : "230V Stepped"}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Card>
      )}

      {/* 4. Main Grid: Live Power Board & Energy Distribution Donut */}
      <Grid container spacing={{ xs: 2.5, sm: 3 }}>
        <Grid size={{ xs: 12, lg: 8 }} data-tour="dashboard-live-board">
          <LivePowerBoard onOpenAddModal={handleOpenAddModal} />
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }} data-tour="dashboard-donut">
          <ConsumptionDonut appliances={appliances} />
        </Grid>
      </Grid>

      {/* 5. Today's 24-Hour Activity & Load Timeline */}
      <TodayActivityTimeline appliances={appliances} />

      {/* 6. Quick Module Launchpad */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }} data-tour="dashboard-quick-actions">
        {[
          {
            title: "Bill Calculator",
            desc: "Unbundled residential & commercial rate formulas",
            icon: <CalculatorIcon sx={{ color: "#ffd54f" }} />,
            link: "/calculator",
          },
          {
            title: "Appliance Hub",
            desc: "Multi-space inventory & DOE PELP matching",
            icon: <BoltIcon sx={{ color: "primary.light" }} />,
            link: "/appliances",
          },
          {
            title: "Smart Scheduler",
            desc: "Runtime planner & circuit queue",
            icon: <CalendarIcon sx={{ color: "success.light" }} />,
            link: "/calendar",
          },
        ].map((item, idx) => (
          <Grid size={{ xs: 12, sm: 4 }} key={idx}>
            <Card
              component={Link}
              to={item.link}
              sx={{
                p: { xs: 2.25, sm: 2.5 },
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                color: "inherit",
                borderRadius: 1.5,
                "&:hover": {
                  borderColor: "primary.main",
                  transform: "translateY(-2px)",
                },
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "action.hover",
                    border: "1px solid",
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {item.desc}
                  </Typography>
                </Box>
              </Box>
              <ArrowForwardIcon fontSize="small" sx={{ color: "primary.main", flexShrink: 0 }} />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Global Add Appliance Modal */}
      <ApplianceModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedSpaceIdForAdd(null);
        }}
        defaultListId={selectedSpaceIdForAdd || spaces[0]?.id || null}
      />

      {/* Dashboard Space Setup Modal (Opens when no spaces exist or user adds a space) */}
      <SpaceManagementModal
        isOpen={isSpaceModalOpen}
        onClose={() => {
          setIsSpaceModalOpen(false);
          setPendingAddApplianceAfterSpace(false);
        }}
        onCreated={(newSpace) => {
          if (newSpace?.id) {
            showSuccess(`Space "${newSpace.name}" created successfully! Now let's add your first appliance.`);
            if (pendingAddApplianceAfterSpace) {
              setSelectedSpaceIdForAdd(newSpace.id);
              setIsAddModalOpen(true);
              setPendingAddApplianceAfterSpace(false);
            }
          }
        }}
      />
    </Box>
  );
};

export default DashboardPage;
