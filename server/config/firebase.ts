import express from 'express';
import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

export const DEFAULT_FIRESTORE_DATABASE_ID =
  'ai-studio-koreanskinfoodbd-59297321-4843-435b-aad0-f55eda410cd4';

let firebaseConfig: Record<string, any> | null = null;
let dbInstance: Firestore | null = null;

export function resolveFirestoreDatabaseId(cfg?: Record<string, any> | null): string {
  return (
    process.env.FIRESTORE_DATABASE_ID ||
    process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    cfg?.firestoreDatabaseId ||
    DEFAULT_FIRESTORE_DATABASE_ID
  );
}

function loadFirebaseConfig(): Record<string, any> | null {
  if (firebaseConfig) return firebaseConfig;
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  try {
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return firebaseConfig;
    }
  } catch (err) {
    console.warn('[ServerFirebase] Failed to read firebase-applet-config.json:', err);
  }

  if (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID) {
    firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
      firestoreDatabaseId: resolveFirestoreDatabaseId(null),
    };
  }
  return firebaseConfig;
}

export function getServerFirebaseConfig(): Record<string, any> | null {
  return loadFirebaseConfig();
}

export function getServerDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  const cfg = loadFirebaseConfig();
  if (!cfg || !cfg.projectId) return null;
  const databaseId = resolveFirestoreDatabaseId(cfg);
  try {
    const app = getApps().length === 0 ? initializeApp(cfg) : getApp();
    try {
      dbInstance = initializeFirestore(
        app,
        { experimentalAutoDetectLongPolling: true },
        databaseId
      );
    } catch {
      dbInstance = getFirestore(app, databaseId);
    }
    return dbInstance;
  } catch (err) {
    console.error('[ServerFirebase] Failed to initialize Firestore:', err);
    return null;
  }
}

export function getIdTokenFromRequest(req?: express.Request): string | undefined {
  if (!req) return undefined;
  const cachedToken = (req as any).idToken;
  if (cachedToken) return cachedToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split('Bearer ')[1]?.trim();
  }
  return undefined;
}

export function getFirestoreRestConfig(): { projectId: string; databaseId: string; baseUrl: string } | null {
  const cfg = loadFirebaseConfig();
  if (!cfg?.projectId) return null;
  const databaseId = resolveFirestoreDatabaseId(cfg);
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${encodeURIComponent(databaseId)}/documents`;
  return { projectId: cfg.projectId, databaseId, baseUrl };
}

export function parseFirestoreValue(value: any): any {
  if (!value || typeof value !== 'object') return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return Boolean(value.booleanValue);
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    const vals = value.arrayValue?.values || [];
    return vals.map(parseFirestoreValue);
  }
  if ('mapValue' in value) {
    const fields = value.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreValue(v);
    }
    return out;
  }
  return value;
}

export function parseFirestoreDoc(docItem: any): any {
  if (!docItem) return null;
  const id = docItem.name ? docItem.name.split('/').pop() : undefined;
  const parsed: Record<string, any> = {};
  if (id) parsed.id = id;
  const fields = docItem.fields || {};
  for (const [k, v] of Object.entries(fields)) {
    parsed[k] = parseFirestoreValue(v);
  }
  return parsed;
}

export function encodeFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.filter((v) => v !== undefined).map(encodeFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function encodeFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreValue(v);
    }
  }
  return fields;
}

export async function getFirestoreDocWithToken(
  collectionName: string,
  docId: string,
  idToken?: string
): Promise<any | null> {
  const restCfg = getFirestoreRestConfig();
  if (!restCfg) return null;
  const url = `${restCfg.baseUrl}/${collectionName}/${encodeURIComponent(docId)}`;
  const headers: Record<string, string> = {};
  if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
  const response = await fetch(url, { headers });
  if (response.status === 404) return null;
  if (!response.ok) return null;
  const docJson = await response.json();
  return parseFirestoreDoc(docJson);
}

export async function getFirestoreCollectionWithToken(
  collectionName: string,
  idToken?: string
): Promise<any[]> {
  const restCfg = getFirestoreRestConfig();
  if (!restCfg) return [];
  const allDocs: any[] = [];
  let pageToken: string | undefined;

  for (let i = 0; i < 20; i++) {
    const qs = new URLSearchParams({ pageSize: '500' });
    if (pageToken) qs.set('pageToken', pageToken);
    const url = `${restCfg.baseUrl}/${collectionName}?${qs.toString()}`;
    const headers: Record<string, string> = {};
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
    const response = await fetch(url, { headers });
    if (!response.ok) break;
    const data: any = await response.json();
    const docs = Array.isArray(data.documents) ? data.documents : [];
    for (const d of docs) {
      const parsed = parseFirestoreDoc(d);
      if (parsed) allDocs.push(parsed);
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return allDocs;
}

export async function setFirestoreDocWithToken(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  idToken?: string,
  merge = true
): Promise<void> {
  const restCfg = getFirestoreRestConfig();
  if (!restCfg) {
    throw new Error('Firestore configuration is missing on server.');
  }

  const fields = encodeFirestoreFields(data);
  const fieldPaths = Object.keys(fields);
  const queryParams =
    merge && fieldPaths.length > 0
      ? `?${fieldPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&')}`
      : '';

  const url = `${restCfg.baseUrl}/${collectionName}/${encodeURIComponent(docId)}${queryParams}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const errData: any = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || response.statusText || `HTTP ${response.status}`;
    throw new Error(`Firestore write failed (${collectionName}/${docId}): ${errMsg}`);
  }
}

export async function deleteFirestoreDocWithToken(
  collectionName: string,
  docId: string,
  idToken?: string
): Promise<void> {
  const restCfg = getFirestoreRestConfig();
  if (!restCfg) {
    throw new Error('Firestore configuration is missing on server.');
  }

  const url = `${restCfg.baseUrl}/${collectionName}/${encodeURIComponent(docId)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok && response.status !== 404) {
    const errData: any = await response.json().catch(() => ({}));
    const errMsg = errData?.error?.message || response.statusText || `HTTP ${response.status}`;
    throw new Error(`Firestore delete failed (${collectionName}/${docId}): ${errMsg}`);
  }
}

export async function queryFirestoreCollectionWithToken(
  collectionName: string,
  filters: Array<{ field: string; op?: string; value: any }>,
  idToken?: string
): Promise<any[]> {
  const restCfg = getFirestoreRestConfig();
  if (!restCfg) return [];

  const url = `${restCfg.baseUrl}:runQuery`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const fieldFilters = filters.map((f) => ({
    fieldFilter: {
      field: { fieldPath: f.field },
      op: f.op || 'EQUAL',
      value: encodeFirestoreValue(f.value),
    },
  }));

  const structuredQuery: any = {
    from: [{ collectionId: collectionName }],
  };

  if (fieldFilters.length === 1) {
    structuredQuery.where = fieldFilters[0];
  } else if (fieldFilters.length > 1) {
    structuredQuery.where = {
      compositeFilter: {
        op: 'AND',
        filters: fieldFilters,
      },
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ structuredQuery }),
  });

  if (!response.ok) {
    const errData: any = await response.json().catch(() => ({}));
    if (response.status === 403) {
      throw new Error(errData?.error?.message || `Missing or insufficient permissions querying ${collectionName}.`);
    }
    return [];
  }

  const rows: any = await response.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => (r.document ? parseFirestoreDoc(r.document) : null)).filter(Boolean);
}
