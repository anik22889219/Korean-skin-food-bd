# Implementation Plan - Google Sheets Backup Center Integration

Complete and production-harden the Google Sheets automated backup system and integrate the Google Sheets Backup Center into the Korean Skin Food BD Admin Dashboard at `/admin/google-sheets-backup`.

## 1. Scope & Architecture
- **Backend API (`server.ts` or `backupApi.ts`)**:
  - Secure endpoints for running full backup and incremental sync.
  - Authentication check for `admin` / `super_admin` role via Firebase Admin SDK / session token.
  - Support for 7 collections: `products`, `orders`, `inventory_logs`, `users`, `wholesale_orders`, `expenses`, `finance_transactions`.
  - Pagination and cursor-based incremental sync using `updatedAt` / `createdAt` fields to avoid missing modified documents.
  - Live collection record counting and backup status tracking.
- **Google Apps Script (`apps-script/Code.gs` or similar template/generator)**:
  - Functions: `installBackupTriggers()`, `runFullBackup()`, `runIncrementalSync()`, `getBackupStatus()`, `getBackupHistory()`, `runManualBackup()`.
  - Auto-create Google Spreadsheet if not already created.
  - Maintain `Backup_Status` sheet, backup history, and per-collection record counts.
  - Script Properties: `SPREADSHEET_ID`, `BACKUP_API_URL`, `BACKUP_API_KEY`.
- **Admin Dashboard UI (`/src/components/AdminGoogleSheetsBackup.tsx` & Router/Layout)**:
  - Route: `/admin/google-sheets-backup`.
  - Protected by admin role check (`admin` / `super_admin` only).
  - Overview cards: Connection Status, Last Full Backup, Last Incremental Sync, Total Records Backed Up, Next Scheduled Backup.
  - Collection table: Products, Orders, Inventory Logs, Customers, Wholesale Orders, Expenses, Finance Transactions with live counts and timestamps.
  - Action buttons: Run Full Backup, Run Incremental Sync, Refresh Status, Open Google Spreadsheet, Open Apps Script.
  - In-app logs and failure alerts view.

## 2. Step-by-Step Implementation Steps

### Step 1: Backend API & Service Hardening
- Inspect existing server code (`server.ts` or backend backup routes) and ensure robust error handling, rate limiting, and secure authentication with `BACKUP_API_KEY` and Firebase Admin SDK.
- Implement reliable incremental sync endpoint supporting cursors and tombstone/deletion tracking if needed.
- Expose endpoints for fetching collection record counts and backup logs.

### Step 2: Google Apps Script Code Template & Setup Guide
- Provide complete Google Apps Script code for auto-creating spreadsheets, managing triggers (Full backup daily at 1:00 AM Asia/Dhaka, incremental sync every 15 mins), and posting/fetching status from the backend API.
- Provide step-by-step deployment and configuration instructions for Google Apps Script and Script Properties.

### Step 3: Admin Dashboard Backup Center Page
- Build `AdminGoogleSheetsBackup.tsx` component with live stats, collection summary table, action triggers with confirmation modals, and real-time execution logs/notifications.
- Register the route `/admin/google-sheets-backup` in `AdminLayout.tsx` and `App.tsx`.
- Restrict access strictly to `admin` and `super_admin` roles.

### Step 4: Verification & Testing
- Run TypeScript type check (`npx tsc --noEmit`) and production build (`npm run build`).
- Verify API endpoint auth and permissions.
