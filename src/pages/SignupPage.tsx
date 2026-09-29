import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "@refinedev/core";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LightMode as SunIcon,
  DarkMode as MoonIcon,
} from "@mui/icons-material";
import { useColorMode } from "../theme/AppTheme";
import { useToast } from "../components/common/ToastProvider";

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
      {/* Header */}
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

      {/* Background Hanging Bulb (Left) */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: { md: "6%", lg: "12%", xl: "16%" },
          display: { xs: "none", md: "block" },
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {/* Ambient Radial Glow */}
        <Box
          sx={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { md: 450, lg: 550 },
            height: { md: 450, lg: 550 },
            borderRadius: "50%",
            background: isDark
              ? "radial-gradient(circle, rgba(0, 229, 201, 0.2) 0%, rgba(23, 25, 29, 0) 70%)"
              : "radial-gradient(circle, rgba(255, 213, 79, 0.4) 0%, rgba(244, 246, 251, 0) 70%)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }}
        />

        <Box
          component="img"
          src={isDark ? "/Assets/Off.png" : "/Assets/On.png"}
          alt="PowerForecast Energy Bulb"
          sx={{
            height: { md: "calc(100vh - 100px)", lg: "calc(100vh - 110px)" },
            maxHeight: { md: 640, lg: 750 },
            width: "auto",
            objectFit: "contain",
            display: "block",
            filter: isDark
              ? "drop-shadow(0 25px 45px rgba(0, 0, 0, 0.95))"
              : "drop-shadow(0 25px 60px rgba(255, 213, 79, 0.6))",
          }}
        />
      </Box>

      {/* Main Container: Bento Card positioned on the right */}
      <Container
        maxWidth="lg"
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: { xs: "center", md: "flex-end" },
          py: { xs: 4, sm: 6 },
          position: "relative",
          zIndex: 1,
        }}
      >
        <Card
          sx={{
            width: "100%",
            maxWidth: 520,
            p: { xs: 3, sm: 4.5 },
            borderRadius: 1.5,
            boxShadow: isDark
              ? "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 229, 201, 0.1)"
              : "0 20px 60px rgba(0, 158, 136, 0.1)",
            border: "1px solid",
            borderColor: isDark ? "rgba(0, 229, 201, 0.25)" : "rgba(226, 232, 240, 0.8)",
            bgcolor: isDark ? "rgba(32, 35, 40, 0.95)" : "rgba(255, 255, 255, 0.96)",
            backdropFilter: "blur(16px)",
          }}
        >
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
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}>
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Start tracking and optimizing your household energy profile
            </Typography>
          </Box>

          {errorMessage && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 1 }}
              action={
                errorMessage.toLowerCase().includes("already registered") ||
                errorMessage.toLowerCase().includes("already exists") ? (
                  <Button
                    component={Link}
                    to="/login"
                    color="inherit"
                    size="small"
                    sx={{ fontWeight: 700, textDecoration: "underline", textTransform: "none" }}
                  >
                    Sign In
                  </Button>
                ) : undefined
              }
            >
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Full Name"
              required
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Santos"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Email Address"
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

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Confirm Password"
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
              sx={{ py: 1.25, borderRadius: 1, mt: 1, fontWeight: 700 }}
            >
              {isLoading ? "Creating account..." : "Complete Registration"}
            </Button>
          </Box>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Already registered?{" "}
              <Typography
                component={Link}
                to="/login"
                variant="body2"
                sx={{ color: "primary.main", fontWeight: 700, textDecoration: "none" }}
              >
                Sign in here
              </Typography>
            </Typography>
          </Box>
        </Card>
      </Container>
    </Box>
  );
};

export default SignupPage;
