import React, { useState, useMemo } from 'react';
import {
  Shield,
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  Building2,
  DollarSign,
  TrendingDown,
  Target,
  Sparkles,
  Info,
  Clock,
  Layers,
  HelpCircle,
  Lock,
  Calendar,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Award,
  Globe,
  Activity,
  FileCheck,
  Percent,
} from 'lucide-react';
import {
  AccountSettings,
  AccountKind,
  FundedAccountConfig,
  FundedPhase,
  FundedDrawdownType,
  TrailingBasis,
} from '../../types';
import {
  VERIFIED_FUNDED_PRESETS,
  VerifiedFundedPreset,
} from '../../data/verifiedFundedPresets';
import { createDefaultFundedConfig } from '../../utils/fundedRiskEngine';
import { formatCurrency } from '../../utils/currencyFormatter';
import { RulesConfig } from '../../riskEngine';

interface CreateAccountWizardProps {
  onAccountCreated: (account: AccountSettings) => void;
  onCancel?: () => void;
  initialKind?: AccountKind;
}

export type EvaluationModelType = 'ONE_STEP' | 'TWO_STEP' | 'INSTANT_FUNDED' | 'CUSTOM';
export type FundedAccountStatusType = 'EVALUATION' | 'ALREADY_FUNDED';

const PROP_FIRM_PROVIDERS = [
  { id: 'FTMO', name: 'FTMO', defaultTz: 'Europe/Prague', defaultReset: '00:00' },
  { id: 'FUNDEDNEXT', name: 'FundedNext', defaultTz: 'UTC', defaultReset: '00:00' },
  { id: 'THE_FUNDED_TRADER', name: 'The Funded Trader (TFT)', defaultTz: 'America/New_York', defaultReset: '17:00' },
  { id: 'ALPHA_CAPITAL', name: 'Alpha Capital Group', defaultTz: 'Europe/London', defaultReset: '00:00' },
  { id: 'TOPSTEP', name: 'Topstep', defaultTz: 'America/Chicago', defaultReset: '16:00' },
  { id: 'MY_FUNDED_FX', name: 'MyFundedFX', defaultTz: 'UTC', defaultReset: '00:00' },
  { id: 'SURGETRADER', name: 'SurgeTrader', defaultTz: 'America/New_York', defaultReset: '17:00' },
  { id: 'CUSTOM', name: '+ Create Custom Provider Profile', defaultTz: 'UTC', defaultReset: '00:00' },
];

const ACCOUNT_SIZES = [
  { value: 10000, label: '$10,000' },
  { value: 25000, label: '$25,000' },
  { value: 50000, label: '$50,000' },
  { value: 100000, label: '$100,000' },
  { value: 200000, label: '$200,000' },
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'USC', 'CAD', 'AUD'];

export const CreateAccountWizard: React.FC<CreateAccountWizardProps> = ({
  onAccountCreated,
  onCancel,
  initialKind,
}) => {
  // Step navigation:
  // Step 0: Choose Account Type (Demo, Personal, Funded)
  // When Funded:
  //   Step 1: Screen A - Account Details
  //   Step 2: Screen B - Evaluation Rules
  //   Step 3: Screen C - Review & Confirm
  //   Step 4: Screen D - Creating Account / Success
  // When Demo or Personal:
  //   Step 1: Configure & Confirm
  const [currentStep, setCurrentStep] = useState<number>(initialKind ? 1 : 0);
  const [selectedKind, setSelectedKind] = useState<AccountKind>(initialKind || 'FUNDED');

  // ==========================================
  // FUNDED ACCOUNT SETUP STATES (Screens A, B, C)
  // ==========================================
  // Screen A: Details
  const [accountNickname, setAccountNickname] = useState('My Funded Evaluation');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('FTMO');
  const [customProviderName, setCustomProviderName] = useState('');
  const [accountSize, setAccountSize] = useState<number>(100000);
  const [customAccountSize, setCustomAccountSize] = useState<string>('');
  const [isCustomSizeActive, setIsCustomSizeActive] = useState<boolean>(false);
  const [currency, setCurrency] = useState('USD');
  const [accountStatusType, setAccountStatusType] = useState<FundedAccountStatusType>('EVALUATION');
  const [evaluationModel, setEvaluationModel] = useState<EvaluationModelType>('TWO_STEP');
  const [fundedPhase, setFundedPhase] = useState<FundedPhase>('PHASE_1');

  // Screen B: Evaluation Rules
  const [profitTargetPhase1Pct, setProfitTargetPhase1Pct] = useState<number>(10.0);
  const [profitTargetPhase2Pct, setProfitTargetPhase2Pct] = useState<number>(5.0);
  const [dailyLossLimitPct, setDailyLossLimitPct] = useState<number>(5.0);
  const [maxOverallDrawdownPct, setMaxOverallDrawdownPct] = useState<number>(10.0);
  const [drawdownType, setDrawdownType] = useState<FundedDrawdownType>('STATIC');
  const [dailyLossBasis, setDailyLossBasis] = useState<'BALANCE_BASED' | 'EQUITY_BASED'>('EQUITY_BASED');
  const [trailingBasis, setTrailingBasis] = useState<TrailingBasis>('EQUITY');
  const [lockAtStartingBalance, setLockAtStartingBalance] = useState<boolean>(false);
  const [dailyResetTime, setDailyResetTime] = useState<string>('00:00');
  const [dailyResetTimezone, setDailyResetTimezone] = useState<string>('Europe/Prague');
  const [minimumTradingDays, setMinimumTradingDays] = useState<number>(4);
  const [maxRiskPerTradePct, setMaxRiskPerTradePct] = useState<number>(1.0);
  const [maxLots, setMaxLots] = useState<number>(10);
  const [newsTradingRestricted, setNewsTradingRestricted] = useState<boolean>(false);
  const [weekendHoldingRestricted, setWeekendHoldingRestricted] = useState<boolean>(false);
  const [consistencyRuleEnabled, setConsistencyRuleEnabled] = useState<boolean>(false);
  const [maxProfitShareSingleDay, setMaxProfitShareSingleDay] = useState<number>(30);

  // Rule verification tracking
  const [isPresetModified, setIsPresetModified] = useState<boolean>(false);

  // Screen C: Confirmation
  const [userConfirmedRules, setUserConfirmedRules] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // ==========================================
  // DEMO & PERSONAL ACCOUNT STATES
  // ==========================================
  const [demoNickname, setDemoNickname] = useState('My Demo Account');
  const [demoStartingBalance, setDemoStartingBalance] = useState<number>(10000);
  const [demoRiskPct, setDemoRiskPct] = useState<number>(1.0);

  const [personalNickname, setPersonalNickname] = useState('Personal Trading Account');
  const [personalBroker, setPersonalBroker] = useState('IC Markets / Exness');
  const [personalStartingCapital, setPersonalStartingCapital] = useState<number>(5000);
  const [personalCurrency, setPersonalCurrency] = useState('USD');
  const [personalDailyLossCapPct, setPersonalDailyLossCapPct] = useState<number>(3.0);
  const [personalOverallDrawdownPct, setPersonalOverallDrawdownPct] = useState<number>(8.0);
  const [personalRiskPerTradePct, setPersonalRiskPerTradePct] = useState<number>(1.0);

  // Auto-scroll to top when step changes
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentStep]);

  // Handle provider preset selection
  const handleSelectProvider = (providerId: string) => {
    setSelectedProviderId(providerId);
    setValidationError(null);

    const providerObj = PROP_FIRM_PROVIDERS.find((p) => p.id === providerId);
    if (providerObj) {
      setDailyResetTimezone(providerObj.defaultTz);
      setDailyResetTime(providerObj.defaultReset);
    }

    if (providerId === 'FTMO') {
      setAccountNickname(`FTMO ${formatCurrency(accountSize, currency)} Evaluation`);
      setProfitTargetPhase1Pct(10.0);
      setProfitTargetPhase2Pct(5.0);
      setDailyLossLimitPct(5.0);
      setMaxOverallDrawdownPct(10.0);
      setDrawdownType('STATIC');
      setDailyLossBasis('EQUITY_BASED');
      setMinimumTradingDays(4);
      setNewsTradingRestricted(false);
      setWeekendHoldingRestricted(false);
      setEvaluationModel('TWO_STEP');
      setIsPresetModified(false);
    } else if (providerId === 'FUNDEDNEXT') {
      setAccountNickname(`FundedNext ${formatCurrency(accountSize, currency)} Stellar`);
      setProfitTargetPhase1Pct(8.0);
      setProfitTargetPhase2Pct(5.0);
      setDailyLossLimitPct(5.0);
      setMaxOverallDrawdownPct(10.0);
      setDrawdownType('STATIC');
      setDailyLossBasis('BALANCE_BASED');
      setMinimumTradingDays(5);
      setNewsTradingRestricted(false);
      setWeekendHoldingRestricted(false);
      setEvaluationModel('TWO_STEP');
      setIsPresetModified(false);
    } else if (providerId === 'ALPHA_CAPITAL') {
      setAccountNickname(`Alpha Capital ${formatCurrency(accountSize, currency)}`);
      setProfitTargetPhase1Pct(8.0);
      setProfitTargetPhase2Pct(5.0);
      setDailyLossLimitPct(5.0);
      setMaxOverallDrawdownPct(10.0);
      setDrawdownType('STATIC');
      setDailyLossBasis('EQUITY_BASED');
      setMinimumTradingDays(0);
      setNewsTradingRestricted(false);
      setWeekendHoldingRestricted(true);
      setEvaluationModel('TWO_STEP');
      setIsPresetModified(false);
    } else if (providerId === 'TOPSTEP') {
      setAccountNickname(`Topstep ${formatCurrency(accountSize, currency)} Trading Combine`);
      setProfitTargetPhase1Pct(6.0);
      setProfitTargetPhase2Pct(0);
      setDailyLossLimitPct(4.0);
      setMaxOverallDrawdownPct(6.0);
      setDrawdownType('TRAILING');
      setTrailingBasis('EQUITY');
      setLockAtStartingBalance(true);
      setDailyLossBasis('EQUITY_BASED');
      setMinimumTradingDays(2);
      setNewsTradingRestricted(true);
      setWeekendHoldingRestricted(true);
      setEvaluationModel('ONE_STEP');
      setIsPresetModified(false);
    } else if (providerId === 'CUSTOM') {
      setAccountNickname('Custom Prop Firm Evaluation');
      setIsPresetModified(true);
    }
  };

  // Compute effective provider display name
  const effectiveProviderName = useMemo(() => {
    if (selectedProviderId === 'CUSTOM') {
      return customProviderName.trim() || 'Custom Prop Firm';
    }
    const found = PROP_FIRM_PROVIDERS.find((p) => p.id === selectedProviderId);
    return found ? found.name : 'Prop Firm';
  }, [selectedProviderId, customProviderName]);

  // Compute effective account size
  const effectiveAccountSize = useMemo(() => {
    if (isCustomSizeActive) {
      const parsed = parseFloat(customAccountSize);
      return !isNaN(parsed) && parsed > 0 ? parsed : 50000;
    }
    return accountSize;
  }, [isCustomSizeActive, customAccountSize, accountSize]);

  // Determine verification status
  const computedVerificationStatus = useMemo<'VERIFIED' | 'USER_ENTERED' | 'UNVERIFIED'>(() => {
    if (selectedProviderId === 'CUSTOM') return 'UNVERIFIED';
    if (isPresetModified) return 'USER_ENTERED';
    return 'VERIFIED';
  }, [selectedProviderId, isPresetModified]);

  // Monetary calculations for summary
  const dailyLossDollars = (effectiveAccountSize * dailyLossLimitPct) / 100;
  const overallLossDollars = (effectiveAccountSize * maxOverallDrawdownPct) / 100;
  const phase1TargetDollars = (effectiveAccountSize * profitTargetPhase1Pct) / 100;
  const phase2TargetDollars = (effectiveAccountSize * profitTargetPhase2Pct) / 100;

  // Handle Account Type Selection (Step 0)
  const handleSelectType = (kind: AccountKind) => {
    setSelectedKind(kind);
    setValidationError(null);
    setCurrentStep(1);
  };

  // Handle creation of Demo Account
  const handleCreateDemoAccount = () => {
    if (!demoNickname.trim()) {
      setValidationError('Please enter an account nickname.');
      return;
    }

    const newAccount: AccountSettings = {
      id: `acc-demo-${Date.now()}`,
      traderName: 'DEMO TRADER',
      accountName: demoNickname.trim(),
      accountType: 'DEMO',
      accountKind: 'DEMO',
      accountCategory: 'DEMO',
      isDemo: true,
      isManual: true,
      initialBalance: demoStartingBalance,
      currentBalance: demoStartingBalance,
      currentEquity: demoStartingBalance,
      broker: 'PrimePipFX Simulated Sandbox',
      currency: 'USD',
      maxDailyLossPercent: 4.0,
      maxDrawdownPercent: 8.0,
      maxDailyTrades: 4,
      targetRiskPerTradePercent: demoRiskPct,
      maxRiskPerTradePercent: demoRiskPct * 1.5,
      preferredInstruments: ['XAUUSD', 'EURUSD', 'GBPUSD'],
      consecutiveLossProtection: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAccountCreated(newAccount);
  };

  // Handle creation of Personal Account
  const handleCreatePersonalAccount = () => {
    if (!personalNickname.trim()) {
      setValidationError('Please enter an account nickname.');
      return;
    }
    if (personalStartingCapital <= 0) {
      setValidationError('Please enter a valid starting balance.');
      return;
    }

    const isCent = personalCurrency === 'USC' || personalNickname.toLowerCase().includes('cent');

    const newAccount: AccountSettings = {
      id: `acc-personal-${Date.now()}`,
      traderName: 'PERSONAL TRADER',
      accountName: personalNickname.trim(),
      accountType: isCent ? 'CENT_ACCOUNT' : 'PERSONAL_LIVE',
      accountKind: isCent ? 'CENT' : 'PERSONAL',
      accountCategory: 'PERSONAL',
      isCentAccount: isCent,
      isDemo: false,
      isManual: true,
      initialBalance: personalStartingCapital,
      currentBalance: personalStartingCapital,
      currentEquity: personalStartingCapital,
      broker: personalBroker.trim() || 'Self-Directed Broker',
      currency: personalCurrency,
      maxDailyLossPercent: personalDailyLossCapPct,
      maxDrawdownPercent: personalOverallDrawdownPct,
      maxDailyTrades: 3,
      targetRiskPerTradePercent: personalRiskPerTradePct,
      maxRiskPerTradePercent: personalRiskPerTradePct * 1.5,
      preferredInstruments: ['XAUUSD', 'EURUSD', 'GBPUSD'],
      consecutiveLossProtection: true,
      personalDrawdownBufferPercent: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAccountCreated(newAccount);
  };

  // Handle creation of Funded Account (Final Confirmation Step)
  const handleCreateFundedAccount = () => {
    if (!userConfirmedRules) {
      setValidationError('Please review and check the confirmation box before creating this account.');
      return;
    }

    const fundedConfig: FundedAccountConfig = {
      ...createDefaultFundedConfig(effectiveAccountSize, effectiveProviderName, fundedPhase),
      enabled: true,
      firmName: effectiveProviderName,
      accountName: accountNickname.trim(),
      accountSize: effectiveAccountSize,
      startingBalance: effectiveAccountSize,
      phase: fundedPhase,
      evaluationModel,
      dailyDrawdownPercent: dailyLossLimitPct,
      dailyDrawdownDollars: Number(dailyLossDollars.toFixed(2)),
      overallDrawdownPercent: maxOverallDrawdownPct,
      overallDrawdownDollars: Number(overallLossDollars.toFixed(2)),
      drawdownType,
      dailyLossBasis,
      dailyResetTime,
      dailyResetTimezone,
      minimumTradingDays,
      maxLots,
      preferredRiskPercent: maxRiskPerTradePct,
      maxRiskPerTradePercent: maxRiskPerTradePct,
      maxRiskPerTradeDollars: Number(((effectiveAccountSize * maxRiskPerTradePct) / 100).toFixed(2)),
      riskMode: 'BALANCED',
      newsRestriction: newsTradingRestricted,
      weekendHoldingRestriction: weekendHoldingRestricted,
      consistencyRule: consistencyRuleEnabled ? `Max ${maxProfitShareSingleDay}% from single day` : undefined,
      ruleVerificationStatus: computedVerificationStatus,
      trailingConfig: {
        trailingBasis,
        lockAtStartingBalance,
        unrealizedProfitAffectsTrailing: dailyLossBasis === 'EQUITY_BASED',
        activationLevelProfitDollars: 0,
      },
      profitTargets: {
        phase1TargetPercent: profitTargetPhase1Pct,
        phase1TargetDollars: Number(phase1TargetDollars.toFixed(2)),
        phase2TargetPercent: evaluationModel === 'ONE_STEP' || evaluationModel === 'INSTANT_FUNDED' ? 0 : profitTargetPhase2Pct,
        phase2TargetDollars: evaluationModel === 'ONE_STEP' || evaluationModel === 'INSTANT_FUNDED' ? 0 : Number(phase2TargetDollars.toFixed(2)),
      },
    };

    const rulesConfig: Partial<RulesConfig> = {
      accountName: accountNickname.trim(),
      currency,
      startingBalance: effectiveAccountSize,
      phase: fundedPhase === 'FUNDED_LIVE' ? 'Funded' : fundedPhase === 'PHASE_2' ? 'Phase 2' : 'Phase 1',
      profitTargetValue: profitTargetPhase1Pct,
      profitTargetType: 'PERCENT',
      minimumTradingDays,
      dailyLossValue: dailyLossLimitPct,
      dailyLossType: 'PERCENT',
      dailyLossBasis,
      dailyResetTime,
      dailyResetTimezone,
      maxDrawdownValue: maxOverallDrawdownPct,
      maxDrawdownType: drawdownType === 'TRAILING' ? (trailingBasis === 'EQUITY' ? 'INTRADAY_TRAILING' : 'EOD_TRAILING') : 'STATIC',
      lockFloorAtStartBalanceOnceInProfit: lockAtStartingBalance,
      consistencyRuleEnabled,
      maxProfitSharePercentFromSingleDay: maxProfitShareSingleDay,
      maxTradesPerDay: 4,
      maxLots,
      newsTradingRestricted,
      weekendHoldingRestricted,
      maxRiskPerTradePercent: maxRiskPerTradePct,
      maxTotalOpenRiskPercent: maxRiskPerTradePct * 2,
    };

    const newAccount: AccountSettings = {
      id: `acc-funded-${Date.now()}`,
      traderName: 'FUNDED TRADER',
      accountName: accountNickname.trim(),
      accountType: fundedPhase === 'FUNDED_LIVE' ? 'PROP_FIRM_FUNDED' : 'PROP_FIRM_EVALUATION',
      accountKind: 'FUNDED',
      accountCategory: 'FUNDED',
      isDemo: false,
      isManual: true,
      initialBalance: effectiveAccountSize,
      currentBalance: effectiveAccountSize,
      currentEquity: effectiveAccountSize,
      broker: effectiveProviderName,
      currency,
      maxDailyLossPercent: dailyLossLimitPct,
      maxDrawdownPercent: maxOverallDrawdownPct,
      maxDailyTrades: 4,
      targetRiskPerTradePercent: maxRiskPerTradePct,
      maxRiskPerTradePercent: maxRiskPerTradePct,
      rulesConfig: rulesConfig as RulesConfig,
      fundedConfig,
      ruleProfileVersion: `PRIME-PINE-${Date.now().toString(36).toUpperCase()}`,
      ruleVerificationStatus: computedVerificationStatus,
      calculationMethodology: `${dailyLossBasis.replace('_', ' ')} daily reset at ${dailyResetTime} ${dailyResetTimezone}`,
      preferredInstruments: ['XAUUSD', 'EURUSD', 'GBPUSD', 'US30'],
      consecutiveLossProtection: true,
      personalDrawdownBufferPercent: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAccountCreated(newAccount);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100 font-sans">
      {/* Top Header */}
      <div className="p-5 sm:p-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">
                Account Creation &amp; Guidance Wizard
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold uppercase">
                Step {currentStep + 1} of {selectedKind === 'FUNDED' ? 4 : 2}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Set up demo, personal live, or audited prop firm funded accounts with automated risk checks.
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="m-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/60 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 0: ACCOUNT TYPE SELECTION (Demo, Personal, Funded)               */}
      {/* ===================================================================== */}
      {currentStep === 0 && (
        <div className="p-5 sm:p-8 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-lg font-bold text-white">Select Account Type</h3>
            <p className="text-xs text-slate-400">
              Choose the profile that matches your trading objective. You can create and manage multiple accounts independently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. DEMO ACCOUNT */}
            <div
              onClick={() => handleSelectType('DEMO')}
              className="p-5 rounded-2xl bg-slate-900/60 border-2 border-slate-800 hover:border-cyan-500/70 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-xl hover:shadow-cyan-950/20"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                    1. Demo Account
                  </h4>
                  <span className="text-[10px] text-cyan-400 font-mono block mt-0.5">
                    Simulation &amp; Practice
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Practice market mechanics, test indicators, and refine setups with customizable virtual balances in a risk-free environment.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-cyan-400">
                <span>Start Practice</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 2. PERSONAL TRADING ACCOUNT */}
            <div
              onClick={() => handleSelectType('PERSONAL')}
              className="p-5 rounded-2xl bg-slate-900/60 border-2 border-slate-800 hover:border-emerald-500/70 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-xl hover:shadow-emerald-950/20"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                    2. Personal Trading Account
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                    Live Capital &amp; Cent Accounts
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Trade your own capital with real brokers (IC Markets, Exness, Pepperstone) or Cent accounts (USC) with personal risk caps and discipline safeguards.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>Set Up Live Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* 3. FUNDED ACCOUNT */}
            <div
              onClick={() => handleSelectType('FUNDED')}
              className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-purple-950/20 border-2 border-purple-500/50 hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between group hover:shadow-2xl hover:shadow-purple-950/40 relative"
            >
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-bold uppercase tracking-wider">
                Dedicated Workflow
              </div>
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition">
                    3. Funded Account
                  </h4>
                  <span className="text-[10px] text-purple-300 font-mono block mt-0.5">
                    Prop Firm Challenge &amp; Live Funded
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Track 1-step or 2-step prop evaluation challenges with automated daily loss alerts, trailing drawdown defenses, and pass progress analytics.
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-purple-800/40 flex items-center justify-between text-xs font-bold text-purple-300">
                <span>Configure Prop Account</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DEMO ACCOUNT SETUP (Step 1 when DEMO selected)                        */}
      {/* ===================================================================== */}
      {currentStep === 1 && selectedKind === 'DEMO' && (
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Configure Demo Account</h3>
              <p className="text-xs text-slate-400">Set up virtual capital to practice strategies.</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Types</span>
            </button>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Account Nickname</label>
              <input
                type="text"
                value={demoNickname}
                onChange={(e) => setDemoNickname(e.target.value)}
                placeholder="e.g. Scalping Strategy Practice"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Virtual Capital</label>
              <div className="grid grid-cols-4 gap-2">
                {[5000, 10000, 50000, 100000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDemoStartingBalance(amt)}
                    className={`py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      demoStartingBalance === amt
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    ${amt.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Risk Per Trade ({demoRiskPct}%)
              </label>
              <input
                type="range"
                min="0.25"
                max="3.0"
                step="0.25"
                value={demoRiskPct}
                onChange={(e) => setDemoRiskPct(parseFloat(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Max recommended risk: ${((demoStartingBalance * demoRiskPct) / 100).toFixed(2)} per trade.
              </span>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreateDemoAccount}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <span>Create Demo Account</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PERSONAL TRADING ACCOUNT SETUP (Step 1 when PERSONAL selected)        */}
      {/* ===================================================================== */}
      {currentStep === 1 && selectedKind === 'PERSONAL' && (
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Configure Personal Account</h3>
              <p className="text-xs text-slate-400">Trade real capital with personal risk boundaries.</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Types</span>
            </button>
          </div>

          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Account Nickname</label>
              <input
                type="text"
                value={personalNickname}
                onChange={(e) => setPersonalNickname(e.target.value)}
                placeholder="e.g. IC Markets Live"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Broker / Terminal</label>
                <input
                  type="text"
                  value={personalBroker}
                  onChange={(e) => setPersonalBroker(e.target.value)}
                  placeholder="e.g. Exness, IC Markets"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Currency</label>
                <select
                  value={personalCurrency}
                  onChange={(e) => setPersonalCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="USC">USC (Cent Account)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Starting Capital</label>
              <input
                type="number"
                value={personalStartingCapital}
                onChange={(e) => setPersonalStartingCapital(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Daily Loss Cap (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={personalDailyLossCapPct}
                  onChange={(e) => setPersonalDailyLossCapPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.25"
                  value={personalRiskPerTradePct}
                  onChange={(e) => setPersonalRiskPerTradePct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCreatePersonalAccount}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <span>Create Personal Account</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FUNDED ACCOUNT - SCREEN A: ACCOUNT DETAILS (Step 1)                  */}
      {/* ===================================================================== */}
      {currentStep === 1 && selectedKind === 'FUNDED' && (
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Screen A: Account &amp; Provider Details</h3>
              <p className="text-xs text-slate-400">Specify your prop firm, account size, model, and phase.</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Types</span>
            </button>
          </div>

          <div className="space-y-5">
            {/* 1. Account Name */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Account Nickname
              </label>
              <input
                type="text"
                value={accountNickname}
                onChange={(e) => setAccountNickname(e.target.value)}
                placeholder="e.g. FTMO 100K Swing Challenge"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-medium"
              />
            </div>

            {/* 2. Funding Provider / Prop Firm */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Funding Provider or Prop Firm</span>
                <span className="text-[10px] text-slate-500 lowercase font-mono">
                  Select provider or create custom profile
                </span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROP_FIRM_PROVIDERS.map((p) => {
                  const isSelected = selectedProviderId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProvider(p.id)}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-purple-600/20 border-purple-400 text-white shadow-md'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="font-bold truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-1">
                        {p.defaultTz}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Provider Profile Input */}
              {selectedProviderId === 'CUSTOM' && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-purple-500/40 space-y-2 animate-in fade-in">
                  <label className="block text-[11px] font-bold uppercase text-purple-300">
                    Custom Provider Profile Name
                  </label>
                  <input
                    type="text"
                    value={customProviderName}
                    onChange={(e) => setCustomProviderName(e.target.value)}
                    placeholder="e.g. Apex Trader, E8 Funding, Blue Guardian"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs outline-none focus:border-purple-400"
                  />
                  <p className="text-[11px] text-slate-400">
                    Note: Custom provider rules are marked as <strong>UNVERIFIED</strong> until confirmed by you.
                  </p>
                </div>
              )}
            </div>

            {/* 3. Account Size & Currency */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold uppercase text-slate-300">Account Size</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {ACCOUNT_SIZES.map((sz) => {
                    const isSelected = !isCustomSizeActive && accountSize === sz.value;
                    return (
                      <button
                        key={sz.value}
                        type="button"
                        onClick={() => {
                          setAccountSize(sz.value);
                          setIsCustomSizeActive(false);
                        }}
                        className={`py-2 rounded-xl border text-xs font-bold font-mono transition cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {sz.label}
                      </button>
                    );
                  })}
                </div>

                {/* Custom size option */}
                <div className="pt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomSizeActive(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                      isCustomSizeActive
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    Custom Size
                  </button>
                  {isCustomSizeActive && (
                    <input
                      type="number"
                      value={customAccountSize}
                      onChange={(e) => setCustomAccountSize(e.target.value)}
                      placeholder="e.g. 75000"
                      className="px-3 py-1 rounded-lg bg-slate-900 border border-cyan-500/50 text-white text-xs font-mono outline-none w-36"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-mono"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Evaluation Model & Status Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Evaluation Model
                </label>
                <select
                  value={evaluationModel}
                  onChange={(e) => setEvaluationModel(e.target.value as EvaluationModelType)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="TWO_STEP">2-Step Challenge (Phase 1 &amp; Phase 2)</option>
                  <option value="ONE_STEP">1-Step Rapid Evaluation</option>
                  <option value="INSTANT_FUNDED">Instant Funded / No Challenge</option>
                  <option value="CUSTOM">Custom Multi-Step Model</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                  Current Status &amp; Phase
                </label>
                <select
                  value={fundedPhase}
                  onChange={(e) => setFundedPhase(e.target.value as FundedPhase)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="PHASE_1">Phase 1 (Initial Evaluation)</option>
                  <option value="PHASE_2">Phase 2 (Verification Stage)</option>
                  <option value="FUNDED_LIVE">Funded Live (Passed &amp; Trading for Payouts)</option>
                </select>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!accountNickname.trim()) {
                    setValidationError('Please enter a nickname for this account.');
                    return;
                  }
                  setValidationError(null);
                  setCurrentStep(2);
                }}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <span>Continue to Screen B: Rules</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FUNDED ACCOUNT - SCREEN B: EVALUATION RULES (Step 2)                  */}
      {/* ===================================================================== */}
      {currentStep === 2 && selectedKind === 'FUNDED' && (
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Screen B: Configure Evaluation Rules</h3>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                  computedVerificationStatus === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : computedVerificationStatus === 'USER_ENTERED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                }`}>
                  {computedVerificationStatus === 'VERIFIED' ? '✓ Verified Preset' : computedVerificationStatus === 'USER_ENTERED' ? 'User-Entered Rules' : 'Unverified Profile'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure profit targets, loss limits, reset times, and trading restrictions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Details</span>
            </button>
          </div>

          <div className="space-y-5 text-xs">
            {/* Profit Targets & Loss Limits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box 1: Targets */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  <span>Profit Target Requirements</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Phase 1 Target (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={profitTargetPhase1Pct}
                      onChange={(e) => {
                        setProfitTargetPhase1Pct(parseFloat(e.target.value) || 0);
                        setIsPresetModified(true);
                      }}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      = {formatCurrency(phase1TargetDollars, currency)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Phase 2 Target (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={profitTargetPhase2Pct}
                      onChange={(e) => {
                        setProfitTargetPhase2Pct(parseFloat(e.target.value) || 0);
                        setIsPresetModified(true);
                      }}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      = {formatCurrency(phase2TargetDollars, currency)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Minimum Qualifying Days</label>
                  <input
                    type="number"
                    min="0"
                    value={minimumTradingDays}
                    onChange={(e) => {
                      setMinimumTradingDays(parseInt(e.target.value, 10) || 0);
                      setIsPresetModified(true);
                    }}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Must log at least this many distinct trading days before passing.
                  </span>
                </div>
              </div>

              {/* Box 2: Loss Limits & Drawdowns */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <h4 className="font-bold text-rose-300 uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4" />
                  <span>Loss Limits &amp; Drawdown Type</span>
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Daily Loss Limit (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={dailyLossLimitPct}
                      onChange={(e) => {
                        setDailyLossLimitPct(parseFloat(e.target.value) || 0);
                        setIsPresetModified(true);
                      }}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      = {formatCurrency(dailyLossDollars, currency)} max/day
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Overall Drawdown (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={maxOverallDrawdownPct}
                      onChange={(e) => {
                        setMaxOverallDrawdownPct(parseFloat(e.target.value) || 0);
                        setIsPresetModified(true);
                      }}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      = {formatCurrency(overallLossDollars, currency)} max total
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 mb-1">Drawdown Model</label>
                    <select
                      value={drawdownType}
                      onChange={(e) => {
                        setDrawdownType(e.target.value as FundedDrawdownType);
                        setIsPresetModified(true);
                      }}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value="STATIC">Static (Fixed Floor)</option>
                      <option value="TRAILING">Trailing Drawdown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">Daily Calculation Basis</label>
                    <select
                      value={dailyLossBasis}
                      onChange={(e) => {
                        setDailyLossBasis(e.target.value as 'BALANCE_BASED' | 'EQUITY_BASED');
                        setIsPresetModified(true);
                      }}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white"
                    >
                      <option value="EQUITY_BASED">Equity-Based</option>
                      <option value="BALANCE_BASED">Balance-Based</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Timezone & Execution Limits */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Reset Time, Sizing &amp; Firm Restrictions</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Daily Reset Time</label>
                  <input
                    type="text"
                    value={dailyResetTime}
                    onChange={(e) => {
                      setDailyResetTime(e.target.value);
                      setIsPresetModified(true);
                    }}
                    placeholder="00:00"
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Reset Timezone</label>
                  <input
                    type="text"
                    value={dailyResetTimezone}
                    onChange={(e) => {
                      setDailyResetTimezone(e.target.value);
                      setIsPresetModified(true);
                    }}
                    placeholder="Europe/Prague, UTC, EST"
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Max Risk / Trade (%)</label>
                  <input
                    type="number"
                    step="0.25"
                    value={maxRiskPerTradePct}
                    onChange={(e) => {
                      setMaxRiskPerTradePct(parseFloat(e.target.value) || 0);
                      setIsPresetModified(true);
                    }}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              {/* Toggles for Restrictions */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newsTradingRestricted}
                    onChange={(e) => {
                      setNewsTradingRestricted(e.target.checked);
                      setIsPresetModified(true);
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                  <span className="text-slate-300">News Trading Restricted</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={weekendHoldingRestricted}
                    onChange={(e) => {
                      setWeekendHoldingRestricted(e.target.checked);
                      setIsPresetModified(true);
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                  <span className="text-slate-300">Weekend Holding Restricted</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consistencyRuleEnabled}
                    onChange={(e) => {
                      setConsistencyRuleEnabled(e.target.checked);
                      setIsPresetModified(true);
                    }}
                    className="w-4 h-4 accent-cyan-500 rounded"
                  />
                  <span className="text-slate-300">Consistency Rule (Max 30%)</span>
                </label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <span>Continue to Screen C: Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FUNDED ACCOUNT - SCREEN C: REVIEW AND CONFIRM (Step 3)                */}
      {/* ===================================================================== */}
      {currentStep === 3 && selectedKind === 'FUNDED' && (
        <div className="p-5 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Screen C: Review &amp; Confirm Configuration</h3>
              <p className="text-xs text-slate-400">
                Verify all limits before creating the account in your command center.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Edit Rules</span>
            </button>
          </div>

          {/* Configuration Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Account Profile</span>
                <h4 className="text-base font-bold text-white">{accountNickname}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-cyan-400 font-semibold">{effectiveProviderName}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-300 font-mono font-bold">
                    {formatCurrency(effectiveAccountSize, currency)} ({currency})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                  computedVerificationStatus === 'VERIFIED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {computedVerificationStatus === 'VERIFIED' ? 'Verified Preset' : 'User-Entered Rules'}
                </span>
              </div>
            </div>

            {/* Key Parameters Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Daily Loss Limit</span>
                <span className="font-bold text-rose-400 font-mono mt-0.5 block">
                  {dailyLossLimitPct}% ({formatCurrency(dailyLossDollars, currency)})
                </span>
                <span className="text-[10px] text-slate-500">{dailyLossBasis.replace('_', ' ')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Max Drawdown</span>
                <span className="font-bold text-rose-300 font-mono mt-0.5 block">
                  {maxOverallDrawdownPct}% ({formatCurrency(overallLossDollars, currency)})
                </span>
                <span className="text-[10px] text-slate-500">{drawdownType}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Phase 1 Target</span>
                <span className="font-bold text-purple-300 font-mono mt-0.5 block">
                  {profitTargetPhase1Pct}% ({formatCurrency(phase1TargetDollars, currency)})
                </span>
                <span className="text-[10px] text-slate-500">Min {minimumTradingDays} Days</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase">Daily Reset</span>
                <span className="font-bold text-slate-200 font-mono mt-0.5 block">
                  {dailyResetTime}
                </span>
                <span className="text-[10px] text-slate-500 truncate block">{dailyResetTimezone}</span>
              </div>
            </div>

            {/* Restrictions Summary */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
              <span className="text-slate-400 font-bold uppercase block">Configured Restrictions:</span>
              <div className="flex flex-wrap gap-2 text-slate-300 pt-1">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  News Trading: <strong>{newsTradingRestricted ? 'Restricted' : 'Allowed'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  Weekend Holding: <strong>{weekendHoldingRestricted ? 'Restricted' : 'Allowed'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  Consistency Rule: <strong>{consistencyRuleEnabled ? `Max ${maxProfitShareSingleDay}%/day` : 'None'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                  Max Risk/Trade: <strong>{maxRiskPerTradePct}%</strong>
                </span>
              </div>
            </div>

            {/* Unverified notice if applicable */}
            {computedVerificationStatus !== 'VERIFIED' && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">User-Entered / Unverified Settings Notice:</span>
                  You have customized rule settings or selected a custom provider. The system will strictly enforce these values, but you must ensure they match your funding provider contract.
                </div>
              </div>
            )}

            {/* Required Confirmation Checkbox */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={userConfirmedRules}
                  onChange={(e) => {
                    setUserConfirmedRules(e.target.checked);
                    setValidationError(null);
                  }}
                  className="w-4 h-4 accent-cyan-500 rounded mt-0.5"
                />
                <span className="text-xs text-slate-200 font-medium">
                  I confirm that I have reviewed these parameters and that they match the rules of my funded trading account.
                </span>
              </label>
            </div>
          </div>

          {/* Navigation Buttons (Screen D action) */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCreateFundedAccount}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-xl shadow-cyan-500/30 cursor-pointer active:scale-95"
            >
              <span>Create Account &amp; Open Dashboard</span>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
