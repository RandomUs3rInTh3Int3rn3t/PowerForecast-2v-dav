import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  RefreshCw,
  KeyRound,
  MailCheck,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { supabaseClient, initializeUrlAuthSession, APP_VERSION } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";
import { devLog } from "../lib/devLogger";
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

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mode, toggleColorMode } = useColorMode();
  const isDark = mode === "dark";

  // Step states: 'input' | 'email_sent' | 'update_new' | 'success'
  const [step, setStep] = useState<"input" | "email_sent" | "update_new" | "success">("input");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check URL query parameters, double-hash recovery tokens, or Supabase PASSWORD_RECOVERY event
  useEffect(() => {
    let isMounted = true;

    const syncAuthSession = async () => {
      const urlHasTokens =
        window.location.href.includes("access_token=") ||
        window.location.href.includes("code=") ||
        window.location.href.includes("type=recovery") ||
        searchParams.get("mode") === "update" ||
        window.location.hash.includes("mode=update");

      if (urlHasTokens) {
        devLog.info("Auth", "Password recovery token or update mode detected in URL. Initializing session...");
        setIsLoading(true);
        const { hasSession } = await initializeUrlAuthSession();
        if (!isMounted) return;
        setIsLoading(false);

        if (hasSession) {
          devLog.info("Auth", "Supabase recovery session successfully validated.");
          setStep("update_new");
          setErrorMessage(null);
        } else if (searchParams.get("mode") === "update" || window.location.hash.includes("mode=update")) {
          setStep("update_new");
        }
      }
    };

    syncAuthSession();

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      devLog.info("Auth", `onAuthStateChange event: ${event}`, { hasSession: Boolean(session) });
      if (
        event === "PASSWORD_RECOVERY" ||
        (event === "SIGNED_IN" && (searchParams.get("mode") === "update" || window.location.hash.includes("mode=update")))
      ) {
        devLog.info("Auth", "Supabase PASSWORD_RECOVERY or signed-in event received.");
        setStep("update_new");
        setErrorMessage(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // ── Step 1: Send Password Reset Link via Supabase SMTP ──
  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    setIsLoading(true);
    try {
      devLog.info("Auth", `Dispatching password reset email via Supabase SMTP to ${trimmedEmail}`);
      const { error } = await supabaseClient.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/#/forgot-password?mode=update`,
      });

      if (error) {
        throw error;
      }

      setStep("email_sent");
      setResendCooldown(60);
    } catch (err: any) {
      devLog.error("Auth", "Failed to dispatch reset email:", err);
      setErrorMessage(err?.message || "Failed to send password reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Update Password via Email Recovery Token ──
  const handleUpdatePasswordWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword.trim() || !confirmPassword.trim()) {
      setErrorMessage("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify and try again.");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      devLog.info("Auth", "Verifying active Supabase session before password update...");
      let { data: sessionData } = await supabaseClient.auth.getSession();

      // If session is missing in memory/storage, attempt recovery from URL tokens
      if (!sessionData?.session) {
        devLog.warn("Auth", "No active session in memory, attempting to restore from URL tokens...");
        const recoveryResult = await initializeUrlAuthSession();
        if (recoveryResult.hasSession) {
          const refreshed = await supabaseClient.auth.getSession();
          sessionData = refreshed.data;
        }
      }

      if (!sessionData?.session) {
        throw new Error(
          "Your password reset link is invalid or has expired. Please click the reset link in your email again or request a new one."
        );
      }

      devLog.info("Auth", "Updating user password via Supabase recovery session...");
      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) {
        throw error;
      }

      devLog.info("Auth", "Password successfully updated via email token!");
      setStep("success");
    } catch (err: any) {
      devLog.error("Auth", "Failed to update password via email token:", err);
      const rawMsg = err?.message || "";
      if (rawMsg.toLowerCase().includes("auth session missing") || rawMsg.toLowerCase().includes("session")) {
        setErrorMessage(
          "Your password reset session has expired or is invalid. Please request a new password reset email below."
        );
      } else {
        setErrorMessage(rawMsg || "Failed to update password. The reset link may have expired.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;

  return (
    <div className="pf-auth flex min-h-screen flex-col justify-between bg-background text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* 1. Sticky Navigation Header */}
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

      {/* 3. Centered Main Auth Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <Card className="w-full max-w-[460px] border-border bg-card/95 shadow-xl backdrop-blur-sm">
          {/* STEP 1: REQUEST RESET EMAIL */}
          {step === "input" && (
            <>
              <CardHeader className="space-y-2 pb-6 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground shadow-xs">
                  <KeyRound className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Reset Your Password
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                  We'll send a secure password reset link to your email address
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-semibold text-foreground">
                      Registered Email Address <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@powerforecast.ph"
                        className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full font-semibold shadow-xs"
                    size="lg"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Dispatching Reset Link...</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Send className="h-4 w-4" />
                        <span>Send Reset Link via Email</span>
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </CardFooter>
            </>
          )}

          {/* STEP 2: EMAIL SENT CONFIRMATION */}
          {step === "email_sent" && (
            <>
              <CardHeader className="space-y-2 pb-4 text-center">
                <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 shadow-xs animate-in zoom-in-75">
                  <MailCheck className="h-7 w-7" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Check Your Inbox
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm leading-relaxed max-w-sm mx-auto">
                  We've dispatched a secure password reset link to{" "}
                  <strong className="font-semibold text-foreground">{email}</strong>.
                  Please check your inbox (and spam folder) to proceed.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
                  Didn't receive the email? Check your spam folder or request a new reset link below once the countdown completes.
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full font-semibold shadow-xs"
                  onClick={handleSendResetEmail}
                  disabled={resendCooldown > 0 || isLoading}
                >
                  {resendCooldown > 0 ? (
                    <span>Resend available in {resendCooldown}s</span>
                  ) : isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Resending...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      <span>Resend Reset Email</span>
                    </span>
                  )}
                </Button>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </CardFooter>
            </>
          )}

          {/* STEP 3: UPDATE NEW PASSWORD (FROM TOKEN/LINK) */}
          {step === "update_new" && (
            <>
              <CardHeader className="space-y-2 pb-6 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/60 text-foreground shadow-xs">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Choose New Password
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm">
                  Email verification successful. Enter your new password below.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePasswordWithToken} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="newPassword" className="text-xs font-semibold text-foreground">
                      New Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                      Confirm New Password <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(
                          "h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                          !passwordsMatch && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {!passwordsMatch && (
                      <p className="text-[11px] font-medium text-destructive">Passwords do not match.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !passwordsMatch}
                    className="w-full font-semibold shadow-xs"
                    size="lg"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Saving New Password...</span>
                      </span>
                    ) : (
                      <span>Set New Password</span>
                    )}
                  </Button>
                </form>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </CardFooter>
            </>
          )}

          {/* STEP 4: SUCCESS */}
          {step === "success" && (
            <>
              <CardHeader className="space-y-3 pb-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 animate-in zoom-in-75">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Password Reset Complete!
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground sm:text-sm leading-relaxed max-w-sm mx-auto">
                  Your account password has been successfully updated. You can now sign in with your new credentials.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Button
                  size="lg"
                  className="w-full font-semibold shadow-xs"
                  onClick={() => navigate("/login")}
                >
                  <span>Continue to Sign In</span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </CardContent>

              <CardFooter className="flex justify-center border-t border-border/60 pt-4 pb-4 text-[11px] text-muted-foreground">
                PowerForecast Account Security
              </CardFooter>
            </>
          )}
        </Card>
      </main>

      {/* 4. Minimal Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PowerForecast • Version {APP_VERSION}
      </footer>
    </div>
  );
};

export default ForgotPasswordPage;
