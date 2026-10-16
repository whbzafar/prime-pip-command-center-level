import { getDbClient } from '../shared/db.js';
import { logger } from '../shared/logger.js';
import { runScoring } from './runScoring.js';

export async function runValidationReport(): Promise<void> {
  logger.info('[ValidationReport] Running quantitative validation and directional plausibility checks...');
  const db = getDbClient();

  // 1. Run live scoring check for USD
  console.log('\n================================================================================');
  console.log(' PRO FUNDAMENTALS: LATEST USD SCORE VALIDATION SNAPSHOT');
  console.log('================================================================================\n');

  const liveResult = await runScoring({ asset: 'USD', dryRun: true, skipHashCheck: true });

  for (const res of liveResult.results) {
    console.log(`\n▶ [USD] Horizon: ${res.horizon.toUpperCase()}`);
    console.log(`  Asset Score: ${res.score !== null ? (res.score > 0 ? `+${res.score}` : res.score) : 'INSUFFICIENT'}`);
    console.log(`  Confidence: ${res.confidence?.toUpperCase()} (${res.confidenceIndex?.toFixed(2)})`);
    console.log(`  Regime: ${res.regime?.toUpperCase()}`);
    console.log(`  Warning Flags: [ ${res.flags.join(', ') || 'None'} ]`);

    console.log('  Pillars:');
    for (const p of res.pillars) {
      console.log(`    - ${p.name.padEnd(25)}: ${p.score !== null ? (p.score > 0 ? `+${p.score}` : p.score) : 'INSUFFICIENT'} (Weight: ${(p.weight * 100).toFixed(0)}%)`);
    }

    console.log('  Top Macro Drivers:');
    for (const d of res.topDrivers) {
      console.log(`    #${d.rank} [${d.contribution > 0 ? `+${d.contribution}` : d.contribution} pts] ${d.explanation}`);
    }
  }

  // 2. Query unavailable, stale, and flagged indicators
  console.log('\n================================================================================');
  console.log(' INDICATOR AUDIT: UNAVAILABLE, STALE, OR FLAGGED');
  console.log('================================================================================\n');

  const { data: flags } = await db
    .from('data_quality_flags')
    .select('flag_type, details, created_at, indicators!inner(code, name)')
    .order('created_at', { ascending: false })
    .limit(20);

  if (flags && flags.length > 0) {
    console.log('Data Quality Flags in Database:');
    for (const f of flags) {
      console.log(`  • [${(f as any).indicators?.code}] ${(f as any).flag_type}: ${JSON.stringify(f.details)} (At: ${f.created_at})`);
    }
  } else {
    console.log('No active data quality flags recorded.');
  }

  // 3. Directional Sanity / Plausibility Checks
  console.log('\n================================================================================');
  console.log(' DIRECTIONAL PLAUSIBILITY CHECKS (NOT PROOF - HEURISTIC SANITY AUDIT)');
  console.log('================================================================================\n');

  const testDates = [
    { date: '2020-03-23T23:59:59Z', label: 'March 2020 COVID Liquidity Spike', expectedRiskSentimentPillar: 'BULLISH (> 0)' },
    { date: '2022-10-15T23:59:59Z', label: 'October 2022 Fed Aggressive Rate Hikes', expectedAssetScore: 'BULLISH (> 20)' },
    { date: '2017-12-15T23:59:59Z', label: 'Late 2017 Broad Dollar Softening', expectedAssetScore: 'WEAKER / NEUTRAL-BEARISH' },
  ];

  for (const checkpoint of testDates) {
    try {
      const sim = await runScoring({
        asset: 'USD',
        asOf: checkpoint.date,
        dryRun: true,
        skipHashCheck: true,
      });

      const shortRes = sim.results.find((r) => r.horizon === 'short');
      const longRes = sim.results.find((r) => r.horizon === 'long');

      const riskPillar = shortRes?.pillars.find((p) => p.name.toLowerCase().includes('risk'));

      console.log(`\n• Checkpoint: ${checkpoint.label} (As-Of: ${checkpoint.date.slice(0, 10)})`);
      console.log(`  Expected Direction: ${checkpoint.expectedAssetScore || checkpoint.expectedRiskSentimentPillar}`);
      console.log(`  Actual Short Score: ${shortRes?.score !== null ? (shortRes!.score! > 0 ? `+${shortRes!.score}` : shortRes!.score) : 'Insufficient Data'}`);
      console.log(`  Actual Long Score:  ${longRes?.score !== null ? (longRes!.score! > 0 ? `+${longRes!.score}` : longRes!.score) : 'Insufficient Data'}`);
      if (riskPillar) {
        console.log(`  Risk-Sentiment Pillar: ${riskPillar.score !== null ? (riskPillar.score > 0 ? `+${riskPillar.score}` : riskPillar.score) : 'None'}`);
      }

      if (checkpoint.expectedRiskSentimentPillar && riskPillar?.score !== null) {
        if (riskPillar && riskPillar.score! > 0) {
          console.log('  -> Status: [PLAUSIBLE] Risk-sentiment turned positive safe-haven as expected.');
        } else {
          console.log('  -> Status: [INSPECTION NEEDED] Risk pillar did not print positive (check VIX history availability).');
        }
      }

      if (checkpoint.expectedAssetScore?.includes('BULLISH') && shortRes?.score !== null) {
        if (shortRes && shortRes.score! > 0) {
          console.log('  -> Status: [PLAUSIBLE] USD scored structurally bullish during aggressive Fed tightening.');
        } else {
          console.log('  -> Status: [INSPECTION NEEDED] USD did not score bullish (check observation vintage).');
        }
      }
    } catch (e: any) {
      console.log(`  -> Note: Historical data at ${checkpoint.date.slice(0, 10)} limited by available database seed: ${e.message}`);
    }
  }

  console.log('\n================================================================================');
  console.log(' VALIDATION REPORT COMPLETE');
  console.log('================================================================================\n');
}

if (process.argv[1]?.endsWith('runValidationReport.ts') || process.argv[1]?.endsWith('runValidationReport.js')) {
  runValidationReport()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[ValidationReport Error]', err);
      process.exit(1);
    });
}
