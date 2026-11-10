# Dynamic Analytics & Tracking Health Architecture

A comprehensive, production-grade system to transform the **Analytics & Tracking Health Center** (`/admin/analytics-health`) into a fully dynamic, site-wide configuration engine for **Korean Skin Food BD**. Configuring or updating tracking identifiers, toggles, or Meta CAPI credentials directly in the admin dashboard will automatically persist to Firestore, sync to the server, and immediately apply across the entire storefront and checkout flow without requiring code redeployments or server restarts.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions and user configurations are aligned:

- **Confirmed Decision 1 (User-Specified Google Tag Manager ID)**: The primary Google Tag Manager Container ID is configured to **`GTM-T2SWSLZ8`**. This container ID will be set as the initial default and verified in HTML `<head>`, `index.html` `<noscript>`, and Firestore `settings/tracking`.
- **Confirmed Decision 2 (Managed Integrations Suite)**: Full dynamic control for:
  - **Google Tag Manager (GTM)**: Container ID `GTM-T2SWSLZ8` (editable, toggleable).
  - **Google Analytics 4 (GA4)**: Measurement ID (e.g. `G-8DXKFYM3YQ`, editable, toggleable).
  - **Meta Pixel**: Pixel ID (e.g. `1181966473667367`, editable, toggleable).
  - **Meta Conversions API (CAPI)**: Server-side purchase dispatching with token management, test event code, and durable idempotency.
- **Confirmed Decision 3 (Storage & Real-Time Propagation)**: Persisted in Cloud Firestore under `/settings/tracking` with real-time subscription (`onSnapshot`) on the client and server-side synchronization. When an administrator saves changes, active browser sessions and backend CAPI dispatchers adopt the updated configuration instantly.
- **Confirmed Decision 4 (Input Validation & Test Event Simulator)**: Built-in syntax and format validation for all IDs (GA4 `G-XXXXXXXXXX`, GTM `GTM-XXXXXXX`, Meta Pixel 15–16 numeric digits, and Meta CAPI access token). Includes interactive live event simulation (PageView, ViewItem, AddToCart, Purchase) with live payload inspection and Meta Test Event Code dispatching.
- **Confirmed Decision 5 (Zero-Regret Fallback Safety)**: Existing environment variables and verified fallbacks (`GTM-T2SWSLZ8`, `G-8DXKFYM3YQ`, `1181966473667367`) serve as safe boot values if Firestore is momentarily unreachable, guaranteeing zero downtime or tracking drop-off.

---

## 1. Overview & Core Concept

### What It Delivers
1. **Dynamic Admin Configuration Studio**: An intuitive, hardened configuration interface inside `/admin/analytics-health` allowing store managers to view current health status, update GTM Container ID (`GTM-T2SWSLZ8`), GA4 Measurement ID, Meta Pixel ID, Meta CAPI Access Token, and Meta Test Event Code, and toggle each tracking channel on or off.
2. **Instant Site-Wide Propagation**: A centralized tracking subscriber that dynamically loads configuration from Firestore doc `settings/tracking`. When updated in Admin, the client-side `analyticsService` re-initializes tracking scripts in the DOM on-the-fly across all storefront pages (`/`, `/shop`, `/product/:id`, `/checkout`, etc.).
3. **Server-Side Meta CAPI Dynamic Credentials**: The Express backend (`server.ts`) dynamically resolves the Meta Pixel ID and CAPI Access Token from Firestore rather than relying exclusively on static environment variables, ensuring server-side purchase conversions always fire with valid credentials.
4. **Resilient DOM Script Injector**: Dynamic insertion and hot-swapping of Google Tag Manager `<script>`/`<noscript>` (`GTM-T2SWSLZ8`), Google Analytics 4 `gtag.js`, and Meta Pixel `fbevents.js` with proper deduplication, preventing duplicate tags or script leaks when IDs are updated.
5. **Real-Time Health & Diagnostic Center**: Instant diagnostic badges verifying whether each script is loaded, whether dataLayer is receiving pushes, whether Meta Pixel is initialized, and whether the server CAPI proxy is ready.
6. **Live Event Dispatch Simulator**: Interactive testing buttons for `page_view`, `view_item`, `add_to_cart`, and `purchase` with Meta Test Event Code integration and live JSON payload inspection.

### Target Audience & Persona
- **Store Administrator & Marketing Lead**: Manages ad campaigns, sets up new Meta Pixels or GA4 properties, rotates CAPI access tokens, updates GTM containers, and tests conversion tracking without developer assistance.
- **Storefront Visitors & Customers**: Experience fast, seamless browsing with privacy-respectful, deduplicated e-commerce event tracking.
- **Platform Developers**: Clean, decoupled architecture with strict TypeScript types, ABAC security rules, and unified error handling.

---

## 2. User Experience & Visual Design

Following the universal **SaaS & Dashboard guidelines** (`references/3_saas_dashboard.md`) and anti-AI-slop principles:

### Visual Identity & Theme
- **Dominant Neutral Canvas (60%)**: Pure white (`bg-white`) in light mode and deep neutral slate (`bg-slate-900` / `bg-slate-950`) in dark mode with refined surface boundaries.
- **Structural Surfaces (30%)**: Clean, flat cards with subtle 1px hairline borders (`border-slate-200 dark:border-slate-800`), avoiding nested cards within cards.
- **Accent Budget (10%)**: Seoul Rose (`#E91E8C`) concentrated strictly on primary save actions, active tabs, and focused inputs.
- **Zero-Pill Discipline**: Status indicators and metadata rendered as clean, unboxed typography with typographic separators (`·`, `/`) instead of colored candy pills.
- **Tabular Figures**: All timestamps, event counts, IDs, and payload metrics formatted with `font-mono tabular-nums`.

### Key User Flows

#### A. Health Center Dashboard & Configuration Studio (`/admin/analytics-health`)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Admin / Integrations / Analytics & Tracking Health Center                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐ ┌──────────────────┐ ┌───────────────┐ ┌──────────────┐ │
│ │ Tag Manager(GTM) │ │ Google Analytics │ │ Meta Pixel    │ │ Server CAPI  │ │
│ │ GTM-T2SWSLZ8     │ │ G-8DXKFYM3YQ     │ │ 118196647366..│ │ Connected    │ │
│ │ Status: Active   │ │ Status: Active   │ │ Status: Active│ │ Graph v19.0  │ │
│ └──────────────────┘ └──────────────────┘ └───────────────┘ └──────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ EDIT TRACKING SETTINGS & CREDENTIALS ]                                     │
│                                                                              │
│ Google Tag Manager (GTM):                                                    │
│ [x] Enable GTM Container                                                     │
│ Container ID:   [ GTM-T2SWSLZ8           ] (Format: GTM-XXXXXXX)            │
│                                                                              │
│ Google Analytics 4 (GA4):                                                    │
│ [x] Enable GA4 Tracking                                                      │
│ Measurement ID: [ G-8DXKFYM3YQ           ] (Format: G-XXXXXXXXXX)           │
│                                                                              │
│ Meta Pixel:                                                                  │
│ [x] Enable Meta Browser Pixel                                                │
│ Pixel ID:       [ 1181966473667367       ] (15-16 Digits)                   │
│                                                                              │
│ Meta Conversions API (CAPI - Server Side):                                   │
│ [x] Enable Server-Side CAPI Purchase Dispatch                                │
│ Access Token:   [ EAAG...••••••••••••••• ] [ Show / Hide ]                   │
│ Test Event Code:[ TEST89421              ] (Optional for Events Manager)    │
│                                                                              │
│ [ Cancel ]                               [ Save & Apply Live to Website ]    │
├──────────────────────────────────────────────────────────────────────────────┤
│ LIVE EVENT DISPATCH SIMULATOR                                                │
│ [ Simulate PageView ] [ Simulate ViewItem ] [ AddToCart ] [ Purchase ]      │
├──────────────────────────────────────────────────────────────────────────────┤
│ LIVE SESSION DISPATCH STREAM TABLE                                           │
│ Event Type    │ Event ID           │ Targets          │ Time     │ Action    │
│ purchase      │ test_purchase_17.. │ GTM, GA4, CAPI   │ 10:24:12 │ [Inspect] │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### B. Inspection Modal
- Full formatted JSON preview of dispatched dataLayer and CAPI payloads.
- Quick "Copy JSON" and "Copy Event ID" actions.
- Verification notes explaining deduplication (`eventID` parity between Meta Pixel and server CAPI).

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Approach | Why | Alternatives Considered |
|---|---|---|---|
| **GTM Container ID** | Default to user-specified `GTM-T2SWSLZ8` with dynamic override | Accurately targets the user's active Google Tag Manager container across `index.html`, client runtime, and Firestore. | Hardcoding old container ID or waiting for manual configuration. |
| **Configuration Storage** | Firestore doc `settings/tracking` with real-time `onSnapshot` | Instant live updates across all active visitor sessions without needing a build, redeploy, or container restart. | Storing only in `.env` (requires developer rebuild) or localStorage (only affects single device). |
| **Server Synchronization** | Express server reads from Firestore cache + admin sync route | Ensures server-side CAPI purchase conversions use newly configured tokens immediately. | Polling Firestore on every purchase request (adds latency) or manual server restart (disruptive). |
| **Script Hot-Swapping** | Safe DOM injection manager in `analyticsService` | When tracking ID changes, dynamically replaces `<script>` tag and re-initializes `gtag('config')` and `fbq('init')`. | Requiring a hard reload of the website or leaving duplicate tags in `<head>`. |
| **Validation Architecture** | Client-side pre-validation + Server schema guard | Prevents malformed IDs (e.g. invalid prefix, truncated tokens) from breaking tracking in production. | Saving raw unvalidated strings which could silently kill conversion tracking. |
| **Allow-List & Deduplication** | Strict `order_source === 'WEBSITE'` + deterministic `purchase_{orderId}` eventId | Prevents duplicate purchase reporting between browser pixel and server CAPI, while keeping POS orders separate. | Blind dispatching on both channels causing 200% over-reported ad conversion revenue. |

---

## 4. Technical Architecture & Data Strategy

### Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ADMIN HEALTH CENTER (/admin/analytics-health)               │
│  - View live status of GTM (GTM-T2SWSLZ8), GA4, Meta Pixel, and CAPI        │
│  - Edit IDs, Access Tokens, and Enable/Disable Toggles                      │
│  - Run Live Event Simulations with payload inspection                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ (Save Settings Mutation)
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FIRESTORE DATABASE (/settings/tracking)                 │
│  {                                                                          │
│    gtm: { enabled: true, containerId: "GTM-T2SWSLZ8" },                     │
│    ga4: { enabled: true, measurementId: "G-8DXKFYM3YQ" },                   │
│    metaPixel: { enabled: true, pixelId: "1181966473667367" },               │
│    metaCapi: { enabled: true, accessToken: "...", testEventCode: "" },      │
│    updatedAt: "2026-11-07T...", updatedBy: "admin@koreanskinfoodbd.com"     │
│  }                                                                          │
└──────────────────────┬──────────────────────────────────────┬───────────────┘
                       │                                      │
        (Real-Time onSnapshot Sync)            (Server Cache & Validation)
                       ▼                                      ▼
┌──────────────────────────────────────────┐ ┌────────────────────────────────┐
│          CLIENT ANALYTICS SERVICE        │ │       EXPRESS SERVER (server.ts│
│            (analyticsService.ts)         │ │                                │
│  - Injects GTM-T2SWSLZ8 & tags           │ │  - GET /api/tracking/settings  │
│  - Powers all Storefront & Checkout tags │ │  - POST /api/tracking/settings │
│  - Respects integration enable toggles   │ │  - Server CAPI Purchase uses   │
│  - Standardizes e-commerce payloads      │ │    live Pixel ID & Token       │
└──────────────────────────────────────────┘ └────────────────────────────────┘
```

### Data Schema (`settings/tracking`)

```typescript
export interface TrackingSettings {
  gtm: {
    enabled: boolean;
    containerId: string; // e.g. "GTM-T2SWSLZ8"
  };
  ga4: {
    enabled: boolean;
    measurementId: string; // e.g. "G-8DXKFYM3YQ"
  };
  metaPixel: {
    enabled: boolean;
    pixelId: string; // e.g. "1181966473667367"
  };
  metaCapi: {
    enabled: boolean;
    accessToken?: string;
    testEventCode?: string;
  };
  customScripts?: {
    headerScript?: string;
    bodyScript?: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}
```

---

## 5. Phased Implementation Roadmap

### Phase 1: Static Fallback & HTML Alignment
- Update `index.html` to reference `GTM-T2SWSLZ8` in both `<head>` and `<body>` `<noscript>`.
- Set default GTM container ID to `GTM-T2SWSLZ8` in all analytics fallback constants.

### Phase 2: Tracking Settings Service & Firestore Persistence
- Create `src/services/trackingSettingsService.ts` to manage fetching, updating, and listening (`onSnapshot`) to `/settings/tracking`.
- Include safe fallbacks to `GTM-T2SWSLZ8`, `G-8DXKFYM3YQ`, and `1181966473667367`.
- Add strict validation functions:
  - `validateGtmId(id: string)`: matches `^GTM-[A-Z0-9]+$`
  - `validateGa4Id(id: string)`: matches `^G-[A-Z0-9]+$`
  - `validatePixelId(id: string)`: matches `^\d{12,20}$`

### Phase 3: Dynamic Analytics Service Engine (`analyticsService.ts`)
- Upgrade `AnalyticsService` to subscribe to `trackingSettingsService` in real time.
- Implement dynamic script mounting/updating:
  - If GTM Container ID changes or is toggled, update `<script>` and `<iframe>` noscript tags for `GTM-T2SWSLZ8`.
  - If GA4 Measurement ID changes or is toggled on/off, update `<script>` tag and call `gtag('config', id)`.
  - If Meta Pixel ID changes or is toggled, update `fbq('init', id)`.
- Respect `enabled` flags on all tracking methods (`trackPageView`, `trackViewItem`, `trackAddToCart`, `trackPurchase`, etc.).

### Phase 4: Server-Side Dynamic CAPI Resolution (`server.ts`)
- Add `GET /api/tracking/settings` and `POST /api/tracking/settings` with staff/admin authentication.
- Update `/api/tracking/meta-capi` to resolve the current active Pixel ID and Access Token from the cached Firestore `settings/tracking` doc before dispatching to Meta Graph API v19.0.
- Ensure the server test status endpoint `/api/tracking/meta-capi/status` reflects the live Firestore settings.

### Phase 5: Overhaul Health Center UI (`AdminAnalyticsHealth.tsx`)
- Display updated active container `GTM-T2SWSLZ8` in the diagnostics grid.
- Add **Edit Tracking Settings** drawer/section with:
  - GTM, GA4, Meta Pixel, and Meta CAPI input fields and enable/disable toggles.
  - Real-time format validation with clear inline hints.
  - Password-masked token input with show/hide toggle for CAPI Access Token.
  - Meta Test Event Code input.
  - "Save & Apply Live to Entire Website" button with loading state and success/error feedback.
- Retain and enhance the **Diagnostics Grid**:
  - Live probe of `gtag.js`, `dataLayer`, `fbevents.js`, and CAPI server status.
  - Indicator showing whether settings were loaded from Firestore or fallback.
- Retain and enhance the **Interactive Live Event Simulator**:
  - Simulate PageView, ViewItem, AddToCart, Purchase with payload inspector modal.

### Phase 6: Verification & Quality Assurance
- Run `compile_applet` and `lint_applet` to ensure zero compilation or syntax errors.
- Test changing an ID in Admin and verify that:
  - It saves to Firestore.
  - The browser `dataLayer` and `fbq` reflect the change without page refresh.
  - The live simulator successfully fires events with the new configuration.
- Verify storefront product view, cart, and checkout flow remain unaffected and functional.
