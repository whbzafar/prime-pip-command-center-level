/**
 * Firebase Authentication & Google Drive OAuth Helper
 * Uses Firebase SDK with GoogleAuthProvider to seamlessly authorize Google Drive
 * in compliance with Google AI Studio Workspace Integration standards.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

// Fallback config if JSON file not directly resolvable
let firebaseConfig: any = {
  apiKey: "AIzaSyA7PXXovKilWuxQaLxvt8QSMGvAq68me_c",
  authDomain: "gen-lang-client-0614685896.firebaseapp.com",
  projectId: "gen-lang-client-0614685896",
  storageBucket: "gen-lang-client-0614685896.firebasestorage.app",
  messagingSenderId: "1029893687203",
  appId: "1:1029893687203:web:45c853356df1ffb8c6fc16",
  oAuthClientId: "1029893687203-ciiijm331240ik7gcel2n488o8cnoftq.apps.googleusercontent.com",
};

try {
  // Dynamically import or require if available
  const rawConfig = await import('../../firebase-applet-config.json');
  if (rawConfig && rawConfig.apiKey) {
    firebaseConfig = rawConfig.default || rawConfig;
  }
} catch {
  // Use initialized fallback
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const driveProvider = new GoogleAuthProvider();
driveProvider.addScope('https://www.googleapis.com/auth/drive.file');
driveProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
driveProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
driveProvider.setCustomParameters({
  prompt: 'select_account',
});

let inMemoryToken: string | null = null;

export async function signInWithGoogleForDrive(): Promise<{ user: User; accessToken: string } | null> {
  try {
    const result = await signInWithPopup(auth, driveProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;
    if (!token) {
      throw new Error('Google did not return an access token for Drive.');
    }
    inMemoryToken = token;
    return {
      user: result.user,
      accessToken: token,
    };
  } catch (err: any) {
    console.error('Firebase Google Drive sign-in error:', err);
    throw err;
  }
}

export async function signOutGoogleUser(): Promise<void> {
  inMemoryToken = null;
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Error signing out Firebase user:', err);
  }
}

export function getCachedDriveToken(): string | null {
  return inMemoryToken;
}

export function setCachedDriveToken(token: string | null): void {
  inMemoryToken = token;
}

export { firebaseConfig };
