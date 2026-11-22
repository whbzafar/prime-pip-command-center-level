import React, { useState } from 'react';
import { Sparkles, Eye } from 'lucide-react';
import { NewEraWelcome } from '../welcome/NewEraWelcome';

/** Admin-only: shows the first-subscription "Welcome to a New Era" pop-up exactly as a new subscriber sees it (nothing is saved or marked as seen). */
export function PopupPreviewPanel({ adminName }: { adminName?: string }) {
  const [open, setOpen] = useState(false);
  const [asName, setAsName] = useState(adminName || 'Ahmed');
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-fuchsia-500/25 bg-slate-950/70 p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Sparkles className="h-5 w-5 text-fuchsia-300" /> Pop-up Preview</h3>
        <p className="mt-1 text-sm text-slate-300">This is the pop-up a student sees once, right after their first subscription, when they reach the main dashboard. Previewing it here does not affect any student and is never recorded as "seen".</p>
        <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-400">Preview as (first name)</label>
        <input value={asName} onChange={(e) => setAsName(e.target.value)} maxLength={30} className="mt-1 w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-fuchsia-400" />
        <div className="mt-4">
          <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg">
            <Eye className="h-4 w-4" /> Preview "Welcome to a New Era"
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">Tip: sound plays during the preview (muted with the button top-right). Press "Enter the New Era" to close it.</p>
      </div>
      {open && <NewEraWelcome name={asName} onEnter={() => setOpen(false)} onFounder={() => { setOpen(false); window.dispatchEvent(new Event('ppfx-open-founder')); }} />}
    </div>
  );
}
