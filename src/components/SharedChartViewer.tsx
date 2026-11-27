import React, { useEffect, useState } from 'react';

const PineMainChart = React.lazy(() => import('./pine/PineMainChart'));

/** Public, read-only page behind a chart share link (/?chart=ID). */
export const SharedChartViewer: React.FC<{ id: string }> = ({ id }) => {
  const [doc, setDoc] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let off = false;
    fetch(`/api/public/charts/${encodeURIComponent(id)}`).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (off) return;
      if (!r.ok) setErr(j.error || 'This chart link is not available'); else setDoc(j);
    }).catch(() => { if (!off) setErr('Could not load the chart'); });
    return () => { off = true; };
  }, [id]);
  const tvSrc = doc && doc.engine === 'tv'
    ? `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(doc.symbol)}&interval=${encodeURIComponent(doc.interval || '60')}&theme=dark&style=1&hide_side_toolbar=0&allow_symbol_change=1&withdateranges=1&save_image=1`
    : '';
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b1220', display: 'flex', flexDirection: 'column', color: '#e2e8f0', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: '1px solid #1e293b', fontSize: 13 }}>
        <b>Prime Pip FX</b>
        <span style={{ color: '#94a3b8' }}>{doc ? `Shared chart · ${doc.symbol} · ${doc.interval}` : 'Shared chart'}</span>
        <a href="/" style={{ marginLeft: 'auto', color: '#22d3ee', textDecoration: 'none', fontWeight: 700 }}>Open Prime Pip FX</a>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        {err && <div style={{ padding: 24, color: '#fca5a5' }}>{err}</div>}
        {!err && !doc && <div style={{ padding: 24, color: '#94a3b8' }}>Loading chart…</div>}
        {doc && doc.engine === 'tv' && <iframe title="Shared chart" src={tvSrc} style={{ width: '100%', height: '100%', border: 0 }} />}
        {doc && doc.engine !== 'tv' && (
          <React.Suspense fallback={<div style={{ padding: 24, color: '#94a3b8' }}>Loading chart…</div>}>
            <PineMainChart symbol={doc.symbol} interval={doc.interval} sharedDoc={doc.drawings ?? { drawings: [] }} viewOnly />
          </React.Suspense>
        )}
      </div>
    </div>
  );
};
export default SharedChartViewer;
