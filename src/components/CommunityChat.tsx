import React, { useState, useEffect, useRef } from 'react';
import { UserAccount } from '../types';
import { getKarachiDate, getKarachiTime } from '../utils/time';
import { getStoredToken } from '../utils/authClient';
import { FriendSystem } from './communication/FriendSystem';
import { PrivateChat } from './communication/PrivateChat';
import { WebRTCCallModal } from './communication/WebRTCCallModal';
import { VoiceMessagePlayer } from './communication/VoiceMessagePlayer';
import {
  Users,
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Smile,
  ShieldCheck,
  User,
  Clock,
  RefreshCw,
  X,
  Volume2,
  MessageSquare,
  Video,
  UserPlus,
  Radio,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  userRole: 'ADMIN' | 'CUSTOMER';
  displayName: string;
  text: string;
  emoji?: string;
  photoBase64?: string;
  audioBase64?: string;
  audioAttachmentId?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
  audioSize?: number;
  audioUrl?: string;
  timestamp: number;
  timePkt: string;
  datePkt: string;
}

interface CommunityChatProps {
  currentUser?: UserAccount | null;
  onOpenLogin?: () => void;
}

export const CommunityChat: React.FC<CommunityChatProps> = ({ currentUser, onOpenLogin }) => {
  // Navigation mode
  const [commMode, setCommMode] = useState<'PUBLIC' | 'PRIVATE' | 'FRIENDS'>('PUBLIC');
  const [activePrivateContact, setActivePrivateContact] = useState<{
    id: string;
    username: string;
    displayName: string;
  } | null>(null);

  // WebRTC Call Modal state
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callTargetUser, setCallTargetUser] = useState<{
    id: string;
    username: string;
    displayName: string;
  } | null>(null);

  // Public Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm;codecs=opus');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/community/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {
      // Offline fallback: load cached
      try {
        const cached = localStorage.getItem('primepipfx_community_cache');
        if (cached) setMessages(JSON.parse(cached));
      } catch {}
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (commMode === 'PUBLIC') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, commMode]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMicNotice('Image must be under 5MB');
      setTimeout(() => setMicNotice(null), 3500);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Safe High-Fidelity Voice Recording (Cross-browser compatible)
  const startVoiceRecording = async () => {
    try {
      setMicNotice(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
          mimeType = 'audio/aac';
        }
      }

      setRecordedMimeType(mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      setAudioDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setAudioDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setMicNotice('Microphone access denied or unavailable in this environment.');
      setTimeout(() => setMicNotice(null), 4000);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping audio:', err);
      }
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      if (onOpenLogin) onOpenLogin();
      return;
    }

    if (!inputText.trim() && !selectedPhoto && !audioBase64) return;

    setIsSending(true);
    const token = getStoredToken();
    const isDev = currentUser.role === 'DEVELOPER' || currentUser.role === 'ADMIN' || currentUser.isDeveloper;

    let voiceMeta: {
      audioAttachmentId?: string;
      audioUrl?: string;
      audioMimeType?: string;
      audioDurationSeconds?: number;
      audioSize?: number;
    } = {};

    // Upload voice recording to persistent server media storage
    if (audioBase64) {
      try {
        const uploadHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) uploadHeaders['Authorization'] = `Bearer ${token}`;

        const uploadRes = await fetch('/api/media/voice/upload', {
          method: 'POST',
          headers: uploadHeaders,
          body: JSON.stringify({
            audioData: audioBase64,
            mimeType: recordedMimeType,
            durationSeconds: audioDuration,
            isPrivate: false,
          }),
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.ok && uploadData.audioAttachmentId) {
            voiceMeta = {
              audioAttachmentId: uploadData.audioAttachmentId,
              audioUrl: uploadData.audioUrl,
              audioMimeType: uploadData.audioMimeType,
              audioDurationSeconds: uploadData.audioDurationSeconds || audioDuration,
              audioSize: uploadData.audioSize,
            };
          }
        }
      } catch (upErr) {
        console.warn('Voice upload fallback to base64 payload:', upErr);
      }
    }

    const payload = {
      userId: currentUser.id,
      username: currentUser.username,
      userRole: isDev ? 'ADMIN' : 'CUSTOMER',
      displayName: isDev ? 'PrimePipFX Developer / Owner' : (currentUser.name || currentUser.username),
      text: inputText.trim(),
      photoBase64: selectedPhoto || undefined,
      audioBase64: voiceMeta.audioAttachmentId ? undefined : (audioBase64 || undefined),
      audioAttachmentId: voiceMeta.audioAttachmentId,
      audioMimeType: voiceMeta.audioMimeType || recordedMimeType,
      audioDurationSeconds: voiceMeta.audioDurationSeconds || (audioDuration > 0 ? audioDuration : undefined),
      audioSize: voiceMeta.audioSize,
      audioUrl: voiceMeta.audioUrl,
      timePkt: getKarachiTime(),
      datePkt: getKarachiDate(),
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setInputText('');
        setSelectedPhoto(null);
        setAudioBase64(null);
        setAudioDuration(0);
        await fetchMessages();
      }
    } catch (err) {
      console.error('Failed to post message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartCall = (target: { id: string; username: string; displayName: string }) => {
    setCallTargetUser(target);
    setIsCallModalOpen(true);
  };

  const quickEmojis = ['🔥', '🎯', '🚀', '📈', '📉', '✅', '⚠️', '💪', '🙏', '👀'];

  return (
    <div className="space-y-4 max-w-5xl mx-auto h-[84vh] flex flex-col">
      {/* Top Channel Navigation Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 flex items-center gap-2">
              <span>PRIMEPIPFX COMMUNICATIONS</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                ONLINE
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 font-sans">
              Encrypted community room • 1-on-1 private messaging • WebRTC chart reviews
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono-code">
          <button
            onClick={() => {
              setCommMode('PUBLIC');
              setActivePrivateContact(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              commMode === 'PUBLIC'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Community Hub</span>
          </button>

          <button
            onClick={() => {
              setCommMode('FRIENDS');
              setActivePrivateContact(null);
            }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              commMode === 'FRIENDS'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Friends & Contacts</span>
          </button>

          {activePrivateContact && (
            <button
              onClick={() => setCommMode('PRIVATE')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                commMode === 'PRIVATE'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>DM: {activePrivateContact.displayName}</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: PRIVATE CHAT */}
      {commMode === 'PRIVATE' && activePrivateContact && (
        <PrivateChat
          currentUser={currentUser}
          activeContact={activePrivateContact}
          onBack={() => setCommMode('FRIENDS')}
          onStartCall={() => handleStartCall(activePrivateContact)}
        />
      )}

      {/* VIEW 2: FRIENDS & CONTACTS */}
      {commMode === 'FRIENDS' && (
        <FriendSystem
          currentUser={currentUser}
          onStartPrivateChat={(friend) => {
            setActivePrivateContact(friend);
            setCommMode('PRIVATE');
          }}
          onStartCall={handleStartCall}
        />
      )}

      {/* VIEW 3: PUBLIC COMMUNITY CHAT */}
      {commMode === 'PUBLIC' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {micNotice && (
            <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono-code text-center">
              {micNotice}
            </div>
          )}

          {/* Messages Scroll Area */}
          <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-3.5 shadow-inner">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono-code text-xs">
                <Users className="w-8 h-8 mb-2 opacity-50 text-amber-400" />
                <span>No community messages yet. Be the first to start the tactical discussion!</span>
              </div>
            ) : (
              messages.map((m) => {
                const isOwner = m.userRole === 'ADMIN';
                const isMe = currentUser && m.userId === currentUser.id;

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-xl ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                  >
                    {/* Sender Header */}
                    <div className="flex items-center gap-2 mb-1 text-[11px] font-mono-code">
                      <span className={`font-bold ${isOwner ? 'text-amber-400' : 'text-slate-300'}`}>
                        {m.displayName}
                      </span>
                      {isOwner && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold">
                          ADMIN / OWNER
                        </span>
                      )}
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{m.timePkt} PKT</span>
                      </span>

                      {!isMe && currentUser && (
                        <button
                          onClick={() => {
                            setActivePrivateContact({
                              id: m.userId,
                              username: m.username,
                              displayName: m.displayName,
                            });
                            setCommMode('PRIVATE');
                          }}
                          className="text-[10px] text-amber-400/80 hover:text-amber-300 underline ml-1 cursor-pointer"
                        >
                          DM
                        </button>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                        isMe
                          ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 rounded-tr-none'
                          : isOwner
                          ? 'bg-slate-900 border-amber-500/30 text-slate-200 rounded-tl-none'
                          : 'bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none'
                      }`}
                    >
                      {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}

                      {/* Photo Attachment */}
                      {m.photoBase64 && (
                        <div className="rounded-xl overflow-hidden border border-slate-700/80 max-w-sm mt-1">
                          <img
                            src={m.photoBase64}
                            alt="Shared setup"
                            className="w-full object-cover max-h-60"
                          />
                        </div>
                      )}

                      {/* Audio Voice Note with Reliable HTML5 Player */}
                      {(m.audioAttachmentId || m.audioUrl || m.audioBase64) && (
                        <div className="mt-1">
                          <VoiceMessagePlayer
                            audioUrl={m.audioUrl || (m.audioAttachmentId ? `/api/media/voice/${m.audioAttachmentId}` : undefined)}
                            audioBase64={m.audioBase64}
                            durationSeconds={m.audioDurationSeconds}
                            mimeType={m.audioMimeType}
                            isSelf={isMe}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Input Row */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 shrink-0">
            {/* Attachment Previews */}
            {(selectedPhoto || audioBase64) && (
              <div className="flex flex-col gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono-code">
                {selectedPhoto && (
                  <div className="relative inline-block">
                    <img src={selectedPhoto} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                    <button
                      onClick={() => setSelectedPhoto(null)}
                      className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {audioBase64 && (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <VoiceMessagePlayer
                        audioBase64={audioBase64}
                        durationSeconds={audioDuration}
                        mimeType={recordedMimeType}
                        isSelf={true}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBase64(null);
                        setAudioDuration(0);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                      title="Discard recorded voice message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Emoji Bar */}
            {showEmojiPicker && (
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto">
                {quickEmojis.map((em) => (
                  <button
                    key={em}
                    onClick={() => {
                      setInputText((prev) => prev + em);
                      setShowEmojiPicker(false);
                    }}
                    className="text-base hover:scale-125 transition p-1 cursor-pointer"
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Photo attach button */}
              <label
                title="Attach Chart Screenshot"
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-400 cursor-pointer transition"
              >
                <ImageIcon className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>

              {/* Voice recording button */}
              {!isRecordingAudio ? (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  title="Record Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500 text-white flex items-center gap-1.5 text-xs font-mono-code font-bold animate-pulse cursor-pointer"
                  title="Stop and Save Voice Note"
                >
                  <MicOff className="w-4 h-4" />
                  <span>STOP ({audioDuration}s)</span>
                </button>
              )}

              {/* Emoji Toggle */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-400 transition cursor-pointer"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Input text */}
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  currentUser
                    ? 'Share trade setup, technical analysis, or question...'
                    : 'Log in to join the tactical discussion...'
                }
                disabled={!currentUser}
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !selectedPhoto && !audioBase64)}
                className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 transition cursor-pointer"
                title="Send Transmission"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* WebRTC Video / Screen Share Modal */}
      {isCallModalOpen && callTargetUser && (
        <WebRTCCallModal
          isOpen={isCallModalOpen}
          onClose={() => {
            setIsCallModalOpen(false);
            setCallTargetUser(null);
          }}
          currentUser={currentUser}
          targetUser={callTargetUser}
        />
      )}
    </div>
  );
};
