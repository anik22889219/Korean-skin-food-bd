import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { TaxonomyItem, TaxonomyDimensionType, Product } from '../types';
import { KOREAN_BRANDS } from '../data/brands';
import { CANONICAL_CATEGORIES } from '../hooks/queries/categories';
import { queryClient } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';

const TAXONOMIES_COLLECTION = 'taxonomies';
const LOCAL_STORAGE_KEY = 'ksf_taxonomies_cache_v1';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('[TaxonomyService Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generate a clean SEO slug from name
export function generateTaxonomySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Built-in Default Seeds for Korean Beauty
export const DEFAULT_TAXONOMIES_SEEDS: Array<Omit<TaxonomyItem, 'id' | 'createdAt' | 'updatedAt'>> = [
  // --- BRANDS ---
  ...KOREAN_BRANDS.map((brandName, idx) => ({
    type: 'brand' as TaxonomyDimensionType,
    name: brandName,
    nameBN: '',
    slug: generateTaxonomySlug(brandName),
    description: `Authentic Korean skincare and beauty essentials from ${brandName}.`,
    displayOrder: idx + 1,
    isActive: true,
    isFeatured: ['COSRX', 'Beauty of Joseon', 'Anua', 'SKIN1004', 'SOME BY MI', 'AHC', 'rom&nd', 'The Ordinary'].includes(brandName),
    isPopular: ['COSRX', 'Beauty of Joseon', 'Anua', 'SKIN1004', 'Medicube', 'I\'m From'].includes(brandName)
  })),

  // --- CATEGORIES ---
  {
    type: 'category',
    name: 'Cleanser',
    nameBN: 'ক্লিনজার',
    slug: 'cleanser',
    description: 'Gentle water, foam, and oil cleansers to remove impurities.',
    displayOrder: 1,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'category',
    name: 'Toner',
    nameBN: 'টোনার',
    slug: 'toner',
    description: 'Hydrating, exfoliating, and skin balancing Korean toners.',
    displayOrder: 2,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'category',
    name: 'Serum & Essence',
    nameBN: 'সিরাম ও এসেন্স',
    slug: 'serum-essence',
    description: 'High-potency active serums, ampoules, and nutrient-rich essences.',
    displayOrder: 3,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'category',
    name: 'Cream & Moisturizer',
    nameBN: 'ক্রিম ও ময়েশ্চারাইজার',
    slug: 'cream-moisturizer',
    description: 'Barrier-repairing, deeply nourishing hydration creams and gels.',
    displayOrder: 4,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'category',
    name: 'Sunscreen',
    nameBN: 'সানস্ক্রিন',
    slug: 'sunscreen',
    description: 'Lightweight, broad-spectrum UV protection without white cast.',
    displayOrder: 5,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'category',
    name: 'Lip Care',
    nameBN: 'লিপ কেয়ার',
    slug: 'lip-care',
    description: 'Nourishing sleeping lip masks, balms, and tints.',
    displayOrder: 6,
    isActive: true
  },
  {
    type: 'category',
    name: 'Eye Care',
    nameBN: 'আই কেয়ার',
    slug: 'eye-care',
    description: 'Firming eye creams, gels, and under-eye patches for dark circles.',
    displayOrder: 7,
    isActive: true
  },
  {
    type: 'category',
    name: 'Mask & Pack',
    nameBN: 'মাস্ক ও প্যাক',
    slug: 'mask-pack',
    description: 'Hydrating sheet masks, clay wash-off packs, and sleeping masks.',
    displayOrder: 8,
    isActive: true
  },
  {
    type: 'category',
    name: 'Exfoliator',
    nameBN: 'এক্সফোলিয়েটর',
    slug: 'exfoliator',
    description: 'Gentle chemical AHA/BHA/PHA exfoliants and peeling gels.',
    displayOrder: 9,
    isActive: true
  },
  {
    type: 'category',
    name: 'Body & Hair Care',
    nameBN: 'বডি ও হেয়ার কেয়ার',
    slug: 'body-hair-care',
    description: 'Nourishing hair oils, scalp treatments, and body washes.',
    displayOrder: 10,
    isActive: true
  },
  {
    type: 'category',
    name: 'Spot Treatment',
    nameBN: 'স্পট ট্রিটমেন্ট',
    slug: 'spot-treatment',
    description: 'Targeted pimple patches, blemish creams, and calming treatments.',
    displayOrder: 11,
    isActive: true
  },
  {
    type: 'category',
    name: 'Makeup & Tone-Up',
    nameBN: 'মেকআপ ও টোন-আপ',
    slug: 'makeup-tone-up',
    description: 'Natural brightening tone-up creams, cushions, and lip tints.',
    displayOrder: 12,
    isActive: true
  },

  // --- SKIN TYPES ---
  {
    type: 'skin_type',
    name: 'All Skin Types',
    nameBN: 'সব ধরণের ত্বক',
    slug: 'all-skin-types',
    description: 'Formulated to be safe and effective for all skin conditions.',
    displayOrder: 1,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_type',
    name: 'Oily Skin',
    nameBN: 'তৈলাক্ত ত্বক',
    slug: 'oily-skin',
    description: 'Lightweight, non-greasy formulations that regulate excess sebum.',
    displayOrder: 2,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_type',
    name: 'Dry Skin',
    nameBN: 'শুষ্ক ত্বক',
    slug: 'dry-skin',
    description: 'Intense moisture lock and barrier lipid replenishment.',
    displayOrder: 3,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_type',
    name: 'Combination Skin',
    nameBN: 'মিশ্র ত্বক',
    slug: 'combination-skin',
    description: 'Balances oily T-zone while hydrating normal to dry cheeks.',
    displayOrder: 4,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_type',
    name: 'Sensitive Skin',
    nameBN: 'সংবেদনশীল ত্বক',
    slug: 'sensitive-skin',
    description: 'Hypoallergenic, fragrance-free, calming relief for reactive skin.',
    displayOrder: 5,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_type',
    name: 'Acne-Prone Skin',
    nameBN: 'ব্রণ-প্রবণ ত্বক',
    slug: 'acne-prone-skin',
    description: 'Non-comedogenic care that soothes active breakouts and clears pores.',
    displayOrder: 6,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_type',
    name: 'Normal Skin',
    nameBN: 'স্বাভাবিক ত্বক',
    slug: 'normal-skin',
    description: 'Maintains optimal hydration balance and natural skin glow.',
    displayOrder: 7,
    isActive: true
  },

  // --- SKIN CONCERNS ---
  {
    type: 'skin_concern',
    name: 'Acne & Blemishes',
    nameBN: 'ব্রণ ও ফুসকুড়ি',
    slug: 'acne-blemishes',
    description: 'Clarifies clogged pores, reduces inflammation, and prevents breakouts.',
    displayOrder: 1,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_concern',
    name: 'Hyperpigmentation & Dark Spots',
    nameBN: 'পিগমেন্টেশন ও কালো দাগ',
    slug: 'hyperpigmentation-dark-spots',
    description: 'Fades post-acne marks, melasma, and sun spots for an even tone.',
    displayOrder: 2,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_concern',
    name: 'Sun Damage & Tanning',
    nameBN: 'রোদে পোড়া ভাব ও ট্যান',
    slug: 'sun-damage-tanning',
    description: 'Restores skin tone after intense sun exposure and UV damage.',
    displayOrder: 3,
    isActive: true
  },
  {
    type: 'skin_concern',
    name: 'Redness & Rosacea',
    nameBN: 'লালচে ভাব ও রোসেসিয়া',
    slug: 'redness-rosacea',
    description: 'Cools irritated, flushed skin with anti-inflammatory herbal extracts.',
    displayOrder: 4,
    isActive: true
  },
  {
    type: 'skin_concern',
    name: 'Damaged Skin Barrier',
    nameBN: 'দুর্বল স্কিন ব্যারিয়ার',
    slug: 'damaged-skin-barrier',
    description: 'Fortifies ceramides and lipids to stop moisture loss and stinging.',
    displayOrder: 5,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'skin_concern',
    name: 'Fine Lines & Wrinkles',
    nameBN: 'বয়সের ছাপ ও বলিরেখা',
    slug: 'fine-lines-wrinkles',
    description: 'Boosts collagen synthesis to smooth expression lines and skin texture.',
    displayOrder: 6,
    isActive: true
  },
  {
    type: 'skin_concern',
    name: 'Dullness & Uneven Texture',
    nameBN: 'নিষ্প্রাণ ও খসখসে ত্বক',
    slug: 'dullness-uneven-texture',
    description: 'Gently sloughs dead skin cells to reveal fresh, radiant glass skin.',
    displayOrder: 7,
    isActive: true
  },
  {
    type: 'skin_concern',
    name: 'Large & Clogged Pores',
    nameBN: 'বড় ও বন্ধ পোরস',
    slug: 'large-clogged-pores',
    description: 'Refines pore elasticity and clears accumulated sebum.',
    displayOrder: 8,
    isActive: true
  },
  {
    type: 'skin_concern',
    name: 'Dryness & Dehydration',
    nameBN: 'শুষ্কতা ও পানিশূন্যতা',
    slug: 'dryness-dehydration',
    description: 'Deeply infuses multi-molecular weight moisture into parched skin.',
    displayOrder: 9,
    isActive: true
  },

  // --- TARGET BENEFITS ---
  {
    type: 'target_benefit',
    name: 'Brightening & Glass Skin',
    nameBN: 'উজ্জ্বলতা ও গ্লাস স্কিন',
    slug: 'brightening-glass-skin',
    description: 'Imparts healthy radiance and translucent crystal glow.',
    displayOrder: 1,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'target_benefit',
    name: 'Deep Hydration & Plumping',
    nameBN: 'গভীর আর্দ্রতা ও ময়েশ্চার',
    slug: 'deep-hydration-plumping',
    description: 'Quenches inner dryness and leaves skin bouncy and hydrated.',
    displayOrder: 2,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'target_benefit',
    name: 'Anti-Aging & Firming',
    nameBN: 'অ্যান্টি-এজিং ও টানটান ভাব',
    slug: 'anti-aging-firming',
    description: 'Improves skin elasticity and lifts sagging contours.',
    displayOrder: 3,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'target_benefit',
    name: 'Calming & Soothing',
    nameBN: 'শান্ত ও প্রশমিত ত্বক',
    slug: 'calming-soothing',
    description: 'Instant relief for irritated, burning, or sensitive skin.',
    displayOrder: 4,
    isActive: true
  },
  {
    type: 'target_benefit',
    name: 'Sun Protection (SPF 50+)',
    nameBN: 'সান প্রটেকশন (SPF ৫০+)',
    slug: 'sun-protection',
    description: 'Maximum defense against UVA and UVB rays.',
    displayOrder: 5,
    isActive: true
  },
  {
    type: 'target_benefit',
    name: 'Pore Tightening & Sebum Control',
    nameBN: 'পোরস টাইটনিং ও তেল নিয়ন্ত্রণ',
    slug: 'sebum-control-pore-tightening',
    description: 'Keeps face shine-free and controls midday oiliness.',
    displayOrder: 6,
    isActive: true
  },
  {
    type: 'target_benefit',
    name: 'Gentle Exfoliation',
    nameBN: 'মৃদু এক্সফোলিয়েশন',
    slug: 'gentle-exfoliation',
    description: 'Daily smooth renewal without stripping essential moisture.',
    displayOrder: 7,
    isActive: true
  },

  // --- ROUTINE STEPS ---
  {
    type: 'routine_step',
    name: '1. Oil Cleanser',
    nameBN: '১. অয়েল ক্লিনজার / বাম',
    slug: 'step-oil-cleanser',
    description: 'First cleanse to melt waterproof sunscreen, makeup, and sebum.',
    displayOrder: 1,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'routine_step',
    name: '2. Water Cleanser',
    nameBN: '২. ওয়াটার / ফোম ক্লিনজার',
    slug: 'step-water-cleanser',
    description: 'Second cleanse to wash away water-based sweat and dust.',
    displayOrder: 2,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'routine_step',
    name: '3. Exfoliator',
    nameBN: '৩. এক্সফোলিয়েটর / স্ক্রাব',
    slug: 'step-exfoliator',
    description: '1-2 times weekly chemical or physical exfoliation.',
    displayOrder: 3,
    isActive: true
  },
  {
    type: 'routine_step',
    name: '4. Toner',
    nameBN: '৪. টোনার / স্কিন প্যাড',
    slug: 'step-toner',
    description: 'Preps skin pH and lays the initial hydration reservoir.',
    displayOrder: 4,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'routine_step',
    name: '5. Essence',
    nameBN: '৫. এসেন্স',
    slug: 'step-essence',
    description: 'Lightweight cellular hydration and fermentation nutrients.',
    displayOrder: 5,
    isActive: true
  },
  {
    type: 'routine_step',
    name: '6. Serum & Ampoule',
    nameBN: '৬. সিরাম ও অ্যাম্পুল',
    slug: 'step-serum-ampoule',
    description: 'High concentration actives targeting specific skin needs.',
    displayOrder: 6,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'routine_step',
    name: '7. Sheet Mask',
    nameBN: '৭. শিট মাস্ক',
    slug: 'step-sheet-mask',
    description: 'Intense 15-minute moisture lock and soothing soak.',
    displayOrder: 7,
    isActive: true
  },
  {
    type: 'routine_step',
    name: '8. Eye Cream',
    nameBN: '৮. আই ক্রিম / প্যাচ',
    slug: 'step-eye-cream',
    description: 'Delicate care for fragile periorbital eye area.',
    displayOrder: 8,
    isActive: true
  },
  {
    type: 'routine_step',
    name: '9. Moisturizer',
    nameBN: '৯. ময়েশ্চারাইজার / লোশন',
    slug: 'step-moisturizer',
    description: 'Seals in all preceding treatment layers and repairs barrier.',
    displayOrder: 9,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'routine_step',
    name: '10. Sunscreen / Night Mask',
    nameBN: '১০. সানস্ক্রিন / স্লিপিং প্যাক',
    slug: 'step-sunscreen-night-mask',
    description: 'Morning UV defense or overnight deep sleeping repair.',
    displayOrder: 10,
    isActive: true,
    isFeatured: true
  },

  // --- KEY INGREDIENTS ---
  {
    type: 'ingredient',
    name: 'Centella Asiatica (Cica)',
    nameBN: 'সেন্টেলা এশিয়াটিকা (সিকা)',
    slug: 'centella-asiatica-cica',
    description: 'Soothing tiger grass extract that rapidly reduces redness and repairs skin.',
    displayOrder: 1,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'ingredient',
    name: 'Niacinamide (Vitamin B3)',
    nameBN: 'নায়াসিনামাইড (ভিটামিন বি৩)',
    slug: 'niacinamide',
    description: 'Multitasking hero for pore refining, dark spot fading, and oil control.',
    displayOrder: 2,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'ingredient',
    name: 'Snail Secretion Filtrate',
    nameBN: 'স্নেইল মিউসিন (মিউসিন এক্সট্রাক্ট)',
    slug: 'snail-mucin',
    description: 'Deep hydration, cellular regeneration, and barrier elasticity recovery.',
    displayOrder: 3,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'ingredient',
    name: 'Hyaluronic Acid',
    nameBN: 'হায়ালুরনিক অ্যাসিড',
    slug: 'hyaluronic-acid',
    description: 'Holds up to 1000x its weight in water for plump, bouncy glass skin.',
    displayOrder: 4,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'ingredient',
    name: 'Salicylic Acid (BHA)',
    nameBN: 'স্যালিসিলিক অ্যাসিড (BHA)',
    slug: 'salicylic-acid-bha',
    description: 'Oil-soluble acid that penetrates deep into pores to dissolve blackheads.',
    displayOrder: 5,
    isActive: true
  },
  {
    type: 'ingredient',
    name: 'Retinol & Retinal',
    nameBN: 'রেটিনল ও রেটিনাল (ভিটামিন এ)',
    slug: 'retinol-retinal',
    description: 'Gold standard cellular renewal for youthful firmness and fine line smoothing.',
    displayOrder: 6,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'ingredient',
    name: 'Rice Bran & Ferments',
    nameBN: 'রাইস এক্সট্রাক্ট ও ফারমেন্টস',
    slug: 'rice-extract-ferments',
    description: 'Traditional Korean brightening secret rich in amino acids and minerals.',
    displayOrder: 7,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'ingredient',
    name: 'Heartleaf (Houttuynia Cordata)',
    nameBN: 'হার্টলিফ এক্সট্রাক্ট',
    slug: 'heartleaf',
    description: 'Gentle cooling astringent ideal for calming inflamed acne breakouts.',
    displayOrder: 8,
    isActive: true,
    isFeatured: true
  },
  {
    type: 'ingredient',
    name: 'Ceramide NP/AP/EOP',
    nameBN: 'সিরামাইডস',
    slug: 'ceramides',
    description: 'Essential lipid building blocks that lock moisture inside the skin.',
    displayOrder: 9,
    isActive: true
  },
  {
    type: 'ingredient',
    name: 'Vitamin C (Ascorbic Acid)',
    nameBN: 'ভিটামিন সি (অ্যাসকরবিক অ্যাসিড)',
    slug: 'vitamin-c',
    description: 'Potent antioxidant fighting free radicals and fading stubborn pigmentation.',
    displayOrder: 10,
    isActive: true
  },
  {
    type: 'ingredient',
    name: 'Propolis & Royal Jelly',
    nameBN: 'প্রোপোলিস ও হানি এক্সট্রাক্ট',
    slug: 'propolis-honey',
    description: 'Antibacterial nourishing honey extract delivering rich honey-glow.',
    displayOrder: 11,
    isActive: true
  },
  {
    type: 'ingredient',
    name: 'PDRN / Salmon DNA',
    nameBN: 'পিডিআরএন / সালমন ডিএনএ',
    slug: 'pdrn-salmon-dna',
    description: 'Revolutionary K-beauty rejuvenation active for micro-firming and deep repair.',
    displayOrder: 12,
    isActive: true,
    isFeatured: true
  }
];

class TaxonomyService {
  private cache: TaxonomyItem[] = [];
  private isInitialized = false;
  private subscribers: Array<(items: TaxonomyItem[]) => void> = [];
  private unsubscribeFirestore: (() => void) | null = null;

  constructor() {
    this.loadFromLocalStorage();
    this.initRealtimeSubscription();
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        this.cache = JSON.parse(saved);
        this.isInitialized = true;
      }
    } catch (e) {
      console.warn('[TaxonomyService] Failed to load local cache:', e);
    }
  }

  private saveToLocalStorage(items: TaxonomyItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[TaxonomyService] Failed to save local cache:', e);
    }
  }

  private notifySubscribers(): void {
    const items = [...this.cache];
    this.subscribers.forEach((cb) => {
      try {
        cb(items);
      } catch (err) {
        console.error('[TaxonomyService] Subscriber callback error:', err);
      }
    });
  }

  public subscribe(callback: (items: TaxonomyItem[]) => void): () => void {
    this.subscribers.push(callback);
    // Immediately invoke with current cache
    if (this.cache.length > 0 || this.isInitialized) {
      callback([...this.cache]);
    }

    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  private initRealtimeSubscription(): void {
    if (typeof window === 'undefined') return;

    try {
      const q = query(
        collection(db, TAXONOMIES_COLLECTION),
        orderBy('displayOrder', 'asc')
      );

      this.unsubscribeFirestore = onSnapshot(
        q,
        (snapshot) => {
          if (!snapshot.empty) {
            const items: TaxonomyItem[] = snapshot.docs.map((d) => ({
              id: d.id,
              ...(d.data() as Omit<TaxonomyItem, 'id'>),
            }));
            this.cache = items;
            this.isInitialized = true;
            this.saveToLocalStorage(items);
            this.notifySubscribers();
          } else {
            // If empty in Firestore, fallback to built-in seed items in memory
            if (this.cache.length === 0) {
              this.cache = this.generateDefaultItemsWithIds();
              this.isInitialized = true;
              this.saveToLocalStorage(this.cache);
              this.notifySubscribers();
            }
          }
        },
        (error) => {
          console.warn('[TaxonomyService] Realtime listener error, using cache fallback:', error);
          if (this.cache.length === 0) {
            this.cache = this.generateDefaultItemsWithIds();
            this.isInitialized = true;
            this.notifySubscribers();
          }
        }
      );
    } catch (err) {
      console.warn('[TaxonomyService] Could not initialize Firestore listener:', err);
      if (this.cache.length === 0) {
        this.cache = this.generateDefaultItemsWithIds();
        this.isInitialized = true;
      }
    }
  }

  private generateDefaultItemsWithIds(): TaxonomyItem[] {
    return DEFAULT_TAXONOMIES_SEEDS.map((seed, idx) => ({
      ...seed,
      id: `default_${seed.type}_${seed.slug || idx}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }

  public async fetchTaxonomies(type?: TaxonomyDimensionType, forceRefresh = false): Promise<TaxonomyItem[]> {
    if (this.isInitialized && this.cache.length > 0 && !forceRefresh) {
      return type ? this.cache.filter((i) => i.type === type) : [...this.cache];
    }

    try {
      const collRef = collection(db, TAXONOMIES_COLLECTION);
      const snapshot = await getDocs(collRef);
      if (!snapshot.empty) {
        const items: TaxonomyItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TaxonomyItem, 'id'>),
        }));

        // Sort by display order
        items.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        this.cache = items;
        this.isInitialized = true;
        this.saveToLocalStorage(items);
        this.notifySubscribers();

        return type ? items.filter((i) => i.type === type) : items;
      } else {
        // Return default seeds
        const fallback = this.generateDefaultItemsWithIds();
        this.cache = fallback;
        this.isInitialized = true;
        this.saveToLocalStorage(fallback);
        this.notifySubscribers();
        return type ? fallback.filter((i) => i.type === type) : fallback;
      }
    } catch (err) {
      console.warn('[TaxonomyService] Fetch error, returning cached seeds:', err);
      const fallback = this.cache.length > 0 ? this.cache : this.generateDefaultItemsWithIds();
      return type ? fallback.filter((i) => i.type === type) : fallback;
    }
  }

  public getTaxonomiesSync(type?: TaxonomyDimensionType): TaxonomyItem[] {
    const list = this.cache.length > 0 ? this.cache : this.generateDefaultItemsWithIds();
    return type ? list.filter((i) => i.type === type) : list;
  }

  public async createTaxonomyItem(
    itemData: Omit<TaxonomyItem, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TaxonomyItem> {
    const slug = itemData.slug?.trim() || generateTaxonomySlug(itemData.name);
    const id = `${itemData.type}_${slug}_${Date.now()}`;
    const now = new Date().toISOString();

    const newItem: TaxonomyItem = {
      ...itemData,
      id,
      slug,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = doc(db, TAXONOMIES_COLLECTION, id);
      await setDoc(docRef, {
        ...newItem,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });

      // Optimistically update local cache
      this.cache = [...this.cache, newItem].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      this.saveToLocalStorage(this.cache);
      this.notifySubscribers();

      return newItem;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${TAXONOMIES_COLLECTION}/${id}`);
      throw error;
    }
  }

  public async updateTaxonomyItem(id: string, updates: Partial<TaxonomyItem>): Promise<void> {
    const now = new Date().toISOString();
    const cleanUpdates = {
      ...updates,
      updatedAt: now,
    };

    try {
      const docRef = doc(db, TAXONOMIES_COLLECTION, id);
      await updateDoc(docRef, {
        ...cleanUpdates,
        serverUpdatedAt: serverTimestamp(),
      });

      // Update local cache
      this.cache = this.cache.map((item) => (item.id === id ? { ...item, ...cleanUpdates } : item));
      this.saveToLocalStorage(this.cache);
      this.notifySubscribers();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${TAXONOMIES_COLLECTION}/${id}`);
      throw error;
    }
  }

  public async deleteTaxonomyItem(id: string): Promise<void> {
    try {
      const docRef = doc(db, TAXONOMIES_COLLECTION, id);
      await deleteDoc(docRef);

      // Update local cache
      this.cache = this.cache.filter((item) => item.id !== id);
      this.saveToLocalStorage(this.cache);
      this.notifySubscribers();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${TAXONOMIES_COLLECTION}/${id}`);
      throw error;
    }
  }

  public async reorderTaxonomies(orderedIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const updatedCache = [...this.cache];

      orderedIds.forEach((id, index) => {
        const item = updatedCache.find((i) => i.id === id);
        if (item) {
          item.displayOrder = index + 1;
          const docRef = doc(db, TAXONOMIES_COLLECTION, id);
          batch.update(docRef, { displayOrder: index + 1, serverUpdatedAt: serverTimestamp() });
        }
      });

      await batch.commit();

      this.cache = updatedCache.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      this.saveToLocalStorage(this.cache);
      this.notifySubscribers();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, TAXONOMIES_COLLECTION);
      throw error;
    }
  }

  public async seedDefaultTaxonomies(): Promise<{ createdCount: number }> {
    try {
      const batch = writeBatch(db);
      let count = 0;
      const now = new Date().toISOString();

      for (const seed of DEFAULT_TAXONOMIES_SEEDS) {
        const id = `${seed.type}_${seed.slug}`;
        const docRef = doc(db, TAXONOMIES_COLLECTION, id);
        batch.set(docRef, {
          ...seed,
          id,
          createdAt: now,
          updatedAt: now,
          serverCreatedAt: serverTimestamp(),
          serverUpdatedAt: serverTimestamp(),
        }, { merge: true });
        count++;
      }

      await batch.commit();
      await this.fetchTaxonomies(undefined, true);
      return { createdCount: count };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, TAXONOMIES_COLLECTION);
      throw error;
    }
  }

  public async batchAssignTaxonomyToProducts(
    dimensionType: TaxonomyDimensionType,
    taxonomyName: string,
    productIds: string[]
  ): Promise<{ modifiedCount: number }> {
    if (!productIds || productIds.length === 0) return { modifiedCount: 0 };

    try {
      const batch = writeBatch(db);
      const prodsSnap = await getDocs(collection(db, 'products'));
      let modified = 0;

      prodsSnap.forEach((docSnap) => {
        if (!productIds.includes(docSnap.id)) return;
        const currentData = docSnap.data() as Product;
        const updates: Partial<Product> = {};

        switch (dimensionType) {
          case 'brand':
            updates.brand = taxonomyName;
            break;
          case 'category':
            updates.category = taxonomyName;
            break;
          case 'routine_step':
            updates.routineStep = taxonomyName;
            break;
          case 'skin_type': {
            const current = Array.isArray(currentData.skinTypes) ? currentData.skinTypes : [];
            if (!current.some(s => s.toLowerCase() === taxonomyName.toLowerCase())) {
              updates.skinTypes = [...current, taxonomyName];
            }
            break;
          }
          case 'skin_concern': {
            const current = Array.isArray(currentData.concerns) ? currentData.concerns : [];
            if (!current.some(c => c.toLowerCase() === taxonomyName.toLowerCase())) {
              updates.concerns = [...current, taxonomyName];
            }
            break;
          }
          case 'target_benefit': {
            const current = Array.isArray(currentData.benefits) ? currentData.benefits : [];
            if (!current.some(b => b.toLowerCase() === taxonomyName.toLowerCase())) {
              updates.benefits = [...current, taxonomyName];
            }
            break;
          }
          case 'ingredient': {
            const current = Array.isArray(currentData.keyIngredients) ? currentData.keyIngredients : [];
            if (!current.some(i => i.toLowerCase() === taxonomyName.toLowerCase())) {
              updates.keyIngredients = [...current, taxonomyName];
            }
            break;
          }
        }

        if (Object.keys(updates).length > 0) {
          const docRef = doc(db, 'products', docSnap.id);
          batch.update(docRef, { ...updates, updatedAt: new Date().toISOString() });
          modified++;
        }
      });

      if (modified > 0) {
        await batch.commit();
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      }

      return { modifiedCount: modified };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
      throw error;
    }
  }

  public async batchUnassignTaxonomyFromProducts(
    dimensionType: TaxonomyDimensionType,
    taxonomyName: string,
    productIds: string[]
  ): Promise<{ modifiedCount: number }> {
    if (!productIds || productIds.length === 0) return { modifiedCount: 0 };

    try {
      const batch = writeBatch(db);
      const prodsSnap = await getDocs(collection(db, 'products'));
      let modified = 0;

      prodsSnap.forEach((docSnap) => {
        if (!productIds.includes(docSnap.id)) return;
        const currentData = docSnap.data() as Product;
        const updates: Partial<Product> = {};

        switch (dimensionType) {
          case 'brand':
            if (currentData.brand?.toLowerCase() === taxonomyName.toLowerCase()) {
              updates.brand = '';
            }
            break;
          case 'category':
            if (currentData.category?.toLowerCase() === taxonomyName.toLowerCase()) {
              updates.category = 'Other';
            }
            break;
          case 'routine_step':
            if (currentData.routineStep?.toLowerCase() === taxonomyName.toLowerCase()) {
              updates.routineStep = '';
            }
            break;
          case 'skin_type': {
            const current = Array.isArray(currentData.skinTypes) ? currentData.skinTypes : [];
            updates.skinTypes = current.filter(s => s.toLowerCase() !== taxonomyName.toLowerCase());
            break;
          }
          case 'skin_concern': {
            const current = Array.isArray(currentData.concerns) ? currentData.concerns : [];
            updates.concerns = current.filter(c => c.toLowerCase() !== taxonomyName.toLowerCase());
            break;
          }
          case 'target_benefit': {
            const current = Array.isArray(currentData.benefits) ? currentData.benefits : [];
            updates.benefits = current.filter(b => b.toLowerCase() !== taxonomyName.toLowerCase());
            break;
          }
          case 'ingredient': {
            const current = Array.isArray(currentData.keyIngredients) ? currentData.keyIngredients : [];
            updates.keyIngredients = current.filter(i => i.toLowerCase() !== taxonomyName.toLowerCase());
            break;
          }
        }

        if (Object.keys(updates).length > 0) {
          const docRef = doc(db, 'products', docSnap.id);
          batch.update(docRef, { ...updates, updatedAt: new Date().toISOString() });
          modified++;
        }
      });

      if (modified > 0) {
        await batch.commit();
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.taxonomies.all });
      }

      return { modifiedCount: modified };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
      throw error;
    }
  }
}

export const taxonomyService = new TaxonomyService();
