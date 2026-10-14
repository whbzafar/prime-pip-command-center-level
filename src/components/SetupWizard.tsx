import React, { useState, useMemo } from 'react';
import {
  Shield,
  Target,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Info,
  Building2,
  DollarSign,
  Compass,
  Calendar,
  Lock,
  Zap,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  Eye,
  Sliders,
  Award,
} from 'lucide-react';
import {
  AccountPhase,
  DrawdownType,
  DailyLossBasis,
  RulesConfig,
} from '../riskEngine';
import { AccountSettings, AccountKind } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';

export interface SetupWizardProps {
  onAccountCreated: (account: AccountSettings) => void;
  onCancel?: () => void;
  existingAccountsCount?: number;
}

export interface PresetTemplate {
  id: string;
  name: string;
  badge: string;
  description: string;
  config: Partial<RulesConfig>;
  exampleNotice: string;
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: 'generic_2step_5_10',
    name: 'Generic 2-Step (5% Daily / 10% Overall)',
    badge: 'Popular Prop Evaluation',
    description: 'Standard 2-phase evaluation with 5% balance-based daily loss and 10% static drawdown floor.',
    config: {
      accountName: '2-Step 100K Evaluation',
      startingBalance: 100000,
      currency: 'USD',
      phase: 'Phase 1',
      profitTargetValue: 8,
      profitTargetType: 'PERCENT',
      minimumTradingDays: 4,
      dailyLossValue: 5,
      dailyLossType: 'PERCENT',
      dailyLossBasis: 'BALANCE_BASED',
      dailyResetTime: '00:00',
      dailyResetTimezone: 'UTC',
      maxDrawdownValue: 10,
      maxDrawdownType: 'STATIC',
      lockFloorAtStartBalanceOnceInProfit: false,
      consistencyRuleEnabled: false,
      maxProfitSharePercentFromSingleDay: 30,
      maxTradesPerDay: 5,
      maxLots: 10,
      newsTradingRestricted: false,
      weekendHoldingRestricted: false,
      personalDailyLossValue: 2.5,
      personalDailyLossType: 'PERCENT',
      personalOverallDrawdownValue: 5.0,
      personalOverallDrawdownType: 'PERCENT',
      maxRiskPerTradePercent: 0.5,
      maxTotalOpenRiskPercent: 1.5,
    },
    exampleNotice: 'Example only. Verify against your firm\'s current rules.',
  },
  {
    id: 'generic_1step_4_6',
    name: 'Generic 1-Step (4% Daily / 6% Overall Trailing)',
    badge: '1-Step Rapid Challenge',
    description: 'Single-phase challenge with tighter 4% equity daily limit and 6% intraday trailing drawdown floor.',
    config: {
      accountName: '1-Step 50K Express',
      startingBalance: 50000,
      currency: 'USD',
      phase: 'Phase 1',
      profitTargetValue: 10,
      profitTargetType: 'PERCENT',
      minimumTradingDays: 3,
      dailyLossValue: 4,
      dailyLossType: 'PERCENT',
      dailyLossBasis: 'EQUITY_BASED',
      dailyResetTime: '17:00',
      dailyResetTimezone: 'America/New_York',
      maxDrawdownValue: 6,
      maxDrawdownType: 'INTRADAY_TRAILING',
      lockFloorAtStartBalanceOnceInProfit: true,
      consistencyRuleEnabled: true,
      maxProfitSharePercentFromSingleDay: 30,
      maxTradesPerDay: 4,
      maxLots: 5,
      newsTradingRestricted: true,
      weekendHoldingRestricted: true,
      personalDailyLossValue: 2.0,
      personalDailyLossType: 'PERCENT',
      personalOverallDrawdownValue: 3.0,
      personalOverallDrawdownType: 'PERCENT',
      maxRiskPerTradePercent: 0.5,
      maxTotalOpenRiskPercent: 1.0,
    },
    exampleNotice: 'Example only. Verify against your firm\'s current rules.',
  },
  {
    id: 'futures_style_eod',
    name: 'Futures-Style EOD Trailing (Locks at Starting Balance)',
    badge: 'Futures / EOD Trailing',
    description: 'Calculates overall floor trailing your end-of-day balance, locking permanently at starting balance once in profit.',
    config: {
      accountName: 'Futures EOD 50K Combine',
      startingBalance: 50000,
      currency: 'USD',
      phase: 'Phase 1',
      profitTargetValue: 6,
      profitTargetType: 'PERCENT',
      minimumTradingDays: 5,
      dailyLossValue: 3,
      dailyLossType: 'PERCENT',
      dailyLossBasis: 'BALANCE_BASED',
      dailyResetTime: '16:00',
      dailyResetTimezone: 'America/Chicago',
      maxDrawdownValue: 5,
      maxDrawdownType: 'EOD_TRAILING',
      lockFloorAtStartBalanceOnceInProfit: true,
      consistencyRuleEnabled: true,
      maxProfitSharePercentFromSingleDay: 30,
      maxTradesPerDay: 4,
      maxLots: 5,
      newsTradingRestricted: false,
      weekendHoldingRestricted: true,
      personalDailyLossValue: 1.5,
      personalDailyLossType: 'PERCENT',
      personalOverallDrawdownValue: 2.5,
      personalOverallDrawdownType: 'PERCENT',
      maxRiskPerTradePercent: 0.5,
      maxTotalOpenRiskPercent: 1.25,
    },
    exampleNotice: 'Example only. Verify against your firm\'s current rules.',
  },
];

export const SetupWizard: React.FC<SetupWizardProps> = ({
  onAccountCreated,
  onCancel,
  existingAccountsCount = 0,
}) => {
  // Current Wizard Step: 1 through 7
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // --------------------------------------------------------------------------
  // STEP 1: BASICS
  // --------------------------------------------------------------------------
  const [accountName, setAccountName] = useState(`Account ${existingAccountsCount + 1}`);
  const [currency, setCurrency] = useState('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [startingBalance, setStartingBalance] = useState<number>(100000);
  const [phase, setPhase] = useState<AccountPhase>('Phase 1');

  // --------------------------------------------------------------------------
  // STEP 2: TARGETS
  // --------------------------------------------------------------------------
  const [profitTargetValue, setProfitTargetValue] = useState<number>(8);
  const [profitTargetType, setProfitTargetType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [minimumTradingDays, setMinimumTradingDays] = useState<number>(4);
  const [hasTimeLimit, setHasTimeLimit] = useState<boolean>(false);
  const [timeLimitDays, setTimeLimitDays] = useState<number>(30);

  // --------------------------------------------------------------------------
  // STEP 3: DAILY LOSS LIMIT
  // --------------------------------------------------------------------------
  const [dailyLossValue, setDailyLossValue] = useState<number>(5);
  const [dailyLossType, setDailyLossType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [dailyLossBasis, setDailyLossBasis] = useState<DailyLossBasis>('BALANCE_BASED');
  const [dailyResetTime, setDailyResetTime] = useState<string>('00:00');
  const [dailyResetTimezone, setDailyResetTimezone] = useState<string>('UTC');

  // --------------------------------------------------------------------------
  // STEP 4: MAX DRAWDOWN
  // --------------------------------------------------------------------------
  const [maxDrawdownValue, setMaxDrawdownValue] = useState<number>(10);
  const [maxDrawdownType, setMaxDrawdownType] = useState<DrawdownType>('STATIC');
  const [lockFloorAtStartBalanceOnceInProfit, setLockFloorAtStartBalanceOnceInProfit] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // STEP 5: CONSISTENCY RULE
  // --------------------------------------------------------------------------
  const [consistencyRuleEnabled, setConsistencyRuleEnabled] = useState<boolean>(false);
  const [maxProfitSharePercentFromSingleDay, setMaxProfitSharePercentFromSingleDay] = useState<number>(30);

  // --------------------------------------------------------------------------
  // STEP 6: OTHER RESTRICTIONS
  // --------------------------------------------------------------------------
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(5);
  const [maxLots, setMaxLots] = useState<number>(10);
  const [newsTradingRestricted, setNewsTradingRestricted] = useState<boolean>(false);
  const [weekendHoldingRestricted, setWeekendHoldingRestricted] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // STEP 7: PERSONAL SAFETY BUFFER
  // Defaults to 50% of the firm's limits, plus max risk per trade 0.5% & max open risk
  // --------------------------------------------------------------------------
  const [personalDailyLossValue, setPersonalDailyLossValue] = useState<number>(2.5);
  const [personalDailyLossType, setPersonalDailyLossType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [personalOverallDrawdownValue, setPersonalOverallDrawdownValue] = useState<number>(5.0);
  const [personalOverallDrawdownType, setPersonalOverallDrawdownType] = useState<'PERCENT' | 'DOLLARS'>('PERCENT');
  const [maxRiskPerTradePercent, setMaxRiskPerTradePercent] = useState<number>(0.5);
  const [maxTotalOpenRiskPercent, setMaxTotalOpenRiskPercent] = useState<number>(1.5);
  const [userAutoBufferSync, setUserAutoBufferSync] = useState<boolean>(true);

  // Auto-synchronize personal buffers when firm limits change (unless user customized them)
  const syncPersonalBuffersFromFirm = (
    newDailyVal: number,
    newDailyType: 'PERCENT' | 'DOLLARS',
    newOverallVal: number,
    newOverallType: 'PERCENT' | 'DOLLARS'
  ) => {
    if (userAutoBufferSync) {
      setPersonalDailyLossValue(Number((newDailyVal * 0.5).toFixed(2)));
      setPersonalDailyLossType(newDailyType);
      setPersonalOverallDrawdownValue(Number((newOverallVal * 0.5).toFixed(2)));
      setPersonalOverallDrawdownType(newOverallType);
    }
  };

  // Preset Template Loader
  const handleApplyPreset = (preset: PresetTemplate) => {
    setActivePresetId(preset.id);
    const cfg = preset.config;
    if (cfg.accountName) setAccountName(cfg.accountName);
    if (cfg.startingBalance) setStartingBalance(cfg.startingBalance);
    if (cfg.currency) setCurrency(cfg.currency);
    if (cfg.phase) setPhase(cfg.phase);
    if (cfg.profitTargetValue !== undefined) setProfitTargetValue(cfg.profitTargetValue);
    if (cfg.profitTargetType) setProfitTargetType(cfg.profitTargetType);
    if (cfg.minimumTradingDays !== undefined) setMinimumTradingDays(cfg.minimumTradingDays);
    if (cfg.timeLimitDays !== undefined) {
      setHasTimeLimit(true);
      setTimeLimitDays(cfg.timeLimitDays);
    } else {
      setHasTimeLimit(false);
    }
    if (cfg.dailyLossValue !== undefined) setDailyLossValue(cfg.dailyLossValue);
    if (cfg.dailyLossType) setDailyLossType(cfg.dailyLossType);
    if (cfg.dailyLossBasis) setDailyLossBasis(cfg.dailyLossBasis);
    if (cfg.dailyResetTime) setDailyResetTime(cfg.dailyResetTime);
    if (cfg.dailyResetTimezone) setDailyResetTimezone(cfg.dailyResetTimezone);
    if (cfg.maxDrawdownValue !== undefined) setMaxDrawdownValue(cfg.maxDrawdownValue);
    if (cfg.maxDrawdownType) setMaxDrawdownType(cfg.maxDrawdownType);
    if (cfg.lockFloorAtStartBalanceOnceInProfit !== undefined) {
      setLockFloorAtStartBalanceOnceInProfit(cfg.lockFloorAtStartBalanceOnceInProfit);
    }
    if (cfg.consistencyRuleEnabled !== undefined) {
      setConsistencyRuleEnabled(cfg.consistencyRuleEnabled);
    }
    if (cfg.maxProfitSharePercentFromSingleDay !== undefined) {
      setMaxProfitSharePercentFromSingleDay(cfg.maxProfitSharePercentFromSingleDay);
    }
    if (cfg.maxTradesPerDay !== undefined) setMaxTradesPerDay(cfg.maxTradesPerDay);
    if (cfg.maxLots !== undefined) setMaxLots(cfg.maxLots);
    if (cfg.newsTradingRestricted !== undefined) setNewsTradingRestricted(cfg.newsTradingRestricted);
    if (cfg.weekendHoldingRestricted !== undefined) setWeekendHoldingRestricted(cfg.weekendHoldingRestricted);
    if (cfg.personalDailyLossValue !== undefined) setPersonalDailyLossValue(cfg.personalDailyLossValue);
    if (cfg.personalDailyLossType) setPersonalDailyLossType(cfg.personalDailyLossType);
    if (cfg.personalOverallDrawdownValue !== undefined) setPersonalOverallDrawdownValue(cfg.personalOverallDrawdownValue);
    if (cfg.personalOverallDrawdownType) setPersonalOverallDrawdownType(cfg.personalOverallDrawdownType);
    if (cfg.maxRiskPerTradePercent !== undefined) setMaxRiskPerTradePercent(cfg.maxRiskPerTradePercent);
    if (cfg.maxTotalOpenRiskPercent !== undefined) setMaxTotalOpenRiskPercent(cfg.maxTotalOpenRiskPercent);
  };

  // Formatted active currency symbol / code
  const effectiveCurrency = currency === 'Custom' ? (customCurrency.trim().toUpperCase() || 'USD') : currency;
  const isCent = effectiveCurrency === 'USC' || effectiveCurrency === 'Cent';

  // --------------------------------------------------------------------------
  // INPUT VALIDATION PER STEP
  // --------------------------------------------------------------------------
  const validateStep = (step: number): boolean => {
    setValidationError(null);

    if (step === 1) {
      if (!accountName.trim()) {
        setValidationError('Please provide a name for this trading account.');
        return false;
      }
      if (isNaN(startingBalance) || startingBalance <= 0) {
        setValidationError('Starting balance must be a positive number greater than 0.');
        return false;
      }
      if (currency === 'Custom' && !customCurrency.trim()) {
        setValidationError('Please specify your custom currency code (e.g. AUD, CAD, CHF).');
        return false;
      }
    } else if (step === 2) {
      if (isNaN(profitTargetValue) || profitTargetValue <= 0) {
        setValidationError('Profit target must be greater than zero.');
        return false;
      }
      if (minimumTradingDays < 0) {
        setValidationError('Minimum trading days cannot be negative.');
        return false;
      }
      if (hasTimeLimit && timeLimitDays <= 0) {
        setValidationError('Time limit days must be at least 1 day.');
        return false;
      }
    } else if (step === 3) {
      if (isNaN(dailyLossValue) || dailyLossValue <= 0) {
        setValidationError('Daily loss limit must be greater than zero.');
        return false;
      }
      if (dailyLossType === 'PERCENT' && dailyLossValue >= 50) {
        setValidationError('Daily loss percent should be reasonably under 50% to prevent full account liquidation.');
        return false;
      }
    } else if (step === 4) {
      if (isNaN(maxDrawdownValue) || maxDrawdownValue <= 0) {
        setValidationError('Maximum drawdown must be greater than zero.');
        return false;
      }
      if (maxDrawdownValue >= 100 && dailyLossType === 'PERCENT') {
        setValidationError('Drawdown percent cannot reach or exceed 100%.');
        return false;
      }
    } else if (step === 5) {
      if (consistencyRuleEnabled) {
        if (maxProfitSharePercentFromSingleDay <= 0 || maxProfitSharePercentFromSingleDay > 100) {
          setValidationError('Consistency rule percentage must be between 1% and 100% (default is 30%).');
          return false;
        }
      }
    } else if (step === 6) {
      if (maxTradesPerDay <= 0) {
        setValidationError('Max trades per day must be at least 1.');
        return false;
      }
      if (maxLots <= 0) {
        setValidationError('Max lot size limit must be greater than 0.');
        return false;
      }
    } else if (step === 7) {
      if (personalDailyLossValue <= 0) {
        setValidationError('Personal daily loss buffer must be greater than 0.');
        return false;
      }
      if (personalOverallDrawdownValue <= 0) {
        setValidationError('Personal overall drawdown buffer must be greater than 0.');
        return false;
      }
      if (maxRiskPerTradePercent <= 0 || maxRiskPerTradePercent > 10) {
        setValidationError('Max risk per trade should be between 0.05% and 10% (standard default is 0.5%).');
        return false;
      }
      if (maxTotalOpenRiskPercent <= 0) {
        setValidationError('Max total open risk must be greater than 0.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(8, prev + 1));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // --------------------------------------------------------------------------
  // ASSEMBLE RULES CONFIG & CREATE ACCOUNT
  // --------------------------------------------------------------------------
  const compiledRulesConfig = useMemo<RulesConfig>(() => {
    return {
      accountName: accountName.trim(),
      currency: effectiveCurrency,
      startingBalance,
      phase,
      profitTargetValue,
      profitTargetType,
      minimumTradingDays,
      timeLimitDays: hasTimeLimit ? timeLimitDays : undefined,
      dailyLossValue,
      dailyLossType,
      dailyLossBasis,
      dailyResetTime,
      dailyResetTimezone,
      maxDrawdownValue,
      maxDrawdownType,
      lockFloorAtStartBalanceOnceInProfit,
      consistencyRuleEnabled,
      maxProfitSharePercentFromSingleDay,
      maxTradesPerDay,
      maxLots,
      newsTradingRestricted,
      weekendHoldingRestricted,
      personalDailyLossValue,
      personalDailyLossType,
      personalOverallDrawdownValue,
      personalOverallDrawdownType,
      maxRiskPerTradePercent,
      maxTotalOpenRiskPercent,
    };
  }, [
    accountName,
    effectiveCurrency,
    startingBalance,
    phase,
    profitTargetValue,
    profitTargetType,
    minimumTradingDays,
    hasTimeLimit,
    timeLimitDays,
    dailyLossValue,
    dailyLossType,
    dailyLossBasis,
    dailyResetTime,
    dailyResetTimezone,
    maxDrawdownValue,
    maxDrawdownType,
    lockFloorAtStartBalanceOnceInProfit,
    consistencyRuleEnabled,
    maxProfitSharePercentFromSingleDay,
    maxTradesPerDay,
    maxLots,
    newsTradingRestricted,
    weekendHoldingRestricted,
    personalDailyLossValue,
    personalDailyLossType,
    personalOverallDrawdownValue,
    personalOverallDrawdownType,
    maxRiskPerTradePercent,
    maxTotalOpenRiskPercent,
  ]);

  const handleSaveAndActivate = () => {
    if (!validateStep(7)) return;

    const accountKind: AccountKind =
      isCent
        ? 'CENT'
        : phase === 'Personal'
        ? 'PERSONAL'
        : phase === 'Funded'
        ? 'FUNDED'
        : 'FUNDED';

    const newAccount: AccountSettings = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      traderName: 'PROP TRADER',
      accountName: accountName.trim(),
      accountType:
        isCent
          ? 'CENT_ACCOUNT'
          : phase === 'Funded'
          ? 'PROP_FIRM_FUNDED'
          : phase === 'Personal'
          ? 'PERSONAL_LIVE'
          : 'PROP_FIRM_EVALUATION',
      accountCategory: phase === 'Personal' ? 'PERSONAL' : 'FUNDED',
      accountKind,
      isCentAccount: isCent,
      initialBalance: startingBalance,
      currentBalance: startingBalance,
      currentEquity: startingBalance,
      broker: phase === 'Personal' ? 'Self-Directed / Broker' : 'Prop Firm',
      currency: effectiveCurrency,
      maxDailyLossPercent: dailyLossType === 'PERCENT' ? dailyLossValue : Number(((dailyLossValue / startingBalance) * 100).toFixed(2)),
      maxDrawdownPercent: maxDrawdownValue,
      maxDailyTrades: maxTradesPerDay,
      targetRiskPerTradePercent: maxRiskPerTradePercent,
      maxRiskPerTradePercent,
      isDemo: false,
      isManual: true,
      syncStatus: 'MANUAL',
      personalDrawdownBufferPercent: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rulesConfig: compiledRulesConfig,
      fundedConfig: {
        enabled: phase !== 'Personal',
        firmName: accountName,
        accountSize: startingBalance,
        phase: phase === 'Phase 1' ? 'PHASE_1' : phase === 'Phase 2' ? 'PHASE_2' : 'FUNDED_LIVE',
        startingBalance,
        profitTargets: {
          phase1TargetPercent: profitTargetType === 'PERCENT' ? profitTargetValue : Number(((profitTargetValue / startingBalance) * 100).toFixed(2)),
          phase1TargetDollars: profitTargetType === 'DOLLARS' ? profitTargetValue : Number(((startingBalance * profitTargetValue) / 100).toFixed(2)),
          phase2TargetPercent: 5,
          phase2TargetDollars: Number(((startingBalance * 5) / 100).toFixed(2)),
        },
        dailyDrawdownPercent: dailyLossType === 'PERCENT' ? dailyLossValue : Number(((dailyLossValue / startingBalance) * 100).toFixed(2)),
        dailyDrawdownDollars: dailyLossType === 'DOLLARS' ? dailyLossValue : Number(((startingBalance * dailyLossValue) / 100).toFixed(2)),
        overallDrawdownPercent: maxDrawdownValue,
        overallDrawdownDollars: Number(((startingBalance * maxDrawdownValue) / 100).toFixed(2)),
        drawdownType: maxDrawdownType === 'EOD_TRAILING' ? 'END_OF_DAY' : maxDrawdownType === 'INTRADAY_TRAILING' ? 'INTRADAY' : 'STATIC',
        trailingConfig: {
          trailingBasis: maxDrawdownType === 'EOD_TRAILING' ? 'END_OF_DAY_BALANCE' : 'EQUITY',
          lockAtStartingBalance: lockFloorAtStartBalanceOnceInProfit,
          unrealizedProfitAffectsTrailing: maxDrawdownType === 'INTRADAY_TRAILING',
        },
        preferredRiskPercent: maxRiskPerTradePercent,
        maxRiskPerTradePercent,
        riskMode: 'BALANCED',
        safetyBufferPercent: 50,
        minimumTradingDays,
        dailyResetTime: `${dailyResetTime} ${dailyResetTimezone}`,
        newsRestriction: newsTradingRestricted,
        weekendHoldingRestriction: weekendHoldingRestricted,
      },
    };

    onAccountCreated(newAccount);
  };

  // Step definitions
  const steps = [
    { num: 1, title: 'Basics' },
    { num: 2, title: 'Targets' },
    { num: 3, title: 'Daily Loss' },
    { num: 4, title: 'Drawdown' },
    { num: 5, title: 'Consistency' },
    { num: 6, title: 'Restrictions' },
    { num: 7, title: 'Safety Buffer' },
    { num: 8, title: 'Summary' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all text-slate-100 animate-in fade-in">
      {/* Top Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <span className="font-semibold text-cyan-400">Prime Pip FX Command Center</span>
            <span>·</span>
            <span>Trading Account Profile Wizard</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-0.5 flex items-center gap-2">
            <span>Trading Account Setup</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono">
              riskEngine v2.4
            </span>
          </h2>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200 transition px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Preset Quick Selection Bar */}
      <div className="px-6 py-3 bg-slate-950/90 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-200">Optional Presets:</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Load baseline rules. Everything remains fully editable.
          </span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {PRESET_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleApplyPreset(tmpl)}
              title={`${tmpl.name} — ${tmpl.exampleNotice}`}
              className={`px-3 py-1.5 rounded-lg border text-left text-[11px] font-medium transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activePresetId === tmpl.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
              }`}
            >
              <span>{tmpl.badge}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Example
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Preset Verification Disclaimer */}
      {activePresetId && (
        <div className="px-6 py-2 bg-amber-950/20 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-300">
              Preset Loaded: {PRESET_TEMPLATES.find((p) => p.id === activePresetId)?.name}
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-[11px] text-amber-200/90 font-medium italic">
              "Example only. Verify against your firm's current rules."
            </span>
          </div>
          <button
            onClick={() => setActivePresetId(null)}
            className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stepper Bar (1 - 8) */}
      <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {steps.map((st) => (
            <div key={st.num} className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (st.num < currentStep || validateStep(currentStep)) {
                    setCurrentStep(st.num);
                  }
                }}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition cursor-pointer ${
                  currentStep === st.num
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                    : currentStep > st.num
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {currentStep > st.num ? '✓' : st.num}
              </button>
              <span
                className={`hidden md:inline text-xs font-medium ${
                  currentStep === st.num ? 'text-slate-200 font-semibold' : 'text-slate-400'
                }`}
              >
                {st.title}
              </span>
              {st.num < 8 && <span className="text-slate-700 mx-0.5">·</span>}
            </div>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-sans shrink-0 pl-2">
          Step {currentStep} of 8
        </span>
      </div>

      {/* Body Content */}
      <div className="p-6">
        {validationError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-rose-200">Validation Notice</span>
              <span>{validationError}</span>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 1: BASICS
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">Step 1.</span> Basics & Account Identity
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure account name, base denomination currency, starting balance, and challenge phase.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Account Profile Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. FTMO 100K Phase 1, London Breakout Master"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Account Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="USC">USC (Cent Account ¢)</option>
                    <option value="Cent">Cent (¢)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="PKR">PKR (₨)</option>
                    <option value="Custom">Custom Currency</option>
                  </select>
                  {isCent && (
                    <p className="text-[11px] font-mono text-amber-300 mt-1">
                      🪙 1 USD = 100 Cents. Calculations will operate in Cents (¢).
                    </p>
                  )}
                </div>

                {currency === 'Custom' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Custom Currency Code
                    </label>
                    <input
                      type="text"
                      value={customCurrency}
                      onChange={(e) => setCustomCurrency(e.target.value)}
                      placeholder="e.g. AUD, CAD, JPY"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 uppercase"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Starting Balance ({effectiveCurrency})
                  </label>
                  <input
                    type="number"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(parseFloat(e.target.value) || 0)}
                    placeholder="100000"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Initial capital benchmark used for drawdown floor and targets.
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Account Phase
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(['Phase 1', 'Phase 2', 'Funded', 'Personal'] as AccountPhase[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPhase(p)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        phase === p
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold shadow-md shadow-cyan-500/10'
                          : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <span className="block text-xs">{p}</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {p === 'Phase 1'
                          ? 'Evaluation'
                          : p === 'Phase 2'
                          ? 'Verification'
                          : p === 'Funded'
                          ? 'Master / Live'
                          : 'Self-Directed'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: TARGETS
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">Step 2.</span> Profit Targets & Trading Days
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your profit milestone, minimum trading days requirement, and optional challenge expiration window.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Profit Target Basis
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setProfitTargetType('PERCENT')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        profitTargetType === 'PERCENT'
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfitTargetType('DOLLARS')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        profitTargetType === 'DOLLARS'
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Fixed Amount ({effectiveCurrency})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Profit Target Value {profitTargetType === 'PERCENT' ? '(%)' : `(${effectiveCurrency})`}
                  </label>
                  <input
                    type="number"
                    step={profitTargetType === 'PERCENT' ? '0.5' : '100'}
                    value={profitTargetValue}
                    onChange={(e) => setProfitTargetValue(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Equivalent target:{' '}
                    <strong className="text-emerald-400">
                      {profitTargetType === 'PERCENT'
                        ? formatCurrency((startingBalance * profitTargetValue) / 100, effectiveCurrency)
                        : `${profitTargetValue} ${effectiveCurrency} (${((profitTargetValue / startingBalance) * 100).toFixed(1)}%)`}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Minimum Trading Days
                  </label>
                  <input
                    type="number"
                    value={minimumTradingDays}
                    onChange={(e) => setMinimumTradingDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Number of unique active trading days required to pass (0 if none required).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Time Limit (Optional)
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={hasTimeLimit}
                        onChange={(e) => setHasTimeLimit(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span>Enforce maximum days time limit</span>
                    </label>
                    {hasTimeLimit && (
                      <input
                        type="number"
                        value={timeLimitDays}
                        onChange={(e) => setTimeLimitDays(parseInt(e.target.value, 10) || 30)}
                        placeholder="30 days"
                        className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 3: DAILY LOSS LIMIT
            ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">Step 3.</span> Daily Loss Limit & Session Reset
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your firm's daily loss limit, whether it measures from balance or equity (floating P/L), and exact server reset timing.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Daily Loss Basis Unit
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDailyLossType('PERCENT');
                        syncPersonalBuffersFromFirm(dailyLossValue, 'PERCENT', maxDrawdownValue, 'PERCENT');
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        dailyLossType === 'PERCENT'
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDailyLossType('DOLLARS');
                        syncPersonalBuffersFromFirm(dailyLossValue, 'DOLLARS', maxDrawdownValue, 'PERCENT');
                      }}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        dailyLossType === 'DOLLARS'
                          ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      Fixed Amount ({effectiveCurrency})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Daily Loss Limit Value {dailyLossType === 'PERCENT' ? '(%)' : `(${effectiveCurrency})`}
                  </label>
                  <input
                    type="number"
                    step={dailyLossType === 'PERCENT' ? '0.5' : '100'}
                    value={dailyLossValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setDailyLossValue(val);
                      syncPersonalBuffersFromFirm(val, dailyLossType, maxDrawdownValue, 'PERCENT');
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Calculated daily ceiling:{' '}
                    <strong className="text-rose-400">
                      {dailyLossType === 'PERCENT'
                        ? formatCurrency((startingBalance * dailyLossValue) / 100, effectiveCurrency)
                        : `${dailyLossValue} ${effectiveCurrency}`}
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Daily Loss Calculation Basis
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setDailyLossBasis('BALANCE_BASED')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      dailyLossBasis === 'BALANCE_BASED'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">Balance-Based</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Measures strictly against the closed balance at session reset. Floating profits and losses during the day are evaluated against that fixed baseline.
                    </p>
                  </div>

                  <div
                    onClick={() => setDailyLossBasis('EQUITY_BASED')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      dailyLossBasis === 'EQUITY_BASED'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">Equity-Based (Includes Floating)</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Includes open floating P/L. If floating trades draw down past the daily limit at any microsecond, the rule is flagged as breached.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Daily Reset Time (HH:MM 24hr)
                  </label>
                  <input
                    type="text"
                    value={dailyResetTime}
                    onChange={(e) => setDailyResetTime(e.target.value)}
                    placeholder="00:00 or 17:00"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    e.g. 00:00 for midnight UTC, or 17:00 for NY market close.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Reset Timezone (IANA)
                  </label>
                  <select
                    value={dailyResetTimezone}
                    onChange={(e) => setDailyResetTimezone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100"
                  >
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Prague">Europe/Prague (CE(S)T - FTMO)</option>
                    <option value="Asia/Karachi">Asia/Karachi (PKT UTC+5)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST UTC+4)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT UTC+8)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST UTC+9)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: MAX DRAWDOWN
            ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">Step 4.</span> Maximum Drawdown & Trailing Floor
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your overall liquidation boundary type and trailing lock behavior.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Max Drawdown Limit (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={maxDrawdownValue}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setMaxDrawdownValue(val);
                    syncPersonalBuffersFromFirm(dailyLossValue, dailyLossType, val, 'PERCENT');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Permitted overall loss allowance:{' '}
                  <strong className="text-rose-400 font-mono">
                    {formatCurrency((startingBalance * maxDrawdownValue) / 100, effectiveCurrency)}
                  </strong>{' '}
                  (Initial Floor:{' '}
                  <strong className="text-slate-200 font-mono">
                    {formatCurrency(startingBalance - (startingBalance * maxDrawdownValue) / 100, effectiveCurrency)}
                  </strong>
                  )
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Drawdown Floor Movement Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setMaxDrawdownType('STATIC')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      maxDrawdownType === 'STATIC'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">Static Drawdown</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Floor remains anchored at initial balance minus max DD throughout the entire life of the account. Profits never move the floor up.
                    </p>
                  </div>

                  <div
                    onClick={() => setMaxDrawdownType('EOD_TRAILING')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      maxDrawdownType === 'EOD_TRAILING'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">End-of-Day Trailing</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Floor trails up only after market close at daily reset, locked to the highest end-of-day balance. Intraday equity peaks are ignored.
                    </p>
                  </div>

                  <div
                    onClick={() => setMaxDrawdownType('INTRADAY_TRAILING')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      maxDrawdownType === 'INTRADAY_TRAILING'
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-xs text-slate-200">Intraday Trailing</div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Floor ratchets up in real time with high-water mark equity spikes. Ratchets upward and never moves down.
                    </p>
                  </div>
                </div>
              </div>

              {maxDrawdownType !== 'STATIC' && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockFloorAtStartBalanceOnceInProfit}
                      onChange={(e) => setLockFloorAtStartBalanceOnceInProfit(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <span className="font-semibold text-xs text-slate-200 block">
                        Trailing floor locks at starting balance once in profit
                      </span>
                      <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                        Once your balance reaches positive territory, the trailing floor stops rising once it reaches {formatCurrency(startingBalance, effectiveCurrency)}, giving you an expanding safety cushion.
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 5: CONSISTENCY RULE
            ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">Step 5.</span> Consistency Rule
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure single-day profit caps to prevent passing via a single oversized gamble trade.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consistencyRuleEnabled}
                    onChange={(e) => setConsistencyRuleEnabled(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-xs text-slate-200 block">
                      Enforce Consistency Rule
                    </span>
                    <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                      No single trading day may represent more than a specified percentage of total generated profit upon reaching the target.
                    </span>
                  </div>
                </label>

                {consistencyRuleEnabled && (
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Maximum % of Total Profit Allowed from a Single Day (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={maxProfitSharePercentFromSingleDay}
                        onChange={(e) => setMaxProfitSharePercentFromSingleDay(parseInt(e.target.value, 10) || 30)}
                        className="w-32 px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                      />
                      <span className="text-xs text-slate-400">
                        Default: <strong>30%</strong> (Firm limits usually range from 20% to 40%)
                      </span>
                    </div>
                    <p className="text-[11px] text-cyan-300/90 leading-relaxed">
                      💡 The risk engine will compute your live best-day share and show you the exact maximum profit still allowed today without breaching this consistency boundary.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 6: OTHER RESTRICTIONS
            ========================================================================= */}
        {currentStep === 6 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">Step 6.</span> Operational & News Restrictions
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure trade frequency limits, lot size caps, news trading rules, and weekend holding boundaries.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Max Allowed Trades Per Day
                  </label>
                  <input
                    type="number"
                    value={maxTradesPerDay}
                    onChange={(e) => setMaxTradesPerDay(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Execution ceiling per calendar session.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Max Total Open Lots Allowed
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={maxLots}
                    onChange={(e) => setMaxLots(parseFloat(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Total aggregated position volume ceiling.
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={newsTradingRestricted}
                    onChange={(e) => setNewsTradingRestricted(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">News Trading Restriction</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Prohibits opening or closing positions within ±5 minutes of red folder economic events.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-300 pt-3 border-t border-slate-800/80">
                  <input
                    type="checkbox"
                    checked={weekendHoldingRestricted}
                    onChange={(e) => setWeekendHoldingRestricted(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block">Weekend Holding Restriction</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      All positions must be closed before Friday market close (21:00 UTC).
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 7: PERSONAL SAFETY BUFFER
            ========================================================================= */}
        {currentStep === 7 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">Step 7.</span> Personal Safety Buffer
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Your self-imposed discipline boundaries. By default, set to 50% of the firm's limits so you get locked out safely before ever risking account liquidation.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs text-slate-200 uppercase tracking-wide">
                    Personal Lockout Protocol
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userAutoBufferSync}
                    onChange={(e) => {
                      setUserAutoBufferSync(e.target.checked);
                      if (e.target.checked) {
                        syncPersonalBuffersFromFirm(dailyLossValue, dailyLossType, maxDrawdownValue, 'PERCENT');
                      }
                    }}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Auto-calculate 50% buffer</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Personal Daily Loss Limit ({personalDailyLossType === 'PERCENT' ? '%' : effectiveCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={personalDailyLossValue}
                    onChange={(e) => {
                      setUserAutoBufferSync(false);
                      setPersonalDailyLossValue(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Firm daily ceiling is {dailyLossValue}{dailyLossType === 'PERCENT' ? '%' : ` ${effectiveCurrency}`}. Hitting this personal limit displays the red lockout banner: <em>"Stop trading for today."</em>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Personal Overall Drawdown Limit ({personalOverallDrawdownType === 'PERCENT' ? '%' : effectiveCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={personalOverallDrawdownValue}
                    onChange={(e) => {
                      setUserAutoBufferSync(false);
                      setPersonalOverallDrawdownValue(parseFloat(e.target.value) || 0);
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Firm max DD is {maxDrawdownValue}%. Leaves a 50% safety margin before breach.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Max Risk Per Trade (%)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={maxRiskPerTradePercent}
                    onChange={(e) => setMaxRiskPerTradePercent(parseFloat(e.target.value) || 0.5)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-emerald-400 mt-1 block">
                    Default 0.5% (${formatCurrency((startingBalance * maxRiskPerTradePercent) / 100, effectiveCurrency)}) ensures ~10 consecutive losses required to hit personal daily stop.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Max Total Open Risk (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={maxTotalOpenRiskPercent}
                    onChange={(e) => setMaxTotalOpenRiskPercent(parseFloat(e.target.value) || 1.5)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Combined open risk cap across all concurrent positions.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 8: PLAIN-ENGLISH SUMMARY & VERIFICATION
            ========================================================================= */}
        {currentStep === 8 && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span className="text-emerald-400">Step 8.</span> Plain-English Rules Summary
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Carefully review the plain-English summary below. Verify that every parameter matches your firm's rules before activating this account profile.
              </p>
            </div>

            {/* Plain English Summary Card */}
            <div className="p-5 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-4 text-xs leading-relaxed text-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-sm font-bold text-white block">{accountName}</span>
                  <span className="text-slate-400 text-[11px]">
                    Phase: <strong className="text-cyan-400">{phase}</strong> · Currency:{' '}
                    <strong className="text-cyan-400">{effectiveCurrency}</strong> · Starting:{' '}
                    <strong className="text-emerald-400 font-mono">
                      {formatCurrency(startingBalance, effectiveCurrency)}
                    </strong>
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono">
                  riskEngine v2.4
                </div>
              </div>

              {/* Bulleted Plain English Explanation */}
              <div className="space-y-2.5 text-slate-300">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span>
                    <strong>Profit Target:</strong> You are aiming for{' '}
                    <span className="text-emerald-400 font-semibold font-mono">
                      {profitTargetType === 'PERCENT'
                        ? `${profitTargetValue}% (${formatCurrency((startingBalance * profitTargetValue) / 100, effectiveCurrency)})`
                        : `${profitTargetValue} ${effectiveCurrency}`}
                    </span>
                    . You must trade at least <strong>{minimumTradingDays} unique days</strong>
                    {hasTimeLimit ? ` within ${timeLimitDays} days` : ' with no time limit'}.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span>
                    <strong>Daily Loss Limit:</strong> The firm allows a maximum daily loss of{' '}
                    <span className="text-rose-400 font-semibold font-mono">
                      {dailyLossType === 'PERCENT'
                        ? `${dailyLossValue}% (${formatCurrency((startingBalance * dailyLossValue) / 100, effectiveCurrency)})`
                        : `${dailyLossValue} ${effectiveCurrency}`}
                    </span>{' '}
                    calculated on a <strong>{dailyLossBasis === 'BALANCE_BASED' ? 'balance-based' : 'equity-based (including floating P/L)'}</strong> basis. The daily session resets at <strong>{dailyResetTime} ({dailyResetTimezone})</strong>.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span>
                    <strong>Maximum Overall Drawdown:</strong> Liquidation floor is{' '}
                    <span className="text-rose-400 font-semibold font-mono">
                      {maxDrawdownValue}% (${formatCurrency((startingBalance * maxDrawdownValue) / 100, effectiveCurrency)})
                    </span>{' '}
                    using a <strong>{maxDrawdownType.replace(/_/g, ' ')}</strong> floor
                    {maxDrawdownType !== 'STATIC' && lockFloorAtStartBalanceOnceInProfit
                      ? ` that locks permanently at starting balance (${formatCurrency(startingBalance, effectiveCurrency)}) once in profit`
                      : ''}
                    .
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span>
                    <strong>Consistency Rule:</strong>{' '}
                    {consistencyRuleEnabled ? (
                      <span>
                        Enforced. No single trading day can exceed{' '}
                        <span className="text-amber-400 font-semibold">
                          {maxProfitSharePercentFromSingleDay}%
                        </span>{' '}
                        of total generated profits upon challenge completion.
                      </span>
                    ) : (
                      <span className="text-slate-400">Disabled (no consistency cap required).</span>
                    )}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold shrink-0">•</span>
                  <span>
                    <strong>Restrictions:</strong> Max <strong>{maxTradesPerDay} trades/day</strong>, max{' '}
                    <strong>{maxLots} lots open</strong>. News trading is{' '}
                    <strong>{newsTradingRestricted ? 'Restricted' : 'Allowed'}</strong>, weekend holding is{' '}
                    <strong>{weekendHoldingRestricted ? 'Restricted' : 'Allowed'}</strong>.
                  </span>
                </div>

                <div className="flex items-start gap-2 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Personal Safety Buffer:</strong> You will be locked out for the day if your loss reaches{' '}
                    <span className="text-amber-400 font-bold font-mono">
                      {personalDailyLossValue}{personalDailyLossType === 'PERCENT' ? '%' : ` ${effectiveCurrency}`}
                    </span>{' '}
                    (50% of the firm's limit). Each trade is capped at{' '}
                    <span className="text-cyan-300 font-bold font-mono">{maxRiskPerTradePercent}% risk</span>, with total open risk capped at{' '}
                    <span className="text-cyan-300 font-bold font-mono">{maxTotalOpenRiskPercent}%</span>.
                  </span>
                </div>
              </div>

              {/* Mandatory Persistent Disclaimer Footer */}
              <div className="p-3 rounded-lg bg-amber-950/25 border border-amber-500/30 text-amber-200/90 text-[11px] leading-relaxed">
                <strong>Disclaimer Notice:</strong> Educational tool. Not financial advice. Firm rules change; always confirm against your firm's official dashboard.
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              className="py-2.5 px-4 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 8 ? (
            <button
              onClick={handleNext}
              className="py-2.5 px-5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              Next: {steps[currentStep]?.title || 'Continue'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleSaveAndActivate}
              className="py-2.5 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Save Account Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
