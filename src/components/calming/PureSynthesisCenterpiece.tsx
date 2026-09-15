import React, { useState, useEffect } from 'react';
import {
  Radio,
  Wind,
  Volume2,
  VolumeX,
  Sliders,
  SlidersHorizontal,
  Play,
  Square,
  Sparkles,
  Waves,
  RotateCcw,
  Zap,
  Info,
} from 'lucide-react';
import { soundEngine, SOLFEGGIO_FREQUENCIES } from './audio/soundEngine';
import { PureSynthSettings, SoundLayerConfig } from './types';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';

export const PureSynthesisCenterpiece: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState<boolean>(soundEngine.getIsPureSynthPlaying());
  const [synthSettings, setSynthSettings] = useState<PureSynthSettings>(soundEngine.getPureSynthSettings());
  const [activeLayers, setActiveLayers] = useState<SoundLayerConfig[]>(soundEngine.getLayersConfig());
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Quick preset state tracking
  const [isDroneActive, setIsDroneActive] = useState<boolean>(soundEngine.getIsPlayingDrone());
  const [isBrownNoiseActive, setIsBrownNoiseActive] = useState<boolean>(soundEngine.getIsPlayingNoise());

  useEffect(() => {
    const checkState = () => {
      setIsPlaying(soundEngine.getIsPureSynthPlaying());
      setIsDroneActive(soundEngine.getIsPlayingDrone());
      setIsBrownNoiseActive(soundEngine.getIsPlayingNoise());
      setActiveLayers(soundEngine.getLayersConfig());
    };
    const interval = setInterval(checkState, 500);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePureSynth = () => {
    if (isPlaying) {
      soundEngine.stopPureSynthesis(synthSettings.fadeOutSeconds || 1.5);
      setIsPlaying(false);
    } else {
      soundEngine.startPureSynthesis(synthSettings);
      setIsPlaying(true);
    }
  };

  const handleUpdateSetting = (partial: Partial<PureSynthSettings>) => {
    const updated = { ...synthSettings, ...partial };
    setSynthSettings(updated);
    soundEngine.updatePureSynthSettings(partial);
  };

  const handleToggleDrone = () => {
    if (isDroneActive) {
      soundEngine.stopGroundingTone();
      setIsDroneActive(false);
    } else {
      soundEngine.startGroundingTone(synthSettings.frequency || 432, synthSettings.volume || 0.25);
      setIsDroneActive(true);
    }
  };

  const handleToggleBrownNoise = () => {
    if (isBrownNoiseActive) {
      soundEngine.stopBrownNoise();
      setIsBrownNoiseActive(false);
    } else {
      soundEngine.startBrownNoise(0.2);
      setIsBrownNoiseActive(true);
    }
  };

  const handlePlayChime = (freq = 528) => {
    soundEngine.playSingingBowlChime(freq);
  };

  const handleToggleLayer = (layerId: string) => {
    soundEngine.toggleLayer(layerId);
    setActiveLayers(soundEngine.getLayersConfig());
  };

  const handleLayerVolume = (layerId: string, val: number) => {
    soundEngine.setLayerVolume(layerId, val);
    setActiveLayers(soundEngine.getLayersConfig());
  };

  const handleToggleLayerMute = (layerId: string) => {
    soundEngine.toggleLayerMute(layerId);
    setActiveLayers(soundEngine.getLayersConfig());
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. TOP SIGNATURE BANNER (PRESERVES AND ENHANCES EXISTING PURE SYNTHESIS) */}
      {/* ========================================================================= */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-teal-950/60 border border-indigo-500/40 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
            <Radio className="w-6 h-6 animate-pulse text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                PURE SYNTHESIS AMBIENT SOUND GENERATOR
              </h3>
              <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                STUDIO PRO
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Zero network latency • Native Web Audio API calming frequencies • 100% procedural
            </p>
          </div>
        </div>

        {/* Existing Quick Action Triggers preserved */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleToggleDrone}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isDroneActive
                ? 'bg-teal-500/25 border-teal-400 text-teal-200 shadow-md shadow-teal-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isDroneActive ? 'Stop 432Hz Drone' : '432Hz Harmonic Drone'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleBrownNoise}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono-code font-bold transition flex items-center gap-1.5 cursor-pointer ${
              isBrownNoiseActive
                ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200 shadow-md shadow-indigo-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>{isBrownNoiseActive ? 'Stop Brown Noise' : 'Deep Brown Noise'}</span>
          </button>

          <button
            type="button"
            onClick={() => handlePlayChime(528)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-teal-300 text-xs font-mono-code transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Play 528Hz Solfeggio singing bowl chime"
          >
            <Volume2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Singing Bowl (528Hz)</span>
          </button>
        </div>
      </div>

      {/* Real-Time Waveform / Frequency Visualizer */}
      <SoundWaveVisualizer height={160} />

      {/* ========================================================================= */}
      {/* 2. MASTER FREQUENCY & TONE ARCHITECTURE */}
      {/* ========================================================================= */}
      <div className="prime-glass-card rounded-2xl p-5 border border-white/[0.08] space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-teal-400" />
            <div>
              <h4 className="text-xs sm:text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                HARMONIC OSCILLATOR & FREQUENCY WORKBENCH
              </h4>
              <p className="text-[11px] font-mono-code text-slate-400">
                Precision micro-tuning with custom Solfeggio harmonic resonance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePureSynth}
              className={`px-4 py-2 rounded-xl text-xs font-military font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer shadow-lg ${
                isPlaying
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-rose-500/20'
                  : 'bg-teal-500/25 text-teal-300 border border-teal-400 shadow-teal-500/20 hover:bg-teal-500/30'
              }`}
            >
              {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isPlaying ? 'STOP SYNTHESIS' : 'START HARMONIC SYNTH'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-military font-bold text-slate-300 hover:text-teal-300 transition flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isAdvancedOpen ? 'COMPACT CONTROLS' : 'ADVANCED MATRIX'}</span>
            </button>
          </div>
        </div>

        {/* Solfeggio Harmonic Presets Pills */}
        <div className="space-y-2">
          <label className="text-[11px] font-military font-bold text-slate-400 uppercase tracking-wider block">
            SOLFEGGIO HARMONIC CALIBRATIONS (SELECT FREQUENCY)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SOLFEGGIO_FREQUENCIES.map((s) => {
              const isSelected = synthSettings.frequency === s.freq;
              return (
                <button
                  key={s.freq}
                  type="button"
                  onClick={() => handleUpdateSetting({ frequency: s.freq })}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono-code font-bold text-slate-100">{s.label}</span>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />}
                  </div>
                  <span className="text-[10px] font-mono-code text-slate-400 block mt-0.5 truncate">
                    {s.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Frequency & Tone Selection */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-military font-bold text-slate-300 uppercase">
                FREQUENCY
              </label>
              <span className="text-xs font-mono-code text-teal-400 font-bold">
                {synthSettings.frequency} Hz
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={963}
              step={1}
              value={synthSettings.frequency}
              onChange={(e) => handleUpdateSetting({ frequency: parseFloat(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />

            <div className="pt-2">
              <label className="text-[11px] font-military font-bold text-slate-400 uppercase block mb-1.5">
                OSCILLATOR WAVEFORM TONE
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['sine', 'triangle', 'sawtooth', 'square'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleUpdateSetting({ tone: t })}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono-code uppercase font-bold text-center border transition ${
                      synthSettings.tone === t
                        ? 'bg-teal-500/25 border-teal-400 text-teal-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t === 'sawtooth' ? 'SAW' : t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Volume & Stereo Balance */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-military font-bold text-slate-300 uppercase">
                SYNTH VOLUME
              </label>
              <span className="text-xs font-mono-code text-teal-400 font-bold">
                {Math.round(synthSettings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={synthSettings.volume}
              onChange={(e) => handleUpdateSetting({ volume: parseFloat(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-military font-bold text-slate-400 uppercase">
                  STEREO BALANCE (PAN)
                </label>
                <span className="text-[10px] font-mono-code text-slate-400">
                  {synthSettings.stereoPan === 0 ? 'CENTER' : synthSettings.stereoPan < 0 ? `L ${Math.abs(Math.round(synthSettings.stereoPan * 100))}%` : `R ${Math.round(synthSettings.stereoPan * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={synthSettings.stereoPan}
                onChange={(e) => handleUpdateSetting({ stereoPan: parseFloat(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>
          </div>

          {/* LFO Oscillation & Pulse Rate */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-military font-bold text-slate-300 uppercase">
                BINAURAL LFO DRIFT
              </label>
              <span className="text-xs font-mono-code text-teal-400 font-bold">
                {synthSettings.lfoRate} Hz
              </span>
            </div>
            <input
              type="range"
              min={0.05}
              max={5}
              step={0.05}
              value={synthSettings.lfoRate}
              onChange={(e) => handleUpdateSetting({ lfoRate: parseFloat(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />

            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-military font-bold text-slate-400 uppercase">
                  OSCILLATION DEPTH
                </label>
                <span className="text-[10px] font-mono-code text-slate-400">
                  {synthSettings.lfoDepth} Hz
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={synthSettings.lfoDepth}
                onChange={(e) => handleUpdateSetting({ lfoDepth: parseFloat(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADVANCED STUDIO MATRIX (Filter, Reverb, Delay, Attack/Fade times) */}
        {/* ========================================================================= */}
        {isAdvancedOpen && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-military font-bold text-indigo-300 uppercase tracking-wider">
                ACOUSTIC FILTERS & SPATIAL ENVIRONMENT
              </span>
              <button
                type="button"
                onClick={() =>
                  handleUpdateSetting({
                    filterCutoff: 1800,
                    filterQ: 1.5,
                    delayFeedback: 0.25,
                    delayTime: 0.35,
                    fadeInSeconds: 2.0,
                    fadeOutSeconds: 2.0,
                  })
                }
                className="text-[10px] font-mono-code text-slate-400 hover:text-teal-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Filter Cutoff */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-400">Filter Cutoff (Lowpass)</span>
                  <span className="text-teal-400 font-bold">{synthSettings.filterCutoff} Hz</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={8000}
                  step={50}
                  value={synthSettings.filterCutoff}
                  onChange={(e) => handleUpdateSetting({ filterCutoff: parseFloat(e.target.value) })}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>

              {/* Delay Echo & Space */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-400">Ambient Echo Delay</span>
                  <span className="text-teal-400 font-bold">{Math.round((synthSettings.delayFeedback || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.7}
                  step={0.05}
                  value={synthSettings.delayFeedback}
                  onChange={(e) => handleUpdateSetting({ delayFeedback: parseFloat(e.target.value) })}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>

              {/* Fade Out Duration */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono-code">
                  <span className="text-slate-400">Fade In / Fade Out</span>
                  <span className="text-teal-400 font-bold">{synthSettings.fadeOutSeconds}s</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={6}
                  step={0.5}
                  value={synthSettings.fadeOutSeconds}
                  onChange={(e) =>
                    handleUpdateSetting({
                      fadeOutSeconds: parseFloat(e.target.value),
                      fadeInSeconds: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MULTI-LAYER AMBIENT STACK (ON/OFF, MUTE, INDEPENDENT VOLUME) */}
      {/* ========================================================================= */}
      <div className="prime-glass-card rounded-2xl p-5 border border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-xs sm:text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
              MULTI-LAYER PROCEDURAL SOUND MATRIX
            </h4>
            <p className="text-[11px] font-mono-code text-slate-400">
              Stack independent natural soundscapes simultaneously • Zero latency Web Audio synthesis
            </p>
          </div>

          <button
            type="button"
            onClick={() => soundEngine.stopAllLayers()}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-military font-bold text-slate-400 hover:text-rose-300 transition"
          >
            MUTE ALL LAYERS
          </button>
        </div>

        {/* 5 Core Recommended Layers Highlighted First */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeLayers.slice(0, 6).map((layer) => (
            <div
              key={layer.id}
              className={`p-3.5 rounded-xl border transition space-y-3 ${
                layer.enabled
                  ? 'bg-slate-900/90 border-teal-500/40 shadow-md shadow-teal-500/5'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleLayer(layer.id)}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition cursor-pointer ${
                      layer.enabled
                        ? 'bg-teal-500 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    title={layer.enabled ? 'Turn layer off' : 'Turn layer on'}
                  >
                    {layer.enabled ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>
                  <div>
                    <span className="text-xs font-military font-bold text-slate-200 block">
                      {layer.name}
                    </span>
                    <span className="text-[10px] font-mono-code text-slate-400">
                      {layer.category}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleLayerMute(layer.id)}
                  disabled={!layer.enabled}
                  className={`p-1.5 rounded-lg transition ${
                    layer.muted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={layer.muted ? 'Unmute layer' : 'Mute layer'}
                >
                  {layer.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono-code text-slate-400">
                  <span>Layer Intensity</span>
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
