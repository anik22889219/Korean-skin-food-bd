# Admin Wholesale Order Form: Custom Order Date System & Multi-Hub Synchronization

Add a custom date selection system to the Admin Dashboard's Create Wholesale Order modal (`AdminWholesaleOrderModal.tsx`). This allows administrators to set past or custom order dates (e.g., for backdated billing, WhatsApp phone orders, offline reconciliations, or previous consignments) and guarantees seamless synchronization across Wholesale Order History, Wholesale Customer Ledger, Order Management & Fulfillment Hub, Business Banking, and Master Analytics Reports.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Decisions from Phase 1 Clarification**:
> - **Date Input Format**: Date-only selector (`YYYY-MM-DD`) defaulting to the current date (`new Date().toISOString().split('T')[0]`), equipped with an ergonomic calendar picker and intuitive quick-action presets ("Today", "Yesterday").
> - **Ledger & Accounting Synchronization**: The chosen custom date will automatically synchronize across the order record (`createdAt`, `orderDate`), the advance payment document in `wholesale_payments`, and the financial ledger entries, ensuring that historical accounts, daily P&L, customer ledgers, and cash flow reports reflect the exact commercial date of the transaction.
> - **Display & Chronological Sorting**: All downstream views (`WholesaleCustomerDetailsPage`, `WholesaleLedgerModal`, `AdminOrders`, `AdminReportsPage`, and `AdminBusinessFinance`) will utilize this date for chronologically accurate listing, date-range filtering, and invoice generation.

---

## 1. Overview & Core Concept

- **What It Does**: Introduces a dedicated "Order Date" control in the Admin Wholesale Order modal. While orders placed by wholesalers through the self-service portal default to the exact moment of checkout, administrators frequently need to enter wholesale orders that occurred earlier (e.g. negotiated via phone or WhatsApp, processed offline at the warehouse, or reconciled at the end of the week). This feature ensures orders can be timestamped accurately without manual database edits.
- **Target Audience / Persona**: Store administrators, wholesale account managers, and accounting staff entering and reconciling B2B transactions.
- **Key Value**:
  - Eliminates reconciliation mismatches between physical courier dispatches and system timestamps.
  - Keeps wholesale customer ledgers, payment timelines, and receivables aging aligned with actual business events.
  - Automatically feeds accurate dates into the Order Management & Fulfillment Hub, PDF Invoices, and Master Analytics.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│              ADMIN CREATE WHOLESALE ORDER: CUSTOM DATE FLOW            │
│                                                                        │
│  [Step 1: Modal Initialization]                                        │
│       │ Default Order Date set to current date: YYYY-MM-DD             │
│       ▼ Quick badge: "Today" active                                    │
│                                                                        │
│  [Step 2: Adjust Order Date (Optional)]                                │
│       ├─► Click "Yesterday" button for instant 1-day backdate          │
│       └─► Click Date Input to open native calendar picker              │
│       │                                                                │
│       ▼ Visual indicator displays formatted date (e.g. "18 Oct 2026")  │
│                                                                        │
│  [Step 3: Complete Products, Shipping & Payment]                       │
│       ▼ Items added via Search or POS Barcode Scanner                  │
│       ▼ Advance payment entered (Cash / bKash / Bank Transfer)         │
│                                                                        │
│  [Step 4: Submission & Multi-Hub Synchronization]                      │
│       ├─► `wholesale_orders` created with `createdAt` = custom date    │
│       ├─► `wholesale_payments` recorded with `createdAt` = custom date │
│       ├─► Inventory logs & stock movements tagged with custom date     │
│       └─► Financial ledger and receivables reflect the transaction date │
│                                                                        │
│  [Step 5: Immediate Downstream Visibility]                             │
│       ├─► Wholesale Customer Details: Appears in Order History on date │
│       ├─► Wholesale Ledger Modal: Payment row displays custom date     │
│       ├─► Admin Orders Hub: Listed and sorted by custom date           │
│       ├─► Admin Reports & Analytics: Counted within date-range filters  │
│       └─► PDF Invoice Document: Prints order date on invoice header    │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme (SaaS Dashboard & Enterprise Polish)

Adhering strictly to the **Universal Frontend Design Constitution** and **SaaS Dashboard Design Guidelines**:
- **Zero-Pill Discipline**: No decorative candy pills or floating badges around dates. Order dates are displayed as clean, unboxed text formatted with subtle typographic separators (`·` or `/`) and tabular numerals (`font-mono tabular-nums`).
- **Typography & Placement**:
  - The custom date control will be positioned in the **Order Setup & Customer Details** section of `AdminWholesaleOrderModal.tsx`, alongside customer selection and order notes.
  - Clear label with `text-xs font-semibold text-slate-700` and optional subtle helper text (`"Defaults to today. Change to backdate this transaction."`).
  - Native `<input type="date" />` styled with a clean `border border-slate-300`, `rounded-xl`, subtle focus ring (`focus:ring-2 focus:ring-[#E91E8C]/20 focus:border-[#E91E8C]`), and accompanied by quick-select text buttons (`"Today"`, `"Yesterday"`).
- **Tabular Figures & Scannability**: In tables across `WholesaleCustomerDetailsPage` and `WholesaleLedgerModal`, date columns will use `font-mono tabular-nums text-slate-600 text-xs` for vertical alignment.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Date-Only Input (`YYYY-MM-DD`) with Context-Aware ISO Generation
- **Chosen Approach**: Present a clean date-only input (`YYYY-MM-DD`). Upon submission, the service constructs a full ISO string by combining the chosen date with the current time of day (`new Date(orderDate + 'T' + currentTime)`).
- **Why**: Date-only selectors provide the cleanest ergonomics without forcing admins to pick arbitrary hours and minutes. Preserving the current time of day avoids UTC date-shift bugs when viewing dates in local time zones (e.g. BST +06:00).
- **Alternatives Considered**: Full datetime-local picker (cluttered and unnecessary for daily accounting) vs manual text input (prone to parse errors).

### Decision 2: Harmonized `createdAt` and Explicit `orderDate`
- **Chosen Approach**: Store both `orderDate: "YYYY-MM-DD"` and set `createdAt: customDateIso` on the created wholesale order document, while keeping `updatedAt: nowIso` as the audit record of when the entry was physically saved.
- **Why**: Setting `createdAt` to the custom date ensures zero breaking changes across all existing components (`AdminOrders`, `AdminReportsPage`, `AdminPaymentsDue`, `WholesaleCustomerDetailsPage`), because all these modules already query and sort by `createdAt`. Adding the explicit `orderDate` string provides a clean, time-zone-independent date field for fast formatting.

### Decision 3: Advance Payment and Financial Synchronization
- **Chosen Approach**: When an admin records an advance payment alongside the order (`paidAmount > 0`), the corresponding `wholesale_payments` record will inherit the custom date for `createdAt` and `paymentDate`.
- **Why**: Prevents accounting discrepancies where an order appears on Monday but its advance payment appears on Friday. Keeps customer ledger balances and cash flow reports synchronized.

---

## 4. Technical Architecture & Data Strategy

### Component Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW & SYNC MATRIX                         │
│                                                                        │
│  AdminWholesaleOrderModal.tsx                                          │
│     │                                                                  │
│     │  [orderDate state: "YYYY-MM-DD"]                                 │
│     ▼                                                                  │
│  wholesaleOrderService.createAdminWholesaleOrder(params)               │
│     │                                                                  │
│     ├──► Resolves customDateIso from params.orderDate                  │
│     │                                                                  │
│     ├──► 1. `wholesale_orders` Collection                              │
│     │       {                                                          │
│     │         id: "ws-ord-...",                                        │
│     │         orderNumber: "WSO-...",                                  │
│     │         orderDate: "2026-10-18",                                 │
│     │         createdAt: "2026-10-18T10:30:00.000Z",                   │
│     │         updatedAt: "2026-10-20T06:19:00.000Z",                   │
│     │         ...                                                      │
│     │       }                                                          │
│     │                                                                  │
│     ├──► 2. `wholesale_payments` Collection (If paidAmount > 0)        │
│     │       {                                                          │
│     │         id: "wp-...",                                            │
│     │         orderId: "ws-ord-...",                                   │
│     │         paymentDate: "2026-10-18",                               │
│     │         createdAt: "2026-10-18T10:30:00.000Z",                   │
│     │         amount: 5000,                                            │
│     │         ...                                                      │
│     │       }                                                          │
│     │                                                                  │
│     ├──► 3. `inventory_logs` & `stock_movements`                       │
│     │       {                                                          │
│     │         timestamp: "2026-10-18T10:30:00.000Z",                   │
│     │         createdAt: "2026-10-18T10:30:00.000Z",                   │
│     │         ...                                                      │
│     │       }                                                          │
│     │                                                                  │
│     ▼                                                                  │
│  Downstream Consuming Hubs                                             │
│     ├─► WholesaleCustomerDetailsPage (Wholesale Order History Table)   │
│     ├─► WholesaleLedgerModal (Payment History Table & Ledger)          │
│     ├─► AdminOrders (Order Management & Steadfast Dispatch Hub)        │
│     ├─► AdminReportsPage (Date Range Filter & P&L Analytics)           │
│     ├─► AdminBusinessFinance & AdminPaymentsDue (Receivables & Dues)   │
│     └─► InvoiceDocument & PDF Generator (Invoice Date on Printed Slip) │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Updates

In `src/types.ts`:
```typescript
export interface WholesaleOrder {
  id: string;
  orderNumber: string;
  orderDate?: string; // YYYY-MM-DD custom commercial date
  customer: WholesaleOrderCustomer;
  items: WholesaleOrderProduct[];
  // ... existing fields
  createdAt: string;
  updatedAt: string;
}

export interface WholesalePayment {
  id: string;
  wholesaleCustomerId: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: string; // YYYY-MM-DD
  reference?: string;
  note?: string;
  createdBy: string;
  orderId?: string;
  orderNumber?: string;
  previousDue?: number;
  remainingDue?: number;
  createdAt: string;
}
```

In `src/services/wholesaleOrderService.ts`:
```typescript
export interface CreateAdminWholesaleOrderParams {
  customerId: string;
  orderDate?: string; // YYYY-MM-DD custom date input
  customerName?: string;
  businessName?: string;
  phone?: string;
  items: CreateWholesaleOrderItemInput[];
  checkoutInfo?: { ... };
  shippingAddress: { ... };
  // ...
}
```

---

## 5. Execution Steps (Ready to Implement upon Approval)

1. **Update Types (`src/types.ts`)**:
   - Add optional `orderDate?: string` to `WholesaleOrder` and `paymentDate?: string` to `WholesalePayment`.
2. **Update Wholesale Order Service (`src/services/wholesaleOrderService.ts`)**:
   - Add `orderDate?: string` to `CreateAdminWholesaleOrderParams`.
   - Calculate ISO timestamp for `createdAt` based on `params.orderDate` (defaulting to current time if omitted).
   - Set `createdAt` and `paymentDate` on any generated `wholesale_payments` document to match the custom order date.
   - Set `createdAt` and `timestamp` on inventory logs and stock movements.
3. **Enhance Admin Wholesale Order Modal (`src/components/AdminWholesaleOrderModal.tsx`)**:
   - Add `orderDate` state defaulting to today's date (`new Date().toISOString().split('T')[0]`).
   - Add a clean, accessible UI input field with a calendar icon and quick presets ("Today", "Yesterday").
   - Include `orderDate` in the submission payload sent to `wholesaleOrderService.createAdminWholesaleOrder`.
4. **Update Downstream Displays & Invoices**:
   - Ensure `WholesaleCustomerDetailsPage.tsx` and `InvoiceDocument.tsx` format and display `order.orderDate || order.createdAt` with graceful fallback.
   - Verify `WholesaleLedgerModal.tsx` lists payments with proper date display.
5. **Verification & Build Check**:
   - Run `compile_applet` and `lint_applet` to confirm zero compilation or lint errors.
   - Verify modal behavior and date filtering consistency across all modules.
