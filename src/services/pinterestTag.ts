import { pinterestService } from './pinterestService';

declare global {
  interface Window {
    pintrk?: (...args: any[]) => void;
  }
}

let isInitialized = false;
let currentLoadedTagId = '';

/**
 * Initializes the Pinterest Tag SDK dynamically based on Firestore settings.
 */
export function initPinterestTag() {
  if (typeof window === 'undefined') return;

  pinterestService.subscribe((settings) => {
    const { enabled, tagId, enhancedMatch } = settings.tag;

    if (!enabled || !tagId) {
      return;
    }

    if (isInitialized && currentLoadedTagId === tagId) {
      return;
    }

    try {
      // Setup pintrk stub if not present
      if (!window.pintrk) {
        const pintrk: any = function () {
          pintrk.queue.push(Array.prototype.slice.call(arguments));
        };
        pintrk.queue = [];
        pintrk.version = '3.0';
        window.pintrk = pintrk;

        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://s.pinimg.com/ct/core.js';
        const firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(script, firstScript);
        } else {
          document.head.appendChild(script);
        }
      }

      // Load Pinterest Tag
      window.pintrk('load', tagId.trim(), {
        np: 'koreanskinfoodbd',
      });
      window.pintrk('page');

      isInitialized = true;
      currentLoadedTagId = tagId.trim();
      console.log(`[Pinterest Tag] Initialized with Tag ID: ${currentLoadedTagId}`);
    } catch (err) {
      console.warn('[Pinterest Tag] Initialization error:', err);
    }
  });
}

/**
 * Dispatches a Pinterest Tag event safely.
 */
export function trackPinterestEvent(
  eventName: 'pagevisit' | 'viewcategory' | 'addtocart' | 'checkout' | 'search' | 'lead' | 'custom',
  data?: Record<string, any>
) {
  if (typeof window === 'undefined') return;

  const settings = pinterestService.getCurrentSettings();
  if (!settings.tag.enabled || !settings.tag.tagId) {
    return;
  }

  try {
    if (typeof window.pintrk === 'function') {
      window.pintrk('track', eventName, data || {});
      console.log(`[Pinterest Tag] Tracked event: ${eventName}`, data);
    }
  } catch (err) {
    console.warn(`[Pinterest Tag] Failed to track ${eventName}:`, err);
  }
}
