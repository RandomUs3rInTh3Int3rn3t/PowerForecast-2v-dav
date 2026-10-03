import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import {
  AdminPanelSettings as ShieldIcon,
  Group as FamilyIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Key as KeyIcon,
  Send as SendIcon,
  Bolt as BoltIcon,
  Link as LinkIcon,
  ExitToApp as LeaveIcon,
  VerifiedUser as VerifiedIcon,
} from '@mui/icons-material';
import { useHousehold } from '../../context/HouseholdContext';
import { useToast } from '../common/ToastProvider';
import { sendHouseholdInvitationEmail } from '../../lib/emailService';

interface HouseholdAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: number;
}

export const HouseholdAccessModal: React.FC<HouseholdAccessModalProps> = ({
  isOpen,
  onClose,
  initialTab = 0,
}) => {
  const {
    role,
    isOwner,
    isFamilyMember,
    ownerInfo,
    inviteCode,
    inviteLink,
    createInvite,
    joinWithCode,
    leaveHousehold,
  } = useHousehold();

  const { showSuccess, showError, showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<number>(initialTab);
  const [inputCode, setInputCode] = useState('');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Email Invite State
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Tab change
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      showSuccess(`Invite code ${inviteCode} copied to clipboard!`);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showError('Failed to copy to clipboard.');
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      showSuccess('Direct invite link copied to clipboard!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showError('Failed to copy to clipboard.');
    }
  };

  const handleGenerateCode = async () => {
    try {
      const res = await createInvite();
      showSuccess(`Household invite code generated: ${res.inviteCode}! You are now set as Household Owner.`);
    } catch (err: any) {
      showError(err?.message || 'Failed to generate invite code.');
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteeName.trim() || !inviteeEmail.trim()) {
      showError('Please enter both name and email address.');
      return;
    }
    if (!inviteCode) {
      showError('Please generate an invite code first.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const emailRes = await sendHouseholdInvitationEmail({
        toName: inviteeName.trim(),
        toEmail: inviteeEmail.trim().toLowerCase(),
        inviterName: 'Household Owner',
        inviteCode,
        inviteLink: inviteLink || `${window.location.origin}/#/signup?invite=${inviteCode}`,
      });

      if (emailRes.success) {
        showSuccess(`Invitation email sent to ${inviteeEmail}!`);
        setInviteeName('');
        setInviteeEmail('');
      } else {
        showInfo('Invite code generated! You can copy and share the link manually.');
      }
    } catch {
      showError('Could not send email invitation.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = inputCode.trim().toUpperCase();
    if (!formatted) {
      showError('Please enter an invite code.');
      return;
    }

    setIsSubmittingCode(true);
    try {
      const res = await joinWithCode(formatted);
      if (res.success) {
        showSuccess(res.message);
        setInputCode('');
        onClose();
      } else {
        showError(res.message);
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to join household.');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleLeave = () => {
    leaveHousehold();
    showSuccess('Disconnected from household. Restored to your independent Household Owner account.');
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3.5,
            bgcolor: (theme: any) => (theme.palette.mode === 'dark' ? '#181b20' : '#ffffff'),
            backgroundImage: 'none',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
            border: '1px solid',
            borderColor: (theme: any) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'),
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
          pt: 2.5,
          px: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              bgcolor: 'rgba(0, 229, 201, 0.12)',
              border: '1px solid rgba(0, 229, 201, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FamilyIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
              Household Multi-User Access
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
              Create an invite code or enter a code to join a family account
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: 44,
            mb: 2.5,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f1f5f9'),
            borderRadius: 2.5,
            p: 0.5,
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .MuiTab-root': {
              minHeight: 36,
              borderRadius: 2,
              fontWeight: 800,
              fontSize: '0.8125rem',
              textTransform: 'none',
              transition: 'all 0.2s ease',
              '&.Mui-selected': {
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.18)' : '#ffffff'),
                color: 'primary.main',
                boxShadow: (theme) => (theme.palette.mode === 'dark' ? 'none' : '0 2px 6px rgba(0,0,0,0.06)'),
                border: '1px solid',
                borderColor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.3)' : 'rgba(0,0,0,0.08)'),
              },
            },
          }}
        >
          <Tab
            icon={<ShieldIcon sx={{ fontSize: '18px !important', mr: 0.5 }} />}
            iconPosition="start"
            label="Create Invite Code (Admin)"
          />
          <Tab
            icon={<KeyIcon sx={{ fontSize: '18px !important', mr: 0.5 }} />}
            iconPosition="start"
            label="Input Code (Family Member)"
          />
        </Tabs>

        {/* ── TAB 0: CREATE INVITE CODE (OWNER / ADMIN) ─────────────────── */}
        {activeTab === 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert
              severity="info"
              icon={<ShieldIcon fontSize="small" sx={{ color: '#ffd54f' }} />}
              sx={{
                bgcolor: 'rgba(255, 213, 79, 0.08)',
                color: 'text.primary',
                border: '1px solid rgba(255, 213, 79, 0.25)',
                borderRadius: 2,
                '& .MuiAlert-icon': { color: '#ffd54f' },
                fontSize: '0.8125rem',
              }}
            >
              <strong>Household Owner (Admin) Mode:</strong> Creating an invite code establishes you as the Primary Admin. Family members who join can log usage and simulate schedules, while you retain full control over settings, billing rates, and appliance approvals.
            </Alert>

            {inviteCode ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.25)' : '#f8fafc'),
                  borderColor: 'primary.main',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Your Active Household Invite Code
                </Typography>

                <Box
                  sx={{
                    my: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                  }}
                >
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      letterSpacing: '0.12em',
                      color: 'primary.main',
                      bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.08)' : 'rgba(0, 158, 136, 0.08)'),
                      px: 3,
                      py: 1,
                      borderRadius: 2,
                      border: '1px dashed',
                      borderColor: 'primary.main',
                    }}
                  >
                    {inviteCode}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={copiedCode ? <CheckIcon /> : <CopyIcon />}
                    onClick={handleCopyCode}
                    sx={{ fontWeight: 800, borderRadius: 2 }}
                  >
                    {copiedCode ? 'Code Copied!' : 'Copy Code'}
                  </Button>
                  {inviteLink && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={copiedLink ? <CheckIcon /> : <LinkIcon />}
                      onClick={handleCopyLink}
                      sx={{ fontWeight: 800, borderRadius: 2 }}
                    >
                      {copiedLink ? 'Link Copied!' : 'Copy Join Link'}
                    </Button>
                  )}
                </Box>
              </Paper>
            ) : (
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleGenerateCode}
                  startIcon={<KeyIcon />}
                  sx={{ fontWeight: 800, borderRadius: 2.5, px: 3, py: 1.2 }}
                >
                  Generate Household Invite Code
                </Button>
              </Box>
            )}

            {/* Quick Email Dispatch */}
            {inviteCode && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'),
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SendIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  Email Invite Directly to Family Member
                </Typography>
                <Box component="form" onSubmit={handleSendEmailInvite} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                    <TextField
                      size="small"
                      placeholder="Family Member Name"
                      value={inviteeName}
                      onChange={(e) => setInviteeName(e.target.value)}
                      fullWidth
                    />
                    <TextField
                      size="small"
                      placeholder="name@gmail.com"
                      value={inviteeEmail}
                      onChange={(e) => setInviteeEmail(e.target.value)}
                      fullWidth
                    />
                  </Box>
                  <Button
                    type="submit"
                    variant="outlined"
                    size="small"
                    disabled={isSendingEmail || !inviteeName.trim() || !inviteeEmail.trim()}
                    sx={{ alignSelf: 'flex-end', fontWeight: 800, borderRadius: 2 }}
                  >
                    {isSendingEmail ? 'Dispatching...' : 'Send Invitation Email'}
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* ── TAB 1: INPUT CODE (FAMILY MEMBER) ─────────────────────────── */}
        {activeTab === 1 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert
              severity="info"
              icon={<BoltIcon fontSize="small" sx={{ color: '#60a5fa' }} />}
              sx={{
                bgcolor: 'rgba(96, 165, 250, 0.08)',
                color: 'text.primary',
                border: '1px solid rgba(96, 165, 250, 0.25)',
                borderRadius: 2,
                '& .MuiAlert-icon': { color: '#60a5fa' },
                fontSize: '0.8125rem',
              }}
            >
              <strong>Family Member (Usage Logging) Mode:</strong> Entering an invite code connects you to your Household Owner&apos;s account. You can log appliance hours, run stopwatch timers, and view load curves. Settings access is locked, and adding new appliances requires Owner approval.
            </Alert>

            {isFamilyMember && ownerInfo ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.04)' : 'rgba(0, 158, 136, 0.04)'),
                  border: '1px solid rgba(0, 229, 201, 0.3)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Connected as Family Member
                    </Typography>
                  </Box>
                  <Chip
                    label="Active Member"
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 800, fontSize: '0.6875rem' }}
                  />
                </Box>

                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#ffffff'), mb: 2 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Household Owner:
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                    {ownerInfo.owner_name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    {ownerInfo.owner_email}
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<LeaveIcon />}
                  onClick={handleLeave}
                  sx={{ fontWeight: 800, borderRadius: 2 }}
                >
                  Leave Household (Switch to Own Account)
                </Button>
              </Paper>
            ) : (
              <Paper
                variant="outlined"
                component="form"
                onSubmit={handleJoinSubmit}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : '#f8fafc'),
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                  Enter Household Join Code
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Ask your Household Owner for their 4-digit join code (e.g. PF-HH-1234).
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <TextField
                    placeholder="PF-HH-XXXX"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    fullWidth
                    size="medium"
                    slotProps={{
                      htmlInput: {
                        style: { fontFamily: 'monospace', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.08em' },
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmittingCode || !inputCode.trim()}
                    sx={{ px: 3, py: 1.25, fontWeight: 800, borderRadius: 2, whiteSpace: 'nowrap' }}
                  >
                    {isSubmittingCode ? 'Joining...' : 'Join Household'}
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* ── PERMISSION MATRIX ───────────────────────────────────────── */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 2.5,
            bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.05)' : 'rgba(13, 148, 136, 0.04)'),
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 1 }}>
            HOUSEHOLD PERMISSION MATRIX
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ✓ Household Owner (Admin)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                Complete access to ALL features: inventory, billing rates, spaces, AI Scanner, CSV exports, invite members, settings, and approve appliance additions.
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ✓ Family Member (Usage Logging)
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                Can simulate appliance usage, log daily hours on Smart Calendar, and view load curves. Restricted from settings, rate changes, and adding appliances requires Owner approval.
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 1.75 }}>
        <Button onClick={onClose} sx={{ fontWeight: 800, borderRadius: 2 }}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
};
