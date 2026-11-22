import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { getStoredToken } from '../utils/authClient';

/** Shows an admin security warning (account sharing) until the user acknowledges it. */
export const SecurityWarningModal: React.FC<{ userId?: string }> = ({ userId }) => {
  const [w, setW] = useState<{ id: string; message: string } | null>(null);
  useEffect(() => {
    if (!userId) { setW(null); return; }
    const token = getStoredToken(); if (!token) return;
    let off = false;
    const check = () => fetch('/api/security/my-warnings', { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' }).then((r) => r.json()).then((j) => { if (!off && j?.warnings?.[0]) setW(j.warnings[0]); }).catch(() => undefined);
    const t0 = setTimeout(check, 4000); const iv = setInterval(check, 120000);
    return () => { off = true; clearTimeout(t0); clearInterval(iv); };
  }, [userId]);
  if (!w) return null;
  const ack = () => { const token = getStoredToken(); void fetch('/api/security/ack', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, credentials: 'include', body: JSON.stringify({ id: w.id }) }).catch(() => undefined); setW(null); };
  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 p-4" role="alertdialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-red-500/50 bg-slate-900 p-5 shadow-2xl">
        <div className="mb-2 flex items-center gap-2 text-red-400"><ShieldAlert className="h-6 w-6" /><h2 className="text-lg font-bold">Security warning</h2></div>
        <p className="text-sm leading-relaxed text-slate-200">{w.message}</p>
        <button onClick={ack} className="mt-4 w-full rounded-lg bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500">I understand</button>
      </div>
    </div>
  );
};
