import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  Square,
  Volume2,
  VolumeX,
  Clock,
  Save,
  RotateCcw,
  Sparkles,
  CloudRain,
  Flame,
  Moon,
  Compass,
  Coffee,
  Trees,
  Check,
  Plus,
  Trash2,
} from 'lucide-react';
import { soundEngine, AMBIENT_PRESETS } from './audio/soundEngine';
import { AmbientMixPreset, SoundLayerConfig } from './types';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';

interface AmbientMixerProps {
  userId?: string;
  onSaveCustomMix?: (mix: AmbientMixPreset) => void;
}

export const AmbientMixer: React.FC<AmbientMixerProps> = ({ userId = 'default', onSaveCustomMix }) => {
  const [layers, setLayers] = useState<SoundLayerConfig[]>(soundEngine.getLayersConfig());
  const [activePresetId, setActivePresetId] = useState<string | null>('RAIN');
  const [masterVolume, setMasterVolume] = useState<number>(soundEngine.getMasterVolume());
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getIsMasterMuted());
  const [timerMinutes, setTimerMinutes] = useState<number | null>(null);
  const [timerSecondsRemaining, setTimerSecondsRemaining] = useState<number | null>(null);
  const [customMixes, setCustomMixes] = useState<AmbientMixPreset[]>(() => {
    try {
      const saved = localStorage.getItem(`primepipfx_calm_custom_mixes_${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newMixName, setNewMixName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const syncState = () => {
      setLayers(soundEngine.getLayersConfig());
      setMasterVolume(soundEngine.getMasterVolume());
      setIsMuted(soundEngine.getIsMasterMuted());
      setTimerSecondsRemaining(soundEngine.getTimerRemainingSeconds());
    };
    const interval = setInterval(syncState, 500);
    return () => clearInterval(interval);
  }, []);

  const handleSelectPreset = (preset: AmbientMixPreset) => {
    setActivePresetId(preset.id);
    soundEngine.applyPreset(preset);
  };

  const handleToggleLayer = (layerId: string) => {
    soundEngine.toggleLayer(layerId);
    setLayers(soundEngine.getLayersConfig());
    setActivePresetId(null);
  };

  const handleLayerVolume = (layerId: string, val: number) => {
    soundEngine.setLayerVolume(layerId, val);
    setLayers(soundEngine.getLayersConfig());
  };

  const handleToggleLayerMute = (layerId: string) => {
    soundEngine.toggleLayerMute(layerId);
    setLayers(soundEngine.getLayersConfig());
  };

  const handleStopAll = () => {
    soundEngine.stopAllLayers();
    setActivePresetId(null);
    setLayers(soundEngine.getLayersConfig());
  };

  const handleSetTimer = (minutes: number) => {
    if (timerMinutes === minutes && timerSecondsRemaining !== null) {
      soundEngine.clearTimer();
      setTimerMinutes(null);
      setTimerSecondsRemaining(null);
    } else {
      setTimerMinutes(minutes);
      soundEngine.startTimer(
        minutes,
        (sec) => setTimerSecondsRemaining(sec),
        () => {
          setTimerMinutes(null);
          setTimerSecondsRemaining(null);
        }
      );
    }
  };

  const handleSaveCurrentMix = () => {
    if (!newMixName.trim()) return;
    const currentActiveLayers: Record<string, { enabled: boolean; volume: number }> = {};
    layers.forEach((l) => {
      if (l.enabled) {
        currentActiveLayers[l.id] = { enabled: true, volume: l.volume };
      }
    });

    const newMix: AmbientMixPreset = {
      id: `CUSTOM_${Date.now()}`,
      name: newMixName.trim(),
      subtitle: 'Custom user crafted acoustic environment',
      layers: currentActiveLayers,
      isCustom: true,
    };

    const updated = [newMix, ...customMixes];
    setCustomMixes(updated);
    try {
      localStorage.setItem(`primepipfx_calm_custom_mixes_${userId}`, JSON.stringify(updated));
    } catch {}
    if (onSaveCustomMix) onSaveCustomMix(newMix);
    setNewMixName('');
    setIsSaving(false);
    setActivePresetId(newMix.id);
  };

  const handleDeleteCustomMix = (mixId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customMixes.filter((m) => m.id !== mixId);
    setCustomMixes(updated);
    try {
      localStorage.setItem(`primepipfx_calm_custom_mixes_${userId}`, JSON.stringify(updated));
    } catch {}
    if (activePresetId === mixId) setActivePresetId(null);
  };

  const anyLayerPlaying = layers.some((l) => l.enabled);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Master Strip */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-white/[0.08] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
              MULTI-LAYER AMBIENT MIXER
            </h3>
            <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-blue-500/15 text-cyan-400 border border-blue-500/30">
              15 CHANNELS
            </span>
          </div>
          <p className="text-xs font-mono-code text-slate-400 mt-0.5">
            14 curated acoustic environments • Custom volume balance • Sleep timer with fade-out
          </p>
        </div>

        {/* Global Mixer Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleStopAll}
            disabled={!anyLayerPlaying}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-military font-bold text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/40 transition disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>STOP ALL</span>
          </button>

          <button
            type="button"
            onClick={() => soundEngine.toggleMasterMute()}
            className={`px-3 py-1.5 rounded-xl border text-xs font-military font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-teal-300'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isMuted ? 'UNMUTE MASTER' : 'MUTE MASTER'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSaving(!isSaving)}
            className="px-3 py-1.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-xs font-military font-bold text-teal-300 hover:bg-teal-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE CURRENT MIX</span>
          </button>
        </div>
      </div>

      {/* Save Custom Mix Prompt Modal / Strip */}
      {isSaving && (
        <div className="p-4 rounded-xl bg-slate-950/95 border border-teal-500/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-military font-bold text-teal-300 uppercase tracking-wider">
              SAVE CUSTOM MIX PRESET
            </span>
            <button
              type="button"
              onClick={() => setIsSaving(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="e.g., Deep Focus Session, Night Starlight, Reset Anchor..."
              value={newMixName}
              onChange={(e) => setNewMixName(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono-code text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
            <button
              type="button"
              onClick={handleSaveCurrentMix}
              disabled={!newMixName.trim()}
              className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-military font-bold hover:bg-teal-400 transition disabled:opacity-40"
            >
              Save Mix
            </button>
          </div>
        </div>
      )}

      {/* Real-Time Waveform / Spectrum */}
      <SoundWaveVisualizer height={140} />

      {/* Timer Controls Row */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-xs font-military text-slate-300">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="font-bold uppercase">SOUND SLEEP & RESET TIMER:</span>
          {timerSecondsRemaining !== null && (
            <span className="font-mono-code text-cyan-400 font-bold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
              {Math.floor(timerSecondsRemaining / 60)}m {timerSecondsRemaining % 60}s remaining (smooth fade-out)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => handleSetTimer(mins)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono-code font-bold transition cursor-pointer ${
                timerMinutes === mins
                  ? 'bg-blue-500 text-slate-950 shadow-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {mins}m
            </button>
          ))}
          {timerMinutes && (
            <button
              type="button"
              onClick={() => {
                soundEngine.clearTimer();
                setTimerMinutes(null);
                setTimerSecondsRemaining(null);
              }}
              className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono-code"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 14 CURATED ACOUSTIC PRESETS */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-military font-bold text-slate-300 uppercase tracking-wider">
            CURATED PRESETS (CLICK TO LOAD)
          </h4>
          <span className="text-[10px] font-mono-code text-slate-500">
            {AMBIENT_PRESETS.length + customMixes.length} total configurations
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {customMixes.map((mix) => (
            <div
              key={mix.id}
              onClick={() => handleSelectPreset(mix)}
              className={`p-3 rounded-xl border text-left transition cursor-pointer relative group ${
                activePresetId === mix.id
                  ? 'bg-teal-500/20 border-teal-400 text-teal-100 shadow-md shadow-teal-500/10'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-military font-bold truncate">{mix.name}</span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomMix(mix.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition"
                  title="Delete mix"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <span className="text-[10px] font-mono-code text-teal-400 block mt-0.5">
                ★ User Custom Mix
              </span>
            </div>
          ))}

          {AMBIENT_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/20 border-teal-400 text-teal-100 shadow-md shadow-teal-500/10'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-military font-bold">{preset.name}</span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />}
                </div>
                <span className="text-[10px] font-mono-code text-slate-400 block mt-0.5 truncate">
                  {preset.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 15 INDEPENDENT LAYER CHANNELS */}
      {/* ========================================================================= */}
      <div className="prime-glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-xs sm:text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              15 ACOUSTIC CHANNELS (INDIVIDUAL LEVEL ADJUSTMENT)
            </h4>
            <p className="text-[11px] font-mono-code text-slate-400">
              Tune gain and mute status per channel in real time
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {layers.map((layer) => (
            <div
              key={layer.id}
              className={`p-3 rounded-xl border transition space-y-2.5 ${
                layer.enabled
                  ? 'bg-slate-950/90 border-teal-500/40 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleLayer(layer.id)}
                  className={`flex items-center gap-2 text-left cursor-pointer group`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition ${
                      layer.enabled
                        ? 'bg-teal-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                    }`}
                  >
                    {layer.enabled ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                  </div>
                  <div>
                    <span className="text-xs font-military font-bold text-slate-200 block">
                      {layer.name}
                    </span>
                    <span className="text-[9px] font-mono-code text-slate-400">
                      {layer.description}
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleLayerMute(layer.id)}
                  disabled={!layer.enabled}
                  className={`p-1 rounded-md transition ${
                    layer.muted
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={layer.muted ? 'Unmute' : 'Mute'}
                >
                  {layer.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                  <span>Level</span>
                  <span>{layer.muted ? 'MUTED' : `${Math.round(layer.volume * 100)}%`}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  disabled={!layer.enabled || layer.muted}
                  value={layer.volume}
                  onChange={(e) => handleLayerVolume(layer.id, parseFloat(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer disabled:opacity-40"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
