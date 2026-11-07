import { calculateAssetCotStrength, evaluateCotPair, determinePairBias, deriveUsdAssetMetric } from './utils/cotPairEngine';
import { CotRecord } from './types/cotTypes';

function makeRecord(code: string, name: string, ncLong: number, ncShort: number, oi: number, changeNet: number): CotRecord {
  return {
    marketCode: code,
    marketName: name,
    reportDate: '2026-10-06',
    timestamp: 1791244800000,
    openInterest: oi,
    nonCommLong: ncLong,
    nonCommShort: ncShort,
    nonCommNet: ncLong - ncShort,
    commLong: Math.round(oi * 0.4),
    commShort: Math.round(oi * 0.6),
    commNet: Math.round(oi * 0.4) - Math.round(oi * 0.6),
    changeNonCommLong: changeNet > 0 ? changeNet : 0,
    changeNonCommShort: changeNet < 0 ? -changeNet : 0,
    changeNonCommNet: changeNet,
    changeCommLong: 0,
    changeCommShort: 0,
    changeCommNet: 0,
    changeOpenInterest: 1000,
  };
}

console.log('[TEST] Starting COT Pair Engine Test Suite...');

// 1. Bullish EUR, Bearish JPY
const eurRecord = makeRecord('099741', 'Euro FX', 250000, 100000, 600000, 12000); // Net +150,000 = +25% OI
const jpyRecord = makeRecord('097741', 'Japanese Yen', 40000, 160000, 240000, -8000); // Net -120,000 = -50% OI

const eurMetric = calculateAssetCotStrength(eurRecord);
const jpyMetric = calculateAssetCotStrength(jpyRecord);

console.log(`EUR Strength: ${eurMetric.strengthScore}, Net % OI: ${eurMetric.netPctOI}%`);
console.log(`JPY Strength: ${jpyMetric.strengthScore}, Net % OI: ${jpyMetric.netPctOI}%`);

if (eurMetric.strengthScore <= 0) throw new Error('EUR should be positive strength');
if (jpyMetric.strengthScore >= 0) throw new Error('JPY should be negative strength');

const eurJpy = evaluateCotPair(eurMetric, jpyMetric, 'FOREX');
console.log(`EUR/JPY Bullishness: ${eurJpy.bullishnessPct}%, Bias: ${eurJpy.biasLabel}`);

if (eurJpy.biasLabel !== 'STRONGLY BULLISH') {
  throw new Error(`Expected STRONGLY BULLISH, got ${eurJpy.biasLabel}`);
}
if (eurJpy.bullishnessPct < 72) {
  throw new Error(`Expected bullishness >= 72%, got ${eurJpy.bullishnessPct}%`);
}

// 2. Inverse pair JPY/EUR must be STRONGLY BEARISH
const jpyEur = evaluateCotPair(jpyMetric, eurMetric, 'FOREX');
console.log(`JPY/EUR Bullishness: ${jpyEur.bullishnessPct}%, Bias: ${jpyEur.biasLabel}`);

if (jpyEur.biasLabel !== 'STRONGLY BEARISH') {
  throw new Error(`Expected STRONGLY BEARISH, got ${jpyEur.biasLabel}`);
}
if (jpyEur.bullishnessPct > 28) {
  throw new Error(`Expected bullishness <= 28%, got ${jpyEur.bullishnessPct}%`);
}

// 3. Balanced pair
const gbpRecord = makeRecord('096742', 'British Pound', 130000, 125000, 260000, 500); // Net +5,000 ~ +1.9% OI
const chfRecord = makeRecord('092741', 'Swiss Franc', 40000, 38000, 90000, 200); // Net +2,000 ~ +2.2% OI

const gbpMetric = calculateAssetCotStrength(gbpRecord);
const chfMetric = calculateAssetCotStrength(chfRecord);
const gbpChf = evaluateCotPair(gbpMetric, chfMetric, 'FOREX');

console.log(`GBP/CHF Bullishness: ${gbpChf.bullishnessPct}%, Bias: ${gbpChf.biasLabel}`);
if (gbpChf.biasLabel !== 'BALANCED') {
  throw new Error(`Expected BALANCED, got ${gbpChf.biasLabel}`);
}

console.log('✅ ALL COT PAIR ENGINE UNIT TESTS PASSED!');
