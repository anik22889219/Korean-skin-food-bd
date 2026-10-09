# Korean Skin Food BD — Comprehensive System Hardening Implementation Plan

## 1. System Architecture & Objectives
This implementation plan establishes enterprise-level security, data consistency, and transactional integrity for the Korean Skin Food BD platform across retail e-commerce, Point of Sale (POS), B2B Wholesale, Live Barcode Scanning, Courier Logistics, Meta CAPI Tracking, and Role-Based Access Control (RBAC).

All 6 phases have been completed, verified via automated linting (`tsc --noEmit`), compiled with Vite production build (`compile_applet`), and security rules deployed to Firebase (`deploy_firebase`).

---

## 2. Phased Implementation Breakdown

### Phase 1: Authentication & Courier Logistics Bridge [COMPLETED]
* **Objective**: Resolve 401 Unauthorized errors on Steadfast Courier consignment creation and Wholesale Order history fetching by properly propagating Firebase Bearer tokens.
* **Exact Files Targeted**:
  * `src/services/steadfastService.ts`
  * `src/services/wholesaleOrderService.ts`
* **Changes Delivered**:
  * `src/services/steadfastService.ts`: Replaced plain `fetch` with `authFetch('/api/steadfast/create-consignment')`.
  * `src/services/wholesaleOrderService.ts`: Migrated `/api/wholesale/orders` queries to `authFetch(url)`.
  * `src/services/wholesaleService.ts`: Migrated payment requests to `authFetch`.
* **Verification**: Type checks and network proxy headers verified.

---

### Phase 2: Role-Based Access Control (RBAC) Hardening Across All Tiers [COMPLETED]
* **Objective**: Enforce strict least-privilege role boundaries across UI navigation, Express backend APIs, and Firestore Security Rules. Ensure `hr`, `customer_support`, and `inventory_manager` cannot access unauthorized financial ledgers, debt adjustments, or user credential files.
* **Exact Files Targeted**:
  * `src/components/AdminLayout.tsx`
  * `server.ts`
  * `firestore.rules`
* **Changes Delivered**:
  * **Frontend Navigation & Direct URL Guards**:
    * Defined `inventoryManagerAllowedPaths`, `customerSupportAllowedPaths`, `hrAllowedPaths`.
    * Implemented direct URL redirection hooks preventing unauthorized URL entry.
  * **Backend API Guards**:
    * Created `verifyFinanceAuth` strictly permitting `['admin', 'super_admin']`.
    * Applied `verifyFinanceAuth` to `/api/finance/transfer`, `/api/finance/collect-due`, `/api/finance/transaction`, `/api/wholesale/payments`, and `/api/wholesale/orders/admin-create`.
    * Protected Slack user linking, support ticket refunds, push notifications, and Cloudinary signing.
  * **Firestore Rules**:
    * Restricted `financial_transactions`, `payment_transactions`, and `wholesale_payments` to `isAdminOrSuperAdmin()`.
* **Verification**: Full type check and rule verification completed.

---

### Phase 3: Meta Conversions API (CAPI) Durable Deduplication & Verification [COMPLETED]
* **Objective**: Eliminate in-memory loss on server restarts, prevent spoofed conversion submissions, and enforce database verification of order values and origins.
* **Exact Files Targeted**:
  * `server.ts` (`/api/tracking/meta-capi`)
* **Changes Delivered**:
  * Validates order document in `orders/{orderId}` before accepting Purchase event.
  * Strict Allow-List: only `order_source === 'WEBSITE'` can trigger CAPI purchase conversions; POS, ADMIN, MANUAL are strictly excluded.
  * Reads authoritative `totalAmount` and `items` directly from the database record rather than client payload.
  * Checks persistent `analytics.capiStatus === 'dispatched'` in Firestore.
  * Updates `analytics.capiStatus = 'dispatched'` upon successful dispatch.
* **Verification**: Tested against order schemas and server restart persistence.

---

### Phase 4: Website Checkout Server-Side Idempotency & Concurrency Hardening [COMPLETED]
* **Objective**: Prevent duplicate orders from double-clicks or network retries, route website checkouts through server-side transaction validation, and ensure idempotency.
* **Exact Files Targeted**:
  * `src/context/CartContext.tsx`
  * `src/components/MainLayout.tsx`
  * `server.ts` (`/api/functions/placeOrder`)
* **Changes Delivered**:
  * `src/context/CartContext.tsx`: Added `isSubmitting` state, generated unique client idempotency keys (`idem_web_${userId || 'guest'}_${Date.now()}_${cartChecksum}`), and wired checkout to `/api/functions/placeOrder`.
  * `src/components/MainLayout.tsx`: Connected `disabled={isSubmitting}` to the Order Now button with loading spinner and disabled styling to prevent double-click submissions.
  * `server.ts`: Server-side transactional checkout locks stock, validates prices, records `payment_idempotency/{idempotencyKey}`, and returns existing orders idempotently on duplicate requests.
* **Verification**: Tested submission state and idempotency checks.

---

### Phase 5: Unified Inventory Fulfillment & Concurrency Consistency [COMPLETED]
* **Objective**: Eliminate race conditions during online order fulfillment and unify inventory accounting logs across POS, Wholesale, and Website.
* **Exact Files Targeted**:
  * `src/services/posService.ts`
  * `firestore.rules`
* **Changes Delivered**:
  * `posService.ts`: Pre-fulfillment barcode validation, catalog stock re-verification, atomic stock deduction, and synchronized `inventory_logs` and `stock_movements`.
  * `firestore.rules`: Added strict schema validation on `orders.create`:
    * `status in ['pending', 'unpaid']`
    * `items.size() > 0`
    * `totalAmount >= 0`
* **Verification**: Verified transaction integrity and rule constraints.

---

### Phase 6: Full Verification, Linting & Build Verification [COMPLETED]
* **Objective**: Validate the entire application bundle, confirm zero regressions, and ensure all services are operational.
* **Automated Verification Results**:
  * `lint_applet` (`tsc --noEmit`): **0 errors (Pass)**
  * `compile_applet` (Vite production bundle): **Build succeeded (Pass)**
  * `deploy_firebase`: **Firestore security rules deployed successfully (Pass)**
  * Dev Server: **Running & responsive on port 3000 (`/api/health` status: ok)**
