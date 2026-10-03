import React, { useState, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  Bolt as BoltIcon,
  Search as SearchIcon,
  Add as PlusIcon,
  Edit as EditIcon,
  Delete as TrashIcon,
  Storage as DatabaseIcon,
  AccessTime as ClockIcon,
  Speed as SpeedIcon,
  DeleteSweep as DeleteSweepIcon,
  Home as HomeIcon,
  Store as StoreIcon,
  Settings as SettingsIcon,
  Create as PenIcon,
  CameraAlt as CameraIcon,
  Refresh as RefreshIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList as ApplianceSpace, STREAMLINED_CATEGORIES } from "../../types";
import { useList, useDelete, useUpdate, useCreate } from "@refinedev/core";
import { ApplianceModal } from "./ApplianceModal";
import { PelpCatalogModal } from "./PelpCatalogModal";
import { SpaceManagementModal } from "./SpaceManagementModal";
import { AiVisionScannerModal } from "../vision/AiVisionScannerModal";
import { useToast } from "../common/ToastProvider";
import { useConfirm } from "../common/ConfirmProvider";
import { devLog } from "../../lib/devLogger";
import { calculateMeralcoBill } from "../../lib/meralcoCalculator";
import { switchOnCircuit, switchOffCircuit, getEffectiveApplianceRate } from "../../lib/sessionService";
import {
  calculateKwh,
  calculateApplianceKwh,
  calculateCost,
  normalizeApplianceCategory,
  isCompressorInverterCategory,
} from "../../lib/dailyUsageService";

interface ApplianceListProps {
  onOpenAiScanner?: () => void;
}

export const ApplianceList: React.FC<ApplianceListProps> = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [activeSpaceId, setActiveSpaceId] = useState<string>("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialTab, setAddModalInitialTab] = useState<number>(0);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [spaceToEdit, setSpaceToEdit] = useState<ApplianceSpace | null>(null);
  const [applianceToEdit, setApplianceToEdit] = useState<UserAppliance | null>(null);

  // First-time space creation form state
  const [initialSpaceName, setInitialSpaceName] = useState("");
  const [initialTariffType, setInitialTariffType] = useState<"residential" | "commercial">("residential");

  const { showSuccess, showInfo, showError } = useToast();
  const { confirm } = useConfirm();

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const spacesRes = useList<ApplianceSpace>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const { mutate: deleteAppliance } = useDelete();
  const { mutate: updateAppliance } = useUpdate();
  const { mutate: createSpace, isLoading: isCreatingSpace } = useCreate();

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceSpace[] = spacesRes?.data?.data || spacesRes?.result?.data || [];

  // Sync activeSpaceId when spaces list changes
  useEffect(() => {
    if (spaces.length > 0) {
      if (!activeSpaceId || !spaces.some((s) => s.id === activeSpaceId)) {
        setActiveSpaceId(spaces[0].id);
      }
    } else {
      setActiveSpaceId("");
    }
  }, [spaces, activeSpaceId]);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) || spaces[0];

  // Live 1-second ticker for running stopwatches
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const hasRunning = appliances.some((a) => a.is_currently_on);
    if (!hasRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [appliances]);

  // Synchronize circuit toggles triggered from Sidebar, Dashboard, or Smart Calendar
  useEffect(() => {
    const handleCircuitToggled = () => {
      if (appliancesRes?.refetch) appliancesRes.refetch();
    };
    window.addEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
    return () => window.removeEventListener("powerforecast_circuit_toggled", handleCircuitToggled);
  }, [appliancesRes]);

  const togglePower = async (app: UserAppliance) => {
    if (app.is_active === false) {
      showError("Appliance is blacklisted. Restore it first to enable the stopwatch.");
      return;
    }

    if (app.is_currently_on) {
      const res = await switchOffCircuit(app);
      if (res.success) {
        showSuccess(`Stopwatch stopped: Logged ${res.durationMinutes}m (~₱${res.cost.toFixed(2)}) for ${app.name}`);
        if (appliancesRes?.refetch) appliancesRes.refetch();
      } else {
        showError(`Failed to stop stopwatch for ${app.name}`);
      }
    } else {
      const res = await switchOnCircuit(app);
      if (res.success) {
        showSuccess(`Stopwatch started for ${app.name}! Real-time energy tracking active.`);
        if (appliancesRes?.refetch) appliancesRes.refetch();
      } else {
        showError(`Failed to start stopwatch for ${app.name}`);
      }
    }
  };

  const getRunningDuration = (turnedOnAt?: string | null) => {
    if (!turnedOnAt) return "00:00:00";
    const start = new Date(turnedOnAt).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
    const hrs = String(Math.floor(diffSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((diffSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(diffSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const getLiveSpent = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    const rate = getEffectiveApplianceRate(app);
    return accumulatedKwh * rate;
  };

  // First-time space submission handler
  const handleCreateInitialSpace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialSpaceName.trim()) {
      showError("Please enter a name for your space.");
      return;
    }

    createSpace(
      {
        resource: "appliance_lists",
        values: {
          name: initialSpaceName.trim(),
          tariff_type: initialTariffType,
          is_default: true,
        },
      },
      {
        onSuccess: (data: any) => {
          const newId = data?.data?.id;
          if (newId) setActiveSpaceId(newId);
          setInitialSpaceName("");
          showSuccess(`Space "${initialSpaceName.trim()}" created! You can now add appliances.`);
        },
      }
    );
  };

  // Filter appliances strictly to the active space with smart fallback for unassigned or orphaned spaces
  const currentSpaceAppliances = useMemo(() => {
    if (!activeSpace) return appliances;
    const hasDefault = spaces.some((s) => s.is_default);
    const isSingleSpace = spaces.length <= 1;

    return appliances.filter((app) => {
      // Direct space ID match
      if (app.list_id && app.list_id === activeSpace.id) return true;
      // If appliance has no list_id OR points to a space that doesn't exist, show in default or primary space
      const spaceExists = app.list_id ? spaces.some((s) => s.id === app.list_id) : false;
      if (!app.list_id || !spaceExists) {
        if (activeSpace.is_default) return true;
        if (isSingleSpace) return true;
        if (!hasDefault && activeSpace.id === spaces[0]?.id) return true;
      }
      return false;
    });
  }, [appliances, activeSpace, spaces]);

  const filteredAppliances = useMemo(() => {
    return currentSpaceAppliances.filter((app: UserAppliance) => {
      const appName = String(app.name || "");
      const appBrand = String(app.brand || "");
      const appModel = String(app.model || "");
      const appCategory = String(app.category || "");
      const appRoom = String(app.room_location || "");
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        appName.toLowerCase().includes(q) ||
        appBrand.toLowerCase().includes(q) ||
        appModel.toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "all" ||
        normalizeApplianceCategory(appCategory, appName, appModel) === selectedCategory ||
        appCategory.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesRoom =
        selectedRoom === "all" || appRoom.toLowerCase() === selectedRoom.toLowerCase();

      return matchesSearch && matchesCategory && matchesRoom;
    });
  }, [currentSpaceAppliances, searchQuery, selectedCategory, selectedRoom]);

  // Space-specific stats (excluding blacklisted / inactive appliances)
  const activeSpaceAppliances = currentSpaceAppliances.filter((a) => a.is_active !== false);
  const blacklistedCount = currentSpaceAppliances.filter((a) => a.is_active === false).length;

  const spaceTotalWatts = activeSpaceAppliances.reduce(
    (acc, curr) => acc + curr.watts * (curr.quantity || 1),
    0
  );

  const spaceMonthlyKwh = activeSpaceAppliances.reduce((acc, curr) => {
    const w = Number(curr.watts) || 0;
    const h = Number(curr.hours_per_day) || 0;
    const q = Number(curr.quantity) || 1;
    const d = Number(curr.days_per_month) || 30;
    const kwh = Number(curr.monthly_kwh) > 0 ? Number(curr.monthly_kwh) : (w * h * q * d) / 1000;
    return acc + kwh;
  }, 0);

  const spaceTariffType = activeSpace?.tariff_type || "residential";
  const spaceBillCalc = calculateMeralcoBill(spaceMonthlyKwh, undefined, 0, false, spaceTariffType);

  const handleToggleBlacklist = async (app: UserAppliance) => {
    const isCurrentlyBlacklisted = app.is_active === false;
    const willBeBlacklisted = !isCurrentlyBlacklisted;

    // If appliance is currently active and will be blacklisted, de-energize and save its session first
    if (willBeBlacklisted && app.is_currently_on) {
      await switchOffCircuit(app);
    }

    updateAppliance(
      {
        resource: "user_appliances",
        id: app.id,
        values: {
          is_active: !willBeBlacklisted,
          ...(willBeBlacklisted ? { is_currently_on: false, last_turned_on_at: null } : {}),
        },
      },
      {
        onSuccess: () => {
          if (willBeBlacklisted) {
            showInfo(`"${app.name}" blacklisted from Smart Calendar & Forecasting calculations.`);
          } else {
            showSuccess(`"${app.name}" restored to active Forecasting & Smart Calendar.`);
          }
        },
        onError: (err: any) => {
          showError(`Failed to update appliance status: ${err?.message || "Unknown error"}`);
        },
      }
    );
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: "Clear All Registered Appliances?",
      message: `Are you sure you want to remove all ${currentSpaceAppliances.length} appliance(s) from "${activeSpace?.name}"?`,
      detail: "This action cannot be undone. You will need to re-add your appliances manually or from the PELP catalog.",
      itemName: activeSpace?.name,
      confirmText: "Yes, Clear All",
      cancelText: "Cancel",
      severity: "error",
    });

    if (!ok) return;

    currentSpaceAppliances.forEach((a) => deleteAppliance({ resource: "user_appliances", id: a.id }));
    showInfo(`Cleared all appliances in ${activeSpace?.name}.`);
  };

  // -------------------------------------------------------------
  // 1. FIRST-TIME ONBOARDING (ZERO SPACES GATE)
  // -------------------------------------------------------------
  if (spaces.length === 0) {
    return (
      <Box sx={{ maxWidth: 640, mx: "auto", py: { xs: 4, sm: 6 } }}>
        <Card sx={{
          p: { xs: 3, sm: 4.5 },
          borderRadius: 1.5,
          textAlign: "center",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
        }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "rgba(0, 229, 201, 0.15)",
              color: "primary.main",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <BoltIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: "-0.02em" }}>
            Welcome to Appliances Hub
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 3.5, lineHeight: 1.6 }}>
            Organize your appliances into physical spaces (such as your Main Residence, Bakery, or Rental Unit) for exact sub-metering and unbundled tariff calculations.
          </Typography>

          <form onSubmit={handleCreateInitialSpace}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, textAlign: "left" }}>
              <TextField
                label="Space Name"
                placeholder="e.g. Main Residence or Cafe Store"
                value={initialSpaceName}
                onChange={(e) => setInitialSpaceName(e.target.value)}
                required
                fullWidth
              />

              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                  Select Tariff Classification
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Paper
                      variant="outlined"
                      onClick={() => setInitialTariffType("residential")}
                      sx={{
                        p: 2,
                        borderRadius: 1.25,
                        cursor: "pointer",
                        textAlign: "center",
                        border: "1px solid",
                        borderColor: (theme) =>
                          initialTariffType === "residential"
                            ? theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(13, 148, 136, 0.35)"
                            : "divider",
                        bgcolor: (theme) =>
                          initialTariffType === "residential"
                            ? theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.06)" : "rgba(13, 148, 136, 0.05)"
                            : "transparent",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.45)" : "rgba(13, 148, 136, 0.45)",
                        },
                      }}
                    >
                      <HomeIcon sx={{ color: initialTariffType === "residential" ? "primary.main" : "text.secondary", fontSize: 28, mb: 0.5 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: initialTariffType === "residential" ? "primary.main" : "text.primary" }}>
                        Residential
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem", mt: 0.5 }}>
                        230V Stepped Tiers & Lifeline
                      </Typography>
                    </Paper>
                  </Grid>

                  <Grid size={6}>
                    <Paper
                      variant="outlined"
                      onClick={() => setInitialTariffType("commercial")}
                      sx={{
                        p: 2,
                        borderRadius: 1.25,
                        cursor: "pointer",
                        textAlign: "center",
                        border: "1px solid",
                        borderColor: (theme) =>
                          initialTariffType === "commercial"
                            ? theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.4)" : "rgba(225, 29, 72, 0.35)"
                            : "divider",
                        bgcolor: (theme) =>
                          initialTariffType === "commercial"
                            ? theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.06)" : "rgba(244, 63, 94, 0.04)"
                            : "transparent",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          borderColor: (theme) =>
                            theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.55)" : "rgba(225, 29, 72, 0.45)",
                        },
                      }}
                    >
                      <StoreIcon sx={{ color: initialTariffType === "commercial" ? "secondary.main" : "text.secondary", fontSize: 28, mb: 0.5 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: initialTariffType === "commercial" ? "secondary.main" : "text.primary" }}>
                        Commercial
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem", mt: 0.5 }}>
                        General Power Flat Rate
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={isCreatingSpace}
                startIcon={<PlusIcon />}
                sx={{ py: 1.5, borderRadius: 2.5, fontWeight: 800, mt: 1 }}
              >
                {isCreatingSpace ? "Creating Space..." : "Create Space & Start Adding Appliances"}
              </Button>
            </Box>
          </form>
        </Card>
      </Box>
    );
  }

  // -------------------------------------------------------------
  // 2. BENTO-STYLE MULTI-SPACE HUB (ACTIVE SPACE VIEW)
  // -------------------------------------------------------------
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
      {/* Bento Row 1: Space Switcher Bar & Add Space */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5 }}>
        <Tabs
          data-tour="appliance-space-tabs"
          value={activeSpaceId}
          onChange={(_, val) => setActiveSpaceId(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              minHeight: 44,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
              px: 2.25,
              mr: 1,
            },
          }}
        >
          {spaces.map((s) => {
            const count = appliances.filter((a) => {
              if (a.list_id && a.list_id === s.id) return true;
              if (!a.list_id) {
                if (s.is_default) return true;
                if (spaces.length <= 1) return true;
                if (!spaces.some((sp) => sp.is_default) && s.id === spaces[0]?.id) return true;
              }
              return false;
            }).length;
            return (
              <Tab
                key={s.id}
                value={s.id}
                icon={s.tariff_type === "commercial" ? <StoreIcon fontSize="small" /> : <HomeIcon fontSize="small" />}
                iconPosition="start"
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{s.name}</span>
                    <Chip
                      label={count}
                      size="small"
                      color="primary"
                      variant={activeSpaceId === s.id ? "filled" : "outlined"}
                      sx={{ height: 18, minWidth: 22, fontSize: "0.625rem", fontWeight: 800 }}
                    />
                    <Chip
                      label={s.tariff_type === "commercial" ? "Commercial" : "Residential"}
                      size="small"
                      color={s.tariff_type === "commercial" ? "secondary" : "default"}
                      sx={{ height: 18, fontSize: "0.625rem", fontWeight: 800 }}
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            color="secondary"
            startIcon={<PlusIcon />}
            onClick={() => {
              setSpaceToEdit(null);
              setIsSpaceModalOpen(true);
            }}
            sx={{ borderRadius: 2, fontWeight: 800 }}
          >
            Add Space
          </Button>
        </Box>
      </Box>

      {/* Bento Row 2: Active Space Banner Tile */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 1.5,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(20, 23, 27, 0.95) 0%, rgba(26, 30, 35, 0.9) 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #f4f6ff 100%)",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.18)" : "rgba(13, 148, 136, 0.18)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2.5,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 1.25,
                bgcolor: spaceTariffType === "commercial" ? "secondary.main" : "primary.main",
                color: spaceTariffType === "commercial" ? "#ffffff" : "#0c1b18",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(0, 229, 201, 0.3)",
                flexShrink: 0,
              }}
            >
              {spaceTariffType === "commercial" ? <StoreIcon sx={{ color: "#ffffff" }} /> : <HomeIcon sx={{ color: "#0c1b18" }} />}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: "-0.02em" }}>
                {activeSpace?.name}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {spaceTariffType === "commercial"
                  ? "Commercial General Power Tariff • Flat distribution & commercial metering"
                  : "Residential 230V Tariff • Stepped distribution tiers & Lifeline subsidy"}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
          <Chip
            icon={<SpeedIcon sx={{ color: "#00e5c9 !important" }} />}
            label={`Load: ${spaceTotalWatts} W`}
            sx={{ fontWeight: 800, bgcolor: "rgba(0, 229, 201, 0.08)", border: "1px solid rgba(0, 229, 201, 0.25)", color: "#00e5c9" }}
          />
          <Chip
            label={`${activeSpaceAppliances.length} Active${blacklistedCount > 0 ? ` • ${blacklistedCount} Excluded` : " Appliances"}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          {blacklistedCount > 0 && (
            <Tooltip title={`${blacklistedCount} appliance(s) are currently blacklisted and excluded from Smart Calendar and Forecasting calculations.`}>
              <Chip
                icon={<BlockIcon sx={{ fontSize: "14px !important", color: "#f59e0b !important" }} />}
                label={`${blacklistedCount} Blacklisted`}
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.12)" : "rgba(245, 158, 11, 0.08)"),
                  color: (theme) => (theme.palette.mode === "dark" ? "#fbbf24" : "#b45309"),
                  border: "1px solid",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.35)" : "rgba(245, 158, 11, 0.3)"),
                }}
              />
            </Tooltip>
          )}
          <Chip
            label={`₱${spaceBillCalc.totalBill.toFixed(2)} / mo`}
            color={spaceTariffType === "commercial" ? "secondary" : "default"}
            sx={{ fontWeight: 800, fontFamily: "monospace" }}
          />
          <Button
            data-tour="appliance-space-manage"
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => {
              setSpaceToEdit(activeSpace);
              setIsSpaceModalOpen(true);
            }}
            sx={{ borderRadius: 1, fontWeight: 700 }}
          >
            Configure
          </Button>
          {spaces.length > 1 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<TrashIcon />}
              onClick={() => {
                setSpaceToEdit(activeSpace);
                setIsSpaceModalOpen(true);
              }}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Delete Space
            </Button>
          )}
          {currentSpaceAppliances.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearAll}
              sx={{ borderRadius: 1, fontWeight: 700 }}
            >
              Clear All
            </Button>
          )}
        </Box>
      </Card>

      {/* Bento Row 3: Unified Add Appliance Action Bar */}
      <Paper
        variant="outlined"
        data-tour="appliance-add-buttons"
        sx={{
          p: 2.25,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.03)" : "rgba(0, 158, 136, 0.02)",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.15)",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(13, 148, 136, 0.35)",
            boxShadow: "0 4px 20px rgba(0, 229, 201, 0.08)",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<PlusIcon />}
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(0);
              setIsAddModalOpen(true);
            }}
            sx={{
              fontWeight: 800,
              px: 3,
              py: 1.1,
              borderRadius: 1.25,
              boxShadow: "0 4px 16px rgba(0, 229, 201, 0.25)",
              fontSize: "0.9375rem",
              textTransform: "none",
            }}
          >
            + Add Appliance
          </Button>
          <Box sx={{ display: { xs: "none", md: "block" } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Add custom devices, import from 12k+ certified PELP models, or scan energy stickers
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
              Choose from Manual Entry, Official DOE PELP Database, or AI Vision Camera Scan
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip
            icon={<PenIcon sx={{ fontSize: "14px !important" }} />}
            label="Manual"
            size="small"
            variant="outlined"
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(0);
              setIsAddModalOpen(true);
            }}
            sx={{ cursor: "pointer", fontWeight: 600 }}
          />
          <Chip
            icon={<DatabaseIcon sx={{ fontSize: "14px !important" }} />}
            label="PELP Catalog"
            size="small"
            variant="outlined"
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(1);
              setIsAddModalOpen(true);
            }}
            sx={{ cursor: "pointer", fontWeight: 600 }}
          />
          <Chip
            icon={<CameraIcon sx={{ fontSize: "14px !important" }} />}
            label="AI Scan"
            size="small"
            color="primary"
            variant="outlined"
            onClick={() => {
              setApplianceToEdit(null);
              setAddModalInitialTab(2);
              setIsAddModalOpen(true);
            }}
            sx={{ cursor: "pointer", fontWeight: 700 }}
          />
        </Box>
      </Paper>

      {/* Bento Row 4: Search & Filters */}
      <Box data-tour="appliance-filters" sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2, alignItems: "center", justifyContent: "space-between" }}>
        <TextField

          size="small"
          placeholder="Search appliances in this space..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: { xs: "100%", sm: 340 } }}
        />

        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", width: { xs: "100%", sm: "auto" } }}>
          <TextField
            select
            size="small"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="all">All Categories</MenuItem>
            {STREAMLINED_CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </TextField>

          <Tooltip title="Sync & Refresh from Database">
            <IconButton
              size="small"
              onClick={() => {
                if (appliancesRes?.refetch) appliancesRes.refetch();
                if (spacesRes?.refetch) spacesRes.refetch();
                showInfo("Syncing appliances with Supabase database...");
              }}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.25, p: 0.9 }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Bento Row 5: Space Appliances Grid */}
      <Grid container spacing={{ xs: 2, sm: 2.5 }}>
        {filteredAppliances.length === 0 ? (
          <Grid size={12}>
            <Paper sx={{ p: 6, textAlign: "center", borderRadius: 1.25, border: "1px dashed", borderColor: "divider" }}>
              <BoltIcon sx={{ fontSize: 48, opacity: 0.3, mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                No appliances in "{activeSpace?.name}" yet.
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                Use the "+ Add Appliance" button above to add custom devices, import from the certified DOE PELP database, or scan energy stickers with AI.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          filteredAppliances.map((app: UserAppliance, appIdx: number) => {
            const isBlacklisted = app.is_active === false;
            const w = Number(app.watts) || 0;
            const h = Number(app.hours_per_day) || 0;
            const q = Number(app.quantity) || 1;
            const d = Number(app.days_per_month) || 30;

            const supportsInverter = isCompressorInverterCategory(app.category);
            const isInverter = supportsInverter && Boolean(
              app.is_inverter === true ||
              (app.energy_rating && /inverter/i.test(app.energy_rating)) ||
              (app.name && /inverter/i.test(app.name)) ||
              (app.model && /inverter/i.test(app.model)) ||
              (app.ai_metadata?.is_inverter === true)
            );

            const dailyKwh = calculateApplianceKwh(app, h);
            const monthlyKwh = Number(app.monthly_kwh) > 0 ? Number(app.monthly_kwh) : Number((dailyKwh * d).toFixed(2));

            // Calculate deterministic unbundled monthly cost with this space's tariff
            const appBill = calculateMeralcoBill(monthlyKwh, undefined, 0, false, spaceTariffType);
            const monthlyCost = appBill.totalBill;
            const isFridge = (app.category || "").toLowerCase().includes("refrigerat") || (app.category || "").toLowerCase().includes("freezer") || (app.category || "").toLowerCase().includes("chiller");
            const isWasher = (app.category || "").toLowerCase().includes("wash") || (app.category || "").toLowerCase().includes("laundry");
            const customCruising = app.cruising_watts ?? app.ai_metadata?.cruising_watts;
            const isCustomCruising = customCruising !== undefined && customCruising !== null && Number(customCruising) > 0;
            const defaultCruisingWatts = isFridge
              ? Math.round(w / 3)
              : isWasher
                ? Math.round(w * 0.50)
                : Math.round(w * 0.42);
            const cruisingWatts = isCustomCruising ? Number(customCruising) : defaultCruisingWatts;
            const effectiveWatts = isFridge
              ? cruisingWatts
              : h > 0
                ? Math.round((dailyKwh * 1000) / h)
                : (isInverter ? cruisingWatts : w);
            const hourlyRate = (effectiveWatts / 1000) * (appBill.effectiveRatePerKwh || 14.82);

            const isOn = Boolean(app.is_currently_on);
            const liveSpent = getLiveSpent(app);

            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={app.id}>
                <Card
                  data-tour={appIdx === 0 ? "appliance-card" : undefined}
                  sx={{
                    p: { xs: 2.25, sm: 2.5 },
                    borderRadius: 1.5,
                    border: isBlacklisted ? "1px dashed" : "1px solid",
                    borderColor: (theme) =>
                      isBlacklisted
                        ? theme.palette.mode === "dark"
                          ? "rgba(245, 158, 11, 0.45)"
                          : "rgba(217, 119, 6, 0.4)"
                        : isOn
                          ? theme.palette.mode === "dark"
                            ? "#00e5c9"
                            : "#0d9488"
                          : theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.06)"
                            : "#e2e8f0",
                    bgcolor: (theme) =>
                      isBlacklisted
                        ? theme.palette.mode === "dark"
                          ? "rgba(22, 24, 28, 0.88)"
                          : "rgba(254, 243, 199, 0.12)"
                        : isOn
                          ? theme.palette.mode === "dark"
                            ? "rgba(0, 229, 201, 0.05)"
                            : "rgba(13, 148, 136, 0.04)"
                          : theme.palette.mode === "dark"
                            ? "rgba(20, 24, 28, 0.75)"
                            : "background.paper",
                    boxShadow: (theme) =>
                      isOn
                        ? theme.palette.mode === "dark"
                          ? "0 0 16px rgba(0, 229, 201, 0.25)"
                          : "0 0 16px rgba(13, 148, 136, 0.2)"
                        : "none",
                    opacity: isBlacklisted ? 0.82 : 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      borderColor: (theme) =>
                        isBlacklisted
                          ? theme.palette.mode === "dark"
                            ? "rgba(245, 158, 11, 0.7)"
                            : "rgba(217, 119, 6, 0.6)"
                          : isOn
                            ? theme.palette.mode === "dark"
                              ? "#00e5c9"
                              : "#0d9488"
                            : theme.palette.mode === "dark"
                              ? "rgba(0, 229, 201, 0.45)"
                              : "rgba(13, 148, 136, 0.4)",
                      transform: "translateY(-3px)",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(0, 229, 201, 0.12)"
                          : "0 8px 24px rgba(13, 148, 136, 0.12)",
                    },
                  }}
                >
                  <Box>
                    {/* Top Row: Category, Blacklist badge, Room Tag & Start Stopwatch Button */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, gap: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                        <Chip
                          label={app.category}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark"
                                ? "rgba(0, 229, 201, 0.1)"
                                : "rgba(13, 148, 136, 0.08)",
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#00e5c9" : "#0f766e",
                          }}
                        />
                        {isBlacklisted && (
                          <Tooltip title="Blacklisted: Excluded from Smart Calendar, Forecasting, and Monthly Projections.">
                            <Chip
                              icon={<BlockIcon sx={{ fontSize: "13px !important", color: "#f59e0b !important" }} />}
                              label="Blacklisted"
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.6875rem",
                                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.16)" : "rgba(245, 158, 11, 0.1)"),
                                color: (theme) => (theme.palette.mode === "dark" ? "#fbbf24" : "#b45309"),
                                border: "1px solid",
                                borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(245, 158, 11, 0.4)" : "rgba(245, 158, 11, 0.3)"),
                              }}
                            />
                          </Tooltip>
                        )}
                        {app.room_location && (
                          <Chip
                            label={app.room_location}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.6875rem",
                              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "#cbd5e1"),
                              color: "text.secondary",
                            }}
                          />
                        )}
                      </Box>

                      {/* Start / Stop Live Stopwatch Button */}
                      <Tooltip
                        title={
                          isBlacklisted
                            ? "Appliance is blacklisted — click restore below to enable stopwatch"
                            : isOn
                            ? "Stop Live Stopwatch (Auto-logs duration and energy into today's session records)"
                            : "Start Live Stopwatch (Track real-time energy & cost)"
                        }
                      >
                        <span>
                          <Button
                            size="small"
                            variant={isOn ? "contained" : "outlined"}
                            color={isOn ? "error" : "primary"}
                            disabled={isBlacklisted}
                            onClick={() => togglePower(app)}
                            startIcon={
                              isOn ? (
                                <ClockIcon sx={{ fontSize: "14px !important" }} />
                              ) : (
                                <BoltIcon sx={{ fontSize: "14px !important" }} />
                              )
                            }
                            sx={{
                              py: 0.3,
                              px: 1.2,
                              minHeight: 28,
                              fontSize: "0.7rem",
                              fontWeight: 800,
                              borderRadius: 1.5,
                              textTransform: "none",
                              ...(isOn
                                ? {
                                    bgcolor: "#ef4444",
                                    color: "#ffffff",
                                    boxShadow: "0 0 10px rgba(239, 68, 68, 0.45)",
                                    "&:hover": { bgcolor: "#dc2626" },
                                  }
                                : {
                                    borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.4)" : "#0d9488"),
                                    color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                                    bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)"),
                                    "&:hover": {
                                      bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.12)"),
                                    },
                                  }),
                            }}
                          >
                            {isOn ? "Stop" : "Start"}
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>

                    {/* Appliance Name & Details */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                      {app.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {app.brand ? `${app.brand} • ` : ""}{app.model || app.room_location || "General"}
                    </Typography>

                    {/* Stats Badges */}
                    <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                      {isInverter ? (
                        <>
                          <Tooltip title={`Inverter Cruising: ~${cruisingWatts}W ${isFridge ? "steady continuous maintenance (1/3 duty cycle)" : "maintenance mode after cooldown"}${isCustomCruising ? " (Custom User Override)" : ""}`}>
                            <Chip
                              icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#00e5c9 !important" }} />}
                              label={`Inverter (${isCustomCruising ? `Custom ~${cruisingWatts}W` : `~${cruisingWatts}W avg`})`}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: "0.6875rem",
                                bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                                color: (theme) => theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488",
                                border: "1px solid",
                                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
                              }}
                            />
                          </Tooltip>
                          <Chip
                            label={`Peak ${app.watts}W`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
                          />
                        </>
                      ) : (
                        <Chip
                          icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#ffd54f !important" }} />}
                          label={`${app.watts} W`}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      )}
                      {app.quantity > 1 && (
                        <Chip
                          label={`Qty: ${app.quantity}`}
                          size="small"
                          sx={{ fontWeight: 700 }}
                        />
                      )}
                      <Chip
                        label={`${app.hours_per_day}h/day`}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Monthly estimated cost */}
                    <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1 }}>
                      <Box>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          Monthly Cost ({spaceTariffType === "commercial" ? "Commercial" : "Residential"})
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main", letterSpacing: "-0.01em" }}>
                          ₱{monthlyCost.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          Energy Load
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                          {monthlyKwh.toFixed(1)} kWh/mo
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Card Footer with Rate & Actions */}
                  <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {isOn ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "success.main" }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: "success.main",
                            boxShadow: "0 0 8px #00e5c9",
                            animation: "pulse 1.5s infinite",
                          }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 800, fontFamily: "monospace", fontSize: "0.75rem" }}>
                          {getRunningDuration(app.last_turned_on_at)} <span style={{ opacity: 0.8 }}>• ₱{liveSpent.toFixed(4)}</span>
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                        ₱{hourlyRate.toFixed(2)}/hr rate
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {/* Blacklist / Exclude Toggle Action */}
                      <Tooltip
                        title={
                          isBlacklisted
                            ? "Restore appliance to Forecast & Calendar calculations"
                            : "Blacklist appliance (Exclude from Calendar & Forecast)"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleToggleBlacklist(app)}
                          sx={{
                            color: isBlacklisted ? "#f59e0b" : "text.secondary",
                            bgcolor: isBlacklisted
                              ? (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(245, 158, 11, 0.16)"
                                  : "rgba(245, 158, 11, 0.1)"
                              : "transparent",
                            border: isBlacklisted ? "1px solid rgba(245, 158, 11, 0.35)" : "none",
                            "&:hover": {
                              bgcolor: isBlacklisted ? "rgba(245, 158, 11, 0.25)" : "action.hover",
                              color: isBlacklisted ? "#fbbf24" : "warning.main",
                            },
                          }}
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Edit Appliance">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setApplianceToEdit(app);
                            setIsAddModalOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete Appliance">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Delete Appliance?",
                              message: `Are you sure you want to remove "${app.name}" (${app.watts}W)?`,
                              detail: "Historical usage data and saved session logs for this device will remain archived in your audit records.",
                              itemName: `${app.name} • ${app.category || "General"}`,
                              confirmText: "Yes, Delete",
                              cancelText: "Cancel",
                              severity: "error",
                            });
                            if (ok) {
                              deleteAppliance({ resource: "user_appliances", id: app.id });
                              showInfo(`Removed ${app.name}`);
                            }
                          }}
                        >
                          <TrashIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            );
          })
        )}
      </Grid>

      {/* Unified Add/Edit Appliance Modal with 3 Tabs */}
      {isAddModalOpen && (
        <ApplianceModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setApplianceToEdit(null);
            if (appliancesRes?.refetch) appliancesRes.refetch();
            if (spacesRes?.refetch) spacesRes.refetch();
          }}
          applianceToEdit={applianceToEdit}
          defaultListId={activeSpace?.id || null}
          initialTab={addModalInitialTab}
        />
      )}

      {/* Space Management Modal */}
      {isSpaceModalOpen && (
        <SpaceManagementModal
          isOpen={isSpaceModalOpen}
          onClose={() => {
            setIsSpaceModalOpen(false);
            setSpaceToEdit(null);
          }}
          spaceToEdit={spaceToEdit}
          canDelete={spaces.length > 1}
          fallbackSpace={spaces.find((s) => s.id !== (spaceToEdit?.id || activeSpace?.id)) || spaces[0]}
          onDeleted={(deletedId) => {
            const nextSpace = spaces.find((s) => s.id !== deletedId);
            if (nextSpace) {
              setActiveSpaceId(nextSpace.id);
            }
            if (spacesRes?.refetch) spacesRes.refetch();
            if (appliancesRes?.refetch) appliancesRes.refetch();
            showInfo("Space deleted and appliances reassigned.");
          }}
        />
      )}
    </Box>
  );
};

export default ApplianceList;
