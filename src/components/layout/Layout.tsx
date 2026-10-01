import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { AiVisionScannerModal } from "../vision/AiVisionScannerModal";
import { DevLogsFloatingWidget } from "../devlogs/DevLogsFloatingWidget";
import { VersionBadge } from "../common/VersionBadge";
import { useColorMode } from "../../theme/AppTheme";
import { TourProvider } from "../tour/TourProvider";
import { useStopwatchMidnightRollover } from "../../hooks/useStopwatchMidnightRollover";

export const Layout: React.FC = () => {
  const location = useLocation();
  const isSettings = location.pathname === "/settings";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const { mode, toggleColorMode } = useColorMode();

  // Continuous background midnight auto-save & rollover for overnight active circuit sessions
  useStopwatchMidnightRollover();

  return (
    <TourProvider>
      <Box
        sx={{
        display: "flex",
        minHeight: "100dvh",
        bgcolor: "background.default",
        color: "text.primary",
        transition: "background-color 0.24s cubic-bezier(0.4, 0, 0.2, 1), color 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Left Navigation Sidebar (Hidden on Settings page) */}
      {!isSettings && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Viewport & Header */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          pl: { xs: 0, lg: isSettings ? 0 : "260px" },
          position: "relative",
          zIndex: 10,
          transition: "padding-left 0.24s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          isDark={mode === "dark"}
          onToggleTheme={toggleColorMode}
          onOpenAiScanner={() => setIsAiScannerOpen(true)}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3, md: 4, lg: 4.5 },
            py: { xs: 2.5, sm: 3.5, md: 4 },
            maxWidth: 1360,
            width: "100%",
            mx: "auto",
            pb: { xs: "calc(110px + env(safe-area-inset-bottom, 20px))", sm: "calc(120px + env(safe-area-inset-bottom, 20px))", lg: 8 },
            boxSizing: "border-box",
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Mobile Bottom Navigation Dock (Visible on Mobile Screens) */}
      {!isSettings && (
        <MobileBottomNav onOpenSidebar={() => setSidebarOpen(true)} />
      )}

      {/* Global Modals & Widgets */}
      <AiVisionScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
      />

      {/* Global Draggable Floating Dev Logs & Telemetry Widget */}
      <DevLogsFloatingWidget />

      {/* Persistent Version Display on Bottom-Right Corner */}
      <VersionBadge />
    </Box>
  </TourProvider>
  );
};

export default Layout;

