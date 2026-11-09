/**
 * Shareable PDF exports of the live Fundamentals engine:
 *  - top long-term (or current) bullish / bearish pairs
 *  - one pair's full fundamental verdict (score, bias, bullish/bearish %, sentiment, both sides' breakdown)
 *  - the full list of pairs
 */
import { jsPDF } from 'jspdf';
import type { AssetResult, Bias, PairResult } from '../components/fundamentalAnalysis/types';
import type { RankedPair, Rankings } from '../components/fundamentalAnalysis/LiveBiasStrip';

const C = {
  ink: [15, 23, 42] as const, muted: [100, 116, 139] as const, line: [226, 232, 240] as const,
  green: [5, 150, 105] as const, red: [220, 38, 38] as const, accent: [8, 145, 178] as const, head: [7, 11, 20] as const,
};
export const biasLabel = (b?: Bias | string | null) => (b ? String(b).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '—');
const sc = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`);
const pkt = (d: Date | string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d)) + ' PKT';
const safe = (s: unknown) => String(s ?? '').replace(/[^\x20-\x7E -ÿ]/g, (ch) => ({ '−': '-', '–': '-', '—': '-', '’': "'", '‘': "'", '“': '"', '”': '"', '…': '...', '≥': '>=', '≤': '<=', '→': '->', '÷': '/', '×': 'x', '✓': 'v' } as Record<string, string>)[ch] ?? '');

class Doc {
  d = new jsPDF({ unit: 'mm', format: 'a4' });
  y = 0;
  W = 210; M = 14;
  constructor(title: string, subtitle: string) {
    const d = this.d;
    d.setFillColor(...C.head); d.rect(0, 0, this.W, 30, 'F');
    d.setFillColor(...C.accent); d.rect(0, 30, this.W, 1.2, 'F');
    d.setTextColor(255, 255, 255); d.setFont('helvetica', 'bold'); d.setFontSize(17); d.text(safe(title), this.M, 14);
    d.setFont('helvetica', 'normal'); d.setFontSize(9.5); d.setTextColor(186, 230, 253); d.text(safe(subtitle), this.M, 22);
    d.setFontSize(8.5); d.setTextColor(148, 163, 184); d.text('PrimePipFX Command Center', this.W - this.M, 14, { align: 'right' });
    this.y = 40;
  }
  need(h: number) { if (this.y + h > 280) { this.d.addPage(); this.y = 18; } }
  h2(t: string, color: readonly [number, number, number] = C.ink) { this.need(12); const d = this.d; d.setFont('helvetica', 'bold'); d.setFontSize(12); d.setTextColor(...color); d.text(safe(t), this.M, this.y); this.y += 2; d.setDrawColor(...C.line); d.line(this.M, this.y, this.W - this.M, this.y); this.y += 5; }
  p(t: string, size = 9.5, color: readonly [number, number, number] = C.ink) {
    const d = this.d; d.setFont('helvetica', 'normal'); d.setFontSize(size); d.setTextColor(...color);
    for (const line of d.splitTextToSize(safe(t), this.W - 2 * this.M)) { this.need(5); d.text(line, this.M, this.y); this.y += size * 0.45; }
    this.y += 1.5;
  }
  kv(items: [string, string, (readonly [number, number, number])?][]) {
    const d = this.d; const cols = Math.min(4, items.length); const w = (this.W - 2 * this.M) / cols;
    for (let i = 0; i < items.length; i += cols) {
      this.need(16);
      items.slice(i, i + cols).forEach(([k, v, col], j) => {
        const x = this.M + j * w;
        d.setDrawColor(...C.line); d.setFillColor(248, 250, 252); d.roundedRect(x, this.y, w - 2, 14, 1.5, 1.5, 'FD');
        d.setFont('helvetica', 'normal'); d.setFontSize(7.5); d.setTextColor(...C.muted); d.text(safe(k).toUpperCase(), x + 2.5, this.y + 4.8);
        d.setFont('helvetica', 'bold'); d.setFontSize(11); d.setTextColor(...(col || C.ink)); d.text(safe(v), x + 2.5, this.y + 11);
      });
      this.y += 17;
    }
  }
  bar(bullPct: number | null) {
    if (bullPct === null) return;
    this.need(8); const d = this.d; const w = this.W - 2 * this.M; const g = Math.max(0, Math.min(100, bullPct)) / 100;
    d.setFillColor(...C.green); d.rect(this.M, this.y, w * g, 3.5, 'F'); d.setFillColor(...C.red); d.rect(this.M + w * g, this.y, w * (1 - g), 3.5, 'F');
    this.y += 7;
  }
  table(head: string[], rows: (string | { t: string; c?: readonly [number, number, number]; b?: boolean })[][], widths: number[]) {
    const d = this.d; const total = widths.reduce((a, b) => a + b, 0); const scale = (this.W - 2 * this.M) / total; const ws = widths.map((w) => w * scale);
    const header = () => {
      this.need(9); d.setFillColor(241, 245, 249); d.rect(this.M, this.y - 4.2, this.W - 2 * this.M, 6.5, 'F');
      d.setFont('helvetica', 'bold'); d.setFontSize(8); d.setTextColor(...C.muted);
      let x = this.M + 1.5; head.forEach((h, i) => { d.text(safe(h), x, this.y); x += ws[i]; }); this.y += 5;
    };
    header();
    for (const r of rows) {
      if (this.y > 278) { d.addPage(); this.y = 18; header(); }
      let x = this.M + 1.5;
      r.forEach((cell, i) => {
        const c = typeof cell === 'string' ? { t: cell } : cell;
        d.setFont('helvetica', c.b ? 'bold' : 'normal'); d.setFontSize(8.8); d.setTextColor(...(c.c || C.ink));
        const txt = d.splitTextToSize(safe(c.t), ws[i] - 2)[0] || '';
        d.text(txt, x, this.y); x += ws[i];
      });
      d.setDrawColor(...C.line); d.line(this.M, this.y + 1.8, this.W - this.M, this.y + 1.8);
      this.y += 6;
    }
    this.y += 3;
  }
  save(name: string) {
    const d = this.d; const n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.setPage(i); d.setFont('helvetica', 'normal'); d.setFontSize(7.5); d.setTextColor(...C.muted);
      d.text(safe('Fundamental analysis for education - not financial advice. Scores update live; this PDF is a snapshot.'), this.M, 291);
      d.text(`Page ${i} / ${n}`, this.W - this.M, 291, { align: 'right' });
    }
    d.save(name);
  }
}
const tone = (v: number | null | undefined) => ((v ?? 0) > 0 ? C.green : (v ?? 0) < 0 ? C.red : C.ink);
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');

export function exportRankingsPdf(r: Rankings, horizon: 'longTerm' | 'shortTerm' = 'longTerm') {
  const name = horizon === 'longTerm' ? 'Long-term' : 'Current (short-term)';
  const doc = new Doc(`Top ${name} Bullish & Bearish Pairs`, `Live fundamentals ranking - generated ${pkt(r.generatedAt || new Date())}`);
  const other = horizon === 'longTerm' ? 'shortTerm' : 'longTerm';
  const rows = (l: RankedPair[]) => l.map((p, i) => {
    const v = p[horizon]; const o = p[other];
    const agree = v !== null && o !== null && Math.sign(v) === Math.sign(o);
    return [`#${i + 1}`, { t: p.display, b: true }, p.assetClass.toLowerCase(), { t: sc(v), c: tone(v), b: true }, { t: sc(o), c: tone(o) }, `${p.confidence ?? '—'}%`, agree ? 'Yes' : 'No'];
  });
  const head = ['#', 'Pair', 'Class', `${horizon === 'longTerm' ? 'Long-term' : 'Current'} score`, horizon === 'longTerm' ? 'Current' : 'Long-term', 'Confidence', 'Both agree'];
  const widths = [10, 34, 26, 30, 24, 24, 22];
  doc.h2(`${name} bullish`, C.green);
  r[horizon].bullish.length ? doc.table(head, rows(r[horizon].bullish), widths) : doc.p('No pair has a clear bullish reading right now.', 9, C.muted);
  doc.h2(`${name} bearish`, C.red);
  r[horizon].bearish.length ? doc.table(head, rows(r[horizon].bearish), widths) : doc.p('No pair has a clear bearish reading right now.', 9, C.muted);
  doc.h2('How to read this');
  doc.p('Score runs from -100 (strongly bearish) to +100 (strongly bullish) for the first currency or asset of the pair against the second. "Both agree" = the long-term and current readings point the same way, which makes the bias more reliable. Confidence = how much of the underlying data is live.', 9, C.muted);
  if (r.method) doc.p(r.method, 8.5, C.muted);
  doc.save(`PrimePipFX_${horizon === 'longTerm' ? 'LongTerm' : 'Current'}_Rankings_${stamp()}.pdf`);
}

function assetSection(doc: Doc, a: AssetResult, title: string) {
  doc.h2(title, C.accent);
  doc.kv([
    ['Score', sc(a.score), tone(a.score)], ['Bias', biasLabel(a.bias), tone(a.score)],
    ['Bullish / Bearish', a.bullishPct === null ? '—' : `${a.bullishPct.toFixed(0)}% / ${(a.bearishPct ?? 100 - a.bullishPct).toFixed(0)}%`], ['Confidence', `${a.confidence}%`],
  ]);
  if (a.summary) doc.p(a.summary, 9);
  if (a.topDrivers?.length) {
    doc.table(['Top driver', 'Pillar', 'Impact'], a.topDrivers.slice(0, 6).map((t) => [t.name, t.pillar, { t: sc(t.impact), c: tone(t.impact), b: true }]), [70, 50, 25]);
  }
  for (const pl of a.pillars || []) {
    doc.need(14);
    doc.p(`${pl.name} - score ${sc(pl.score)}${pl.bullishPct !== null ? ` · ${pl.bullishPct.toFixed(0)}% bullish` : ''} · weight ${Math.round((pl.weight || 0) * 100)}% · coverage ${Math.round((pl.coverage || 0) * 100)}%`, 9.5, tone(pl.score));
    const inds = (pl.indicators || []).filter((i) => i.status !== 'missing');
    if (inds.length) {
      doc.table(['Indicator', 'Actual', 'Forecast', 'Previous', 'Released', 'Score'], inds.map((i) => {
        const o = i.observation;
        const u = o?.unit ? ` ${o.unit}` : '';
        return [i.name, o ? `${o.actual}${u}` : '—', o?.forecast ?? '—', o?.previous ?? '—', o?.releasedAt ? new Date(o.releasedAt).toISOString().slice(0, 10) : '—', { t: sc(i.score), c: tone(i.score), b: true }].map((x) => (typeof x === 'object' ? x : String(x)));
      }), [62, 22, 22, 22, 24, 18]);
    }
  }
}

export function exportPairPdf(detail: { data: PairResult; base: AssetResult | null; quote: AssetResult | null; sentiment?: any }) {
  const p = detail.data;
  const doc = new Doc(`${p.display} - Fundamental Report`, `Live verdict generated ${pkt(new Date())}`);
  doc.h2('Pair verdict');
  doc.kv([
    ['Score', sc(p.score), tone(p.score)], ['Bias', biasLabel(p.bias), tone(p.score)],
    ['Bullish', p.bullishPct === null ? '—' : `${p.bullishPct.toFixed(1)}%`, C.green], ['Bearish', p.bullishPct === null ? '—' : `${(100 - p.bullishPct).toFixed(1)}%`, C.red],
    [`${p.base} score`, sc(p.baseScore), tone(p.baseScore)], [`${p.quote} score`, sc(p.quoteScore), tone(p.quoteScore)],
    ['Confidence', `${p.confidence}%`], ['Asset class', p.assetClass.toLowerCase()],
  ]);
  doc.bar(p.bullishPct);
  if (p.explanation) doc.p(p.explanation, 9.5);
  const sp = detail.sentiment?.pair;
  if (sp) {
    doc.h2('Live trader sentiment');
    doc.kv([['Long', `${sp.longPct}%`, C.green], ['Short', `${sp.shortPct}%`, C.red], ['Contrarian read', biasLabel(sp.contrarian)], ['Method', sp.method === 'derived' ? 'derived' : 'direct']]);
    if (sp.sources?.length) doc.p(`Sources: ${sp.sources.map((x: any) => x.name).join(', ')}`, 8.5, C.muted);
  } else if (p.retailSentiment) {
    doc.h2('Retail sentiment');
    doc.kv([['Long', `${p.retailSentiment.longPct}%`, C.green], ['Short', `${p.retailSentiment.shortPct}%`, C.red], ['Source', p.retailSentiment.source]]);
  }
  if (p.correlationToUsd !== null && p.correlationToUsd !== undefined) doc.p(`90-day correlation with the US Dollar Index (DXY): ${Math.round(p.correlationToUsd * 100)}%`, 9, C.muted);
  if (detail.base) assetSection(doc, detail.base, `${p.base} - fundamental breakdown`);
  if (detail.quote) assetSection(doc, detail.quote, `${p.quote} - fundamental breakdown`);
  doc.save(`PrimePipFX_${p.symbol}_Fundamentals_${stamp()}.pdf`);
}

export function exportPairsListPdf(pairs: PairResult[], generatedAt?: string) {
  const doc = new Doc('All Pairs - Fundamental Scores', `Live fundamentals engine - ${pkt(generatedAt || new Date())}`);
  const sorted = [...pairs].sort((a, b) => (b.score ?? -999) - (a.score ?? -999));
  doc.table(['Pair', 'Class', 'Base', 'Quote', 'Score', 'Bullish', 'Bearish', 'Bias', 'Conf.'], sorted.map((p) => [
    { t: p.display, b: true }, p.assetClass.toLowerCase(), { t: sc(p.baseScore), c: tone(p.baseScore) }, { t: sc(p.quoteScore), c: tone(p.quoteScore) },
    { t: sc(p.score), c: tone(p.score), b: true }, p.bullishPct === null ? '—' : `${p.bullishPct.toFixed(0)}%`, p.bullishPct === null ? '—' : `${(100 - p.bullishPct).toFixed(0)}%`, { t: biasLabel(p.bias), c: tone(p.score) }, `${p.confidence}%`,
  ]), [26, 22, 16, 16, 16, 16, 16, 30, 14]);
  doc.save(`PrimePipFX_All_Pairs_${stamp()}.pdf`);
}
