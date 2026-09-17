import React, { useState, useEffect, useRef } from 'react';
import { UserAccount } from '../types';
import { getKarachiDate, getKarachiTime } from '../utils/time';
import { getStoredToken } from '../utils/authClient';
import { FriendSystem } from './communication/FriendSystem';
import { PrivateChat } from './communication/PrivateChat';
import { WebRTCCallModal } from './communication/WebRTCCallModal';
import { VoiceMessagePlayer } from './communication/VoiceMessagePlayer';
import {
  Users, Send, Image as ImageIcon, Mic, MicOff, Clock, RefreshCw, X,
  MessageSquare, UserPlus, Radio, Paperclip, CheckCheck,
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
  photoBase64?: string;
  photoUrl?: string;
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
  const [commMode, setCommMode] = useState<'PUBLIC' | 'PRIVATE' | 'FRIENDS'>('PUBLIC');
  const [activePrivateContact, setActivePrivateContact] = useState<{
    id: string; username: string; displayName: string;
  } | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [callTargetUser, setCallTargetUser] = useState<{
    id: string; username: string; displayName: string;
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveAttachmentMeta | null>(null);
  const [selectedLocalFile, setSelectedLocalFile] = useState<{ base64: string; name: string } | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [recordedMimeType, setRecordedMimeType] = useState('audio/webm;codecs=opus');
  const [isSending, setIsSending] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [allTraders, setAllTraders] = useState<Array<{
    id: string; username: string; displayName: string; role?: string; isOnline: boolean;
  }>>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const driveFileInputRef = useRef<HTMLInputElement>(null);

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
      } catch { /* ignore */ }
    };
    sendHeartbeat();
    const hb = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(hb);
  }, [currentUser?.id]);

  useEffect(() => {
    const fetchTraders = async () => {
      try {
        const res = await fetch('/api/friends/all-traders');
        if (res.ok) {
          const data = await res.json();
          if (data.traders) setAllTraders(data.traders);
        }
      } catch { /* ignore */ }
    };
    fetchTraders();
    const intv = setInterval(fetchTraders, 15000);
    return () => clearInterval(intv);
  }, []);

  const markMessagesSeen = async (msgs: ChatMessage[]) => {
    if (!currentUser?.id || !msgs?.length) return;
    const unseenIds = msgs
      .filter((m) => !m.seenBy?.some((s) => s.userId === currentUser.id))
      .map((m) => m.id);
    if (!unseenIds.length) return;
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
    } catch { /* ignore */ }
  };

  const fetchMessages = async (isInitial = false) => {
    if (isInitial) setIsFeedLoading(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        setFeedError('You appear to be offline. Showing cached messages if available.');
        try {
          const cached = localStorage.getItem('primepipfx_community_cache');
          if (cached) setMessages(JSON.parse(cached));
        } catch { /* ignore */ }
        return;
      }
      setIsOffline(false);
      const res = await fetch('/api/community/messages');
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        setFeedError((errBody as { error?: string }).error || `Unable to load community feed (${res.status}).`);
        return;
      }
      const data = await res.json();
      const fetchedMessages: ChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
      const seen = new Set<string>();
      const unique = fetchedMessages.filter((m) => {
        if (!m?.id || seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      setMessages(unique);
      setFeedError(null);
      try {
        localStorage.setItem('primepipfx_community_cache', JSON.stringify(unique.slice(-200)));
      } catch { /* ignore */ }
      if (commMode === 'PUBLIC') markMessagesSeen(unique);
    } catch {
      setFeedError('Network error while loading community feed.');
      try {
        const cached = localStorage.getItem('primepipfx_community_cache');
        if (cached) setMessages(JSON.parse(cached));
      } catch { /* ignore */ }
    } finally {
      setIsFeedLoading(false);
    }
  };

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      setFeedError(null);
      fetchMessages();
    };
    const goOffline = () => {
      setIsOffline(true);
      setFeedError('You appear to be offline. Showing cached messages if available.');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 6000);
    return () => clearInterval(interval);
  }, [commMode]);

  useEffect(() => {
    if (commMode === 'PUBLIC') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (messages.length > 0) markMessagesSeen(messages);
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
    reader.onload = () => setSelectedPhoto(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const startVoiceRecording = async () => {
    try {
      setMicNotice(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      }
      setRecordedMimeType(mimeType);
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => setAudioBase64(reader.result as string);
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorder.start(250);
      setIsRecordingAudio(true);
      setAudioDuration(0);
      recordingTimerRef.current = setInterval(() => setAudioDuration((p) => p + 1), 1000);
    } catch {
      setMicNotice('Microphone access denied or unavailable.');
      setTimeout(() => setMicNotice(null), 4000);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      onOpenLogin?.();
      return;
    }
    if (!inputText.trim() && !selectedPhoto && !audioBase64 && !selectedDriveFile && !selectedLocalFile) return;

    setIsSending(true);
    const token = getStoredToken();
    const isDev =
      currentUser.role === 'DEVELOPER' ||
      currentUser.role === 'ADMIN' ||
      !!(currentUser as { isDeveloper?: boolean }).isDeveloper;

    let voiceMeta: {
      audioAttachmentId?: string;
      audioUrl?: string;
      audioMimeType?: string;
      audioDurationSeconds?: number;
      audioSize?: number;
    } = {};

    if (audioBase64) {
      try {
        const uploadHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) uploadHeaders.Authorization = `Bearer ${token}`;
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
        console.warn('Voice upload fallback:', upErr);
      }
    }

    const payload = {
      userId: currentUser.id,
      username: currentUser.username,
      userRole: isDev ? 'ADMIN' : 'CUSTOMER',
      displayName: isDev ? 'PrimePipFX Developer / Owner' : currentUser.name || currentUser.username,
      text: inputText.trim(),
      photoBase64: selectedPhoto || undefined,
      audioBase64: voiceMeta.audioAttachmentId ? undefined : audioBase64 || undefined,
      audioAttachmentId: voiceMeta.audioAttachmentId,
      audioMimeType: voiceMeta.audioMimeType || recordedMimeType,
      audioDurationSeconds: voiceMeta.audioDurationSeconds || (audioDuration > 0 ? audioDuration : undefined),
      audioSize: voiceMeta.audioSize,
      audioUrl: voiceMeta.audioUrl,
      driveFile: selectedDriveFile || undefined,
      fileBase64: selectedLocalFile?.base64 || undefined,
      attachmentName: selectedLocalFile?.name || undefined,
      timePkt: getKarachiTime(),
      datePkt: getKarachiDate(),
    };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/community/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setInputText('');
        setSelectedPhoto(null);
        setSelectedDriveFile(null);
        setSelectedLocalFile(null);
        setAudioBase64(null);
        setAudioDuration(0);
        setSendError(null);
        await fetchMessages(false);
      } else {
        const errBody = await res.json().catch(() => ({}));
        const msg = (errBody as { error?: string }).error || `Failed to send message (${res.status}).`;
        setSendError(msg);
        setMicNotice(msg);
        setTimeout(() => setMicNotice(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error. Message was not sent.';
      setSendError(msg);
      setMicNotice(msg);
      setTimeout(() => setMicNotice(null), 5000);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      setMicNotice('File must be under 10MB');
      setTimeout(() => setMicNotice(null), 3500);
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedLocalFile({
        base64: reader.result as string,
        name: file.name
      });
    };
    reader.onerror = () => {
      setMicNotice('Failed to read file');
      setTimeout(() => setMicNotice(null), 3500);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleStartCall = (target: { id: string; username: string; displayName: string }) => {
    setCallTargetUser(target);
    setIsCallModalOpen(true);
  };

  const onlineCount = allTraders.filter((t) => t.isOnline).length;

  return (
    <div className="space-y-4 max-w-5xl mx-auto h-[84vh] flex flex-col">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-military font-bold tracking-wider text-slate-100 flex items-center gap-2 flex-wrap">
              <span>PRIMEPIPFX COMMUNICATIONS</span>
              <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                {onlineCount} ONLINE ({allTraders.length} REGISTERED)
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Community · Private DMs · WebRTC</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono-code">
          <button
            type="button"
            onClick={() => { setCommMode('PUBLIC'); setActivePrivateContact(null); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              commMode === 'PUBLIC' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Community Hub
          </button>
          <button
            type="button"
            onClick={() => { setCommMode('FRIENDS'); setActivePrivateContact(null); }}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              commMode === 'FRIENDS' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Friends
          </button>
          {activePrivateContact && (
            <button
              type="button"
              onClick={() => setCommMode('PRIVATE')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                commMode === 'PRIVATE' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> DM: {activePrivateContact.displayName}
            </button>
          )}
        </div>
      </div>

      {commMode === 'PRIVATE' && activePrivateContact && (
        <PrivateChat
          currentUser={currentUser}
          activeContact={activePrivateContact}
          onBack={() => setCommMode('FRIENDS')}
          onStartCall={() => handleStartCall(activePrivateContact)}
        />
      )}

      {commMode === 'FRIENDS' && (
        <FriendSystem
          currentUser={currentUser}
          onStartPrivateChat={(contact) => {
            setActivePrivateContact(contact);
            setCommMode('PRIVATE');
          }}
          onStartCall={handleStartCall}
        />
      )}

      {commMode === 'PUBLIC' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-3">
          {(isOffline || feedError) && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200 text-xs font-mono-code text-center">
              {isOffline ? 'OFFLINE' : 'FEED NOTICE'} — {feedError || 'Connection lost. Showing last known messages.'}
            </div>
          )}
          {micNotice && (
            <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono-code text-center">
              {micNotice}
            </div>
          )}
          {sendError && !micNotice && (
            <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono-code text-center">
              {sendError}
            </div>
          )}

          <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 overflow-y-auto space-y-3.5 shadow-inner">
            {isFeedLoading && messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono-code text-xs gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400 opacity-70" />
                <span>Loading community feed…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono-code text-xs">
                <Users className="w-8 h-8 mb-2 opacity-50 text-amber-400" />
                <span>
                  {isOffline
                    ? 'Offline — no cached messages available.'
                    : feedError || 'No community messages yet. Be the first to start the discussion!'}
                </span>
              </div>
            ) : (
              messages.map((m) => {
                const isOwner = m.userRole === 'ADMIN';
                const isMe = currentUser && m.userId === currentUser.id;
                return (
                  <div key={m.id} className={`flex flex-col max-w-xl ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                    <div className="flex items-center gap-2 mb-1 text-[11px] font-mono-code">
                      <span className={`font-bold ${isOwner ? 'text-amber-400' : 'text-slate-300'}`}>{m.displayName}</span>
                      {isOwner && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold">ADMIN</span>
                      )}
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {m.timePkt} PKT
                      </span>
                      {!isMe && currentUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setActivePrivateContact({ id: m.userId, username: m.username, displayName: m.displayName });
                            setCommMode('PRIVATE');
                          }}
                          className="text-[10px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
                        >
                          DM
                        </button>
                      )}
                    </div>
                    <div
                      className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                        isMe
                          ? 'bg-amber-500/10 border-amber-500/40 text-slate-100 rounded-tr-none'
                          : 'bg-slate-900 border-slate-700 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {m.text && (
                        <p className="whitespace-pre-wrap break-words">
                          {m.text.split(/(@\w+)/g).map((part, i) => {
                            if (part.startsWith('@')) {
                              return <span key={i} className="text-sky-400 font-bold">{part}</span>;
                            }
                            return <React.Fragment key={i}>{part}</React.Fragment>;
                          })}
                        </p>
                      )}
                      {(m.photoUrl || m.photoBase64) && (
                        <a href={m.photoUrl || m.photoBase64} target="_blank" rel="noopener noreferrer">
                          <img src={m.photoUrl || m.photoBase64} alt="attachment" className="max-w-full rounded-lg border border-slate-700 max-h-64 object-contain" />
                        </a>
                      )}
                      {(m.audioUrl || m.audioAttachmentId || m.audioBase64) && (
                        <VoiceMessagePlayer
                          audioUrl={m.audioUrl}
                          audioAttachmentId={m.audioAttachmentId}
                          audioBase64={m.audioBase64}
                          mimeType={m.audioMimeType}
                          durationSeconds={m.audioDurationSeconds}
                        />
                      )}
                      {m.driveFile && (
                        <a
                          href={m.driveFile.webViewLink || `https://drive.google.com/file/d/${m.driveFile.fileId}/view`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-amber-400 hover:underline text-[11px]"
                        >
                          <Paperclip className="w-3 h-3" /> {m.driveFile.fileName}
                        </a>
                      )}
                      {m.attachmentUrl && m.attachmentName && (
                        <a
                          href={m.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-amber-400 hover:underline text-[11px] p-2 bg-slate-800/50 rounded-lg mt-1 border border-slate-700/50"
                        >
                          <Paperclip className="w-4 h-4" /> 
                          <span>{m.attachmentName} {m.attachmentSize ? `(${(m.attachmentSize / 1024 / 1024).toFixed(2)} MB)` : ''}</span>
                        </a>
                      )}
                      {m.intentCard && <IntentCard card={m.intentCard} />}
                      {m.seenBy && m.seenBy.length > 0 && (
                        <div className="flex items-center gap-1 text-[9px] text-slate-500 pt-1">
                          <CheckCheck className="w-3 h-3" /> Seen by {m.seenBy.length}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {(selectedPhoto || audioBase64 || selectedDriveFile || selectedLocalFile) && (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono-code flex-wrap">
              {selectedPhoto && (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700">
                  Photo ready
                  <button type="button" onClick={() => setSelectedPhoto(null)} className="text-rose-400"><X className="w-3 h-3" /></button>
                </span>
              )}
              {audioBase64 && (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700">
                  Voice {audioDuration}s
                  <button type="button" onClick={() => { setAudioBase64(null); setAudioDuration(0); }} className="text-rose-400"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedDriveFile && (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700">
                  Drive: {selectedDriveFile.fileName}
                  <button type="button" onClick={() => setSelectedDriveFile(null)} className="text-rose-400"><X className="w-3 h-3" /></button>
                </span>
              )}
              {selectedLocalFile && (
                <span className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 border border-slate-700 max-w-[200px] truncate">
                  File: {selectedLocalFile.name}
                  <button type="button" onClick={() => setSelectedLocalFile(null)} className="text-rose-400"><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 shrink-0">
            <input ref={driveFileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <input type="file" accept="image/*" className="hidden" id="cc-photo-input" onChange={handlePhotoSelect} />
            <button type="button" onClick={() => document.getElementById('cc-photo-input')?.click()} className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-amber-400 cursor-pointer" title="Photo">
              <ImageIcon className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => driveFileInputRef.current?.click()} className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-amber-400 cursor-pointer" title="Attach file">
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={isRecordingAudio ? stopVoiceRecording : startVoiceRecording}
              className={`p-2.5 rounded-xl border cursor-pointer ${
                isRecordingAudio ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-amber-400'
              }`}
              title={isRecordingAudio ? 'Stop' : 'Voice note'}
            >
              {isRecordingAudio ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={currentUser ? 'Message the community…' : 'Login to participate'}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 font-mono-code"
              disabled={!currentUser || isSending}
            />
            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !selectedPhoto && !audioBase64 && !selectedLocalFile && !selectedDriveFile)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
            >
              {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              SEND
            </button>
          </form>
        </div>
      )}

      {isCallModalOpen && callTargetUser && currentUser && (
        <WebRTCCallModal
          currentUser={currentUser}
          targetUser={callTargetUser}
          onClose={() => {
            setIsCallModalOpen(false);
            setCallTargetUser(null);
          }}
        />
      )}
    </div>
  );
};
