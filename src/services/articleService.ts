import { SkincareGuide, INITIAL_SKINCARE_GUIDES } from '../data/skincareGuides';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
} from 'firebase/firestore';

const BUILT_IN_SLUG_SET = new Set(INITIAL_SKINCARE_GUIDES.map((g) => g.slug.toLowerCase()));

const VALID_CATEGORIES: SkincareGuide['category'][] = [
  'routine',
  'sun_care',
  'sensitive',
  'acne',
  'dry_skin',
  'authentication',
  'ingredients',
  'layering',
];

export function slugifyGuideTitle(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150);
}

function normalizeGuidePayload(article: Partial<SkincareGuide>, fallbackSlug?: string): SkincareGuide {
  const rawSlug = article.slug?.trim() || slugifyGuideTitle(article.title || '') || fallbackSlug || `guide-${Date.now()}`;
  let cleanSlug = slugifyGuideTitle(rawSlug);
  if (cleanSlug.length < 2) {
    cleanSlug = `guide-${Date.now()}`;
  }

  const nowIso = new Date().toISOString();
  const safeCategory: SkincareGuide['category'] = VALID_CATEGORIES.includes(
    article.category as SkincareGuide['category']
  )
    ? (article.category as SkincareGuide['category'])
    : 'routine';

  const safeReadingTime = Math.min(
    120,
    Math.max(1, Math.round(Number(article.readingTimeMinutes) || 5))
  );

  const safeFaqs = Array.isArray(article.faqs)
    ? article.faqs
        .filter((f) => f && (f.question?.trim() || f.answer?.trim()))
        .slice(0, 30)
        .map((f) => ({
          question: String(f.question || '').trim().slice(0, 400),
          ...(f.questionBN?.trim() ? { questionBN: f.questionBN.trim().slice(0, 500) } : {}),
          answer: String(f.answer || '').trim().slice(0, 2000),
          ...(f.answerBN?.trim() ? { answerBN: f.answerBN.trim().slice(0, 2500) } : {}),
        }))
    : [];

  return {
    id: String(article.id || cleanSlug).trim().slice(0, 160) || cleanSlug,
    slug: cleanSlug,
    title: String(article.title || 'Untitled Skincare Guide').trim().slice(0, 300),
    titleBN: String(article.titleBN || '').trim().slice(0, 400),
    excerpt: String(article.excerpt || '').trim().slice(0, 1000),
    excerptBN: String(article.excerptBN || '').trim().slice(0, 1200),
    category: safeCategory,
    status: article.status === 'draft' ? 'draft' : 'published',
    isDeleted: Boolean(article.isDeleted),
    readingTimeMinutes: safeReadingTime,
    publishedDate: String(article.publishedDate || nowIso).slice(0, 64),
    lastUpdatedDate: nowIso.slice(0, 64),
    heroImage: String(article.heroImage || '').trim().slice(0, 1500),
    imageAltText: String(article.imageAltText || article.title || 'Korean skincare guide').trim().slice(0, 400),
    targetSkinTypes: Array.isArray(article.targetSkinTypes)
      ? article.targetSkinTypes.map((s) => String(s).trim()).filter(Boolean).slice(0, 20)
      : [],
    keyIngredients: Array.isArray(article.keyIngredients)
      ? article.keyIngredients.map((s) => String(s).trim()).filter(Boolean).slice(0, 30)
      : [],
    recommendedBrandSlugs: Array.isArray(article.recommendedBrandSlugs)
      ? article.recommendedBrandSlugs.map((s) => String(s).trim().toLowerCase()).filter(Boolean).slice(0, 20)
      : [],
    recommendedProductIds: Array.isArray(article.recommendedProductIds)
      ? article.recommendedProductIds.map((s) => String(s).trim()).filter(Boolean).slice(0, 24)
      : [],
    content: String(article.content || '').slice(0, 60000),
    contentBN: String(article.contentBN || '').slice(0, 60000),
    faqs: safeFaqs,
    author: {
      name: String(article.author?.name || 'Korean Skin Food BD Editorial Team').trim().slice(0, 160),
      role: String(article.author?.role || 'K-Beauty Cosmeceutical Research').trim().slice(0, 160),
    },
  };
}

class ArticleService {
  private remoteDocsMap = new Map<string, SkincareGuide>();
  private allMergedCache: SkincareGuide[] = INITIAL_SKINCARE_GUIDES.map((g) => ({
    ...g,
    status: g.status || 'published',
    isDeleted: false,
  }));
  private isFirestoreSynced = false;
  private publicSubscribers = new Set<(articles: SkincareGuide[]) => void>();
  private adminSubscribers = new Set<(articles: SkincareGuide[]) => void>();

  constructor() {
    this.rebuildCache();
    this.initFirestoreListener();
  }

  private rebuildCache() {
    const mergedMap = new Map<string, SkincareGuide>();

    INITIAL_SKINCARE_GUIDES.forEach((guide) => {
      mergedMap.set(guide.slug.toLowerCase(), {
        ...guide,
        status: guide.status || 'published',
        isDeleted: false,
      });
    });

    this.remoteDocsMap.forEach((remoteGuide, key) => {
      mergedMap.set(key, {
        ...remoteGuide,
        status: remoteGuide.status === 'draft' ? 'draft' : 'published',
        isDeleted: Boolean(remoteGuide.isDeleted),
      });
    });

    this.allMergedCache = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  }

  private initFirestoreListener() {
    if (typeof window === 'undefined') return;

    try {
      const articlesRef = collection(db, 'educational_articles');
      onSnapshot(
        articlesRef,
        (snapshot) => {
          const nextRemoteMap = new Map<string, SkincareGuide>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as SkincareGuide;
            const slugKey = (data.slug || docSnap.id).toLowerCase();
            nextRemoteMap.set(slugKey, {
              ...data,
              id: data.id || docSnap.id,
              slug: data.slug || docSnap.id,
              status: data.status === 'draft' ? 'draft' : 'published',
              isDeleted: Boolean(data.isDeleted),
            });
          });

          this.remoteDocsMap = nextRemoteMap;
          this.rebuildCache();
          this.isFirestoreSynced = true;
          this.notifySubscribers();
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, 'educational_articles', false);
        }
      );
    } catch (e) {
      console.warn('[ArticleService] Listener setup notice:', e);
    }
  }

  private getFilteredPublicArticles(): SkincareGuide[] {
    return this.allMergedCache.filter((g) => !g.isDeleted && g.status !== 'draft');
  }

  private getFilteredAdminArticles(): SkincareGuide[] {
    return this.allMergedCache.filter((g) => !g.isDeleted);
  }

  public subscribe(callback: (articles: SkincareGuide[]) => void): () => void {
    this.publicSubscribers.add(callback);
    callback(this.getFilteredPublicArticles());
    return () => {
      this.publicSubscribers.delete(callback);
    };
  }

  public subscribeAdmin(callback: (articles: SkincareGuide[]) => void): () => void {
    this.adminSubscribers.add(callback);
    callback(this.getFilteredAdminArticles());
    return () => {
      this.adminSubscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    const publicList = this.getFilteredPublicArticles();
    const adminList = this.getFilteredAdminArticles();

    this.publicSubscribers.forEach((cb) => {
      try {
        cb(publicList);
      } catch (e) {
        console.error('[ArticleService] Public subscriber error:', e);
      }
    });

    this.adminSubscribers.forEach((cb) => {
      try {
        cb(adminList);
      } catch (e) {
        console.error('[ArticleService] Admin subscriber error:', e);
      }
    });
  }

  public isSynced(): boolean {
    return this.isFirestoreSynced;
  }

  public isBuiltInSlug(slug: string): boolean {
    return BUILT_IN_SLUG_SET.has(slug.toLowerCase().trim());
  }

  public getDeletedBuiltInCount(): number {
    let count = 0;
    INITIAL_SKINCARE_GUIDES.forEach((g) => {
      const remote = this.remoteDocsMap.get(g.slug.toLowerCase());
      if (remote?.isDeleted) count++;
    });
    return count;
  }

  public getAllArticles(): SkincareGuide[] {
    return this.getFilteredPublicArticles();
  }

  public getAllAdminArticles(): SkincareGuide[] {
    return this.getFilteredAdminArticles();
  }

  public getArticleBySlug(slug: string, includeDrafts = false): SkincareGuide | null {
    if (!slug) return null;
    const cleanSlug = slug.toLowerCase().trim();
    const found = this.allMergedCache.find(
      (a) => a.slug.toLowerCase() === cleanSlug && !a.isDeleted
    );
    if (!found) return null;
    if (!includeDrafts && found.status === 'draft') return null;
    return found;
  }

  public getArticlesByCategory(category: string): SkincareGuide[] {
    const publicList = this.getFilteredPublicArticles();
    if (!category || category === 'all') return publicList;
    return publicList.filter((a) => a.category === category);
  }

  public async saveArticle(
    article: Partial<SkincareGuide>,
    previousSlug?: string
  ): Promise<SkincareGuide> {
    const cleanArticle = normalizeGuidePayload({
      ...article,
      isDeleted: false,
    });
    const slugKey = cleanArticle.slug.toLowerCase();
    const prevKey = previousSlug?.trim().toLowerCase();

    try {
      const docRef = doc(db, 'educational_articles', slugKey);
      await setDoc(docRef, sanitizeForFirestore(cleanArticle));
      this.remoteDocsMap.set(slugKey, cleanArticle);

      // Clean up or soft-delete previous slug if renamed
      if (prevKey && prevKey !== slugKey) {
        if (this.isBuiltInSlug(prevKey)) {
          const builtIn = INITIAL_SKINCARE_GUIDES.find((g) => g.slug.toLowerCase() === prevKey);
          if (builtIn) {
            const tombstone = normalizeGuidePayload({
              ...builtIn,
              status: 'draft',
              isDeleted: true,
            });
            await setDoc(doc(db, 'educational_articles', prevKey), sanitizeForFirestore(tombstone));
            this.remoteDocsMap.set(prevKey, tombstone);
          }
        } else {
          await deleteDoc(doc(db, 'educational_articles', prevKey));
          this.remoteDocsMap.delete(prevKey);
        }
      }

      this.rebuildCache();
      this.notifySubscribers();
      return cleanArticle;
    } catch (err: any) {
      console.error('[ArticleService] Failed to save article to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, `educational_articles/${slugKey}`);
      throw err;
    }
  }

  public async toggleArticleStatus(
    slug: string,
    nextStatus: 'published' | 'draft'
  ): Promise<SkincareGuide | null> {
    const existing = this.getArticleBySlug(slug, true);
    if (!existing) return null;
    return this.saveArticle({
      ...existing,
      status: nextStatus,
      isDeleted: false,
    });
  }

  public async deleteArticle(slug: string): Promise<void> {
    const slugKey = slug.toLowerCase().trim();
    if (!slugKey) return;

    try {
      if (this.isBuiltInSlug(slugKey)) {
        const builtIn = INITIAL_SKINCARE_GUIDES.find((g) => g.slug.toLowerCase() === slugKey);
        const existing = this.getArticleBySlug(slugKey, true) || builtIn;
        if (existing) {
          const tombstone = normalizeGuidePayload({
            ...existing,
            status: 'draft',
            isDeleted: true,
          });
          await setDoc(doc(db, 'educational_articles', slugKey), sanitizeForFirestore(tombstone));
          this.remoteDocsMap.set(slugKey, tombstone);
        }
      } else {
        await deleteDoc(doc(db, 'educational_articles', slugKey));
        this.remoteDocsMap.delete(slugKey);
      }

      this.rebuildCache();
      this.notifySubscribers();
    } catch (err: any) {
      console.error('[ArticleService] Failed to delete article:', err);
      handleFirestoreError(err, OperationType.DELETE, `educational_articles/${slugKey}`);
      throw err;
    }
  }

  public async restoreDeletedBuiltInGuides(): Promise<number> {
    const toRestore = INITIAL_SKINCARE_GUIDES.filter(
      (g) => this.remoteDocsMap.get(g.slug.toLowerCase())?.isDeleted
    );
    if (toRestore.length === 0) return 0;

    try {
      const batch = writeBatch(db);
      toRestore.forEach((guide) => {
        const slugKey = guide.slug.toLowerCase();
        const restored = normalizeGuidePayload({
          ...guide,
          status: 'published',
          isDeleted: false,
        });
        batch.set(doc(db, 'educational_articles', slugKey), sanitizeForFirestore(restored));
        this.remoteDocsMap.set(slugKey, restored);
      });
      await batch.commit();
      this.rebuildCache();
      this.notifySubscribers();
      return toRestore.length;
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'educational_articles');
      throw err;
    }
  }
}

export const articleService = new ArticleService();
