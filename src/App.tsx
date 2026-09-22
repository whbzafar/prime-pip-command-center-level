// Force HMR refresh
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Header } from './components/Header';
import { MainDashboard } from './components/MainDashboard';
import { TradeJournal } from './components/TradeJournal';
import { PerformanceLab } from './components/PerformanceLab';
import { PsychologyCenter } from './components/PsychologyCenter';
import { RiskCenter, TradeLimitAlertSystem } from './components/RiskCenter';
import { AiTradingCoach } from './components/AiTradingCoach';
import { GoalsProgress } from './components/GoalsProgress';
import { CompoundingEngine } from './components/CompoundingEngine';
import { PersonalImprovementHub } from './components/PersonalImprovementHub';
import { MainNavTab } from './components/Header';
import { TradeEntryModal } from './components/TradeEntryModal';
import { AccountOnboardingModal } from './components/AccountOnboardingModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AccountManagerModal } from './components/AccountManagerModal';
import { DataBackupModal } from './components/DataBackupModal';
import { initialRules, initialGoals } from './data/initialTrades';
import { Trade, TradingRule, TradingGoal, AccountSettings, UserAccount } from './types';
import { calculateDashboardMetrics } from './utils/tradeAnalytics';
import { LotSizeCalculator } from './components/LotSizeCalculator';
import { LoginModal } from './components/LoginModal';
import { FirstOpenLoginScreen } from './components/FirstOpenLoginScreen';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AppPerimeterGlow } from './components/AppPerimeterGlow';
import { SubscriptionPage } from './components/SubscriptionPage';
import { SubscriptionGateModal } from './components/SubscriptionGateModal';
import { DeveloperAdminPanel } from './components/DeveloperAdminPanel';
import { PreTradePlan } from './components/PreTradePlan';
import { SbtModelsHub } from './components/sbt/SbtModelsHub';
import { FundamentalCalendar } from './components/FundamentalCalendar';
import { FundamentalIndicators } from './components/FundamentalIndicators';
import { NotificationsPanel } from './components/NotificationsPanel';
import { FreehandWorkspace } from './components/FreehandWorkspace';
import { CommunityChat } from './components/CommunityChat';
import { BookSessionView } from './components/BookSessionView';
import { TradingResearchCenter } from './components/TradingResearchCenter';
import { PremiumSignalsHub } from './components/PremiumSignalsHub';
import { AiChartScannerModal } from './components/AiChartScannerModal';
import { UserProfileModal } from './components/UserProfileModal';
import { TraderExperienceProfileModal } from './components/evolution/TraderExperienceProfileModal';
import { EvolutionCommandCenter } from './components/evolution/EvolutionCommandCenter';
import { CalmingSuiteMaster } from './components/calming/CalmingSuiteMaster';
import { apiRecordTelemetrySignal } from './utils/evolutionClient';
import { getCurrentUser, logoutUser, verifyCurrentSession, getStoredToken, isUserAdmin } from './utils/authClient';
import {
  getAllAccounts,
  saveAccount,
  deleteAccount,
  getTradesForAccount,
  saveTrade,
  deleteTrade,
  getRulesForAccount,
  saveRulesForAccount,
  getGoalsForAccount,
  saveGoalsForAccount,
  syncUserDataFromServer,
  syncUserDataToServer,
  exportAllData,
} from './utils/db';
import { googleDriveService } from './services/googleDriveService';
import { Loader2, Shield, AlertTriangle, X } from 'lucide-react';
import { playDisciplineAlert } from './utils/audioAlerts';
import { getKarachiDate, getKarachiTime } from './utils/time';
import { AppearanceControls } from './components/AppearanceControls';
import { AppFooter } from './components/AppFooter';
import { CommandCenterAtmosphere } from './components/CommandCenterAtmosphere';
import { AllCategoriesModal } from './components/AllCategoriesModal';
import { CommunicationNotifications } from './components/CommunicationNotifications';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<MainNavTab>('DASHBOARD');

  // Demo Mode State with persistence to prevent repeated login prompts
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('primepipfx_demo_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [demoToast, setDemoToast] = useState<string | null>(null);

  // Modal States
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isStudentOnboardingOpen, setIsStudentOnboardingOpen] = useState(false);
  const [isAccountManagerOpen, setIsAccountManagerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isChartScannerOpen, setIsChartScannerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isTraderProfileOpen, setIsTraderProfileOpen] = useState(false);
  const [isAllCategoriesOpen, setIsAllCategoriesOpen] = useState(false);
  const [prefilledTradeData, setPrefilledTradeData] = useState<Partial<Trade> | null>(null);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getCurrentUser());

  // Active Category / Tab State & Main Container Reference
  const activeCategory = activeTab;
  const mainContainerRef = useRef<HTMLElement>(null);

  // Fix Navigation Gap / Black Screen: Immediately align scroll position so content is visible right away
  useEffect(() => {
    if (mainContainerRef.current) {
      mainContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeCategory, activeTab]);

  // Continuous Telemetry Observation Hook
  useEffect(() => {
    try {
      apiRecordTelemetrySignal(
        currentUser?.id || 'trader_default',
        'TOOL_SWITCH',
        activeTab,
        { timestamp: Date.now() }
      );
    } catch {
      // Non-blocking telemetry
    }
  }, [activeTab, currentUser?.id]);

  // Background Server-authoritative Session Verification
  useEffect(() => {
    verifyCurrentSession().then((user) => {
      if (user) {
        setCurrentUser(user);
        setIsDemoMode(false);
        if ((user.needsOnboarding || !user.hasCompletedOnboarding) && !isUserAdmin(user)) {
          setIsStudentOnboardingOpen(true);
        }
      } else {
        setCurrentUser(null);
      }
    });
  }, []);

  // Body scroll lock while subscription modal is open
  useEffect(() => {
    if (!isSubscriptionModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isSubscriptionModalOpen]);

  // Core Data States
  const [accounts, setAccounts] = useState<AccountSettings[]>([]);
  const [activeAccount, setActiveAccount] = useState<AccountSettings | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rules, setRules] = useState<TradingRule[]>([]);
  const [goals, setGoals] = useState<TradingGoal[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('XAUUSD');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Load account data helper
  const loadAccountData = useCallback(async (account: AccountSettings) => {
    try {
      const accountTrades = await getTradesForAccount(account.id);
      setTrades(accountTrades);

      const accountRules = await getRulesForAccount(account.id);
      if (accountRules && accountRules.length > 0) {
        setRules(accountRules);
      } else {
        const seededRules = initialRules.map((r) => ({
          ...r,
          accountId: account.id,
          isActive: true,
          active: true,
        }));
        await saveRulesForAccount(account.id, seededRules);
        setRules(seededRules);
      }

      const accountGoals = await getGoalsForAccount(account.id);
      if (accountGoals && accountGoals.length > 0) {
        setGoals(accountGoals);
      } else {
        const seededGoals = initialGoals.map((g) => ({
          ...g,
          accountId: account.id,
        }));
        await saveGoalsForAccount(account.id, seededGoals);
        setGoals(seededGoals);
      }
    } catch (err) {
      console.error('Error loading account data:', err);
    }
  }, []);

  // Enter Demo Mode Helper
  const handleEnterDemoMode = useCallback(async () => {
    setIsDemoMode(true);
    try {
      localStorage.setItem('primepipfx_demo_mode', 'true');
    } catch {}
    setIsLoginModalOpen(false);
    setIsSubscriptionModalOpen(false);
    setActiveTab('DASHBOARD');

    // If no account is loaded, provide a demo preview account immediately
    if (!activeAccount || accounts.length === 0) {
      const demoAccount: AccountSettings = {
        id: 'acc-demo-preview',
        traderName: 'DEMO TRADER',
        accountName: 'Demo Preview Account',
        accountType: 'DEMO',
        initialBalance: 5000,
        currentBalance: 5000,
        currentEquity: 5000,
        broker: 'PrimePipFX Simulation',
        currency: 'USD',
        maxDailyLossPercent: 4.0,
        maxDrawdownPercent: 5.0,
        maxDailyTrades: 2,
        maxRiskPerTradePercent: 1.0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setAccounts([demoAccount]);
      setActiveAccount(demoAccount);
      await saveAccount(demoAccount);
      await loadAccountData(demoAccount);
    }
  }, [activeAccount, accounts, loadAccountData]);

  // Initial Load from IndexedDB
  const initApp = useCallback(async () => {
    setIsLoading(true);
    try {
      let loadedAccounts = await getAllAccounts();

      // Legacy fallback: check if there was an account saved in localStorage (demo user only)
      if (loadedAccounts.length === 0 && !currentUser) {
        try {
          const legacyAccountStr = localStorage.getItem('primepipfx_account_v1');
          if (legacyAccountStr) {
            const legacy = JSON.parse(legacyAccountStr);
            if (legacy && legacy.accountName && legacy.initialBalance) {
              const legacyAccount: AccountSettings = {
                ...legacy,
                id: legacy.id || `acc-${Date.now()}`,
              };
              await saveAccount(legacyAccount);

              // migrate legacy trades if any
              const legacyTradesStr = localStorage.getItem('primepipfx_trades_v1');
              if (legacyTradesStr) {
                const legacyTrades = JSON.parse(legacyTradesStr);
                if (Array.isArray(legacyTrades)) {
                  for (const t of legacyTrades) {
                    await saveTrade({ ...t, accountId: legacyAccount.id });
                  }
                }
              }
              loadedAccounts = [legacyAccount];
            }
          }
        } catch (migrationErr) {
          console.warn('Legacy migration notice:', migrationErr);
        }
      }

      if (loadedAccounts.length === 0) {
        // First-time User Onboarding: No accounts exist
        setAccounts([]);
        setActiveAccount(null);
        setTrades([]);
        setIsOnboardingOpen(true);
      } else {
        setAccounts(loadedAccounts);
        const currentUserId = currentUser?.id || 'demo-user';
        const savedActiveId =
          localStorage.getItem(`primepipfx_active_account_id_${currentUserId}`) ||
          localStorage.getItem('primepipfx_active_account_id');
        const matched = loadedAccounts.find((a) => a.id === savedActiveId) || loadedAccounts[0];
        setActiveAccount(matched);
        localStorage.setItem(`primepipfx_active_account_id_${currentUserId}`, matched.id);
        await loadAccountData(matched);
      }
    } catch (err) {
      console.error('Failed to initialize app from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, loadAccountData]);

  useEffect(() => {
    initApp();
  }, [currentUser?.id, initApp]);

  // Cloud sync for authenticated customers
  useEffect(() => {
    const token = getStoredToken();
    if (token && currentUser && currentUser.role !== 'DEVELOPER') {
      syncUserDataFromServer(token).then((synced) => {
        if (synced) {
          initApp();
        }
      });
    }
  }, [currentUser?.id, initApp]);

  // Sync current user ID with Google Drive service
  useEffect(() => {
    googleDriveService.setCurrentUserId(currentUser?.id);
  }, [currentUser?.id]);

  // Free Automatic Google Drive Storage Sync (runs whenever user updates trades, accounts, rules, or goals)
  useEffect(() => {
    if (!currentUser?.id || !googleDriveService.isConnected() || !googleDriveService.isAutoSaveEnabled()) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const allData = await exportAllData();
        await googleDriveService.autoSaveUserData(allData);
      } catch (err) {
        console.warn('AutoSave to Google Drive error:', err);
      }
    }, 3500); // 3.5-second debounce

    return () => clearTimeout(timer);
  }, [trades, accounts, rules, goals, currentUser?.id]);

  // Account Operations
  const handleSelectAccount = async (accountId: string) => {
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;
    setActiveAccount(target);
    const currentUserId = currentUser?.id || 'demo-user';
    localStorage.setItem(`primepipfx_active_account_id_${currentUserId}`, target.id);
    await loadAccountData(target);
  };

  const handleAccountCreated = async (newAccount: AccountSettings) => {
    await saveAccount(newAccount);
    const updatedAccounts = await getAllAccounts();
    setAccounts(updatedAccounts);
    setActiveAccount(newAccount);
    const currentUserId = currentUser?.id || 'demo-user';
    localStorage.setItem(`primepipfx_active_account_id_${currentUserId}`, newAccount.id);

    const token = getStoredToken();
    if (token && currentUser && currentUser.role !== 'DEVELOPER') {
      syncUserDataToServer(token);
    }

    // Initialize with fresh state for new account
    setTrades([]);

    const seededRules = initialRules.map((r) => ({
      ...r,
      accountId: newAccount.id,
      isActive: true,
      active: true,
    }));
    await saveRulesForAccount(newAccount.id, seededRules);
    setRules(seededRules);

    const seededGoals = initialGoals.map((g) => ({
      ...g,
      accountId: newAccount.id,
    }));
    await saveGoalsForAccount(newAccount.id, seededGoals);
    setGoals(seededGoals);

    setIsOnboardingOpen(false);
  };

  const handleUpdateAccount = async (updatedAccount: AccountSettings) => {
    await saveAccount(updatedAccount);
    setAccounts((prev) => prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
    if (activeAccount?.id === updatedAccount.id) {
      setActiveAccount(updatedAccount);
    }
    const token = getStoredToken();
    if (token && currentUser && currentUser.role !== 'DEVELOPER') {
      syncUserDataToServer(token);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    await deleteAccount(accountId);
    const updated = accounts.filter((a) => a.id !== accountId);
    setAccounts(updated);

    const currentUserId = currentUser?.id || 'demo-user';
    if (activeAccount?.id === accountId) {
      if (updated.length > 0) {
        handleSelectAccount(updated[0].id);
      } else {
        localStorage.removeItem(`primepipfx_active_account_id_${currentUserId}`);
        setActiveAccount(null);
        setTrades([]);
        setRules([]);
        setGoals([]);
        setIsOnboardingOpen(true);
      }
    }
    const token = getStoredToken();
    if (token && currentUser && currentUser.role !== 'DEVELOPER') {
      syncUserDataToServer(token);
    }
  };

  // Trades Handlers
  const handleSaveTrade = async (newTrade: Trade) => {
    if (!activeAccount) return;

    if (isDemoMode && !currentUser) {
      playDisciplineAlert('WARNING');
      setDemoToast('WARNING: Running in demo preview mode. Trade recorded to local session.');
    } else if (
      currentUser &&
      currentUser.role !== 'DEVELOPER' &&
      !currentUser.isDeveloper &&
      (currentUser.subscriptionStatus === 'EXPIRED' ||
        currentUser.subscriptionStatus === 'SUSPENDED' ||
        currentUser.subscriptionStatus === 'PAYMENT_REQUIRED')
    ) {
      playDisciplineAlert('WARNING');
      setDemoToast(
        'WARNING: Account access status is restricted from recording live executions.'
      );
      setIsEntryModalOpen(false);
      return;
    }

    // Risk Management Rule: 1% maximum risk per trade (Non-blocking warning)
    const tradeRisk =
      typeof newTrade.riskAmount === 'number' && activeAccount.initialBalance > 0
        ? (newTrade.riskAmount / activeAccount.initialBalance) * 100
        : 0;
    const isRiskExceeded = tradeRisk > 1.001;

    // Risk Management Rule: Maximum 2 trades per day (Non-blocking warning)
    const tradeDate = newTrade.date || getKarachiDate();
    const existingDayTrades = trades.filter((t) => t.date === tradeDate);
    const isDailyLimitExceeded = existingDayTrades.length >= 2;

    // Trigger visual advisory toast and audio alert without blocking the user
    if (isRiskExceeded && isDailyLimitExceeded) {
      playDisciplineAlert('LIMIT_REACHED');
      setDemoToast(
        `ADVISORY WARNING: Trade recorded with ${tradeRisk.toFixed(1)}% risk and exceeds the 2 trades/day guideline (${existingDayTrades.length + 1} trades today).`
      );
    } else if (isRiskExceeded) {
      playDisciplineAlert('WARNING');
      setDemoToast(
        `ADVISORY WARNING: Trade recorded with ${tradeRisk.toFixed(1)}% risk (recommended threshold is 1.0%).`
      );
    } else if (isDailyLimitExceeded) {
      playDisciplineAlert('WARNING');
      setDemoToast(
        `ADVISORY WARNING: Trade recorded exceeding your 2 trades/day guideline (${existingDayTrades.length + 1} trades logged today).`
      );
    }

    setIsEntryModalOpen(false);

    const tradeWithAccount = { ...newTrade, accountId: activeAccount.id };
    await saveTrade(tradeWithAccount);
    const nextTrades = [tradeWithAccount, ...trades];
    setTrades(nextTrades);
    setLastSavedTime(getKarachiTime());

    const token = getStoredToken();
    if (token && currentUser && currentUser.role !== 'DEVELOPER') {
      syncUserDataToServer(token);
    }

    // Check Discipline Alerts & Trigger Web Audio Synthesizer
    const todayDate = getKarachiDate();
    const todayTrades = nextTrades.filter((t) => t.date === todayDate);
    const tradesTodayCount = todayTrades.length;
    const todayPnL = todayTrades.reduce(
      (acc, t) => acc + (typeof t.profitLoss === 'number' ? t.profitLoss : 0),
      0
    );
    const dailyLossLimitDollars =
      (activeAccount.initialBalance * (activeAccount.maxDailyLossPercent || 3)) / 100;
    const isDailyLossLimitHit = todayPnL <= -dailyLossLimitDollars;

    if (tradesTodayCount >= activeAccount.maxDailyTrades || isDailyLossLimitHit) {
      // Daily lockout alarm: max trades or daily loss limit reached!
      playDisciplineAlert('LIMIT_REACHED');
    } else if (newTrade.ruleViolation && newTrade.ruleViolation !== 'NONE') {
      // Rule violation warning buzzer
      playDisciplineAlert('WARNING');
    } else if (typeof newTrade.profitLoss === 'number' && newTrade.profitLoss < 0) {
      // Loss alert
      playDisciplineAlert('WARNING');
    } else {
      // Clean execution chime
      playDisciplineAlert('CHIME');
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!activeAccount) return;
    if (isDemoMode && !currentUser) {
      playDisciplineAlert('WARNING');
      setDemoToast('WARNING: Trade deletion is restricted in preview mode.');
      return;
    }

    if (
      currentUser &&
      currentUser.role !== 'DEVELOPER' &&
      !currentUser.isDeveloper &&
      (currentUser.subscriptionStatus === 'EXPIRED' ||
        currentUser.subscriptionStatus === 'SUSPENDED' ||
        currentUser.subscriptionStatus === 'PAYMENT_REQUIRED')
    ) {
      playDisciplineAlert('WARNING');
      setDemoToast(
        'WARNING: Trade modification is disabled for this account status.'
      );
      return;
    }

    await deleteTrade(id, activeAccount.id);
    setTrades((prev) => prev.filter((t) => t.id !== id));

    const token = getStoredToken();
    if (token && currentUser && currentUser.role !== 'DEVELOPER') {
      syncUserDataToServer(token);
    }
  };

  const handleUpdateTrade = async (updatedTrade: Trade) => {
    if (!activeAccount) return;
    await saveTrade(updatedTrade);
    setTrades((prev) => prev.map((t) => (t.id === updatedTrade.id ? updatedTrade : t)));
    setLastSavedTime(getKarachiTime());

    const token = getStoredToken();
    if (token && currentUser && currentUser.role !== 'DEVELOPER') {
      syncUserDataToServer(token);
    }
  };

  // Rules Handlers
  const handleToggleRule = async (id: string) => {
    if (!activeAccount) return;
    const nextRules = rules.map((r) => {
      if (r.id === id) {
        const nextActive = !r.isActive;
        return { ...r, isActive: nextActive, active: nextActive };
      }
      return r;
    });
    setRules(nextRules);
    await saveRulesForAccount(activeAccount.id, nextRules);
  };

  const handleSaveRule = async (rule: TradingRule) => {
    if (!activeAccount) return;
    const idx = rules.findIndex((r) => r.id === rule.id);
    let nextRules: TradingRule[];
    if (idx >= 0) {
      nextRules = [...rules];
      nextRules[idx] = { ...rule, accountId: activeAccount.id };
    } else {
      nextRules = [...rules, { ...rule, accountId: activeAccount.id }];
    }
    setRules(nextRules);
    await saveRulesForAccount(activeAccount.id, nextRules);
  };

  const handleAddRule = async (
    title: string,
    category: 'RISK' | 'EXECUTION' | 'PSYCHOLOGY',
    isHardRule: boolean,
    description?: string,
    severity?: 'MAJOR' | 'MINOR'
  ) => {
    if (!activeAccount) return;
    const newRule: TradingRule = {
      id: `rule-${Date.now()}`,
      accountId: activeAccount.id,
      title,
      description: description || '',
      category,
      severity: severity || (isHardRule ? 'MAJOR' : 'MINOR'),
      isHardRule,
      isActive: true,
      active: true,
      violationCount: 0,
    };
    const nextRules = [...rules, newRule];
    setRules(nextRules);
    await saveRulesForAccount(activeAccount.id, nextRules);
  };

  const handleDeleteRule = async (id: string) => {
    if (!activeAccount) return;
    const nextRules = rules.filter((r) => r.id !== id);
    setRules(nextRules);
    await saveRulesForAccount(activeAccount.id, nextRules);
  };

  // Goals Handlers
  const handleToggleGoal = async (id: string) => {
    if (!activeAccount) return;
    const nextGoals = goals.map((g) =>
      g.id === id
        ? {
            ...g,
            isCompleted: !g.isCompleted,
            current: !g.isCompleted ? g.target : 0,
          }
        : g
    );
    setGoals(nextGoals);
    await saveGoalsForAccount(activeAccount.id, nextGoals);
  };

  const handleAddGoal = async (title: string, target: number, unit: string) => {
    if (!activeAccount) return;
    const newGoal: TradingGoal = {
      id: `goal-${Date.now()}`,
      accountId: activeAccount.id,
      title,
      target,
      current: 0,
      unit,
      category: 'PROCESS',
      isCompleted: false,
    };
    const nextGoals = [...goals, newGoal];
    setGoals(nextGoals);
    await saveGoalsForAccount(activeAccount.id, nextGoals);
  };

  const handleDeleteGoal = async (id: string) => {
    if (!activeAccount) return;
    const nextGoals = goals.filter((g) => g.id !== id);
    setGoals(nextGoals);
    await saveGoalsForAccount(activeAccount.id, nextGoals);
  };

  // Derived dashboard metrics
  const metrics = activeAccount
    ? calculateDashboardMetrics(trades, activeAccount)
    : calculateDashboardMetrics([], {
        id: 'temp',
        traderName: 'TRADER',
        accountName: 'Loading',
        accountType: 'PERSONAL_LIVE',
        initialBalance: 0,
        currentBalance: 0,
        currentEquity: 0,
        currency: 'USD',
        maxDailyLossPercent: 2,
        maxDrawdownPercent: 5,
        maxRiskPerTradePercent: 1,
        maxDailyTrades: 2,
        broker: '',
      });

  // App Loading Spinner
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-6 font-mono-code">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-4 animate-pulse">
          <Shield className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-slate-300 font-bold font-military tracking-widest text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>PRIMEPIPFX SYSTEM INITIALIZING...</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Connecting to offline local IndexedDB vault</p>
      </div>
    );
  }

  // Section 1: FIRST-OPEN LOGIN SCREEN
  // When the application is opened for the first time, immediately display the Login screen.
  // Do not open the Dashboard before authentication.
  if (!currentUser && !isDemoMode) {
    return (
      <FirstOpenLoginScreen
        onLoginSuccess={(user, token) => {
          setCurrentUser(user);
          setIsDemoMode(false);
          if (isUserAdmin(user)) {
            setActiveTab('ADMIN');
          }
        }}
        onExploreDemo={handleEnterDemoMode}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
      />
    );
  }

  // If no account exists yet, force Onboarding Screen unless in demo mode
  if (!activeAccount || accounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4">
        <AccountOnboardingModal
          onAccountCreated={handleAccountCreated}
          onExploreDemo={handleEnterDemoMode}
        />
      </div>
    );
  }

  return (
    <div className="prime-command-shell w-full max-w-full min-h-screen text-slate-100 flex flex-col selection:bg-blue-500/30 selection:text-cyan-200 relative overflow-x-hidden">
      <CommunicationNotifications currentUser={currentUser} onOpenCommunication={() => setActiveTab('COMMUNITY')} />

      {/* 4-Side Animated Laser Perimeter Frame */}
      <AppPerimeterGlow />

      {/* Global Animated Background Elements with Calibrated Clean Cyber Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 18% 30%, rgba(14, 165, 233, 0.05), transparent 45%), radial-gradient(circle at 82% 25%, rgba(168, 85, 247, 0.04), transparent 45%), radial-gradient(circle at 50% 85%, rgba(16, 185, 129, 0.03), transparent 55%)' }}></div>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-15" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

      {/* Navigation HUD Header */}
      <Header
        activeTab={activeTab as any}
        onSelectTab={(tab) => {
          if (tab === 'ACCOUNTS') {
            setIsAccountManagerOpen(true);
          } else if (tab === 'SETTINGS') {
            setIsBackupModalOpen(true);
          } else if (tab === 'ADMIN') {
            if (isUserAdmin(currentUser)) {
              setActiveTab('ADMIN');
            } else {
              setIsLoginModalOpen(true);
            }
          } else {
            setActiveTab(tab as any);
          }
        }}
        account={activeAccount}
        tradesToday={metrics.tradesToday}
        maxDailyTrades={activeAccount.maxDailyTrades}
        overallScore={metrics.performanceScores.overallTradingScore}
        lastSavedTime={lastSavedTime}
        isDemoMode={isDemoMode}
        onOpenNewTrade={() => setIsEntryModalOpen(true)}
        onOpenAccountManager={() => setIsAccountManagerOpen(true)}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={() => {
          logoutUser();
          try {
            localStorage.removeItem('primepipfx_demo_mode');
          } catch {}
          setCurrentUser(null);
          setIsDemoMode(false);
          setActiveAccount(null);
          setAccounts([]);
          setTrades([]);
          setRules([]);
          setGoals([]);
        }}
        onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        onOpenAdmin={() => {
          if (currentUser?.role === 'ADMIN' || currentUser?.role === 'DEVELOPER' || currentUser?.isDeveloper) {
            setActiveTab('ADMIN');
          } else {
            setIsLoginModalOpen(true);
          }
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenTraderProfile={() => setIsTraderProfileOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAppearance={() => setIsAppearanceOpen(true)}
        onOpenEvolution={() => setActiveTab('EVOLUTION')}
        onOpenAllCategories={() => setIsAllCategoriesOpen(true)}
      />

      {/* Demo Mode Notification HUD */}
      {isDemoMode && (
        <div className="bg-blue-500/10 border-b border-blue-500/30 px-4 py-2.5 text-center text-xs font-mono-code text-amber-300 flex items-center justify-center gap-3 flex-wrap shadow-inner">
          <span className="font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            EXPLORING IN DEMO / PREVIEW MODE (READ-ONLY)
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 text-[11px]">
            To connect live accounts and log permanent executions, activate your account on Developer WhatsApp: <strong className="text-amber-300">03406671495</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3 py-1 bg-blue-500 hover:bg-cyan-400 text-slate-950 font-bold font-military rounded-lg text-[10px] tracking-wider uppercase transition cursor-pointer"
            >
              LOGIN
            </button>
            <button
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="px-3 py-1 bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold font-military rounded-lg text-[10px] tracking-wider uppercase transition cursor-pointer border border-blue-500/40"
            >
              SUBSCRIBE ($40-$50)
            </button>
          </div>
        </div>
      )}

      {/* Warning / Advisory Alert Toast */}
      {demoToast && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 max-w-md bg-slate-900/95 border border-amber-500/40 p-4 shadow-2xl rounded-xl text-xs font-mono-code text-slate-200 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 backdrop-blur-md">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-bold font-military text-amber-400 text-xs tracking-wider flex items-center gap-1.5">
                <span>SYSTEM WARNING</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <button
                onClick={() => setDemoToast(null)}
                className="text-slate-400 hover:text-slate-200 transition p-0.5 rounded cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">{demoToast}</p>
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setDemoToast(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic pro-level command atmosphere inspired by the supplied interface references */}
      <CommandCenterAtmosphere account={activeAccount} metrics={metrics} currentUser={currentUser} activeTab={activeTab} />

      {/* Main Content Area */}
      <main ref={mainContainerRef} className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-6 pt-1 sm:pt-3 pb-32 sm:pb-28 md:pb-10 overflow-x-hidden focus:outline-none">
        {activeTab === 'DASHBOARD' && (
          <MainDashboard
            metrics={metrics}
            account={activeAccount}
            trades={trades}
            currentUser={currentUser}
            onOpenNewTrade={() => setIsEntryModalOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
            onOpenAccountModal={() => setIsLoginModalOpen(true)}
            onOpenTraderProfile={() => setIsTraderProfileOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenEvolution={() => setActiveTab('EVOLUTION')}
          />
        )}

        {activeTab === 'PRE_TRADE_PLAN' && (
          <PreTradePlan
            account={activeAccount}
            rules={rules}
            trades={trades}
            onSaveTrade={handleSaveTrade}
            onNavigateToJournal={() => setActiveTab('JOURNAL')}
            onNavigateToLotSize={() => setActiveTab('LOT_SIZE')}
            onNavigateToCalendar={() => setActiveTab('FUNDAMENTAL_CALENDAR')}
          />
        )}

        {activeTab === 'SBT_MODELS' && (
          <SbtModelsHub />
        )}

        {activeTab === 'FUNDAMENTAL_CALENDAR' && (
          <FundamentalCalendar />
        )}

        {activeTab === 'FUNDAMENTAL_INDICATORS' && (
          <FundamentalIndicators />
        )}

        {activeTab === 'FREEHAND_WORKSPACE' && (
          <FreehandWorkspace userKey={currentUser?.id || currentUser?.email || 'guest'} />
        )}

        {activeTab === 'COMMUNITY' && (
          <CommunityChat
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'BOOK_SESSION' && (
          <BookSessionView
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'JOURNAL' && (
          <TradeJournal
            trades={trades}
            onOpenNewTrade={() => setIsEntryModalOpen(true)}
            onDeleteTrade={handleDeleteTrade}
            onUpdateTrade={handleUpdateTrade}
            currency={activeAccount?.currency || 'USD'}
          />
        )}

        {activeTab === 'LOT_SIZE' && (
          <LotSizeCalculator
            accountBalance={activeAccount?.currentBalance ?? 0}
            currency={activeAccount?.currency || 'USD'}
          />
        )}

        {activeTab === 'ADMIN' && (
          <DeveloperAdminPanel
            currentUser={currentUser || undefined}
            onClose={() => setActiveTab('DASHBOARD')}
            onUserUpdated={() => {
              verifyCurrentSession().then((u) => {
                if (u) setCurrentUser(u);
              });
            }}
          />
        )}

        {activeTab === 'PERFORMANCE' && (
          <PerformanceLab
            trades={trades}
            account={activeAccount}
            onOpenNewTrade={() => setIsEntryModalOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'RESEARCH' && (
          <TradingResearchCenter />
        )}

        {activeTab === 'SIGNALS' && (
          <PremiumSignalsHub
            isAdmin={isUserAdmin(currentUser)}
            onSelectSignalForTrade={(signal) => {
              setPrefilledTradeData({
                instrument: signal.pair.replace('/', ''),
                type: signal.direction,
                entryPrice: signal.entryPrice,
                stopLoss: signal.stopLoss,
                takeProfit: signal.takeProfit1,
                riskAmount: ((activeAccount?.currentBalance || 10000) * (signal.recommendedRiskPercent || 1.0)) / 100,
                notes: `Signal: ${signal.strategyNotes}`,
              });
              setIsEntryModalOpen(true);
            }}
          />
        )}

        {(activeTab === 'DAILY_DEV' || activeTab === 'IMPROVEMENT' || activeTab === 'BACKTESTING') && (
          <PersonalImprovementHub
            account={activeAccount}
            trades={trades}
            metrics={metrics}
            onOpenNewTrade={() => setIsEntryModalOpen(true)}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'COMPOUNDING' && (
          <CompoundingEngine
            account={activeAccount}
            trades={trades}
          />
        )}

        {activeTab === 'REPORTS' && (
          <PerformanceLab
            trades={trades}
            account={activeAccount}
            onOpenNewTrade={() => setIsEntryModalOpen(true)}
          />
        )}

        {activeTab === 'PSYCHOLOGY' && (
          <PsychologyCenter
            trades={trades}
            account={activeAccount}
            currentUser={currentUser}
            onUpdateTrade={handleSaveTrade}
            onOpenNewTrade={() => setIsEntryModalOpen(true)}
            onClose={() => setActiveTab('DASHBOARD')}
          />
        )}

        {activeTab === 'CALMING_TOOLS' && (
          <CalmingSuiteMaster
            trades={trades}
            userId={currentUser?.id}
            onNavigateToTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'RISK' && (
          <RiskCenter
            account={activeAccount}
            onUpdateAccount={handleUpdateAccount}
            rules={rules}
            onToggleRule={handleToggleRule}
            onAddRule={handleAddRule}
            onSaveRule={handleSaveRule}
            onDeleteRule={handleDeleteRule}
            metrics={metrics}
            trades={trades}
            defaultInstrument={selectedInstrument}
            onInstrumentChange={setSelectedInstrument}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'STRATEGIES' && (
          <AiTradingCoach trades={trades} account={activeAccount} />
        )}

        {activeTab === 'AI_COACH' && (
          <AiTradingCoach trades={trades} account={activeAccount} />
        )}

        {activeTab === 'GOALS' && (
          <GoalsProgress
            goals={goals}
            onToggleGoal={handleToggleGoal}
            onAddGoal={handleAddGoal}
            onDeleteGoal={handleDeleteGoal}
            trades={trades}
          />
        )}

        {(activeTab === 'SUBSCRIPTION' || activeTab === 'REFERRALS') && (
          <SubscriptionPage
            currentUser={currentUser}
            onClose={() => setActiveTab('DASHBOARD')}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onContinueDemo={handleEnterDemoMode}
          />
        )}

        {activeTab === 'EVOLUTION' && (
          <EvolutionCommandCenter
            currentUser={currentUser || undefined}
            onClose={() => setActiveTab('DASHBOARD')}
          />
        )}
        {/* Secondary Bottom Process Goal Link */}
        {activeTab !== 'GOALS' && (
          <div className="border-t border-slate-800/80 bg-slate-950/60 py-3 px-6 text-center text-xs font-mono-code text-slate-400 mt-6 mb-4">
            <span>PROCESS OVER OUTCOME • </span>
            <button
              onClick={() => setActiveTab('GOALS')}
              className="text-cyan-400 hover:underline font-bold cursor-pointer"
            >
              VIEW PROCESS DISCIPLINE GOALS ({goals.filter((g) => g.isCompleted).length}/{goals.length} ACTIVE)
            </button>
          </div>
        )}

        <AppFooter />
      </main>

      {/* Native Mobile Bottom App Bar (Sticky Thumb Navigation for Modern Phones) */}
      {isNotificationsOpen && (
        <NotificationsPanel
          onClose={() => setIsNotificationsOpen(false)}
          onNavigate={(link) => {
            if (link === "/community") setActiveTab("COMMUNITY");
            else if (link === "/trade") setActiveTab("DASHBOARD");
            else console.log("Navigate to", link);
          }}
        />
      )}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenNewTrade={() => setIsEntryModalOpen(true)}
        currentUser={currentUser}
        onOpenEvolution={() => setActiveTab('EVOLUTION')}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenAllCategories={() => setIsAllCategoriesOpen(true)}
      />

      {/* All 21 Categories Directory Modal */}
      <AllCategoriesModal
        isOpen={isAllCategoriesOpen}
        onClose={() => setIsAllCategoriesOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsAllCategoriesOpen(false);
        }}
        currentUser={currentUser}
      />

      <AppearanceControls isOpen={isAppearanceOpen} onClose={() => setIsAppearanceOpen(false)} />

      {/* Trade Entry Modal */}
      {isEntryModalOpen && (
        <TradeEntryModal
          isOpen={isEntryModalOpen}
          onClose={() => {
            setIsEntryModalOpen(false);
            setPrefilledTradeData(null);
          }}
          onSaveTrade={handleSaveTrade}
          rules={rules}
          account={activeAccount}
          tradeCount={trades.length}
          existingTrades={trades}
          initialInstrument={selectedInstrument}
          onInstrumentChange={setSelectedInstrument}
          onOpenPreTradePlan={() => {
            setIsEntryModalOpen(false);
            setPrefilledTradeData(null);
            setActiveTab('PRE_TRADE_PLAN');
          }}
          onOpenAiScanner={() => {
            setIsChartScannerOpen(true);
          }}
          prefilledTradeData={prefilledTradeData}
        />
      )}

      {/* AI Chart Scanner Modal */}
      {isChartScannerOpen && (
        <AiChartScannerModal
          isOpen={isChartScannerOpen}
          onClose={() => setIsChartScannerOpen(false)}
          account={activeAccount}
          onTradeScanned={(scannedData) => {
            setPrefilledTradeData(scannedData);
            setIsChartScannerOpen(false);
            setIsEntryModalOpen(true);
          }}
        />
      )}

      {/* Account Manager Modal */}
      {isAccountManagerOpen && (
        <AccountManagerModal
          isOpen={isAccountManagerOpen}
          onClose={() => setIsAccountManagerOpen(false)}
          accounts={accounts}
          activeAccount={activeAccount}
          onSelectAccount={handleSelectAccount}
          onCreateAccount={handleAccountCreated}
          onUpdateAccount={handleUpdateAccount}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {/* Data Backup & Restore Modal */}
      {isBackupModalOpen && (
        <DataBackupModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
          onDataRestored={initApp}
          accountsCount={accounts.length}
          tradesCount={trades.length}
          activeAccount={activeAccount}
          trades={trades}
        />
      )}

      {/* Account Onboarding Modal (if triggered manually) */}
      {isOnboardingOpen && (
        <AccountOnboardingModal
          onAccountCreated={handleAccountCreated}
          onExploreDemo={handleEnterDemoMode}
        />
      )}

      {/* User Login Modal */}
      {isLoginModalOpen && (
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            setIsDemoMode(false);
            setIsLoginModalOpen(false);
            if (isUserAdmin(user)) {
              setActiveTab('ADMIN');
            }
          }}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsDemoMode(false);
            setIsLoginModalOpen(false);
            if (isUserAdmin(user)) {
              setActiveTab('ADMIN');
            }
          }}
          onOpenSubscription={() => {
            setIsLoginModalOpen(false);
            setIsSubscriptionModalOpen(true);
          }}
          onContinueDemo={handleEnterDemoMode}
        />
      )}

      {/* Subscription Pricing & Referral Modal */}
      {isSubscriptionModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
            <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-y-auto p-4 sm:p-6 animate-in zoom-in-95 duration-150">
              <SubscriptionPage
                currentUser={currentUser}
                onClose={() => setIsSubscriptionModalOpen(false)}
                onOpenLogin={() => {
                  setIsSubscriptionModalOpen(false);
                  setIsLoginModalOpen(true);
                }}
                onContinueDemo={handleEnterDemoMode}
              />
            </div>
          </div>,
          document.body
        )}

      {/* Subscription Gate Guard: Blocks expired, suspended, or unpaid non-developer accounts */}
      {currentUser &&
        currentUser.role !== 'DEVELOPER' &&
        (currentUser.subscriptionStatus === 'EXPIRED' ||
          currentUser.subscriptionStatus === 'SUSPENDED' ||
          currentUser.subscriptionStatus === 'PAYMENT_REQUIRED') && (
          <SubscriptionGateModal
            user={currentUser}
            isOpen={true}
            onClose={() => handleEnterDemoMode()}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
            onContinueDemo={handleEnterDemoMode}
            onUpgradeSuccess={(upgradedUser) => {
              setCurrentUser(upgradedUser);
            }}
          />
        )}

      {/* Automated Trade Limit & Loss Alert System */}
      <TradeLimitAlertSystem
        account={activeAccount}
        metrics={metrics}
        trades={trades}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />

      {/* User Profile & Identity Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onUpdateUser={(updated) => {
          setCurrentUser(updated);
        }}
        onStartWalkthrough={() => setIsStudentOnboardingOpen(true)}
      />

      {/* Student Guided Walkthrough / Onboarding Modal */}
      {currentUser && (
        <OnboardingModal
          isOpen={isStudentOnboardingOpen}
          user={currentUser}
          onClose={() => setIsStudentOnboardingOpen(false)}
          onComplete={(updated) => {
            setCurrentUser(updated);
            setIsStudentOnboardingOpen(false);
          }}
        />
      )}

      {/* Trader Experience Profile Modal */}
      {isTraderProfileOpen && (
        <TraderExperienceProfileModal
          currentUser={currentUser || undefined}
          onClose={() => setIsTraderProfileOpen(false)}
        />
      )}

    </div>
  );
}
