import fs from 'fs';
import path from 'path';

export interface AppointmentRecord {
  id: string;
  userId: string;
  customerName: string;
  customerUsername: string;
  sessionType: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes: number;
  price: number;
  currency: string;
  notes?: string;
  status: 'REQUESTED' | 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED';
  ownerNotes?: string;
  rescheduledDateTime?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionConfig {
  price: number;
  currency: string;
  durationMinutes: number;
  availableDays: string[];
  availableTimeSlots: string[];
  sessionTypes: string[];
  maxDailyBookings: number;
  ownerWhatsApp: string;
}

export interface MessageSeenRecord {
  userId: string;
  username: string;
  displayName: string;
  seenAt: number;
}

export interface DriveAttachmentReference {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
  iconUrl?: string;
  size?: string;
}

export interface CommunityMessage {
  id: string;
  userId: string;
  username: string;
  userRole: 'ADMIN' | 'CUSTOMER';
  displayName: string;
  text: string;
  emoji?: string;
  photoBase64?: string;
  photoUrl?: string;
  audioBase64?: string;
  audioAttachmentId?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
  audioSize?: number;
  audioUrl?: string;
  mentions?: { userId: string; username: string }[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  driveFile?: DriveAttachmentReference;
  seenBy?: MessageSeenRecord[];
  intentCard?: any;
  timestamp: number;
  timePkt: string;
  datePkt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const APPOINTMENTS_FILE = path.join(DATA_DIR, 'appointments.json');
const SESSION_CONFIG_FILE = path.join(DATA_DIR, 'session_config.json');
const COMMUNITY_FILE = path.join(DATA_DIR, 'community_messages.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export interface MentorshipPackage {
  id: string;
  title: string;
  price: number;
  durationLabel: string;
  durationMinutes?: number;
  description: string;
}

export const MENTORSHIP_PACKAGES: MentorshipPackage[] = [
  {
    id: 'general-standard',
    title: 'General / Standard Mentorship',
    price: 10,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'Foundational strategy review, risk parameters check, and trade alignment.',
  },
  {
    id: 'institutional-premium',
    title: 'Institutional Premium Mentorship',
    price: 25,
    durationLabel: '2 hours',
    durationMinutes: 120,
    description: 'Personalized trade review, institutional liquidity analysis, and private mentoring.',
  },
];

export function readAppointments(): AppointmentRecord[] {
  ensureDataDir();
  if (!fs.existsSync(APPOINTMENTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function writeAppointments(appointments: AppointmentRecord[]) {
  ensureDataDir();
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(appointments, null, 2), 'utf8');
}

export function createAppointment(
  data: Omit<AppointmentRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): AppointmentRecord {
  const all = readAppointments();
  const now = new Date().toISOString();
  const record: AppointmentRecord = {
    ...data,
    id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    status: 'REQUESTED',
    createdAt: now,
    updatedAt: now,
  };
  all.push(record);
  writeAppointments(all);
  return record;
}

export function updateAppointmentStatus(
  id: string,
  status: AppointmentRecord['status'],
  ownerNotes?: string,
  rescheduledDateTime?: string
): AppointmentRecord | null {
  const all = readAppointments();
  const idx = all.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  all[idx].status = status;
  all[idx].updatedAt = new Date().toISOString();
  if (ownerNotes !== undefined) all[idx].ownerNotes = ownerNotes;
  if (rescheduledDateTime !== undefined) all[idx].rescheduledDateTime = rescheduledDateTime;
  writeAppointments(all);
  return all[idx];
}

export function getSessionConfig(): SessionConfig {
  ensureDataDir();
  if (!fs.existsSync(SESSION_CONFIG_FILE)) {
    const defaults: SessionConfig = {
      price: 10,
      currency: 'USD',
      durationMinutes: 60,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableTimeSlots: ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'],
      sessionTypes: ['General Mentorship', 'Trade Review', 'Risk Management'],
      maxDailyBookings: 5,
      ownerWhatsApp: '03406671495',
    };
    fs.writeFileSync(SESSION_CONFIG_FILE, JSON.stringify(defaults, null, 2), 'utf8');
    return defaults;
  }
  try {
    return JSON.parse(fs.readFileSync(SESSION_CONFIG_FILE, 'utf8'));
  } catch {
    return {
      price: 10,
      currency: 'USD',
      durationMinutes: 60,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableTimeSlots: ['10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM'],
      sessionTypes: ['General Mentorship'],
      maxDailyBookings: 5,
      ownerWhatsApp: '03406671495',
    };
  }
}

export function saveSessionConfig(config: SessionConfig): SessionConfig {
  ensureDataDir();
  fs.writeFileSync(SESSION_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  return config;
}

export function readCommunityMessages(): CommunityMessage[] {
  ensureDataDir();
  if (!fs.existsSync(COMMUNITY_FILE)) {
    const initialMessages: CommunityMessage[] = [
      {
        id: 'msg-welcome-owner',
        userId: 'dev-owner-master',
        username: 'primepipfx-admin',
        userRole: 'ADMIN',
        displayName: 'PrimePipFX Developer / Owner',
        text: 'Welcome to the PrimePipFX Command Center Community Hub. Trade with precision, manage your risk, and keep all discussions professional.',
        timestamp: Date.now() - 3600000,
        timePkt: '01:30 PM',
        datePkt: '2026-09-11',
      },
    ];
    fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(initialMessages, null, 2), 'utf8');
    return initialMessages;
  }
  try {
    const raw = fs.readFileSync(COMMUNITY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeCommunityMessages(messages: CommunityMessage[]) {
  ensureDataDir();
  fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(messages, null, 2), 'utf8');
}

export function postCommunityMessage(msg: Omit<CommunityMessage, 'id' | 'timestamp'> & { fileBase64?: string }): CommunityMessage {
  const messages = readCommunityMessages();

  const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 4000) : '';
  const hasMedia = !!(msg.photoBase64 || msg.audioBase64 || msg.audioAttachmentId || msg.driveFile || msg.fileBase64 || msg.attachmentUrl);
  if (!text && !hasMedia) {
    throw new Error('Message cannot be empty. Provide text or an attachment.');
  }

  if (msg.photoBase64 && msg.photoBase64.length > 5_000_000) {
    throw new Error('Image attachment is too large. Please use a smaller image.');
  }
  
  if (msg.fileBase64 && msg.fileBase64.length > 10_000_000) {
    throw new Error('File attachment is too large (max 10MB).');
  }

  let photoUrl = msg.photoUrl;
  if (msg.photoBase64 && !photoUrl) {
    photoUrl = saveImageAttachmentFile(msg.photoBase64);
  }

  let attachmentUrl = msg.attachmentUrl;
  let attachmentSize = msg.attachmentSize;
  if (msg.fileBase64 && msg.attachmentName && !attachmentUrl) {
    const res = saveFileAttachmentFile(msg.fileBase64, msg.attachmentName);
    attachmentUrl = res.url;
    attachmentSize = res.size;
  }

  const now = Date.now();
  const pktDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
  const pktTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(now));

  const newMsg: CommunityMessage = {
    ...msg,
    text,
    photoUrl,
    photoBase64: undefined,
    attachmentUrl,
    attachmentSize,
    userRole: msg.userRole === 'ADMIN' ? 'ADMIN' : 'CUSTOMER',
    seenBy: [],
    id: `msg-${now}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    datePkt: pktDate,
    timePkt: pktTime,
  };
  // Remove fileBase64 from saved message
  (newMsg as any).fileBase64 = undefined;
  
  messages.push(newMsg);
  writeCommunityMessages(messages);
  return newMsg;
}

export function markCommunityMessagesSeen(
  messageIds: string[],
  user: { id: string; username: string; displayName: string }
): number {
  if (!messageIds || messageIds.length === 0 || !user || !user.id) return 0;
  const messages = readCommunityMessages();
  let updatedCount = 0;
  const now = Date.now();

  for (const m of messages) {
    if (messageIds.includes(m.id)) {
      if (!m.seenBy) m.seenBy = [];
      const alreadySeen = m.seenBy.some((s) => s.userId === user.id);
      if (!alreadySeen) {
        m.seenBy.push({
          userId: user.id,
          username: user.username,
          displayName: user.displayName || user.username,
          seenAt: now,
        });
        updatedCount++;
      }
    }
  }

  if (updatedCount > 0) {
    writeCommunityMessages(messages);
  }
  return updatedCount;
}

export interface FriendshipRecord {
  id: string;
  requesterId: string;
  requesterUsername: string;
  recipientId: string;
  recipientUsername: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | 'REMOVED';
  createdAt: number;
  updatedAt: number;
}

const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');

export function readFriendships(): FriendshipRecord[] {
  ensureDataDir();
  if (!fs.existsSync(FRIENDS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(FRIENDS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function writeFriendships(records: FriendshipRecord[]) {
  ensureDataDir();
  fs.writeFileSync(FRIENDS_FILE, JSON.stringify(records, null, 2), 'utf8');
}

export interface FriendListItem {
  id: string;
  friendId: string;
  friendUsername: string;
  friendDisplayName: string;
  onlineStatus?: 'ONLINE' | 'AWAY' | 'OFFLINE';
  isOnline?: boolean;
  since: string;
}

export interface FriendRequestItem {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  receiverId: string;
  receiverUsername: string;
  receiverDisplayName: string;
  createdAt: string;
}

export function getUserFriends(userId: string): {
  friends: FriendListItem[];
  incomingRequests: FriendRequestItem[];
  outgoingRequests: FriendRequestItem[];
} {
  const all = readFriendships();
  const active = all.filter(
    (r) =>
      (r.requesterId === userId || r.recipientId === userId) &&
      r.status !== 'REMOVED' &&
      r.status !== 'REJECTED'
  );

  const friends: FriendListItem[] = active
    .filter((r) => r.status === 'ACCEPTED')
    .map((r) => {
      const isRequester = r.requesterId === userId;
      return {
        id: r.id,
        friendId: isRequester ? r.recipientId : r.requesterId,
        friendUsername: isRequester ? r.recipientUsername : r.requesterUsername,
        friendDisplayName: isRequester ? r.recipientUsername : r.requesterUsername,
        since: new Date(r.createdAt).toISOString(),
      };
    });

  const toRequestItem = (r: FriendshipRecord): FriendRequestItem => ({
    id: r.id,
    senderId: r.requesterId,
    senderUsername: r.requesterUsername,
    senderDisplayName: r.requesterUsername,
    receiverId: r.recipientId,
    receiverUsername: r.recipientUsername,
    receiverDisplayName: r.recipientUsername,
    createdAt: new Date(r.createdAt).toISOString(),
  });

  const incomingRequests = active
    .filter((r) => r.recipientId === userId && r.status === 'PENDING')
    .map(toRequestItem);

  const outgoingRequests = active
    .filter((r) => r.requesterId === userId && r.status === 'PENDING')
    .map(toRequestItem);

  return { friends, incomingRequests, outgoingRequests };
}

type FriendUserRef = { id: string; username: string; displayName?: string };

export function sendFriendRequest(
  requesterOrId: string | FriendUserRef,
  requesterUsernameOrRecipient?: string | FriendUserRef,
  recipientId?: string,
  recipientUsername?: string
): { success: boolean; error?: string; record?: FriendshipRecord } {
  let requesterId: string;
  let requesterUsername: string;
  let recId: string;
  let recUsername: string;

  if (typeof requesterOrId === 'object' && requesterOrId !== null) {
    const from = requesterOrId as FriendUserRef;
    const to = requesterUsernameOrRecipient as FriendUserRef;
    requesterId = from.id;
    requesterUsername = from.username;
    recId = to.id;
    recUsername = to.username;
  } else {
    requesterId = requesterOrId as string;
    requesterUsername = requesterUsernameOrRecipient as string;
    recId = recipientId as string;
    recUsername = recipientUsername as string;
  }

  if (!requesterId || !recId) {
    return { success: false, error: 'Requester and recipient are required' };
  }
  if (requesterId === recId) {
    return { success: false, error: 'Cannot send friend request to yourself' };
  }

  const all = readFriendships();
  const existingIdx = all.findIndex(
    (r) =>
      (r.requesterId === requesterId && r.recipientId === recId) ||
      (r.requesterId === recId && r.recipientId === requesterId)
  );

  if (existingIdx >= 0) {
    const existing = all[existingIdx];
    if (existing.status === 'ACCEPTED') return { success: false, error: 'Already friends' };
    if (existing.status === 'PENDING') return { success: false, error: 'Request already pending' };
    if (existing.status === 'BLOCKED') return { success: false, error: 'Unable to send request' };
    if (existing.status === 'REJECTED' || existing.status === 'REMOVED') {
      all[existingIdx] = {
        ...existing,
        requesterId,
        requesterUsername,
        recipientId: recId,
        recipientUsername: recUsername,
        status: 'PENDING',
        updatedAt: Date.now(),
      };
      writeFriendships(all);
      return { success: true, record: all[existingIdx] };
    }
  }

  const record: FriendshipRecord = {
    id: `fr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    requesterId,
    requesterUsername,
    recipientId: recId,
    recipientUsername: recUsername,
    status: 'PENDING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  all.push(record);
  writeFriendships(all);
  return { success: true, record };
}

export function updateFriendshipStatus(
  requestId: string,
  status: FriendshipRecord['status'],
  actingUserId: string
): { success: boolean; error?: string } {
  const all = readFriendships();
  const idx = all.findIndex((r) => r.id === requestId);
  if (idx === -1) return { success: false, error: 'Request not found' };
  const rec = all[idx];
  if (rec.requesterId !== actingUserId && rec.recipientId !== actingUserId) {
    return { success: false, error: 'Unauthorized to modify this friend request' };
  }
  if ((status === 'ACCEPTED' || status === 'REJECTED') && rec.status === 'PENDING') {
    if (rec.recipientId !== actingUserId) {
      return { success: false, error: 'Only the recipient can accept or reject this request' };
    }
  }
  all[idx].status = status;
  all[idx].updatedAt = Date.now();
  writeFriendships(all);
  return { success: true };
}

export interface PrivateMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  receiverId: string;
  receiverUsername: string;
  text: string;
  photoBase64?: string;
  photoUrl?: string;
  audioBase64?: string;
  audioAttachmentId?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
  audioSize?: number;
  audioUrl?: string;
  mentions?: { userId: string; username: string }[];
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  timestamp: number;
  read: boolean;
}

const PRIVATE_MESSAGES_FILE = path.join(DATA_DIR, 'private_messages.json');

export function readPrivateMessages(): PrivateMessageRecord[] {
  ensureDataDir();
  if (!fs.existsSync(PRIVATE_MESSAGES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PRIVATE_MESSAGES_FILE, 'utf8'));
  } catch {
    return [];
  }
}

export function writePrivateMessages(messages: PrivateMessageRecord[]) {
  ensureDataDir();
  const trimmed = messages.slice(-1000);
  fs.writeFileSync(PRIVATE_MESSAGES_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

function getConversationId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('_');
}

export function getPrivateConversation(userId1: string, userId2: string): PrivateMessageRecord[] {
  const convId = getConversationId(userId1, userId2);
  const all = readPrivateMessages();
  return all.filter((m) => m.conversationId === convId);
}


export function markPrivateMessagesRead(receiverId: string, senderId: string): number {
  const msgs = readPrivateMessages();
  let updated = 0;
  for (const m of msgs) {
    if (m.receiverId === receiverId && m.senderId === senderId && !m.read) {
      m.read = true;
      updated++;
    }
  }
  if (updated > 0) writePrivateMessages(msgs);
  return updated;
}

export function postPrivateMessage(
  msg: Omit<PrivateMessageRecord, 'id' | 'conversationId' | 'timestamp' | 'read'> & { fileBase64?: string }
): PrivateMessageRecord {
  const all = readPrivateMessages();
  const convId = getConversationId(msg.senderId, msg.receiverId);
  
  let photoUrl = msg.photoUrl;
  if (msg.photoBase64 && !photoUrl) {
    photoUrl = saveImageAttachmentFile(msg.photoBase64);
  }

  let attachmentUrl = msg.attachmentUrl;
  let attachmentSize = msg.attachmentSize;
  if (msg.fileBase64 && msg.attachmentName && !attachmentUrl) {
    const res = saveFileAttachmentFile(msg.fileBase64, msg.attachmentName);
    attachmentUrl = res.url;
    attachmentSize = res.size;
  }

  const newMsg: PrivateMessageRecord = {
    ...msg,
    photoUrl,
    photoBase64: undefined,
    attachmentUrl,
    attachmentSize,
    id: `pmsg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conversationId: convId,
    timestamp: Date.now(),
    read: false,
  };
  (newMsg as any).fileBase64 = undefined;

  all.push(newMsg);
  writePrivateMessages(all);
  return newMsg;
}

export interface WebRTCCallSession {
  callId: string;
  callerId: string;
  callerUsername: string;
  receiverId: string;
  receiverUsername: string;
  status: 'CALLING' | 'RINGING' | 'CONNECTED' | 'ENDED' | 'REJECTED';
  offer?: any;
  answer?: any;
  callerCandidates: any[];
  receiverCandidates: any[];
  isScreenSharing?: boolean;
  updatedAt: number;
}

const activeCalls: Map<string, WebRTCCallSession> = new Map();

export function initiateWebRTCCall(params: {
  callerId: string;
  callerUsername: string;
  receiverId: string;
  receiverUsername: string;
  offer?: any;
  isScreenSharing?: boolean;
}): WebRTCCallSession {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const session: WebRTCCallSession = {
    callId,
    callerId: params.callerId,
    callerUsername: params.callerUsername,
    receiverId: params.receiverId,
    receiverUsername: params.receiverUsername,
    status: 'CALLING',
    offer: params.offer,
    callerCandidates: [],
    receiverCandidates: [],
    isScreenSharing: !!params.isScreenSharing,
    updatedAt: Date.now(),
  };
  activeCalls.set(callId, session);
  return session;
}

export function getCallSession(callId: string): WebRTCCallSession | null {
  return activeCalls.get(callId) || null;
}

export function getActiveCallForUser(userId: string): WebRTCCallSession | null {
  for (const session of activeCalls.values()) {
    if (
      (session.callerId === userId || session.receiverId === userId) &&
      session.status !== 'ENDED' &&
      session.status !== 'REJECTED'
    ) {
      return session;
    }
  }
  return null;
}

export function updateCallSession(
  callId: string,
  updates: Partial<WebRTCCallSession>
): WebRTCCallSession | null {
  const session = activeCalls.get(callId);
  if (!session) return null;
  Object.assign(session, updates, { updatedAt: Date.now() });
  activeCalls.set(callId, session);
  return session;
}

export function addIceCandidate(
  callId: string,
  candidate: any,
  fromCaller: boolean
): boolean {
  const session = activeCalls.get(callId);
  if (!session) return false;
  if (fromCaller) session.callerCandidates.push(candidate);
  else session.receiverCandidates.push(candidate);
  session.updatedAt = Date.now();
  return true;
}

const VOICE_DIR = path.join(DATA_DIR, 'voice');
const IMAGE_DIR = path.join(DATA_DIR, 'images');
const FILE_DIR = path.join(DATA_DIR, 'files');
const VOICE_META_FILE = path.join(DATA_DIR, 'voice_metadata.json');

export function saveFileAttachmentFile(base64Data: string, originalName: string): { url: string; size: number } {
  ensureDataDir();
  if (!fs.existsSync(FILE_DIR)) fs.mkdirSync(FILE_DIR, { recursive: true });
  const id = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  let ext = originalName.split('.').pop() || 'bin';
  let data = base64Data;
  if (base64Data.includes(',')) {
    data = base64Data.split(',')[1];
  }
  const buffer = Buffer.from(data, 'base64');
  const fileName = `${id}.${ext}`;
  const filePath = path.join(FILE_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return { url: `/api/media/file/${fileName}`, size: buffer.length };
}

export function saveImageAttachmentFile(base64Data: string): string {
  ensureDataDir();
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  // Determine extension from data url or default to jpeg
  let ext = 'jpg';
  let data = base64Data;
  if (base64Data.startsWith('data:image/')) {
    const parts = base64Data.split(';');
    if (parts.length > 0) {
      ext = parts[0].replace('data:image/', '');
      if (ext === 'jpeg') ext = 'jpg';
    }
  }
  if (base64Data.includes(',')) {
    data = base64Data.split(',')[1];
  }
  const buffer = Buffer.from(data, 'base64');
  const fileName = `${id}.${ext}`;
  const filePath = path.join(IMAGE_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/api/media/image/${fileName}`;
}

interface VoiceMeta {
  id: string;
  userId: string;
  mimeType: string;
  durationSeconds?: number;
  size?: number;
  isPrivate?: boolean;
  participantIds?: string[];
  createdAt: number;
}

function readVoiceMetadata(): VoiceMeta[] {
  ensureDataDir();
  if (!fs.existsSync(VOICE_META_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(VOICE_META_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeVoiceMetadata(meta: VoiceMeta[]) {
  ensureDataDir();
  fs.writeFileSync(VOICE_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

export function saveVoiceAttachmentFile(params: {
  userId: string;
  audioData: string;
  mimeType: string;
  durationSeconds?: number;
  isPrivate?: boolean;
  participantIds?: string[];
}): { id: string; audioUrl: string; audioMimeType: string; audioDurationSeconds?: number; audioSize?: number } {
  ensureDataDir();
  if (!fs.existsSync(VOICE_DIR)) fs.mkdirSync(VOICE_DIR, { recursive: true });
  const id = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const base64Data = params.audioData.includes(',') ? params.audioData.split(',')[1] : params.audioData;
  const buffer = Buffer.from(base64Data, 'base64');
  const ext = params.mimeType.includes('ogg') ? 'ogg' : params.mimeType.includes('mp4') ? 'm4a' : 'webm';
  const filePath = path.join(VOICE_DIR, `${id}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  const meta: VoiceMeta = {
    id,
    userId: params.userId,
    mimeType: params.mimeType,
    durationSeconds: params.durationSeconds,
    size: buffer.length,
    isPrivate: params.isPrivate,
    participantIds: params.participantIds,
    createdAt: Date.now(),
  };
  const all = readVoiceMetadata();
  all.push(meta);
  writeVoiceMetadata(all);
  return {
    id,
    audioUrl: `/api/media/voice/${id}`,
    audioMimeType: params.mimeType,
    audioDurationSeconds: params.durationSeconds,
    audioSize: buffer.length,
  };
}

export function getVoiceAttachment(id: string): { meta: VoiceMeta; filePath: string } | null {
  const all = readVoiceMetadata();
  const meta = all.find((m) => m.id === id);
  if (!meta) return null;
  const ext = meta.mimeType.includes('ogg') ? 'ogg' : meta.mimeType.includes('mp4') ? 'm4a' : 'webm';
  const filePath = path.join(VOICE_DIR, `${id}.${ext}`);
  if (!fs.existsSync(filePath)) return null;
  return { meta, filePath };
}

export function deleteVoiceAttachment(id: string, userId: string): boolean {
  const all = readVoiceMetadata();
  const idx = all.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  if (all[idx].userId !== userId) return false;
  const ext = all[idx].mimeType.includes('ogg') ? 'ogg' : all[idx].mimeType.includes('mp4') ? 'm4a' : 'webm';
  const filePath = path.join(VOICE_DIR, `${id}.${ext}`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  all.splice(idx, 1);
  writeVoiceMetadata(all);
  return true;
}
