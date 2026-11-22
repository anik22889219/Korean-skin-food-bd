# Backend Architecture — Korean Skin Food BD (`/server/`)

The Express backend (`server.ts`) is organized into cohesive domain boundaries under `/server/` while keeping 100% REST API & Firestore schema compatibility with the React + Vite frontend.

## Infrastructure & Cross-Cutting Layers
- `server/config/env.ts` — Canonical site URL resolution, CORS origin allowlist, first-party OG image fallback (`/og-banner.jpg`), and Gemini API key lookup.
- `server/config/firebase.ts` — Firebase App initialization, Firestore client (`getServerDb`), and token-scoped Firestore REST helpers.
- `server/middleware/auth.ts` — Firebase ID token verification (`verifyFirebaseIdToken`), super-admin check requiring `emailVerified === true`, RBAC middlewares (`verifyAdminAuth`, `verifyFinanceAuth`, `verifyStaffOrWholesaleAuth`, `verifyUserOrStaffAuth`, `verifyOptionalAuth`, `verifyCreatorAuth`).
- `server/middleware/rateLimiter.ts` — IP sliding-window limiters (`aiRateLimiter`, `checkoutRateLimiter`, `publicFormRateLimiter`).
- `server/middleware/securityHeaders.ts` — COOP, HSTS, MIME-sniffing protection, CORS headers, and `no-store` for `/api/*`.
- `server/utils/validators.ts` — Bangladesh mobile number validator/normalizer (`^(?:\+?88)?01[3-9]\d{8}$`), magic-byte image inspection (`PNG`, `JPEG`, `WEBP`, `GIF`), XML escaper, undefined-field stripper.
- `server/utils/logger.ts` — Structured JSON logger with automatic redaction of phone numbers, emails, bearer tokens, and secrets.
- `server/utils/auditLog.ts` — Authoritative server-side writer for Firestore `audit_logs`.

## Domain Modules (12 Boundaries)
1. **Auth** (`server/modules/auth/routes.ts`) — `/api/auth/session` verified user/role inspection.
2. **Catalog & SEO** (`server/modules/catalog-seo/routes.ts`) — `/robots.txt`, `/sitemap.xml` (products, brands, guides, ingredients, concerns, quiz, routine builder, authenticity), `GET /api/seo/overview` (`verifyAdminAuth`), and SSR bot metadata injection.
3. **Orders & Checkout** (`server/modules/orders-checkout/routes.ts`) — Authoritative `POST /api/functions/placeOrder` (Zod validation, BD phone normalization, durable idempotency, server-side coupon validation + `usageCount` increment, atomic loyalty point redemption, live stock check), `POST /api/checkout/abandoned`, and `PATCH /api/admin/orders/:orderId/status`.
4. **Customers, Reviews & Loyalty** (`server/modules/customers/routes.ts` & `loyaltyService.ts`) — Server-verified `POST /api/reviews` (purchase check + `pending` moderation status), `GET/PATCH /api/admin/reviews`, atomic idempotent delivery loyalty award (`loyalty_ledger/earn-{orderId}`), `GET /api/loyalty/ledger`, and `support_tickets`.
5. **Steadfast Courier** (`server/modules/steadfast-courier/routes.ts`) — Consignment creation and status lookup (`verifyAdminAuth`) with delivery loyalty trigger.
6. **POS** (`server.ts` / POS domain) — Transactional in-store checkout (`verifyAdminAuth`).
7. **Inventory** (`server.ts` / Inventory domain) — AI inventory velocity & restock alerts (`verifyAdminAuth`).
8. **Wholesale** (`server.ts` / Wholesale domain) — B2B order creation (`verifyStaffOrWholesaleAuth`), payment ledger (`verifyFinanceAuth`), cancellation stock restoration.
9. **Finance** (`server.ts` / Finance domain) — Due collection, internal transfers, and journal entries (`verifyFinanceAuth`).
10. **Media** (`server/modules/media/routes.ts`) — Magic-byte validated invoice uploads (`/api/upload/invoice`, `/api/cloudinary/upload-invoice` with `verifyAdminAuth`), signed Cloudinary params, and YouTube Data API v3 flows.
11. **Marketing & Integrations** (`server.ts`) — Meta CAPI server dispatch, Meta Catalog & Pinterest feeds, tracking settings (`verifyAdminAuth`), Google Business OAuth reviews, Slack ops, and real `ad_performance` Meta Ads sync (`verifyAdminAuth`).
12. **Gemini AI** (`server.ts`) — Rate-limited conversational assistant (`/api/chatbot` with clean UTF-8 Bangla fallback), image search, and admin AI product/pricing/barcode helpers (`verifyAdminAuth`).

## Strangler Migration Readiness
Each router exports a standalone Express `Router` with Zod request schemas, typed service functions, and PII-safe logging, allowing any domain (e.g., Orders or Reviews) to be extracted into an independent service without altering frontend API contracts.
