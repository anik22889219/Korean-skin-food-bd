import express from 'express';
import { doc, getDoc } from 'firebase/firestore';
import {
  getServerDb,
  getServerFirebaseConfig,
  getFirestoreDocWithToken,
} from '../config/firebase';
import { getGeminiApiKey } from '../config/env';

const SUPER_ADMIN_EMAILS = new Set(['koreanskinfood.bd@gmail.com', 'admin@koreanskinfood.bd']);
const STAFF_ROLES = ['admin', 'super_admin', 'inventory_manager', 'hr', 'customer_support'];
const FINANCE_ROLES = ['admin', 'super_admin'];
const WHOLESALE_STAFF_ROLES = ['admin', 'super_admin', 'inventory_manager', 'hr'];

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email?: string; emailVerified?: boolean } | null> {
  if (!idToken) return null;

  const cfg = getServerFirebaseConfig();
  const apiKey =
    (process.env.VITE_FIREBASE_API_KEY || '').trim() ||
    (cfg?.apiKey ? String(cfg.apiKey).trim() : '') ||
    getGeminiApiKey();

  if (!apiKey) {
    console.error('[Auth] Firebase API Key is missing for server token verification.');
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();
    if (Array.isArray(data.users) && data.users.length > 0) {
      return {
        uid: data.users[0].localId,
        email: data.users[0].email,
        emailVerified: Boolean(data.users[0].emailVerified),
      };
    }
    return null;
  } catch (err) {
    console.error('[Auth] Error verifying Firebase ID token:', err);
    return null;
  }
}

export function isVerifiedSuperAdmin(user: { email?: string; emailVerified?: boolean } | null): boolean {
  if (!user || !user.email || user.emailVerified !== true) return false;
  return SUPER_ADMIN_EMAILS.has(user.email.toLowerCase());
}

async function resolveUserDoc(uid: string, idToken: string): Promise<Record<string, any> | null> {
  const viaToken = await getFirestoreDocWithToken('users', uid, idToken);
  if (viaToken) return viaToken;
  const db = getServerDb();
  if (db) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) return snap.data();
    } catch {
      // ignore fallback read errors
    }
  }
  return null;
}

export async function verifyAdminAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing or malformed Authorization header with Bearer token.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Empty Bearer token provided.',
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser || !verifiedUser.uid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired Firebase ID token. Please authenticate again.',
    });
  }

  (req as any).idToken = idToken;

  if (isVerifiedSuperAdmin(verifiedUser)) {
    (req as any).user = {
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: 'super_admin',
      emailVerified: true,
      isStaff: true,
    };
    return next();
  }

  const userDoc = await resolveUserDoc(verifiedUser.uid, idToken);
  const userRole = userDoc?.role || null;

  if (userRole && STAFF_ROLES.includes(userRole)) {
    (req as any).user = {
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: userRole,
      emailVerified: Boolean(verifiedUser.emailVerified),
      isStaff: true,
    };
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access Denied. Insufficient permissions. Verified staff or admin account required.',
  });
}

export async function verifyFinanceAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Empty Bearer token provided.',
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser || !verifiedUser.uid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired Firebase ID token.',
    });
  }

  (req as any).idToken = idToken;

  if (isVerifiedSuperAdmin(verifiedUser)) {
    (req as any).user = {
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: 'super_admin',
      emailVerified: true,
      isStaff: true,
    };
    return next();
  }

  const userDoc = await resolveUserDoc(verifiedUser.uid, idToken);
  const userRole = userDoc?.role || null;

  if (userRole && FINANCE_ROLES.includes(userRole)) {
    (req as any).user = {
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: userRole,
      emailVerified: Boolean(verifiedUser.emailVerified),
      isStaff: true,
    };
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access Denied. Executive Financial Authority (Super Admin or Store Admin) required.',
  });
}

export async function verifyUserOrStaffAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Empty Bearer token provided.',
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser || !verifiedUser.uid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired Firebase ID token.',
    });
  }

  (req as any).idToken = idToken;
  const userDoc = await resolveUserDoc(verifiedUser.uid, idToken);
  const userRole = isVerifiedSuperAdmin(verifiedUser)
    ? 'super_admin'
    : userDoc?.role || 'customer';

  (req as any).user = {
    uid: verifiedUser.uid,
    email: verifiedUser.email,
    emailVerified: Boolean(verifiedUser.emailVerified),
    role: userRole,
    isStaff: isVerifiedSuperAdmin(verifiedUser) || STAFF_ROLES.includes(userRole),
  };
  return next();
}

export async function verifyOptionalAuth(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1]?.trim();
    if (idToken) {
      const verifiedUser = await verifyFirebaseIdToken(idToken);
      if (verifiedUser?.uid) {
        (req as any).idToken = idToken;
        (req as any).user = verifiedUser;
      }
    }
  }
  return next();
}

export async function verifyStaffOrWholesaleAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Bearer token required for wholesale ledger.',
    });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();
  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Empty Bearer token provided.',
    });
  }

  const verifiedUser = await verifyFirebaseIdToken(idToken);
  if (!verifiedUser || !verifiedUser.uid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired Firebase credentials.',
    });
  }

  (req as any).idToken = idToken;

  if (isVerifiedSuperAdmin(verifiedUser)) {
    (req as any).user = {
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role: 'super_admin',
      emailVerified: true,
      isStaff: true,
    };
    return next();
  }

  const userDoc = await resolveUserDoc(verifiedUser.uid, idToken);
  const userRole = userDoc?.role || 'customer';
  const isStaff = WHOLESALE_STAFF_ROLES.includes(userRole);
  const requestedTargetId = (req.params?.wholesaleCustomerId ||
    req.body?.wholesaleCustomerId ||
    req.body?.userId ||
    req.query?.wholesaleCustomerId) as string;

  (req as any).user = {
    uid: verifiedUser.uid,
    email: verifiedUser.email,
    role: userRole,
    emailVerified: Boolean(verifiedUser.emailVerified),
    isStaff,
  };

  if (isStaff) {
    return next();
  }

  if (requestedTargetId && requestedTargetId !== verifiedUser.uid) {
    try {
      let custUserId: string | null = null;
      const custDoc = await getFirestoreDocWithToken('wholesale_customers', requestedTargetId, idToken);
      if (custDoc) {
        custUserId = custDoc.userId || null;
      } else {
        const db = getServerDb();
        if (db) {
          const snap = await getDoc(doc(db, 'wholesale_customers', requestedTargetId));
          if (snap.exists()) custUserId = snap.data()?.userId || null;
        }
      }
      if (custUserId !== verifiedUser.uid) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied. You may only access your own wholesale ledger and orders.',
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        error: 'Access Denied verifying wholesale account ownership.',
      });
    }
  }

  return next();
}
