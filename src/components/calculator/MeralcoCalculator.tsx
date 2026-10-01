import React, { useState, useMemo, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Slider from "@mui/material/Slider";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Collapse from "@mui/material/Collapse";
import {
  Calculate as CalcIcon,
  Bolt as BoltIcon,
  RestartAlt as RotateCcwIcon,
  Print as PrinterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AutoAwesome as SparklesIcon,
  Whatshot as FlameIcon,
  Home as HomeIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import { calculateMeralcoBill, DEFAULT_MERALCO_RATES } from "../../lib/meralcoCalculator";
import { devLog } from "../../lib/devLogger";

export const MeralcoCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [tariffType, setTariffType] = useState<"residential" | "commercial">("residential");
  const [kwh, setKwh] = useState<number>(320);
  const [genRate, setGenRate] = useState<number>(DEFAULT_MERALCO_RATES.defaultGenerationRate);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [isSenior, setIsSenior] = useState<boolean>(false);
  const [showItemized, setShowItemized] = useState<boolean>(true);

  // What-If Simulation State
  const [simWatts, setSimWatts] = useState<number>(950);
  const [simHoursReduced, setSimHoursReduced] = useState<number>(2);

  const bill = useMemo(() => {
    return calculateMeralcoBill(kwh, genRate, otherCharges, isSenior, tariffType);
  }, [kwh, genRate, otherCharges, isSenior, tariffType]);

  useEffect(() => {
    devLog.telemetry(
      "Calculator",
      `Unbundled ${tariffType} bill calculated for ${kwh} kWh: ₱${bill.totalBill.toLocaleString(undefined, { minimumFractionDigits: 2 })} (Effective: ₱${bill.effectiveRatePerKwh.toFixed(4)}/kWh)`,
      {
        tariffType,
        volumeKwh: kwh,
        effectiveRate: bill.effectiveRatePerKwh,
        totalBillPHP: bill.totalBill,
        isLifelineEligible: bill.isLifelineEligible,
        isSeniorCitizen: isSenior,
        generationTotal: bill.generationTotal,
        distributionTotal: bill.distributionTotal,
        taxesTotal: bill.totalTaxesAndSubsidies,
      }
    );
  }, [kwh, genRate, otherCharges, isSenior, tariffType, bill]);

  const simMonthlyKwhSaved = (simWatts * simHoursReduced * 30) / 1000;
  const simMonthlyPesosSaved = simMonthlyKwhSaved * (bill.effectiveRatePerKwh || 14.82);

  const genPct = bill.totalBill > 0 ? (bill.generationTotal / bill.totalBill) * 100 : 0;
  const transPct = bill.totalBill > 0 ? (bill.transmissionTotal / bill.totalBill) * 100 : 0;
  const sysLossPct = bill.totalBill > 0 ? (bill.systemLossTotal / bill.totalBill) * 100 : 0;
  const distPct = bill.totalBill > 0 ? (bill.distributionTotal / bill.totalBill) * 100 : 0;
  const taxPct = bill.totalBill > 0 ? (bill.totalTaxesAndSubsidies / bill.totalBill) * 100 : 0;

  const handleReset = () => {
    setKwh(320);
    setGenRate(DEFAULT_MERALCO_RATES.defaultGenerationRate);
    setOtherCharges(0);
    setIsSenior(false);
  };

  return (
    <Box sx={{ position: "relative", display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
      {/* Top Banner Header */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                bgcolor: "primary.main",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <CalcIcon sx={{ color: "#ffd54f" }} />
            </Box>
            Interactive Bill Calculator
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Configure monthly electricity consumption to inspect real-time unbundled itemized breakdowns.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleReset}
            startIcon={<RotateCcwIcon />}
            sx={{ fontWeight: 700 }}
          >
            Reset
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => window.print()}
            startIcon={<PrinterIcon />}
            sx={{ fontWeight: 700 }}
          >
            Print Breakdown
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ position: "relative", zIndex: 1, borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)}>
          <Tab icon={<BoltIcon fontSize="small" />} iconPosition="start" label="Bill Parameters" />
          <Tab icon={<SparklesIcon fontSize="small" />} iconPosition="start" label="What-If Energy Savings" />
        </Tabs>
      </Box>

      <Grid container spacing={{ xs: 2.5, sm: 3 }} sx={{ position: "relative", zIndex: 1 }}>
        {/* Left Column: Config Inputs */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {activeTab === 0 ? (
              <Card
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                    1. Tariff Classification
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                    Meralco tariff schedule determines distribution rates and lifeline subsidies
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                    Select Space Tariff
                  </Typography>
                  <Grid container spacing={1.5} data-tour="calculator-space-comparison">
                    <Grid size={6}>
                      <Paper
                        variant="outlined"
                        onClick={() => setTariffType("residential")}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.25,
                          cursor: "pointer",
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: (theme) =>
                            tariffType === "residential"
                              ? theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.35)" : "rgba(13, 148, 136, 0.35)"
                              : "divider",
                          bgcolor: (theme) =>
                            tariffType === "residential"
                              ? theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.06)" : "rgba(13, 148, 136, 0.05)"
                              : "transparent",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.45)" : "rgba(13, 148, 136, 0.45)",
                          },
                        }}
                      >
                        <HomeIcon sx={{ color: tariffType === "residential" ? "primary.main" : "text.secondary", mb: 0.5 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tariffType === "residential" ? "primary.main" : "text.primary" }}>
                          Residential
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          230V Stepped Tiers
                        </Typography>
                      </Paper>
                    </Grid>

                    <Grid size={6}>
                      <Paper
                        variant="outlined"
                        onClick={() => setTariffType("commercial")}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.25,
                          cursor: "pointer",
                          textAlign: "center",
                          border: "1px solid",
                          borderColor: (theme) =>
                            tariffType === "commercial"
                              ? theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.4)" : "rgba(225, 29, 72, 0.35)"
                              : "divider",
                          bgcolor: (theme) =>
                            tariffType === "commercial"
                              ? theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.06)" : "rgba(244, 63, 94, 0.04)"
                              : "transparent",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            borderColor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(244, 63, 94, 0.55)" : "rgba(225, 29, 72, 0.45)",
                          },
                        }}
                      >
                        <StoreIcon sx={{ color: tariffType === "commercial" ? "secondary.main" : "text.secondary", mb: 0.5 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tariffType === "commercial" ? "secondary.main" : "text.primary" }}>
                          Commercial
                        </Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", fontSize: "0.6875rem" }}>
                          General Power Flat
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>

                {/* Base Generation Charge */}
                <Box data-tour="calculator-subsidies">
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
                    BASE GENERATION CHARGE (₱ / kWh)
                  </Typography>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    value={genRate}
                    onChange={(e) => setGenRate(Number(e.target.value) || 0)}
                    slotProps={{
                      input: {
                        startAdornment: <Typography sx={{ mr: 1, fontWeight: 700, color: "text.secondary" }}>₱</Typography>,
                      },
                    }}
                  />
                  <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                    {[
                      { label: "Current (₱9.25)", val: 9.2504 },
                      { label: "Low (₱8.91)", val: 8.91 },
                      { label: "High (₱9.85)", val: 9.85 },
                    ].map((btn) => (
                      <Chip
                        key={btn.label}
                        label={btn.label}
                        size="small"
                        clickable
                        onClick={() => setGenRate(btn.val)}
                        color={genRate === btn.val ? "primary" : "default"}
                        variant={genRate === btn.val ? "filled" : "outlined"}
                        sx={{ fontWeight: 600, fontSize: "0.6875rem" }}
                      />
                    ))}
                  </Box>
                </Box>

                {/* Other Charges */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
                    OTHER CHARGES / BILL DEPOSIT (PHP)
                  </Typography>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    value={otherCharges}
                    onChange={(e) => setOtherCharges(Number(e.target.value) || 0)}
                    slotProps={{
                      input: {
                        startAdornment: <Typography sx={{ mr: 1, fontWeight: 700, color: "text.secondary" }}>₱</Typography>,
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, display: "block" }}>
                    Enter any extra monthly meter or deposit adjustments (default: ₱0.00).
                  </Typography>
                </Box>

                {/* Monthly kWh Slider */}
                <Box data-tour="calculator-kwh-slider">
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      MONTHLY CONSUMPTION
                    </Typography>
                    <Chip
                      label={`${kwh} kWh`}
                      color="primary"
                      size="small"
                      sx={{ fontWeight: 800, fontFamily: "monospace" }}
                    />
                  </Box>
                  <Slider
                    value={kwh}
                    min={0}
                    max={1000}
                    step={5}
                    onChange={(_, val) => setKwh(val as number)}
                    valueLabelDisplay="auto"
                  />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>0 kWh (Lifeline)</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>200 kWh</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>500 kWh</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>1000+ kWh</Typography>
                  </Box>
                </Box>

                {/* Quick Presets */}
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}>
                    QUICK VOLUME PRESETS
                  </Typography>
                  <Grid container spacing={1}>
                    {[100, 200, 300, 500].map((preset) => (
                      <Grid size={3} key={preset}>
                        <Button
                          variant={kwh === preset ? "contained" : "outlined"}
                          fullWidth
                          size="small"
                          onClick={() => setKwh(preset)}
                          sx={{ fontFamily: "monospace", fontWeight: 700 }}
                        >
                          {preset}
                        </Button>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Senior Citizen Discount (Residential Only) */}
                {tariffType === "residential" && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                        Senior Citizen 5% Discount
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                        Applies to residential consumption ≤ 100 kWh
                      </Typography>
                    </Box>
                    <Checkbox
                      checked={isSenior}
                      onChange={(e) => setIsSenior(e.target.checked)}
                      color="primary"
                    />
                  </Paper>
                )}
              </Card>
            ) : (
              <Card
                data-tour="calculator-whatif"
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 1.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2.5,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                      <FlameIcon sx={{ color: "warning.main" }} />
                      Savings Simulator
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      Calculate savings by trimming appliance usage hours
                    </Typography>
                  </Box>
                  <Chip label="WHAT-IF" size="small" color="secondary" sx={{ fontWeight: 700 }} />
                </Box>

                <Divider />

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField
                      label="Appliance Watts"
                      type="number"
                      fullWidth
                      size="small"
                      value={simWatts}
                      onChange={(e) => setSimWatts(Number(e.target.value) || 0)}
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Hours Cut / Day"
                      type="number"
                      fullWidth
                      size="small"
                      value={simHoursReduced}
                      onChange={(e) => setSimHoursReduced(Number(e.target.value) || 0)}
                    />
                  </Grid>
                </Grid>

                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(0, 158, 136, 0.08)",
                    border: "1px solid",
                    borderColor: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase" }}>
                      Estimated Monthly Savings
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main", letterSpacing: "-0.02em" }}>
                      ₱{simMonthlyPesosSaved.toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      Volume Saved
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                      {simMonthlyKwhSaved.toFixed(1)} kWh/mo
                    </Typography>
                  </Box>
                </Paper>
              </Card>
            )}
          </Box>
        </Grid>

        {/* Right Column: Output Receipt & Breakdown */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3 } }}>
            {/* Total Amount Due Display */}
            <Card
              data-tour="calculator-summary"
              sx={{
                p: { xs: 3, sm: 4 },
                textAlign: "center",
                borderRadius: 1.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(24, 27, 32, 0.95)"
                    : "#ffffff",
                border: "1px solid",
                borderColor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
                boxShadow: (theme) =>
                  theme.palette.mode === "dark"
                    ? "0 12px 36px rgba(0, 0, 0, 0.45), 0 0 24px rgba(0, 229, 201, 0.1)"
                    : "0 4px 20px rgba(15, 23, 42, 0.04)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "primary.light" : "primary.main", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Total Projected Amount Due
              </Typography>

              <Typography
                variant="h2"
                sx={{
                  fontWeight: 900,
                  fontFamily: "monospace",
                  letterSpacing: "-0.03em",
                  my: 1,
                  color: (theme) => (theme.palette.mode === "dark" ? "primary.main" : "#0d9488"),
                  fontSize: { xs: "2.25rem", sm: "3rem", md: "3.5rem" },
                }}
              >
                ₱
                {bill.totalBill.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, color: "text.secondary", fontSize: "0.8125rem", mt: 0.5, flexWrap: "wrap", justifyContent: "center" }}>
                <span>Power Supply: ₱{bill.generationTotal.toFixed(2)}</span>
                <span>•</span>
                <span>Other Grid Fees: ₱{(bill.totalBill - bill.generationTotal).toFixed(2)}</span>
              </Box>

              <Chip
                label={`Calculated for ${kwh} kWh (Effective: ₱${bill.effectiveRatePerKwh.toFixed(4)}/kWh)`}
                size="small"
                sx={{
                  mt: 2,
                  fontWeight: 700,
                  fontFamily: "monospace",
                  height: 26,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.1)" : "rgba(13, 148, 136, 0.08)",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#00e5c9" : "#0f766e",
                  border: "1px solid",
                  borderColor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.2)",
                }}
              />
            </Card>

            {/* Cost Share Distribution Bar */}
            <Card
              data-tour="calculator-unbundled"
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: 1.5,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 0.5 }}>
                Cost Share Distribution
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                Unbundled bill components proportion
              </Typography>

              <Box
                sx={{
                  height: 14,
                  width: "100%",
                  borderRadius: 1,
                  display: "flex",
                  overflow: "hidden",
                  bgcolor: "action.hover",
                  p: "2px",
                  mb: 2,
                }}
              >
                <Box sx={{ width: `${genPct}%`, bgcolor: "primary.main", borderRadius: "6px 0 0 6px" }} title={`Generation: ${genPct.toFixed(1)}%`} />
                <Box sx={{ width: `${transPct}%`, bgcolor: "info.main" }} title={`Transmission: ${transPct.toFixed(1)}%`} />
                <Box sx={{ width: `${distPct}%`, bgcolor: "success.main" }} title={`Distribution: ${distPct.toFixed(1)}%`} />
                <Box sx={{ width: `${taxPct}%`, bgcolor: "error.main", borderRadius: "0 6px 6px 0" }} title={`Taxes: ${taxPct.toFixed(1)}%`} />
              </Box>

              <Grid container spacing={1}>
                {[
                  { label: "Generation", pct: genPct, color: "primary.main" },
                  { label: "Transmission", pct: transPct, color: "info.main" },
                  { label: "Distribution", pct: distPct, color: "success.main" },
                  { label: "Taxes & VAT", pct: taxPct, color: "error.main" },
                ].map((leg) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={leg.label}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: leg.color }} />
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                        {leg.label} ({leg.pct.toFixed(0)}%)
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Divider sx={{ my: 2.5 }} />

              {/* Itemized Tariff Table */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Official Itemized Tariff Receipt
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowItemized(!showItemized)}
                  endIcon={showItemized ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  {showItemized ? "Hide" : "Show"}
                </Button>
              </Box>

              <Collapse in={showItemized}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  {[
                    { label: "1. Generation Charge (Power Supply)", val: bill.generationTotal },
                    { label: "2. Transmission Charge (Grid Delivery)", val: bill.transmissionTotal },
                    { label: "3. System Loss Charge (Distribution Loss)", val: bill.systemLossTotal },
                    { label: "4. Distribution Charge (Supply, Metering, Lines)", val: bill.distributionTotal },
                    { label: "5. Universal Charges & FIT-All Subsidy", val: (bill.universalCharges?.total || 0) + (bill.fitAll || 0) },
                    { label: "6. Government Taxes (12% VAT + Franchise)", val: bill.totalTaxesAndSubsidies },
                  ].map((row, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 0.75,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {row.label}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                        ₱{row.val.toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MeralcoCalculator;
