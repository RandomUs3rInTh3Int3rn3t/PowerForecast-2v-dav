import React, { useState, useEffect } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import {
  CameraAlt as CameraIcon,
  CloudUpload as UploadIcon,
  AutoAwesome as SparklesIcon,
  CheckCircle as CheckCircleIcon,
  Delete as TrashIcon,
  Close as CloseIcon,
  Bolt as BoltIcon,
  InfoOutlined as InfoIcon,
} from "@mui/icons-material";
import { analyzeMultipleApplianceImages, ImageItem } from "../../lib/visionService";
import { compressImageFile } from "../../lib/imageOptimization";
import { VisionScanResult, UserAppliance, ApplianceList, STREAMLINED_CATEGORIES } from "../../types";
import { useCreate, useUpdate, useList } from "@refinedev/core";
import { getDefaultStartHour } from "../../lib/loadCurveService";
import {
  isCompressorInverterCategory,
  normalizeApplianceCategory,
} from "../../lib/dailyUsageService";
import { devLog } from "../../lib/devLogger";
import { DuplicateApplianceModal } from "../appliances/DuplicateApplianceModal";
import { PcSpecBuilderSection } from "../appliances/PcSpecBuilderSection";

interface AiVisionScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultListId?: string | null;
}

export const AiVisionScannerModal: React.FC<AiVisionScannerModalProps> = ({
  isOpen,
  onClose,
  defaultListId,
}) => {
  const [categoryHint, setCategoryHint] = useState<string>("Auto-Detect from Photo");
  const [isScanning, setIsScanning] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [scanResult, setScanResult] = useState<VisionScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [stagedImages, setStagedImages] = useState<ImageItem[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(defaultListId || "");

  // Editable fields before saving
  const [editName, setEditName] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editWatts, setEditWatts] = useState<number>(70);
  const [editMonthlyKwh, setEditMonthlyKwh] = useState<number>(16.8);
  const [editCategory, setEditCategory] = useState("Electric Fans");
  const [editRoom, setEditRoom] = useState("Living Room");
  const [editIsInverter, setEditIsInverter] = useState<boolean>(false);
  const [editCustomCruisingWatts, setEditCustomCruisingWatts] = useState<number | "">("");
  const [editPcMetadata, setEditPcMetadata] = useState<Record<string, any>>({});

  // Duplicate modal states
  const [duplicateIncoming, setDuplicateIncoming] = useState<Partial<UserAppliance> | null>(null);
  const [duplicateExisting, setDuplicateExisting] = useState<UserAppliance | null>(null);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  const appliancesRes = useList<UserAppliance>({
    resource: "user_appliances",
    pagination: { mode: "off" },
  }) as any;

  const listsRes = useList<ApplianceList>({
    resource: "appliance_lists",
    pagination: { mode: "off" },
  }) as any;

  const appliances: UserAppliance[] = appliancesRes?.data?.data || appliancesRes?.result?.data || [];
  const spaces: ApplianceList[] = listsRes?.data?.data || listsRes?.result?.data || [];

  const { mutate: createAppliance, isLoading: isSaving } = useCreate();
  const { mutate: updateAppliance } = useUpdate();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setScanError(null);

    const remainingSlots = 3 - stagedImages.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsCompressing(true);

    try {
      const processedImages: ImageItem[] = await Promise.all(
        filesToProcess.map(async (file) => {
          try {
            const compressed = await compressImageFile(file, {
              maxWidth: 1600,
              maxHeight: 1600,
              quality: 0.82,
            });
            return {
              id: `img-${Date.now()}-${Math.random()}`,
              base64: compressed.base64,
              file: compressed.file,
              name: file.name,
            };
          } catch (compErr) {
            devLog.warn('AI Scanner', `Compression failed for ${file.name}, using fallback reader:`, compErr);
            return new Promise<ImageItem>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  id: `img-${Date.now()}-${Math.random()}`,
                  base64: reader.result as string,
                  file,
                  name: file.name,
                });
              };
              reader.readAsDataURL(file);
            });
          }
        })
      );

      setStagedImages((prev) => [...prev, ...processedImages].slice(0, 3));
    } catch (err: any) {
      devLog.error("AI Scanner", "Failed to stage photos:", err);
      setScanError("Failed to process photos. Please try again.");
    } finally {
      setIsCompressing(false);
    }
  };

  const removeStagedImage = (id: string) => {
    setStagedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleScan = async () => {
    if (stagedImages.length === 0) return;

    setIsScanning(true);
    setScanResult(null);
    setScanError(null);

    try {
      devLog.info("AI Scanner", `Sending ${stagedImages.length} image(s) to Google Gemini Multimodal AI (Category: ${categoryHint})...`);
      const result = await analyzeMultipleApplianceImages({
        images: stagedImages,
        categoryHint,
      });
      setScanResult(result);

      if (result) {
        setEditName(
          result.detected_model
            ? `${result.detected_brand || ""} ${result.detected_model}`.trim()
            : result.detected_brand || "Smart Inverter Appliance"
        );
        setEditBrand(result.detected_brand || "");
        setEditModel(result.detected_model || "");
        setEditWatts(result.detected_watts || 100);
        setEditMonthlyKwh(result.detected_monthly_kwh || 25);
        setEditIsInverter(Boolean(result.is_inverter));
        if (result.cruising_watts !== undefined && result.cruising_watts !== null) {
          setEditCustomCruisingWatts(result.cruising_watts);
        }
        if (result.pc_metadata) {
          setEditPcMetadata(result.pc_metadata);
        }
        if (result.detected_category) setEditCategory(result.detected_category);
      }
    } catch (err: any) {
      devLog.error("AI Scanner", "Analysis error:", err);
      setScanError(err.message || "Failed to process image with Google Gemini AI.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToInventory = () => {
    const targetListId = defaultListId || (spaces[0]?.id ?? null);
    const targetSpace = spaces.find((s) => s.id === targetListId);
    const normalizedCat = normalizeApplianceCategory(editCategory, editName, editModel);
    const isComputer = normalizedCat === "Computers & Laptops";
    const isCustomCruising = editCustomCruisingWatts !== "" && Number(editCustomCruisingWatts) > 0;
    const effectiveRunningWatts = isComputer
      ? (Number(editCustomCruisingWatts) > 0 ? Number(editCustomCruisingWatts) : Math.round(editWatts * 0.45))
      : editIsInverter && isCustomCruising ? Number(editCustomCruisingWatts) : undefined;

    const incomingPayload: Partial<UserAppliance> = {
      name: editName || "Scanned Appliance",
      category: normalizedCat,
      brand: editBrand,
      model: editModel,
      watts: editWatts,
      quantity: 1,
      hours_per_day: 8,
      days_per_month: 30,
      start_hour: getDefaultStartHour(normalizedCat),
      room_location: editRoom,
      energy_rating: scanResult?.detected_energy_rating || `${scanResult?.detected_star_rating || 5}-Star (AI Scan)`,
      monthly_kwh: editMonthlyKwh,
      list_id: targetListId,
      tariff_type: targetSpace?.tariff_type || "residential",
      ai_metadata: {
        is_inverter: editIsInverter,
        is_computer: isComputer,
        ...(scanResult?.detected_model ? { detected_model: scanResult.detected_model } : {}),
        ...(isComputer ? editPcMetadata : {}),
        ...(effectiveRunningWatts ? { cruising_watts: effectiveRunningWatts } : {}),
      },
    };

    // Check if duplicate already exists in target space
    const existing = appliances.find((a) => {
      const isSameSpace = a.list_id === targetListId || (!a.list_id && spaces.find((s) => s.id === targetListId)?.is_default);
      if (!isSameSpace) return false;

      const isSameName = a.name?.trim().toLowerCase() === editName.trim().toLowerCase();
      const isSameModel =
        editBrand.trim() &&
        editModel.trim() &&
        a.brand?.trim().toLowerCase() === editBrand.trim().toLowerCase() &&
        a.model?.trim().toLowerCase() === editModel.trim().toLowerCase();

      return isSameName || isSameModel;
    });

    if (existing) {
      setDuplicateExisting(existing);
      setDuplicateIncoming(incomingPayload);
      setIsDuplicateModalOpen(true);
      return;
    }

    createAppliance(
      {
        resource: "user_appliances",
        values: incomingPayload,
      },
      {
        onSuccess: () => {
          devLog.info("AI Scanner", `Saved scanned appliance "${editName}" to inventory.`);
          onClose();
        },
      }
    );
  };

  const handleCombineQuantity = (existing: UserAppliance) => {
    updateAppliance(
      {
        resource: "user_appliances",
        id: existing.id,
        values: {
          quantity: (existing.quantity || 1) + 1,
        },
      },
      {
        onSuccess: () => {
          devLog.info("AI Scanner", `Incremented quantity for duplicate "${existing.name}".`);
          onClose();
        },
      }
    );
  };

  const handleAddDistinct = (distinctPayload: Partial<UserAppliance>) => {
    createAppliance(
      {
        resource: "user_appliances",
        values: distinctPayload,
      },
      {
        onSuccess: () => {
          devLog.info("AI Scanner", `Saved separate scanned unit "${distinctPayload.name}" to inventory.`);
          onClose();
        },
      }
    );
  };

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, py: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1,
              bgcolor: "primary.main",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CameraIcon sx={{ color: "#ffd54f" }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Google Gemini AI Energy Auditor
              </Typography>
              <Chip label="Multimodal Vision" size="small" color="primary" sx={{ fontWeight: 700, height: 20 }} />
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              Upload nameplate or appliance rating label photos to automatically infer wattage & specs
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ color: "text.secondary" }} />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Error Alert Display */}
        {scanError && (
          <Alert severity="error" onClose={() => setScanError(null)} sx={{ borderRadius: 1 }}>
            {scanError}
          </Alert>
        )}

        {/* Category Hint Selector & Space / Key Controls */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 220, md: 260 }, flex: { xs: "1 1 100%", sm: "auto" } }}>
            <InputLabel>Appliance Category</InputLabel>
            <Select
              value={categoryHint}
              label="Appliance Category"
              onChange={(e) => {
                const val = e.target.value;
                setCategoryHint(val);
                if (val !== "Auto-Detect from Photo") {
                  setEditCategory(val);
                  if (isCompressorInverterCategory(val)) {
                    setEditIsInverter(true);
                  }
                }
              }}
            >
              <MenuItem value="Auto-Detect from Photo">
                <em>Auto-Detect from Photo</em>
              </MenuItem>
              {STREAMLINED_CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: { xs: "100%", sm: "auto" } }}>
            {spaces.length > 1 && (
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 }, flex: { xs: "1 1 100%", sm: "auto" } }}>
                <InputLabel>Target Space</InputLabel>
                <Select
                  value={selectedSpaceId}
                  label="Target Space"
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                >
                  {spaces.map((sp) => (
                    <MenuItem key={sp.id} value={sp.id}>
                      {sp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

          </Box>
        </Box>

        {/* Category-Adaptive Inverter Pre-Scan Telemetry & Switch */}
        {isCompressorInverterCategory(categoryHint) && (() => {
          const isFridge = categoryHint.toLowerCase().includes("refrig") || categoryHint.toLowerCase().includes("freezer");
          return (
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: editIsInverter
                  ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.05)" : "rgba(13, 148, 136, 0.04)")
                  : "action.hover",
                borderColor: editIsInverter
                  ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)")
                  : "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <BoltIcon color={editIsInverter ? "primary" : "action"} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: editIsInverter ? "primary.main" : "text.primary" }}>
                    {isFridge ? "Inverter Refrigerator / Freezer" : "Inverter Air Conditioner"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {editIsInverter
                      ? `AI Vision will calibrate for variable-speed compressor and cruising wattage (${isFridge ? "~33% continuous draw" : "~42% steady-state"})`
                      : "Fixed-speed continuous rated draw mode"}
                  </Typography>
                </Box>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={editIsInverter}
                    onChange={(e) => setEditIsInverter(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 800, color: editIsInverter ? "primary.main" : "text.secondary" }}>
                    {editIsInverter ? "INVERTER ON" : "INVERTER OFF"}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
            </Paper>
          );
        })()}

        {/* Category-Adaptive Computer & Laptop Spec Builder (Parity with Manual Entry) */}
        {normalizeApplianceCategory(categoryHint) === "Computers & Laptops" && !scanResult && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <PcSpecBuilderSection
              initialRatedWatts={editWatts > 0 ? editWatts : 350}
              initialCruisingWatts={typeof editCustomCruisingWatts === "number" ? editCustomCruisingWatts : undefined}
              initialMetadata={editPcMetadata}
              onSpecChange={({ ratedWatts, runningWatts, metadata }) => {
                setEditWatts(ratedWatts);
                setEditCustomCruisingWatts(runningWatts);
                setEditPcMetadata(metadata);
                if (!editName || editName === "Scanned Appliance") {
                  setEditName(`${metadata?.pc_type || "PC"} System`);
                }
                setEditMonthlyKwh(Math.round(((runningWatts * 8 * 30) / 1000) * 10) / 10);
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1, px: 0.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Configured PC: <strong>{editWatts > 0 ? editWatts : 350}W Rated</strong> / <strong>{editCustomCruisingWatts || Math.round((editWatts > 0 ? editWatts : 350) * 0.45)}W Running</strong>. You can upload photos below to scan labels, or save this rig directly.
              </Typography>
              <Button
                variant="contained"
                size="small"
                onClick={handleSaveToInventory}
                startIcon={<CheckCircleIcon />}
                sx={{ fontWeight: 700, textTransform: "none" }}
              >
                Save Configured PC to Space
              </Button>
            </Box>
          </Box>
        )}

        {/* English AI Scanning Advisory / Notice Banner */}
        <Alert
          severity="info"
          icon={<InfoIcon fontSize="small" />}
          sx={{
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
            bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.04)",
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, display: "block", color: "primary.main" }}>
            AI Optical Recognition & Accuracy Notice
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, lineHeight: 1.5 }}>
            Optical recognition accuracy depends heavily on photo quality and label condition. Harsh reflective glare, blurry or angled captures, occluded text, or peeling nameplates may result in estimated or incomplete figures. For best results, ensure well-lit, flat-angle photos displaying the full DOE yellow Energy Guide or manufacturer specification plate. Always review and verify the extracted wattage and inverter settings before saving.
          </Typography>
        </Alert>

        {/* Upload & Camera Actions Dropzone */}
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 1.5,
            textAlign: "center",
            borderStyle: "dashed",
            borderWidth: 2,
            bgcolor: "action.hover",
            borderColor: "divider",
            position: "relative",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", justifyContent: "center" }}>
              {/* Native Mobile Camera Trigger */}
              <Button
                component="label"
                variant="contained"
                color="primary"
                disabled={isCompressing || stagedImages.length >= 3}
                startIcon={<CameraIcon />}
                sx={{
                  fontWeight: 800,
                  borderRadius: 1.25,
                  px: 2.5,
                  py: 1,
                  fontSize: "0.875rem",
                  boxShadow: "0 4px 14px rgba(0, 229, 201, 0.25)",
                }}
              >
                Take Photo with Camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </Button>

              {/* Gallery / File Picker */}
              <Button
                component="label"
                variant="outlined"
                disabled={isCompressing || stagedImages.length >= 3}
                startIcon={<UploadIcon />}
                sx={{
                  fontWeight: 700,
                  borderRadius: 1.25,
                  px: 2.5,
                  py: 1,
                  fontSize: "0.875rem",
                }}
              >
                Upload from Gallery
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </Button>
            </Box>

            {isCompressing ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 600 }}>
                  Optimizing photo for AI scan (compressing to prevent size limit)...
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Capture or upload up to 3 clear photos of appliance nameplates, DOE yellow energy guides, or specification stickers
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Staged Photo Previews */}
        {stagedImages.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1.5 }}>
              STAGED PHOTOS ({stagedImages.length} / 3)
            </Typography>
            <Grid container spacing={2}>
              {stagedImages.map((img) => (
                <Grid size={4} key={img.id}>
                  <Paper
                    sx={{
                      p: 1,
                      borderRadius: 1.25,
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      component="img"
                      src={img.base64}
                      alt={img.name}
                      sx={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 1 }}
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeStagedImage(img.id)}
                      sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(0,0,0,0.6)" }}
                    >
                      <TrashIcon fontSize="small" sx={{ color: "#ffffff" }} />
                    </IconButton>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Scan Action Progress */}
        {isScanning && (
          <Box sx={{ py: 2 }}>
            <LinearProgress />
            <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 600, display: "block", textAlign: "center", mt: 1 }}>
              Google Gemini Multimodal AI is inspecting photos, recognizing circuits, and verifying specs...
            </Typography>
          </Box>
        )}

        {/* Parsed Result & Editable Form */}
        {scanResult && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.25, bgcolor: "action.hover" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "success.main", display: "flex", alignItems: "center", gap: 1 }}>
                  <CheckCircleIcon fontSize="small" />
                  Gemini AI Specs Extracted
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                  {scanResult.is_inverter && (
                    <Chip icon={<BoltIcon sx={{ fontSize: "14px !important" }} />} label="Inverter" size="small" color="success" sx={{ fontWeight: 700, height: 22 }} />
                  )}
                  {scanResult.detected_star_rating && (
                    <Chip label={`⭐ ${scanResult.detected_star_rating}-Star`} size="small" color="warning" sx={{ fontWeight: 700, height: 22 }} />
                  )}
                  {(scanResult.cspf || scanResult.eer) && (
                    <Chip label={`CSPF/EER: ${scanResult.cspf || scanResult.eer}`} size="small" color="info" sx={{ fontWeight: 600, height: 22 }} />
                  )}
                  {scanResult.cooling_capacity_kj_h && (
                    <Chip label={`${scanResult.cooling_capacity_kj_h.toLocaleString()} kJ/h`} size="small" sx={{ fontWeight: 600, height: 22 }} />
                  )}
                  <Chip
                    label={scanResult.confidence ? `${scanResult.confidence.toUpperCase()} CONFIDENCE` : "HIGH CONFIDENCE"}
                    size="small"
                    variant="outlined"
                    color={scanResult.confidence === "low" ? "warning" : "default"}
                    sx={{ fontSize: "0.65rem", height: 20 }}
                  />
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Appliance Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Brand"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Model"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Category"
                    value={normalizeApplianceCategory(editCategory)}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setEditCategory(newCat);
                      if (!isCompressorInverterCategory(newCat)) {
                        setEditIsInverter(false);
                      } else {
                        setEditIsInverter(true);
                      }
                    }}
                  >
                    {STREAMLINED_CATEGORIES.map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Room / Zone Location"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                  >
                    <MenuItem value="Living Room">Living Room</MenuItem>
                    <MenuItem value="Master Bedroom">Master Bedroom</MenuItem>
                    <MenuItem value="Bedroom 2">Bedroom 2</MenuItem>
                    <MenuItem value="Kitchen">Kitchen</MenuItem>
                    <MenuItem value="Dining">Dining</MenuItem>
                    <MenuItem value="Laundry Area">Laundry Area</MenuItem>
                    <MenuItem value="Home Office">Home Office</MenuItem>
                    <MenuItem value="Store Front / Retail">Store Front / Retail</MenuItem>
                    <MenuItem value="Workshop / Storage">Workshop / Storage</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={6}>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    label={normalizeApplianceCategory(editCategory) === "Computers & Laptops" ? "Rated / Peak Power (Watts)" : "Rated Electric Power (Watts)"}
                    value={editWatts}
                    onChange={(e) => setEditWatts(Number(e.target.value) || 0)}
                    helperText={normalizeApplianceCategory(editCategory) === "Computers & Laptops" ? "Auto-synced with specs below" : "Actual electric input wattage"}
                  />
                </Grid>
                <Grid size={6}>
                  <TextField
                    type="number"
                    fullWidth
                    size="small"
                    label="Monthly Consumption (kWh)"
                    value={editMonthlyKwh}
                    onChange={(e) => setEditMonthlyKwh(Number(e.target.value) || 0)}
                    helperText="Official DOE test or estimated monthly kWh"
                  />
                </Grid>

                {/* COMPUTER & LAPTOP SPEC BUILDER */}
                {normalizeApplianceCategory(editCategory) === "Computers & Laptops" && (
                  <Grid size={12}>
                    <PcSpecBuilderSection
                      initialRatedWatts={editWatts}
                      initialCruisingWatts={typeof editCustomCruisingWatts === "number" ? editCustomCruisingWatts : undefined}
                      initialMetadata={editPcMetadata}
                      onSpecChange={({ ratedWatts, runningWatts, metadata }) => {
                        setEditWatts(ratedWatts);
                        setEditCustomCruisingWatts(runningWatts);
                        setEditPcMetadata(metadata);
                        // Auto-update monthly kWh estimation (8 hours/day * 30 days)
                        setEditMonthlyKwh(Math.round(((runningWatts * 8 * 30) / 1000) * 10) / 10);
                      }}
                    />
                  </Grid>
                )}

                {/* INVERTER FALLBACK INTERACTIVE SWITCH */}
                {isCompressorInverterCategory(editCategory) && (() => {
                  const isFridge = editCategory.toLowerCase().includes("refrig") || editCategory.toLowerCase().includes("freezer") || editCategory.toLowerCase().includes("chiller");
                  const isWasher = editCategory.toLowerCase().includes("wash") || editCategory.toLowerCase().includes("laundry");
                  const defaultCruisingWatts = isFridge
                    ? Math.round(editWatts / 3)
                    : isWasher
                    ? Math.round(editWatts * 0.50)
                    : Math.round(editWatts * 0.42);
                  const activeCruisingWatts = editCustomCruisingWatts !== "" && Number(editCustomCruisingWatts) > 0 ? Number(editCustomCruisingWatts) : defaultCruisingWatts;
                  const isCustomCruising = editCustomCruisingWatts !== "" && Number(editCustomCruisingWatts) > 0 && Number(editCustomCruisingWatts) !== defaultCruisingWatts;
                  const cruisingPercent = editWatts > 0 ? ((activeCruisingWatts / editWatts) * 100).toFixed(1) : "0";

                  return (
                    <Grid size={12}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 1.5,
                          bgcolor: editIsInverter
                            ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.05)" : "rgba(13, 148, 136, 0.04)")
                            : "action.hover",
                          borderColor: editIsInverter
                            ? (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)")
                            : "divider",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <BoltIcon sx={{ color: editIsInverter ? "primary.main" : "text.secondary", fontSize: 20 }} />
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: editIsInverter ? "primary.main" : "text.primary" }}>
                                {isFridge ? "Inverter Compressor & Thermal Duty" : isWasher ? "Inverter Direct Drive Motor" : "Inverter Technology & Duty Cycle"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                {editIsInverter
                                  ? isFridge
                                    ? "Smart continuous thermal maintenance & cruising efficiency active"
                                    : isWasher
                                    ? "Smart variable-speed drum motor efficiency active"
                                    : "Smart compressor time-decay & cruising efficiency active"
                                  : "Standard non-inverter fixed speed (100% constant)"}
                              </Typography>
                            </Box>
                          </Box>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={editIsInverter}
                                onChange={(e) => setEditIsInverter(e.target.checked)}
                                color="primary"
                                size="medium"
                              />
                            }
                            label={
                              <Typography variant="body2" sx={{ fontWeight: 800, color: editIsInverter ? "primary.main" : "text.secondary" }}>
                                {editIsInverter ? "INVERTER ON" : "INVERTER OFF"}
                              </Typography>
                            }
                            sx={{ m: 0 }}
                          />
                        </Box>

                        {editIsInverter && (
                          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed", borderColor: "divider", display: "flex", flexDirection: "column", gap: 1.25 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                              {isFridge ? (
                                <Chip size="small" label="Thermal Duty: Steady Cruising (1/3 Cycle)" sx={{ fontWeight: 700, fontSize: "0.6875rem" }} />
                              ) : (
                                <Chip size="small" label={`1st Hr Cooldown: ${editWatts}W (100%)`} sx={{ fontWeight: 700, fontSize: "0.6875rem" }} />
                              )}
                              <Chip
                                size="small"
                                label={`Cruising Mode: ~${activeCruisingWatts}W avg${isCustomCruising ? " (Custom)" : isFridge ? " (~33%)" : isWasher ? " (~50%)" : " (~42%)"}`}
                                color="primary"
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: "0.6875rem" }}
                              />
                            </Box>

                            <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "action.hover", border: "1px solid", borderColor: "divider" }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                                  {isFridge ? "Running / Cruising Power (Watts)" : "Cruising Power (Watts)"}
                                </Typography>
                                {isCustomCruising && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={() => setEditCustomCruisingWatts("")}
                                    sx={{ fontSize: "0.6875rem", p: 0, minWidth: "auto", textTransform: "none", color: "primary.main", fontWeight: 700 }}
                                  >
                                    Reset to Auto ({isFridge ? "~33%" : isWasher ? "~50%" : "~42%"})
                                  </Button>
                                )}
                              </Box>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                                <TextField
                                  type="number"
                                  size="small"
                                  value={editCustomCruisingWatts !== "" ? editCustomCruisingWatts : defaultCruisingWatts}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setEditCustomCruisingWatts(val === "" ? "" : Math.max(0, Number(val)));
                                  }}
                                  slotProps={{
                                    input: {
                                      endAdornment: <InputAdornment position="end">W</InputAdornment>,
                                    },
                                  }}
                                  sx={{ width: 140 }}
                                />
                                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                  {activeCruisingWatts}W ({cruisingPercent}% of {editWatts}W rated)
                                  {isCustomCruising ? " • Custom Override" : ` • Smart Auto (${isFridge ? "~33%" : isWasher ? "~50%" : "~42%"})`}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                              <InfoIcon sx={{ fontSize: 16, color: "text.secondary", mt: 0.25 }} />
                              <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4 }}>
                                {isFridge
                                  ? "Na-detect ng Gemini AI na Inverter ang unit na ito. Tumatakbo ito sa mababang cruising draw (~33% o custom watts mo tulad ng 200W–350W sa chest freezers) para imantina ang lamig."
                                  : isWasher
                                  ? "Na-detect ng Gemini AI na Inverter ang unit na ito. Variable-speed motor ang ginagamit nito para makatipid sa kuryente."
                                  : "Na-detect ng Gemini AI na Inverter ang unit na ito. Pag lumamig na ang kwarto, bababa ang compressor sa cruising mode (~42% o custom draw mo). Kung fixed-speed ito, i-toggle lang ng OFF bago i-save."}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  );
                })()}
              </Grid>
            </Paper>

            {/* Expandable Direct AI Diagnostic Notes */}
            {scanResult.raw_markdown && (
              <Accordion sx={{ borderRadius: 1.25, "&:before": { display: "none" } }} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <SmartToyIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      Gemini AI Engineering Diagnostic Report
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "background.default",
                      borderRadius: 1,
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {scanResult.raw_markdown}
                  </Paper>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2.5, px: 3 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        {scanResult ? (
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveToInventory}
            disabled={isSaving}
            startIcon={<CheckCircleIcon />}
          >
            Save Scanned Appliance
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleScan}
            disabled={isScanning || stagedImages.length === 0}
            startIcon={<SparklesIcon />}
          >
            {isScanning ? "Scanning..." : `Scan ${stagedImages.length} Image(s)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>

    {/* Duplicate Appliance Resolution Modal */}
    {isDuplicateModalOpen && (
      <DuplicateApplianceModal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setDuplicateIncoming(null);
          setDuplicateExisting(null);
        }}
        incomingAppliance={duplicateIncoming}
        existingAppliance={duplicateExisting}
        spaceName={spaces.find((s) => s.id === (defaultListId || spaces[0]?.id))?.name || "Current Space"}
        onCombineQuantity={handleCombineQuantity}
        onAddDistinct={handleAddDistinct}
      />
    )}

    </>
  );
};

export default AiVisionScannerModal;
