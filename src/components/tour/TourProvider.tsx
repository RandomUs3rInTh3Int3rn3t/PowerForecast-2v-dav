import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { TourOverlay } from './TourOverlay';
import { TourWelcomeModal } from './TourWelcomeModal';
import {
  type TourStep,
  type TourLanguage,
  type PageTour,
  type TourPage,
  getTourForPage,
  getNextPageInTour,
  getPrevPageInTour,
  FULL_TOUR_PAGE_ORDER,
  PAGE_TO_ROUTE,
  ROUTE_TO_TOUR_PAGE,
} from './tourSteps';

// ── Persistence Keys ─────────────────────────────────────────
const STORAGE_PREFIX = 'pf_tour_seen_';
const LANG_STORAGE_KEY = 'pf_tour_language';
const HAS_VISITED_KEY = 'pf_tour_has_visited';

function getSeenKey(pageName: string) {
  return `${STORAGE_PREFIX}${pageName}`;
}

function hasSeenTour(pageName: string): boolean {
  try {
    return localStorage.getItem(getSeenKey(pageName)) === 'true';
  } catch {
    return false;
  }
}

function markTourSeen(pageName: string) {
  try {
    localStorage.setItem(getSeenKey(pageName), 'true');
    localStorage.setItem(HAS_VISITED_KEY, 'true');
  } catch {
    // silently skip
  }
}

function clearTourSeen(pageName?: string) {
  try {
    if (pageName) {
      localStorage.removeItem(getSeenKey(pageName));
    } else {
      FULL_TOUR_PAGE_ORDER.forEach((p) => localStorage.removeItem(getSeenKey(p)));
      Object.keys(localStorage)
        .filter((k) => k.startsWith(STORAGE_PREFIX))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem(HAS_VISITED_KEY);
    }
  } catch {
    // silently skip
  }
}

function getInitialCompletedPages(): Record<TourPage, boolean> {
  const result = {} as Record<TourPage, boolean>;
  FULL_TOUR_PAGE_ORDER.forEach((page) => {
    result[page] = hasSeenTour(page);
  });
  return result;
}

function getSavedLanguage(): TourLanguage {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'tl') return saved;
  } catch {
    // fallback
  }
  return 'en';
}

function saveLanguage(lang: TourLanguage) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // silently skip
  }
}

export type TourMode = 'page' | 'full';

// ── Context Shape ────────────────────────────────────────────
export interface TourContextType {
  // State
  isActive: boolean;
  mode: TourMode;
  currentPageName: TourPage | null;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: TourStep | null;
  currentTour: PageTour | null;
  language: TourLanguage;
  isTransitioning: boolean;
  fullTourProgress: {
    pageIndex: number;
    totalPages: number;
    pageName: TourPage;
  } | null;

  // Controls
  startTour: (pageName: string) => void;
  startFullTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipPage: () => void;
  skipTour: () => void;
  resetTour: (pageName?: string) => void;
  setLanguage: (lang: TourLanguage) => void;
  openWelcomeModal: (pageName?: string) => void;

  // Page completion statuses
  completedPages: Record<TourPage, boolean>;

  // Welcome modal
  showWelcome: boolean;
  dismissWelcome: () => void;
  startFromWelcome: (chosenMode?: TourMode) => void;
}

export const TourContext = createContext<TourContextType | null>(null);

// ── Provider ─────────────────────────────────────────────────
interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TourMode>('page');
  const [currentPageName, setCurrentPageName] = useState<TourPage | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [language, setLanguageState] = useState<TourLanguage>(getSavedLanguage);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [completedPages, setCompletedPages] = useState<Record<TourPage, boolean>>(getInitialCompletedPages);

  // Pending page for welcome modal start flow
  const pendingPageRef = useRef<TourPage | null>(null);

  // Resolve tour for current page
  const currentTour = useMemo(() => {
    if (!currentPageName) return null;
    return getTourForPage(currentPageName);
  }, [currentPageName]);

  const totalSteps = currentTour?.steps.length ?? 0;
  const currentStep = currentTour?.steps[currentStepIndex] ?? null;

  // Full tour progress
  const fullTourProgress = useMemo(() => {
    if (mode !== 'full' || !currentPageName) return null;
    const pageIndex = FULL_TOUR_PAGE_ORDER.indexOf(currentPageName);
    return {
      pageIndex: pageIndex >= 0 ? pageIndex : 0,
      totalPages: FULL_TOUR_PAGE_ORDER.length,
      pageName: currentPageName,
    };
  }, [mode, currentPageName]);

  // ── Language Setter (persisted) ────────────────────────────
  const setLanguage = useCallback((lang: TourLanguage) => {
    setLanguageState(lang);
    saveLanguage(lang);
  }, []);

  // ── Start Tour (single page) ───────────────────────────────
  const startTour = useCallback((pageName: string) => {
    const validPage = (pageName === '/' ? 'dashboard' : pageName) as TourPage;
    const tour = getTourForPage(validPage);
    if (!tour || tour.steps.length === 0) return;

    // Check if user has ever seen ANY tour
    const hasSeenAnyTour = FULL_TOUR_PAGE_ORDER.some((p) => hasSeenTour(p));

    if (!hasSeenAnyTour && !hasSeenTour(validPage)) {
      // First-time visitor: show welcome modal
      pendingPageRef.current = validPage;
      setShowWelcome(true);
    } else {
      // Direct single-page spotlight
      setMode('page');
      setCurrentPageName(validPage);
      setCurrentStepIndex(0);
      setIsActive(true);
      setIsTransitioning(false);
    }
  }, []);

  // ── Start Full App Tour ────────────────────────────────────
  const startFullTour = useCallback(() => {
    const firstPage = FULL_TOUR_PAGE_ORDER[0];
    setMode('full');
    setCurrentPageName(firstPage);
    setCurrentStepIndex(0);
    setIsActive(true);
    setIsTransitioning(false);

    // If not currently on dashboard, navigate there
    if (location.pathname !== PAGE_TO_ROUTE[firstPage] && location.pathname !== '/') {
      setIsTransitioning(true);
      navigate(PAGE_TO_ROUTE[firstPage]);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 600);
    }
  }, [location.pathname, navigate]);

  const openWelcomeModal = useCallback((pageName?: string) => {
    const resolved = (pageName || ROUTE_TO_TOUR_PAGE[location.pathname] || 'dashboard') as TourPage;
    pendingPageRef.current = resolved;
    setShowWelcome(true);
  }, [location.pathname]);

  // ── Welcome Modal Actions ──────────────────────────────────
  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    const pageName = pendingPageRef.current;
    if (pageName) {
      markTourSeen(pageName);
      setCompletedPages((prev) => ({ ...prev, [pageName]: true }));
    }
    pendingPageRef.current = null;
  }, []);

  const startFromWelcome = useCallback((chosenMode: TourMode = 'full') => {
    setShowWelcome(false);
    const pageName = pendingPageRef.current || 'dashboard';
    pendingPageRef.current = null;

    if (chosenMode === 'full') {
      startFullTour();
    } else {
      setMode('page');
      setCurrentPageName(pageName);
      setCurrentStepIndex(0);
      setIsActive(true);
      setIsTransitioning(false);
    }
  }, [startFullTour]);

  // ── Step Navigation ────────────────────────────────────────
  const nextStep = useCallback(() => {
    if (!currentTour) return;

    if (currentStepIndex < currentTour.steps.length - 1) {
      // Next step on current page
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Reached the end of current page's steps
      if (currentPageName) {
        markTourSeen(currentPageName);
        setCompletedPages((prev) => ({ ...prev, [currentPageName]: true }));
      }

      if (mode === 'full' && currentPageName) {
        // Move to the next page in full tour
        const nextPage = getNextPageInTour(currentPageName);
        if (nextPage) {
          setIsTransitioning(true);
          navigate(PAGE_TO_ROUTE[nextPage]);
          setCurrentPageName(nextPage);
          setCurrentStepIndex(0);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 600);
          return;
        }

        // Full tour completely finished!
        setIsActive(false);
        setCurrentPageName(null);
        setCurrentStepIndex(0);
        setMode('page');
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      } else {
        // Single page tour completed
        setIsActive(false);
        setCurrentPageName(null);
        setCurrentStepIndex(0);
      }
    }
  }, [currentTour, currentStepIndex, currentPageName, mode, navigate]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      return;
    }

    // In full tour mode, stepping back from index 0 jumps to previous page's last step
    if (mode === 'full' && currentPageName) {
      const prevPage = getPrevPageInTour(currentPageName);
      if (prevPage) {
        const prevTour = getTourForPage(prevPage);
        if (prevTour && prevTour.steps.length > 0) {
          setIsTransitioning(true);
          navigate(PAGE_TO_ROUTE[prevPage]);
          setCurrentPageName(prevPage);
          setCurrentStepIndex(prevTour.steps.length - 1);
          setTimeout(() => {
            setIsTransitioning(false);
          }, 600);
        }
      }
    }
  }, [currentStepIndex, mode, currentPageName, navigate]);

  const skipPage = useCallback(() => {
    if (mode === 'full' && currentPageName) {
      markTourSeen(currentPageName);
      setCompletedPages((prev) => ({ ...prev, [currentPageName]: true }));
      const nextPage = getNextPageInTour(currentPageName);
      if (nextPage) {
        setIsTransitioning(true);
        navigate(PAGE_TO_ROUTE[nextPage]);
        setCurrentPageName(nextPage);
        setCurrentStepIndex(0);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 600);
        return;
      }
    }
    // If no next page or single mode, exit
    if (currentPageName) markTourSeen(currentPageName);
    setIsActive(false);
    setCurrentPageName(null);
    setCurrentStepIndex(0);
    setMode('page');
  }, [mode, currentPageName, navigate]);

  const skipTour = useCallback(() => {
    if (currentPageName) markTourSeen(currentPageName);
    setIsActive(false);
    setCurrentPageName(null);
    setCurrentStepIndex(0);
    setMode('page');
  }, [currentPageName]);

  const resetTour = useCallback((pageName?: string) => {
    clearTourSeen(pageName);
    setCompletedPages(getInitialCompletedPages());
  }, []);

  // ── Auto-Start on Route Change for First-Time Users ────────
  useEffect(() => {
    if (isActive || showWelcome) return;

    const pageName = ROUTE_TO_TOUR_PAGE[location.pathname];
    if (!pageName) return;
    if (hasSeenTour(pageName)) return;

    // Check if user has seen ANY tour
    const hasSeenAnyTour = FULL_TOUR_PAGE_ORDER.some((p) => hasSeenTour(p));

    const timer = setTimeout(() => {
      if (!hasSeenTour(pageName)) {
        if (!hasSeenAnyTour) {
          pendingPageRef.current = pageName;
          setShowWelcome(true);
        } else {
          startTour(pageName);
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [location.pathname, isActive, showWelcome, startTour]);

  // Context value
  const contextValue = useMemo<TourContextType>(
    () => ({
      isActive,
      mode,
      currentPageName,
      currentStepIndex,
      totalSteps,
      currentStep,
      currentTour,
      language,
      isTransitioning,
      fullTourProgress,
      startTour,
      startFullTour,
      nextStep,
      prevStep,
      skipPage,
      skipTour,
      resetTour,
      setLanguage,
      openWelcomeModal,
      completedPages,
      showWelcome,
      dismissWelcome,
      startFromWelcome,
    }),
    [
      isActive,
      mode,
      currentPageName,
      currentStepIndex,
      totalSteps,
      currentStep,
      currentTour,
      language,
      isTransitioning,
      fullTourProgress,
      startTour,
      startFullTour,
      nextStep,
      prevStep,
      skipPage,
      skipTour,
      resetTour,
      setLanguage,
      openWelcomeModal,
      completedPages,
      showWelcome,
      dismissWelcome,
      startFromWelcome,
    ]
  );

  return (
    <TourContext.Provider value={contextValue}>
      {children}

      {/* Welcome Modal */}
      <TourWelcomeModal
        open={showWelcome}
        language={language}
        onChangeLanguage={setLanguage}
        onStartFull={() => startFromWelcome('full')}
        onStartPage={() => startFromWelcome('page')}
        onDismiss={dismissWelcome}
        targetPage={pendingPageRef.current || 'dashboard'}
        completedPages={completedPages}
      />

      {/* Spotlight Overlay */}
      {isActive && currentStep && !isTransitioning && (
        <TourOverlay
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={totalSteps}
          language={language}
          mode={mode}
          fullTourProgress={fullTourProgress}
          currentTourTitle={currentTour?.pageTitle[language] || ''}
          onChangeLanguage={setLanguage}
          onNext={nextStep}
          onPrev={prevStep}
          onSkipPage={skipPage}
          onSkip={skipTour}
          isFirstStep={currentStepIndex === 0 && (mode !== 'full' || fullTourProgress?.pageIndex === 0)}
          isLastStep={
            currentStepIndex === totalSteps - 1 &&
            (mode !== 'full' || fullTourProgress?.pageIndex === FULL_TOUR_PAGE_ORDER.length - 1)
          }
        />
      )}
    </TourContext.Provider>
  );
};
