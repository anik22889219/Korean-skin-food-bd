import { Product } from '../types';

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

export const SITE_NAME = 'Korean Skin Food Bangladesh';
export const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://koreanskinfoodbd.com';
export const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80';
export const DEFAULT_DESCRIPTION = 'Top Authentic Korean Skincare Brand in Bangladesh. 100% Seoul-sourced cosmeceuticals with Google Business verified reviews and rapid delivery across Dhaka and Bangladesh.';

/**
 * Clean up text strings for meta tags (strip excess whitespace and newlines)
 */
export const sanitizeMetaText = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .replace(/\s+/g, ' ')      // Normalize multiple spaces
    .trim();
};

/**
 * Build dynamic SEO metadata for the Homepage
 */
export const buildHomepageSeo = (): SeoMetadata => {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: 'Korean Skin Food Bangladesh',
    alternateName: 'Korean Skin Food BD',
    url: origin,
    logo: `${origin}/logo.png`,
    description: DEFAULT_DESCRIPTION,
    sameAs: [
      'https://www.facebook.com/koreanskinfoodbd',
      'https://www.instagram.com/koreanskinfoodbd',
      'https://wa.me/8801755837545'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+8801755837545',
      contactType: 'Customer Service',
      areaServed: 'BD',
      availableLanguage: ['Bengali', 'English']
    }
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: origin,
    name: 'Korean Skin Food Bangladesh',
    publisher: {
      '@id': `${origin}/#organization`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/shop?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    '@id': `${origin}/#store`,
    name: 'Korean Skin Food Bangladesh',
    image: DEFAULT_OG_IMAGE,
    url: origin,
    telephone: '+8801755837545',
    priceRange: '৳৳',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Dhaka',
      addressCountry: 'BD'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 23.8103,
      longitude: 90.4125
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ],
        opens: '09:00',
        closes: '22:00'
      }
    ]
  };

  return {
    title: 'Korean Skin Food Bangladesh - Authentic K-Beauty & Cosmeceuticals',
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: `${origin}/`,
    keywords: [
      'Korean Skincare Bangladesh',
      'Authentic K-Beauty Dhaka',
      'Korean Skin Food BD',
      'COSRX Bangladesh',
      'Beauty of Joseon BD',
      'Seoul imported cosmetics',
      'Korean moisturizer Dhaka',
      'Korean Sunscreen Bangladesh'
    ],
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: 'Korean Skin Food Bangladesh Authentic Korean Cosmetics',
    twitterCard: 'summary_large_image',
    jsonLd: [organizationSchema, websiteSchema, localBusinessSchema]
  };
};

/**
 * Extract saved custom SEO from a Product object
 */
export const extractCustomProductSeo = (product: Product): Partial<SeoMetadata> | null => {
  let customTitle = product.seoTitle || product.metaTitle;
  let customDesc = product.metaDescription;
  let customKeywords: string[] | undefined;
  let customSchema: any = null;

  if (product.generatedSeoContent) {
    try {
      const parsed = typeof product.generatedSeoContent === 'string'
        ? JSON.parse(product.generatedSeoContent)
        : product.generatedSeoContent;

      if (parsed.seoTitle && !customTitle) customTitle = parsed.seoTitle;
      if (parsed.metaDescription && !customDesc) customDesc = parsed.metaDescription;
      if (parsed.keywords) {
        customKeywords = typeof parsed.keywords === 'string'
          ? parsed.keywords.split(',').map((k: string) => k.trim())
          : parsed.keywords;
      }
      if (parsed.jsonLdSchema) {
        customSchema = parsed.jsonLdSchema;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  if (customTitle || customDesc || customKeywords || customSchema) {
    return {
      title: customTitle,
      description: customDesc,
      keywords: customKeywords,
      jsonLd: customSchema
    };
  }

  return null;
};

/**
 * Build dynamic SEO metadata for a Product Details Page
 */
export const buildProductSeo = (product: Product): SeoMetadata => {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  const canonicalUrl = `${origin}/product/${product.id}`;
  const custom = extractCustomProductSeo(product);

  // Dynamic automated title fallback
  const dynamicTitle = `${product.name} | ${product.brand} - Authentic K-Beauty Bangladesh`;
  const title = custom?.title || dynamicTitle;

  // Dynamic automated description fallback
  const priceDisplay = product.discountPrice || product.retailPrice || product.price;
  const brandName = product.brand || 'Korean';
  const categoryName = product.category || 'Skincare';

  const dynamicDesc = sanitizeMetaText(
    `Buy authentic ${brandName} ${product.name} (${categoryName}) in Bangladesh for ৳${priceDisplay}. 100% genuine Seoul-imported K-Beauty with fast Dhaka & all BD delivery. Cash on Delivery available.`
  );
  const description = custom?.description || dynamicDesc;

  // Keywords
  const dynamicKeywords = [
    product.name,
    product.brand,
    `${product.brand} Bangladesh`,
    `${product.category} BD`,
    'Korean Skincare Bangladesh',
    'Authentic K-Beauty Dhaka',
    'Buy ' + product.name
  ];
  if (product.keyIngredients && product.keyIngredients.length > 0) {
    dynamicKeywords.push(...product.keyIngredients);
  }
  const keywords = custom?.keywords || dynamicKeywords;

  // OpenGraph Image
  const ogImage = product.image || (product.images && product.images[0]) || DEFAULT_OG_IMAGE;
  const ogImageAlt = product.imageAltText || product.altText || `${product.name} by ${product.brand} - Korean Skin Food`;

  // Schema.org Structured Data
  const productPrice = product.discountPrice || product.retailPrice || product.price;
  const isAvailable = (product.stock ?? 0) > 0;

  const productSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonicalUrl}#product`,
    name: product.name,
    image: [product.image, ...(product.images || [])].filter(Boolean),
    description: sanitizeMetaText(product.description || description),
    sku: product.sku || product.barcode || product.id,
    mpn: product.barcode || product.id,
    brand: {
      '@type': 'Brand',
      name: product.brand
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'BDT',
      price: productPrice,
      priceValidUntil: '2027-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Korean Skin Food Bangladesh'
      }
    }
  };

  // Add AggregateRating if ratings exist
  if (product.rating && product.rating > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(product.rating.toFixed(1)),
      reviewCount: Math.max(product.reviewsCount || 1, 1),
      bestRating: '5',
      worstRating: '1'
    };
  }

  // Breadcrumb Schema
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${origin}/`
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: product.category || 'Skincare',
        item: `${origin}/shop?category=${encodeURIComponent(product.category || 'All')}`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.brand,
        item: `${origin}/shop?brand=${encodeURIComponent(product.brand)}`
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: product.name,
        item: canonicalUrl
      }
    ]
  };

  // If admin provided custom valid schema, combine or prioritize
  const schemas: any[] = [productSchema, breadcrumbSchema];
  if (custom?.jsonLd) {
    if (Array.isArray(custom.jsonLd)) {
      schemas.push(...custom.jsonLd);
    } else {
      schemas.push(custom.jsonLd);
    }
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
    jsonLd: schemas
  };
};

/**
 * Build dynamic SEO metadata for Category / Brand / Search Catalog pages
 */
export const buildCategorySeo = (params: {
  category?: string;
  brand?: string;
  search?: string;
  skinType?: string;
  concern?: string;
}): SeoMetadata => {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  const { category, brand, search, skinType, concern } = params;

  let title = 'Shop Authentic Korean Skincare in Bangladesh | Korean Skin Food';
  let description = 'Explore 100% authentic Seoul-sourced Korean skincare products in Bangladesh. Shop cleansers, toners, serums, sunscreens, and creams with fast nationwide delivery.';
  const keywords = ['Korean Skincare BD', 'K-Beauty Bangladesh', 'Buy Authentic Korean Cosmetics'];

  const breadcrumbsList: Array<{ name: string; url: string }> = [
    { name: 'Home', url: `${origin}/` },
    { name: 'Shop', url: `${origin}/shop` }
  ];

  if (brand && category && category !== 'All') {
    title = `${brand} ${category} in Bangladesh - Authentic K-Beauty | Korean Skin Food`;
    description = `Buy authentic ${brand} ${category} online in Bangladesh. 100% genuine Seoul imports. Best prices in BDT with Cash on Delivery across Dhaka & all districts.`;
    keywords.push(`${brand} ${category} BD`, `${brand} Bangladesh`, `${category} BD`);
    breadcrumbsList.push({ name: brand, url: `${origin}/shop?brand=${encodeURIComponent(brand)}` });
    breadcrumbsList.push({ name: category, url: `${origin}/shop?brand=${encodeURIComponent(brand)}&category=${encodeURIComponent(category)}` });
  } else if (brand) {
    title = `${brand} Bangladesh - 100% Original Products | Korean Skin Food`;
    description = `Explore top authentic ${brand} skincare products imported directly from South Korea. Verified authentic cosmeceuticals with doorstep delivery across Bangladesh.`;
    keywords.push(`${brand} BD`, `${brand} price in Bangladesh`, `${brand} official BD`);
    breadcrumbsList.push({ name: brand, url: `${origin}/shop?brand=${encodeURIComponent(brand)}` });
  } else if (category && category !== 'All') {
    title = `Korean ${category} in Bangladesh - Top Authentic Brands | Korean Skin Food`;
    description = `Discover best Korean ${category} formulas for glowing, healthy skin in Bangladesh. Authentic COSRX, Beauty of Joseon, Anua, Skin1004 & more. Fast shipping.`;
    keywords.push(`Korean ${category} BD`, `Best ${category} Bangladesh`, `${category} K-Beauty`);
    breadcrumbsList.push({ name: category, url: `${origin}/shop?category=${encodeURIComponent(category)}` });
  } else if (skinType) {
    title = `Korean Skincare for ${skinType} Skin in Bangladesh | Korean Skin Food`;
    description = `Shop authentic Korean skincare tailored specifically for ${skinType} skin. Dermatologist-approved K-Beauty routines delivered across Dhaka & all Bangladesh.`;
    keywords.push(`${skinType} skin routine BD`, `Korean skincare for ${skinType} skin`);
    breadcrumbsList.push({ name: `${skinType} Skin`, url: `${origin}/shop?skinType=${encodeURIComponent(skinType)}` });
  } else if (concern) {
    title = `Korean Skincare for ${concern} in Bangladesh | Korean Skin Food`;
    description = `Effective Korean cosmeceuticals and treatments formulated to target ${concern}. Fast delivery in Bangladesh.`;
    keywords.push(`${concern} treatment BD`, `Korean skincare for ${concern}`);
    breadcrumbsList.push({ name: concern, url: `${origin}/shop?concern=${encodeURIComponent(concern)}` });
  } else if (search) {
    title = `Search Results for "${search}" | Korean Skin Food Bangladesh`;
    description = `Search results for authentic Korean skincare products matching "${search}". Guaranteed Seoul-sourced cosmetics delivered to your doorstep.`;
  }

  // Build canonical URL
  const searchParams = new URLSearchParams();
  if (category && category !== 'All') searchParams.set('category', category);
  if (brand) searchParams.set('brand', brand);
  if (skinType) searchParams.set('skinType', skinType);
  if (concern) searchParams.set('concern', concern);
  const queryStr = searchParams.toString();
  const canonicalUrl = queryStr ? `${origin}/shop?${queryStr}` : `${origin}/shop`;

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

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: canonicalUrl
  };

  return {
    title,
    description,
    canonicalUrl,
    keywords,
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: title,
    twitterCard: 'summary_large_image',
    jsonLd: [breadcrumbSchema, collectionSchema]
  };
};

/**
 * Build dynamic SEO metadata for static/content pages
 */
export const buildStaticPageSeo = (
  pageTitle: string,
  pageDescription: string,
  path: string,
  keywords: string[] = []
): SeoMetadata => {
  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  const canonicalUrl = `${origin}${path}`;

  return {
    title: `${pageTitle} | Korean Skin Food Bangladesh`,
    description: pageDescription,
    canonicalUrl,
    keywords: [
      ...keywords,
      'Korean Skin Food Bangladesh',
      'Authentic K-Beauty Dhaka',
      'Korean Skincare BD'
    ],
    ogType: 'website',
    ogImage: DEFAULT_OG_IMAGE,
    ogImageAlt: pageTitle,
    twitterCard: 'summary_large_image',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: pageTitle,
      description: pageDescription,
      url: canonicalUrl
    }
  };
};

/**
 * Apply SEO metadata directly to the HTML document head
 */
export const applySeoMetadata = (metadata: SeoMetadata): void => {
  if (typeof document === 'undefined') return;

  // 1. Title
  if (metadata.title) {
    document.title = metadata.title;
  }

  // Helper to upsert meta tags
  const setMetaTag = (attributeName: 'name' | 'property', attributeValue: string, content?: string) => {
    if (!content) return;
    let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`) as HTMLMetaElement;
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attributeName, attributeValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // 2. Standard Meta Tags
  if (metadata.description) {
    setMetaTag('name', 'description', metadata.description);
  }

  if (metadata.keywords && metadata.keywords.length > 0) {
    setMetaTag('name', 'keywords', metadata.keywords.join(', '));
  }

  if (metadata.noindex) {
    setMetaTag('name', 'robots', 'noindex, nofollow');
  } else {
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  }

  // 3. OpenGraph Tags
  setMetaTag('property', 'og:title', metadata.title);
  setMetaTag('property', 'og:description', metadata.description);
  setMetaTag('property', 'og:site_name', SITE_NAME);
  setMetaTag('property', 'og:type', metadata.ogType || 'website');

  const origin = typeof window !== 'undefined' ? window.location.origin : SITE_URL;
  const currentUrl = metadata.canonicalUrl || (typeof window !== 'undefined' ? window.location.href : origin);
  setMetaTag('property', 'og:url', currentUrl);

  const ogImage = metadata.ogImage || DEFAULT_OG_IMAGE;
  setMetaTag('property', 'og:image', ogImage);
  if (metadata.ogImageAlt) {
    setMetaTag('property', 'og:image:alt', metadata.ogImageAlt);
  }

  // 4. Twitter Card Tags
  setMetaTag('name', 'twitter:card', metadata.twitterCard || 'summary_large_image');
  setMetaTag('name', 'twitter:title', metadata.title);
  setMetaTag('name', 'twitter:description', metadata.description);
  setMetaTag('name', 'twitter:image', ogImage);

  // 5. Canonical Link
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

  // 6. JSON-LD Structured Data
  let scriptElement = document.getElementById('seo-json-ld') as HTMLScriptElement;
  if (metadata.jsonLd) {
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = 'seo-json-ld';
      scriptElement.type = 'application/ld+json';
      document.head.appendChild(scriptElement);
    }
    scriptElement.textContent = JSON.stringify(metadata.jsonLd);
  } else if (scriptElement) {
    scriptElement.remove();
  }
};
