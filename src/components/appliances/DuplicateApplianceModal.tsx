import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import {
  WarningAmber as WarningIcon,
  Close as CloseIcon,
  AddCircleOutlined as PlusCircleIcon,
  MergeType as CombineIcon,
  AccessTime as ClockIcon,
  Room as RoomIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { UserAppliance } from "../../types";

const COMMON_ROOMS = [
  "Master Bedroom",
  "Bedroom 2",
  "Kids Room",
  "Guest Room",
  "Living Room",
  "Dining Area",
  "Kitchen",
  "Balcony",
  "Home Office / Study",
  "Commercial Floor",
  "Kitchen / Pantry",
  "Storage / Warehouse",
];

const START_HOURS = [
  { hour: 0, label: "12:00 AM (Midnight)" },
  { hour: 6, label: "06:00 AM (Morning)" },
  { hour: 8, label: "08:00 AM (Morning Routine)" },
  { hour: 12, label: "12:00 PM (Noon)" },
  { hour: 13, label: "01:00 PM (Afternoon Peak)" },
  { hour: 18, label: "06:00 PM (Evening Routine)" },
  { hour: 20, label: "08:00 PM (Night)" },
  { hour: 22, label: "10:00 PM (Overnight)" },
];

interface DuplicateApplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  incomingAppliance: Partial<UserAppliance> | null;
  existingAppliance: UserAppliance | null;
  spaceName?: string;
  onCombineQuantity: (existing: UserAppliance) => void;
  onAddDistinct: (payload: Partial<UserAppliance>) => void;
}

export const DuplicateApplianceModal: React.FC<DuplicateApplianceModalProps> = ({
  isOpen,
  onClose,
  incomingAppliance,
  existingAppliance,
  spaceName = "Current Space",
  onCombineQuantity,
  onAddDistinct,
}) => {
  const [choice, setChoice] = useState<"combine" | "separate">("separate");
  const [nickname, setNickname] = useState("");
  const [roomLocation, setRoomLocation] = useState("Bedroom 2");
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [startHour, setStartHour] = useState(8);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize prefilled nickname and room when modal opens
  useEffect(() => {
    if (isOpen && incomingAppliance && existingAppliance) {
      setChoice("separate");
      const baseName = incomingAppliance.name || `${incomingAppliance.brand || ""} ${incomingAppliance.model || ""}`.trim() || "Appliance";
      setNickname(`${baseName} (Unit 2)`);
      setRoomLocation(
        existingAppliance.room_location === "Living Room"
          ? "Master Bedroom"
          : existingAppliance.room_location === "Master Bedroom"
          ? "Bedroom 2"
          : "Living Room"
      );
      setHoursPerDay(Number(incomingAppliance.hours_per_day) || 8);
      setStartHour(incomingAppliance.start_hour !== undefined ? incomingAppliance.start_hour : 8);
      setErrorMsg(null);
    }
  }, [isOpen, incomingAppliance, existingAppliance]);

  if (!incomingAppliance || !existingAppliance) return null;

  const currentQty = existingAppliance.quantity || 1;
  const nextQty = currentQty + (incomingAppliance.quantity || 1);

  const handleConfirm = () => {
    if (choice === "combine") {
      onCombineQuantity(existingAppliance);
      onClose();
      return;
    }

    // Validation for separate unit
    if (!nickname.trim()) {
      setErrorMsg("A distinct nickname or room label is required so you can tell these units apart.");
      return;
    }

    if (nickname.trim().toLowerCase() === existingAppliance.name.trim().toLowerCase()) {
      setErrorMsg("Nickname must be distinct from the existing appliance's name.");
      return;
    }

    const payload: Partial<UserAppliance> = {
      ...incomingAppliance,
      name: nickname.trim(),
      room_location: roomLocation,
      hours_per_day: hoursPerDay,
      start_hour: startHour,
      quantity: incomingAppliance.quantity || 1,
    };

    onAddDistinct(payload);
    onClose();
  };

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
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "#0a0a20" : "#ffffff"),
            border: "1px solid",
            borderColor: "warning.main",
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
          },
        },
      }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1,
              bgcolor: "warning.main",
              color: "#000000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WarningIcon />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Duplicate Appliance Detected
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Already registered in "{spaceName}"
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        <Stack spacing={2.5}>
          {/* Existing Appliance Summary Alert */}
          <Alert severity="warning" sx={{ borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              "{existingAppliance.name}" ({existingAppliance.watts}W)
            </Typography>
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 0.25 }}>
              Currently in {existingAppliance.room_location || "Living Room"} • Qty: {currentQty} • {existingAppliance.hours_per_day}h/day
            </Typography>
          </Alert>

          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            How do you plan to use this second unit?
          </Typography>

          <RadioGroup value={choice} onChange={(e) => setChoice(e.target.value as any)}>
            {/* OPTION 1: Switched Together (Combine Quantity) */}
            <Paper
              variant="outlined"
              onClick={() => setChoice("combine")}
              sx={{
                p: 2,
                mb: 1.5,
                borderRadius: 1.25,
                cursor: "pointer",
                borderColor: choice === "combine" ? "primary.main" : "divider",
                bgcolor: choice === "combine" ? "rgba(0, 229, 201, 0.08)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <FormControlLabel
                value="combine"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                      <CombineIcon sx={{ fontSize: 18, color: "primary.main" }} />
                      Same Schedule / Switched Together
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                      Increases the quantity on the existing card ({currentQty} ➔ {nextQty} units). Keeps your dashboard clean with 1 card.
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, alignItems: "flex-start" }}
              />
            </Paper>

            {/* OPTION 2: Operates Independently (Separate Unit) */}
            <Paper
              variant="outlined"
              onClick={() => setChoice("separate")}
              sx={{
                p: 2,
                borderRadius: 1.25,
                cursor: "pointer",
                borderColor: choice === "separate" ? "primary.main" : "divider",
                bgcolor: choice === "separate" ? "rgba(0, 229, 201, 0.08)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <FormControlLabel
                value="separate"
                control={<Radio size="small" />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}>
                      <PlusCircleIcon sx={{ fontSize: 18, color: "success.main" }} />
                      Operates Independently / Different Schedule
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                      Creates a separate card with its own routine schedule, room location, and daily hours.
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, alignItems: "flex-start" }}
              />

              {/* Sub-form when 'separate' is selected */}
              {choice === "separate" && (
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }} onClick={(e) => e.stopPropagation()}>
                  <Stack spacing={2}>
                    <TextField
                      label="Distinct Nickname / Label"
                      required
                      fullWidth
                      size="small"
                      value={nickname}
                      onChange={(e) => {
                        setNickname(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder="e.g., Sharp AC (Kids Room) or Sharp AC - Window Side"
                      helperText="Must be unique to avoid confusing inventory cards"
                      error={Boolean(errorMsg)}
                    />

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
                      <TextField
                        select
                        label="Room Location"
                        size="small"
                        value={roomLocation}
                        onChange={(e) => setRoomLocation(e.target.value)}
                      >
                        {COMMON_ROOMS.map((r) => (
                          <MenuItem key={r} value={r}>
                            {r}
                          </MenuItem>
                        ))}
                      </TextField>

                      <TextField
                        type="number"
                        label="Daily Routine Hours"
                        size="small"
                        value={hoursPerDay}
                        onChange={(e) => setHoursPerDay(Math.max(0.5, Math.min(24, parseFloat(e.target.value) || 1)))}
                        slotProps={{ htmlInput: { min: 0.5, max: 24, step: 0.5 } }}
                      />
                    </Box>

                    <TextField
                      select
                      label="Typical Operating Time Window"
                      size="small"
                      value={startHour}
                      onChange={(e) => setStartHour(Number(e.target.value))}
                    >
                      {START_HOURS.map((h) => (
                        <MenuItem key={h.hour} value={h.hour}>
                          {h.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Stack>
                </Box>
              )}
            </Paper>
          </RadioGroup>

          {errorMsg && (
            <Alert severity="error" sx={{ borderRadius: 2, fontSize: "0.8125rem" }}>
              {errorMsg}
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: "space-between" }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
        >
          {choice === "combine" ? `Combine (Qty ➔ ${nextQty})` : "Save Independent Unit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
