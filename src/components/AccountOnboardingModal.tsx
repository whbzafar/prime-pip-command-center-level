import React, { useState } from 'react';
import { Shield, Crosshair, ArrowRight, DollarSign, Wallet, Building2, Check, AlertCircle } from 'lucide-react';
import { AccountSettings, AccountType } from '../types';
import { safeNumber } from '../utils/currencyFormatter';

interface AccountOnboardingModalProps {
  onAccountCreated: (account: AccountSettings) => void;
  onExploreDemo?: () => void;
}

export const AccountOnboardingModal: React.FC<AccountOnboardingModalProps> = ({
  onAccountCreated,
  onExploreDemo,
}) => {
  const [accountName, setAccountName] = useState('My Trading Account');
  const [startingBalance, setStartingBalance] = useState<string>('5000');
  const [currency, setCurrency] = useState('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [accountType, setAccountType] = useState<string>('Personal Account');
  const [broker, setBroker] = useState('');
  const [error, setError] = useState<string | null>(null);

  const accountTypeOptions = [
    {
      id: 'Personal Account',
      label: 'Personal Account',
      sub: 'Private capital self-directed',
      mappedType: 'PERSONAL_LIVE' as AccountType,
    },
    {
      id: 'Prop Firm Challenge',
      label: 'Prop Firm Challenge',
      sub: 'Evaluation phase (FTMO, MFF, etc.)',
      mappedType: 'PROP_FIRM_EVALUATION' as AccountType,
    },
    {
      id: 'Live Funded Account',
      label: 'Live Funded Account',
      sub: 'Passed evaluation with profit split',
      mappedType: 'PROP_FIRM_FUNDED' as AccountType,
    },
    {
      id: 'Demo Account',
      label: 'Demo Account',
      sub: 'Practice simulation environment',
      mappedType: 'DEMO' as AccountType,
    },
  ];

  const currencyOptions = ['USD', 'EUR', 'GBP', 'PKR', 'Custom'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = accountName.trim();
    if (!name) {
      setError('Please enter a valid account name.');
      return;
    }

    const balanceNum = safeNumber(startingBalance, -1);
    if (balanceNum <= 0) {
      setError('Please enter a positive starting balance (e.g. 5000).');
      return;
    }

    const selectedCurrency =
      currency === 'Custom' ? (customCurrency.trim().toUpperCase() || 'USD') : currency;

    const matchedType = accountTypeOptions.find((o) => o.id === accountType)?.mappedType || 'PERSONAL_LIVE';

    const newAccount: AccountSettings = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      traderName: 'TRADER VIPER',
      accountName: name,
      accountType: matchedType,
      initialBalance: balanceNum,
      currentBalance: balanceNum,
      currentEquity: balanceNum,
      broker: broker.trim() || 'Direct Market Access',
      currency: selectedCurrency,
      maxDailyLossPercent: 4.0,
      maxDrawdownPercent: 5.0,
      maxDailyTrades: 2,
      maxRiskPerTradePercent: 1.0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAccountCreated(newAccount);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070A11]/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden my-auto">
        {/* Radar ambient glow */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Tactical Header Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-mono-code font-bold uppercase tracking-widest">
            <Crosshair className="w-3.5 h-3.5" />
            INITIAL SYSTEM INITIALIZATION
          </span>
          <span className="text-[11px] font-mono-code text-slate-400">
            OFFLINE-READY • ZERO CLOUD LOCK-IN
          </span>
        </div>

        {/* Titles */}
        <h1 className="text-xl sm:text-2xl font-military font-bold text-slate-100 tracking-wide">
          WELCOME TO PRIMEPIPFX TRADING COMMAND CENTER
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
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
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm font-mono-code transition"
            />
          </div>

          {/* Starting Balance & Currency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                2. Starting Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono-code text-sm">
                  {currency === 'PKR' ? '₨' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                </span>
                <input
                  type="number"
                  required
                  step="any"
                  min="1"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(e.target.value)}
                  placeholder="5000"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm font-mono-code transition font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-400 font-mono-code mt-1 block">
                Dashboard balance updates automatically with trade P&L
              </span>
            </div>

            <div>
              <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                3. Account Currency
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {currencyOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`py-2 text-xs font-mono-code rounded-lg border transition font-bold text-center ${
                      currency === c
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
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

          {/* Account Type */}
          <div>
            <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
              4. Account Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {accountTypeOptions.map((opt) => {
                const isSelected = accountType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAccountType(opt.id)}
                    className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500 text-slate-100 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className={`text-xs font-military font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{opt.sub}</div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Broker */}
          <div>
            <label className="block text-xs font-mono-code uppercase text-slate-400 mb-1">
              Broker or Prop Firm (Optional)
            </label>
            <input
              type="text"
              value={broker}
              onChange={(e) => setBroker(e.target.value)}
              placeholder="e.g. FTMO, IC Markets, Exness, FundedNext"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-700 text-xs font-mono-code transition"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3 space-y-2">
            <button
              type="submit"
              id="create-trading-account-btn"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-military font-bold text-sm tracking-wider uppercase shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition transform active:scale-[0.99] cursor-pointer"
            >
              <span>CREATE TRADING ACCOUNT</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

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

        {/* Security & Offline Footnote */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono-code text-slate-500">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>IndexedDB Secured • Pakistan Timezone (UTC+5)</span>
          </div>
          <span>No Fake Data</span>
        </div>
      </div>
    </div>
  );
};
