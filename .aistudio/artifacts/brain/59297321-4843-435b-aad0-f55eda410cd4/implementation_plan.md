# Meta Catalog Dynamic Synchronization & Commerce Manager Hub

Dynamic synchronization between the Korean Skin Food product catalog and Meta Commerce Manager (Facebook/Instagram Catalog), enabling automated product updates via both Meta Graph API direct batch sync and scheduled XML/CSV live data feeds.

> [!IMPORTANT]
> **Confirmed Choices from Clarification**:
> - **Sync Architecture**: Meta Graph API direct sync with Access Token (alongside standard Scheduled XML/CSV Feed URLs for maximum compatibility).
> - **Product Scope**: All active products (dynamically flagged as `in stock` or `out of stock` in real time with inventory counts).
> - **Management Experience**: Dedicated Full Meta Catalog Dashboard in the Admin panel featuring real-time feed URLs, connection test, 1-click Graph API batch push, feed diagnostics, and step-by-step Meta Commerce Manager integration walkthrough.

---

## 1. Overview & Core Concept

- **What It Does**: Bridges the store's Firestore product catalog with Meta Commerce Manager. When products are added, updated, or change stock in the store, Meta Catalog reflects the latest price, availability, images, and descriptions.
- **Target Audience / Persona**: Store owners and marketing managers managing Facebook & Instagram Shops, Dynamic Product Ads (DPA), and Instagram taggable shopping posts.
- **Key Value**:
  - Eliminates manual product uploads or outdated prices on Facebook/Instagram ads.
  - Automatically updates `availability` (`in stock` vs `out of stock`) when POS or online orders adjust inventory.
  - Gives admins direct control to trigger instant Meta Graph API sync or plug scheduled data feeds into Meta Commerce Manager.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Viewing Live Data Feeds**:
   - Admin navigates to **Admin Dashboard -> Meta Catalog**.
   - Admin sees live URLs for **XML (RSS 2.0 / Google Merchant & Meta format)** and **CSV Feed**, with 1-click copy buttons and live file downloads.
2. **Configuring Meta Graph API Direct Sync**:
   - Admin inputs Meta Catalog ID and Meta System User Access Token (with `catalog_management` permission) into secure settings.
   - Admin clicks **"Test Connection"** to verify Meta Graph API access without altering catalog data.
   - Admin clicks **"Sync Catalog Now"**, which batches all store products and pushes them directly to `https://graph.facebook.com/v19.0/{catalog_id}/items_batch`.
   - A real-time sync log displays results: total processed, succeeded, failed, and specific Meta error messages if any product fails validation.
3. **Product Catalog Diagnostic & Audit Table**:
   - Visual audit summary showing: Total Products, In-Stock, Out-of-Stock, Items with Missing Images, Items with Missing Barcode/SKU, Ready for Meta.
   - Interactive table previewing each item's mapped Meta attributes (`id`, `title`, `description`, `availability`, `condition`, `price`, `currency`, `image_url`, `url`, `brand`).
4. **Step-by-Step Meta Commerce Manager Setup Walkthrough**:
   - Visual accordion guide explaining how to link the Scheduled Data Feed URL in Meta Commerce Manager (`business.facebook.com/commerce`) and how to generate a Meta System User Access Token.

### Visual Identity & Theme

- **Aesthetic Direction**: High-density enterprise SaaS utility adhering to Korean Skin Food's clean pink-accented administrative theme (`#FFF5F8` neutral canvas, `#1E293B` text, `#E11D48` rose accent, `#0F172A` card headers).
- **Layout Rhythm**:
  - Full-width 1440px desktop responsive layout.
  - Breadcrumb navigation (`Admin / Integrations / Meta Catalog`).
  - 4-card metric strip for catalog health indicators.
  - 2-column configuration split (Left: Live Feed URLs & Auto-Sync settings; Right: Meta Graph API direct connection & manual batch trigger).
  - High-density data grid below with live search, stock filter, and column validation badges.
- **Typography**: Clean sans hierarchy with tabular numerals (`tabular-nums`) for currency amounts, product counts, and timestamps.
- **Micro-Interactions**: Smooth 1-click clipboard copy with green feedback, animated sync spinner during Graph API calls, and collapsible diagnostic detail cards.

---

## 3. Key Product Decisions & Trade-Offs

- **Dual-Engine Sync (Graph API + Scheduled Feeds)**:
  - *Chosen Approach*: Implement both direct Meta Graph API batch sync (`POST /api/meta-catalog/sync`) and public standard data feed URLs (`/api/meta-catalog.xml` and `/api/meta-catalog.csv`).
  - *Why*: Direct Graph API allows immediate on-demand pushes when an admin updates inventory or prices, while Scheduled XML feeds allow Meta's crawler to automatically pull hourly/daily without requiring token management if the token expires.
- **All-Products Dynamic Availability**:
  - *Chosen Approach*: Include all active products, with out-of-stock items dynamically marked `<g:availability>out of stock</g:availability>` instead of excluding them.
  - *Why*: Meta recommends keeping out-of-stock items in the catalog so ads automatically pause rather than deleting the product and losing advertising history or Instagram product tag links.
- **Safe Server-Side Secret Handling**:
  - *Chosen Approach*: The Meta Access Token is processed through the Express backend (`server.ts`) to avoid leaking tokens to client browsers or third-party web crawlers.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Meta Ecosystem Integrations                     │
│                                                                        │
│   Meta Commerce Manager                      Meta Graph API v19.0       │
│   (Scheduled Feed Fetch)                     (Batch Items Endpoint)    │
│            ▲                                          ▲                │
└────────────┼──────────────────────────────────────────┼────────────────┘
             │ HTTP GET (Hourly/Daily)                  │ POST /items_batch
             │ (XML / CSV Feed)                         │
┌────────────┴──────────────────────────────────────────┴────────────────┐
│                        Express Backend (server.ts)                     │
│                                                                        │
│  ├─ GET  /api/meta-catalog.xml   ──> RSS 2.0 / Google & FB format feed │
│  ├─ GET  /api/meta-catalog.csv   ──> Standard Meta CSV data feed       │
│  ├─ GET  /api/meta-catalog/preview -> JSON preview + diagnostics       │
│  ├─ GET  /api/meta-catalog/settings -> Meta config & last sync stats   │
│  ├─ POST /api/meta-catalog/settings -> Persist catalog ID & token      │
│  └─ POST /api/meta-catalog/sync    ──> Push batch to Meta Graph API    │
│                        ▲                                               │
└────────────────────────┼───────────────────────────────────────────────┘
                         │
┌────────────────────────┴───────────────────────────────────────────────┐
│                    Firestore Database & Product State                  │
│                                                                        │
│  ├─ 'products' collection        (Real-time stock, pricing, images)    │
│  └─ 'system_settings/meta_catalog' (Catalog ID, Sync log, Feed config) │
└────────────────────────▲───────────────────────────────────────────────┘
                         │
┌────────────────────────┴───────────────────────────────────────────────┐
│                       Admin Management Frontend                        │
│                                                                        │
│  ├─ src/components/AdminMetaCatalog.tsx (Full Meta Catalog Dashboard) │
│  ├─ src/services/metaCatalogService.ts  (API client & types)           │
│  ├─ Navigation link in AdminLayout.tsx  (Meta Catalog tab)             │
│  └─ Route registration in src/App.tsx   (/admin/meta-catalog)          │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & State Mapping

| View / Component | State / Hook | Triggered Action |
| :--- | :--- | :--- |
| `AdminMetaCatalog.tsx` | `feedUrls`, `copied` state | 1-click clipboard copy of `/api/meta-catalog.xml` and `/api/meta-catalog.csv` |
| `MetaCredentialsForm` | `catalogId`, `accessToken`, `pixelId` | Saves credentials to `/api/meta-catalog/settings` in Firestore |
| `MetaSyncTrigger` | `isSyncing`, `syncProgress`, `syncResult` | Triggers `/api/meta-catalog/sync` with live error handling and status log |
| `CatalogAuditTable` | `searchQuery`, `stockFilter`, `products` | Renders client-side filtered view of all items as mapped to Meta specs |
| `SetupWalkthrough` | `expandedStep` accordion state | Interactive step-by-step Meta Commerce Manager instructions |

---

## 5. Implementation Roadmap (Execution Steps)

1. **Backend Endpoints (`server.ts`)**:
   - Build dynamic XML builder for `/api/meta-catalog.xml` adhering to Meta's Product Feed RSS 2.0 specifications.
   - Build CSV exporter for `/api/meta-catalog.csv`.
   - Implement `/api/meta-catalog/settings` and `/api/meta-catalog/preview` endpoints.
   - Implement `/api/meta-catalog/sync` using Meta Graph API `/v19.0/{catalog_id}/items_batch` with batching (up to 499 items per batch as required by Meta).
2. **Frontend Service & Types (`src/services/metaCatalogService.ts`)**:
   - Define TypeScript interfaces for Meta feed items, sync responses, and settings.
   - Implement fetcher methods for preview, settings update, test connection, and batch sync.
3. **Admin Dashboard Component (`src/components/AdminMetaCatalog.tsx`)**:
   - Build the comprehensive Meta Catalog management view.
   - Include feed URLs with copy triggers, sync control card, product catalog diagnostic summary, search/filter table, and setup walkthrough.
4. **Navigation & Routing (`AdminLayout.tsx` & `src/App.tsx`)**:
   - Add "Meta Catalog" navigation link in `AdminLayout.tsx` with appropriate icon and badge.
   - Register `/admin/meta-catalog` route in `src/App.tsx`.
5. **Verification**:
   - Verify TypeScript compilation, test feed XML/CSV response generation, and ensure real-time Firestore synchronization.
