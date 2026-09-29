import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Switch from "@mui/material/Switch";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {
  getSupabaseResetPasswordTemplate,
  getSupabaseConfirmSignupTemplate,
  getSupabaseMagicLinkTemplate,
  getSupabaseInviteUserTemplate,
} from "../../lib/emailTemplates";
import {
  Settings as SettingsIcon,
  Translate as LanguageIcon,
  People as HouseholdIcon,
  PersonAdd as PersonAddIcon,
  DeleteForever as DeleteIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  VpnKey as VpnKeyIcon,
  HelpOutlined as QuestionIcon,
  Save as SaveIcon,
  Bolt as BoltIcon,
  Shield as ShieldIcon,
  WarningAmber as WarningIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Feedback as FeedbackIcon,
  Chat as ChatIcon,
  OpenInNew as OpenInNewIcon,
  Verified as VerifiedIcon,
  Email as EmailIcon,
  Send as SendIcon,
  MarkEmailRead as EmailReadIcon,
  CheckCircle as CheckCircleIcon,
  MarkEmailUnread as EmailUnreadIcon,
} from "@mui/icons-material";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { useToast } from "../common/ToastProvider";
import { supabaseClient } from "../../lib/supabaseClient";
import { useLanguage, Language } from "../../context/LanguageContext";
import { devLog } from "../../lib/devLogger";
import { FeedbackModal, FB_PM_LINK } from "../feedback/FeedbackModal";
import {
  checkEmailDeliveryHealth,
  sendSmtpTestEmail,
  sendHouseholdInvitationEmail,
  EmailHealthStatus,
} from "../../lib/emailService";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
} from "../../lib/notificationService";

interface HouseholdMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  status: "active" | "pending";
  inviteCode?: string;
  joinedAt: string;
}

const SECURITY_QUESTION_PRESETS = [
  "What is your primary household electricity meter number?",
  "What is the name of your first pet?",
  "What city were you born in?",
  "What was the brand of your first major electrical appliance?",
  "What is your favorite childhood street name?",
];

export const SettingsView: React.FC = () => {
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const { showSuccess, showError, showInfo } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // ── 1. Change Password State ─────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // ── 2. Security Recovery Challenge State ──────────────────
  const [secQuestion, setSecQuestion] = useState(SECURITY_QUESTION_PRESETS[0]);
  const [secAnswer, setSecAnswer] = useState("");
  const [secVerifyPassword, setSecVerifyPassword] = useState("");
  const [showSecAnswer, setShowSecAnswer] = useState(false);
  const [showSecVerifyPassword, setShowSecVerifyPassword] = useState(false);
  const [isUpdatingSec, setIsUpdatingSec] = useState(false);
  const [secError, setSecError] = useState("");

  useEffect(() => {
    const fetchCurrentSecQuestion = async () => {
      try {
        const { data: userData } = await supabaseClient.auth.getUser();
        if (userData?.user?.user_metadata?.security_question) {
          setSecQuestion(userData.user.user_metadata.security_question);
        }
      } catch (e) {
        devLog.warn("Settings", "Could not preload security question:", e);
      }
    };
    fetchCurrentSecQuestion();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmNewPassword.trim();

    if (!trimmedCurrent || !trimmedNew || !trimmedConfirm) {
      setPasswordError(
        language === "tl"
          ? "Pakipunan ang lahat ng field para sa pagpapalit ng password."
          : "Please fill in all password fields."
      );
      return;
    }

    if (trimmedNew.length < 6) {
      setPasswordError(
        language === "tl"
          ? "Dapat ay may hindi bababa sa 6 na character ang bagong password."
          : "New password must be at least 6 characters long."
      );
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setPasswordError(
        language === "tl"
          ? "Hindi nagtutugma ang bagong password at kumpirmasyon."
          : "New passwords do not match."
      );
      return;
    }

    setIsChangingPassword(true);
    try {
      const userEmail = identity?.email;
      if (!userEmail) throw new Error("Could not detect active user email.");

      // 1. Verify current password
      const { error: authErr } = await supabaseClient.auth.signInWithPassword({
        email: userEmail,
        password: trimmedCurrent,
      });

      if (authErr) {
        setPasswordError(
          language === "tl"
            ? "Maling kasalukuyang password. Pakisuri at subukang muli."
            : "Current password is incorrect. Please verify and try again."
        );
        setIsChangingPassword(false);
        return;
      }

      // 2. Update to new password
      const { error: updateErr } = await supabaseClient.auth.updateUser({
        password: trimmedNew,
      });

      if (updateErr) {
        throw updateErr;
      }

      showSuccess(
        language === "tl"
          ? "Matagumpay na pinalitan ang iyong password!"
          : "Password successfully updated!",
        language === "tl" ? "Na-update ang Password" : "Password Changed"
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setPasswordError(err?.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError("");

    const trimmedAnswer = secAnswer.trim();
    const trimmedVerifyPassword = secVerifyPassword.trim();

    if (!trimmedAnswer) {
      setSecError(
        language === "tl"
          ? "Pakilagay ang iyong sagot sa security question."
          : "Please provide an answer for the security question."
      );
      return;
    }

    if (!trimmedVerifyPassword) {
      setSecError(
        language === "tl"
          ? "Pakilagay ang password ng iyong account upang makumpirma ang pagbabago."
          : "Please enter your account password to authorize this security update."
      );
      return;
    }

    setIsUpdatingSec(true);
    try {
      const userEmail = identity?.email;
      if (!userEmail) throw new Error("Could not detect active user email.");

      // 1. Authenticate password
      const { error: authErr } = await supabaseClient.auth.signInWithPassword({
        email: userEmail,
        password: trimmedVerifyPassword,
      });

      if (authErr) {
        setSecError(
          language === "tl"
            ? "Maling password ng account. Hindi ma-update ang security question."
            : "Incorrect account password. Security question update was not authorized."
        );
        setIsUpdatingSec(false);
        return;
      }

      // 2. Update user metadata in Supabase
      const { error: updateErr } = await supabaseClient.auth.updateUser({
        data: {
          security_question: secQuestion,
          security_answer: trimmedAnswer.toLowerCase(),
        },
      });

      if (updateErr) {
        throw updateErr;
      }

      // Sync local cache
      try {
        const secDir = JSON.parse(localStorage.getItem("powerforecast_sec_dir") || "{}");
        secDir[userEmail.toLowerCase()] = {
          question: secQuestion,
          answer: trimmedAnswer.toLowerCase(),
        };
        localStorage.setItem("powerforecast_sec_dir", JSON.stringify(secDir));
      } catch (e) {
        devLog.warn("Settings", "Failed to cache security directory locally:", e);
      }

      showSuccess(
        language === "tl"
          ? "Na-update ang iyong security recovery question at sagot!"
          : "Security recovery question & answer updated successfully!",
        language === "tl" ? "Na-update ang Seguridad" : "Security Updated"
      );

      setSecAnswer("");
      setSecVerifyPassword("");
    } catch (err: any) {
      setSecError(err?.message || "Failed to update security challenge.");
    } finally {
      setIsUpdatingSec(false);
    }
  };

  const passwordsMatch = !confirmNewPassword || newPassword === confirmNewPassword;

  // ── 3. Language & Localization ───────────────────────────
  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lang = e.target.value as Language;
    setLanguage(lang);
    showSuccess(
      lang === "tl" ? "Wika ay pinalitan sa Tagalog (Filipino)!" : "Language updated to English (US)!",
      lang === "tl" ? "Na-update ang Wika" : "Language Updated"
    );
  };

  // ── 4. Household Members State ───────────────────────────
  const householdStorageKey = `powerforecast_household_${identity?.id || "default"}`;

  const [members, setMembers] = useState<HouseholdMember[]>(() => {
    const saved = localStorage.getItem(householdStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Error parsing household members:", err);
      }
    }
    return [
      {
        id: "owner-1",
        name: identity?.name || "Demo User (You)",
        email: identity?.email || "test09@gmail.com",
        role: "owner",
        status: "active",
        joinedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem(householdStorageKey, JSON.stringify(members));
  }, [members, householdStorageKey]);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; link: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSendingInviteEmail, setIsSendingInviteEmail] = useState(false);
  const [inviteEmailSent, setInviteEmailSent] = useState(false);

  // ── SMTP & Resend Delivery Engine State ──────────────────
  const [emailHealth, setEmailHealth] = useState<EmailHealthStatus | null>(null);
  const [testRecipientEmail, setTestRecipientEmail] = useState(identity?.email || "");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSmtpGuideOpen, setIsSmtpGuideOpen] = useState(false);
  const [smtpModalTab, setSmtpModalTab] = useState<number>(0);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<"reset_password" | "confirm_signup" | "magic_link" | "invite_user">("reset_password");
  const [templateCopiedKey, setTemplateCopiedKey] = useState<string | null>(null);

  // Notification Email Alerts Preference
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(() => {
    return getNotificationPreferences().emailAlertsEnabled ?? false;
  });

  useEffect(() => {
    checkEmailDeliveryHealth().then((status) => setEmailHealth(status));
  }, []);

  useEffect(() => {
    if (identity?.email && !testRecipientEmail) {
      setTestRecipientEmail(identity.email);
    }
  }, [identity]);

  const handleOpenInviteModal = () => {
    setInviteName("");
    setInviteEmail("");
    setGeneratedInvite(null);
    setCopiedLink(false);
    setInviteEmailSent(false);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showError("Please provide both name and email address.");
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `PF-HH-${randomSuffix}`;
    const link = `${window.location.origin}/#/signup?invite=${code}&owner=${encodeURIComponent(identity?.email || "admin")}`;

    const newMember: HouseholdMember = {
      id: `member-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: "member",
      status: "pending",
      inviteCode: code,
      joinedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    setMembers((prev) => [...prev, newMember]);
    setGeneratedInvite({ code, link });

    // Automatically dispatch email invitation via Resend
    setIsSendingInviteEmail(true);
    setInviteEmailSent(false);

    try {
      const emailRes = await sendHouseholdInvitationEmail({
        toName: inviteName.trim(),
        toEmail: inviteEmail.trim().toLowerCase(),
        inviterName: identity?.name || "Household Owner",
        inviteCode: code,
        inviteLink: link,
      });

      if (emailRes.success) {
        setInviteEmailSent(true);
        showSuccess(
          language === "tl"
            ? `Napadala ang email invitation kay ${inviteEmail} via Resend SMTP!`
            : `Invitation email sent directly to ${inviteEmail} via Resend!`,
          language === "tl" ? "Napadala ang Email" : "Email Dispatched"
        );
      } else {
        devLog.warn("Settings", "Email invite could not be sent:", emailRes.error);
        showInfo(
          language === "tl"
            ? `Nagawa ang imbitasyon! Ibahagi ang link sa ibaba.`
            : `Invitation generated! You can copy and share the link below.`
        );
      }
    } catch (err: any) {
      devLog.warn("Settings", "Failed to dispatch email invite:", err);
    } finally {
      setIsSendingInviteEmail(false);
    }
  };

  const handleResendInviteEmail = async () => {
    if (!generatedInvite || !inviteEmail.trim()) return;

    setIsSendingInviteEmail(true);
    try {
      const emailRes = await sendHouseholdInvitationEmail({
        toName: inviteName.trim(),
        toEmail: inviteEmail.trim().toLowerCase(),
        inviterName: identity?.name || "Household Owner",
        inviteCode: generatedInvite.code,
        inviteLink: generatedInvite.link,
      });

      if (emailRes.success) {
        setInviteEmailSent(true);
        showSuccess(
          language === "tl" ? "Muling naipadala ang email!" : "Invitation email re-dispatched via Resend!",
          "Resend Succeeded"
        );
      } else {
        showError(emailRes.error || "Failed to resend invite email.");
      }
    } catch (err: any) {
      showError(err?.message || "Failed to resend invite email.");
    } finally {
      setIsSendingInviteEmail(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = testRecipientEmail.trim();
    if (!trimmed) {
      showError("Please enter a valid recipient email.");
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailResult(null);

    try {
      const res = await sendSmtpTestEmail({
        toEmail: trimmed,
        testNote: `Triggered by ${identity?.name || "Admin"} from PowerForecast Settings Diagnostics`,
      });

      if (res.success) {
        setTestEmailResult({
          success: true,
          message: `✓ Test email dispatched to ${trimmed} via Resend (ID: ${res.id || "ok"}). Please check your inbox!`,
        });
        showSuccess(
          language === "tl" ? "Napadala ang test email via Resend!" : "Test email successfully dispatched via Resend!",
          "SMTP Delivery Succeeded"
        );
      } else {
        setTestEmailResult({
          success: false,
          message: res.error || "Failed to deliver test email.",
        });
        showError(res.error || "Failed to deliver test email.", "Delivery Failed");
      }
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err?.message || "An unexpected network error occurred.",
      });
      showError(err?.message || "Failed to send test email.");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleToggleEmailAlerts = (checked: boolean) => {
    setEmailAlertsEnabled(checked);
    saveNotificationPreferences({
      emailAlertsEnabled: checked,
      alertEmailAddress: identity?.email,
    });
    showSuccess(
      checked
        ? (language === "tl" ? "Aktibo na ang email alerts para sa budget at surges!" : "Email alerts activated for budget milestones and power surges!")
        : (language === "tl" ? "Nai-off ang email alerts." : "Email alerts disabled.")
    );
  };

  const handleCopyLink = () => {
    if (!generatedInvite?.link) return;
    navigator.clipboard.writeText(generatedInvite.link);
    setCopiedLink(true);
    showSuccess(
      language === "tl" ? "Nakopya na ang invite link sa clipboard!" : "Invite link copied to clipboard! Ready to share on Messenger or Viber.",
      language === "tl" ? "Nakopya ang Link" : "Link Copied"
    );
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    showInfo(language === "tl" ? `Tinanggal si ${memberName} sa household.` : `Removed ${memberName} from household.`);
  };

  // ── 5. Account Deletion Security Flow ────────────────────
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleOpenDeleteModal = () => {
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const isDeleteReady = deletePassword.length > 0 && deleteConfirmText === "Confirm";

  const handleExecuteAccountDeletion = async () => {
    if (!isDeleteReady) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      // 1. Authenticate with password to verify identity
      const userEmail = identity?.email || "";
      if (userEmail) {
        const { error: authErr } = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: deletePassword,
        });

        if (authErr) {
          setDeleteError(
            language === "tl"
              ? "Maling password. Pakisuri ang kasalukuyang password ng iyong account."
              : "Incorrect password. Please verify your current account password."
          );
          setIsDeleting(false);
          return;
        }
      }

      // 2. Wipe user data records from Supabase tables
      const userId = identity?.id;
      if (userId) {
        try {
          await supabaseClient.from("daily_appliance_usage").delete().eq("user_id", userId);
          await supabaseClient.from("appliance_usage_logs").delete().eq("user_id", userId);
          await supabaseClient.from("user_appliances").delete().eq("user_id", userId);
          await supabaseClient.from("user_calendar_events").delete().eq("user_id", userId);
          await supabaseClient.from("appliance_lists").delete().eq("user_id", userId);
          await supabaseClient.from("accounts").delete().eq("id", userId);
        } catch (dbErr) {
          console.warn("Error cleaning up database rows:", dbErr);
        }
      }

      // 3. Clear local storage caches
      localStorage.removeItem("powerforecast_active_user");
      localStorage.removeItem(householdStorageKey);

      showSuccess(
        language === "tl"
          ? "Ang iyong account at lahat ng datos ay permanenteng nabura na."
          : "Your account and all associated telemetry have been permanently deleted.",
        language === "tl" ? "Nabura ang Account" : "Account Deleted"
      );
      setIsDeleteModalOpen(false);

      // 4. Sign out
      logout();
    } catch (err: any) {
      setDeleteError(err?.message || "An unexpected error occurred during account deletion.");
      setIsDeleting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: "auto", width: "100%", display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3.5 } }}>
      {/* Page Header */}
      <Box sx={{ pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1.5 }}>
          <SettingsIcon sx={{ color: "primary.main" }} />
          {t("settings.title", "Account & Household Settings")}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {t("settings.subtitle", "Manage your language preferences, invite family members with tailored roles, and manage your account security.")}
        </Typography>
      </Box>

      {/* 1. Language Preferences Section */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"),
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff"),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <LanguageIcon sx={{ color: "primary.main" }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
            {t("settings.langTitle", "Language & Localization (Wika)")}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          {t("settings.langSubtitle", "Choose your preferred interface and notification language.")}
        </Typography>

        <RadioGroup row value={language} onChange={handleLanguageChange}>
          <FormControlLabel
            value="en"
            control={<Radio color="primary" />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  English (US)
                </Typography>
              </Box>
            }
            sx={{ mr: 4 }}
          />
          <FormControlLabel
            value="tl"
            control={<Radio color="primary" />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Tagalog (Filipino)
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </Card>

      {/* 2. Household Sharing & Hierarchy Section */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"),
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.7)" : "#ffffff"),
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <HouseholdIcon sx={{ color: "primary.main" }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                {t("settings.householdTitle", "Household Sharing & Multi-User Access")}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t("settings.householdSubtitle", "Invite family members to control stopwatches and log daily usage while keeping master billing locked")}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenInviteModal}
            sx={{ borderRadius: 2.5, fontWeight: 800, px: 2, fontSize: "0.8125rem" }}
          >
            {t("settings.inviteMember", "Invite Family Member")}
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Members Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.2)" : "#f8fafc"), border: "1px solid", borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)") }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f1f5f9") }}>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>{t("settings.member", "MEMBER")}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>{t("settings.email", "EMAIL")}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>{t("settings.role", "ROLE & PERMISSIONS")}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>{t("settings.status", "STATUS")}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary", textAlign: "right" }}>{t("settings.actions", "ACTIONS")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: m.role === "owner" ? "primary.main" : "secondary.main", fontSize: "0.75rem", fontWeight: 800 }}>
                        {m.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {m.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                      {m.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {m.role === "owner" ? (
                      <Chip
                        icon={<ShieldIcon sx={{ fontSize: "14px !important", color: "#ffd54f !important" }} />}
                        label={language === "tl" ? "May-ari ng Bahay (Full Access)" : "Household Owner (Full Access)"}
                        size="small"
                        sx={{ fontWeight: 800, fontSize: "0.6875rem", bgcolor: "rgba(255, 213, 79, 0.15)", color: "#ffd54f", border: "1px solid rgba(255, 213, 79, 0.3)" }}
                      />
                    ) : (
                      <Chip
                        icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#60a5fa !important" }} />}
                        label={language === "tl" ? "Miyembro ng Pamilya (Usage Logging)" : "Family Member (Usage Logging)"}
                        size="small"
                        sx={{ fontWeight: 800, fontSize: "0.6875rem", bgcolor: "rgba(96, 165, 250, 0.15)", color: "#60a5fa", border: "1px solid rgba(96, 165, 250, 0.3)" }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={m.status === "active" ? t("settings.active", "Active") : `${t("settings.pending", "Pending")} (${m.inviteCode || "Invite"})`}
                      size="small"
                      color={m.status === "active" ? "success" : "warning"}
                      variant="outlined"
                      sx={{ fontWeight: 800, fontSize: "0.6875rem", height: 22 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {m.role === "owner" ? (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        {t("settings.primaryAdmin", "Primary Admin")}
                      </Typography>
                    ) : (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        sx={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "none", py: 0.2 }}
                      >
                        {t("settings.remove", "Remove")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Hierarchy Explanation Matrix */}
        <Box sx={{ mt: 3, p: 2, borderRadius: 2.5, bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.08)" : "rgba(13, 148, 136, 0.06)"), border: "1px solid", borderColor: "primary.main" }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", display: "block", mb: 1 }}>
            {t("settings.permMatrix", "HOUSEHOLD PERMISSION MATRIX")}
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <CheckIcon sx={{ fontSize: 16, color: "#34d399", mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block" }}>
                    {language === "tl" ? "May-ari ng Bahay (Admin)" : "Household Owner (Admin)"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t("settings.ownerDesc", "Complete access to ALL features: inventory, billing rates, spaces, AI Scanner, CSV exports, invite members, and account settings.")}
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <CheckIcon sx={{ fontSize: 16, color: "#60a5fa", mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block" }}>
                    {language === "tl" ? "Miyembro ng Pamilya (Usage Logging)" : "Family Member (Usage Logging)"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {t("settings.memberDesc", "Can control live stopwatches, log daily hours on Smart Calendar, and view load curves. Restricted from master rate changes and account deletion.")}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* 3. Account Security & Credentials Section (Change Password & Security Question) - Placed Above Danger Zone */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.2)" : "rgba(13, 148, 136, 0.2)"),
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.85)" : "#ffffff"),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <SecurityIcon sx={{ color: "primary.main" }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
            {language === "tl" ? "Seguridad at Kredensyal ng Account" : "Account Security & Credentials"}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2.5 }}>
          {language === "tl"
            ? "I-update ang password ng iyong account at ang security challenge para sa mabilis na password recovery."
            : "Update your master login password and your backup security challenge for password recovery."}
        </Typography>

        <Grid container spacing={3}>
          {/* Sub-form A: Change Password */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 1.25,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(248, 250, 252, 0.8)"),
              }}
            >
              <Box component="form" onSubmit={handleChangePassword}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <LockIcon sx={{ fontSize: 18, color: "primary.main" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {language === "tl" ? "Palitan ang Password" : "Change Login Password"}
                  </Typography>
                </Box>

                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 1, py: 0.5 }}>
                    {passwordError}
                  </Alert>
                )}

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    type={showCurrentPassword ? "text" : "password"}
                    size="small"
                    fullWidth
                    label={language === "tl" ? "Kasalukuyang Password" : "Current Password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                              {showCurrentPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    type={showNewPassword ? "text" : "password"}
                    size="small"
                    fullWidth
                    label={language === "tl" ? "Bagong Password (min 6 chars)" : "New Password (min 6 chars)"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowNewPassword(!showNewPassword)}>
                              {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    type={showConfirmNewPassword ? "text" : "password"}
                    size="small"
                    fullWidth
                    label={language === "tl" ? "Kumpirmahin ang Bagong Password" : "Confirm New Password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    error={!passwordsMatch}
                    helperText={!passwordsMatch ? (language === "tl" ? "Hindi nagtutugma" : "Passwords do not match") : ""}
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}>
                              {showConfirmNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isChangingPassword || !passwordsMatch}
                    startIcon={isChangingPassword ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                    sx={{ mt: 1, fontWeight: 700, borderRadius: 1 }}
                  >
                    {isChangingPassword
                      ? (language === "tl" ? "Ina-update..." : "Updating...")
                      : (language === "tl" ? "I-save ang Bagong Password" : "Update Password")}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Sub-form B: Update Security Question & Answer */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 1.25,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(248, 250, 252, 0.8)"),
              }}
            >
              <Box component="form" onSubmit={handleUpdateSecurityQuestion}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <QuestionIcon sx={{ fontSize: 18, color: "secondary.main" }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {language === "tl" ? "Security Recovery Challenge" : "Security Recovery Challenge"}
                  </Typography>
                </Box>

                {secError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 1, py: 0.5 }}>
                    {secError}
                  </Alert>
                )}

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label={language === "tl" ? "Pumili ng Security Question" : "Select Security Question"}
                    value={secQuestion}
                    onChange={(e) => setSecQuestion(e.target.value)}
                  >
                    {SECURITY_QUESTION_PRESETS.map((q) => (
                      <MenuItem key={q} value={q} sx={{ fontSize: "0.8125rem" }}>
                        {q}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    type={showSecAnswer ? "text" : "password"}
                    size="small"
                    fullWidth
                    label={language === "tl" ? "Bagong Sagot sa Security Question" : "New Security Answer"}
                    value={secAnswer}
                    onChange={(e) => setSecAnswer(e.target.value)}
                    placeholder={language === "tl" ? "Ilagay ang iyong sagot..." : "Enter your security answer..."}
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowSecAnswer(!showSecAnswer)}>
                              {showSecAnswer ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    type={showSecVerifyPassword ? "text" : "password"}
                    size="small"
                    fullWidth
                    label={language === "tl" ? "Kumpirmahin gamit ang Account Password" : "Confirm with Account Password"}
                    value={secVerifyPassword}
                    onChange={(e) => setSecVerifyPassword(e.target.value)}
                    placeholder={language === "tl" ? "Password ng account..." : "Account password..."}
                    required
                    helperText={language === "tl" ? "Kailangan ang password upang ma-save ang security key" : "Password required to authorize updating recovery key"}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowSecVerifyPassword(!showSecVerifyPassword)}>
                              {showSecVerifyPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <Button
                    type="submit"
                    variant="contained"
                    color="secondary"
                    disabled={isUpdatingSec}
                    startIcon={isUpdatingSec ? <CircularProgress size={16} color="inherit" /> : <VpnKeyIcon />}
                    sx={{ mt: 1, fontWeight: 700, borderRadius: 1 }}
                  >
                    {isUpdatingSec
                      ? (language === "tl" ? "Ina-update..." : "Updating...")
                      : (language === "tl" ? "I-save ang Security Challenge" : "Save Security Challenge")}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Card>

      {/* 4. SMTP & Resend Email Delivery Engine Card */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(13, 148, 136, 0.25)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.85)" : "#ffffff",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, mb: 2, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <EmailIcon sx={{ color: "primary.main" }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                {language === "tl" ? "SMTP & Resend Email Delivery Engine" : "SMTP & Resend Email Delivery Engine"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {language === "tl"
                  ? "Pamahalaan ang live delivery diagnostics, Supabase custom SMTP integration, at smart alerts."
                  : "Monitor live delivery diagnostics, Supabase custom SMTP integration, and automated alert notifications."}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<KeyIcon />}
              onClick={() => { setSmtpModalTab(0); setIsSmtpGuideOpen(true); }}
              sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem", textTransform: "none" }}
            >
              {language === "tl" ? "Supabase SMTP Setup" : "Supabase SMTP Setup"}
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<EmailIcon />}
              onClick={() => { setSmtpModalTab(1); setIsSmtpGuideOpen(true); }}
              sx={{ borderRadius: 2, fontWeight: 700, fontSize: "0.75rem", textTransform: "none" }}
            >
              {language === "tl" ? "Branded Email Templates" : "Branded Email Templates"}
            </Button>
          </Box>
        </Box>

        {/* Status Chips */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
          <Chip
            icon={emailHealth?.hasApiKey ? <CheckCircleIcon sx={{ fontSize: "14px !important" }} /> : <WarningIcon sx={{ fontSize: "14px !important" }} />}
            label={emailHealth?.hasApiKey ? "Resend API: Operational" : "Resend API: Key Missing in Env"}
            size="small"
            color={emailHealth?.hasApiKey ? "success" : "warning"}
            variant="outlined"
            sx={{ fontWeight: 800, fontSize: "0.72rem" }}
          />
          <Chip
            icon={<ShieldIcon sx={{ fontSize: "14px !important" }} />}
            label="Supabase SMTP: smtp.resend.com (Port 465)"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 800, fontSize: "0.72rem" }}
          />
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: "14px !important", color: "#00e5c9 !important" }} />}
            label="Domain: comugallery.me (Verified)"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 800, fontSize: "0.72rem", color: "#00e5c9", borderColor: "rgba(0, 229, 201, 0.4)" }}
          />
          <Chip
            icon={<EmailReadIcon sx={{ fontSize: "14px !important" }} />}
            label={`Sender: ${emailHealth?.senderEmail || "PowerForecast <noreply@comugallery.me>"}`}
            size="small"
            sx={{ fontWeight: 700, fontSize: "0.72rem", bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}
          />
        </Box>

        <Grid container spacing={3}>
          {/* Sub-form A: Live SMTP Delivery Test */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 1.25,
                height: "100%",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(248, 250, 252, 0.8)"),
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                <SendIcon fontSize="small" sx={{ color: "primary.main" }} />
                {language === "tl" ? "Subukan ang SMTP Delivery (Test Email)" : "Live SMTP Delivery Test Tool"}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
                {language === "tl"
                  ? "Magpadala ng tunay na test email sa pamamagitan ng Resend upang makumpirma ang mabilis na pagdating sa inbox."
                  : "Dispatch a live test email through Resend to verify delivery status and measure inbox latency."}
              </Typography>

              {testEmailResult && (
                <Alert severity={testEmailResult.success ? "success" : "error"} sx={{ mb: 2, borderRadius: 1, py: 0.5, fontSize: "0.8125rem" }}>
                  {testEmailResult.message}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSendTestEmail} sx={{ display: "flex", gap: 1.25, alignItems: "center", flexWrap: { xs: "wrap", sm: "nowrap" } }}>
                <TextField
                  size="small"
                  fullWidth
                  label={language === "tl" ? "Email Address ng Tatanggap" : "Recipient Email Address"}
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSendingTestEmail}
                  startIcon={isSendingTestEmail ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  sx={{ borderRadius: 1, fontWeight: 800, px: 2.5, flexShrink: 0, height: 40, whiteSpace: "nowrap" }}
                >
                  {isSendingTestEmail ? "Sending..." : "Send Test"}
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Sub-form B: Automated Alert Notifications Toggle */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 1.25,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.25)" : "rgba(248, 250, 252, 0.8)"),
              }}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                  <BoltIcon fontSize="small" sx={{ color: "warning.main" }} />
                  {language === "tl" ? "Mga Notification sa Email" : "Automated Smart Email Alerts"}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.5 }}>
                  {language === "tl"
                    ? "Makatanggap ng agarang alerto sa email kapag lumagpas sa 80% ng budget o kapag may biglaang wattage surge."
                    : "Receive automated email alerts when consumption reaches 80% / 100% of your budget or during high wattage surges."}
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={emailAlertsEnabled}
                    onChange={(e) => handleToggleEmailAlerts(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {emailAlertsEnabled
                      ? (language === "tl" ? "Aktibo ang Email Alerts" : "Email Alerts Enabled")
                      : (language === "tl" ? "Naka-off ang Email Alerts" : "Email Alerts Disabled")}
                  </Typography>
                }
              />
            </Paper>
          </Grid>
        </Grid>
      </Card>

      {/* 5. Developer Direct PM & Feedback Support Card */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.25)" : "rgba(24, 119, 242, 0.25)",
          bgcolor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(24, 27, 32, 0.65)" : "rgba(24, 119, 242, 0.03)",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, justifyContent: "space-between", alignItems: { xs: "flex-start", md: "center" }, gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              src="/Assets/LOGO.png"
              sx={{
                width: 52,
                height: 52,
                bgcolor: "primary.main",
                border: "2px solid #00e5c9",
                boxShadow: "0 0 16px rgba(0, 229, 201, 0.35)",
              }}
            >
              AJ
            </Avatar>
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Developer Support & Direct PM
                </Typography>
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: "12px !important", color: "primary.main !important" }} />}
                  label="AJ Umali"
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.6875rem",
                    fontWeight: 800,
                    bgcolor: "rgba(0, 229, 201, 0.15)",
                    color: "primary.main",
                    border: "1px solid rgba(0, 229, 201, 0.3)",
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, maxWidth: 500 }}>
                {language === "tl"
                  ? "May tanong, mungkahi, o nais mag-ulat ng bug? Maaari kang direktang mag-PM sa Facebook o magpadala ng feedback."
                  : "Have an inquiry, feature suggestion, or bug report? Connect directly with the developer via Facebook Messenger or in-app feedback."}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, width: { xs: "100%", md: "auto" } }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<FeedbackIcon />}
              onClick={() => setIsFeedbackModalOpen(true)}
              sx={{
                borderRadius: 1,
                fontWeight: 700,
                fontSize: "0.8125rem",
                textTransform: "none",
                flex: { xs: 1, md: "none" },
              }}
            >
              {language === "tl" ? "Magbigay ng Feedback" : "Submit Feedback"}
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => window.open(FB_PM_LINK, "_blank", "noopener,noreferrer")}
              startIcon={<ChatIcon />}
              endIcon={<OpenInNewIcon sx={{ fontSize: 15 }} />}
              sx={{
                bgcolor: "#1877f2",
                color: "#ffffff",
                borderRadius: 1,
                fontWeight: 800,
                fontSize: "0.8125rem",
                textTransform: "none",
                flex: { xs: 1, md: "none" },
                "&:hover": { bgcolor: "#166fe5" },
              }}
            >
              {language === "tl" ? "I-PM si AJ sa Facebook" : "PM AJ on Facebook"}
            </Button>
          </Box>
        </Box>
      </Card>

      {/* 5. Danger Zone: Account Deletion */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: (theme) =>
            theme.palette.mode === "dark" ? "rgba(248, 113, 113, 0.3)" : "rgba(239, 68, 68, 0.35)",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(127, 29, 29, 0.12)" : "rgba(254, 242, 242, 0.8)"),
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <WarningIcon sx={{ color: "error.main" }} />
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 800,
                  color: (theme) => (theme.palette.mode === "dark" ? "error.light" : "error.dark"),
                }}
              >
                {t("settings.dangerTitle", "Danger Zone: Account Deletion")}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
              {t("settings.dangerSubtitle", "Permanently erase your account, registered appliances, daily calendar logs, live stopwatch history, and analytics records. This action is irreversible.")}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenDeleteModal}
            sx={{
              borderRadius: 1,
              fontWeight: 800,
              px: 2.5,
              fontSize: "0.8125rem",
              borderColor: "rgba(248, 113, 113, 0.5)",
              "&:hover": { bgcolor: "rgba(248, 113, 113, 0.15)", borderColor: "error.main" },
            }}
          >
            {t("settings.deleteAccount", "Delete My Account")}
          </Button>
        </Box>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 1.5,
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)"),
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(23, 26, 31, 0.98)" : "#ffffff"),
              backdropFilter: "blur(20px)",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1.25 }}>
          <PersonAddIcon sx={{ color: "primary.main" }} />
          {t("settings.inviteModalTitle", "Invite Household Family Member")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {!generatedInvite ? (
            <Box component="form" onSubmit={handleSendInvite} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t("settings.inviteModalDesc", "Enter the name and email address of the family member you want to add. They will receive permission to control appliance stopwatches and log daily hours.")}
              </Typography>
              <TextField
                label={t("settings.fullName", "Full Name")}
                placeholder="e.g. Maria Santos"
                fullWidth
                size="small"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
              <TextField
                label={t("settings.emailAddr", "Email Address")}
                placeholder="e.g. maria@gmail.com"
                type="email"
                fullWidth
                size="small"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={() => setIsInviteModalOpen(false)} sx={{ fontWeight: 700 }}>
                  {t("header.cancel", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSendingInviteEmail}
                  startIcon={isSendingInviteEmail ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                  sx={{ fontWeight: 800, borderRadius: 1 }}
                >
                  {isSendingInviteEmail
                    ? (language === "tl" ? "Ipinapadala..." : "Sending...")
                    : (language === "tl" ? "Magpadala ng Imbitasyon" : "Send & Generate Invite")}
                </Button>
              </DialogActions>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
              <Alert severity="success" sx={{ borderRadius: 1 }}>
                {language === "tl" ? `Matagumpay na nagawa ang imbitasyon para kay ${inviteName}!` : `Invitation successfully created for ${inviteName}!`}
              </Alert>

              {inviteEmailSent && (
                <Chip
                  icon={<CheckCircleIcon sx={{ fontSize: "15px !important" }} />}
                  label={language === "tl" ? `Napadala ang email kay ${inviteEmail} via Resend!` : `Invitation email delivered directly to ${inviteEmail} via Resend!`}
                  color="success"
                  variant="outlined"
                  sx={{ fontWeight: 700, fontSize: "0.75rem", alignSelf: "flex-start" }}
                />
              )}

              <Box sx={{ p: 2, borderRadius: 1, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 0, 0, 0.4)" : "rgba(13, 148, 136, 0.08)", border: "1px solid", borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.3)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, display: "block", mb: 0.5 }}>
                  {t("settings.inviteCodeLabel", "HOUSEHOLD INVITE CODE:")}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "primary.main", letterSpacing: 2 }}>
                  {generatedInvite.code}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  fullWidth
                  size="small"
                  value={generatedInvite.link}
                  slotProps={{ input: { readOnly: true, sx: { fontFamily: "monospace", fontSize: "0.75rem" } } }}
                />
                <Button
                  variant="contained"
                  color={copiedLink ? "success" : "primary"}
                  startIcon={copiedLink ? <CheckIcon /> : <CopyIcon />}
                  onClick={handleCopyLink}
                  sx={{ borderRadius: 1, fontWeight: 800, flexShrink: 0, height: 40 }}
                >
                  {copiedLink ? t("settings.linkCopied", "Copied") : t("settings.copyLink", "Copy Link")}
                </Button>
              </Box>

              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {t("settings.sharePrompt", "Share this link on Messenger or Viber. When they register, they will automatically be joined to your household.")}
              </Typography>

              <DialogActions sx={{ px: 0, pt: 1, display: "flex", justifyContent: "space-between" }}>
                <Button
                  onClick={handleResendInviteEmail}
                  variant="text"
                  size="small"
                  disabled={isSendingInviteEmail}
                  startIcon={isSendingInviteEmail ? <CircularProgress size={14} color="inherit" /> : <SendIcon fontSize="small" />}
                  sx={{ fontWeight: 700 }}
                >
                  {language === "tl" ? "Ipadala Muli ang Email" : "Resend Invite Email"}
                </Button>
                <Button onClick={() => setIsInviteModalOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: 1 }}>
                  {t("settings.done", "Done")}
                </Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Supabase Custom SMTP Setup Guide Dialog */}
      <Dialog
        open={isSmtpGuideOpen}
        onClose={() => setIsSmtpGuideOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              border: "1px solid",
              borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(0, 229, 201, 0.3)" : "rgba(13, 148, 136, 0.25)",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(20, 24, 30, 0.98)" : "#ffffff"),
              backdropFilter: "blur(20px)",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <EmailIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Supabase SMTP & Branded Email Templates
              </Typography>
            </Box>
            <Chip
              label="v3.4.3v Branded"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: "0.7rem" }}
            />
          </Box>
          <Tabs
            value={smtpModalTab}
            onChange={(_, val) => setSmtpModalTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 36,
              "& .MuiTab-root": { minHeight: 36, fontWeight: 700, fontSize: "0.85rem", textTransform: "none", py: 0.5 },
            }}
          >
            <Tab label="1. SMTP Setup & Credentials" />
            <Tab label="2. Branded HTML Email Templates (Supabase)" />
          </Tabs>
        </DialogTitle>

        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 2 }}>
          {smtpModalTab === 0 ? (
            <>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Configure Resend as your custom SMTP provider in the Supabase Dashboard to eliminate rate limits (3 emails/hour) and guarantee email delivery for registration, resend verification, and password resets.
              </Typography>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "#f8fafc" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: "primary.main" }}>
                  Resend SMTP Credentials for Supabase Dashboard:
                </Typography>
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>SMTP Host</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>smtp.resend.com</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Port & Security</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>465 (SSL) or 587 (TLS)</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Username</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>resend</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Password</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>re_... (Your Resend API Key)</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Sender Email</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace", color: "primary.main" }}>noreply@comugallery.me</Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 1.25, borderRadius: 1, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>Sender Name</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace" }}>PowerForecast</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Quick 3-Step Setup Instructions:</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  1. Open <strong>Supabase Dashboard</strong> ➔ <strong>Project Settings</strong> ➔ <strong>Authentication</strong> ➔ <strong>SMTP Settings</strong>.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  2. Toggle <strong>Enable Custom SMTP</strong> to <strong>ON</strong> and enter the Resend credentials above.
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  3. In <strong>Authentication ➔ Providers ➔ Email</strong>, toggle <strong>Confirm email</strong> to <strong>ON</strong>.
                </Typography>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Select an email template below to inspect its live preview. Click <strong>Copy HTML Code for Supabase</strong> to copy the responsive, branded HTML with the <strong>PowerForecast logo</strong> and <strong>electric teal theme</strong>, then paste it directly into your <strong>Supabase Dashboard ➔ Authentication ➔ Email Templates</strong>.
              </Typography>

              {/* Template Selector Chips */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {[
                  { key: "reset_password", label: "🔑 Reset Password" },
                  { key: "confirm_signup", label: "✉️ Confirm Signup" },
                  { key: "magic_link", label: "🪄 Magic Link" },
                  { key: "invite_user", label: "👥 Invite User" },
                ].map((tpl) => (
                  <Chip
                    key={tpl.key}
                    label={tpl.label}
                    clickable
                    color={selectedTemplateKey === tpl.key ? "primary" : "default"}
                    variant={selectedTemplateKey === tpl.key ? "filled" : "outlined"}
                    onClick={() => setSelectedTemplateKey(tpl.key as any)}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  />
                ))}
              </Box>

              {/* Action Bar for Selected Template */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1.5, p: 1.5, borderRadius: 1.5, bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "#f1f5f9", border: "1px solid", borderColor: "divider" }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {selectedTemplateKey === "reset_password" && "Reset Password Template (GoTrue: {{ .ConfirmationURL }})"}
                    {selectedTemplateKey === "confirm_signup" && "Confirm Signup Template (GoTrue: {{ .ConfirmationURL }})"}
                    {selectedTemplateKey === "magic_link" && "Magic Link Template (GoTrue: {{ .ConfirmationURL }})"}
                    {selectedTemplateKey === "invite_user" && "Invite User Template (GoTrue: {{ .ConfirmationURL }})"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Supabase Path: <strong>Authentication ➔ Email Templates ➔ {selectedTemplateKey.replace('_', ' ').toUpperCase()}</strong>
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={templateCopiedKey === selectedTemplateKey ? <CheckIcon /> : <CopyIcon />}
                  color={templateCopiedKey === selectedTemplateKey ? "success" : "primary"}
                  onClick={() => {
                    let htmlContent = "";
                    if (selectedTemplateKey === "reset_password") htmlContent = getSupabaseResetPasswordTemplate();
                    else if (selectedTemplateKey === "confirm_signup") htmlContent = getSupabaseConfirmSignupTemplate();
                    else if (selectedTemplateKey === "magic_link") htmlContent = getSupabaseMagicLinkTemplate();
                    else if (selectedTemplateKey === "invite_user") htmlContent = getSupabaseInviteUserTemplate();

                    navigator.clipboard.writeText(htmlContent);
                    setTemplateCopiedKey(selectedTemplateKey);
                    showSuccess("Branded HTML copied to clipboard! Paste into Supabase Email Templates.");
                    setTimeout(() => setTemplateCopiedKey(null), 3000);
                  }}
                  sx={{ fontWeight: 800, textTransform: "none", borderRadius: 1.5 }}
                >
                  {templateCopiedKey === selectedTemplateKey ? "Copied to Clipboard!" : "Copy HTML Code for Supabase"}
                </Button>
              </Box>

              {/* Live Preview Frame */}
              <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", maxHeight: 380, bgcolor: "#0b0e14" }}>
                <iframe
                  title="Branded Email Preview"
                  srcDoc={
                    selectedTemplateKey === "reset_password"
                      ? getSupabaseResetPasswordTemplate().replace(/{{ \.ConfirmationURL }}/g, "https://bsentrep.vercel.app/reset-password#preview").replace(/{{ \.Email }}/g, identity?.email || "user@example.com")
                      : selectedTemplateKey === "confirm_signup"
                      ? getSupabaseConfirmSignupTemplate().replace(/{{ \.ConfirmationURL }}/g, "https://bsentrep.vercel.app/login#preview").replace(/{{ \.Email }}/g, identity?.email || "newuser@example.com")
                      : selectedTemplateKey === "magic_link"
                      ? getSupabaseMagicLinkTemplate().replace(/{{ \.ConfirmationURL }}/g, "https://bsentrep.vercel.app/#preview").replace(/{{ \.Email }}/g, identity?.email || "user@example.com")
                      : getSupabaseInviteUserTemplate().replace(/{{ \.ConfirmationURL }}/g, "https://bsentrep.vercel.app/#preview").replace(/{{ \.Email }}/g, identity?.email || "user@example.com")
                  }
                  style={{ width: "100%", height: "360px", border: "none" }}
                />
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            variant="contained"
            onClick={() => window.open("https://supabase.com/dashboard", "_blank", "noopener,noreferrer")}
            endIcon={<OpenInNewIcon sx={{ fontSize: 16 }} />}
            sx={{ fontWeight: 700, borderRadius: 1 }}
          >
            Open Supabase Dashboard
          </Button>
          <Button onClick={() => setIsSmtpGuideOpen(false)} sx={{ fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Strict 2-Step Account Deletion Security Dialog */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 1.5,
              border: "1px solid rgba(248, 113, 113, 0.5)",
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(20, 10, 25, 0.96)" : "#ffffff"),
              backdropFilter: "blur(24px)",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: (theme) => theme.palette.mode === "dark" ? "error.light" : "error.main", display: "flex", alignItems: "center", gap: 1.25 }}>
          <WarningIcon sx={{ color: "error.main" }} />
          {t("settings.deleteModalTitle", "Confirm Permanent Account Deletion")}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Alert severity="error" sx={{ borderRadius: 1, fontWeight: 600 }}>
            {t("settings.deleteWarning", "This action is permanent and cannot be undone. All your appliances, daily logs, stopwatch records, and analytics telemetry will be deleted.")}
          </Alert>

          {deleteError && (
            <Alert severity="warning" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
              {deleteError}
            </Alert>
          )}

          {/* Step 1: Password Verification */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
              {t("settings.step1Password", "STEP 1: ENTER YOUR ACCOUNT PASSWORD")}
            </Typography>
            <TextField
              type={showPassword ? "text" : "password"}
              size="small"
              placeholder={language === "tl" ? "Ilagay ang kasalukuyang password..." : "Enter current password..."}
              fullWidth
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeleting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Step 2: Explicit Confirmation Text */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
              {language === "tl" ? (
                <>HAKBANG 2: I-TYPE ANG <span style={{ color: "#f87171", fontWeight: 900 }}>Confirm</span> PARA PAHINTULUTAN ANG PAGBURA</>
              ) : (
                <>STEP 2: TYPE <span style={{ color: "#f87171", fontWeight: 900 }}>Confirm</span> TO AUTHORIZE DELETION</>
              )}
            </Typography>
            <TextField
              size="small"
              placeholder="Type 'Confirm'..."
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={isDeleting}
              slotProps={{
                input: {
                  sx: { fontFamily: "monospace", fontWeight: 800 },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} sx={{ fontWeight: 700 }}>
            {t("header.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!isDeleteReady || isDeleting}
            onClick={handleExecuteAccountDeletion}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ fontWeight: 900, borderRadius: 2, px: 2.5 }}
          >
            {isDeleting ? t("settings.deleteExecuting", "Deleting Account...") : t("settings.deletePerm", "Permanently Delete My Account")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reusable Feedback Modal */}
      <FeedbackModal
        open={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </Box>
  );
};

export default SettingsView;
