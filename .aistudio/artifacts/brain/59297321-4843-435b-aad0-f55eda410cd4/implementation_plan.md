# Comprehensive On-Page SEO Engine & Structured Data Implementation

A full-spectrum On-Page SEO solution for Korean Skin Food Bangladesh, delivering dynamic meta tags, OpenGraph social cards, canonical link injection, and complete Schema.org JSON-LD microdata across the homepage, category catalogs, and product details.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions have been confirmed through user consultation:

- **Confirmed Decision 1 (Page Scope)**: Full dynamic On-Page SEO coverage across all core routes: Homepage, Product Details Pages (`/product/:id`), and Category/Brand Taxonomy Catalog pages (`/shop`, `/category/:slug`, `/brand/:slug`).
- **Confirmed Decision 2 (Metadata Generation)**: Hybrid automated dynamic generation with priority admin overrides. When custom SEO titles, meta descriptions, or keywords are authored in Admin SEO (or generated via Gemini AI), they take precedence over auto-generated product and taxonomy meta fallbacks.
- **Confirmed Decision 3 (Schema.org Rich Snippets)**: Complete ("All") JSON-LD schema integration:
  - **Product Schema**: Price in BDT, stock status, ratings, brand, GTIN/barcode, and review snippets.
  - **Organization & WebSite Schema**: Brand logo, contact points, sameAs social profiles, and sitelinks searchbox.
  - **BreadcrumbList Schema**: Clean hierarchical navigation chains for Google rich search results.
  - **LocalBusiness / Store Schema**: Bangladesh storefront identity, Google Business verified rating links, and service areas.

---

## 1. Overview & Core Concept

- **What It Does**: Establishes a centralized SEO management manager and dynamic `<head>` injector for this single-page application (SPA). As users and search crawlers navigate between the storefront, catalog categories, and individual K-beauty products, the system automatically synchronizes the document title, meta descriptions, canonical links, OpenGraph / Twitter social previews, and structured JSON-LD schemas.
- **Target Audience / Persona**: Organic search shoppers looking for authentic Korean skincare products in Bangladesh, social media users sharing product links via WhatsApp, Facebook, or Messenger, and store administrators managing brand search ranking.
- **Key Value**: Dramatically elevates search engine crawlability, rich snippet eligibility in Google Search (star ratings, price displays, in-stock badges), and provides rich preview cards when sharing K-beauty products across social platforms.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Centralized SEO Route Flow                        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│  Homepage (/)    │     │ Category (/shop) │     │ Product (/product/)  │
├──────────────────┤     ├──────────────────┤     ├──────────────────────┤
│ • Branded Title  │     │ • Dynamic Title  │     │ • Product Title      │
│ • Site Meta Desc │     │   (e.g., "COSRX  │     │   (Name + Brand)     │
│ • WebSite Schema │     │   Products in BD")│    │ • Auto/Custom Meta   │
│ • LocalBusiness  │     │ • Category Meta  │     │ • Price, Stock, Star │
│   & Org Schema   │     │ • BreadcrumbList │     │ • Product JSON-LD    │
│ • Social OG tags │     │   JSON-LD Schema │     │ • Rich OG Image Card │
└──────────────────┘     └──────────────────┘     └──────────────────────┘
```

1. **Browsing Product Details**:
   - The browser tab title instantly reflects: `[Product Name] - [Brand] | Korean Skin Food Bangladesh`.
   - The `<meta name="description">` renders an organic search snippet highlighting ingredients, skin type suitability, and Seoul authentication.
   - Dynamic OpenGraph tags render high-resolution product photography with direct BDT pricing metadata.
   - Embedded JSON-LD microdata enables Google Search to display rich stars, review count, price in BDT, and stock availability directly in search results.

2. **Browsing Category & Brand Taxonomies**:
   - Navigating to `/shop?category=Serum` or `/shop?brand=COSRX` updates the title to target high-intent Bangladeshi search queries (e.g., `COSRX Skincare in Bangladesh - Authentic K-Beauty | Korean Skin Food`).
   - BreadcrumbList microdata creates structured navigation paths in Google SERPs (`Home > Skincare > Serums`).

3. **Social Sharing Experience (WhatsApp, Facebook, Messenger, X)**:
   - When a link is shared into chat, the recipient sees a rich preview card with a high-res image, clear promotional summary, and verified authentic guarantee.

4. **Admin SEO Customization**:
   - Within the existing Admin SEO suite, administrators can view live previews of Google search snippet cards and social sharing cards.
   - Custom overrides saved in the admin panel immediately reflect on the live storefront.

### Visual Identity & Theme

- **SEO Card Previews**: Clean Google SERP style preview (blue clickable headline, green/gray breadcrumb path, snippet description) and Facebook/Twitter large image card preview in the Admin SEO editor.
- **Micro-Interactions**: Real-time character counters for Title (30–60 chars) and Meta Description (120–160 chars) with color-coded optimal indicators (green for ideal, amber for close, red for over-length).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Lightweight Native Document Head Manager vs. Heavy Third-Party Libraries**
  - *Chosen Approach*: Implement a lightweight, zero-dependency `SeoHead` React component and helper service that manages `<head>` elements (title, meta, link canonical, script ld+json) directly.
  - *Why*: Eliminates dependency incompatibilities or runtime React 18/19 conflicts often encountered with legacy `react-helmet` packages, while ensuring fast and leak-free cleanup on route transitions.
  - *Alternatives Considered*: Standard `react-helmet-async` (adds external dependency weight and provider wrappers).

- **Decision 2: Automated Dynamic Fallbacks with Admin Priority**
  - *Chosen Approach*: When a product or taxonomy has custom `seoTitle` or `metaDescription` saved in Firestore / product data, prioritize it. If absent, fall back to well-crafted algorithmic templates based on product name, brand, key ingredients, and authentic Bangladesh delivery promise.
  - *Why*: Ensures 100% of products and categories have immediate, search-optimized meta tags from day one, without requiring the admin to manually author every single item before launching.

- **Decision 3: Complete Schema.org Structured Data Suite**
  - *Chosen Approach*: Inject dynamic `<script type="application/ld+json">` tags containing Product, BreadcrumbList, WebSite, and LocalBusiness specifications.
  - *Why*: Directly aligns with user requirement for all schemas, unlocking maximum visibility across Google rich cards, image search, knowledge panels, and merchant listings.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SEO State & Injection Flow                      │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
      ┌────────────────────────────┼────────────────────────────┐
      ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────┐          ┌──────────────────┐
│  Product Data │          │ Admin SEO     │          │ Storefront       │
│  & Taxonomies │          │ Custom Values │          │ Context / Router │
└───────┬───────┘          └───────┬───────┘          └────────┬─────────┘
        │                          │                           │
        └──────────────────────────┼───────────────────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │       seoService Utility      │
                   │ • buildProductMetadata()      │
                   │ • buildCategoryMetadata()     │
                   │ • buildGlobalSchemas()        │
                   └───────────────┬───────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │       <SeoHead /> Component   │
                   │ • Updates document.title      │
                   │ • Upserts <meta> tags         │
                   │ • Upserts <link rel=canonical>│
                   │ • Injects JSON-LD <script>    │
                   └───────────────┬───────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │ DOM Head & Search Bot Preview │
                   └───────────────────────────────┘
```

### Component & State Mapping

1. **`src/services/seoService.ts`**:
   - `buildProductSeo(product, origin)`: Resolves title, description, canonical URL, OG tags, and full Product + Breadcrumb JSON-LD schema (with price in BDT, in-stock availability, brand, and reviews).
   - `buildCategorySeo(category, brand, origin)`: Generates search-optimized title, description, canonical link, and CollectionPage / Breadcrumb JSON-LD schema.
   - `buildHomepageSeo(origin)`: Provides organization and local business schemas with Google Business rating references.
   - `updateHeadMetadata(metaConfig)`: Helper to cleanly update document title, open-graph tags, meta tags, and LD+JSON scripts in the DOM.

2. **`src/components/SeoHead.tsx`**:
   - Declarative React component wrapping `updateHeadMetadata`.
   - Cleans up and restores baseline title/tags when routes unmount.

3. **Storefront Route Integration**:
   - **`src/components/ProductDetail.tsx`**: Renders `<SeoHead />` with product specific data, prices, ratings, and image tags.
   - **`src/components/ShopCategoryPage.tsx`** & **`src/components/StoreCatalog.tsx`**: Renders `<SeoHead />` with category/brand filtered tags.
   - **`src/App.tsx`** / **`src/components/MainLayout.tsx`**: Renders baseline store metadata and Global Organization / LocalBusiness schema.

4. **`src/components/AdminSEO.tsx`**:
   - Enhanced with live Google SERP and Social Share Card previews.
   - Character count indicators and quick AI regeneration with Gemini.
