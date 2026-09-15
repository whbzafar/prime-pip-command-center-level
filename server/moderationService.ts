import fs from 'fs';
import path from 'path';
import { readUsers, writeUsers } from './authService.js';

export interface ModerationWarning {
  id: string;
  userId: string;
  username: string;
  userDisplayName?: string;
  violationType:
    | 'ABUSIVE_LANGUAGE'
    | 'HARASSMENT'
    | 'SEXUAL_CONTENT'
    | 'SUSPICIOUS_ACTIVITY'
    | 'SPAM'
    | 'UNRELATED_CONTENT'
    | 'COMPETITOR_PROMOTION'
    | 'CONTACT_INFO_SHARING'
    | 'POLICY_VIOLATION';
  messageSample: string;
  warningNumber: number; // 1 to 5
  timestamp: number;
  datePkt: string;
  timePkt: string;
  acknowledgedByAdmin?: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const WARNINGS_FILE = path.join(DATA_DIR, 'moderation_warnings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readModerationWarnings(): ModerationWarning[] {
  ensureDataDir();
  if (!fs.existsSync(WARNINGS_FILE)) return [];
  try {
    const raw = fs.readFileSync(WARNINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function writeModerationWarnings(warnings: ModerationWarning[]) {
  ensureDataDir();
  fs.writeFileSync(WARNINGS_FILE, JSON.stringify(warnings, null, 2), 'utf8');
}

// Prohibited profanity and abusive terms (English + Roman Urdu)
const BANNED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'cunt', 'dick', 'pussy', 'whore', 'slut',
  'scam', 'scammer', 'fraud', 'steal', 'ponzi',
  'madarchod', 'behenchod', 'bhenchod', 'chutiya', 'gandu', 'kutta', 'harami', 'kanjar', 'randi', 'dalaal',
  'nude', 'porn', 'sex', 'sexy', 'boobs', 'penis', 'vagina', 'orgasm'
];

// Phone number regex pattern (Pakistani numbers & international formats)
// Except official PrimePipFX number: 03406671495 / +923406671495
const OFFICIAL_SUPPORT_PHONE = '03406671495';
const PHONE_PATTERN = /(\+?92\s?3\d{2}[-.\s]?\d{7}|\b03\d{2}[-.\s]?\d{7}\b|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10,13}\b)/g;

export interface ModerationCheckResult {
  passed: boolean;
  violationType?: ModerationWarning['violationType'];
  reason?: string;
  userWarningCount?: number;
  isSuspended?: boolean;
}

export function moderateMessage(
  userId: string,
  username: string,
  text: string
): ModerationCheckResult {
  if (!text || typeof text !== 'string') {
    return { passed: true };
  }

  const cleanText = text.toLowerCase();

  // 1. Check for profanity / abusive words
  for (const word of BANNED_WORDS) {
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    if (wordRegex.test(cleanText)) {
      return recordViolationAndWarn(
        userId,
        username,
        'ABUSIVE_LANGUAGE',
        text,
        'Prohibited profanity / abusive language detected.'
      );
    }
  }

  // 2. Check for personal phone number / contact details sharing
  // Strip out official support contact first so it is never blocked
  const sanitizedTextForPhoneCheck = text.replace(/03406671495/g, '').replace(/\+923406671495/g, '');
  const matches = sanitizedTextForPhoneCheck.match(PHONE_PATTERN);
  if (matches && matches.length > 0) {
    return recordViolationAndWarn(
      userId,
      username,
      'CONTACT_INFO_SHARING',
      text,
      'Sharing personal phone numbers or contact details is prohibited.'
    );
  }

  // 3. Check for competitor platform promotion or external scam links
  if (/t\.me\/|telegram\.me|joinchat|whatsapp\.com\/chat|discord\.gg/i.test(text)) {
    return recordViolationAndWarn(
      userId,
      username,
      'COMPETITOR_PROMOTION',
      text,
      'Sharing external group links or promoting outside channels is prohibited.'
    );
  }

  return { passed: true };
}

function recordViolationAndWarn(
  userId: string,
  username: string,
  violationType: ModerationWarning['violationType'],
  rawText: string,
  reason: string
): ModerationCheckResult {
  const users = readUsers();
  const user = users.find((u) => u.id === userId || u.username === username);

  const currentWarnings = user?.warningsCount || 0;
  const newWarningCount = Math.min(5, currentWarnings + 1);

  // Update user's warning count in users database
  let isSuspended = false;
  if (user) {
    user.warningsCount = newWarningCount;
    if (newWarningCount >= 5) {
      user.subscriptionStatus = 'SUSPENDED';
      isSuspended = true;
    }
    writeUsers(users);
  }

  // Record warning event for admin review
  const now = new Date();
  const datePkt = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
  const timePkt = now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const warningRecord: ModerationWarning = {
    id: `warn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    username,
    userDisplayName: user?.name || username,
    violationType,
    messageSample: rawText.substring(0, 150),
    warningNumber: newWarningCount,
    timestamp: Date.now(),
    datePkt,
    timePkt,
    acknowledgedByAdmin: false,
  };

  const allWarnings = readModerationWarnings();
  allWarnings.unshift(warningRecord);
  writeModerationWarnings(allWarnings);

  return {
    passed: false,
    violationType,
    reason: 'Your message could not be sent because it violates the Community Guidelines.',
    userWarningCount: newWarningCount,
    isSuspended,
  };
}
