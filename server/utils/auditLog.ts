import { doc, setDoc } from 'firebase/firestore';
import { getServerDb, setFirestoreDocWithToken } from '../config/firebase';
import { logger } from './logger';
import { stripUndefinedFields } from './validators';

export interface AuditLogInput {
  action: string;
  entityType: string;
  entityId: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole?: string;
  details?: Record<string, any>;
}

export async function writeAuditLog(input: AuditLogInput, idToken?: string): Promise<void> {
  const db = getServerDb();
  const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entry = stripUndefinedFields({
    id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUid: input.actorUid || 'system',
    actorEmail: input.actorEmail || '',
    actorRole: input.actorRole || 'system',
    details: input.details || {},
    createdAt: new Date().toISOString(),
  });

  logger.info('audit', `${input.action} on ${input.entityType}:${input.entityId}`, {
    actorRole: input.actorRole,
    entityType: input.entityType,
    entityId: input.entityId,
  });

  try {
    if (idToken) {
      await setFirestoreDocWithToken('audit_logs', id, entry, idToken, false);
      return;
    }
    if (!db) return;
    await setDoc(doc(db, 'audit_logs', id), entry);
  } catch (err: any) {
    logger.warn('audit', 'Failed to persist audit_logs document', { error: err?.message });
  }
}
