# Admin Wholesale Order Form Upgrade: Dual Checkout Modes, Live Margins & POS Barcode Scanner

Upgrade the Admin Dashboard's Wholesale Order Creation form (`AdminWholesaleOrderModal.tsx`) to match the comprehensive B2B checkout workflow of `WholesaleCheckoutPage.tsx`. The new form introduces dual checkout modes (Type 1: COD Direct Delivery & Type 2: Parcel Courier Consignment), live wholesaler profit margin calculations with custom COD selling prices per unit, 50+ volume tier rates, and product addition via both instant search and a POS barcode scanner modal.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Summary of Confirmed Decisions from Clarification**:
> - **Product Addition Workflow**: Both instant multi-attribute search and an integrated POS Barcode Scanner modal (supporting camera scanning, manual barcode entry, and hardware scanner input with audio-visual scan confirmations).
> - **Checkout Mode Support**: Full dual-mode parity with the wholesale checkout portal:
>   - **Type 1: COD Direct Delivery** (Customer Name, Phone, Delivery Address, Courier Partner, COD Selling Price, Wholesaler Margin calculation).
>   - **Type 2: Parcel / Existing Courier** (Parcel / Tracking ID, Velouria ID, Customer Name on Parcel, COD Amount, Wholesaler Margin calculation).
> - **Pricing & Profitability**: Live margin calculation per product (`(COD Price - Wholesale Price) × Qty`) and total order level, custom COD selling price input, and tiered pricing badge (1–49 standard rate vs 50+ bulk discount rate).
> - **Admin Financial Settlement**: Live check against the Wholesaler's Credit Limit and Current Due balance, delivery fee, adjustments/discounts, instant "Pay in Full" / "Mark as Due" toggles, payment methods (Cash, bKash, Bank Transfer, Nagad), and automatic balance posting to the customer's ledger upon creation.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the Admin Wholesale Order modal from a basic line-item editor into an enterprise B2B fulfillment console. Admins can create wholesale orders on behalf of wholesalers while capturing all crucial fulfillment attributes (courier tracking codes, third-party consignment numbers, end-customer COD collection prices) and viewing the exact profitability and credit standing in real time.
- **Target Audience / Persona**: Store administrators, fulfillment managers, and sales representatives managing B2B drop-shipping and bulk wholesale client accounts.
- **Key Value**:
  - Eliminates discrepancies between orders placed by wholesalers themselves and orders placed manually by admins over phone or WhatsApp.
  - Accelerates order creation with fast POS barcode scanning and instant product search.
  - Prevents underpricing and credit defaults with live profit margin indicators and credit limit warnings.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ADMIN WHOLESALE ORDER FLOW                          │
│                                                                        │
│  [Step 1: Select Wholesaler]                                           │
│       │ Search name / business / phone / location                      │
│       ▼ Live credit limit, current due balance & status check          │
│                                                                        │
│  [Step 2: Add Products (Dual Input)]                                   │
│       ├─► Instant Catalog Search (Name, Brand, SKU, Barcode, Stock)    │
│       └─► POS Barcode Scanner Modal (Camera / Hardware Barcode Reader) │
│       │                                                                │
│       ▼ Quantity Stepper (1 vs 50+ Bulk Tier Toggle)                   │
│       ▼ Custom COD Price per unit & Live Unit Profit/Loss Indicator    │
│                                                                        │
│  [Step 3: Select Checkout Mode]                                        │
│       ├─► Type 1: COD Direct Delivery (Customer Name, Phone, Address)  │
│       └─► Type 2: Parcel / Existing Courier (Parcel ID, Velouria ID)   │
│                                                                        │
│  [Step 4: Financial Breakdown & Settlement]                            │
│       ▼ Wholesale Subtotal vs Total COD Value vs Wholesaler Margin     │
│       ▼ Delivery Charge, Adjustment Discount, Payment Method           │
│       ▼ Paid Amount (1-Click "Paid in Full" or "0 / Unpaid")           │
│       ▼ Credit Limit validation & confirmation                         │
│                                                                        │
│  [Step 5: Submission & Authoritative Order Summary]                    │
│       ▼ Stock decremented in Firestore                                 │
│       ▼ Order recorded in `wholesaleOrders` collection with metadata   │
│       ▼ Wholesaler due and ledger updated automatically                │
│       ▼ 1-Click Print Invoice & Create Another Order options           │
└────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme

- **Aesthetic Direction**: High-density enterprise SaaS utility adhering to the store's clean pink and indigo palette (`#FFFFFF` modal surface, `#F8FAFC` card slate, `#E91E8C` brand accent, `#4F46E5` admin accent).
- **Typography & Hierarchy**:
  - Modal title and section headers using `Plus Jakarta Sans` / clean sans-serif with natural editorial casing.
  - All financial figures, quantities, barcodes, and parcel IDs formatted with `font-mono tabular-nums`.
- **Component Styling & Layout**:
  - Modal container: Wide `max-w-5xl` modal with smooth scrollable interior and pinned sticky footer for actions.
  - Product List Table: Clear row layout showing product thumbnail, brand, SKU, stock count, quantity stepper with 50+ tier shortcut, wholesale rate, editable COD price, and live profit/loss chip.
  - Checkout Mode Selector: Dual interactive cards with distinctive icons (Truck for Type 1, PackageCheck for Type 2) and visual active states.
  - Settlement Card: Structured 3-column summary (Wholesale Cost, Customer COD Collection, Net Wholesaler Profit/Loss) followed by delivery fee, discount, paid amount, and payment method fields.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Integrating POS Barcode Scanner inside Wholesale Order Modal
- **Chosen Approach**: Integrate the existing barcode scanning architecture (`barcode.ts`, audio beep feedback, camera scanner, and hardware keyboard wedge listener) into a clean modal/sheet triggerable directly from the product addition section of the wholesale order modal.
- **Why**: Allows warehouse staff creating wholesale orders on packing desks to scan physical boxes directly with a barcode scanner gun or smartphone camera without switching to the POS register screen.
- **Alternatives Considered**: Direct camera embedded on screen (too cluttered inside a form modal) vs Search-only (slow when packing 20+ wholesale items). A dedicated scanner drawer/modal gives the best ergonomics.

### Decision 2: Dual Checkout Parity with Customer Wholesale Portal
- **Chosen Approach**: Store `checkoutInfo` with `checkoutType: 'COD' | 'PARCEL'`, along with fields `deliveryName`, `deliveryPhone`, `deliveryAddress`, `parcelId`, `velouriaId`, `codPrice`, `wholesalerMargin`, and `totalWholesaleCost`.
- **Why**: Ensures uniform data structure across all wholesale orders regardless of whether they originate from the wholesaler self-serve portal or the admin backoffice. Downstream fulfillment (invoice generation, Steadfast courier booking, consignment tracking) will work seamlessly.

### Decision 3: Live Margin & Wholesaler Profit Tracking
- **Chosen Approach**: Replicate the exact mathematical model used in `WholesaleCheckoutPage`:
  $$\text{Unit Profit} = \text{COD Unit Price} - \text{Wholesale Unit Price}$$
  $$\text{Total Profit} = \sum (\text{Unit Profit} \times \text{Quantity})$$
- Highlight negative margins in rose (`Loss: ৳X`) while allowing admins to proceed if intended (e.g., cleared stock or negotiated subsidies).

---

## 4. Technical Architecture & Data Strategy

### System & Component Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT COMPONENT TREE                            │
│                                                                        │
│  AdminWholesaleManagement.tsx                                          │
│     │                                                                  │
│     └── AdminWholesaleOrderModal.tsx                                   │
│            │                                                           │
│            ├── WholesalerSelectSection                                 │
│            │      └── Customer Autocomplete & Credit Card Display      │
│            │                                                           │
│            ├── ProductEntrySection                                     │
│            │      ├── ProductSearchAutocomplete                        │
│            │      └── PosScanModalTrigger (opens Barcode Scanner)      │
│            │                                                           │
│            ├── WholesaleItemsTable                                     │
│            │      ├── Quantity Stepper (+ / - / 50+ Tier Toggle)       │
│            │      ├── Unit Wholesale Price & COD Price Inputs          │
│            │      └── Product Margin Indicator                         │
│            │                                                           │
│            ├── CheckoutTypeSelector (Type 1 COD vs Type 2 Parcel)      │
│            │      ├── Type 1 COD Direct Form (Name, Phone, Address)    │
│            │      └── Type 2 Parcel Form (Parcel ID, Velouria ID)      │
│            │                                                           │
│            ├── FinancialSettlementSection                              │
│            │      ├── Profit / Loss KPI Matrix                         │
│            │      ├── Delivery & Discount Controls                     │
│            │      ├── Paid Amount & Quick Buttons (Full / Due)         │
│            │      └── Payment Method & Reference Selector              │
│            │                                                           │
│            └── OrderSuccessSummary                                     │
│                   ├── Invoice Document View                            │
│                   └── Action Buttons (Create Another / Close)          │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Mapping

The order payload submitted via `wholesaleOrderService.createAdminWholesaleOrder` will contain:

```typescript
interface AdminWholesaleOrderPayload {
  customerId: string;
  customerName: string;
  businessName?: string;
  phone: string;
  items: Array<{
    productId: string;
    productName: string;
    brand?: string;
    sku?: string;
    barcode?: string;
    image?: string;
    quantity: number;
    unitPrice: number;        // Wholesale rate
    customCodPrice: number;   // COD selling price
    profitPerUnit: number;    // customCodPrice - unitPrice
    totalProfit: number;      // (customCodPrice - unitPrice) * quantity
  }>;
  checkoutInfo: {
    checkoutType: 'COD' | 'PARCEL';
    deliveryName: string;
    deliveryPhone?: string;
    deliveryAddress?: string;
    parcelId?: string;
    velouriaId?: string;
    codPrice: number;
    courier?: string;
    orderNote?: string;
  };
  shippingAddress: {
    deliveryName: string;
    deliveryPhone: string;
    deliveryAddress: string;
    courier: string;
    orderNote?: string;
  };
  totalWholesaleCost: number;
  totalCODValue: number;
  totalProfit: number;
  deliveryCharge: number;
  discount: number;
  paidAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  status: 'confirmed' | 'processing' | 'pending';
  createdBy: 'Super Admin';
}
```

---

## 5. Implementation Steps (Planned for Execution)

1. **POS Barcode Scanner Component Integration**:
   - Add scanner trigger to `AdminWholesaleOrderModal.tsx`.
   - Provide a clean modal or slide-over with video camera stream and hardware barcode listener that matches `PosScan.tsx` behavior.
   - On barcode scan, match against `allProducts` (by `barcode`, `sku`, or `id`), play audio confirmation, and increment order item quantity.
2. **Catalog Quick Search Enhancement**:
   - Add category filter pills and live stock status in product autocomplete results.
   - Allow instant 1-click addition directly from search results.
3. **Dual Checkout Form Implementation**:
   - Replicate the Type 1 (COD Direct) and Type 2 (Parcel / Courier) input forms with complete validation.
   - Ensure fields adapt smoothly without losing chosen products or entered quantities.
4. **Live Margin Calculator & Tier Rates**:
   - Implement the per-product COD price input and dynamic profit/loss math.
   - Add the 50+ volume discount tier selector button for each product.
5. **Settlement & Credit Limit Integration**:
   - Compute grand total, COD collection, estimated margin, and remaining due.
   - Sync with customer ledger and Firestore stock decrement via `wholesaleOrderService`.
6. **Testing & Build Verification**:
   - Verify modal opening from both the top header and individual customer row buttons in `AdminWholesaleManagement.tsx`.
   - Run `compile_applet` and verify no TypeScript or lint issues.
