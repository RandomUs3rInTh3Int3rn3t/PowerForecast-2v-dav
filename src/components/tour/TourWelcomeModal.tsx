import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import {
  Explore as ExploreIcon,
  Bolt as BoltIcon,
  Translate as TranslateIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { type TourLanguage } from './tourSteps';

interface TourWelcomeModalProps {
  open: boolean;
  language: TourLanguage;
  onChangeLanguage: (lang: TourLanguage) => void;
  onStart: () => void;
  onDismiss: () => void;
}

const WELCOME_COPY: Record<TourLanguage, { heading: string; body: string; start: string; skip: string }> = {
  en: {
    heading: 'Welcome to PowerForecast!',
    body: 'Take a comprehensive guided tour to learn how to track appliances, set daily target quotas, simulate energy schedules, and forecast your Meralco electric bill.',
    start: 'Start Guided Tour',
    skip: 'Skip for now',
  },
  tl: {
    heading: 'Maligayang Pagdating sa PowerForecast!',
    body: 'Sumali sa isang komprehensibong gabay upang matutunan kung paano magtala ng gamit, magtakda ng daily target quota, mag-simulate ng konsumo, at mag-forecast ng Meralco bill.',
    start: 'Simulan ang Gabay',
    skip: 'Laktawan muna',
  },
};

export const TourWelcomeModal: React.FC<TourWelcomeModalProps> = ({
  open,
  language,
  onChangeLanguage,
  onStart,
  onDismiss,
}) => {
  const copy = WELCOME_COPY[language];

  return (
    <Modal
      open={open}
      onClose={onDismiss}
      closeAfterTransition
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(12px)',
          },
        },
      }}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99990 }}
    >
      <Fade in={open} timeout={400}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            maxWidth: 480,
            width: '92vw',
            mx: 2,
            p: { xs: 3, sm: 4 },
            borderRadius: 1.5,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(23, 26, 31, 0.98)'
                : 'rgba(255, 255, 255, 0.97)',
            border: '1px solid',
            borderColor: 'rgba(0, 229, 201, 0.35)',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 229, 201, 0.1)',
            backdropFilter: 'blur(24px)',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Close X */}
          <Box
            onClick={onDismiss}
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: 'text.primary' },
              transition: 'color 0.2s',
            }}
          >
            <CloseIcon fontSize="small" />
          </Box>

          {/* Decorative glow */}
          <Box
            sx={{
              position: 'absolute',
              top: -60,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 229, 201, 0.25) 0%, transparent 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }}
          />

          {/* Icon */}
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 1.25,
              bgcolor: 'rgba(0, 229, 201, 0.12)',
              border: '1px solid rgba(0, 229, 201, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 2.5,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <ExploreIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          </Box>

          {/* Title & Desc */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              mb: 1,
              letterSpacing: '-0.02em',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {copy.heading}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 3,
              lineHeight: 1.6,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {copy.body}
          </Typography>

          {/* Language Selector */}
          <Box sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                mb: 1,
              }}
            >
              {language === 'tl' ? 'Pumili ng Wika' : 'Select Language'}
            </Typography>
            <ToggleButtonGroup
              value={language}
              exclusive
              onChange={(_, newLang) => {
                if (newLang) onChangeLanguage(newLang);
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  px: 2,
                  py: 0.75,
                  borderRadius: '8px !important',
                  border: '1px solid',
                  borderColor: 'divider',
                  mx: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#ffffff',
                    borderColor: 'primary.main',
                    '&:hover': {
                      bgcolor: 'primary.dark',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="en">English</ToggleButton>
              <ToggleButton value="tl">Tagalog (Filipino)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative', zIndex: 1 }}>
            <Button
              variant="contained"
              size="large"
              onClick={onStart}
              startIcon={<ExploreIcon />}
              sx={{
                fontWeight: 800,
                borderRadius: 1,
                py: 1.25,
                textTransform: 'none',
                fontSize: '0.9375rem',
                boxShadow: '0 4px 20px rgba(0, 229, 201, 0.3)',
              }}
            >
              {copy.start}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={onDismiss}
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'none',
                '&:hover': { color: 'text.primary' },
              }}
            >
              {copy.skip}
            </Button>
          </Box>
        </Paper>
      </Fade>
    </Modal>
  );
};
