import { AdPerformance } from '../types';
import { db, functions, handleFirestoreError, OperationType } from './firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

export const adService = {
  /**
   * Fetches the last 30 days of ad performance records from Firestore.
   * If empty, triggers an on-demand seed/sync to populate historical data.
   */
  async getAdPerformance(): Promise<AdPerformance[]> {
    try {
      const perfCollection = collection(db, 'ad_performance');
      const q = query(perfCollection, orderBy('date', 'asc'), limit(30));
      const snapshot = await getDocs(q);
      
      const records: AdPerformance[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as AdPerformance);
      });

      // If no records exist in Firestore, seed realistic historical trends so the dashboard works instantly
      if (records.length === 0) {
        console.info('[adService] No performance documents found, seeding mock historical data via Cloud Function...');
        const triggerSync = httpsCallable(functions, 'triggerMetaAdsSync');
        const res = await triggerSync({ forceMock: true }) as any;
        if (res?.data?.success) {
          const newSnapshot = await getDocs(q);
          const newRecords: AdPerformance[] = [];
          newSnapshot.forEach((docSnap) => {
            newRecords.push(docSnap.data() as AdPerformance);
          });
          return newRecords;
        }
      }

      return records;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'ad_performance', false);
      return [];
    }
  },

  /**
   * Triggers the Cloud Function to fetch and update/seed Meta Marketing campaign insights.
   */
  async syncMetaAds(forceMock = false): Promise<AdPerformance[]> {
    try {
      const triggerSync = httpsCallable(functions, 'triggerMetaAdsSync');
      await triggerSync({ forceMock });
      return await this.getAdPerformance();
    } catch (e) {
      console.error('[adService] Failed to trigger Cloud Function sync:', e);
      return await this.getAdPerformance();
    }
  }
};
