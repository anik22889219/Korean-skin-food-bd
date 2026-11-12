/**
 * Unified Analytics & E-Commerce Tracking Service
 * Dynamically driven by Firestore tracking settings (`settings/tracking`).
 * Handles GTM, GA4 (gtag.js), Meta Pixel (fbevents.js), and Meta Conversions API (CAPI) with full deduplication.
 */

import { Product, Order, OrderItem } from '../types';
import { productService } from './productService';
import { getStoredAttribution } from './attributionService';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { trackingSettingsService, TrackingSettings, DEFAULT_TRACKING_SETTINGS } from './trackingSettingsService';
import { initPinterestTag, trackPinterestEvent } from './pinterestTag';

/// <reference types="vite/client" />

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    _fbq?: any;
    __KSF_ANALYTICS_INITIALIZED__?: boolean;
    __KSF_META_PIXEL_INITIALIZED__?: boolean;
    __KSF_CURRENT_GTM_ID__?: string;
    __KSF_CURRENT_GA4_ID__?: string;
    __KSF_CURRENT_PIXEL_ID__?: string;
    __KSF_ANALYTICS_DEBUG__?: {
      GTM_ID: string;
      GA4_MEASUREMENT_ID: string;
      META_PIXEL_ID: string;
      isGa4Configured: boolean;
      source: string;
      gtagScriptRequested: boolean;
      fbqScriptRequested: boolean;
      gtmScriptRequested: boolean;
      settings: TrackingSettings;
    };
  }
}

const metaEnv = (import.meta as any).env || {};
const IS_DEV = Boolean(metaEnv.DEV);
const DISPATCHED_STORAGE_KEY = 'ksf_dispatched_analytics_events_v1';

// Deduplication cache for browser events loaded from persistent storage to survive page refreshes and browser reopens
function getPersistedDispatchedEvents(): Set<string> {
  const set = new Set<string>();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(DISPATCHED_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => set.add(id));
        }
      }
    } catch {
      // ignore
    }
  }
  return set;
}

const dispatchedEventIds: Set<string> = getPersistedDispatchedEvents();

function recordDispatchedEvent(eventId: string) {
  if (!eventId) return;
  dispatchedEventIds.add(eventId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const arr = Array.from(dispatchedEventIds);
      if (arr.length > 500) {
        arr.splice(0, arr.length - 500);
      }
      localStorage.setItem(DISPATCHED_STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }
}

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
  } catch {
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
  private activeSettings: TrackingSettings = { ...DEFAULT_TRACKING_SETTINGS };
  private unsubscribeSettings: (() => void) | null = null;

  constructor() {
    this.activeSettings = trackingSettingsService.getCurrentSettings();
  }

  /**
   * Initialize GA4, GTM and Meta Pixel with live subscription
   */
  public init() {
    if (typeof window === 'undefined') return;

    if (!this.unsubscribeSettings) {
      this.unsubscribeSettings = trackingSettingsService.subscribe((settings) => {
        this.applySettingsUpdate(settings);
      });
    }

    if (this.isInitialized || window.__KSF_ANALYTICS_INITIALIZED__) {
      return;
    }

    this.isInitialized = true;
    window.__KSF_ANALYTICS_INITIALIZED__ = true;

    // Initialize Pinterest Tag
    initPinterestTag();

    // Ensure window.dataLayer & window.gtag are always accessible
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function (...args: any[]) {
        window.dataLayer!.push(args);
      };
    }

    this.applySettingsUpdate(this.activeSettings);
  }

  /**
   * Dynamically apply or update tracking scripts in DOM when settings change
   */
  public applySettingsUpdate(settings: TrackingSettings) {
    if (typeof window === 'undefined') return;
    this.activeSettings = settings;

    // Ensure dataLayer exists
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
      window.gtag = function (...args: any[]) {
        window.dataLayer!.push(args);
      };
    }

    const { gtm, ga4, metaPixel } = settings;

    // 1. Google Tag Manager (GTM)
    if (gtm.enabled && gtm.containerId) {
      try {
        const currentGtmId = window.__KSF_CURRENT_GTM_ID__;
        const gtmScript = document.querySelector('script[src*="googletagmanager.com/gtm.js"]') as HTMLScriptElement | null;
        
        if (!gtmScript || currentGtmId !== gtm.containerId) {
          if (gtmScript && gtmScript.parentNode) {
            gtmScript.parentNode.removeChild(gtmScript);
          }
          const script = document.createElement('script');
          script.async = true;
          script.src = `https://www.googletagmanager.com/gtm.js?id=${gtm.containerId}`;
          document.head.appendChild(script);
          window.__KSF_CURRENT_GTM_ID__ = gtm.containerId;
          logDebug('GTM Container Applied', { containerId: gtm.containerId });

          // Also update or insert noscript iframe
          let noscript = document.querySelector('noscript iframe[src*="googletagmanager.com/ns.html"]') as HTMLIFrameElement | null;
          if (noscript) {
            noscript.src = `https://www.googletagmanager.com/ns.html?id=${gtm.containerId}`;
          }
        }
      } catch (err) {
        console.warn('[Analytics] GTM script injection notice:', err);
      }
    }

    // 2. Google Analytics 4 (GA4)
    if (ga4.enabled && ga4.measurementId && !/^G-X+$/i.test(ga4.measurementId)) {
      try {
        const currentGa4Id = window.__KSF_CURRENT_GA4_ID__;
        if (currentGa4Id !== ga4.measurementId) {
          window.gtag('js', new Date());
          window.gtag('config', ga4.measurementId, {
            send_page_view: false,
            currency: 'BDT',
          });

          let gtagScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${ga4.measurementId}"]`);
          if (!gtagScript) {
            const script = document.createElement('script');
            script.async = true;
            script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4.measurementId}`;
            document.head.appendChild(script);
          }
          window.__KSF_CURRENT_GA4_ID__ = ga4.measurementId;
          logDebug('GA4 Measurement Applied', { measurementId: ga4.measurementId });
        }
      } catch (err) {
        console.warn('[Analytics] GA4 dynamic init notice:', err);
      }
    }

    // 3. Meta Pixel
    if (metaPixel.enabled && metaPixel.pixelId) {
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
          const firstScript = document.getElementsByTagName('script')[0];
          if (firstScript && firstScript.parentNode) {
            firstScript.parentNode.insertBefore(script, firstScript);
          } else {
            document.head.appendChild(script);
          }
        }

        const currentPixelId = window.__KSF_CURRENT_PIXEL_ID__;
        if (currentPixelId !== metaPixel.pixelId && typeof window.fbq === 'function') {
          window.fbq('init', metaPixel.pixelId);
          window.__KSF_CURRENT_PIXEL_ID__ = metaPixel.pixelId;
          window.__KSF_META_PIXEL_INITIALIZED__ = true;
          logDebug('Meta Pixel Applied', { pixelId: metaPixel.pixelId });
        }
      } catch (err) {
        console.warn('[Analytics] Meta Pixel dynamic init notice:', err);
      }
    }

    // Update global debug object
    window.__KSF_ANALYTICS_DEBUG__ = {
      GTM_ID: settings.gtm.containerId,
      GA4_MEASUREMENT_ID: settings.ga4.measurementId,
      META_PIXEL_ID: settings.metaPixel.pixelId,
      isGa4Configured: Boolean(settings.ga4.enabled && settings.ga4.measurementId),
      source: 'dynamic-firestore',
      gtagScriptRequested: Boolean(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')),
      fbqScriptRequested: Boolean(document.querySelector('script[src*="connect.facebook.net"]')),
      gtmScriptRequested: Boolean(document.querySelector('script[src*="googletagmanager.com/gtm.js"]')),
      settings,
    };
  }

  /**
   * Track SPA Page View
   */
  public trackPageView(pagePath: string, pageTitle?: string) {
    this.init();
    const title = pageTitle || document.title;
    logDebug('PageView', { path: pagePath, title });

    // GA4 / GTM
    if (this.activeSettings.ga4.enabled || this.activeSettings.gtm.enabled) {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
          page_path: pagePath,
          page_title: title,
          page_location: window.location.href,
        });
      }
    }

    // Meta Pixel
    if (this.activeSettings.metaPixel.enabled) {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
      }
    }

    // Pinterest Tag
    trackPinterestEvent('pagevisit');
  }

  /**
   * Track Search Event (GA4: search & Meta: Search)
   */
  public trackSearch(searchTerm: string) {
    if (!searchTerm?.trim()) return;
    this.init();
    const term = searchTerm.trim();
    logDebug('search / Search', { search_term: term });

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'search', { search_term: term });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('track', 'Search', { search_string: term });
    }
  }
  public search = this.trackSearch.bind(this);

  /**
   * Track View Item List (Catalog / Category page)
   */
  public trackViewItemList(items: Product[], listName: string = 'Store Catalog', listId?: string) {
    if (!items || items.length === 0) return;
    this.init();
    const formattedItems = items.slice(0, 20).map((prod, index) => ({
      item_id: prod.id,
      item_name: prod.name,
      item_brand: prod.brand,
      item_category: prod.category,
      price: prod.discountPrice || prod.price,
      index: index + 1,
      item_list_name: listName,
      item_list_id: listId || listName.toLowerCase().replace(/\s+/g, '_'),
    }));

    logDebug('view_item_list', { listName, count: items.length });

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'view_item_list', {
        item_list_id: listId || listName.toLowerCase().replace(/\s+/g, '_'),
        item_list_name: listName,
        items: formattedItems,
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'ViewItemList', {
        content_category: listName,
        content_ids: items.slice(0, 20).map(p => p.id),
        num_items: items.length,
      });
    }
  }
  public view_item_list = this.trackViewItemList.bind(this);

  /**
   * Track Select Item (Product clicked in category/search/catalog list)
   */
  public trackSelectItem(product: Product, listName: string = 'Store Catalog', listId?: string) {
    if (!product?.id) return;
    this.init();
    const item = {
      item_id: product.id,
      item_name: product.name,
      item_brand: product.brand,
      item_category: product.category,
      price: product.discountPrice || product.price,
      item_list_name: listName,
      item_list_id: listId || listName.toLowerCase().replace(/\s+/g, '_'),
    };

    logDebug('select_item', item);

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'select_item', {
        item_list_id: listId || listName.toLowerCase().replace(/\s+/g, '_'),
        item_list_name: listName,
        items: [item],
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'SelectItem', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        content_type: 'product',
        value: product.discountPrice || product.price,
        currency: 'BDT',
      });
    }
  }
  public select_item = this.trackSelectItem.bind(this);

  /**
   * Track Product Detail View (GA4: view_item & Meta: ViewContent)
   */
  public trackViewItem(product: Product) {
    if (!product?.id) return;
    this.init();
    const price = product.discountPrice || product.price;

    logDebug('view_item / ViewContent', { id: product.id, name: product.name, price });

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'view_item', {
        currency: 'BDT',
        value: price,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_brand: product.brand,
          item_category: product.category,
          price: price,
          quantity: 1,
        }],
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        content_type: 'product',
        value: price,
        currency: 'BDT',
      });
    }
  }
  public view_item = this.trackViewItem.bind(this);

  /**
   * Track Add To Cart (GA4: add_to_cart & Meta: AddToCart)
   */
  public trackAddToCart(product: Product, quantity: number = 1) {
    if (!product?.id) return;
    this.init();
    const price = product.discountPrice || product.price;
    const totalValue = price * quantity;

    logDebug('add_to_cart / AddToCart', { id: product.id, quantity, totalValue });

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'add_to_cart', {
        currency: 'BDT',
        value: totalValue,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_brand: product.brand,
          item_category: product.category,
          price: price,
          quantity: quantity,
        }],
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('track', 'AddToCart', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        content_type: 'product',
        value: totalValue,
        currency: 'BDT',
      });
    }

    // Pinterest Tag AddToCart
    trackPinterestEvent('addtocart', {
      value: totalValue,
      order_quantity: quantity,
      currency: 'BDT',
      line_items: [{
        product_id: product.id,
        product_name: product.name,
        product_category: product.category,
        product_price: price,
        product_quantity: quantity,
      }],
    });
  }
  public add_to_cart = this.trackAddToCart.bind(this);

  /**
   * Track Remove From Cart
   */
  public trackRemoveFromCart(product: Product, quantity: number = 1) {
    if (!product?.id) return;
    this.init();
    const price = product.discountPrice || product.price;
    const totalValue = price * quantity;

    logDebug('remove_from_cart', { id: product.id, quantity, totalValue });

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'remove_from_cart', {
        currency: 'BDT',
        value: totalValue,
        items: [{
          item_id: product.id,
          item_name: product.name,
          item_brand: product.brand,
          item_category: product.category,
          price: price,
          quantity: quantity,
        }],
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'RemoveFromCart', {
        content_name: product.name,
        content_category: product.category,
        content_ids: [product.id],
        content_type: 'product',
        value: totalValue,
        currency: 'BDT',
      });
    }
  }
  public remove_from_cart = this.trackRemoveFromCart.bind(this);

  /**
   * Track View Cart
   */
  public trackViewCart(items: { product: Product; quantity: number }[], subtotal: number) {
    if (!items || items.length === 0) return;
    this.init();

    logDebug('view_cart', { itemCount: items.length, subtotal });

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'view_cart', {
        currency: 'BDT',
        value: subtotal,
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          item_brand: i.product.brand,
          item_category: i.product.category,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity,
        })),
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'ViewCart', {
        content_ids: items.map(i => i.product.id),
        num_items: items.reduce((sum, i) => sum + i.quantity, 0),
        value: subtotal,
        currency: 'BDT',
      });
    }
  }
  public view_cart = this.trackViewCart.bind(this);

  /**
   * Track Begin Checkout
   */
  public trackBeginCheckout(items: { product: Product; quantity: number }[], totalValue: number) {
    if (!items || items.length === 0) return;
    this.init();

    logDebug('begin_checkout / InitiateCheckout', { itemCount: items.length, totalValue });

    const contentIds = items.map(i => i.product.id);
    const numItems = items.reduce((sum, i) => sum + i.quantity, 0);

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'begin_checkout', {
        currency: 'BDT',
        value: totalValue,
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          item_brand: i.product.brand,
          item_category: i.product.category,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity,
        })),
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        content_ids: contentIds,
        content_type: 'product',
        num_items: numItems,
        value: totalValue,
        currency: 'BDT',
      });
    }
  }
  public begin_checkout = this.trackBeginCheckout.bind(this);

  /**
   * Track Add Shipping Info
   */
  public trackAddShippingInfo(shippingTier: 'dhaka' | 'outside', shippingFee: number, items: { product: Product; quantity: number }[], totalValue: number) {
    this.init();
    logDebug('add_shipping_info', { shippingTier, shippingFee, totalValue });

    const shippingTierLabel = shippingTier === 'dhaka' ? 'Inside Dhaka (৳80)' : 'Outside Dhaka (৳150)';

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'add_shipping_info', {
        currency: 'BDT',
        value: totalValue,
        shipping_tier: shippingTierLabel,
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          item_brand: i.product.brand,
          item_category: i.product.category,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity,
        })),
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'AddShippingInfo', {
        shipping_tier: shippingTierLabel,
        shipping_fee: shippingFee,
        value: totalValue,
        currency: 'BDT',
      });
    }
  }
  public add_shipping_info = this.trackAddShippingInfo.bind(this);

  /**
   * Track Add Payment Info
   */
  public trackAddPaymentInfo(paymentType: string, items: { product: Product; quantity: number }[], totalValue: number) {
    this.init();
    logDebug('add_payment_info / AddPaymentInfo', { paymentType, totalValue });

    const contentIds = items.map(i => i.product.id);

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'add_payment_info', {
        currency: 'BDT',
        value: totalValue,
        payment_type: paymentType,
        items: items.map(i => ({
          item_id: i.product.id,
          item_name: i.product.name,
          item_brand: i.product.brand,
          item_category: i.product.category,
          price: i.product.discountPrice || i.product.price,
          quantity: i.quantity,
        })),
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('track', 'AddPaymentInfo', {
        content_category: paymentType,
        content_ids: contentIds,
        content_type: 'product',
        value: totalValue,
        currency: 'BDT',
      });
    }
  }
  public add_payment_info = this.trackAddPaymentInfo.bind(this);

  /**
   * Authoritative Purchase Tracking with Deduplication and CAPI Dispatch
   * Only website orders (order_source === 'WEBSITE') trigger purchase tracking.
   */
  public async trackPurchase(order: Order): Promise<void> {
    if (!order || !order.id) return;
    this.init();

    // Strict Allow-List: ONLY website orders (order_source === 'WEBSITE') may generate purchase tracking.
    if (order.order_source !== 'WEBSITE') {
      logDebug('Non-website Order Skipped from Website Conversion Tracking (Allow-list Enforced)', {
        orderId: order.id,
        orderSource: order.order_source,
      });
      return;
    }

    // Deterministic unique event_id for Meta browser & server deduplication
    const eventId = `purchase_${order.id}`;

    // Persistent Idempotency check
    if (dispatchedEventIds.has(eventId) || (order as any).analytics?.purchaseTracked === true) {
      logDebug('Purchase Event Already Dispatched (Persistent Idempotency Enforced)', { eventId });
      return;
    }

    recordDispatchedEvent(eventId);

    const grandTotal = Number(order.totalAmount || 0);
    const contentIds = (order.items || []).map(item => item.productId);
    const numItems = (order.items || []).reduce((sum, it) => sum + (it.quantity || 1), 0);

    const formattedGaItems = (order.items || []).map(item => {
      const prod = productService.getProductById(item.productId);
      return {
        item_id: item.productId,
        item_name: item.name,
        item_brand: prod?.brand || 'Korean Skin Food',
        item_category: prod?.category || 'Skincare',
        price: item.price,
        quantity: item.quantity,
      };
    });

    logDebug('purchase / Purchase', {
      orderId: order.id,
      eventId,
      grandTotal,
      itemsCount: formattedGaItems.length,
    });

    // 1. Dispatch GA4 Purchase
    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      try {
        window.gtag('event', 'purchase', {
          transaction_id: order.id,
          value: grandTotal,
          currency: 'BDT',
          discount: order.discountAmount || 0,
          points_redeemed: order.pointsRedeemed || 0,
          items: formattedGaItems,
        });
      } catch (gaErr) {
        console.warn('[Analytics] GA4 purchase error:', gaErr);
      }
    }

    // 2. Dispatch Meta Pixel Purchase with matching eventID for deduplication
    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
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
            order_id: order.id,
          },
          {
            eventID: eventId,
          }
        );
      } catch (metaErr) {
        console.warn('[Analytics] Meta Pixel purchase error:', metaErr);
      }
    }

    // 3. Dispatch Server-Side Meta Conversions API (CAPI) if enabled
    if (this.activeSettings.metaCapi.enabled) {
      try {
        const attribution = getStoredAttribution();
        const hashedEmail = order.customerEmail ? await sha256(order.customerEmail) : undefined;
        const hashedPhone = order.customerPhone ? await sha256(normalizePhone(order.customerPhone)) : undefined;

        const capiPayload = {
          eventName: 'Purchase',
          eventId: eventId,
          orderId: order.id,
          order_source: order.order_source,
          value: grandTotal,
          currency: 'BDT',
          test_event_code: this.activeSettings.metaCapi.testEventCode || undefined,
          items: (order.items || []).map(i => ({
            productId: i.productId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          customerData: {
            em: hashedEmail,
            ph: hashedPhone,
            fbp: attribution.fbp,
            fbc: attribution.fbc,
            clientUserAgent: navigator.userAgent,
          },
          attribution: {
            ...attribution,
            order_id: order.id,
          },
        };

        // Call Firebase Cloud Function trackMetaCapiEvent or fallback to Express server
        const callMetaCapi = httpsCallable(functions, 'trackMetaCapiEvent');
        callMetaCapi(capiPayload)
          .then((res: any) => {
            logDebug('Meta CAPI Cloud Function Response', res.data);
          })
          .catch((funcErr: any) => {
            logDebug('Meta CAPI Callable Notice (Attempting proxy fallback):', funcErr.message);
            fetch('/api/tracking/meta-capi', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(capiPayload),
            })
              .then(res => res.json())
              .then(data => logDebug('Meta CAPI Fallback Response', data))
              .catch(err => logDebug('Meta CAPI dispatch notice', err?.message || err));
          });
      } catch (capiErr: any) {
        logDebug('CAPI prep notice', capiErr?.message || capiErr);
      }
    }

    // 4. Dispatch Pinterest Tag Checkout
    trackPinterestEvent('checkout', {
      value: grandTotal,
      order_quantity: numItems,
      currency: 'BDT',
      order_id: order.id,
      line_items: (order.items || []).map(i => ({
        product_id: i.productId,
        product_name: i.name,
        product_price: i.price,
        product_quantity: i.quantity,
      })),
    });
  }
  public purchase = this.trackPurchase.bind(this);

  /**
   * Track Refund
   */
  public trackRefund(order: Order) {
    if (!order || !order.id) return;
    this.init();
    logDebug('refund / Refund', { orderId: order.id, totalAmount: order.totalAmount });

    if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
      window.gtag('event', 'refund', {
        transaction_id: order.id,
        value: order.totalAmount,
        currency: 'BDT',
        items: (order.items || []).map(i => {
          const prod = productService.getProductById(i.productId);
          return {
            item_id: i.productId,
            item_name: i.name,
            item_brand: prod?.brand || 'Korean Skin Food',
            item_category: prod?.category || 'Skincare',
            price: i.price,
            quantity: i.quantity,
          };
        }),
      });
    }

    if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
      window.fbq('trackCustom', 'Refund', {
        order_id: order.id,
        value: order.totalAmount,
        currency: 'BDT',
        content_type: 'product',
        content_ids: (order.items || []).map(i => i.productId),
      });
    }
  }
  public refund = this.trackRefund.bind(this);

  /**
   * Get Authoritative Diagnostics & Health Info for Admin Health Center
   */
  public getHealthStatus() {
    this.init();
    const isBrowser = typeof window !== 'undefined';
    const isGtagFunction = isBrowser && typeof window.gtag === 'function';
    const isFbqFunction = isBrowser && typeof window.fbq === 'function' && Boolean((window.fbq as any)?.loaded);
    const dataLayerArr = isBrowser ? window.dataLayer : null;
    const isDataLayerActive = Array.isArray(dataLayerArr);

    const gtmScriptInDom = isBrowser ? Boolean(document.querySelector('script[src*="googletagmanager.com/gtm.js"]')) : false;
    const gtagScriptInDom = isBrowser ? Boolean(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) : false;
    const fbqScriptInDom = isBrowser ? Boolean(document.querySelector('script[src*="connect.facebook.net"]')) : false;
    const noscriptInDom = isBrowser ? Boolean(document.querySelector('iframe[src*="googletagmanager.com/ns.html"]')) : false;

    return {
      ga4: {
        id: this.activeSettings.ga4.measurementId,
        enabled: this.activeSettings.ga4.enabled,
        isConfigured: Boolean(this.activeSettings.ga4.enabled && this.activeSettings.ga4.measurementId),
        source: 'dynamic-firestore',
        loaded: isGtagFunction,
        scriptFound: gtagScriptInDom,
      },
      gtm: {
        id: this.activeSettings.gtm.containerId,
        enabled: this.activeSettings.gtm.enabled,
        loaded: gtmScriptInDom,
        isDataLayerActive,
        dataLayerLength: dataLayerArr?.length || 0,
        scriptFound: gtmScriptInDom,
        noscriptFound: noscriptInDom,
      },
      metaPixel: {
        id: this.activeSettings.metaPixel.pixelId,
        enabled: this.activeSettings.metaPixel.enabled,
        source: 'dynamic-firestore',
        loaded: isFbqFunction,
        scriptFound: fbqScriptInDom,
      },
      metaCapi: {
        enabled: this.activeSettings.metaCapi.enabled,
        testEventCode: this.activeSettings.metaCapi.testEventCode || '',
        hasToken: Boolean(this.activeSettings.metaCapi.accessToken),
      },
      environment: {
        isDev: IS_DEV,
        origin: isBrowser ? window.location.origin : '',
        dispatchedEventsCount: dispatchedEventIds.size,
      },
    };
  }

  /**
   * Send Test Event for Admin Diagnostics & Verification
   */
  public async sendTestSimulation(
    eventType: 'page_view' | 'view_item' | 'add_to_cart' | 'purchase',
    options?: { testEventCode?: string }
  ): Promise<{
    success: boolean;
    eventType: string;
    eventId: string;
    timestamp: string;
    destinations: string[];
    payload: any;
  }> {
    this.init();
    const eventId = `test_${eventType}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const destinations: string[] = [];

    const dummyProduct: Product = {
      id: 'prod-test-analytics-99',
      name: 'Advanced Snail 96 Mucin Power Essence (Test)',
      nameBN: 'অ্যাডভান্সড স্নেল মিউসিন এসেন্স',
      brand: 'COSRX',
      category: 'Essence & Serums',
      skinTypes: ['All Skin Types'],
      price: 1850,
      discountPrice: 1650,
      stock: 45,
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
      images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80'],
      description: 'Test product for Analytics & Tracking Verification',
      descriptionBN: 'অ্যানালিটিক্স টেস্টিং পণ্য',
      rating: 4.9,
      reviewsCount: 120,
      barcode: '8801234567890',
    };

    let payload: any = {};
    const effectiveTestCode = options?.testEventCode || this.activeSettings.metaCapi.testEventCode;

    if (eventType === 'page_view') {
      const pagePath = '/test/analytics-verification';
      const pageTitle = 'Test Analytics Verification | KSF';
      payload = { page_path: pagePath, page_title: pageTitle, test_mode: true };

      if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', payload);
        destinations.push('GA4 (gtag)');
      }
      if (this.activeSettings.gtm.enabled && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: 'page_view', ...payload });
        destinations.push(`GTM (${this.activeSettings.gtm.containerId})`);
      }
      if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
        window.fbq('track', 'PageView');
        destinations.push(`Meta Pixel (${this.activeSettings.metaPixel.pixelId})`);
      }
    } else if (eventType === 'view_item') {
      payload = {
        currency: 'BDT',
        value: 1650,
        test_mode: true,
        items: [{
          item_id: dummyProduct.id,
          item_name: dummyProduct.name,
          item_brand: dummyProduct.brand,
          item_category: dummyProduct.category,
          price: 1650,
          quantity: 1,
        }],
      };

      if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
        window.gtag('event', 'view_item', payload);
        destinations.push('GA4');
      }
      if (this.activeSettings.gtm.enabled && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: 'view_item', ...payload });
        destinations.push(`GTM (${this.activeSettings.gtm.containerId})`);
      }
      if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
        window.fbq('track', 'ViewContent', {
          content_name: dummyProduct.name,
          content_category: dummyProduct.category,
          content_ids: [dummyProduct.id],
          content_type: 'product',
          value: 1650,
          currency: 'BDT',
          test_mode: true,
        });
        destinations.push(`Meta Pixel (${this.activeSettings.metaPixel.pixelId})`);
      }
    } else if (eventType === 'add_to_cart') {
      payload = {
        currency: 'BDT',
        value: 1650,
        test_mode: true,
        items: [{
          item_id: dummyProduct.id,
          item_name: dummyProduct.name,
          item_brand: dummyProduct.brand,
          item_category: dummyProduct.category,
          price: 1650,
          quantity: 1,
        }],
      };

      if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
        window.gtag('event', 'add_to_cart', payload);
        destinations.push('GA4');
      }
      if (this.activeSettings.gtm.enabled && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: 'add_to_cart', ...payload });
        destinations.push(`GTM (${this.activeSettings.gtm.containerId})`);
      }
      if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
        window.fbq('track', 'AddToCart', {
          content_name: dummyProduct.name,
          content_category: dummyProduct.category,
          content_ids: [dummyProduct.id],
          content_type: 'product',
          value: 1650,
          currency: 'BDT',
          test_mode: true,
        });
        destinations.push(`Meta Pixel (${this.activeSettings.metaPixel.pixelId})`);
      }
    } else if (eventType === 'purchase') {
      const dummyOrderId = `TEST-${Date.now().toString().slice(-6)}`;
      payload = {
        transaction_id: dummyOrderId,
        value: 1730,
        currency: 'BDT',
        test_mode: true,
        event_id: eventId,
        test_event_code: effectiveTestCode,
        items: [{
          item_id: dummyProduct.id,
          item_name: dummyProduct.name,
          price: 1650,
          quantity: 1,
        }],
      };

      if (this.activeSettings.ga4.enabled && typeof window.gtag === 'function') {
        window.gtag('event', 'purchase', payload);
        destinations.push('GA4');
      }
      if (this.activeSettings.gtm.enabled && Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: 'purchase', ...payload });
        destinations.push(`GTM (${this.activeSettings.gtm.containerId})`);
      }

      if (this.activeSettings.metaPixel.enabled && typeof window.fbq === 'function') {
        window.fbq(
          'track',
          'Purchase',
          {
            content_ids: [dummyProduct.id],
            content_type: 'product',
            num_items: 1,
            value: 1730,
            currency: 'BDT',
            order_id: dummyOrderId,
            test_mode: true,
          },
          { eventID: eventId }
        );
        destinations.push(`Meta Pixel (${this.activeSettings.metaPixel.pixelId})`);
      }

      // Server-side CAPI simulation
      if (this.activeSettings.metaCapi.enabled) {
        try {
          const capiRes = await fetch('/api/tracking/meta-capi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventName: 'Purchase',
              eventId: eventId,
              orderId: dummyOrderId,
              order_source: 'WEBSITE',
              value: 1730,
              currency: 'BDT',
              test_event_code: effectiveTestCode,
              customerData: {
                em: 'test.admin@koreanskinfoodbd.com',
                ph: '8801700000000',
                clientUserAgent: navigator.userAgent,
              },
              items: [{
                productId: dummyProduct.id,
                name: dummyProduct.name,
                price: 1650,
                quantity: 1,
              }],
            }),
          });
          if (capiRes.ok) {
            destinations.push('Meta CAPI (Server)');
          }
        } catch (e) {
          console.warn('[Analytics Test] CAPI simulation notice:', e);
        }
      }
    }

    return {
      success: true,
      eventType,
      eventId,
      timestamp,
      destinations,
      payload,
    };
  }
}

export const analytics = new AnalyticsService();
