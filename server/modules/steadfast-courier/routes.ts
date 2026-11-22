import express from 'express';
import { doc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { getServerDb } from '../../config/firebase';
import { verifyAdminAuth } from '../../middleware/auth';
import { writeAuditLog } from '../../utils/auditLog';
import { awardDeliveredOrderLoyaltyPoints } from '../customers/loyaltyService';

const router = express.Router();

router.post('/api/steadfast/create-consignment', verifyAdminAuth, async (req, res) => {
  const { orderId, note } = req.body;
  if (!orderId) {
    return res.status(400).json({ success: false, error: 'Missing required orderId' });
  }

  const db = getServerDb();
  if (!db) {
    return res.status(503).json({ success: false, error: 'Database not initialized on server' });
  }

  const actor = (req as any).user;

  try {
    const orderRef = doc(db, 'orders', String(orderId));
    const orderSnap = await getDoc(orderRef);
    if (!orderSnap.exists()) {
      return res.status(404).json({ success: false, error: `Order #${orderId} not found in database` });
    }

    const orderData = orderSnap.data() as any;
    const customerName = orderData.customerName || orderData.name || orderData.shippingAddress?.fullName || 'Customer';
    const customerPhone = orderData.customerPhone || orderData.phone || orderData.shippingAddress?.phone || '';
    const customerAddress = orderData.shippingAddress?.address || orderData.address || 'Dhaka, Bangladesh';
    const numCodAmount = Number(orderData.totalAmount || orderData.total || 0);
    const numDeliveryFee = Number(
      orderData.deliveryFee || (String(customerAddress).toLowerCase().includes('dhaka') ? 60 : 120)
    );

    if (!customerName || !customerPhone) {
      return res.status(400).json({ success: false, error: 'Order is missing customer name or phone number' });
    }

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.steadfast.com.bd/api/v1';
    const isSandboxMode = process.env.STEADFAST_SANDBOX_MODE === 'true';

    if (apiKey && secretKey) {
      const apiResponse = await fetch(`${baseUrl}/create_order`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice: String(orderId),
          recipient_name: customerName,
          recipient_phone: customerPhone,
          recipient_address: typeof customerAddress === 'string' ? customerAddress : JSON.stringify(customerAddress),
          cod_amount: numCodAmount,
          note: note || 'Korean Skin Food BD cosmetics',
        }),
      });

      const responseData: any = await apiResponse.json();
      if (apiResponse.ok && (responseData.status === 200 || responseData.code === 200) && responseData.consignment) {
        const c = responseData.consignment;
        const consignmentId = String(c.consignment_id || c.id || `SF-${Math.floor(100000 + Math.random() * 900000)}`);
        const trackingCode = String(c.tracking_code || c.tracking_id || consignmentId);
        const trackingUrl = `https://steadfast.com.bd/t/${trackingCode}`;

        await writeAuditLog({
          action: 'COURIER_CONSIGNMENT_CREATED',
          entityType: 'order',
          entityId: String(orderId),
          actorUid: actor?.uid,
          actorEmail: actor?.email,
          actorRole: actor?.role,
          details: { provider: 'steadfast', consignmentId, trackingCode },
        });

        return res.json({
          success: true,
          message: 'Consignment created successfully on Steadfast Courier',
          courier: {
            provider: 'steadfast',
            consignmentId,
            trackingCode,
            status: 'in_transit',
            codAmount: numCodAmount,
            deliveryFee: numDeliveryFee,
            trackingUrl,
            createdAt: new Date().toISOString(),
          },
        });
      }

      const apiErrorMessage = responseData?.errors
        ? typeof responseData.errors === 'string'
          ? responseData.errors
          : JSON.stringify(responseData.errors)
        : responseData?.message || responseData?.error || 'Steadfast API request failed';

      if (!isSandboxMode) {
        return res.status(400).json({ success: false, error: `Steadfast API error: ${apiErrorMessage}` });
      }
    } else if (!isSandboxMode) {
      return res.status(400).json({
        success: false,
        error: 'Steadfast is not configured yet. Add API credentials in settings.',
      });
    }

    const consignmentId = `SANDBOX-SF-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingCode = `S${Math.floor(1000000 + Math.random() * 9000000)}`;
    const trackingUrl = `https://steadfast.com.bd/t/${trackingCode}`;

    return res.json({
      success: true,
      message: '[SANDBOX MODE] Consignment simulated for testing',
      isSandboxFallback: true,
      courier: {
        provider: 'steadfast',
        consignmentId,
        trackingCode,
        status: 'in_transit',
        codAmount: numCodAmount,
        deliveryFee: numDeliveryFee,
        trackingUrl,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error processing consignment',
    });
  }
});

router.get('/api/steadfast/status/:consignmentId', verifyAdminAuth, async (req, res) => {
  const consignmentId = String(req.params.consignmentId || '').trim();
  const apiKey = process.env.STEADFAST_API_KEY;
  const secretKey = process.env.STEADFAST_SECRET_KEY;
  const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.steadfast.com.bd/api/v1';

  if (apiKey && secretKey && consignmentId) {
    try {
      const apiResponse = await fetch(`${baseUrl}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
        headers: {
          'Api-Key': apiKey,
          'Secret-Key': secretKey,
        },
      });
      if (apiResponse.ok) {
        const data: any = await apiResponse.json();
        const deliveryStatus = String(data?.delivery_status || '').toLowerCase();

        // Sync delivered status + trigger idempotent loyalty award if matched in orders
        const db = getServerDb();
        if (db && (deliveryStatus === 'delivered' || deliveryStatus === 'partial_delivered')) {
          try {
            const q = query(collection(db, 'orders'), where('courier.consignmentId', '==', consignmentId));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
              const ord = d.data() as any;
              if (ord.status !== 'delivered') {
                await updateDoc(doc(db, 'orders', d.id), {
                  status: 'delivered',
                  isPaid: true,
                  deliveredAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }
              await awardDeliveredOrderLoyaltyPoints(d.id, 'steadfast-sync');
            }
          } catch {
            // non-fatal status sync hook
          }
        }
        return res.json(data);
      }
    } catch (err: any) {
      console.warn('[Steadfast] Failed checking status:', err?.message);
    }
  }

  if (process.env.STEADFAST_SANDBOX_MODE === 'true' || consignmentId.startsWith('SANDBOX')) {
    return res.json({
      status: 200,
      delivery_status: 'in_transit',
      consignment_id: consignmentId,
    });
  }

  return res.status(400).json({
    success: false,
    error: 'Steadfast API is not configured or consignment status lookup failed.',
  });
});

export default router;
