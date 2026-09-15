import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Gamepad2,
  Wind,
  Compass,
  Eye,
  Grid,
  Palette,
  Heart,
  Scale,
  Shapes,
  Music,
  Waves,
  RotateCcw,
  Check,
} from 'lucide-react';
import { soundEngine } from './audio/soundEngine';
import { CalmGameId } from './types';

interface CalmGameMeta {
  id: CalmGameId;
  name: string;
  subtitle: string;
  icon: any;
}

const GAMES_LIST: CalmGameMeta[] = [
  { id: 'BREATHING_ORB', name: '1. Breathing Orb', subtitle: 'Align your breath with gentle expanding ring', icon: Wind },
  { id: 'FLOW', name: '2. Flow Path', subtitle: 'Steer glowing particle smoothly along serene river', icon: Waves },
  { id: 'FOCUS_DOT', name: '3. Focus Dot', subtitle: 'Follow slowly drifting point to quiet mind wanderings', icon: Eye },
  { id: 'MEMORY_CALM', name: '4. Memory Calm', subtitle: 'Gentle pastel glyph pairing with chime feedback', icon: Grid },
  { id: 'COLOR_FLOW', name: '5. Color Flow', subtitle: 'Harmonize gradient hues into calming balance', icon: Palette },
  { id: 'RHYTHM_TAP', name: '6. Rhythm Tap', subtitle: 'Gentle heart-cadence synchronization', icon: Heart },
  { id: 'BALANCE', name: '7. Zen Cairn Balance', subtitle: 'Stack balanced stones in quiet equilibrium', icon: Scale },
  { id: 'ZEN_PATTERN', name: '8. Zen Geometry', subtitle: 'Trace harmonious mandala connections', icon: Shapes },
  { id: 'SOUND_MEMORY', name: '9. Sound Chimes', subtitle: 'Recall and play gentle harmonic tones', icon: Music },
  { id: 'PARTICLE_FLOW', name: '10. Kinetic Dust', subtitle: 'Interact with flowing particle magnetic field', icon: Sparkles },
];

export const CalmGamesHub: React.FC = () => {
  const [activeGameId, setActiveGameId] = useState<CalmGameId>('FLOW');

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/[0.08] shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
            <Gamepad2 className="w-6 h-6 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-military font-bold text-slate-100 uppercase tracking-wider">
                CALM INTERACTIVE GAMES (10 SUITES)
              </h3>
              <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 border border-teal-500/30">
                ZERO STRESS • NO PUNISHMENT
              </span>
            </div>
            <p className="text-xs font-mono-code text-slate-400 mt-0.5">
              Low-pressure attentional grounding • No competitive ranking • Soothing acoustic rewards
            </p>
          </div>
        </div>
      </div>

      {/* 10 Games Grid Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {GAMES_LIST.map((game) => {
          const Icon = game.icon;
          const isSelected = activeGameId === game.id;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => {
                setActiveGameId(game.id);
                soundEngine.playSingingBowlChime(528);
              }}
              className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2.5 ${
                isSelected
                  ? 'bg-teal-500/20 border-teal-400 text-teal-200 shadow-md shadow-teal-500/10'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1.5 rounded-lg shrink-0 ${
                  isSelected ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-teal-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-military font-bold block truncate">{game.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Game Window */}
      <div className="prime-glass-card rounded-3xl p-6 sm:p-10 border border-white/[0.08] min-h-[420px] flex flex-col justify-center">
        {activeGameId === 'BREATHING_ORB' && <BreathingOrbGame />}
        {activeGameId === 'FLOW' && <FlowPathGame />}
        {activeGameId === 'FOCUS_DOT' && <FocusDotGame />}
        {activeGameId === 'MEMORY_CALM' && <MemoryCalmGame />}
        {activeGameId === 'COLOR_FLOW' && <ColorFlowGame />}
        {activeGameId === 'RHYTHM_TAP' && <RhythmTapGame />}
        {activeGameId === 'BALANCE' && <ZenCairnGame />}
        {activeGameId === 'ZEN_PATTERN' && <ZenPatternGame />}
        {activeGameId === 'SOUND_MEMORY' && <SoundMemoryGame />}
        {activeGameId === 'PARTICLE_FLOW' && <ParticleFlowGame />}
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 1: BREATHING ORB GAME
// =========================================================================
const BreathingOrbGame: React.FC = () => {
  const [scale, setScale] = useState(1);
  const [cue, setCue] = useState('Inhale gently');

  useEffect(() => {
    let growing = true;
    const interval = setInterval(() => {
      setScale((prev) => {
        if (prev >= 1.6) {
          growing = false;
          setCue('Exhale slowly');
        } else if (prev <= 0.8) {
          growing = true;
          setCue('Inhale gently');
        }
        return growing ? prev + 0.015 : prev - 0.015;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center space-y-6">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          BREATHING ORB ALIGNMENT
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Sync your respiration with the expanding and contracting aura
        </p>
      </div>

      <div className="py-12 flex items-center justify-center">
        <div
          className="w-36 h-36 rounded-full bg-gradient-to-tr from-teal-500/40 via-teal-400/20 to-indigo-500/40 border-2 border-teal-400/60 shadow-2xl shadow-teal-500/20 flex items-center justify-center transition-transform duration-75"
          style={{ transform: `scale(${scale})` }}
        >
          <span className="text-xs font-mono-code text-teal-300 font-bold">{cue}</span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 2: FLOW PATH
// =========================================================================
const FlowPathGame: React.FC = () => {
  const [posX, setPosX] = useState(50);
  const [score, setScore] = useState(0);

  return (
    <div className="text-center space-y-6">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          SERENE FLOW PATH
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Slide the glowing beacon along the tranquil stream
        </p>
      </div>

      <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-6">
        <div className="w-full h-8 rounded-full bg-gradient-to-r from-teal-900/40 via-slate-900 to-indigo-900/40 border border-slate-800 relative flex items-center px-2">
          <div
            className="w-7 h-7 rounded-full bg-teal-400 shadow-lg shadow-teal-400/60 border border-white transition-all duration-75 absolute"
            style={{ left: `calc(${posX}% - 14px)` }}
          />
        </div>

        <input
          type="range"
          min={5}
          max={95}
          value={posX}
          onChange={(e) => {
            setPosX(parseFloat(e.target.value));
            setScore((s) => s + 1);
            if (score % 20 === 0) soundEngine.playSingingBowlChime(432 + (score % 100));
          }}
          className="w-full accent-teal-400 cursor-pointer"
        />

        <span className="text-xs font-mono-code text-teal-300 block">
          Tranquil points: {score}
        </span>
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 3: FOCUS DOT
// =========================================================================
const FocusDotGame: React.FC = () => {
  const [coords, setCoords] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const interval = setInterval(() => {
      setCoords({
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
      });
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          MINDFUL FOCUS DOT
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Gently follow the glowing point with your gaze to anchor awareness
        </p>
      </div>

      <div className="w-full h-64 rounded-2xl bg-slate-950/80 border border-slate-800 relative overflow-hidden">
        <div
          className="w-6 h-6 rounded-full bg-teal-400 shadow-xl shadow-teal-400/80 border border-white absolute transition-all duration-[2600ms] ease-in-out"
          style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
        />
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 4: MEMORY CALM (GLYPH PAIRING)
// =========================================================================
const MemoryCalmGame: React.FC = () => {
  const glyphs = ['◈', '◇', '○', '◎', '△', '▷', '◈', '◇', '○', '◎', '△', '▷'];
  const [cards, setCards] = useState(() => glyphs.sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  const handleCardClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) return;

    soundEngine.playSingingBowlChime(440 + index * 20);
    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      const [first, second] = newFlipped;
      if (cards[first] === cards[second]) {
        setMatched((prev) => [...prev, first, second]);
        setFlipped([]);
        soundEngine.playSingingBowlChime(528);
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  const resetGame = () => {
    setCards(glyphs.sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
  };

  return (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          MEMORY CALM PAIRING
        </h4>
        <button
          type="button"
          onClick={resetGame}
          className="text-xs font-mono-code text-teal-400 flex items-center gap-1 hover:text-teal-300"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Shuffle</span>
        </button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-w-md mx-auto">
        {cards.map((glyph, idx) => {
          const isRevealed = flipped.includes(idx) || matched.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCardClick(idx)}
              className={`h-16 rounded-xl border text-xl font-mono-code transition cursor-pointer flex items-center justify-center ${
                isRevealed
                  ? 'bg-teal-500/20 border-teal-400 text-teal-300'
                  : 'bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700'
              }`}
            >
              {isRevealed ? glyph : '•'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 5: COLOR FLOW
// =========================================================================
const ColorFlowGame: React.FC = () => {
  const [hue, setHue] = useState(180);

  return (
    <div className="text-center space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          COLOR FLOW GRADIENT
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Glide through calming chromatic spectra
        </p>
      </div>

      <div
        className="w-full h-44 rounded-2xl border border-white/[0.1] transition-colors duration-200 flex items-center justify-center shadow-inner"
        style={{
          background: `radial-gradient(circle, hsl(${hue}, 60%, 25%), #070A11)`,
        }}
      >
        <span className="text-xs font-mono-code text-slate-200 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm">
          Spectrum Wave: {hue}°
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={360}
        value={hue}
        onChange={(e) => {
          setHue(parseInt(e.target.value));
          if (hue % 30 === 0) soundEngine.playSingingBowlChime(300 + hue);
        }}
        className="w-full max-w-sm mx-auto accent-teal-400 cursor-pointer block"
      />
    </div>
  );
};

// =========================================================================
// MINI-GAME 6: RHYTHM TAP
// =========================================================================
const RhythmTapGame: React.FC = () => {
  const [taps, setTaps] = useState(0);

  const handleTap = () => {
    setTaps((t) => t + 1);
    soundEngine.playSingingBowlChime(432 + (taps % 8) * 30);
  };

  return (
    <div className="text-center space-y-5">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          GENTLE RHYTHM TAP
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Tap smoothly at a relaxed heartbeat cadence
        </p>
      </div>

      <button
        type="button"
        onClick={handleTap}
        className="w-28 h-28 rounded-full bg-teal-500/20 border-2 border-teal-400/60 text-teal-300 font-military font-bold text-xs uppercase tracking-wider mx-auto flex flex-col items-center justify-center shadow-xl shadow-teal-500/20 active:scale-95 transition cursor-pointer"
      >
        <Heart className="w-6 h-6 mb-1 text-teal-400 animate-pulse" />
        <span>TAP ({taps})</span>
      </button>
    </div>
  );
};

// =========================================================================
// MINI-GAME 7: ZEN CAIRN BALANCE
// =========================================================================
const ZenCairnGame: React.FC = () => {
  const [stones, setStones] = useState([5, 4, 3, 2, 1]);

  return (
    <div className="text-center space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          ZEN CAIRN EQUILIBRIUM
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Balanced pebbles resting in harmonic stillness
        </p>
      </div>

      <div className="py-6 flex flex-col items-center justify-center gap-1.5">
        {stones.map((size, idx) => (
          <div
            key={idx}
            className="h-6 rounded-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 border border-slate-600 shadow-md transition-transform hover:scale-105"
            style={{ width: `${size * 40}px` }}
          />
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 8: ZEN PATTERN
// =========================================================================
const ZenPatternGame: React.FC = () => {
  const [nodes, setNodes] = useState<number[]>([0, 1, 2]);

  const toggleNode = (i: number) => {
    soundEngine.playSingingBowlChime(396 + i * 40);
    setNodes((prev) => (prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i]));
  };

  return (
    <div className="text-center space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          ZEN SACRED GEOMETRY
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Touch the nodes to weave calming geometric mandalas
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto py-2">
        {Array.from({ length: 9 }).map((_, idx) => {
          const isActive = nodes.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggleNode(idx)}
              className={`h-16 rounded-2xl border transition cursor-pointer flex items-center justify-center text-xs font-mono-code font-bold ${
                isActive
                  ? 'bg-teal-500/25 border-teal-400 text-teal-200 shadow-md shadow-teal-500/20'
                  : 'bg-slate-950 border-slate-800 text-slate-600'
              }`}
            >
              {isActive ? '✦' : '•'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 9: SOUND CHIMES MEMORY
// =========================================================================
const SoundMemoryGame: React.FC = () => {
  const notes = [
    { freq: 261.63, label: 'C' },
    { freq: 293.66, label: 'D' },
    { freq: 329.63, label: 'E' },
    { freq: 392.0, label: 'G' },
    { freq: 440.0, label: 'A' },
  ];

  return (
    <div className="text-center space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          PENTATONIC SOUND CHIMES
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Play harmonic chimes with acoustic reverberation
        </p>
      </div>

      <div className="flex items-center justify-center gap-2.5 py-6 flex-wrap">
        {notes.map((n) => (
          <button
            key={n.label}
            type="button"
            onClick={() => soundEngine.playSingingBowlChime(n.freq)}
            className="w-16 h-24 rounded-2xl bg-gradient-to-b from-slate-900 to-teal-950/40 border border-teal-500/30 text-teal-300 font-military font-bold text-sm hover:border-teal-400 hover:scale-105 transition cursor-pointer flex flex-col items-center justify-center shadow-lg active:scale-95"
          >
            <span>{n.label}</span>
            <span className="text-[10px] font-mono-code text-slate-400 mt-1">{Math.round(n.freq)}Hz</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// MINI-GAME 10: PARTICLE FLOW
// =========================================================================
const ParticleFlowGame: React.FC = () => {
  const [pulse, setPulse] = useState(0);

  return (
    <div className="text-center space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
          KINETIC PARTICLE DUST
        </h4>
        <p className="text-xs font-mono-code text-slate-400">
          Touch and stir the magnetic particulate field
        </p>
      </div>

      <div
        onClick={() => {
          setPulse((p) => p + 1);
          soundEngine.playSingingBowlChime(528);
        }}
        className="w-full h-52 rounded-2xl bg-slate-950/90 border border-teal-500/30 flex items-center justify-center cursor-pointer relative overflow-hidden group shadow-inner"
      >
        <div className="text-xs font-mono-code text-teal-400/80 pointer-events-none">
          Click anywhere to ripple particles ({pulse} ripples created)
        </div>
      </div>
    </div>
  );
};
