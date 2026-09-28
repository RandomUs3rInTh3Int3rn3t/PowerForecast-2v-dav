import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import {
  Bolt as BoltIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import { UserAppliance, ApplianceList } from "../../types";
import { useCreate } from "@refinedev/core";
import {
  calculateKwh,
  calculateCost,
  DEFAULT_EFFECTIVE_RATE,
  hmsToDecimalHours,
  decimalHoursToHms,
  isCompressorInverterCategory,
} from "../../lib/dailyUsageService";
import { useToast } from "../common/ToastProvider";

interface ApplianceRoutineModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingAppliance: Partial<UserAppliance> | null;
  spaces: ApplianceList[];
  selectedListId?: string;
  onApplianceCreated: (created: any) => void;
}

export const ApplianceRoutineModal: React.FC<ApplianceRoutineModalProps> = ({
  isOpen,
  onClose,
  incomingAppliance,
  spaces,
  selectedListId,
  onApplianceCreated,
}) => {
  const [targetListId, setTargetListId] = useState<string>("");
  const [roomLocation, setRoomLocation] = useState<string>("Living Room");
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [hms, setHms] = useState({ hours: 8, minutes: 0, seconds: 0 });
  const [isInverter, setIsInverter] = useState<boolean>(false);
  const [customCruisingWatts, setCustomCruisingWatts] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const { showSuccess, showWarning, showError } = useToast();
  const { mutateAsync: createAppliance } = useCreate();

  useEffect(() => {
    if (isOpen && incomingAppliance) {
      const initialHours = incomingAppliance.hours_per_day !== undefined ? incomingAppliance.hours_per_day : 8;
      setHoursPerDay(initialHours);
      setHms(decimalHoursToHms(initialHours));
      setTargetListId(selectedListId || incomingAppliance.list_id || spaces[0]?.id || "");
      setRoomLocation(incomingAppliance.room_location || "Living Room");

      const category = incomingAppliance.category || "";
      const catLower = category.toLowerCase();
      const isFridge = catLower.includes("refrig") || catLower.includes("freezer") || catLower.includes("chiller");
      const isAc = catLower.includes("air condition") || catLower.includes("aircon");
      const supports = isCompressorInverterCategory(category);
      const initialInverter = supports && (incomingAppliance.ai_metadata?.is_inverter ?? (isAc || isFridge));
      setIsInverter(Boolean(initialInverter));
      setCustomCruisingWatts(
        incomingAppliance.ai_metadata?.cruising_watts !== undefined && incomingAppliance.ai_metadata?.cruising_watts !== null
          ? Number(incomingAppliance.ai_metadata.cruising_watts)
          : ""
      );
    }
  }, [isOpen, incomingAppliance, selectedListId, spaces]);

  const handleHoursChange = (decimal: number) => {
    const clamped = Math.max(0, Math.min(24, Number(decimal.toFixed(2))));
    setHoursPerDay(clamped);
    setHms(decimalHoursToHms(clamped));
  };

  const watts = incomingAppliance?.watts || 100;
  const quantity = incomingAppliance?.quantity || 1;
  const category = incomingAppliance?.category || "";
  const catLower = category.toLowerCase();
  const isFridge = catLower.includes("refrig") || catLower.includes("freezer") || catLower.includes("chiller");
  const isWasher = catLower.includes("wash") || catLower.includes("laundry");
  const supportsInverter = isCompressorInverterCategory(category);

  const defaultCruisingWatts = isFridge
    ? Math.round(watts / 3)
    : isWasher
    ? Math.round(watts * 0.50)
    : Math.round(watts * 0.42);

  const activeCruisingWatts =
    customCruisingWatts !== "" && Number(customCruisingWatts) > 0
      ? Number(customCruisingWatts)
      : defaultCruisingWatts;

  const isCustomCruising =
    customCruisingWatts !== "" &&
    Number(customCruisingWatts) > 0 &&
    Number(customCruisingWatts) !== defaultCruisingWatts;

  const cruisingPercent =
    watts > 0 ? ((activeCruisingWatts / watts) * 100).toFixed(1) : "0";

  // Real-time calculations with dynamic Inverter support
  const dailyKwh = calculateKwh(watts, hoursPerDay, quantity, {
    isInverter: supportsInverter ? isInverter : false,
    category,
    energy_rating: incomingAppliance?.energy_rating,
    name: incomingAppliance?.name,
    model: incomingAppliance?.model,
    cruising_watts: (supportsInverter && isInverter && isCustomCruising) ? activeCruisingWatts : undefined,
  });
  const dailyCost = calculateCost(dailyKwh, DEFAULT_EFFECTIVE_RATE);
  const monthlyKwh = dailyKwh * 30;
  const monthlyCost = dailyCost * 30;

  const handleSave = async () => {
    if (!incomingAppliance) return;

    setIsSaving(true);
    try {
      const isZeroHours = hoursPerDay <= 0;

      // Prepare final appliance payload
      const finalPayload: Partial<UserAppliance> = {
        ...incomingAppliance,
        list_id: targetListId || spaces[0]?.id || null,
        room_location: roomLocation,
        hours_per_day: hoursPerDay,
        days_per_month: 30,
        monthly_kwh: Math.round(monthlyKwh * 10) / 10,
        ai_metadata: {
          ...(incomingAppliance.ai_metadata || {}),
          is_inverter: supportsInverter ? isInverter : false,
          ...(supportsInverter && isInverter
            ? { cruising_watts: activeCruisingWatts }
            : { cruising_watts: null }),
        },
      };

      const res = await createAppliance({
        resource: "user_appliances",
        values: finalPayload,
      });

      const createdItem = (res as any)?.data || (res as any)?.result || finalPayload;

      // If user skipped / 0h quota
      if (isZeroHours) {
        showWarning(
          `No target quota set for ${incomingAppliance.name}. Saved as "On-Demand" (0h baseline). You can set quotas anytime.`,
          "Saved as On-Demand"
        );
      } else {
        showSuccess(
          `Added ${incomingAppliance.name} with ${hoursPerDay}h/day target quota (₱${monthlyCost.toFixed(2)}/mo)!`,
          "Appliance Added"
        );
      }

      onApplianceCreated(createdItem);
      onClose();
    } catch (err: any) {
      showError(`Failed to save appliance: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!incomingAppliance) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 1.5,
            bgcolor: "background.paper",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 32px 80px rgba(0, 0, 0, 0.8)"
                : "0 20px 60px rgba(15, 23, 42, 0.12)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(0, 229, 201, 0.25)"
                : "#e2e8f0",
            color: "text.primary",
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BoltIcon sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#ffffff") }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Set Daily Target Quota & Routine
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Configure typical operating hours and budget benchmark for this device
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Device Information Card */}
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.6)" : "#f8fafc",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
              {incomingAppliance.name || `${incomingAppliance.brand} ${incomingAppliance.model}`}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "flex", alignItems: "center", gap: 0.75 }}>
              <span>{incomingAppliance.category}</span>
              <span>•</span>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                  fontWeight: 800,
                }}
              >
                {watts} Watts
              </Typography>
              {incomingAppliance.energy_rating && <span>• {incomingAppliance.energy_rating}</span>}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              select
              size="small"
              label="Space"
              value={targetListId}
              onChange={(e) => setTargetListId(e.target.value)}
              sx={{ minWidth: 140, "& .MuiOutlinedInput-root": { height: 34, fontSize: "0.78rem" } }}
              slotProps={{ inputLabel: { shrink: true } }}
            >
              {spaces.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Room"
              value={roomLocation}
              onChange={(e) => setRoomLocation(e.target.value)}
              sx={{ width: 130, "& .MuiOutlinedInput-root": { height: 34, fontSize: "0.78rem" } }}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Box>
        </Paper>

        {/* INVERTER COMPRESSOR TELEMETRY & FALLBACK TOGGLE (Category-Adaptive) */}
        {supportsInverter && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: isInverter
                ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.05)" : "rgba(13, 148, 136, 0.04)")
                : "action.hover",
              borderColor: isInverter
                ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)")
                : "divider",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BoltIcon sx={{ color: isInverter ? "primary.main" : "text.secondary", fontSize: 22 }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: isInverter ? "primary.main" : "text.primary" }}>
                    {isFridge ? "Inverter Compressor & Thermal Duty" : isWasher ? "Inverter Direct Drive Motor" : "Inverter Technology & Duty Cycle"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {isInverter
                      ? isFridge
                        ? "Smart continuous thermal maintenance & cruising efficiency active"
                        : isWasher
                        ? "Smart variable-speed drum motor efficiency active"
                        : "Smart compressor time-decay & cruising efficiency active"
                      : "Fixed-speed continuous power draw (100% constant)"}
                  </Typography>
                </Box>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={isInverter}
                    onChange={(e) => setIsInverter(e.target.checked)}
                    color="primary"
                    size="medium"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 800, color: isInverter ? "primary.main" : "text.secondary" }}>
                    {isInverter ? "INVERTER ON" : "INVERTER OFF"}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Box>

            {/* Live Inverter Telemetry Preview & Manual Cruising Input */}
            {isInverter && (
              <Box
                sx={{
                  mt: 1.5,
                  pt: 1.5,
                  borderTop: "1px dashed",
                  borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.2)"),
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  {isFridge ? (
                    <Chip
                      size="small"
                      label="Thermal Duty: Steady Cruising (1/3 Cycle)"
                      sx={{ fontWeight: 700, fontSize: "0.6875rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9" }}
                    />
                  ) : isWasher ? (
                    <Chip
                      size="small"
                      label="Inverter Direct Drive Motor"
                      sx={{ fontWeight: 700, fontSize: "0.6875rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9" }}
                    />
                  ) : (
                    <Chip
                      size="small"
                      label={`1st Hr Cooldown: ${watts}W (100%)`}
                      sx={{ fontWeight: 700, fontSize: "0.6875rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9" }}
                    />
                  )}

                  <Chip
                    size="small"
                    label={`Cruising Mode: ~${activeCruisingWatts}W avg${isCustomCruising ? " (Custom)" : isFridge ? " (~33%)" : isWasher ? " (~50%)" : " (~42%)"}`}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
                  />

                  <Chip
                    size="small"
                    label={`Effective: ~${isFridge ? activeCruisingWatts : Math.round((dailyKwh * 1000) / (hoursPerDay || 1))}W @ ${hoursPerDay}h`}
                    sx={{ fontWeight: 800, fontSize: "0.6875rem", bgcolor: "primary.main", color: "#ffffff" }}
                  />
                </Box>

                {/* Manual Cruising Wattage Input Box */}
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.25,
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.04)" : "rgba(13, 148, 136, 0.03)",
                    border: "1px solid",
                    borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.15)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                      🎯 Custom Cruising Power Draw (Optional Override)
                    </Typography>
                    {isCustomCruising && (
                      <Button
                        size="small"
                        variant="text"
                        color="inherit"
                        onClick={() => setCustomCruisingWatts("")}
                        sx={{ fontSize: "0.6875rem", py: 0, px: 0.5, textTransform: "none", color: "text.secondary" }}
                      >
                        Reset to Smart Default ({defaultCruisingWatts}W)
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                    <TextField
                      size="small"
                      type="number"
                      placeholder={String(defaultCruisingWatts)}
                      value={customCruisingWatts}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setCustomCruisingWatts("");
                        } else {
                          setCustomCruisingWatts(Math.max(0, Number(val)));
                        }
                      }}
                      sx={{
                        width: 140,
                        "& .MuiInputBase-root": { height: 34, fontSize: "0.8125rem", fontWeight: 700 },
                      }}
                      slotProps={{
                        input: {
                          endAdornment: <InputAdornment position="end">W</InputAdornment>,
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: "text.secondary", maxWidth: 380, lineHeight: 1.4 }}>
                      Override the automatic cruising estimate with your measured running wattage or manufacturer sub-rating ({cruisingPercent}% of rated).
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        )}

        {/* QUICK TARGET QUOTA */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", letterSpacing: "0.04em" }}>
              HOW MANY HOURS DO YOU PLAN TO USE THIS PER DAY?
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
              Serves as your baseline budget quota and default routine for calendar schedule simulations.
            </Typography>
          </Box>

            {/* Quick Presets Grid */}
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
              {[
                { label: "1h (Light)", value: 1 },
                { label: "2h (Moderate)", value: 2 },
                { label: "4h (Standard)", value: 4 },
                { label: "8h (Typical)", value: 8 },
                { label: "12h (Heavy)", value: 12 },
                { label: "24h Steady", value: 24 },
              ].map((preset) => {
                const isSelected = Math.abs(hoursPerDay - preset.value) < 0.02;
                return (
                  <Button
                    key={preset.label}
                    size="small"
                    variant={isSelected ? "contained" : "outlined"}
                    onClick={() => handleHoursChange(preset.value)}
                    sx={{
                      py: 1,
                      borderRadius: 2,
                      fontWeight: 800,
                      fontSize: "0.78rem",
                      bgcolor: isSelected
                        ? "primary.main"
                        : (theme) =>
                            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#ffffff",
                      borderColor: isSelected
                        ? "primary.main"
                        : (theme) =>
                            theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.12)" : "#e2e8f0",
                      color: isSelected ? "#ffffff" : "text.primary",
                    }}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </Box>

            {/* Custom Input */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                p: 1.5,
                borderRadius: 1,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#f8fafc",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#e2e8f0",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Custom Runtime:
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <TextField
                  type="number"
                  size="small"
                  value={hms.hours}
                  onChange={(e) => {
                    const h = Math.max(0, Math.min(24, parseInt(e.target.value) || 0));
                    handleHoursChange(hmsToDecimalHours(h, hms.minutes, hms.seconds));
                  }}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">h</InputAdornment> } }}
                  sx={{
                    width: 72,
                    "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" },
                    "& input": { textAlign: "center", py: 0 },
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 900, color: "text.secondary" }}>:</Typography>
                <TextField
                  type="number"
                  size="small"
                  value={hms.minutes}
                  onChange={(e) => {
                    const m = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
                    handleHoursChange(hmsToDecimalHours(hms.hours, m, hms.seconds));
                  }}
                  slotProps={{ input: { endAdornment: <InputAdornment position="end">m</InputAdornment> } }}
                  sx={{
                    width: 72,
                    "& .MuiOutlinedInput-root": { height: 32, fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace" },
                    "& input": { textAlign: "center", py: 0 },
                  }}
                />
              </Box>
            </Box>
          </Box>

        {/* FORECASTED IMPACT PREVIEW BANNER */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.75)" : "#f8fafc",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "#e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <TrendingUpIcon sx={{ fontSize: 16 }} />
              FORECASTED ENERGY & COST IMPACT:
            </Typography>
            <Chip
              label={hoursPerDay > 0 ? `${hoursPerDay}h/day baseline` : "0h On-Demand"}
              size="small"
              color={hoursPerDay > 0 ? "primary" : "default"}
              sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 800 }}
            />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, textAlign: "center" }}>
            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#ffffff",
                border: (theme) =>
                  theme.palette.mode === "dark" ? "none" : "1px solid #e2e8f0",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Daily Consumption
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: (theme) => (theme.palette.mode === "dark" ? "#ffd54f" : "#d97706"),
                }}
              >
                {dailyKwh.toFixed(3)} kWh/day (₱{dailyCost.toFixed(2)})
              </Typography>
            </Box>

            <Box
              sx={{
                p: 1,
                borderRadius: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "#ffffff",
                border: (theme) =>
                  theme.palette.mode === "dark" ? "none" : "1px solid #e2e8f0",
              }}
            >
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", display: "block" }}>
                Estimated Monthly Bill
              </Typography>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  color: (theme) => (theme.palette.mode === "dark" ? "primary.light" : "primary.main"),
                }}
              >
                ₱{monthlyCost.toFixed(2)}/mo ({monthlyKwh.toFixed(1)} kWh)
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>

      <Divider />

      <DialogActions
        sx={{
          p: 2,
          px: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "transparent" : "#f8fafc"),
        }}
      >
        <Button variant="outlined" onClick={onClose} sx={{ borderRadius: 2, fontWeight: 700 }}>
          Cancel
        </Button>

        <Button
          variant="contained"
          color="primary"
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
          sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
        >
          {isSaving ? "Saving to Inventory..." : "Save & Add to Inventory"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ApplianceRoutineModal;
