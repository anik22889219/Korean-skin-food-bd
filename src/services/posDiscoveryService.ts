import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  Unsubscribe 
} from 'firebase/firestore';
import { PosSession } from '../types';

export interface ActiveRegisterInfo {
  id: string;
  name: string;
  status: 'open' | 'active' | 'closed';
  operatorName?: string;
  operatorEmail?: string;
  scannerConnected?: boolean;
  mobileScannerId?: string | null;
  mobileScannerName?: string | null;
  scannerLastSeenAt?: string | null;
  scannerConnectedAt?: string | null;
  created_at: string;
  updated_at?: string;
}

const SCANNER_STORAGE_KEY = 'ksf_pos_mobile_scanner_id';
const SCANNER_NAME_KEY = 'ksf_pos_mobile_scanner_name';
const LAST_CONNECTED_SESSION_KEY = 'ksf_pos_last_connected_session_id';

export const posDiscoveryService = {
  /**
   * Get or generate a persistent unique ID for this mobile scanner device.
   */
  getMobileScannerId(): string {
    try {
      let id = localStorage.getItem(SCANNER_STORAGE_KEY);
      if (!id) {
        id = 'scanner_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
        localStorage.setItem(SCANNER_STORAGE_KEY, id);
      }
      return id;
    } catch {
      return 'scanner_' + Math.random().toString(36).substring(2, 10);
    }
  },

  /**
   * Get a friendly device name (e.g., "iPhone Safari (Rahim)")
   */
  getDeviceFriendlyName(userName?: string): string {
    try {
      const savedName = localStorage.getItem(SCANNER_NAME_KEY);
      if (savedName) return savedName;

      const ua = navigator.userAgent;
      let platform = 'Mobile Device';
      if (/iPhone/i.test(ua)) platform = 'iPhone';
      else if (/iPad/i.test(ua)) platform = 'iPad';
      else if (/Android/i.test(ua)) platform = 'Android Phone';
      else if (/Macintosh/i.test(ua)) platform = 'Mac';
      else if (/Windows/i.test(ua)) platform = 'PC';

      const userTag = userName ? ` (${userName})` : '';
      const name = `${platform} Scanner${userTag}`;
      localStorage.setItem(SCANNER_NAME_KEY, name);
      return name;
    } catch {
      return userName ? `Mobile Scanner (${userName})` : 'Mobile Scanner';
    }
  },

  /**
   * Listen to all currently open/active POS registers in real-time.
   */
  subscribeToActiveRegisters(callback: (registers: ActiveRegisterInfo[]) => void): Unsubscribe {
    const sessionsCol = collection(db, 'pos_sessions');
    
    return onSnapshot(sessionsCol, (snapshot) => {
      const registers: ActiveRegisterInfo[] = [];
      const now = Date.now();
      const MAX_STALE_MS = 10 * 60 * 1000; // 10 minutes max stale age

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Check if session is open or active
        const isOpen = data.status === 'open' || data.status === 'active';
        if (isOpen) {
          // Check if session has been updated reasonably recently
          const sessionTime = new Date(data.updated_at || data.created_at || 0).getTime();
          const isRecent = isNaN(sessionTime) || (now - sessionTime < MAX_STALE_MS);

          if (isRecent) {
            registers.push({
              id: docSnap.id,
              name: data.name || `Register (${docSnap.id.substring(0, 10)})`,
              status: data.status,
              operatorName: data.operatorName || data.customerName || 'Store Cashier',
              operatorEmail: data.operatorEmail,
              scannerConnected: Boolean(data.scannerConnected),
              mobileScannerId: data.mobileScannerId || null,
              mobileScannerName: data.mobileScannerName || null,
              scannerLastSeenAt: data.scannerLastSeenAt || null,
              scannerConnectedAt: data.scannerConnectedAt || null,
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at
            });
          }
        }
      });

      // Sort by latest created/updated
      registers.sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      });

      callback(registers);
    }, (error) => {
      console.warn('[posDiscoveryService] Error subscribing to active registers:', error);
      callback([]);
    });
  },

  /**
   * Connect mobile scanner to a specific POS session
   */
  async connectToRegister(
    sessionId: string, 
    scannerId: string, 
    scannerName: string, 
    userId?: string
  ): Promise<{ success: boolean; message: string; requiresConfirmation?: boolean }> {
    try {
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        return { success: false, message: 'POS Register session not found or has been closed.' };
      }

      const sessionData = sessionSnap.data();
      if (sessionData.status === 'closed') {
        return { success: false, message: 'This POS register is currently closed.' };
      }

      // Check if another scanner is actively connected (heartbeat within 40s)
      const isAlreadyConnectedToOther = 
        sessionData.scannerConnected === true && 
        sessionData.mobileScannerId && 
        sessionData.mobileScannerId !== scannerId;

      if (isAlreadyConnectedToOther && sessionData.scannerLastSeenAt) {
        const lastSeen = new Date(sessionData.scannerLastSeenAt).getTime();
        const isFresh = (Date.now() - lastSeen) < 40000; // 40 seconds

        if (isFresh) {
          // Request connection handover
          await updateDoc(sessionRef, {
            pendingScannerRequest: {
              mobileScannerId: scannerId,
              mobileScannerName: scannerName,
              requestedAt: new Date().toISOString()
            }
          });

          return { 
            success: false, 
            message: `Register is currently in use by "${sessionData.mobileScannerName || 'another scanner'}". Connection requested from desktop.`,
            requiresConfirmation: true 
          };
        }
      }

      // Connect this scanner
      const nowIso = new Date().toISOString();
      await updateDoc(sessionRef, {
        scannerConnected: true,
        mobileScannerId: scannerId,
        mobileScannerName: scannerName,
        mobileScannerUserId: userId || null,
        scannerConnectedAt: nowIso,
        scannerLastSeenAt: nowIso,
        pendingScannerRequest: null,
        updated_at: nowIso
      });

      try {
        localStorage.setItem(LAST_CONNECTED_SESSION_KEY, sessionId);
      } catch {}

      return { success: true, message: 'Connected successfully to POS register!' };
    } catch (err: any) {
      console.error('[posDiscoveryService] Error connecting to register:', err);
      return { success: false, message: err?.message || 'Failed to connect to register.' };
    }
  },

  /**
   * Send heartbeat from mobile scanner to keep connection alive
   */
  async sendScannerHeartbeat(sessionId: string, scannerId: string): Promise<boolean> {
    try {
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      await updateDoc(sessionRef, {
        scannerLastSeenAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.warn('[posDiscoveryService] Heartbeat failed:', err);
      return false;
    }
  },

  /**
   * Disconnect mobile scanner
   */
  async disconnectScanner(sessionId: string, scannerId: string): Promise<void> {
    try {
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        const data = sessionSnap.data();
        if (data.mobileScannerId === scannerId || !data.mobileScannerId) {
          await updateDoc(sessionRef, {
            scannerConnected: false,
            mobileScannerId: null,
            mobileScannerName: null,
            scannerLastSeenAt: null,
            updated_at: new Date().toISOString()
          });
        }
      }
      try {
        localStorage.removeItem(LAST_CONNECTED_SESSION_KEY);
      } catch {}
    } catch (err) {
      console.error('[posDiscoveryService] Error disconnecting scanner:', err);
    }
  },

  /**
   * Desktop force disconnect scanner
   */
  async desktopDisconnectScanner(sessionId: string): Promise<void> {
    try {
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      await updateDoc(sessionRef, {
        scannerConnected: false,
        mobileScannerId: null,
        mobileScannerName: null,
        scannerLastSeenAt: null,
        pendingScannerRequest: null,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[posDiscoveryService] Desktop disconnect error:', err);
    }
  },

  /**
   * Desktop accept pending scanner handover request
   */
  async desktopAcceptScannerRequest(
    sessionId: string, 
    newScannerId: string, 
    newScannerName: string
  ): Promise<void> {
    try {
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      const nowIso = new Date().toISOString();
      await updateDoc(sessionRef, {
        scannerConnected: true,
        mobileScannerId: newScannerId,
        mobileScannerName: newScannerName,
        scannerConnectedAt: nowIso,
        scannerLastSeenAt: nowIso,
        pendingScannerRequest: null,
        updated_at: nowIso
      });
    } catch (err) {
      console.error('[posDiscoveryService] Accept scanner request error:', err);
    }
  },

  /**
   * Desktop reject pending scanner handover request
   */
  async desktopRejectScannerRequest(sessionId: string): Promise<void> {
    try {
      const sessionRef = doc(db, 'pos_sessions', sessionId);
      await updateDoc(sessionRef, {
        pendingScannerRequest: null
      });
    } catch (err) {
      console.error('[posDiscoveryService] Reject scanner request error:', err);
    }
  },

  /**
   * Check if scanner is considered active based on lastSeenAt timestamp
   */
  isScannerActive(lastSeenAt?: string | null, maxStaleSeconds = 40): boolean {
    if (!lastSeenAt) return false;
    const time = new Date(lastSeenAt).getTime();
    if (isNaN(time)) return false;
    return (Date.now() - time) < (maxStaleSeconds * 1000);
  },

  getLastConnectedSessionId(): string | null {
    try {
      return localStorage.getItem(LAST_CONNECTED_SESSION_KEY);
    } catch {
      return null;
    }
  }
};
