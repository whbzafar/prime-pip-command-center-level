import { UserAccount, SubscriptionStatus } from '../types';
import {
  authenticateLocal,
  setLocalAdminPassword,
  saveLocalStudent,
  getLocalStudents,
} from './localAuthStore';

const TOKEN_KEY = 'primepipfx_auth_token';
const USER_KEY = 'primepipfx_user_profile';
const REFERRAL_KEY = 'primepipfx_applied_referral';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Error saving token:', err);
  }
}

export function getStoredUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserAccount | null) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (err) {
    console.error('Error saving user:', err);
  }
}

export function getStoredReferral(): string | null {
  try {
    return localStorage.getItem(REFERRAL_KEY);
  } catch {
    return null;
  }
}

export function setStoredReferral(code: string | null) {
  try {
    if (code) {
      localStorage.setItem(REFERRAL_KEY, code.toUpperCase().trim());
    } else {
      localStorage.removeItem(REFERRAL_KEY);
    }
  } catch (err) {
    console.error('Error saving referral:', err);
  }
}

// Check URL for referral parameter (?ref=PPFX123 or ?referral=PPFX123)
export function detectUrlReferral(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref && ref.trim()) {
      const clean = ref.trim().toUpperCase();
      setStoredReferral(clean);
      return clean;
    }
  } catch (err) {
    console.warn('Could not read URL params:', err);
  }
  return getStoredReferral();
}

// Check if user has active/valid full access
export function hasFullAccess(user: UserAccount | null): boolean {
  if (!user) return false;
  if (user.isDeveloper || user.role === 'ADMIN' || user.role === 'DEVELOPER' || user.username === 'primepipfx-admin') return true;
  if (user.subscriptionStatus === 'LIFETIME' || user.isLifetime) return true;
  if (user.subscriptionStatus === 'ACTIVE') {
    if (!user.expiryDate) return true;
    const exp = new Date(user.expiryDate).getTime();
    return exp >= Date.now();
  }
  return false;
}

// Check if user has developer/admin privileges
export function isUserAdmin(user?: UserAccount | null): boolean {
  if (!user) return false;
  return (
    user.role === 'ADMIN' ||
    user.role === 'DEVELOPER' ||
    Boolean(user.isDeveloper) ||
    user.username === 'primepipfx-admin'
  );
}

export const isAdminUser = isUserAdmin;

// API client calls
export async function apiLogin(
  username: string,
  password: string,
  rememberMe: boolean = true
): Promise<{ ok: boolean; user?: UserAccount; token?: string; error?: string }> {
  const cleanUsername = (username || '').trim();
  const cleanPassword = (password || '').trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username: cleanUsername, password: cleanPassword, rememberMe }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (res.ok && data.ok && data.user) {
        if (data.token) {
          setStoredToken(data.token);
        }
        setStoredUser(data.user);
        return { ok: true, user: data.user, token: data.token };
      }
      
      // If server returned an authentication error, also check local store before failing
      // (in case the student account was created locally on Vercel)
      const localResult = authenticateLocal(cleanUsername, cleanPassword);
      if (localResult.ok && localResult.user) {
        if (localResult.token) setStoredToken(localResult.token);
        setStoredUser(localResult.user);
        return localResult;
      }

      return { ok: false, error: data.error || 'Login failed' };
    }
  } catch (err: any) {
    console.warn('[AUTH CLIENT] Server endpoint unavailable or network error, attempting local authentication:', err);
  }

  // If server response is not JSON (e.g. 404 HTML on Vercel deployment) or server is unreachable:
  const localAuth = authenticateLocal(cleanUsername, cleanPassword);
  if (localAuth.ok && localAuth.user) {
    if (localAuth.token) setStoredToken(localAuth.token);
    setStoredUser(localAuth.user);
    return localAuth;
  }
  return { ok: false, error: localAuth.error || 'Invalid credentials.' };
}

export async function apiGetCurrentUser(): Promise<UserAccount | null> {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch('/api/auth/me', {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      if (res.status === 401) {
        setStoredToken(null);
        setStoredUser(null);
        return null;
      }
      return getStoredUser();
    }

    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.ok && data.user) {
        setStoredUser(data.user);
        return data.user;
      }
    }
    return getStoredUser();
  } catch (err) {
    // Offline / temporary network loss: return cached user so Admin is never prematurely logged out
    console.warn('[AUTH CLIENT] Network offline, using cached credentials:', err);
    return getStoredUser();
  }
}

export async function apiLogout(): Promise<void> {
  const token = getStoredToken();
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
  } catch {
    // ignore
  }
  setStoredToken(null);
  setStoredUser(null);
}

export const getCurrentUser = getStoredUser;
export const getAuthToken = getStoredToken;
export const logoutUser = apiLogout;
export const verifyCurrentSession = apiGetCurrentUser;

export async function apiChangePassword(newPassword: string): Promise<{ ok: boolean; error?: string; token?: string; user?: UserAccount }> {
  const token = getStoredToken();
  const currentUser = getStoredUser();

  // Save to local store so password updates are immediately persistent on Vercel
  if (currentUser?.role === 'ADMIN' || currentUser?.isDeveloper || currentUser?.username === 'primepipfx-admin') {
    setLocalAdminPassword(newPassword);
  } else if (currentUser) {
    saveLocalStudent({
      ...currentUser,
      password: newPassword,
      mustChangePassword: false,
    });
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ newPassword }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (data.ok) {
        if (data.token) setStoredToken(data.token);
        if (data.user) setStoredUser(data.user);
      }
      return data;
    }
  } catch (err: any) {
    console.warn('[AUTH CLIENT] Server change password endpoint unavailable, persisted locally:', err);
  }

  // Fallback for Vercel static environments
  if (currentUser) {
    const updatedUser = { ...currentUser, mustChangePassword: false, updatedAt: new Date().toISOString() };
    setStoredUser(updatedUser);
    return { ok: true, user: updatedUser, token: token || `token_${Date.now()}` };
  }

  return { ok: true };
}

export async function apiCheckReferral(code: string): Promise<{ valid: boolean; referrerName?: string; price: number }> {
  try {
    const res = await fetch(`/api/referral/check/${encodeURIComponent(code)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Referral check failed:', err);
  }
  return { valid: false, price: 50 };
}
