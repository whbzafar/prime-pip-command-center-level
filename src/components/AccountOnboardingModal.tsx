import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { AccountSettings } from '../types';
import { CreateAccountWizard } from './account/CreateAccountWizard';

interface AccountOnboardingModalProps {
  onAccountCreated: (account: AccountSettings) => void;
  onExploreDemo?: () => void;
  onOpenSignIn?: () => void;
  onOpenSendAccount?: () => void;
  onClose?: () => void;
}

export const AccountOnboardingModal: React.FC<AccountOnboardingModalProps> = ({
  onAccountCreated,
  onExploreDemo,
  onOpenSignIn,
  onOpenSendAccount,
  onClose,
}) => {
  const [isSendAccountOpen, setIsSendAccountOpen] = useState(false);
  const [sendName, setSendName] = useState('');
  const [sendPhone, setSendPhone] = useState('');
  const [sendNotes, setSendNotes] = useState('');
  const [sendSuccess, setSendSuccess] = useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (typeof document !== 'undefined') {
      document.body.scrollTop = 0;
      document.documentElement.scrollTop = 0;
    }
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      if (containerRef.current) containerRef.current.scrollTop = 0;
    }, 40);
    return () => clearTimeout(timer);
  }, []);

  const modalContent = (
    <div
      ref={containerRef}
      className="w-full min-h-screen min-h-[100dvh] bg-[#030712] text-slate-100 flex flex-col items-center justify-start p-3 sm:p-6 pt-3 sm:pt-5 overflow-y-auto selection:bg-cyan-500/30 selection:text-cyan-200 relative"
    >
      <div className="w-full max-w-4xl space-y-4 pb-12">
        {/* Master Create Account Wizard */}
        <CreateAccountWizard
          onAccountCreated={onAccountCreated}
          onCancel={onClose}
        />

        {/* Bottom Utility Bar */}
        <div className="px-5 py-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            {onOpenSignIn && (
              <button
                type="button"
                onClick={onOpenSignIn}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition"
              >
                Sign in to existing account
              </button>
            )}
            {onOpenSignIn && onExploreDemo && <span className="text-slate-600">·</span>}
            {onExploreDemo && (
              <button
                type="button"
                onClick={onExploreDemo}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                Explore in demo preview mode
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsSendAccountOpen(true)}
            className="text-emerald-400 hover:text-emerald-300 font-medium transition"
          >
            Need help? Send account for guided setup
          </button>
        </div>

        {/* Send Account Modal Overlay */}
        {isSendAccountOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
            <div className="w-full max-w-md bg-slate-950 border border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    📤
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase">Send Account Details</h3>
                    <p className="text-[11px] text-slate-400">Direct WhatsApp & Server Dispatch</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSendAccountOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {sendSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs space-y-2 text-center">
                  <p className="font-bold">✓ Account Details Dispatched Successfully!</p>
                  <p className="text-slate-300 text-[11px]">
                    Credentials and activation will be confirmed directly on WhatsApp (03406671495).
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSendAccountOpen(false);
                      setSendSuccess(false);
                    }}
                    className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1">Student / Trader Name</label>
                    <input
                      type="text"
                      value={sendName}
                      onChange={(e) => setSendName(e.target.value)}
                      placeholder="e.g. Zartab Zafar"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={sendPhone}
                      onChange={(e) => setSendPhone(e.target.value)}
                      placeholder="e.g. 03406671495"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">Account Preferences & Notes</label>
                    <textarea
                      rows={2}
                      value={sendNotes}
                      onChange={(e) => setSendNotes(e.target.value)}
                      placeholder="Account type: Funded FTMO 100K, or Cent Account."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <a
                      href={`https://wa.me/923406671495?text=${encodeURIComponent(
                        `Hello PrimePipFX, I want to send my account details for setup.\nName: ${sendName || 'Trader'}\nPhone: ${sendPhone || ''}\nNotes: ${sendNotes || 'Please send my login details.'}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={async () => {
                        try {
                          await fetch('/api/auth/send-account', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              name: sendName || 'Trader',
                              phone: sendPhone,
                              message: `${sendNotes}`,
                            }),
                          });
                        } catch {}
                        setSendSuccess(true);
                      }}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider uppercase text-center transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      <span>SEND ACCOUNT VIA WHATSAPP (03406671495)</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return modalContent;
};
