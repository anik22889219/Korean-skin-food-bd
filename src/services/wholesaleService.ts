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
  /**
   * Admin / Staff privileged update.
   * Uses setDoc with merge to ensure document creation if customer does not exist yet.
   */
  async adminUpdateWholesaleCustomer(customerId: string, data: Partial<WholesaleCustomer>): Promise<void> {
    if (!customerId) throw new Error('Customer ID is required.');
    try {
      const wholesaleDocRef = doc(db, 'wholesale_customers', customerId);
      const userDocRef = doc(db, 'users', customerId);
      
      let existingUserData: any = {};
      try {
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          existingUserData = userSnap.data();
        }
      } catch (e) {
        console.warn('[WholesaleService] Note: user doc read exception in adminUpdate:', e);
      }

      const updatePayload: Partial<WholesaleCustomer> = {
        id: customerId,
        userId: customerId,
        name: data.name || existingUserData.name || 'Wholesale Partner',
        email: data.email || existingUserData.email || '',
        phone: data.phone || existingUserData.phone || '',
        businessName: data.businessName || existingUserData.businessName || '',
        wholesaleAccess: data.wholesaleAccess !== undefined ? data.wholesaleAccess : (existingUserData.wholesaleAccess ?? true),
        status: data.status || existingUserData.wholesaleStatus || 'active',
        creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : (existingUserData.creditLimit || 50000),
        currentDue: data.currentDue !== undefined ? Number(data.currentDue) : (existingUserData.currentDue || 0),
        ...data,
        updatedAt: new Date().toISOString()
      };

      await setDoc(wholesaleDocRef, sanitizeForFirestore(updatePayload), { merge: true });

      // Synchronize wholesaleAccess & status to users/{customerId} doc
      if (data.wholesaleAccess !== undefined || data.status !== undefined) {
        const userUpdates: any = { updatedAt: serverTimestamp() };
        if (data.wholesaleAccess !== undefined) {
          userUpdates.wholesaleAccess = data.wholesaleAccess;
        }
        if (data.status !== undefined) {
          userUpdates.wholesaleStatus = data.status;
        }
        try {
          await setDoc(userDocRef, userUpdates, { merge: true });
        } catch (uErr) {
          console.warn('[WholesaleService] Note: could not sync user document:', uErr);
        }
      }
    } catch (err) {
      console.error('[WholesaleService] Admin update failed:', err);
      handleFirestoreError(err, OperationType.UPDATE, `wholesale_customers/${customerId}`);
      throw err;
    }
  },

  /**
   * Get all wholesale customer records for admin dashboard.
   * Merges wholesale_customers collection and users collection (with wholesaleAccess === true).
   */
  async getAllWholesaleCustomers(): Promise<WholesaleCustomer[]> {
    try {
      const customersMap = new Map<string, WholesaleCustomer>();

      // 1. Fetch from wholesale_customers
      try {
        const snap = await getDocs(collection(db, 'wholesale_customers'));
        snap.forEach(docSnap => {
          const cData = { id: docSnap.id, ...docSnap.data() } as WholesaleCustomer;
          customersMap.set(docSnap.id, cData);
        });
      } catch (wsErr) {
        console.warn('[WholesaleService] Error reading wholesale_customers:', wsErr);
      }

      // 2. Fetch users who have wholesaleAccess === true
      try {
        const qUsers = query(collection(db, 'users'), where('wholesaleAccess', '==', true));
        const userSnap = await getDocs(qUsers);
        userSnap.forEach(uDoc => {
          const u = uDoc.data();
          const uId = uDoc.id || u.uid;
          if (!uId) return;

          const existing = customersMap.get(uId);
          if (existing) {
            // Ensure wholesaleAccess is synced
            customersMap.set(uId, {
              ...existing,
              wholesaleAccess: true,
              status: existing.status || 'active',
              name: existing.name || u.name || 'Wholesale Partner',
              email: existing.email || u.email || '',
              phone: existing.phone || u.phone || '',
              businessName: existing.businessName || u.businessName || ''
            });
          } else {
            // Add user directly as wholesale customer
            customersMap.set(uId, {
              id: uId,
              userId: uId,
              name: u.name || 'Wholesale Partner',
              email: u.email || '',
              phone: u.phone || '',
              businessName: u.businessName || '',
              pageName: u.pageName || '',
              location: u.location || '',
              businessAddress: u.businessAddress || u.address || '',
              address: u.address || u.businessAddress || '',
              wholesaleAccess: true,
              status: (u.wholesaleStatus as any) || (u.status === 'suspended' ? 'suspended' : 'active'),
              creditLimit: u.creditLimit || 50000,
              currentDue: u.currentDue || 0,
              totalPaid: u.totalPaid || 0,
              totalPurchasedBDT: u.totalPurchasedBDT || 0,
              totalOrders: u.totalOrders || 0,
              totalWholesalePurchase: u.totalPurchasedBDT || 0,
              createdAt: u.createdAt || new Date().toISOString(),
              updatedAt: u.updatedAt || new Date().toISOString()
            });
          }
        });
      } catch (uErr) {
        console.warn('[WholesaleService] Note: reading users with wholesaleAccess:', uErr);
      }

      const list = Array.from(customersMap.values());
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return list;
    } catch (err) {
      console.warn('[WholesaleService] Error getting all wholesale customers:', err);
      return [];
    }
  },

  /**
   * Live subscribe to all wholesale customers for admin.
   * Real-time sync of both wholesale_customers and users with wholesaleAccess.
   */
  subscribeAllWholesaleCustomers(callback: (customers: WholesaleCustomer[]) => void): () => void {
    let wsCustomers: WholesaleCustomer[] = [];
    let wsUsers: WholesaleCustomer[] = [];

    const emitMerged = () => {
      const mergedMap = new Map<string, WholesaleCustomer>();
      wsCustomers.forEach(c => mergedMap.set(c.id, c));
      wsUsers.forEach(u => {
        const existing = mergedMap.get(u.id);
        if (existing) {
          mergedMap.set(u.id, {
            ...existing,
            wholesaleAccess: true,
            status: existing.status || u.status || 'active',
            name: existing.name || u.name,
            email: existing.email || u.email,
            phone: existing.phone || u.phone,
            businessName: existing.businessName || u.businessName
          });
        } else {
          mergedMap.set(u.id, u);
        }
      });

      const list = Array.from(mergedMap.values());
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      callback(list);
    };

    const unsubWs = onSnapshot(collection(db, 'wholesale_customers'), (snap) => {
      const list: WholesaleCustomer[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as WholesaleCustomer);
      });
      wsCustomers = list;
      emitMerged();
    }, (err) => {
      console.warn('[WholesaleService] wholesale_customers subscription warning:', err);
    });

    const unsubUsers = onSnapshot(
      query(collection(db, 'users'), where('wholesaleAccess', '==', true)), 
      (snap) => {
        const list: WholesaleCustomer[] = [];
        snap.forEach(docSnap => {
          const u = docSnap.data();
          const uId = docSnap.id || u.uid;
          if (!uId) return;
          list.push({
            id: uId,
            userId: uId,
            name: u.name || 'Wholesale Partner',
            email: u.email || '',
            phone: u.phone || '',
            businessName: u.businessName || '',
            pageName: u.pageName || '',
            location: u.location || '',
            businessAddress: u.businessAddress || u.address || '',
            address: u.address || u.businessAddress || '',
            wholesaleAccess: true,
            status: (u.wholesaleStatus as any) || (u.status === 'suspended' ? 'suspended' : 'active'),
            creditLimit: u.creditLimit || 50000,
            currentDue: u.currentDue || 0,
            totalPaid: u.totalPaid || 0,
            totalPurchasedBDT: u.totalPurchasedBDT || 0,
            totalOrders: u.totalOrders || 0,
            totalWholesalePurchase: u.totalPurchasedBDT || 0,
            createdAt: u.createdAt || new Date().toISOString(),
            updatedAt: u.updatedAt || new Date().toISOString()
          });
        });
        wsUsers = list;
        emitMerged();
      }, 
      (err) => {
        console.warn('[WholesaleService] users wholesaleAccess subscription warning:', err);
      }
    );

    return () => {
      unsubWs();
      unsubUsers();
    };
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
