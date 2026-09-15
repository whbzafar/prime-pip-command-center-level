// PRIMEPIPFX Calming Tools Suite Types & Interfaces
// Professional mental-reset, relaxation, focus, and mindfulness environment (Non-medical)

export type CalmingSuiteTab =
  | 'HOME'
  | 'PURE_SYNTHESIS'
  | 'AMBIENT_MIXER'
  | 'SOUNDSCAPES'
  | 'RELAXATION_MUSIC'
  | 'BREATHING'
  | 'MIND_RESET'
  | 'FOCUS_MODE'
  | 'CALM_GAMES'
  | 'DAILY_CHALLENGE'
  | 'VISUAL_WAVES'
  | 'VISUALIZER'
  | 'RESET_SESSIONS'
  | 'PRE_TRADE_RESET'
  | 'POST_LOSS_RESET'
  | 'POST_WIN_RESET'
  | 'FATIGUE_RESET'
  | 'SOUL_REFRESH'
  | 'DIGITAL_RELAXATION'
  | 'FAVORITES'
  | 'HISTORY';

export type OscillatorWaveType = 'sine' | 'triangle' | 'sawtooth' | 'square';

export type FilterType = 'lowpass' | 'highpass' | 'bandpass';

export interface PureSynthSettings {
  frequency: number; // 20 - 1000 Hz
  tone: OscillatorWaveType;
  volume: number; // 0 - 1.0
  stereoPan: number; // -1.0 to 1.0
  lfoRate: number; // 0 - 20 Hz
  lfoDepth: number; // 0 - 100
  pulseRate: number; // 0 - 10 Hz
  pulseDepth: number; // 0 - 1.0
  filterType: FilterType;
  filterCutoff: number; // 50 - 12000 Hz
  filterQ: number; // 0.1 - 20
  reverbWet: number; // 0 - 1.0
  delayTime: number; // 0 - 1.0 s
  delayFeedback: number; // 0 - 0.9
  fadeInSeconds: number;
  fadeOutSeconds: number;
  attack: number;
  decay: number;
}

export interface SoundLayerConfig {
  id: string;
  name: string;
  category: 'NOISE' | 'NATURE' | 'SYNTH' | 'ATMOSPHERE';
  enabled: boolean;
  muted: boolean;
  volume: number; // 0 - 1.0
  pan: number; // -1 to 1
  description: string;
}

export interface AmbientMixPreset {
  id: string;
  name: string;
  subtitle: string;
  layers: Record<string, { enabled: boolean; volume: number }>;
  isCustom?: boolean;
}

export type RelaxationMusicMode =
  | 'GENTLE_PIANO'
  | 'SOFT_AMBIENT'
  | 'SLOW_PADS'
  | 'CALM_SYNTH'
  | 'MINIMAL_MEDITATION'
  | 'FLOATING_ATMOSPHERE'
  | 'EVENING_RESET'
  | 'MORNING_REFRESH'
  | 'DEEP_FOCUS'
  | 'QUIET_SPACE';

export interface RelaxationMusicSettings {
  mode: RelaxationMusicMode;
  volume: number;
  tempo: number; // BPM: 40 - 90
  intensity: number; // 0.1 - 1.0
  reverbWet: number;
  timerMinutes: number | null;
}

export type BreathingPatternId =
  | 'BALANCED_4_4'
  | 'RELAX_4_6'
  | 'BOX_4_4_4_4'
  | 'RELAX_4_7_8'
  | 'PHYSIOLOGICAL_SIGH'
  | 'CUSTOM';

export interface BreathingPhase {
  name: 'INHALE' | 'HOLD' | 'EXHALE' | 'REST';
  label: string;
  duration: number; // seconds
  cue: string;
}

export interface BreathingPatternConfig {
  id: BreathingPatternId;
  name: string;
  subtitle: string;
  phases: BreathingPhase[];
}

export type CalmGameId =
  | 'BREATHING_ORB'
  | 'FLOW'
  | 'FOCUS_DOT'
  | 'MEMORY_CALM'
  | 'COLOR_FLOW'
  | 'RHYTHM_TAP'
  | 'BALANCE'
  | 'ZEN_PATTERN'
  | 'SOUND_MEMORY'
  | 'PARTICLE_FLOW';

export interface CalmingHistoryEntry {
  id: string;
  userId: string;
  sessionType: string;
  sessionTitle: string;
  durationMinutes: number;
  completedAt: string;
  completed: boolean;
  userRating?: number; // 1 to 5
  feedbackStatus?: 'BETTER' | 'CALMER' | 'FOCUSED' | 'NEUTRAL' | 'STILL_TIRED' | 'PREFER_ANOTHER';
  notes?: string;
}

export interface CalmingFavorites {
  sounds: string[];
  mixes: AmbientMixPreset[];
  games: CalmGameId[];
  sessions: string[];
}
