import React, { useEffect, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Mail,
  CheckCircle2,
  RefreshCw,
  Sun,
  Moon,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useColorMode } from "../theme/AppTheme";
import { supabaseClient, APP_VERSION } from "../lib/supabaseClient";
import { SystemTestingBanner } from "../components/common/SystemTestingBanner";
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

/** Shared channel name for cross-tab verification communication */
const AUTH_CHANNEL = "powerforecast-auth";

export const VerifyEmailPage: React.FC = () => {
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";
  const location = useLocation();

  // Extract email from query parameter (e.g. /verify-email?email=user%40example.com)
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email") || "your email address";

  const [isVerified, setIsVerified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleVerified = useCallback(() => {
    setIsVerified(true);
    // Automatically redirect to /login after a brief moment to show success UI
    setTimeout(() => {
      window.location.hash = "#/login";
    }, 2000);
  }, []);

  useEffect(() => {
    const registeredAt = parseInt(
      sessionStorage.getItem("powerforecast_registered_at") || "0",
      10
    );

    const isGenuinelyVerified = (
      confirmedAtStr: string | null | undefined
    ): boolean => {
      if (!confirmedAtStr) return false;
      const confirmedMs = new Date(confirmedAtStr).getTime();
      return confirmedMs > registeredAt - 2000;
    };

    // ── 1. Supabase onAuthStateChange listener ──
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (event, session) => {
        if (
          (event === "SIGNED_IN" || event === "USER_UPDATED") &&
          isGenuinelyVerified(session?.user?.email_confirmed_at)
        ) {
          sessionStorage.removeItem("powerforecast_registered_at");
          handleVerified();
        }
      }
    );

    // ── 2. Auto-poll every 5 seconds (session-based detection) ──
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        if (isGenuinelyVerified(data?.session?.user?.email_confirmed_at)) {
          sessionStorage.removeItem("powerforecast_registered_at");
          handleVerified();
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    // ── 3. BroadcastChannel listener (cross-tab communication) ──
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (event.data?.type === "VERIFICATION_SUCCESS") {
          sessionStorage.removeItem("powerforecast_registered_at");
          handleVerified();
        }
      };
    } catch {
      // BroadcastChannel not supported
    }

    // ── 4. localStorage event fallback (cross-tab) ──
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "powerforecast_verification_signal") {
        try {
          const payload = JSON.parse(event.newValue || "{}");
          if (payload.verified) {
            sessionStorage.removeItem("powerforecast_registered_at");
            handleVerified();
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      authListener.subscription.unsubscribe();
      clearInterval(pollInterval);
      channel?.close();
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [handleVerified]);

  const handleResend = async () => {
    if (!email || email === "your email address") return;

    setIsResending(true);
    setResendStatus(null);

    try {
      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/#/verified`,
        },
      });

      if (error) {
        setResendStatus({ type: "error", message: error.message });
      } else {
        setResendStatus({
          type: "success",
          message: "Verification email resent successfully! Please check your inbox.",
        });
      }
    } catch (err: any) {
      setResendStatus({
        type: "error",
        message: "Failed to resend email. Please try again later.",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="pf-auth flex min-h-screen flex-col justify-between bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* 1. Header */}
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
              to="/login"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-foreground")}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. System Testing Banner Strip */}
      <SystemTestingBanner variant="auth" />

      {/* 3. Main Center Container */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        {isVerified ? (
          <Card className="w-full max-w-[440px] border-border bg-card/95 p-2 shadow-xl backdrop-blur-sm text-center">
            <CardHeader className="space-y-3 pb-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 animate-in zoom-in-75">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Email Verified!
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                Your PowerForecast account is now active. Redirecting you to sign in...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-[460px] border-border bg-card/95 shadow-xl backdrop-blur-sm text-center">
            <CardHeader className="space-y-3 pb-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/60 text-foreground shadow-xs">
                <Mail className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Verify Your Email
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground sm:text-sm leading-relaxed max-w-sm mx-auto">
                We've sent a verification link to{" "}
                <strong className="font-semibold text-foreground">{email}</strong>.
                Please check your inbox and click the link to activate your account.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-muted/30 py-2.5 px-4 text-xs font-medium text-muted-foreground">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" />
                <span>Waiting for verification...</span>
              </div>

              {resendStatus && (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-3 text-xs text-left",
                    resendStatus.type === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-destructive/30 bg-destructive/10 text-destructive"
                  )}
                >
                  {resendStatus.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed font-medium">{resendStatus.message}</span>
                </div>
              )}

              <Button
                variant="outline"
                size="lg"
                className="w-full font-semibold shadow-xs"
                onClick={handleResend}
                disabled={isResending || email === "your email address"}
              >
                {isResending ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Resending...</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    <span>Resend Verification Email</span>
                  </span>
                )}
              </Button>
            </CardContent>

            <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4">
              <Link
                to="/login"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
              >
                Back to Sign In
              </Link>
            </CardFooter>
          </Card>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PowerForecast • Version {APP_VERSION}
      </footer>
    </div>
  );
};

export default VerifyEmailPage;
