import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

export interface AppNotification {
  id: string;
  userId: string; // The recipient
  type: 'MENTION' | 'FRIEND_REQUEST' | 'FRIEND_ACCEPT' | 'MESSAGE' | 'SYSTEM';
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  timestamp: number;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readNotifications(): AppNotification[] {
  try {
    if (!fs.existsSync(NOTIFICATIONS_FILE)) return [];
    const data = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8');
    return JSON.parse(data) || [];
  } catch {
    return [];
  }
}

export function writeNotifications(notifications: AppNotification[]) {
  ensureDataDir();
  // Keep last 1000 notifications maybe, or clean old ones
  const trim = notifications.slice(-5000);
  fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(trim, null, 2), 'utf8');
}

export function createNotification(n: Omit<AppNotification, 'id' | 'isRead' | 'timestamp'>) {
  const notifs = readNotifications();
  const newNotif: AppNotification = {
    ...n,
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
    isRead: false,
    timestamp: Date.now()
  };
  notifs.push(newNotif);
  writeNotifications(notifs);
  return newNotif;
}

export function getNotificationsForUser(userId: string): AppNotification[] {
  return readNotifications().filter(n => n.userId === userId).sort((a,b) => b.timestamp - a.timestamp);
}

export function markNotificationsRead(userId: string, notifIds?: string[]) {
  const notifs = readNotifications();
  let changed = false;
  for (const n of notifs) {
    if (n.userId === userId && !n.isRead) {
      if (!notifIds || notifIds.includes(n.id)) {
        n.isRead = true;
        changed = true;
      }
    }
  }
  if (changed) writeNotifications(notifs);
}
