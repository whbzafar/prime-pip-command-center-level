import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Image as ImageIcon,
  Mic,
  MicOff,
  Smile,
  Clock,
  RefreshCw,
  X,
  Volume2,
  Video,
  User,
  ShieldCheck,
  ArrowLeft,
  CheckCheck,
  Paperclip,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { getKarachiDate, getKarachiTime } from '../../utils/time';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';

interface PrivateMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  receiverId: string;
  receiverUsername: string;
  text: string;
  type: 'TEXT' | 'VOICE' | 'IMAGE';
  photoBase64?: string;
  photoUrl?: string;
  audioBase64?: string;
  audioAttachmentId?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
  audioSize?: number;
  audioUrl?: string;
  timePkt: string;
  datePkt: string;
  timestamp: number;
  read: boolean;
}

interface PrivateChatProps {
  currentUser?: UserAccount | null;
  activeContact: {
    id: string;
    username: string;
    displayName: string;
  };
  onBack: () => void;
  onStartCall?: () => void;
}

export const PrivateChat: React.FC<PrivateChatProps> = ({
  currentUser,
  activeContact,
  onBack,
  onStartCall,
}) => {
  const [messages, setMessages] = useState<PrivateMessage[]>(() => {
    if (!currentUser || !activeContact) return [];
    try {
      const cacheKey = `primepipfx_private_${currentUser.id}_${activeContact.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedLocalFile, setSelectedLocalFile] = useState<{ base64: string; name: string } | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm;codecs=opus');
  const [isSending, setIsSending] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const fetchPrivateMessages = async () => {
    if (!currentUser || !activeContact) return;
    try {
      const res = await fetch(`/api/messages/private/${activeContact.id}`, {
        credentials: 'include',
        headers: {
        },
      });
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setMessages(msgs);
        
        // If there are unread messages directed to us, mark them read
        const hasUnread = msgs.some((m: PrivateMessage) => 
          m.receiverId === currentUser.id && m.senderId === activeContact.id && !m.read
        );
        if (hasUnread) {
          markMessagesRead();
        }
      }
    } catch (err) {
      console.error('Error fetching private messages:', err);
    }
  };

  const markMessagesRead = async () => {
    if (!currentUser || !activeContact) return;
    try {
      await fetch('/api/messages/private/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ senderId: activeContact.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPrivateMessages();
    markMessagesRead();
    const interval = setInterval(fetchPrivateMessages, 4000);
    return () => clearInterval(interval);
  }, [activeContact.id, currentUser]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMicNotice('Image must be under 5MB');
      setTimeout(() => setMicNotice(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Safe High-Fidelity Voice Recording
  const startVoiceRecording = async () => {
    try {
      setMicNotice(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mimeType
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
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
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

      mediaRecorder.start(250); // Slice data every 250ms
      setIsRecordingAudio(true);
      setAudioDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setAudioDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      setMicNotice('Microphone access denied or unavailable in this browser environment.');
      setTimeout(() => setMicNotice(null), 4000);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recorder:', err);
      }
      setIsRecordingAudio(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;
    if (!inputText.trim() && !selectedPhoto && !audioBase64 && !selectedLocalFile) return;

    setIsSending(true);

    let voiceMeta: {
      audioAttachmentId?: string;
      audioUrl?: string;
      audioMimeType?: string;
      audioDurationSeconds?: number;
      audioSize?: number;
    } = {};

    // Upload voice recording securely
    if (audioBase64) {
      try {
        const uploadHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

        const uploadRes = await fetch('/api/media/voice/upload', {
          method: 'POST',
          headers: uploadHeaders,
          body: JSON.stringify({
            audioData: audioBase64,
            mimeType: recordedMimeType,
            durationSeconds: audioDuration,
            isPrivate: true,
            allowedUserIds: [currentUser.id, activeContact.id],
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
      receiverId: activeContact.id,
      receiverUsername: activeContact.username,
      text: inputText.trim(),
      photoBase64: selectedPhoto || undefined,
      audioBase64: voiceMeta.audioAttachmentId ? undefined : (audioBase64 || undefined),
      audioAttachmentId: voiceMeta.audioAttachmentId,
      audioMimeType: voiceMeta.audioMimeType || recordedMimeType,
      audioDurationSeconds: voiceMeta.audioDurationSeconds || (audioDuration > 0 ? audioDuration : undefined),
      audioSize: voiceMeta.audioSize,
      audioUrl: voiceMeta.audioUrl,
      fileBase64: selectedLocalFile?.base64 || undefined,
      attachmentName: selectedLocalFile?.name || undefined,
      timePkt: getKarachiTime(),
      datePkt: getKarachiDate(),
    };

    const optimisticPrivateMsg: PrivateMessage = {
      id: `pmsg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: currentUser.id,
      senderUsername: currentUser.username,
      senderDisplayName: currentUser.name || currentUser.username,
      receiverId: activeContact.id,
      receiverUsername: activeContact.username,
      text: inputText.trim(),
      type: audioBase64 ? 'VOICE' : selectedPhoto ? 'IMAGE' : 'TEXT',
      photoBase64: selectedPhoto || undefined,
      audioBase64: voiceMeta.audioAttachmentId ? undefined : (audioBase64 || undefined),
      audioAttachmentId: voiceMeta.audioAttachmentId,
      audioMimeType: voiceMeta.audioMimeType || recordedMimeType,
      audioDurationSeconds: voiceMeta.audioDurationSeconds || (audioDuration > 0 ? audioDuration : undefined),
      audioSize: voiceMeta.audioSize,
      audioUrl: voiceMeta.audioUrl,
      timePkt: getKarachiTime(),
      datePkt: getKarachiDate(),
      timestamp: Date.now(),
      read: true,
    };

    setMessages((prev) => {
      const updated = [...prev, optimisticPrivateMsg];
      try {
        const cacheKey = `primepipfx_private_${currentUser.id}_${activeContact.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(updated.slice(-100)));
      } catch {}
      return updated;
    });

    setInputText('');
    setSelectedPhoto(null);
    setSelectedLocalFile(null);
    setAudioBase64(null);
    setAudioDuration(0);

    try {
      await fetch('/api/messages/private', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn('Private message fallback: already saved in state and cache');
    } finally {
      setIsSending(false);
    }
  };

  const isContactAdmin = activeContact.username === 'primepipfx-admin';

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl flex flex-col h-[76vh] shadow-2xl overflow-hidden">
      {/* Contact Header */}
      <div className="p-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
            title="Back to Contacts"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-9 h-9 rounded-full bg-slate-800 border border-blue-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
            {activeContact.displayName.slice(0, 2).toUpperCase()}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 text-sm font-military">
                {activeContact.displayName}
              </span>
              {isContactAdmin && (
                <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-amber-300 border border-blue-500/30 text-[9px] font-mono-code font-bold">
                  OFFICIAL OWNER
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono-code block">
              @{activeContact.username} • Direct Encrypted Channel
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onStartCall && (
            <button
              onClick={onStartCall}
              className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-mono-code font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">VIDEO / SCREEN</span>
            </button>
          )}

          <button
            onClick={fetchPrivateMessages}
            title="Refresh Conversation"
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {micNotice && (
        <div className="p-2.5 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs font-mono-code text-center">
          {micNotice}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60 font-mono-code">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
            <ShieldCheck className="w-8 h-8 mb-2 text-cyan-400/60" />
            <p>Direct encrypted conversation with @{activeContact.username}.</p>
            <span className="text-[11px] text-slate-600 mt-1">
              Send trade plans, screenshots, or voice notes.
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = currentUser && m.senderId === currentUser.id;

            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-lg ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-500">
                  <span>{m.timePkt} PKT</span>
                  {isMe && <CheckCheck className={`w-3 h-3 ${m.read ? 'text-sky-400' : 'text-slate-500'}`} title={m.read ? 'Read' : 'Delivered'} />}
                </div>

                <div
                  className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                    isMe
                      ? 'bg-blue-500/10 border-blue-500/40 text-slate-100 rounded-tr-none'
                      : 'bg-slate-950 border-slate-800 text-slate-200 rounded-tl-none'
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
                    <div className="rounded-xl overflow-hidden border border-slate-700 max-w-sm mt-1">
                      <a href={m.photoUrl || m.photoBase64} target="_blank" rel="noopener noreferrer">
                        <img src={m.photoUrl || m.photoBase64} alt="Shared setup" className="w-full object-cover max-h-56" />
                      </a>
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
                  {m.attachmentUrl && m.attachmentName && (
                    <a
                      href={m.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-cyan-400 hover:underline text-[11px] p-2 bg-slate-800/50 rounded-lg mt-1 border border-slate-700/50"
                    >
                      <Paperclip className="w-4 h-4" /> 
                      <span>{m.attachmentName} {m.attachmentSize ? `(${(m.attachmentSize / 1024 / 1024).toFixed(2)} MB)` : ''}</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Row */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
        {/* Attachment Previews */}
        {(selectedPhoto || audioBase64 || selectedLocalFile) && (
          <div className="flex flex-col gap-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono-code">
            {selectedPhoto && (
              <div className="relative inline-block">
                <img src={selectedPhoto} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {selectedLocalFile && (
              <div className="flex items-center justify-between gap-3 bg-slate-800 p-2 rounded-lg">
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate">{selectedLocalFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLocalFile(null)}
                  className="p-1 text-slate-400 hover:text-rose-400 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
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
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-950 rounded-lg transition"
                  title="Discard recorded voice message"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* Photo attach button */}
          <label className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 cursor-pointer transition">
            <ImageIcon className="w-4 h-4" />
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </label>

          <label className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-cyan-400 cursor-pointer transition">
            <Paperclip className="w-4 h-4" />
            <input type="file" onChange={handleFileSelect} className="hidden" />
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
            >
              <MicOff className="w-4 h-4" />
              <span>STOP ({audioDuration}s)</span>
            </button>
          )}

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Message @${activeContact.username}...`}
            className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono-code text-slate-100 focus:outline-none focus:border-blue-500"
          />

          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !selectedPhoto && !audioBase64)}
            className="p-2 rounded-lg bg-blue-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
