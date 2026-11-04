# Korean Skin Food BD — Google Sheets Daily Backup

## Agreed schedule
- Full backup: every day at 01:00, Asia/Dhaka.
- Incremental sync: every 15 minutes.
- Full snapshots are copied to a Drive folder named "Korean Skin Food BD Daily Backups".
- The master spreadsheet holds the latest state; the dated copies preserve daily snapshots.

## Google Sheet
Spreadsheet: https://docs.google.com/spreadsheets/d/1K9A-EX_v_q-q_PL7fAUBAneZYZ5L4FTTrzEbWRo0G-8/edit

## Important deployment status
The spreadsheet has been created. The Apps Script runner is provided in \`apps-script/Code.gs\`.
It is not active until the secure server-side export endpoint is deployed and the Script Properties are configured. Do not paste a service-account private key or API key into this repository.

## Apps Script setup
1. Open the spreadsheet and choose Extensions → Apps Script.
2. Paste the contents of \`apps-script/Code.gs\`.
3. In Apps Script → Project Settings → Script Properties, add:
   - \`SPREADSHEET_ID\` = \`1K9A-EX_v_q-q_PL7fAUBAneZYZ5L4FTTrzEbWRo0G-8\`
   - \`BACKUP_API_URL\` = the deployed endpoint URL ending in \`/api/backup/export\`
   - \`BACKUP_API_KEY\` = a new, long random secret generated for this integration
4. Run \`installBackupTriggers\` once and approve the Google permissions.
5. Run \`runFullBackup\` manually once and inspect the Backup_Status tab before relying on the schedule.

## Required server API contract
The endpoint must be HTTPS and require the \`x-backup-key\` header. It must allow-list collections, paginate deterministically, and return:
\`\`\`json
{
  "records": [{"id":"document-id","field":"value"}],
  "nextCursor": null,
  "hasMore": false,
  "serverTime": "2026-11-04T01:00:00.000Z"
}
\`\`\`
Query parameters:
- \`collection\`: one allowed collection name
- \`mode\`: \`full\` or \`incremental\`
- \`since\`: ISO timestamp for incremental mode
- \`cursor\`: opaque pagination cursor
- \`limit\`: requested page size

The current collection allow-list in the script is a proposed starting point. Before enabling exports, verify each collection exists and confirm which data fields are appropriate to copy. In particular, customer contact/address data and finance data are sensitive; restrict the Sheet to the owner and explicitly authorized finance staff. Exclude authentication secrets, API tokens, password hashes, and service-account credentials.

## Limitations
- Google Sheets has a 10-million-cell spreadsheet limit and Apps Script execution/quota limits. Large datasets need partitioning or a Firestore-native export to Cloud Storage.
- Cloudinary files are not copied; product/media URLs remain ordinary fields.
- A Google Sheet is an operational/reporting backup, not a point-in-time database restore.
- The endpoint and scheduled automation must be deployed and tested before this is considered live.
