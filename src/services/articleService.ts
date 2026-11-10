import { SkincareGuide, INITIAL_SKINCARE_GUIDES } from '../data/skincareGuides';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';

class ArticleService {
  private memoryCache: SkincareGuide[] = [...INITIAL_SKINCARE_GUIDES];
  private isFirestoreSynced = false;
  private subscribers = new Set<(articles: SkincareGuide[]) => void>();

  constructor() {
    this.initFirestoreListener();
  }

  private initFirestoreListener() {
    if (typeof window === 'undefined') return;

    try {
      const articlesRef = collection(db, 'educational_articles');
      onSnapshot(articlesRef, (snapshot) => {
        if (!snapshot.empty) {
          const remoteArticles: SkincareGuide[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as SkincareGuide;
            remoteArticles.push({
              ...data,
              id: docSnap.id || data.id,
              slug: data.slug || docSnap.id
            });
          });

          // Merge: remote articles take precedence over pre-seeded initial guides with same slug
          const mergedMap = new Map<string, SkincareGuide>();
          INITIAL_SKINCARE_GUIDES.forEach(guide => mergedMap.set(guide.slug, guide));
          remoteArticles.forEach(guide => mergedMap.set(guide.slug, guide));

          this.memoryCache = Array.from(mergedMap.values()).sort(
            (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
          );
          this.isFirestoreSynced = true;
          this.notifySubscribers();
        }
      }, (err) => {
        console.warn('[ArticleService] Firestore onSnapshot warning:', err);
      });
    } catch (e) {
      console.warn('[ArticleService] Listener setup notice:', e);
    }
  }

  public subscribe(callback: (articles: SkincareGuide[]) => void): () => void {
    this.subscribers.add(callback);
    callback(this.memoryCache);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers() {
    this.subscribers.forEach(cb => {
      try {
        cb(this.memoryCache);
      } catch (e) {
        console.error('[ArticleService] Subscriber notification error:', e);
      }
    });
  }

  public getAllArticles(): SkincareGuide[] {
    return this.memoryCache;
  }

  public getArticleBySlug(slug: string): SkincareGuide | null {
    if (!slug) return null;
    const cleanSlug = slug.toLowerCase().trim();
    return this.memoryCache.find(a => a.slug.toLowerCase() === cleanSlug) || null;
  }

  public getArticlesByCategory(category: string): SkincareGuide[] {
    if (!category || category === 'all') return this.memoryCache;
    return this.memoryCache.filter(a => a.category === category);
  }

  public async saveArticle(article: SkincareGuide): Promise<void> {
    const slug = article.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cleanArticle: SkincareGuide = {
      ...article,
      id: article.id || `guide-${Date.now()}`,
      slug,
      lastUpdatedDate: new Date().toISOString()
    };

    // Update in memory cache first
    const existingIndex = this.memoryCache.findIndex(a => a.slug === slug || a.id === cleanArticle.id);
    if (existingIndex >= 0) {
      this.memoryCache[existingIndex] = cleanArticle;
    } else {
      this.memoryCache.unshift(cleanArticle);
    }
    this.notifySubscribers();

    // Persist to Firestore
    try {
      const docRef = doc(db, 'educational_articles', slug);
      await setDoc(docRef, sanitizeForFirestore(cleanArticle), { merge: true });
    } catch (err: any) {
      console.error('[ArticleService] Failed to save article to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, `educational_articles/${slug}`);
      throw err;
    }
  }
}

export const articleService = new ArticleService();
