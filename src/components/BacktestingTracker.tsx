import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  TrendingUp,
  Target,
  BarChart3,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  HelpCircle,
  Clock,
  ShieldCheck,
  Percent,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { BacktestSession, AccountSettings } from '../types';
import { getKarachiDate, getKarachiTime, getKarachiTime12 } from '../utils/time';
import { formatCurrency } from '../utils/currencyFormatter';

interface BacktestingTrackerProps {
  account: AccountSettings | null;
  onBacktestTaskCompleted?: (count: number) => void;
  onAutoSaveNotify?: (timeStr: string) => void;
}

const DEFAULT_STRATEGIES = [
  'SBT Model 1 (Liquidity Sweep + MSS)',
  'SBT Model 2 (FVG Displacement)',
  'SBT Model 3 (Order Block Mitigation)',
  'SBT Model 4 (Session Open Judas Swing)',
  'SBT Model 5 (HTF Breaker Block)',
  'SBT Model 6 (Silver Bullet 10AM/3PM)',
  'SBT Model 7 (London Session Reversal)',
  'SBT Model 8 (NY PM Expansion)',
  'SBT Model 9 (Daily Bias Continuation)',
  'SBT Model 10 (Asian Range Expansion)',
  'Break & Retest Momentum',
  'Supply & Demand Imbalance',
];

const DEFAULT_PAIRS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'NAS100', 'US30', 'BTCUSD', 'USOIL'];
const TIMEFRAMES = [
  'M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1',
  'W1', 'MN1', '3M', '6M', '12M',
];
const TIMEFRAME_LABELS: Record<string, string> = {
  W1: 'Weekly',
  MN1: 'Monthly',
  '3M': '3-Month',
  '6M': '6-Month',
  '12M': '12-Month',
};

export const BacktestingTracker: React.FC<BacktestingTrackerProps> = ({
  account,
  onBacktestTaskCompleted,
  onAutoSaveNotify,
}) => {
  const accountId = account?.id || 'default';
  const storageKey = `primepipfx_backtest_${accountId}`;

  const [sessions, setSessions] = useState<BacktestSession[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading backtest sessions', e);
    }
    // Initial sample backtest session for realistic preview
    return [
      {
        id: 'bts-demo-1',
        accountId,
        date: getKarachiDate(),
        strategy: 'SBT Model 1 (Liquidity Sweep + MSS)',
        pair: 'XAUUSD',
        timeframe: 'M15',
        historicalPeriod: 'Jan 2024 - Mar 2024',
        tradesTested: 40,
        wins: 27,
        losses: 13,
        winRate: 67.5,
        averageRiskReward: 2.6,
        profitFactor: 2.1,
        notes: 'High win rate during London & NY overlaps. Avoid Asian session ranges.',
        timestamp: Date.now() - 86400000,
      },
    ];
  });

  const [selectedStrategyFilter, setSelectedStrategyFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Form states
  const [formStrategy, setFormStrategy] = useState<string>(DEFAULT_STRATEGIES[0]);
  const [formCustomStrategy, setFormCustomStrategy] = useState<string>('');
  const [formPair, setFormPair] = useState<string>('XAUUSD');
  const [formCustomPair, setFormCustomPair] = useState<string>('');
  const [formTimeframe, setFormTimeframe] = useState<string>('M15');
  const [formHistoricalPeriod, setFormHistoricalPeriod] = useState<string>('Jan 2024 - Mar 2024');
  const [formTradesTested, setFormTradesTested] = useState<number>(20);
  const [formWins, setFormWins] = useState<number>(13);
  const [formLosses, setFormLosses] = useState<number>(7);
  const [formAvgRR, setFormAvgRR] = useState<number>(2.5);
  const [formNotes, setFormNotes] = useState<string>('');

  // Persist backtest data locally
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
      const savedTime = getKarachiTime12();
      onAutoSaveNotify?.(`${savedTime} PKT`);
    } catch (e) {
      console.warn('Failed saving backtest sessions', e);
    }
  }, [sessions, storageKey, onAutoSaveNotify]);

  // Derived metrics
  const totalTradesTested = sessions.reduce((acc, s) => acc + (s.tradesTested || 0), 0);
  const totalWins = sessions.reduce((acc, s) => acc + (s.wins || 0), 0);
  const totalLosses = sessions.reduce((acc, s) => acc + (s.losses || 0), 0);
  const overallWinRate = totalTradesTested > 0 ? Number(((totalWins / totalTradesTested) * 100).toFixed(1)) : 0;
  const overallAvgRR = sessions.length > 0
    ? Number((sessions.reduce((acc, s) => acc + (s.averageRiskReward || 0), 0) / sessions.length).toFixed(2))
    : 0;

  // Filtered sessions
  const filteredSessions = sessions.filter((s) => {
    if (selectedStrategyFilter === 'ALL') return true;
    return s.strategy.toLowerCase().includes(selectedStrategyFilter.toLowerCase());
  });

  const handleOpenAddModal = () => {
    setEditingSessionId(null);
    setFormStrategy(DEFAULT_STRATEGIES[0]);
    setFormCustomStrategy('');
    setFormPair('XAUUSD');
    setFormCustomPair('');
    setFormTimeframe('M15');
    setFormHistoricalPeriod('Last 3 Months');
    setFormTradesTested(20);
    setFormWins(13);
    setFormLosses(7);
    setFormAvgRR(2.5);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (session: BacktestSession) => {
    setEditingSessionId(session.id);
    if (DEFAULT_STRATEGIES.includes(session.strategy)) {
      setFormStrategy(session.strategy);
      setFormCustomStrategy('');
    } else {
      setFormStrategy('CUSTOM');
      setFormCustomStrategy(session.strategy);
    }

    if (DEFAULT_PAIRS.includes(session.pair)) {
      setFormPair(session.pair);
      setFormCustomPair('');
    } else {
      setFormPair('CUSTOM');
      setFormCustomPair(session.pair);
    }

    setFormTimeframe(session.timeframe);
    setFormHistoricalPeriod(session.historicalPeriod);
    setFormTradesTested(session.tradesTested);
    setFormWins(session.wins);
    setFormLosses(session.losses);
    setFormAvgRR(session.averageRiskReward);
    setFormNotes(session.notes || '');
    setIsModalOpen(true);
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveStrategy = formStrategy === 'CUSTOM' ? formCustomStrategy.trim() || 'Custom Strategy' : formStrategy;
    const effectivePair = formPair === 'CUSTOM' ? formCustomPair.trim().toUpperCase() || 'XAUUSD' : formPair;
    const totalTested = Math.max(1, formTradesTested);
    const winsCount = Math.max(0, formWins);
    const lossesCount = Math.max(0, formLosses);
    const computedWinRate = totalTested > 0 ? Number(((winsCount / totalTested) * 100).toFixed(1)) : 0;

    if (editingSessionId) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSessionId
            ? {
                ...s,
                strategy: effectiveStrategy,
                pair: effectivePair,
                timeframe: formTimeframe,
                historicalPeriod: formHistoricalPeriod.trim() || 'Historical',
                tradesTested: totalTested,
                wins: winsCount,
                losses: lossesCount,
                winRate: computedWinRate,
                averageRiskReward: Number(formAvgRR.toFixed(2)),
                notes: formNotes.trim() || undefined,
              }
            : s
        )
      );
    } else {
      const newSession: BacktestSession = {
        id: `bts-${Date.now()}`,
        accountId,
        date: getKarachiDate(),
        strategy: effectiveStrategy,
        pair: effectivePair,
        timeframe: formTimeframe,
        historicalPeriod: formHistoricalPeriod.trim() || 'Historical',
        tradesTested: totalTested,
        wins: winsCount,
        losses: lossesCount,
        winRate: computedWinRate,
        averageRiskReward: Number(formAvgRR.toFixed(2)),
        notes: formNotes.trim() || undefined,
        timestamp: Date.now(),
      };
      setSessions((prev) => [newSession, ...prev]);
    }

    // Trigger daily task progress
    onBacktestTaskCompleted?.(totalTested);

    setIsModalOpen(false);
  };

  const handleDeleteSession = (id: string) => {
    if (window.confirm('Delete this backtest session record?')) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // Quick action: log today's 10 backtesting trades
  const handleQuickLog10 = () => {
    const newSession: BacktestSession = {
      id: `bts-${Date.now()}`,
      accountId,
      date: getKarachiDate(),
      strategy: 'SBT Model 1 (Liquidity Sweep + MSS)',
      pair: 'XAUUSD',
      timeframe: 'M15',
      historicalPeriod: 'Recent Historical Data',
      tradesTested: 10,
      wins: 7,
      losses: 3,
      winRate: 70.0,
      averageRiskReward: 2.5,
      notes: "Daily Habit Task: 10 SBT Model 1 backtest trades logged.",
      timestamp: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    onBacktestTaskCompleted?.(10);
  };

  return (
    <div className="space-y-6">
      {/* Separation of Concerns Banner (Requirement 25) */}
      <div className="bg-slate-950/90 border border-sky-500/30 rounded-xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase tracking-wider">
                DEVELOPMENT ENVIRONMENT • OFFLINE
              </span>
              <span className="text-xs font-mono-code text-slate-400">
                STRICTLY ISOLATED FROM REAL CAPITAL
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5">
              BACKTESTING DEVELOPMENT SYSTEM
            </h2>
            <p className="text-xs text-slate-400">
              Record, verify, and build statistical confidence in your models without risking capital.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="quick-log-10-btn"
            onClick={handleQuickLog10}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-military font-bold tracking-wider transition"
            title="Automatically logs 10 backtested trades and marks daily habit complete"
          >
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>LOG 10 TRADES TODAY</span>
          </button>
          <button
            id="add-backtest-session-btn"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>RECORD BACKTEST BATCH</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-mono-code text-slate-400 uppercase">Total Tested Trades</div>
          <div className="text-2xl font-bold font-military text-slate-100 mt-1">
            {totalTradesTested.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {sessions.length} recorded session{sessions.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-mono-code text-slate-400 uppercase">Backtest Win Rate</div>
          <div className={`text-2xl font-bold font-military mt-1 ${
            overallWinRate >= 60 ? 'text-emerald-400' : overallWinRate >= 45 ? 'text-cyan-400' : 'text-slate-300'
          }`}>
            {overallWinRate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {totalWins} Wins / {totalLosses} Losses
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-mono-code text-slate-400 uppercase">Avg Risk : Reward</div>
          <div className="text-2xl font-bold font-military text-cyan-400 mt-1">
            1 : {overallAvgRR}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Statistical Edge Ratio</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
          <div className="text-[11px] font-mono-code text-slate-400 uppercase">Daily Habit Link</div>
          <div className="text-sm font-bold font-military text-emerald-400 mt-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>HABIT ACTIVE</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Syncs with Daily Plan</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 border border-slate-800 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono-code text-slate-400">STRATEGY FILTER:</span>
          <select
            value={selectedStrategyFilter}
            onChange={(e) => setSelectedStrategyFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded outline-none focus:border-sky-400 font-mono-code"
          >
            <option value="ALL">ALL STRATEGIES ({sessions.length})</option>
            {DEFAULT_STRATEGIES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono-code text-slate-400">
          SHOWING {filteredSessions.length} OF {sessions.length} SESSIONS
        </div>
      </div>

      {/* Backtest Sessions List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="bg-slate-950/40 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className="text-sm font-military">NO BACKTEST SESSIONS RECORDED YET</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;RECORD BACKTEST BATCH&quot; or &quot;LOG 10 TRADES TODAY&quot; to begin building your model verification history.
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-bold font-mono-code">
                      {session.strategy}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 text-xs font-mono-code font-bold">
                      {session.pair}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono-code">
                      TF: {session.timeframe}
                    </span>
                    <span className="text-xs font-mono-code text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {session.date}
                    </span>
                  </div>

                  <div className="text-xs font-mono-code text-slate-400 mt-1">
                    Historical Period: <span className="text-slate-300">{session.historicalPeriod}</span>
                  </div>

                  {session.notes && (
                    <p className="text-xs text-slate-300 mt-2 bg-slate-950/60 p-2.5 rounded border border-slate-800/80 font-mono-code">
                      {session.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right font-mono-code">
                    <div className="text-xs text-slate-400">
                      Sample Size: <strong className="text-slate-100">{session.tradesTested} Trades</strong>
                    </div>
                    <div className="text-xs mt-0.5">
                      Wins: <span className="text-emerald-400 font-bold">{session.wins}</span> | Losses:{' '}
                      <span className="text-rose-400 font-bold">{session.losses}</span>
                    </div>
                    <div className="text-sm font-bold text-sky-400 mt-0.5">
                      Win Rate: {session.winRate}% (1:{session.averageRiskReward} RR)
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(session)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Record/Edit Backtest Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-military font-bold text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-sky-400" />
                <span>{editingSessionId ? 'EDIT BACKTEST SESSION' : 'RECORD BACKTEST BATCH'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-3">
              <div>
                <label className="text-xs font-mono-code text-slate-400 block mb-1">
                  Strategy / Model
                </label>
                <select
                  value={formStrategy}
                  onChange={(e) => setFormStrategy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400 font-mono-code"
                >
                  {DEFAULT_STRATEGIES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                  <option value="CUSTOM">+ Enter Custom Strategy</option>
                </select>
                {formStrategy === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Enter strategy name"
                    value={formCustomStrategy}
                    onChange={(e) => setFormCustomStrategy(e.target.value)}
                    className="w-full mt-2 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400"
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-mono-code text-slate-400 block mb-1">Instrument / Pair</label>
                  <select
                    value={formPair}
                    onChange={(e) => setFormPair(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400 font-mono-code"
                  >
                    {DEFAULT_PAIRS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Other Pair</option>
                  </select>
                  {formPair === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="e.g. AUDUSD"
                      value={formCustomPair}
                      onChange={(e) => setFormCustomPair(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400 uppercase"
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-mono-code text-slate-400 block mb-1">Timeframe</label>
                  <select
                    value={formTimeframe}
                    onChange={(e) => setFormTimeframe(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400 font-mono-code"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf} value={tf}>
                        {TIMEFRAME_LABELS[tf] || tf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-mono-code text-slate-400 block mb-1">
                  Historical Period Tested
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jan 2024 - Mar 2024 or Q4 2023"
                  value={formHistoricalPeriod}
                  onChange={(e) => setFormHistoricalPeriod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400 font-mono-code"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-mono-code text-slate-400 block mb-1">Trades Tested</label>
                  <input
                    type="number"
                    min="1"
                    value={formTradesTested}
                    onChange={(e) => {
                      const total = parseInt(e.target.value, 10) || 1;
                      setFormTradesTested(total);
                      if (formWins > total) setFormWins(total);
                      setFormLosses(Math.max(0, total - formWins));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400 font-mono-code"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono-code text-slate-400 block mb-1">Wins</label>
                  <input
                    type="number"
                    min="0"
                    max={formTradesTested}
                    value={formWins}
                    onChange={(e) => {
                      const wins = parseInt(e.target.value, 10) || 0;
                      setFormWins(wins);
                      setFormLosses(Math.max(0, formTradesTested - wins));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-emerald-400 outline-none focus:border-sky-400 font-mono-code font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-mono-code text-slate-400 block mb-1">Losses</label>
                  <input
                    type="number"
                    min="0"
                    value={formLosses}
                    onChange={(e) => {
                      const losses = parseInt(e.target.value, 10) || 0;
                      setFormLosses(losses);
                      setFormWins(Math.max(0, formTradesTested - losses));
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-rose-400 outline-none focus:border-sky-400 font-mono-code font-bold"
                    required
                  />
                </div>
              </div>

              {/* Automatic Win Rate & Calculated Edge Preview */}
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800/90 flex items-center justify-between text-xs font-mono-code">
                <span className="text-slate-400">Calculated Win Rate:</span>
                <span className="font-bold text-sky-400">
                  {formTradesTested > 0 ? ((formWins / formTradesTested) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div>
                <label className="text-xs font-mono-code text-slate-400 block mb-1">
                  Average Risk : Reward Ratio (1 : X)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={formAvgRR}
                  onChange={(e) => setFormAvgRR(parseFloat(e.target.value) || 1.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-amber-300 outline-none focus:border-sky-400 font-mono-code"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-mono-code text-slate-400 block mb-1">
                  Notes / Edge Observations
                </label>
                <textarea
                  rows={3}
                  placeholder="Notes on session times, confluence, fakeouts, win rate during news, etc."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-sky-400 font-mono-code"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-military font-bold tracking-wider"
                >
                  SAVE BACKTEST DATA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
