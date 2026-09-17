import React, { useState } from 'react';
import {
  X,
  Plus,
  Check,
  Building2,
  AlertTriangle,
  Trash2,
  Edit3,
  ArrowRight,
  Shield,
  Wallet,
  Settings,
  DollarSign,
} from 'lucide-react';
import { AccountSettings, AccountType } from '../types';
import { formatCurrency, safeNumber } from '../utils/currencyFormatter';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: AccountSettings[];
  activeAccount: AccountSettings;
  onSelectAccount: (accountId: string) => void;
  onCreateAccount: (account: AccountSettings) => void;
  onUpdateAccount: (account: AccountSettings) => void;
  onDeleteAccount: (accountId: string) => void;
}

export const AccountManagerModal: React.FC<AccountManagerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  activeAccount,
  onSelectAccount,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
}) => {
  const [view, setView] = useState<'LIST' | 'CREATE' | 'EDIT'>('LIST');
  const [editingAccount, setEditingAccount] = useState<AccountSettings>(activeAccount);
  const [accountToDelete, setAccountToDelete] = useState<AccountSettings | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [customCurrency, setCustomCurrency] = useState('');
  const [accountType, setAccountType] = useState<string>('Personal Account');
  const [broker, setBroker] = useState('');
  const [error, setError] = useState<string | null>(null);

  const currencyOptions = ['USD', 'EUR', 'GBP', 'PKR', 'Custom'];
  const accountTypeOptions = [
    { id: 'Personal Account', label: 'Personal Account', mappedType: 'PERSONAL_LIVE' as AccountType },
    { id: 'Prop Firm Challenge', label: 'Prop Firm Challenge', mappedType: 'PROP_FIRM_EVALUATION' as AccountType },
    { id: 'Live Funded Account', label: 'Live Funded Account', mappedType: 'PROP_FIRM_FUNDED' as AccountType },
    { id: 'Demo Account', label: 'Demo Account', mappedType: 'DEMO' as AccountType },
  ];

  const handleStartCreate = () => {
    setName(`Account ${accounts.length + 1}`);
    setBalance('5000');
    setCurrency('USD');
    setCustomCurrency('');
    setAccountType('Personal Account');
    setBroker('');
    setError(null);
    setView('CREATE');
  };

  const handleStartEdit = (acc: AccountSettings) => {
    setEditingAccount({ ...acc });
    setName(acc.accountName);
    setBalance(acc.initialBalance.toString());
    setCurrency(currencyOptions.includes(acc.currency) ? acc.currency : 'Custom');
    setCustomCurrency(currencyOptions.includes(acc.currency) ? '' : acc.currency);
    const matched = accountTypeOptions.find((o) => o.mappedType === acc.accountType)?.id || 'Personal Account';
    setAccountType(matched);
    setBroker(acc.broker || '');
    setError(null);
    setView('EDIT');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = safeNumber(balance, -1);
    if (balanceNum <= 0) {
      setError('Please enter a valid positive starting balance.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter an account name.');
      return;
    }

    const selectedCurrency =
      currency === 'Custom' ? (customCurrency.trim().toUpperCase() || 'USD') : currency;
    const mappedType = accountTypeOptions.find((o) => o.id === accountType)?.mappedType || 'PERSONAL_LIVE';

    const newAcc: AccountSettings = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      traderName: activeAccount.traderName || 'TRADER VIPER',
      accountName: name.trim(),
      accountType: mappedType,
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

    onCreateAccount(newAcc);
    setView('LIST');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const balanceNum = safeNumber(balance, -1);
    if (balanceNum <= 0) {
      setError('Please enter a valid starting balance.');
      return;
    }
    if (!name.trim()) {
      setError('Please enter an account name.');
      return;
    }

    const selectedCurrency =
      currency === 'Custom' ? (customCurrency.trim().toUpperCase() || 'USD') : currency;
    const mappedType = accountTypeOptions.find((o) => o.id === accountType)?.mappedType || 'PERSONAL_LIVE';

    const updated: AccountSettings = {
      ...editingAccount,
      accountName: name.trim(),
      initialBalance: balanceNum,
      currency: selectedCurrency,
      accountType: mappedType,
      broker: broker.trim() || 'Direct Market Access',
      updatedAt: new Date().toISOString(),
    };

    onUpdateAccount(updated);
    setView('LIST');
  };

  const handleDelete = (acc: AccountSettings, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAccountToDelete(acc);
  };

  const confirmDeleteAccount = () => {
    if (!accountToDelete) return;
    onDeleteAccount(accountToDelete.id);
    setAccountToDelete(null);
    if (view === 'EDIT') {
      setView('LIST');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#020617]/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-military font-bold tracking-wide text-slate-100">
                {view === 'LIST'
                  ? 'TRADING ACCOUNTS & RISK PROFILES'
                  : view === 'CREATE'
                  ? 'CREATE NEW TRADING ACCOUNT'
                  : 'ACCOUNT SETTINGS'}
              </h2>
              <p className="text-xs text-slate-400 font-mono-code">
                {view === 'LIST'
                  ? `${accounts.length} ISOLATED ACCOUNTS CONFIGURED`
                  : 'OFFLINE-FIRST LOCAL ISOLATION'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {view === 'LIST' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono-code text-slate-400 uppercase tracking-wider">
                  Switch or manage your accounts
                </span>
                <button
                  onClick={handleStartCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>CREATE NEW ACCOUNT</span>
                </button>
              </div>

              <div className="space-y-3">
                {accounts.map((acc) => {
                  const isActive = acc.id === activeAccount.id;
                  return (
                    <div
                      key={acc.id}
                      onClick={() => onSelectAccount(acc.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-wrap items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-blue-500/10 border-blue-500/60 shadow-lg shadow-blue-500/5'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isActive
                              ? 'bg-blue-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {acc.currency === 'PKR' ? '₨' : acc.currency === 'EUR' ? '€' : acc.currency === 'GBP' ? '£' : '$'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-military font-bold text-slate-100">
                              {acc.accountName}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono-code font-bold uppercase">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono-code mt-0.5 flex items-center gap-2">
                            <span className="text-cyan-400/90 font-bold">
                              Starting: {formatCurrency(acc.initialBalance, acc.currency)}
                            </span>
                            <span>•</span>
                            <span>{acc.accountType.replace(/_/g, ' ')}</span>
                            {acc.broker && <span>• {acc.broker}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(acc);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code flex items-center gap-1 transition"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>SETTINGS</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(acc, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(view === 'CREATE' || view === 'EDIT') && (
            <form onSubmit={view === 'CREATE' ? handleCreateSubmit : handleEditSubmit} className="space-y-4">
              {/* Recalculation Warning for EDIT view */}
              {view === 'EDIT' && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-amber-300 text-xs flex items-start gap-2.5 leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                  <div>
                    <span className="font-bold block">NOTICE: RECALCULATION IMPACT</span>
                    Changing the starting balance will recalculate your account statistics, drawdown levels, and net P&L % based on your trade history.
                  </div>
                </div>
              )}

              {/* Account Name */}
              <div>
                <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My FTMO Account"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono-code transition"
                />
              </div>

              {/* Starting Balance & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                    Starting Balance
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="1"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-sm font-mono-code transition font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                    Account Currency
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {currencyOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={`py-2 text-xs font-mono-code rounded-lg border transition font-bold text-center ${
                          currency === c
                            ? 'bg-blue-500 text-slate-950 border-cyan-400'
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
                      placeholder="e.g. AUD, CAD"
                      className="mt-2 w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-700 text-xs font-mono-code uppercase"
                    />
                  )}
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-xs font-mono-code uppercase text-slate-300 mb-1.5 font-semibold">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {accountTypeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAccountType(opt.id)}
                      className={`p-2.5 rounded-lg border text-left text-xs font-mono-code transition ${
                        accountType === opt.id
                          ? 'bg-blue-500/10 border-blue-500 text-amber-300 font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Broker */}
              <div>
                <label className="block text-xs font-mono-code uppercase text-slate-400 mb-1">
                  Broker / Prop Firm Name (Optional)
                </label>
                <input
                  type="text"
                  value={broker}
                  onChange={(e) => setBroker(e.target.value)}
                  placeholder="e.g. Eightcap, IC Markets, FTMO"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-600 text-xs font-mono-code"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                {view === 'EDIT' ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingAccount)}
                    className="px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-military font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>DELETE ACCOUNT</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setView('LIST')}
                    className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-military font-bold tracking-wider cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider uppercase shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    {view === 'CREATE' ? 'CREATE ACCOUNT' : 'SAVE CHANGES'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CONFIRM DELETE ACCOUNT MODAL */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-slate-950 border border-rose-500/40 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 font-mono-code text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-military font-bold text-base text-slate-100 tracking-wider">
                DELETE THIS TRADING ACCOUNT?
              </h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to permanently delete{' '}
                <strong className="text-cyan-400">{accountToDelete.accountName}</strong>?
              </p>
              <p className="text-[11px] text-rose-400/90 leading-relaxed pt-1">
                Associated account data, trades, and rules will be deleted permanently. If this was your active account, another account will be selected automatically, or the account creation screen will open.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>DELETE ACCOUNT</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
