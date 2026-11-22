import { collection, doc, getDocs, query, runTransaction, where } from 'firebase/firestore';
import {
  getFirestoreDocWithToken,
  getServerDb,
  queryFirestoreCollectionWithToken,
  setFirestoreDocWithToken,
} from '../../config/firebase';
import { writeAuditLog } from '../../utils/auditLog';
import { logger } from '../../utils/logger';

export interface LoyaltyLedgerEntry {
  id: string;
  userId: string;
  orderId?: string;
  type: 'EARN' | 'ORDER_EARN' | 'REDEMPTION' | 'ADJUSTMENT' | 'ADMIN_ADJUSTMENT' | 'REFUND_REVERSAL';
  pointsDelta: number;
  balanceAfter?: number;
  description: string;
  actor: string;
  createdAt: string;
}

/**
 * Awards loyalty points strictly ONCE when an order reaches 'delivered' status.
 * Uses loyalty_ledger/earn-{orderId} as the idempotent lock document.
 * Earning rate: 1 point per 10 BDT paid/ordered (consistent with CartContext & Profile).
 */
export async function awardDeliveredOrderLoyaltyPoints(
  orderId: string,
  actor = 'system',
  idToken?: string
): Promise<{ awarded: boolean; points: number; userId?: string }> {
  if (!orderId) return { awarded: false, points: 0 };

  const ledgerDocId = `earn-${orderId}`;
  const nowIso = new Date().toISOString();

  if (idToken) {
    try {
      const orderData = await getFirestoreDocWithToken('orders', orderId, idToken);
      if (!orderData) {
        return { awarded: false, points: 0 };
      }

      const uid = orderData.customer_uid || orderData.userId || null;
      if (!uid || typeof uid !== 'string') {
        return { awarded: false, points: 0 };
      }

      if (orderData.pointsAwarded === true) {
        return { awarded: false, points: 0, userId: uid };
      }

      const existingLedger = await getFirestoreDocWithToken('loyalty_ledger', ledgerDocId, idToken);
      if (existingLedger) {
        return { awarded: false, points: 0, userId: uid };
      }

      const calculatedEarn =
        typeof orderData.pointsEarned === 'number' && orderData.pointsEarned >= 0
          ? Math.floor(orderData.pointsEarned)
          : Math.floor(Math.max(0, Number(orderData.totalAmount || 0)) / 10);

      if (calculatedEarn <= 0) {
        await setFirestoreDocWithToken(
          'orders',
          orderId,
          { pointsAwarded: true, updatedAt: nowIso },
          idToken,
          true
        );
        return { awarded: false, points: 0, userId: uid };
      }

      const userData = await getFirestoreDocWithToken('users', uid, idToken);
      const currentPoints = userData ? Number(userData.loyaltyPoints || 0) : 0;
      const nextBalance = currentPoints + calculatedEarn;

      await setFirestoreDocWithToken(
        'users',
        uid,
        { loyaltyPoints: nextBalance, updatedAt: nowIso },
        idToken,
        true
      );

      await setFirestoreDocWithToken(
        'orders',
        orderId,
        {
          pointsEarned: calculatedEarn,
          pointsAwarded: true,
          pointsAwardedAt: nowIso,
          updatedAt: nowIso,
        },
        idToken,
        true
      );

      const entry: LoyaltyLedgerEntry = {
        id: ledgerDocId,
        userId: uid,
        orderId,
        type: 'ORDER_EARN',
        pointsDelta: calculatedEarn,
        balanceAfter: nextBalance,
        description: `Earned from delivered order #${orderId}`,
        actor,
        createdAt: nowIso,
      };
      await setFirestoreDocWithToken('loyalty_ledger', ledgerDocId, entry, idToken, false);

      await writeAuditLog(
        {
          action: 'LOYALTY_POINTS_AWARDED',
          entityType: 'order',
          entityId: orderId,
          actorRole: 'system',
          details: { userId: uid, points: calculatedEarn },
        },
        idToken
      );

      return { awarded: true, points: calculatedEarn, userId: uid };
    } catch (err: any) {
      logger.warn('loyalty', `Failed to award delivery loyalty points with token for ${orderId}`, {
        error: err?.message,
      });
      return { awarded: false, points: 0 };
    }
  }

  const db = getServerDb();
  if (!db) return { awarded: false, points: 0 };

  const orderRef = doc(db, 'orders', orderId);
  const ledgerRef = doc(db, 'loyalty_ledger', ledgerDocId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) {
        return { awarded: false, points: 0 };
      }

      const orderData = orderSnap.data() as any;
      const uid = orderData.customer_uid || orderData.userId || null;
      if (!uid || typeof uid !== 'string') {
        return { awarded: false, points: 0 };
      }

      if (orderData.pointsAwarded === true) {
        return { awarded: false, points: 0, userId: uid };
      }

      const existingLedger = await tx.get(ledgerRef);
      if (existingLedger.exists()) {
        return { awarded: false, points: 0, userId: uid };
      }

      const calculatedEarn =
        typeof orderData.pointsEarned === 'number' && orderData.pointsEarned >= 0
          ? Math.floor(orderData.pointsEarned)
          : Math.floor(Math.max(0, Number(orderData.totalAmount || 0)) / 10);

      if (calculatedEarn <= 0) {
        tx.update(orderRef, { pointsAwarded: true, updatedAt: nowIso });
        return { awarded: false, points: 0, userId: uid };
      }

      const userRef = doc(db, 'users', uid);
      const userSnap = await tx.get(userRef);
      const currentPoints = userSnap.exists() ? Number(userSnap.data()?.loyaltyPoints || 0) : 0;
      const nextBalance = currentPoints + calculatedEarn;

      tx.set(
        userRef,
        {
          loyaltyPoints: nextBalance,
          updatedAt: nowIso,
        },
        { merge: true }
      );

      tx.update(orderRef, {
        pointsEarned: calculatedEarn,
        pointsAwarded: true,
        pointsAwardedAt: nowIso,
        updatedAt: nowIso,
      });

      const entry: LoyaltyLedgerEntry = {
        id: ledgerDocId,
        userId: uid,
        orderId,
        type: 'ORDER_EARN',
        pointsDelta: calculatedEarn,
        balanceAfter: nextBalance,
        description: `Earned from delivered order #${orderId}`,
        actor,
        createdAt: nowIso,
      };
      tx.set(ledgerRef, entry);

      return { awarded: true, points: calculatedEarn, userId: uid };
    });

    if (result.awarded) {
      await writeAuditLog({
        action: 'LOYALTY_POINTS_AWARDED',
        entityType: 'order',
        entityId: orderId,
        actorRole: 'system',
        details: { userId: result.userId, points: result.points },
      });
    }

    return result;
  } catch (err: any) {
    logger.warn('loyalty', `Failed to award delivery loyalty points for ${orderId}`, {
      error: err?.message,
    });
    return { awarded: false, points: 0 };
  }
}

export async function adjustCustomerLoyaltyPoints(params: {
  userId: string;
  newBalance?: number;
  delta?: number;
  reason?: string;
  actorUid?: string;
  actorEmail?: string;
  actorRole?: string;
  idToken?: string;
}): Promise<{
  adjusted: boolean;
  previousBalance: number;
  newBalance: number;
  pointsDelta: number;
  entry?: LoyaltyLedgerEntry;
}> {
  const { userId, newBalance, delta, reason, actorUid, actorEmail, actorRole, idToken } = params;
  const nowIso = new Date().toISOString();
  const ledgerId = `adj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const cleanReason = (reason || 'Admin manual loyalty adjustment').trim();
  const actorLabel = actorEmail || actorUid || 'admin';

  if (idToken) {
    const existingUser = await getFirestoreDocWithToken('users', userId, idToken);
    if (!existingUser) {
      throw new Error('Target user profile not found.');
    }
    const previousBalance = Math.max(0, Math.floor(Number(existingUser.loyaltyPoints || 0)));
    const targetBalance =
      typeof newBalance === 'number' && !Number.isNaN(newBalance)
        ? Math.max(0, Math.floor(newBalance))
        : Math.max(0, previousBalance + Math.floor(Number(delta || 0)));
    const pointsDelta = targetBalance - previousBalance;

    if (pointsDelta === 0) {
      return { adjusted: false, previousBalance, newBalance: targetBalance, pointsDelta: 0 };
    }

    const entry: LoyaltyLedgerEntry = {
      id: ledgerId,
      userId,
      type: 'ADMIN_ADJUSTMENT',
      pointsDelta,
      balanceAfter: targetBalance,
      description: cleanReason,
      actor: actorLabel,
      createdAt: nowIso,
    };

    await setFirestoreDocWithToken(
      'users',
      userId,
      { loyaltyPoints: targetBalance, updatedAt: nowIso },
      idToken,
      true
    );
    await setFirestoreDocWithToken('loyalty_ledger', ledgerId, entry, idToken, false);

    await writeAuditLog({
      action: 'LOYALTY_POINTS_ADJUSTED',
      entityType: 'user',
      entityId: userId,
      actorUid,
      actorEmail,
      actorRole,
      details: { previousBalance, newBalance: targetBalance, pointsDelta, reason: cleanReason },
    });

    return { adjusted: true, previousBalance, newBalance: targetBalance, pointsDelta, entry };
  }

  const db = getServerDb();
  if (!db) {
    throw new Error('Database unavailable');
  }

  const userRef = doc(db, 'users', userId);
  const ledgerRef = doc(db, 'loyalty_ledger', ledgerId);

  const txResult = await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) {
      throw new Error('Target user profile not found.');
    }
    const previousBalance = Math.max(0, Math.floor(Number(userSnap.data()?.loyaltyPoints || 0)));
    const targetBalance =
      typeof newBalance === 'number' && !Number.isNaN(newBalance)
        ? Math.max(0, Math.floor(newBalance))
        : Math.max(0, previousBalance + Math.floor(Number(delta || 0)));
    const pointsDelta = targetBalance - previousBalance;

    if (pointsDelta === 0) {
      return { adjusted: false, previousBalance, newBalance: targetBalance, pointsDelta: 0 };
    }

    const entry: LoyaltyLedgerEntry = {
      id: ledgerId,
      userId,
      type: 'ADMIN_ADJUSTMENT',
      pointsDelta,
      balanceAfter: targetBalance,
      description: cleanReason,
      actor: actorLabel,
      createdAt: nowIso,
    };

    tx.update(userRef, { loyaltyPoints: targetBalance, updatedAt: nowIso });
    tx.set(ledgerRef, entry);
    return { adjusted: true, previousBalance, newBalance: targetBalance, pointsDelta, entry };
  });

  if (txResult.adjusted) {
    await writeAuditLog({
      action: 'LOYALTY_POINTS_ADJUSTED',
      entityType: 'user',
      entityId: userId,
      actorUid,
      actorEmail,
      actorRole,
      details: {
        previousBalance: txResult.previousBalance,
        newBalance: txResult.newBalance,
        pointsDelta: txResult.pointsDelta,
        reason: cleanReason,
      },
    });
  }

  return txResult;
}

export async function getUserLoyaltyLedger(userId: string, idToken?: string): Promise<LoyaltyLedgerEntry[]> {
  if (!userId) return [];

  if (idToken) {
    try {
      const rows = await queryFirestoreCollectionWithToken(
        'loyalty_ledger',
        [{ field: 'userId', value: userId }],
        idToken
      );
      return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err: any) {
      logger.warn('loyalty', `Token query failed for loyalty_ledger (${userId})`, { error: err?.message });
    }
  }

  const db = getServerDb();
  if (!db) return [];

  const q = query(collection(db, 'loyalty_ledger'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const rows: LoyaltyLedgerEntry[] = [];
  snap.forEach((d) => {
    rows.push({ id: d.id, ...(d.data() as any) });
  });
  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

