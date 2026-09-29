import React from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, {
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { resilientDataProvider } from "./providers/dataProvider";
import { authProvider } from "./providers/authProvider";
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
            <Routes>
              {/* Public Landing / Marketing Page */}
              <Route path="/" element={<LandingPage />} />
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
            <UnsavedChangesNotifier />
            <VersionBadge />
            <PwaUpdateModal />
          </Refine>
          </HashRouter>
          </ConfirmProvider>
        </ToastProvider>
      </LanguageProvider>
    </AppTheme>
  );
};

export default App;
