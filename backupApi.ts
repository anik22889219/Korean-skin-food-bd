import express from "express";
import crypto from "crypto";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";

const router = express.Router();

const ALLOWED_COLLECTIONS = new Set([
  "products",
  "orders",
  "inventory_logs",
  "users",
  "wholesale_orders",
  "expenses",
  "finance_transactions"
]);

const SENSITIVE_FIELD = /(password|passwd|secret|token|api.?key|private.?key|credential|authorization|sessioncookie)/i;

function cleanForExport(value: any): any {
  if (Array.isArray(value)) return value.map(cleanForExport);
  if (value && typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value && typeof value === "object") {
    const result: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
      if (SENSITIVE_FIELD.test(key)) continue;
      result[key] = cleanForExport(child);
    }
    return result;
  }
  if (typeof value === "bigint") return value.toString();
  return value;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getAdminDb() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0633897500";
  const databaseId = process.env.FIREBASE_FIRESTORE_DATABASE_ID ||
    process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    "ai-studio-koreanskinfoodbd-59297321-4843-435b-aad0-f55eda410cd4";

  const appName = "ksf-backup-admin";
  const existing = getApps().find(app => app.name === appName);
  const adminApp = existing || initializeApp({
    credential: applicationDefault(),
    projectId
  }, appName);

  return getFirestore(adminApp, databaseId);
}

router.get("/export", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const configuredKey = process.env.BACKUP_API_KEY;
  const suppliedKey = String(req.header("x-backup-key") || "");

  if (!configuredKey || configuredKey.length < 32) {
    return res.status(503).json({ error: "Backup API is not configured. Set BACKUP_API_KEY (32+ characters)." });
  }
  if (!safeEqual(suppliedKey, configuredKey)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const collectionName = String(req.query.collection || "");
  const mode = String(req.query.mode || "full");
  const since = req.query.since ? new Date(String(req.query.since)) : null;
  const cursor = req.query.cursor ? String(req.query.cursor) : null;
  const requestedLimit = Number(req.query.limit || 300);
  const limit = Math.min(500, Math.max(1, Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 300));

  if (!ALLOWED_COLLECTIONS.has(collectionName)) {
    return res.status(400).json({ error: "Collection is not in the backup allow-list." });
  }
  if (mode !== "full" && mode !== "incremental") {
    return res.status(400).json({ error: "mode must be full or incremental." });
  }
  if (mode === "incremental" && (!since || Number.isNaN(since.getTime()))) {
    return res.status(400).json({ error: "A valid ISO since timestamp is required for incremental mode." });
  }

  try {
    const db = getAdminDb();
    let query: FirebaseFirestore.Query = db.collection(collectionName)
      .orderBy(FieldPath.documentId())
      .limit(limit);

    if (cursor) query = query.startAfter(cursor);

    const snapshot = await query.get();
    const records = snapshot.docs
      .filter(doc => mode === "full" || (doc.updateTime && doc.updateTime.toDate() > since!))
      .map(doc => ({
        id: doc.id,
        ...cleanForExport(doc.data()),
        _backupUpdatedAt: doc.updateTime?.toDate().toISOString() || null
      }));

    const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1].id : null;
    return res.json({
      records,
      nextCursor,
      hasMore: Boolean(nextCursor),
      serverTime: new Date().toISOString(),
      collection: collectionName,
      mode
    });
  } catch (error: any) {
    console.error("[KSF Backup API] Export failed:", error);
    return res.status(500).json({ error: "Backup export failed. Check server credentials and Firestore access." });
  }
});

export default router;
