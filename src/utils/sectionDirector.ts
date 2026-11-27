/* Section director: reads the real page of the section being recorded and decides what the camera shows.
   It finds the element that actually scrolls, lists the section's real parts (headings, cards, inner tabs)
   in top-to-bottom order, and turns each part's on-screen box into a camera crop on the captured video.
   Nothing is guessed from a fixed "left/centre/right": every shot points at a real element. */

export interface Box { x: number; y: number; w: number; h: number }
export interface Beat { el: HTMLElement; label: string; click?: HTMLElement }

/** Inner tabs the agent may click to show more of a section. Anything that could trade, pay or delete is never clicked. */
export const DANGEROUS = /\b(buy|sell|close|delete|remove|log ?out|sign ?out|place|order|execute|pay|subscribe|purchase|reset|clear|cancel|confirm|submit|send|withdraw|deposit)\b/i;

const clean = (s: string | null | undefined, max = 46) => {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/** Crop on the captured frame that frames `r` (in video pixels) at the target aspect ratio, with padding,
 *  never zooming past `minFrac` of the frame width and never leaving the frame. Pure, so it is unit tested. */
export function fitCrop(r: Box, aspect: number, vw: number, vh: number, pad = 0.12, minFrac = 0.3, maxFrac = 0.42): Box {
  // capped at maxFrac of the frame so text stays readable on a phone; wider parts are panned across instead
  const maxW = Math.min(vw * maxFrac, vh * aspect, vw);
  let w = Math.max(r.w * (1 + pad * 2), r.h * (1 + pad * 2) * aspect, vw * minFrac);
  w = Math.min(w, maxW);
  const h = w / aspect;
  const cx = r.w > w ? r.x + w / 2 - w * pad * 0.5 : r.x + r.w / 2;
  // tall parts: frame their top, where the title and the key numbers are
  const cy = r.h > h ? r.y + h / 2 - h * pad * 0.5 : r.y + r.h / 2;
  const x = Math.min(vw - w, Math.max(0, cx - w / 2));
  const y = Math.min(vh - h, Math.max(0, cy - h / 2));
  return { x, y, w, h };
}

/** Whole-frame crop at the target aspect ratio (intro, outro, fallback). */
export function fullCrop(aspect: number, vw: number, vh: number): Box {
  const w = Math.min(vw, vh * aspect); const h = w / aspect;
  return { x: (vw - w) / 2, y: 0, w, h };
}

/** Keeps parts in reading order, drops ones that overlap an earlier pick, and spreads the picks over the whole
 *  section when there are more than `max`. Pure (works on plain tops/heights), so it is unit tested. */
export function chooseParts<T extends { top: number; height: number }>(parts: T[], max = 9, minGap = 90): T[] {
  const sorted = [...parts].sort((a, b) => a.top - b.top);
  const kept: T[] = [];
  for (const p of sorted) { const last = kept[kept.length - 1]; if (!last || p.top - last.top >= minGap) kept.push(p); }
  if (kept.length <= max) return kept;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(kept[Math.round((i * (kept.length - 1)) / (max - 1))]);
  return Array.from(new Set(out));
}

/** The element that really scrolls this section: the page itself, or an inner panel that holds more content. */
export function findScroller(): HTMLElement {
  const page = (document.scrollingElement || document.documentElement) as HTMLElement;
  let best: HTMLElement = page; let bestExtra = page.scrollHeight - page.clientHeight;
  document.querySelectorAll<HTMLElement>('main *, [data-scroll-root]').forEach((el) => {
    if (el.closest('[role="dialog"]')) return;
    const extra = el.scrollHeight - el.clientHeight;
    if (extra < 200 || el.clientHeight < window.innerHeight * 0.45) return;
    const oy = getComputedStyle(el).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') return;
    if (extra > bestExtra) { best = el; bestExtra = extra; }
  });
  return best;
}

const visible = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  if (r.width < 140 || r.height < 24) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05;
};
const outside = (el: HTMLElement) => !!el.closest('[role="dialog"], nav, header, aside, footer, [data-tour-skip]');

/** Lists the parts of the open section in reading order: every heading's card, plus up to three safe inner tabs. */
/** Every inner tab (sub-category) of the open section, so a recording can show each one — never anything that could trade, pay or delete. */
export function discoverTabBeats(max = 8): Beat[] {
  const root = (document.querySelector('main') as HTMLElement | null) || document.body; const seen = new Set<string>(); const out: Beat[] = [];
  root.querySelectorAll<HTMLElement>('[role="tab"]').forEach((t) => {
    if (out.length >= max || outside(t) || !visible(t) || DANGEROUS.test(t.textContent || '')) return;
    const label = clean(t.textContent); if (label.length < 2 || label.length > 40 || seen.has(label.toLowerCase())) return; seen.add(label.toLowerCase());
    out.push({ el: (t.closest('[role="tablist"]') as HTMLElement | null)?.parentElement || t, label, click: t });
  });
  return out;
}

export function discoverBeats(scroller: HTMLElement, sectionTitle: string, max = 9): Beat[] {
  const root = (document.querySelector('main') as HTMLElement | null) || document.body;
  const sTop = scroller === document.scrollingElement || scroller === document.documentElement ? 0 : scroller.getBoundingClientRect().top;
  const offset = scroller.scrollTop;
  const vh = window.innerHeight;
  const parts: { top: number; height: number; beat: Beat }[] = [];
  const used = new Set<HTMLElement>();
  root.querySelectorAll<HTMLElement>('h1, h2, h3, h4, [role="heading"]').forEach((h) => {
    if (outside(h) || !visible(h)) return;
    const label = clean(h.textContent);
    if (label.length < 3) return;
    let block = (h.closest('section, article, [class*="rounded"]') as HTMLElement | null) || h.parentElement || h;
    if (block.getBoundingClientRect().height > vh * 1.6 || block === root) block = h.parentElement || h;
    if (used.has(block)) return;
    used.add(block);
    const r = block.getBoundingClientRect();
    parts.push({ top: r.top - sTop + offset, height: r.height, beat: { el: block, label } });
  });
  // sections built without headings: use the big cards
  if (parts.length < 3) {
    root.querySelectorAll<HTMLElement>('[class*="rounded"]').forEach((c) => {
      if (outside(c) || used.has(c) || !visible(c)) return;
      const r = c.getBoundingClientRect();
      if (r.width < window.innerWidth * 0.3 || r.height < 140 || r.height > vh * 1.6) return;
      if ([...used].some((u) => u.contains(c) || c.contains(u))) return;
      used.add(c);
      const label = clean(c.querySelector('h1,h2,h3,h4,strong,b,[class*="font-bold"]')?.textContent) || sectionTitle;
      parts.push({ top: r.top - sTop + offset, height: r.height, beat: { el: c, label } });
    });
  }
  const chosen = chooseParts(parts, Math.max(1, max - 2)).map((p) => p.beat);
  // inner tabs (charts, timeframes, sub-views): show up to three of them, never anything risky
  const tabs = [...root.querySelectorAll<HTMLElement>('[role="tab"]')]
    .filter((t) => !outside(t) && visible(t) && t.getAttribute('aria-selected') !== 'true' && !DANGEROUS.test(t.textContent || '') && clean(t.textContent).length > 1)
    .slice(0, 3);
  const tabBeats: Beat[] = tabs.map((t) => ({ el: (t.closest('[role="tablist"]') as HTMLElement | null)?.parentElement || t, label: clean(t.textContent), click: t }));
  return [...chosen.slice(0, 2), ...tabBeats, ...chosen.slice(2)].slice(0, max);
}

/** Splits a pattern on its top-level "|" so the most specific wording (written first) can be tried first. */
export function altsOf(re: RegExp): RegExp[] {
  const src = re.source; const out: string[] = []; let depth = 0; let cur = ''; let esc = false; let cls = false;
  for (const ch of src) {
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\') { cur += ch; esc = true; continue; }
    if (cls) { cur += ch; if (ch === ']') cls = false; continue; }
    if (ch === '[') { cls = true; cur += ch; continue; }
    if (ch === '(') depth++; if (ch === ')') depth--;
    if (ch === '|' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  const flags = re.flags.includes('i') ? re.flags : `${re.flags}i`;
  return out.filter(Boolean).map((a) => new RegExp(a, flags));
}

/** Finds the on-screen element whose visible text matches `re` and returns the card around it as a camera target.
 *  The first alternative of the pattern wins over later ones (so "ACCOUNT BALANCE" beats a stray "PKR" in a banner).
 *  Used so every narrated line can point at the exact feature it talks about, even when the screen has no headings. */
export function findByText(re: RegExp, avoid: HTMLElement[] = []): Beat | null {
  const root = (document.querySelector('main') as HTMLElement | null) || document.body;
  // page chrome (menus, footers, dialogs) is skipped, but a header or aside that sits inside the section itself is content
  const hidden = (e: HTMLElement) => { const x = e.closest('[role="dialog"], nav, header, aside, footer, [data-tour-skip]'); return !!x && !(root.contains(x) && x !== root); };
  const vh = window.innerHeight;
  for (const alt of altsOf(re)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const txt = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt.length < 3 || !alt.test(txt)) continue;
      let el = n.parentElement as HTMLElement | null; if (!el || el.closest('script, style')) continue;
      if (el.tagName === 'OPTION') el = el.closest('select'); // filter lists: frame the dropdown itself
      if (!el || hidden(el)) continue;
      // climb to a card that is big enough to frame, but not the whole page
      let card: HTMLElement | null = el;
      for (let i = 0; i < 7 && card; i++) {
        const r = card.getBoundingClientRect();
        if (r.width >= 200 && r.height >= 56) break;
        card = card.parentElement;
      }
      if (!card || card === root || hidden(card) || !visible(card)) continue;
      // a label inside a huge panel: frame just the row around the label, not the whole panel
      if (card.getBoundingClientRect().height > vh * 0.55) { const up = el.parentElement?.parentElement; card = up && !hidden(up) && visible(up) ? up : el; if (card.getBoundingClientRect().height > vh * 0.8) card = el; }
      const clash = (c: HTMLElement) => avoid.some((a) => a === c || a.contains(c) || c.contains(a));
      if (!clash(card)) return { el: card, label: clean(txt) };
      // the roomy card is already used by another line: frame the exact control or label instead
      const tight = (el.closest('button, select, a, input, [role="tab"], [role="button"]') as HTMLElement | null) || el;
      const tr = tight.getBoundingClientRect();
      if (tr.width >= 40 && tr.height >= 16 && !hidden(tight) && !avoid.some((a) => a === tight)) return { el: tight, label: clean(txt) };
    }
  }
  return null;
}

/** Smoothly brings a part into view inside its scroller, a little above centre so the camera has room. */
export function bringIntoView(scroller: HTMLElement, el: HTMLElement) {
  const isPage = scroller === document.scrollingElement || scroller === document.documentElement;
  const r = el.getBoundingClientRect();
  const viewH = isPage ? window.innerHeight : scroller.clientHeight;
  const sTop = isPage ? 0 : scroller.getBoundingClientRect().top;
  const want = scroller.scrollTop + (r.top - sTop) - Math.max(16, (viewH - Math.min(r.height, viewH)) * 0.35);
  const top = Math.max(0, Math.min(scroller.scrollHeight - viewH, want));
  if (isPage) window.scrollTo({ top, behavior: 'smooth' }); else scroller.scrollTo({ top, behavior: 'smooth' });
}

export function scrollToTop(scroller: HTMLElement) {
  const isPage = scroller === document.scrollingElement || scroller === document.documentElement;
  if (isPage) window.scrollTo({ top: 0, behavior: 'smooth' }); else scroller.scrollTo({ top: 0, behavior: 'smooth' });
}

/** An element's current box in captured-video pixels (the captured tab is the browser viewport). */
export function toVideo(el: HTMLElement, vw: number, vh: number): Box | null {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const sx = vw / window.innerWidth; const sy = vh / window.innerHeight;
  const x = Math.max(0, r.left * sx); const y = Math.max(0, r.top * sy);
  const w = Math.min(vw - x, r.width * sx); const h = Math.min(vh - y, r.height * sy);
  return w > 4 && h > 4 ? { x, y, w, h } : null;
}

/** Camera pan across a part larger than the shot: starts at its top-left, ends at its bottom-right. `k` is 0..1. */
export function panCrop(r: Box, crop: Box, vw: number, vh: number, k: number): Box {
  const x0 = Math.max(0, Math.min(vw - crop.w, r.x - crop.w * 0.04)); const x1 = Math.max(0, Math.min(vw - crop.w, r.x + r.w - crop.w * 0.96));
  const y0 = Math.max(0, Math.min(vh - crop.h, r.y - crop.h * 0.04)); const y1 = Math.max(0, Math.min(vh - crop.h, r.y + r.h - crop.h * 0.96));
  const px = r.w > crop.w ? x0 + (Math.max(x0, x1) - x0) * k : crop.x; const py = r.h > crop.h ? y0 + (Math.max(y0, y1) - y0) * k : crop.y;
  return { ...crop, x: px, y: py };
}
