import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Loader2, AlertCircle, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { getStoredToken } from '../../utils/authClient';

interface VoiceMessagePlayerProps {
  audioUrl?: string;
  audioBase64?: string;
  durationSeconds?: number;
  mimeType?: string;
  isSelf?: boolean;
}

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  audioBase64,
  durationSeconds = 0,
  mimeType,
  isSelf = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Compute effective audio source URL
  const audioSrc = React.useMemo(() => {
    if (audioUrl) {
      if (audioUrl.startsWith('/api/media/voice/') && !audioUrl.includes('token=')) {
        const token = getStoredToken();
        if (token) {
          const sep = audioUrl.includes('?') ? '&' : '?';
          return `${audioUrl}${sep}token=${encodeURIComponent(token)}`;
        }
      }
      return audioUrl;
    }
    if (audioBase64) {
      if (audioBase64.startsWith('data:') || audioBase64.startsWith('blob:') || audioBase64.startsWith('http')) {
        return audioBase64;
      }
      const type = mimeType || 'audio/webm;codecs=opus';
      return `data:${type};base64,${audioBase64}`;
    }
    return '';
  }, [audioUrl, audioBase64, mimeType]);

  useEffect(() => {
    if (durationSeconds > 0 && duration === 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds, duration]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (!audioSrc) {
      setPlaybackError('Audio data missing');
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio(audioSrc);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
          setDuration(Math.round(audio.duration));
        }
        setIsLoading(false);
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = (e) => {
        console.error('Audio playback failure:', e);
        setIsPlaying(false);
        setIsLoading(false);
        setPlaybackError('Could not decode or stream audio file.');
      };

      audio.onwaiting = () => {
        setIsLoading(true);
      };

      audio.oncanplay = () => {
        setIsLoading(false);
      };
    }

    const audio = audioRef.current;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setPlaybackError(null);
      setIsLoading(true);
      try {
        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Audio play error:', err);
        setIsLoading(false);
        setIsPlaying(false);
        setPlaybackError('Playback blocked or unsupported format.');
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.width));
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const effectiveDuration = duration || audioRef.current.duration || 1;
    const newTime = ratio * effectiveDuration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={`flex flex-col gap-1.5 p-2.5 rounded-xl border transition-all ${
        isSelf
          ? 'bg-blue-500/10 border-blue-500/30 text-cyan-100'
          : 'bg-slate-950/80 border-slate-700/60 text-slate-200'
      }`}
      style={{ minWidth: '240px', maxWidth: '320px' }}
    >
      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
        <span className="flex items-center gap-1.5 font-medium text-cyan-400/90">
          <span>🎙</span> Voice Note
        </span>
        <span className="text-[11px] text-slate-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={handlePlayPause}
          disabled={!audioSrc}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md ${
            isSelf
              ? 'bg-blue-500 text-slate-950 hover:bg-cyan-400'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
          }`}
          title={isPlaying ? 'Pause' : 'Play voice message'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Progress scrub bar */}
        <div
          ref={progressRef}
          onClick={handleSeek}
          className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative group border border-slate-700/50"
          title="Click to seek"
        >
          <div
            className={`h-full transition-all duration-100 ${
              isSelf ? 'bg-gradient-to-r from-blue-500 to-amber-300' : 'bg-gradient-to-r from-emerald-500 to-emerald-300'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
          {/* Draggable thumb hint on hover */}
          <div
            className="absolute top-0 bottom-0 w-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ left: `calc(${progressPercent}% - 4px)` }}
          />
        </div>

        {/* Mute button */}
        {audioRef.current && (
          <button
            type="button"
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Error state if any */}
      {playbackError && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-950/40 px-2 py-1 rounded border border-rose-800/40 mt-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="flex-1 truncate">{playbackError}</span>
          <button
            type="button"
            onClick={handlePlayPause}
            className="text-cyan-400 underline hover:text-amber-300 ml-1 shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
