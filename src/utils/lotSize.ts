/**
 * Comprehensive Forex & CFD Lot Size calculation engine.
 */

export interface LotSizeResult {
  lotSize: number;
  riskAmount: number;
  riskPercent: number;
  stopLossDistance: number;
  pipValue: number;
}

export function calculateForexLotSize(
  accountBalance: number,
  riskPercent: number,
  stopLossDistance: number,
  instrument: string = 'EURUSD',
  accountCurrency: string = 'USD'
): LotSizeResult {
  const balance = Math.max(0, accountBalance);
  const risk = Math.max(0.01, riskPercent);
  const riskAmount = (balance * risk) / 100;

  if (stopLossDistance <= 0) {
    return {
      lotSize: 0.01,
      riskAmount,
      riskPercent: risk,
      stopLossDistance: 0,
      pipValue: 10,
    };
  }

  const sym = instrument.toUpperCase();
  let pipSize = 0.0001;
  let pipValuePerStandardLot = 10; // $10 per pip for 1.00 standard lot

  if (sym.includes('JPY')) {
    pipSize = 0.01;
    pipValuePerStandardLot = 7.0;
  } else if (sym.includes('XAU') || sym.includes('GOLD')) {
    pipSize = 0.1; // 1 pip = $0.10, or 1 point = $1.00
    pipValuePerStandardLot = 10.0; // 1 standard lot = 100 oz, $1 move = $100
  } else if (sym.includes('US30') || sym.includes('NAS100') || sym.includes('SPX')) {
    pipSize = 1.0;
    pipValuePerStandardLot = 1.0;
  } else if (sym.includes('BTC') || sym.includes('ETH')) {
    pipSize = 1.0;
    pipValuePerStandardLot = 1.0;
  }

  const pips = stopLossDistance / pipSize;
  const rawLotSize = pips > 0 ? riskAmount / (pips * pipValuePerStandardLot) : 0.01;
  const clampedLotSize = Math.max(0.01, Math.floor(rawLotSize * 100) / 100);

  return {
    lotSize: clampedLotSize,
    riskAmount,
    riskPercent: risk,
    stopLossDistance,
    pipValue: pipValuePerStandardLot,
  };
}
