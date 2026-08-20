/**
 * Unified Analytics & E-Commerce Tracking Service
 * Handles GA4 (gtag.js), Meta Pixel (fbevents.js), and Meta Conversions API (CAPI) with full deduplication.
 */

import { Product, Order, OrderItem } from '../types';
import { getStoredAttribution } from './attributionService';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/// <reference types="vite/client" />

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    __KSF_ANALYTICS_INITIALIZED__?: boolean;
  }
}

// Configurable Environment Variables
const metaEnv = (import.meta as any).env || {};
const GA4_MEASUREMENT_ID = (metaEnv.VITE_GA4_MEASUREMENT_ID as string) || '';
const META_PIXEL_ID = (metaEnv.VITE_META_PIXEL_ID as string) || '';
const IS_DEV = Boolean(metaEnv.DEV);

// Deduplication cache for browser events to prevent re-render duplicate triggers
const dispatchedEventIds = new Set<string>();

/**
 * SHA-256 hashing for client-side privacy-safe customer matching
 */
async function sha256(str: string): Promise<string> {
  try {
    const trimmed = str.trim().toLowerCase();
    const encoder = new TextEncoder();
    const data = encoder.encode(trimmed);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback: Return empty string if subtle crypto is unavailable
    return '';
  }
}

/**
 * Normalize Bangladeshi phone number for hashing
 */
function normalizePhone(rawPhone: string): string {
  const cleaned = rawPhone.replace(/\D/g, '');
  if (cleaned.startsWith('880')) {
    return cleaned;
  }
  if (cleaned.startsWith('0')) {
    return '88' + cleaned;
  }
  return '880' + cleaned;
}

/**
 * Debug logging wrapper
 */
function logDebug(eventName: string, payload: any) {
  if (IS_DEV) {
    console.log(`%c[Analytics] ${eventName}`, 'color: #E91E8C; font-weight: bold; background: #fff0f5; padding: 2px 6px; border-radius: 4px;', payload);
  }
}

class AnalyticsService {
  private isInitialized = false;

  /**
   * Initialize GA4 and Meta Pixel exactly once
   */
  public init() {
    if (typeof window === 'undefined' || this.isInitialized || window.__KSF_ANALYTICS_INITIALIZED__) {
      return;
    }

    this.isInitialized = true;
    window.__KSF_ANALYTICS_INITIALIZED__ = true;

    // 1. Initialize Google Analytics 4 (GA4)
    if (GA4_MEASUREMENT_ID) {
      try {
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
          window.dataLayer!.push(args);
        }
        window.gtag = gtag;

        gtag('js', new Date());
        // Configure with send_page_view: false to manually manage SPA route transitions
        gtag('config', GA4_MEASUREMENT_ID, {
          send_page_view: false,
          currency: 'BDT'
        });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
        document.head.appendChild(script);
        logDebug('GA4 Initialized', { measurementId: GA4_MEASUREMENT_ID });
      } catch (err) {
        console.warn('[Analytics] GA4 init failed:', err);
      }
    }

    // 2. Initialize Meta Pixel
    if (META_PIXEL_ID) {
      try {
        if (!window.fbq) {
          const fbq: any = function (...args: any[]) {
            if (fbq.callMethod) {
              fbq.callMethod.apply(fbq, args);
            } else {
              fbq.queue.push(args);
            }
          };
          if (!window._fbq) window._fbq = fbq;
          fbq.push = fbq;
          fbq.loaded = true;
          fbq.version = '2.0';
          fbq.queue = [];
          window.fbq = fbq;

          const script = document.createElement('script');
          script.async = true;
          script.src = 'https://connect.facebook.net/en_US/fbevents.js';
          document.head.appendChild(script);
        }

        window.fbq('init', META_PIXEL_ID);
        logDebug('Meta Pixel Initialized', { pixelId: META_PIXEL_ID });
      } catch (err) {
        console.warn('[Analytics] Meta Pixel init failed:', err);
      }
    }
  }

  /**
   * Track SPA Page View
   */
  public trackPageView(pagePath: string, pageTitle?: string) {
    this.init();
    const title = pageTitle || document.title;
    logDebug('PageView', { path: pagePath, title });

    // GA4
    if (typeof window.gtag === 'function' && GA4_MEASUREMENT_ID) {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: title,
        page_location: window.location.href
      });
    }

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  }

  /**
   * Track Search Event
   */
  public trackSearch(searchTerm: string) {
    if (!searchTerm.trim()) return;
    logDebug('search', { search_term: searchTerm });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'search', {
        search_term: searchTerm.trim()
      });
    }

    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Search', {
        search_string: searchTerm.trim()
      });
    }
  }

  /**
   * Track View Item List (Catalog / Category)
   */
  public trackViewItemList(items: Product[], listName: string = 'Store Catalog') {
    if (!items || items.length === 0) return;
    const formattedItems = items.slice(0, 20).map((prod, index) => ({
      item_id: prod.id,
      item_name: prod.name,
      item_brand: prod.brand,
      item_category: prod.category,
      price: prod.discountPrice || prod.price,
      index: index + 1,
      item_list_name: listName
    }));

    logDebug('view_item_list', { listName, count: items.length });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'view_item_list', {
        item_list_name: listName,
        items: formattedItems
      });
    }
  }

  /**
   * Track Select Item (Product clicked in list)
   */
  public trackSelectItem(product: Product, listName: string = 'Store Catalog') {
    const item = {
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand,
      item_category: product.category,
      price: product.discountPrice || product.price,
      item_list_name: listName
    };

    logDebug('select_item', item);

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'select_item', {
        item_list_name: listName,
        items: [item]
      });
    }
  }

  /**
   * Track Product Detail View (view_item / ViewContent)
   */
  public trackViewItem(product: Product) {
    if (!product?.id) return;
    const price = product.discountPrice || product.price;

    logDebug('view_item / ViewContent', { id: product.id, name: product.name, price });

    // GA4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'view_item', {
        currency: 'BDT',
        value: price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_brand: product.brand,
          item_category: product.category,
          price: price,
          quantity: 1
        }]
      });
    }

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        content_type: 'product',
        value: price,
        currency: 'BDT'
      });
    }
  }

  /**
   * Track Add To Cart (add_to_cart / AddToCart)
   */
  public trackAddToCart(product: Product, quantity: number = 1) {
    if (!product?.id) return;
    const price = product.discountPrice || product.price;
    const totalValue = price * quantity;

    logDebug('add_to_cart / AddToCart', { id: product.id, quantity, totalValue });

    // GA4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'add_to_cart', {
        currency: 'BDT',
        value: totalValue,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_brand: product.brand,
          item_category: product.category,
          price: price,
          quantity: quantity
        }]
      });
    }

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        content_type: 'product',
        value: totalValue,
        currency: 'BDT'
      });
    }
  }

  /**
   * Track Remove From Cart
   */
  public trackRemoveFromCart(product: Product, quantity: number = 1) {
    if (!product?.id) return;
    const price = product.discountPrice || product.price;

    logDebug('remove_from_cart', { id: product.id, quantity });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'remove_from_cart', {
        currency: 'BDT',
        value: price * quantity,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_brand: product.brand,
          item_category: product.category,
          price: price,
          quantity: quantity
        }]
      });
    }
  }

  /**
   * Track View Cart (Drawer open)
   */
  public trackViewCart(items: { product: Product; quantity: number }[], subtotal: number) {
    if (!items || items.length === 0) return;

    logDebug('view_cart', { itemCount: items.length, subtotal });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'view_cart', {
        currency: 'BDT',
        value: subtotal,
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          item_brand: i.product.brand,
          item_category: i.product.category,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity
        }))
      });
    }
  }

  /**
   * Track Begin Checkout (begin_checkout / InitiateCheckout)
   */
  public trackBeginCheckout(items: { product: Product; quantity: number }[], totalValue: number) {
    if (!items || items.length === 0) return;

    logDebug('begin_checkout / InitiateCheckout', { itemCount: items.length, totalValue });

    const contentIds = items.map(i => i.product.id);
    const numItems = items.reduce((sum, i) => sum + i.quantity, 0);

    // GA4
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'begin_checkout', {
        currency: 'BDT',
        value: totalValue,
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          item_brand: i.product.brand,
          item_category: i.product.category,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity
        }))
      });
    }

    // Meta Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: contentIds,
        content_type: 'product',
        num_items: numItems,
        value: totalValue,
        currency: 'BDT'
      });
    }
  }

  /**
   * Track Add Shipping Info
   */
  public trackAddShippingInfo(shippingTier: 'dhaka' | 'outside', shippingFee: number, items: { product: Product; quantity: number }[], totalValue: number) {
    logDebug('add_shipping_info', { shippingTier, shippingFee, totalValue });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'add_shipping_info', {
        currency: 'BDT',
        value: totalValue,
        shipping_tier: shippingTier === 'dhaka' ? 'Inside Dhaka (৳80)' : 'Outside Dhaka (৳150)',
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity
        }))
      });
    }
  }

  /**
   * Track Add Payment Info
   */
  public trackAddPaymentInfo(paymentType: string, items: { product: Product; quantity: number }[], totalValue: number) {
    logDebug('add_payment_info', { paymentType, totalValue });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'add_payment_info', {
        currency: 'BDT',
        value: totalValue,
        payment_type: paymentType,
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity
        }))
      });
    }
  }

  /**
   * Authoritative Purchase Tracking with Deduplication and CAPI Dispatch
   * Only website orders (order_source === 'WEBSITE') trigger purchase tracking.
   */
  public async trackPurchase(order: Order): Promise<void> {
    if (!order || !order.id) return;

    // Strict Allow-List: ONLY website orders (order_source === 'WEBSITE') may generate purchase tracking.
    // POS, ADMIN, MANUAL, null, undefined, or any unknown sources are strictly rejected.
    if (order.order_source !== 'WEBSITE') {
      logDebug('Non-website Order Skipped from Website Conversion Tracking (Allow-list Enforced)', {
        orderId: order.id,
        orderSource: order.order_source
      });
      return;
    }

    // Deterministic unique event_id for Meta browser & server deduplication
    const eventId = `purchase_${order.id}`;

    // Idempotency check: Don't fire if already sent in this browser session
    if (dispatchedEventIds.has(eventId)) {
      logDebug('Purchase Event Already Dispatched in Session (Prevented Duplicate)', { eventId });
      return;
    }

    dispatchedEventIds.add(eventId);

    const grandTotal = Number(order.totalAmount || 0);
    const contentIds = (order.items || []).map(item => item.productId);
    const numItems = (order.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

    const formattedGaItems = (order.items || []).map(item => ({
      item_id: item.productId,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity
    }));

    logDebug('purchase / Purchase', {
      orderId: order.id,
      eventId,
      grandTotal,
      itemsCount: formattedGaItems.length
    });

    // 1. Dispatch GA4 Purchase
    if (typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'purchase', {
          transaction_id: order.id,
          value: grandTotal,
          currency: 'BDT',
          discount: order.discountAmount || 0,
          points_redeemed: order.pointsRedeemed || 0,
          items: formattedGaItems
        });
      } catch (gaErr) {
        console.warn('[Analytics] GA4 purchase error:', gaErr);
      }
    }

    // 2. Dispatch Meta Pixel Purchase with matching eventID for deduplication
    if (typeof window.fbq === 'function') {
      try {
        window.fbq(
          'track',
          'Purchase',
          {
            content_ids: contentIds,
            content_type: 'product',
            num_items: numItems,
            value: grandTotal,
            currency: 'BDT',
            order_id: order.id
          },
          {
            eventID: eventId
          }
        );
      } catch (metaErr) {
        console.warn('[Analytics] Meta Pixel purchase error:', metaErr);
      }
    }

    // 3. Dispatch Server-Side Meta Conversions API (CAPI) via Firebase Cloud Function
    try {
      const attribution = getStoredAttribution();
      const hashedEmail = order.customerEmail ? await sha256(order.customerEmail) : undefined;
      const hashedPhone = order.customerPhone ? await sha256(normalizePhone(order.customerPhone)) : undefined;

      const capiPayload = {
        eventName: 'Purchase',
        eventId: eventId,
        orderId: order.id,
        value: grandTotal,
        currency: 'BDT',
        items: (order.items || []).map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity
        })),
        customerData: {
          em: hashedEmail,
          ph: hashedPhone,
          fbp: attribution.fbp,
          fbc: attribution.fbc,
          clientUserAgent: navigator.userAgent
        },
        attribution: {
          ...attribution,
          order_id: order.id
        }
      };

      // Call Firebase Cloud Function trackMetaCapiEvent
      const callMetaCapi = httpsCallable(functions, 'trackMetaCapiEvent');
      callMetaCapi(capiPayload)
        .then((res: any) => {
          logDebug('Meta CAPI Cloud Function Response', res.data);
        })
        .catch((funcErr: any) => {
          // Graceful fallback to server endpoint or log warning
          logDebug('Meta CAPI Callable Notice (Attempting proxy fallback):', funcErr.message);
          fetch('/api/tracking/meta-capi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(capiPayload)
          })
            .then(res => res.json())
            .then(data => logDebug('Meta CAPI Fallback Response', data))
            .catch(err => console.warn('[Analytics] Meta CAPI dispatch error:', err));
        });
    } catch (capiErr) {
      console.warn('[Analytics] CAPI prep error:', capiErr);
    }
  }

  /**
   * Track Refund (Order Cancelled)
   */
  public trackRefund(order: Order) {
    if (!order || !order.id) return;
    logDebug('refund', { orderId: order.id, totalAmount: order.totalAmount });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'refund', {
        transaction_id: order.id,
        value: order.totalAmount,
        currency: 'BDT',
        items: (order.items || []).map(i => ({
          item_id: i.productId,
          item_name: i.name,
          price: i.price,
          quantity: i.quantity
        }))
      });
    }
  }
}

export const analytics = new AnalyticsService();
