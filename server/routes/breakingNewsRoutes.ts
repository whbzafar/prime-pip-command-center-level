/**
 * /api/news/breaking — free, live market-moving headlines from public RSS feeds (no keys).
 *
 * Merges forex / markets / world feeds, removes duplicates, rates each story's market impact
 * (HIGH for wars, attacks, sanctions, central-bank decisions, tariffs, defaults, emergencies…)
 * and tags the currencies / assets it is likely to move. Cached 60 s at the edge.
 * Stories are shown as headline + the feed's own summary with a link to the full article.
 */
import { Router } from 'express';

interface Feed { url: string; source: string; kind: 'markets' | 'forex' | 'world' }
const FEEDS: Feed[] = [
  { url: 'https://www.investing.com/rss/news_1.rss', source: 'Investing.com · Forex', kind: 'forex' },
  { url: 'https://www.investing.com/rss/news_95.rss', source: 'Investing.com · Economy', kind: 'markets' },
  { url: 'https://www.investing.com/rss/news_287.rss', source: 'Investing.com · Breaking', kind: 'markets' },
  { url: 'https://www.fxempire.com/api/v1/en/articles/rss/news', source: 'FXEmpire', kind: 'forex' },
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', source: 'CNBC', kind: 'markets' },
  { url: 'https://www.cnbc.com/id/20910258/device/rss/rss.html', source: 'CNBC · Economy', kind: 'markets' },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC World', kind: 'world' },
  { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC Business', kind: 'markets' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera', kind: 'world' },
  { url: 'https://news.google.com/rss/search?q=(Fed+OR+ECB+OR+BOJ+OR+BOE+OR+%22central+bank%22+OR+tariff+OR+OPEC+OR+sanctions+OR+war)+when:1d&hl=en-US&gl=US&ceid=US:en', source: 'Google News · Markets', kind: 'markets' },
];

export interface NewsItem {
  id: string; title: string; summary: string; link: string; source: string; kind: Feed['kind'];
  publishedAt: number; impact: 'HIGH' | 'MEDIUM' | 'LOW'; tags: string[]; category: string;
}

const entities = (s: string) => s
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, '&');
// Feeds often entity-encode their HTML (Google News does): decode first, then strip tags, twice.
const decode = (s: string) => entities(entities(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')).replace(/<[^>]+>/g, ' '))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ').trim();
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? '';

const HIGH = /\b(war|invasion|invade|missile|airstrike|strikes? on|attack|explosion|nuclear|coup|martial law|sanction|embargo|ceasefire|terror|assassinat|state of emergency|default(ed|s)?|bank run|collapse|rate (hike|cut|decision)|hikes rates|cuts rates|emergency (meeting|cut)|tariff|opec\+?|non-?farm|payrolls|cpi|inflation (data|report|surprise)|recession|downgrade|shutdown|intervention|snap election|resign)/i;
const MED = /\b(fed|fomc|powell|ecb|lagarde|boj|ueda|boe|bailey|rba|rbnz|snb|boc|pboc|yields?|treasur|gdp|pmi|jobs|unemployment|retail sales|stimulus|budget|election|crude|oil|gold|dollar|euro|yen|sterling|bitcoin|stocks?|equities|selloff|rally)/i;

const TAGS: [RegExp, string][] = [
  [/\b(fed|fomc|powell|u\.?s\.? (economy|inflation|jobs|treasur)|dollar|payrolls|white house|trump|washington)\b/i, 'USD'],
  [/\b(ecb|lagarde|euro(zone| area)?|germany|german|france|french|italy|eu)\b/i, 'EUR'],
  [/\b(boe|bailey|sterling|pound|uk|britain|british)\b/i, 'GBP'],
  [/\b(boj|ueda|yen|japan|japanese)\b/i, 'JPY'],
  [/\b(snb|swiss|franc|switzerland)\b/i, 'CHF'],
  [/\b(boc|canada|canadian|loonie)\b/i, 'CAD'],
  [/\b(rba|australia|aussie)\b/i, 'AUD'],
  [/\b(rbnz|new zealand|kiwi)\b/i, 'NZD'],
  [/\b(china|chinese|pboc|yuan|beijing)\b/i, 'CNY'],
  [/\b(gold|bullion)\b/i, 'XAU'],
  [/\b(oil|crude|opec|brent|wti)\b/i, 'OIL'],
  [/\b(bitcoin|crypto|ether(eum)?)\b/i, 'BTC'],
  [/\b(stocks?|equities|s&p|nasdaq|dow|wall street)\b/i, 'Indices'],
];
const CATEGORY: [RegExp, string][] = [
  [/\b(war|invasion|missile|airstrike|attack|military|troops|ceasefire|nuclear|coup|terror)\b/i, 'Geopolitics'],
  [/\b(fed|fomc|ecb|boj|boe|rba|rbnz|snb|boc|pboc|central bank|rate (hike|cut|decision))\b/i, 'Central banks'],
  [/\b(tariff|sanction|embargo|trade (war|deal))\b/i, 'Trade & sanctions'],
  [/\b(cpi|inflation|gdp|pmi|payrolls|jobs|unemployment|retail sales)\b/i, 'Economic data'],
  [/\b(election|government|president|prime minister|parliament|budget|shutdown)\b/i, 'Politics'],
  [/\b(oil|crude|opec|gold|commodit)\b/i, 'Commodities'],
  [/\b(bitcoin|crypto)\b/i, 'Crypto'],
];

let cache: { at: number; items: NewsItem[]; sources: Record<string, number | string> } | null = null;

async function readFeed(f: Feed): Promise<NewsItem[]> {
  const r = await fetch(f.url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrimePipFX/1.0)', Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const xml = await r.text();
  const items = xml.split(/<item[\s>]/i).slice(1).map((chunk) => chunk.split(/<\/item>/i)[0]);
  return items.map((it) => {
    const title = decode(tag(it, 'title'));
    let summary = decode(tag(it, 'description'));
    if (summary.length > 420) summary = `${summary.slice(0, 417).replace(/\s+\S*$/, '')}…`;
    const link = decode(tag(it, 'link')) || decode(tag(it, 'guid'));
    const publishedAt = Date.parse(decode(tag(it, 'pubDate')) || decode(tag(it, 'dc:date'))) || Date.now();
    const text = `${title} ${summary}`;
    const impact: NewsItem['impact'] = HIGH.test(text) ? 'HIGH' : MED.test(text) ? 'MEDIUM' : 'LOW';
    const tags = TAGS.filter(([re]) => re.test(text)).map(([, t]) => t).slice(0, 6);
    const category = CATEGORY.find(([re]) => re.test(text))?.[1] || (f.kind === 'world' ? 'World' : 'Markets');
    const source = f.source.startsWith('Google News') ? (decode(tag(it, 'source')) || 'Google News') : f.source;
    // Google News titles end with " - Publisher"; keep the headline clean.
    const cleanTitle = f.source.startsWith('Google News') ? title.replace(/\s+-\s+[^-]+$/, '') : title;
    return { id: `${publishedAt}-${cleanTitle.slice(0, 40)}`, title: cleanTitle, summary: summary === title || summary.startsWith(cleanTitle.slice(0, 40)) ? '' : summary, link, source, kind: f.kind, publishedAt, impact, tags, category };
  }).filter((x) => x.title && x.link);
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length > 3).slice(0, 8).join(' ');

export async function getBreakingNews(force = false) {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache;
  const sources: Record<string, number | string> = {};
  const results = await Promise.allSettled(FEEDS.map(async (f) => { const items = await readFeed(f); sources[f.source] = items.length; return items; }));
  results.forEach((r, i) => { if (r.status === 'rejected') sources[FEEDS[i].source] = String((r.reason as any)?.message || r.reason).slice(0, 60); });
  const seen = new Set<string>();
  const items = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((x) => x.publishedAt > Date.now() - 4 * 86400_000 && x.publishedAt < Date.now() + 3600_000)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((x) => { const k = norm(x.title); if (!k || seen.has(k)) return false; seen.add(k); return true; })
    // World feeds: keep only stories with some market relevance.
    .filter((x) => x.kind !== 'world' || x.impact !== 'LOW')
    .slice(0, 250);
  if (items.length || !cache) cache = { at: Date.now(), items, sources };
  return cache;
}

export const breakingNewsRouter = Router();
breakingNewsRouter.get('/breaking', async (_req, res) => {
  try {
    const c = await getBreakingNews();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.json({ ok: true, updatedAt: new Date(c.at).toISOString(), count: c.items.length, sources: c.sources, items: c.items });
  } catch (err: any) {
    res.status(503).json({ ok: false, error: err?.message || 'News feeds unavailable' });
  }
});

// ───────────────────────────────────────── Pakistan market news
// Live headlines that move (or explain moves in) the PSX / KSE-100, from Pakistani business desks plus
// targeted Google News searches. Business feeds are kept whole; general feeds are filtered for relevance.

interface PkFeed { url: string; source: string; kind: Feed['kind']; filter: boolean }
const PK_FEEDS: PkFeed[] = [
  { url: 'https://www.dawn.com/feeds/business', source: 'Dawn · Business', kind: 'markets', filter: false },
  { url: 'https://tribune.com.pk/feed/business', source: 'Express Tribune · Business', kind: 'markets', filter: false },
  { url: 'https://www.brecorder.com/feeds/markets', source: 'Business Recorder · Markets', kind: 'markets', filter: true },
  { url: 'https://www.brecorder.com/feeds/latest-news', source: 'Business Recorder', kind: 'markets', filter: true },
  { url: 'https://www.dawn.com/feeds/home', source: 'Dawn', kind: 'world', filter: true },
  { url: 'https://tribune.com.pk/feed/home', source: 'Express Tribune', kind: 'world', filter: true },
  { url: 'https://news.google.com/rss/search?q=(PSX+OR+KSE-100+OR+%22Pakistan+Stock+Exchange%22+OR+%22State+Bank+of+Pakistan%22)+when:2d&hl=en-PK&gl=PK&ceid=PK:en', source: 'Google News · PSX', kind: 'markets', filter: false },
  { url: 'https://news.google.com/rss/search?q=Pakistan+(IMF+OR+budget+OR+rupee+OR+inflation+OR+FBR+OR+%22petrol+price%22+OR+%22circular+debt%22)+when:2d&hl=en-PK&gl=PK&ceid=PK:en', source: 'Google News · Economy', kind: 'markets', filter: false },
];

const PK_HIGH = /\b(sbp|state bank|policy rate|monetary policy|interest rate|imf|budget|kse-?100|circuit breaker|psx|rupee|pkr|default|eurobond|rollover|sifc|moody'?s|fitch|credit rating|petrol price|diesel price|circular debt|nepra|ogra|martial law|ceasefire|india|afghanistan|border|attack|martyr|terror|protest|long march|constitutional amendment|election|army chief|floods?)\b/i;
const PK_MED = /\b(pakistan|karachi|lahore|islamabad|stocks?|shares?|bourse|index|dividend|earnings|profit|fbr|tax|remittances?|exports?|imports?|current account|reserves|inflation|cpi|gdp|cement|fertili[sz]er|urea|textile|cotton|banks?|oil|gas|power|tariff|electricity|ogdc|ppl|hubco|engro|lucky|mari|auto|car sales|it exports|privati[sz]ation|pia|t-?bills?|pibs?|sukuk|china|saudi|uae|loan|aid)\b/i;
const PK_CONTEXT = /\b(pakistan|pakistani|psx|kse|sbp|state bank|karachi|lahore|islamabad|rupee|fbr|nepra|ogra|imf)\b/i;
const PK_POS = /\b(rally|surge|gains?|jumps?|record high|upgrade|rate cut|cuts? (the )?(policy )?rate|slash(es)?|approves?|tranche|rollover|inflows?|rises?|up \d|buying|boost|recover|easing|ease|improv)/i;
const PK_NEG = /\b(crash|plunge|tumbles?|slump|falls?|drops?|downgrade|rate hike|hikes?|default|attack|martyr|terror|tension|protest|loss|selling|decline|decreases?|shortfall|deficit|surge in (inflation|prices)|crisis|flood|shutdown)\b/i;
const PK_SECTORS: [RegExp, string][] = [
  [/\b(sbp|state bank|policy rate|interest rate|banks?|t-?bills?|pibs?|sukuk|monetary)\b/i, 'Banks & rates'],
  [/\b(oil|petrol|diesel|ogra|gas|ogdc|ppl|mari|refiner|opec|lng|crude)\b/i, 'Oil & gas'],
  [/\b(power|nepra|circular debt|electricity|ipp|hubco|k-electric|tariff|load.?shedding)\b/i, 'Power'],
  [/\b(cement|construction|housing)\b/i, 'Cement'],
  [/\b(fertili[sz]er|urea|dap|engro|ffc|fatima)\b/i, 'Fertilizer'],
  [/\b(car sales|auto|tractor|suzuki|honda|toyota|indus motor)\b/i, 'Autos'],
  [/\b(textile|cotton|apparel|export(s)? of)\b/i, 'Textile & exports'],
  [/\b(it exports|software|tech|systems limited|trg)\b/i, 'Technology'],
  [/\b(imf|budget|fbr|tax|rupee|pkr|inflation|cpi|reserves|remittances?|current account|gdp|rating|eurobond|rollover|debt)\b/i, 'Macro & IMF'],
  [/\b(election|protest|pti|army|martial|ceasefire|india|afghanistan|border|attack|martyr|terror|amendment|court)\b/i, 'Politics & security'],
  [/\b(psx|kse-?100|bourse|stocks?|shares?|index|circuit breaker|dividend|earnings)\b/i, 'Stock market'],
];

export interface PkNewsItem extends Omit<NewsItem, 'tags'> { sectors: string[]; tone: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' }

let pkCache: { at: number; items: PkNewsItem[]; sources: Record<string, number | string> } | null = null;

export async function getPakistanNews(force = false) {
  if (!force && pkCache && Date.now() - pkCache.at < 90_000) return pkCache;
  const sources: Record<string, number | string> = {};
  const results = await Promise.allSettled(PK_FEEDS.map(async (f) => {
    const items = await readFeed({ url: f.url, source: f.source, kind: f.kind });
    sources[f.source] = items.length;
    return items.filter((x) => !f.filter || PK_CONTEXT.test(`${x.title} ${x.summary}`));
  }));
  results.forEach((r, i) => { if (r.status === 'rejected') sources[PK_FEEDS[i].source] = String((r.reason as any)?.message || r.reason).slice(0, 60); });
  const seen = new Set<string>();
  const items: PkNewsItem[] = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((x) => x.publishedAt > Date.now() - 3 * 86400_000 && x.publishedAt < Date.now() + 3600_000)
    .sort((a, b) => b.publishedAt - a.publishedAt)
    .filter((x) => { const k = norm(x.title); if (!k || seen.has(k)) return false; seen.add(k); return true; })
    .map((x) => {
      const text = `${x.title} ${x.summary}`;
      const impact: NewsItem['impact'] = PK_HIGH.test(text) ? 'HIGH' : PK_MED.test(text) ? 'MEDIUM' : 'LOW';
      const pos = PK_POS.test(x.title), neg = PK_NEG.test(x.title);
      const tone: PkNewsItem['tone'] = pos && !neg ? 'POSITIVE' : neg && !pos ? 'NEGATIVE' : 'NEUTRAL';
      const sectors = PK_SECTORS.filter(([re]) => re.test(text)).map(([, s]) => s).slice(0, 3);
      const { tags: _t, ...rest } = x;
      return { ...rest, impact, tone, sectors, category: sectors[0] || 'Pakistan' };
    })
    .filter((x) => x.impact !== 'LOW')
    .slice(0, 150);
  if (items.length || !pkCache) pkCache = { at: Date.now(), items, sources };
  return pkCache;
}

breakingNewsRouter.get('/pakistan', async (_req, res) => {
  try {
    const c = await getPakistanNews();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    res.json({ ok: true, updatedAt: new Date(c.at).toISOString(), count: c.items.length, sources: c.sources, items: c.items });
  } catch (err: any) {
    res.status(503).json({ ok: false, error: err?.message || 'Pakistan news feeds unavailable' });
  }
});
