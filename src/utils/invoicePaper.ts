import { Order, WholesaleOrder } from '../types';
import { InvoicePaperSize, InvoiceThemeSettings } from '../types/theme';

export interface PaperDimensionSpec {
  id: InvoicePaperSize;
  label: string;
  shortLabel: string;
  sizeTag: string;
  widthMm: number;
  heightMm: number;
  isThermal: boolean;
  defaultPreviewWidthPx: number;
}

export const PAPER_SPECS: Record<InvoicePaperSize, PaperDimensionSpec> = {
  a4: {
    id: 'a4',
    label: 'A4 Standard',
    shortLabel: 'A4',
    sizeTag: '210 × 297 mm',
    widthMm: 210,
    heightMm: 297,
    isThermal: false,
    defaultPreviewWidthPx: 680,
  },
  a3: {
    id: 'a3',
    label: 'A3 Large Sheet',
    shortLabel: 'A3',
    sizeTag: '297 × 420 mm',
    widthMm: 297,
    heightMm: 420,
    isThermal: false,
    defaultPreviewWidthPx: 860,
  },
  a5: {
    id: 'a5',
    label: 'A5 Half Page',
    shortLabel: 'A5',
    sizeTag: '148 × 210 mm',
    widthMm: 148,
    heightMm: 210,
    isThermal: false,
    defaultPreviewWidthPx: 500,
  },
  letter: {
    id: 'letter',
    label: 'US Letter',
    shortLabel: 'Letter',
    sizeTag: '215.9 × 279.4 mm',
    widthMm: 215.9,
    heightMm: 279.4,
    isThermal: false,
    defaultPreviewWidthPx: 690,
  },
  thermal_80: {
    id: 'thermal_80',
    label: '80mm Thermal Roll',
    shortLabel: '80mm POS',
    sizeTag: '80 mm Roll',
    widthMm: 80,
    heightMm: 297,
    isThermal: true,
    defaultPreviewWidthPx: 302,
  },
  thermal_58: {
    id: 'thermal_58',
    label: '58mm Thermal Roll',
    shortLabel: '58mm POS',
    sizeTag: '58 mm Roll',
    widthMm: 58,
    heightMm: 297,
    isThermal: true,
    defaultPreviewWidthPx: 224,
  },
};

export interface EffectivePaperMetrics {
  spec: PaperDimensionSpec;
  widthMm: number;
  heightMm: number;
  printableWidthMm: number;
  printableHeightMm: number;
  isThermal: boolean;
  renderWidthPx: number;
  aspectRatio: number;
}

export function getEffectivePaperMetrics(theme: InvoiceThemeSettings): EffectivePaperMetrics {
  const spec = PAPER_SPECS[theme.paperSize] || PAPER_SPECS.a4;
  const isLandscape = !spec.isThermal && theme.orientation === 'landscape';

  const widthMm = isLandscape ? spec.heightMm : spec.widthMm;
  const heightMm = isLandscape ? spec.widthMm : spec.heightMm;

  const marginLeft = spec.isThermal ? Math.min(theme.marginLeftMm, 4) : theme.marginLeftMm;
  const marginRight = spec.isThermal ? Math.min(theme.marginRightMm, 4) : theme.marginRightMm;
  const marginTop = spec.isThermal ? Math.min(theme.marginTopMm, 4) : theme.marginTopMm;
  const marginBottom = spec.isThermal ? Math.min(theme.marginBottomMm, 4) : theme.marginBottomMm;

  const printableWidthMm = Math.max(30, widthMm - marginLeft - marginRight);
  const printableHeightMm = Math.max(60, heightMm - marginTop - marginBottom);

  const renderWidthPx = spec.isThermal
    ? spec.defaultPreviewWidthPx
    : isLandscape
    ? Math.round(spec.defaultPreviewWidthPx * (spec.heightMm / spec.widthMm))
    : spec.defaultPreviewWidthPx;

  return {
    spec,
    widthMm,
    heightMm,
    printableWidthMm,
    printableHeightMm,
    isThermal: spec.isThermal,
    renderWidthPx,
    aspectRatio: widthMm / heightMm,
  };
}

export interface InvoiceAutoScaleResult {
  scale: number;
  isAutoScaled: boolean;
  productsPerPage: number;
  itemCount: number;
  densityMode: 'normal' | 'compact' | 'ultra-compact';
}

/**
 * Computes deterministic single-page scaling factor whenever item count
 * exceeds the admin's `productsPerPage` threshold (and autoScaleToFit is enabled).
 */
export function computeInvoiceAutoScale(
  itemCount: number,
  theme: InvoiceThemeSettings
): InvoiceAutoScaleResult {
  const productsPerPage = Math.max(1, Number(theme.productsPerPage || 10));
  const safeItemCount = Math.max(0, Number(itemCount || 0));

  if (!theme.autoScaleToFit || safeItemCount <= productsPerPage) {
    return {
      scale: 1,
      isAutoScaled: false,
      productsPerPage,
      itemCount: safeItemCount,
      densityMode: 'normal',
    };
  }

  const minFloor = Math.max(0.45, Math.min(0.95, Number(theme.minAutoScalePercent || 55) / 100));
  const ratio = productsPerPage / safeItemCount;
  // Smooth curve so slight overages gently tighten while large carts compress down to minFloor
  const rawScale = Math.pow(ratio, 0.72);
  const clampedScale = Math.max(minFloor, Math.min(0.96, rawScale));

  const densityMode =
    clampedScale <= 0.68 ? 'ultra-compact' : clampedScale <= 0.86 ? 'compact' : 'normal';

  return {
    scale: Number(clampedScale.toFixed(3)),
    isAutoScaled: true,
    productsPerPage,
    itemCount: safeItemCount,
    densityMode,
  };
}

/**
 * Converts a B2B WholesaleOrder into the unified Order interface so all
 * customer/admin wholesale invoices render through the customized InvoiceDocument & PDF engine.
 */
export function wholesaleOrderToOrder(wo: WholesaleOrder): Order {
  const deliveryName =
    (wo.checkoutInfo as any)?.deliveryName ||
    wo.customer?.businessName ||
    wo.customer?.customerName ||
    'Wholesale Partner';
  const deliveryPhone =
    (wo.checkoutInfo as any)?.deliveryPhone ||
    wo.customer?.contactNumber ||
    'N/A';
  const deliveryAddress =
    (wo.checkoutInfo as any)?.deliveryAddress ||
    ((wo.checkoutInfo as any)?.parcelId
      ? `Parcel ID: ${(wo.checkoutInfo as any).parcelId} · Velouria ID: ${(wo.checkoutInfo as any).velouriaId || 'N/A'}`
      : wo.customer?.businessName || 'Wholesale Dispatch');

  const mappedPaymentStatus =
    wo.paymentStatus === 'paid'
      ? 'PAID'
      : wo.paymentStatus === 'partial'
      ? 'PARTIALLY_PAID'
      : 'UNPAID';

  const mappedOrderStatus =
    wo.status === 'confirmed' || wo.status === 'ready' ? 'processing' : wo.status;

  return {
    id: wo.orderNumber || wo.id,
    customerName: wo.customer?.businessName
      ? `${deliveryName} (${wo.customer.businessName})`
      : deliveryName,
    customerPhone: deliveryPhone,
    customer_uid: wo.customer?.userId,
    address: deliveryAddress,
    items: (wo.items || []).map((item) => ({
      productId: item.productId,
      name: item.productName,
      price: Number(item.wholesaleUnitPrice || 0),
      quantity: Number(item.quantity || 1),
      barcode: item.barcode,
      sku: item.sku,
      pricingType: 'wholesale',
      pricingTier:
        item.wholesaleTier === '50+' || item.wholesaleTier === 'tier50_plus'
          ? '50+ Units'
          : '1-49 Units',
    })),
    totalAmount: Number(wo.finalAmount ?? wo.totalWholesaleCost ?? 0),
    shippingCharge: Number(wo.deliveryCharge || 0),
    discountAmount: Math.max(
      0,
      Number(wo.totalWholesaleCost || 0) +
        Number(wo.deliveryCharge || 0) -
        Number(wo.finalAmount ?? wo.totalWholesaleCost ?? 0)
    ),
    status: mappedOrderStatus as Order['status'],
    order_source: 'WHOLESALE',
    stock_deducted: Boolean(wo.stock_deducted ?? wo.stockDeducted ?? true),
    createdAt: wo.createdAt,
    paymentMethod: 'BANK_TRANSFER',
    sessionType: 'Online',
    isPaid: wo.paymentStatus === 'paid' || Number(wo.dueAmount || 0) <= 0,
    paymentStatus: mappedPaymentStatus,
    totalPaid: Number(wo.paidAmount || 0),
    dueAmount: Number(wo.dueAmount || 0),
    notes: wo.notes || wo.checkoutInfo?.orderNote,
  };
}
