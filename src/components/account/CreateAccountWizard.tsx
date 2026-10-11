import React, { useState } from 'react';
import {
  Shield,
  Crosshair,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Info,
  HelpCircle,
  Clock,
  Layers,
  Lock,
  Compass,
  Building2,
  DollarSign,
  TrendingDown,
  Target,
} from 'lucide-react';
import {
  AccountSettings,
  AccountKind,
  FundedAccountConfig,
  FundedDrawdownType,
  FundedPhase,
  TrailingBasis,
} from '../../types';
import {
  VERIFIED_FUNDED_PRESETS,
  VerifiedFundedPreset,
} from '../../data/verifiedFundedPresets';
import {
  createDefaultFundedConfig,
} from '../../utils/fundedRiskEngine';
import { formatCurrency, safeNumber } from '../../utils/currencyFormatter';

interface CreateAccountWizardProps {
  onAccountCreated: (account: AccountSettings) => void;
  onCancel?: () => void;
  initialKind?: AccountKind;
}

export const CreateAccountWizard: React.FC<CreateAccountWizardProps> = ({
  onAccountCreated,
  onCancel,
  initialKind,
}) => {
  // Step navigation: 0 = Account Selection Cards, 1-5 = Wizard steps
  const [currentStep, setCurrentStep] = useState<number>(initialKind ? 1 : 0);
  const [selectedKind, setSelectedKind] = useState<AccountKind>(initialKind || 'DEMO');

  // STEP 1: Account Identity
  const [accountNickname, setAccountNickname] = useState('My Trading Account');
  const [brokerOrProvider, setBrokerOrProvider] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [accountSize, setAccountSize] = useState<string>('5000');
  const [fundedPhase, setFundedPhase] = useState<FundedPhase>('PHASE_1');

  // STEP 2: Account Rules (Funded)
  const [ruleConfigMethod, setRuleConfigMethod] = useState<'PRESET' | 'MANUAL'>('PRESET');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ftmo_100k_standard');
  const [selectedPreset, setSelectedPreset] = useState<VerifiedFundedPreset>(
    VERIFIED_FUNDED_PRESETS[2] // FTMO 100k default
  );

  // Manual/Custom Rules
  const [manualDailyLossPct, setManualDailyLossPct] = useState<number>(5);
  const [manualOverallLossPct, setManualOverallLossPct] = useState<number>(10);
  const [manualPhase1TargetPct, setManualPhase1TargetPct] = useState<number>(10);
  const [manualPhase2TargetPct, setManualPhase2TargetPct] = useState<number>(5);
  const [manualSourceUrl, setManualSourceUrl] = useState<string>('');

  // STEP 3: Drawdown Configuration
  const [drawdownType, setDrawdownType] = useState<FundedDrawdownType>('EQUITY_BASED');
  const [trailingBasis, setTrailingBasis] = useState<TrailingBasis>('EQUITY');
  const [unrealizedProfitAffectsTrailing, setUnrealizedProfitAffectsTrailing] = useState<boolean>(false);
  const [lockAtStartingBalance, setLockAtStartingBalance] = useState<boolean>(false);
  const [dailyCalculationMethod, setDailyCalculationMethod] = useState<
    'EQUITY_BASED' | 'BALANCE_BASED' | 'HIGHER_OF_BALANCE_EQUITY'
  >('HIGHER_OF_BALANCE_EQUITY');
  const [dailyResetTime, setDailyResetTime] = useState<string>('00:00:00 CE(S)T');
  const [timezone, setTimezone] = useState<string>('Europe/Prague (CE(S)T)');
  const [floatingLossesCount, setFloatingLossesCount] = useState<boolean>(true);
  const [feesCountTowardsLoss, setFeesCountTowardsLoss] = useState<boolean>(true);
  const [isHardBreach, setIsHardBreach] = useState<boolean>(true);

  // STEP 4: Personal Risk Preferences
  const [maxRiskPerTradePct, setMaxRiskPerTradePct] = useState<number>(1.0);
  const [targetRiskPerTradePct, setTargetRiskPerTradePct] = useState<number>(0.5);
  const [personalDailyLossCapPct, setPersonalDailyLossCapPct] = useState<number>(3.0);
  const [safetyBufferPercent, setSafetyBufferPercent] = useState<number>(20);
  const [maxDailyTrades, setMaxDailyTrades] = useState<number>(2);
  const [consecutiveLossProtection, setConsecutiveLossProtection] = useState<boolean>(true);
  const [preferredInstruments, setPreferredInstruments] = useState<string[]>([
    'XAUUSD',
    'EURUSD',
    'GBPUSD',
  ]);

  // STEP 5: Confirmation
  const [userConfirmedRules, setUserConfirmedRules] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-fill when preset changes
  const handleSelectPreset = (preset: VerifiedFundedPreset) => {
    setSelectedPreset(preset);
    setSelectedPresetId(preset.id);
    setBrokerOrProvider(preset.firmName);
    setAccountSize(preset.accountSize.toString());
    setCurrency(preset.currency);
    setDrawdownType(preset.drawdownType);
    setTrailingBasis(preset.trailingBasis);
    setUnrealizedProfitAffectsTrailing(preset.unrealizedProfitAffectsTrailing);
    setLockAtStartingBalance(preset.lockAtStartingBalance);
    setDailyCalculationMethod(preset.dailyDrawdownCalculation);
    setDailyResetTime(preset.dailyResetTime);
    setTimezone(preset.timezone);
  };

  // Card select handler
  const handleSelectAccountKind = (kind: AccountKind) => {
    setSelectedKind(kind);
    if (kind === 'DEMO') {
      setAccountNickname('My Demo Account');
      setBrokerOrProvider('Simulated Sandbox');
      setAccountSize('5000');
      setMaxRiskPerTradePct(1.0);
      setTargetRiskPerTradePct(0.5);
      setPersonalDailyLossCapPct(4.0);
    } else if (kind === 'PERSONAL') {
      setAccountNickname('Live Personal Account');
      setBrokerOrProvider('MetaTrader 5 Broker');
      setAccountSize('10000');
      setMaxRiskPerTradePct(1.0);
      setTargetRiskPerTradePct(0.5);
      setPersonalDailyLossCapPct(3.0);
    } else {
      setAccountNickname('Funded Evaluation');
      handleSelectPreset(VERIFIED_FUNDED_PRESETS[2]); // FTMO 100k
    }
    setCurrentStep(1);
  };

  // Step Validator
  const validateStep = (step: number): boolean => {
    setValidationError(null);
    if (step === 1) {
      if (!accountNickname.trim()) {
        setValidationError('Please provide a descriptive account nickname.');
        return false;
      }
      const sizeNum = parseFloat(accountSize);
      if (isNaN(sizeNum) || sizeNum <= 0) {
        setValidationError('Account size must be a positive number.');
        return false;
      }
    } else if (step === 2 && selectedKind === 'FUNDED') {
      if (ruleConfigMethod === 'MANUAL') {
        if (!brokerOrProvider.trim()) {
          setValidationError('Please enter the name of the funding provider or prop firm.');
          return false;
        }
        if (manualDailyLossPct <= 0 || manualOverallLossPct <= 0) {
          setValidationError('Daily loss limit and overall loss limit must be greater than zero.');
          return false;
        }
      }
    } else if (step === 4) {
      if (targetRiskPerTradePct > maxRiskPerTradePct) {
        setValidationError('Preferred risk per trade cannot exceed the maximum personal risk limit.');
        return false;
      }
    } else if (step === 5) {
      if (!userConfirmedRules) {
        setValidationError('You must confirm the displayed account rules and loss boundaries to proceed.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(5, prev + 1));
    }
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  // Final submit handler
  const handleCreateAccount = () => {
    if (!validateStep(5)) return;

    const sizeNum = Math.max(100, parseFloat(accountSize) || 5000);
    const selectedCurr =
      currency === 'Custom' ? (customCurrency.trim().toUpperCase() || 'USD') : currency;

    const baseAccount: AccountSettings = {
      id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      traderName: 'STUDENT TRADER',
      accountName: accountNickname.trim(),
      accountKind: selectedKind,
      accountCategory: selectedKind,
      accountType:
        selectedKind === 'DEMO'
          ? 'DEMO'
          : selectedKind === 'PERSONAL'
          ? 'PERSONAL_LIVE'
          : fundedPhase === 'FUNDED_LIVE'
          ? 'PROP_FIRM_FUNDED'
          : 'PROP_FIRM_EVALUATION',
      initialBalance: sizeNum,
      currentBalance: sizeNum,
      currentEquity: sizeNum,
      broker: brokerOrProvider.trim() || (selectedKind === 'DEMO' ? 'Demo Sandbox' : 'Self-Directed'),
      currency: selectedCurr,
      maxDailyLossPercent: personalDailyLossCapPct,
      maxDrawdownPercent: selectedKind === 'FUNDED' ? (ruleConfigMethod === 'PRESET' ? selectedPreset.overallDrawdownPct : manualOverallLossPct) : 10,
      maxDailyTrades,
      targetRiskPerTradePercent: targetRiskPerTradePct,
      maxRiskPerTradePercent: maxRiskPerTradePct,
      isDemo: selectedKind === 'DEMO',
      isManual: true,
      syncStatus: 'MANUAL',
      preferredInstruments,
      consecutiveLossProtection,
      personalDrawdownBufferPercent: safetyBufferPercent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (selectedKind === 'FUNDED') {
      const isPreset = ruleConfigMethod === 'PRESET';
      const dailyLossPct = isPreset ? selectedPreset.dailyDrawdownPct : manualDailyLossPct;
      const overallLossPct = isPreset ? selectedPreset.overallDrawdownPct : manualOverallLossPct;
      const p1Target = isPreset ? selectedPreset.phase1TargetPct : manualPhase1TargetPct;
      const p2Target = isPreset ? selectedPreset.phase2TargetPct : manualPhase2TargetPct;

      const fundedCfg: FundedAccountConfig = {
        ...createDefaultFundedConfig(sizeNum, brokerOrProvider, fundedPhase),
        enabled: true,
        firmName: brokerOrProvider || (isPreset ? selectedPreset.firmName : 'Prop Firm'),
        accountName: accountNickname,
        accountSize: sizeNum,
        startingBalance: sizeNum,
        phase: fundedPhase,
        dailyDrawdownPercent: dailyLossPct,
        dailyDrawdownDollars: Number(((sizeNum * dailyLossPct) / 100).toFixed(2)),
        overallDrawdownPercent: overallLossPct,
        overallDrawdownDollars: Number(((sizeNum * overallLossPct) / 100).toFixed(2)),
        drawdownType: isPreset ? selectedPreset.drawdownType : drawdownType,
        trailingConfig: {
          trailingBasis: isPreset ? selectedPreset.trailingBasis : trailingBasis,
          unrealizedProfitAffectsTrailing: isPreset
            ? selectedPreset.unrealizedProfitAffectsTrailing
            : unrealizedProfitAffectsTrailing,
          lockAtStartingBalance: isPreset ? selectedPreset.lockAtStartingBalance : lockAtStartingBalance,
          activationLevelProfitDollars: 0,
        },
        profitTargets: {
          phase1TargetPercent: p1Target,
          phase1TargetDollars: Number(((sizeNum * p1Target) / 100).toFixed(2)),
          phase2TargetPercent: p2Target,
          phase2TargetDollars: Number(((sizeNum * p2Target) / 100).toFixed(2)),
        },
        preferredRiskPercent: targetRiskPerTradePct,
        maxRiskPerTradePercent: maxRiskPerTradePct,
        safetyBufferPercent,
        minimumTradingDays: isPreset ? selectedPreset.minimumTradingDays : 3,
        dailyResetTime,
        rulesProfileName: isPreset ? selectedPreset.ruleProfileVersion : 'CUSTOM-MANUAL-v1',
      };

      baseAccount.fundedConfig = fundedCfg;
      baseAccount.ruleProfileVersion = isPreset ? selectedPreset.ruleProfileVersion : 'CUSTOM-MANUAL-v1';
      baseAccount.ruleVerificationStatus = isPreset ? selectedPreset.verificationStatus : 'UNVERIFIED';
      baseAccount.officialSourceUrl = isPreset ? selectedPreset.officialSourceUrl : manualSourceUrl;
      baseAccount.lastRuleVerificationDate = isPreset ? selectedPreset.lastVerificationDate : new Date().toISOString().slice(0, 10);
      baseAccount.calculationMethodology = isPreset ? selectedPreset.calculationMethodology : 'Manual user-reported configuration';
      baseAccount.knownLimitations = isPreset ? selectedPreset.knownLimitations : ['User-configured rules must be audited against official prop firm documentation.'];
    }

    onAccountCreated(baseAccount);
  };

  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all text-slate-100">
      {/* Top Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <span className="font-semibold text-cyan-400">Prime Pip FX Command Center</span>
            <span>·</span>
            <span>Account Architecture</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-0.5">
            Set Up Your Trading Account
          </h2>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-200 transition px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Stepper (Only visible during steps 1-5) */}
      {currentStep > 0 && (
        <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition-colors ${
                    currentStep === s
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                      : currentStep > s
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {currentStep > s ? '✓' : s}
                </span>
                <span
                  className={`hidden sm:inline font-medium ${
                    currentStep === s ? 'text-slate-200 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {s === 1
                    ? 'Identity'
                    : s === 2
                    ? 'Rules'
                    : s === 3
                    ? 'Drawdown'
                    : s === 4
                    ? 'Risk Prefs'
                    : 'Confirm'}
                </span>
                {s < 5 && <span className="text-slate-600 mx-1">·</span>}
              </div>
            ))}
          </div>
          <span className="text-slate-400 font-sans">
            Step {currentStep} of 5
          </span>
        </div>
      )}

      {/* Main Body */}
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
            STEP 0: THREE VISUALLY DISTINCT ACCOUNT SELECTION CARDS
            ========================================================================= */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              Choose the type of trading account you want to manage. Prime Pip FX will personalize your dashboard, risk calculations, progress tracking, and trading guidance according to your account.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* CARD A — DEMO ACCOUNT */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 flex flex-col justify-between transition group shadow-lg hover:shadow-cyan-500/10">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3.5">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-cyan-300 transition">
                    Demo Account
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Practice your trading strategy in a simulated environment without risking real trading capital.
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Starting Balance</span>
                      <span className="font-semibold text-slate-200">Virtual $5,000+</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Capital Risk</span>
                      <span className="text-emerald-400 font-medium">Zero Capital at Risk</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Risk Guidance</span>
                      <span className="text-slate-200">Personal Discipline Limits</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Account Reset</span>
                      <span className="text-cyan-400 font-medium">1-Click Reset Supported</span>
                    </div>
                  </div>

                  <div className="mt-4 p-2.5 rounded-lg bg-slate-900 border border-slate-800/60 text-[11px] text-slate-400 leading-normal">
                    <span className="text-slate-300 font-medium">Simulated Execution Caveat:</span> Simulated trading does not reproduce slippage, partial fills, or psychological stress of live capital. Never treat simulated profits as actual earnings.
                  </div>
                </div>

                <button
                  onClick={() => handleSelectAccountKind('DEMO')}
                  className="mt-5 w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20"
                >
                  Create Demo Account
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CARD B — PERSONAL TRADING ACCOUNT */}
              <div className="bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-5 flex flex-col justify-between transition group shadow-lg hover:shadow-emerald-500/10">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3.5">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-emerald-300 transition">
                    Personal Account
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Manage your own trading account with personalized position sizing, risk limits, performance analytics, and trading discipline tools.
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Capital Source</span>
                      <span className="font-semibold text-slate-200">Self-Directed Private</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Broker Support</span>
                      <span className="text-slate-200">MT5, Exness, IC, Any</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Risk Guard</span>
                      <span className="text-emerald-400 font-medium">Custom Risk % & Daily Cap</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Provenance</span>
                      <span className="text-slate-200">Manually Reported / Synced</span>
                    </div>
                  </div>

                  <div className="mt-4 p-2.5 rounded-lg bg-slate-900 border border-slate-800/60 text-[11px] text-slate-400 leading-normal">
                    <span className="text-slate-300 font-medium">Integration Notice:</span> Personal risk limits are user-defined. Prime Pip FX does not hold direct custody or broker execution control unless authorized.
                  </div>
                </div>

                <button
                  onClick={() => handleSelectAccountKind('PERSONAL')}
                  className="mt-5 w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  Create Personal Account
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* CARD C — FUNDED TRADING ACCOUNT */}
              <div className="bg-slate-950/80 border border-purple-500/30 hover:border-purple-500/60 rounded-xl p-5 flex flex-col justify-between transition group shadow-lg hover:shadow-purple-500/10 relative">
                <div className="absolute top-3 right-3 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  Prop Rules Engine
                </div>
                <div>
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3.5">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-purple-300 transition">
                    Funded Account
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Track your funded trading evaluation or funded account using its specific rules. Understand your remaining drawdown capacity, permitted risk, profit-target progress, and next steps.
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Presets</span>
                      <span className="font-semibold text-purple-300">FTMO, Topstep, FN, Apex</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Drawdown Logic</span>
                      <span className="text-slate-200">Daily EOD / Equity / Trailing</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Decision Engine</span>
                      <span className="text-emerald-400 font-medium">TAKE · REDUCE · STOP · REVIEW</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rule Presets</span>
                      <span className="text-purple-300 font-medium">Verified Official Sources</span>
                    </div>
                  </div>

                  <div className="mt-4 p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-200/90 leading-normal">
                    <span className="font-semibold text-purple-300">Important Disclaimer:</span> Funded-account rules vary by provider and account product. Prime Pip FX must verify or explicitly confirm the applicable rules before providing account-specific risk guidance.
                  </div>
                </div>

                <button
                  onClick={() => handleSelectAccountKind('FUNDED')}
                  className="mt-5 w-full py-2.5 px-4 bg-purple-500 hover:bg-purple-400 text-slate-950 font-semibold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
                >
                  Configure Funded Account
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 1: ACCOUNT IDENTITY
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-5 max-w-xl">
            <div>
              <h3 className="text-base font-bold text-slate-100">Step 1 — Account Identity</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your account's primary identifiers and balance standards. Nicknames allow seamless switching between multiple active accounts.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Account Nickname
                </label>
                <input
                  type="text"
                  value={accountNickname}
                  onChange={(e) => setAccountNickname(e.target.value)}
                  placeholder="e.g. London Session Account, FTMO 100K Phase 1"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-sans"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Examples: London Session Account, My Demo Account, Funded Evaluation, Live Forex Account
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {selectedKind === 'FUNDED' ? 'Prop Firm / Provider' : 'Broker / Platform'}
                  </label>
                  <input
                    type="text"
                    value={brokerOrProvider}
                    onChange={(e) => setBrokerOrProvider(e.target.value)}
                    placeholder={selectedKind === 'FUNDED' ? 'e.g. FTMO, Topstep' : 'e.g. IC Markets, Exness'}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

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
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="PKR">PKR (₨)</option>
                    <option value="Custom">Custom Currency</option>
                  </select>
                </div>
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
                    placeholder="e.g. CAD, AUD, JPY"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Starting Account Balance ({currency})
                  </label>
                  <input
                    type="number"
                    value={accountSize}
                    onChange={(e) => setAccountSize(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                {selectedKind === 'FUNDED' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Account Phase
                    </label>
                    <select
                      value={fundedPhase}
                      onChange={(e) => setFundedPhase(e.target.value as FundedPhase)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="PHASE_1">Phase 1 (Evaluation)</option>
                      <option value="PHASE_2">Phase 2 (Verification)</option>
                      <option value="PHASE_3">Phase 3 (Final Stage)</option>
                      <option value="FUNDED_LIVE">Funded Live / Master</option>
                      <option value="INSTANT_FUNDED">Instant Funded</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: ACCOUNT RULES (FUNDED PRESETS OR PERSONAL LIMITS)
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100">Step 2 — Account Rules</h3>
              <p className="text-xs text-slate-400 mt-1">
                {selectedKind === 'FUNDED'
                  ? 'Select an authentic verified prop firm rule profile or configure custom rules directly from official firm documentation.'
                  : 'Configure baseline personal risk standards and guidelines for this self-directed account.'}
              </p>
            </div>

            {selectedKind === 'FUNDED' ? (
              <div className="space-y-5">
                {/* Method selector: Verified Preset vs Manual */}
                <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-lg max-w-md">
                  <button
                    onClick={() => setRuleConfigMethod('PRESET')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition ${
                      ruleConfigMethod === 'PRESET'
                        ? 'bg-purple-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Select Verified Preset
                  </button>
                  <button
                    onClick={() => setRuleConfigMethod('MANUAL')}
                    className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition ${
                      ruleConfigMethod === 'MANUAL'
                        ? 'bg-purple-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Configure Manually
                  </button>
                </div>

                {ruleConfigMethod === 'PRESET' ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-300">
                      Verified Prop Firm Presets
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                      {VERIFIED_FUNDED_PRESETS.map((preset) => (
                        <div
                          key={preset.id}
                          onClick={() => handleSelectPreset(preset)}
                          className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                            selectedPresetId === preset.id
                              ? 'bg-purple-950/40 border-purple-500 text-slate-100 shadow-md shadow-purple-500/10'
                              : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-slate-100 block">
                                {preset.accountProduct}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {preset.challengeType} · {preset.timezone}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
                              VERIFIED
                            </span>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">Daily DD</span>
                              <span className="font-semibold text-slate-200 font-mono">
                                {preset.dailyDrawdownPct}% (${formatCurrency((preset.accountSize * preset.dailyDrawdownPct) / 100, preset.currency)})
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Max Loss</span>
                              <span className="font-semibold text-slate-200 font-mono">
                                {preset.overallDrawdownPct}% (${formatCurrency((preset.accountSize * preset.overallDrawdownPct) / 100, preset.currency)})
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Selected Preset Details Panel */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-purple-300">
                          {selectedPreset.firmName} — {selectedPreset.ruleProfileVersion}
                        </span>
                        <a
                          href={selectedPreset.officialSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px]"
                        >
                          Official Rules
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-slate-300 leading-relaxed">
                        {selectedPreset.calculationMethodology}
                      </p>
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-900 flex flex-wrap gap-x-4">
                        <span>Last Verified: {selectedPreset.lastVerificationDate}</span>
                        <span>Effective: {selectedPreset.effectiveDate}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Manual configuration with unverified notice */
                  <div className="space-y-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Unverified Profile Notice</span>
                        <span>
                          Custom manual profiles are tagged <strong>Unverified</strong> until audited against the provider's official documentation. Prime Pip FX requires verified loss limits to prevent accidental breach.
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Daily Loss Limit (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={manualDailyLossPct}
                          onChange={(e) => setManualDailyLossPct(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Maximum Overall Drawdown (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={manualOverallLossPct}
                          onChange={(e) => setManualOverallLossPct(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Phase 1 Profit Target (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={manualPhase1TargetPct}
                          onChange={(e) => setManualPhase1TargetPct(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Phase 2 Profit Target (%)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={manualPhase2TargetPct}
                          onChange={(e) => setManualPhase2TargetPct(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Official Provider Documentation URL
                      </label>
                      <input
                        type="url"
                        value={manualSourceUrl}
                        onChange={(e) => setManualSourceUrl(e.target.value)}
                        placeholder="https://provider.com/rules"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Demo / Personal Account Rules Setup */
              <div className="space-y-4 max-w-xl">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Maximum Personal Loss Limit Per Day (%)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={personalDailyLossCapPct}
                      onChange={(e) => setPersonalDailyLossCapPct(parseFloat(e.target.value) || 3)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Recommended discipline ceiling is 3.0% to prevent tilt and overtrading.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Maximum Planned Trades Per Day
                    </label>
                    <input
                      type="number"
                      value={maxDailyTrades}
                      onChange={(e) => setMaxDailyTrades(parseInt(e.target.value) || 2)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 font-mono"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Restricting executions to 2 high-probability trades daily preserves psychological capital.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STEP 3: DRAWDOWN CONFIGURATION (PLAIN ENGLISH EXPLANATIONS)
            ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100">Step 3 — Drawdown Configuration</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure the exact loss boundaries and reset mechanics governing your account. Each calculation formula is explained in plain English below.
              </p>
            </div>

            {/* Plain English Guide Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="font-bold text-slate-200 block">Daily Drawdown</span>
                <span className="text-slate-400 mt-0.5 block leading-relaxed">
                  How much loss is permitted during the provider's defined trading day before trading is restricted.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="font-bold text-slate-200 block">Maximum Overall Drawdown</span>
                <span className="text-slate-400 mt-0.5 block leading-relaxed">
                  How much can the account lose from starting balance or high-water mark before reaching liquidation boundary.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="font-bold text-slate-200 block">Static vs. Trailing Floor</span>
                <span className="text-slate-400 mt-0.5 block leading-relaxed">
                  <strong>Static:</strong> Fixed boundary from initial reference. <strong>Trailing:</strong> Floor moves up with closed or unrealized profits.
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <span className="font-bold text-slate-200 block">End-of-Day Trailing</span>
                <span className="text-slate-400 mt-0.5 block leading-relaxed">
                  A trailing boundary that updates strictly at the close of trading (e.g. 17:00 CT), ignoring intraday floating spikes.
                </span>
              </div>
            </div>

            {/* Drawdown Parameters Form */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Drawdown Calculation Base
                  </label>
                  <select
                    value={dailyCalculationMethod}
                    onChange={(e) => setDailyCalculationMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"
                  >
                    <option value="HIGHER_OF_BALANCE_EQUITY">
                      Higher of Balance or Equity (FTMO Standard)
                    </option>
                    <option value="BALANCE_BASED">
                      Balance-Based (FundedNext, Alpha Pro)
                    </option>
                    <option value="EQUITY_BASED">
                      Strict Live Equity
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Drawdown Floor Movement Type
                  </label>
                  <select
                    value={drawdownType}
                    onChange={(e) => setDrawdownType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"
                  >
                    <option value="STATIC">Static Floor (Fixed at initial balance - DD)</option>
                    <option value="END_OF_DAY">End-of-Day Trailing (Topstep style)</option>
                    <option value="INTRADAY">Live Intraday Peak Trailing (Apex style)</option>
                    <option value="EQUITY_BASED">Equity-Based Dynamic</option>
                    <option value="BALANCE_BASED">Balance-Based Closed Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Daily Reset Time & Rule
                  </label>
                  <input
                    type="text"
                    value={dailyResetTime}
                    onChange={(e) => setDailyResetTime(e.target.value)}
                    placeholder="e.g. 00:00 CE(S)T or 17:00 CT"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Provider Timezone Reference
                  </label>
                  <input
                    type="text"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="e.g. Europe/Prague or UTC+3"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100"
                  />
                </div>
              </div>

              {/* Toggles for Drawdown Specifics */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={floatingLossesCount}
                    onChange={(e) => setFloatingLossesCount(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-slate-300">
                    Open floating losses count against daily and overall loss limits (Standard Prop Rule)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feesCountTowardsLoss}
                    onChange={(e) => setFeesCountTowardsLoss(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-slate-300">
                    Trading commissions, spreads, and overnight swap fees count towards loss boundaries
                  </span>
                </label>

                {drawdownType !== 'STATIC' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lockAtStartingBalance}
                      onChange={(e) => setLockAtStartingBalance(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-slate-300">
                      Trailing floor locks permanently once it reaches starting balance
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 4: PERSONAL RISK PREFERENCES
            ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100">Step 4 — Personal Risk Preferences</h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your personal safety buffers. Prime Pip FX clearly distinguishes between the provider's legal ceiling, your personal targets, and the engine's recommended risk budget.
              </p>
            </div>

            {/* Three-Tier Risk Distinction Callout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block font-sans">1. Provider Permitted Loss</span>
                <span className="font-bold text-rose-400 text-sm mt-0.5 block font-mono">
                  {selectedKind === 'FUNDED' ? '4.0% - 5.0% Max Loss' : '10.0% Hard Floor'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Hard breach limit. Crossing triggers liquidation.
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">2. Personal Risk Limit</span>
                <span className="font-bold text-amber-400 text-sm mt-0.5 block font-mono">
                  {maxRiskPerTradePct}% Per Trade
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Your self-imposed risk ceiling per execution.
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">3. Recommended Budget</span>
                <span className="font-bold text-emerald-400 text-sm mt-0.5 block font-mono">
                  {targetRiskPerTradePct}% (Strictest Applied)
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Calibrated budget with {safetyBufferPercent}% buffer applied.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Target Risk Per Trade (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={targetRiskPerTradePct}
                    onChange={(e) => setTargetRiskPerTradePct(parseFloat(e.target.value) || 0.5)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Recommended: 0.25% - 0.5% on funded accounts to endure streak variance.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Maximum Personal Risk Ceiling (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={maxRiskPerTradePct}
                    onChange={(e) => setMaxRiskPerTradePct(parseFloat(e.target.value) || 1.0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Hard personal cutoff. System will flag REDUCE/STOP if proposed risk exceeds this.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Drawdown Safety Buffer (%)
                  </label>
                  <input
                    type="number"
                    step="5"
                    value={safetyBufferPercent}
                    onChange={(e) => setSafetyBufferPercent(parseInt(e.target.value) || 20)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Keeps 20% of remaining daily loss allowance untouchable to guard against slippage.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Max Daily Trades Cap
                  </label>
                  <input
                    type="number"
                    value={maxDailyTrades}
                    onChange={(e) => setMaxDailyTrades(parseInt(e.target.value) || 2)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 font-mono"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Limits execution frequency to prevent overtrading and revenge trading.
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={consecutiveLossProtection}
                    onChange={(e) => setConsecutiveLossProtection(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-slate-300">
                    Enable Consecutive-Loss Circuit Breaker (Automatically down-sizes risk after 1, 2, or 3 consecutive losses)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 5: REVIEW AND CONFIRM
            ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-100">Step 5 — Review and Confirm</h3>
              <p className="text-xs text-slate-400 mt-1">
                Please audit the complete configuration below before activating this account. This profile and rule version are saved to ensure reproducible, auditable risk calculations.
              </p>
            </div>

            {/* Comprehensive Review Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <span className="text-slate-500 block">Account Nickname</span>
                  <span className="font-bold text-slate-100 mt-0.5 block">{accountNickname}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Type</span>
                  <span className="font-semibold text-cyan-400 mt-0.5 block">
                    {selectedKind === 'DEMO'
                      ? 'Simulated Demo'
                      : selectedKind === 'PERSONAL'
                      ? 'Personal Live'
                      : 'Funded Challenge'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Account Size</span>
                  <span className="font-bold text-slate-100 font-mono mt-0.5 block">
                    {formatCurrency(parseFloat(accountSize) || 5000, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Provider / Broker</span>
                  <span className="font-semibold text-slate-200 mt-0.5 block">
                    {brokerOrProvider || 'Simulated'}
                  </span>
                </div>
              </div>

              {selectedKind === 'FUNDED' && (
                <div className="space-y-2 py-2 border-b border-slate-800/80">
                  <div className="flex items-center justify-between text-purple-300 font-semibold">
                    <span>Funded Rule Profile: {ruleConfigMethod === 'PRESET' ? selectedPreset.ruleProfileVersion : 'Custom Manual'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {ruleConfigMethod === 'PRESET' ? selectedPreset.verificationStatus : 'UNVERIFIED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Daily DD Boundary</span>
                      <span className="font-mono text-slate-100 font-semibold">
                        {ruleConfigMethod === 'PRESET' ? selectedPreset.dailyDrawdownPct : manualDailyLossPct}% (${formatCurrency(((parseFloat(accountSize) || 5000) * (ruleConfigMethod === 'PRESET' ? selectedPreset.dailyDrawdownPct : manualDailyLossPct)) / 100, currency)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Max Overall DD</span>
                      <span className="font-mono text-slate-100 font-semibold">
                        {ruleConfigMethod === 'PRESET' ? selectedPreset.overallDrawdownPct : manualOverallLossPct}% (${formatCurrency(((parseFloat(accountSize) || 5000) * (ruleConfigMethod === 'PRESET' ? selectedPreset.overallDrawdownPct : manualOverallLossPct)) / 100, currency)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Floor Type</span>
                      <span className="font-mono text-slate-100">
                        {ruleConfigMethod === 'PRESET' ? selectedPreset.drawdownType : drawdownType}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phase Target</span>
                      <span className="font-mono text-slate-100">
                        {ruleConfigMethod === 'PRESET' ? selectedPreset.phase1TargetPct : manualPhase1TargetPct}% Target
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 block">Personal Target Risk</span>
                  <span className="font-mono font-semibold text-emerald-400">
                    {targetRiskPerTradePct}% (${formatCurrency(((parseFloat(accountSize) || 5000) * targetRiskPerTradePct) / 100, currency)})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Maximum Planned Risk</span>
                  <span className="font-mono font-semibold text-amber-400">
                    {maxRiskPerTradePct}% (${formatCurrency(((parseFloat(accountSize) || 5000) * maxRiskPerTradePct) / 100, currency)})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Safety Cushion Buffer</span>
                  <span className="font-mono font-semibold text-cyan-400">
                    {safetyBufferPercent}% Untouchable
                  </span>
                </div>
              </div>

              {/* Legal Confirmation Checkbox */}
              <div className="pt-3 border-t border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={userConfirmedRules}
                    onChange={(e) => setUserConfirmedRules(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-slate-300 text-xs leading-relaxed">
                    I confirm that the displayed account identity, loss boundaries, and personal risk preferences accurately reflect my trading objectives. I understand that Prime Pip FX provides deterministic risk compliance guidance and does not guarantee market profitability.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          {currentStep > 0 ? (
            <button
              onClick={handleBack}
              className="py-2 px-4 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep > 0 && currentStep < 5 && (
            <button
              onClick={handleNext}
              className="py-2.5 px-5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
            >
              Continue to Step {currentStep + 1}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {currentStep === 5 && (
            <button
              onClick={handleCreateAccount}
              disabled={!userConfirmedRules}
              className={`py-2.5 px-6 rounded-lg font-semibold text-xs transition flex items-center gap-2 shadow-lg ${
                userConfirmedRules
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              Save and Activate Account
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
