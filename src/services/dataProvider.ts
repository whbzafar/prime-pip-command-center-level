/**
 * Data Source Layer for Prime Pip FX Command Center
 * Supports:
 * 1. ManualProvider (IndexedDB / localStorage)
 * 2. CsvImportProvider (MT4/MT5 CSV statement & history export parser)
 * 3. MetaApiProvider (Read-only streaming stub for live equity, balance, and open positions)
 */

import { AccountState, OpenPosition, TradeRecord } from '../riskEngine';

export interface DataProvider {
  id: string;
  name: string;
  getAccountState(accountId: string): Promise<AccountState>;
  getTrades(accountId: string): Promise<TradeRecord[]>;
  subscribe?(
    accountId: string,
    callback: (update: { accountState: AccountState; openPositions: OpenPosition[] }) => void
  ): () => void; // Unsubscribe function
}

/**
 * 1. MANUAL PROVIDER
 * Stores and retrieves records from browser storage.
 */
export class ManualProvider implements DataProvider {
  id = 'MANUAL';
  name = 'Manual Journal & Session Vault';

  async getAccountState(accountId: string): Promise<AccountState> {
    try {
      const stored = localStorage.getItem(`primepipfx_manual_account_state_${accountId}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      startingBalance: 100000,
      currentBalance: 100000,
      currentEquity: 100000,
      highWaterMarkBalance: 100000,
      highWaterMarkEquity: 100000,
      openPositions: [],
    };
  }

  async saveAccountState(accountId: string, state: AccountState): Promise<void> {
    try {
      localStorage.setItem(`primepipfx_manual_account_state_${accountId}`, JSON.stringify(state));
    } catch (err) {
      console.warn('ManualProvider save error:', err);
    }
  }

  async getTrades(accountId: string): Promise<TradeRecord[]> {
    try {
      const stored = localStorage.getItem(`primepipfx_manual_trades_${accountId}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  }

  async saveTrades(accountId: string, trades: TradeRecord[]): Promise<void> {
    try {
      localStorage.setItem(`primepipfx_manual_trades_${accountId}`, JSON.stringify(trades));
    } catch (err) {
      console.warn('ManualProvider save trades error:', err);
    }
  }
}

/**
 * 2. CSV IMPORT PROVIDER (MT4 / MT5 Statement & History Parser)
 * Parses standard MetaTrader 4 and MetaTrader 5 history CSV exports.
 */
export class CsvImportProvider implements DataProvider {
  id = 'CSV_IMPORT';
  name = 'MT4/MT5 CSV History Import';

  private cachedTrades: Record<string, TradeRecord[]> = {};

  async getAccountState(accountId: string): Promise<AccountState> {
    const trades = await this.getTrades(accountId);
    const realizedPnL = trades.reduce((acc, t) => acc + (t.profitLoss || 0), 0);
    const startBal = 100000;
    const currentBal = startBal + realizedPnL;
    return {
      startingBalance: startBal,
      currentBalance: currentBal,
      currentEquity: currentBal,
      highWaterMarkBalance: Math.max(startBal, currentBal),
      highWaterMarkEquity: Math.max(startBal, currentBal),
      openPositions: [],
    };
  }

  async getTrades(accountId: string): Promise<TradeRecord[]> {
    return this.cachedTrades[accountId] || [];
  }

  /**
   * Parses raw CSV content from an MT4 or MT5 history export.
   * Standard MT4/MT5 columns:
   * Ticket, Open Time, Type, Size, Item/Symbol, Price, S / L, T / P, Close Time, Price, Commission, Taxes, Swap, Profit
   */
  parseMtCsv(csvText: string, accountId: string = 'default'): TradeRecord[] {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.replace(/["']/g, '').trim());

    const ticketIdx = headers.findIndex((h) => h.includes('ticket') || h.includes('order'));
    const openTimeIdx = headers.findIndex((h) => h.includes('open time') || h.includes('time'));
    const typeIdx = headers.findIndex((h) => h === 'type' || h.includes('action'));
    const sizeIdx = headers.findIndex((h) => h.includes('size') || h.includes('volume') || h.includes('lot'));
    const symbolIdx = headers.findIndex((h) => h.includes('item') || h.includes('symbol'));
    const openPriceIdx = headers.findIndex((h) => h.includes('price'));
    const slIdx = headers.findIndex((h) => h.includes('s / l') || h.includes('s/l') || h.includes('sl'));
    const tpIdx = headers.findIndex((h) => h.includes('t / p') || h.includes('t/p') || h.includes('tp'));
    const closeTimeIdx = headers.findIndex((h) => h.includes('close time'));
    const profitIdx = headers.findIndex((h) => h.includes('profit') || h.includes('p/l'));

    const parsed: TradeRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(/[,;\t]/).map((col) => col.replace(/["']/g, '').trim());
      if (row.length < 4) continue;

      const rawType = (typeIdx >= 0 ? row[typeIdx] : '').toUpperCase();
      const isBuy = rawType.includes('BUY');
      const isSell = rawType.includes('SELL');
      if (!isBuy && !isSell) continue; // Skip deposits, withdrawals, or balance credit rows

      const symbol = symbolIdx >= 0 && row[symbolIdx] ? row[symbolIdx].toUpperCase() : 'EURUSD';
      const lots = sizeIdx >= 0 ? Math.max(0.01, parseFloat(row[sizeIdx]) || 0.1) : 0.1;
      const entryPrice = openPriceIdx >= 0 ? parseFloat(row[openPriceIdx]) || 1.0 : 1.0;
      const stopLoss = slIdx >= 0 ? parseFloat(row[slIdx]) || 0 : 0;
      const takeProfit = tpIdx >= 0 ? parseFloat(row[tpIdx]) || undefined : undefined;
      const profitLoss = profitIdx >= 0 ? parseFloat(row[profitIdx]) || 0 : 0;
      const openTime = openTimeIdx >= 0 && row[openTimeIdx] ? row[openTimeIdx] : new Date().toISOString();
      const closeTime = closeTimeIdx >= 0 && row[closeTimeIdx] ? row[closeTimeIdx] : undefined;

      parsed.push({
        id: ticketIdx >= 0 && row[ticketIdx] ? `mt-${row[ticketIdx]}` : `csv-${Date.now()}-${i}`,
        pair: symbol,
        direction: isBuy ? 'BUY' : 'SELL',
        entryPrice,
        stopLoss,
        initialStopLoss: stopLoss,
        takeProfit,
        lots,
        profitLoss,
        openTimestamp: openTime,
        closeTimestamp: closeTime,
        status: closeTime ? 'CLOSED' : 'OPEN',
        setupTag: 'MT CSV Import',
      });
    }

    this.cachedTrades[accountId] = parsed;
    return parsed;
  }
}

/**
 * 3. METAAPI PROVIDER STUB (Read-Only)
 * Given an account ID and token, streams balance, equity, and open positions.
 * - Does NOT request trading permissions (pure read-only observation).
 * - Isolated token handling so it can seamlessly transition to a backend proxy.
 */
export class MetaApiProvider implements DataProvider {
  id = 'META_API';
  name = 'MetaApi Cloud Bridge (Read-Only)';

  private accountId: string;
  private token: string;
  private timer: any = null;
  private simulatedEquityDelta = 0;

  constructor(accountId: string = '', token: string = '') {
    this.accountId = accountId;
    this.token = token;
  }

  setCredentials(accountId: string, token: string) {
    this.accountId = accountId;
    this.token = token;
  }

  async getAccountState(accountId: string): Promise<AccountState> {
    const baseBal = 100000;
    const currentEq = baseBal + this.simulatedEquityDelta;
    return {
      startingBalance: baseBal,
      currentBalance: baseBal,
      currentEquity: currentEq,
      highWaterMarkBalance: baseBal,
      highWaterMarkEquity: Math.max(baseBal, currentEq),
      openPositions: [
        {
          id: 'meta-pos-1',
          pair: 'EURUSD',
          direction: 'BUY',
          lots: 1.0,
          entryPrice: 1.085,
          currentPrice: 1.085 + this.simulatedEquityDelta / 10000,
          stopLoss: 1.082,
          takeProfit: 1.091,
          floatingPnL: this.simulatedEquityDelta,
          openTimestamp: Date.now() - 3600000,
          riskAmountDollars: 300,
        },
      ],
    };
  }

  async getTrades(accountId: string): Promise<TradeRecord[]> {
    return [
      {
        id: 'meta-trade-closed-1',
        pair: 'GBPUSD',
        direction: 'BUY',
        entryPrice: 1.25,
        exitPrice: 1.254,
        stopLoss: 1.246,
        lots: 1.5,
        profitLoss: 600,
        openTimestamp: new Date(Date.now() - 86400000).toISOString(),
        closeTimestamp: new Date(Date.now() - 80000000).toISOString(),
        status: 'CLOSED',
        setupTag: 'MetaApi Sync',
      },
    ];
  }

  /**
   * Read-only live telemetry subscription.
   * Feeds equity and floating updates into riskEngine in real-time.
   */
  subscribe(
    accountId: string,
    callback: (update: { accountState: AccountState; openPositions: OpenPosition[] }) => void
  ): () => void {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(async () => {
      // Simulate live market fluctuation on open position
      const fluctuation = (Math.random() - 0.48) * 40;
      this.simulatedEquityDelta = Math.round((this.simulatedEquityDelta + fluctuation) * 100) / 100;

      const state = await this.getAccountState(accountId);
      callback({
        accountState: state,
        openPositions: state.openPositions || [],
      });
    }, 2500);

    return () => {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }
}

// Global active data provider registry
export const manualDataProvider = new ManualProvider();
export const csvImportDataProvider = new CsvImportProvider();
export const metaApiDataProvider = new MetaApiProvider();
