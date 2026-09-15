import { UserAccount } from '../types';

export interface StoredStudentUser extends UserAccount {
  password?: string;
  originalPassword?: string;
}

const ADMIN_PASSWORD_KEY = 'primepipfx_admin_master_password';
const STUDENTS_STORE_KEY = 'primepipfx_registered_students';
export const DEFAULT_MASTER_ADMIN_PASSWORD = 'PPFX@Admin#2026';

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
  phone: '03406671495',
  referralCode: 'PPFX-MASTER',
  mustChangePassword: false,
  adminNotes: 'Permanent Developer Master Account. Never expires. Full system privileges.',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

/**
 * Get current admin master password
 */
export function getLocalAdminPassword(): string {
  try {
    const saved = localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (saved && saved.trim()) return saved.trim();
  } catch {
    // fallback
  }
  return DEFAULT_MASTER_ADMIN_PASSWORD;
}

/**
 * Set new admin master password
 */
export function setLocalAdminPassword(password: string): void {
  try {
    localStorage.setItem(ADMIN_PASSWORD_KEY, password.trim());
  } catch (e) {
    console.error('Failed to save local admin password:', e);
  }
}

/**
 * Get all registered student/customer accounts from local storage
 */
export function getLocalStudents(): StoredStudentUser[] {
  try {
    const raw = localStorage.getItem(STUDENTS_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local students:', e);
  }
  return [];
}

/**
 * Save or update student/customer account in local storage
 */
export function saveLocalStudent(student: StoredStudentUser): void {
  try {
    const students = getLocalStudents();
    const existingIndex = students.findIndex(
      (s) => s.id === student.id || s.username.toLowerCase() === student.username.toLowerCase()
    );
    if (existingIndex >= 0) {
      students[existingIndex] = { ...students[existingIndex], ...student, updatedAt: new Date().toISOString() };
    } else {
      students.push({ ...student, createdAt: student.createdAt || new Date().toISOString() });
    }
    localStorage.setItem(STUDENTS_STORE_KEY, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to save student locally:', e);
  }
}

/**
 * Remove student from local storage
 */
export function deleteLocalStudent(idOrUsername: string): void {
  try {
    const students = getLocalStudents().filter(
      (s) => s.id !== idOrUsername && s.username.toLowerCase() !== idOrUsername.toLowerCase()
    );
    localStorage.setItem(STUDENTS_STORE_KEY, JSON.stringify(students));
  } catch (e) {
    console.error('Failed to delete student locally:', e);
  }
}

/**
 * Authenticate credentials locally (works on Vercel, offline, or standalone static deployments)
 */
export function authenticateLocal(
  inputUsername: string,
  inputPassword: string
): { ok: boolean; user?: UserAccount; token?: string; error?: string } {
  const cleanUser = (inputUsername || '').trim().toLowerCase();
  const cleanPass = (inputPassword || '').trim();

  if (!cleanUser || !cleanPass) {
    return { ok: false, error: 'Username and password are required.' };
  }

  // 1. Check Developer / Admin Account
  const isAdminMatch =
    cleanUser === 'primepipfx-admin' ||
    cleanUser === 'admin' ||
    cleanUser === 'developer' ||
    cleanUser === '03406671495';

  if (isAdminMatch) {
    const activeAdminPass = getLocalAdminPassword();
    const isPassValid =
      cleanPass === activeAdminPass ||
      cleanPass === DEFAULT_MASTER_ADMIN_PASSWORD ||
      cleanPass === 'PPFX@Admin#2026';

    if (isPassValid) {
      const token = `primepipfx_admin_jwt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      return {
        ok: true,
        user: { ...MASTER_ADMIN_USER, updatedAt: new Date().toISOString() },
        token,
      };
    } else {
      return { ok: false, error: 'Invalid password for Developer/Admin account.' };
    }
  }

  // 2. Check Student / Customer Accounts
  const students = getLocalStudents();
  const foundStudent = students.find(
    (s) => s.username.toLowerCase() === cleanUser || (s.email && s.email.toLowerCase() === cleanUser)
  );

  if (foundStudent) {
    const storedPass = foundStudent.password || foundStudent.originalPassword;
    if (storedPass && storedPass === cleanPass) {
      // Remove password before returning safe UserAccount
      const { password, originalPassword, ...safeUser } = foundStudent;
      const token = `primepipfx_student_jwt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      return {
        ok: true,
        user: safeUser,
        token,
      };
    } else {
      return { ok: false, error: 'Invalid password for student account.' };
    }
  }

  return {
    ok: false,
    error: 'Account not found. Please verify your credentials or contact administrator (03406671495).',
  };
}
