import { Order, CourierData } from '../types';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';

export interface CreateConsignmentResult {
  success: boolean;
  message: string;
  courier?: CourierData;
}

/**
 * Creates a Steadfast Courier consignment for an order via backend server proxy,
 * and updates the Firestore order document with courier consignment tracking information.
 */
export async function createSteadfastConsignment(
  order: Order,
  note: string = 'Korean Skin Food BD order'
): Promise<CreateConsignmentResult> {
  if (!order || !order.id) {
    return { success: false, message: 'Invalid order object provided.' };
  }

  // Calculate items subtotal and delivery charge
  const itemsSubtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryCharge = Math.max(0, order.totalAmount - itemsSubtotal) || (order.address?.toLowerCase().includes('dhaka') ? 60 : 120);
  const codAmount = order.isPaid ? 0 : order.totalAmount;

  try {
    const response = await fetch('/api/steadfast/create-consignment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderId: order.id,
        customerName: order.customerName || 'Customer',
        customerPhone: order.customerPhone || '01700000000',
        customerAddress: order.address || 'Dhaka, Bangladesh',
        codAmount,
        deliveryFee: deliveryCharge,
        note
      })
    });

    const data = await response.json();

    if (!response.ok || !data.success || !data.courier) {
      return {
        success: false,
        message: data.error || data.message || 'Failed to create Steadfast consignment.'
      };
    }

    const courierData: CourierData = data.courier;

    // Persist courier details to Firestore order document
    try {
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        courier: courierData,
        status: order.status === 'pending' ? 'processing' : order.status
      });
    } catch (firestoreErr) {
      console.warn('[SteadfastService] Firestore updateDoc warning, attempting setDoc merge:', firestoreErr);
      try {
        const orderRef = doc(db, 'orders', order.id);
        await setDoc(orderRef, { courier: courierData }, { merge: true });
      } catch (mergeErr) {
        handleFirestoreError(mergeErr, OperationType.UPDATE, `orders/${order.id}`, false);
      }
    }

    return {
      success: true,
      message: `Steadfast consignment created (CN ID: ${courierData.consignmentId})`,
      courier: courierData
    };

  } catch (error: any) {
    console.error('Error creating Steadfast consignment:', error);
    return {
      success: false,
      message: error.message || 'Network error connecting to Steadfast service.'
    };
  }
}
