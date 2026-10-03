import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Dashboard as DashboardIcon,
  Calculate as CalculatorIcon,
  Bolt as BoltIcon,
  CalendarMonth as CalendarIcon,
  BarChart as AnalyticsIcon,
  VerifiedUser as ShieldIcon,
  Paid as CoinsIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  ChevronRight as ChevronRightIcon,
  HistoryEdu as ChangelogIcon,
  Group as FamilyIcon,
  AdminPanelSettings as HouseholdAdminIcon,
} from "@mui/icons-material";
import { useList, useGetIdentity, useLogout } from "@refinedev/core";
import { UserAppliance } from "../../types";
import { APP_VERSION, checkSupabaseConnection } from "../../lib/supabaseClient";
import { useLanguage } from "../../context/LanguageContext";
import { SystemChangelogModal } from "../changelog/SystemChangelogModal";
import { getMeralcoTariff, MeralcoTariffData, DEFAULT_MERALCO_TARIFF } from "../../lib/meralcoRateService";
import { useHousehold } from "../../context/HouseholdContext";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  activeWattage?: number;
  runningCount?: number;
}

const DRAWER_WIDTH = 260;

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const { isOwner, isFamilyMember, ownerInfo, openHouseholdModal } = useHousehold();

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);

  // Meralco Tariff Telemetry for Mobile Drawer
  const [tariff, setTariff] = useState<MeralcoTariffData>(DEFAULT_MERALCO_TARIFF);
  const [isTariffRefreshing, setIsTariffRefreshing] = useState(false);

  // Supabase Connection Health Status
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; latency?: number }>({ ok: true, latency: 45 });

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];

  // Live 1-second ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Meralco Tariff & DB Status for mobile telemetry
  useEffect(() => {
    let isMounted = true;
    getMeralcoTariff(false).then((data) => {
      if (isMounted) setTariff(data);
    });
    checkSupabaseConnection().then((res) => {
      if (isMounted) setDbStatus({ ok: res.ok, latency: res.latencyMs });
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshTariff = async () => {
    if (isTariffRefreshing) return;
    setIsTariffRefreshing(true);
    try {
      const freshData = await getMeralcoTariff(true);
      setTariff(freshData);
    } finally {
      setIsTariffRefreshing(false);
    }
  };

  const runningAppliances = appliances.filter((a) => a.is_currently_on);
  const activeWattage = runningAppliances.reduce((acc, curr) => acc + curr.watts * (curr.quantity || 1), 0);
  const runningCount = runningAppliances.length;

  const getAccumulatedPesos = (app: UserAppliance) => {
    if (!app.is_currently_on || !app.last_turned_on_at) return 0;
    const start = new Date(app.last_turned_on_at).getTime();
    const diffSeconds = Math.max(0, (now - start) / 1000);
    const totalWatts = app.watts * (app.quantity || 1);
    const accumulatedKwh = (totalWatts / 1000) * (diffSeconds / 3600);
    return accumulatedKwh * 14.8261;
  };

  const totalSessionCost = runningAppliances.reduce((acc, curr) => acc + getAccumulatedPesos(curr), 0);

  // Desktop navigation items (retained in permanent desktop sidebar)
  const navItems = [
    { label: t("nav.dashboard", "Dashboard"), icon: <DashboardIcon fontSize="small" />, path: "/dashboard" },
    { label: t("nav.calculator", "Bill Calculator"), icon: <CalculatorIcon fontSize="small" />, path: "/calculator" },
    { label: t("nav.appliances", "Appliance Hub"), icon: <BoltIcon fontSize="small" />, path: "/appliances" },
    { label: t("nav.calendar", "Smart Calendar"), icon: <CalendarIcon fontSize="small" />, path: "/calendar" },
    { label: t("nav.analytics", "Analytics"), icon: <AnalyticsIcon fontSize="small" />, path: "/analytics" },
    { label: t("nav.forecasting", "Forecasting"), icon: <ShieldIcon fontSize="small" />, path: "/forecasting" },
  ];

  /* -------------------------------------------------------------------------- */
  /*                       DESKTOP PERMANENT DRAWER CONTENT                     */
  /* -------------------------------------------------------------------------- */
  const desktopDrawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      {/* Brand Header */}
      <Box>
        <Box
          component={Link}
          to="/"
          onClick={onClose}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 2.5,
            py: 2.25,
            textDecoration: "none",
            color: "inherit",
            borderBottom: "1px solid",
            borderColor: "divider",
            "&:hover": { bgcolor: "action.hover" },
            transition: "background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <Box
            component="img"
            src="/Assets/LOGO.png"
            alt="PowerForecast Logo"
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(0, 229, 201, 0.4))",
            }}
          />
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.01em",
                color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#0f172a"),
                lineHeight: 1.2,
              }}
            >
              PowerForecast
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                fontSize: "0.6875rem",
                fontWeight: 700,
                mt: 0.25,
                display: "block",
              }}
            >
              Meralco Energy Intel
            </Typography>
          </Box>
        </Box>

        {/* Navigation List */}
        <List sx={{ px: 1.25, py: 1.75 }} data-tour="nav-sidebar">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/");
            return (
              <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive}
                  onClick={onClose}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                    position: "relative",
                    "&.Mui-selected": {
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        left: 0,
                        top: "18%",
                        bottom: "18%",
                        width: 3,
                        borderRadius: "0 4px 4px 0",
                        bgcolor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 34,
                      color: (theme) =>
                        isActive ? (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488") : "text.secondary",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        sx: {
                          fontSize: "0.8125rem",
                          fontWeight: isActive ? 800 : 500,
                          color: (theme) =>
                            isActive
                              ? theme.palette.mode === "dark"
                                ? "#ffffff"
                                : "#0f766e"
                              : "text.secondary",
                          letterSpacing: "-0.01em",
                        },
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}

        </List>
      </Box>

      {/* Live Grid Load Card & Footer */}
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.75,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.88)" : "#f8fafc",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "divider" : "#e2e8f0",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: runningCount > 0 ? "success.main" : "text.disabled",
                  boxShadow: (theme) =>
                    runningCount > 0
                      ? theme.palette.mode === "dark"
                        ? "0 0 8px #00e5c9"
                        : "0 0 8px rgba(5, 150, 105, 0.5)"
                      : "none",
                  transition: "all 0.3s ease",
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                {t("nav.liveLoad", "Live Load")}
              </Typography>
            </Box>
            <Chip
              label={`${runningCount} Active`}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.6875rem",
                fontWeight: 700,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontFamily: "monospace",
                color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#0f172a"),
              }}
            >
              {activeWattage} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>W</Typography>
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
                fontFamily: "monospace",
                fontWeight: 700,
              }}
            >
              ₱{((activeWattage / 1000) * 14.8261).toFixed(2)}/hr
            </Typography>
          </Box>

          {runningCount > 0 && (
            <>
              <Divider sx={{ my: 1, borderColor: "divider" }} />
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <CoinsIcon sx={{ fontSize: 13, color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488") }} />
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                    Session:
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "success.main", fontFamily: "monospace", fontWeight: 700 }}>
                  ₱{totalSessionCost.toFixed(4)}
                </Typography>
              </Box>
            </>
          )}
        </Paper>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <ShieldIcon sx={{ fontSize: 14, color: "success.main" }} />
            <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>
              Supabase Hybrid
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontFamily: "monospace",
              fontSize: "0.6875rem",
              fontWeight: 700,
              color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
            }}
          >
            {APP_VERSION}
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  /* -------------------------------------------------------------------------- */
  /*           MOBILE STREAMLINED RIGHT-SIDE DRAWER CONTENT                     */
  /* -------------------------------------------------------------------------- */
  const mobileDrawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        p: 2,
        gap: 1.75,
        boxSizing: "border-box",
      }}
    >
      {/* 1. Header with Close Button */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.25,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box
          component={Link}
          to="/"
          onClick={onClose}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            textDecoration: "none",
          }}
        >
          <Box
            component="img"
            src="/Assets/LOGO.png"
            alt="PowerForecast Logo"
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(0, 229, 201, 0.4))",
            }}
          />
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                lineHeight: 1.15,
                fontSize: "0.875rem",
              }}
            >
              PowerForecast
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                fontSize: "0.6875rem",
                fontWeight: 700,
                display: "block",
              }}
            >
              Meralco Energy Intel
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close navigation menu"
          sx={{
            p: 0.75,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.04)",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)",
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* 2. User Profile Card & Logout */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 34, 0.9)" : "rgba(241, 245, 249, 0.8)",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Avatar
            src={identity?.avatar}
            sx={{
              width: 44,
              height: 44,
              bgcolor: "primary.main",
              color: "#0c1b18",
              fontWeight: 800,
              fontSize: "1.1rem",
              border: "2px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
              boxShadow: "0 0 12px rgba(0, 229, 201, 0.3)",
            }}
          >
            {identity?.name?.charAt(0) || "U"}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "0.875rem",
              }}
            >
              {identity?.name || "PowerForecast User"}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                fontSize: "0.6875rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {identity?.email || "Authenticated Account"}
            </Typography>
            {isFamilyMember ? (
              <Chip
                icon={<FamilyIcon sx={{ fontSize: "11px !important", color: "#60a5fa !important" }} />}
                label={ownerInfo ? `Member · ${ownerInfo.owner_name}` : "Family Member"}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.625rem",
                  fontWeight: 800,
                  maxWidth: 160,
                  bgcolor: "rgba(96, 165, 250, 0.12)",
                  color: "#60a5fa",
                  border: "1px solid rgba(96, 165, 250, 0.3)",
                  mt: 0.5,
                  '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                }}
              />
            ) : (
              <Chip
                icon={<ShieldIcon sx={{ fontSize: "11px !important", color: "#ffd54f !important" }} />}
                label={t("header.ownerBadge", "Household Owner")}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.625rem",
                  fontWeight: 800,
                  bgcolor: "rgba(255, 213, 79, 0.12)",
                  color: "#ffd54f",
                  border: "1px solid rgba(255, 213, 79, 0.3)",
                  mt: 0.5,
                }}
              />
            )}
          </Box>
        </Box>

        {/* Household Access Button */}
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<HouseholdAdminIcon sx={{ fontSize: 16 }} />}
          onClick={() => { openHouseholdModal(isOwner ? 0 : 1); if (onClose) onClose(); }}
          sx={{
            mb: 1,
            borderRadius: 1.5,
            fontWeight: 700,
            fontSize: "0.75rem",
            py: 0.75,
            textTransform: "none",
            borderColor: isFamilyMember ? "rgba(96, 165, 250, 0.4)" : "rgba(0, 229, 201, 0.35)",
            bgcolor: isFamilyMember ? "rgba(96, 165, 250, 0.08)" : "rgba(0, 229, 201, 0.08)",
            color: isFamilyMember ? "#60a5fa" : "primary.main",
            "&:hover": {
              bgcolor: isFamilyMember ? "rgba(96, 165, 250, 0.16)" : "rgba(0, 229, 201, 0.16)",
              borderColor: isFamilyMember ? "#60a5fa" : "primary.main",
            },
          }}
        >
          {isFamilyMember ? "Household Access" : "Household Access"}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          color="error"
          size="small"
          startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
          onClick={() => setIsLogoutConfirmOpen(true)}
          sx={{
            borderRadius: 1.5,
            fontWeight: 700,
            fontSize: "0.75rem",
            py: 0.75,
            textTransform: "none",
            borderColor: "rgba(239, 68, 68, 0.35)",
            bgcolor: "rgba(239, 68, 68, 0.08)",
            "&:hover": {
              bgcolor: "rgba(239, 68, 68, 0.18)",
              borderColor: "error.main",
            },
          }}
        >
          {t("header.signOut", "Sign Out")}
        </Button>
      </Paper>

      {/* 3. Quick Navigation (Settings, API Docs, Forecasting) */}
      <Box>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: "text.secondary",
            px: 0.5,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontSize: "0.625rem",
          }}
        >
          Navigation & Tools
        </Typography>
        <List disablePadding sx={{ mt: 0.75, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {/* Settings — Household Owner only */}
          {isOwner && <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/settings"
              onClick={onClose}
              sx={{
                borderRadius: 1.5,
                py: 0.85,
                px: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.08)",
                  borderColor: "primary.main",
                },
                transition: "all 0.15s ease",
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                <SettingsIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={t("header.settings", "Settings")}
                secondary="Preferences & App Configuration"
                slotProps={{
                  primary: { sx: { fontSize: "0.8125rem", fontWeight: 700 } },
                  secondary: { sx: { fontSize: "0.6875rem", color: "text.secondary" } },
                }}
              />
              <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            </ListItemButton>
          </ListItem>}

          {/* Forecasting */}
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              to="/forecasting"
              onClick={onClose}
              sx={{
                borderRadius: 1.5,
                py: 0.85,
                px: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
                "&:hover": {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.08)",
                  borderColor: "primary.main",
                },
                transition: "all 0.15s ease",
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
                <ShieldIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary={t("nav.forecasting", "Forecasting")}
                secondary="ML Demand & Tariff Forecasting"
                slotProps={{
                  primary: { sx: { fontSize: "0.8125rem", fontWeight: 700 } },
                  secondary: { sx: { fontSize: "0.6875rem", color: "text.secondary" } },
                }}
              />
              <ChevronRightIcon sx={{ fontSize: 16, color: "text.disabled" }} />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>

      {/* 4. Live Grid Load Card */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 34, 0.88)" : "#f8fafc",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "divider" : "#e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: runningCount > 0 ? "success.main" : "text.disabled",
                boxShadow: (theme) =>
                  runningCount > 0
                    ? theme.palette.mode === "dark"
                      ? "0 0 8px #00e5c9"
                      : "0 0 8px rgba(5, 150, 105, 0.5)"
                    : "none",
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              {t("nav.liveLoad", "Live Load")}
            </Typography>
          </Box>
          <Chip
            label={`${runningCount} Active`}
            size="small"
            sx={{
              height: 20,
              fontSize: "0.6875rem",
              fontWeight: 700,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
              color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontFamily: "monospace",
              color: (theme) => (theme.palette.mode === "dark" ? "#ffffff" : "#0f172a"),
            }}
          >
            {activeWattage} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>W</Typography>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
              fontFamily: "monospace",
              fontWeight: 700,
            }}
          >
            ₱{((activeWattage / 1000) * 14.8261).toFixed(2)}/hr
          </Typography>
        </Box>

        {runningCount > 0 && (
          <>
            <Divider sx={{ my: 1, borderColor: "divider" }} />
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CoinsIcon sx={{ fontSize: 13, color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488") }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                  Active Session:
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "success.main", fontFamily: "monospace", fontWeight: 700 }}>
                ₱{totalSessionCost.toFixed(4)}
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* 5. Meralco Generation Rate Card */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 34, 0.88)" : "#f8fafc",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "divider" : "#e2e8f0",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <BoltIcon sx={{ fontSize: 17, color: "#ffd54f" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Meralco Generation Rate
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleRefreshTariff}
            disabled={isTariffRefreshing}
            sx={{ p: 0.5, borderRadius: 1 }}
            aria-label="Refresh tariff rate"
          >
            <RefreshIcon
              sx={{
                fontSize: 15,
                color: "primary.main",
                animation: isTariffRefreshing ? "spin 0.8s linear infinite" : "none",
                "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
              }}
            />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              fontFamily: "monospace",
              color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
            }}
          >
            ₱{tariff.generationRate.toFixed(4)} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>/kWh</Typography>
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontFamily: "monospace",
              fontSize: "0.6875rem",
              fontWeight: 600,
            }}
          >
            Total: ₱{tariff.totalEffectiveRate.toFixed(4)}/kWh
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem", display: "block", mt: 0.5 }}>
          {tariff.billingPeriod}
        </Typography>
      </Paper>

      {/* 6. System & Version Banner with Changelogs */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          borderRadius: 2,
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 34, 0.88)" : "#f8fafc",
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.2)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                bgcolor: dbStatus.ok ? "success.main" : "warning.main",
                boxShadow: (theme) =>
                  `0 0 8px ${dbStatus.ok ? theme.palette.success.main : theme.palette.warning.main}`,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.6875rem" }}>
              {dbStatus.ok ? `Supabase Cloud (${dbStatus.latency || 45}ms)` : "Local / Offline"}
            </Typography>
          </Box>

          <Chip
            label={APP_VERSION}
            size="small"
            sx={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "0.6875rem",
              height: 20,
              bgcolor: "rgba(0, 229, 201, 0.12)",
              color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
              border: "1px solid rgba(0, 229, 201, 0.3)",
            }}
          />
        </Box>

        {/* View Version Changelogs Button */}
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<ChangelogIcon sx={{ fontSize: 16 }} />}
          onClick={() => setIsChangelogModalOpen(true)}
          sx={{
            mt: 0.75,
            py: 0.75,
            fontSize: "0.75rem",
            fontWeight: 800,
            textTransform: "none",
            borderRadius: 1.5,
            color: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0f766e"),
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.08)",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.3)",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.16)" : "rgba(13, 148, 136, 0.15)",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "#00e5c9" : "#0d9488"),
            },
          }}
        >
          View Version Changelogs
        </Button>
      </Paper>
    </Box>
  );

  return (
    <>
      {/* Mobile Streamlined Drawer - Anchored to the RIGHT */}
      <Drawer
        anchor="right"
        variant="temporary"
        open={isOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", lg: "none" },
          "& .MuiDrawer-paper": {
            width: { xs: "86vw", sm: 340 },
            maxWidth: 360,
            boxSizing: "border-box",
            borderRadius: "16px 0 0 16px",
            borderLeft: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(0, 0, 0, 0.1)",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(20, 23, 28, 0.98)" : "#ffffff",
            backdropFilter: "blur(20px)",
          },
        }}
      >
        {mobileDrawerContent}
      </Drawer>

      {/* Desktop Permanent Drawer - Anchored to the LEFT */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", lg: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
        open
      >
        {desktopDrawerContent}
      </Drawer>

      {/* Mobile Sign Out Confirmation Dialog */}
      <Dialog
        open={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(0, 0, 0, 0.12)",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(23, 26, 31, 0.98)" : "#ffffff",
              color: "text.primary",
              backdropFilter: "blur(20px)",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1.25, color: "text.primary" }}>
          <LogoutIcon sx={{ color: "error.main" }} />
          {t("header.confirmSignOut", "Confirm Sign Out")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {t("header.signOutPrompt", "Are you sure you want to sign out and end your active session on PowerForecast?")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsLogoutConfirmOpen(false)} sx={{ fontWeight: 700 }}>
            {t("header.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setIsLogoutConfirmOpen(false);
              onClose?.();
              logout();
            }}
            sx={{ fontWeight: 800, borderRadius: 1.25, px: 2 }}
          >
            {t("header.signOut", "Sign Out")}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Version Changelogs Modal */}
      <SystemChangelogModal
        isOpen={isChangelogModalOpen}
        onClose={() => setIsChangelogModalOpen(false)}
      />
    </>
  );
};

export default Sidebar;
