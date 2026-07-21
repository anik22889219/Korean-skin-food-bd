import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, getDocs, query, orderBy, limit, doc, setDoc } from 'firebase/firestore';

export interface AgentRunLog {
  id: string;
  type: string;
  timestamp: string;
  summary: string;
  results: {
    discountSuggestions: {
      productId: string;
      name: string;
      originalPrice: number;
      suggestedPrice: number;
      discountPercent: number;
      reason: string;
    }[];
  };
}

export interface AiAgentRun {
  id: string;
  agentType: string;
  timestamp: string;
  status: 'success' | 'failed' | 'pending';
  summary: string;
  output?: {
    lowStockCount?: number;
    items?: any[];
    unsoldProductsCount?: number;
    suggestions?: any[];
    productId?: string;
    productName?: string;
    result?: {
      seoTitle?: string;
      metaDescription?: string;
      productDescription?: string;
      keywords?: string;
      jsonLdSchema?: any;
    };
    error?: string;
    nextSteps?: string;
  };
}

// Local mock storage for offline support
const MOCK_RUNS_KEY = 'ksf_agent_runs_v1';
const initialMockLogs: AgentRunLog[] = [
  {
    id: "run-091",
    type: "Warehouse Inventory Watch",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    summary: "Scanned all 12 items. Found 2 items with low stock (under 10 units): Beauty of Joseon Sunscreen (7 units) and COSRX Snail Mucin (4 units). Alert sent to purchasing manager.",
    results: { discountSuggestions: [] }
  },
  {
    id: "run-090",
    type: "Weekly Pricing Optimizer",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    summary: "Reviewed 30-day conversion funnel. Identified COSRX Low pH Cleanser as low conversion (1.2% CTR). Suggested promotional markdown to stimulate high volume in Dhaka.",
    results: {
      discountSuggestions: [
        {
          productId: "p1",
          name: "COSRX Low pH Good Morning Gel Cleanser (150ml)",
          originalPrice: 1150,
          suggestedPrice: 1050,
          discountPercent: 9,
          reason: "Slow moving stock (42 units). 9% markdown boosts conversions to 3.8% based on historical beauty cohort trends."
        }
      ]
    }
  }
];

export const agentService = {
  /**
   * For backward compatibility with App.tsx
   */
  getRunLogs(): AgentRunLog[] {
    const cached = localStorage.getItem(MOCK_RUNS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    localStorage.setItem(MOCK_RUNS_KEY, JSON.stringify(initialMockLogs));
    return initialMockLogs;
  },

  /**
   * For backward compatibility with manual run triggers in App.tsx
   */
  async runAutonomousAgent(mode: string = 'manual'): Promise<AgentRunLog> {
    try {
      // Also trigger the real backend pricing optimizer to record to Firestore
      const priceRun = await this.triggerPricingSuggestion();
      
      const nextId = "run-" + Math.floor(100 + Math.random() * 900);
      const newLog: AgentRunLog = {
        id: nextId,
        type: "Weekly Pricing Optimizer",
        timestamp: new Date().toISOString(),
        summary: priceRun.summary || "Catalog conversion and pricing optimizer audit successfully completed.",
        results: {
          discountSuggestions: (priceRun.output?.suggestions || []).map((s: any) => ({
            productId: s.productId,
            name: s.productName,
            originalPrice: s.currentPrice,
            suggestedPrice: s.newSuggestedPrice,
            discountPercent: s.suggestedDiscountPercentage,
            reason: s.reason
          }))
        }
      };

      const cached = this.getRunLogs();
      cached.unshift(newLog);
      localStorage.setItem(MOCK_RUNS_KEY, JSON.stringify(cached.slice(0, 10)));
      return newLog;
    } catch (err) {
      console.error("runAutonomousAgent failed, falling back to simulation:", err);
      const nextId = "run-" + Math.floor(100 + Math.random() * 900);
      const fallbackLog: AgentRunLog = {
        id: nextId,
        type: "Weekly Pricing Optimizer",
        timestamp: new Date().toISOString(),
        summary: "Weekly Pricing Optimizer successfully simulated slow-moving skincare items.",
        results: {
          discountSuggestions: [
            {
              productId: "p1",
              name: "COSRX Low pH Good Morning Gel Cleanser (150ml)",
              originalPrice: 1150,
              suggestedPrice: 1050,
              discountPercent: 9,
              reason: "Slow moving stock in Bangladesh. Prompts 9% markdown to drive client conversions."
            }
          ]
        }
      };
      const cached = this.getRunLogs();
      cached.unshift(fallbackLog);
      localStorage.setItem(MOCK_RUNS_KEY, JSON.stringify(cached.slice(0, 10)));
      return fallbackLog;
    }
  },

  /**
   * Fetches the real audit list of runs from Firestore
   */
  async getRecentRuns(limitCount: number = 15): Promise<AiAgentRun[]> {
    const path = 'ai_agent_runs';
    try {
      const q = query(
        collection(db, path),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const runs: AiAgentRun[] = [];
      snapshot.forEach((doc) => {
        runs.push(doc.data() as AiAgentRun);
      });
      return runs;
    } catch (error: any) {
      console.error("Error fetching recent runs from Firestore:", error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permission') || error?.message?.includes('Permission')) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      return [];
    }
  },

  /**
   * Trigger the Inventory Watch agent backend
   */
  async triggerInventoryWatch(): Promise<AiAgentRun> {
    const response = await fetch('/api/functions/inventoryWatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger Inventory Watch: ${response.statusText}`);
    }
    const result = await response.json();
    return result as AiAgentRun;
  },

  /**
   * Trigger the Weekly Pricing Optimizer agent backend
   */
  async triggerPricingSuggestion(): Promise<AiAgentRun> {
    const response = await fetch('/api/functions/pricingSuggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger Pricing Suggestion: ${response.statusText}`);
    }
    const result = await response.json();
    return result as AiAgentRun;
  },

  /**
   * Trigger the Product Marketing Copywriter agent backend
   */
  async generateProductMarketingContent(productId: string): Promise<any> {
    const response = await fetch('/api/functions/generateProductContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId })
    });
    if (!response.ok) {
      throw new Error(`Failed to generate marketing content: ${response.statusText}`);
    }
    const data = await response.json();
    if (data.success && data.result) {
      // Store in client-side localStorage state of products for immediate rendering
      const productsStr = localStorage.getItem('ksf_products');
      if (productsStr) {
        const prods = JSON.parse(productsStr);
        const idx = prods.findIndex((p: any) => p.id === productId);
        if (idx !== -1) {
          prods[idx].generatedSeoContent = data.result.seoTitle + " - " + data.result.metaDescription;
          prods[idx].generatedSocialPost = data.result.productDescription;
          // Merge newly generated results
          prods[idx].seoTitle = data.result.seoTitle;
          prods[idx].metaDescription = data.result.metaDescription;
          prods[idx].productDescription = data.result.productDescription;
          prods[idx].keywords = data.result.keywords;
          prods[idx].jsonLdSchema = data.result.jsonLdSchema;
          localStorage.setItem('ksf_products', JSON.stringify(prods));
        }
      }
      return data.result;
    }
    throw new Error(data.summary || "Marketing content generation failed.");
  }
};
