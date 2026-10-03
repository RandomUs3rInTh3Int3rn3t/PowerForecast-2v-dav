import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "@refinedev/core";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Wrench,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { supabaseClient, APP_VERSION } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";
import { useToast } from "../components/common/ToastProvider";
import { AuthDiagnosticModal } from "../components/common/AuthDiagnosticModal";
import { SystemTestingBanner } from "../components/common/SystemTestingBanner";
import { runAuthDiagnostics, DiagnosticReport } from "../lib/diagnostics";
import { Button, buttonVariants } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { cn } from "../lib/utils";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: login, isLoading } = useLogin();
  const { mode, toggleColorMode } = useColorMode();
  const { showError, showSuccess } = useToast();
  const isDark = mode === "dark";

  const [email, setEmail] = useState(() => {
    return localStorage.getItem("powerforecast_remembered_email") || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("powerforecast_remember_me") !== "false";
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [lastRawError, setLastRawError] = useState<any>(null);

  // Auto-redirect if already authenticated with active session
  useEffect(() => {
    let isMounted = true;
    const rememberMePref = localStorage.getItem("powerforecast_remember_me") !== "false";
    supabaseClient.auth.getSession().then(({ data }) => {
      if (isMounted && data?.session?.user && rememberMePref) {
        navigate("/dashboard", { replace: true });
      }
    });
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      const msg = "Please enter both email and password.";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Please enter a valid email address (e.g. name@domain.com).";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    login(
      { email: trimmedEmail, password: trimmedPassword, rememberMe },
      {
        onSuccess: async (data: any) => {
          if (data?.success === false || data?.error) {
            const rawErr = data?.error?.rawError || data?.error;
            const msg =
              data?.error?.message || "Invalid credentials. Please verify your email and password.";
            setErrorMessage(msg);
            setLastRawError(rawErr);

            // Automatically run diagnostic sweep and pop up modal on failure
            const report = await runAuthDiagnostics(rawErr);
            setDiagnosticReport(report);
            setDiagnosticOpen(true);
            return;
          }

          try {
            if (rememberMe) {
              localStorage.setItem("powerforecast_remembered_email", trimmedEmail);
              localStorage.setItem("powerforecast_remember_me", "true");
              sessionStorage.setItem("powerforecast_session_active", "true");
            } else {
              localStorage.removeItem("powerforecast_remembered_email");
              localStorage.setItem("powerforecast_remember_me", "false");
              sessionStorage.setItem("powerforecast_session_active", "true");
            }
          } catch (storageErr) {
            console.warn("Storage restricted, skipping rememberMe persistence:", storageErr);
          }

          showSuccess("Welcome back! Signed in successfully.");
          navigate("/dashboard");
        },
        onError: async (err: any) => {
          const rawErr = err?.rawError || err;
          const msg =
            err?.message || "Invalid credentials. Please verify your email and password.";
          setErrorMessage(msg);
          setLastRawError(rawErr);

          const report = await runAuthDiagnostics(rawErr);
          setDiagnosticReport(report);
          setDiagnosticOpen(true);
        },
      }
    );
  };

  return (
    <div className="pf-auth flex min-h-screen flex-col justify-between bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* 1. Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 px-4 backdrop-blur md:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-90"
          >
            <img src="/Assets/LOGO.png" alt="PowerForecast Logo" className="h-7 w-7 object-contain" />
            <span className="text-base font-bold tracking-tight sm:text-lg">PowerForecast</span>
          </Link>

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
              to="/"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-foreground")}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. System Testing Banner Strip */}
      <SystemTestingBanner variant="auth" />

      {/* 3. Centered Auth Container */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <Card className="w-full max-w-[440px] border-border bg-card/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-2 pb-6 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 p-2 shadow-xs">
              <img src="/Assets/LOGO.png" alt="PowerForecast" className="h-8 w-8 object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Sign In
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground sm:text-sm">
              Access your telemetry, appliances, and Meralco forecasts
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error Alert Box */}
            {errorMessage && (
              <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-destructive/20">
                  <button
                    type="button"
                    onClick={() => setDiagnosticOpen(true)}
                    className="font-bold underline cursor-pointer hover:opacity-80"
                  >
                    Inspect Error
                  </button>

                  {errorMessage.toLowerCase().includes("not confirmed") && (
                    <Link
                      to={`/verify-email?email=${encodeURIComponent(email.trim())}`}
                      className="font-bold underline hover:opacity-80"
                    >
                      Verify Email
                    </Link>
                  )}

                  {(errorMessage.toLowerCase().includes("no account found") ||
                    errorMessage.toLowerCase().includes("does not exist") ||
                    errorMessage.toLowerCase().includes("create an account") ||
                    errorMessage.toLowerCase().includes("sign up")) && (
                    <Link to="/signup" className="font-bold underline hover:opacity-80">
                      Sign Up
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email Address <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@powerforecast.ph"
                    className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-foreground">
                  Password <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-input bg-background accent-foreground text-foreground"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="font-medium text-foreground hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full font-semibold shadow-xs"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Signing in...</span>
                  </span>
                ) : (
                  <span>Sign In to PowerForecast</span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
            <div>
              Don't have an account?{" "}
              <Link to="/signup" className="font-semibold text-foreground hover:underline">
                Sign up free
              </Link>
            </div>

            <button
              type="button"
              onClick={async () => {
                const report = await runAuthDiagnostics();
                setDiagnosticReport(report);
                setDiagnosticOpen(true);
              }}
              className="mt-1 inline-flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Diagnose Mobile & Supabase Connection</span>
            </button>
          </CardFooter>
        </Card>
      </main>

      {/* 4. Minimal Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PowerForecast • Version {APP_VERSION}
      </footer>

      {/* 5. Diagnostic Modal (Preserved 100%) */}
      <AuthDiagnosticModal
        open={diagnosticOpen}
        onClose={() => setDiagnosticOpen(false)}
        initialReport={diagnosticReport}
        rawError={lastRawError}
        onRetry={() => {
          setDiagnosticOpen(false);
          if (email && password) {
            handleSubmit(new Event("submit") as any);
          }
        }}
      />
    </div>
  );
};

export default LoginPage;
