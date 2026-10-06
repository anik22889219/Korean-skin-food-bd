# Dynamic Combo Product Package System

A comprehensive system enabling Korean Skin Food BD to configure, sell, and fulfill combo product packages (both fixed curated bundles and customizable "build-your-own" skincare sets) directly powered by real-time inventory from existing individual products across the Storefront, POS register, and Admin portal.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following key decisions were confirmed through Phase 1 requirements clarification and guide the architecture below:

- **Confirmed Bundle Modes**: Support both **Fixed Bundles** (e.g., "Glass Skin Routine Kit": specific cleanser + toner + serum + cream at a bundled package price) and **Customizable Sets** (e.g., "3-Step Daily Routine Box": customer picks 1 item from Step 1, 1 item from Step 2, and 1 item from Step 3 from designated pools).
- **Confirmed Inventory Logic**: **Dynamic Stock Deduction**. Combo packages do not hold detached phantom stock; available stock is dynamically derived in real-time from component items (`Math.min(item.stock / qtyRequired)`), and ordering a combo automatically verifies and decrements each individual component product's stock.
- **Confirmed Sales Channels**: **Full Triple-Channel Integration** across the **Storefront Catalog & PDP**, **POS Cash Register**, and **Admin Product Management & Order Fulfillment**.
- **Pricing Strategy**: Fixed packages specify a package retail price with automated calculation of regular combined price and customer savings percentage (৳ saved badge). Customizable sets define either a flat tier price (e.g., ৳3,200 for any 3 items) or dynamic sum with bundle discount percentage (e.g., 15% off chosen items).

---

### 1. Overview & Core Concept

- **What It Does**: Store managers can bundle existing skincare items into high-converting combo packages without duplicate physical barcodes or split stock allocations. Shoppers can purchase curated kits or build tailored routines with a stepped selector. When sold via Online Checkout or the in-store POS register, the system deducts stock from each component product, generates barcodes for combo labels, and guides warehouse staff during order scanning.
- **Target Audience / Persona**:
  - *Shoppers*: Looking for comprehensive skincare regimens, gift boxes, or bulk savings without guessing complementary products.
  - *Store Staff / POS Cashiers*: Need to scan a single combo barcode or quickly ring up a package while the system automatically handles individual SKU inventory deductions behind the scenes.
  - *Admin & Inventory Managers*: Need effortless combo creation, margin transparency, automated out-of-stock guards when any single item sells out, and clear fulfillment checklists.
- **Key Value**: Higher Average Order Value (AOV), zero inventory synchronization errors (since combo stock reflects physical shelf inventory in real-time), and automated package fulfillment verification.

---

### 2. User Experience & Visual Design

#### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                        COMBO PRODUCT USER JOURNEYS                     │
└────────────────────────────────────────────────────────────────────────┘

 [ADMIN DASHBOARD]
   │
   ├─► Admin clicks "+ Create Combo Package" in Product Management
   │     ├─ Choose Type: "Fixed Curated Bundle" or "Customizable Build-Your-Own Box"
   │     ├─ Search & attach existing products with quantity rules / step categories
   │     ├─ Set package pricing, promo discount badge, and banner photography
   │     └─ Generates unique Combo SKU & Barcode for POS scanning
   ▼
 [CUSTOMER STOREFRONT]
   │
   ├─► Browses "Combos & Sets" filter in Store Catalog / Home featured rail
   │     ├─ Card displays "Combo Package" tag, included item count & total ৳ savings
   │     └─ Stock status displays live calculated availability based on child items
   │
   ├─► Product Detail Page (PDP):
   │     ├─ [Fixed Bundle]: Interactive item breakdown cards showing thumbnail, size,
   │     │   and individual retail value; single "Add Combo to Bag" CTA.
   │     └─ [Customizable Box]: Visual step-by-step routine builder (Step 1: Cleanser ➔
   │         Step 2: Toner ➔ Step 3: Serum) with thumbnail cards, radio selectors, and
   │         live price & savings counter; "Add Complete Set to Bag" CTA.
   ▼
 [CART & CHECKOUT]
   │
   ├─► Cart itemizes the combo parent with expandable list of chosen child products
   ├─► Out-of-stock guard re-checks all child products before final order placement
   └─► Order confirmation stores parent combo meta plus resolved child item breakdown
   ▼
 [POS CASH REGISTER & ADMIN FULFILLMENT]
   │
   ├─► POS Register: Cashier scans Combo Barcode ➔ POS automatically rings combo price
   │   and atomically decrements stock for each child product via transaction
   └─► Admin Fulfillment: Warehouse scanning displays the combo parent plus individual
       verification checkboxes/scanners for each constituent product before sealing
```

#### Visual Identity & Theme
- **Aesthetic Direction**: High-end editorial K-Beauty aesthetic matching the existing Korean Skin Food BD brand. Clean typography, generous spatial breathing room, crisp borders, and subtle peach/rose gold accents for value badges.
- **Color Palette & Accents**:
  - Background: Crisp off-white (`bg-white` / `bg-stone-50` dark mode compatible)
  - Primary Brand: Deep obsidian (`text-stone-900`) with warm rose-gold/coral accent (`#E11D48` / `#BE123C` or emerald `#059669` for savings indicators)
  - Value Badges: High-contrast understated badge (`bg-rose-50 text-rose-700 border border-rose-200`) indicating "Save ৳450 (18% OFF)"
- **Typography & Hierarchy**:
  - Large headings: Semi-bold display typeface
  - Numerical pricing: Tabular numbers with strike-through original combined value and bold bundled price
  - Step indicators in custom builder: Clean unboxed numbers with subtle connective lines (`Step 1 of 3 · Select Cleanser`)
- **Interactive Feedback & Motion**:
  - Step selector transitions smoothly using Framer Motion (`AnimatePresence`)
  - Selection cards highlight with an active border ring and checkmark indicator
  - Sticky bottom mobile bar displays current builder completion (`2 of 3 items selected`) and dynamic price update

---

### 3. Key Product Decisions & Trade-Offs

#### Decision 1: Combo Representation in Data Schema
- **Chosen Approach**: Store combos in the primary `products` collection with `isCombo: true` and an explicit `comboConfig` payload, rather than creating a separate disconnected collection.
- **Why**: Keeps Firestore querying, search, categories, SEO, reviews, and POS scanner lookups unified. A combo is a first-class sellable item with its own title, images, description, barcode, and price, while referencing child product IDs.
- **Alternatives Considered**: Storing in a separate `combos` collection would duplicate catalog search, filter hooks, query caching, POS scan resolvers, and cart handling logic.

#### Decision 2: Dynamic Stock Calculation Engine
- **Chosen Approach**: 
  - For **Fixed Bundles**: `availableStock = Math.min(...items.map(i => Math.floor(productById(i.productId).stock / i.quantity)))`.
  - For **Customizable Sets**: `availableStock = Math.min(...steps.map(step => sumOfStocksInStep(step.allowedProductIds)))`.
- **Why**: Eliminates stock discrepancies. If a constituent serum runs out of stock from individual sales, the combo package immediately marks as out-of-stock or disables that specific variant option without manual admin intervention.
- **Alternatives Considered**: Pre-packaging physical stock units requires double inventory bookkeeping and risks dead stock if combos don't sell as fast as individual bottles.

#### Decision 3: Atomic Stock Deduction at Checkout & POS
- **Chosen Approach**: Both POS checkout (`posService.processPosCheckout`) and Online fulfillment (`posService.confirmOrderFulfillment`) expand combo line items into their constituent child product units and deduct individual inventory counts inside a single atomic Firestore `runTransaction`.
- **Why**: Guarantees data integrity. Even if 5 customers buy at once, Firestore transactions ensure that stock cannot drop below zero and every inventory log tracks the exact combo sale reference.
- **Alternatives Considered**: Deducting only the combo product document would leave physical shelf inventory inaccurate for individual products.

---

### 4. Technical Architecture & Data Strategy

#### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       COMBO SYSTEM ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────┘

                  ┌────────────────────────────────────────┐
                  │       Firestore 'products' Doc         │
                  │  { id, isCombo: true, comboConfig }   │
                  └──────────────────┬─────────────────────┘
                                     │
           ┌─────────────────────────┴────────────────────────┐
           ▼                                                  ▼
┌─────────────────────────┐                        ┌────────────────────────┐
│   Fixed Bundle Config   │                        │  Customizable Config   │
│ { type: 'fixed',        │                        │ { type: 'customizable',│
│   items: [              │                        │   steps: [             │
│    {productId, qty: 1}, │                        │    {stepName, options: │
│    {productId, qty: 1}  │                        │     [prodIdA, prodIdB]}│
│   ] }                   │                        │   ] }                  │
└──────────┬──────────────┘                        └──────────┬─────────────┘
           │                                                  │
           └─────────────────────────┬────────────────────────┘
                                     │
       ┌─────────────────────────────┼────────────────────────────┐
       ▼                             ▼                            ▼
┌───────────────┐           ┌──────────────────┐         ┌────────────────┐
│  Storefront   │           │   Cart Context   │         │  POS Register  │
│  ProductCard  │           │   & Checkout     │         │  & Scanner     │
│  & Detail PDP │           │  OrderItem Meta  │         │  Barcode Match │
└──────┬────────┘           └────────┬─────────┘         └────────┬───────┘
       │                             │                            │
       └─────────────────────────────┼────────────────────────────┘
                                     ▼
                   ┌───────────────────────────────────┐
                   │    Atomic Transaction Engine      │
                   │    (posService & server.ts)       │
                   │                                   │
                   │   Deducts Child Product Stocks    │
                   │   Writes Inventory Movement Logs  │
                   │   Records Financial Transaction   │
                   └───────────────────────────────────┘
```

#### Data Model Definitions

```typescript
// Extension to Product in src/types.ts:
export type ComboType = 'fixed' | 'customizable';

export interface ComboFixedItem {
  productId: string;
  quantity: number;
}

export interface ComboStepConfig {
  id: string;
  title: string;        // e.g. "Step 1: Choose Cleanser"
  titleBN?: string;
  minSelections: number; // usually 1
  maxSelections: number; // usually 1
  allowedProductIds: string[]; // pool of products user can pick from
}

export interface ComboConfig {
  type: ComboType;
  // If fixed:
  items?: ComboFixedItem[];
  // If customizable:
  steps?: ComboStepConfig[];
  pricingMode: 'fixed_price' | 'dynamic_discount'; // fixed price or % discount off sum
  discountPercentage?: number; // e.g. 15 for 15% off
}

// Extension to OrderItem in src/types.ts:
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  scannedQuantity?: number;
  barcode?: string;
  // Combo tracking metadata:
  isCombo?: boolean;
  comboType?: ComboType;
  comboComponents?: {
    productId: string;
    name: string;
    quantity: number;
    barcode?: string;
    scannedQuantity?: number;
  }[];
}
```

#### Planned Implementation Steps

1. **Type Definitions & Utilities** (`src/types.ts`, `src/utils/pricing.ts`):
   - Add `isCombo`, `comboConfig` to `Product` interface.
   - Add combo calculation helpers: `getComboEffectiveStock(product, allProducts)`, `calculateComboPricing(product, allProducts, selectedItems)`.
2. **Admin Combo Package Creator & Editor** (`src/components/ProductManagement.tsx` or dedicated `ComboPackageModal.tsx`):
   - Intuitive modal to toggle between "Fixed Bundle" and "Customizable Routine".
   - Searchable product picker to add products to fixed kits or step pools.
   - Real-time margin and savings preview (Sum of individual retail prices vs. Package price).
   - Auto-generated or custom barcode/SKU creation for easy POS scanning.
3. **Storefront Presentation**:
   - `ProductCard.tsx`: Display "Combo Package" chip, count of included items, and total ৳ savings badge.
   - `ProductDetail.tsx`:
     - *Fixed View*: Highlighting constituent items with interactive preview cards.
     - *Customizable View*: Interactive step selector wizard allowing customer to tap and select their routine steps with responsive live price recalculation.
4. **Cart & Checkout Integration** (`src/context/CartContext.tsx`):
   - Cart line item displays combo title, bundle price, and expandable itemized contents.
   - Validation ensures stock availability across all chosen child items prior to order confirmation.
5. **POS & Fulfillment Engine** (`src/services/posService.ts`):
   - Scanning a combo barcode adds the combo item with its resolved child components to the POS cart.
   - Atomic checkout transaction deducts stock for all constituent products, generating `inventory_logs` referencing the combo order.
   - Admin order fulfillment scan screen displays individual item check-off for package verification before shipping.
