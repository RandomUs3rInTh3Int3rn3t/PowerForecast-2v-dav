import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "@refinedev/core";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { APP_VERSION } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";
import { useToast } from "../components/common/ToastProvider";
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

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: register, isLoading } = useRegister();
  const { mode, toggleColorMode } = useColorMode();
  const { showError, showSuccess } = useToast();
  const isDark = mode === "dark";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedName) {
      const msg = "Please enter your full name.";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    const nameRegex = /^[a-zA-Z\s-]+$/;
    if (!nameRegex.test(trimmedName)) {
      const msg = "Full Name can only contain letters, spaces, and hyphens.";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    if (!trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
      const msg = "Please fill in all required fields.";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      const msg = "Please enter a valid email address (e.g. name@domain.com).";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      const msg = "Passwords do not match. Please verify and try again.";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    if (trimmedPassword.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    if (trimmedPassword.toLowerCase() === trimmedEmail) {
      const msg = "Password cannot be identical to your email address.";
      setErrorMessage(msg);
      showError(msg);
      return;
    }

    register(
      {
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
      },
      {
        onSuccess: (data: any) => {
          if (data?.success === false || data?.error) {
            const msg =
              data?.error?.message ||
              "This email is already registered. Please sign in or use password recovery.";
            setErrorMessage(msg);
            showError(msg);
            return;
          }
          showSuccess("Account created successfully! Welcome to PowerForecast.");
          navigate(data?.redirectTo || "/dashboard");
        },
        onError: (err: any) => {
          const msg = err?.message || "Registration failed. Please try again.";
          setErrorMessage(msg);
          showError(msg);
        },
      }
    );
  };

  const passwordsMatch = !confirmPassword || password === confirmPassword;

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
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* 2. System Testing Banner Strip */}
      <SystemTestingBanner variant="auth" />

      {/* 3. Centered Auth Card */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <Card className="w-full max-w-[460px] border-border bg-card/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="space-y-2 pb-6 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted/50 p-2 shadow-xs">
              <img src="/Assets/LOGO.png" alt="PowerForecast" className="h-8 w-8 object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Create Account
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground sm:text-sm">
              Start tracking and optimizing your household energy profile
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

                {(errorMessage.toLowerCase().includes("already registered") ||
                  errorMessage.toLowerCase().includes("already exists")) && (
                  <div className="pt-1 border-t border-destructive/20">
                    <Link to="/login" className="font-bold underline hover:opacity-80">
                      Sign In to your existing account
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-semibold text-foreground">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="h-10 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {/* Email Address Field */}
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
                    autoComplete="email"
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
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
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

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                    Confirm Password <span className="text-destructive">*</span>
                  </label>
                  {!passwordsMatch && (
                    <span className="text-[11px] font-medium text-destructive">
                      Passwords do not match
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    className={cn(
                      "h-10 w-full rounded-md border bg-background/50 pl-9 pr-10 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1",
                      passwordsMatch
                        ? "border-input focus-visible:ring-ring"
                        : "border-destructive focus-visible:ring-destructive"
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
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isLoading || !passwordsMatch}
                className="w-full font-semibold shadow-xs"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>Creating account...</span>
                  </span>
                ) : (
                  <span>Complete Registration</span>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
            <div>
              Already registered?{" "}
              <Link to="/login" className="font-semibold text-foreground hover:underline">
                Sign in here
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>

      {/* 4. Minimal Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PowerForecast • Version {APP_VERSION}
      </footer>
    </div>
  );
};

export default SignupPage;
