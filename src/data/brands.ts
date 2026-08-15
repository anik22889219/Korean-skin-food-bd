export const KOREAN_BRANDS: string[] = [
  '3W Clinic',
  'AHC',
  'Alonie',
  'Anjo',
  'Anua',
  'Aroma Olive',
  'Atomy',
  'AXIS-Y',
  'Beaute',
  'Beauty of Joseon',
  'Care:Nel',
  'Celltrion',
  'Cha-Skin',
  'Chasco',
  'Christian Dean',
  'COSRX',
  'Dabo',
  'Derma Protective Complex',
  'Farmstay',
  'Felicia',
  'Green Finger',
  'Green Tea',
  'Guerisson',
  'Heeyul',
  'I\'m From',
  'iUNIK',
  'Jeong In',
  'Jigott',
  'Junu',
  'Kerasys',
  'K-Secret',
  'Lebelage',
  'LJGO',
  'Luxetree',
  'Mary & May',
  'May Island',
  'Medicube',
  'Mediheal',
  'Meridian',
  'MISSHA',
  'Nana.B',
  'Neala',
  'Noblesse',
  'Panthenol',
  'Pure Ground',
  'RAIP',
  'rom&nd',
  'SKIN1004',
  'Skin Soop',
  'SOME BY MI',
  'Tenzero',
  'The Face Shop',
  'The Ordinary',
  'Yuhan Yanheng',
  'Vaseline Rose',
  'Verpia',
  'White Wolsy',
  'Yegan',
  'Yeosim'
];

/**
 * Returns canonical casing for a brand name based on KOREAN_BRANDS or clean trimming.
 * Resolves case inconsistencies (e.g., "cosrx" / "Cosrx" -> "COSRX", "anua" -> "Anua", "skin1004" -> "SKIN1004").
 */
export function getCanonicalBrandName(brand?: string): string {
  if (!brand || !brand.trim()) return '';
  const trimmed = brand.trim();
  const lower = trimmed.toLowerCase();
  
  const matched = KOREAN_BRANDS.find(b => b.toLowerCase() === lower);
  if (matched) {
    return matched;
  }
  return trimmed;
}

/**
 * Case-insensitive check if two brand names match.
 */
export function isSameBrand(brandA?: string, brandB?: string): boolean {
  if (!brandA || !brandB) return false;
  return brandA.trim().toLowerCase() === brandB.trim().toLowerCase();
}

/**
 * Returns a deduplicated, case-insensitively sorted list of unique brand names.
 * Standardizes capital & small letter variations so each brand name appears EXACTLY ONCE.
 */
export function getUniqueBrandList(products?: Array<{ brand?: string }>): string[] {
  const brandMap = new Map<string, string>(); // lowercase key -> canonical display name

  // 1. Add all standard brands with their canonical casing
  for (const b of KOREAN_BRANDS) {
    const trimmed = b.trim();
    if (trimmed) {
      brandMap.set(trimmed.toLowerCase(), trimmed);
    }
  }

  // 2. Add any active products' brands, normalizing case if in standard list or preserving first clean variation
  if (products && Array.isArray(products)) {
    for (const p of products) {
      if (p.brand && p.brand.trim()) {
        const trimmed = p.brand.trim();
        const lowerKey = trimmed.toLowerCase();
        if (!brandMap.has(lowerKey)) {
          const canonical = getCanonicalBrandName(trimmed);
          brandMap.set(lowerKey, canonical);
        }
      }
    }
  }

  return Array.from(brandMap.values()).sort((a, b) => 
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

/**
 * Aggregates product counts by brand key (lowercase) so counts always match regardless of casing.
 */
export function getBrandProductCounts(products: Array<{ brand?: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!products || !Array.isArray(products)) return counts;

  products.forEach(p => {
    if (p.brand && p.brand.trim()) {
      const key = p.brand.trim().toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  return counts;
}

