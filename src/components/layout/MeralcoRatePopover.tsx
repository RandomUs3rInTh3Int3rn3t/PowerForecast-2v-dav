import React, { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import {
  Bolt as BoltIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  ElectricBolt as ElectricBoltIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import { getMeralcoTariff, MeralcoTariffData, DEFAULT_MERALCO_TARIFF } from "../../lib/meralcoRateService";
import { useToast } from "../common/ToastProvider";
import { useLanguage } from "../../context/LanguageContext";

export const MeralcoRatePopover: React.FC = () => {
  const { language, t } = useLanguage();
  const { showSuccess } = useToast();
  const [tariff, setTariff] = useState<MeralcoTariffData>(DEFAULT_MERALCO_TARIFF);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getMeralcoTariff(false).then((data) => setTariff(data));
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setAnchorEl(event.currentTarget);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 250);
  };

  const handlePopoverMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  const handlePopoverMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setAnchorEl(null);
    }, 250);
  };

  const handleRefresh = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      const freshData = await getMeralcoTariff(true);
      setTariff(freshData);
      showSuccess(
        language === "tl"
          ? `Na-refetch ang taripa ng Meralco! Gen Rate: ₱${freshData.generationRate.toFixed(4)}/kWh`
          : `Meralco Tariff refetched! Gen Rate: ₱${freshData.generationRate.toFixed(4)}/kWh (${freshData.billingPeriod})`,
        language === "tl" ? "Taripa Na-update" : "Meralco Rates Refreshed"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const isOpen = Boolean(anchorEl);
  const total = tariff.totalEffectiveRate || 14.8575;

  const formattedTime = tariff.lastSyncedAt
    ? new Date(tariff.lastSyncedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "Just now";

  return (
    <>
      {/* Header Rate Badge Button */}
      <Tooltip
        title={isOpen ? "" : (language === "tl" ? "I-hover para sa buong detalye • I-click para i-refetch" : "Hover for full tariff breakdown • Click to refetch data")}
        arrow
        disableHoverListener={isOpen}
      >
        <Chip
          icon={
            isRefreshing ? (
              <RefreshIcon
                sx={{
                  fontSize: "14px !important",
                  color: "#ffd54f !important",
                  animation: "spin 0.8s linear infinite",
                  "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
                }}
              />
            ) : (
              <BoltIcon sx={{ color: "#ffd54f !important", fontSize: "16px !important" }} />
            )
          }
          label={`₱${tariff.generationRate.toFixed(4)}/kWh`}
          size="small"
          onClick={handleRefresh}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            display: { xs: "none", md: "inline-flex" },
            fontWeight: 800,
            fontFamily: "monospace",
            cursor: "pointer",
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(13, 148, 136, 0.08)",
            color: (theme) => (theme.palette.mode === "dark" ? "#f1f5f9" : "#0f766e"),
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark"
                ? isOpen
                  ? "primary.main"
                  : "rgba(0, 229, 201, 0.3)"
                : isOpen
                ? "primary.main"
                : "rgba(13, 148, 136, 0.25)",
            height: 26,
            transition: "all 0.2s ease",
            "&:hover": {
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.14)",
              borderColor: "primary.main",
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(0, 229, 201, 0.2)",
            },
          }}
        />
      </Tooltip>

      {/* Rich Hover Breakdown Popover */}
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        disableRestoreFocus
        sx={{
          pointerEvents: "none",
        }}
        slotProps={{
          paper: {
            onMouseEnter: handlePopoverMouseEnter,
            onMouseLeave: handlePopoverMouseLeave,
            sx: {
              pointerEvents: "auto",
              mt: 1.25,
              width: { xs: 340, sm: 460 },
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(20, 23, 28, 0.98)" : "#ffffff",
              backgroundImage: "none",
              border: "1px solid",
              borderColor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
              boxShadow: (theme) =>
                theme.palette.mode === "dark"
                  ? "0 16px 48px rgba(0, 0, 0, 0.6)"
                  : "0 12px 36px rgba(15, 23, 42, 0.12)",
              backdropFilter: "blur(20px)",
              p: 2,
              color: "text.primary",
            },
          },
        }}
      >
        {/* Popover Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.25,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.15)" : "rgba(13, 148, 136, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary.main",
              }}
            >
              <ElectricBoltIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, color: "text.primary" }}>
                {language === "tl" ? "Talaan ng Taripa ng Meralco" : "Meralco Tariff Breakdown"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>
                {language === "tl" ? tariff.billingPeriodTl : tariff.billingPeriod}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: "12px !important", color: "#10b981 !important" }} />}
              label={language === "tl" ? "Live Sync" : "Live Sync"}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.625rem",
                fontWeight: 800,
                bgcolor: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.25)",
              }}
            />
            <Tooltip title={language === "tl" ? "I-refetch ang datos" : "Refetch latest Meralco data"}>
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={isRefreshing}
                sx={{
                  p: 0.5,
                  borderRadius: 1,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.06)" : "#f1f5f9",
                  "&:hover": { color: "primary.main" },
                }}
              >
                <RefreshIcon
                  sx={{
                    fontSize: 15,
                    animation: isRefreshing ? "spin 0.8s linear infinite" : "none",
                    "@keyframes spin": { "0%": { transform: "rotate(0deg)" }, "100%": { transform: "rotate(360deg)" } },
                  }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Unbundled Tariff Breakdown Table */}
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 1.25,
            bgcolor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(248, 250, 252, 0.8)",
            border: "1px solid",
            borderColor: (theme) =>
              theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f1f5f9",
                }}
              >
                <TableCell sx={{ fontWeight: 800, fontSize: "0.6875rem", color: "text.secondary", py: 0.75 }}>
                  {language === "tl" ? "KOMPONENT" : "COMPONENT"}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.6875rem", color: "text.secondary", py: 0.75 }}>
                  {language === "tl" ? "HALAGA / kWh" : "RATE / kWh"}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, fontSize: "0.6875rem", color: "text.secondary", py: 0.75 }}>
                  {language === "tl" ? "BAHAGI" : "SHARE"}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tariff.components.map((c) => {
                const isGen = c.category === "generation";
                const sharePercent = ((c.ratePerKwh / total) * 100).toFixed(1);
                return (
                  <TableRow
                    key={c.name}
                    hover
                    sx={{
                      bgcolor: isGen
                        ? (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(0, 229, 201, 0.06)"
                              : "rgba(13, 148, 136, 0.06)"
                        : "transparent",
                    }}
                  >
                    <TableCell sx={{ py: 0.65, borderBottom: "1px solid", borderColor: "divider" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography variant="body2" sx={{ fontSize: "0.8125rem", lineHeight: 1 }}>
                          {c.icon}
                        </Typography>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: isGen ? 800 : 600,
                              color: isGen ? "primary.main" : "text.primary",
                              display: "block",
                              lineHeight: 1.2,
                            }}
                          >
                            {language === "tl" ? c.nameTl : c.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.625rem" }}>
                            {language === "tl" ? c.descriptionTl : c.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        py: 0.65,
                        fontFamily: "monospace",
                        fontWeight: isGen ? 900 : 700,
                        color: isGen ? "primary.main" : c.ratePerKwh < 0 ? "success.main" : "text.primary",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {c.ratePerKwh < 0 ? `-₱${Math.abs(c.ratePerKwh).toFixed(4)}` : `₱${c.ratePerKwh.toFixed(4)}`}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        py: 0.65,
                        fontFamily: "monospace",
                        fontSize: "0.6875rem",
                        color: "text.secondary",
                        fontWeight: 600,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {sharePercent}%
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Total Effective Rate Row */}
              <TableRow
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.12)" : "rgba(13, 148, 136, 0.1)",
                }}
              >
                <TableCell sx={{ py: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "primary.main", fontSize: "0.75rem" }}>
                    {language === "tl" ? "KABUUANG BLENDED RATE" : "TOTAL EFFECTIVE RATE"}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 1, fontFamily: "monospace", fontWeight: 900, fontSize: "0.875rem", color: "primary.main" }}>
                  ₱{tariff.totalEffectiveRate.toFixed(4)}
                </TableCell>
                <TableCell align="right" sx={{ py: 1, fontFamily: "monospace", fontWeight: 900, fontSize: "0.75rem", color: "primary.main" }}>
                  100.0%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer Info & Last Synced Timestamp */}
        <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", fontFamily: "monospace" }}>
            {language === "tl" ? "Huling Na-sync:" : "Last Synced:"} {formattedTime}
          </Typography>
          <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700, fontSize: "0.6875rem" }}>
            {language === "tl" ? "I-click ang badge para i-refresh" : "Click badge anytime to refetch"}
          </Typography>
        </Box>
      </Popover>
    </>
  );
};

export default MeralcoRatePopover;
