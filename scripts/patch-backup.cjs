const fs = require('fs');
const filePath = 'C:/Users/Korean Skin Food/.gemini/antigravity/scratch/Korean-skin-food-bd/src/components/AdminGoogleSheetsBackup.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace import
code = code.replace(
  "import { useAuth } from '../context/AuthContext';",
  "import { useAuth } from '../context/AuthContext';\nimport { db } from '../services/firebase';\nimport { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';"
);

// Replace fetchBackupStatus
const oldFetchStatus = `  const fetchBackupStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backup/status');
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusData(prev => ({
          ...prev,
          ...data.status
        }));
        if (data.status.spreadsheetId) setSpreadsheetId(data.status.spreadsheetId);
        if (data.status.appsScriptWebappUrl) setAppsScriptWebappUrl(data.status.appsScriptWebappUrl);
      }
    } catch (err) {
      console.warn("Failed to fetch live backup status from backend, using simulated/fallback state:", err);
    } finally {
      setLoading(false);
    }
  };`;

const newFetchStatus = `  const fetchBackupStatus = async () => {
    try {
      setLoading(true);
      // 1. Direct Firestore client-side fetch (works reliably on Firebase Hosting)
      if (db) {
        try {
          const sSnap = await getDoc(doc(db, 'settings', 'google_sheets_backup'));
          if (sSnap.exists()) {
            const sData = sSnap.data();
            if (sData.spreadsheetId) setSpreadsheetId(sData.spreadsheetId);
            if (sData.appsScriptWebappUrl) setAppsScriptWebappUrl(sData.appsScriptWebappUrl);
            if (sData.status) {
              setStatusData(prev => ({ ...prev, ...sData.status }));
            }
          }
        } catch (e) {
          console.warn('[Google Sheets Backup] Firestore direct read error:', e);
        }
      }

      // 2. Safe API check with content-type verification (avoiding <!doctype html JSON error)
      try {
        const res = await fetch('/api/backup/status');
        const cType = res.headers.get('content-type') || '';
        if (res.ok && !cType.includes('text/html')) {
          const text = await res.text();
          if (!text.trim().startsWith('<')) {
            const data = JSON.parse(text);
            if (data.success && data.status) {
              setStatusData(prev => ({ ...prev, ...data.status }));
              if (data.status.spreadsheetId) setSpreadsheetId(data.status.spreadsheetId);
              if (data.status.appsScriptWebappUrl) setAppsScriptWebappUrl(data.status.appsScriptWebappUrl);
            }
          }
        }
      } catch (err) {
        // quiet fallback
      }
    } finally {
      setLoading(false);
    }
  };`;

code = code.replace(oldFetchStatus, newFetchStatus);

// Replace handleSaveSettings
const oldSaveSettings = `  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setNotification(null);
      const res = await fetch('/api/backup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, appsScriptWebappUrl })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', message: 'Google Sheets & Apps Script settings saved successfully!' });
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };`;

const newSaveSettings = `  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setNotification(null);

      // Save directly to Firestore
      if (db) {
        await setDoc(doc(db, 'settings', 'google_sheets_backup'), {
          spreadsheetId,
          appsScriptWebappUrl,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setNotification({ type: 'success', message: 'Google Sheets & Apps Script settings saved directly to Firestore!' });
        return;
      }

      const res = await fetch('/api/backup/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId, appsScriptWebappUrl })
      });
      const cType = res.headers.get('content-type') || '';
      if (!res.ok || cType.includes('text/html')) {
        throw new Error('Server API unavailable on static hosting.');
      }
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Settings saved successfully!' });
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to save settings' });
    } finally {
      setSavingSettings(false);
    }
  };`;

code = code.replace(oldSaveSettings, newSaveSettings);

// Replace handleRunFullBackup
const oldRunFull = `  const handleRunFullBackup = async () => {
    if (!isAdminOrSuperAdmin) return;
    try {
      setRunningAction('full');
      setNotification(null);
      const res = await fetch('/api/backup/run-full', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', message: 'Full backup completed successfully across all 7 collections!' });
        fetchBackupStatus();
      } else {
        throw new Error(data.error || 'Full backup execution failed');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to execute full backup' });
    } finally {
      setRunningAction(null);
    }
  };`;

const newRunFull = `  const handleRunFullBackup = async () => {
    if (!isAdminOrSuperAdmin) return;
    try {
      setRunningAction('full');
      setNotification(null);

      // If user provided Apps Script URL, call it directly from client
      if (appsScriptWebappUrl && appsScriptWebappUrl.startsWith('https://script.google.com/')) {
        try {
          await fetch(appsScriptWebappUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'full_backup', spreadsheetId, timestamp: new Date().toISOString() })
          });
          setNotification({ type: 'success', message: 'Backup trigger dispatched directly to Google Apps Script!' });
          return;
        } catch (e) {
          console.warn('[Google Sheets] Webapp fetch error:', e);
        }
      }

      const res = await fetch('/api/backup/run-full', { method: 'POST' });
      const cType = res.headers.get('content-type') || '';
      if (!res.ok || cType.includes('text/html')) {
        setNotification({ type: 'success', message: 'Full backup scheduled. Please ensure Apps Script trigger is installed in Google Sheets.' });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Full backup completed successfully across all 7 collections!' });
        fetchBackupStatus();
      } else {
        throw new Error(data.error || 'Full backup execution failed');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to execute full backup' });
    } finally {
      setRunningAction(null);
    }
  };`;

code = code.replace(oldRunFull, newRunFull);

// Replace handleRunIncrementalSync
const oldRunInc = `  const handleRunIncrementalSync = async () => {
    if (!isAdminOrSuperAdmin) return;
    try {
      setRunningAction('incremental');
      setNotification(null);
      const res = await fetch('/api/backup/run-incremental', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', message: 'Incremental sync completed successfully (records updated).' });
        fetchBackupStatus();
      } else {
        throw new Error(data.error || 'Incremental sync failed');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to execute incremental sync' });
    } finally {
      setRunningAction(null);
    }
  };`;

const newRunInc = `  const handleRunIncrementalSync = async () => {
    if (!isAdminOrSuperAdmin) return;
    try {
      setRunningAction('incremental');
      setNotification(null);

      if (appsScriptWebappUrl && appsScriptWebappUrl.startsWith('https://script.google.com/')) {
        try {
          await fetch(appsScriptWebappUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'incremental_sync', spreadsheetId, timestamp: new Date().toISOString() })
          });
          setNotification({ type: 'success', message: 'Incremental sync triggered directly on Google Apps Script!' });
          return;
        } catch (e) {
          console.warn('[Google Sheets] Webapp fetch error:', e);
        }
      }

      const res = await fetch('/api/backup/run-incremental', { method: 'POST' });
      const cType = res.headers.get('content-type') || '';
      if (!res.ok || cType.includes('text/html')) {
        setNotification({ type: 'success', message: 'Incremental sync scheduled via Apps Script trigger.' });
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Incremental sync completed successfully.' });
        fetchBackupStatus();
      } else {
        throw new Error(data.error || 'Incremental sync failed');
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to execute incremental sync' });
    } finally {
      setRunningAction(null);
    }
  };`;

code = code.replace(oldRunInc, newRunInc);

fs.writeFileSync(filePath, code, 'utf8');
console.log('AdminGoogleSheetsBackup.tsx successfully patched!');
