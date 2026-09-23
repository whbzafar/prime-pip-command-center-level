import React, { useState, useMemo } from 'react';
import {
  CurrencyCode,
  CurrencyScoreResult,
  CommodityObservation,
  RetailPositioningRecord,
  PairDifferentialResult,
  CotPositioningRecord,
  InterestRateRecord,
  IndicatorObservation,
} from '../../types/fundamentalIndicatorTypes';
import { CURRENCIES } from '../../data/fundamentalRegistryData';
import { calculateCommodityFundamentalScore } from '../../utils/fundamentalCalculationEngine';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Gauge,
  Globe,
  Coins,
  Gem,
  Flame,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  BarChart2,
  Zap,
} from 'lucide-react';

export interface TrendConfidenceResult {
  score: number; // 0 - 100%
  tier: 'HIGH' | 'MODERATE' | 'LOW';
  tierLabel: string;
  volumeScore: number; // 0 - 100%
  volumeLabel: string;
  volumeDetail: string;
  volatilityScore: number; // 0 - 100% (higher = more stable / orderly trend)
  volatilityLabel: string;
  volatilityDetail: string;
  dataFidelityScore: number; // 0 - 100%
  summary: string;
}

interface FundamentalSentimentMeterProps {
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  commodityObservations: CommodityObservation[];
  pairDifferentials?: PairDifferentialResult[];
  retailPositioning?: RetailPositioningRecord[];
  cotRecords?: CotPositioningRecord[];
  interestRates?: InterestRateRecord[];
  observations?: IndicatorObservation[];
  activeCurrency?: CurrencyCode;
  onSelectCurrency?: (currency: CurrencyCode) => void;
  onSelectTab?: (tab: any) => void;
}

type SelectedTarget = 'GLOBAL' | CurrencyCode | 'XAU' | 'XAG' | 'WTI' | string;

export const FundamentalSentimentMeter: React.FC<FundamentalSentimentMeterProps> = ({
  currencyScores,
  commodityObservations,
  pairDifferentials = [],
  retailPositioning = [],
  cotRecords = [],
  interestRates = [],
  observations = [],
  activeCurrency = 'USD',
  onSelectCurrency,
  onSelectTab,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>('GLOBAL');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // 1. Process Commodity Scores
  const commodityScores = useMemo(() => {
    const map: Record<string, { score: number; bias: string; drivers: any[]; price?: number; raw: CommodityObservation }> = {};
    for (const obs of commodityObservations) {
      const retailRec = retailPositioning.find((r) => r.asset === obs.symbol);
      const calc = calculateCommodityFundamentalScore(obs, retailRec);
      map[obs.symbol] = {
        score: calc.score,
        bias: calc.bias,
        drivers: calc.drivers,
        price: obs.price,
        raw: obs,
      };
    }
    return map;
  }, [commodityObservations, retailPositioning]);

  // 2. Trend Confidence Calculator (Volume Context & Volatility Context)
  const calculateTargetTrendConfidence = (target: SelectedTarget): TrendConfidenceResult => {
    if (target === 'GLOBAL') {
      // Aggregate across all 11 assets
      let sumTrend = 0;
      let sumVol = 0;
      let sumVola = 0;
      let sumFidelity = 0;
      const count = 11;

      CURRENCIES.forEach((c) => {
        const res = calculateTargetTrendConfidence(c.code);
        sumTrend += res.score;
        sumVol += res.volumeScore;
        sumVola += res.volatilityScore;
        sumFidelity += res.dataFidelityScore;
      });

      ['XAU', 'XAG', 'WTI'].forEach((comm) => {
        const res = calculateTargetTrendConfidence(comm);
        sumTrend += res.score;
        sumVol += res.volumeScore;
        sumVola += res.volatilityScore;
        sumFidelity += res.dataFidelityScore;
      });

      const avgTrend = Math.round(sumTrend / count);
      const avgVol = Math.round(sumVol / count);
      const avgVola = Math.round(sumVola / count);
      const avgFidelity = Math.round(sumFidelity / count);

      const tier: 'HIGH' | 'MODERATE' | 'LOW' =
        avgTrend >= 70 ? 'HIGH' : avgTrend >= 50 ? 'MODERATE' : 'LOW';

      return {
        score: avgTrend,
        tier,
        tierLabel: tier === 'HIGH' ? 'HIGH CONVICTION' : tier === 'MODERATE' ? 'MODERATE CONVICTION' : 'ELEVATED VOLATILITY RISK',
        volumeScore: avgVol,
        volumeLabel: avgVol >= 70 ? 'Strong Volume Participation' : avgVol >= 50 ? 'Steady Open Interest' : 'Light Volume Commitment',
        volumeDetail: 'Cross-asset futures open interest & institutional positioning participation',
        volatilityScore: avgVola,
        volatilityLabel: avgVola >= 70 ? 'Low Macro Noise' : avgVola >= 50 ? 'Moderate Dispersion' : 'Elevated Cross-Currents',
        volatilityDetail: 'Synthesized economic surprise variance and macro conflict factor',
        dataFidelityScore: avgFidelity,
        summary: `Market-wide trend confidence reads ${avgTrend}% across 11 assets, supported by ${avgVol}% institutional volume backing and ${avgVola}% macro volatility stability.`,
      };
    }

    // Currency Trend Confidence
    const currMeta = CURRENCIES.find((c) => c.code === target);
    if (currMeta) {
      const code = currMeta.code;
      const sc = currencyScores[code];
      const cot = cotRecords.find((r) => r.currency === code);
      const obsList = observations.filter((o) => o.currency === code);

      // --- A. Volume Context (0 - 100) ---
      let volumeScore = 55;
      let volumeDetail = 'Baseline futures liquidity';

      if (cot && cot.openInterest > 0) {
        // 1. Open Interest expansion
        if (cot.previousOpenInterest && cot.openInterest > cot.previousOpenInterest) {
          const delta = cot.openInterest - cot.previousOpenInterest;
          volumeScore += Math.min(18, Math.round((delta / cot.previousOpenInterest) * 120));
          volumeDetail = `Expanding Open Interest (+${delta.toLocaleString()} contracts) confirms institutional capital inflow`;
        } else if (cot.previousOpenInterest && cot.openInterest < cot.previousOpenInterest) {
          const delta = cot.previousOpenInterest - cot.openInterest;
          volumeScore -= Math.min(15, Math.round((delta / cot.previousOpenInterest) * 100));
          volumeDetail = `Contracting Open Interest (-${delta.toLocaleString()} contracts) flags profit taking / liquidation`;
        } else {
          volumeDetail = `Steady Open Interest (${cot.openInterest.toLocaleString()} total open contracts)`;
        }

        // 2. Speculative Volume Participation Ratio
        if (cot.nonCommercialLong !== undefined && cot.nonCommercialShort !== undefined) {
          const netSpec = Math.abs(cot.nonCommercialLong - cot.nonCommercialShort);
          const specRatio = netSpec / (cot.openInterest || 1);
          if (specRatio > 0.18) {
            volumeScore += 16;
            volumeDetail += ' • Heavy speculative volume alignment';
          } else if (specRatio > 0.08) {
            volumeScore += 8;
            volumeDetail += ' • Moderate speculative volume alignment';
          }
        }
      } else {
        volumeScore = 48;
        volumeDetail = 'Standard interbank FX flow context';
      }
      volumeScore = Math.max(15, Math.min(95, volumeScore));

      // --- B. Volatility Context (0 - 100, Higher = More Stable / Lower Volatility Noise) ---
      let volatilityScore = 72;
      let volatilityDetail = 'Orderly economic surprise dispersion';

      // 1. Conflicting Factors penalty (Macro Cross-Currents increase turbulent volatility)
      const conflicts = sc?.conflictingFactors?.length || 0;
      if (conflicts > 0) {
        volatilityScore -= conflicts * 14;
        volatilityDetail = `${conflicts} conflicting macro factor${conflicts > 1 ? 's' : ''} create volatility turbulence`;
      }

      // 2. Economic Surprise Volatility Noise
      const obsWithForecast = obsList.filter((o) => o.forecast !== null && o.actual !== null && o.forecast !== 0);
      if (obsWithForecast.length >= 3) {
        const surprises = obsWithForecast.map((o) => Math.abs((o.actual - o.forecast!) / Math.abs(o.forecast!)));
        const avgSurprise = surprises.reduce((a, b) => a + b, 0) / surprises.length;
        if (avgSurprise > 0.28) {
          volatilityScore -= 14;
          volatilityDetail += ' • Elevated economic surprise shocks';
        } else if (avgSurprise < 0.10) {
          volatilityScore += 10;
          volatilityDetail += ' • Clustered near consensus expectations';
        }
      }

      // 3. Yield Curve Stability
      if (sc?.tenYearBondYield !== undefined && sc?.interestRateLevel !== undefined) {
        const spread = sc.tenYearBondYield - sc.interestRateLevel;
        if (spread < -1.2) {
          volatilityScore -= 10;
          volatilityDetail += ' • Deep yield curve inversion creates macro turbulence';
        } else if (spread >= 0) {
          volatilityScore += 5;
        }
      }
      volatilityScore = Math.max(15, Math.min(95, volatilityScore));

      // --- C. Data Fidelity (0 - 100) ---
      const coverage = sc?.dataCoveragePercent ?? 60;
      const verifiedCount = obsList.filter((o) => o.verificationStatus === 'VERIFIED').length;
      const verifRate = obsList.length > 0 ? (verifiedCount / obsList.length) * 100 : 70;
      const dataFidelityScore = Math.round(coverage * 0.6 + verifRate * 0.4);

      // --- D. Composite Trend Confidence ---
      const score = Math.round(volumeScore * 0.38 + volatilityScore * 0.37 + dataFidelityScore * 0.25);
      const clamped = Math.max(18, Math.min(95, score));
      const tier: 'HIGH' | 'MODERATE' | 'LOW' =
        clamped >= 70 ? 'HIGH' : clamped >= 50 ? 'MODERATE' : 'LOW';

      return {
        score: clamped,
        tier,
        tierLabel: tier === 'HIGH' ? 'HIGH CONVICTION' : tier === 'MODERATE' ? 'MODERATE CONVICTION' : 'ELEVATED VOLATILITY RISK',
        volumeScore,
        volumeLabel: volumeScore >= 70 ? 'Strong Volume Participation' : volumeScore >= 50 ? 'Steady Volume' : 'Thin Volume Flow',
        volumeDetail,
        volatilityScore,
        volatilityLabel: volatilityScore >= 70 ? 'Low Volatility Noise' : volatilityScore >= 50 ? 'Manageable Volatility' : 'Turbulent Volatility Regime',
        volatilityDetail,
        dataFidelityScore,
        summary: `${code} trend confidence is ${clamped}%. Volume commitment is ${volumeScore}% with ${volatilityScore}% macro volatility stability.`,
      };
    }

    // Commodity Trend Confidence (Gold, Silver, Crude Oil)
    const commKey = target === 'XAU' ? 'GOLD' : target === 'XAG' ? 'SILVER' : target === 'WTI' ? 'CRUDE_OIL' : null;
    if (commKey) {
      const c = commodityScores[commKey];
      const raw = c?.raw;

      // Volume Context
      let volumeScore = 62;
      let volumeDetail = 'Physical & derivatives volume balance';

      if (commKey === 'GOLD') {
        if (raw?.centralBankDemandTone === 'AGGRESSIVE_BUYING') {
          volumeScore += 20;
          volumeDetail = 'Sovereign central banks driving aggressive physical accumulation volume';
        } else if (raw?.centralBankDemandTone === 'STEADY') {
          volumeScore += 10;
          volumeDetail = 'Consistent central bank physical gold demand';
        }
      } else if (commKey === 'SILVER') {
        if (raw?.industrialDemandTone === 'STRONG') {
          volumeScore += 18;
          volumeDetail = 'Heavy industrial & solar manufacturing volume consumption';
        } else if (raw?.industrialDemandTone === 'WEAK') {
          volumeScore -= 12;
          volumeDetail = 'Softening industrial manufacturing off-take volume';
        }
      } else if (commKey === 'CRUDE_OIL') {
        if (raw?.inventoriesWeeklySurpriseMb !== undefined) {
          if (raw.inventoriesWeeklySurpriseMb < -2.0) {
            volumeScore += 16;
            volumeDetail = `Substantial crude inventory draw (${raw.inventoriesWeeklySurpriseMb}Mb) signals strong volume absorption`;
          } else if (raw.inventoriesWeeklySurpriseMb > 2.0) {
            volumeScore -= 10;
            volumeDetail = `Inventory build (+${raw.inventoriesWeeklySurpriseMb}Mb) indicates surplus physical volume`;
          }
        }
        if (raw?.opecPolicyTone === 'DEFENDING_FLOOR') {
          volumeScore += 10;
          volumeDetail += ' • OPEC+ actively defending physical supply volume';
        }
      }
      volumeScore = Math.max(20, Math.min(95, volumeScore));

      // Volatility Context
      let volatilityScore = 68;
      let volatilityDetail = 'Macro commodity volatility baseline';

      if (raw?.geopoliticalRiskLevel === 'HIGH') {
        if (commKey === 'GOLD') {
          volatilityScore += 10; // Geopolitical shocks strengthen gold safe-haven trend persistence
          volatilityDetail = 'Elevated geopolitical risk creates persistent safe-haven trend backing';
        } else {
          volatilityScore -= 16; // Extreme volatility risk for industrial commodities
          volatilityDetail = 'Elevated geopolitical risk introduces sudden supply shock volatility';
        }
      } else if (raw?.geopoliticalRiskLevel === 'LOW') {
        volatilityScore += 8;
        volatilityDetail = 'Low geopolitical disruption risk supports predictable price trends';
      }

      if (raw?.usRealYield10Y !== undefined) {
        if (Math.abs(raw.usRealYield10Y) > 2.2) {
          volatilityScore -= 8;
          volatilityDetail += ' • Elevated real yield volatility';
        }
      }
      volatilityScore = Math.max(20, Math.min(95, volatilityScore));

      const dataFidelityScore = raw?.sentimentConfidence ?? 82;
      const score = Math.round(volumeScore * 0.4 + volatilityScore * 0.35 + dataFidelityScore * 0.25);
      const clamped = Math.max(20, Math.min(95, score));
      const tier: 'HIGH' | 'MODERATE' | 'LOW' =
        clamped >= 70 ? 'HIGH' : clamped >= 50 ? 'MODERATE' : 'LOW';

      return {
        score: clamped,
        tier,
        tierLabel: tier === 'HIGH' ? 'HIGH CONVICTION' : tier === 'MODERATE' ? 'MODERATE CONVICTION' : 'ELEVATED VOLATILITY RISK',
        volumeScore,
        volumeLabel: volumeScore >= 70 ? 'Strong Volume Participation' : volumeScore >= 50 ? 'Steady Volume' : 'Light Volume Flow',
        volumeDetail,
        volatilityScore,
        volatilityLabel: volatilityScore >= 70 ? 'Low Volatility Noise' : volatilityScore >= 50 ? 'Moderate Volatility' : 'Turbulent Volatility Regime',
        volatilityDetail,
        dataFidelityScore,
        summary: `${target} trend confidence is ${clamped}%, with ${volumeScore}% volume backing and ${volatilityScore}% volatility stability.`,
      };
    }

    return {
      score: 50,
      tier: 'MODERATE',
      tierLabel: 'MODERATE CONVICTION',
      volumeScore: 50,
      volumeLabel: 'Steady Volume',
      volumeDetail: 'Baseline market participation',
      volatilityScore: 50,
      volatilityLabel: 'Moderate Volatility',
      volatilityDetail: 'Normal macroeconomic conditions',
      dataFidelityScore: 50,
      summary: 'Baseline trend confidence',
    };
  };

  // 3. Global Macro Aggregations (across 8 currencies + 3 commodities = 11 assets)
  const globalSummary = useMemo(() => {
    const assets: Array<{
      id: string;
      label: string;
      type: 'CURRENCY' | 'COMMODITY';
      score: number;
      bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      statusText: string;
      trendConfidence: TrendConfidenceResult;
    }> = [];

    // Currencies
    CURRENCIES.forEach((c) => {
      const sc = currencyScores[c.code];
      const score = sc ? sc.finalCompositeScore : 0;
      const bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
        score >= 12 ? 'BULLISH' : score <= -12 ? 'BEARISH' : 'NEUTRAL';
      const tc = calculateTargetTrendConfidence(c.code);
      assets.push({
        id: c.code,
        label: `${c.code} (${c.name})`,
        type: 'CURRENCY',
        score,
        bias,
        statusText: sc?.assessmentLabel || 'NEUTRAL',
        trendConfidence: tc,
      });
    });

    // Commodities
    ['GOLD', 'SILVER', 'CRUDE_OIL'].forEach((sym) => {
      const c = commodityScores[sym];
      const score = c ? c.score : 0;
      const bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
        score >= 12 ? 'BULLISH' : score <= -12 ? 'BEARISH' : 'NEUTRAL';
      const label = sym === 'GOLD' ? 'Gold (XAU)' : sym === 'SILVER' ? 'Silver (XAG)' : 'Crude Oil (WTI)';
      const code = sym === 'GOLD' ? 'XAU' : sym === 'SILVER' ? 'XAG' : 'WTI';
      const tc = calculateTargetTrendConfidence(code);
      assets.push({
        id: code,
        label,
        type: 'COMMODITY',
        score,
        bias,
        statusText: c?.bias ? c.bias.replace(/_/g, ' ') : 'NEUTRAL',
        trendConfidence: tc,
      });
    });

    const bullishCount = assets.filter((a) => a.bias === 'BULLISH').length;
    const bearishCount = assets.filter((a) => a.bias === 'BEARISH').length;
    const neutralCount = assets.filter((a) => a.bias === 'NEUTRAL').length;

    const avgScore = Math.round(assets.reduce((sum, a) => sum + a.score, 0) / (assets.length || 1));
    const avgConfidence = Math.round(assets.reduce((sum, a) => sum + a.trendConfidence.score, 0) / (assets.length || 1));
    const sorted = [...assets].sort((a, b) => b.score - a.score);
    const topBullish = sorted[0];
    const topBearish = sorted[sorted.length - 1];

    const bullishPercent = Math.round((bullishCount / (assets.length || 1)) * 100);
    const bearishPercent = Math.round((bearishCount / (assets.length || 1)) * 100);

    return {
      assets,
      bullishCount,
      bearishCount,
      neutralCount,
      avgScore,
      avgConfidence,
      bullishPercent,
      bearishPercent,
      topBullish,
      topBearish,
    };
  }, [currencyScores, commodityScores, cotRecords, observations, interestRates]);

  // 4. Current Selected Target Data & Trend Confidence
  const targetData = useMemo(() => {
    const trendConfidence = calculateTargetTrendConfidence(selectedTarget);

    if (selectedTarget === 'GLOBAL') {
      const score = globalSummary.avgScore;
      let label = 'NEUTRAL / BALANCED';
      if (score >= 35) label = 'STRONGLY BULLISH';
      else if (score >= 12) label = 'BULLISH BIAS';
      else if (score <= -35) label = 'STRONGLY BEARISH';
      else if (score <= -12) label = 'BEARISH BIAS';

      return {
        id: 'GLOBAL',
        title: 'GLOBAL MACRO MARKET PULSE',
        subtitle: 'Aggregate sentiment across 8 Major Currencies & 3 Premier Commodities',
        score,
        label,
        isBullish: score >= 12,
        isBearish: score <= -12,
        isNeutral: score > -12 && score < 12,
        trendConfidence,
        drivers: [
          `Bullish Assets: ${globalSummary.bullishCount} of 11 (${globalSummary.bullishPercent}%)`,
          `Bearish Assets: ${globalSummary.bearishCount} of 11 (${globalSummary.bearishPercent}%)`,
          `Top Macro Momentum: ${globalSummary.topBullish?.label} (+${globalSummary.topBullish?.score})`,
          `Heaviest Macro Drag: ${globalSummary.topBearish?.label} (${globalSummary.topBearish?.score})`,
        ],
        type: 'GLOBAL' as const,
      };
    }

    // Is it a Currency?
    const currMeta = CURRENCIES.find((c) => c.code === selectedTarget);
    if (currMeta) {
      const sc = currencyScores[currMeta.code];
      const score = sc ? sc.finalCompositeScore : 0;
      const label = sc ? sc.assessmentLabel : 'NEUTRAL / MIXED';
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;

      return {
        id: currMeta.code,
        title: `${currMeta.code} — ${currMeta.name}`,
        subtitle: `Deterministic Macro Score: ${sc?.completedIndicators || 0} indicators completed`,
        score,
        label,
        isBullish,
        isBearish,
        isNeutral,
        trendConfidence,
        drivers: sc?.primaryDrivers?.length ? sc.primaryDrivers : ['Awaiting published indicator releases'],
        conflicts: sc?.conflictingFactors || [],
        policyRate: sc?.interestRateLevel,
        yield10Y: sc?.tenYearBondYield,
        type: 'CURRENCY' as const,
      };
    }

    // Is it a Commodity?
    const commKey = selectedTarget === 'XAU' ? 'GOLD' : selectedTarget === 'XAG' ? 'SILVER' : selectedTarget === 'WTI' ? 'CRUDE_OIL' : null;
    if (commKey) {
      const c = commodityScores[commKey];
      const score = c ? c.score : 0;
      const label = c ? c.bias.replace(/_/g, ' ') : 'NEUTRAL';
      const isBullish = score >= 12;
      const isBearish = score <= -12;
      const isNeutral = !isBullish && !isBearish;
      const name = commKey === 'GOLD' ? 'Gold (XAU/USD)' : commKey === 'SILVER' ? 'Silver (XAG/USD)' : 'Crude Oil (WTI)';

      return {
        id: selectedTarget,
        title: name,
        subtitle: c?.price ? `Live Spot Price: $${c.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD` : 'Live Spot Valuation',
        score,
        label,
        isBullish,
        isBearish,
        isNeutral,
        trendConfidence,
        drivers: c?.drivers?.length ? c.drivers.map((d: any) => `${d.label}: ${d.impact} (${d.score > 0 ? '+' : ''}${d.score})`) : ['Awaiting fundamental commodity metrics'],
        conflicts: [],
        type: 'COMMODITY' as const,
      };
    }

    // Default Fallback
    return {
      id: 'GLOBAL',
      title: 'MARKET SENTIMENT MONITOR',
      subtitle: 'Real-time fundamental intelligence',
      score: 0,
      label: 'NEUTRAL',
      isBullish: false,
      isBearish: false,
      isNeutral: true,
      trendConfidence,
      drivers: [],
      type: 'GLOBAL' as const,
    };
  }, [selectedTarget, globalSummary, currencyScores, commodityScores, cotRecords, observations, interestRates]);

  // Angle for Gauge Needle (-100 to +100 mapped to -80deg to +80deg)
  const clampedScore = Math.max(-100, Math.min(100, targetData.score));
  const needleRotation = (clampedScore / 100) * 80;
  const normalizedPercent = Math.round(((clampedScore + 100) / 200) * 100);

  // Circular progress ring calculations for Trend Confidence Score
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius; // ~263.89
  const confidenceScore = targetData.trendConfidence.score;
  const strokeDashoffset = ringCircumference - (confidenceScore / 100) * ringCircumference;

  return (
    <div className="bg-slate-950/95 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 backdrop-blur-xl relative overflow-hidden transition-all duration-300">
      {/* Background glow effects based on sentiment and confidence */}
      <div
        className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-20 ${
          targetData.isBullish
            ? 'bg-emerald-500'
            : targetData.isBearish
            ? 'bg-rose-500'
            : 'bg-cyan-500'
        }`}
      />
      <div
        className={`absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-15 ${
          targetData.trendConfidence.tier === 'HIGH'
            ? 'bg-emerald-600'
            : targetData.trendConfidence.tier === 'LOW'
            ? 'bg-rose-600'
            : 'bg-amber-600'
        }`}
      />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shadow-lg transition-colors ${
              targetData.isBullish
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-500/15'
                : targetData.isBearish
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-rose-500/15'
                : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-cyan-500/15'
            }`}
          >
            <Gauge className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 uppercase tracking-wider">
                MACRO SENTIMENT & CONVICTION
              </span>
              <span className="text-[10px] font-mono-code text-slate-400 hidden sm:inline">
                COLOR-CODED DIRECTION + VOLUME & VOLATILITY CONFIDENCE
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wide mt-0.5 flex items-center gap-2 flex-wrap">
              <span>FUNDAMENTAL SENTIMENT & CONFIDENCE MONITOR</span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono-code font-bold border transition-colors ${
                  targetData.isBullish
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : targetData.isBearish
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {targetData.isBullish ? 'BULLISH (GREEN)' : targetData.isBearish ? 'BEARISH (RED)' : 'NEUTRAL'}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono-code font-bold border ${
                  targetData.trendConfidence.tier === 'HIGH'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : targetData.trendConfidence.tier === 'LOW'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {targetData.trendConfidence.score}% CONFIDENCE
              </span>
            </h2>
          </div>
        </div>

        {/* Quick Summary Counts & Collapse Button */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] font-mono-code">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span>{globalSummary.bullishCount} Bullish</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>{globalSummary.bearishCount} Bearish</span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-300 font-bold">
              Global Confidence: {globalSummary.avgConfidence}%
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title={isCollapsed ? 'Expand Sentiment Meter' : 'Collapse Sentiment Meter'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="space-y-4 relative z-10 animate-in fade-in duration-300">
          {/* Asset Selection Filter Chips with Direction & Trend Confidence Score */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 text-xs font-military select-none">
            {/* Global Button */}
            <button
              type="button"
              onClick={() => setSelectedTarget('GLOBAL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shrink-0 cursor-pointer ${
                selectedTarget === 'GLOBAL'
                  ? 'bg-blue-500/20 text-cyan-300 border-cyan-400/60 shadow-md shadow-blue-500/20 scale-[1.02]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>GLOBAL MARKET PULSE</span>
              <span
                className={`text-[10px] font-mono-code px-1.5 py-0.2 rounded font-bold ${
                  globalSummary.avgScore > 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : globalSummary.avgScore < 0
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {globalSummary.avgScore > 0 ? `+${globalSummary.avgScore}` : globalSummary.avgScore}
              </span>
              <span className="text-[10px] font-mono-code px-1 rounded bg-cyan-500/15 text-cyan-300 font-bold">
                {globalSummary.avgConfidence}%
              </span>
            </button>

            <span className="text-slate-700 px-1">|</span>

            {/* 8 Currencies */}
            {CURRENCIES.map((c) => {
              const sc = currencyScores[c.code];
              const score = sc ? sc.finalCompositeScore : 0;
              const isBull = score >= 12;
              const isBear = score <= -12;
              const isSelected = selectedTarget === c.code;

              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedTarget(c.code);
                    if (onSelectCurrency) onSelectCurrency(c.code);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono-code transition shrink-0 cursor-pointer ${
                    isSelected
                      ? isBull
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                        : isBear
                        ? 'bg-rose-500/25 text-rose-200 border-rose-400 shadow-md shadow-rose-500/20 scale-[1.02]'
                        : 'bg-slate-800 text-slate-100 border-cyan-400 scale-[1.02]'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span className="font-bold">{c.code}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBull ? 'bg-emerald-400' : isBear ? 'bg-rose-400' : 'bg-slate-500'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {score > 0 ? `+${score}` : score}
                  </span>
                </button>
              );
            })}

            <span className="text-slate-700 px-1">|</span>

            {/* 3 Commodities */}
            {[
              { code: 'XAU', label: 'Gold', icon: '🥇', key: 'GOLD' },
              { code: 'XAG', label: 'Silver', icon: '🥈', key: 'SILVER' },
              { code: 'WTI', label: 'WTI Oil', icon: '🛢️', key: 'CRUDE_OIL' },
            ].map((comm) => {
              const c = commodityScores[comm.key];
              const score = c ? c.score : 0;
              const isBull = score >= 12;
              const isBear = score <= -12;
              const isSelected = selectedTarget === comm.code;

              return (
                <button
                  key={comm.code}
                  type="button"
                  onClick={() => setSelectedTarget(comm.code)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-mono-code transition shrink-0 cursor-pointer ${
                    isSelected
                      ? isBull
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                        : isBear
                        ? 'bg-rose-500/25 text-rose-200 border-rose-400 shadow-md shadow-rose-500/20 scale-[1.02]'
                        : 'bg-slate-800 text-slate-100 border-cyan-400 scale-[1.02]'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{comm.icon}</span>
                  <span className="font-bold">{comm.code}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isBull ? 'bg-emerald-400' : isBear ? 'bg-rose-400' : 'bg-slate-500'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold ${
                      isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {score > 0 ? `+${score}` : score}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Visual Sentiment & Trend Confidence Meters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5 items-stretch bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            {/* 1. Bullish/Bearish Directional Gauge Display (Cols 1-4 on XL) */}
            <div className="xl:col-span-4 flex flex-col items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850">
              <div className="w-full flex items-center justify-between pb-1 border-b border-slate-800/60">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DIRECTIONAL SENTIMENT</span>
                </span>
                <span
                  className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
                    targetData.isBullish
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : targetData.isBearish
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {targetData.isBullish ? 'BULLISH' : targetData.isBearish ? 'BEARISH' : 'NEUTRAL'}
                </span>
              </div>

              {/* Semi-Circle SVG Radial Gauge */}
              <div className="relative w-60 h-32 flex items-end justify-center overflow-visible my-2">
                <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="sentimentGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="25%" stopColor="#f43f5e" />
                      <stop offset="48%" stopColor="#eab308" />
                      <stop offset="52%" stopColor="#eab308" />
                      <stop offset="75%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Background Arc Track */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />

                  {/* Gradient Arc */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="url(#sentimentGaugeGradient)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    filter="url(#gaugeGlow)"
                    opacity="0.9"
                  />

                  {/* Tick Marks */}
                  <line x1="20" y1="100" x2="28" y2="100" stroke="#f87171" strokeWidth="2" />
                  <line x1="43" y1="43" x2="49" y2="49" stroke="#fb7185" strokeWidth="2" />
                  <line x1="100" y1="20" x2="100" y2="28" stroke="#facc15" strokeWidth="2.5" />
                  <line x1="157" y1="43" x2="151" y2="49" stroke="#34d399" strokeWidth="2" />
                  <line x1="180" y1="100" x2="172" y2="100" stroke="#10b981" strokeWidth="2" />

                  {/* Pivot Point */}
                  <circle cx="100" cy="100" r="10" fill="#0f172a" stroke="#475569" strokeWidth="3" />
                  <circle
                    cx="100"
                    cy="100"
                    r="5"
                    fill={targetData.isBullish ? '#10b981' : targetData.isBearish ? '#ef4444' : '#38bdf8'}
                  />

                  {/* Animated Dial Needle */}
                  <g
                    style={{
                      transform: `rotate(${needleRotation}deg)`,
                      transformOrigin: '100px 100px',
                      transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    <line
                      x1="100"
                      y1="100"
                      x2="100"
                      y2="24"
                      stroke={targetData.isBullish ? '#34d399' : targetData.isBearish ? '#f87171' : '#cbd5e1'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    <polygon
                      points="96,100 104,100 100,20"
                      fill={targetData.isBullish ? '#10b981' : targetData.isBearish ? '#ef4444' : '#e2e8f0'}
                    />
                    <circle
                      cx="100"
                      cy="22"
                      r="3"
                      fill={targetData.isBullish ? '#34d399' : targetData.isBearish ? '#f87171' : '#ffffff'}
                    />
                  </g>
                </svg>

                {/* Score Number in Center Bottom of Arc */}
                <div className="absolute bottom-0 flex flex-col items-center">
                  <div
                    className={`text-2xl sm:text-3xl font-military font-bold tracking-tight ${
                      targetData.isBullish
                        ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                        : targetData.isBearish
                        ? 'text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                        : 'text-slate-200'
                    }`}
                  >
                    {targetData.score > 0 ? `+${targetData.score}` : targetData.score}
                  </div>
                  <span className="text-[9px] font-mono-code text-slate-400 uppercase -mt-0.5">
                    NET SCORE (-100 to +100)
                  </span>
                </div>
              </div>

              {/* Gauge Extremes Labels */}
              <div className="w-full flex justify-between px-4 text-[10px] font-mono-code font-bold">
                <span className="text-rose-400 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-500" />
                  <span>BEARISH (-100)</span>
                </span>
                <span className="text-amber-300">NEUTRAL (0)</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span>BULLISH (+100)</span>
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                </span>
              </div>

              {/* Linear Color-Coded Progress Track with Needle Position */}
              <div className="w-full px-2 mt-3 space-y-1">
                <div className="relative w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                  <div className="h-full w-[44%] bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500/70" />
                  <div className="h-full w-[12%] bg-amber-500/80" />
                  <div className="h-full w-[44%] bg-gradient-to-r from-amber-500/70 via-emerald-500 to-emerald-400" />
                </div>

                <div className="relative w-full h-3">
                  <div
                    className="absolute top-0 -ml-1.5 transition-all duration-700 ease-out flex flex-col items-center"
                    style={{ left: `${normalizedPercent}%` }}
                  >
                    <div
                      className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] ${
                        targetData.isBullish
                          ? 'border-b-emerald-400'
                          : targetData.isBearish
                          ? 'border-b-rose-400'
                          : 'border-b-slate-300'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Trend Confidence Score Display (Cols 5-8 on XL) */}
            <div className="xl:col-span-4 flex flex-col justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                <span className="text-[10px] font-mono-code font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>TREND CONFIDENCE SCORE</span>
                </span>
                <span
                  className={`text-[10px] font-mono-code font-bold px-2 py-0.5 rounded-full border ${
                    targetData.trendConfidence.tier === 'HIGH'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : targetData.trendConfidence.tier === 'LOW'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {targetData.trendConfidence.tierLabel}
                </span>
              </div>

              {/* Radial Confidence Ring & Percentage */}
              <div className="flex items-center justify-center gap-4 py-1">
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      className="stroke-slate-800"
                      strokeWidth="9"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r={ringRadius}
                      stroke={
                        targetData.trendConfidence.tier === 'HIGH'
                          ? '#10b981'
                          : targetData.trendConfidence.tier === 'LOW'
                          ? '#ef4444'
                          : '#f59e0b'
                      }
                      strokeWidth="9"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                      style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span
                      className={`text-xl sm:text-2xl font-military font-bold tracking-tight ${
                        targetData.trendConfidence.tier === 'HIGH'
                          ? 'text-emerald-300'
                          : targetData.trendConfidence.tier === 'LOW'
                          ? 'text-rose-300'
                          : 'text-amber-300'
                      }`}
                    >
                      {targetData.trendConfidence.score}%
                    </span>
                    <span className="text-[8px] font-mono-code text-slate-400 uppercase -mt-0.5">
                      CONFIDENCE
                    </span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="text-xs font-military font-bold text-slate-200">
                    {targetData.trendConfidence.score >= 70
                      ? 'Strong Trend Alignment'
                      : targetData.trendConfidence.score >= 50
                      ? 'Moderate Trend Conviction'
                      : 'High Macro Uncertainty'}
                  </div>
                  <p className="text-[10px] font-mono-code text-slate-400 leading-tight">
                    Derived from institutional futures volume flow and macroeconomic volatility stability.
                  </p>
                </div>
              </div>

              {/* Breakdown: Volume Context & Volatility Context Micro-Gauges */}
              <div className="space-y-2 pt-1 border-t border-slate-800/60 font-mono-code text-[10px]">
                {/* 1. Volume Context Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-300">
                      <BarChart2 className="w-3 h-3 text-cyan-400" />
                      <span>Volume Flow Context:</span>
                    </span>
                    <span className="font-bold text-cyan-300">
                      {targetData.trendConfidence.volumeScore}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${targetData.trendConfidence.volumeScore}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 truncate" title={targetData.trendConfidence.volumeDetail}>
                    {targetData.trendConfidence.volumeDetail}
                  </div>
                </div>

                {/* 2. Volatility Stability Meter */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-300">
                      <Activity className="w-3 h-3 text-amber-400" />
                      <span>Volatility Stability:</span>
                    </span>
                    <span className="font-bold text-amber-300">
                      {targetData.trendConfidence.volatilityScore}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${targetData.trendConfidence.volatilityScore}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-400 truncate" title={targetData.trendConfidence.volatilityDetail}>
                    {targetData.trendConfidence.volatilityDetail}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Target Breakdown & Institutional Drivers (Cols 9-12 on XL) */}
            <div className="xl:col-span-4 flex flex-col justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-850 space-y-3">
              <div>
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
                  <div className="text-[10px] font-mono-code text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <span>EVALUATION TARGET</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-cyan-400 font-bold">{targetData.type}</span>
                  </div>
                  <div className="text-xs font-mono-code font-bold text-slate-300">
                    {targetData.title}
                  </div>
                </div>

                {/* Big Sentiment Badge with Icon */}
                <div
                  className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2.5 shadow-lg transition-all ${
                    targetData.isBullish
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-emerald-500/15'
                      : targetData.isBearish
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-rose-500/15'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200'
                  }`}
                >
                  {targetData.isBullish ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400 stroke-[2.5]" />
                  ) : targetData.isBearish ? (
                    <TrendingDown className="w-5 h-5 text-rose-400 stroke-[2.5]" />
                  ) : (
                    <Minus className="w-5 h-5 text-slate-400 stroke-[2.5]" />
                  )}
                  <div className="min-w-0">
                    <div className="text-[9px] font-mono-code uppercase tracking-wider opacity-80">
                      SENTIMENT BIAS
                    </div>
                    <div className="text-xs font-military font-bold tracking-wide truncate">
                      {targetData.label} ({targetData.score > 0 ? `+${targetData.score}` : targetData.score})
                    </div>
                  </div>
                </div>

                {/* Key Drivers List */}
                <div className="mt-2.5 space-y-1.5 max-h-32 overflow-y-auto scrollbar-thin pr-1 text-[11px] font-mono-code">
                  <div className="text-[10px] font-military font-bold text-cyan-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>CATALYSTS & EVIDENCE</span>
                  </div>
                  {targetData.drivers.slice(0, 4).map((driver: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                          targetData.isBullish
                            ? 'bg-emerald-400'
                            : targetData.isBearish
                            ? 'bg-rose-400'
                            : 'bg-cyan-400'
                        }`}
                      />
                      <span className="leading-tight line-clamp-1">{driver}</span>
                    </div>
                  ))}
                  {targetData.conflicts && targetData.conflicts.length > 0 && (
                    <div className="pt-1 text-[10px] text-amber-300/90 flex items-start gap-1">
                      <span className="shrink-0 text-amber-400 font-bold">⚠️</span>
                      <span className="line-clamp-1">{targetData.conflicts[0]}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Links & Key Rates */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <div className="flex items-center gap-2 text-[10px] font-mono-code text-slate-400">
                  {targetData.policyRate !== undefined && (
                    <span>Rate: <strong className="text-slate-200">{targetData.policyRate.toFixed(2)}%</strong></span>
                  )}
                  {targetData.yield10Y !== undefined && (
                    <span>10Y: <strong className="text-slate-200">{targetData.yield10Y.toFixed(2)}%</strong></span>
                  )}
                </div>

                {onSelectTab && (
                  <button
                    type="button"
                    onClick={() => {
                      if (targetData.type === 'COMMODITY') onSelectTab('COMMODITIES');
                      else if (targetData.type === 'CURRENCY') onSelectTab('WORKSPACES');
                      else onSelectTab('OVERVIEW');
                    }}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-military font-bold text-xs hover:underline cursor-pointer"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
