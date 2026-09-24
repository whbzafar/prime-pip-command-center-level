import { UserAccount } from '../types';

export interface StoredStudentUser extends UserAccount {
  // Deprecated fields kept only for backwards-compatible typing. They are never persisted or returned.
  password?: never;
  originalPassword?: never;
  showActiveStatus?: boolean;
}

const STUDENTS_STORE_KEY = 'primepipfx_registered_students';
const CLOUD_KV_ENDPOINT = 'https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU/primepipfx_students_v1';

// Kept as an empty compatibility export. Credentials are server-managed.
export const DEFAULT_MASTER_ADMIN_PASSWORD = '';

export const MASTER_ADMIN_USER: UserAccount = {
  id: 'dev-owner-master',
  name: 'PrimePipFX Developer / Owner',
  username: 'primepipfx-admin',
  role: 'ADMIN',
  subscriptionStatus: 'LIFETIME',
  subscriptionPrice: 0,
  startDate: '2026-01-01',
  expiryDate: '2099-12-31',
  isLifetime: true,
  paymentStatus: 'VERIFIED',
  isDeveloper: true,
  referralCode: 'PPFX-MASTER',
  mustChangePassword: false,
  adminNotes: 'Permanent Developer Master Account. Credentials are managed server-side.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

const inMemoryFallback = new Map<string, string>();

function safeStorageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}
  return inMemoryFallback.get(key) || null;
}

function safeStorageSet(key: string, val: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, val);
    }
  } catch {}
  inMemoryFallback.set(key, val);
}

export function getLocalAdminPassword(): string {
  // Passwords never live in browser storage.
  return '';
}

export function setLocalAdminPassword(_password: string): void {
  // Password changes are handled by the authenticated server endpoint.
}

function stripCredentials(student: any): StoredStudentUser {
  if (!student || typeof student !== 'object') return student;
  const { password: _password, originalPassword: _originalPassword, ...safeStudent } = student;
  return safeStudent as StoredStudentUser;
}

export function getLocalStudents(): StoredStudentUser[] {
  try {
    const raw = safeStorageGet(STUDENTS_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((student) => !!student && typeof student === 'object' && typeof student.username === 'string')
      .map(stripCredentials);
  } catch {
    return [];
  }
}

export function saveLocalStudent(student: StoredStudentUser): void {
  try {
    const safeStudent = stripCredentials(student);
    const students = getLocalStudents();
    const index = students.findIndex(
      (s) => s.id === safeStudent.id || s.username.toLowerCase() === safeStudent.username.toLowerCase()
    );

    if (index >= 0) {
      students[index] = {
        ...students[index],
        ...safeStudent,
        updatedAt: new Date().toISOString(),
      };
    } else {
      students.push({
        ...safeStudent,
        createdAt: safeStudent.createdAt || new Date().toISOString(),
      });
    }

    safeStorageSet(STUDENTS_STORE_KEY, JSON.stringify(students));
    syncStudentsToCloud().catch(() => {});
  } catch {}
}

export function deleteLocalStudent(idOrUsername: string): void {
  try {
    const students = getLocalStudents().filter(
      (s) => s.id !== idOrUsername && s.username.toLowerCase() !== idOrUsername.toLowerCase()
    );
    safeStorageSet(STUDENTS_STORE_KEY, JSON.stringify(students));
    syncStudentsToCloud().catch(() => {});
  } catch {}
}

export async function syncStudentsToCloud(): Promise<boolean> {
  try {
    const safeStudents = getLocalStudents().map(stripCredentials);
    const res = await fetch(CLOUD_KV_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeStudents),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncStudentsFromCloud(): Promise<StoredStudentUser[]> {
  try {
    const res = await fetch(CLOUD_KV_ENDPOINT, { cache: 'no-store' });
    if (res.ok) {
      const raw = await res.json();
      if (Array.isArray(raw)) {
        const cloudStudents = raw.map(stripCredentials);
        const local = getLocalStudents();
        const merged = new Map<string, StoredStudentUser>();

        for (const student of local) {
          if (student?.username) merged.set(student.username.toLowerCase(), student);
        }
        for (const student of cloudStudents) {
          if (student?.username) {
            const key = student.username.toLowerCase();
            const existing = merged.get(key);
            if (!existing || (student.updatedAt && new Date(student.updatedAt) > new Date(existing.updatedAt || 0))) {
              merged.set(key, student);
            }
          }
        }

        const mergedList = Array.from(merged.values()).map(stripCredentials);
        safeStorageSet(STUDENTS_STORE_KEY, JSON.stringify(mergedList));
        return mergedList;
      }
    }
  } catch {}
  return getLocalStudents();
}

// Deliberately disabled: the browser must never authenticate users from locally stored credentials.
export function authenticateLocal(
  _inputUsername: string,
  _inputPassword: string
): { ok: boolean; user?: UserAccount; token?: string; error?: string } {
  return {
    ok: false,
    error: 'Client-side authentication is disabled. Please use the secure server login endpoint.',
  };
}

export async function authenticateLocalAsync(
  _inputUsername: string,
  _inputPassword: string
): Promise<{ ok: boolean; user?: UserAccount; token?: string; error?: string }> {
  return authenticateLocal(_inputUsername, _inputPassword);
}
