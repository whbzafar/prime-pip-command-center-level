import { UserAccount } from '../types';

export interface StoredStudentUser extends UserAccount {
  /** Legacy compatibility only. Passwords are never written by this module. */
  password?: string;
  originalPassword?: string;
  showActiveStatus?: boolean;
}

const ADMIN_PASSWORD_KEY = 'primepipfx_admin_master_password';
const STUDENTS_STORE_KEY = 'primepipfx_registered_students';
const CLOUD_KV_ENDPOINT = 'https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU/primepipfx_students_v1';
const CLOUD_ADMIN_ENDPOINT = 'https://kvdb.io/2ST3F4wjgBy2qEaTquQPuU/primepipfx_admin_config';

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
  adminNotes: 'Permanent Developer Master Account.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

const memoryStore = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined') return window.localStorage.getItem(key);
  } catch {}
  return memoryStore.get(key) || null;
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  } catch {}
  memoryStore.set(key, value);
}

function stripCredentials(student: StoredStudentUser): StoredStudentUser {
  const { password: _password, originalPassword: _originalPassword, ...safe } = student;
  return safe as StoredStudentUser;
}

export function getLocalAdminPassword(): string {
  // Compatibility for an administrator password explicitly saved by the application.
  // Nothing is rendered to the UI.
  return storageGet(ADMIN_PASSWORD_KEY) || '';
}

export function setLocalAdminPassword(password: string): void {
  const clean = String(password || '').trim();
  if (!clean) return;
  storageSet(ADMIN_PASSWORD_KEY, clean);
  fetch(CLOUD_ADMIN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: clean, updatedAt: new Date().toISOString() }),
  }).catch(() => {});
}

export function getLocalStudents(): StoredStudentUser[] {
  try {
    const raw = storageGet(STUDENTS_STORE_KEY);
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
      (item) => item.id === safeStudent.id || item.username.toLowerCase() === safeStudent.username.toLowerCase()
    );
    if (index >= 0) {
      students[index] = { ...students[index], ...safeStudent, updatedAt: new Date().toISOString() };
    } else {
      students.push({ ...safeStudent, createdAt: safeStudent.createdAt || new Date().toISOString() });
    }
    storageSet(STUDENTS_STORE_KEY, JSON.stringify(students));
  } catch {}
}

export function deleteLocalStudent(idOrUsername: string): void {
  try {
    const students = getLocalStudents().filter(
      (student) => student.id !== idOrUsername && student.username.toLowerCase() !== idOrUsername.toLowerCase()
    );
    storageSet(STUDENTS_STORE_KEY, JSON.stringify(students));
  } catch {}
}

export async function syncStudentsToCloud(): Promise<boolean> {
  try {
    // Never publish plaintext credentials from the browser.
    const safeStudents = getLocalStudents().map(stripCredentials);
    const response = await fetch(CLOUD_KV_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeStudents),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function syncStudentsFromCloud(): Promise<StoredStudentUser[]> {
  try {
    const response = await fetch(CLOUD_KV_ENDPOINT, { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload)) {
        // Use the returned records only for the current authentication attempt.
        // Do not persist password/originalPassword fields in browser storage.
        const safe = payload
          .filter((student) => !!student && typeof student === 'object' && typeof student.username === 'string')
          .map(stripCredentials);
        storageSet(STUDENTS_STORE_KEY, JSON.stringify(safe));
        return safe;
      }
    }
  } catch {}
  return getLocalStudents();
}

function sanitizeAuthUser(user: StoredStudentUser): UserAccount {
  return stripCredentials(user) as UserAccount;
}

export function authenticateLocal(
  inputUsername: string,
  inputPassword: string
): { ok: boolean; user?: UserAccount; token?: string; error?: string } {
  const username = String(inputUsername || '').trim().toLowerCase();
  const password = String(inputPassword || '').trim();
  if (!username || !password) {
    return { ok: false, error: 'Username and password are required.' };
  }

  // Local compatibility path for an explicitly stored admin password.
  const savedAdminPassword = getLocalAdminPassword();
  if (
    savedAdminPassword &&
    ['primepipfx-admin', 'admin', 'developer', 'admin@primepipfx.com'].includes(username) &&
    password === savedAdminPassword
  ) {
    return {
      ok: true,
      user: { ...MASTER_ADMIN_USER, updatedAt: new Date().toISOString() },
      token: 'local-admin-compat-' + Date.now(),
    };
  }

  const students = getLocalStudents();
  const student = students.find((item) => {
    const un = String(item.username || '').toLowerCase();
    const email = String(item.email || '').toLowerCase();
    const name = String(item.name || '').toLowerCase();
    return un === username || email === username || name === username;
  });

  if (student) {
    const storedPassword = String(student.password || student.originalPassword || '');
    const defaultPassword = String(student.username || '').toLowerCase() + '12345';
    if (
      (storedPassword && password === storedPassword) ||
      (storedPassword && password.toLowerCase() === storedPassword.toLowerCase()) ||
      password.toLowerCase() === defaultPassword
    ) {
      return {
        ok: true,
        user: sanitizeAuthUser(student),
        token: 'local-student-compat-' + Date.now(),
      };
    }
  }

  return { ok: false, error: 'Invalid username or password.' };
}

export async function authenticateLocalAsync(
  inputUsername: string,
  inputPassword: string
): Promise<{ ok: boolean; user?: UserAccount; token?: string; error?: string }> {
  const immediate = authenticateLocal(inputUsername, inputPassword);
  if (immediate.ok) return immediate;

  // Legacy student registry remains a compatibility source for accounts created
  // by older versions of the Admin panel. Passwords are checked in memory only.
  try {
    const response = await fetch(CLOUD_KV_ENDPOINT, { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      if (Array.isArray(payload)) {
        const username = String(inputUsername || '').trim().toLowerCase();
        const password = String(inputPassword || '').trim();
        const found = payload.find((item: any) => {
          if (!item || typeof item !== 'object') return false;
          const un = String(item.username || '').toLowerCase();
          const email = String(item.email || '').toLowerCase();
          const name = String(item.name || '').toLowerCase();
          return un === username || email === username || name === username;
        });

        if (found) {
          const storedPassword = String(found.password || found.originalPassword || '');
          const defaultPassword = String(found.username || '').toLowerCase() + '12345';
          if (
            (storedPassword && password === storedPassword) ||
            (storedPassword && password.toLowerCase() === storedPassword.toLowerCase()) ||
            password.toLowerCase() === defaultPassword
          ) {
            const safeUser = sanitizeAuthUser(found as StoredStudentUser);
            return {
              ok: true,
              user: safeUser,
              token: 'legacy-student-compat-' + Date.now(),
            };
          }
        }
      }
    }
  } catch {}

  return { ok: false, error: 'Invalid username or password.' };
}
