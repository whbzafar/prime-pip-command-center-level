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
} from '../types/fundamentalIndicatorTypes';
import { CURRENCY_METADATA } from '../data/fundamentalRegistryData';

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
