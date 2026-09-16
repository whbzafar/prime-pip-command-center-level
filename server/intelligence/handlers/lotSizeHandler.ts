import { CapabilityHandler, LotSizeCardPayload } from '../types.js';

export const lotSizeHandler: CapabilityHandler = async (entities, userId) => {
  const pair = (entities.pair || 'EUR/USD').toUpperCase().trim();
  const accountBalance = parseFloat(entities.balance || '10000') || 10000;
  const riskPercentage = parseFloat(entities.riskPercent || '1.0') || 1.0;
  const stopLossPips = parseFloat(entities.pips || '20') || 20;

  const riskAmount = (accountBalance * riskPercentage) / 100;

  // Pip value estimation for standard 1.00 lot:
  // For EUR/USD, GBP/USD, AUD/USD, NZD/USD: $10 per pip per lot
  // For XAU/USD (Gold): $1 per 0.10 move ($10 per $1 move = $10 per 100 points)
  // For JPY pairs: ~$6.50-$8.00 per pip per lot
  let pipValuePerStandardLot = 10;
  if (pair.includes('JPY')) {
    pipValuePerStandardLot = 6.8;
  } else if (pair.includes('XAU') || pair.includes('GOLD')) {
    pipValuePerStandardLot = 10;
  }

  const rawLotSize = riskAmount / (stopLossPips * pipValuePerStandardLot);
  const calculatedLotSize = Math.max(0.01, Math.round(rawLotSize * 100) / 100);

  const payload: LotSizeCardPayload = {
    kind: 'LOT_SIZE',
    title: `Position Risk Calculator: ${pair}`,
    timestamp: Date.now(),
    confidence: 0.90,
    pair,
    accountBalance,
    riskPercentage,
    riskAmount,
    stopLossPips,
    calculatedLotSize,
  };

  return payload;
};
