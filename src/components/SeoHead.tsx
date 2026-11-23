import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  SeoMetadata,
  applySeoMetadata,
  DEFAULT_HOMEPAGE_TITLE,
  DEFAULT_HOMEPAGE_DESCRIPTION,
} from '../services/seoService';
import { pageSeoService, mergePageSeoMetadata } from '../services/pageSeoService';
import { PageSeoConfig } from '../types';

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
 * Declarative component to inject dynamic On-Page SEO meta tags and Schema.org JSON-LD,
 * automatically merging any per-URL overrides configured in Firestore `seo_pages`.
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
  noindex,
}) => {
  const location = useLocation();
  const [seoPages, setSeoPages] = useState<PageSeoConfig[]>(() => pageSeoService.getAll());

  useEffect(() => {
    return pageSeoService.subscribe((pages) => {
      setSeoPages(pages);
    });
  }, []);

  useEffect(() => {
    const baseMeta: SeoMetadata = metadata || {
      title: title || DEFAULT_HOMEPAGE_TITLE,
      description: description || DEFAULT_HOMEPAGE_DESCRIPTION,
      canonicalUrl,
      keywords,
      ogType,
      ogImage,
      ogImageAlt,
      twitterCard,
      jsonLd,
      noindex,
    };

    const fullPath = `${location.pathname}${location.search || ''}`;
    const override = pageSeoService.getForPath(fullPath, location.pathname);
    const mergedMeta = mergePageSeoMetadata(baseMeta, override);

    applySeoMetadata(mergedMeta);
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
    noindex,
    location.pathname,
    location.search,
    seoPages,
  ]);

  return null;
};
