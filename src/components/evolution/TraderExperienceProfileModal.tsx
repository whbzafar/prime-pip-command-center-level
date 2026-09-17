import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Brain,
  Shield,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Eye,
  Settings,
  Sparkles,
  Award,
  RefreshCw,
} from 'lucide-react';
import { UserAccount } from '../../types';
import {
  apiGetTraderExperienceProfile,
  apiUpdateTraderExperiencePreferences,
} from '../../utils/evolutionClient';

interface TraderExperienceProfileModalProps {
  currentUser?: UserAccount;
  onClose: () => void;
}

export const TraderExperienceProfileModal: React.FC<TraderExperienceProfileModalProps> = ({
  currentUser,
  onClose,
}) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Privacy toggles
  const [consentTelemetry, setConsentTelemetry] = useState(true);
  const [consentWorkflowOpt, setConsentWorkflowOpt] = useState(true);
  const [consentAiAdapt, setConsentAiAdapt] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [currentUser?.id]);

  const loadProfile = async () => {
    setLoading(true);
    const data = await apiGetTraderExperienceProfile(currentUser?.id);
    setProfile(data);
    if (data.privacyConsent) {
      setConsentTelemetry(data.privacyConsent.anonymousTelemetry ?? true);
      setConsentWorkflowOpt(data.privacyConsent.workflowOptimization ?? true);
      setConsentAiAdapt(data.privacyConsent.aiCoachingAdaptation ?? true);
    }
    setLoading(false);
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    await apiUpdateTraderExperiencePreferences(currentUser?.id || 'default', {
      privacyConsent: {
        anonymousTelemetry: consentTelemetry,
        workflowOptimization: consentWorkflowOpt,
        aiCoachingAdaptation: consentAiAdapt,
      },
      updatedAt: Date.now(),
    });
    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0D121F] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-military tracking-wider text-slate-100 uppercase">
                  Trader Experience Profile
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono-code font-bold uppercase tracking-wider">
                  Adaptive Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono-code mt-0.5">
                Continuously adapts the PrimePipFX Command Center to your execution cadence & cognitive focus.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto font-mono-code text-xs">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Analyzing local cognitive workflow signals...</span>
            </div>
          ) : (
            <>
              {/* Profile Overview Stat Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5 mb-1">
                    <Award className="w-3.5 h-3.5 text-cyan-400" />
                    Mastery Archetype
                  </div>
                  <div className="text-slate-100 font-bold text-sm">
                    {profile?.experienceLevel || 'DISCIPLINED OPERATOR'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">High process fidelity</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5 mb-1">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Cognitive Friction Index
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-100 font-bold text-sm">
                      {profile?.cognitiveLoadScore || 28} / 100
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold">
                      OPTIMAL FLOW
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Minimal workflow delays</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5 mb-1">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Adaptive Shields
                  </div>
                  <div className="text-slate-100 font-bold text-sm">
                    {profile?.adaptiveFeaturesActive?.length || 3} ACTIVE
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Auto-guardrails enabled</div>
                </div>
              </div>

              {/* Detected Workflow Friction & Autonomous Fixes */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-200 font-bold font-military tracking-wide uppercase text-sm">
                    <AlertTriangle className="w-4 h-4 text-cyan-400" />
                    Detected Friction & Optimization Opportunities
                  </div>
                  <span className="text-[10px] text-slate-500">Autonomous observation</span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span>Lot Size to Pre-Trade Re-Entry</span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-cyan-400 text-[9px]">
                          SAVING ~14 SEC / TRADE
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                        The engine observed repeated manual copying between the Lot Size Calculator and Pre-Trade Plan. Direct memory bridging is activated.
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      AUTO-BRIDGED
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-2">
                        <span>High-Impact News Spike Spread Warning</span>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 text-[9px]">
                          RISK MITIGATION
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                        Automatic synchronization with Fundamental Calendar to warn 10 minutes prior to major economic releases.
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold shrink-0 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Adaptive Interventions */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-200 font-bold font-military tracking-wide uppercase text-sm">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Active Psychological & Risk Circuit-Breakers
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                    <span className="text-slate-300">Post-Loss Cool-Down Shield</span>
                    <span className="text-emerald-400 font-bold">10-Min Interlock</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                    <span className="text-slate-300">Discipline Acoustic Chime</span>
                    <span className="text-emerald-400 font-bold">Enabled (PKT Aligned)</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                    <span className="text-slate-300">Daily Max Trade Limiter</span>
                    <span className="text-emerald-400 font-bold">Hard Lockout at 2</span>
                  </div>
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
                    <span className="text-slate-300">Local Privacy Vault</span>
                    <span className="text-emerald-400 font-bold">Zero Cloud Storage</span>
                  </div>
                </div>
              </div>

              {/* Privacy & Transparent Consent Controls */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-slate-200 font-bold font-military tracking-wide uppercase text-sm">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Privacy & Transparent Consent Controls
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  PrimePipFX strictly observes non-personally identifiable workflow metrics (such as tool navigation timing and calculation frequency) purely to eliminate UI friction. You retain 100% control over all telemetry signals.
                </p>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition">
                    <div>
                      <div className="font-bold text-slate-200">Anonymous Workflow Telemetry</div>
                      <div className="text-[10px] text-slate-400">
                        Tracks tool transitions to identify UI bottlenecks and confusing layouts.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={consentTelemetry}
                      onChange={(e) => setConsentTelemetry(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-500 bg-slate-950 border-slate-700 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition">
                    <div>
                      <div className="font-bold text-slate-200">Autonomous Workflow Optimization</div>
                      <div className="text-[10px] text-slate-400">
                        Enables automatic pre-filling of values across trade calculators and orders.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={consentWorkflowOpt}
                      onChange={(e) => setConsentWorkflowOpt(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-500 bg-slate-950 border-slate-700 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 transition">
                    <div>
                      <div className="font-bold text-slate-200">Personalized Psychological Interventions</div>
                      <div className="text-[10px] text-slate-400">
                        Tailors emotional cooldown reminders based on your historical risk drawdown patterns.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={consentAiAdapt}
                      onChange={(e) => setConsentAiAdapt(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-500 bg-slate-950 border-slate-700 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-mono-code">
            {saveSuccess && (
              <span className="text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Preferences updated successfully
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold font-military text-xs uppercase transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleSavePreferences}
              disabled={saving}
              className="px-4 py-2 bg-blue-500 hover:bg-cyan-400 text-slate-950 rounded-xl font-bold font-military text-xs uppercase tracking-wider transition shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
