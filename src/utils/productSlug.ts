export interface ProductLinkLike {
  id: string;
  name?: string;
  brand?: string;
  ml?: string;
  seoSlug?: string;
  image?: string;
  generatedSeoContent?: string | Record<string, any>;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Checks whether a string looks like a random/raw auto-generated ID
 * (e.g. prod_1739..., 173920192, or 20-char mixed-case Firestore doc ID).
 */
export function isRawGeneratedId(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/^(prod|item|p)[_-]?\d{6,}$/i.test(trimmed)) return true;
  if (/^\d{7,}$/.test(trimmed)) return true;
  // Random Firestore-like alphanumeric IDs without hyphens (>= 16 chars)
  if (/^[a-zA-Z0-9]{16,}$/.test(trimmed) && !trimmed.includes('-')) return true;
  return false;
}

/**
 * Converts arbitrary text into a clean URL-safe lowercase kebab-case slug.
 */
export function slugifyProductText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 110)
    .replace(/-+$/g, '');
}

/**
 * Validates that a product slug is clean, URL-safe, and non-random.
 */
export function isCleanProductSlug(slug?: string | null): boolean {
  if (!slug || typeof slug !== 'string') return false;
  const trimmed = slug.trim();
  if (trimmed.length < 3 || trimmed.length > 120) return false;
  if (!SLUG_REGEX.test(trimmed)) return false;
  if (isRawGeneratedId(trimmed)) return false;
  return true;
}

/**
 * Returns the preferred URL segment for a product: clean seoSlug if valid, else product.id.
 */
export function getProductSlugOrId(product: Pick<ProductLinkLike, 'id' | 'seoSlug'>): string {
  if (isCleanProductSlug(product.seoSlug)) {
    return product.seoSlug!.trim();
  }
  return product.id;
}

/**
 * Returns the canonical storefront relative path for a product.
 */
export function getProductPath(product: Pick<ProductLinkLike, 'id' | 'seoSlug'>): string {
  const segment = getProductSlugOrId(product);
  return `/product/${encodeURIComponent(segment)}`;
}

/**
 * Suggests a unique, SEO-friendly product slug from brand, product name, and size.
 */
export function suggestProductSlug(
  product: Pick<ProductLinkLike, 'id' | 'name' | 'brand' | 'ml'>,
  usedSlugs?: Set<string>
): string {
  const brandClean = (product.brand || '').trim();
  const nameClean = (product.name || '').trim();
  const mlClean = (product.ml || '').trim();

  let combined = nameClean;
  if (
    brandClean &&
    brandClean.toLowerCase() !== 'korean skin food bd' &&
    !nameClean.toLowerCase().startsWith(brandClean.toLowerCase())
  ) {
    combined = `${brandClean} ${nameClean}`;
  }
  if (mlClean && !combined.toLowerCase().includes(mlClean.toLowerCase())) {
    combined = `${combined} ${mlClean}`;
  }

  let base = slugifyProductText(combined);
  if (!base || base.length < 3) {
    base = slugifyProductText(product.id || 'product') || `product-${Date.now().toString(36)}`;
  }

  if (!usedSlugs) return base;

  let candidate = base;
  let counter = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter++;
  }
  return candidate;
}

export type ProductLinkIssueType =
  | 'missing_slug'
  | 'invalid_slug'
  | 'duplicate_slug'
  | 'broken_canonical'
  | 'missing_image';

export interface ProductLinkAuditItem {
  productId: string;
  productName: string;
  brand: string;
  currentPath: string;
  seoSlug: string;
  suggestedSlug: string;
  issues: ProductLinkIssueType[];
  issueLabels: string[];
  severity: 'error' | 'warning' | 'healthy';
}

/**
 * Audits all products for broken, unfriendly, duplicate, or malformed URLs & meta links.
 */
export function analyzeProductLinkHealth(products: ProductLinkLike[]): ProductLinkAuditItem[] {
  const slugCountMap = new Map<string, number>();
  products.forEach((p) => {
    const clean = (p.seoSlug || '').trim().toLowerCase();
    if (clean) {
      slugCountMap.set(clean, (slugCountMap.get(clean) || 0) + 1);
    }
  });

  const reservedSlugs = new Set<string>();
  products.forEach((p) => {
    if (isCleanProductSlug(p.seoSlug)) {
      reservedSlugs.add(p.seoSlug!.trim().toLowerCase());
    }
  });

  return products.map((p) => {
    const issues: ProductLinkIssueType[] = [];
    const issueLabels: string[] = [];
    const rawSlug = (p.seoSlug || '').trim();
    const lowerSlug = rawSlug.toLowerCase();

    if (!rawSlug) {
      if (isRawGeneratedId(p.id) || !SLUG_REGEX.test(p.id)) {
        issues.push('missing_slug');
        issueLabels.push('Raw or unfriendly ID URL (needs clean SEO slug)');
      }
    } else if (!isCleanProductSlug(rawSlug)) {
      issues.push('invalid_slug');
      issueLabels.push('Slug has invalid characters, spaces, or uppercase letters');
    } else if ((slugCountMap.get(lowerSlug) || 0) > 1) {
      issues.push('duplicate_slug');
      issueLabels.push(`Duplicate slug "/product/${rawSlug}" shared by multiple products`);
    }

    // Check customCanonical inside generatedSeoContent if present
    if (p.generatedSeoContent) {
      try {
        const parsed =
          typeof p.generatedSeoContent === 'string'
            ? JSON.parse(p.generatedSeoContent)
            : p.generatedSeoContent;
        const customCanonical = typeof parsed?.customCanonical === 'string' ? parsed.customCanonical.trim() : '';
        if (customCanonical) {
          const isValidHttp = /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(customCanonical);
          const expectedSegment = getProductSlugOrId(p);
          if (!isValidHttp || (rawSlug && customCanonical.includes(`/product/${p.id}`) && rawSlug !== p.id)) {
            issues.push('broken_canonical');
            issueLabels.push(
              !isValidHttp
                ? 'Malformed custom canonical URL'
                : `Canonical still points to raw ID instead of /product/${expectedSegment}`
            );
          }
        }
      } catch {
        // Ignore JSON parse errors here (caught in schema audit)
      }
    }

    if (!p.image || !/^https?:\/\//i.test(p.image.trim())) {
      issues.push('missing_image');
      issueLabels.push('Missing or non-HTTPS primary product image for OpenGraph');
    }

    let suggestedSlug = rawSlug;
    if (!isCleanProductSlug(rawSlug) || (slugCountMap.get(lowerSlug) || 0) > 1) {
      suggestedSlug = suggestProductSlug(p, reservedSlugs);
      reservedSlugs.add(suggestedSlug);
    }

    const severity: 'error' | 'warning' | 'healthy' =
      issues.includes('invalid_slug') || issues.includes('duplicate_slug') || issues.includes('broken_canonical')
        ? 'error'
        : issues.length > 0
          ? 'warning'
          : 'healthy';

    return {
      productId: p.id,
      productName: p.name || 'Unnamed Product',
      brand: p.brand || 'Korean Skin Food BD',
      currentPath: getProductPath(p),
      seoSlug: rawSlug,
      suggestedSlug,
      issues,
      issueLabels,
      severity,
    };
  });
}
