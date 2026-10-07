# Wholesaler Management & Admin Quick Order System

Comprehensive Super Admin Wholesaler Management hub providing full profile and business editing capabilities, plus an integrated Quick Order creation suite with live catalog search, custom wholesale pricing overrides, stock validation, and automated financial ledger sync.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following core design and architectural choices have been aligned based on user clarification:

- **Wholesaler Profile Editing**: Full-featured Edit Modal/Drawer directly accessible from the Wholesale Management table and detail pages. Enables Super Admins to update owner information, business name, phone/email, physical address, social links, credit limit, minimum order quantities, status (`active`, `pending`, `suspended`), and custom tier discounts.
- **Admin Quick Order Creation**: Dedicated Quick Order Modal that allows Super Admin to select a wholesaler, search the live product catalog by SKU/name/category, adjust order quantities with real-time stock guards, customize per-item wholesale pricing if necessary, and apply custom notes or delivery tracking numbers.
- **Automated Ledger & Financial Sync**: Upon order submission, the system automatically creates the `wholesale_orders` record, decrements live product inventory, generates a ledger transaction debit, records any upfront/advance payment credit, recalculates `totalWholesalePurchase`, `totalPaid`, and `totalDue`, and offers one-click printable invoices.

---

## 1. Overview & Core Concept

- **What It Does**: Empowers Korean Skin Food administrators and Super Admins to manage B2B wholesale partners from a single control plane. Admins can update partner profiles, verify documentation, alter credit parameters, and place manual wholesale orders on behalf of partners directly from the dashboard.
- **Target Audience / Persona**: Super Admins and B2B Operations Managers overseeing wholesale accounts, inventory allocation, bulk shipments, and credit accounts.
- **Key Value**: Eliminates manual friction between sales and warehouse dispatch by uniting wholesale profile maintenance, fast itemized ordering, inventory deduction, and credit ledger accounting in real time.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Wholesaler Profile & Setting Edit**:
   - Super Admin navigates to `/admin/wholesale`.
   - Clicks **Edit Profile** on any wholesaler row or from the `/admin/wholesale/:customerId` detail view.
   - A structured Edit Drawer/Modal opens with organized sections:
     - *Basic & Contact Info*: Name, Business/Shop Name, Facebook Page, Phone, Email, Trade License / TIN info.
     - *Shipping & Logistics*: Delivery Address, City/Zone, Preferred Courier (e.g. Steadfast / Pathao / Hub).
     - *Financial & Tier Rules*: Credit Limit (৳), Custom Wholesale Tier Discount (%), Account Status (`active` / `pending` / `suspended`), and Wholesale Catalog Access toggle.
   - Admin saves changes; Firestore updates immediately with defensive payload validation and toast confirmation.

2. **Admin Quick Wholesale Order Creation**:
   - Admin clicks the **+ Create Wholesale Order** button (available in the main table toolbar or within a specific customer's profile).
   - In the modal, if not preselected, the Admin chooses the target Wholesaler from an auto-completing selector.
   - **Product Search & Add**:
     - Live search bar with keyboard navigation across all products with real-time in-stock counts.
     - Adding a product inserts a line item showing: Thumbnail, Title, SKU, Current Stock, Unit Wholesale Price (editable by Admin for custom deal pricing), Quantity counter, and Subtotal.
     - Out-of-stock items or quantities exceeding inventory show instant warnings.
   - **Order Summary & Financial Breakdown**:
     - Subtotal calculation, custom shipping fee input, additional discount/adjustment field, and Grand Total.
     - **Payment Breakdown**: Admin specifies Paid Amount (Advance) and Payment Method (Bank Transfer, bKash/Nagad, Cash, or Credit/Due).
     - Balance Due is calculated live (`Grand Total - Paid Amount`).
   - **Submission & Execution**:
     - Admin clicks **Confirm & Create Order**.
     - Atomic/batch transaction writes the order to `wholesale_orders`, creates ledger entry in `wholesale_ledger`, updates customer totals (`totalDue`, `totalPaid`, `totalWholesalePurchase`), and decrements product stock.
     - A success modal displays the order ID with options to **Print Invoice**, **View Ledger**, or **Create Another**.

### Visual Identity & Theme

- **Palette**: Professional B2B palette rooted in clean slate neutral backgrounds (`bg-slate-50`), crisp white card surfaces (`bg-white`), indigo/blue accents (`text-indigo-600`, `bg-indigo-600`), emerald metrics for revenue/paid (`text-emerald-600`), and amber/rose alerts for credit due (`text-rose-600`).
- **Typography**: Crisp display headers with `Plus Jakarta Sans` / `Inter`, accompanied by strict monospace tabular figures (`font-mono tabular-nums`) for currency amounts, SKUs, inventory counts, and order timestamps.
- **Anti-Slop Discipline**: Zero decorative pill badge clusters; unboxed metadata separated by typographic dots (`·`); clean single-elevation card surfaces with hairline borders (`border-slate-200`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Modular Edit Modal vs. Separate Route**
  - *Chosen Approach*: Comprehensive Modal/Drawer reusable in both `/admin/wholesale` and `/admin/wholesale/:customerId`.
  - *Why*: Allows rapid edits without losing context or pagination state on the main management table, while maintaining deep detail inspection on the single customer view.
  - *Alternatives Considered*: Navigating to a separate `/admin/wholesale/:id/edit` full page (slower for multi-partner management).

- **Decision 2: Admin Direct Order vs. Proxy Cart Simulation**
  - *Chosen Approach*: Streamlined Quick Order Modal with direct product search and custom pricing inputs.
  - *Why*: Wholesalers often negotiate custom bulk unit rates or shipping adjustments over phone/WhatsApp. A direct admin order builder allows pricing overrides and custom advance payments without tampering with the standard customer cart session.
  - *Alternatives Considered*: Switching user session to impersonate the customer in the storefront cart (cumbersome and risk of cart collision).

- **Decision 3: Financial Ledger Synchronization**
  - *Chosen Approach*: Single transactional workflow creating the order record, recording any immediate payment in the ledger, and updating aggregated customer financial fields.
  - *Why*: Prevents discrepancy between order totals and ledger due statements, guaranteeing auditability for both admin and customer.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Admin Wholesale Hub                             │
│       (/admin/wholesale  &  /admin/wholesale/:customerId)              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│  WholesaleEditCustomerModal     │       │     AdminWholesaleOrderModal     │
│  - Business & Owner Info        │       │  - Wholesaler Selector           │
│  - Address & Courier Logistics  │       │  - Live Catalog Search & SKU     │
│  - Credit Limits & Tier Rates   │       │  - Quantity & Stock Validation   │
│  - Status & Access Control      │       │  - Custom Wholesale Price Adjust │
└────────────────┬────────────────┘       │  - Advance Payment & Balance Due │
                 │                        └──────────────────┬───────────────┘
                 │                                           │
                 ▼                                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                    Wholesale & Order Service Layer                         │
│  - wholesaleService.adminUpdateWholesaleCustomer()                        │
│  - wholesaleOrderService.createAdminWholesaleOrder()                       │
│  - wholesaleLedgerService.recordOrderDebitAndPayment()                     │
│  - productService.decrementInventory()                                    │
└──────────────────────────────────┬─────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            Firestore Database                              │
│  - /wholesale_customers/{id}                                               │
│  - /wholesale_orders/{orderId}                                             │
│  - /wholesale_ledger/{ledgerId}                                            │
│  - /products/{productId}                                                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### Data Entities & State Updates

1. **`WholesaleCustomer`**:
   - Fields editable by Super Admin: `name`, `businessName`, `pageName`, `phone`, `email`, `location`, `businessAddress`, `creditLimit`, `customDiscountPercent`, `status` (`'active' | 'pending' | 'suspended'`), `wholesaleAccess` (`boolean`), `notes`.
2. **`WholesaleOrder`**:
   - Created with: `customerId`, `customerName`, `businessName`, `phone`, `shippingAddress`, `items` (array of `{ productId, name, sku, price, wholesalePrice, quantity, total }`), `subtotal`, `shippingFee`, `discount`, `totalAmount`, `paidAmount`, `dueAmount`, `paymentStatus` (`'PAID' | 'PARTIAL' | 'DUE'`), `orderStatus` (`'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'`), `createdBy: 'ADMIN'`, `createdAt: serverTimestamp()`.
3. **`WholesaleLedger`**:
   - Debit record for order amount (`type: 'DEBIT'`, `amount: totalAmount`).
   - Credit record for advance payment if `paidAmount > 0` (`type: 'CREDIT'`, `amount: paidAmount`, `paymentMethod`).
4. **`Product` Inventory**:
   - Atomic decrement of `stock` for all ordered items.
