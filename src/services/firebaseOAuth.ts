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

import rawConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: rawConfig.projectId || "gen-lang-client-0614685896",
  appId: rawConfig.appId || "1:1029893687203:web:45c853356df1ffb8c6fc16",
  apiKey: rawConfig.apiKey || "AIzaSyA7PXXovKilWuxQaLxvt8QSMGvAq68me_c",
  authDomain: rawConfig.authDomain || "gen-lang-client-0614685896.firebaseapp.com",
  storageBucket: rawConfig.storageBucket || "gen-lang-client-0614685896.firebasestorage.app",
  messagingSenderId: rawConfig.messagingSenderId || "1029893687203",
  oAuthClientId: rawConfig.oAuthClientId || "1029893687203-ciiijm331240ik7gcel2n488o8cnoftq.apps.googleusercontent.com",
};

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
      console.warn('Google Drive sign-in: No access token returned in credential.');
      return null;
    }
    inMemoryToken = token;
    return {
      user: result.user,
      accessToken: token,
    };
  } catch (err: any) {
    const errorCode = err?.code || '';
    if (errorCode === 'auth/popup-closed-by-user' || errorCode === 'auth/cancelled-popup-request') {
      // Benign user cancellation or closed popup window - do not log as a fatal error
      console.info('Google Drive sign-in popup was closed by the user.');
      return null;
    }
    if (errorCode === 'auth/popup-blocked') {
      console.warn('Google Drive sign-in popup was blocked by the browser.');
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
    }
    console.warn('Firebase Google Drive sign-in warning:', err?.message || err);
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
