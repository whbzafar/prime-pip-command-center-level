import { FundamentalsDataService } from './types';
import {
  CurrencyCode,
  CurrencyFundamentalProfile,
  CurrencySummaryItem,
  HistoricalScorePoint,
  Horizon,
  PairFundamentalProfile,
  PairOpportunity,
  ConfidenceLevel,
} from '../types';
import { MOCK_CURRENCY_DATA } from './mockData';
import { scoreToBiasLabel, scoreToBullishPct } from '../config/theme';
import { MAJOR_CURRENCY_CODES } from '../config/pillars';

export class MockDataProvider implements FundamentalsDataService {
  async getCurrencyScores(horizon: Horizon): Promise<CurrencySummaryItem[]> {
    const list: CurrencySummaryItem[] = MAJOR_CURRENCY_CODES.map((code) => {
      const profile = MOCK_CURRENCY_DATA[code];
      const score = profile.scores[horizon];
      const bullishPct = scoreToBullishPct(score);
      const biasLabel = scoreToBiasLabel(score);
      const confidence = profile.confidence[horizon];

      // 7-day sparkline from history
      const sparkline = profile.history.slice(-7).map((h) => h[horizon]);
      const prev7 = sparkline[0] ?? score;
      const sevenDayChange = score - prev7;

      return {
        code,
        name: profile.name,
        flag: profile.flag,
        score,
        bullishPct,
        biasLabel,
        confidence,
        shortScore: profile.scores.short,
        longScore: profile.scores.long,
        sevenDayChange,
        sparkline,
        updatedAt: profile.updatedAt,
      };
    });

    // Rank from strongest to weakest
    return list.sort((a, b) => b.score - a.score);
  }

  async getCurrencyDetail(code: CurrencyCode): Promise<CurrencyFundamentalProfile> {
    const profile = MOCK_CURRENCY_DATA[code];
    if (!profile) {
      throw new Error(`Currency ${code} not found in fundamental database.`);
    }
    return profile;
  }

  async getPairDetail(base: CurrencyCode, quote: CurrencyCode): Promise<PairFundamentalProfile> {
    const baseProfile = MOCK_CURRENCY_DATA[base];
    const quoteProfile = MOCK_CURRENCY_DATA[quote];

    if (!baseProfile || !quoteProfile) {
      throw new Error(`Invalid currency pair requested: ${base}/${quote}`);
    }

    // CRITICAL: Pair score = Base score - Quote score (clamped to -100..+100)
    const rawShort = baseProfile.scores.short - quoteProfile.scores.short;
    const rawLong = baseProfile.scores.long - quoteProfile.scores.long;

    const shortScore = Math.max(-100, Math.min(100, rawShort));
    const longScore = Math.max(-100, Math.min(100, rawLong));

    // Confidence aggregation
    const aggregateConfidence = (c1: ConfidenceLevel, c2: ConfidenceLevel): ConfidenceLevel => {
      if (c1 === 'High' && c2 === 'High') return 'High';
      if (c1 === 'Low' || c2 === 'Low') return 'Low';
      return 'Medium';
    };

    const confidence = {
      short: aggregateConfidence(baseProfile.confidence.short, quoteProfile.confidence.short),
      long: aggregateConfidence(baseProfile.confidence.long, quoteProfile.confidence.long),
    };

    // Calculate pillar gap breakdown
    const pillarGaps = baseProfile.pillars.map((basePillar) => {
      const quotePillar = quoteProfile.pillars.find((p) => p.id === basePillar.id);
      const qScore = quotePillar?.score ?? 0;
      const gap = basePillar.score - qScore;

      return {
        pillarId: basePillar.id,
        pillarName: basePillar.name,
        baseScore: basePillar.score,
        quoteScore: qScore,
        gap,
        favors: (gap > 5 ? 'base' : gap < -5 ? 'quote' : 'neutral') as 'base' | 'quote' | 'neutral',
        weight: basePillar.weight,
      };
    });

    // Synthesized Pair Drivers (Top positive and negative drivers across both assets)
    const combinedDrivers = [
      ...baseProfile.drivers.slice(0, 4).map((d) => ({
        ...d,
        detail: `[${base}] ${d.detail}`,
      })),
      ...quoteProfile.drivers.slice(0, 4).map((d) => ({
        ...d,
        contribution: -d.contribution, // Invert quote driver contribution for pair
        detail: `[${quote}] ${d.detail}`,
      })),
    ].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    const pairName = `${base}/${quote}`;
    const biasWord = shortScore >= 20 ? 'bullish' : shortScore <= -20 ? 'bearish' : 'neutral';

    return {
      pair: pairName,
      base,
      quote,
      scores: {
        short: shortScore,
        long: longScore,
      },
      confidence,
      baseProfile,
      quoteProfile,
      pillarGaps,
      explanation: {
        summary: `The fundamental outlook for ${pairName} is ${biasWord} (Score: ${shortScore > 0 ? `+${shortScore}` : shortScore}). This is derived transparently by subtracting the ${quoteProfile.name} score (${quoteProfile.scores.short}) from the ${baseProfile.name} score (${baseProfile.scores.short}). The primary divergence stems from monetary policy rate trajectories and yield differentials.`,
        invalidation: [
          `Unexpected central bank policy shift from either ${baseProfile.centralBank} or ${quoteProfile.centralBank}.`,
          `Major swing in cross-asset risk sentiment favoring counter-cyclical safe havens.`,
          `Key macroeconomic data prints altering relative 2-year sovereign yield spreads.`,
        ],
        upcomingEvents: [
          ...baseProfile.explanation.upcomingEvents.slice(0, 2),
          ...quoteProfile.explanation.upcomingEvents.slice(0, 2),
        ].sort((a, b) => a.date.localeCompare(b.date)),
      },
      drivers: combinedDrivers,
      updatedAt: baseProfile.updatedAt,
    };
  }

  async getHistory(code: CurrencyCode, days = 30): Promise<HistoricalScorePoint[]> {
    const profile = MOCK_CURRENCY_DATA[code];
    if (!profile) return [];
    return profile.history.slice(-days);
  }

  async getOpportunities(horizon: Horizon): Promise<PairOpportunity[]> {
    const currencies = await this.getCurrencyScores(horizon);
    const opportunities: PairOpportunity[] = [];

    // Evaluate all 28 major pair combinations (unique pairs)
    for (let i = 0; i < currencies.length; i++) {
      for (let j = i + 1; j < currencies.length; j++) {
        const c1 = currencies[i];
        const c2 = currencies[j];

        // Ensure conventional pair ordering or best divergence
        const scoreGap = Math.abs(c1.score - c2.score);
        const isC1Stronger = c1.score >= c2.score;
        const base = isC1Stronger ? c1.code : c2.code;
        const quote = isC1Stronger ? c2.code : c1.code;
        const rawScore = isC1Stronger ? c1.score - c2.score : c2.score - c1.score;
        const clampedScore = Math.max(-100, Math.min(100, rawScore));

        opportunities.push({
          pair: `${base}/${quote}`,
          base,
          quote,
          score: clampedScore,
          bullishPct: scoreToBullishPct(clampedScore),
          biasLabel: scoreToBiasLabel(clampedScore),
          confidence: c1.confidence === 'High' && c2.confidence === 'High' ? 'High' : 'Medium',
          scoreGap,
          rationale: `${base} (+${isC1Stronger ? c1.score : c2.score}) outscores ${quote} (${isC1Stronger ? c2.score : c1.score}) across rate expectations and macro momentum.`,
        });
      }
    }

    // Sort by largest score gap first
    return opportunities.sort((a, b) => b.scoreGap - a.scoreGap);
  }

  async getMetadata(): Promise<{ isDemo: boolean; lastUpdated: string; source: string }> {
    return {
      isDemo: true,
      lastUpdated: new Date().toISOString(),
      source: 'PRIMEPIPFX Macro Intelligence Baseline & Institutional Economic Feeds',
    };
  }
}
