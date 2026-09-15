import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Trade, AccountSettings } from '../types';
import { formatCurrency } from './currencyFormatter';
import { formatTo12Hour, getKarachiDate, getKarachiTime12 } from './time';
import {
  calculateStrategyMetrics,
  calculateSessionMetrics,
  calculatePairMetrics,
  calculateTimeframeMetrics,
} from './tradeAnalytics';

export interface ExportOptions {
  account: AccountSettings;
  trades: Trade[];
  scope: 'ACTIVE_ACCOUNT' | 'ALL_ACCOUNTS';
  allAccounts?: AccountSettings[];
  allTrades?: Trade[];
}

/**
 * Prepares flat tabular data with standardized 12-hour AM/PM timestamps
 */
export function generateTradeRows(trades: Trade[], accountName: string) {
  return trades.map((t) => {
    const formattedTime = formatTo12Hour(t.time);
    return {
      'Account Name': accountName,
      'Trade ID': t.id,
      'Trade Number': t.tradeNumber ?? '—',
      'Date (PKT)': t.date,
      'Time (12-Hour AM/PM)': formattedTime,
      'Instrument / Pair': t.instrument,
      'Direction': t.direction,
      'Lot Size': t.lotSize,
      'Entry Price': t.entryPrice,
      'Stop Loss': t.stopLoss,
      'Take Profit': t.takeProfit,
      'Exit Price': t.exitPrice,
      'Net Profit / Loss': t.profitLoss,
      'R-Multiple': t.rMultiple ?? 0,
      'Strategy / SBT Model': t.strategy,
      'Session': t.session,
      'Timeframe': t.timeframe,
      'Execution Grade': t.grade,
      'Quality Score (/100)': t.alignmentScore?.totalQuality ?? 85,
      'Rule Violation': t.ruleViolation,
      'Pre-Trade Emotion': t.preEmotion,
      'Post-Trade Followed Plan': t.postPsychology?.followedPlan ? 'YES' : 'NO',
      'Mistake Reason': t.mistakeReason,
      'Notes': t.notes || '',
    };
  });
}

/**
 * Export Excel (.xlsx) file
 */
export async function exportToExcel(options: ExportOptions): Promise<void> {
  const { account, trades } = options;
  const wb = XLSX.utils.book_new();

  // 1. Trades worksheet
  const rows = generateTradeRows(trades, account.accountName);
  const wsTrades = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, wsTrades, 'Trade Journal');

  // 2. Performance Summary worksheet
  const winningTrades = trades.filter((t) => t.profitLoss > 0);
  const losingTrades = trades.filter((t) => t.profitLoss < 0);
  const totalNet = trades.reduce((acc, t) => acc + t.profitLoss, 0);
  const grossProfit = winningTrades.reduce((acc, t) => acc + t.profitLoss, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.profitLoss, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;
  const winRate = trades.length > 0 ? Math.round((winningTrades.length / trades.length) * 100) : 0;

  const summaryData = [
    { Metric: 'Account Name', Value: account.accountName },
    { Metric: 'Broker', Value: account.broker },
    { Metric: 'Account Type', Value: account.accountType },
    { Metric: 'Initial Balance', Value: formatCurrency(account.initialBalance, account.currency) },
    { Metric: 'Current Balance', Value: formatCurrency(account.currentBalance, account.currency) },
    { Metric: 'Timezone Standard', Value: 'Asia/Karachi (PKT UTC+5)' },
    { Metric: 'Time Format', Value: '12-Hour AM/PM' },
    { Metric: 'Total Executions', Value: trades.length },
    { Metric: 'Winning Trades', Value: winningTrades.length },
    { Metric: 'Losing Trades', Value: losingTrades.length },
    { Metric: 'Win Rate', Value: `${winRate}%` },
    { Metric: 'Profit Factor', Value: profitFactor },
    { Metric: 'Total Net P&L', Value: formatCurrency(totalNet, account.currency, { showSign: true }) },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Performance Summary');

  // 3. Strategy Matrix worksheet
  const stratMetrics = calculateStrategyMetrics(trades);
  if (stratMetrics.length > 0) {
    const wsStrategies = XLSX.utils.json_to_sheet(
      stratMetrics.map((s) => ({
        'Strategy / SBT Model': s.strategy,
        'Executions': s.trades,
        'Wins': s.wins,
        'Losses': s.losses,
        'Win Rate': `${s.winRate}%`,
        'Avg R': `+${s.avgR}R`,
        'Profit Factor': s.profitFactor,
        'Net Profit/Loss': s.totalProfitLoss,
      }))
    );
    XLSX.utils.book_append_sheet(wb, wsStrategies, 'Strategy Matrix');
  }

  // 4. Download file
  const fileName = `primepipfx-${account.accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-journal.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export CSV (.csv) file
 */
export function exportToCSV(options: ExportOptions): void {
  const { account, trades } = options;
  const rows = generateTradeRows(trades, account.accountName);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `primepipfx-${account.accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-trades.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF buffer or download PDF Performance Audit Report
 */
export function generatePDF(options: ExportOptions): jsPDF {
  const { account, trades } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 16;

  // Header Banner
  doc.setFillColor(11, 15, 25);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(245, 158, 11); // Amber
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PRIMEPIPFX TRADING COMMAND CENTER', 14, 12);

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL PERFORMANCE & TACTICAL AUDIT REPORT', 14, 18);
  doc.text(`TIMEZONE: Asia/Karachi (PKT UTC+5) • GENERATED: ${getKarachiDate()} ${getKarachiTime12()}`, 14, 23);

  y = 36;

  // Account Snapshot Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 26, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`ACCOUNT: ${account.accountName.toUpperCase()} (${account.broker || 'Live Broker'})`, 18, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Type: ${account.accountType} | Initial Balance: ${formatCurrency(account.initialBalance, account.currency)} | Balance: ${formatCurrency(account.currentBalance, account.currency)}`, 18, y + 14);
  doc.text(`Max Daily Trades: ${account.maxDailyTrades} | Max Risk Per Trade: ${account.maxRiskPerTradePercent || 1}%`, 18, y + 20);

  y += 33;

  // Key Performance Indicators Table / Box
  const winningTrades = trades.filter((t) => t.profitLoss > 0);
  const losingTrades = trades.filter((t) => t.profitLoss < 0);
  const totalNet = trades.reduce((acc, t) => acc + t.profitLoss, 0);
  const grossProfit = winningTrades.reduce((acc, t) => acc + t.profitLoss, 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.profitLoss, 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;
  const winRate = trades.length > 0 ? Math.round((winningTrades.length / trades.length) * 100) : 0;
  const avgR = trades.length > 0 ? (trades.reduce((a, b) => a + (b.rMultiple || 0), 0) / trades.length).toFixed(2) : '0.00';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('AUDIT PERFORMANCE METRICS', 14, y);
  y += 5;

  const colW = (pageWidth - 28) / 4;
  const kpis = [
    { label: 'TOTAL TRADES', val: `${trades.length}` },
    { label: 'WIN RATE', val: `${winRate}%` },
    { label: 'PROFIT FACTOR', val: `${profitFactor}` },
    { label: 'NET PROFIT', val: formatCurrency(totalNet, account.currency, { showSign: true }) },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * colW;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, colW - 2, 16, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 3, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.val, x + 3, y + 12);
  });

  y += 24;

  // Recent Executions Table (Top 15)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`EXECUTION LOG (${trades.length} Records, Displaying Latest 15)`, 14, y);
  y += 6;

  // Table header
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageWidth - 28, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.text('ID', 16, y + 4.5);
  doc.text('DATE', 36, y + 4.5);
  doc.text('TIME (PKT)', 56, y + 4.5);
  doc.text('PAIR', 76, y + 4.5);
  doc.text('DIR', 94, y + 4.5);
  doc.text('STRATEGY', 108, y + 4.5);
  doc.text('GRADE', 140, y + 4.5);
  doc.text('R-MULT', 156, y + 4.5);
  doc.text('NET P&L', 178, y + 4.5);
  y += 7;

  const sortedTrades = [...trades].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 15);

  if (sortedTrades.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('NO TRADING DATA AVAILABLE FOR THIS ACCOUNT', 14, y + 8);
    y += 12;
  } else {
    sortedTrades.forEach((t, i) => {
      const bg = i % 2 === 0 ? 255 : 248;
      doc.setFillColor(bg, bg, bg);
      doc.rect(14, y, pageWidth - 28, 6, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);

      doc.text(t.id.slice(0, 8), 16, y + 4);
      doc.text(t.date, 36, y + 4);
      doc.text(formatTo12Hour(t.time), 56, y + 4);
      doc.text(t.instrument, 76, y + 4);
      doc.text(t.direction, 94, y + 4);
      doc.text(t.strategy.slice(0, 16), 108, y + 4);
      doc.text(t.grade, 142, y + 4);
      doc.text(`${(t.rMultiple || 0).toFixed(1)}R`, 158, y + 4);

      if (t.profitLoss >= 0) {
        doc.setTextColor(16, 185, 129); // Emerald
      } else {
        doc.setTextColor(239, 68, 68); // Rose
      }
      doc.text(formatCurrency(t.profitLoss, account.currency, { showSign: true }), 178, y + 4);

      y += 6;
    });
  }

  // Footer Disclaimer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated by PrimePipFX Trading Command Center • All executions verified in Pakistan Time (PKT UTC+5).', 14, 285);

  return doc;
}

/**
 * Export PDF file
 */
export function exportToPDF(options: ExportOptions): void {
  const doc = generatePDF(options);
  const fileName = `primepipfx-${options.account.accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-audit.pdf`;
  doc.save(fileName);
}

/**
 * Export Comprehensive ZIP Archive containing:
 * - XLSX Workbook
 * - PDF Report
 * - CSV File
 * - JSON Vault Backup
 * - Manifest & Readme
 * - Screenshots (if present)
 */
export async function exportToZIP(options: ExportOptions): Promise<void> {
  const { account, trades } = options;
  const zip = new JSZip();

  // 1. Generate JSON
  const backupData = {
    version: '2.0.0',
    exportedAt: `${getKarachiDate()} ${getKarachiTime12()} PKT (UTC+5)`,
    timezone: 'Asia/Karachi',
    account,
    trades,
  };
  zip.file('primepipfx-data-vault.json', JSON.stringify(backupData, null, 2));

  // 2. Generate CSV
  const rows = generateTradeRows(trades, account.accountName);
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  zip.file('primepipfx-trade-journal.csv', csv);

  // 3. Generate XLSX
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Trade Journal');
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  zip.file('primepipfx-trade-journal.xlsx', excelBuffer);

  // 4. Generate PDF
  const pdfDoc = generatePDF(options);
  const pdfArrayBuffer = pdfDoc.output('arraybuffer');
  zip.file('primepipfx-performance-audit.pdf', pdfArrayBuffer);

  // 5. Generate Manifest & Readme
  const manifest = `==================================================================
PRIMEPIPFX TRADING COMMAND CENTER • DATA EXPORT ARCHIVE
==================================================================
Account Name:     ${account.accountName}
Broker:           ${account.broker}
Account Type:     ${account.accountType}
Initial Balance:  ${formatCurrency(account.initialBalance, account.currency)}
Current Balance:  ${formatCurrency(account.currentBalance, account.currency)}
Timezone:         Asia/Karachi (PKT UTC+5)
Time Format:      12-Hour AM/PM
Total Trades:     ${trades.length}
Export Timestamp: ${getKarachiDate()} ${getKarachiTime12()} PKT

CONTENTS OF THIS ARCHIVE:
- primepipfx-trade-journal.xlsx   (Full Excel spreadsheet with journal, metrics)
- primepipfx-trade-journal.csv    (Universal CSV for external import)
- primepipfx-performance-audit.pdf (Official formatted PDF performance audit)
- primepipfx-data-vault.json      (Full offline-first restore JSON backup)
- images/                         (Screenshots captured for executions)
==================================================================`;
  zip.file('README_EXPORT_MANIFEST.txt', manifest);

  // 6. Include screenshots if present
  const imgFolder = zip.folder('images');
  if (imgFolder) {
    trades.forEach((t) => {
      if (t.screenshots?.entry && t.screenshots.entry.startsWith('data:image/')) {
        const parts = t.screenshots.entry.split(',');
        if (parts.length === 2) {
          const extension = parts[0].includes('png') ? 'png' : 'jpg';
          imgFolder.file(`${t.id}-entry.${extension}`, parts[1], { base64: true });
        }
      }
      if (t.screenshots?.afterTrade && t.screenshots.afterTrade.startsWith('data:image/')) {
        const parts = t.screenshots.afterTrade.split(',');
        if (parts.length === 2) {
          const extension = parts[0].includes('png') ? 'png' : 'jpg';
          imgFolder.file(`${t.id}-after.${extension}`, parts[1], { base64: true });
        }
      }
    });
  }

  // 7. Compress and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `primepipfx-${account.accountName.toLowerCase().replace(/[^a-z0-9]/g, '_')}-archive.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
