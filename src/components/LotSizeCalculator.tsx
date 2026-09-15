import React, { useState, useEffect } from 'react';
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  History,
  Trash2,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Wallet,
  ArrowRight,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { AccountSettings, LotCalculationHistoryItem } from '../types';
import { formatCurrency } from '../utils/currencyFormatter';
import { getKarachiDate, getKarachiTime } from '../utils/time';

interface LotSizeCalculatorProps {
  activeAccount: AccountSettings | null;
  onApplyLotToNewTrade?: (pair: string, lotSize: number) => void;
}

// Default specifications for known instruments
interface InstrumentSpec {
  name: string;
  category: 'FOREX' | 'METALS' | 'INDICES' | 'CRYPTO' | 'CUSTOM';
  pipValuePerStandardLot: number; // in USD
  pipSize: number;
  contractSize: number;
  description: string;
}

const DEFAULT_SPECS: Record<string, InstrumentSpec> = {
  EURUSD: { name: 'EURUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000, description: 'Euro / US Dollar ($10/pip standard lot)' },
  GBPUSD: { name: 'GBPUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000, description: 'British Pound / US Dollar ($10/pip)' },
  AUDUSD: { name: 'AUDUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000, description: 'Aussie / US Dollar ($10/pip)' },
  NZDUSD: { name: 'NZDUSD', category: 'FOREX', pipValuePerStandardLot: 10, pipSize: 0.0001, contractSize: 100000, description: 'Kiwi / US Dollar ($10/pip)' },
  USDCAD: { name: 'USDCAD', category: 'FOREX', pipValuePerStandardLot: 7.5, pipSize: 0.0001, contractSize: 100000, description: 'US Dollar / Canadian Dollar (~$7.50/pip)' },
  USDCHF: { name: 'USDCHF', category: 'FOREX', pipValuePerStandardLot: 11, pipSize: 0.0001, contractSize: 100000, description: 'US Dollar / Swiss Franc (~$11/pip)' },
  USDJPY: { name: 'USDJPY', category: 'FOREX', pipValuePerStandardLot: 6.8, pipSize: 0.01, contractSize: 100000, description: 'US Dollar / Japanese Yen (~$6.80/pip)' },
  GBPJPY: { name: 'GBPJPY', category: 'FOREX', pipValuePerStandardLot: 6.8, pipSize: 0.01, contractSize: 100000, description: 'British Pound / Yen (~$6.80/pip)' },
  EURJPY: { name: 'EURJPY', category: 'FOREX', pipValuePerStandardLot: 6.8, pipSize: 0.01, contractSize: 100000, description: 'Euro / Japanese Yen (~$6.80/pip)' },
  XAUUSD: { name: 'XAUUSD', category: 'METALS', pipValuePerStandardLot: 10, pipSize: 0.1, contractSize: 100, description: 'Gold / USD ($10 per 1.0 point / 10 pips)' },
  GOLD: { name: 'GOLD', category: 'METALS', pipValuePerStandardLot: 10, pipSize: 0.1, contractSize: 100, description: 'Gold / USD ($10 per 1.0 point)' },
  XAGUSD: { name: 'XAGUSD', category: 'METALS', pipValuePerStandardLot: 50, pipSize: 0.01, contractSize: 5000, description: 'Silver / USD ($50 per cent)' },
  US30: { name: 'US30', category: 'INDICES', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1, description: 'Dow Jones 30 Index ($1 per index point)' },
  NAS100: { name: 'NAS100', category: 'INDICES', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1, description: 'Nasdaq 100 Index ($1 per index point)' },
  SPX500: { name: 'SPX500', category: 'INDICES', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1, description: 'S&P 500 Index ($1 per point)' },
  GER30: { name: 'GER30', category: 'INDICES', pipValuePerStandardLot: 1.1, pipSize: 1.0, contractSize: 1, description: 'DAX 30 / 40 Index (~$1.10 per point)' },
  BTCUSD: { name: 'BTCUSD', category: 'CRYPTO', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1, description: 'Bitcoin / USD ($1 per $1 movement per 1 BTC)' },
  ETHUSD: { name: 'ETHUSD', category: 'CRYPTO', pipValuePerStandardLot: 1, pipSize: 1.0, contractSize: 1, description: 'Ethereum / USD ($1 per $1 movement per 1 ETH)' },
};

const HISTORY_KEY = 'primepipfx_lot_calc_history_v1';

export const LotSizeCalculator: React.FC<LotSizeCalculatorProps> = ({
  activeAccount,
  onApplyLotToNewTrade,
}) => {
  // 1. Inputs
  const [instrument, setInstrument] = useState<string>('XAUUSD');
  const [balance, setBalance] = useState<number>(() => activeAccount?.currentBalance || 5000);
  const [currency, setCurrency] = useState<string>(() => activeAccount?.currency || 'USD');
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLossPips, setStopLossPips] = useState<number>(50);

  // Advanced / Custom mode settings
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customPipValue, setCustomPipValue] = useState<number>(10);
  const [contractSize, setContractSize] = useState<number>(100000);
  const [tickSize, setTickSize] = useState<number>(0.0001);
  const [tickValue, setTickValue] = useState<number>(10);

  // Manual lot size verification checker
  const [manualLotSize, setManualLotSize] = useState<string>('');

  // History state
  const [history, setHistory] = useState<LotCalculationHistoryItem[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load history on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not load lot calculation history:', e);
    }
  }, []);

  // Save history helper
  const saveHistoryItem = (item: LotCalculationHistoryItem) => {
    const updated = [item, ...history.filter((h) => h.id !== item.id)].slice(0, 30);
    setHistory(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save lot calculation history:', e);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (e) {}
  };

  const deleteHistoryItem = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {}
  };

  // Sync with activeAccount on load and updates
  useEffect(() => {
    if (activeAccount) {
      setBalance(activeAccount.currentBalance || activeAccount.initialBalance || 500);
      setCurrency(activeAccount.currency || 'USD');
    }
  }, [activeAccount?.id, activeAccount?.currentBalance, activeAccount?.initialBalance, activeAccount?.currency]);

  // Sync with active account when requested
  const handleUseActiveBalance = () => {
    if (activeAccount) {
      setBalance(activeAccount.currentBalance || activeAccount.initialBalance || 500);
      setCurrency(activeAccount.currency || 'USD');
    }
  };

  // Detect specification for manually typed pair
  const cleanPair = (instrument || '').toUpperCase().trim();
  const matchedSpec = DEFAULT_SPECS[cleanPair];
  const isKnownPair = Boolean(matchedSpec);

  // Determine effective pip value per standard lot
  let effectivePipValue = isCustomMode ? customPipValue : (matchedSpec ? matchedSpec.pipValuePerStandardLot : 10);
  if (effectivePipValue <= 0) effectivePipValue = 10;

  // ----------------------------------------------------
  // CORE LOT SIZE MATHEMATICAL CALCULATION
  // ----------------------------------------------------
  // 1. Maximum Risk Amount = Account Balance * (Risk Percentage / 100)
  const riskAmount = (Math.max(0, balance) * Math.max(0, riskPercent)) / 100;

  // 2. Lot Size = Risk Amount / (Stop Loss in Pips * Pip Value per Standard Lot)
  const sl = Math.max(0.1, stopLossPips || 1);
  const rawLotSize = riskAmount / (sl * effectivePipValue);

  // Professional formatting (forex standard 2 decimal places, rounded down to avoid over-risking)
  const recommendedLotSize = Math.max(0.01, Math.floor(rawLotSize * 100) / 100);

  // Estimated loss at Stop Loss
  const estimatedLossAtSL = recommendedLotSize * sl * effectivePipValue;
  const actualRiskPercentage = balance > 0 ? (estimatedLossAtSL / balance) * 100 : riskPercent;

  // ----------------------------------------------------
  // MANUAL LOT SIZE CHECKER
  // ----------------------------------------------------
  const userEnteredLot = parseFloat(manualLotSize);
  const hasManualLot = !isNaN(userEnteredLot) && userEnteredLot > 0;
  const manualLossAtSL = hasManualLot ? userEnteredLot * sl * effectivePipValue : 0;
  const manualRiskPercent = hasManualLot && balance > 0 ? (manualLossAtSL / balance) * 100 : 0;
  const isManualExceeding = hasManualLot && manualRiskPercent > (riskPercent + 0.05);

  const handleCalculateAndSave = () => {
    const historyItem: LotCalculationHistoryItem = {
      id: `calc-${Date.now()}`,
      date: `${getKarachiDate()} ${getKarachiTime()} PKT`,
      pair: cleanPair || 'CUSTOM',
      balance,
      currency,
      riskPercent,
      riskAmount,
      stopLossPips: sl,
      pipValue: effectivePipValue,
      recommendedLotSize,
      estimatedLoss: estimatedLossAtSL,
      customLotSize: hasManualLot ? userEnteredLot : undefined,
      customLoss: hasManualLot ? manualLossAtSL : undefined,
      customRiskPercent: hasManualLot ? manualRiskPercent : undefined,
      status: isManualExceeding ? 'WARNING' : 'SAFE',
    };
    saveHistoryItem(historyItem);
  };

  const copyResult = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-military font-bold tracking-wider text-slate-100 uppercase">
                  LOT SIZE CALCULATOR
                </h1>
                <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                  Institutional Risk & Position Sizing Engine • Offline-First Mathematical Precision
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold transition-all flex items-center gap-1.5 border ${
                isCustomMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-amber-500/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {isCustomMode ? 'CUSTOM SPEC ACTIVE' : 'ADVANCED SPECS'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs (Left) & Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUT PANEL (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xs font-military font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              CALCULATION PARAMETERS
            </h2>
            <span className="text-[11px] font-mono-code text-slate-400">
              {isKnownPair ? `${cleanPair} (Detected)` : 'Manual Pair'}
            </span>
          </div>

          {/* 1. Instrument / Pair (Manual Typing) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono-code text-slate-300 font-bold uppercase">
                1. PAIR / INSTRUMENT
              </label>
              <span className="text-[11px] text-slate-400 font-mono-code">
                Type any pair name manually
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value.toUpperCase())}
                placeholder="e.g. XAUUSD, EURUSD, GBPUSD, NAS100, BTCUSD"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 uppercase tracking-wider font-bold"
              />
            </div>
            {matchedSpec ? (
              <p className="mt-1.5 text-[11px] font-mono-code text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {matchedSpec.description}
              </p>
            ) : cleanPair ? (
              <p className="mt-1.5 text-[11px] font-mono-code text-amber-400/90 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Unrecognized pair specs. Using standard $10/pip or enter custom pip value below.
              </p>
            ) : null}
          </div>

          {/* 2. Account Balance */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono-code text-slate-300 font-bold uppercase">
                2. ACCOUNT BALANCE
              </label>
              {activeAccount && (
                <button
                  type="button"
                  onClick={handleUseActiveBalance}
                  className="text-[11px] font-mono-code text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors underline decoration-amber-500/50"
                >
                  <Wallet className="w-3 h-3" />
                  USE ACTIVE ACCOUNT ({formatCurrency(activeAccount.currentBalance, activeAccount.currency)})
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 relative">
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={balance || ''}
                  onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                  placeholder="5000"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>
              <div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-3 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-200 focus:outline-none focus:border-amber-400"
                >
                  <option value="USD">USD ($)</option>
                  <option value="PKR">PKR (Rs)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="AED">AED</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Risk Percentage & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono-code text-slate-300 font-bold uppercase">
                3. RISK PERCENTAGE (%)
              </label>
              <span className="text-[11px] font-mono-code text-amber-400 font-bold">
                Max Risk Amount: {formatCurrency(riskAmount, currency)}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-2">
              {[0.25, 0.5, 1.0, 2.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRiskPercent(preset)}
                  className={`py-2 rounded-lg font-mono-code text-xs font-bold transition-all border ${
                    riskPercent === preset
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {preset}%
                </button>
              ))}
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={riskPercent || ''}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                  placeholder="Custom"
                  className="w-full h-full text-center px-1 py-2 bg-slate-950 border border-slate-800 rounded-lg font-mono-code text-xs text-amber-300 focus:outline-none focus:border-amber-400 font-bold"
                />
              </div>
            </div>
          </div>

          {/* 4. Stop Loss in Pips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono-code text-slate-300 font-bold uppercase">
                4. STOP LOSS (PIPS / POINTS)
              </label>
              <span className="text-[11px] font-mono-code text-slate-400">
                Distance to structural invalidation
              </span>
            </div>
            <input
              type="number"
              min="1"
              step="any"
              value={stopLossPips || ''}
              onChange={(e) => setStopLossPips(parseFloat(e.target.value) || 0)}
              placeholder="e.g. 50"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl font-mono-code text-sm text-slate-100 focus:outline-none focus:border-amber-400 font-bold"
            />
          </div>

          {/* Custom Mode / Advanced Specs Drawer */}
          {isCustomMode && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-code text-amber-400 font-bold">
                <span>ADVANCED BROKER INSTRUMENT SPECIFICATIONS</span>
                <span className="text-[10px] text-slate-400">Custom Mode</span>
              </div>
              <div className="grid grid-cols-2 gap-3 font-mono-code text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Pip Value per Lot ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customPipValue}
                    onChange={(e) => setCustomPipValue(parseFloat(e.target.value) || 10)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Contract Size:</label>
                  <input
                    type="number"
                    value={contractSize}
                    onChange={(e) => setContractSize(parseFloat(e.target.value) || 100000)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Calculate & Save Action Button */}
          <button
            type="button"
            onClick={handleCalculateAndSave}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-military font-bold text-sm tracking-wider uppercase rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <Calculator className="w-4 h-4" />
            CALCULATE LOT SIZE & RECORD CALCULATION
          </button>
        </div>

        {/* RESULTS & SAFETY PANEL (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Recommended Lot Size HUD */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <span className="text-xs font-military font-bold tracking-wider text-amber-400 uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                OFFICIAL LOT SIZING RESULT
              </span>
              <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100% MATHEMATICAL
              </span>
            </div>

            {/* Giant Recommended Lot Output */}
            <div className="text-center py-4 bg-slate-950/80 rounded-xl border border-slate-800/80 shadow-inner mb-4">
              <span className="text-[11px] font-mono-code text-slate-400 uppercase tracking-wider block">
                YOUR RECOMMENDED LOT SIZE
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-2">
                <span className="text-4xl sm:text-5xl font-mono-code font-black text-amber-300 tracking-tight">
                  {recommendedLotSize.toFixed(2)}
                </span>
                <span className="text-lg font-military font-bold text-slate-400">LOTS</span>
              </div>
              {/* Standard / Mini / Micro breakdown */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 grid grid-cols-3 gap-1 px-3 text-[11px] font-mono-code">
                <div className="bg-slate-900/90 py-1 px-1.5 rounded border border-slate-800 text-center">
                  <span className="text-slate-500 block text-[9px] uppercase">Standard (1.0)</span>
                  <span className="text-slate-200 font-bold">{recommendedLotSize.toFixed(2)}</span>
                </div>
                <div className="bg-slate-900/90 py-1 px-1.5 rounded border border-slate-800 text-center">
                  <span className="text-slate-500 block text-[9px] uppercase">Mini (0.1)</span>
                  <span className="text-amber-300 font-bold">{(recommendedLotSize * 10).toFixed(1)}</span>
                </div>
                <div className="bg-slate-900/90 py-1 px-1.5 rounded border border-slate-800 text-center">
                  <span className="text-slate-500 block text-[9px] uppercase">Micro (0.01)</span>
                  <span className="text-emerald-300 font-bold">{Math.round(recommendedLotSize * 100)}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono-code text-slate-500 mt-2 block">
                Formula: {formatCurrency(riskAmount, currency)} ÷ ({sl} pips × {formatCurrency(effectivePipValue, 'USD')})
              </span>
            </div>

            {/* Core Metrics Breakdown */}
            <div className="space-y-2 font-mono-code text-xs border-t border-slate-800/80 pt-4">
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Account Balance:</span>
                <span className="font-bold text-slate-200">{formatCurrency(balance, currency)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Risk Percentage:</span>
                <span className="font-bold text-amber-400">{riskPercent}%</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Maximum Risk Amount:</span>
                <span className="font-bold text-amber-400">{formatCurrency(riskAmount, currency)}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Stop Loss Distance:</span>
                <span className="font-bold text-slate-200">{sl} Pips</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800/50">
                <span className="text-slate-400">Pip Value (per Lot):</span>
                <span className="font-bold text-slate-300">{formatCurrency(effectivePipValue, 'USD')}</span>
              </div>
              <div className="flex items-center justify-between py-1 pt-2">
                <span className="text-rose-400 font-bold">Estimated Loss at SL:</span>
                <span className="font-black text-rose-400 text-sm">
                  -{formatCurrency(estimatedLossAtSL, currency)} ({actualRiskPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Quick action to populate trade entry */}
            {onApplyLotToNewTrade && (
              <button
                type="button"
                onClick={() => onApplyLotToNewTrade(cleanPair, recommendedLotSize)}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono-code text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span>OPEN NEW TRADE WITH {recommendedLotSize} LOT</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Manual Lot Size Checker & Risk Guard */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <h3 className="text-xs font-military font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                MANUAL LOT SIZE CHECKER
              </h3>
              <span className="text-[10px] font-mono-code text-slate-400">Over-Risk Safety</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 block mb-1">
                  Want to trade a custom lot size? Enter it here:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={manualLotSize}
                    onChange={(e) => setManualLotSize(e.target.value)}
                    placeholder="e.g. 0.20"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono-code text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {hasManualLot && (
                <div className={`p-3 rounded-xl border text-xs font-mono-code ${
                  isManualExceeding
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                }`}>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>STATUS: {isManualExceeding ? 'RISK WARNING' : 'SAFE'}</span>
                    <span>Actual Risk: {manualRiskPercent.toFixed(2)}%</span>
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <div>Potential loss at Stop Loss: <span className="font-bold">-{formatCurrency(manualLossAtSL, currency)}</span></div>
                    {isManualExceeding && (
                      <div className="mt-1 text-rose-300 font-bold">
                        ⚠️ WARNING: This lot size risks {manualRiskPercent.toFixed(1)}% of your account, exceeding your {riskPercent}% limit. Max safe lot: {recommendedLotSize.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CALCULATION HISTORY SECTION */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm font-military font-bold tracking-wider text-slate-100 uppercase">
                LOT SIZE CALCULATION HISTORY
              </h3>
              <p className="text-[11px] font-mono-code text-slate-400">
                Saved locally offline • Instant one-click recall
              </p>
            </div>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs font-mono-code text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-mono-code text-xs">
            No previous calculations recorded yet. Click "CALCULATE LOT SIZE & RECORD CALCULATION" above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-code text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">Pair</th>
                  <th className="pb-2.5 text-right">Balance</th>
                  <th className="pb-2.5 text-center">Risk %</th>
                  <th className="pb-2.5 text-right">SL Pips</th>
                  <th className="pb-2.5 text-right">Recommended Lot</th>
                  <th className="pb-2.5 text-right">Loss at SL</th>
                  <th className="pb-2.5 text-center">Status</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 text-slate-400 text-[11px]">{item.date}</td>
                    <td className="py-2.5 font-bold text-amber-300">{item.pair}</td>
                    <td className="py-2.5 text-right text-slate-200">{formatCurrency(item.balance, item.currency)}</td>
                    <td className="py-2.5 text-center text-amber-400 font-bold">{item.riskPercent}%</td>
                    <td className="py-2.5 text-right text-slate-300">{item.stopLossPips} pips</td>
                    <td className="py-2.5 text-right font-black text-amber-300 text-sm">
                      {item.recommendedLotSize.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right text-rose-400 font-bold">
                      -{formatCurrency(item.estimatedLoss, item.currency)}
                    </td>
                    <td className="py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        item.status === 'WARNING'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setInstrument(item.pair);
                            setBalance(item.balance);
                            setCurrency(item.currency);
                            setRiskPercent(item.riskPercent);
                            setStopLossPips(item.stopLossPips);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] transition-colors"
                          title="Load into Calculator"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteHistoryItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
