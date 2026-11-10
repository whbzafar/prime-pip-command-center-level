/** Indicator grouping + a search/filter bar for the chart library's own Indicator dialog. */
// Built-in studies sorted into the groups traders look for.
export const IND_CATS = ['Trend', 'Momentum', 'Volatility', 'Volume', 'Other'] as const;
export function indCategory(n: any): string {
  const k = `${n?.type || ''} ${n?.title || ''}`.toUpperCase();
  if (/VOL|OBV|VWAP|MFI|CMF|PVT|EMV|VR\b|AD\b|ACCUM|MONEY FLOW|CHAIKIN|NVI|PVI/.test(k)) return 'Volume';
  if (/ATR|BOLL|BB\b|BANDS?|KELTNER|KC\b|DONCHIAN|DC\b|STD|DEVIATION|VOLATIL|ENVELOPE|CHANNEL/.test(k)) return 'Volatility';
  if (/RSI|MACD|KDJ|STOCH|CCI|WR\b|WILLIAMS|MTM|MOMENTUM|ROC|TRIX|AO\b|AWESOME|BIAS|PSY|BRAR|CR\b|DMI|ADX|DPO|OSC|CMO|ULTIMATE|TSI|FISHER|RVI/.test(k)) return 'Momentum';
  if (/MA\b|EMA|SMA|WMA|HMA|DEMA|TEMA|AVL|SAR|ICHIMOKU|SUPERTREND|AVERAGE|TREND|ZIGZAG|ALLIGATOR|BBI|PIVOT/.test(k)) return 'Trend';
  return 'Other';
}


/**
 * The chart library (Unlimited Charts) opens its own "Indicator" dialog: one long list of checkboxes.
 * This adds a search box and category chips to it, and a small category tag on each row.
 * Returns a cleanup function.
 */
export function enhanceIndicatorDialogs(host: HTMLElement): () => void {
  const apply = (list: HTMLElement) => {
    if (list.dataset.ppfxEnhanced) return;
    list.dataset.ppfxEnhanced = '1';
    const rows = Array.from(list.querySelectorAll<HTMLElement>('.row')).filter((r) => !r.classList.contains('title'));
    for (const r of rows) {
      const cat = indCategory({ type: r.textContent || '' });
      r.dataset.ppfxCat = cat;
      const tag = document.createElement('span');
      tag.textContent = cat;
      tag.style.cssText = 'margin-left:auto;font-size:10px;opacity:.55;padding-left:8px;white-space:nowrap';
      r.appendChild(tag);
    }
    const bar = document.createElement('div');
    bar.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin:0 0 8px';
    const input = document.createElement('input');
    input.placeholder = 'Search indicators — e.g. RSI, MACD, Bollinger';
    input.setAttribute('aria-label', 'Search indicators');
    input.setAttribute('data-testid', 'lib-indicator-search');
    input.style.cssText = 'width:100%;padding:7px 10px;border-radius:8px;border:1px solid #3b4252;background:#131722;color:#e5e7eb;font-size:13px;outline:none';
    const chips = document.createElement('div');
    chips.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px';
    let cat = 'All';
    const filter = () => {
      const q = input.value.trim().toLowerCase();
      for (const r of rows) r.style.display = (cat === 'All' || r.dataset.ppfxCat === cat) && (!q || (r.textContent || '').toLowerCase().includes(q)) ? '' : 'none';
      for (const t of Array.from(list.querySelectorAll<HTMLElement>('.title'))) {
        let n = t.nextElementSibling as HTMLElement | null; let any = false;
        while (n && !n.classList.contains('title')) { if (n.style.display !== 'none') any = true; n = n.nextElementSibling as HTMLElement | null; }
        t.style.display = any ? '' : 'none';
      }
      for (const c of Array.from(chips.children) as HTMLElement[]) { const on = c.dataset.cat === cat; c.style.background = on ? '#2962FF' : 'transparent'; c.style.color = on ? '#fff' : '#9ca3af'; c.style.borderColor = on ? '#2962FF' : '#3b4252'; }
    };
    for (const c of ['All', ...IND_CATS.filter((k) => rows.some((r) => r.dataset.ppfxCat === k))]) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = c === 'All' ? 'All' : `${c} ${rows.filter((r) => r.dataset.ppfxCat === c).length}`; b.dataset.cat = c;
      b.style.cssText = 'padding:2px 8px;border-radius:6px;border:1px solid #3b4252;font-size:11px;font-weight:600;cursor:pointer;background:transparent;color:#9ca3af';
      b.onclick = (e) => { e.stopPropagation(); cat = c; filter(); };
      chips.appendChild(b);
    }
    input.oninput = filter;
    input.onkeydown = (e) => e.stopPropagation();
    bar.appendChild(input); bar.appendChild(chips);
    list.parentElement?.insertBefore(bar, list);
    filter();
    setTimeout(() => input.focus(), 50);
  };
  const scan = () => document.querySelectorAll<HTMLElement>('.klinecharts-pro-indicator-modal-list').forEach((l) => { if (host.contains(l) || document.body.contains(l)) apply(l); });
  const mo = new MutationObserver(scan);
  mo.observe(document.body, { childList: true, subtree: true });
  scan();
  return () => mo.disconnect();
}
