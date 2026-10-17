import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  AccountSettings,
  AccountKind,
  FundedAccountConfig,
  FundedPhase,
} from '../../types';
import {
  VERIFIED_FUNDED_PRESETS,
  VerifiedFundedPreset,
} from '../../data/verifiedFundedPresets';
import { createDefaultFundedConfig } from '../../utils/fundedRiskEngine';

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
  // Step navigation: 0 = Pick Account Type, 1 = Simple Setup & Confirm
  const [currentStep, setCurrentStep] = useState<number>(initialKind ? 1 : 0);
  const [selectedKind, setSelectedKind] = useState<AccountKind>(initialKind || 'DEMO');

  // Simple Account Details
  const [accountNickname, setAccountNickname] = useState('My Trading Account');
  const [brokerOrProvider, setBrokerOrProvider] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [accountSize, setAccountSize] = useState<string>('10000');
  const [fundedPhase, setFundedPhase] = useState<FundedPhase>('PHASE_1');

  // Prop firm preset (if funded selected)
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ftmo_100k_standard');
  const [selectedPreset, setSelectedPreset] = useState<VerifiedFundedPreset>(
    VERIFIED_FUNDED_PRESETS[2] // FTMO 100k default
  );

  // Simple Risk Preference
  const [riskPerTradePct, setRiskPerTradePct] = useState<number>(1.0);
  const [dailyLossCapPct, setDailyLossCapPct] = useState<number>(4.0);
  const [validationError, setValidationError] = useState<string | null>(null);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Card select handler
  const handleSelectAccountKind = (kind: AccountKind) => {
    setSelectedKind(kind);
    setValidationError(null);

    if (kind === 'DEMO') {
      setAccountNickname('My Demo Account');
      setBrokerOrProvider('Simulated Sandbox');
      setCurrency('USD');
      setAccountSize('10000');
      setRiskPerTradePct(1.0);
      setDailyLossCapPct(4.0);
    } else if (kind === 'CENT') {
      setAccountNickname('Live Cent Account');
      setBrokerOrProvider('MetaTrader 5 Cent Broker');
      setCurrency('USC');
      setAccountSize('10000');
      setRiskPerTradePct(1.0);
      setDailyLossCapPct(4.0);
    } else if (kind === 'PERSONAL') {
      setAccountNickname('Personal Live Account');
      setBrokerOrProvider('IC Markets / Exness');
      setCurrency('USD');
      setAccountSize('5000');
      setRiskPerTradePct(1.0);
      setDailyLossCapPct(3.0);
    } else {
      setAccountNickname('Funded Challenge');
      setBrokerOrProvider(selectedPreset.firmName);
      setCurrency(selectedPreset.currency);
      setAccountSize(selectedPreset.accountSize.toString());
      setRiskPerTradePct(0.5);
      setDailyLossCapPct(selectedPreset.dailyDrawdownPct);
    }

    setCurrentStep(1);
  };

  const handleSelectPreset = (presetId: string) => {
    const found = VERIFIED_FUNDED_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setSelectedPreset(found);
      setSelectedPresetId(found.id);
      setBrokerOrProvider(found.firmName);
      setAccountSize(found.accountSize.toString());
      setCurrency(found.currency);
      setDailyLossCapPct(found.dailyDrawdownPct);
    }
  };

  const handleCreate = () => {
    setValidationError(null);

    if (!accountNickname.trim()) {
      setValidationError('Please enter a nickname for this account.');
      return;
    }

    const sizeNum = parseFloat(accountSize);
    if (isNaN(sizeNum) || sizeNum <= 0) {
      setValidationError('Please enter a valid starting balance.');
      return;
    }

    const isCent = selectedKind === 'CENT' || currency === 'USC' || currency === 'CENT';

    const baseAccount: AccountSettings = {
      id: `acc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      traderName: 'STUDENT TRADER',
      accountName: accountNickname.trim(),
      accountKind: selectedKind,
      accountCategory: selectedKind === 'FUNDED' ? 'FUNDED' : 'PERSONAL',
      accountType:
        isCent
          ? 'CENT_ACCOUNT'
          : selectedKind === 'DEMO'
          ? 'DEMO'
          : selectedKind === 'PERSONAL'
          ? 'PERSONAL_LIVE'
          : fundedPhase === 'FUNDED_LIVE'
          ? 'PROP_FIRM_FUNDED'
          : 'PROP_FIRM_EVALUATION',
      isCentAccount: isCent,
      initialBalance: sizeNum,
      currentBalance: sizeNum,
      currentEquity: sizeNum,
      broker:
        brokerOrProvider.trim() ||
        (selectedKind === 'DEMO'
          ? 'Demo Sandbox'
          : isCent
          ? 'MetaTrader 5 Cent Broker'
          : 'Self-Directed'),
      currency,
      maxDailyLossPercent: dailyLossCapPct,
      maxDrawdownPercent: selectedKind === 'FUNDED' ? selectedPreset.overallDrawdownPct : 10,
      maxDailyTrades: 2,
      targetRiskPerTradePercent: riskPerTradePct,
      maxRiskPerTradePercent: riskPerTradePct * 1.5,
      isDemo: selectedKind === 'DEMO',
      isManual: true,
      syncStatus: 'MANUAL',
      preferredInstruments: ['XAUUSD', 'EURUSD', 'GBPUSD'],
      consecutiveLossProtection: true,
      personalDrawdownBufferPercent: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (selectedKind === 'FUNDED') {
      const fundedCfg: FundedAccountConfig = {
        ...createDefaultFundedConfig(sizeNum, brokerOrProvider || selectedPreset.firmName, fundedPhase),
        enabled: true,
        firmName: brokerOrProvider || selectedPreset.firmName,
        accountName: accountNickname,
        accountSize: sizeNum,
        startingBalance: sizeNum,
        phase: fundedPhase,
        dailyDrawdownPercent: selectedPreset.dailyDrawdownPct,
        dailyDrawdownDollars: Number(((sizeNum * selectedPreset.dailyDrawdownPct) / 100).toFixed(2)),
        overallDrawdownPercent: selectedPreset.overallDrawdownPct,
        overallDrawdownDollars: Number(((sizeNum * selectedPreset.overallDrawdownPct) / 100).toFixed(2)),
        drawdownType: selectedPreset.drawdownType,
        trailingConfig: {
          trailingBasis: selectedPreset.trailingBasis,
          unrealizedProfitAffectsTrailing: selectedPreset.unrealizedProfitAffectsTrailing,
          lockAtStartingBalance: selectedPreset.lockAtStartingBalance,
          activationLevelProfitDollars: 0,
        },
        profitTargets: {
          phase1TargetPercent: selectedPreset.phase1TargetPct,
          phase1TargetDollars: Number(((sizeNum * selectedPreset.phase1TargetPct) / 100).toFixed(2)),
          phase2TargetPercent: selectedPreset.phase2TargetPct,
          phase2TargetDollars: Number(((sizeNum * selectedPreset.phase2TargetPct) / 100).toFixed(2)),
        },
        preferredRiskPercent: riskPerTradePct,
        maxRiskPerTradePercent: riskPerTradePct * 1.5,
        safetyBufferPercent: 20,
        minimumTradingDays: selectedPreset.minimumTradingDays,
        dailyResetTime: selectedPreset.dailyResetTime,
        rulesProfileName: selectedPreset.ruleProfileVersion,
      };

      baseAccount.fundedConfig = fundedCfg;
      baseAccount.ruleProfileVersion = selectedPreset.ruleProfileVersion;
      baseAccount.ruleVerificationStatus = selectedPreset.verificationStatus;
      baseAccount.officialSourceUrl = selectedPreset.officialSourceUrl;
      baseAccount.lastRuleVerificationDate = selectedPreset.lastVerificationDate;
      baseAccount.calculationMethodology = selectedPreset.calculationMethodology;
      baseAccount.knownLimitations = selectedPreset.knownLimitations;
    }

    onAccountCreated(baseAccount);
  };

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all text-slate-100">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
            <span className="font-semibold text-cyan-400">Prime Pip FX</span>
            <span>·</span>
            <span>Simplified Account Setup</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight mt-0.5">
            {currentStep === 0 ? 'Select Your Account Type' : 'Account Parameters'}
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

      <div className="p-5 sm:p-6">
        {validationError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP 0: SELECT ACCOUNT TYPE */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Choose the account format you wish to configure. The terminal will automatically tailor all lot sizes, risk calculations, and discipline rules to your chosen account.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Option 1: Demo Sandbox */}
              <div
                onClick={() => handleSelectAccountKind('DEMO')}
                className="bg-slate-950/80 border border-slate-800 hover:border-cyan-400/60 p-4 rounded-xl cursor-pointer transition hover:bg-slate-900/60 group shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Compass className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                    RISK FREE
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition flex items-center gap-2">
                  <span>Demo Account</span>
                  <span className="text-[10px] text-cyan-400 font-normal">(Virtual Sandbox)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  Practice high-probability SBT models with virtual balance without risking live capital.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono-code text-cyan-400 font-semibold pt-2 border-t border-slate-800/80">
                  <span>Instant Setup</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Option 2: Live Cent Account */}
              <div
                onClick={() => handleSelectAccountKind('CENT')}
                className="bg-slate-950/80 border border-amber-500/40 hover:border-amber-400 p-4 rounded-xl cursor-pointer transition hover:bg-slate-900/60 group shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold font-mono text-base">
                    ¢
                  </div>
                  <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                    1 USD = 100¢
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition">
                  Cent Account (USC)
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  Live broker execution with micro-risk. Ideal for real psychology practice with cents.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono-code text-amber-400 font-semibold pt-2 border-t border-slate-800/80">
                  <span>Cent Lot Sizing</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Option 3: Personal Live Account */}
              <div
                onClick={() => handleSelectAccountKind('PERSONAL')}
                className="bg-slate-950/80 border border-slate-800 hover:border-emerald-400/60 p-4 rounded-xl cursor-pointer transition hover:bg-slate-900/60 group shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                    LIVE BROKER
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition flex items-center gap-2">
                  <span>Personal Account</span>
                  <span className="text-[10px] text-emerald-400 font-normal">(Live Broker)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  Standard broker account (USD, EUR, GBP) with daily trade and loss caps.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono-code text-emerald-400 font-semibold pt-2 border-t border-slate-800/80">
                  <span>Standard Sizing</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Option 4: Prop Firm / Funded Account */}
              <div
                onClick={() => handleSelectAccountKind('FUNDED')}
                className="bg-slate-950/80 border border-blue-500/40 hover:border-blue-400 p-4 rounded-xl cursor-pointer transition hover:bg-slate-900/60 group shadow-md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/15 text-cyan-300">
                    PRESET RULES
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition">
                  Prop Firm / Funded Challenge
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-snug">
                  FTMO, FundedNext, The5ers with automated drawdown and max loss limits.
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-mono-code text-blue-400 font-semibold pt-2 border-t border-slate-800/80">
                  <span>Drawdown Armor</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: CONCISE & INTUITIVE DETAILS */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono-code cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change Account Type ({selectedKind})
              </button>
              <span className="text-[11px] font-mono-code px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                {selectedKind === 'CENT'
                  ? 'CENT ACCOUNT (¢)'
                  : selectedKind === 'DEMO'
                  ? 'DEMO SANDBOX'
                  : selectedKind === 'FUNDED'
                  ? 'PROP FIRM'
                  : 'LIVE PERSONAL'}
              </span>
            </div>

            {/* Prop Firm Preset Quick-Selector */}
            {selectedKind === 'FUNDED' && (
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                <label className="text-xs font-mono-code text-cyan-300 font-bold uppercase block">
                  Select Prop Firm Preset:
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handleSelectPreset(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono-code text-white outline-none focus:border-cyan-400"
                >
                  {VERIFIED_FUNDED_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.accountProduct} (Daily Max: {p.dailyDrawdownPct}%, Overall: {p.overallDrawdownPct}%)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 font-sans">
                  Firm rules, trailing drawdown formulas, and profit targets are configured automatically.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account Nickname */}
              <div>
                <label className="block text-xs font-mono-code text-slate-300 font-bold mb-1.5 uppercase flex items-center justify-between">
                  <span>1. Account Nickname</span>
                  <span className="text-[10px] text-cyan-400 font-normal">Any label you like</span>
                </label>
                <input
                  type="text"
                  value={accountNickname}
                  onChange={(e) => setAccountNickname(e.target.value)}
                  placeholder="e.g. My Personal Account or Exness Cent"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white outline-none focus:border-cyan-400"
                />
              </div>

              {/* Broker / Firm */}
              <div>
                <label className="block text-xs font-mono-code text-slate-300 font-bold mb-1.5 uppercase flex items-center justify-between">
                  <span>2. Broker or Firm</span>
                  <span className="text-[10px] text-slate-400 font-normal">Select or type</span>
                </label>
                <input
                  type="text"
                  value={brokerOrProvider}
                  onChange={(e) => setBrokerOrProvider(e.target.value)}
                  placeholder="e.g. Exness, FTMO, IC Markets"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white outline-none focus:border-cyan-400"
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['Exness', 'IC Markets', 'FTMO', 'FundedNext', 'XM'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBrokerOrProvider(b)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-code cursor-pointer transition ${
                        brokerOrProvider === b
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Starting Balance */}
              <div>
                <label className="block text-xs font-mono-code text-slate-300 font-bold mb-1.5 uppercase flex items-center justify-between">
                  <span>3. Starting Balance</span>
                  <span className="text-[10px] text-emerald-400 font-normal">In {currency}</span>
                </label>
                <input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(e.target.value)}
                  placeholder="10000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white outline-none focus:border-cyan-400"
                />
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {['1000', '5000', '10000', '25000', '50000', '100000'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAccountSize(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-code cursor-pointer transition ${
                        accountSize === preset
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      ${parseInt(preset).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-xs font-mono-code text-slate-300 font-bold mb-1.5 uppercase">
                  4. Account Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono-code text-white outline-none focus:border-cyan-400"
                >
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="USC">USC (¢ - US Cents, 1 USD = 100¢)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  {currency === 'USC' ? '¢ Cent Account: $100 deposit displays as 10,000¢ for micro-lot sizing.' : 'Standard currency used for balances and profit calculation.'}
                </p>
              </div>

              {/* Risk Per Trade (Simplified Options) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono-code text-slate-300 font-bold mb-1.5 uppercase flex items-center justify-between">
                  <span>5. Risk Per Trade</span>
                  <span className="text-[10px] text-amber-300 font-normal">
                    {riskPerTradePct}% = ${( (parseFloat(accountSize) || 10000) * riskPerTradePct / 100 ).toFixed(0)} per setup
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { pct: 0.5, title: 'Conservative', desc: '0.5% max risk. Ideal for funded challenges.' },
                    { pct: 1.0, title: 'Standard (Recommended)', desc: '1.0% max risk. High discipline balance.' },
                    { pct: 2.0, title: 'Aggressive', desc: '2.0% max risk. For small accounts seeking fast growth.' },
                  ].map((tier) => (
                    <button
                      key={tier.pct}
                      type="button"
                      onClick={() => setRiskPerTradePct(tier.pct)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                        riskPerTradePct === tier.pct
                          ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/30'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-xs text-white">
                        <span>{tier.title}</span>
                        <span className="font-mono-code text-cyan-300">{tier.pct}%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-tight">{tier.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Crystal-Clear Live Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between gap-3 flex-wrap text-xs font-mono-code">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200">
                  Ready: <strong>{accountNickname || 'My Account'}</strong> • Balance: <strong>{parseFloat(accountSize || '10000').toLocaleString()} {currency}</strong> • Max Risk: <strong>{riskPerTradePct}% (${((parseFloat(accountSize || '10000') * riskPerTradePct) / 100).toFixed(0)})</strong>
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded font-bold">
                ✓ Auto-Calculated
              </span>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code cursor-pointer"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-military font-bold text-xs uppercase tracking-wider transition shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
              >
                <span>Complete Setup & Start Trading</span>
                <Check className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
