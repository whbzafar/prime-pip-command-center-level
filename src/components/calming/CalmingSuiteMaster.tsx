import React, { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Sliders,
  Music,
  Wind,
  Sparkles,
  Clock,
  Compass,
  ShieldAlert,
  CheckCircle2,
  Coffee,
  Gamepad2,
  Calendar,
  Sun,
  Eye,
  Activity,
  History,
  ArrowLeft,
  Home,
  Square,
  Play,
  Heart,
} from 'lucide-react';
import { CalmingSuiteTab } from './types';
import { soundEngine } from './audio/soundEngine';
import { CalmingSuiteHome } from './CalmingSuiteHome';
import { PureSynthesisCenterpiece } from './PureSynthesisCenterpiece';
import { AmbientMixer } from './AmbientMixer';
import { RelaxationMusic } from './RelaxationMusic';
import { BreathingCenter } from './BreathingCenter';
import { MindResetSession } from './MindResetSession';
import { FocusMode } from './FocusMode';
import { ResetSessions } from './ResetSessions';
import { CalmGamesHub } from './CalmGamesHub';
import { DailyCalmChallenge } from './DailyCalmChallenge';
import { SoulRefreshExperience } from './SoulRefreshExperience';
import { DigitalRelaxation } from './DigitalRelaxation';
import { SoundWaveVisualizer } from './SoundWaveVisualizer';
import { SessionHistoryAndFeedback } from './SessionHistoryAndFeedback';
import { Trade } from '../../types';

interface CalmingSuiteMasterProps {
  initialTab?: CalmingSuiteTab;
  trades?: Trade[];
  userId?: string;
  onNavigateToTab?: (tab: string) => void;
  onLogJournalNote?: (note: string) => void;
}

export const CalmingSuiteMaster: React.FC<CalmingSuiteMasterProps> = ({
  initialTab = 'HOME',
  trades = [],
  userId = 'default',
  onNavigateToTab,
  onLogJournalNote,
}) => {
  const [activeTab, setActiveTab] = useState<CalmingSuiteTab>(initialTab);
  const [isAnyAudioActive, setIsAnyAudioActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(soundEngine.getIsMuted());
  const [masterVolume, setMasterVolume] = useState<number>(soundEngine.getMasterVolume());

  // Poll audio status periodically for global dock
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnyAudioActive(soundEngine.isAnyAudioActive());
      setIsMuted(soundEngine.getIsMuted());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleStopAllAudio = () => {
    soundEngine.stopAllAudio();
    setIsAnyAudioActive(false);
  };

  const handleToggleMute = () => {
    soundEngine.toggleMute();
    setIsMuted(soundEngine.getIsMuted());
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    soundEngine.setMasterVolume(vol);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & Navigation Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-950/80 p-3 sm:p-4 rounded-2xl border border-white/[0.08] backdrop-blur-md sticky top-14 sm:top-16 z-30 shadow-xl">
        <div className="flex items-center gap-2">
          {activeTab !== 'HOME' && (
            <button
              type="button"
              onClick={() => setActiveTab('HOME')}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-military font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>HOME</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-military font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              CALMING TOOLS SUITE
            </span>
            {activeTab !== 'HOME' && (
              <span className="text-xs font-mono-code text-teal-400 hidden sm:inline">
                / {activeTab.replace('_', ' ')}
              </span>
            )}
          </div>
        </div>

        {/* Persistent Audio Quick Dock in Header */}
        <div className="flex items-center gap-2">
          {isAnyAudioActive && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono-code">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span className="hidden sm:inline">AUDIO ACTIVE</span>
              <button
                type="button"
                onClick={handleStopAllAudio}
                className="p-1 rounded hover:bg-teal-500/20 text-rose-300 transition"
                title="Stop all audio"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
              isMuted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title={isMuted ? 'Unmute' : 'Mute all'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Session history & reflections"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-Navigation Pills (Scrollable on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-military">
        {[
          { id: 'HOME', label: 'Suite Home', icon: Home },
          { id: 'PURE_SYNTHESIS', label: 'Pure Synthesis', icon: Volume2 },
          { id: 'AMBIENT_MIXER', label: 'Ambient Mixer', icon: Sliders },
          { id: 'RELAXATION_MUSIC', label: 'Relax Music', icon: Music },
          { id: 'BREATHING', label: 'Breathing', icon: Wind },
          { id: 'MIND_RESET', label: 'Mind Reset', icon: Sparkles },
          { id: 'FOCUS_MODE', label: 'Focus Sanctuary', icon: Clock },
          { id: 'RESET_SESSIONS', label: 'Reset Sessions', icon: Compass },
          { id: 'CALM_GAMES', label: 'Calm Games', icon: Gamepad2 },
          { id: 'DAILY_CHALLENGE', label: 'Daily Calm', icon: Calendar },
          { id: 'SOUL_REFRESH', label: 'Soul Refresh', icon: Sun },
          { id: 'DIGITAL_RELAXATION', label: 'Eye Relax', icon: Eye },
          { id: 'VISUALIZER', label: 'Waveform', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-teal-500 text-slate-950 font-bold border-teal-400 shadow-md shadow-teal-500/20'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main View Render */}
      <div className="min-h-[500px]">
        {activeTab === 'HOME' && (
          <CalmingSuiteHome
            onSelectTab={(t) => setActiveTab(t)}
            trades={trades}
          />
        )}

        {activeTab === 'PURE_SYNTHESIS' && <PureSynthesisCenterpiece />}

        {activeTab === 'AMBIENT_MIXER' && <AmbientMixer userId={userId} />}

        {activeTab === 'RELAXATION_MUSIC' && <RelaxationMusic />}

        {activeTab === 'BREATHING' && <BreathingCenter />}

        {activeTab === 'MIND_RESET' && (
          <MindResetSession
            onComplete={() => {
              // Option to go back to home or dashboard
            }}
          />
        )}

        {activeTab === 'FOCUS_MODE' && (
          <FocusMode onNavigateToTab={onNavigateToTab} />
        )}

        {activeTab === 'PRE_TRADE_RESET' && (
          <ResetSessions
            initialType="PRE_TRADE"
            onNavigateToTab={onNavigateToTab}
            onLogJournalNote={onLogJournalNote}
          />
        )}

        {activeTab === 'POST_LOSS_RESET' && (
          <ResetSessions
            initialType="POST_LOSS"
            onNavigateToTab={onNavigateToTab}
            onLogJournalNote={onLogJournalNote}
          />
        )}

        {activeTab === 'POST_WIN_RESET' && (
          <ResetSessions
            initialType="POST_WIN"
            onNavigateToTab={onNavigateToTab}
            onLogJournalNote={onLogJournalNote}
          />
        )}

        {activeTab === 'FATIGUE_RESET' && (
          <ResetSessions
            initialType="FATIGUE"
            onNavigateToTab={onNavigateToTab}
            onLogJournalNote={onLogJournalNote}
          />
        )}

        {activeTab === 'RESET_SESSIONS' && (
          <ResetSessions
            initialType="PRE_TRADE"
            onNavigateToTab={onNavigateToTab}
            onLogJournalNote={onLogJournalNote}
          />
        )}

        {activeTab === 'CALM_GAMES' && <CalmGamesHub />}

        {activeTab === 'DAILY_CHALLENGE' && (
          <DailyCalmChallenge
            onSelectTab={(t) => setActiveTab(t)}
            userId={userId}
          />
        )}

        {activeTab === 'SOUL_REFRESH' && <SoulRefreshExperience />}

        {activeTab === 'DIGITAL_RELAXATION' && <DigitalRelaxation />}

        {activeTab === 'VISUALIZER' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h3 className="text-sm font-military font-bold text-slate-100 uppercase tracking-wider">
                REAL-TIME PROCEDURAL WAVEFORM OSCILLOSCOPE
              </h3>
              <p className="text-xs font-mono-code text-slate-400 mt-0.5">
                Displays the exact live harmonic spectrum of active Web Audio synthesizers
              </p>
            </div>
            <SoundWaveVisualizer height={260} showControls={true} />
          </div>
        )}

        {activeTab === 'HISTORY' && (
          <SessionHistoryAndFeedback userId={userId} />
        )}
      </div>

      {/* Non-Medical Disclaimer Footer */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
        <p className="text-[11px] font-mono-code text-slate-400">
          PRIMEPIPFX CALMING TOOLS SUITE • OPERATIONAL RELAXATION & FOCUS
        </p>
        <p className="text-[10px] font-mono-code text-slate-500 max-w-xl mx-auto">
          Notice: This suite provides professional relaxation, focus, mindfulness, and mental-reset tools for trading discipline.
          It is not intended as medical treatment and does not make claims regarding medical conditions.
        </p>
      </div>
    </div>
  );
};
