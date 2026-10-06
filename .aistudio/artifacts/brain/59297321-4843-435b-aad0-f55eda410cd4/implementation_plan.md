# Product Assignment to Filters & Taxonomies

A dedicated interactive product assignment system directly within the **Taxonomies & Filters Management** portal (`/admin/taxonomies`), empowering administrators to quickly view all currently linked products, search the full product catalog, bulk-assign multiple products via checkboxes, and instantly unassign products with a single click.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following product requirements and architectural decisions were confirmed based on your preferences:

- **Centralized in Filter & Taxonomy Manager**: Assignment workflow is launched directly from each Taxonomy card or table row via a prominent **"🔗 Assign Products"** button, without needing to open each product individually.
- **Dual-Pane Assignment Modal**:
  1. **Currently Assigned Tab / Pane**: Displays all products currently linked to this filter with product thumbnail, barcode, price, stock, and an instant **"❌ Remove / Unassign"** button.
  2. **Available Catalog & Bulk Assign Tab / Pane**: Real-time searchable list of all store products with live category/stock filters, select-all controls, and a **"✓ Assign (N) Selected Products"** batch action.
- **Smart Dimension Field Mutator**:
  - **Array Dimensions** (*Skin Types, Skin Concerns, Target Benefits, Key Ingredients*): Safely appends or removes the taxonomy tag in the product's array (`skinTypes`, `concerns`, `benefits`, `keyIngredients`) without overwriting existing tags.
  - **Single Value Dimensions** (*Brand, Category, Routine Step*): Updates the primary property (`brand`, `category`, `routineStep`) on the selected products with batch persistence.
- **Instant Product Count Sync**: When products are assigned or unassigned, the live product count badge on the taxonomy card updates immediately with optimistic state and automatic query invalidation.

---

## 1. Overview & Core Concept

### What It Does
Provides store administrators with a fast, bulk-capable way to tag products into specific skincare taxonomies. For example, an admin can click "Assign Products" on the **Centella Asiatica (Cica)** ingredient card, search for all calming serums or toners containing Cica, select 15 products with checkboxes, and assign them in one click.

### Target Audience & Persona
- **Store Inventory Managers & Catalog Admins**: Easily build curated collections and enrich product filtering attributes across thousands of items in seconds.
- **Shoppers & Store Visitors**: Find products accurately when filtering by specific concerns (e.g., "Hyperpigmentation") or key active ingredients (e.g., "Snail Mucin").

### Key Value
Saves hours of manual product-by-product editing by providing a streamlined, bulk-selection interface right where filters are managed.

---

## 2. User Experience & Visual Design

### Key User Flows

```
Admin Taxonomies Page (/admin/taxonomies)
  │
  ├──► 1. Click "🔗 Assign Products" on any Taxonomy Card (e.g., "Snail Mucin" or "Toner")
  │
  └──► 2. Opens "TaxonomyProductAssignmentModal"
         │
         ├── Header: Taxonomy Title, Bangla Name, and Active Linked Count ("14 Products Linked")
         │
         ├── View Switcher Tabs:
         │    ├── Tab 1: [Currently Assigned (14)] ──► Shows cards/rows of linked products with 1-click "Unassign"
         │    └── Tab 2: [Add / Assign Products] ────► Full searchable catalog with checkboxes & bulk "Assign Selected"
         │
         ├── Search & Fast Filter Bar:
         │    ├── Search by Name, SKU, Barcode, or Brand
         │    ├── Category & Stock status filters
         │    └── "Select All (N)" checkbox toggle
         │
         └── Bulk Action Footer:
              ├── "Assign (X) Selected Products" (with batch progress indicator)
              └── "Close / Done"
```

### Visual Identity & Theme
- **Aesthetic Direction**: High-density, utilitarian SaaS administrative modal with clean spatial margins and crisp typography.
- **Color Scheme**:
  - Primary Action: Rose-600 `#E11D48` & Indigo-600 `#4F46E5`
  - Unassign Destructive Action: Subdued Rose/Amber outline `#F43F5E`
  - Selected Row Highlight: Rose-50/60 with subtle border accent
- **Zero-Pill Discipline**: Product details (price, stock, barcode) use unboxed monospace text separated by quiet dot separators (`৳1,450 · Stock: 34 · BC: 880945...`).
- **Feedback & Motion**:
  - Optimistic item count updates in real-time.
  - Success toasts on batch assignment with number of products modified.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Batch Mutation via `productService.updateProduct` / Firestore Batch
- **Chosen Approach**: Perform batch updates on product documents in Firestore while concurrently updating the React Query client cache.
- **Why**: Ensures atomic writes and fast updates even when assigning 50+ products simultaneously.

### Decision 2: Preservation of Existing Product Arrays
- **Chosen Approach**: When assigning a product to an ingredient or concern, the mutation uses `Array.from(new Set([...existing, newTag]))` so existing attributes are never lost.
- **Why**: A product can have multiple ingredients (e.g., Cica AND Niacinamide) and multiple concerns (e.g., Acne AND Barrier Repair).

### Decision 3: Quick 1-Click Unassign from Assigned Tab
- **Chosen Approach**: The "Currently Assigned" tab features an instant unassign button per product with an undo toast, allowing admins to prune incorrect tags effortlessly.
- **Why**: Minimizes friction when cleaning up catalog taxonomies.

---

## 4. Technical Architecture & Data Strategy

### System Layout & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      AdminTaxonomyManagement.tsx                       │
├────────────────────────────────────────────────────────────────────────┤
│  Taxonomy Card / Table Row                                             │
│  └── [🔗 Assign Products (14)] Button ◄── User clicks here             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 TaxonomyProductAssignmentModal.tsx                     │
├────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Modal Header: [🌿 Centella Asiatica] (14 Products Linked)        │  │
│  │ Tabs: [Currently Linked (14)]  │  [+ Assign From Catalog]        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Search Bar: "Search by title, brand, or barcode..."              │  │
│  │ Category Filter: [All Categories ▼]   [In Stock Only ✓]          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Product Selection List (Scrollable High-Density List)            │  │
│  │  ☑ [Img] COSRX Cica Toner (8809...)  ৳1,350 · In Stock (24)      │  │
│  │  ☑ [Img] SKIN1004 Madagascar Ampoule ৳1,650 · In Stock (18)      │  │
│  │  ☐ [Img] Anua Heartleaf Soothing Ampoule                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Footer Actions:                                                  │  │
│  │  [Cancel]                    [✓ Assign 2 Selected Products]      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     productService & Firestore                         │
│  • batchAssignTaxonomy(dimensionType, taxonomyName, productIds)        │
│  • batchUnassignTaxonomy(dimensionType, taxonomyName, productIds)      │
│  • Optimistic Query Invalidation (`products.all`, `taxonomies.all`)    │
└────────────────────────────────────────────────────────────────────────┘
```

### Mutator Logic Mapping

| Taxonomy Dimension | Target Product Field | Assignment Operation | Unassign Operation |
| :--- | :--- | :--- | :--- |
| **brand** | `product.brand` | Set to `taxonomy.name` | Set to `''` (or unassigned) |
| **category** | `product.category` | Set to `taxonomy.name` | Set to `'Uncategorized'` |
| **routine_step** | `product.routineStep` | Set to `taxonomy.name` | Remove `routineStep` |
| **skin_type** | `product.skinTypes` (array) | Add to `skinTypes[]` (deduped) | Filter out from `skinTypes[]` |
| **skin_concern** | `product.concerns` (array) | Add to `concerns[]` (deduped) | Filter out from `concerns[]` |
| **target_benefit** | `product.benefits` (array) | Add to `benefits[]` (deduped) | Filter out from `benefits[]` |
| **ingredient** | `product.keyIngredients` (array) | Add to `keyIngredients[]` (deduped) | Filter out from `keyIngredients[]` |

---

## 5. Implementation Steps

1. **Service Layer Enhancement (`src/services/productService.ts` / `src/services/taxonomyService.ts`)**:
   - Implement `batchAssignTaxonomyToProducts(type, taxonomyName, productIds)`
   - Implement `batchUnassignTaxonomyFromProducts(type, taxonomyName, productIds)`
2. **Assignment Modal Component (`src/components/TaxonomyProductAssignmentModal.tsx`)**:
   - Build high-density dual-tab UI with live product search, multi-selection checkboxes, select-all control, and instant unassign.
3. **Integration with `AdminTaxonomyManagement.tsx`**:
   - Wire the "🔗 Assign Products" trigger into each grid card and table row.
   - Display dynamic product count badges and open the assignment modal with the target taxonomy item.
4. **Verification & Build Check**:
   - Validate with `lint_applet` and `compile_applet`.
   - Test bulk assignments and unassignments across multiple dimensions.
