import React, { useState, useEffect } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, {
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { resilientDataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
import { supabaseClient } from "./lib/supabaseClient";
import { Layout } from "./components/layout/Layout";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CalculatorPage } from "./pages/CalculatorPage";
import { AppliancesPage } from "./pages/AppliancesPage";
import { CalendarPage } from "./pages/CalendarPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { ForecastingPage } from "./pages/ForecastingPage";
import { ApiDocsPage } from "./pages/ApiDocsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { EmailVerifiedPage } from "./pages/EmailVerifiedPage";
import { VersionBadge } from "./components/common/VersionBadge";
import { PwaUpdateModal } from "./components/common/PwaUpdateModal";
import { WhatsNewModal } from "./components/common/WhatsNewModal";
import { ToastProvider } from "./components/common/ToastProvider";
import { ConfirmProvider } from "./components/common/ConfirmProvider";
import { LanguageProvider } from "./context/LanguageContext";
import { AppTheme } from "./theme/AppTheme";
import {
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  Bolt as BoltIcon,
  Calculate as CalculatorIcon,
  BarChart as AnalyticsIcon,
  AutoGraph as ForecastingIcon,
  Api as ApiIcon,
  ReceiptLong as ReceiptIcon,
  ManageAccounts as AccountIcon,
  HistoryEdu as ChangelogIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { HouseholdProvider, useHousehold } from "./context/HouseholdContext";
import { HouseholdAccessModal } from "./components/household/HouseholdAccessModal";

const HouseholdAccessModalConsumer: React.FC = () => {
  const { isHouseholdModalOpen, closeHouseholdModal, householdModalTab } = useHousehold();
  return (
    <HouseholdAccessModal
      isOpen={isHouseholdModalOpen}
      onClose={closeHouseholdModal}
      initialTab={householdModalTab}
    />
  );
};

/**
 * Intelligent Root Gate: Detects existing active session and 'Remember Me' state.
 * If authenticated, seamlessly routes straight to /dashboard (e.g. when launching installed PC PWA).
 * If guest, displays the marketing LandingPage.
 */
const RootGate: React.FC = () => {
  const [checking, setChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const rememberMe = localStorage.getItem("powerforecast_remember_me");
    const sessionActive = sessionStorage.getItem("powerforecast_session_active");
    // If rememberMe was explicitly turned off ("false") and sessionStorage is gone, user should not be kept logged in
    const isRemembered = rememberMe !== "false" || sessionActive === "true";
    const cachedUser = localStorage.getItem("powerforecast_active_user");

    supabaseClient.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          if (isRemembered && (data?.session?.user || cachedUser)) {
            sessionStorage.setItem("powerforecast_session_active", "true");
            setIsAuthenticated(true);
          } else if (!isRemembered) {
            // Explicitly sign out if Remember Me was disabled and browser was reopened
            supabaseClient.auth.signOut().catch(() => {});
            localStorage.removeItem("powerforecast_active_user");
          }
          setChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          if (isRemembered && cachedUser) {
            sessionStorage.setItem("powerforecast_session_active", "true");
            setIsAuthenticated(true);
          }
          setChecking(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (checking) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
};

export const App: React.FC = () => {
  return (
    <AppTheme>
      <LanguageProvider>
        <ToastProvider>
          <ConfirmProvider>
            <HashRouter>
          <Refine
            dataProvider={resilientDataProvider}
            authProvider={authProvider}
            routerProvider={routerBindings}
            resources={[
              {
                name: "dashboard",
                list: "/dashboard",
                meta: {
                  label: "Dashboard",
                  icon: <DashboardIcon fontSize="small" />,
                },
              },
              {
                name: "calculator",
                list: "/calculator",
                meta: {
                  label: "Bill Calculator",
                  icon: <CalculatorIcon fontSize="small" />,
                },
              },
              {
                name: "user_appliances",
                list: "/appliances",
                meta: {
                  label: "Appliances Hub",
                  icon: <BoltIcon fontSize="small" />,
                },
              },
              {
                name: "user_calendar_events",
                list: "/calendar",
                meta: {
                  label: "Smart Calendar",
                  icon: <CalendarIcon fontSize="small" />,
                },
              },
              {
                name: "appliance_usage_logs",
                list: "/calendar",
                meta: {
                  label: "Usage Receipts",
                  icon: <ReceiptIcon fontSize="small" />,
                },
              },
              {
                name: "accounts",
                list: "/dashboard",
                meta: {
                  label: "User Accounts",
                  icon: <AccountIcon fontSize="small" />,
                },
              },
              {
                name: "system_changelogs",
                list: "/docs",
                meta: {
                  label: "Audit Logs",
                  icon: <ChangelogIcon fontSize="small" />,
                },
              },
              {
                name: "analytics",
                list: "/analytics",
                meta: {
                  label: "Analytics",
                  icon: <AnalyticsIcon fontSize="small" />,
                },
              },
              {
                name: "forecasting",
                list: "/forecasting",
                meta: {
                  label: "Forecasting",
                  icon: <ForecastingIcon fontSize="small" />,
                },
              },
              {
                name: "docs",
                list: "/docs",
                meta: {
                  label: "API Docs",
                  icon: <ApiIcon fontSize="small" />,
                },
              },
              {
                name: "settings",
                list: "/settings",
                meta: {
                  label: "Settings",
                  icon: <SettingsIcon fontSize="small" />,
                },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <HouseholdProvider>
              <Routes>
                {/* Public Landing / Marketing Page (With Intelligent Auth Redirect) */}
                <Route path="/" element={<RootGate />} />
                <Route path="/landing" element={<LandingPage />} />

                {/* Authentication Pages */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/verified" element={<EmailVerifiedPage />} />

                {/* App Workspace Pages (Protected under Authenticated guard and Layout) */}
                <Route
                  element={
                    <Authenticated key="authenticated-workspace" fallback={<Navigate to="/login" replace />}>
                      <Layout />
                    </Authenticated>
                  }
                >
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/calculator" element={<CalculatorPage />} />
                  <Route path="/appliances" element={<AppliancesPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/forecasting" element={<ForecastingPage />} />
                  <Route path="/docs" element={<ApiDocsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <HouseholdAccessModalConsumer />
              <UnsavedChangesNotifier />
              <VersionBadge />
              <PwaUpdateModal />
              <WhatsNewModal />
            </HouseholdProvider>
          </Refine>
          </HashRouter>
          </ConfirmProvider>
        </ToastProvider>
      </LanguageProvider>
    </AppTheme>
  );
};

export default App;
