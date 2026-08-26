import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeFirestore, getFirestore, connectFirestoreEmulator, setLogLevel } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';
import firebaseConfigJson from '../../firebase-applet-config.json';

// Silence benign internal gRPC idle stream disconnection notifications
try {
  setLogLevel('silent');
} catch {
  // ignore
}

const getEnvVar = (key: string): string | undefined => {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process?.env?.[key]) {
    return process.env[key];
  }
  return undefined;
};

export const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || firebaseConfigJson.apiKey,
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || firebaseConfigJson.authDomain,
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || firebaseConfigJson.projectId,
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET') || firebaseConfigJson.storageBucket,
  messagingSenderId: getEnvVar('VITE_FIREBASE_SENDER_ID') || firebaseConfigJson.messagingSenderId,
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || firebaseConfigJson.appId,
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID') || firebaseConfigJson.measurementId || "G-CGPWW8JK6V"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Analytics safely
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        console.warn('[Firebase Analytics] initialization skipped:', err);
      }
    }
  }).catch(() => {});
}

// Get custom database ID if available
const databaseId = getEnvVar('VITE_FIREBASE_FIRESTORE_DATABASE_ID') || firebaseConfigJson.firestoreDatabaseId || "ai-studio-koreanskinfoodbd-59297321-4843-435b-aad0-f55eda410cd4";

// Initialize Services using official Firestore initializer with auto-detect long polling
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, databaseId);
} catch (e) {
  try {
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch (err) {
    db = getFirestore(app, databaseId);
  }
}

const auth = getAuth(app);
const functions = getFunctions(app);

// Connect to Emulators ONLY if explicitly configured to use them
if (getEnvVar('VITE_USE_FIREBASE_EMULATOR') === 'true') {
  try {
    // Check if the user is running emulators on standard ports
    // We wrap in a try-catch to prevent crash if not running
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('[Firebase] Connected to Firestore emulator on port 8080');
  } catch (err) {
    console.warn('[Firebase] Failed to connect to Firestore emulator:', err);
  }

  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    console.log('[Firebase] Connected to Auth emulator on port 9099');
  } catch (err) {
    console.warn('[Firebase] Failed to connect to Auth emulator:', err);
  }

  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('[Firebase] Connected to Functions emulator on port 5001');
  } catch (err) {
    console.warn('[Firebase] Failed to connect to Functions emulator:', err);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow = true) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  if (shouldThrow) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  } else {
    console.warn('Firestore Permission Warning (handled gracefully):', errInfo.error, 'for path:', path);
  }
}

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        cleanObj[key] = sanitizeForFirestore(value);
      } else {
        cleanObj[key] = value;
      }
    }
  }
  return cleanObj as T;
}

export { app, db, auth, functions, analytics };
