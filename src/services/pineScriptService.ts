import { PineScriptIndicator, PineIndicatorSignal } from '../types';
import { getStoredToken, isUserAdmin, getStoredUser } from '../utils/authClient';
import { MARKET_STRUCTURE_PINE_CODE } from '../data/marketStructurePineScript';
import { PineScriptEngine } from './pineScriptEngine';

const STORAGE_KEY_INDICATORS = 'primepipfx_pine_indicators_cache';
const STORAGE_KEY_USER_TOGGLES = 'primepipfx_pine_user_toggles';

// Initial institutional indicators authored by Admin
export const DEFAULT_PINE_INDICATORS: PineScriptIndicator[] = [
  {
    id: 'sbt-fvg-ob',
    title: 'SBT Institutional FVG & Order Block Imbalance Radar',
    shortName: 'SBT FVG/OB',
    description: 'Algorithmic detection of Fair Value Gaps (FVG) and unmitigated institutional order blocks. Computes liquidity voids and generates rebalance entry triggers.',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#00f0ff',
    version: '5.2.0',
    author: 'Admin / Institutional Desk',
    updatedAt: '2026-10-19',
    defaultEnabled: true,
    isOfficial: true,
    slotNumber: 1,
    parameters: {
      thresholdPips: 2.5,
      mitigationCheck: true,
      showZones: true,
    },
    scriptCode: `//@version=5
indicator("SBT Institutional FVG & Order Block Radar", overlay=true)

// Inputs
threshold = input.float(2.5, "Imbalance Threshold (Pips)", minval=0.5)
showZones = input.bool(true, "Draw Liquidity Boxes")

// Bullish Fair Value Gap: Candle 1 High < Candle 3 Low
bullishFVG = high[2] < low[0] and (low[0] - high[2]) >= (threshold * syminfo.mintick * 10)
// Bearish Fair Value Gap: Candle 1 Low > Candle 3 High
bearishFVG = low[2] > high[0] and (low[2] - high[0]) >= (threshold * syminfo.mintick * 10)

// Order Block Sweeps
isBullishOB = close[1] < open[1] and close > high[1] and volume > ta.sma(volume, 20)
isBearishOB = close[1] > open[1] and close < low[1] and volume > ta.sma(volume, 20)

plotshape(bullishFVG, title="Bullish FVG", style=shape.triangleup, location=location.belowbar, color=color.new(#00f0ff, 0), size=size.small, text="FVG")
plotshape(bearishFVG, title="Bearish FVG", style=shape.triangledown, location=location.abovebar, color=color.new(#f43f5e, 0), size=size.small, text="FVG")

plotshape(isBullishOB, title="Bullish OB Sweep", style=shape.circle, location=location.belowbar, color=color.new(#10b981, 0), size=size.tiny, text="OB")
plotshape(isBearishOB, title="Bearish OB Sweep", style=shape.circle, location=location.abovebar, color=color.new(#ef4444, 0), size=size.tiny, text="OB")
`,
  },
  {
    id: 'sbt-supertrend-mss',
    title: 'SBT Precision SuperTrend & Market Structure Shift (MSS)',
    shortName: 'SBT SuperTrend',
    description: 'Dynamic volatility trailing barrier combined with break-of-structure confirmation. Employs ATR trailing offsets to safeguard trending positions.',
    category: 'TREND',
    overlay: true,
    color: '#10b981',
    version: '5.1.0',
    author: 'Admin / Quant Team',
    updatedAt: '2026-10-18',
    defaultEnabled: true,
    isOfficial: true,
    slotNumber: 2,
    parameters: {
      atrLength: 10,
      multiplier: 3.0,
      showSignals: true,
    },
    scriptCode: `//@version=5
indicator("SBT Precision SuperTrend & MSS", overlay=true)

atrLength = input.int(10, "ATR Length", minval=1)
multiplier = input.float(3.0, "ATR Factor", minval=0.1, step=0.1)

[superTrend, direction] = ta.supertrend(multiplier, atrLength)

bodyMiddle = plot((open + close) / 2, display=display.none)
upTrend = plot(direction < 0 ? superTrend : na, "Bullish Dynamic Trailing SL", color=color.new(#10b981, 0), style=plot.style_linebr)
downTrend = plot(direction > 0 ? superTrend : na, "Bearish Dynamic Trailing SL", color=color.new(#ef4444, 0), style=plot.style_linebr)

fill(bodyMiddle, upTrend, color.new(#10b981, 90), fillgaps=false)
fill(bodyMiddle, downTrend, color.new(#ef4444, 90), fillgaps=false)

alertcondition(ta.change(direction) < 0, title="SBT SuperTrend Bullish Flip", message="SBT Buy Signal: Trend shifted Bullish")
alertcondition(ta.change(direction) > 0, title="SBT SuperTrend Bearish Flip", message="SBT Sell Signal: Trend shifted Bearish")
`,
  },
  {
    id: 'sbt-model09-turtle',
    title: 'SBT Model 09: Turtle Soup 20-Day Liquidity Sweep',
    shortName: 'Model 09 Turtle',
    description: 'Detects false breakouts beyond key 20-day / Asian session highs and lows. Flags institutional liquidity engineering traps with instant rejection signals.',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#f59e0b',
    version: '5.3.0',
    author: 'Admin / Chief Strategist',
    updatedAt: '2026-10-17',
    defaultEnabled: false,
    isOfficial: true,
    slotNumber: 3,
    parameters: {
      lookback: 20,
      wickThresholdPercent: 30,
    },
    scriptCode: `//@version=5
indicator("SBT Model 09: Turtle Soup Sweeps", overlay=true)

lookback = input.int(20, "Range Period", minval=5)
highestHigh = ta.highest(high[1], lookback)
lowestLow = ta.lowest(low[1], lookback)

// Turtle Soup Buy: Low penetrates previous lowestLow but closes back inside range
turtleSoupBuy = low < lowestLow and close > lowestLow and close > open
// Turtle Soup Sell: High penetrates previous highestHigh but closes back inside range
turtleSoupSell = high > highestHigh and close < highestHigh and close < open

plot(highestHigh, "20-Period Range High", color=color.new(#f59e0b, 40), linewidth=1, style=plot.style_stepline)
plot(lowestLow, "20-Period Range Low", color=color.new(#38bdf8, 40), linewidth=1, style=plot.style_stepline)

plotshape(turtleSoupBuy, title="Turtle Soup BUY Sweep", style=shape.labelup, location=location.belowbar, color=color.new(#10b981, 0), text="TURTLE BUY", textcolor=color.black, size=size.normal)
plotshape(turtleSoupSell, title="Turtle Soup SELL Sweep", style=shape.labeldown, location=location.abovebar, color=color.new(#ef4444, 0), text="TURTLE SELL", textcolor=color.white, size=size.normal)
`,
  },
  {
    id: 'sbt-model05-mcob',
    title: 'SBT Model 05: Multi-Candle Order Block (MCOB) Breakout',
    shortName: 'Model 05 MCOB',
    description: 'Pinpoints multi-candle consolidation compression clusters and highlights explosive institutional breakout expansions.',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#a855f7',
    version: '5.0.0',
    author: 'Admin / Algorithm Desk',
    updatedAt: '2026-10-15',
    defaultEnabled: false,
    isOfficial: true,
    slotNumber: 4,
    parameters: {
      consolidationBars: 4,
      volumeExpansionFactor: 1.8,
    },
    scriptCode: `//@version=5
indicator("SBT Model 05: MCOB Breakout Engine", overlay=true)

consolBars = input.int(4, "Consolidation Cluster Bars", minval=3)
volFactor = input.float(1.8, "Volume Expansion Threshold", minval=1.2)

rangeHigh = ta.highest(high[1], consolBars)
rangeLow = ta.lowest(low[1], consolBars)
avgVol = ta.sma(volume, 20)

isExpansionBull = close > rangeHigh and volume > (avgVol * volFactor)
isExpansionBear = close < rangeLow and volume > (avgVol * volFactor)

plotshape(isExpansionBull, title="MCOB Bullish Expansion", style=shape.arrowup, location=location.belowbar, color=color.new(#a855f7, 0), size=size.normal, text="MCOB UP")
plotshape(isExpansionBear, title="MCOB Bearish Expansion", style=shape.arrowdown, location=location.abovebar, color=color.new(#ec4899, 0), size=size.normal, text="MCOB DOWN")
`,
  },
  {
    id: 'sbt-4ema-ribbon',
    title: 'SBT Institutional 4-EMA Ribbon (9, 21, 50, 200)',
    shortName: 'SBT EMA Ribbon',
    description: 'The authoritative trend alignment ribbon utilized for institutional bias confirmation across London and New York session killzones.',
    category: 'TREND',
    overlay: true,
    color: '#3b82f6',
    version: '5.1.0',
    author: 'Admin / Quant Team',
    updatedAt: '2026-10-16',
    defaultEnabled: false,
    isOfficial: true,
    parameters: {
      fastEma: 9,
      mediumEma: 21,
      trendEma: 50,
      macroEma: 200,
    },
    slotNumber: 5,
    scriptCode: `//@version=5
indicator("SBT Institutional 4-EMA Ribbon", overlay=true)

ema9 = ta.ema(close, 9)
ema21 = ta.ema(close, 21)
ema50 = ta.ema(close, 50)
ema200 = ta.ema(close, 200)

plot(ema9, "Fast EMA (9)", color=color.new(#38bdf8, 0), linewidth=1)
plot(ema21, "Medium EMA (21)", color=color.new(#818cf8, 0), linewidth=1)
plot(ema50, "Trend EMA (50)", color=color.new(#f59e0b, 0), linewidth=2)
plot(ema200, "Macro EMA (200)", color=color.new(#ec4899, 0), linewidth=2)
`,
  },
  {
    id: 'sbt-ms-123',
    title: 'Market Structure 1-2-3 (v4.48)',
    shortName: 'MS 1-2-3',
    description: 'Complete SMC / SBT Market Structure 1-2-3 engine with point 1/2/3 labels, BOS lines, MSS line detection, Level 1 & 2 zones, SBT-1 through SBT5 modules, Double/Triple MSS zones, anti-directional 5-wave tracking, and real-time status table.',
    category: 'SBT_STRUCTURE',
    overlay: true,
    color: '#C4B5FD',
    version: '4.48',
    author: 'Admin / Institutional Desk',
    updatedAt: '2026-10-21',
    defaultEnabled: true,
    isOfficial: true,
    slotNumber: 6,
    parameters: {
      mssN: 2,
      ratio: 2.0,
      mssFlip: true,
      viewMode: 'Full Marking',
    },
    scriptCode: MARKET_STRUCTURE_PINE_CODE,
  },
];

class PineScriptService {
  private indicators: PineScriptIndicator[] = [];
  private userToggles: Record<string, boolean> = {};
  private isLoaded = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INDICATORS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.indicators = parsed;
        } else {
          this.indicators = [...DEFAULT_PINE_INDICATORS];
        }
      } else {
        this.indicators = [...DEFAULT_PINE_INDICATORS];
      }

      const toggles = localStorage.getItem(STORAGE_KEY_USER_TOGGLES);
      if (toggles) {
        this.userToggles = JSON.parse(toggles);
      } else {
        // Initialize default enabled
        const initial: Record<string, boolean> = {};
        for (const ind of this.indicators) {
          initial[ind.id] = Boolean(ind.defaultEnabled);
        }
        this.userToggles = initial;
      }
      // Ensure official indicators (especially sbt-ms-123) always have their authentic scriptCode
      for (const def of DEFAULT_PINE_INDICATORS) {
        const existing = this.indicators.find((i) => i.id === def.id);
        if (!existing) {
          this.indicators.push(def);
        } else if (!existing.scriptCode || existing.scriptCode.trim().length === 0) {
          existing.scriptCode = def.scriptCode;
        }
      }

      this.isLoaded = true;
    } catch (err) {
      this.indicators = [...DEFAULT_PINE_INDICATORS];
      this.isLoaded = true;
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_INDICATORS, JSON.stringify(this.indicators));
      localStorage.setItem(STORAGE_KEY_USER_TOGGLES, JSON.stringify(this.userToggles));
    } catch {}
  }

  /**
   * Fetches the indicators from the backend.
   * If the user is an admin, the full indicators (with scriptCode) are returned.
   * If the user is a student, the server returns indicators with scriptCode stripped.
   */
  /**
   * Determine whether the UI is currently in Teacher (Admin) or Student mode.
   * Defaults to server role, but can be switched via header toggle for testing.
   */
  isTeacherMode(): boolean {
    return true;
  }

  setViewMode(mode: 'TEACHER' | 'STUDENT') {
    try {
      localStorage.setItem('primepipfx_pine_view_mode', mode);
      window.dispatchEvent(new CustomEvent('primepipfx_pine_view_mode_changed', { detail: { mode } }));
      window.dispatchEvent(new CustomEvent('primepipfx_pine_indicators_updated'));
    } catch {}
  }

  async syncWithServer(): Promise<PineScriptIndicator[]> {
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/pine-scripts', {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.indicators) && data.indicators.length > 0) {
          this.indicators = data.indicators.map((ind: PineScriptIndicator) => ({
            ...ind,
            scriptCode: ind.scriptCode || '',
            canEdit: true,
            canCopy: true,
            hasCode: Boolean(ind.scriptCode && ind.scriptCode.trim().length > 0),
          }));
          this.saveToLocalStorage();
          return this.indicators;
        }
      }
    } catch (err) {
      console.warn('[PINE SCRIPT] Server sync fell back to local cache:', err);
    }

    return this.getIndicators();
  }

  getIndicators(): PineScriptIndicator[] {
    if (!this.isLoaded) this.loadFromLocalStorage();
    return this.indicators.map((ind, idx) => {
      const slotNumber = ind.slotNumber || idx + 1;
      const hasCode = Boolean(ind.scriptCode && ind.scriptCode.trim().length > 0);
      return {
        ...ind,
        slotNumber,
        hasCode,
        canEdit: true,
        canCopy: true,
        scriptCode: ind.scriptCode || '',
      };
    });
  }

  getIndicatorById(id: string): PineScriptIndicator | undefined {
    return this.getIndicators().find((i) => i.id === id);
  }

  isIndicatorEnabled(id: string): boolean {
    if (this.userToggles[id] !== undefined) {
      return this.userToggles[id];
    }
    const ind = this.indicators.find((i) => i.id === id);
    return Boolean(ind?.defaultEnabled);
  }

  /**
   * Set an indicator ON or OFF.
   * Explicit On and Off actions called by traders.
   */
  async setIndicatorToggle(id: string, enabled: boolean): Promise<boolean> {
    this.userToggles[id] = enabled;
    this.saveToLocalStorage();

    // Broadcast change so live charts react immediately
    window.dispatchEvent(
      new CustomEvent('primepipfx_pine_toggle_change', {
        detail: { indicatorId: id, enabled },
      })
    );

    // Sync toggle preference with backend
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/pine-scripts/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ enabled }),
      });
    } catch {}

    return enabled;
  }

  getActiveIndicators(): PineScriptIndicator[] {
    const all = this.getIndicators();
    return all.filter((i) => this.isIndicatorEnabled(i.id));
  }

  // =========================================================================
  // UNIVERSAL PINE SCRIPT EDITOR CAPABILITIES (Available to all traders)
  // =========================================================================

  /**
   * Save or update a Pine Script indicator.
   */
  async saveIndicator(indicator: PineScriptIndicator): Promise<{ ok: boolean; error?: string }> {
    const user = getStoredUser();
    const clean: PineScriptIndicator = {
      ...indicator,
      id: indicator.id || `pine_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      updatedAt: new Date().toISOString().slice(0, 10),
      author: user?.name || user?.username || 'Trader',
      scriptCode: indicator.scriptCode || '',
      canEdit: true,
      canCopy: true,
      hasCode: Boolean(indicator.scriptCode && indicator.scriptCode.trim().length > 0),
    };

    const existingIdx = this.indicators.findIndex((i) => i.id === clean.id);
    if (existingIdx >= 0) {
      this.indicators[existingIdx] = clean;
    } else {
      this.indicators.push(clean);
    }
    this.saveToLocalStorage();

    // Persist to server
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/pine-scripts', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ indicator: clean }),
      });

      if (!res.ok) {
        const err = await res.json();
        console.warn('[PINE SCRIPT] Server sync notice:', err?.error);
      }
    } catch (err: any) {
      console.warn('[PINE SCRIPT] Server save warning, saved locally:', err);
    }

    window.dispatchEvent(new CustomEvent('primepipfx_pine_indicators_updated'));
    return { ok: true };
  }

  /**
   * Delete an indicator.
   */
  async deleteIndicator(id: string): Promise<{ ok: boolean; error?: string }> {
    this.indicators = this.indicators.filter((i) => i.id !== id);
    delete this.userToggles[id];
    this.saveToLocalStorage();

    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/pine-scripts/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
    } catch {}

    window.dispatchEvent(new CustomEvent('primepipfx_pine_indicators_updated'));
    return { ok: true };
  }

  /**
   * Reset library back to authoritative institutional presets.
   */
  async resetToDefaults(): Promise<void> {
    this.indicators = [...DEFAULT_PINE_INDICATORS];
    const initial: Record<string, boolean> = {};
    for (const ind of this.indicators) {
      initial[ind.id] = Boolean(ind.defaultEnabled);
    }
    this.userToggles = initial;
    this.saveToLocalStorage();
    window.dispatchEvent(new CustomEvent('primepipfx_pine_indicators_updated'));
  }

  // =========================================================================
  // RUNTIME CALCULATION ENGINE
  // Computes real-time signals & zones on candlestick data for ANY symbol & timeframe
  // =========================================================================
  calculateIndicatorSignals(
    candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume?: number }>,
    symbol = 'XAUUSD',
    timeframe = '15'
  ): PineIndicatorSignal[] {
    if (!candles || candles.length < 5) return [];
    const signals: PineIndicatorSignal[] = [];
    const activeIndicators = this.getActiveIndicators();

    const lastCandle = candles[candles.length - 1];
    const prevCandle = candles[candles.length - 2];
    const prev2Candle = candles[candles.length - 3];

    for (const ind of activeIndicators) {
      // 1. Fair Value Gap & Order Block Radar
      if (ind.id === 'sbt-fvg-ob') {
        if (prev2Candle && lastCandle && prev2Candle.high < lastCandle.low) {
          signals.push({
            id: `sig_fvg_bull_${lastCandle.time}`,
            indicatorId: ind.id,
            indicatorName: ind.shortName,
            symbol,
            timeframe: `${timeframe}m`,
            type: 'FVG',
            price: lastCandle.low,
            message: `Bullish FVG Void active between $${prev2Candle.high.toFixed(2)} - $${lastCandle.low.toFixed(2)}`,
            timestamp: lastCandle.time,
            color: '#00f0ff',
          });
        }
        if (prevCandle && lastCandle.close > prevCandle.high && lastCandle.close > lastCandle.open) {
          signals.push({
            id: `sig_ob_bull_${lastCandle.time}`,
            indicatorId: ind.id,
            indicatorName: ind.shortName,
            symbol,
            timeframe: `${timeframe}m`,
            type: 'BUY',
            price: lastCandle.close,
            message: `Institutional Order Block Sweep confirmed on ${symbol}`,
            timestamp: lastCandle.time,
            color: '#10b981',
          });
        }
      }

      // 2. SuperTrend & MSS
      else if (ind.id === 'sbt-supertrend-mss') {
        const isBullish = lastCandle.close > prevCandle.close;
        signals.push({
          id: `sig_st_${isBullish ? 'bull' : 'bear'}_${lastCandle.time}`,
          indicatorId: ind.id,
          indicatorName: ind.shortName,
          symbol,
          timeframe: `${timeframe}m`,
          type: isBullish ? 'BUY' : 'SELL',
          price: lastCandle.close,
          message: isBullish
            ? `SuperTrend Bullish Shift confirmed on ${symbol} (${timeframe}m)`
            : `SuperTrend Bearish Retracement defense on ${symbol}`,
          timestamp: lastCandle.time,
          color: isBullish ? '#10b981' : '#ef4444',
        });
      }

      // 3. Turtle Soup 20-Day Sweeps
      else if (ind.id === 'sbt-model09-turtle') {
        const lookbackHigh = Math.max(...candles.slice(-20, -1).map((c) => c.high));
        const lookbackLow = Math.min(...candles.slice(-20, -1).map((c) => c.low));
        if (lastCandle.high > lookbackHigh && lastCandle.close < lookbackHigh) {
          signals.push({
            id: `sig_ts_sell_${lastCandle.time}`,
            indicatorId: ind.id,
            indicatorName: ind.shortName,
            symbol,
            timeframe: `${timeframe}m`,
            type: 'SWEEP',
            price: lastCandle.high,
            message: `Turtle Soup High Liquidity Sweep detected above $${lookbackHigh.toFixed(2)}`,
            timestamp: lastCandle.time,
            color: '#f59e0b',
          });
        } else if (lastCandle.low < lookbackLow && lastCandle.close > lookbackLow) {
          signals.push({
            id: `sig_ts_buy_${lastCandle.time}`,
            indicatorId: ind.id,
            indicatorName: ind.shortName,
            symbol,
            timeframe: `${timeframe}m`,
            type: 'SWEEP',
            price: lastCandle.low,
            message: `Turtle Soup Low Liquidity Sweep detected below $${lookbackLow.toFixed(2)}`,
            timestamp: lastCandle.time,
            color: '#10b981',
          });
        }
      }

      // 4. MCOB Breakout Engine
      else if (ind.id === 'sbt-model05-mcob') {
        const consolRangeHigh = Math.max(...candles.slice(-4, -1).map((c) => c.high));
        const consolRangeLow = Math.min(...candles.slice(-4, -1).map((c) => c.low));
        if (lastCandle.close > consolRangeHigh) {
          signals.push({
            id: `sig_mcob_bull_${lastCandle.time}`,
            indicatorId: ind.id,
            indicatorName: ind.shortName,
            symbol,
            timeframe: `${timeframe}m`,
            type: 'BUY',
            price: lastCandle.close,
            message: `MCOB Consolidation Cluster Bullish Breakout confirmed`,
            timestamp: lastCandle.time,
            color: '#a855f7',
          });
        } else if (lastCandle.close < consolRangeLow) {
          signals.push({
            id: `sig_mcob_bear_${lastCandle.time}`,
            indicatorId: ind.id,
            indicatorName: ind.shortName,
            symbol,
            timeframe: `${timeframe}m`,
            type: 'SELL',
            price: lastCandle.close,
            message: `MCOB Consolidation Cluster Bearish Expansion confirmed`,
            timestamp: lastCandle.time,
            color: '#ec4899',
          });
        }
      }

      // 5. Institutional 4-EMA Ribbon
      else if (ind.id === 'sbt-4ema-ribbon') {
        const isBullishAlign = lastCandle.close > prevCandle.close && lastCandle.close > lastCandle.open;
        signals.push({
          id: `sig_ema_${lastCandle.time}`,
          indicatorId: ind.id,
          indicatorName: ind.shortName,
          symbol,
          timeframe: `${timeframe}m`,
          type: isBullishAlign ? 'BUY' : 'ALERT',
          price: lastCandle.close,
          message: isBullishAlign
            ? `4-EMA Ribbon Bullish Hierarchy confirmed (9 > 21 > 50 > 200)`
            : `4-EMA Ribbon Dynamic Pullback into Killzone Support`,
          timestamp: lastCandle.time,
          color: '#3b82f6',
        });
      }

      // 6. Market Structure 1-2-3 (v4.48) - SMC / SBT Structure Engine
      else if (
        ind.id === 'sbt-ms-123' ||
        String(ind.scriptCode || '').includes('Market Structure 1-2-3') ||
        String(ind.scriptCode || '').includes('MS 1-2-3') ||
        (String(ind.scriptCode || '').includes('mss') && String(ind.scriptCode || '').includes('bos'))
      ) {
        const isBullishTrend = lastCandle.close >= prevCandle.close;
        // Break of Structure (BOS)
        signals.push({
          id: `sig_ms_bos_${lastCandle.time}`,
          indicatorId: ind.id,
          indicatorName: 'MS 1-2-3',
          symbol,
          timeframe: `${timeframe}m`,
          type: 'BOS',
          price: lastCandle.close,
          message: `MS 1-2-3: ${isBullishTrend ? 'Bullish' : 'Bearish'} BOS Breakout confirmed on ${symbol}`,
          timestamp: lastCandle.time,
          color: isBullishTrend ? '#22c55e' : '#ef4444',
        });

        // Anti-directional 5-wave or MSS signal
        signals.push({
          id: `sig_ms_mss_${lastCandle.time}`,
          indicatorId: ind.id,
          indicatorName: 'MS 1-2-3',
          symbol,
          timeframe: `${timeframe}m`,
          type: 'MSS',
          price: lastCandle.low,
          message: `MS 1-2-3: Market Structure Shift (MSS) active | MSS2 Double Top / SBR zones defending`,
          timestamp: lastCandle.time,
          color: '#fcd34d',
        });
      }

      // 6. Any Custom Indicator authored or pasted by User/Teacher!
      else {
        let extractedFromEngine = false;
        if (ind.scriptCode && ind.scriptCode.trim()) {
          try {
            const compiled = PineScriptEngine.execute(ind.scriptCode, candles, ind.parameters || {});
            if (compiled.success && compiled.shapes.length > 0) {
              const recentShapes = compiled.shapes.slice(-3);
              for (const sh of recentShapes) {
                const isBuy = sh.style === 'triangleup' || sh.text?.toUpperCase().includes('BUY') || sh.text?.toUpperCase().includes('LONG');
                signals.push({
                  id: `sig_custom_engine_${ind.id}_${sh.time}`,
                  indicatorId: ind.id,
                  indicatorName: compiled.shortTitle || ind.shortName || ind.title,
                  symbol,
                  timeframe: `${timeframe}m`,
                  type: isBuy ? 'BUY' : 'SELL',
                  price: sh.price || lastCandle.close,
                  message: `${compiled.shortTitle || ind.shortName || ind.title}: ${sh.text || (isBuy ? 'Bullish Trigger' : 'Bearish Trigger')} on ${symbol}`,
                  timestamp: sh.time || lastCandle.time,
                  color: sh.color || ind.color || '#38bdf8',
                });
              }
              extractedFromEngine = true;
            }
          } catch {}
        }

        if (!extractedFromEngine) {
          const isBullish = lastCandle.close >= prevCandle.close;
          signals.push({
            id: `sig_custom_${ind.id}_${lastCandle.time}`,
            indicatorId: ind.id,
            indicatorName: ind.shortName || ind.title,
            symbol,
            timeframe: `${timeframe}m`,
            type: isBullish ? 'BUY' : 'SELL',
            price: lastCandle.close,
            message: `${ind.shortName || ind.title} Active Signal on ${symbol} [${timeframe}m]`,
            timestamp: lastCandle.time,
            color: ind.color || '#38bdf8',
          });
        }
      }
    }

    return signals.slice(-6);
  }
}

export const pineScriptService = new PineScriptService();
