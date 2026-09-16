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
  CheckCheck,
  Paperclip,
  Cloud,
  ExternalLink,
  Check,
} from 'lucide-react';
import { googleDriveService } from '../services/googleDriveService';
import { IntentCard } from './chat/IntentCard';
import { IntentCardPayload } from './chat/types';

interface SeenReceipt {
  userId: string;
  username: string;
  displayName: string;
  seenAt: number;
}

interface DriveAttachmentMeta {
  fileId: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  webViewLink?: string;
  categoryFolder?: string;
}

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
  intentCard?: IntentCardPayload;
  timestamp: number;
  timePkt: string;
  datePkt: string;
  seenBy?: SeenReceipt[];
  driveFile?: DriveAttachmentMeta;
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
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveAttachmentMeta | null>(null);
  const [isUploadingDriveFile, setIsUploadingDriveFile] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm;codecs=opus');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  // Real Trader Community Presence
  const [allTraders, setAllTraders] = useState<Array<{
    id: string;
    username: string;
    displayName: string;
    role?: string;
    isOnline: boolean;
    lastActive?: number;
  }>>([]);
  const [showTradersDrawer, setShowTradersDrawer] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const driveFileInputRef = useRef<HTMLInputElement>(null);

  // Send real presence heartbeat for active session
  useEffect(() => {
    if (!currentUser?.id) return;
    const sendHeartbeat = async () => {
      try {
        const token = getStoredToken();
        await fetch('/api/user/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch {}
    };
    sendHeartbeat();
    const hb = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(hb);
  }, [currentUser?.id]);

  // Fetch real registered traders list and their actual online presence
  const fetchTraders = async () => {
    try {
      const res = await fetch('/api/friends/all-traders');
      if (res.ok) {
        const data = await res.json();
        if (data.traders) {
          setAllTraders(data.traders);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchTraders();
    const intv = setInterval(fetchTraders, 15000);
    return () => clearInterval(intv);
  }, []);

  // Mark messages as seen by currentUser
  const markMessagesSeen = async (msgs: ChatMessage[]) => {
    if (!currentUser?.id || !msgs || msgs.length === 0) return;
    const unseenIds = msgs
      .filter((m) => !m.seenBy || !m.seenBy.some((s) => s.userId === currentUser.id))
      .map((m) => m.id);

    if (unseenIds.length === 0) return;

    try {
      const token = getStoredToken();
      await fetch('/api/community/messages/seen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messageIds: unseenIds,
          user: {
            id: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.name || currentUser.username,
          },
        }),
      });
    } catch {}
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/community/messages');
      if (res.ok) {
        const data = await res.json();
        const fetchedMessages = data.messages || [];
        setMessages(fetchedMessages);
        if (commMode === 'PUBLIC') {
          markMessagesSeen(fetchedMessages);
        }
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
  }, [commMode]);

  useEffect(() => {
    if (commMode === 'PUBLIC') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (messages.length > 0) {
        markMessagesSeen(messages);
      }
    }
  }, [messages.length, commMode]);

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
      driveFile: selectedDriveFile || undefined,
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
        setSelectedDriveFile(null);
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

  const handleDriveFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (googleDriveService.getStatus().state !== 'CONNECTED') {
      setMicNotice('Please connect your Google Drive in Settings to attach files to your cloud');
      setTimeout(() => setMicNotice(null), 4500);
      return;
    }

    try {
      setIsUploadingDriveFile(true);
      setMicNotice(`Uploading ${file.name} to student Google Drive...`);
      const res = await googleDriveService.uploadBlob(
        file,
        file.name,
        'Trade Setups & Screenshots',
        file.type
      );
      if (res.ok && res.fileId) {
        setSelectedDriveFile({
          fileId: res.fileId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          webViewLink: res.webViewLink || `https://drive.google.com/file/d/${res.fileId}/view`,
          categoryFolder: 'Trade Setups & Screenshots',
        });
        setMicNotice(`File uploaded to personal Google Drive!`);
        setTimeout(() => setMicNotice(null), 3000);
      } else {
        setMicNotice(res.error || 'Failed to upload to Google Drive');
        setTimeout(() => setMicNotice(null), 4000);
      }
    } catch (err: any) {
      setMicNotice(`Upload error: ${err.message}`);
      setTimeout(() => setMicNotice(null), 4000);
    } finally {
      setIsUploadingDriveFile(false);
      e.target.value = '';
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
            <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 flex items-center gap-2 flex-wrap">
              <span>PRIMEPIPFX COMMUNICATIONS</span>
              <button
                type="button"
                onClick={() => setShowTradersDrawer(!showTradersDrawer)}
                className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="View active community traders"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{allTraders.filter((t) => t.isOnline).length} ONLINE</span>
                <span className="text-slate-400">({allTraders.length} REGISTERED)</span>
              </button>
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

                      {/* Google Drive Cloud Attachment */}
                      {m.driveFile && (
                        <a
                          href={m.driveFile.webViewLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 hover:border-amber-400/60 text-xs font-mono-code transition group"
                        >
                          <Cloud className="w-4 h-4 text-emerald-400 shrink-0 group-hover:scale-110 transition" />
                          <div className="flex-1 min-w-0">
                            <div className="text-slate-200 font-bold truncate group-hover:text-amber-400 transition">
                              {m.driveFile.fileName}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                              <span>Google Drive Cloud Attachment</span>
                              {m.driveFile.fileSize && (
                                <span>• {(m.driveFile.fileSize / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
                        </a>
                      )}

                      {/* Interactive Chat Intelligence Card */}
                      {m.intentCard && (
                        <IntentCard payload={m.intentCard} />
                      )}

                      {/* Real "Seen by" Read Receipts */}
                      {m.seenBy && m.seenBy.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono-code pt-1 border-t border-slate-800/40">
                          <CheckCheck className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>Seen by {m.seenBy.length}</span>
                          <span
                            className="text-slate-400 truncate max-w-[220px]"
                            title={m.seenBy.map((s) => s.displayName || s.username).join(', ')}
                          >
                            ({m.seenBy.map((s) => s.displayName || s.username).join(', ')})
                          </span>
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
            {(selectedPhoto || selectedDriveFile || audioBase64) && (
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
                {selectedDriveFile && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-200 font-bold truncate max-w-xs">{selectedDriveFile.fileName}</span>
                      <span className="text-[10px] text-emerald-400 font-bold">(Drive Attached)</span>
                    </div>
                    <button
                      onClick={() => setSelectedDriveFile(null)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
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

              {/* Google Drive file attach button */}
              <label
                title="Upload & Attach from personal Google Drive"
                className={`p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 cursor-pointer transition ${
                  isUploadingDriveFile ? 'animate-pulse text-emerald-400' : ''
                }`}
              >
                <Cloud className="w-4 h-4" />
                <input
                  ref={driveFileInputRef}
                  type="file"
                  onChange={handleDriveFileSelect}
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

      {/* Real Traders Community Presence Directory Modal */}
      {showTradersDrawer && (
        <div className="fixed inset-0 z-50 bg-[#070A11]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-military font-bold text-slate-100">
                    REAL TRADER PRESENCE DIRECTORY
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono-code">
                    {allTraders.filter((t) => t.isOnline).length} Active Now • {allTraders.length} Registered Accounts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTradersDrawer(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950/50 border-b border-slate-800 text-[10px] font-mono-code text-slate-400">
              Live heartbeat tracking verifies real-time presence without simulated records.
            </div>

            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {allTraders.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs font-mono-code">
                  Loading verified academy traders...
                </div>
              ) : (
                allTraders.map((trader) => {
                  const isMe = currentUser && trader.id === currentUser.id;
                  const isOwner = trader.role === 'ADMIN' || trader.role === 'DEVELOPER';

                  return (
                    <div
                      key={trader.id}
                      className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs">
                            {trader.displayName.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                              trader.isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                            }`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {trader.displayName}
                            </span>
                            {isOwner && (
                              <span className="text-[8px] font-mono-code font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                OWNER
                              </span>
                            )}
                            {isMe && (
                              <span className="text-[8px] font-mono-code font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono-code">
                            @{trader.username} • {trader.isOnline ? 'Active right now' : 'Offline'}
                          </div>
                        </div>
                      </div>

                      {!isMe && currentUser && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setShowTradersDrawer(false);
                              setActivePrivateContact({
                                id: trader.id,
                                username: trader.username,
                                displayName: trader.displayName,
                              });
                              setCommMode('PRIVATE');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-[10px] font-mono-code font-bold transition cursor-pointer"
                          >
                            DM
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
