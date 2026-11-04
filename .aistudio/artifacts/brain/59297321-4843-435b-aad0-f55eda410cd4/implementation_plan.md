# Implementation Plan - Prominent Google Sheet Link & Full Data Sync

Display the active Google Sheet link prominently in the header of the Google Sheets Backup Center (`/admin/google-sheets-backup`) and implement a full data export/sync action that sends all records across the 7 Firestore collections to the sheet (overwriting/replacing existing sheet data as requested).

## 1. Scope & Features
- **Prominent Header Link**:
  - Display a live, clickable badge/button with the Google Spreadsheet URL (`https://docs.google.com/spreadsheets/d/{spreadsheetId}/edit`) right in the top header of the Admin Backup Center.
  - Show the spreadsheet ID and direct quick-copy option.
- **Full Data Sync Button ("Send Full Data to Sheet")**:
  - Executes a complete export of all 7 collections (`products`, `orders`, `inventory_logs`, `users`, `wholesale_orders`, `expenses`, `finance_transactions`) to the configured Google Spreadsheet.
  - Clears/overwrites existing sheet tabs with fresh data as requested.
- **Backend & Frontend Integration**:
  - Ensure the backend stores and returns `spreadsheetId` correctly in `/api/backup/status`.
  - Frontend triggers full sync and updates status instantly.

## 2. Step-by-Step Implementation Steps
1. Update `AdminGoogleSheetsBackup.tsx` to prominently feature the active Google Spreadsheet URL badge in the header.
2. Enhance the "Run Full Backup" / "Send Full Data" handler to send full collection data to the Google Sheet using either OAuth or backend integration.
3. Verify type checking and build successfully.
