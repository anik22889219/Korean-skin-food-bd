import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import { Order } from '../types';
import { InvoiceThemeSettings } from '../types/theme';
import { themeService } from '../services/themeService';
import { DEFAULT_INVOICE_LOGO, InvoiceDocument } from '../components/InvoiceDocument';
import { getEffectivePaperMetrics } from './invoicePaper';
import { renderSafeCanvas } from './html2canvasSafe';

async function waitForImagesAndFrames(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 1500);
      });
    })
  );

  if (document.fonts?.ready) {
    await Promise.race([
      document.fonts.ready.catch(() => {}),
      new Promise<void>((r) => setTimeout(r, 800)),
    ]);
  }

  // Always race requestAnimationFrame against a short timeout so hidden/throttled
  // views can never stall PDF generation.
  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    setTimeout(finish, 80);
    requestAnimationFrame(() => requestAnimationFrame(finish));
  });
}

/**
 * Tries to inline a remote logo image as a CORS-safe data URL so html2canvas
 * never taints the exported canvas. Falls back cleanly if the host rejects CORS.
 */
async function ensureCorsSafeImages(container: HTMLElement): Promise<void> {
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!src || src.startsWith('data:') || src.startsWith('blob:')) return;
      try {
        const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(blob);
        });
        if (dataUrl) {
          img.setAttribute('src', dataUrl);
        }
      } catch {
        // Leave original src; canvas taint fallback below handles non-CORS hosts cleanly.
      }
    })
  );
}

/**
 * Renders an off-screen InvoiceDocument inside the visible viewport bounds (opacity 0.01,
 * z-index -9999) so Chromium/Android never throttle layout or animation frames, while
 * `renderSafeCanvas` isolates the clone from Tailwind v4 oklch() stylesheets.
 */
async function withRenderedInvoiceElement<T>(
  order: Order,
  theme: InvoiceThemeSettings,
  callback: (el: HTMLElement) => Promise<T> | T
): Promise<T> {
  const paper = getEffectivePaperMetrics(theme);
  const host = document.createElement('div');
  const tempId = `invoice-render-${order.id}-${Date.now()}`;

  host.setAttribute('aria-hidden', 'true');
  host.style.position = 'fixed';
  host.style.left = '0';
  host.style.top = '0';
  host.style.width = `${paper.renderWidthPx}px`;
  host.style.backgroundColor = theme.backgroundColor || '#ffffff';
  host.style.zIndex = '-9999';
  host.style.opacity = '0.01';
  host.style.pointerEvents = 'none';
  host.style.overflow = 'hidden';
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        React.createElement(InvoiceDocument, {
          order,
          themeOverride: theme,
          idOverride: tempId,
          exactPaperWidth: true,
          className: '',
        })
      );
    });

    await ensureCorsSafeImages(host);
    await waitForImagesAndFrames(host);

    const renderedEl = document.getElementById(tempId) || (host.firstElementChild as HTMLElement);
    return await callback(renderedEl);
  } finally {
    try {
      root.unmount();
    } catch {}
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

async function captureInvoicePngData(
  element: HTMLElement,
  theme: InvoiceThemeSettings,
  renderWidthPx: number,
  isThermal: boolean
): Promise<{ imgData: string; width: number; height: number }> {
  const captureOpts = {
    scale: isThermal ? 3 : 2,
    useCORS: true,
    backgroundColor: theme.backgroundColor || '#ffffff',
    logging: false,
    width: renderWidthPx,
    windowWidth: renderWidthPx + 20,
  };

  let canvas = await renderSafeCanvas(element, captureOpts);
  try {
    const imgData = canvas.toDataURL('image/png');
    if (canvas.width > 0 && canvas.height > 0 && imgData.startsWith('data:image/png')) {
      return { imgData, width: canvas.width, height: canvas.height };
    }
    throw new Error('Captured canvas was empty');
  } catch {
    // If a third-party logo tainted the canvas, swap remote images for the built-in
    // brand SVG data URI and re-capture cleanly so the download never fails.
    const imgs = Array.from(element.querySelectorAll('img'));
    for (const img of imgs) {
      const src = img.getAttribute('src') || '';
      if (src && !src.startsWith('data:')) {
        img.setAttribute('src', DEFAULT_INVOICE_LOGO);
      }
    }
    await waitForImagesAndFrames(element);
    canvas = await renderSafeCanvas(element, captureOpts);
    const imgData = canvas.toDataURL('image/png');
    return { imgData, width: canvas.width, height: canvas.height };
  }
}

function triggerPdfDownload(pdf: jsPDF, fileName: string): void {
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    try {
      document.body.removeChild(link);
    } catch {}
    URL.revokeObjectURL(url);
  }, 4000);
}

/**
 * Downloads a high-resolution PDF for the given order invoice using the configured
 * Invoice Designer paper size, margins, and single-page auto-fit scaling.
 */
export async function downloadInvoicePDF(
  order: Order,
  _elementId?: string,
  themeOverride?: InvoiceThemeSettings
): Promise<boolean> {
  try {
    const activeTheme = themeOverride || themeService.getInvoiceTheme();
    const paper = getEffectivePaperMetrics(activeTheme);

    return await withRenderedInvoiceElement(order, activeTheme, async (element) => {
      const { imgData, width: canvasW, height: canvasH } = await captureInvoicePngData(
        element,
        activeTheme,
        paper.renderWidthPx,
        paper.isThermal
      );

      if (paper.isThermal) {
        const marginX = Math.min(activeTheme.marginLeftMm, 3);
        const marginY = Math.min(activeTheme.marginTopMm, 3);
        const contentW = Math.max(40, paper.widthMm - marginX * 2);
        const contentH = (canvasH * contentW) / canvasW;
        const rollHeightMm = Math.max(80, contentH + marginY * 2);

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [paper.widthMm, rollHeightMm],
        });

        pdf.addImage(imgData, 'PNG', marginX, marginY, contentW, contentH);
        triggerPdfDownload(pdf, `Invoice-${order.id}.pdf`);
        return true;
      }

      // Sheet format (a4, a3, a5, letter)
      const pdf = new jsPDF({
        orientation: activeTheme.orientation || 'portrait',
        unit: 'mm',
        format: activeTheme.paperSize as 'a4' | 'a3' | 'a5' | 'letter',
      });

      const printableW = paper.printableWidthMm;
      const printableH = paper.printableHeightMm;

      if (activeTheme.autoScaleToFit) {
        // Fit entire invoice strictly onto 1 single page
        const fitScale = Math.min(printableW / canvasW, printableH / canvasH);
        const finalW = canvasW * fitScale;
        const finalH = canvasH * fitScale;
        const xOffset = activeTheme.marginLeftMm + Math.max(0, (printableW - finalW) / 2);
        const yOffset = activeTheme.marginTopMm;

        pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalW, finalH);
      } else {
        // Multi-page slice if autoScaleToFit is explicitly disabled
        const imgW = printableW;
        const imgH = (canvasH * imgW) / canvasW;
        let heightLeft = imgH;
        let yPos = activeTheme.marginTopMm;

        pdf.addImage(imgData, 'PNG', activeTheme.marginLeftMm, yPos, imgW, imgH);
        heightLeft -= printableH;

        while (heightLeft > 2) {
          pdf.addPage();
          yPos = activeTheme.marginTopMm - (imgH - heightLeft);
          pdf.addImage(imgData, 'PNG', activeTheme.marginLeftMm, yPos, imgW, imgH);
          heightLeft -= printableH;
        }
      }

      triggerPdfDownload(pdf, `Invoice-${order.id}.pdf`);
      return true;
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

let activePrintCleanup: (() => void) | null = null;

/**
 * Triggers native browser print dialog synchronously via a `@media print` portal
 * formatted precisely to the selected paper size (A4, A3, A5, Letter, 80mm, 58mm)
 * and margins, avoiding blocked/throttled `0x0` iframes on desktop & mobile browsers.
 */
export async function printInvoice(
  order: Order,
  _elementId?: string,
  themeOverride?: InvoiceThemeSettings
): Promise<void> {
  if (activePrintCleanup) {
    activePrintCleanup();
    activePrintCleanup = null;
  }

  const activeTheme = themeOverride || themeService.getInvoiceTheme();
  const paper = getEffectivePaperMetrics(activeTheme);

  const pageSizeCss = paper.isThermal
    ? `${paper.widthMm}mm auto`
    : `${activeTheme.paperSize} ${activeTheme.orientation}`;

  const marginCss = paper.isThermal
    ? `2mm`
    : `${activeTheme.marginTopMm}mm ${activeTheme.marginRightMm}mm ${activeTheme.marginBottomMm}mm ${activeTheme.marginLeftMm}mm`;

  const portal = document.createElement('div');
  portal.id = 'ksf-print-portal';

  const styleEl = document.createElement('style');
  styleEl.id = 'ksf-print-style';
  styleEl.textContent = `
    @media screen {
      #ksf-print-portal {
        display: none !important;
      }
    }
    @media print {
      @page {
        size: ${pageSizeCss};
        margin: ${marginCss};
      }
      html, body {
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: ${activeTheme.backgroundColor || '#ffffff'} !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body > *:not(#ksf-print-portal) {
        display: none !important;
      }
      #ksf-print-portal {
        display: flex !important;
        justify-content: center !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      #ksf-print-portal > div {
        width: 100% !important;
        max-width: 100% !important;
        border: none !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
  `;

  document.head.appendChild(styleEl);
  document.body.appendChild(portal);

  const root = createRoot(portal);
  flushSync(() => {
    root.render(
      React.createElement(InvoiceDocument, {
        order,
        themeOverride: activeTheme,
        idOverride: `invoice-print-${order.id}`,
        exactPaperWidth: true,
        className: '',
      })
    );
  });

  const cleanup = () => {
    window.removeEventListener('afterprint', cleanup);
    clearTimeout(fallbackTimer);
    try {
      root.unmount();
    } catch {}
    if (portal.parentNode) portal.parentNode.removeChild(portal);
    if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    if (activePrintCleanup === cleanup) {
      activePrintCleanup = null;
    }
  };

  activePrintCleanup = cleanup;
  window.addEventListener('afterprint', cleanup, { once: true });
  const fallbackTimer = setTimeout(cleanup, 60000);

  try {
    window.focus();
    window.print();
  } catch (err) {
    console.error('Native window.print blocked, falling back to PDF download:', err);
    cleanup();
    await downloadInvoicePDF(order, undefined, activeTheme);
  }
}
