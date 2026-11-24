import html2canvas from 'html2canvas';

type Html2CanvasOptions = NonNullable<Parameters<typeof html2canvas>[1]>;

const UNSUPPORTED_COLOR_FN_RE = /(oklch|oklab|color-mix|lch|lab)\s*\(/i;

let probeCanvas: HTMLCanvasElement | null = null;
let probeCtx: CanvasRenderingContext2D | null = null;
const colorCache = new Map<string, string>();

function getProbeCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!probeCanvas) {
    probeCanvas = document.createElement('canvas');
    probeCanvas.width = 1;
    probeCanvas.height = 1;
    probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
  }
  return probeCtx;
}

/**
 * Converts any browser-supported CSS color string (including oklch, oklab, color-mix)
 * into a safe rgba(...) / rgb(...) literal that html2canvas v1 CSS parser supports.
 */
export function cssColorToRgba(rawColor: string, fallback = 'rgba(0, 0, 0, 0)'): string {
  const trimmed = (rawColor || '').trim();
  if (!trimmed || trimmed === 'none' || trimmed === 'transparent') {
    return trimmed === 'transparent' ? 'rgba(0, 0, 0, 0)' : trimmed || fallback;
  }
  if (!UNSUPPORTED_COLOR_FN_RE.test(trimmed)) {
    return trimmed;
  }
  const cached = colorCache.get(trimmed);
  if (cached) return cached;

  const ctx = getProbeCtx();
  if (!ctx) return fallback;

  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillStyle = trimmed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    const result =
      a >= 255
        ? `rgb(${r}, ${g}, ${b})`
        : a <= 0
        ? 'rgba(0, 0, 0, 0)'
        : `rgba(${r}, ${g}, ${b}, ${Number((a / 255).toFixed(3))})`;
    colorCache.set(trimmed, result);
    return result;
  } catch {
    return fallback;
  }
}

/**
 * Replaces oklch(...) / oklab(...) / color-mix(...) expressions inside arbitrary CSS strings
 * (e.g. gradients or inline styles) by matching balanced parentheses.
 */
function replaceUnsupportedColorFunctions(cssValue: string): string {
  if (!cssValue || !UNSUPPORTED_COLOR_FN_RE.test(cssValue)) return cssValue;

  let out = '';
  let i = 0;
  const lower = cssValue.toLowerCase();
  const prefixes = ['oklch(', 'oklab(', 'color-mix(', 'lch(', 'lab('];

  while (i < cssValue.length) {
    let matchedPrefix: string | null = null;
    for (const p of prefixes) {
      if (lower.startsWith(p, i)) {
        matchedPrefix = p;
        break;
      }
    }

    if (!matchedPrefix) {
      out += cssValue[i];
      i += 1;
      continue;
    }

    let depth = 0;
    let end = i;
    while (end < cssValue.length) {
      if (cssValue[end] === '(') depth += 1;
      else if (cssValue[end] === ')') {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
      end += 1;
    }

    const fnExpr = cssValue.slice(i, end);
    out += cssColorToRgba(fnExpr, 'rgb(17, 24, 39)');
    i = end;
  }

  return out;
}

const COMPUTED_STYLE_PROPS: Array<keyof CSSStyleDeclaration> = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'boxSizing',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'flexDirection',
  'flexWrap',
  'justifyContent',
  'alignItems',
  'alignContent',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'gap',
  'rowGap',
  'columnGap',
  'gridTemplateColumns',
  'gridTemplateRows',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'textTransform',
  'textDecorationLine',
  'whiteSpace',
  'overflowWrap',
  'wordBreak',
  'verticalAlign',
  'color',
  'backgroundColor',
  'backgroundImage',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'borderTopStyle',
  'borderRightStyle',
  'borderBottomStyle',
  'borderLeftStyle',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'borderCollapse',
  'borderSpacing',
  'opacity',
  'overflow',
  'overflowX',
  'overflowY',
  'objectFit',
  'boxShadow',
  'outlineColor',
  'textDecorationColor',
  'webkitTextStrokeColor',
];

const COLOR_SENSITIVE_PROPS = new Set<string>([
  'color',
  'backgroundColor',
  'backgroundImage',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'boxShadow',
  'outlineColor',
  'textDecorationColor',
  'webkitTextStrokeColor',
]);

function isHtmlNode(node: Element): node is HTMLElement {
  return node.nodeType === 1 && node.namespaceURI === 'http://www.w3.org/1999/xhtml';
}

function collectLiveElements(root: HTMLElement): HTMLElement[] {
  const list: HTMLElement[] = [root];
  const stack: HTMLElement[] = [root];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    for (let i = curr.children.length - 1; i >= 0; i -= 1) {
      const child = curr.children[i];
      if (isHtmlNode(child)) {
        list.push(child);
        stack.push(child);
      }
    }
  }
  return list;
}

function snapshotComputedStyles(root: HTMLElement): Array<Record<string, string>> {
  const elements = collectLiveElements(root);
  return elements.map((node) => {
    const cs = window.getComputedStyle(node);
    const snap: Record<string, string> = {};
    for (const prop of COMPUTED_STYLE_PROPS) {
      const raw = cs[prop];
      if (typeof raw === 'string' && raw.length > 0) {
        const key = String(prop);
        snap[key] = COLOR_SENSITIVE_PROPS.has(key)
          ? replaceUnsupportedColorFunctions(raw)
          : raw;
      }
    }
    return snap;
  });
}

function sanitizeInlineElementTree(clonedRoot: HTMLElement): void {
  const nodes: Element[] = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll('*'))];
  for (const node of nodes) {
    const el = node as HTMLElement | SVGElement;
    if (el.style) {
      // Iterate every explicit inline property (catches SVG copyCSSStyles + CSS custom vars)
      for (let i = el.style.length - 1; i >= 0; i -= 1) {
        const prop = el.style.item(i);
        if (!prop) continue;
        if (prop.startsWith('--')) {
          el.style.removeProperty(prop);
          continue;
        }
        const val = el.style.getPropertyValue(prop);
        if (val && UNSUPPORTED_COLOR_FN_RE.test(val)) {
          const priority = el.style.getPropertyPriority(prop);
          el.style.setProperty(prop, replaceUnsupportedColorFunctions(val), priority);
        }
      }
      if (el.style.cssText && UNSUPPORTED_COLOR_FN_RE.test(el.style.cssText)) {
        el.style.cssText = replaceUnsupportedColorFunctions(el.style.cssText);
      }
    }
    if (node.namespaceURI === 'http://www.w3.org/2000/svg') {
      for (const attr of ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color']) {
        const val = node.getAttribute(attr);
        if (val && UNSUPPORTED_COLOR_FN_RE.test(val)) {
          node.setAttribute(attr, cssColorToRgba(val));
        }
      }
    }
  }
}

function stripTailwindAndInjectBaseReset(clonedDoc: Document): void {
  // Clear constructed adoptedStyleSheets if any
  try {
    if ('adoptedStyleSheets' in clonedDoc) {
      (clonedDoc as Document & { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets = [];
    }
  } catch {}

  // Disable & remove Tailwind v4 <style> tags and external CSS links (except Google Fonts)
  // so html2canvas never parses oklch(...) or color-mix(in oklab, ...) rules.
  const styles = Array.from(clonedDoc.querySelectorAll('style'));
  for (const s of styles) {
    try {
      if (s.sheet) s.sheet.disabled = true;
    } catch {}
    s.parentNode?.removeChild(s);
  }

  const links = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (!href.includes('fonts.googleapis.com')) {
      try {
        if ((link as HTMLLinkElement).sheet) {
          (link as HTMLLinkElement).sheet!.disabled = true;
        }
      } catch {}
      link.parentNode?.removeChild(link);
    }
  }

  const resetStyle = clonedDoc.createElement('style');
  resetStyle.textContent = `
    *, *::before, *::after {
      box-sizing: border-box;
      border-color: #e5e7eb;
      outline-color: #111827;
      text-decoration-color: #111827;
    }
    html, body {
      margin: 0;
      padding: 0;
      color-scheme: light;
      background-color: #ffffff;
      color: #111827;
    }
    table {
      border-collapse: collapse;
    }
    p, h1, h2, h3, h4 {
      margin: 0;
    }
  `;
  clonedDoc.head.appendChild(resetStyle);

  for (const rootEl of [clonedDoc.documentElement, clonedDoc.body]) {
    if (rootEl && rootEl.style && rootEl.style.cssText && UNSUPPORTED_COLOR_FN_RE.test(rootEl.style.cssText)) {
      rootEl.style.cssText = replaceUnsupportedColorFunctions(rootEl.style.cssText);
    }
  }
}

/**
 * Renders an element via html2canvas safely by stripping Tailwind v4 oklch()
 * stylesheets in the cloned document before html2canvas parses CSS.
 *
 * - For self-contained inline-styled components (e.g. InvoiceDocument), leave
 *   `preserveComputedStyles` false (fast path).
 * - For Tailwind utility-styled components (e.g. StockReceiptSlip), pass
 *   `preserveComputedStyles: true` to snapshot and inline resolved RGB styles.
 */
export async function renderSafeCanvas(
  element: HTMLElement,
  options: Html2CanvasOptions & { preserveComputedStyles?: boolean } = {}
): Promise<HTMLCanvasElement> {
  const { preserveComputedStyles = false, onclone, ...restOptions } = options;
  const snapshots = preserveComputedStyles ? snapshotComputedStyles(element) : null;

  return html2canvas(element, {
    ...restOptions,
    onclone: (clonedDoc, clonedEl) => {
      stripTailwindAndInjectBaseReset(clonedDoc);

      if (snapshots) {
        const clonedElements = collectLiveElements(clonedEl);
        for (let idx = 0; idx < clonedElements.length; idx += 1) {
          const target = clonedElements[idx];
          const snap = snapshots[idx];
          if (!target || !snap) continue;
          for (const [prop, val] of Object.entries(snap)) {
            if (val !== undefined && val !== '') {
              (target.style as unknown as Record<string, string>)[prop] = val;
            }
          }
        }
      }

      // Always scrub inline styles, CSS variables, and SVG attributes (including SVG copyCSSStyles)
      sanitizeInlineElementTree(clonedEl);

      if (onclone) {
        onclone(clonedDoc, clonedEl);
      }
    },
  });
}
