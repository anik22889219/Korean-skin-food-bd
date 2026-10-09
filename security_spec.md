# Full Website Security Specification & Threat Audit

## 1. System Context & Assets
**Target Application**: Korean Skin Food BD (E-commerce, B2B Wholesale Portal, Creator Affiliate Hub, POS Register, Slack Ops, Steadfast Courier, Meta Conversions API & Gemini AI integrations).

---

## 2. Security Audit Findings & Vulnerabilities Identified

### A. Critical Severity: Permissive Firestore Security Rules
1. **Unprotected Product & Catalog Writes**: `products`, `taxonomies`, `brands`, and `categories` had unrestricted `allow write: if true;`. An unauthenticated threat actor could alter prices, modify stock to zero, delete catalog records, or inject malicious XSS payloads.
2. **Order PII Leak & Tampering**: `orders/{orderId}` had `allow read, write: if true;`. An unauthenticated visitor could dump all customer names, phone numbers, delivery addresses, order quantities, and payment details (GDPR/PII violation) or cancel/fake orders.
3. **Customer Database PII Leak**: `users/{userId}` allowed public read access (`allow read: if true;`), allowing external scrapers to harvest customer phone numbers, addresses, credit limits, and outstanding debt.
4. **Unsecured Internal Operations & Ledgers**: Collections `inventory_logs`, `stock_movements`, `stock_receipts`, `financial_transactions`, `payment_transactions`, `wholesale_payments`, `wholesale_customers`, `audit_logs`, `pos_sessions` permitted `allow read, write: if true;`.
5. **Email Spoofing Gate**: Helper function `isStaff()` inspected `request.auth.token.email` without requiring `request.auth.token.email_verified == true`. An attacker registering an unverified account with the admin address could attempt to bypass the gate.
6. **Missing Rules for Creator Reels**: The active collection `creator_reels` was absent from `firestore.rules`.

### B. High Severity: Unprotected Backend Server Routes (`server.ts`)
1. **Unauthenticated Financial Mutations**: `/api/finance/collect-due`, `/api/finance/transfer`, and `/api/finance/transaction` accepted requests without verifying caller credentials or staff roles.
2. **Unauthenticated Wholesale Ledger Actions**: `/api/wholesale/payments`, `/api/wholesale/orders/admin-create`, `/api/wholesale/orders/:orderId/cancel`, and `/api/wholesale/orders/:orderId/status` allowed unauthenticated access to modify debts and status.
3. **Unrestricted Push Broadcasts**: `/api/notifications/send-push` lacked authorization, enabling spam push notifications to all users.
4. **Exposed Test Fixture Endpoint**: `/api/test/wholesale-inventory-runner` allowed unauthenticated users to create test documents in production Firestore.
5. **Cloudinary Signature Abuse**: `/api/cloudinary/sign` lacked authentication verification, enabling unauthorized users to consume media storage bandwidth.
6. **Ticket Refunds without Auth**: `/api/slack/support-tickets/:id/refund` lacked verification checks.

### C. High Severity: Denial-of-Wallet & DoS Risks
1. **Missing Rate Limiting**: AI endpoints (`/api/gemini/*`, `/api/chatbot`) had no rate limiter, leaving the application vulnerable to rapid API quota depletion and high costs.
2. **Missing Checkout Throttling**: Retail and wholesale checkout endpoints lacked IP rate limiting.

### D. Medium Severity: Missing HTTP Security Headers
1. Missing `X-Content-Type-Options: nosniff`.
2. Missing `Referrer-Policy: strict-origin-when-cross-origin`.
3. Missing modern `X-XSS-Protection: 0`.
4. Missing API cache prevention headers (`Cache-Control: no-store`).

---

## 3. Data Invariants

1. **Catalog Integrity**: Only verified staff accounts can mutate products, categories, taxonomies, and brands.
2. **PII Isolation**: Customer user profile documents (`users/{userId}`) can only be read by verified staff or the document owner (`request.auth.uid == userId`).
3. **Order Privacy**: Retail and wholesale orders can only be listed and read by staff or the specific customer (`customer_uid == request.auth.uid` or `userId == request.auth.uid`).
4. **Ledger Immutability**: Financial transactions, inventory logs, stock receipts, and wholesale payment records are exclusively writable by verified staff and backend server transactions.
5. **Role Escalation Block**: Regular users cannot self-assign staff roles (`super_admin`, `admin`, `inventory_manager`, `hr`) or alter credit limits during profile creation or update.
6. **Creator Metrics Protection**: Creators can update their public profile metadata (bio, social links, display name), but cannot modify their own points, view counts, likes, or tier levels.
7. **Rate Limit Invariant**: Clients exceeding defined thresholds (30 AI calls/min, 15 checkouts/min) receive HTTP 429 Too Many Requests with a `Retry-After` header.

---

## 4. The "Dirty Dozen" Adversarial Payloads & Invariants

1. **Payload 1 (Privilege Escalation on Signup)**:
   - Request: Create `users/attacker_uid` with `{ role: "super_admin", creditLimit: 500000 }`
   - Expected Result: `PERMISSION_DENIED`
2. **Payload 2 (Ghost Field Shadow Update)**:
   - Request: Update `users/user_uid` with `{ wholesaleAccess: true, isVerified: true }`
   - Expected Result: `PERMISSION_DENIED`
3. **Payload 3 (Unverified Email Spoofing)**:
   - Request: Mutate `products/cosrx-snail` with token `email: 'koreanskinfood.bd@gmail.com', email_verified: false`
   - Expected Result: `PERMISSION_DENIED`
4. **Payload 4 (Unauthorized PII Harvesting)**:
   - Request: Non-staff user `GET /users/victim_user_id`
   - Expected Result: `PERMISSION_DENIED`
5. **Payload 5 (Unauthenticated Order Deletion)**:
   - Request: `DELETE /orders/ORD-12345` without authentication
   - Expected Result: `PERMISSION_DENIED`
6. **Payload 6 (Creator Metric Poisoning)**:
   - Request: Creator updates `/creators/my_uid` with `{ totalPoints: 999999, level: 10 }`
   - Expected Result: `PERMISSION_DENIED`
7. **Payload 7 (Unauthenticated Financial Tampering)**:
   - Request: `POST /api/finance/transfer` with `{ amount: 100000, fromAccount: "CASH_REGISTER", toAccount: "ATTACKER" }` without Bearer token
   - Expected Result: `401 Unauthorized`
8. **Payload 8 (Wholesale Ledger Forgery)**:
   - Request: `POST /api/wholesale/payments` without verified staff token
   - Expected Result: `401 Unauthorized` / `403 Forbidden`
9. **Payload 9 (Rogue Push Broadcast)**:
   - Request: `POST /api/notifications/send-push` with phishing URL and no auth
   - Expected Result: `401 Unauthorized`
10. **Payload 10 (Direct Catalog Price Defacement)**:
    - Request: Anonymous write to `products/round-lab-sunscreen` with `{ price: 1 }`
    - Expected Result: `PERMISSION_DENIED`
11. **Payload 11 (Denial-of-Wallet Gemini Flooding)**:
    - Request: Rapid burst of 50 requests in 10 seconds to `/api/gemini/translate-name`
    - Expected Result: `429 Too Many Requests`
12. **Payload 12 (Cross-User Wholesale Order Cancellation)**:
    - Request: Customer A attempts `POST /api/wholesale/orders/ord_customer_b/cancel`
    - Expected Result: `403 Forbidden`
