import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Clock,
  Volume2,
  VolumeX,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  X,
  Save,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { PsychologicalSettings, UserAccount } from '../../types';

interface PsychologicalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  onSettingsSaved?: (newSettings: PsychologicalSettings) => void;
}

const DEFAULT_SETTINGS: PsychologicalSettings = {
  cooldownMinutes: 30,
  mandatoryCheckIn: true,
  audioAlertsEnabled: true,
  autoPromptRecoveryOnTilt: true,
  breathingPreset: 'BOX_4_4_4_4',
  maxConsecutiveLossesBeforeTilt: 2,
  tiltSensitivity: 'STRICT',
};

export const PsychologicalSettingsModal: React.FC<PsychologicalSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSettingsSaved,
}) => {
  const userId = currentUser?.id || currentUser?.username || 'guest';
  const storageKey = `primepipfx_psych_settings_${userId}`;

  const [settings, setSettings] = useState<PsychologicalSettings>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (currentUser?.id) {
      fetch('/api/user/psychology')
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.settings) {
            setSettings(data.settings);
            try {
              localStorage.setItem(storageKey, JSON.stringify(data.settings));
            } catch {}
          }
        })
        .catch(() => {});
    }
  }, [isOpen, currentUser?.id, storageKey]);

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {}

    try {
      await fetch('/api/user/psychology/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
    } catch (err) {
      console.warn('Server settings sync err', err);
    }

    if (onSettingsSaved) onSettingsSaved(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-950 border border-slate-700 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono-code uppercase px-2 py-0.5 rounded bg-blue-500/10 text-cyan-400 font-bold">
                  PSYCHOLOGICAL SETTINGS
                </span>
                <span className="text-[10px] font-mono-code text-slate-400">
                  ISOLATED TO: @{currentUser?.username || 'Trader'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-military font-bold text-slate-100 tracking-wider mt-0.5">
                Configure Trading Psychology & Tilt Parameters
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Options */}
        <div className="space-y-4 text-xs font-mono-code">
          {/* Option 1: Mandatory Check-In */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-200 font-bold block">Mandatory Pre-Trade Check-In</span>
              <span className="text-slate-400 text-[11px]">
                Require emotional assessment and readiness check before recording executions.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, mandatoryCheckIn: !settings.mandatoryCheckIn })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.mandatoryCheckIn ? 'bg-blue-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                  settings.mandatoryCheckIn ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Option 2: Auto-Prompt Recovery on Tilt */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-200 font-bold block">Auto-Prompt Recovery Mode</span>
              <span className="text-slate-400 text-[11px]">
                Automatically trigger Recovery Mode dialog when Level 2/3 tilt is detected or limit hit.
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, autoPromptRecoveryOnTilt: !settings.autoPromptRecoveryOnTilt })
              }
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.autoPromptRecoveryOnTilt ? 'bg-blue-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                  settings.autoPromptRecoveryOnTilt ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Option 3: Consecutive Losses Trigger */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-200 font-bold block">Consecutive Losses Before Tilt Warning</span>
              <span className="text-slate-400 text-[11px]">
                Threshold of consecutive losses that triggers cognitive degradation alert.
              </span>
            </div>
            <select
              value={settings.maxConsecutiveLossesBeforeTilt}
              onChange={(e) =>
                setSettings({ ...settings, maxConsecutiveLossesBeforeTilt: Number(e.target.value) })
              }
              className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-cyan-400 focus:outline-none"
            >
              <option value={1}>1 Loss (Ultra-Conservative)</option>
              <option value={2}>2 Losses (Standard Rule — Recommended)</option>
              <option value={3}>3 Losses (High Tolerance)</option>
            </select>
          </div>

          {/* Option 4: Cooldown Timer Minutes */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-200 font-bold block">Default Cooling-Off Duration</span>
              <span className="text-slate-400 text-[11px]">
                Enforced rest period in Recovery Mode before returning to market.
              </span>
            </div>
            <select
              value={settings.cooldownMinutes}
              onChange={(e) => setSettings({ ...settings, cooldownMinutes: Number(e.target.value) })}
              className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-cyan-400 focus:outline-none"
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes (Recommended)</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>60 Minutes (Full Session Break)</option>
            </select>
          </div>

          {/* Option 5: Breathing Preset */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-200 font-bold block">Default Breathing Cadence</span>
              <span className="text-slate-400 text-[11px]">
                Nervous system down-regulation technique used in recovery sessions.
              </span>
            </div>
            <select
              value={settings.breathingPreset}
              onChange={(e) => setSettings({ ...settings, breathingPreset: e.target.value as any })}
              className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-cyan-400 focus:outline-none"
            >
              <option value="BOX_4_4_4_4">Box Breathing (4-4-4-4 Balanced)</option>
              <option value="CALM_4_7_8">Calming Technique (4-7-8 Deep Parasympathetic)</option>
              <option value="READINESS_5_5_5_5">Tactical Focus (5-5-5-5 Coherence)</option>
            </select>
          </div>

          {/* Option 6: Audio Alerts */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-slate-200 font-bold block">Audio Tone Notifications</span>
              <span className="text-slate-400 text-[11px]">
                Subtle harmonic chimes during breathing phases and tilt alerts.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, audioAlertsEnabled: !settings.audioAlertsEnabled })}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                settings.audioAlertsEnabled ? 'bg-blue-500' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                  settings.audioAlertsEnabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-300 text-xs font-mono-code flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Preferences saved successfully to your isolated profile!</span>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-mono-code text-slate-500 hover:text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono-code transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 font-military text-xs font-bold tracking-wider transition shadow-md shadow-blue-500/20"
            >
              <Save className="w-4 h-4" />
              <span>SAVE SETTINGS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
