import { Router } from 'express';

const router = Router();

const FEEDS = [
  { name: 'DailyFX', url: 'https://www.dailyfx.com/feeds/market-news' },
  { name: 'FXStreet', url: 'https://www.fxstreet.com/rss/news' },
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news_25.rss' },
];

function text(value: string | undefined): string {
  return (value || '').replace(/<![CDATA[([\s\S]*?)]]>/g, '$1').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
}

function parseRss(xml: string, source: string) {
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].slice(0, 20).map((match, index) => {
    const item = match[0];
    const get = (tag: string) => text(item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
    const link = get('link') || text(item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]);
    return {
      id: `${source}-${index}-${Buffer.from(link || get('title')).toString('base64').slice(0, 16)}`,
      title: get('title') || 'Untitled headline',
      source,
      url: link,
      publishedAt: get('pubDate') || get('published') || null,
    };
  }).filter((item) => item.title !== 'Untitled headline');
}

router.get('/news', async (_req, res) => {
  const results: any[] = [];
  const errors: string[] = [];

  await Promise.all(FEEDS.map(async (feed) => {
    try {
      const response = await fetch(feed.url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      results.push(...parseRss(await response.text(), feed.name));
    } catch (error: any) {
      errors.push(`${feed.name}: ${error?.message || 'Unavailable'}`);
    }
  }));

  results.sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')));
  return res.json({ ok: results.length > 0, sourceConfigured: true, fetchedAt: new Date().toISOString(), items: results.slice(0, 50), errors });
});

router.get('/calendar', async (_req, res) => {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, sourceConfigured: false, items: [], error: 'Economic calendar is not configured. Add FMP_API_KEY on the server.' });
  }

  try {
    const from = new Date();
    const to = new Date(Date.now() + 7 * 86400000);
    const format = (date: Date) => date.toISOString().slice(0, 10);
    const url = `https://financialmodelingprep.com/api/v3/economic_calendar?from=${format(from)}&to=${format(to)}&apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`FMP HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload) ? payload.map((event: any) => ({
      date: event.date || null,
      event: event.event || event.name || 'Unknown event',
      country: event.country || null,
      currency: event.currency || null,
      impact: event.impact || null,
      forecast: event.estimate ?? event.forecast ?? null,
      actual: event.actual ?? null,
      previous: event.previous ?? null,
    })) : [];
    return res.json({ ok: true, sourceConfigured: true, timezone: 'Asia/Karachi', fetchedAt: new Date().toISOString(), items });
  } catch (error: any) {
    return res.status(502).json({ ok: false, sourceConfigured: true, items: [], error: error?.message || 'Economic calendar provider unavailable.' });
  }
});

router.get('/sessions', (_req, res) => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  const minutes = hour * 60 + minute;
  const sessions = [
    { name: 'Sydney', start: 22 * 60, end: 7 * 60 },
    { name: 'Tokyo', start: 0, end: 9 * 60 },
    { name: 'London', start: 8 * 60, end: 17 * 60 },
    { name: 'New York', start: 13 * 60, end: 22 * 60 },
  ].map((session) => ({ ...session, status: session.start <= session.end ? (minutes >= session.start && minutes < session.end ? 'ACTIVE' : 'CLOSED') : (minutes >= session.start || minutes < session.end ? 'ACTIVE' : 'CLOSED') }));
  return res.json({ ok: true, timezone: 'Asia/Karachi', fetchedAt: now.toISOString(), sessions });
});

export default router;
