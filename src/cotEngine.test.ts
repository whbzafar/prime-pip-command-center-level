/**
 * UNIT TESTS: CFTC COMMITMENTS OF TRADERS (COT) ENGINE
 * 
 * Verifies:
 * 1. Net calculation (long - short)
 * 2. Weekly change calculation & discrepancy cross-check
 * 3. COT Index ("Smart Money Meter") including flat range, short history, and negative nets
 * 4. Friday 3:30 PM America/New_York release & DST handling
 * 5. Release-due detection
 */

import {
  calculateCotIndex,
  processCotHistory,
  parseAndValidateCotRow,
  isCotReportDue,
  getNewYorkParts,
  getMostRecentTuesdayDate,
  getNextExpectedRelease,
} from './utils/cotCalculations';
import { RawCotRow } from './types/cotTypes';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function runTests() {
  console.log('\n--- [1] NET CALCULATION TESTS ---');
  {
    const row1: RawCotRow = {
      cftc_contract_market_code: '099741',
      market_and_exchange_names: 'EURO FX - CME',
      report_date_as_yyyy_mm_dd: '2026-10-06T00:00:00.000',
      noncomm_positions_long_all: '250000',
      noncomm_positions_short_all: '150000',
      comm_positions_long_all: '300000',
      comm_positions_short_all: '400000',
      open_interest_all: '800000',
    };
    const { record } = parseAndValidateCotRow(row1);
    assert(record !== null, 'Row parsed successfully');
    assert(record?.nonCommNet === 100000, `Non-Commercial Net equals 100,000 (got ${record?.nonCommNet})`);
    assert(record?.commNet === -100000, `Commercial Net equals -100,000 (got ${record?.commNet})`);
  }

  console.log('\n--- [2] WEEKLY CHANGE & DISCREPANCY CROSS-CHECK TESTS ---');
  {
    const history: RawCotRow[] = [
      {
        cftc_contract_market_code: '088691',
        market_and_exchange_names: 'GOLD - COMEX',
        report_date_as_yyyy_mm_dd: '2026-09-22T00:00:00.000',
        noncomm_positions_long_all: '200000',
        noncomm_positions_short_all: '50000',
        open_interest_all: '500000',
      },
      {
        cftc_contract_market_code: '088691',
        market_and_exchange_names: 'GOLD - COMEX',
        report_date_as_yyyy_mm_dd: '2026-09-29T00:00:00.000',
        noncomm_positions_long_all: '220000',
        noncomm_positions_short_all: '45000',
        change_in_noncomm_long_all: '20000', // matches computed
        change_in_noncomm_short_all: '-5000', // matches computed
        open_interest_all: '520000',
      },
      {
        cftc_contract_market_code: '088691',
        market_and_exchange_names: 'GOLD - COMEX',
        report_date_as_yyyy_mm_dd: '2026-10-06T00:00:00.000',
        noncomm_positions_long_all: '210000',
        noncomm_positions_short_all: '60000',
        change_in_noncomm_long_all: '99999', // deliberately wrong reported value
        change_in_noncomm_short_all: '-99999',
        open_interest_all: '510000',
      },
    ];

    const processed = processCotHistory(history);
    assert(processed.length === 3, 'All 3 consecutive weeks processed');
    // Week 2 check
    assert(processed[1].changeNonCommLong === 20000, 'Week 2 computed change long is +20,000');
    assert(processed[1].changeNonCommShort === -5000, 'Week 2 computed change short is -5,000');
    assert(processed[1].changeNonCommNet === 25000, 'Week 2 computed change in Net is +25,000');
    // Week 3 discrepancy check
    assert(processed[2].changeNonCommLong === -10000, 'Week 3 uses computed value -10,000 instead of wrong reported 99,999');
    assert(processed[2].hasDiscrepancy === true, 'Discrepancy flag was set on mismatch');
  }

  console.log('\n--- [3] COT INDEX ("SMART MONEY METER") TESTS ---');
  {
    // Normal case
    const historyNets = [10000, 20000, 30000, 40000];
    const currentNet = 50000;
    const res = calculateCotIndex(currentNet, historyNets);
    assert(res.status === 'VALID', 'Index calculation status is VALID');
    assert(res.index === 100, `Index at max is 100 (got ${res.index})`);
    assert(res.zone === 'EXTREME_LONG', 'Zone is EXTREME_LONG');

    // Min case
    const resMin = calculateCotIndex(10000, historyNets);
    assert(resMin.index === 0, `Index at min is 0 (got ${resMin.index})`);
    assert(resMin.zone === 'EXTREME_SHORT', 'Zone is EXTREME_SHORT');

    // Mid case
    const resMid = calculateCotIndex(25000, [10000, 40000]);
    assert(resMid.index === 50, `Midpoint index is 50 (got ${resMid.index})`);
    assert(resMid.zone === 'NEUTRAL', 'Zone is NEUTRAL');

    // Edge case: Negative nets (Short positioning dominant)
    const negativeNets = [-80000, -60000, -40000];
    const currentNeg = -50000;
    const resNeg = calculateCotIndex(currentNeg, negativeNets);
    // min = -80000, max = -40000, current = -50000 -> (-50000 - -80000) / (-40000 - -80000) = 30000 / 40000 = 75%
    assert(resNeg.status === 'VALID', 'Negative nets calculate validly');
    assert(resNeg.index === 75, `Index with negative nets is 75 (got ${resNeg.index})`);

    // Edge case: Flat range (max === min)
    const flatNets = [5000, 5000, 5000];
    const resFlat = calculateCotIndex(5000, flatNets);
    assert(resFlat.status === 'FLAT_RANGE', 'Flat range detected (status FLAT_RANGE)');
    assert(resFlat.index === null, 'Index is null on flat range');

    // Edge case: Short history (e.g. 1-2 points)
    const shortNets = [1000];
    const resShort = calculateCotIndex(2000, shortNets);
    assert(resShort.status === 'VALID', 'Calculates validly with small history');
    assert(resShort.index === 100, 'Calculates correct index for small history');
  }

  console.log('\n--- [4] FRIDAY 3:30 PM ET RELEASE & DST HANDLING TESTS ---');
  {
    // Test in EDT (summer/fall, UTC-4) - e.g. July 2026
    const summerDate = new Date('2026-07-10T19:30:00Z'); // Friday 15:30 EDT = 19:30 UTC
    const summerNy = getNewYorkParts(summerDate);
    assert(summerNy.dayOfWeek === 5, 'EDT correctly identified Friday');
    assert(summerNy.hour === 15 && summerNy.minute === 30, `EDT hour is 15:30 (got ${summerNy.hour}:${summerNy.minute})`);

    // Test in EST (winter, UTC-5) - e.g. January 2026
    const winterDate = new Date('2026-01-16T20:30:00Z'); // Friday 15:30 EST = 20:30 UTC
    const winterNy = getNewYorkParts(winterDate);
    assert(winterNy.dayOfWeek === 5, 'EST correctly identified Friday');
    assert(winterNy.hour === 15 && winterNy.minute === 30, `EST hour is 15:30 (got ${winterNy.hour}:${winterNy.minute})`);
  }

  console.log('\n--- [5] RELEASE-DUE DETECTION TESTS ---');
  {
    // If latest report date is 2026-10-06 and current date is Friday morning 2026-10-09 10:00 AM ET:
    // Report is NOT due yet because it is before 15:30 ET
    const fridayMorning = new Date('2026-10-09T14:00:00Z'); // 10:00 AM EDT
    const notDueYet = isCotReportDue('2026-10-06', fridayMorning);
    assert(notDueYet === false, 'Report is NOT due Friday morning before 15:30 ET');

    // If latest report date is 2026-10-06 and current date is Friday evening 2026-10-09 16:00 ET:
    // Report is DUE because positions as of Tuesday 2026-10-06 should have been released at 15:30 ET
    const fridayEvening = new Date('2026-10-09T20:00:00Z'); // 16:00 EDT
    // Tuesday 2026-10-06 is the most recent Tuesday on 2026-10-09.
    // If our latest date stored is older (e.g. 2026-09-29), then it is due!
    const isDueWhenOutdated = isCotReportDue('2026-09-29', fridayEvening);
    assert(isDueWhenOutdated === true, 'Report is DUE when latest stored date is older than latest Tuesday');

    // Once latest stored date equals or exceeds the most recent Tuesday, it is no longer due
    const upToDate = isCotReportDue('2026-10-06', fridayEvening);
    assert(upToDate === false, 'Report is NOT due once data as of Tuesday is present');
  }

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
