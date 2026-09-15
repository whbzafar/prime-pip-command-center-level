import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  Edit3,
  Copy,
  Check,
  Zap,
  Lock,
  Sparkles,
} from 'lucide-react';
import { SignalItem } from '../types';

interface PremiumSignalsHubProps {
  isAdmin?: boolean;
  onSelectSignalForTrade?: (signal: SignalItem) => void;
}

const INITIAL_SIGNALS: SignalItem[] = [
  {
    id: 'sig-xau-01',
    pair: 'XAU/USD',
    direction: 'BUY',
    timeframe: 'M15 / H1',
    entryPrice: 2485.5,
    stopLoss: 2478.0,
    takeProfit1: 2505.0,
    takeProfit2: 2520.0,
    recommendedRiskPercent: 1.0,
    strategyNotes: 'London Open liquidity sweep of Asian session low into H1 Bullish Order Block. Strong M5 displacement confirms institutional buying.',
    status: 'ACTIVE',
    createdAt: '2026-09-14 08:15',
    updatedAt: '2026-09-14 08:15',
    author: 'Chief Institutional Strategist',
  },
  {
    id: 'sig-eur-01',
    pair: 'EUR/USD',
    direction: 'SELL',
    timeframe: 'M5 / M15',
    entryPrice: 1.0845,
    stopLoss: 1.0872,
    takeProfit1: 1.0790,
    takeProfit2: 1.0740,
    recommendedRiskPercent: 1.0,
    strategyNotes: 'NY AM Session Judas Swing above previous day high. Rejection with Fair Value Gap (FVG) creation pointing to sell-side liquidity pool.',
    status: 'ACTIVE',
    createdAt: '2026-09-14 13:30',
    updatedAt: '2026-09-14 13:30',
    author: 'Risk & Strategy Desk',
  },
  {
    id: 'sig-gbp-01',
    pair: 'GBP/USD',
    direction: 'BUY',
    timeframe: 'M15',
    entryPrice: 1.2980,
    stopLoss: 1.2945,
    takeProfit1: 1.3050,
    takeProfit2: 1.3120,
    recommendedRiskPercent: 0.5,
    strategyNotes: 'Bank of England monetary policy anticipation. Clear double bottom sweep followed by 4H structure alignment.',
    status: 'HIT_TP',
    createdAt: '2026-09-13 09:00',
    updatedAt: '2026-09-13 16:20',
    author: 'Institutional Desk',
  },
];

export const PremiumSignalsHub: React.FC<PremiumSignalsHubProps> = ({
  isAdmin = false,
  onSelectSignalForTrade,
}) => {
  const [signals, setSignals] = useState<SignalItem[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_signals_vault');
      return saved ? JSON.parse(saved) : INITIAL_SIGNALS;
    } catch {
      return INITIAL_SIGNALS;
    }
  });

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Admin publisher form state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [newPair, setNewPair] = useState('XAU/USD');
  const [newDirection, setNewDirection] = useState<'BUY' | 'SELL'>('BUY');
  const [newTimeframe, setNewTimeframe] = useState('M15');
  const [newEntry, setNewEntry] = useState<number>(2480);
  const [newSL, setNewSL] = useState<number>(2473);
  const [newTP1, setNewTP1] = useState<number>(2498);
  const [newTP2, setNewTP2] = useState<number>(2515);
  const [newRiskPct, setNewRiskPct] = useState<number>(1.0);
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('primepipfx_signals_vault', JSON.stringify(signals));
    } catch (e) {
      console.error(e);
    }
  }, [signals]);

  const handlePublishSignal = (e: React.FormEvent) => {
    e.preventDefault();
    const newSig: SignalItem = {
      id: `sig-${Date.now()}`,
      pair: newPair,
      direction: newDirection,
      timeframe: newTimeframe,
      entryPrice: Number(newEntry),
      stopLoss: Number(newSL),
      takeProfit1: Number(newTP1),
      takeProfit2: newTP2 ? Number(newTP2) : undefined,
      recommendedRiskPercent: Number(newRiskPct),
      strategyNotes: newNotes || 'SBT institutional liquidity model setup.',
      status: 'ACTIVE',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      author: 'PrimePipFX Admin Desk',
    };

    setSignals([newSig, ...signals]);
    setIsPublishModalOpen(false);
    setNewNotes('');
  };

  const handleUpdateStatus = (id: string, status: SignalItem['status']) => {
    setSignals(
      signals.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            }
          : s
      )
    );
  };

  const handleDeleteSignal = (id: string) => {
    if (window.confirm('Delete this signal permanently?')) {
      setSignals(signals.filter((s) => s.id !== id));
    }
  };

  const handleCopyParams = (sig: SignalItem) => {
    const text = `[PRIMEPIPFX SIGNAL ALERT: ${sig.pair} ${sig.direction}]\nTimeframe: ${sig.timeframe}\nEntry: ${sig.entryPrice}\nStop Loss: ${sig.stopLoss}\nTake Profit 1: ${sig.takeProfit1}${sig.takeProfit2 ? `\nTake Profit 2: ${sig.takeProfit2}` : ''}\nRisk Allocation: ${sig.recommendedRiskPercent}%\nNotes: ${sig.strategyNotes}`;
    navigator.clipboard.writeText(text);
    setCopiedId(sig.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredSignals = signals.filter((s) => {
    const matchesStatus = filterStatus === 'ALL' || s.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      s.pair.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.strategyNotes.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Mandated Prominent Risk Disclaimer Banner (Master Prompt Requirement 16) */}
      <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-military font-bold text-rose-300 tracking-wider">
              REGULATORY RISK WARNING & FINANCIAL DISCLAIMER
            </span>
          </div>
          <p className="text-xs text-rose-200/90 font-mono-code leading-relaxed">
            Trading Forex, CFD instruments, and leveraged financial products involves substantial risk of loss and is not suitable for all investors. Signals published within the PrimePipFX Command Center are provided strictly for educational, analytical, and informational evaluation. Never risk capital you cannot afford to lose. Past performance provides no guarantee of future market returns.
          </p>
        </div>
      </div>

      {/* Header & Publisher Action */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-xl font-military font-bold text-slate-100 tracking-wider">
              INSTITUTIONAL SIGNALS FEED
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Real-time algorithmic and technical execution ideas with institutional entry parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-military font-bold text-xs tracking-wider shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>PUBLISH SIGNAL</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pair (e.g. XAU/USD, EUR/USD)..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono-code text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'PENDING', 'HIT_TP', 'HIT_SL', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-mono-code font-bold tracking-wider transition ${
                filterStatus === st
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Signals Feed List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSignals.map((sig) => {
          const isBuy = sig.direction === 'BUY';
          return (
            <div
              key={sig.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl space-y-4 transition flex flex-col justify-between"
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-military font-bold text-slate-100">
                      {sig.pair}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-military font-bold ${
                        isBuy
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isBuy ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {sig.direction}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded uppercase ${
                      sig.status === 'ACTIVE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : sig.status === 'HIT_TP'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : sig.status === 'HIT_SL'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {sig.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-[11px] font-mono-code text-slate-400 flex items-center justify-between">
                  <span>TF: <strong className="text-slate-200">{sig.timeframe}</strong></span>
                  <span>Rec. Risk: <strong className="text-amber-400">{sig.recommendedRiskPercent}%</strong></span>
                </div>

                {/* Price Grid */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono-code">
                  <div>
                    <span className="text-slate-500 text-[10px] block">ENTRY</span>
                    <span className="font-bold text-slate-200">{sig.entryPrice}</span>
                  </div>
                  <div>
                    <span className="text-rose-400 text-[10px] block">STOP LOSS</span>
                    <span className="font-bold text-rose-400">{sig.stopLoss}</span>
                  </div>
                  <div>
                    <span className="text-emerald-400 text-[10px] block">TAKE PROFIT 1</span>
                    <span className="font-bold text-emerald-400">{sig.takeProfit1}</span>
                  </div>
                  {sig.takeProfit2 && (
                    <div>
                      <span className="text-emerald-400 text-[10px] block">TAKE PROFIT 2</span>
                      <span className="font-bold text-emerald-400">{sig.takeProfit2}</span>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {sig.strategyNotes}
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500">
                  <span>{sig.author}</span>
                  <span>{sig.createdAt}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyParams(sig)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-amber-300 text-xs font-mono-code transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {copiedId === sig.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY ORDER</span>
                      </>
                    )}
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        title="Mark Hit TP"
                        onClick={() => handleUpdateStatus(sig.id, 'HIT_TP')}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <button
                        title="Mark Hit SL"
                        onClick={() => handleUpdateStatus(sig.id, 'HIT_SL')}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                      <button
                        title="Delete Signal"
                        onClick={() => handleDeleteSignal(sig.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin Publish Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B0F19] border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-military font-bold text-slate-100">
                PUBLISH INSTITUTIONAL SIGNAL
              </h2>
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishSignal} className="space-y-3 font-mono-code text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">PAIR / ASSET</label>
                  <input
                    type="text"
                    value={newPair}
                    onChange={(e) => setNewPair(e.target.value)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">DIRECTION</label>
                  <select
                    value={newDirection}
                    onChange={(e) => setNewDirection(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  >
                    <option value="BUY">BUY / LONG</option>
                    <option value="SELL">SELL / SHORT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">TIMEFRAME</label>
                  <input
                    type="text"
                    value={newTimeframe}
                    onChange={(e) => setNewTimeframe(e.target.value)}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">ENTRY PRICE</label>
                  <input
                    type="number"
                    step="any"
                    value={newEntry}
                    onChange={(e) => setNewEntry(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">STOP LOSS</label>
                  <input
                    type="number"
                    step="any"
                    value={newSL}
                    onChange={(e) => setNewSL(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-rose-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">TAKE PROFIT 1</label>
                  <input
                    type="number"
                    step="any"
                    value={newTP1}
                    onChange={(e) => setNewTP1(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-emerald-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">TAKE PROFIT 2</label>
                  <input
                    type="number"
                    step="any"
                    value={newTP2}
                    onChange={(e) => setNewTP2(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">REC. RISK %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRiskPct}
                    onChange={(e) => setNewRiskPct(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-950 border border-slate-800 text-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">TACTICAL NOTES & CONFLUENCE</label>
                <textarea
                  rows={3}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. London session liquidity sweep, MSS on M5 with FVG retest..."
                  className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-100"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 rounded border border-slate-700 text-slate-400 hover:bg-slate-800"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-military font-bold"
                >
                  PUBLISH LIVE SIGNAL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
