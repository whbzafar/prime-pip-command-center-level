import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import { getStoredToken } from '../utils/authClient';
import type { UserAccount } from '../types';

const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'];

/** Required once for every member: province + city (country and WhatsApp optional). Saved to the account and shown to the owner in Admin → Members. */
export const LocationPromptModal: React.FC<{ user: UserAccount; onSaved: (u: UserAccount) => void }> = ({ user, onSaved }) => {
  const [province, setProvince] = useState(user.province || '');
  const [city, setCity] = useState(user.city || '');
  const [country, setCountry] = useState(user.country || '');
  const [whatsapp, setWhatsapp] = useState(user.whatsapp || '');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const input = 'w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2.5 text-[15px] text-slate-100 outline-none focus:border-amber-300';
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (province.trim().length < 2) return setErr('Please enter your province.');
    if (city.trim().length < 2) return setErr('Please enter your city.');
    setBusy(true);
    try {
      const t = getStoredToken();
      const r = await fetch('/api/user/location', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: JSON.stringify({ province, city, country, whatsapp }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || 'Could not save. Please try again.');
      onSaved({ ...user, ...j.user });
    } catch (e2: any) { setErr(String(e2?.message || e2)); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="loc-title" data-testid="location-prompt">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-2xl border border-amber-400/40 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-center gap-2"><MapPin className="h-6 w-6 text-amber-300" /><h2 id="loc-title" className="text-lg font-black text-white">Where are you trading from?</h2></div>
        <p className="text-[13px] leading-relaxed text-slate-300">To keep every student account safe and protect our community from scams, please confirm your location. This is seen only by the PrimePipFX owner.</p>
        <label className="block text-[12px] font-semibold text-slate-300">Province / State <span className="text-rose-300">*</span>
          <input list="ppfx-provinces" value={province} onChange={(e) => setProvince(e.target.value)} className={`${input} mt-1`} placeholder="e.g. Punjab" autoComplete="address-level1" required />
          <datalist id="ppfx-provinces">{PROVINCES.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <label className="block text-[12px] font-semibold text-slate-300">City <span className="text-rose-300">*</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={`${input} mt-1`} placeholder="e.g. Lahore" autoComplete="address-level2" required />
        </label>
        <label className="block text-[12px] font-semibold text-slate-300">Country <span className="font-normal text-slate-500">(optional)</span>
          <input value={country} onChange={(e) => setCountry(e.target.value)} className={`${input} mt-1`} placeholder="e.g. Pakistan" autoComplete="country-name" />
        </label>
        <label className="block text-[12px] font-semibold text-slate-300">WhatsApp number <span className="font-normal text-slate-500">(optional)</span>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={`${input} mt-1`} placeholder="e.g. +92 300 1234567" inputMode="tel" autoComplete="tel" />
        </label>
        {err && <p className="text-[13px] text-rose-300" role="alert">{err}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-amber-400 py-3 text-[15px] font-black text-slate-900 disabled:opacity-60">{busy ? 'Saving…' : 'Save and continue'}</button>
      </form>
    </div>
  );
};
