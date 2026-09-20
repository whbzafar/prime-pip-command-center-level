import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Search, Eye, EyeOff, WifiOff, Maximize2, Minimize2, ChevronDown, ChevronUp, Minus,
  Target, TrendingUp, TrendingDown, Filter, Sparkles, Flame, ThumbsUp, BarChart2,
  Cloud, Download, ExternalLink, ShieldCheck, Check
} from 'lucide-react';
import { googleDriveService, DriveBackupFile } from '../services/googleDriveService';
import { IntentCard } from './chat/IntentCard';
import { IntentCardPayload } from './chat/types';
import { DEFAULT_TRADERS, DEFAULT_COMMUNITY_MESSAGES } from '../data/defaultTraders';

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
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  reactions?: Record<string, number>;
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
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callTargetUser, setCallTargetUser] = useState<{
    id: string; username: string; displayName: string;
  } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem('primepipfx_community_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length >= 4) return parsed;
      }
    } catch {}
    return DEFAULT_COMMUNITY_MESSAGES as unknown as ChatMessage[];
  });
  const [inputText, setInputText] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<DriveAttachmentMeta | null>(null);
  const [selectedLocalFile, setSelectedLocalFile] = useState<{ base64: string; name: string } | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [recordedMimeType, setRecordedMimeType] = useState('audio/webm;codecs=opus');
  const [isSending, setIsSending] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [micNotice, setMicNotice] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [allTraders, setAllTraders] = useState<Array<{
    id: string; username: string; displayName: string; role?: string; isOnline: boolean;
    presenceStatus?: 'ACTIVE' | 'OFFLINE' | 'HIDDEN'; lastSeen?: number;
    isNewThisWeek?: boolean; tradingFocus?: string; experienceLevel?: string; traderStatus?: string;
  }>>(() => DEFAULT_TRADERS);
  const [traderSearch, setTraderSearch] = useState('');
  const [debouncedTraderSearch, setDebouncedTraderSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showActiveStatus, setShowActiveStatus] = useState(true);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTraderFeed, setShowTraderFeed] = useState(true);

  // Google Drive File Picker Integration State
  const [isDrivePickerOpen, setIsDrivePickerOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [drivePickerSearch, setDrivePickerSearch] = useState('');

  const handleOpenDrivePicker = async () => {
    if (!currentUser) {
      onOpenLogin?.();
      return;
    }
    if (!googleDriveService.isConnected()) {
      setIsDrivePickerOpen(true);
      return;
    }
    setIsDrivePickerOpen(true);
    setIsLoadingDriveFiles(true);
    try {
      const files = await googleDriveService.listAllDriveFiles();
      setDriveFiles(files);
    } catch (err: any) {
      setMicNotice('Could not load Google Drive files: ' + (err?.message || 'Error'));
      setTimeout(() => setMicNotice(null), 3500);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleConnectDriveFromPicker = async () => {
    try {
      setIsLoadingDriveFiles(true);
      const ok = await googleDriveService.connect();
      if (ok) {
        const files = await googleDriveService.listAllDriveFiles();
        setDriveFiles(files);
      }
    } catch (err: any) {
      setMicNotice('Drive connection failed: ' + (err?.message || ''));
      setTimeout(() => setMicNotice(null), 3500);
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleSelectDriveFile = (file: DriveBackupFile) => {
    setSelectedDriveFile({
      fileId: file.id,
      fileName: file.name,
      fileSize: file.size ? parseInt(file.size, 10) : undefined,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
    });
    setIsDrivePickerOpen(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedTraderSearch(traderSearch), 250);
    return () => window.clearTimeout(timer);
  }, [traderSearch]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const driveFileInputRef = useRef<HTMLInputElement>(null);

  const communityRequest = (init: RequestInit = {}): RequestInit => {
    // Prefer the server-set HttpOnly session cookie in production. A stale
    // localStorage bearer token can belong to a previous Vercel instance and
    // cause otherwise valid Community requests to return "Invalid user".
    const headers = new Headers(init.headers || {});
        return {
      ...init,
      credentials: 'include',
      headers,
    };
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    const sendHeartbeat = async () => {
      try {
        const token = getStoredToken();
        await fetch('/api/user/heartbeat', communityRequest({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ userId: currentUser.id }),
        }));
      } catch { /* ignore */ }
    };
    sendHeartbeat();
    const hb = setInterval(sendHeartbeat, 25000);
    return () => clearInterval(hb);
  }, [currentUser?.id]);

  useEffect(() => {
    const fetchTraders = async () => {
      try {
        const token = getStoredToken();
        const res = await fetch('/api/friends/all-traders', communityRequest({
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }));
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (Array.isArray(data.traders) && data.traders.length > 0) {
              setAllTraders(data.traders);
              return;
            }
          }
        }
      } catch {
        // preserve local / default traders
      }
      setAllTraders((prev) => (prev.length > 0 ? prev : DEFAULT_TRADERS));
    };
    fetchTraders();
    const intv = setInterval(fetchTraders, 20000);
    return () => clearInterval(intv);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser) return;
    let socket: WebSocket | null = null;
    let heartbeat: number | null = null;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/api/presence`);
      heartbeat = window.setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'presence:ping' }));
        }
      }, 30000);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === 'presence:update' && Array.isArray(data.traders) && data.traders.length > 0) {
            setAllTraders(data.traders);
          }
        } catch {}
      };
      socket.onerror = () => {
        // Fall back to polling silently
      };
    } catch {
      // WebSocket not available in serverless
    }
    return () => {
      if (heartbeat) window.clearInterval(heartbeat);
      if (socket) socket.close();
    };
  }, [currentUser?.id]);

  const updatePresencePrivacy = async (nextValue: boolean) => {
    setShowActiveStatus(nextValue);
    setIsSavingPrivacy(true);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/user/presence-privacy', communityRequest({
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ showActiveStatus: nextValue }),
      }));
      if (!res.ok) setShowActiveStatus(!nextValue);
    } catch {
      setShowActiveStatus(!nextValue);
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const markMessagesSeen = async (msgs: ChatMessage[]) => {
    if (!currentUser?.id || !msgs?.length) return;
    const unseenIds = msgs
      .filter((m) => !m.seenBy?.some((s) => s.userId === currentUser.id))
      .map((m) => m.id);
    if (!unseenIds.length) return;
    try {
      const token = getStoredToken();
      await fetch('/api/community/messages/seen', communityRequest({
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
      }));
    } catch { /* ignore */ }
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    setMessages((prev) => {
      const next = prev.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        currentReactions[emoji] = (currentReactions[emoji] || 0) + 1;
        return { ...m, reactions: currentReactions };
      });
      try {
        localStorage.setItem('primepipfx_community_cache', JSON.stringify(next.slice(-200)));
      } catch {}
      return next;
    });

    try {
      const bc = new BroadcastChannel('primepipfx_community_channel');
      bc.postMessage({ type: 'REACTION_UPDATE', messageId, emoji });
      bc.close();
    } catch {}
  };

  const fetchMessages = async (isInitial = false) => {
    if (isInitial) setIsFeedLoading(true);
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        return;
      }
      setIsOffline(false);
      const token = getStoredToken();
      const res = await fetch('/api/community/messages', communityRequest({
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }));
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        return;
      }
      if (!contentType.includes('application/json')) {
        return;
      }
      const data = await res.json();
      const fetchedMessages: ChatMessage[] = Array.isArray(data.messages) ? data.messages : [];
      if (fetchedMessages.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          fetchedMessages.forEach((m) => {
            const existing = map.get(m.id);
            if (existing) {
              map.set(m.id, {
                ...m,
                reactions: existing.reactions || m.reactions,
              });
            } else {
              map.set(m.id, m);
            }
          });
          const merged = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
          try {
            localStorage.setItem('primepipfx_community_cache', JSON.stringify(merged.slice(-200)));
          } catch {}
          return merged;
        });
      } else {
        setMessages((prev) => (prev.length > 0 ? prev : (DEFAULT_COMMUNITY_MESSAGES as unknown as ChatMessage[])));
      }
      setFeedError(null);
      if (commMode === 'PUBLIC' && fetchedMessages.length > 0) markMessagesSeen(fetchedMessages);
    } catch {
      // Gracefully retain existing messages
    } finally {
      setIsFeedLoading(false);
    }
  };

  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('primepipfx_community_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'NEW_MESSAGE' && event.data.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.data.message.id)) return prev;
            const updated = [...prev, event.data.message];
            try {
              localStorage.setItem('primepipfx_community_cache', JSON.stringify(updated.slice(-200)));
            } catch {}
            return updated;
          });
        } else if (event.data?.type === 'REACTION_UPDATE') {
          const { messageId, emoji } = event.data;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              const cur = { ...(m.reactions || {}) };
              cur[emoji] = (cur[emoji] || 0) + 1;
              return { ...m, reactions: cur };
            })
          );
        }
      };
    } catch {}
    return () => {
      bc?.close();
    };
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      setFeedError(null);
      fetchMessages();
    };
    const goOffline = () => {
      setIsOffline(true);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const checkBackend = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setIsOffline(true);
        return;
      }
      setIsOffline(false);
    };
    checkBackend();
    const backendInterval = window.setInterval(checkBackend, 30000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.clearInterval(backendInterval);
    };
  }, []);

  useEffect(() => {
    fetchMessages(true);
    const interval = setInterval(() => fetchMessages(false), 3500);
    return () => clearInterval(interval);
  }, [commMode, currentUser?.id]);

  useEffect(() => {
    if (commMode === 'PUBLIC') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (messages.length > 0) markMessagesSeen(messages);
    }
  }, [messages.length, commMode]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (isOffline) {
      setSendError("You're offline — messages will not send.");
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
        const uploadRes = await fetch('/api/media/voice/upload', communityRequest({
          method: 'POST',
          headers: uploadHeaders,
          body: JSON.stringify({
            audioData: audioBase64,
            mimeType: recordedMimeType,
            durationSeconds: audioDuration,
            isPrivate: false,
          }),
        }));
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

    const optimisticMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      reactions: { '🔥': 1 },
      timestamp: Date.now(),
      timePkt: getKarachiTime(),
      datePkt: getKarachiDate(),
    };

    // Optimistically update UI immediately
    setMessages((prev) => {
      const updated = [...prev, optimisticMessage];
      try {
        localStorage.setItem('primepipfx_community_cache', JSON.stringify(updated.slice(-200)));
      } catch {}
      return updated;
    });

    try {
      const bc = new BroadcastChannel('primepipfx_community_channel');
      bc.postMessage({ type: 'NEW_MESSAGE', message: optimisticMessage });
      bc.close();
    } catch {}

    setInputText('');
    setSelectedPhoto(null);
    setSelectedDriveFile(null);
    setSelectedLocalFile(null);
    setAudioBase64(null);
    setAudioDuration(0);
    setSendError(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/community/messages', communityRequest({
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      }));
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok) {
        let detail = '';
        try {
          detail = contentType.includes('application/json') ? JSON.stringify(await res.json()) : await res.text();
        } catch {}
        throw new Error(detail || `Message send failed (${res.status})`);
      }
      if (!contentType.includes('application/json')) {
        throw new Error('Message send returned a non-JSON response.');
      }
      const result = await res.json();
      if (result?.ok === false) {
        throw new Error(result?.error || 'Message was not accepted by the server.');
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Message could not be sent.');
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      try {
        const cached = JSON.parse(localStorage.getItem('primepipfx_community_cache') || '[]');
        localStorage.setItem('primepipfx_community_cache', JSON.stringify(
          Array.isArray(cached) ? cached.filter((m: ChatMessage) => m.id !== optimisticMessage.id).slice(-200) : []
        ));
      } catch {}
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    
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

  // Poll the durable call session so incoming calls ring even on Vercel/serverless,
  // where an in-memory WebSocket session cannot be relied upon.
  useEffect(() => {
    if (!currentUser?.id) return;
    let active = true;
    const checkIncomingCall = async () => {
      try {
        const res = await fetch('/api/webrtc/active', { credentials: 'include', cache: 'no-store' });
        if (!res.ok || !active) return;
        const data = await res.json();
        const session = data?.session;
        if (session && session.receiverId === currentUser.id && session.status !== 'ENDED') {
          const caller = allTraders.find((t) => t.id === session.callerId);
          if (!isCallModalOpen) {
            setIsIncomingCall(true);
            setCallTargetUser({
              id: session.callerId,
              username: caller?.username || session.callerId,
              displayName: caller?.displayName || session.callerId,
            });
            setIsCallModalOpen(true);
          }
        }
      } catch {
        // Call polling is intentionally silent; chat remains usable.
      }
    };
    checkIncomingCall();
    const timer = window.setInterval(checkIncomingCall, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [currentUser?.id, allTraders, isCallModalOpen]);

  const handleStartCall = (target: { id: string; username: string; displayName: string }) => {
    setIsIncomingCall(false);
    setCallTargetUser(target);
    setIsCallModalOpen(true);
  };

  const filteredTraders = allTraders.filter((trader) => {
    const query = debouncedTraderSearch.trim().toLowerCase();
    const matchesQuery =
      !query ||
      trader.displayName.toLowerCase().includes(query) ||
      trader.username.toLowerCase().includes(query);
    return matchesQuery && (!onlineOnly || trader.presenceStatus === 'ACTIVE' || trader.isOnline);
  });
  const onlineCount = allTraders.filter((t) => t.presenceStatus === 'ACTIVE' || t.isOnline).length;
  const formatLastActive = (timestamp?: number) => {
    if (!timestamp) return 'Never active';
    const elapsedMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
    if (elapsedMinutes < 60) return `Last active ${elapsedMinutes}m ago`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `Last active ${elapsedHours}h ago`;
    return `Last active ${Math.floor(elapsedHours / 24)}d ago`;
  };

  if (isMinimized) {
    return (
      <div className="mx-auto max-w-5xl bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-cyan-400">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-military font-bold text-slate-200">PRIMEPIPFX COMMUNICATIONS</span>
            <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              {onlineCount} ONLINE
            </span>
            <span className="text-[10px] text-slate-400 font-mono-code hidden sm:inline">
              · Minimized view ({messages.length} messages)
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-cyan-400 text-slate-950 text-xs font-military font-bold tracking-wider transition shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
        >
          <ChevronUp className="w-3.5 h-3.5" />
          <span>EXPAND CHAT</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`mx-auto flex flex-col transition-all duration-200 ${
      isFullscreen
        ? 'fixed inset-0 z-50 bg-[#070B14] p-3 sm:p-5 h-screen w-screen max-w-none overflow-hidden space-y-2'
        : 'max-w-5xl w-full min-h-[calc(100svh-10rem)] md:h-[86vh] md:min-h-0 space-y-2.5'
    }`}>
      {/* Shifted upwards, compact header with controls */}
      <div className="bg-slate-950/95 border border-slate-800 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-lg shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-cyan-400">
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-military font-bold tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>PRIMEPIPFX COMMUNICATIONS</span>
              <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                {onlineCount} ONLINE ({allTraders.length} REGISTERED)
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Navigation modes */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono-code">
            <button
              type="button"
              onClick={() => { setCommMode('PUBLIC'); setActivePrivateContact(null); }}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 text-[11px] ${
                commMode === 'PUBLIC' ? 'bg-blue-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3 h-3" /> <span className="hidden sm:inline">Hub</span>
            </button>
            <button
              type="button"
              onClick={() => { setCommMode('FRIENDS'); setActivePrivateContact(null); }}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 text-[11px] ${
                commMode === 'FRIENDS' ? 'bg-blue-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3 h-3" /> <span className="hidden sm:inline">Friends</span>
            </button>
            {activePrivateContact && (
              <button
                type="button"
                onClick={() => setCommMode('PRIVATE')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 text-[11px] ${
                  commMode === 'PRIVATE' ? 'bg-blue-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3 h-3" /> DM: {activePrivateContact.displayName}
              </button>
            )}
          </div>

          {/* Full Screen & Minimize Controls */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit Full Screen" : "Full Screen View"}
              className={`p-1.5 rounded-lg border text-xs transition cursor-pointer ${
                isFullscreen
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-cyan-300 hover:bg-slate-850'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              title="Minimize Screen"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>
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
        <div className="flex-1 flex flex-col min-h-0 space-y-2">
          {/* Collapsible Trader Feed Strip (Conserves massive vertical space for chatting) */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-military font-bold tracking-wider text-slate-300">
                COMMUNITY TRADERS
              </span>
              <span className="text-[9px] font-mono-code px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                {filteredTraders.length} available · {onlineCount} online
              </span>
            </div>
            <div className="flex items-center gap-2">
              {currentUser && showTraderFeed && (
                <button
                  type="button"
                  disabled={isSavingPrivacy}
                  onClick={() => updatePresencePrivacy(!showActiveStatus)}
                  className="text-[10px] font-mono-code text-slate-400 hover:text-cyan-300 flex items-center gap-1"
                  title="Presence is reciprocal"
                >
                  {showActiveStatus ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span className="hidden sm:inline">{showActiveStatus ? 'Status visible' : 'Status hidden'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowTraderFeed(!showTraderFeed)}
                className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-850 text-cyan-400 border border-slate-800 flex items-center gap-1 cursor-pointer transition"
              >
                {showTraderFeed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                <span>{showTraderFeed ? 'HIDE TRADER STRIP' : 'SHOW TRADER STRIP'}</span>
              </button>
            </div>
          </div>

          {showTraderFeed && (
            <section className="bg-slate-950 border border-slate-800 rounded-xl p-3 shadow-md shrink-0">
              <div className="flex flex-wrap gap-2 mb-2.5">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={traderSearch}
                    onChange={(event) => setTraderSearch(event.target.value)}
                    placeholder="Search name or username…"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono-code"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setOnlineOnly((value) => !value)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono-code ${
                    onlineOnly
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {onlineOnly ? 'Online only' : 'Everyone'} · {onlineCount}
                </button>
              </div>
              {filteredTraders.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {filteredTraders.map((trader) => {
                    const isActive = trader.presenceStatus === 'ACTIVE' || trader.isOnline;
                    return (
                      <button
                        type="button"
                        key={trader.id}
                        onClick={() => {
                          if (!currentUser && onOpenLogin) {
                            onOpenLogin();
                            return;
                          }
                          setActivePrivateContact({ id: trader.id, username: trader.username, displayName: trader.displayName });
                          setCommMode('FRIENDS');
                        }}
                        className="min-w-[160px] text-left p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                          <span className="text-xs font-bold text-slate-200 truncate">{trader.displayName}</span>
                          {trader.isNewThisWeek && <span className="text-[8px] text-amber-300">NEW</span>}
                        </div>
                        <span className="block text-[10px] text-slate-500 truncate">@{trader.username}</span>
                        <span className="block text-[9px] text-slate-500 mt-0.5">
                          {isActive ? (trader.traderStatus || 'Active now') : formatLastActive(trader.lastSeen)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 font-mono-code py-1">
                  No active traders match this search.
                </p>
              )}
            </section>
          )}
          {(isOffline || (feedError && messages.length === 0)) && (
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-cyan-200 text-xs font-mono-code text-center">
              {isOffline ? <><WifiOff className="inline w-3.5 h-3.5 mr-1" /> You're offline — messages will not send.</> : `FEED NOTICE — ${feedError || 'Connection lost. Showing last known messages.'}`}
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

          <div className={`flex-1 bg-slate-950/90 border border-slate-800 rounded-xl p-3 sm:p-4 overflow-y-auto space-y-3.5 shadow-inner ${isFullscreen ? 'h-full min-h-0' : 'min-h-[480px] md:min-h-[580px]'}`}>
            {isFeedLoading && messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono-code text-xs gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 opacity-70" />
                <span>Loading community feed…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 font-mono-code text-xs">
                <Users className="w-8 h-8 mb-2 opacity-50 text-cyan-400" />
                <span>
                  {isOffline
                    ? 'Offline — no cached messages available.'
                    : feedError || 'No community messages yet. Be the first to start the discussion!'}
                </span>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((m) => {
                    const isOwner = m.userRole === 'ADMIN';
                    const isMe = currentUser && m.userId === currentUser.id;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className={`flex flex-col max-w-xl ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 text-[11px] font-mono-code">
                          <span className={`font-bold ${isOwner ? 'text-cyan-400' : 'text-slate-300'}`}>{m.displayName}</span>
                          {isOwner && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/40 text-amber-300 text-[9px] font-bold">ADMIN</span>
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
                              className="text-[10px] text-cyan-400/80 hover:text-amber-300 underline cursor-pointer"
                            >
                              DM
                            </button>
                          )}
                        </div>

                        <div
                          className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-2.5 shadow-sm ${
                            isMe
                              ? 'bg-blue-500/10 border-blue-500/40 text-slate-100 rounded-tr-none'
                              : 'bg-slate-950 border-slate-700 text-slate-200 rounded-tl-none'
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
                            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-2 font-mono-code text-[11px]">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-emerald-200 font-bold truncate">
                                  <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span className="truncate">{m.driveFile.fileName}</span>
                                </div>
                                {m.driveFile.fileSize && (
                                  <span className="text-[10px] text-emerald-400/80 shrink-0">
                                    {(m.driveFile.fileSize / 1024).toFixed(1)} KB
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20">
                                <a
                                  href={m.driveFile.webViewLink || `https://drive.google.com/file/d/${m.driveFile.fileId}/view`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 text-[10px] font-bold transition"
                                >
                                  <ExternalLink className="w-3 h-3" /> Open in Drive
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (m.driveFile) {
                                      await googleDriveService.downloadFile(m.driveFile.fileId, m.driveFile.fileName);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-slate-300 hover:text-emerald-300 border border-slate-700 text-[10px] transition cursor-pointer"
                                >
                                  <Download className="w-3 h-3" /> Download
                                </button>
                              </div>
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
                          {m.intentCard && <IntentCard card={m.intentCard} />}

                          {/* Interactive Reaction & Engagement Bar */}
                          <div className="pt-1.5 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {['🔥', '🚀', '🎯', '💎', '📈', '👀'].map((emoji) => {
                                const count = m.reactions?.[emoji] || 0;
                                return (
                                  <motion.button
                                    key={emoji}
                                    type="button"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => handleToggleReaction(m.id, emoji)}
                                    className={`px-1.5 py-0.5 rounded-lg border transition cursor-pointer flex items-center gap-1 font-mono-code ${
                                      count > 0
                                        ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm'
                                        : 'bg-slate-900 border-slate-800/80 text-slate-500 hover:text-slate-300'
                                    }`}
                                    title={`React with ${emoji}`}
                                  >
                                    <span>{emoji}</span>
                                    {count > 0 && <span className="font-bold text-[9px]">{count}</span>}
                                  </motion.button>
                                );
                              })}
                            </div>
                            {m.seenBy && m.seenBy.length > 0 && (
                              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                <CheckCheck className="w-3 h-3 text-cyan-400" /> Seen by {m.seenBy.length}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
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
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Drive: {selectedDriveFile.fileName}</span>
                  <button type="button" onClick={() => setSelectedDriveFile(null)} className="hover:text-rose-400 ml-1 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
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

          {/* Chat Composer / Dispatch Bar */}
          {!currentUser ? (
            <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between gap-3 shadow-md shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-300 font-mono-code">
                  Join the PrimePipFX verified trader community to post signals & dispatches.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenLogin?.()}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-military tracking-wide cursor-pointer transition"
              >
                LOGIN TO PARTICIPATE
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 shrink-0">
              <input ref={driveFileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
              <input type="file" accept="image/*" className="hidden" id="cc-photo-input" onChange={handlePhotoSelect} />
              
              <button type="button" onClick={() => document.getElementById('cc-photo-input')?.click()} className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 hover:text-cyan-400 cursor-pointer" title="Photo">
                <ImageIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleOpenDrivePicker}
                className={`p-2.5 rounded-xl border cursor-pointer transition ${
                  selectedDriveFile
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-emerald-400'
                }`}
                title="Attach file directly from Google Drive"
              >
                <Cloud className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => driveFileInputRef.current?.click()} className="p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-400 hover:text-cyan-400 cursor-pointer" title="Attach file">
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={isRecordingAudio ? stopVoiceRecording : startVoiceRecording}
                className={`p-2.5 rounded-xl border cursor-pointer ${
                  isRecordingAudio ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-cyan-400'
                }`}
                title={isRecordingAudio ? 'Stop' : 'Voice note'}
              >
                {isRecordingAudio ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message the community…"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono-code"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isOffline || isSending || (!inputText.trim() && !selectedPhoto && !audioBase64 && !selectedLocalFile && !selectedDriveFile)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-amber-600 hover:from-blue-400 hover:to-amber-500 text-slate-950 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition"
              >
                {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                SEND
              </button>
            </form>
          )}
        </div>
      )}

      {/* Google Drive File Picker Modal */}
      {isDrivePickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-4 font-mono-code animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">ATTACH FROM GOOGLE DRIVE</h3>
                  <p className="text-[10px] text-slate-400">Select backup, journal, or analysis from your personal Drive</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrivePickerOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!googleDriveService.isConnected() ? (
              <div className="text-center py-6 space-y-3">
                <Cloud className="w-10 h-10 text-emerald-400/60 mx-auto" />
                <p className="text-xs text-slate-300">
                  Your Google Drive account is not currently connected to PrimePipFX.
                </p>
                <button
                  type="button"
                  onClick={handleConnectDriveFromPicker}
                  disabled={isLoadingDriveFiles}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition inline-flex items-center gap-2"
                >
                  {isLoadingDriveFiles ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                  Connect Google Drive
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={drivePickerSearch}
                    onChange={(e) => setDrivePickerSearch(e.target.value)}
                    placeholder="Search files in Drive…"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {isLoadingDriveFiles ? (
                    <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      Loading Drive files…
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No files found in your PrimePipFX Google Drive folder yet.
                    </div>
                  ) : (
                    driveFiles
                      .filter((f) => !drivePickerSearch.trim() || f.name.toLowerCase().includes(drivePickerSearch.toLowerCase()))
                      .map((f) => (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 flex items-center justify-between gap-3 transition"
                        >
                          <div className="truncate min-w-0">
                            <div className="text-xs font-bold text-slate-200 truncate">{f.name}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {f.folderCategory && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[9px]">
                                  {f.folderCategory}
                                </span>
                              )}
                              <span>{f.size || 'JSON'}</span>
                              <span>· {new Date(f.createdTime).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectDriveFile(f)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold shrink-0 transition cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Select
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsDrivePickerOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isCallModalOpen && callTargetUser && currentUser && (
        <WebRTCCallModal
          currentUser={currentUser}
          targetUser={callTargetUser}
          isIncoming={isIncomingCall}
          onClose={() => {
            setIsCallModalOpen(false);
            setIsIncomingCall(false);
            setCallTargetUser(null);
          }}
        />
      )}
    </div>
  );
};
