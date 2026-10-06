import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Crosshair, ArrowRight, DollarSign, Wallet, Building2, Check, AlertCircle } from 'lucide-react';
import { AccountSettings, AccountType, FundedAccountConfig } from '../types';
import { safeNumber } from '../utils/currencyFormatter';
import { createDefaultFundedConfig } from '../utils/fundedRiskEngine';
import { FundedAccountConfigPanel } from './FundedAccountConfigPanel';

interface AccountOnboardingModalProps {
  onAccountCreated: (account: AccountSettings) => void;
  onExploreDemo?: () => void;
  onOpenSignIn?: () => void;
  onOpenSendAccount?: () => void;
}

export const AccountOnboardingModal: React.FC<AccountOnboardingModalProps> = ({
  onAccountCreated,
  onExploreDemo,
  onOpenSignIn,
  onOpenSendAccount,
}) => {
  const [accountName, setAccountName] = useState('My Trading Account');
  const [startingBalance, setStartingBalance] = useState<string>('5000');
  const [currency, setCurrency] = useState('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [accountCategory, setAccountCategory] = useState<'PERSONAL' | 'FUNDED'>('PERSONAL');
  const [accountType, setAccountType] = useState<string>('Personal Account');
  const [broker, setBroker] = useState('');
  const [fundedConfig, setFundedConfig] = useState<FundedAccountConfig>(() =>
    createDefaultFundedConfig(5000, 'My Prop Firm')
  );
  const [error, setError] = useState<string | null>(null);
  const [isSendAccountOpen, setIsSendAccountOpen] = useState(false);
  const [sendName, setSendName] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const accountTypeOptions = [
    {
      id: 'Personal Account',
      label: 'Personal Account (USD)',
      sub: 'Private capital self-directed standard',
      mappedType: 'PERSONAL_LIVE' as AccountType,
      category: 'PERSONAL' as const,
    },
    {
      id: 'Cent Account',
      label: 'Cent Account (USC / ¢)',
      sub: 'Cent balance standard (100¢ = $1.00) micro lot tracking',
      mappedType: 'PERSONAL_LIVE' as AccountType,
      category: 'PERSONAL' as const,
    },
    {
      id: 'Prop Firm Challenge',
      label: 'Prop Firm Challenge',
      sub: 'Evaluation phase (FTMO, MFF, etc.)',
      mappedType: 'PROP_FIRM_EVALUATION' as AccountType,
      category: 'FUNDED' as const,
    },
    {
      id: 'Live Funded Account',
      label: 'Live Funded Account',
      sub: 'Passed evaluation with profit split',
      mappedType: 'PROP_FIRM_FUNDED' as AccountType,
      category: 'FUNDED' as const,
    },
    {
      id: 'Demo Account',
      label: 'Demo Account',
      sub: 'Practice simulation environment',
      mappedType: 'DEMO' as AccountType,
      category: 'PERSONAL' as const,
    },
  ];

  const currencyOptions = ['USD', 'Cent (USC)', 'EUR', 'GBP', 'PKR', 'Custom'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = accountName.trim();
    if (!name) {
      setError('Please enter a valid account name.');
      return;
    }

    const isFunded = accountCategory === 'FUNDED';
    const balanceNum = isFunded
      ? safeNumber(fundedConfig.startingBalance, safeNumber(startingBalance, -1))
      : safeNumber(startingBalance, -1);
    if (balanceNum <= 0) {
      setError('Please enter a positive starting balance (e.g. 5000).');
      return;
    }

    const selectedCurrency =
      currency === 'Custom' ? (customCurrency.trim().toUpperCase() || 'USD') : currency;

    const matchedType: AccountType = isFunded
      ? fundedConfig.phase === 'FUNDED_LIVE' || fundedConfig.phase === 'INSTANT_FUNDED'
        ? 'PROP_FIRM_FUNDED'
        : 'PROP_FIRM_EVALUATION'
      : accountTypeOptions.find((o) => o.id === accountType)?.mappedType || 'PERSONAL_LIVE';

    const finalizedFundedConfig: FundedAccountConfig | undefined = isFunded
      ? {
          ...fundedConfig,
          enabled: true,
          startingBalance: balanceNum,
          accountSize: fundedConfig.accountSize || balanceNum,
          firmName: fundedConfig.firmName || broker.trim() || 'My Prop Firm',
        }
      : undefined;

    const newAccount: AccountSettings = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      traderName: 'TRADER VIPER',
      accountName: name,
      accountType: matchedType,
      accountCategory: isFunded ? 'FUNDED' : 'PERSONAL',
      fundedConfig: finalizedFundedConfig,
      initialBalance: balanceNum,
      currentBalance: balanceNum,
      currentEquity: balanceNum,
      broker: isFunded
        ? finalizedFundedConfig?.firmName || broker.trim() || 'My Prop Firm'
        : broker.trim() || 'Direct Market Access',
      currency: selectedCurrency,
      maxDailyLossPercent: isFunded ? finalizedFundedConfig?.dailyDrawdownPercent || 4.0 : 4.0,
      maxDrawdownPercent: isFunded ? finalizedFundedConfig?.overallDrawdownPercent || 10.0 : 5.0,
      maxDailyTrades: 2,
      targetRiskPerTradePercent: isFunded ? finalizedFundedConfig?.preferredRiskPercent || 1.0 : 1.0,
      maxRiskPerTradePercent: isFunded ? finalizedFundedConfig?.maxRiskPerTradePercent || 1.0 : 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAccountCreated(newAccount);
  };

  // Body scroll lock while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm overflow-y-auto p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-slate-950 border border-blue-500/40 rounded-2xl shadow-2xl p-5 sm:p-7 overflow-hidden max-h-[90vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Radar ambient glow */}
        <div className="absolute -right-16 -top-16 w-36 h-36 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Tactical Header Badge */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-cyan-400 text-[10px] sm:text-[11px] font-mono-code font-bold uppercase tracking-widest">
            <Crosshair className="w-3.5 h-3.5" />
            INITIAL SYSTEM INITIALIZATION
          </span>
          <span className="text-[10px] sm:text-[11px] font-mono-code text-slate-400">
            OFFLINE-READY • ZERO CLOUD LOCK-IN
          </span>
        </div>

        {/* Titles */}
        <h1 className="text-lg sm:text-xl md:text-2xl font-military font-bold text-slate-100 tracking-wide">
          WELCOME TO PRIMEPIPFX TRADING COMMAND CENTER
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
          Create your first trading account to begin tracking your performance.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
              1. Account Name
            </label>
            <input
              type="text"
              required
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="e.g. My Trading Account"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono-code transition"
            />
          </div>

          {/* Starting Balance & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                2. Starting Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono-code text-sm font-bold">
                  {currency === 'PKR' ? '₨' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency.includes('Cent') || currency === 'USC' ? '¢' : '$'}
                </span>
                <input
                  type="number"
                  required
                  step="any"
                  min="1"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  placeholder={currency.includes('Cent') ? '100000' : '5000'}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono-code transition font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono-code mt-1 block">
                {currency.includes('Cent')
                  ? 'Cent standard: 100¢ = $1.00 USD. 100,000¢ represents $1,000 live equity.'
                  : 'Dashboard balance updates automatically with trade P&L'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                3. Account Currency
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {currencyOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCurrency(c);
                      if (c.includes('Cent')) {
                        setAccountType('Cent Account');
                      }
                    }}
                    className={`py-2 px-1 text-[11px] font-mono-code rounded-lg border transition font-bold text-center ${
                      currency === c
                        ? 'bg-blue-500 text-slate-950 border-cyan-400 shadow-md shadow-blue-500/20'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {currency === 'Custom' && (
                <input
                  type="text"
                  value={customCurrency}
                  onChange={(e) => setCustomCurrency(e.target.value)}
                  placeholder="Enter code (e.g. CAD, AUD, JPY)"
                  className="mt-2 w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-code uppercase"
                />
              )}
            </div>
          </div>

          {/* Account Type: Personal vs Funded */}
          <div className="space-y-3">
            <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
              4. Account Type (Personal / Funded)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setAccountCategory('PERSONAL');
                  setAccountType('Personal Account');
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition cursor-pointer ${
                  accountCategory === 'PERSONAL'
                    ? 'bg-blue-500/15 border-blue-500 text-slate-100 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs sm:text-sm font-military font-bold text-cyan-300 uppercase">
                    PERSONAL ACCOUNT
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Self-directed personal live, cent, or demo account
                  </div>
                </div>
                {accountCategory === 'PERSONAL' && (
                  <div className="w-4 h-4 rounded-full bg-blue-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAccountCategory('FUNDED');
                  setAccountType('Prop Firm Challenge');
                  const balNum = safeNumber(startingBalance, 5000);
                  if (balNum > 0 && fundedConfig.startingBalance !== balNum) {
                    setFundedConfig((prev) => ({
                      ...prev,
                      enabled: true,
                      startingBalance: balNum,
                      accountSize: balNum,
                    }));
                  }
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start justify-between transition cursor-pointer ${
                  accountCategory === 'FUNDED'
                    ? 'bg-cyan-500/15 border-cyan-400 text-slate-100 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="text-xs sm:text-sm font-military font-bold text-amber-300 uppercase">
                    FUNDED ACCOUNT
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Prop firm evaluation or live funded account with Risk Engine
                  </div>
                </div>
                {accountCategory === 'FUNDED' && (
                  <div className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>

            {accountCategory === 'PERSONAL' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {accountTypeOptions
                  .filter((o) => o.category === 'PERSONAL')
                  .map((opt) => {
                    const isSelected = accountType === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setAccountType(opt.id);
                          if (opt.id === 'Cent Account') {
                            setCurrency('Cent (USC)');
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left flex items-start justify-between transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/10 border-blue-500 text-slate-100'
                            : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-military font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                            {opt.label}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Funded Account Configuration vs Personal Broker */}
          {accountCategory === 'FUNDED' ? (
            <FundedAccountConfigPanel
              config={fundedConfig}
              currency={currency === 'Custom' ? customCurrency || 'USD' : currency}
              onChange={setFundedConfig}
              onSyncStartingBalance={(val) => setStartingBalance(String(val))}
              onSyncBroker={(firm) => setBroker(firm)}
            />
          ) : (
            <div>
              <label className="block text-xs font-mono-code uppercase text-slate-400 mb-1">
                Broker Name (Optional)
              </label>
              <input
                type="text"
                value={broker}
                onChange={(e) => setBroker(e.target.value)}
                placeholder="e.g. Exness, IC Markets, Eightcap"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700 text-xs font-mono-code transition"
              />
            </div>
          )}

          {/* Submit & Secondary Options */}
          <div className="pt-3 space-y-2">
            <button
              type="submit"
              id="create-trading-account-btn"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-cyan-400 hover:to-amber-300 text-slate-950 font-military font-bold text-sm tracking-wider uppercase shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 transition transform active:scale-[0.99] cursor-pointer"
            >
              <span>CREATE TRADING ACCOUNT</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {onOpenSignIn && (
                <button
                  type="button"
                  onClick={onOpenSignIn}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white font-mono-code text-xs font-bold border border-cyan-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>🔑 SIGN IN TO EXISTING ACCOUNT</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsSendAccountOpen(true)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 hover:text-white font-mono-code text-xs font-bold border border-emerald-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>📤 SEND ACCOUNT FOR SETUP</span>
              </button>
            </div>

            {onExploreDemo && (
              <button
                type="button"
                onClick={onExploreDemo}
                className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono-code text-xs font-semibold border border-slate-800 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>EXPLORE IN DEMO / PREVIEW MODE</span>
              </button>
            )}
          </div>
        </form>

        {/* SEND ACCOUNT MODAL OVERLAY */}
        {isSendAccountOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-slate-950 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    📤
                  </div>
                  <div>
                    <h3 className="text-sm font-military font-bold text-white uppercase">Send Account Details</h3>
                    <p className="text-[11px] font-mono-code text-slate-400">Direct WhatsApp & Server Dispatch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSendAccountOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {sendSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono-code space-y-2 text-center">
                  <p className="font-bold">✓ Account Details Dispatched Successfully!</p>
                  <p className="text-slate-300 text-[11px]">
                    Credentials and activation will be confirmed directly on WhatsApp (03406671495).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendAccountOpen(false);
                      setSendSuccess(false);
                    }}
                    className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono-code text-slate-300 mb-1 uppercase">Student / Trader Name</label>
                    <input
                      type="text"
                      value={sendName}
                      onChange={(e) => setSendName(e.target.value)}
                      placeholder="e.g. Zartab Zafar"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono-code"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono-code text-slate-300 mb-1 uppercase">WhatsApp Number</label>
                    <input
                      type="text"
                      value={sendPhone}
                      onChange={(e) => setSendPhone(e.target.value)}
                      placeholder="e.g. 03406671495"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono-code"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono-code text-slate-300 mb-1 uppercase">Account Preferences & Notes</label>
                    <textarea
                      rows={2}
                      value={sendNotes}
                      onChange={(e) => setSendNotes(e.target.value)}
                      placeholder="Account type: Cent Account, Balance: 100,000¢, or course enrollment."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono-code"
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href={`https://wa.me/923406671495?text=${encodeURIComponent(
                        `Hello PrimePipFX, I want to send my account details for setup.\nName: ${sendName || 'Trader'}\nPhone: ${sendPhone || ''}\nType: ${accountType}\nCurrency: ${currency}\nNotes: ${sendNotes || 'Please send my login password.'}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={async () => {
                        try {
                          await fetch('/api/auth/send-account', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: sendName || 'Trader',
                              phone: sendPhone,
                              message: `Type: ${accountType} | Currency: ${currency} | ${sendNotes}`,
                            }),
                          });
                        } catch {}
                        setSendSuccess(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-military font-bold text-xs tracking-wider uppercase text-center transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <span>SEND ACCOUNT VIA WHATSAPP (03406671495)</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security & Offline Footnote */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-code text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>IndexedDB Secured • Pakistan Timezone (UTC+5)</span>
          </div>
          <span>No Fake Data</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
