import { Product } from '../types';
import { SkincareGuide } from '../data/skincareGuides';
import { BrandSeoProfile } from '../data/brandProfiles';

export interface SeoMetadata {
  title: string;
  description: string;
  canonicalUrl?: string;
  keywords?: string[];
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  noindex?: boolean;
}

export const SITE_NAME = 'Korean Skin Food BD';
export const SITE_URL = 'https://koreanskinfood.web.app';
export const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80';
export const DEFAULT_HOMEPAGE_TITLE = 'Korean Skin Food BD | Authentic Korean Skincare in Bangladesh';
export const DEFAULT_HOMEPAGE_DESCRIPTION = 'Shop authentic Korean skincare products in Bangladesh at Korean Skin Food BD. Explore trusted Korean beauty brands, skincare essentials, product information and convenient nationwide delivery.';

/**
 * Strips HTML tags, excess whitespace, and newlines from metadata strings.
 */
export const sanitizeMetaText = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Normalizes canonical URLs by enforcing HTTPS absolute URL, removing trailing slashes (except root),
 * and stripping marketing/tracking query parameters (utm_*, fbclid, gclid, etc.).
 */
export const buildCanonicalUrl = (pathWithParams?: string): string => {
  const base = SITE_URL.replace(/\/+$/, '');
  if (!pathWithParams || pathWithParams === '/' || pathWithParams === '') {
    return `${base}/`;
  }

  try {
    const full = pathWithParams.startsWith('http') ? pathWithParams : `${base}${pathWithParams.startsWith('/') ? '' : '/'}${pathWithParams}`;
    const parsed = new URL(full);
    
    // Strip common tracking and session parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid', 'ref', 'source'];
    trackingParams.forEach(p => parsed.searchParams.delete(p));

    // Normalize path: remove trailing slash if not root
    let cleanPath = parsed.pathname;
    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }

    const query = parsed.searchParams.toString();
    return `${base}${cleanPath}${query ? `?${query}` : ''}`;
  } catch {
    return `${base}${pathWithParams.startsWith('/') ? '' : '/'}${pathWithParams}`;
  }
};

/**
 * Build dynamic SEO metadata for the Storefront Homepage
 */
export const buildHomepageSeo = (): SeoMetadata => {
  const canonicalUrl = buildCanonicalUrl('/');

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    '@id': `${SITE_URL}/#organization`,
    name: 'Korean Skin Food BD',
    alternateName: ['Korean Skin Food Bangladesh', 'KSF BD'],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
    description: DEFAULT_HOMEPAGE_DESCRIPTION,
    priceRange: '৳৳',
    sameAs: [
      'https://www.facebook.com/koreanskinfoodbd',
      'https://www.instagram.com/koreanskinfoodbd',
      'https://wa.me/8801755837545',
      'https://share.google/lEQv5trQv88b0w8WT'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+8801755837545',
      contactType: 'customer service',
      areaServed: 'BD',
      availableLanguage: ['Bengali', 'English']
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Banani Road 11',
      addressLocality: 'Dhaka',
      postalCode: '1213',
      addressCountry: 'BD'
    }
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Korean Skin Food BD',
    publisher: {
      '@id': `${SITE_URL}/#organization`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/shop?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  return {
    title: DEFAULT_HOMEPAGE_TITLE,
    description: DEFAULT_HOMEPAGE_DESCRIPTION,
    canonicalUrl,
    keywords: [
      'Korean Skincare Bangladesh',
      'Authentic K-Beauty Dhaka',
      'Korean Skin Food BD',
      'COSRX Bangladesh',
      'Beauty of Joseon BD',
      'SKIN1004 Bangladesh',
      'Seoul imported cosmetics',
      'Korean Sunscreen Bangladesh',
      'Korean moisturizer Dhaka'
    ],
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: 'Korean Skin Food BD Authentic Korean Skincare in Bangladesh',
    twitterCard: 'summary_large_image',
    jsonLd: [organizationSchema, websiteSchema]
  };
};

/**
 * Build dynamic SEO metadata for a Product Details Page
 * Format prescribed:
 * Title: {Product Name} {Size} | Price in Bangladesh | Korean Skin Food BD
 * Description: Discover {Product Name} at Korean Skin Food BD. Explore product details, ingredients, skin compatibility, directions for use, and current availability in Bangladesh.
 */
export const buildProductSeo = (product: Product): SeoMetadata => {
  const canonicalUrl = buildCanonicalUrl(`/product/${product.id}`);

  // Compose exact title according to prompt guidelines
  const sizeSuffix = product.ml && product.ml.trim() ? ` ${product.ml.trim()}` : '';
  const standardTitle = `${product.name}${sizeSuffix} | Price in Bangladesh | Korean Skin Food BD`;
  const title = (product.seoTitle || product.metaTitle)?.trim() || standardTitle;

  // Compose exact description according to prompt guidelines
  const standardDesc = `Discover ${product.name} at Korean Skin Food BD. Explore product details, ingredients, skin compatibility, directions for use, and current availability in Bangladesh.`;
  const description = sanitizeMetaText(product.metaDescription || standardDesc);

  // Price determination: use retail/discount price in BDT
  const regularPrice = typeof product.price === 'number' ? product.price : (product.retailPrice || 0);
  const salePrice = typeof product.discountPrice === 'number' && product.discountPrice > 0 
    ? product.discountPrice 
    : (typeof product.discountRetailPrice === 'number' && product.discountRetailPrice > 0 ? product.discountRetailPrice : regularPrice);
  const activePrice = salePrice > 0 ? salePrice : regularPrice;

  const isAvailable = (product.stock ?? 0) > 0;
  const brandName = product.brand || 'Korean Skin Food BD';
  const ogImage = product.image || (product.images && product.images[0]) || DEFAULT_OG_IMAGE;
  const ogImageAlt = product.imageAltText || product.altText || `${product.name} ${brandName} authentic Korean skincare in Bangladesh`;

  // Product Schema.org JSON-LD
  const productSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name: product.name,
    image: [product.image, ...(product.images || [])].filter(Boolean),
    description: sanitizeMetaText(product.description || description),
    sku: product.sku || product.barcode || product.id,
    brand: {
      '@type': 'Brand',
      name: brandName
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'BDT',
      price: activePrice,
      priceValidUntil: '2028-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Korean Skin Food BD'
      }
    }
  };

  // Only include aggregateRating if real rating and review counts exist in Firestore
  if (product.rating && product.rating > 0 && product.reviewsCount && product.reviewsCount > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating.toFixed(1)),
      reviewCount: product.reviewsCount,
      bestRating: '5',
      worstRating: '1'
    };
  }

  // Breadcrumb Hierarchy Schema (Home -> Category -> Brand -> Product)
  const categorySlug = encodeURIComponent(product.category || 'All');
  const brandSlug = encodeURIComponent(product.brand || 'Korean');

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category || 'Skincare',
        item: `${SITE_URL}/shop?category=${categorySlug}`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.brand,
        item: `${SITE_URL}/brand/${product.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: canonicalUrl
      }
    ]
  };

  const keywords = [
    product.name,
    brandName,
    `${brandName} Bangladesh`,
    `${product.name} price in Bangladesh`,
    `${product.category || 'Skincare'} BD`,
    'Korean Skincare Bangladesh'
  ];
  if (product.keyIngredients && product.keyIngredients.length > 0) {
    keywords.push(...product.keyIngredients);
  }

  return {
    title,
    description,
    canonicalUrl,
    keywords,
    ogType: 'product',
    ogImage,
    ogImageAlt,
    twitterCard: 'summary_large_image',
    jsonLd: [productSchema, breadcrumbSchema]
  };
};

/**
 * Build dynamic SEO metadata for Category Pages or Filtered Shop views
 */
export const buildCategorySeo = (paramsOrCategory: string | {
  category?: string;
  brand?: string;
  skinType?: string;
  concern?: string;
  search?: string;
}): SeoMetadata => {
  const categoryName: string | undefined = typeof paramsOrCategory === 'string' ? paramsOrCategory : paramsOrCategory?.category;
  const brandName: string | undefined = typeof paramsOrCategory === 'object' && paramsOrCategory !== null ? paramsOrCategory.brand : undefined;
  const skinType: string | undefined = typeof paramsOrCategory === 'object' && paramsOrCategory !== null ? paramsOrCategory.skinType : undefined;
  const concern: string | undefined = typeof paramsOrCategory === 'object' && paramsOrCategory !== null ? paramsOrCategory.concern : undefined;
  const search: string | undefined = typeof paramsOrCategory === 'object' && paramsOrCategory !== null ? paramsOrCategory.search : undefined;

  let title = 'Shop Authentic Korean Skincare in Bangladesh | Korean Skin Food BD';
  let description = 'Shop authentic Korean skincare in Bangladesh. Explore cleansers, toners, serums, sunscreens, and creams with fast nationwide delivery.';
  let queryParams = new URLSearchParams();

  if (categoryName && categoryName !== 'All') {
    queryParams.set('category', categoryName);
    title = `Korean ${categoryName} in Bangladesh | Korean Skin Food BD`;
    description = `Shop authentic Korean ${categoryName} in Bangladesh. Explore trusted K-Beauty brands, verified ingredients, skin benefits, and fast nationwide delivery.`;
  }

  if (brandName && brandName !== 'All') {
    queryParams.set('brand', brandName);
    title = categoryName && categoryName !== 'All' 
      ? `${brandName} ${categoryName} in Bangladesh | Korean Skin Food BD`
      : `${brandName} Bangladesh | Authentic Korean Skincare | Korean Skin Food BD`;
  }

  if (skinType && skinType !== 'All') {
    queryParams.set('skinType', skinType);
    title = `Korean Skincare for ${skinType} Skin in Bangladesh | Korean Skin Food BD`;
  }

  if (concern && concern !== 'All') {
    queryParams.set('concern', concern);
    title = `Korean Skincare for ${concern} in Bangladesh | Korean Skin Food BD`;
  }

  if (search) {
    queryParams.set('search', search);
    title = `Search Results for "${search}" | Korean Skin Food BD`;
  }

  const queryStr = queryParams.toString();
  const canonicalUrl = buildCanonicalUrl(queryStr ? `/shop?${queryStr}` : '/shop');

  const breadcrumbsList: Array<{ name: string; url: string }> = [
    { name: 'Home', url: `${SITE_URL}/` },
    { name: 'Shop', url: `${SITE_URL}/shop` }
  ];

  if (categoryName && categoryName !== 'All') {
    breadcrumbsList.push({ name: categoryName, url: canonicalUrl });
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbsList.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };

  return {
    title,
    description,
    canonicalUrl,
    keywords: [
      categoryName ? `Korean ${categoryName} Bangladesh` : 'Korean Skincare BD',
      brandName ? `${brandName} Bangladesh` : 'K-Beauty Dhaka',
      'Authentic K-Beauty Bangladesh'
    ],
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: title,
    twitterCard: 'summary_large_image',
    jsonLd: [breadcrumbSchema]
  };
};

/**
 * Build dynamic SEO metadata for static informational pages (About Us, Contact Us, Privacy, Terms)
 */
export const buildStaticPageSeo = (
  pageTitle: string,
  pageDescription: string,
  path: string,
  keywords: string[] = []
): SeoMetadata => {
  const canonicalUrl = buildCanonicalUrl(path);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: pageTitle,
        item: canonicalUrl
      }
    ]
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDescription,
    url: canonicalUrl
  };

  return {
    title: `${pageTitle} | Korean Skin Food BD`,
    description: pageDescription,
    canonicalUrl,
    keywords: [
      ...keywords,
      'Korean Skin Food BD',
      'Authentic K-Beauty Dhaka',
      'Korean Skincare Bangladesh'
    ],
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: pageTitle,
    twitterCard: 'summary_large_image',
    jsonLd: [breadcrumbSchema, webPageSchema]
  };
};

/**
 * Build dynamic SEO metadata for Brand Landing Pages
 */
export const buildBrandSeo = (brandProfile: BrandSeoProfile): SeoMetadata => {
  const canonicalUrl = buildCanonicalUrl(`/brand/${brandProfile.slug}`);
  const title = `${brandProfile.name} Bangladesh | Authentic Korean Skincare | Korean Skin Food BD`;
  const description = `Shop 100% authentic ${brandProfile.name} skincare in Bangladesh. Direct Seoul imports, genuine ingredients, verified batch standards, and fast nationwide delivery.`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Brands',
        item: `${SITE_URL}/brands`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: brandProfile.name,
        item: canonicalUrl
      }
    ]
  };

  const schemas: any[] = [breadcrumbSchema];

  // If brand has FAQs, inject FAQPage schema
  if (brandProfile.faqs && brandProfile.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: brandProfile.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    });
  }

  return {
    title,
    description,
    canonicalUrl,
    keywords: [
      `${brandProfile.name} Bangladesh`,
      `${brandProfile.name} price in BD`,
      `Buy authentic ${brandProfile.name} Dhaka`,
      'Korean skincare brands Bangladesh'
    ],
    ogType: 'website',
    ogImage: brandProfile.heroImage || DEFAULT_OG_IMAGE,
    ogImageAlt: `${brandProfile.name} authentic Korean skincare in Bangladesh`,
    twitterCard: 'summary_large_image',
    jsonLd: schemas
  };
};

/**
 * Build dynamic SEO metadata for Educational Skincare Guides
 */
export const buildGuideSeo = (guide: SkincareGuide): SeoMetadata => {
  const canonicalUrl = buildCanonicalUrl(`/guide/${guide.slug}`);
  const title = `${guide.title} | Korean Skin Food BD`;
  const description = sanitizeMetaText(guide.excerpt);

  const articleSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${canonicalUrl}#article`,
    headline: guide.title,
    description,
    image: [guide.heroImage],
    datePublished: guide.publishedDate,
    dateModified: guide.lastUpdatedDate || guide.publishedDate,
    inLanguage: ['en', 'bn'],
    author: {
      '@type': 'Organization',
      name: guide.author?.name || 'Korean Skin Food BD Editorial Team',
      url: SITE_URL
    },
    publisher: {
      '@type': 'Organization',
      name: 'Korean Skin Food BD',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/icon.svg`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${SITE_URL}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Skincare Guides',
        item: `${SITE_URL}/guides`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.title,
        item: canonicalUrl
      }
    ]
  };

  const schemas: any[] = [articleSchema, breadcrumbSchema];

  if (guide.faqs && guide.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: guide.faqs.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer
        }
      }))
    });
  }

  return {
    title,
    description,
    canonicalUrl,
    keywords: [
      ...guide.keyIngredients,
      ...guide.targetSkinTypes,
      'Korean skincare routine Bangladesh',
      'K-Beauty advice Dhaka'
    ],
    ogType: 'article',
    ogImage: guide.heroImage,
    ogImageAlt: guide.imageAltText || guide.title,
    twitterCard: 'summary_large_image',
    jsonLd: schemas
  };
};

/**
 * Apply SEO metadata directly to the HTML document head in client-side React
 */
export const applySeoMetadata = (metadata: SeoMetadata): void => {
  if (typeof document === 'undefined') return;

  // Title
  if (metadata.title) {
    document.title = metadata.title;
  }

  const setMeta = (attr: 'name' | 'property', attrVal: string, content?: string) => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${attrVal}"]`) as HTMLMetaElement;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Standard Meta Tags
  if (metadata.description) {
    setMeta('name', 'description', metadata.description);
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    setMeta('name', 'keywords', metadata.keywords.join(', '));
  }

  if (metadata.noindex) {
    setMeta('name', 'robots', 'noindex, nofollow');
  } else {
    setMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  }

  // Open Graph Tags
  setMeta('property', 'og:title', metadata.title);
  setMeta('property', 'og:description', metadata.description);
  setMeta('property', 'og:site_name', SITE_NAME);
  setMeta('property', 'og:type', metadata.ogType || 'website');
  setMeta('property', 'og:url', metadata.canonicalUrl || (typeof window !== 'undefined' ? window.location.href : SITE_URL));

  const ogImage = metadata.ogImage || DEFAULT_OG_IMAGE;
  setMeta('property', 'og:image', ogImage);
  if (metadata.ogImageAlt) {
    setMeta('property', 'og:image:alt', metadata.ogImageAlt);
  }

  // Twitter Cards
  setMeta('name', 'twitter:card', metadata.twitterCard || 'summary_large_image');
  setMeta('name', 'twitter:title', metadata.title);
  setMeta('name', 'twitter:description', metadata.description);
  setMeta('name', 'twitter:image', ogImage);

  // Canonical Link
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (metadata.canonicalUrl) {
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', metadata.canonicalUrl);
  } else if (canonicalLink) {
    canonicalLink.remove();
  }

  // JSON-LD Structured Data
  let scriptEl = document.getElementById('seo-json-ld') as HTMLScriptElement;
  if (metadata.jsonLd) {
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'seo-json-ld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(metadata.jsonLd);
  } else if (scriptEl) {
    scriptEl.remove();
  }
};
