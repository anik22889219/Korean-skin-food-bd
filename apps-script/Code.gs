/**
 * Korean Skin Food BD — Google Sheets backup runner
 *
 * Script Properties required:
 *   BACKUP_API_URL  e.g. https://YOUR-API-HOST/api/backup/export
 *   BACKUP_API_KEY  long random secret; never commit it
 *   SPREADSHEET_ID  Google Sheet ID
 *
 * Schedule: full snapshot daily at 01:00 Asia/Dhaka; incremental sync every 15 min.
 * The API must return paginated, allow-listed Firestore documents.
 */

const KSF = {
  TIMEZONE: "Asia/Dhaka",
  PAGE_SIZE: 300,
  INCREMENTAL_MINUTES: 15,
  COLLECTIONS: [
    "products",
    "orders",
    "inventory_logs",
    "users",
    "wholesale_orders",
    "expenses",
    "finance_transactions"
  ],
  STATUS_TAB: "Backup_Status",
  ARCHIVE_FOLDER: "Korean Skin Food BD Daily Backups"
};

function installBackupTriggers() {
  const props = PropertiesService.getScriptProperties();
  ["BACKUP_API_URL", "BACKUP_API_KEY", "SPREADSHEET_ID"].forEach(k => {
    if (!props.getProperty(k)) throw new Error("Missing Script Property: " + k);
  });

  ScriptApp.getProjectTriggers().forEach(t => {
    if (["runFullBackup", "runIncrementalSync"].includes(t.getHandlerFunction())) {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger("runFullBackup").timeBased().everyDays(1).atHour(1).inTimezone(KSF.TIMEZONE).create();
  ScriptApp.newTrigger("runIncrementalSync").timeBased().everyMinutes(KSF.INCREMENTAL_MINUTES).create();
  writeStatus_("Scheduler installed", "Daily full backup 01:00 Asia/Dhaka; incremental sync every 15 minutes");
}

function runFullBackup() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error("Another backup is running");
  const started = new Date();
  try {
    const ss = getSpreadsheet_();
    const counts = {};
    KSF.COLLECTIONS.forEach(collection => {
      const rows = fetchAll_(collection, "full", null);
      writeCollection_(ss, collection, rows);
      counts[collection] = rows.length;
    });

    const stamp = Utilities.formatDate(new Date(), KSF.TIMEZONE, "yyyy-MM-dd_HHmm");
    const folder = getOrCreateFolder_(KSF.ARCHIVE_FOLDER);
    DriveApp.getFileById(ss.getId()).makeCopy("KSF_Full_Backup_" + stamp, folder);

    PropertiesService.getScriptProperties().setProperty("LAST_FULL_BACKUP_AT", new Date().toISOString());
    PropertiesService.getScriptProperties().setProperty("LAST_SYNC_AT", new Date().toISOString());
    writeStatus_("Full backup successful", JSON.stringify({startedAt: started.toISOString(), counts: counts}));
  } catch (err) {
    writeStatus_("Full backup failed", String(err && err.stack || err));
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function runIncrementalSync() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const props = PropertiesService.getScriptProperties();
    const since = props.getProperty("LAST_SYNC_AT");
    if (!since) {
      writeStatus_("Incremental sync skipped", "Run the first full backup before incremental sync.");
      return;
    }
    const ss = getSpreadsheet_();
    const totals = {};
    KSF.COLLECTIONS.forEach(collection => {
      const changed = fetchAll_(collection, "incremental", since);
      upsertCollection_(ss, collection, changed);
      totals[collection] = changed.length;
    });
    props.setProperty("LAST_SYNC_AT", new Date().toISOString());
    writeStatus_("Incremental sync successful", JSON.stringify({since: since, changed: totals}));
  } catch (err) {
    writeStatus_("Incremental sync failed", String(err && err.stack || err));
    throw err;
  } finally {
    lock.releaseLock();
  }
}

function fetchAll_(collection, mode, since) {
  const all = [];
  let cursor = null;
  do {
    const payload = callApi_({collection: collection, mode: mode, since: since, cursor: cursor, limit: KSF.PAGE_SIZE});
    if (!payload || !Array.isArray(payload.records)) throw new Error("Invalid API response for " + collection);
    payload.records.forEach(record => all.push(record));
    cursor = payload.nextCursor || null;
    if (payload.hasMore && !cursor) throw new Error("API says more pages exist but returned no cursor");
  } while (cursor);
  return all;
}

function callApi_(params) {
  const props = PropertiesService.getScriptProperties();
  const base = props.getProperty("BACKUP_API_URL");
  const key = props.getProperty("BACKUP_API_KEY");
  const query = Object.keys(params).filter(k => params[k] !== null && params[k] !== undefined)
    .map(k => encodeURIComponent(k) + "=" + encodeURIComponent(String(params[k]))).join("&");
  const response = UrlFetchApp.fetch(base + "?" + query, {
    method: "get",
    headers: {"x-backup-key": key, "Accept": "application/json"},
    muteHttpExceptions: true
  });
  const code = response.getResponseCode();
  if (code < 200 || code >= 300) throw new Error("Backup API HTTP " + code + ": " + response.getContentText().slice(0, 500));
  return JSON.parse(response.getContentText());
}

function writeCollection_(ss, collection, records) {
  const sheet = getOrCreateSheet_(ss, tabName_(collection));
  sheet.clearContents();
  const rows = normalizeRows_(records);
  if (!rows.length) {
    sheet.getRange(1, 1, 1, 1).setValue("No records");
    return;
  }
  sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  sheet.setFrozenRows(1);
}

function upsertCollection_(ss, collection, records) {
  if (!records.length) return;
  const sheet = getOrCreateSheet_(ss, tabName_(collection));
  const existing = sheet.getDataRange().getValues();
  const headers = existing.length ? existing[0].map(String) : [];
  const keyIndex = headers.indexOf("id");
  if (keyIndex < 0) {
    writeCollection_(ss, collection, fetchAll_(collection, "full", null));
    return;
  }
  const rowById = new Map();
  for (let i = 1; i < existing.length; i++) rowById.set(String(existing[i][keyIndex]), i + 1);
  records.forEach(record => {
    const normalized = normalizeRows_([record]);
    const row = normalized[1];
    const id = String(record.id || record._id || "");
    if (!id) return;
    const targetRow = rowById.get(id);
    if (targetRow) sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
    else sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  });
}

function normalizeRows_(records) {
  if (!records.length) return [];
  const keys = Array.from(new Set(records.flatMap(r => Object.keys(r)))).sort();
  const rows = [keys];
  records.forEach(record => rows.push(keys.map(k => {
    const value = record[k];
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return JSON.stringify(value);
    return value;
  })));
  return rows;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID"));
}
function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function tabName_(name) {
  return name.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 90);
}
function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
}
function writeStatus_(status, details) {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss, KSF.STATUS_TAB);
  if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "Status", "Details"]);
  sheet.appendRow([Utilities.formatDate(new Date(), KSF.TIMEZONE, "yyyy-MM-dd HH:mm:ss"), status, details]);
}
