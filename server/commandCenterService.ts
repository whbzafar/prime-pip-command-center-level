import fs from 'fs';
import path from 'path';

export interface AppointmentRecord {
  id: string;
  userId: string;
  customerName: string;
  customerUsername: string;
  sessionType: string;
  preferredDate: string; // YYYY-MM-DD
  preferredTime: string; // e.g., "04:00 PM PKT"
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

export interface CommunityMessage {
  id: string;
  userId: string;
  username: string;
  userRole: 'ADMIN' | 'CUSTOMER';
  displayName: string;
  text: string;
  emoji?: string;
  photoBase64?: string;
  audioBase64?: string; // Kept for legacy fallback
  audioAttachmentId?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
  audioSize?: number;
  audioUrl?: string;
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
    id: '1-on-1-tactical',
    title: 'One-on-One Tactical Mentorship',
    price: 20,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'Personalized trade review, institutional liquidity analysis, and private mentoring.',
  },
  {
    id: 'live-execution-audit',
    title: 'Live Execution / Journal Audit',
    price: 10,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'In-depth audit of recent journal entries, mistakes, and execution quality.',
  },
  {
    id: 'sbt-deep-dive',
    title: 'SBT Model Deep Dive',
    price: 100,
    durationLabel: '3 months',
    durationMinutes: 0,
    description: 'Comprehensive 3-month mentorship program mastering all 10 SBT algorithmic models.',
  },
  {
    id: 'psychology-reset',
    title: 'Psychology / Emotion Reset',
    price: 30,
    durationLabel: '2 hours',
    durationMinutes: 120,
    description: 'Targeted psychological restructuring, revenge trading cooldown, and cognitive tools.',
  },
  {
    id: 'risk-optimization',
    title: 'Risk Protocol Optimization',
    price: 30,
    durationLabel: '1 hour',
    durationMinutes: 60,
    description: 'Capital preservation engineering, drawdown defense, and lot sizing protocols.',
  },
];

// ----------------------------------------------------
// SESSION CONFIGURATION & PRICING
// ----------------------------------------------------
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  price: 10,
  currency: 'USD',
  durationMinutes: 60,
  availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  availableTimeSlots: ['02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM', '10:00 PM'],
  sessionTypes: MENTORSHIP_PACKAGES.map((p) => p.title),
  maxDailyBookings: 3,
  ownerWhatsApp: '03406671495',
};

export function getSessionConfig(): SessionConfig & { packages: MentorshipPackage[] } {
  ensureDataDir();
  let baseConfig = DEFAULT_SESSION_CONFIG;
  if (fs.existsSync(SESSION_CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(SESSION_CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // Migrate away from old $50 default if present
      if (parsed.price === 50) parsed.price = 10;
      baseConfig = { ...DEFAULT_SESSION_CONFIG, ...parsed, sessionTypes: MENTORSHIP_PACKAGES.map((p) => p.title) };
    } catch {
      baseConfig = DEFAULT_SESSION_CONFIG;
    }
  } else {
    fs.writeFileSync(SESSION_CONFIG_FILE, JSON.stringify(DEFAULT_SESSION_CONFIG, null, 2), 'utf8');
  }
  return { ...baseConfig, packages: MENTORSHIP_PACKAGES };
}

export function saveSessionConfig(config: Partial<SessionConfig>): SessionConfig {
  ensureDataDir();
  const current = getSessionConfig();
  const updated: SessionConfig = {
    ...current,
    ...config,
  };
  fs.writeFileSync(SESSION_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}

// ----------------------------------------------------
// APPOINTMENTS MANAGEMENT
// ----------------------------------------------------
export function readAppointments(): AppointmentRecord[] {
  ensureDataDir();
  if (!fs.existsSync(APPOINTMENTS_FILE)) return [];
  try {
    const raw = fs.readFileSync(APPOINTMENTS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeAppointments(appointments: AppointmentRecord[]) {
  ensureDataDir();
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(appointments, null, 2), 'utf8');
}

export function createAppointment(record: Omit<AppointmentRecord, 'id' | 'createdAt' | 'updatedAt'>): AppointmentRecord {
  const appointments = readAppointments();
  const newAppointment: AppointmentRecord = {
    ...record,
    id: `apt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  appointments.unshift(newAppointment);
  writeAppointments(appointments);
  return newAppointment;
}

export function updateAppointmentStatus(
  id: string,
  updates: Partial<Pick<AppointmentRecord, 'status' | 'ownerNotes' | 'rescheduledDateTime'>>
): AppointmentRecord | null {
  const appointments = readAppointments();
  const idx = appointments.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  appointments[idx] = {
    ...appointments[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeAppointments(appointments);
  return appointments[idx];
}

// ----------------------------------------------------
// COMMUNITY MESSAGING
// ----------------------------------------------------
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
  // Keep last 500 messages to maintain speed
  const trimmed = messages.slice(-500);
  fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

export function postCommunityMessage(msg: Omit<CommunityMessage, 'id' | 'timestamp'>): CommunityMessage {
  const messages = readCommunityMessages();
  const newMsg: CommunityMessage = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
  };
  messages.push(newMsg);
  writeCommunityMessages(messages);
  return newMsg;
}

// ----------------------------------------------------
// FRIEND SYSTEM
// ----------------------------------------------------
export interface FriendshipRecord {
  id: string;
  userId1: string;
  username1: string;
  displayName1?: string;
  userId2: string;
  username2: string;
  displayName2?: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
  initiatedBy: string; // userId of requester
  createdAt: string;
  updatedAt: string;
}

const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');

export function readFriendships(): FriendshipRecord[] {
  ensureDataDir();
  if (!fs.existsSync(FRIENDS_FILE)) return [];
  try {
    const raw = fs.readFileSync(FRIENDS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeFriendships(records: FriendshipRecord[]) {
  ensureDataDir();
  fs.writeFileSync(FRIENDS_FILE, JSON.stringify(records, null, 2), 'utf8');
}

export function getUserFriends(userId: string) {
  const all = readFriendships();
  const userRecords = all.filter((r) => r.userId1 === userId || r.userId2 === userId);
  return {
    friends: userRecords.filter((r) => r.status === 'ACCEPTED'),
    incomingRequests: userRecords.filter((r) => r.status === 'REQUESTED' && r.initiatedBy !== userId),
    outgoingRequests: userRecords.filter((r) => r.status === 'REQUESTED' && r.initiatedBy === userId),
    blocked: userRecords.filter((r) => r.status === 'BLOCKED'),
  };
}

export function sendFriendRequest(
  sender: { id: string; username: string; displayName?: string },
  receiver: { id: string; username: string; displayName?: string }
): { success: boolean; error?: string; record?: FriendshipRecord } {
  if (sender.id === receiver.id) {
    return { success: false, error: 'Cannot send friend request to yourself' };
  }
  const all = readFriendships();
  const existing = all.find(
    (r) =>
      (r.userId1 === sender.id && r.userId2 === receiver.id) ||
      (r.userId1 === receiver.id && r.userId2 === sender.id)
  );

  if (existing) {
    if (existing.status === 'ACCEPTED') return { success: false, error: 'Already friends' };
    if (existing.status === 'REQUESTED') return { success: false, error: 'Friend request already pending' };
    if (existing.status === 'BLOCKED') return { success: false, error: 'User is blocked' };
    // If rejected, can re-request
    existing.status = 'REQUESTED';
    existing.initiatedBy = sender.id;
    existing.updatedAt = new Date().toISOString();
    writeFriendships(all);
    return { success: true, record: existing };
  }

  const newRec: FriendshipRecord = {
    id: `fr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId1: sender.id,
    username1: sender.username,
    displayName1: sender.displayName || sender.username,
    userId2: receiver.id,
    username2: receiver.username,
    displayName2: receiver.displayName || receiver.username,
    status: 'REQUESTED',
    initiatedBy: sender.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.push(newRec);
  writeFriendships(all);
  return { success: true, record: newRec };
}

export function updateFriendshipStatus(
  requestId: string,
  targetStatus: 'ACCEPTED' | 'REJECTED' | 'BLOCKED' | 'REMOVED',
  currentUserId: string
): { success: boolean; error?: string } {
  const all = readFriendships();
  const idx = all.findIndex((r) => r.id === requestId);
  if (idx === -1) return { success: false, error: 'Friend request not found' };

  const rec = all[idx];
  if (rec.userId1 !== currentUserId && rec.userId2 !== currentUserId) {
    return { success: false, error: 'Unauthorized to modify this friend request' };
  }

  if (targetStatus === 'REMOVED') {
    all.splice(idx, 1);
  } else {
    rec.status = targetStatus;
    rec.updatedAt = new Date().toISOString();
  }
  writeFriendships(all);
  return { success: true };
}

// ----------------------------------------------------
// PRIVATE CHAT MESSAGING
// ----------------------------------------------------
export interface PrivateMessageRecord {
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName?: string;
  receiverId: string;
  receiverUsername: string;
  text: string;
  type: 'TEXT' | 'VOICE' | 'IMAGE';
  photoBase64?: string;
  audioBase64?: string; // Kept for legacy fallback
  audioAttachmentId?: string;
  audioMimeType?: string;
  audioDurationSeconds?: number;
  audioSize?: number;
  audioUrl?: string;
  timestamp: number;
  timePkt: string;
  datePkt: string;
  read: boolean;
}

const PRIVATE_MESSAGES_FILE = path.join(DATA_DIR, 'private_messages.json');

export function readPrivateMessages(): PrivateMessageRecord[] {
  ensureDataDir();
  if (!fs.existsSync(PRIVATE_MESSAGES_FILE)) return [];
  try {
    const raw = fs.readFileSync(PRIVATE_MESSAGES_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writePrivateMessages(messages: PrivateMessageRecord[]) {
  ensureDataDir();
  const trimmed = messages.slice(-1000);
  fs.writeFileSync(PRIVATE_MESSAGES_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

export function getConversationId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

export function getPrivateConversation(userId1: string, userId2: string): PrivateMessageRecord[] {
  const convId = getConversationId(userId1, userId2);
  const all = readPrivateMessages();
  return all.filter((m) => m.conversationId === convId);
}

export function postPrivateMessage(
  msg: Omit<PrivateMessageRecord, 'id' | 'conversationId' | 'timestamp' | 'read'>
): PrivateMessageRecord {
  const all = readPrivateMessages();
  const convId = getConversationId(msg.senderId, msg.receiverId);
  const newMsg: PrivateMessageRecord = {
    ...msg,
    id: `pmsg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    conversationId: convId,
    timestamp: Date.now(),
    read: false,
  };
  all.push(newMsg);
  writePrivateMessages(all);
  return newMsg;
}

// ----------------------------------------------------
// WEBRTC SIGNALING (VIDEO & SCREEN SHARE)
// ----------------------------------------------------
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
  return session;
}

export function addIceCandidate(callId: string, isCaller: boolean, candidate: any): boolean {
  const session = activeCalls.get(callId);
  if (!session) return false;
  if (isCaller) {
    session.callerCandidates.push(candidate);
  } else {
    session.receiverCandidates.push(candidate);
  }
  session.updatedAt = Date.now();
  return true;
}

// ----------------------------------------------------
// SECURE VOICE ATTACHMENT MEDIA LAYER
// ----------------------------------------------------
export interface AudioAttachmentMeta {
  id: string;
  uploaderId: string;
  uploaderUsername: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number;
  isPrivate: boolean;
  conversationId?: string;
  allowedUserIds?: string[];
  createdAt: number;
}

const MEDIA_VOICE_DIR = path.join(DATA_DIR, 'media', 'voice');
const VOICE_META_FILE = path.join(DATA_DIR, 'media', 'voice_metadata.json');

export function ensureVoiceMediaDir() {
  ensureDataDir();
  if (!fs.existsSync(MEDIA_VOICE_DIR)) {
    fs.mkdirSync(MEDIA_VOICE_DIR, { recursive: true });
  }
}

export function readVoiceMetadata(): Record<string, AudioAttachmentMeta> {
  ensureVoiceMediaDir();
  if (!fs.existsSync(VOICE_META_FILE)) return {};
  try {
    const raw = fs.readFileSync(VOICE_META_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function writeVoiceMetadata(meta: Record<string, AudioAttachmentMeta>) {
  ensureVoiceMediaDir();
  fs.writeFileSync(VOICE_META_FILE, JSON.stringify(meta, null, 2), 'utf8');
}

export function saveVoiceAttachmentFile(
  buffer: Buffer,
  uploaderId: string,
  uploaderUsername: string,
  mimeType: string,
  durationSeconds: number,
  isPrivate: boolean,
  allowedUserIds?: string[],
  conversationId?: string
): AudioAttachmentMeta {
  ensureVoiceMediaDir();
  const id = `voice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // Determine file extension preserving true format
  let ext = '.webm';
  const cleanMime = (mimeType || 'audio/webm').toLowerCase();
  if (cleanMime.includes('mp4') || cleanMime.includes('m4a')) ext = '.mp4';
  else if (cleanMime.includes('aac')) ext = '.aac';
  else if (cleanMime.includes('ogg')) ext = '.ogg';
  else if (cleanMime.includes('wav')) ext = '.wav';

  const filename = `${id}${ext}`;
  const filePath = path.join(MEDIA_VOICE_DIR, filename);

  fs.writeFileSync(filePath, buffer);

  const metaRecord: AudioAttachmentMeta = {
    id,
    uploaderId,
    uploaderUsername,
    filename,
    mimeType: mimeType || 'audio/webm;codecs=opus',
    sizeBytes: buffer.length,
    durationSeconds: Math.max(1, Math.round(durationSeconds || 0)),
    isPrivate,
    allowedUserIds: allowedUserIds || [],
    conversationId,
    createdAt: Date.now(),
  };

  const allMeta = readVoiceMetadata();
  allMeta[id] = metaRecord;
  writeVoiceMetadata(allMeta);

  return metaRecord;
}

export function getVoiceAttachment(id: string): { meta: AudioAttachmentMeta | null; filePath: string | null } {
  // Guard against directory traversal
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const allMeta = readVoiceMetadata();
  const meta = allMeta[safeId];
  if (!meta) return { meta: null, filePath: null };

  const filePath = path.join(MEDIA_VOICE_DIR, path.basename(meta.filename));
  if (!fs.existsSync(filePath)) {
    return { meta, filePath: null };
  }
  return { meta, filePath };
}

export function deleteVoiceAttachment(id: string): boolean {
  const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
  const allMeta = readVoiceMetadata();
  const meta = allMeta[safeId];
  if (!meta) return false;

  const filePath = path.join(MEDIA_VOICE_DIR, path.basename(meta.filename));
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {}
  }
  delete allMeta[safeId];
  writeVoiceMetadata(allMeta);
  return true;
}


