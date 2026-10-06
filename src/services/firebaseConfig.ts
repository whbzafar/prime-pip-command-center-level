/**
 * Firebase Firestore & Auth Configuration for PRIME PIP FX COMMAND CENTER
 * Implements resilient initialization and connection health validation.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: rawConfig.projectId,
  appId: rawConfig.appId,
  apiKey: rawConfig.apiKey,
  authDomain: rawConfig.authDomain,
  storageBucket: rawConfig.storageBucket,
  messagingSenderId: rawConfig.messagingSenderId,
  oAuthClientId: rawConfig.oAuthClientId,
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
} catch (error) {
  console.error('[Firebase] Failed to initialize Firebase app:', error);
  // Fallback instance initialization
  app = getApps().length > 0 ? getApp() : ({} as any);
  authInstance = {} as any;
  dbInstance = {} as any;
}

export const firebaseApp = app;
export const auth = authInstance;
export const db = dbInstance;
export const isFirebaseConfigured = Boolean(rawConfig.projectId && rawConfig.apiKey);

/**
 * Validates connection to Firestore server per skill requirements.
 * Tests if the client can reach Firestore online.
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  message: string;
  latencyMs: number;
}> {
  if (!isFirebaseConfigured || !dbInstance) {
    return {
      connected: false,
      message: 'Firebase configuration is incomplete or missing in environment.',
      latencyMs: 0,
    };
  }

  const start = Date.now();
  try {
    // Attempt ping document read directly from server
    await getDocFromServer(doc(dbInstance, '_system', 'connection_health'));
    const latency = Date.now() - start;
    return {
      connected: true,
      message: 'Firestore institutional database connected successfully.',
      latencyMs: latency,
    };
  } catch (error: any) {
    const latency = Date.now() - start;
    // Note: permission-denied or not-found still proves network connectivity to Firestore!
    const errCode = error?.code || '';
    if (errCode === 'permission-denied' || errCode === 'not-found') {
      return {
        connected: true,
        message: 'Firestore server reached (security rules active).',
        latencyMs: latency,
      };
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      return {
        connected: false,
        message: 'Firestore client is offline or network unreachable.',
        latencyMs: latency,
      };
    }
    return {
      connected: false,
      message: error?.message || 'Firestore connection check failed.',
      latencyMs: latency,
    };
  }
}
