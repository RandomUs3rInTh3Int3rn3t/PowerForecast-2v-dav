import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
  CheckCircleOutlined as SuccessIcon,
  Send as SendIcon,
  MarkEmailRead as EmailSentIcon,
  Shield as ShieldIcon,
} from "@mui/icons-material";
import { supabaseClient, initializeUrlAuthSession } from "../lib/supabaseClient";
import { useColorMode } from "../theme/AppTheme";
import { devLog } from "../lib/devLogger";

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

  // ── Step 1A: Send Password Reset Link via Supabase SMTP (Resend) ──
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

  // ── Step 2B: Update Password via Email Recovery Token ──
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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: isDark ? "#17191d" : "#f4f6f8",
        color: "text.primary",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Header bar */}
      <Box
        sx={{
          position: "relative",
          zIndex: 10,
          p: 2,
          px: { xs: 2, sm: 4 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
          backdropFilter: "blur(12px)",
          bgcolor: isDark ? "rgba(8, 7, 32, 0.7)" : "rgba(244, 246, 251, 0.7)",
        }}
      >
        <Box component={Link} to="/" sx={{ display: "flex", alignItems: "center", gap: 1.5, textDecoration: "none", color: "inherit" }}>
          <Box
            component="img"
            src="/Assets/LOGO.png"
            alt="PowerForecast Logo"
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 8px rgba(0, 229, 201, 0.4))",
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            PowerForecast
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Tooltip title={`Switch to ${isDark ? "Light" : "Dark"} mode`}>
            <IconButton onClick={toggleColorMode} size="small" sx={{ border: "1px solid", borderColor: "divider" }}>
              {isDark ? <SunIcon sx={{ color: "#ffd54f", fontSize: 18 }} /> : <MoonIcon sx={{ color: "primary.main", fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
          <Button component={Link} to="/login" size="small" variant="text">
            Sign In
          </Button>
        </Box>
      </Box>

      {/* Main Container */}
      <Container
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: { xs: 4, sm: 6 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 500,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 2,
            boxShadow: isDark
              ? "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 229, 201, 0.1)"
              : "0 20px 60px rgba(0, 158, 136, 0.1)",
            border: "1px solid",
            borderColor: isDark ? "rgba(0, 229, 201, 0.25)" : "rgba(226, 232, 240, 0.8)",
            bgcolor: isDark ? "rgba(32, 35, 40, 0.95)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Brand Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              component="img"
              src="/Assets/LOGO.png"
              alt="PowerForecast Logo"
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1.25,
                objectFit: "contain",
                filter: "drop-shadow(0 4px 16px rgba(0, 229, 201, 0.4))",
                mb: 1.5,
              }}
            />
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              {step === "success"
                ? "Password Reset Complete"
                : step === "update_new"
                ? "Choose New Password"
                : step === "email_sent"
                ? "Check Your Inbox"
                : "Reset Your Password"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {step === "input" && "We'll send a secure password reset link to your email via Resend SMTP"}
              {step === "email_sent" && "A reset link has been dispatched to your email address"}
              {step === "update_new" && "Enter and confirm your new account password"}
              {step === "success" && "Your account password has been safely updated"}
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 1.5 }}>
              {errorMessage}
            </Alert>
          )}

          {/* STEP: INPUT */}
          {step === "input" && (
            <Box component="form" onSubmit={handleSendResetEmail} sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                label="Registered Email Address"
                type="email"
                required
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@powerforecast.ph"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                sx={{ py: 1.25, borderRadius: 1.5, fontWeight: 800 }}
              >
                {isLoading ? "Dispatching Reset Link..." : "Send Reset Link via Email"}
              </Button>

              <Box sx={{ textAlign: "center", mt: 1 }}>
                <Typography
                  component={Link}
                  to="/login"
                  variant="body2"
                  sx={{
                    color: "primary.main",
                    textDecoration: "none",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <ArrowBackIcon fontSize="small" /> Back to Sign In
                </Typography>
              </Box>
            </Box>
          )}

          {/* STEP: EMAIL SENT */}
          {step === "email_sent" && (
            <Box sx={{ textAlign: "center", py: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <EmailSentIcon sx={{ color: "primary.main", fontSize: 56 }} />
              <Alert severity="success" sx={{ width: "100%", borderRadius: 1.5, textAlign: "left" }}>
                We've dispatched a secure password reset link to <strong>{email}</strong> via Resend SMTP.
                Please check your inbox (and spam/junk folder) and click the link to proceed.
              </Alert>

              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Didn't receive the email? Check your spam folder or click below to resend.
              </Typography>

              <Box sx={{ display: "flex", gap: 1.5, width: "100%", mt: 1 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={handleSendResetEmail}
                  sx={{ py: 1, borderRadius: 1.5, fontWeight: 700 }}
                >
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : "Resend Email"}
                </Button>
              </Box>

              <Box sx={{ mt: 2 }}>
                <Button component={Link} to="/login" size="small" startIcon={<ArrowBackIcon />}>
                  Back to Sign In
                </Button>
              </Box>
            </Box>
          )}


          {/* STEP: UPDATE NEW PASSWORD (FROM EMAIL RECOVERY TOKEN) */}
          {step === "update_new" && (
            <Box component="form" onSubmit={handleUpdatePasswordWithToken} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                Email verification successful! Please set your new password below.
              </Alert>

              <TextField
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                required
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          edge="end"
                        >
                          {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                required
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!passwordsMatch}
                helperText={!passwordsMatch ? "Passwords do not match" : ""}
                placeholder="••••••••"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={isLoading || !passwordsMatch}
                sx={{ py: 1.25, borderRadius: 1.5, fontWeight: 800, mt: 0.5 }}
              >
                {isLoading ? "Saving New Password..." : "Set New Password"}
              </Button>
            </Box>
          )}

          {/* STEP: SUCCESS */}
          {step === "success" && (
            <Box sx={{ textAlign: "center", py: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <SuccessIcon sx={{ color: "success.main", fontSize: 56 }} />
              <Alert severity="success" sx={{ width: "100%", borderRadius: 1.5 }}>
                Your password has been successfully reset! You can now sign in with your new credentials.
              </Alert>
              <Button
                component={Link}
                to="/login"
                variant="contained"
                fullWidth
                sx={{ mt: 2, py: 1.2, borderRadius: 1.5, fontWeight: 700 }}
              >
                Sign In Now
              </Button>
            </Box>
          )}
        </Card>
      </Container>
    </Box>
  );
};

export default ForgotPasswordPage;
