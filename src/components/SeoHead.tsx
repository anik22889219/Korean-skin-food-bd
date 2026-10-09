import React, { useEffect } from 'react';
import { SeoMetadata, applySeoMetadata, buildHomepageSeo } from '../services/seoService';

interface SeoHeadProps {
  metadata?: SeoMetadata;
  title?: string;
  description?: string;
  canonicalUrl?: string;
  keywords?: string[];
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  noindex?: boolean;
}

/**
 * Declarative component to inject dynamic On-Page SEO meta tags and Schema.org JSON-LD
 */
export const SeoHead: React.FC<SeoHeadProps> = ({
  metadata,
  title,
  description,
  canonicalUrl,
  keywords,
  ogType,
  ogImage,
  ogImageAlt,
  twitterCard,
  jsonLd,
  noindex
}) => {
  useEffect(() => {
    // If a full metadata object was supplied, use it; otherwise compose from individual props
    const activeMeta: SeoMetadata = metadata || {
      title: title || 'Korean Skin Food Bangladesh',
      description: description || 'Top Authentic Korean Skincare Brand in Bangladesh.',
      canonicalUrl,
      keywords,
      ogType,
      ogImage,
      ogImageAlt,
      twitterCard,
      jsonLd,
      noindex
    };

    applySeoMetadata(activeMeta);

    return () => {
      // Cleanup hook if necessary when leaving SPA route
    };
  }, [
    metadata,
    title,
    description,
    canonicalUrl,
    keywords,
    ogType,
    ogImage,
    ogImageAlt,
    twitterCard,
    jsonLd,
    noindex
  ]);

  return null;
};
