/**
 * PRIME PIP FX COMMAND CENTER — FUNDAMENTAL INTELLIGENCE ENGINE UNIT & INTEGRATION TESTS
 * Validates all 16 Mandatory Test Cases from Section 29 Specification:
 *
 * 1. Strong USD / Weak EUR
 * 2. Weak USD / Strong EUR
 * 3. Both currencies strong (Relative edge detection)
 * 4. Both currencies weak (Relative edge detection)
 * 5. Conflicting indicators (Inflation up, Growth down -> Conviction & explanation check)
 * 6. Missing data (INSUFFICIENT DATA distinction vs true neutral)
 * 7. Stale data (Recency time-decay penalty)
 * 8. Large forecast surprise (Z-Score magnitude mapping)
 * 9. Small forecast surprise (Standard in-line expectation)
 * 10. Central-bank regime change (Hawkish vs Dovish shift)
 * 11. Inflation acceleration (Above target policy pressure)
 * 12. Inflation deceleration (Easing leeway vs economic weakness)
 * 13. Growth acceleration (Positive GDP surprise)
 * 14. Growth slowdown (Negative GDP surprise)
 * 15. Labor-market deterioration (Unemployment spike, NFP miss)
 * 16. Labor-market improvement (Unemployment drops, NFP beat)
 */

import {
  FundamentalIntelligenceEngine,
  OFFICIAL_INDICATOR_PROFILES,
  IndicatorStatProfile,
} from './fundamentalIntelligenceEngine';
import { CurrencyCode } from '../types/fundamentalIndicatorTypes';

interface TestResult {
  testId: number;
  testName: string;
  passed: boolean;
  actual: string;
  expected: string;
}

export function runFundamentalIntelligenceTestSuite(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  const assert = (testId: number, testName: string, condition: boolean, actual: string, expected: string) => {
    results.push({
      testId,
      testName,
      passed: Boolean(condition),
      actual,
      expected,
    });
  };

  // --------------------------------------------------------------------------
  // TEST 1: Strong USD / Weak EUR
  // --------------------------------------------------------------------------
  {
    const usdObs: Record<string, any> = {
      USD_POLICY_RATE: { actual: 5.5, forecast: 5.25, previous: 5.25, releaseDate: new Date().toISOString() },
      USD_CPI_YOY: { actual: 3.8, forecast: 3.4, previous: 3.5, releaseDate: new Date().toISOString() },
      USD_NFP: { actual: 320, forecast: 180, previous: 200, releaseDate: new Date().toISOString() },
      USD_GDP_ANNUALIZED: { actual: 3.4, forecast: 2.1, previous: 2.3, releaseDate: new Date().toISOString() },
      USD_10Y_YIELD: { actual: 4.65, forecast: 4.4, previous: 4.35, releaseDate: new Date().toISOString() },
    };

    const eurObs: Record<string, any> = {
      EUR_DEPOSIT_RATE: { actual: 2.75, forecast: 3.0, previous: 3.25, releaseDate: new Date().toISOString() },
      EUR_HICP_YOY: { actual: 1.6, forecast: 2.1, previous: 2.3, releaseDate: new Date().toISOString() },
      EUR_GDP_QOQ: { actual: -0.2, forecast: 0.1, previous: 0.0, releaseDate: new Date().toISOString() },
      EUR_UNEMPLOYMENT: { actual: 7.2, forecast: 6.4, previous: 6.5, releaseDate: new Date().toISOString() },
      EUR_GERMAN_10Y_BUND: { actual: 2.1, forecast: 2.3, previous: 2.35, releaseDate: new Date().toISOString() },
    };

    const usdScore = FundamentalIntelligenceEngine.evaluateCurrency('USD', usdObs);
    const eurScore = FundamentalIntelligenceEngine.evaluateCurrency('EUR', eurObs);
    const pair = FundamentalIntelligenceEngine.evaluatePair('EUR', 'USD', { USD: usdScore, EUR: eurScore } as any);

    assert(
      1,
      'Strong USD / Weak EUR (EUR/USD Bearish divergence)',
      usdScore.compositeScore > 35 && eurScore.compositeScore < -15 && pair.netDifferential < -30 && (pair.fundamentalBias === 'BEARISH' || pair.fundamentalBias === 'STRONGLY_BEARISH'),
      `USD: +${usdScore.compositeScore}, EUR: ${eurScore.compositeScore}, EURUSD Diff: ${pair.netDifferential} (${pair.fundamentalBias})`,
      'USD > +35, EUR < -15, EURUSD netDifferential < -30 with BEARISH bias'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 2: Weak USD / Strong EUR
  // --------------------------------------------------------------------------
  {
    const usdObs: Record<string, any> = {
      USD_POLICY_RATE: { actual: 3.75, forecast: 4.0, previous: 4.25, releaseDate: new Date().toISOString() },
      USD_CPI_YOY: { actual: 1.8, forecast: 2.2, previous: 2.4, releaseDate: new Date().toISOString() },
      USD_NFP: { actual: 45, forecast: 160, previous: 175, releaseDate: new Date().toISOString() },
      USD_GDP_ANNUALIZED: { actual: 0.6, forecast: 1.8, previous: 1.9, releaseDate: new Date().toISOString() },
    };

    const eurObs: Record<string, any> = {
      EUR_DEPOSIT_RATE: { actual: 4.25, forecast: 4.0, previous: 3.75, releaseDate: new Date().toISOString() },
      EUR_HICP_YOY: { actual: 3.4, forecast: 2.6, previous: 2.8, releaseDate: new Date().toISOString() },
      EUR_GDP_QOQ: { actual: 0.8, forecast: 0.2, previous: 0.2, releaseDate: new Date().toISOString() },
      EUR_UNEMPLOYMENT: { actual: 5.9, forecast: 6.5, previous: 6.6, releaseDate: new Date().toISOString() },
    };

    const usdScore = FundamentalIntelligenceEngine.evaluateCurrency('USD', usdObs);
    const eurScore = FundamentalIntelligenceEngine.evaluateCurrency('EUR', eurObs);
    const pair = FundamentalIntelligenceEngine.evaluatePair('EUR', 'USD', { USD: usdScore, EUR: eurScore } as any);

    assert(
      2,
      'Weak USD / Strong EUR (EUR/USD Bullish divergence)',
      usdScore.compositeScore < -15 && eurScore.compositeScore > 30 && pair.netDifferential > 30 && (pair.fundamentalBias === 'BULLISH' || pair.fundamentalBias === 'STRONGLY_BULLISH'),
      `USD: ${usdScore.compositeScore}, EUR: +${eurScore.compositeScore}, EURUSD Diff: +${pair.netDifferential} (${pair.fundamentalBias})`,
      'USD < -15, EUR > +30, EURUSD netDifferential > +30 with BULLISH bias'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Both currencies strong (Relative edge detection)
  // --------------------------------------------------------------------------
  {
    const gbpObs: Record<string, any> = {
      GBP_BANK_RATE: { actual: 5.25, forecast: 5.25, previous: 5.0, releaseDate: new Date().toISOString() },
      GBP_CPI_YOY: { actual: 3.6, forecast: 3.2, previous: 3.4, releaseDate: new Date().toISOString() },
      GBP_GDP_MOM: { actual: 0.5, forecast: 0.2, previous: 0.1, releaseDate: new Date().toISOString() },
    };
    const usdObs: Record<string, any> = {
      USD_POLICY_RATE: { actual: 5.25, forecast: 5.25, previous: 5.25, releaseDate: new Date().toISOString() },
      USD_CPI_YOY: { actual: 3.4, forecast: 3.1, previous: 3.2, releaseDate: new Date().toISOString() },
      USD_GDP_ANNUALIZED: { actual: 3.0, forecast: 2.4, previous: 2.2, releaseDate: new Date().toISOString() },
    };

    const gbpScore = FundamentalIntelligenceEngine.evaluateCurrency('GBP', gbpObs);
    const usdScore = FundamentalIntelligenceEngine.evaluateCurrency('USD', usdObs);
    const pair = FundamentalIntelligenceEngine.evaluatePair('GBP', 'USD', { GBP: gbpScore, USD: usdScore } as any);

    assert(
      3,
      'Both Currencies Strong (Relative Edge detection)',
      gbpScore.compositeScore > 20 && usdScore.compositeScore > 20 && Math.abs(pair.netDifferential) < 25 && pair.tradeSuitability !== 'HIGH_CONVICTION',
      `GBP: +${gbpScore.compositeScore}, USD: +${usdScore.compositeScore}, Diff: ${pair.netDifferential}, Suitability: ${pair.tradeSuitability}`,
      'Both positive, tight spread < 25 pts, not classified as high conviction solo trade'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Both currencies weak (Relative edge detection)
  // --------------------------------------------------------------------------
  {
    const jpyObs: Record<string, any> = {
      JPY_POLICY_RATE: { actual: -0.1, forecast: 0.0, previous: 0.0, releaseDate: new Date().toISOString() },
      JPY_GDP_ANNUALIZED: { actual: -1.2, forecast: 0.2, previous: 0.4, releaseDate: new Date().toISOString() },
    };
    const chfObs: Record<string, any> = {
      CHF_POLICY_RATE: { actual: 0.5, forecast: 1.0, previous: 1.25, releaseDate: new Date().toISOString() },
      CHF_CPI_YOY: { actual: 0.6, forecast: 1.2, previous: 1.3, releaseDate: new Date().toISOString() },
    };

    const jpyScore = FundamentalIntelligenceEngine.evaluateCurrency('JPY', jpyObs);
    const chfScore = FundamentalIntelligenceEngine.evaluateCurrency('CHF', chfObs);
    const pair = FundamentalIntelligenceEngine.evaluatePair('CHF', 'JPY', { JPY: jpyScore, CHF: chfScore } as any);

    assert(
      4,
      'Both Currencies Weak (Relative Edge detection)',
      jpyScore.compositeScore < -10 && chfScore.compositeScore < -10,
      `JPY: ${jpyScore.compositeScore}, CHF: ${chfScore.compositeScore}, Diff: ${pair.netDifferential}`,
      'Both negative composite scores, properly compared on relative margin'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: Conflicting indicators (Inflation up, Growth down)
  // --------------------------------------------------------------------------
  {
    const stagflationObs: Record<string, any> = {
      USD_CPI_YOY: { actual: 4.8, forecast: 3.2, previous: 3.3, releaseDate: new Date().toISOString() },
      USD_CORE_CPI_YOY: { actual: 4.5, forecast: 3.4, previous: 3.4, releaseDate: new Date().toISOString() },
      USD_GDP_ANNUALIZED: { actual: -1.4, forecast: 1.2, previous: 1.5, releaseDate: new Date().toISOString() },
      USD_ISM_MANUFACTURING: { actual: 43.2, forecast: 49.5, previous: 48.0, releaseDate: new Date().toISOString() },
      USD_NFP: { actual: -40, forecast: 150, previous: 180, releaseDate: new Date().toISOString() },
    };

    const usdScore = FundamentalIntelligenceEngine.evaluateCurrency('USD', stagflationObs);

    assert(
      5,
      'Conflicting Indicators (Conflict Flagging & Invalidation)',
      usdScore.conflictingFactors.length > 0 && usdScore.invalidationRisks.length > 0,
      `Conflicts count: ${usdScore.conflictingFactors.length}, Sample: "${usdScore.conflictingFactors[0] || 'None'}"`,
      'Engine surfaces conflicts explicitly without hiding divergent economic forces'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: Missing data (INSUFFICIENT DATA distinction vs true neutral)
  // --------------------------------------------------------------------------
  {
    const emptyObs: Record<string, any> = {};
    const unverifiedScore = FundamentalIntelligenceEngine.evaluateCurrency('CAD', emptyObs);

    assert(
      6,
      'Missing Data Handling (INSUFFICIENT DATA vs Neutral)',
      unverifiedScore.bias === 'INSUFFICIENT_DATA' && unverifiedScore.dataQualityStatus === 'INSUFFICIENT_DATA' && unverifiedScore.dataCoveragePercent === 0,
      `Bias: ${unverifiedScore.bias}, Quality: ${unverifiedScore.dataQualityStatus}, Coverage: ${unverifiedScore.dataCoveragePercent}%`,
      'Empty observations produce INSUFFICIENT_DATA, not a fake neutral 0'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 7: Stale data (Recency time-decay penalty)
  // --------------------------------------------------------------------------
  {
    const profile = OFFICIAL_INDICATOR_PROFILES.USD_NFP;
    const freshReleaseDate = new Date().toISOString();
    const staleReleaseDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(); // 120 days ago

    const freshEval = FundamentalIntelligenceEngine.evaluateIndicator(profile, {
      actual: 300,
      forecast: 150,
      previous: 160,
      releaseDate: freshReleaseDate,
    });

    const staleEval = FundamentalIntelligenceEngine.evaluateIndicator(profile, {
      actual: 300,
      forecast: 150,
      previous: 160,
      releaseDate: staleReleaseDate,
    });

    assert(
      7,
      'Stale Data Recency Penalty',
      staleEval.isStale && staleEval.freshness === 'EXPIRED' && Math.abs(staleEval.score) < Math.abs(freshEval.score),
      `Fresh Score: ${freshEval.score} (${freshEval.freshness}), Stale Score: ${staleEval.score} (${staleEval.freshness})`,
      'Stale release gets penalized/decayed vs fresh reading'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 8: Large forecast surprise (Z-Score magnitude mapping)
  // --------------------------------------------------------------------------
  {
    const profile = OFFICIAL_INDICATOR_PROFILES.USD_NFP; // stdDev = 75k
    const massiveBeat = FundamentalIntelligenceEngine.evaluateIndicator(profile, {
      actual: 375, // +225k surprise = +3.0 stdDev
      forecast: 150,
      previous: 150,
      releaseDate: new Date().toISOString(),
    });

    assert(
      8,
      'Large Forecast Surprise (Z-Score mapping)',
      massiveBeat.standardizedSurprise !== null && massiveBeat.standardizedSurprise >= 2.5 && massiveBeat.score >= 80,
      `Z-Score: ${massiveBeat.standardizedSurprise}, Score: ${massiveBeat.score}, Bias: ${massiveBeat.bias}`,
      'Z-score >= +2.5 produces near-maximum score >= 80'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 9: Small forecast surprise (Standard in-line expectation)
  // --------------------------------------------------------------------------
  {
    const profile = OFFICIAL_INDICATOR_PROFILES.USD_CPI_YOY; // stdDev = 0.2%
    const inLinePrint = FundamentalIntelligenceEngine.evaluateIndicator(profile, {
      actual: 2.8,
      forecast: 2.8,
      previous: 2.8,
      releaseDate: new Date().toISOString(),
    });

    assert(
      9,
      'Small / In-Line Forecast Surprise',
      inLinePrint.surprise === 0 && Math.abs(inLinePrint.score) <= 30,
      `Surprise: ${inLinePrint.surprise}, Score: ${inLinePrint.score}`,
      'Surprise is 0, score reflects only baseline target delta'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 10: Central-bank regime change (Hawkish vs Dovish shift)
  // --------------------------------------------------------------------------
  {
    const hawkishObs: Record<string, any> = {
      USD_POLICY_RATE: { actual: 5.5, forecast: 5.25, previous: 5.25, releaseDate: new Date().toISOString() },
    };
    const dovishObs: Record<string, any> = {
      USD_POLICY_RATE: { actual: 4.5, forecast: 4.75, previous: 5.0, releaseDate: new Date().toISOString() },
    };

    const hawkishScore = FundamentalIntelligenceEngine.evaluateCurrency('USD', hawkishObs);
    const dovishScore = FundamentalIntelligenceEngine.evaluateCurrency('USD', dovishObs);

    assert(
      10,
      'Central-Bank Regime Shift (Hawkish vs Dovish)',
      hawkishScore.categoryScores.MONETARY_POLICY.score > 20 && dovishScore.categoryScores.MONETARY_POLICY.score < -20,
      `Hawkish Policy Score: +${hawkishScore.categoryScores.MONETARY_POLICY.score}, Dovish Policy Score: ${dovishScore.categoryScores.MONETARY_POLICY.score}`,
      'Rate hike generates positive policy score; rate cut generates negative policy score'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 11: Inflation acceleration (Above target policy pressure)
  // --------------------------------------------------------------------------
  {
    const acceleratingInflation: Record<string, any> = {
      USD_CPI_YOY: { actual: 4.2, forecast: 3.5, previous: 3.3, releaseDate: new Date().toISOString() },
      USD_CORE_CPI_YOY: { actual: 4.0, forecast: 3.4, previous: 3.3, releaseDate: new Date().toISOString() },
    };

    const usdInflation = FundamentalIntelligenceEngine.evaluateCurrency('USD', acceleratingInflation);

    assert(
      11,
      'Inflation Acceleration',
      usdInflation.categoryScores.INFLATION.score >= 35 && usdInflation.categoryScores.INFLATION.bias.includes('BULLISH'),
      `Inflation Score: +${usdInflation.categoryScores.INFLATION.score} (${usdInflation.categoryScores.INFLATION.bias})`,
      'Inflation acceleration above target produces hawkish bullish score'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 12: Inflation deceleration (Easing leeway vs economic weakness)
  // --------------------------------------------------------------------------
  {
    const coolingInflation: Record<string, any> = {
      USD_CPI_YOY: { actual: 1.7, forecast: 2.1, previous: 2.4, releaseDate: new Date().toISOString() },
      USD_CORE_CPI_YOY: { actual: 1.8, forecast: 2.2, previous: 2.4, releaseDate: new Date().toISOString() },
    };

    const usdCooling = FundamentalIntelligenceEngine.evaluateCurrency('USD', coolingInflation);

    assert(
      12,
      'Inflation Deceleration Below Target',
      usdCooling.categoryScores.INFLATION.score < 0,
      `Inflation Score: ${usdCooling.categoryScores.INFLATION.score} (${usdCooling.categoryScores.INFLATION.bias})`,
      'Cooling inflation below target permits central bank accommodation (negative score)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 13: Growth acceleration (Positive GDP surprise)
  // --------------------------------------------------------------------------
  {
    const boomGrowth: Record<string, any> = {
      USD_GDP_ANNUALIZED: { actual: 3.8, forecast: 2.0, previous: 2.2, releaseDate: new Date().toISOString() },
    };

    const usdGrowth = FundamentalIntelligenceEngine.evaluateCurrency('USD', boomGrowth);

    assert(
      13,
      'Growth Acceleration (GDP beat)',
      usdGrowth.categoryScores.GROWTH.score >= 40 && usdGrowth.categoryScores.GROWTH.bias === 'STRONGLY_BULLISH',
      `Growth Score: +${usdGrowth.categoryScores.GROWTH.score} (${usdGrowth.categoryScores.GROWTH.bias})`,
      'GDP beat produces STRONGLY_BULLISH score >= 40'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 14: Growth slowdown (Negative GDP surprise)
  // --------------------------------------------------------------------------
  {
    const slumpGrowth: Record<string, any> = {
      USD_GDP_ANNUALIZED: { actual: -0.5, forecast: 1.5, previous: 2.1, releaseDate: new Date().toISOString() },
    };

    const usdSlump = FundamentalIntelligenceEngine.evaluateCurrency('USD', slumpGrowth);

    assert(
      14,
      'Growth Slowdown (GDP contraction)',
      usdSlump.categoryScores.GROWTH.score <= -35 && (usdSlump.categoryScores.GROWTH.bias === 'BEARISH' || usdSlump.categoryScores.GROWTH.bias === 'STRONGLY_BEARISH'),
      `Growth Score: ${usdSlump.categoryScores.GROWTH.score} (${usdSlump.categoryScores.GROWTH.bias})`,
      'Negative GDP surprise produces BEARISH score <= -35'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 15: Labor-market deterioration (Unemployment spike, NFP miss)
  // --------------------------------------------------------------------------
  {
    const laborDeterioration: Record<string, any> = {
      USD_NFP: { actual: 20, forecast: 180, previous: 210, releaseDate: new Date().toISOString() },
      USD_UNEMPLOYMENT: { actual: 4.8, forecast: 4.0, previous: 4.0, releaseDate: new Date().toISOString() },
    };

    const usdLabor = FundamentalIntelligenceEngine.evaluateCurrency('USD', laborDeterioration);

    assert(
      15,
      'Labor-Market Deterioration',
      usdLabor.categoryScores.EMPLOYMENT.score <= -35,
      `Labor Score: ${usdLabor.categoryScores.EMPLOYMENT.score} (${usdLabor.categoryScores.EMPLOYMENT.bias})`,
      'Rising unemployment + NFP miss produces negative labor score <= -35'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 16: Labor-market improvement (Unemployment drops, NFP beat)
  // --------------------------------------------------------------------------
  {
    const laborBoom: Record<string, any> = {
      USD_NFP: { actual: 285, forecast: 160, previous: 170, releaseDate: new Date().toISOString() },
      USD_UNEMPLOYMENT: { actual: 3.5, forecast: 3.9, previous: 4.0, releaseDate: new Date().toISOString() },
    };

    const usdLaborBoom = FundamentalIntelligenceEngine.evaluateCurrency('USD', laborBoom);

    assert(
      16,
      'Labor-Market Improvement',
      usdLaborBoom.categoryScores.EMPLOYMENT.score >= 35,
      `Labor Score: +${usdLaborBoom.categoryScores.EMPLOYMENT.score} (${usdLaborBoom.categoryScores.EMPLOYMENT.bias})`,
      'Falling unemployment + NFP beat produces positive labor score >= 35'
    );
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}
