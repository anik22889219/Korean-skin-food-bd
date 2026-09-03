import { WholesaleCustomer, UserProfile } from '../types';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';

export interface WholesaleProfileValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates Bangladeshi or standard international phone numbers
 * e.g. 01712345678, +8801712345678, 8801712345678, or 10-15 digit phone
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Bangladesh phone regex: optional + or 88, then 01[3-9] followed by 8 digits
  const bdRegex = /^(?:\+?880|0)?1[3-9]\d{8}$/;
  // General fallback: international 9-15 digits
  const generalRegex = /^\+?[0-9]{9,15}$/;
  return bdRegex.test(cleaned) || generalRegex.test(cleaned);
}

/**
 * Validates URL format for Facebook, Instagram, or Web addresses
 */
export function isValidUrl(url: string): boolean {
  if (!url || !url.trim()) return true; // Optional URLs pass when empty
  const trimmed = url.trim();
  
  // Basic URL regex allowing with or without protocol
  const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i;
  return urlPattern.test(trimmed);
}

/**
 * Formats URL to ensure https:// prefix if omitted
 */
export function formatUrl(url: string): string {
  if (!url || !url.trim()) return '';
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

/**
 * Validates wholesale profile fields
 */
export function validateWholesaleProfile(data: Partial<WholesaleCustomer>): WholesaleProfileValidationResult {
  const errors: Record<string, string> = {};

  // 1. Full Name (Required)
  if (!data.name || !data.name.trim()) {
    errors.name = 'Full name is required.';
  } else if (data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters long.';
  }

  // 2. Contact Number (Required)
  if (!data.phone || !data.phone.trim()) {
    errors.phone = 'Primary contact number is required.';
  } else if (!isValidPhoneNumber(data.phone.trim())) {
    errors.phone = 'Please enter a valid phone number (e.g. 01712345678).';
  }

  // 3. Alternative Contact Number (Optional)
  if (data.altPhone && data.altPhone.trim()) {
    if (!isValidPhoneNumber(data.altPhone.trim())) {
      errors.altPhone = 'Alternative contact number format is invalid.';
    }
  }

  // 4. Email format (Optional / Readonly from auth)
  if (data.email && data.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
  }

  // 5. Facebook Page URL (Optional)
  if (data.facebookPageUrl && data.facebookPageUrl.trim()) {
    if (!isValidUrl(data.facebookPageUrl.trim())) {
      errors.facebookPageUrl = 'Please enter a valid Facebook URL or link.';
    }
  }

  // 6. Instagram URL (Optional)
  if (data.instagramUrl && data.instagramUrl.trim()) {
    if (!isValidUrl(data.instagramUrl.trim())) {
      errors.instagramUrl = 'Please enter a valid Instagram URL or handle.';
    }
  }

  // 7. Website URL (Optional)
  if (data.websiteUrl && data.websiteUrl.trim()) {
    if (!isValidUrl(data.websiteUrl.trim())) {
      errors.websiteUrl = 'Please enter a valid website URL.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export const wholesaleService = {
  /**
   * Fetch wholesale customer profile by userId / customerId
   */
  async getWholesaleCustomer(userId: string): Promise<WholesaleCustomer | null> {
    if (!userId) return null;
    try {
      const docRef = doc(db, 'wholesale_customers', userId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as WholesaleCustomer;
      }
      return null;
    } catch (err) {
      console.warn('[WholesaleService] Error getting wholesale customer:', err);
      return null;
    }
  },

  /**
   * Live subscribe to a wholesale customer document
   */
  subscribeWholesaleCustomer(userId: string, callback: (customer: WholesaleCustomer | null) => void): () => void {
    if (!userId) {
      callback(null);
      return () => {};
    }
    const docRef = doc(db, 'wholesale_customers', userId);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() } as WholesaleCustomer);
      } else {
        callback(null);
      }
    }, (err) => {
      console.warn('[WholesaleService] onSnapshot subscription warning:', err);
      handleFirestoreError(err, OperationType.GET, `wholesale_customers/${userId}`, false);
    });
  },

  /**
   * Update wholesale profile by customer (safely whitelist editable fields)
   * Prevents customer from modifying privileged fields (wholesaleAccess, status, creditLimit, etc.)
   */
  async updateProfileByCustomer(userId: string, data: Partial<WholesaleCustomer>): Promise<void> {
    if (!userId) throw new Error('User ID is required.');

    const validation = validateWholesaleProfile(data);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Validation failed. Please check your inputs.');
    }

    // Explicitly whitelist only client-editable profile attributes
    const safePayload: Partial<WholesaleCustomer> = {
      name: data.name?.trim() || '',
      phone: data.phone?.trim() || '',
      altPhone: data.altPhone?.trim() || '',
      email: data.email?.trim() || '',
      businessName: data.businessName?.trim() || '',
      storeName: data.businessName?.trim() || '',
      pageName: data.pageName?.trim() || '',
      businessType: data.businessType || 'Retailer',
      location: data.location?.trim() || '',
      address: data.businessAddress?.trim() || data.address?.trim() || '',
      businessAddress: data.businessAddress?.trim() || '',
      facebookPageUrl: data.facebookPageUrl ? formatUrl(data.facebookPageUrl) : '',
      instagramUrl: data.instagramUrl ? formatUrl(data.instagramUrl) : '',
      whatsappNumber: data.whatsappNumber?.trim() || '',
      websiteUrl: data.websiteUrl ? formatUrl(data.websiteUrl) : '',
      otherSocialInfo: data.otherSocialInfo?.trim() || '',
      tradeLicenseNumber: data.tradeLicenseNumber?.trim() || '',
      updatedAt: new Date().toISOString()
    };

    try {
      const wholesaleDocRef = doc(db, 'wholesale_customers', userId);
      const existingSnap = await getDoc(wholesaleDocRef);

      if (existingSnap.exists()) {
        await updateDoc(wholesaleDocRef, sanitizeForFirestore(safePayload));
      } else {
        // First-time creation by authenticated user
        const initialDoc: Partial<WholesaleCustomer> = {
          ...safePayload,
          id: userId,
          userId: userId,
          wholesaleAccess: false, // Default false until verified by admin
          status: 'pending',
          creditLimit: 0,
          currentDue: 0,
          totalPurchasedBDT: 0,
          customerSince: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        await setDoc(wholesaleDocRef, sanitizeForFirestore(initialDoc));
      }

      // Also sync user profile document in users collection
      const userDocRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        await updateDoc(userDocRef, sanitizeForFirestore({
          name: safePayload.name,
          phone: safePayload.phone,
          altPhone: safePayload.altPhone,
          businessName: safePayload.businessName,
          pageName: safePayload.pageName,
          businessType: safePayload.businessType,
          location: safePayload.location,
          businessAddress: safePayload.businessAddress,
          address: safePayload.businessAddress || safePayload.address,
          facebookPageUrl: safePayload.facebookPageUrl,
          instagramUrl: safePayload.instagramUrl,
          whatsappNumber: safePayload.whatsappNumber,
          websiteUrl: safePayload.websiteUrl,
          otherSocialInfo: safePayload.otherSocialInfo,
          updatedAt: serverTimestamp()
        }));
      }
    } catch (err) {
      console.error('[WholesaleService] Error updating profile by customer:', err);
      handleFirestoreError(err, OperationType.UPDATE, `wholesale_customers/${userId}`);
      throw err;
    }
  },

  /**
   * Submit wholesale registration application
   */
  async applyForWholesale(userId: string, data: Partial<WholesaleCustomer>): Promise<void> {
    if (!userId) throw new Error('User ID is required.');

    const validation = validateWholesaleProfile(data);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      throw new Error(firstError || 'Validation failed. Please check your inputs.');
    }

    const applicationPayload: Partial<WholesaleCustomer> = {
      id: userId,
      userId: userId,
      name: data.name?.trim() || '',
      phone: data.phone?.trim() || '',
      altPhone: data.altPhone?.trim() || '',
      email: data.email?.trim() || '',
      businessName: data.businessName?.trim() || '',
      storeName: data.businessName?.trim() || '',
      pageName: data.pageName?.trim() || '',
      businessType: data.businessType || 'Retailer',
      location: data.location?.trim() || '',
      address: data.businessAddress?.trim() || '',
      businessAddress: data.businessAddress?.trim() || '',
      facebookPageUrl: data.facebookPageUrl ? formatUrl(data.facebookPageUrl) : '',
      instagramUrl: data.instagramUrl ? formatUrl(data.instagramUrl) : '',
      whatsappNumber: data.whatsappNumber?.trim() || '',
      websiteUrl: data.websiteUrl ? formatUrl(data.websiteUrl) : '',
      otherSocialInfo: data.otherSocialInfo?.trim() || '',
      tradeLicenseNumber: data.tradeLicenseNumber?.trim() || '',
      wholesaleAccess: false,
      status: 'pending',
      creditLimit: 0,
      currentDue: 0,
      totalPurchasedBDT: 0,
      customerSince: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const wholesaleDocRef = doc(db, 'wholesale_customers', userId);
      await setDoc(wholesaleDocRef, sanitizeForFirestore(applicationPayload), { merge: true });

      // Update user doc with wholesaleStatus: pending
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, sanitizeForFirestore({
        businessName: applicationPayload.businessName,
        pageName: applicationPayload.pageName,
        businessType: applicationPayload.businessType,
        location: applicationPayload.location,
        businessAddress: applicationPayload.businessAddress,
        facebookPageUrl: applicationPayload.facebookPageUrl,
        wholesaleStatus: 'pending',
        updatedAt: serverTimestamp()
      }));
    } catch (err) {
      console.error('[WholesaleService] Error applying for wholesale:', err);
      handleFirestoreError(err, OperationType.WRITE, `wholesale_customers/${userId}`);
      throw err;
    }
  },

  /**
   * Admin / Staff privileged update
   */
  async adminUpdateWholesaleCustomer(customerId: string, data: Partial<WholesaleCustomer>): Promise<void> {
    if (!customerId) throw new Error('Customer ID is required.');
    try {
      const wholesaleDocRef = doc(db, 'wholesale_customers', customerId);
      const updatePayload: Partial<WholesaleCustomer> = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      await updateDoc(wholesaleDocRef, sanitizeForFirestore(updatePayload));

      // Synchronize wholesaleAccess & status to users/{customerId} doc if provided
      if (data.wholesaleAccess !== undefined || data.status !== undefined) {
        const userDocRef = doc(db, 'users', customerId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const userUpdates: any = { updatedAt: serverTimestamp() };
          if (data.wholesaleAccess !== undefined) {
            userUpdates.wholesaleAccess = data.wholesaleAccess;
          }
          if (data.status !== undefined) {
            userUpdates.wholesaleStatus = data.status;
          }
          await updateDoc(userDocRef, userUpdates);
        }
      }
    } catch (err) {
      console.error('[WholesaleService] Admin update failed:', err);
      handleFirestoreError(err, OperationType.UPDATE, `wholesale_customers/${customerId}`);
      throw err;
    }
  },

  /**
   * Get all wholesale customer records for admin dashboard
   */
  async getAllWholesaleCustomers(): Promise<WholesaleCustomer[]> {
    try {
      const q = query(collection(db, 'wholesale_customers'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const customers: WholesaleCustomer[] = [];
      snap.forEach(docSnap => {
        customers.push({ id: docSnap.id, ...docSnap.data() } as WholesaleCustomer);
      });
      return customers;
    } catch (err) {
      console.warn('[WholesaleService] Error getting all wholesale customers:', err);
      return [];
    }
  },

  /**
   * Live subscribe to all wholesale customers for admin
   */
  subscribeAllWholesaleCustomers(callback: (customers: WholesaleCustomer[]) => void): () => void {
    const q = query(collection(db, 'wholesale_customers'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const customers: WholesaleCustomer[] = [];
      snap.forEach(docSnap => {
        customers.push({ id: docSnap.id, ...docSnap.data() } as WholesaleCustomer);
      });
      callback(customers);
    }, (err) => {
      console.warn('[WholesaleService] onSnapshot subscription warning:', err);
    });
  }
};

export const wholesaleLedgerService = {
  async addPayment(paymentData: {
    wholesaleCustomerId: string;
    amount: number;
    paymentMethod: string;
    reference?: string;
    note?: string;
    createdBy: string;
    orderId?: string;
  }) {
    try {
      const res = await fetch('/api/wholesale/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.payment;
      }
      throw new Error(data.error || 'Failed to add payment via API');
    } catch (apiErr: any) {
      console.warn('[wholesaleLedgerService] API addPayment failed, using direct Firestore transaction:', apiErr);
      // Direct Firestore transaction fallback
      const customerRef = doc(db, 'wholesale_customers', paymentData.wholesaleCustomerId);
      const paymentId = `wp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const paymentRef = doc(db, 'wholesale_payments', paymentId);
      const nowIso = new Date().toISOString();

      const custSnap = await getDoc(customerRef);
      if (!custSnap.exists()) throw new Error('Wholesale customer not found');

      const custData = custSnap.data();
      const currentPaid = Number(custData.totalPaid || 0);
      const currentDue = Number(custData.totalDue || 0);
      const newPaid = currentPaid + paymentData.amount;
      const newDue = currentDue - paymentData.amount;

      await updateDoc(customerRef, {
        totalPaid: newPaid,
        totalDue: newDue,
        currentDue: newDue,
        updatedAt: nowIso
      });

      const paymentDoc = {
        id: paymentId,
        wholesaleCustomerId: paymentData.wholesaleCustomerId,
        previousDue: currentDue,
        remainingDue: newDue,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.reference || '',
        note: paymentData.note || '',
        createdBy: paymentData.createdBy,
        createdAt: nowIso,
        ...(paymentData.orderId ? { orderId: paymentData.orderId } : {})
      };

      await setDoc(paymentRef, paymentDoc);
      return paymentDoc;
    }
  },

  async getPayments(wholesaleCustomerId: string) {
    if (!wholesaleCustomerId) return [];

    try {
      const res = await fetch(`/api/wholesale/payments/${wholesaleCustomerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.payments)) {
          return data.payments;
        }
      }
    } catch (apiErr) {
      console.warn('[wholesaleLedgerService] API getPayments failed, reading direct from Firestore:', apiErr);
    }

    try {
      const q = query(
        collection(db, 'wholesale_payments'),
        where('wholesaleCustomerId', '==', wholesaleCustomerId)
      );
      const snap = await getDocs(q);
      const payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      payments.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return payments;
    } catch (err: any) {
      console.error('[wholesaleLedgerService] Failed to read payments from Firestore:', err);
      return [];
    }
  }
};
