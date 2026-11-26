import express from 'express';
import crypto from 'crypto';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getServerDb } from '../../config/firebase';
import { resolveSiteBaseUrl } from '../../config/env';
import { publicFormRateLimiter } from '../../middleware/rateLimiter';
import { logger } from '../../utils/logger';

const router = express.Router();

const CONFIRMATION_CODE_REGEX = /^ksf-del-[a-f0-9]{16}$/i;

function decodeBase64UrlToBuffer(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLength), 'base64');
}

function parseAndVerifySignedRequest(
  signedRequest: string,
  appSecret: string
): { user_id: string; algorithm?: string; issued_at?: number } {
  const parts = String(signedRequest || '').trim().split('.');
  if (parts.length !== 2) {
    throw new Error('Malformed signed_request format');
  }

  const [encodedSig, payload] = parts;
  if (!encodedSig || !payload) {
    throw new Error('Missing signature or payload in signed_request');
  }

  const expectedSig = crypto.createHmac('sha256', appSecret).update(payload).digest();
  const receivedSig = decodeBase64UrlToBuffer(encodedSig);

  if (
    expectedSig.length !== receivedSig.length ||
    !crypto.timingSafeEqual(expectedSig, receivedSig)
  ) {
    throw new Error('Invalid signed_request signature');
  }

  const decodedJson = decodeBase64UrlToBuffer(payload).toString('utf8');
  const parsed = JSON.parse(decodedJson);

  if (
    parsed.algorithm &&
    String(parsed.algorithm).toUpperCase() !== 'HMAC-SHA256'
  ) {
    throw new Error('Unsupported signed_request algorithm');
  }

  if (!parsed.user_id) {
    throw new Error('Missing user_id in signed_request payload');
  }

  return parsed;
}

/**
 * Meta / Facebook Automated Data Deletion Callback Endpoint
 * Receives POST with x-www-form-urlencoded `signed_request` (or JSON fallback)
 * Verifies HMAC-SHA256 signature with FACEBOOK_APP_SECRET and returns { url, confirmation_code }.
 */
router.post('/api/facebook/data-deletion', publicFormRateLimiter, async (req, res) => {
  try {
    const appSecret = (
      process.env.FACEBOOK_APP_SECRET ||
      process.env.META_APP_SECRET ||
      ''
    ).trim();

    if (!appSecret) {
      logger.warn('facebook-deletion', 'FACEBOOK_APP_SECRET is not configured');
      return res.status(503).json({
        error: 'FACEBOOK_APP_SECRET is not configured on the server.',
      });
    }

    const signedRequest =
      typeof req.body?.signed_request === 'string' ? req.body.signed_request.trim() : '';

    if (!signedRequest) {
      return res.status(400).json({ error: 'Missing signed_request parameter' });
    }

    let verifiedPayload: { user_id: string; algorithm?: string; issued_at?: number };
    try {
      verifiedPayload = parseAndVerifySignedRequest(signedRequest, appSecret);
    } catch (err: any) {
      logger.warn('facebook-deletion', 'Signature verification failed', {
        message: err?.message,
      });
      return res.status(403).json({ error: 'Invalid signed_request signature' });
    }

    const confirmationCode = `ksf-del-${crypto.randomBytes(8).toString('hex')}`;
    const facebookUserIdHash = crypto
      .createHash('sha256')
      .update(String(verifiedPayload.user_id))
      .digest('hex');

    const nowIso = new Date().toISOString();
    const db = getServerDb();

    if (db) {
      await setDoc(doc(db, 'data_deletion_requests', confirmationCode), {
        confirmationCode,
        facebookUserIdHash,
        status: 'pending',
        source: 'facebook_callback',
        requestedAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const siteBase = resolveSiteBaseUrl(req);
    const statusUrl = `${siteBase}/data-deletion?code=${encodeURIComponent(confirmationCode)}`;

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(
      JSON.stringify({
        url: statusUrl,
        confirmation_code: confirmationCode,
      })
    );
  } catch (err: any) {
    logger.error('facebook-deletion', 'Unexpected callback error', {
      message: err?.message,
    });
    return res.status(500).json({ error: 'Failed to process data deletion callback' });
  }
});

/**
 * Public non-PII status lookup endpoint for /data-deletion?code=...
 */
router.get('/api/facebook/data-deletion/status', publicFormRateLimiter, async (req, res) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code.trim() : '';
    if (!code || !CONFIRMATION_CODE_REGEX.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid confirmation code format.',
      });
    }

    const db = getServerDb();
    if (!db) {
      return res.status(503).json({
        success: false,
        error: 'Database service unavailable.',
      });
    }

    const snap = await getDoc(doc(db, 'data_deletion_requests', code));
    if (!snap.exists()) {
      return res.status(404).json({
        success: false,
        error: 'No data deletion request found for this confirmation code.',
      });
    }

    const data = snap.data() as Record<string, any>;
    return res.json({
      success: true,
      confirmationCode: data.confirmationCode || code,
      status: data.status || 'pending',
      source: data.source || 'facebook_callback',
      requestedAt: data.requestedAt || null,
      updatedAt: data.updatedAt || null,
    });
  } catch (err: any) {
    logger.warn('facebook-deletion', 'Status lookup error', { message: err?.message });
    return res.status(500).json({
      success: false,
      error: 'Unable to retrieve deletion status.',
    });
  }
});

export default router;
