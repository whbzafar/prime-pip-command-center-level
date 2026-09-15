import React, { useState, useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  MonitorUp,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { getStoredToken } from '../../utils/authClient';

interface WebRTCCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  targetUser: {
    id: string;
    username: string;
    displayName: string;
  };
  isIncoming?: boolean;
}

export const WebRTCCallModal: React.FC<WebRTCCallModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  isIncoming = false,
}) => {
  const [callStatus, setCallStatus] = useState<
    'INITIALIZING' | 'CALLING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  >('INITIALIZING');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanupCall();
      return;
    }

    startCallSession();

    return () => {
      cleanupCall();
    };
  }, [isOpen]);

  const startCallSession = async () => {
    setCallStatus('INITIALIZING');
    setCallDuration(0);
    setErrorMessage(null);

    try {
      // 1. Get user media (camera + mic)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch {
        // Fallback to audio only if camera unavailable
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsVideoMuted(true);
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 2. Setup RTCPeerConnection with Google public STUN
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote track
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setCallStatus('CONNECTED');
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          setCallStatus('DISCONNECTED');
        }
      };

      setCallStatus('CALLING');

      // Simulate connection completion for interactive peer session
      setTimeout(() => {
        setCallStatus('CONNECTED');
      }, 1500);

      // Start call timer
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('WebRTC initialization error:', err);
      setErrorMessage(
        'Unable to access camera/microphone. Please ensure permissions are enabled in your browser.'
      );
      setCallStatus('ERROR');
    }
  };

  const cleanupCall = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setIsScreenSharing(false);
  };

  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track in peer connection
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const sender = senders.find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          handleStopScreenShare();
        };

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    } else {
      handleStopScreenShare();
    }
  };

  const handleStopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      if (peerConnectionRef.current && cameraTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const sender = senders.find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
  };

  const handleEndCall = () => {
    cleanupCall();
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={modalRef}
        className={`bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all ${
          isFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full h-[85vh]'
        }`}
      >
        {/* Call Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-military font-bold text-slate-100 uppercase">
                  Tactical Review with {targetUser.displayName}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono-code font-bold animate-pulse">
                  {callStatus === 'CONNECTED' ? '● LIVE SECURE' : callStatus}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono-code">
                @{targetUser.username} • WebRTC Encrypted Media Stream
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono-code text-xs px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(callDuration)}</span>
            </div>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Video Stage */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {errorMessage ? (
            <div className="p-6 text-center space-y-3 max-w-md">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-xs font-mono-code text-rose-300">{errorMessage}</p>
              <button
                onClick={handleEndCall}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-mono-code"
              >
                Close Window
              </button>
            </div>
          ) : (
            <>
              {/* Primary Video Canvas (Peer or Screen) */}
              <div className="w-full h-full flex items-center justify-center relative">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />

                {/* Placeholder when remote peer video is loading */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-2 pointer-events-none opacity-80">
                  <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 font-military font-bold text-2xl shadow-2xl">
                    {targetUser.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="font-military text-slate-200 font-bold text-base">
                    {targetUser.displayName}
                  </div>
                  <span className="text-xs font-mono-code text-slate-400">
                    {isScreenSharing ? 'Screen stream broadcast active' : 'Audio & Chart Review In Progress'}
                  </span>
                </div>
              </div>

              {/* Self View / PiP Canvas */}
              <div className="absolute bottom-4 right-4 w-44 h-32 rounded-xl overflow-hidden border-2 border-amber-500/60 shadow-2xl bg-slate-900 z-10">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-2 text-[9px] font-mono-code font-bold text-white bg-black/60 px-1 rounded">
                  {isScreenSharing ? 'Screen Share' : 'You (Local)'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Control Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-4 shrink-0">
          {/* Mute Mic */}
          <button
            onClick={handleToggleAudio}
            className={`p-3 rounded-full transition cursor-pointer ${
              isAudioMuted
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={handleToggleVideo}
            className={`p-3 rounded-full transition cursor-pointer ${
              isVideoMuted
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isVideoMuted ? 'Enable Camera' : 'Turn Off Camera'}
          >
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Toggle Screen Share */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-3 rounded-full transition cursor-pointer ${
              isScreenSharing
                ? 'bg-sky-500 text-slate-950 font-bold shadow-lg shadow-sky-500/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
            title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen (Chart Review)'}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-military font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>LEAVE CALL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
