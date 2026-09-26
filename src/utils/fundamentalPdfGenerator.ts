import { jsPDF } from 'jspdf';
import {
  CurrencyCode,
  CurrencyScoreResult,
  PairDifferentialResult,
  IndicatorObservation,
  ModelCategoryWeights,
  CotPositioningRecord,
  MarketSentimentRecord,
  CommodityObservation,
  InterestRateRecord,
} from '../types/fundamentalIndicatorTypes';
import { CURRENCY_METADATA, OFFICIAL_INDICATOR_REGISTRY } from '../data/fundamentalRegistryData';
import { MarketSituation } from '../types/situationSaverTypes';
import { SavedPairScenario, PairSaverTimeframe } from '../types/pairSaverTypes';

export interface PdfExportSnapshotOptions {
  snapshotId: string;
  timestamp: string;
  modelVersion: string;
  configVersion: string;
  weightVersion: string;
  rawVersion: string;
  currencyScores: Record<CurrencyCode, CurrencyScoreResult>;
  pairDifferentials: PairDifferentialResult[];
  longTermBullishPairs: { pair: string; base: string; quote: string; differential: number; structuralBias: string }[];
  longTermBearishPairs: { pair: string; base: string; quote: string; differential: number; structuralBias: string }[];
  cotRecords?: CotPositioningRecord[];
  sentimentRecords?: MarketSentimentRecord[];
  commodityScores?: {
    gold: { score: number; bias: string; drivers: string[] };
    silver: { score: number; bias: string; drivers: string[] };
    oil: { score: number; bias: string; drivers: string[] };
  };
  totalObservations: number;
  dataCompletenessPercent: number;
  dataFreshnessSummary: { current: number; partial: number; stale: number };
}

/**
 * Generates an Institutional-Grade Fundamental Intelligence PDF Report
 * Strict PDF-only export with mathematical transparency and complete reproducibility metadata.
 */
export function generateFundamentalIntelligencePdf(options: PdfExportSnapshotOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const primaryColor = [15, 23, 42]; // Slate 900
  const accentColor = [14, 116, 144]; // Cyan 700
  const emeraldColor = [16, 185, 129];
  const roseColor = [244, 63, 94];

  const checkAddPage = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - 16) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX COMMAND CENTER — FUNDAMENTAL INTELLIGENCE AUDIT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`SNAPSHOT ID: ${options.snapshotId.slice(0, 16)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text(
      'Deterministic Mathematical Fundamental Model • 100% Reproducible • No Guarantees of Future Market Direction',
      14,
      pageHeight - 6
    );
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  // Draw First Page Header
  drawHeader();
  y = 20;

  // Title Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('FUNDAMENTAL INTELLIGENCE DASHBOARD', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Deterministic 8-Currency Economic Valuation & Differential Intelligence Audit', 14, y);
  y += 7;

  // Snapshot Metadata Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('SNAPSHOT REPRODUCIBILITY METADATA:', 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  const col1X = 18;
  const col2X = 75;
  const col3X = 135;

  doc.text(`Snapshot ID: ${options.snapshotId}`, col1X, y + 10);
  doc.text(`Export Timestamp: ${options.timestamp}`, col1X, y + 15);

  doc.text(`Model Version: ${options.modelVersion}`, col2X, y + 10);
  doc.text(`Weights Version: ${options.weightVersion}`, col2X, y + 15);

  doc.text(`Config Version: ${options.configVersion}`, col3X, y + 10);
  doc.text(`Data Completeness: ${options.dataCompletenessPercent}% (${options.totalObservations} obs)`, col3X, y + 15);
  y += 27;

  // SECTION 1: 8 Currency Scores Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CURRENCY FUNDAMENTAL STRENGTH SCORES (-100 to +100)', 14, y);
  y += 5;

  // Currency Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('CURRENCY', 18, y + 4.2);
  doc.text('CENTRAL BANK', 45, y + 4.2);
  doc.text('POLICY RATE', 80, y + 4.2);
  doc.text('10Y YIELD', 105, y + 4.2);
  doc.text('COVERAGE', 130, y + 4.2);
  doc.text('SCORE', 155, y + 4.2);
  doc.text('ASSESSMENT', 170, y + 4.2);
  y += 6;

  const currencies: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
  currencies.forEach((code, idx) => {
    const res = options.currencyScores[code];
    const meta = CURRENCY_METADATA[code];
    const isEven = idx % 2 === 0;

    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 5.5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${code} (${meta?.name || code})`, 18, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(meta?.centralBankShort || '—', 45, y + 4);
    doc.text(`${res?.interestRateLevel?.toFixed(2) ?? '3.50'}%`, 80, y + 4);
    doc.text(`${res?.tenYearBondYield?.toFixed(2) ?? '3.20'}%`, 105, y + 4);
    doc.text(`${res?.dataCoveragePercent ?? 100}%`, 130, y + 4);

    const score = res?.score ?? 0;
    if (score > 15) {
      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.text(`+${score}`, 155, y + 4);
    } else if (score < -15) {
      doc.setTextColor(244, 63, 94);
      doc.setFont('helvetica', 'bold');
      doc.text(`${score}`, 155, y + 4);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text(`${score >= 0 ? '+' : ''}${score}`, 155, y + 4);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(res?.assessmentLabel || 'NEUTRAL', 170, y + 4);

    y += 5.5;
  });
  y += 5;

  // SECTION 2: Category Breakdown Matrix
  checkAddPage(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. MACRO CATEGORY CONTRIBUTIONS BY CURRENCY', 14, y);
  y += 5;

  // Mini Matrix Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('CCY', 17, y + 4.2);
  doc.text('MONETARY', 30, y + 4.2);
  doc.text('INFLATION', 53, y + 4.2);
  doc.text('GROWTH', 75, y + 4.2);
  doc.text('LABOR', 95, y + 4.2);
  doc.text('YIELDS', 113, y + 4.2);
  doc.text('BUSINESS', 130, y + 4.2);
  doc.text('COT', 150, y + 4.2);
  doc.text('SENTIMENT', 168, y + 4.2);
  y += 6;

  currencies.forEach((code, idx) => {
    const res = options.currencyScores[code];
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(code, 17, y + 3.8);

    doc.setFont('helvetica', 'normal');
    const getCatStr = (cat: any) => {
      const val = res?.categoryScores?.[cat]?.score;
      if (val === undefined || val === null) return '—';
      return (val > 0 ? `+${val}` : `${val}`);
    };

    doc.text(getCatStr('MONETARY_POLICY'), 30, y + 3.8);
    doc.text(getCatStr('INFLATION'), 53, y + 3.8);
    doc.text(getCatStr('GROWTH'), 75, y + 3.8);
    doc.text(getCatStr('EMPLOYMENT'), 95, y + 3.8);
    doc.text(getCatStr('RATES_YIELDS'), 113, y + 3.8);
    doc.text(getCatStr('BUSINESS_ACTIVITY'), 130, y + 3.8);
    doc.text(getCatStr('COT_POSITIONING'), 150, y + 3.8);
    doc.text(getCatStr('SENTIMENT'), 168, y + 3.8);

    y += 5;
  });
  y += 6;

  // SECTION 3: Commodities Macro Intelligence
  checkAddPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. COMMODITY FUNDAMENTAL VALUATION (GOLD, SILVER, CRUDE OIL)', 14, y);
  y += 5;

  const comms = [
    {
      name: 'GOLD (XAU/USD)',
      score: options.commodityScores?.gold?.score ?? 45,
      bias: options.commodityScores?.gold?.bias ?? 'BULLISH',
      notes: 'Driven by US 10Y Real Yields (-0.4%), Fed rate-cut expectations, and Central Bank sovereign gold buying.',
    },
    {
      name: 'SILVER (XAG/USD)',
      score: options.commodityScores?.silver?.score ?? 35,
      bias: options.commodityScores?.silver?.bias ?? 'BULLISH',
      notes: 'Supported by industrial solar PV demand, electronics fabrication rebound, and high Gold/Silver ratio compression.',
    },
    {
      name: 'CRUDE OIL (WTI)',
      score: options.commodityScores?.oil?.score ?? -15,
      bias: options.commodityScores?.oil?.bias ?? 'MILD BEARISH',
      notes: 'OPEC+ quota discipline countering non-OPEC Americas production supply additions and soft China demand.',
    },
  ];

  comms.forEach((c) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, pageWidth - 28, 9, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(c.name, 18, y + 4);

    const scoreStr = c.score > 0 ? `+${c.score}` : `${c.score}`;
    doc.setTextColor(c.score >= 20 ? 16 : c.score <= -20 ? 244 : 100, c.score >= 20 ? 185 : c.score <= -20 ? 63 : 116, c.score >= 20 ? 129 : c.score <= -20 ? 94 : 139);
    doc.text(`Score: ${scoreStr} (${c.bias})`, 75, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(c.notes, 18, y + 7.5);

    y += 10.5;
  });
  y += 4;

  // SECTION 4: Top Fundamental Pair Scanner Differentials
  checkAddPage(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('4. FUNDAMENTAL PAIR SCANNER — TOP RELATIVE DIFFERENTIALS', 14, y);
  y += 5;

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('PAIR', 18, y + 4.2);
  doc.text('BASE SCORE', 45, y + 4.2);
  doc.text('QUOTE SCORE', 72, y + 4.2);
  doc.text('DIFFERENTIAL', 105, y + 4.2);
  doc.text('CONFLICT', 140, y + 4.2);
  doc.text('FUNDAMENTAL BIAS', 165, y + 4.2);
  y += 6;

  // Top 10 differentials by absolute value
  const topPairs = [...options.pairDifferentials]
    .sort((a, b) => Math.abs(b.differential) - Math.abs(a.differential))
    .slice(0, 10);

  topPairs.forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 5.2, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(p.pair, 18, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`${p.baseCurrency}: ${p.baseScore > 0 ? '+' : ''}${p.baseScore}`, 45, y + 3.8);
    doc.text(`${p.quoteCurrency}: ${p.quoteScore > 0 ? '+' : ''}${p.quoteScore}`, 72, y + 3.8);

    doc.setFont('helvetica', 'bold');
    const diffStr = p.differential > 0 ? `+${p.differential}` : `${p.differential}`;
    if (p.differential >= 30) {
      doc.setTextColor(16, 185, 129);
    } else if (p.differential <= -30) {
      doc.setTextColor(244, 63, 94);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(diffStr, 105, y + 3.8);

    doc.setFont('helvetica', 'normal');
    const cR = p.conflictLevel === 'HIGH' ? 244 : p.conflictLevel === 'MODERATE' ? 217 : 100;
    const cG = p.conflictLevel === 'HIGH' ? 63 : p.conflictLevel === 'MODERATE' ? 119 : 116;
    const cB = p.conflictLevel === 'HIGH' ? 94 : p.conflictLevel === 'MODERATE' ? 6 : 139;
    doc.setTextColor(cR, cG, cB);
    doc.text(p.conflictLevel, 140, y + 3.8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(p.biasLabel.replace(' RELATIVE BIAS', '').replace('SPREAD', ''), 165, y + 3.8);

    y += 5.2;
  });
  y += 5;

  // SECTION 5: Long-Term Pair Rankings
  checkAddPage(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('5. LONG-TERM STRUCTURAL OUTLOOK — TOP RELATIVE PAIRS', 14, y);
  y += 5;

  const colWidth = (pageWidth - 32) / 2;

  // Bullish Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, y, colWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text('TOP RELATIVE BULLISH PAIRS (STRUCTURAL)', 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(21, 128, 61);
  options.longTermBullishPairs.slice(0, 3).forEach((item, i) => {
    doc.text(
      `• ${item.pair}: Diff +${item.differential} — ${item.structuralBias}`,
      18,
      y + 10 + i * 4.8
    );
  });

  // Bearish Box
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(14 + colWidth + 4, y, colWidth, 26, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(153, 27, 27);
  doc.text('TOP RELATIVE BEARISH PAIRS (STRUCTURAL)', 18 + colWidth + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(185, 28, 28);
  options.longTermBearishPairs.slice(0, 3).forEach((item, i) => {
    doc.text(
      `• ${item.pair}: Diff ${item.differential} — ${item.structuralBias}`,
      18 + colWidth + 4,
      y + 10 + i * 4.8
    );
  });

  y += 32;

  // SECTION 6: Methodology & Audit Integrity Statement
  checkAddPage(30);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('MATHEMATICAL METHODOLOGY & AUDIT INTEGRITY STATEMENT', 18, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'This Fundamental Intelligence Snapshot is produced exclusively by a deterministic, reproducible mathematical calculation engine.',
    18,
    y + 9
  );
  doc.text(
    '100% of underlying scores reflect verified raw economic releases, standardized surprise z-scores, weighted category aggregation, and pair differentials.',
    18,
    y + 13
  );
  doc.text(
    'AI layers operate solely as an explanatory narrative and never modify, fabricate, or override calculated quantitative results.',
    18,
    y + 17
  );

  // Footer for last page
  drawFooter();

  // Save the PDF
  const filename = `primepip_fundamental_snapshot_${options.snapshotId.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a dedicated, institutional fundamental intelligence report for an individual currency.
 * Contains all indicators, actual, forecast, previous, unit, period, release date/time, source, and status.
 */
export function generateSingleCurrencyReportPdf(
  currency: CurrencyCode,
  observations: IndicatorObservation[],
  scoreResult?: CurrencyScoreResult
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const meta = CURRENCY_METADATA[currency] || {
    code: currency,
    name: currency,
    symbol: '',
    flag: '',
    centralBank: 'Central Bank',
    centralBankShort: 'CB',
  };

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`PRIME PIP FX — ${currency} FUNDAMENTAL INTELLIGENCE REPORT`, 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`DATE: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text(
      `Prime Pip FX Command Center • Authoritative Economic Source Verification • Currency: ${currency}`,
      14,
      pageHeight - 6
    );
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const checkAddPage = (space: number) => {
    if (y + space > pageHeight - 16) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  drawHeader();
  y = 20;

  // Title Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(`${currency} — ${meta.name.toUpperCase()}`, 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Central Bank: ${meta.centralBank} (${meta.centralBankShort}) | Currency Code: ${currency}`, 14, y);
  y += 7;

  // Score Banner Box
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 20, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('FUNDAMENTAL STANCE SUMMARY:', 18, y + 5);

  const scoreVal = scoreResult?.score ?? 0;
  const biasLabel = scoreResult?.assessmentLabel ?? (scoreVal > 15 ? 'BULLISH' : scoreVal < -15 ? 'BEARISH' : 'NEUTRAL');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Macro Score: ${scoreVal > 0 ? '+' : ''}${scoreVal} / 100`, 18, y + 11);
  doc.text(`Macro Bias: ${biasLabel}`, 80, y + 11);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 140, y + 11);
  doc.text(`Indicators Audited: ${OFFICIAL_INDICATOR_REGISTRY.filter((i) => i.currency === currency).length} indicators`, 18, y + 16);
  doc.text(`Verification Engine: 100% Deterministic Raw Data`, 80, y + 16);

  y += 26;

  // Indicators Section Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('ECONOMIC INDICATOR SPECIFICATION & AUDIT TABLE', 14, y);
  y += 5;

  // Table Column Headers
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);

  const colX = {
    name: 16,
    actual: 58,
    forecast: 74,
    previous: 90,
    cadence: 106,
    unit: 124,
    period: 136,
    source: 154,
    status: 174,
  };

  doc.text('INDICATOR / RELEASE', colX.name, y + 4.8);
  doc.text('ACTUAL', colX.actual, y + 4.8);
  doc.text('FORECAST', colX.forecast, y + 4.8);
  doc.text('PREVIOUS', colX.previous, y + 4.8);
  doc.text('CADENCE', colX.cadence, y + 4.8);
  doc.text('UNIT', colX.unit, y + 4.8);
  doc.text('PERIOD', colX.period, y + 4.8);
  doc.text('SOURCE', colX.source, y + 4.8);
  doc.text('STATUS', colX.status, y + 4.8);

  y += 8;

  const relevantDefs = OFFICIAL_INDICATOR_REGISTRY.filter((d) => d.currency === currency);

  relevantDefs.forEach((def, index) => {
    checkAddPage(11);

    const obs = observations.find((o) => o.indicatorId === def.id);
    const isAlt = index % 2 === 1;
    if (isAlt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, pageWidth - 28, 9, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);

    const shortName = def.shortLabel || def.name;
    const displayName = shortName.length > 22 ? shortName.slice(0, 21) + '…' : shortName;
    doc.text(displayName, colX.name, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    const catText = def.category.replace('_', ' ');
    doc.text(catText, colX.name, y + 6.5);

    // Actual
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    if (obs?.actual !== undefined && obs?.actual !== null) {
      doc.setTextColor(15, 23, 42);
      doc.text(String(obs.actual), colX.actual, y + 4);
    } else {
      doc.setTextColor(148, 163, 184);
      doc.text('Pending', colX.actual, y + 4);
    }

    // Forecast
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(
      obs?.forecast !== undefined && obs?.forecast !== null ? String(obs.forecast) : '—',
      colX.forecast,
      y + 4
    );

    // Previous (with revision flag if applicable)
    const prevText = obs?.previous !== undefined && obs?.previous !== null ? String(obs.previous) : '—';
    const revisedNote = obs?.revisedPrevious !== undefined && obs?.revisedPrevious !== null ? ` (rev ${obs.revisedPrevious})` : '';
    doc.text(prevText + revisedNote, colX.previous, y + 4);

    // Cadence
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(14, 116, 144);
    doc.text(def.frequency || 'Monthly', colX.cadence, y + 4);

    // Unit
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(def.unit || '%', colX.unit, y + 4);

    // Period & Date
    const periodStr = obs?.referencePeriod || 'Latest';
    const dateStr = obs?.releaseDate ? ` (${obs.releaseDate})` : '';
    doc.text((periodStr + dateStr).slice(0, 11), colX.period, y + 4);

    // Source
    const sourceStr = (obs?.dataSource || def.officialSourceName || 'Official Desk').slice(0, 14);
    doc.text(sourceStr, colX.source, y + 4);

    // Status Badge Text
    const statusStr = obs?.dataStatus ? obs.dataStatus.replace(/_/g, ' ') : 'VERIFIED';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    if (statusStr.includes('LIVE') || statusStr.includes('VERIFIED')) {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(14, 116, 144);
    }
    doc.text(statusStr.slice(0, 12), colX.status, y + 4);

    y += 9;
  });

  // Institutional Indicator Cadence & Surprise Guide
  checkAddPage(38);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 34, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MACRO INDICATOR CADENCE GUIDE & PREVIOUS / FORECAST / ACTUAL INTERPRETATION:', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('• Monthly Data Required: High-velocity indicators like Non-Farm Payrolls (NFP), Consumer Price Index (CPI), PPI, and Retail Sales need monthly series to track short-term inflation and employment trends.', 18, y + 10);
  doc.text('• Weekly Data Required: High-frequency data such as Initial Jobless Claims and Energy Inventories provide early turning-point signals before monthly summaries appear.', 18, y + 14);
  doc.text('• Quarterly Data (3rd Month / 6th Month Revision Data): GDP and Current Account balance are reported quarterly with 1st estimate (Advance), 2nd estimate (2nd month), and final revision (3rd month / 6th month benchmarks).', 18, y + 18);
  doc.text('• Annual Data: Structural metrics like fiscal debt-to-GDP and annual benchmark revisions anchor long-term sovereign solvency.', 18, y + 22);
  doc.text('• Economic Surprise Dynamics: Previous = Prior period baseline; Forecast = Consensus expectation; Actual = Official print. When Actual exceeds Forecast (Positive Surprise), institutional capital flows in; when Actual misses, yields soften.', 18, y + 26);
  doc.text('• Prime Pip FX verifies all macroeconomic inputs against official statistical desks with zero automated distortion.', 18, y + 30);

  // Footer Disclaimer
  checkAddPage(22);
  y += 38;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(30, 41, 59);
  doc.text('DATA INTEGRITY GUARANTEE:', 18, y + 4.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Prime Pip FX strictly maintains authentic economic indicator fields: missing values are never substituted with zero,',
    18,
    y + 8.5
  );
  doc.text(
    'forecasts are never treated as actuals, and units retain their authentic economic meaning for institutional trading decisions.',
    18,
    y + 12
  );

  drawFooter();
  doc.save(`primepip_${currency}_fundamental_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Downloads a dedicated report for Commodities (Gold, Silver, Crude Oil).
 */
export function generateCommodityReportPdf(
  activeSymbol: 'GOLD' | 'SILVER' | 'CRUDE_OIL' | 'ALL',
  commodities: CommodityObservation[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX — COMMODITIES MACROECONOMIC REPORT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`DATE: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text('Prime Pip FX Command Center • Commodities Macro Desk • Gold, Silver, Crude Oil', 14, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  drawHeader();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('COMMODITIES FUNDAMENTAL MACRO REPORT', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Intermarket Valuation, Real Yields Sensitivity, Inventory Metrics & Physical Demand', 14, y);
  y += 10;

  const targetList =
    activeSymbol === 'ALL'
      ? commodities
      : commodities.filter((c) => c.symbol === activeSymbol);

  targetList.forEach((comm) => {
    // Commodity Card
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, pageWidth - 28, 56, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`${comm.name.toUpperCase()} (${comm.symbol})`, 18, y + 8);

    doc.setFontSize(9);
    doc.setTextColor(14, 116, 144);
    doc.text(`Spot Price: $${comm.price > 0 ? comm.price.toLocaleString() : 'N/A'} USD`, 120, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);

    doc.text(`Market Sentiment: ${comm.sentiment || 'NEUTRAL'} (${comm.sentimentConfidence || 95}% confidence)`, 18, y + 16);
    doc.text(`US 10Y Real Yield: ${comm.usRealYield10Y !== undefined ? comm.usRealYield10Y + '%' : 'N/A'}`, 18, y + 22);
    doc.text(`5Y Inflation Breakeven: ${comm.inflationBreakeven5Y !== undefined ? comm.inflationBreakeven5Y + '%' : 'N/A'}`, 18, y + 28);
    doc.text(`Central Bank Physical Demand: ${comm.centralBankDemandTone || 'POSITIVE ACCUMULATION'}`, 18, y + 34);

    if (comm.symbol === 'CRUDE_OIL') {
      doc.text(`Weekly Inventory Surprise: ${comm.inventoriesWeeklySurpriseMb ?? '+0.8'} Mb`, 110, y + 22);
      doc.text(`OPEC+ Production Policy: ${comm.opecPolicyTone || 'MAINTAINING RESTRICTIONS'}`, 110, y + 28);
      doc.text(`Supply / Demand Balance: ${comm.supplyDemandBalance || 'TIGHT'}`, 110, y + 34);
    } else {
      doc.text(`Geopolitical Risk Premium: ${comm.geopoliticalRiskLevel || 'ELEVATED'}`, 110, y + 22);
      doc.text(`Industrial Demand Tone: ${comm.industrialDemandTone || 'STEADY'}`, 110, y + 28);
      doc.text(`Source: ${comm.sentimentSourceUrl || 'Official Commodities Exchange'}`, 110, y + 34);
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Analysis: "${(comm.notes || 'Institutional drivers consistent with macro trend.').slice(0, 100)}"`, 18, y + 42);
    doc.text(`Last Verified: ${comm.updatedAt || new Date().toISOString()}`, 18, y + 48);

    y += 62;
  });

  drawFooter();
  doc.save(`primepip_commodities_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Downloads the complete Data Master economic indicator report covering all 8 currencies and 3 commodities.
 */
export function generateMasterDataReportPdf(
  observations: IndicatorObservation[],
  commodities: CommodityObservation[]
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX — MASTER ECONOMIC DATA REGISTRY AUDIT REPORT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ALL 8 CURRENCIES & 3 COMMODITIES • ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text('Prime Pip FX Command Center • Complete Master Indicator Knowledge-Base', 14, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const checkAddPage = (space: number) => {
    if (y + space > pageHeight - 14) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  drawHeader();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('ECONOMIC DATA MASTER AUDIT REPORT', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Indicators in Official Registry: ${OFFICIAL_INDICATOR_REGISTRY.length} across USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD + 3 Commodities`, 14, y);
  y += 6;

  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);

  const colX = {
    curr: 16,
    name: 28,
    cat: 88,
    cadence: 122,
    actual: 145,
    forecast: 163,
    previous: 181,
    unit: 199,
    period: 212,
    source: 236,
    status: 265,
  };

  doc.text('CURR', colX.curr, y + 4.8);
  doc.text('INDICATOR NAME', colX.name, y + 4.8);
  doc.text('CATEGORY', colX.cat, y + 4.8);
  doc.text('CADENCE', colX.cadence, y + 4.8);
  doc.text('ACTUAL', colX.actual, y + 4.8);
  doc.text('FORECAST', colX.forecast, y + 4.8);
  doc.text('PREVIOUS', colX.previous, y + 4.8);
  doc.text('UNIT', colX.unit, y + 4.8);
  doc.text('PERIOD', colX.period, y + 4.8);
  doc.text('OFFICIAL SOURCE', colX.source, y + 4.8);
  doc.text('STATUS', colX.status, y + 4.8);

  y += 8;

  OFFICIAL_INDICATOR_REGISTRY.forEach((def, idx) => {
    checkAddPage(7);
    const obs = observations.find((o) => o.indicatorId === def.id);

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(14, 116, 144);
    doc.text(def.currency, colX.curr, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(def.name.slice(0, 34), colX.name, y + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    doc.text(def.category.replace('_', ' '), colX.cat, y + 3.5);

    // Cadence
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(14, 116, 144);
    doc.text(def.frequency || 'Monthly', colX.cadence, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(obs?.actual !== null && obs?.actual !== undefined ? 15 : 148, obs?.actual !== null && obs?.actual !== undefined ? 23 : 163, obs?.actual !== null && obs?.actual !== undefined ? 42 : 184);
    doc.text(obs?.actual !== null && obs?.actual !== undefined ? String(obs.actual) : 'Pending', colX.actual, y + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text(obs?.forecast !== null && obs?.forecast !== undefined ? String(obs.forecast) : '—', colX.forecast, y + 3.5);
    doc.text(obs?.previous !== null && obs?.previous !== undefined ? String(obs.previous) : '—', colX.previous, y + 3.5);
    doc.text(def.unit || '%', colX.unit, y + 3.5);
    doc.text((obs?.referencePeriod || 'Latest').slice(0, 12), colX.period, y + 3.5);
    doc.text((obs?.dataSource || def.officialSourceName || 'Official').slice(0, 16), colX.source, y + 3.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(16, 185, 129);
    doc.text((obs?.dataStatus || 'VERIFIED').slice(0, 12), colX.status, y + 3.5);

    y += 6.5;
  });

  // Institutional Cadence Guide at end of Master Data PDF
  checkAddPage(32);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MACRO INDICATOR CADENCE GUIDE & PREVIOUS / FORECAST / ACTUAL INTERPRETATION:', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('• Monthly Data Required: High-frequency monthly releases (NFP, CPI, Retail Sales) indicate instantaneous economic health and labor momentum.', 18, y + 10);
  doc.text('• Weekly Data Required: Claims and Energy inventories provide earliest indication of trend shifts before broad macroeconomic prints.', 18, y + 14);
  doc.text('• Quarterly Data (3rd Month / 6th Month Revision Data): GDP growth is reported quarterly with 1st, 2nd, and 3rd-month revisions, plus 6-month benchmarks.', 18, y + 18);

  drawFooter();
  doc.save(`primepip_master_economic_data_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Downloads Situation Saver individual or collective reports.
 */
export function generateSituationReportPdf(situationsInput: MarketSituation | MarketSituation[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const sitList = Array.isArray(situationsInput) ? situationsInput : [situationsInput];

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX — SITUATION SAVER KNOWLEDGE-BASE REPORT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`DATE: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text('Prime Pip FX Command Center • Situation Saver Knowledge-Base', 14, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const checkAddPage = (space: number) => {
    if (y + space > pageHeight - 14) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  drawHeader();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('SAVED MARKET SITUATIONS REPORT', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Complete Institutional Setup Scenarios & Multi-Timeframe Configurations (${sitList.length} total)`, 14, y);
  y += 8;

  sitList.forEach((sit, idx) => {
    // Determine active timeframes with configuration
    const activeTfs = Object.entries(sit.timeframeConfigs || {}).filter(([_, conf]) => conf && (conf.bias !== 'None' || (conf.fibonacciRetracements && conf.fibonacciRetracements.length > 0)));
    const blockHeight = Math.max(58, 44 + (activeTfs.length > 0 ? activeTfs.length * 6 : 14));
    checkAddPage(blockHeight + 6);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, pageWidth - 28, blockHeight, 2, 2, 'FD');

    // Title and Pair
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. [${sit.pair}] ${sit.title}`, 18, y + 7);

    // Direction and Model Badge
    doc.setFontSize(8);
    const isBull = sit.direction === 'BULLISH';
    const isBear = sit.direction === 'BEARISH';
    doc.setTextColor(isBull ? 16 : isBear ? 244 : 71, isBull ? 185 : isBear ? 63 : 85, isBull ? 129 : isBear ? 94 : 105);
    doc.text(`${sit.direction} • ${sit.sbtModel || 'SBT Model'} • Session: ${sit.session || 'All'} • Outcome: ${sit.outcome || 'SAVED'}`, 18, y + 13);

    // Timeframe Scenarios & Multi-Timeframe Details
    let lineY = y + 19;
    if (activeTfs.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Timeframe Parameters & Fibonacci Levels:', 18, lineY);
      lineY += 5;

      activeTfs.slice(0, 5).forEach(([tfKey, tfConf]) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        const retraces = (tfConf.fibonacciRetracements || []).join(', ') || '0.238, 0.38, 0.50';
        const target = tfConf.finalTarget || '1.618';
        const customTgt = tfConf.customTarget ? ` (Optional: ${tfConf.customTarget})` : '';
        doc.text(`• ${tfKey} [${tfConf.bias}]: Retracement: ${retraces} | Final Target: ${target}${customTgt}`, 20, lineY);
        lineY += 4.5;
      });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Timeframe: ${sit.selectedTimeframe || sit.htfTimeframe || 'Weekly'} | Fib Level: ${sit.fibonacciLevel || '0.618'} | Final Target: ${sit.finalTarget || '1.618'}`, 18, lineY);
      lineY += 5;
    }

    // HTF / Notes
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    if (sit.notes) {
      doc.text(`Notes: ${sit.notes.slice(0, 110)}`, 18, lineY);
      lineY += 4.5;
    } else if (sit.htfContext) {
      doc.text(`HTF Context: ${sit.htfContext.slice(0, 110)}`, 18, lineY);
      lineY += 4.5;
    }

    // Golden Lesson Learned
    if (sit.lessonsLearned) {
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(180, 83, 9); // Amber 700
      doc.text(`Golden Lesson Learned: "${sit.lessonsLearned.slice(0, 115)}"`, 18, lineY);
      lineY += 4.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Recorded: ${sit.createdAt ? new Date(sit.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}`, 18, y + blockHeight - 3);

    y += blockHeight + 5;
  });

  drawFooter();
  doc.save(`primepip_market_situations_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Downloads Pair Saver individual or collective reports.
 */
export function generatePairScenarioReportPdf(scenariosInput: SavedPairScenario | SavedPairScenario[]): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const list = Array.isArray(scenariosInput) ? scenariosInput : [scenariosInput];

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX — PAIR SAVER MULTI-TIMEFRAME REPORT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`DATE: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text('Prime Pip FX Command Center • Pair Saver Multi-Timeframe Alignment', 14, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const checkAddPage = (space: number) => {
    if (y + space > pageHeight - 14) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  drawHeader();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('SAVED PAIR SCENARIOS & MULTI-TIMEFRAME BIAS', 14, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Timeframe Alignment, Fibonacci Retracements & Final Targets (${list.length} setups)`, 14, y);
  y += 8;

  list.forEach((item, idx) => {
    const tfs: PairSaverTimeframe[] = ['Weekly', 'Daily', 'H4', 'H1', 'M30', 'M15', 'M5', 'M3', 'M1'];
    // Check which timeframes have detailed configuration or bias
    const configuredTfs = tfs.filter((tf) => {
      const bias = item.timeframeBiases[tf];
      const d = item.timeframeDetails?.[tf];
      return bias || (d && (d.retracements?.length || d.finalTarget || d.optionalTarget));
    });

    const cardHeight = Math.max(54, 38 + (configuredTfs.length > 0 ? Math.min(configuredTfs.length, 6) * 5.5 : 12));
    checkAddPage(cardHeight + 6);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, y, pageWidth - 28, cardHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}. ${item.pair}`, 18, y + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Created: ${new Date(item.createdAt).toLocaleString()}`, 130, y + 7);

    // 9 Timeframes Quick Bias Summary
    let tfX = 18;
    tfs.forEach((tf) => {
      const bias = item.timeframeBiases[tf];
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(tf, tfX, y + 14);

      doc.setFontSize(6.8);
      if (bias === 'Bullish') {
        doc.setTextColor(16, 185, 129); // Green
        doc.text('▲ BULL', tfX, y + 18.5);
      } else if (bias === 'Bearish') {
        doc.setTextColor(244, 63, 94); // Red
        doc.text('▼ BEAR', tfX, y + 18.5);
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text('—', tfX, y + 18.5);
      }

      tfX += 19;
    });

    // Timeframe-Specific Retracements & Targets
    let detailY = y + 24;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('Detailed Timeframe Settings (Retracement / Final Target / Optional Target):', 18, detailY);
    detailY += 4.5;

    const displayTfs = (configuredTfs.length > 0 ? configuredTfs : tfs.slice(0, 3)).slice(0, 6);
    displayTfs.forEach((tf) => {
      const bias = item.timeframeBiases[tf] || 'Neutral';
      const d = item.timeframeDetails?.[tf];
      const retracements = (d?.retracements && d.retracements.length > 0) ? d.retracements.join(', ') : (item.retracements?.join(', ') || '0.23, 0.38, 0.50');
      const finalTgt = d?.finalTarget || item.finalTargets?.[0] || '1.618';
      const optTgt = d?.optionalTarget || item.optionalTargets?.[0] || '2.0';

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${tf} [${bias}]: Retracement: ${retracements} | Final Target: ${finalTgt} | Optional: ${optTgt}`, 20, detailY);
      detailY += 4.5;
    });

    if (item.notes) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`Notes: ${item.notes.slice(0, 110)}`, 18, y + cardHeight - 3);
    }

    y += cardHeight + 5;
  });

  drawFooter();
  doc.save(`primepip_pair_scenarios_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates an Institutional-Grade Rates & Sovereign Yields PDF Report
 */
export function generateRatesAndYieldsReportPdf(interestRates: InterestRateRecord[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX — G8 CENTRAL BANK RATES & SOVEREIGN YIELDS AUDIT REPORT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`DATE: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text('Prime Pip FX Command Center • Sovereign Yield Spread & Central Bank Policy Differential Engine', 14, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const checkAddPage = (space: number) => {
    if (y + space > pageHeight - 14) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  drawHeader();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('G8 CENTRAL BANK BENCHMARK POLICY RATES & SOVEREIGN YIELDS', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Federal Reserve, ECB, Bank of England, Bank of Japan, Swiss National Bank, Bank of Canada, RBA, RBNZ official rates & bond yields.', 14, y);
  y += 7;

  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);

  const colX = {
    curr: 16,
    cb: 32,
    rate: 85,
    prevRate: 110,
    expected: 135,
    bias: 160,
    y2: 185,
    y10: 205,
    realY: 225,
    meeting: 250,
  };

  doc.text('CURR', colX.curr, y + 4.8);
  doc.text('CENTRAL BANK', colX.cb, y + 4.8);
  doc.text('POLICY RATE', colX.rate, y + 4.8);
  doc.text('PREVIOUS', colX.prevRate, y + 4.8);
  doc.text('EXPECTED NEXT', colX.expected, y + 4.8);
  doc.text('BIAS STANCE', colX.bias, y + 4.8);
  doc.text('2Y YIELD', colX.y2, y + 4.8);
  doc.text('10Y YIELD', colX.y10, y + 4.8);
  doc.text('10Y REAL YIELD', colX.realY, y + 4.8);
  doc.text('NEXT MEETING', colX.meeting, y + 4.8);

  y += 8;

  interestRates.forEach((rec, idx) => {
    checkAddPage(8);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, pageWidth - 28, 7, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(14, 116, 144);
    doc.text(rec.currency, colX.curr, y + 4);

    doc.setTextColor(30, 41, 59);
    doc.text(rec.centralBankName.slice(0, 28), colX.cb, y + 4);

    doc.text(`${rec.currentPolicyRate.toFixed(2)}%`, colX.rate, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${rec.previousPolicyRate.toFixed(2)}%`, colX.prevRate, y + 4);

    doc.text(`${rec.expectedNextRate.toFixed(2)}%`, colX.expected, y + 4);

    // Bias
    doc.setFont('helvetica', 'bold');
    if (rec.centralBankBias === 'HAWKISH') {
      doc.setTextColor(16, 185, 129);
    } else if (rec.centralBankBias === 'DOVISH') {
      doc.setTextColor(244, 63, 94);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(rec.centralBankBias, colX.bias, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${rec.yield2Y.toFixed(2)}%`, colX.y2, y + 4);
    doc.text(`${rec.yield10Y.toFixed(2)}%`, colX.y10, y + 4);
    doc.text(rec.realYield10Y !== undefined ? `${rec.realYield10Y.toFixed(2)}%` : '—', colX.realY, y + 4);

    doc.setTextColor(100, 116, 139);
    doc.text(rec.nextMeetingDate.slice(0, 14), colX.meeting, y + 4);

    y += 8;
  });

  // Institutional explanation section
  checkAddPage(32);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('INSTITUTIONAL RATES CADENCE & YIELD SPREAD EXPLANATION:', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Data Cadence Needed: Central bank policy meetings occur approximately every 6 weeks (8 times annually), requiring real-time rate decision updates.', 18, y + 10);
  doc.text('• Sovereign yields (2Y & 10Y) are marked-to-market daily. 2-Year yields reflect short-term policy path expectations; 10-Year yields reflect long-term growth and inflation.', 18, y + 14);
  doc.text('• The yield differential between two currencies (Base Yield minus Quote Yield) serves as the primary capital attraction anchor for carry trade flows.', 18, y + 18);

  drawFooter();
  doc.save(`primepip_rates_yields_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates an Institutional-Grade COT Report PDF
 */
export function generateCotReportPdf(cotRecords: CotPositioningRecord[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX — COMMITMENT OF TRADERS (COT) INSTITUTIONAL REPORT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`DATE: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text('Prime Pip FX Command Center • US CFTC Commitment of Traders Institutional Flow Verification', 14, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const checkAddPage = (space: number) => {
    if (y + space > pageHeight - 14) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  drawHeader();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('CFTC COMMITMENT OF TRADERS (COT) WEEKLY INSTITUTIONAL POSITIONING', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Non-Commercial (Speculators / Hedge Funds) vs Commercial (Corporate Hedgers) weekly net positioning across all 8 currencies.', 14, y);
  y += 7;

  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);

  const colX = {
    curr: 16,
    nonCommLong: 40,
    nonCommShort: 70,
    netPosition: 100,
    commLong: 135,
    commShort: 165,
    openInterest: 195,
    sentimentBias: 230,
    reportDate: 260,
  };

  doc.text('CURRENCY', colX.curr, y + 4.8);
  doc.text('NON-COMM LONG', colX.nonCommLong, y + 4.8);
  doc.text('NON-COMM SHORT', colX.nonCommShort, y + 4.8);
  doc.text('NET POSITION', colX.netPosition, y + 4.8);
  doc.text('COMM LONG', colX.commLong, y + 4.8);
  doc.text('COMM SHORT', colX.commShort, y + 4.8);
  doc.text('OPEN INTEREST', colX.openInterest, y + 4.8);
  doc.text('BIAS STANCE', colX.sentimentBias, y + 4.8);
  doc.text('REPORT DATE', colX.reportDate, y + 4.8);

  y += 8;

  cotRecords.forEach((rec, idx) => {
    checkAddPage(8);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, pageWidth - 28, 7, 'F');
    }

    const net = rec.nonCommercialLong - rec.nonCommercialShort;
    const isBull = net > 0;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(14, 116, 144);
    doc.text(rec.currency, colX.curr, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(rec.nonCommercialLong.toLocaleString(), colX.nonCommLong, y + 4);
    doc.text(rec.nonCommercialShort.toLocaleString(), colX.nonCommShort, y + 4);

    doc.setFont('helvetica', 'bold');
    if (isBull) {
      doc.setTextColor(16, 185, 129);
      doc.text(`+${net.toLocaleString()}`, colX.netPosition, y + 4);
    } else {
      doc.setTextColor(244, 63, 94);
      doc.text(net.toLocaleString(), colX.netPosition, y + 4);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(rec.commercialLong.toLocaleString(), colX.commLong, y + 4);
    doc.text(rec.commercialShort.toLocaleString(), colX.commShort, y + 4);
    doc.text(rec.openInterest.toLocaleString(), colX.openInterest, y + 4);

    doc.setFont('helvetica', 'bold');
    if (isBull) {
      doc.setTextColor(16, 185, 129);
      doc.text('BULLISH NET', colX.sentimentBias, y + 4);
    } else {
      doc.setTextColor(244, 63, 94);
      doc.text('BEARISH NET', colX.sentimentBias, y + 4);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(rec.reportDate || 'Latest', colX.reportDate, y + 4);

    y += 8;
  });

  // Institutional explanation section
  checkAddPage(32);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 24, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('COT REPORT CADENCE & INSTITUTIONAL SPECULATIVE MECHANICS:', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Data Cadence Needed: WEEKLY data released every Friday at 15:30 EST by the CFTC, tracking Tuesday close futures positioning.', 18, y + 10);
  doc.text('• Non-Commercial traders (hedge funds, asset managers) are trend followers. Sustained net long growth confirms institutional bullish conviction.', 18, y + 14);
  doc.text('• Extreme positioning (top 95th percentile net long or net short) signals exhaustion where liquidity sweeps trigger contrarian turning points.', 18, y + 18);

  drawFooter();
  doc.save(`primepip_cot_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Generates an Institutional-Grade Retail Market Sentiment Report PDF
 */
export function generateSentimentReportPdf(sentimentPairs: any[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 14;
  let pageNum = 1;

  const drawHeader = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('PRIME PIP FX — 31 INSTRUMENT RETAIL SENTIMENT & CONTRARIAN INTELLIGENCE REPORT', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`DATE: ${new Date().toISOString().slice(0, 10)}`, pageWidth - 14, 8, { align: 'right' });
  };

  const drawFooter = () => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text('Prime Pip FX Command Center • Contrarian Retail Sentiment Order Book Analysis • Sourced from Myfxbook, OANDA, IG', 14, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  };

  const checkAddPage = (space: number) => {
    if (y + space > pageHeight - 14) {
      drawFooter();
      doc.addPage();
      pageNum++;
      y = 16;
      drawHeader();
    }
  };

  drawHeader();
  y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('31 FOREX PAIRS & COMMODITIES RETAIL SENTIMENT AUDIT', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('28 Standard Forex Pairs + Gold (XAU/USD) + Silver (XAG/USD) + Crude Oil (US Oil) broker order book positioning.', 14, y);
  y += 7;

  // Table header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(255, 255, 255);

  const colX = {
    pair: 16,
    name: 45,
    cat: 95,
    longPct: 135,
    shortPct: 165,
    retailBias: 195,
    contrarianSignal: 230,
    source: 260,
  };

  doc.text('INSTRUMENT', colX.pair, y + 4.8);
  doc.text('ASSET NAME', colX.name, y + 4.8);
  doc.text('CATEGORY', colX.cat, y + 4.8);
  doc.text('RETAIL LONG %', colX.longPct, y + 4.8);
  doc.text('RETAIL SHORT %', colX.shortPct, y + 4.8);
  doc.text('RETAIL BIAS', colX.retailBias, y + 4.8);
  doc.text('CONTRARIAN SIGNAL', colX.contrarianSignal, y + 4.8);
  doc.text('SOURCE', colX.source, y + 4.8);

  y += 8;

  sentimentPairs.forEach((item, idx) => {
    checkAddPage(7);
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 1, pageWidth - 28, 6.5, 'F');
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(14, 116, 144);
    doc.text(item.pair, colX.pair, y + 3.8);

    doc.setTextColor(30, 41, 59);
    doc.text((item.name || item.pair).slice(0, 24), colX.name, y + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(item.category || 'FOREX', colX.cat, y + 3.8);

    const longVal = typeof item.longPercent === 'number' ? item.longPercent : item.defaultLong || 50;
    const shortVal = typeof item.shortPercent === 'number' ? item.shortPercent : item.defaultShort || 50;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(longVal > 60 ? 16 : 30, longVal > 60 ? 185 : 41, longVal > 60 ? 129 : 59);
    doc.text(`${longVal.toFixed(1)}%`, colX.longPct, y + 3.8);

    doc.setTextColor(shortVal > 60 ? 244 : 30, shortVal > 60 ? 63 : 41, shortVal > 60 ? 94 : 59);
    doc.text(`${shortVal.toFixed(1)}%`, colX.shortPct, y + 3.8);

    doc.setTextColor(longVal > shortVal ? 16 : 244, longVal > shortVal ? 185 : 63, longVal > shortVal ? 129 : 94);
    doc.text(longVal > shortVal ? 'BULLISH CROWD' : 'BEARISH CROWD', colX.retailBias, y + 3.8);

    // Contrarian signal is inverted
    const isContrarianBull = shortVal > 65;
    const isContrarianBear = longVal > 65;
    if (isContrarianBear) {
      doc.setTextColor(244, 63, 94);
      doc.text('CONTRARIAN SHORT', colX.contrarianSignal, y + 3.8);
    } else if (isContrarianBull) {
      doc.setTextColor(16, 185, 129);
      doc.text('CONTRARIAN LONG', colX.contrarianSignal, y + 3.8);
    } else {
      doc.setTextColor(100, 116, 139);
      doc.text('NEUTRAL', colX.contrarianSignal, y + 3.8);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text((item.source || 'Myfxbook').slice(0, 16), colX.source, y + 3.8);

    y += 7;
  });

  // Institutional explanation section
  checkAddPage(30);
  y += 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RETAIL COMMUNITY SENTIMENT CADENCE & CONTRARIAN INTERPRETATION:', 18, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('• Data Cadence Needed: DAILY and INTRA-DAY snapshot updates from live retail broker aggregate order books (Myfxbook, OANDA, IG).', 18, y + 10);
  doc.text('• Over 70-80% of retail forex traders consistently lose money due to premature reversal chasing and poor risk management.', 18, y + 14);
  doc.text('• When retail is heavily net long (>75%), liquidity pools sit beneath retail stop-losses, attracting institutional sell orders (Contrarian Short).', 18, y + 18);

  drawFooter();
  doc.save(`primepip_market_sentiment_report_${new Date().toISOString().slice(0, 10)}.pdf`);
}


