import React, { useState, useEffect } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Badge from "@mui/material/Badge";
import Divider from "@mui/material/Divider";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import {
  Menu as MenuIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  AutoAwesome as SparklesIcon,
  Bolt as BoltIcon,
  Logout as LogoutIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  NotificationsNone as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
  HelpOutlined as HelpIcon,
  Settings as SettingsIcon,
  Shield as ShieldIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { checkSupabaseConnection } from "../../lib/supabaseClient";
import { NotificationPopover } from "./NotificationPopover";
import { getNotificationPermission } from "../../lib/notificationService";
import { useTour } from "../../hooks/useTour";
import { ROUTE_TO_TOUR_PAGE } from "../tour/tourSteps";
import { useLanguage } from "../../context/LanguageContext";
import { MeralcoRatePopover } from "./MeralcoRatePopover";

interface HeaderProps {
  onOpenSidebar: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAiScanner?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSidebar,
  isDark,
  onToggleTheme,
  onOpenAiScanner,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { startTour, isActive: isTourActive } = useTour();
  const currentTourPage = ROUTE_TO_TOUR_PAGE[location.pathname] || (location.pathname === "/" ? "dashboard" : null);

  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ ok: boolean; latency?: number }>({ ok: true, latency: 45 });
  const notifPermission = getNotificationPermission();

  // Check Supabase connection health on mount and periodically
  useEffect(() => {
    let isMounted = true;
    const verifyConnection = async () => {
      const res = await checkSupabaseConnection();
      if (isMounted) {
        setDbStatus({ ok: res.ok, latency: res.latencyMs });
      }
    };
    verifyConnection();
    const interval = setInterval(verifyConnection, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Real-time Clock
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backdropFilter: "blur(20px)",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "rgba(23, 25, 29, 0.82)" : "rgba(255, 255, 255, 0.88)",
        color: "text.primary",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 4px 20px rgba(0, 0, 0, 0.3)"
            : "0 2px 12px rgba(15, 23, 42, 0.04)",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          minHeight: { xs: 58, sm: 64 },
          px: { xs: 2, sm: 3, md: 4 },
          gap: 1.5,
        }}
      >
        {/* Left: Mobile Menu Toggle, Back button on Settings, DB Status, and Tariff Indicators */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          {location.pathname === "/settings" ? (
            <Button
              component={Link}
              to="/dashboard"
              startIcon={<ArrowBackIcon />}
              size="small"
              variant="outlined"
              color="primary"
              sx={{
                borderRadius: 1.25,
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.8125rem",
                mr: 0.5,
              }}
            >
              {t("common.backToDashboard", "Back to Dashboard")}
            </Button>
          ) : (
            <IconButton
              color="inherit"
              edge="start"
              onClick={onOpenSidebar}
              sx={{ display: { lg: "none" }, p: 0.75 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Database Connection Status Chip */}
          <Tooltip title={dbStatus.ok ? `Supabase Connected (${dbStatus.latency || 0}ms)` : "Supabase Offline / Local Mode"}>
            <Chip
              icon={
                dbStatus.ok ? (
                  <CloudDoneIcon sx={{ color: "#34d399 !important", fontSize: "15px !important" }} />
                ) : (
                  <CloudOffIcon sx={{ color: "#f87171 !important", fontSize: "15px !important" }} />
                )
              }
              label={dbStatus.ok ? t("header.dbLive", "Supabase Live") : t("header.localMode", "Local Mode")}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: "0.6875rem",
                bgcolor: dbStatus.ok ? "rgba(52, 211, 153, 0.12)" : "rgba(248, 113, 113, 0.12)",
                color: dbStatus.ok ? "#34d399" : "#f87171",
                border: "1px solid",
                borderColor: dbStatus.ok ? "rgba(52, 211, 153, 0.3)" : "rgba(248, 113, 113, 0.3)",
                display: { xs: "none", sm: "inline-flex" },
                height: 26,
              }}
            />
          </Tooltip>

          {/* Meralco Generation Rate Badge & Hover Breakdown Popover */}
          <MeralcoRatePopover />
        </Box>

        {/* Center: Live Time / Date */}
        <Box sx={{ display: { xs: "none", lg: "flex" }, flexDirection: "column", alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.05em", lineHeight: 1.2 }}>
            {timeStr}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", mt: 0.25 }}>
            {dateStr} (GMT+8)
          </Typography>
        </Box>

        {/* Right: AI Scanner CTA, Theme Switch, and User Profile */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          {onOpenAiScanner && (
            <Button
              variant="outlined"
              size="small"
              onClick={onOpenAiScanner}
              startIcon={<SparklesIcon sx={{ color: "#ffd54f" }} />}
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                borderRadius: 1,
                borderColor: "primary.main",
                fontWeight: 700,
                py: 0.5,
              }}
            >
              AI Scanner
            </Button>
          )}

          {/* Guided Tour Replay Button */}
          {currentTourPage && (
            <Tooltip title="Page Tour & Tutorial [?]">
              <IconButton
                onClick={() => startTour(currentTourPage)}
                color="inherit"
                size="small"
                disabled={isTourActive}
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(0, 158, 136, 0.08)",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(0, 158, 136, 0.2)",
                  color: "primary.main",
                  p: 0.75,
                  borderRadius: 1,
                  "&:hover": {
                    bgcolor: "primary.main",
                    color: "#0c1b18",
                    borderColor: "primary.main",
                  },
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <HelpIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* Theme Mode Toggle Button */}
          <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}>
            <IconButton
              onClick={onToggleTheme}
              color="inherit"
              size="small"
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                border: "1px solid",
                borderColor: "divider",
                p: 0.75,
                borderRadius: 2,
              }}
            >
              {isDark ? <SunIcon sx={{ color: "#ffd54f", fontSize: 18 }} /> : <MoonIcon sx={{ color: "#4f46e5", fontSize: 18 }} />}
            </IconButton>
          </Tooltip>

          {/* Smart Energy Notifications Bell */}
          <Tooltip title="Smart Energy Notifications">
            <IconButton
              onClick={(e) => setNotifAnchorEl(e.currentTarget)}
              color="inherit"
              size="small"
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
                border: "1px solid",
                borderColor: "divider",
                p: 0.75,
                borderRadius: 2,
              }}
            >
              <Badge
                variant="dot"
                color={notifPermission === "granted" ? "success" : notifPermission === "denied" ? "error" : "warning"}
                sx={{
                  "& .MuiBadge-badge": {
                    width: 7,
                    height: 7,
                    minWidth: 7,
                  },
                }}
              >
                {notifPermission === "granted" ? (
                  <NotificationsActiveIcon sx={{ color: "primary.main", fontSize: 18 }} />
                ) : (
                  <NotificationsIcon sx={{ color: "text.secondary", fontSize: 18 }} />
                )}
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Profile Pill & Menu */}
          <Box
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: "4px 10px 4px 4px",
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
              border: "1px solid",
              borderColor: "divider",
              cursor: "pointer",
              "&:hover": { borderColor: "primary.main", transform: "translateY(-1px)" },
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <Avatar
              src={identity?.avatar}
              sx={{ width: 28, height: 28, bgcolor: "primary.main", fontSize: "0.75rem", fontWeight: 700 }}
            >
              {identity?.name?.charAt(0) || "U"}
            </Avatar>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                maxWidth: 120,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "block" },
              }}
            >
              {identity?.name || identity?.email?.split("@")[0] || "User"}
            </Typography>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 230,
                  p: 0.75,
                  borderRadius: 1.25,
                  boxShadow: (theme) =>
                    theme.palette.mode === "dark"
                      ? "0 8px 32px rgba(0, 0, 0, 0.5)"
                      : "0 10px 30px rgba(0, 0, 0, 0.12)",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(0, 0, 0, 0.08)",
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(23, 26, 31, 0.98)" : "#ffffff",
                  color: "text.primary",
                  backdropFilter: "blur(20px)",
                },
              },
            }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                {identity?.name || "PowerForecast User"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>
                {identity?.email || "Authenticated Account"}
              </Typography>
              <Chip
                icon={<ShieldIcon sx={{ fontSize: "12px !important", color: "#ffd54f !important" }} />}
                label={t("header.ownerBadge", "Household Owner")}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.625rem",
                  fontWeight: 800,
                  bgcolor: "rgba(255, 213, 79, 0.15)",
                  color: "#ffd54f",
                  border: "1px solid rgba(255, 213, 79, 0.3)",
                }}
              />
            </Box>

            <Divider sx={{ my: 0.75 }} />

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                navigate("/settings");
              }}
              sx={{ gap: 1.25, fontSize: "0.8125rem", fontWeight: 700, borderRadius: 1, py: 0.75, color: "text.primary" }}
            >
              <SettingsIcon fontSize="small" sx={{ color: "primary.main" }} />
              {t("header.settings", "Settings")}
            </MenuItem>

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setIsLogoutConfirmOpen(true);
              }}
              sx={{ gap: 1.25, color: "error.main", fontSize: "0.8125rem", fontWeight: 700, borderRadius: 1, py: 0.75 }}
            >
              <LogoutIcon fontSize="small" />
              {t("header.signOut", "Sign Out")}
            </MenuItem>
          </Menu>

          {/* Sign Out Confirmation Modal */}
          <Dialog
            open={isLogoutConfirmOpen}
            onClose={() => setIsLogoutConfirmOpen(false)}
            maxWidth="xs"
            fullWidth
            slotProps={{
              paper: {
                sx: {
                  borderRadius: 1.5,
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
                  logout();
                }}
                sx={{ fontWeight: 800, borderRadius: 1.25, px: 2 }}
              >
                {t("header.signOut", "Sign Out")}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Smart Notification Preferences Popover */}
          <NotificationPopover
            anchorEl={notifAnchorEl}
            onClose={() => setNotifAnchorEl(null)}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
