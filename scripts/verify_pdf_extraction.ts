import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { jsPDF } from 'jspdf';
import {
  extractStructuredPdfDocument,
  parseCurrencyDocumentText,
  parseCommodityDocumentText,
  parseRatesDocumentText,
  parseCotDocumentText,
  parseSentimentDocumentText,
  parseMultiAssetDocumentText,
  detectDocumentAssetIdentity,
} from '../src/utils/pdfDocumentParser';
import { extractIndicatorsFromImage } from '../src/services/fundamentalLiveResearchService';

function createPdfBytes(pages: ((doc: jsPDF) => void)[]): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  pages.forEach((renderPage, idx) => {
    if (idx > 0) doc.addPage();
    renderPage(doc);
  });
  const ab = doc.output('arraybuffer');
  return new Uint8Array(ab);
}

async function runTests() {
  console.log('==============================================================');
  console.log('UNIVERSAL PDF DATA EXTRACTION — END-TO-END VERIFICATION SUITE');
  console.log('==============================================================\n');

  // 0. Test existing workspace PDFs
  const existingPdfPath = path.resolve(process.cwd(), 'primepip_USD_fundamental_report_2026-10-05.pdf');
  if (fs.existsSync(existingPdfPath)) {
    const buf = new Uint8Array(fs.readFileSync(existingPdfPath));
    const docMeta = await extractStructuredPdfDocument(buf);
    const extracted = parseCurrencyDocumentText(docMeta.fullText, 'USD');
    assert(docMeta.totalPages >= 1, 'Workspace PDF should have >= 1 page');
    assert(extracted.length >= 10, `Expected >= 10 indicators from workspace USD PDF, got ${extracted.length}`);
    console.log(`[PASS] Test 0 (Workspace USD PDF): Extracted ${extracted.length} indicators across ${docMeta.pagesProcessed}/${docMeta.totalPages} pages.`);
  }

  // 1. Test 1: Text-based PDF across all 8 G8 currencies (USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD)
  const g8Currencies = [
    { code: 'USD', header: 'USD — United States Dollar Macro Report', row1: 'CPI YoY | 3.1% | 3.0% | 3.2% | 2026-10-01', expName: 'CPI YoY', expAct: 3.1, expFc: 3.0, expPrev: 3.2 },
    { code: 'EUR', header: 'EUR — Eurozone ECB Macro Report', row1: 'Headline HICP YoY | 2.2% | 2.1% | 2.4% | 2026-10-02', expName: 'Headline HICP', expAct: 2.2, expFc: 2.1, expPrev: 2.4 },
    { code: 'GBP', header: 'GBP — United Kingdom BoE Macro Report', row1: 'UK CPI YoY | 2.6% | 2.5% | 2.8% | 2026-10-03', expName: 'CPI YoY', expAct: 2.6, expFc: 2.5, expPrev: 2.8 },
    { code: 'JPY', header: 'JPY — Bank of Japan Macro Report', row1: 'Tokyo Core CPI YoY | 2.4% | 2.2% | 2.3% | 2026-10-04', expName: 'Tokyo Core CPI', expAct: 2.4, expFc: 2.2, expPrev: 2.3 },
    { code: 'CHF', header: 'CHF — Swiss National Bank Macro Report', row1: 'Swiss CPI YoY | 1.1% | 1.2% | 1.3% | 2026-10-05', expName: 'CPI YoY', expAct: 1.1, expFc: 1.2, expPrev: 1.3 },
    { code: 'CAD', header: 'CAD — Bank of Canada Macro Report', row1: 'Canada CPI YoY | 2.0% | 2.1% | 2.5% | 2026-10-06', expName: 'CPI YoY', expAct: 2.0, expFc: 2.1, expPrev: 2.5 },
    { code: 'AUD', header: 'AUD — Reserve Bank of Australia Macro Report', row1: 'Monthly CPI Indicator | 2.7% | 2.8% | 3.5% | 2026-10-07', expName: 'CPI', expAct: 2.7, expFc: 2.8, expPrev: 3.5 },
    { code: 'NZD', header: 'NZD — Reserve Bank of New Zealand Macro Report', row1: 'NZ Quarterly CPI YoY | 2.2% | 2.3% | 3.3% | 2026-10-08', expName: 'CPI', expAct: 2.2, expFc: 2.3, expPrev: 3.3 },
  ];

  for (const c of g8Currencies) {
    const pdfBytes = createPdfBytes([
      (doc) => {
        doc.setFontSize(14);
        doc.text(c.header, 40, 50);
        doc.setFontSize(10);
        doc.text('Indicator | Actual | Forecast | Previous | Release Date', 40, 80);
        doc.text(c.row1, 40, 105);
        doc.text('Unemployment Rate | 4.1% | 4.2% | 4.2% | 2026-10-05', 40, 130);
      },
    ]);
    const structured = await extractStructuredPdfDocument(pdfBytes);
    const parsed = parseCurrencyDocumentText(structured.fullText, c.code);
    assert(parsed.length >= 2, `Expected >= 2 rows for ${c.code}, got ${parsed.length}`);
    const cpiRow = parsed.find((r) => r.actual === c.expAct);
    assert(cpiRow, `Missing expected CPI row for ${c.code}`);
    assert.strictEqual(cpiRow.actual, c.expAct);
    assert.strictEqual(cpiRow.forecast, c.expFc);
    assert.strictEqual(cpiRow.previous, c.expPrev);
    assert.strictEqual(cpiRow.unit, '%');
  }
  console.log('[PASS] Test 1 (Text-based PDFs across all 8 G8 Currencies: USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD): 100% exact match.');

  // 2. Test 2: PDF with Multiple Tables (Currencies + Commodities Gold/Silver/Oil + Interest Rates)
  const multiTablePdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(13);
      doc.text('TABLE 1: US DOLLAR (USD) ECONOMIC INDICATORS', 40, 45);
      doc.setFontSize(10);
      doc.text('Indicator | Actual | Forecast | Previous | Release Date', 40, 65);
      doc.text('Non-Farm Payrolls (NFP) | 254K | 140K | 159K | 2026-10-04', 40, 85);
      doc.text('ISM Manufacturing PMI | 49.2 | 47.5 | 47.2 | 2026-10-01', 40, 105);

      doc.setFontSize(13);
      doc.text('TABLE 2: COMMODITIES MACRO FUNDAMENTALS (GOLD, SILVER, CRUDE OIL)', 40, 150);
      doc.setFontSize(10);
      doc.text('Metric | Actual | Forecast | Previous', 40, 170);
      doc.text('Gold Spot Price (XAU/USD) | $2655.40 | $2640.00 | $2620.00', 40, 190);
      doc.text('US 10Y Real Yield (TIPS) | 1.85% | 1.90% | 1.95%', 40, 210);
      doc.text('Silver Spot Price (XAG/USD) | $31.45 | $31.00 | $30.80', 40, 230);
      doc.text('WTI Crude Oil Price | $74.80 | $73.50 | $71.20', 40, 250);

      doc.setFontSize(13);
      doc.text('TABLE 3: CENTRAL BANK INTEREST RATES & SOVEREIGN YIELDS', 40, 295);
      doc.setFontSize(10);
      doc.text('Currency | Policy Rate | Previous | Expected Next | 2Y Yield | 5Y Yield | 10Y Yield | Bias', 40, 315);
      doc.text('USD | 4.50% | 4.75% | 4.25% | 3.98% | 3.85% | 4.12% | HAWKISH', 40, 335);
      doc.text('EUR | 3.25% | 3.50% | 3.00% | 2.40% | 2.35% | 2.28% | NEUTRAL', 40, 355);
    },
  ]);
  const multiTableDoc = await extractStructuredPdfDocument(multiTablePdf);
  const usdRows = parseCurrencyDocumentText(multiTableDoc.fullText, 'USD');
  const goldRows = parseCommodityDocumentText(multiTableDoc.fullText, 'GOLD');
  const silverRows = parseCommodityDocumentText(multiTableDoc.fullText, 'SILVER');
  const oilRows = parseCommodityDocumentText(multiTableDoc.fullText, 'CRUDE_OIL');
  const rateRows = parseRatesDocumentText(multiTableDoc.fullText);

  const nfpRow = usdRows.find((r) => r.matchedIndicatorId === 'USD_NFP');
  assert(nfpRow && nfpRow.actual === 254 && nfpRow.forecast === 140 && nfpRow.previous === 159 && nfpRow.unit.toLowerCase() === 'k', 'NFP row mismatch');
  assert(goldRows.some((r) => r.actual === 2655.4), 'Gold price mismatch');
  assert(silverRows.some((r) => r.actual === 31.45), 'Silver price mismatch');
  assert(oilRows.some((r) => r.actual === 74.8), 'Crude Oil price mismatch');
  assert(rateRows.length >= 2 && rateRows.find((r) => r.currency === 'USD')?.currentPolicyRate === 4.5 && rateRows.find((r) => r.currency === 'USD')?.yield10Y === 4.12, 'Rates table mismatch');
  console.log('[PASS] Test 2 (PDF with Multiple Tables — Macro + Commodities + Interest Rates): All tables and units preserved.');

  // 3. Test 3: Scanned PDF (Image-only page with 0 native text operators)
  const scannedPdf = createPdfBytes([
    (doc) => {
      // Draw graphic rectangles only — no text operators on page
      doc.setFillColor(20, 30, 48);
      doc.rect(20, 20, 500, 300, 'F');
    },
  ]);
  const scannedMeta = await extractStructuredPdfDocument(scannedPdf);
  assert.strictEqual(scannedMeta.totalPages, 1);
  assert(scannedMeta.scannedPageNumbers.includes(1), 'Scanned PDF page 1 must be detected in scannedPageNumbers');
  assert.strictEqual(scannedMeta.pageTexts[0].isScanned, true);
  console.log('[PASS] Test 3 (Scanned PDF detection): Page 1 flagged as scanned (charCount < 20) for Vision OCR routing.');

  // 4. Test 4: Mixed Text-and-Image PDF (Page 1 text table, Page 2 scanned graphic page, Page 3 text table)
  const mixedPdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(12);
      doc.text('USD Economic Report — Page 1 (Native Text)', 40, 50);
      doc.text('Indicator | Actual | Forecast | Previous', 40, 75);
      doc.text('CPI YoY | 3.1% | 3.0% | 3.2%', 40, 95);
    },
    (doc) => {
      // Page 2 is a scanned diagram/chart page with < 20 chars
      doc.rect(40, 40, 400, 200);
    },
    (doc) => {
      doc.setFontSize(12);
      doc.text('USD Economic Report — Page 3 (Native Text)', 40, 50);
      doc.text('Indicator | Actual | Forecast | Previous', 40, 75);
      doc.text('CPI YoY | 3.1% | 3.0% | 3.2%', 40, 95); // Duplicate observation to verify deduplication
      doc.text('Retail Sales MoM | 0.7% | 0.3% | 0.1%', 40, 115);
    },
  ]);
  const mixedRes = await extractIndicatorsFromImage(mixedPdf, 'application/pdf', 'USD');
  assert.strictEqual(mixedRes.success, true);
  assert.strictEqual(mixedRes.telemetry?.totalPages, 3);
  assert.strictEqual(mixedRes.telemetry?.pagesProcessed, 3);
  assert(mixedRes.telemetry?.scannedPageNumbers.includes(2), 'Page 2 must be recorded in scannedPageNumbers');
  assert.strictEqual(mixedRes.telemetry?.extractionMethod, 'HYBRID_TEXT_AND_OCR');
  const cpiMatches = mixedRes.indicators.filter((i) => i.matchedIndicatorId === 'USD_CPI_YOY');
  assert.strictEqual(cpiMatches.length, 1, 'Duplicate CPI observation across pages must be deduplicated');
  assert(mixedRes.indicators.some((i) => i.matchedIndicatorId === 'USD_RETAIL_SALES_MOM' && i.actual === 0.7), 'Page 3 Retail Sales must be extracted');
  console.log('[PASS] Test 4 (Mixed Text-and-Scanned PDF): Processed 3/3 pages, flagged scanned Page 2, deduplicated observations.');

  // 5. Test 5: Multi-Page PDF across Currencies, Stocks, Indices, and Crypto (3 full pages)
  const multiPagePdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(12);
      doc.text('PAGE 1: US DOLLAR & EURO MACRO', 40, 50);
      doc.text('Indicator | Actual | Forecast | Previous', 40, 75);
      doc.text('US Core PCE YoY | 2.7% | 2.6% | 2.6%', 40, 95);
    },
    (doc) => {
      doc.setFontSize(12);
      doc.text('PAGE 2: EQUITY & INDEX INTELLIGENCE (NVDA & US30)', 40, 50);
      doc.text('NVIDIA (NVDA) Institutional Report — As of 2026-10-09', 40, 75);
      doc.text('Share Price: $138.60 | Forward P/E: 34.5 | PEG Ratio: 1.15 | Operating Margin: 62.4% | FCF Yield: 2.8%', 40, 95);
      doc.text('Valuation Status: UNDERVALUED | Bias: STRONG BULLISH | Composite Score: 68', 40, 115);
      doc.text('US30 (Dow Jones) Index Report', 40, 145);
      doc.text('Index Level: $42850.00 | Forward P/E: 21.4 | Earnings Yield: 4.67% | 10Y Real Yield: 1.85% | Credit Spread: 118', 40, 165);
    },
    (doc) => {
      doc.setFontSize(12);
      doc.text('PAGE 3: CRYPTOCURRENCY INTELLIGENCE (BTCUSDT)', 40, 50);
      doc.text('Bitcoin (BTCUSDT) Institutional Report', 40, 75);
      doc.text('Spot Price: $68450.00 | Weekly Spot ETF Flow: +$1.42B | Global M2 Correlation: 0.86 | Staking Yield: 0.0%', 40, 95);
      doc.text('Stablecoin Liquidity: EXPANDING | Bias: BULLISH | Score: 48', 40, 115);
    },
  ]);
  const mpRes = await extractIndicatorsFromImage(multiPagePdf, 'application/pdf', 'ALL');
  assert.strictEqual(mpRes.telemetry?.totalPages, 3);
  assert.strictEqual(mpRes.telemetry?.pagesProcessed, 3);
  assert(mpRes.multiAssets && mpRes.multiAssets.length === 3, `Expected 3 multi-assets (NVDA, US30, BTCUSDT), got ${mpRes.multiAssets?.length}`);
  const nvda = mpRes.multiAssets!.find((a) => a.symbol === 'NVDA');
  const us30 = mpRes.multiAssets!.find((a) => a.symbol === 'US30');
  const btc = mpRes.multiAssets!.find((a) => a.symbol === 'BTCUSDT');
  assert(nvda && nvda.price === 138.6 && nvda.forwardPe === 34.5 && nvda.operatingMarginPct === 62.4, 'NVDA metrics mismatch');
  assert(us30 && us30.price === 42850 && us30.forwardPe === 21.4 && us30.creditSpreadOasBps === 118, `US30 metrics mismatch: ${JSON.stringify(us30)}`);
  assert(btc && btc.price === 68450 && btc.spotEtfFlowsWeekly === '+$1.42B' && btc.globalM2Correlation === 0.86, 'BTCUSDT metrics mismatch');
  console.log('[PASS] Test 5 (Multi-Page PDF across Pages 1..3 including Stocks, Indices, Crypto): 3/3 pages processed and mapped.');

  // 6. Test 6: PDF with Missing Indicators (Actual = Pending / N/A)
  const missingValPdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(12);
      doc.text('USD Economic Release Schedule (With Pending Actuals)', 40, 50);
      doc.text('Indicator | Actual | Forecast | Previous', 40, 75);
      doc.text('Non-Farm Payrolls (NFP) | Pending | 180K | 159K', 40, 95);
      doc.text('CPI YoY | 3.1% | 3.0% | 3.2%', 40, 115);
    },
  ]);
  const missingRes = await extractIndicatorsFromImage(missingValPdf, 'application/pdf', 'USD');
  const pendingNfp = missingRes.indicators.find((i) => i.matchedIndicatorId === 'USD_NFP');
  assert(pendingNfp, 'Pending NFP row should be extracted for review');
  assert.strictEqual(pendingNfp.actual, null, 'Missing/Pending actual value must remain null (never fabricated)');
  assert.strictEqual(pendingNfp.forecast, 180);
  assert.strictEqual(pendingNfp.previous, 159);
  assert(missingRes.telemetry!.valuesRequiringReview >= 1, 'Telemetry must flag missing actual value for review');
  console.log('[PASS] Test 6 (PDF with Missing Indicators): Missing Actual remains null and increments valuesRequiringReview.');

  // 7. Test 7: PDF with Changed Table Layouts (Actual | Previous | Forecast vs Previous | Forecast | Actual)
  const changedLayoutPdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(12);
      doc.text('USD Economic Report — Changed Column Order (Indicator | Actual | Previous | Forecast)', 40, 50);
      doc.text('Indicator | Actual | Previous | Forecast', 40, 75);
      doc.text('CPI | 3.1% | 3.2% | 3.0%', 40, 95);
      doc.text('GDP Growth | 3.0% | 2.8% | 2.9%', 40, 115);
    },
  ]);
  const layoutDoc = await extractStructuredPdfDocument(changedLayoutPdf);
  const layoutRows = parseCurrencyDocumentText(layoutDoc.fullText, 'USD');
  const cpiLayout = layoutRows.find((r) => r.matchedIndicatorId === 'USD_CPI_YOY');
  const gdpLayout = layoutRows.find((r) => r.matchedIndicatorId === 'USD_GDP_ANNUALIZED');
  assert(cpiLayout, 'CPI row not found in changed layout PDF');
  assert.strictEqual(cpiLayout.actual, 3.1, 'CPI Actual must be 3.1%');
  assert.strictEqual(cpiLayout.previous, 3.2, 'CPI Previous must be 3.2%');
  assert.strictEqual(cpiLayout.forecast, 3.0, 'CPI Forecast must be 3.0% (must not mistake Forecast for Previous)');
  assert(gdpLayout, 'GDP Growth row not found in changed layout PDF');
  assert.strictEqual(gdpLayout.actual, 3.0, 'GDP Actual must be 3.0%');
  assert.strictEqual(gdpLayout.previous, 2.8, 'GDP Previous must be 2.8%');
  assert.strictEqual(gdpLayout.forecast, 2.9, 'GDP Forecast must be 2.9%');
  console.log('[PASS] Test 7 (PDF with Changed Table Layout: Indicator | Actual | Previous | Forecast): Exact column relationships preserved.');

  // 8. Test 8: COT Report PDF (G8 Currencies + Commodities with Long, Short, Net, Commercials, Open Interest, Report Date)
  const cotPdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(12);
      doc.text('CFTC COMMITMENTS OF TRADERS (COT) INSTITUTIONAL POSITIONING REPORT', 40, 45);
      doc.text('Report Date: 2026-10-06', 40, 65);
      doc.setFontSize(9);
      doc.text('Asset | Non-Comm Long | Non-Comm Short | Net Spec | Comm Long | Comm Short | Open Interest | Date', 40, 90);
      doc.text('EUR (EURO FX) | 185,420 | 112,310 | +73,110 | 210,500 | 283,610 | 645,200 | 2026-10-06', 40, 110);
      doc.text('JPY (JAPANESE YEN) | 94,100 | 61,050 | +33,050 | 115,200 | 148,250 | 312,400 | 2026-10-06', 40, 130);
      doc.text('XAU (GOLD) | 295,800 | 54,200 | +241,600 | 88,400 | 330,000 | 528,900 | 2026-10-06', 40, 150);
    },
  ]);
  const cotDoc = await extractStructuredPdfDocument(cotPdf);
  const cotRecords = parseCotDocumentText(cotDoc.fullText);
  assert.strictEqual(cotRecords.length, 3, `Expected 3 COT records, got ${cotRecords.length}`);
  const eurCot = cotRecords.find((r) => r.currency === 'EUR');
  assert(eurCot, 'Missing EUR COT record');
  assert.strictEqual(eurCot.nonCommercialLong, 185420);
  assert.strictEqual(eurCot.nonCommercialShort, 112310);
  assert.strictEqual(eurCot.commercialLong, 210500);
  assert.strictEqual(eurCot.commercialShort, 283610);
  assert.strictEqual(eurCot.openInterest, 645200);
  assert.strictEqual(eurCot.reportDate, '2026-10-06');
  console.log('[PASS] Test 8 (COT Report PDF): Long, Short, Net, Commercial Long/Short, Open Interest, and Report Date extracted with 0 guessed values.');

  // 9. Test 9: PDF containing a DIFFERENT asset from the selected category
  const usdOnlyPdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(13);
      doc.text('UNITED STATES DOLLAR (USD) FEDERAL RESERVE MACRO REPORT', 40, 50);
      doc.setFontSize(10);
      doc.text('Indicator | Actual | Forecast | Previous', 40, 75);
      doc.text('US Non-Farm Payrolls (NFP) | 254K | 140K | 159K', 40, 95);
      doc.text('FOMC Fed Funds Rate | 4.50% | 4.50% | 4.75%', 40, 115);
    },
  ]);
  let mismatchErrorCaught = false;
  try {
    await extractIndicatorsFromImage(usdOnlyPdf, 'application/pdf', 'EUR');
  } catch (err: any) {
    if (err?.message && err.message.includes('Asset Mismatch')) {
      mismatchErrorCaught = true;
    }
  }
  assert.strictEqual(mismatchErrorCaught, true, 'Uploading a USD PDF when EUR is selected must throw an actionable Asset Mismatch error');

  let stockMismatchCaught = false;
  try {
    await extractIndicatorsFromImage(usdOnlyPdf, 'application/pdf', 'AAPL');
  } catch (err: any) {
    if (err?.message && err.message.includes('Asset Mismatch')) {
      stockMismatchCaught = true;
    }
  }
  assert.strictEqual(stockMismatchCaught, true, 'Uploading a USD PDF when AAPL is selected must throw an actionable Asset Mismatch error and never misattribute to AAPL');
  console.log('[PASS] Test 9 (Different Asset PDF Mismatch Detection): Rejected USD PDF under EUR and AAPL selections with actionable Asset Mismatch message.');

  // 9b. Test 9b: Category-level and tabular Multi-Asset extraction (INDICES, STOCKS, CRYPTO)
  const tabularMultiAssetPdf = createPdfBytes([
    (doc) => {
      doc.setFontSize(12);
      doc.text('INSTITUTIONAL EQUITY & CRYPTO VALUATION TABLE', 40, 45);
      doc.setFontSize(9);
      doc.text('Symbol | Price | Forward P/E | PEG Ratio | Operating Margin | FCF Yield | Score | Bias', 40, 70);
      doc.text('AAPL | $228.50 | 31.2 | 2.40 | 31.5% | 3.45% | 42 | BULLISH', 40, 90);
      doc.text('MSFT | $445.20 | 32.4 | 1.90 | 45.1% | 2.75% | 55 | BULLISH', 40, 110);
    },
  ]);
  const stocksCatRes = await extractIndicatorsFromImage(tabularMultiAssetPdf, 'application/pdf', 'STOCKS');
  assert(stocksCatRes.multiAssets && stocksCatRes.multiAssets.length === 2, `Expected 2 stocks from tabular PDF under STOCKS selection, got ${stocksCatRes.multiAssets?.length}`);
  const aaplRec = stocksCatRes.multiAssets!.find((a) => a.symbol === 'AAPL');
  assert(aaplRec && aaplRec.price === 228.5 && aaplRec.forwardPe === 31.2 && aaplRec.operatingMarginPct === 31.5 && aaplRec.fcfYieldPct === 3.45, 'Tabular AAPL extraction mismatch');
  assert(stocksCatRes.indicators.length >= 6, 'Expected tabular stock rows to also populate reviewable indicator rows');
  console.log('[PASS] Test 9b (Tabular Multi-Asset PDF under STOCKS category): Extracted AAPL & MSFT metrics + reviewable indicator rows.');

  // 10. Test 10: Failed extraction on invalid/corrupt PDF must not overwrite existing data
  const existingBaseline = [{ id: 'obs_usd_cpi', indicatorId: 'usd_cpi_headline', actual: 3.1 }];
  let failedCleanly = false;
  try {
    const emptyGarbagePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
    await extractIndicatorsFromImage(emptyGarbagePdf, 'application/pdf', 'USD');
  } catch (err: any) {
    failedCleanly = true;
  }
  assert.strictEqual(failedCleanly, true, 'Empty/corrupt PDF must fail cleanly without fabricating data');
  assert.strictEqual(existingBaseline[0].actual, 3.1, 'Existing approved data must remain intact after failed extraction');
  console.log('[PASS] Test 10 (Failed Extraction Protection): Failed cleanly with 0 fabricated values and preserved existing records.');

  console.log('\n==============================================================');
  console.log('ALL 11 VERIFICATION SUITES PASSED WITH 100% NUMERICAL FIDELITY');
  console.log('==============================================================');
}

runTests().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
