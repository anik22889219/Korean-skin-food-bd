# POS Custom Pricing, Enhanced Stock Intake & Admin Shipments System

Comprehensive implementation plan to introduce per-item custom unit pricing with import cost margin warnings in the POS register, extend stock receiving with product-level import prices, expiry dates, and shipment invoice image attachments, and deploy a dedicated Admin Shipments management dashboard with receiver and date filtering.

***

## User Review & Critical Decisions

> [!IMPORTANT]
> The following technical and UX choices were confirmed during Phase 1 clarification:

- **Confirmed Decision 1 (Custom Price Entry)**: Cashiers will edit the **custom unit price per item** directly in the cart row, which automatically recalculates line subtotal and overall cart totals in real time.
- **Confirmed Decision 2 (Margin Guard Warning)**: When a custom price drops below the product's import cost (`importPrice` or `costPrice`), the POS will display a prominent amber margin warning badge on the item row without hard-blocking checkout, ensuring speed while maintaining audit visibility.
- **Confirmed Decision 3 (Receiver Population)**: The "Received By" dropdown in POS Stock Intake and Admin Shipments filter will be dynamically merged from registered system staff/admin accounts and past shipment receiver records, with searchable typing.

***

## 1. Overview & Core Concept

- **What It Does**: 
  1. Equips the POS checkout register with flexible custom unit pricing per line item, with automated live subtotals and real-time warnings whenever pricing falls below import cost.
  2. Upgrades the In-Store Stock Receiving / Intake system to capture item-specific import prices, product expiry dates, and an optional physical invoice photo/document upload.
  3. Introduces a dedicated **Shipments** page in the Admin Dashboard that lists all historical stock intake receipts with date, supplier, batch number, receiver, items breakdown, invoice image lightbox, and multi-criteria filtering by receiver staff and date ranges.
- **Target Audience / Persona**: Store cashiers, inventory managers, warehouse staff, and business administrators managing Korean SkinFood retail and wholesale operations.
- **Key Value**: Prevents accidental loss-making discounts through automated margin alerts, preserves batch traceability (expiry dates and original paper invoice photos), and gives business owners immediate auditability over inventory intake by staff and timeline.

***

## 2. User Experience & Visual Design

### Key User Flows

1. **POS Custom Pricing & Margin Guard Flow**:
   - Cashier scans or adds a product to the cart.
   - In the cart row, next to the standard price (e.g. ৳1,450), cashier clicks "Custom Price" or taps the price field.
   - Cashier enters the agreed custom unit price (e.g. ৳900).
   - If the entered price is less than the product's import price (e.g. import price is ৳1,050):
     - An amber warning banner appears beneath the item: `⚠ Below Import Cost (Cost: ৳1,050 | Loss: -৳150/unit)`.
     - The line subtotal and grand total update automatically.
     - Cashier can still proceed with checkout without breaking terminal flow.
   - On completed sale receipt, the custom rate is stamped alongside any applied variance for accounting.

2. **Enhanced Stock Receiving (POS Stock-In) Flow**:
   - Warehouse receiver enters the POS Stock In tab.
   - Scans barcodes or searches products to populate the intake queue.
   - In each queue row:
     - Adjusts quantity (step buttons or direct input).
     - Sets **Import Price / Unit Cost (৳)** (pre-filled with current import price, editable for batch changes).
     - Sets **Expiry Date** (calendar picker or standard date input).
   - In the **Shipment & Intake Audit Metadata** section:
     - Selects **Received By** from a searchable combobox containing staff members and recent receivers, or types a custom name.
     - Fills Supplier and Batch/Invoice #.
     - Uses the **Invoice Image Upload** field: clicks to upload photo of supplier invoice or paper slip (with thumbnail preview, remove button, and full-size zoom).
   - Submits intake: atomically updates stock counts, updates product import prices and expiry tracking, creates inventory audit logs, and stores the completed stock receipt voucher.

3. **Admin Shipments Management Flow**:
   - Admin navigates to `/admin/shipments` via the Admin sidebar (tagged with a warehouse crate icon and count badge).
   - Top summary KPI cards display: Total Shipments Logged, Total Intake Units Received, Total Purchase Value (৳), and Active Receivers.
   - Filter bar allows:
     - Selecting **Staff / Receiver** (searchable dropdown).
     - Selecting **Date Range** (All Time, Today, Last 7 Days, This Month, or Custom Start/End Date).
     - Search query by Voucher #, Supplier, or Batch #.
   - Data Table displays: Receipt #, Date & Time, Supplier, Batch #, Total Items & Units, Total Cost, Received By, and Invoice Image thumbnail.
   - Clicking an invoice thumbnail opens a high-resolution lightbox view.
   - Clicking any shipment row expands a detailed product breakdown: item photo, brand, title, barcode, previous stock, added quantity, resulting stock, unit cost, and expiry date.

### Visual Identity & Theme
- **Aesthetic Direction**: Utilitarian, high-density enterprise dashboard and POS styling consistent with Korean SkinFood design tokens (`#1E293B` slate cards, `#E91E8C` pink POS accents, emerald `#10B981` receiving accents, and amber `#F59E0B` margin warning banners).
- **Typography**: Display headlines in `Plus Jakarta Sans`, body text in `DM Sans`, and all financial metrics, batch numbers, and dates strictly formatted with `font-mono tabular-nums`.
- **Zero-Pill Discipline**: Metadata displayed using clean typographic separators (`·`) without static pill sandwich enclosures. Functional filter tabs styled as clean segmented buttons.

***

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Custom Unit Price vs Line Subtotal**:
  - *Chosen Approach*: Cashier enters the custom unit price per item; line subtotal is computed as `customUnitPrice * quantity`.
  - *Why*: Eliminates rounding anomalies on multi-unit sales and aligns with tax, margin, and discount reporting formulas.
- **Decision 2: Non-Blocking Margin Warning vs Strict Block**:
  - *Chosen Approach*: Prominent amber badge warning with exact loss-per-unit preview, allowing sale execution without hard termination.
  - *Why*: Prevents retail register paralysis during authorized clearance sales, damaged box write-downs, or store manager discretionary deals.
- **Decision 3: Invoice Image Storage via Dedicated Cloudinary Cloud Integration**:
  - *Chosen Approach*: Primary direct upload to Cloudinary under the `kbeauty_invoices` folder with live upload progress tracking, auto-cataloging in Firestore Media Library (`cloudinary_images`), and server-side Cloudinary proxy fallback (`/api/cloudinary/upload-invoice`). Includes inline quick settings for custom Cloudinary cloud name and unsigned upload preset.
  - *Why*: Ensures high-speed global CDN delivery, avoids Firestore 1MB single-document limits, and keeps all supplier invoices organized in the business's Cloudinary storage.
- **Decision 4: Receiver Combobox Architecture**:
  - *Chosen Approach*: Dynamic union of active Firestore users (`admin`, `inventory_manager`, `hr`, etc.) and distinct receiver names extracted from existing `stock_receipts` collections.
  - *Why*: Guarantees zero friction for existing team members while accommodating external drivers or temporary warehouse assistants.

***

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE LAYER                          │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│    POS Sales Register    │   POS Stock Receiving   │  Admin Shipments  │
│  - Custom Unit Price     │ - Import Cost Input     │ - Filter by Staff │
│  - Below-Cost Amber Warn │ - Expiry Date Picker    │ - Filter by Date  │
│  - Realtime Subtotals    │ - Invoice Image Upload  │ - Batch Breakdown │
│  - Cart Item Metadata    │ - Receiver Combobox     │ - Image Lightbox  │
└────────────┬─────────────┴────────────┬────────────┴─────────┬─────────┘
             │                          │                      │
             ▼                          ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SERVICE & CLIENT LAYER                          │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│      posService.ts       │    productService.ts    │   userService.ts  │
│ - checkoutWithPOS()      │ - processStockInBatch() │ - getUsers()      │
│ - pricingMode & variance │ - getStockReceipts()    │ - staff directory │
│ - custom price tracking  │ - subscribeReceipts()   │ - roles lookup    │
└────────────┬─────────────┴────────────┬────────────┴─────────┬─────────┘
             │                          │                      │
             ▼                          ▼                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       FIRESTORE PERSISTENCE                            │
├──────────────────────────┬─────────────────────────┬───────────────────┤
│      orders (POS)        │     stock_receipts      │     products      │
│ - customUnitPrice        │ - items[].importCost    │ - importPrice     │
│ - originalUnitPrice      │ - items[].expiryDate    │ - expiryDate      │
│ - isBelowCostAlert       │ - invoiceImageUrl       │ - stock count     │
│                          │ - receivedBy, supplier  │ - inventory_logs  │
└──────────────────────────┴─────────────────────────┴───────────────────┘
```

### Data Model Enhancements

1. **`CartItem` & `OrderItem`**:
   - `customUnitPrice?: number`
   - `originalUnitPrice?: number`
   - `isBelowCost?: boolean`

2. **`StockInQueueItem` & `StockReceiptItem`**:
   - `importCost?: number`
   - `expiryDate?: string` (ISO format `YYYY-MM-DD`)

3. **`StockReceipt`**:
   - `invoiceImageUrl?: string`
   - `receivedBy: string`
   - `supplier?: string`
   - `batchNumber?: string`
   - `notes?: string`
   - `items: StockReceiptItem[]`

### Component & Navigation Updates

- **POS Register & Cart**:
  - Add editable custom unit price button/input inside each product row.
  - Calculate `isBelowCost = (customUnitPrice < (item.product.importPrice || item.product.costPrice || 0))`.
  - Render an amber warning indicator with cost comparison.
- **POS Stock-In**:
  - Add inline inputs in each queue row for `Import Cost (৳)` and `Expiry Date`.
  - Add invoice photo uploader in `Shipment & Intake Audit Metadata` with image compression and preview.
  - Implement searchable receiver combobox with system staff users and previous receivers.
- **Admin Layout & Navigation**:
  - Add **Shipments** route (`/admin/shipments`) under Admin layout with icon and badge.
  - Build `AdminShipments.tsx` featuring KPIs, multi-filter toolbar, responsive data table, product details drawer, and full-resolution invoice modal.

***

## 5. Verification & Testing Plan

1. **POS Custom Price & Margin Warning Test**:
   - Add product with known `importPrice` (e.g., ৳1,000) to POS cart.
   - Enter custom price above cost (e.g. ৳1,200): verify subtotal calculates accurately and no warning appears.
   - Enter custom price below cost (e.g. ৳800): verify amber warning badge appears displaying cost delta.
   - Complete POS sale: verify receipt and stored order record reflect custom price and audit tags.
2. **Stock Receiving Test**:
   - Add multiple items to intake queue, set custom import costs and expiry dates for each.
   - Upload invoice image: verify image upload preview and clear button.
   - Select receiver from dropdown: verify suggestions filter as typed.
   - Confirm intake: verify stock increments, product import price updates, and stock receipt record contains invoice URL and item expiry dates.
3. **Admin Shipments Page Test**:
   - Navigate to `/admin/shipments`. Verify newly created stock receipt appears at the top.
   - Test receiver filter: filter by selected staff member.
   - Test date filter: filter by "Today", "Last 7 Days", and custom date ranges.
   - Click invoice thumbnail: verify full-size modal preview.
   - Expand item details: verify all product rows, stock transitions, import costs, and expiry dates are visible.
4. **Compilation & Linting**:
   - Run `compile_applet` and `lint_applet` concurrently to verify clean TypeScript compilation and zero unresolved imports.
