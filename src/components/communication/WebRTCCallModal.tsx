import React, { useEffect, useRef, useState } from 'react';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, MonitorUp,
  Maximize2, Minimize2, Clock, AlertCircle,
} from 'lucide-react';
import { UserAccount } from '../../types';

interface WebRTCCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  targetUser: { id: string; username: string; displayName: string };
  isIncoming?: boolean;
}

type Signal = {
  id?: string;
  signal_type?: string;
  payload?: any;
};

export const WebRTCCallModal: React.FC<WebRTCCallModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser,
  isIncoming = false,
}) => {
  const [callStatus, setCallStatus] = useState<'INITIALIZING' | 'RINGING' | 'CALLING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR'>('INITIALIZING');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const isCallerRef = useRef(!isIncoming);
  const remoteDescriptionSetRef = useRef(false);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postJson = async (url: string, body: any) => {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      throw new Error(data?.error || 'Communication request failed.');
    }
    return data;
  };

  const sendCandidate = async (candidate: RTCIceCandidate) => {
    const callId = callIdRef.current;
    if (!callId) {
      pendingCandidatesRef.current.push(candidate.toJSON());
      return;
    }
    try {
      await postJson('/api/webrtc/candidate', {
        callId,
        isCaller: isCallerRef.current,
        candidate: candidate.toJSON(),
      });
    } catch (error) {
      console.warn('ICE candidate delivery failed:', error);
    }
  };

  const applySignals = async (signals: Signal[]) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    for (const signal of signals || []) {
      if (!signal?.id || processedSignalsRef.current.has(signal.id)) continue;
      processedSignalsRef.current.add(signal.id);

      try {
        if (signal.signal_type === 'ANSWER' && isCallerRef.current && !remoteDescriptionSetRef.current) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          remoteDescriptionSetRef.current = true;
          setCallStatus('CONNECTED');
          for (const candidate of pendingCandidatesRef.current.splice(0)) {
            await postJson('/api/webrtc/candidate', {
              callId: callIdRef.current,
              isCaller: true,
              candidate,
            });
          }
        }

        if (signal.signal_type === 'OFFER' && !isCallerRef.current && !remoteDescriptionSetRef.current) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          remoteDescriptionSetRef.current = true;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await postJson('/api/webrtc/answer', {
            callId: callIdRef.current,
            answer,
          });
          setCallStatus('CONNECTED');
        }

        if (signal.signal_type === 'CANDIDATE' && signal.payload) {
          if (remoteDescriptionSetRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
          }
        }
      } catch (error) {
        console.warn('WebRTC signal processing failed:', error);
      }
    }
  };

  const pollCall = async () => {
    const callId = callIdRef.current;
    if (!callId) return;
    try {
      const response = await fetch('/api/webrtc/status/' + encodeURIComponent(callId), {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) return;
      const data = await response.json();
      const session = data?.session;
      if (!session) return;
      if (session.status === 'ENDED') {
        setCallStatus('DISCONNECTED');
        onClose();
        return;
      }
      await applySignals(session.signals || []);
    } catch {
      // Keep polling; transient network errors should not terminate a call.
    }
  };

  const startSession = async () => {
    if (!currentUser) {
      setErrorMessage('You must be logged in to place or receive a call.');
      setCallStatus('ERROR');
      return;
    }

    setCallStatus(isIncoming ? 'RINGING' : 'INITIALIZING');
    setErrorMessage(null);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsVideoMuted(true);
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        const remote = event.streams?.[0];
        if (remote && remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) void sendCandidate(event.candidate);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'connected') setCallStatus('CONNECTED');
        if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          setCallStatus('DISCONNECTED');
        }
      };

      isCallerRef.current = !isIncoming;

      if (isIncoming) {
        setCallStatus('RINGING');
        // The durable call record is discovered by the caller/receiver polling.
        // Wait for the offer before answering.
        const activeResponse = await fetch('/api/webrtc/active', {
          credentials: 'include',
          cache: 'no-store',
        });
        const activeData = await activeResponse.json().catch(() => ({}));
        if (activeData?.session?.callId) callIdRef.current = activeData.session.callId;
      } else {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        const created = await postJson('/api/webrtc/call', {
          receiverId: targetUser.id,
          receiverUsername: targetUser.username,
          offer,
          callType: 'video',
          isScreenSharing: false,
        });
        callIdRef.current = created.session?.callId || created.session?.id || null;
        if (!callIdRef.current) throw new Error('Call session could not be created.');
        setCallStatus('CALLING');

        for (const candidate of pendingCandidatesRef.current.splice(0)) {
          await postJson('/api/webrtc/candidate', {
            callId: callIdRef.current,
            isCaller: true,
            candidate,
          });
        }
      }

      pollTimerRef.current = setInterval(pollCall, 700);
      await pollCall();
      durationTimerRef.current = setInterval(() => {
        setCallDuration((value) => value + 1);
      }, 1000);
    } catch (error) {
      console.error('WebRTC initialization error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start the call.');
      setCallStatus('ERROR');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void startSession();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      pollTimerRef.current = null;
      durationTimerRef.current = null;
    };
  }, [isOpen]);

  const cleanupCall = async () => {
    const callId = callIdRef.current;
    if (callId) {
      try {
        await postJson('/api/webrtc/end', { callId });
      } catch {}
    }

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    pollTimerRef.current = null;
    durationTimerRef.current = null;

    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    callIdRef.current = null;
  };

  const handleToggleAudio = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsAudioMuted(!track.enabled);
  };

  const handleToggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoMuted(!track.enabled);
  };

  const handleToggleScreenShare = async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    if (!isScreenSharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        const screenTrack = screen.getVideoTracks()[0];
        const sender = pc.getSenders().find((item) => item.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = screen;
        screenTrack.onended = () => void stopScreenShare();
        setIsScreenSharing(true);
      } catch (error) {
        console.warn('Screen sharing unavailable:', error);
      }
    } else {
      await stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    const pc = peerConnectionRef.current;
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current = null;

    const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
    const sender = pc?.getSenders().find((item) => item.track?.kind === 'video');
    if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    setIsScreenSharing(false);
  };

  const handleEndCall = async () => {
    await cleanupCall();
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return minutes.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-2 sm:p-4">
      <div className={`bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full h-[85vh]'}`}>
        <div className="p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-sm font-military font-bold text-slate-100 truncate">
                  {isIncoming ? 'Incoming call from ' : 'Call with '}{targetUser.displayName}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono-code font-bold shrink-0">
                  {callStatus}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono-code truncate block">
                @{targetUser.username} • Peer-to-peer WebRTC media
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono-code text-xs px-2 py-1 bg-slate-950 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5" /> {formatTimer(callDuration)}
            </div>
            <button type="button" onClick={() => setIsFullscreen((v) => !v)} className="p-1.5 rounded-lg bg-slate-950 text-slate-400 border border-slate-800">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 relative bg-black min-h-0 overflow-hidden">
          {errorMessage ? (
            <div className="h-full flex items-center justify-center p-6 text-center">
              <div className="max-w-md space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-xs font-mono-code text-rose-300">{errorMessage}</p>
                <button type="button" onClick={handleEndCall} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-mono-code">
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
              {callStatus !== 'CONNECTED' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-950 border-2 border-blue-500/40 flex items-center justify-center text-cyan-400 font-military font-bold text-2xl mx-auto shadow-2xl">
                      {targetUser.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="font-military text-slate-200 font-bold text-base mt-2">{targetUser.displayName}</div>
                    <span className="text-xs font-mono-code text-slate-400">{callStatus === 'RINGING' ? 'Establishing secure call…' : 'Connecting peer media…'}</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-3 right-3 w-36 sm:w-44 aspect-video rounded-xl overflow-hidden border-2 border-blue-500/60 shadow-2xl bg-slate-950">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute bottom-1 left-2 text-[9px] font-mono-code font-bold text-white bg-black/60 px-1 rounded">
                  {isScreenSharing ? 'Screen Share' : 'You'}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-2 sm:gap-4 shrink-0">
          <button type="button" onClick={handleToggleAudio} className={`p-3 rounded-full ${isAudioMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'}`}>
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button type="button" onClick={handleToggleVideo} className={`p-3 rounded-full ${isVideoMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-200'}`}>
            {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
          <button type="button" onClick={handleToggleScreenShare} className={`p-3 rounded-full ${isScreenSharing ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-200'}`}>
            <MonitorUp className="w-5 h-5" />
          </button>
          <button type="button" onClick={handleEndCall} className="px-5 py-3 rounded-full bg-rose-600 text-white font-military font-bold text-xs flex items-center gap-2">
            <PhoneOff className="w-4 h-4" /> LEAVE CALL
          </button>
        </div>
      </div>
    </div>
  );
};
