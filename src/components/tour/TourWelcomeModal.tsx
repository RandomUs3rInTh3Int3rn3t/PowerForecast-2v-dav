import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Modal from '@mui/material/Modal';
import Fade from '@mui/material/Fade';
import {
  Explore as ExploreIcon,
  RocketLaunch as RocketIcon,
  Bolt as BoltIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Close as CloseIcon,
  Calculate as CalculateIcon,
  CalendarToday as CalendarIcon,
  Insights as InsightsIcon,
  AutoGraph as AutoGraphIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import {
  type TourLanguage,
  type TourPage,
  FULL_TOUR_PAGE_ORDER,
  PAGE_METADATA,
  ALL_PAGE_TOURS,
} from './tourSteps';

interface TourWelcomeModalProps {
  open: boolean;
  language: TourLanguage;
  onChangeLanguage: (lang: TourLanguage) => void;
  onStartFull: () => void;
  onStartPage: () => void;
  onDismiss: () => void;
  targetPage: TourPage;
  completedPages: Record<TourPage, boolean>;
}

const PAGE_ICONS: Record<TourPage, React.ReactElement> = {
  dashboard: <DashboardIcon sx={{ fontSize: 18 }} />,
  calculator: <CalculateIcon sx={{ fontSize: 18 }} />,
  appliances: <BoltIcon sx={{ fontSize: 18 }} />,
  calendar: <CalendarIcon sx={{ fontSize: 18 }} />,
  analytics: <InsightsIcon sx={{ fontSize: 18 }} />,
  forecasting: <AutoGraphIcon sx={{ fontSize: 18 }} />,
};

const WELCOME_COPY: Record<
  TourLanguage,
  {
    badge: string;
    heading: string;
    body: string;
    startFull: string;
    startFullSub: string;
    startPage: string;
    startPageSub: string;
    skip: string;
    modulesTitle: string;
    completedBadge: string;
    currentBadge: string;
    pendingBadge: string;
  }
> = {
  en: {
    badge: 'Interactive Guided System Tour',
    heading: 'Welcome to PowerForecast',
    body: 'Master energy intelligence from head to toe. Discover how to simulate live wattage, calculate unbundled Meralco rates, track time-of-use routines, and forecast month-end electric bills with high precision.',
    startFull: 'Start Full App Walkthrough',
    startFullSub: 'Comprehensive tour across all 6 modules (~4-5 min)',
    startPage: 'Tour This Page Only',
    startPageSub: 'Quick walkthrough of the current module',
    skip: 'Skip tour for now',
    modulesTitle: 'App Modules & Coverage',
    completedBadge: 'Completed',
    currentBadge: 'Current',
    pendingBadge: 'Pending',
  },
  tl: {
    badge: 'Matalinong Gabay sa Sistema',
    heading: 'Maligayang Pagdating sa PowerForecast',
    body: 'Alamin ang bawat sulok ng app mula ulo hanggang paa. Matutunan kung paano mag-simulate ng wattage, kalkulahin ang unbundled Meralco rates, mag-iskedyul ng appliances sa kalendaryo, at hulaan ang bill sa katapusan ng buwan.',
    startFull: 'Simulan ang Buong Gabay ng App',
    startFullSub: 'Komprehensibong paglalakbay sa 6 na modyul (~4-5 min)',
    startPage: 'Gabay sa Pahinang Ito Lamang',
    startPageSub: 'Mabilisang pagsusuri ng kasalukuyang modyul',
    skip: 'Laktawan muna ang gabay',
    modulesTitle: 'Mga Modyul ng Sistema',
    completedBadge: 'Tapos na',
    currentBadge: 'Kasalukuyan',
    pendingBadge: 'Hindi pa',
  },
};

export const TourWelcomeModal: React.FC<TourWelcomeModalProps> = ({
  open,
  language,
  onChangeLanguage,
  onStartFull,
  onStartPage,
  onDismiss,
  targetPage,
  completedPages,
}) => {
  const copy = WELCOME_COPY[language];
  const targetMeta = PAGE_METADATA[targetPage];
  const targetStepsCount = ALL_PAGE_TOURS[targetPage]?.steps.length || 0;

  return (
    <Modal
      open={open}
      onClose={onDismiss}
      closeAfterTransition
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(16px)',
          },
        },
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99990,
        p: 2,
      }}
    >
      <Fade in={open} timeout={350}>
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            maxWidth: 620,
            width: '100%',
            p: { xs: 2.75, sm: 4 },
            borderRadius: 2,
            bgcolor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(23, 26, 31, 0.98)' : 'rgba(255, 255, 255, 0.98)',
            border: '1px solid',
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.35)' : 'rgba(13, 148, 136, 0.3)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 28px 90px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 229, 201, 0.12)'
                : '0 20px 70px rgba(15, 23, 42, 0.15)',
            backdropFilter: 'blur(28px)',
            overflow: 'hidden',
          }}
        >
          {/* Close X */}
          <Box
            onClick={onDismiss}
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              cursor: 'pointer',
              color: 'text.secondary',
              p: 0.5,
              borderRadius: 1,
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
              transition: 'all 0.15s ease',
            }}
          >
            <CloseIcon fontSize="small" />
          </Box>

          {/* Decorative background glow */}
          <Box
            sx={{
              position: 'absolute',
              top: -80,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 320,
              height: 220,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0, 229, 201, 0.22) 0%, transparent 70%)',
              filter: 'blur(45px)',
              pointerEvents: 'none',
            }}
          />

          {/* Header Badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1.5 }}>
            <Chip
              icon={<ExploreIcon sx={{ fontSize: '15px !important', color: 'primary.main !important' }} />}
              label={copy.badge}
              size="small"
              sx={{
                fontWeight: 800,
                fontSize: '0.6875rem',
                letterSpacing: '0.04em',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.12)' : 'rgba(13, 148, 136, 0.08)',
                color: 'primary.main',
                border: '1px solid',
                borderColor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.3)' : 'rgba(13, 148, 136, 0.25)',
              }}
            />
          </Box>

          {/* Title & Desc */}
          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              textAlign: 'center',
              letterSpacing: '-0.02em',
              mb: 1,
              color: 'text.primary',
            }}
          >
            {copy.heading}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              textAlign: 'center',
              mb: 2.5,
              lineHeight: 1.6,
              fontSize: { xs: '0.8125rem', sm: '0.875rem' },
              maxWidth: 520,
              mx: 'auto',
            }}
          >
            {copy.body}
          </Typography>

          {/* Language Selector */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
            <ToggleButtonGroup
              value={language}
              exclusive
              onChange={(_, newLang) => {
                if (newLang) onChangeLanguage(newLang);
              }}
              size="small"
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
                p: 0.5,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  px: 2,
                  py: 0.5,
                  borderRadius: '6px !important',
                  border: 'none',
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark' ? '#00e5c9' : '#0d9488',
                    color: (theme) => (theme.palette.mode === 'dark' ? '#0b1614' : '#ffffff'),
                    fontWeight: 800,
                    boxShadow: '0 2px 8px rgba(0, 229, 201, 0.25)',
                    '&:hover': {
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? '#00e5c9' : '#0d9488',
                    },
                  },
                },
              }}
            >
              <ToggleButton value="en">English</ToggleButton>
              <ToggleButton value="tl">Tagalog (Filipino)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Module Coverage Matrix */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 1.5,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                mb: 1.25,
              }}
            >
              {copy.modulesTitle}
            </Typography>

            <Grid container spacing={1}>
              {FULL_TOUR_PAGE_ORDER.map((pageKey) => {
                const meta = PAGE_METADATA[pageKey];
                const isCompleted = completedPages[pageKey];
                const isCurrent = pageKey === targetPage;

                return (
                  <Grid size={{ xs: 6, sm: 4 }} key={pageKey}>
                    <Box
                      sx={{
                        p: 1.25,
                        borderRadius: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: (theme) =>
                          isCurrent
                            ? theme.palette.mode === 'dark'
                              ? 'rgba(0, 229, 201, 0.09)'
                              : 'rgba(13, 148, 136, 0.08)'
                            : theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.02)'
                            : '#ffffff',
                        border: '1px solid',
                        borderColor: isCurrent
                          ? 'primary.main'
                          : isCompleted
                          ? 'success.main'
                          : 'divider',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Box
                        sx={{
                          color: isCurrent
                            ? 'primary.main'
                            : isCompleted
                            ? 'success.main'
                            : 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {PAGE_ICONS[pageKey]}
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            display: 'block',
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.75rem',
                          }}
                        >
                          {meta.title[language]}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                          {isCompleted ? (
                            <Typography variant="caption" sx={{ color: 'success.main', fontSize: '0.625rem', fontWeight: 700 }}>
                              ✓ {copy.completedBadge}
                            </Typography>
                          ) : isCurrent ? (
                            <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.625rem', fontWeight: 700 }}>
                              ● {copy.currentBadge}
                            </Typography>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.625rem' }}>
                              ○ {copy.pendingBadge}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          {/* Dual CTAs */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Primary Option: Full App Walkthrough */}
            <Button
              variant="contained"
              size="large"
              onClick={onStartFull}
              startIcon={<RocketIcon />}
              sx={{
                fontWeight: 800,
                borderRadius: 1.25,
                py: 1.35,
                textTransform: 'none',
                fontSize: '0.9375rem',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 6px 24px rgba(0, 229, 201, 0.35)'
                    : '0 4px 18px rgba(13, 148, 136, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.25,
              }}
            >
              <span>{copy.startFull}</span>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  opacity: 0.85,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                {copy.startFullSub}
              </Typography>
            </Button>

            {/* Secondary Option: Current Page Only */}
            <Button
              variant="outlined"
              size="medium"
              onClick={onStartPage}
              startIcon={<ExploreIcon />}
              sx={{
                fontWeight: 700,
                borderRadius: 1.25,
                py: 1,
                textTransform: 'none',
                fontSize: '0.84rem',
                borderColor: 'divider',
                color: 'text.primary',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'rgba(0, 229, 201, 0.08)' : 'rgba(13, 148, 136, 0.06)',
                },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.25,
              }}
            >
              <span>
                {copy.startPage} ({targetMeta?.title[language]} • {targetStepsCount} steps)
              </span>
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.6875rem',
                  fontWeight: 500,
                }}
              >
                {copy.startPageSub}
              </Typography>
            </Button>

            {/* Skip */}
            <Button
              variant="text"
              size="small"
              onClick={onDismiss}
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'none',
                fontSize: '0.75rem',
                py: 0.5,
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
