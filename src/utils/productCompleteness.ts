import { Product } from '../types';

export interface ProductCompletenessResult {
  score: number;
  completedCount: number;
  totalCount: number;
  missingFields: string[];
  level: 'complete' | 'good' | 'needs_work';
}

interface CompletenessCheck {
  label: string;
  check: (p: Product) => boolean;
}

const COMPLETENESS_CHECKS: CompletenessCheck[] = [
  { label: 'Cover Image', check: (p) => Boolean(p.image && p.image.trim().length > 5) },
  { label: 'Image Alt Text', check: (p) => Boolean((p.imageAltText || p.altText || '').trim().length >= 5) },
  { label: 'English Name', check: (p) => Boolean(p.name && p.name.trim().length >= 3) },
  { label: 'Bangla Name', check: (p) => Boolean(p.nameBN && p.nameBN.trim().length >= 2) },
  { label: 'Description', check: (p) => Boolean(p.description && p.description.trim().length >= 20) },
  { label: 'Bangla Description', check: (p) => Boolean(p.descriptionBN && p.descriptionBN.trim().length >= 10) },
  { label: 'Category', check: (p) => Boolean(p.category && p.category.trim().length >= 2) },
  { label: 'Skin Types', check: (p) => Array.isArray(p.skinTypes) && p.skinTypes.length > 0 },
  { label: 'Skin Concerns', check: (p) => Array.isArray(p.concerns) && p.concerns.length > 0 },
  { label: 'Key Ingredients', check: (p) => Array.isArray(p.keyIngredients) && p.keyIngredients.length > 0 },
  { label: 'Size / Volume (ml)', check: (p) => Boolean(p.ml && p.ml.trim().length > 0) },
  { label: 'Barcode', check: (p) => Boolean(p.barcode && p.barcode.trim().length >= 6) },
  { label: 'SEO Meta Title', check: (p) => Boolean((p.metaTitle || p.seoTitle || '').trim().length >= 10) },
  { label: 'SEO Meta Description', check: (p) => Boolean(p.metaDescription && p.metaDescription.trim().length >= 20) },
  { label: 'Usage / Precautions', check: (p) => Boolean((p.howToUse || p.precautions || '').trim().length >= 5) },
];

export function evaluateProductCompleteness(product: Product): ProductCompletenessResult {
  const missingFields: string[] = [];
  let completedCount = 0;

  for (const item of COMPLETENESS_CHECKS) {
    if (item.check(product)) {
      completedCount += 1;
    } else {
      missingFields.push(item.label);
    }
  }

  const totalCount = COMPLETENESS_CHECKS.length;
  const score = Math.round((completedCount / totalCount) * 100);
  const level = score >= 85 ? 'complete' : score >= 60 ? 'good' : 'needs_work';

  return {
    score,
    completedCount,
    totalCount,
    missingFields,
    level,
  };
}
