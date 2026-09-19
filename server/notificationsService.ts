import fs from 'fs';
import path from 'path';

import { safeReadJsonFile, safeWriteJsonFile } from './dataPath.js';

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

export function readNotifications(): AppNotification[] {
  return safeReadJsonFile<AppNotification[]>('notifications.json', []);
}

export function writeNotifications(notifications: AppNotification[]) {
  const trim = notifications.slice(-5000);
  safeWriteJsonFile('notifications.json', trim);
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
