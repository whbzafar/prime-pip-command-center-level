import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowUpDown,
  CandlestickChart,
  TrendingUp,
  Clock,
  Lock,
  Settings,
  Plus,
  Search,
  CheckCircle2,
  X,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit3,
  Sliders,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Shield,
  Smartphone,
  Monitor,
  Zap,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { META5_BROKERS, Meta5Broker } from '../../data/meta5Brokers';
import { META5_INITIAL_SYMBOLS, Meta5Symbol } from '../../data/meta5Instruments';
import { Trade, AccountSettings } from '../../types';

// Web Audio API Order Execution Sound
function playOrderChime() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.26);
  } catch {}
}

export interface Meta5Account {
  id: string;
  login: string;
  name: string;
  brokerId: string;
  brokerName: string;
  server: string;
  accountType: 'LIVE' | 'DEMO';
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  leverage: string;
  isInvestorMode?: boolean;
}

export interface Meta5Position {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  sl: number;
  tp: number;
  openTime: string;
  swap: number;
  commission: number;
  pnl: number;
  comment?: string;
}

export interface Meta5HistoryOrder {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  closePrice: number;
  sl: number;
  tp: number;
  openTime: string;
  closeTime: string;
  swap: number;
  commission: number;
  profit: number;
}

interface Meta5PremiumTerminalProps {
  activeAccount?: AccountSettings | null;
  onAutoLogTradeToJournal?: (trade: Partial<Trade>) => void;
  onOpenJournal?: () => void;
}

type MT5Tab = 'QUOTES' | 'CHARTS' | 'TRADE' | 'HISTORY' | 'SETTINGS';

export const Meta5PremiumTerminal: React.FC<Meta5PremiumTerminalProps> = ({
  activeAccount,
  onAutoLogTradeToJournal,
  onOpenJournal,
}) => {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<MT5Tab>('QUOTES');
  const [quotesMode, setQuotesMode] = useState<'SIMPLE' | 'ADVANCED'>('ADVANCED');
  const [viewMode, setViewMode] = useState<'MOBILE_FRAME' | 'FULL_CANVAS'>('MOBILE_FRAME');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Accounts state
  const [accounts, setAccounts] = useState<Meta5Account[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_meta5_accounts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'acc-ftmo-demo-1',
        login: '6849201',
        name: 'PrimePip VIP Trader',
        brokerId: 'ftmo',
        brokerName: 'FTMO',
        server: 'FTMO-Demo',
        accountType: 'DEMO',
        currency: 'USD',
        balance: 10000.0,
        equity: 10000.0,
        margin: 0.0,
        freeMargin: 10000.0,
        marginLevel: 0,
        leverage: '1:100',
      },
    ];
  });

  const [currentAccountId, setCurrentAccountId] = useState<string>(() => {
    try {
      return localStorage.getItem('primepipfx_meta5_active_id') || 'acc-ftmo-demo-1';
    } catch {
      return 'acc-ftmo-demo-1';
    }
  });

  const currentAccount = useMemo(() => {
    return accounts.find((a) => a.id === currentAccountId) || accounts[0];
  }, [accounts, currentAccountId]);

  // Symbols and live quotes state
  const [symbols, setSymbols] = useState<Meta5Symbol[]>(META5_INITIAL_SYMBOLS);
  const [activeSymbolKey, setActiveSymbolKey] = useState<string>('XAUUSD');
  const [activeTimeframe, setActiveTimeframe] = useState<string>('M15');
  const [chartType, setChartType] = useState<'CANDLE' | 'BAR' | 'LINE'>('CANDLE');

  // Positions (Open trades)
  const [positions, setPositions] = useState<Meta5Position[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_meta5_positions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        ticket: 4892015,
        symbol: 'XAUUSD',
        type: 'BUY',
        volume: 0.5,
        openPrice: 2921.4,
        currentPrice: 2924.5,
        sl: 2915.0,
        tp: 2938.0,
        openTime: '2026.09.29 11:42:15',
        swap: -1.2,
        commission: -3.5,
        pnl: 155.0,
        comment: 'SBT Institutional Model 1',
      },
    ];
  });

  // History (Closed trades)
  const [historyOrders, setHistoryOrders] = useState<Meta5HistoryOrder[]>(() => {
    try {
      const saved = localStorage.getItem('primepipfx_meta5_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        ticket: 4889102,
        symbol: 'EURUSD',
        type: 'SELL',
        volume: 1.0,
        openPrice: 1.0875,
        closePrice: 1.0845,
        sl: 1.0895,
        tp: 1.0845,
        openTime: '2026.09.28 09:30:00',
        closeTime: '2026.09.28 14:15:22',
        swap: -0.85,
        commission: -7.0,
        profit: 300.0,
      },
      {
        ticket: 4882194,
        symbol: 'US30',
        type: 'BUY',
        volume: 0.2,
        openPrice: 43100.0,
        closePrice: 43280.0,
        sl: 43000.0,
        tp: 43300.0,
        openTime: '2026.09.27 15:30:10',
        closeTime: '2026.09.27 19:45:00',
        swap: -2.1,
        commission: -2.0,
        profit: 360.0,
      },
    ];
  });

  // UI Modals
  const [isNewOrderOpen, setIsNewOrderOpen] = useState<boolean>(false);
  const [selectedQuoteForMenu, setSelectedQuoteForMenu] = useState<Meta5Symbol | null>(null);
  const [isAddSymbolOpen, setIsAddSymbolOpen] = useState<boolean>(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState<boolean>(false);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState<boolean>(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState<boolean>(false);
  const [isDOMModalOpen, setIsDOMModalOpen] = useState<boolean>(false);
  const [modifyPositionTarget, setModifyPositionTarget] = useState<Meta5Position | null>(null);
  const [symbolSearchQuery, setSymbolSearchQuery] = useState<string>('');
  const [brokerSearchQuery, setBrokerSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Order Form state
  const [orderSymbol, setOrderSymbol] = useState<string>('XAUUSD');
  const [orderType, setOrderType] = useState<string>('MARKET'); // MARKET, BUY_LIMIT, SELL_LIMIT, BUY_STOP, SELL_STOP
  const [orderLots, setOrderLots] = useState<number>(0.1);
  const [orderSL, setOrderSL] = useState<string>('');
  const [orderTP, setOrderTP] = useState<string>('');
  const [orderPendingPrice, setOrderPendingPrice] = useState<string>('');
  const [oneClickLots, setOneClickLots] = useState<number>(0.1);

  // Toast notifier
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem('primepipfx_meta5_accounts', JSON.stringify(accounts));
      localStorage.setItem('primepipfx_meta5_active_id', currentAccountId);
      localStorage.setItem('primepipfx_meta5_positions', JSON.stringify(positions));
      localStorage.setItem('primepipfx_meta5_history', JSON.stringify(historyOrders));
    } catch {}
  }, [accounts, currentAccountId, positions, historyOrders]);

  // Active Symbol Object
  const activeSymbol = useMemo(() => {
    return symbols.find((s) => s.symbol === activeSymbolKey) || symbols[0];
  }, [symbols, activeSymbolKey]);

  // LIVE QUOTES SIMULATOR ENGINE (Simulates real-time interbank ECN tick stream)
  useEffect(() => {
    const interval = setInterval(() => {
      setSymbols((prev) =>
        prev.map((sym) => {
          // Random tick jitter
          const shouldTick = Math.random() > 0.45;
          if (!shouldTick) return sym;

          const isUp = Math.random() > 0.49;
          const delta = (isUp ? 1 : -1) * (sym.pipSize * (Math.random() * 1.8 + 0.4));
          const newBid = Math.max(0.0001, parseFloat((sym.bid + delta).toFixed(sym.digits)));
          const spreadOffset = (sym.spread * sym.pipSize) / 10;
          const newAsk = parseFloat((newBid + spreadOffset).toFixed(sym.digits));
          const newHigh = Math.max(sym.high, newAsk);
          const newLow = Math.min(sym.low, newBid);

          return {
            ...sym,
            bid: newBid,
            ask: newAsk,
            high: newHigh,
            low: newLow,
            direction: isUp ? 'UP' : 'DOWN',
          };
        })
      );
    }, 850);

    return () => clearInterval(interval);
  }, []);

  // UPDATE OPEN POSITIONS LIVE P&L AND ACCOUNT EQUITY
  useEffect(() => {
    if (positions.length === 0) return;

    setPositions((prev) =>
      prev.map((pos) => {
        const sym = symbols.find((s) => s.symbol === pos.symbol);
        if (!sym) return pos;

        const currentPrice = pos.type === 'BUY' ? sym.bid : sym.ask;
        let priceDiff = pos.type === 'BUY' ? currentPrice - pos.openPrice : pos.openPrice - currentPrice;

        // Calculate USD P&L
        let rawPnl = 0;
        if (pos.symbol === 'XAUUSD') {
          rawPnl = priceDiff * (pos.volume * 100);
        } else if (pos.symbol === 'US30' || pos.symbol === 'NAS100' || pos.symbol === 'GER40') {
          rawPnl = priceDiff * (pos.volume * 1);
        } else {
          rawPnl = (priceDiff / sym.pipSize) * (pos.volume * 10);
        }

        const netPnl = parseFloat((rawPnl + pos.swap + pos.commission).toFixed(2));

        // Auto Stop Loss / Take Profit triggering
        if (pos.sl > 0) {
          if (pos.type === 'BUY' && currentPrice <= pos.sl) {
            handleClosePosition(pos.ticket, true, 'SL Hit');
          } else if (pos.type === 'SELL' && currentPrice >= pos.sl) {
            handleClosePosition(pos.ticket, true, 'SL Hit');
          }
        }

        if (pos.tp > 0) {
          if (pos.type === 'BUY' && currentPrice >= pos.tp) {
            handleClosePosition(pos.ticket, true, 'TP Hit');
          } else if (pos.type === 'SELL' && currentPrice <= pos.tp) {
            handleClosePosition(pos.ticket, true, 'TP Hit');
          }
        }

        return {
          ...pos,
          currentPrice,
          pnl: netPnl,
        };
      })
    );
  }, [symbols]);

  // Recalculate Account Telemetry (Balance, Equity, Margin, Free Margin, Margin Level)
  useEffect(() => {
    const totalFloatingPnL = positions.reduce((acc, p) => acc + p.pnl, 0);
    const totalMargin = positions.reduce((acc, p) => {
      const sym = symbols.find((s) => s.symbol === p.symbol);
      const contract = sym?.contractSize || 100000;
      const levNum = parseInt(currentAccount.leverage.replace('1:', ''), 10) || 100;
      return acc + (p.volume * contract * (sym?.bid || 1)) / levNum;
    }, 0);

    const equity = parseFloat((currentAccount.balance + totalFloatingPnL).toFixed(2));
    const margin = parseFloat(totalMargin.toFixed(2));
    const freeMargin = parseFloat((equity - margin).toFixed(2));
    const marginLevel = margin > 0 ? parseFloat(((equity / margin) * 100).toFixed(2)) : 0;

    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === currentAccount.id
          ? {
              ...acc,
              equity,
              margin,
              freeMargin,
              marginLevel,
            }
          : acc
      )
    );
  }, [positions, currentAccount.balance, currentAccount.leverage]);

  // EXECUTE TRADE ACTION (MARKET & ONE-CLICK)
  const handleExecuteTrade = (
    symKey: string,
    direction: 'BUY' | 'SELL',
    lotSize: number,
    slPrice?: number,
    tpPrice?: number,
    comment?: string
  ) => {
    const targetSymbol = symbols.find((s) => s.symbol === symKey) || activeSymbol;
    const execPrice = direction === 'BUY' ? targetSymbol.ask : targetSymbol.bid;
    const ticketNumber = Math.floor(1000000 + Math.random() * 9000000);
    const now = new Date();
    const timeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const newPosition: Meta5Position = {
      ticket: ticketNumber,
      symbol: targetSymbol.symbol,
      type: direction,
      volume: lotSize,
      openPrice: execPrice,
      currentPrice: execPrice,
      sl: slPrice || 0,
      tp: tpPrice || 0,
      openTime: timeStr,
      swap: 0,
      commission: parseFloat((-3.5 * lotSize).toFixed(2)),
      pnl: 0,
      comment: comment || 'Meta5 Mobile Direct',
    };

    setPositions((prev) => [newPosition, ...prev]);

    if (soundEnabled) {
      playOrderChime();
    }

    // ----------------------------------------------------
    // CRITICAL USER REQUIREMENT: AUTO-LOG TO TRADING JOURNAL
    // ----------------------------------------------------
    if (onAutoLogTradeToJournal) {
      const journalEntry: Partial<Trade> = {
        instrument: targetSymbol.symbol,
        direction: direction,
        entryPrice: execPrice,
        exitPrice: execPrice,
        stopLoss: slPrice || 0,
        takeProfit: tpPrice || 0,
        lotSize: lotSize,
        broker: `${currentAccount.brokerName} (${currentAccount.server})`,
        accountType: currentAccount.accountType === 'LIVE' ? 'PERSONAL_LIVE' : 'DEMO',
        timeframe: (activeTimeframe as any) || 'M15',
        status: 'OPEN',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        notes: `Executed via Meta5 Premium Mobile Terminal (Ticket #${ticketNumber} on ${currentAccount.brokerName}) [Meta5 Live Bridge]`,
        strategy: 'Meta5 Direct Execution',
      };
      onAutoLogTradeToJournal(journalEntry);
    }

    showToast(
      `Order #${ticketNumber} ${direction} ${lotSize} ${targetSymbol.symbol} at ${execPrice} executed & logged to Journal!`
    );
    setIsNewOrderOpen(false);
  };

  // CLOSE POSITION ACTION
  const handleClosePosition = (ticket: number, auto?: boolean, reason?: string) => {
    const pos = positions.find((p) => p.ticket === ticket);
    if (!pos) return;

    const sym = symbols.find((s) => s.symbol === pos.symbol);
    const closePrice = pos.type === 'BUY' ? sym?.bid || pos.currentPrice : sym?.ask || pos.currentPrice;
    const now = new Date();
    const closeTimeStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // Add to history
    const closedOrder: Meta5HistoryOrder = {
      ticket: pos.ticket,
      symbol: pos.symbol,
      type: pos.type,
      volume: pos.volume,
      openPrice: pos.openPrice,
      closePrice: closePrice,
      sl: pos.sl,
      tp: pos.tp,
      openTime: pos.openTime,
      closeTime: closeTimeStr,
      swap: pos.swap,
      commission: pos.commission,
      profit: pos.pnl,
    };

    setHistoryOrders((prev) => [closedOrder, ...prev]);

    // Update account balance
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === currentAccount.id
          ? {
              ...acc,
              balance: parseFloat((acc.balance + pos.pnl).toFixed(2)),
            }
          : acc
      )
    );

    // Remove from active positions
    setPositions((prev) => prev.filter((p) => p.ticket !== ticket));

    if (soundEnabled) {
      playOrderChime();
    }

    // Auto-update journal
    if (onAutoLogTradeToJournal) {
      onAutoLogTradeToJournal({
        instrument: pos.symbol,
        direction: pos.type,
        entryPrice: pos.openPrice,
        exitPrice: closePrice,
        stopLoss: pos.sl,
        takeProfit: pos.tp,
        lotSize: pos.volume,
        profitLoss: pos.pnl,
        status: 'CLOSED',
        result: pos.pnl > 0 ? 'WIN' : pos.pnl < 0 ? 'LOSS' : 'BREAKEVEN',
        notes: `Position Closed via Meta5 Premium (Ticket #${pos.ticket}${reason ? ` - ${reason}` : ''})`,
      });
    }

    showToast(
      `Position #${pos.ticket} ${pos.symbol} closed at ${closePrice}. Realized P&L: ${
        pos.pnl >= 0 ? `+$${pos.pnl}` : `-$${Math.abs(pos.pnl)}`
      }`
    );
  };

  // MODIFY POSITION ACTION
  const handleSaveModifiedPosition = (ticket: number, newSL: number, newTP: number) => {
    setPositions((prev) =>
      prev.map((p) => (p.ticket === ticket ? { ...p, sl: newSL, tp: newTP } : p))
    );
    setIsModifyModalOpen(false);
    showToast(`Order #${ticket} SL / TP updated successfully.`);
  };

  // ADD NEW BROKER / FUNDED ACCOUNT
  const handleAddNewAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const brokerId = String(formData.get('brokerId') || 'ftmo');
    const selectedBroker = META5_BROKERS.find((b) => b.id === brokerId) || META5_BROKERS[0];
    const server = String(formData.get('server') || selectedBroker.servers[0]);
    const login = String(formData.get('login') || `${Math.floor(1000000 + Math.random() * 9000000)}`);
    const name = String(formData.get('name') || 'Funded Account');
    const accountType = (formData.get('accountType') as 'LIVE' | 'DEMO') || 'LIVE';
    const deposit = parseFloat(String(formData.get('deposit') || '10000'));
    const leverage = String(formData.get('leverage') || selectedBroker.defaultLeverage);

    const newAcc: Meta5Account = {
      id: `acc-${Date.now()}`,
      login,
      name,
      brokerId: selectedBroker.id,
      brokerName: selectedBroker.name,
      server,
      accountType,
      currency: 'USD',
      balance: deposit,
      equity: deposit,
      margin: 0,
      freeMargin: deposit,
      marginLevel: 0,
      leverage,
    };

    setAccounts((prev) => [newAcc, ...prev]);
    setCurrentAccountId(newAcc.id);
    setIsAddAccountOpen(false);
    showToast(`Connected to ${selectedBroker.name} (${server}) successfully!`);
  };

  // Helper for formatting MT5 pricing (Big figures vs Pipettes)
  const formatMT5Price = (price: number, digits: number) => {
    const fixed = price.toFixed(digits);
    if (digits === 5 || digits === 3) {
      const main = fixed.slice(0, -1);
      const pipette = fixed.slice(-1);
      return { main, pipette };
    }
    return { main: fixed, pipette: '' };
  };

  // Filtered brokers list
  const filteredBrokers = useMemo(() => {
    if (!brokerSearchQuery.trim()) return META5_BROKERS;
    const q = brokerSearchQuery.toLowerCase();
    return META5_BROKERS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.servers.some((s) => s.toLowerCase().includes(q)) ||
        b.description.toLowerCase().includes(q)
    );
  }, [brokerSearchQuery]);

  // Filtered symbols to add
  const availableToAddSymbols = useMemo(() => {
    const existing = new Set(symbols.map((s) => s.symbol));
    const all = META5_INITIAL_SYMBOLS.filter((s) => !existing.has(s.symbol));
    if (!symbolSearchQuery.trim()) return all;
    const q = symbolSearchQuery.toLowerCase();
    return all.filter(
      (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
    );
  }, [symbols, symbolSearchQuery]);

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-4 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Meta5 Premium Global Control Toolbar */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-2.5 mb-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-sm tracking-wider">
            M5
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-military font-black tracking-wider uppercase text-white flex items-center gap-1.5">
                <span>META 5 MOBILE TERMINAL</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[10px] font-mono-code font-bold text-amber-300 flex items-center gap-1.5 shadow-sm">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>COMING SOON</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono-code">
              Authentic Mobile MT5 Engine • Multi-Broker & Funded Prop Firm Bridge • Auto-Logs to Trade Journal
            </p>
          </div>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title={soundEnabled ? 'Mute Order Chime' : 'Enable Order Chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* View Mode Toggle: Mobile Phone Frame vs Full Screen Canvas */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs font-mono-code">
            <button
              type="button"
              onClick={() => setViewMode('MOBILE_FRAME')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'MOBILE_FRAME'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile Phone View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile Frame</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('FULL_CANVAS')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'FULL_CANVAS'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Full Terminal Canvas"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Full Canvas</span>
            </button>
          </div>

          {/* Jump to Trading Journal Button */}
          {onOpenJournal && (
            <button
              type="button"
              onClick={onOpenJournal}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-military font-bold text-xs tracking-wider uppercase transition shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-950" />
              <span>VIEW JOURNAL</span>
            </button>
          )}
        </div>
      </div>

      {/* High-Tech Coming Soon Official Preview Banner */}
      <div className="w-full max-w-4xl mb-3.5 p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-300 border border-blue-500/30 shrink-0">
            <Clock className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-military font-bold text-white uppercase tracking-wider">
                Meta Premium 5 — Official MT5 Bridge & Broker Integration
              </span>
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-blue-500/40 uppercase">
                COMING SOON
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-mono-code mt-0.5">
              Full MetaTrader 5 mobile terminal with direct broker execution and journal auto-sync is currently in final rollout. Explore the interactive interface below!
            </p>
          </div>
        </div>
      </div>

      {/* Main Terminal Frame Wrapper */}
      <div
        className={`transition-all duration-300 ${
          viewMode === 'MOBILE_FRAME'
            ? 'w-full max-w-[420px] rounded-[44px] p-3 sm:p-4 bg-gradient-to-b from-slate-950 via-slate-900 to-black border-4 border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] relative'
            : 'w-full max-w-5xl rounded-2xl bg-[#0F141F] border border-slate-800 shadow-2xl relative'
        }`}
      >
        {/* Dynamic Island / Mobile Speaker Notch for realistic phone aesthetic */}
        {viewMode === 'MOBILE_FRAME' && (
          <div className="w-full flex items-center justify-between px-6 pt-1 pb-2">
            <span className="text-[11px] font-mono-code font-bold text-slate-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="w-24 h-4 bg-black rounded-full border border-slate-800 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700/80 mr-1" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="font-mono-code text-[10px]">5G</span>
              <div className="w-4 h-2 rounded-sm border border-slate-400 p-0.5 flex items-center">
                <div className="w-full h-full bg-emerald-400 rounded-2xs" />
              </div>
            </div>
          </div>
        )}

        {/* MT5 Mobile Terminal Inner Screen */}
        <div className="w-full bg-[#111622] rounded-[28px] overflow-hidden flex flex-col min-h-[660px] sm:min-h-[720px] border border-slate-800/80 select-none">
          {/* Top Status & Broker Header */}
          <div className="bg-[#161D2D] px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono-code font-black text-white">
                    {currentAccount.login}
                  </span>
                  <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                    {currentAccount.server}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans block leading-tight">
                  {currentAccount.brokerName} • {currentAccount.accountType}
                </span>
              </div>
            </div>

            {/* Quick Order Button `[+]` */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setOrderSymbol(activeSymbolKey);
                  setIsNewOrderOpen(true);
                }}
                className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow shadow-blue-500/30 cursor-pointer flex items-center gap-1 text-[11px]"
                title="New Order"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono-code">NEW ORDER</span>
              </button>
            </div>
          </div>

          {/* TAB CONTENT AREA */}
          <div className="flex-1 overflow-y-auto relative flex flex-col">
            {/* -------------------- 1. QUOTES TAB -------------------- */}
            {activeTab === 'QUOTES' && (
              <div className="flex-1 flex flex-col">
                {/* Quotes Sub-Header: Simple/Advanced Toggle + Add Symbol `+` + Edit */}
                <div className="bg-[#141A28] px-3 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setQuotesMode('SIMPLE')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono-code transition cursor-pointer ${
                        quotesMode === 'SIMPLE'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Simple
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuotesMode('ADVANCED')}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono-code transition cursor-pointer ${
                        quotesMode === 'ADVANCED'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Advanced
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsAddSymbolOpen(true)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-cyan-300 transition cursor-pointer"
                      title="Add Symbol to Watchlist"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quotes List Table */}
                <div className="divide-y divide-slate-800/60 flex-1">
                  {symbols.map((sym) => {
                    const bidFormatted = formatMT5Price(sym.bid, sym.digits);
                    const askFormatted = formatMT5Price(sym.ask, sym.digits);
                    const isTickUp = sym.direction === 'UP';

                    return (
                      <div
                        key={sym.symbol}
                        onClick={() => setSelectedQuoteForMenu(sym)}
                        className={`px-3 py-2.5 hover:bg-slate-800/40 active:bg-slate-800/70 transition flex items-center justify-between cursor-pointer ${
                          activeSymbolKey === sym.symbol ? 'bg-blue-950/20' : ''
                        }`}
                      >
                        {/* Left Column: Symbol Name, Time, Spread */}
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-mono-code font-black text-white tracking-wide">
                              {sym.symbol}
                            </span>
                            {activeSymbolKey === sym.symbol && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            )}
                          </div>
                          {quotesMode === 'ADVANCED' ? (
                            <div className="text-[10px] font-mono-code text-slate-400 mt-0.5 flex items-center gap-2">
                              <span>Spread: {sym.spread}</span>
                              <span className="text-slate-500">|</span>
                              <span>L: {sym.low.toFixed(sym.digits)}</span>
                              <span>H: {sym.high.toFixed(sym.digits)}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 truncate">
                              {sym.name}
                            </div>
                          )}
                        </div>

                        {/* Right Dual Columns: Bid and Ask (Authentic MT5 typography) */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Bid Box */}
                          <div
                            className={`min-w-[70px] text-right font-mono-code transition-colors duration-200 ${
                              isTickUp ? 'text-blue-400' : 'text-rose-400'
                            }`}
                          >
                            <span className="text-base font-bold">{bidFormatted.main}</span>
                            {bidFormatted.pipette && (
                              <sup className="text-[10px] font-normal align-top ml-0.5">
                                {bidFormatted.pipette}
                              </sup>
                            )}
                          </div>

                          {/* Ask Box */}
                          <div
                            className={`min-w-[70px] text-right font-mono-code transition-colors duration-200 ${
                              isTickUp ? 'text-blue-400' : 'text-rose-400'
                            }`}
                          >
                            <span className="text-base font-bold">{askFormatted.main}</span>
                            {askFormatted.pipette && (
                              <sup className="text-[10px] font-normal align-top ml-0.5">
                                {askFormatted.pipette}
                              </sup>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* -------------------- 2. CHARTS TAB -------------------- */}
            {activeTab === 'CHARTS' && (
              <div className="flex-1 flex flex-col">
                {/* Chart Header Bar: Symbol, Timeframe, One-Click Trading Controls */}
                <div className="bg-[#141A28] px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-xs gap-1">
                  {/* Symbol & Timeframe */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-code font-black text-white text-xs">
                      {activeSymbol.symbol}
                    </span>
                    <span className="text-cyan-400 font-mono-code font-bold text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {activeTimeframe}
                    </span>
                  </div>

                  {/* One-Click Lot Size Stepper */}
                  <div className="flex items-center bg-slate-900 px-1 py-0.5 rounded-lg border border-slate-800 text-[10px] font-mono-code">
                    <button
                      type="button"
                      onClick={() => setOneClickLots((l) => Math.max(0.01, parseFloat((l - 0.01).toFixed(2))))}
                      className="px-1 text-slate-400 hover:text-white"
                    >
                      -
                    </button>
                    <span className="px-1.5 font-bold text-white">{oneClickLots.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => setOneClickLots((l) => parseFloat((l + 0.01).toFixed(2)))}
                      className="px-1 text-slate-400 hover:text-white"
                    >
                      +
                    </button>
                  </div>

                  {/* Instant One-Click BUY & SELL Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleExecuteTrade(activeSymbol.symbol, 'SELL', oneClickLots)}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-mono-code font-bold text-[10px] transition cursor-pointer active:scale-95"
                    >
                      SELL {activeSymbol.bid.toFixed(activeSymbol.digits === 5 ? 4 : 2)}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteTrade(activeSymbol.symbol, 'BUY', oneClickLots)}
                      className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-[10px] transition cursor-pointer active:scale-95"
                    >
                      BUY {activeSymbol.ask.toFixed(activeSymbol.digits === 5 ? 4 : 2)}
                    </button>
                  </div>
                </div>

                {/* Timeframe Quick Switcher */}
                <div className="bg-[#121724] px-2 py-1 flex items-center justify-between border-b border-slate-800/80 overflow-x-auto text-[10px] font-mono-code text-slate-400">
                  {['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1', 'MN'].map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setActiveTimeframe(tf)}
                      className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                        activeTimeframe === tf
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:text-slate-200'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                  <div className="flex items-center gap-1 border-l border-slate-800 pl-1.5">
                    <button
                      type="button"
                      onClick={() => setChartType(chartType === 'CANDLE' ? 'LINE' : 'CANDLE')}
                      className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300"
                      title="Toggle Chart Type"
                    >
                      <CandlestickChart className="w-3 h-3 text-cyan-400" />
                    </button>
                  </div>
                </div>

                {/* Interactive Candlestick Canvas (Authentic MT5 Black Grid & Candles) */}
                <div className="flex-1 bg-[#0A0D14] relative overflow-hidden flex flex-col justify-end p-2 min-h-[380px]">
                  {/* Subtle Grid Background */}
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage:
                        'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                      backgroundSize: '36px 36px',
                    }}
                  />

                  {/* Simulated Dynamic Price Candles */}
                  <div className="relative z-10 w-full h-full flex items-end justify-between px-2 pt-6">
                    {Array.from({ length: 24 }).map((_, idx) => {
                      const isUp = idx % 2 === 0 ? idx % 3 !== 0 : idx % 5 === 0;
                      const bodyHeight = 25 + ((idx * 17) % 65);
                      const wickTop = 8 + ((idx * 7) % 20);
                      const wickBottom = 6 + ((idx * 11) % 18);
                      const isLast = idx === 23;

                      return (
                        <div
                          key={idx}
                          className="flex flex-col items-center justify-end relative h-full group"
                          style={{ width: '3.6%' }}
                        >
                          {/* Upper Wick */}
                          <div
                            className={`w-[1px] ${isUp ? 'bg-emerald-400' : 'bg-rose-500'}`}
                            style={{ height: `${wickTop}px` }}
                          />
                          {/* Candle Body */}
                          <div
                            className={`w-full rounded-[1px] transition-all duration-300 ${
                              isUp
                                ? 'bg-emerald-500 border border-emerald-400'
                                : 'bg-rose-600 border border-rose-500'
                            } ${isLast ? 'animate-pulse' : ''}`}
                            style={{ height: `${bodyHeight}px` }}
                          />
                          {/* Lower Wick */}
                          <div
                            className={`w-[1px] ${isUp ? 'bg-emerald-400' : 'bg-rose-500'}`}
                            style={{ height: `${wickBottom}px` }}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Live Active Price Line & Badge across canvas */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-full flex items-center pointer-events-none z-20">
                    <div className="flex-1 border-t border-dashed border-cyan-400/60" />
                    <div className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono-code font-bold text-[10px] shadow-lg">
                      {activeSymbol.bid.toFixed(activeSymbol.digits)}
                    </div>
                  </div>

                  {/* Ask Price Line */}
                  <div className="absolute right-0 top-[44%] -translate-y-1/2 w-full flex items-center pointer-events-none z-10 opacity-70">
                    <div className="flex-1 border-t border-dotted border-rose-400/50" />
                    <div className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 font-mono-code text-[9px]">
                      {activeSymbol.ask.toFixed(activeSymbol.digits)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------- 3. TRADE TAB (POSITIONS & TELEMETRY) -------------------- */}
            {activeTab === 'TRADE' && (
              <div className="flex-1 flex flex-col">
                {/* Account Financial Telemetry Card */}
                <div className="bg-[#141A28] p-3 border-b border-slate-800 space-y-1.5 font-mono-code text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Balance:</span>
                    <span className="font-bold text-white">${currentAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Equity:</span>
                    <span className={`font-bold ${currentAccount.equity >= currentAccount.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ${currentAccount.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800/80">
                    <span>Margin: ${currentAccount.margin.toFixed(2)}</span>
                    <span>Free Margin: ${currentAccount.freeMargin.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Margin Level (%):</span>
                    <span className="font-bold text-cyan-400">
                      {currentAccount.marginLevel > 0 ? `${currentAccount.marginLevel}%` : '0.00%'}
                    </span>
                  </div>
                </div>

                {/* Open Positions List */}
                <div className="flex-1 divide-y divide-slate-800/60 overflow-y-auto">
                  {positions.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 space-y-2">
                      <TrendingUp className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                      <p className="text-xs font-mono-code uppercase tracking-wider">No Open Positions</p>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderSymbol(activeSymbolKey);
                          setIsNewOrderOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono-code text-xs font-bold transition cursor-pointer"
                      >
                        + Open New Position
                      </button>
                    </div>
                  ) : (
                    positions.map((pos) => {
                      const isProfit = pos.pnl >= 0;

                      return (
                        <div
                          key={pos.ticket}
                          className="p-3 hover:bg-slate-800/30 transition flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono-code font-bold text-white text-sm">
                                {pos.symbol},
                              </span>
                              <span
                                className={`text-xs font-mono-code font-bold uppercase ${
                                  pos.type === 'BUY' ? 'text-blue-400' : 'text-rose-400'
                                }`}
                              >
                                {pos.type.toLowerCase()} {pos.volume.toFixed(2)}
                              </span>
                            </div>
                            <span
                              className={`font-mono-code font-bold text-sm ${
                                isProfit ? 'text-blue-400' : 'text-rose-400'
                              }`}
                            >
                              {isProfit ? `+${pos.pnl.toFixed(2)}` : pos.pnl.toFixed(2)} USD
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                            <span>
                              {pos.openPrice} → {pos.currentPrice}
                            </span>
                            <span>Ticket: #{pos.ticket}</span>
                          </div>

                          {/* Stop Loss & Take Profit Info */}
                          <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500">
                            <span>SL: {pos.sl > 0 ? pos.sl : '---'}</span>
                            <span>TP: {pos.tp > 0 ? pos.tp : '---'}</span>
                            <span>Comm: ${pos.commission}</span>
                          </div>

                          {/* Quick Position Action Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setModifyPositionTarget(pos);
                                setIsModifyModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono-code transition cursor-pointer"
                            >
                              Modify SL/TP
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSymbolKey(pos.symbol);
                                setActiveTab('CHARTS');
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono-code transition cursor-pointer"
                            >
                              Chart
                            </button>
                            <button
                              type="button"
                              onClick={() => handleClosePosition(pos.ticket)}
                              className="px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white text-[10px] font-mono-code font-bold transition cursor-pointer"
                            >
                              Close Position
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* -------------------- 4. HISTORY TAB -------------------- */}
            {activeTab === 'HISTORY' && (
              <div className="flex-1 flex flex-col">
                {/* Financial Statement Summary Banner */}
                <div className="bg-[#141A28] p-3 border-b border-slate-800 font-mono-code text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Profit:</span>
                    <span className="font-bold text-emerald-400">
                      +${historyOrders.reduce((acc, h) => acc + h.profit, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Deposit:</span>
                    <span className="text-white">${currentAccount.balance.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Closed Trades:</span>
                    <span className="text-white">{historyOrders.length}</span>
                  </div>
                </div>

                {/* Closed Trades List */}
                <div className="flex-1 divide-y divide-slate-800/60 overflow-y-auto">
                  {historyOrders.map((ord) => {
                    const isProfit = ord.profit >= 0;

                    return (
                      <div key={ord.ticket} className="p-3 hover:bg-slate-800/30 transition space-y-1">
                        <div className="flex items-center justify-between font-mono-code">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{ord.symbol},</span>
                            <span
                              className={`text-xs font-bold uppercase ${
                                ord.type === 'BUY' ? 'text-blue-400' : 'text-rose-400'
                              }`}
                            >
                              {ord.type.toLowerCase()} {ord.volume.toFixed(2)}
                            </span>
                          </div>
                          <span
                            className={`font-bold text-sm ${
                              isProfit ? 'text-blue-400' : 'text-rose-400'
                            }`}
                          >
                            {isProfit ? `+${ord.profit.toFixed(2)}` : ord.profit.toFixed(2)} USD
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-mono-code text-slate-400">
                          <span>
                            {ord.openPrice} → {ord.closePrice}
                          </span>
                          <span>Ticket: #{ord.ticket}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-500">
                          <span>Close: {ord.closeTime}</span>
                          <span>Net: ${(ord.profit + ord.commission + ord.swap).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* -------------------- 5. SETTINGS / ACCOUNTS TAB -------------------- */}
            {activeTab === 'SETTINGS' && (
              <div className="flex-1 flex flex-col p-3 space-y-3 overflow-y-auto">
                {/* Active Connected Account Badge */}
                <div className="p-3.5 rounded-2xl bg-[#141A28] border border-blue-500/40 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-code text-blue-400 uppercase font-bold tracking-wider">
                      ACTIVE TRADING ACCOUNT
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono-code font-bold text-emerald-400">
                      CONNECTED
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-sm">
                      {currentAccount.brokerName.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-mono-code font-bold text-white text-sm">
                        {currentAccount.name}
                      </div>
                      <div className="text-xs text-slate-300 font-mono-code">
                        {currentAccount.login} • {currentAccount.server}
                      </div>
                      <div className="text-[11px] text-cyan-400 font-mono-code">
                        Leverage: {currentAccount.leverage} • Balance: ${currentAccount.balance.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manage Accounts & Add Account Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-mono-code uppercase font-bold text-slate-400">
                      Saved Accounts ({accounts.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddAccountOpen(true)}
                      className="text-xs font-mono-code text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add / Connect Broker</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800/80 rounded-xl bg-[#141A28] border border-slate-800 overflow-hidden">
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        onClick={() => {
                          setCurrentAccountId(acc.id);
                          showToast(`Switched active terminal to ${acc.brokerName} (${acc.login})`);
                        }}
                        className={`p-3 flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition ${
                          acc.id === currentAccountId ? 'bg-blue-950/25 border-l-4 border-blue-500' : ''
                        }`}
                      >
                        <div>
                          <div className="font-mono-code font-bold text-white text-xs flex items-center gap-2">
                            <span>{acc.name}</span>
                            <span className="text-[10px] text-slate-400">({acc.login})</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-sans">
                            {acc.brokerName} • {acc.server}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-mono-code font-bold text-white block">
                            ${acc.balance.toLocaleString()}
                          </span>
                          {acc.id === currentAccountId ? (
                            <span className="text-[10px] font-mono-code text-emerald-400 font-bold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono-code text-slate-500">
                              Tap to switch
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Settings Items */}
                <div className="rounded-xl bg-[#141A28] border border-slate-800 divide-y divide-slate-800/80 text-xs font-mono-code">
                  <div className="p-3 flex items-center justify-between">
                    <span>Order Execution Sound</span>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`w-9 h-5 rounded-full p-0.5 transition cursor-pointer ${
                        soundEnabled ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          soundEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span>Auto-Log Executions to Journal</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ENABLED
                    </span>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span>One-Click Trading</span>
                    <span className="text-blue-400 font-bold">ACTIVE</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* THE ICONIC 5 BOTTOM NAVIGATION TABS (Mobile MT5) */}
          <div className="bg-[#141A28] border-t border-slate-800/90 grid grid-cols-5 py-2 px-1 text-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('QUOTES')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                activeTab === 'QUOTES' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-[10px] font-sans">Quotes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('CHARTS')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                activeTab === 'CHARTS' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CandlestickChart className="w-4 h-4" />
              <span className="text-[10px] font-sans">Charts</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TRADE')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                activeTab === 'TRADE' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-[10px] font-sans">Trade</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                activeTab === 'HISTORY' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-sans">History</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex flex-col items-center gap-1 transition cursor-pointer ${
                activeTab === 'SETTINGS' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-[10px] font-sans">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* -------------------- POPUP 1: AUTHENTIC NEW ORDER MODAL -------------------- */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#141A28] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100">
            {/* Header */}
            <div className="bg-[#182133] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-mono-code font-black text-white text-base">
                  {orderSymbol}
                </span>
                <span className="text-[11px] text-slate-400 block font-sans">
                  {symbols.find((s) => s.symbol === orderSymbol)?.name || 'Market Execution'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Order Type Selector */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                  Order Type
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none cursor-pointer"
                >
                  <option value="MARKET">Market Execution</option>
                  <option value="BUY_LIMIT">Buy Limit</option>
                  <option value="SELL_LIMIT">Sell Limit</option>
                  <option value="BUY_STOP">Buy Stop</option>
                  <option value="SELL_STOP">Sell Stop</option>
                </select>
              </div>

              {/* Lot Size Stepper */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                  Volume (Lots)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrderLots((l) => Math.max(0.01, parseFloat((l - 0.1).toFixed(2))))}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-code font-bold text-slate-300"
                  >
                    -0.1
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderLots((l) => Math.max(0.01, parseFloat((l - 0.01).toFixed(2))))}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-code font-bold text-slate-300"
                  >
                    -0.01
                  </button>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={orderLots}
                    onChange={(e) => setOrderLots(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                    className="flex-1 bg-[#0D121D] border border-slate-700 rounded-lg py-2 text-center text-sm font-mono-code font-bold text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setOrderLots((l) => parseFloat((l + 0.01).toFixed(2)))}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-code font-bold text-slate-300"
                  >
                    +0.01
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderLots((l) => parseFloat((l + 0.1).toFixed(2)))}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono-code font-bold text-slate-300"
                  >
                    +0.1
                  </button>
                </div>
              </div>

              {/* Dual Live Quote Panels */}
              <div className="grid grid-cols-2 gap-2 text-center py-1">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Bid (Sell)</span>
                  <span className="text-lg font-mono-code font-bold text-rose-400">
                    {symbols.find((s) => s.symbol === orderSymbol)?.bid.toFixed(4) || '---'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono-code text-slate-400 uppercase block">Ask (Buy)</span>
                  <span className="text-lg font-mono-code font-bold text-blue-400">
                    {symbols.find((s) => s.symbol === orderSymbol)?.ask.toFixed(4) || '---'}
                  </span>
                </div>
              </div>

              {/* Stop Loss (SL) & Take Profit (TP) Inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                    Stop Loss (SL)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0000"
                    value={orderSL}
                    onChange={(e) => setOrderSL(e.target.value)}
                    className="w-full bg-[#0D121D] border border-slate-700 rounded-lg p-2 text-xs font-mono-code text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                    Take Profit (TP)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0000"
                    value={orderTP}
                    onChange={(e) => setOrderTP(e.target.value)}
                    className="w-full bg-[#0D121D] border border-slate-700 rounded-lg p-2 text-xs font-mono-code text-white outline-none"
                  />
                </div>
              </div>

              {/* Dual Big Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    handleExecuteTrade(
                      orderSymbol,
                      'SELL',
                      orderLots,
                      orderSL ? parseFloat(orderSL) : undefined,
                      orderTP ? parseFloat(orderTP) : undefined
                    )
                  }
                  className="py-3 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono-code font-bold text-xs transition cursor-pointer shadow-lg shadow-rose-600/30 flex flex-col items-center justify-center"
                >
                  <span className="text-[10px] opacity-80 uppercase">Sell by Market</span>
                  <span className="text-sm font-black">
                    {symbols.find((s) => s.symbol === orderSymbol)?.bid.toFixed(4)}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleExecuteTrade(
                      orderSymbol,
                      'BUY',
                      orderLots,
                      orderSL ? parseFloat(orderSL) : undefined,
                      orderTP ? parseFloat(orderTP) : undefined
                    )
                  }
                  className="py-3 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs transition cursor-pointer shadow-lg shadow-blue-600/30 flex flex-col items-center justify-center"
                >
                  <span className="text-[10px] opacity-80 uppercase">Buy by Market</span>
                  <span className="text-sm font-black">
                    {symbols.find((s) => s.symbol === orderSymbol)?.ask.toFixed(4)}
                  </span>
                </button>
              </div>

              <div className="text-[10px] text-center text-slate-400 font-mono-code">
                ⚡ Automatically synced to your Trade Journal upon execution.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- POPUP 2: QUOTE CONTEXT MENU (Tap a Quote) -------------------- */}
      {selectedQuoteForMenu && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedQuoteForMenu(null)}
        >
          <div
            className="w-full max-w-sm bg-[#161D2D] border border-slate-700 rounded-3xl shadow-2xl p-4 space-y-2 animate-in slide-in-from-bottom-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-mono-code font-black text-white text-base">
                {selectedQuoteForMenu.symbol}
              </span>
              <span className="text-xs text-slate-400 font-sans">
                {selectedQuoteForMenu.name}
              </span>
            </div>

            <div className="space-y-1 pt-1">
              <button
                type="button"
                onClick={() => {
                  setOrderSymbol(selectedQuoteForMenu.symbol);
                  setSelectedQuoteForMenu(null);
                  setIsNewOrderOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <span>New Order</span>
                <Plus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSymbolKey(selectedQuoteForMenu.symbol);
                  setSelectedQuoteForMenu(null);
                  setActiveTab('CHARTS');
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-code font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <span>Open Chart</span>
                <CandlestickChart className="w-4 h-4 text-cyan-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPropertiesModalOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono-code font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <span>Properties / Specification</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- POPUP 3: ADD BROKER / FUNDED ACCOUNT -------------------- */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-[#141A28] border border-slate-700 rounded-3xl shadow-2xl p-5 my-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-mono-code font-black text-white text-base">
                  CONNECT BROKER / PROP FIRM
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Connect FTMO, FundedNext, IC Markets, Exness, or any MT5 server
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddAccountOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewAccount} className="space-y-3.5">
              {/* Search / Filter Broker */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                  Select Broker or Funded Prop Firm
                </label>
                <input
                  type="text"
                  placeholder="Search broker (e.g. FTMO, FundedNext, IC Markets)..."
                  value={brokerSearchQuery}
                  onChange={(e) => setBrokerSearchQuery(e.target.value)}
                  className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none mb-2"
                />

                <select
                  name="brokerId"
                  className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                >
                  {filteredBrokers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.category === 'PROP_FIRM' ? 'Prop Firm' : 'Broker'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Server Name */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                  Server
                </label>
                <input
                  type="text"
                  name="server"
                  defaultValue="FTMO-Demo"
                  placeholder="e.g. FTMO-Demo, ICMarkets-Live01"
                  className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                  required
                />
              </div>

              {/* Login and Name */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                    Login / Account #
                  </label>
                  <input
                    type="text"
                    name="login"
                    placeholder="e.g. 6849201"
                    defaultValue={`${Math.floor(1000000 + Math.random() * 9000000)}`}
                    className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                    Trader Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    defaultValue="PrimePip Trader"
                    className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                  Password (Master or Investor)
                </label>
                <input
                  type="password"
                  name="password"
                  defaultValue="••••••••"
                  className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                  required
                />
              </div>

              {/* Account Type and Starting Deposit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                    Account Type
                  </label>
                  <select
                    name="accountType"
                    className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                  >
                    <option value="LIVE">Live / Real Account</option>
                    <option value="DEMO">Demo Practice Account</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                    Deposit Balance ($)
                  </label>
                  <select
                    name="deposit"
                    className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                  >
                    <option value="5000">$5,000</option>
                    <option value="10000" selected>$10,000</option>
                    <option value="25000">$25,000</option>
                    <option value="50000">$50,000</option>
                    <option value="100000">$100,000</option>
                    <option value="200000">$200,000</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs tracking-wider uppercase transition shadow-lg shadow-blue-500/25 cursor-pointer mt-2"
              >
                Connect to Meta5 Terminal
              </button>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- POPUP 4: ADD SYMBOLS TO WATCHLIST -------------------- */}
      {isAddSymbolOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#141A28] border border-slate-700 rounded-3xl shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-mono-code font-bold text-white text-sm">
                ADD SYMBOL TO WATCHLIST
              </span>
              <button
                type="button"
                onClick={() => setIsAddSymbolOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Search symbol (e.g. Gold, US30, GBPJPY)..."
              value={symbolSearchQuery}
              onChange={(e) => setSymbolSearchQuery(e.target.value)}
              className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
            />

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80">
              {availableToAddSymbols.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs font-mono-code">
                  All available instruments added to watchlist.
                </div>
              ) : (
                availableToAddSymbols.map((item) => (
                  <div
                    key={item.symbol}
                    onClick={() => {
                      setSymbols((prev) => [...prev, item]);
                      showToast(`Added ${item.symbol} to watchlist`);
                      setIsAddSymbolOpen(false);
                    }}
                    className="py-2 px-2 hover:bg-slate-800/40 flex items-center justify-between cursor-pointer rounded-lg transition"
                  >
                    <div>
                      <span className="font-mono-code font-bold text-white text-xs block">
                        {item.symbol}
                      </span>
                      <span className="text-[10px] text-slate-400">{item.name}</span>
                    </div>
                    <Plus className="w-4 h-4 text-cyan-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- POPUP 5: MODIFY POSITION (SL / TP) -------------------- */}
      {isModifyModalOpen && modifyPositionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#141A28] border border-slate-700 rounded-3xl shadow-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="font-mono-code font-bold text-white text-sm">
                  MODIFY ORDER #{modifyPositionTarget.ticket}
                </span>
                <span className="text-xs text-slate-400 font-sans block">
                  {modifyPositionTarget.symbol} {modifyPositionTarget.type} {modifyPositionTarget.volume}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModifyModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                  Stop Loss (SL)
                </label>
                <input
                  type="number"
                  step="any"
                  defaultValue={modifyPositionTarget.sl || ''}
                  id="modify-sl-input"
                  className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                  placeholder="Set Stop Loss price"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono-code text-slate-400 uppercase font-bold block mb-1">
                  Take Profit (TP)
                </label>
                <input
                  type="number"
                  step="any"
                  defaultValue={modifyPositionTarget.tp || ''}
                  id="modify-tp-input"
                  className="w-full bg-[#0D121D] border border-slate-700 rounded-xl p-2.5 text-xs font-mono-code text-white outline-none"
                  placeholder="Set Take Profit price"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const slVal = parseFloat(
                    (document.getElementById('modify-sl-input') as HTMLInputElement)?.value || '0'
                  );
                  const tpVal = parseFloat(
                    (document.getElementById('modify-tp-input') as HTMLInputElement)?.value || '0'
                  );
                  handleSaveModifiedPosition(modifyPositionTarget.ticket, slVal, tpVal);
                }}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono-code font-bold text-xs tracking-wider uppercase transition shadow-md shadow-blue-500/30 cursor-pointer"
              >
                Modify Order Levels
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- POPUP 6: SYMBOL PROPERTIES MODAL -------------------- */}
      {isPropertiesModalOpen && selectedQuoteForMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-[#141A28] border border-slate-700 rounded-3xl shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-mono-code font-bold text-white text-sm">
                SPECIFICATION: {selectedQuoteForMenu.symbol}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsPropertiesModalOpen(false);
                  setSelectedQuoteForMenu(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono-code text-slate-300 divide-y divide-slate-800/80">
              <div className="flex justify-between py-1">
                <span>Contract Size:</span>
                <span className="text-white">{selectedQuoteForMenu.contractSize.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Digits:</span>
                <span className="text-white">{selectedQuoteForMenu.digits}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Spread:</span>
                <span className="text-cyan-400">{selectedQuoteForMenu.spread} points (Floating)</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Pip Size:</span>
                <span className="text-white">{selectedQuoteForMenu.pipSize}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Margin Rate:</span>
                <span className="text-white">{selectedQuoteForMenu.marginPercent}%</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Execution Mode:</span>
                <span className="text-emerald-400 font-bold">Instant ECN / Raw Spread</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-16 sm:bottom-8 z-50 max-w-md px-4 py-2.5 rounded-xl bg-slate-900 border border-blue-500/60 text-white text-xs font-mono-code shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
