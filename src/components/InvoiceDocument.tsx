import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Order } from '../types';
import { InvoiceThemeSettings } from '../types/theme';
import { DEFAULT_INVOICE_THEME, themeService } from '../services/themeService';
import { computeInvoiceAutoScale, getEffectivePaperMetrics } from '../utils/invoicePaper';

export interface InvoiceDocumentProps {
  order: Order;
  logoUrl?: string;
  className?: string;
  themeOverride?: InvoiceThemeSettings;
  idOverride?: string;
  exactPaperWidth?: boolean;
}

// Default high-quality circular logo SVG data URI for Korean Skin Food BD
export const DEFAULT_INVOICE_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="48" fill="%23C81E78"/><circle cx="50" cy="50" r="44" fill="%23ffffff" stroke="%23FBEAF0" stroke-width="2"/><text x="50" y="42" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="%23C81E78" text-anchor="middle">K</text><text x="50" y="60" font-family="Arial, sans-serif" font-weight="bold" font-size="11" fill="%23993556" text-anchor="middle">BEAUTY</text><path d="M50 66 Q45 74 50 80 Q55 74 50 66 Z" fill="%23C81E78"/></svg>`;

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  order,
  logoUrl,
  className = '',
  themeOverride,
  idOverride,
  exactPaperWidth = false,
}) => {
  const [subscribedTheme, setSubscribedTheme] = useState<InvoiceThemeSettings>(
    () => themeService.getInvoiceTheme() || DEFAULT_INVOICE_THEME
  );
  const [globalLogoUrl, setGlobalLogoUrl] = useState<string>(
    () => themeService.getGlobalTheme()?.logoUrl || ''
  );
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    if (themeOverride) return;
    const unsubInv = themeService.subscribeInvoice((next) => setSubscribedTheme(next));
    const unsubGlobal = themeService.subscribeGlobal((next) => setGlobalLogoUrl(next.logoUrl || ''));
    return () => {
      unsubInv();
      unsubGlobal();
    };
  }, [themeOverride]);

  const theme = themeOverride || subscribedTheme;

  const rawLogo =
    (logoUrl && logoUrl.trim()) ||
    (theme.logoUrl && theme.logoUrl.trim()) ||
    (globalLogoUrl && globalLogoUrl.trim()) ||
    DEFAULT_INVOICE_LOGO;

  useEffect(() => {
    setLogoFailed(false);
  }, [rawLogo]);

  const effectiveLogo = logoFailed ? DEFAULT_INVOICE_LOGO : rawLogo;
  const paper = getEffectivePaperMetrics(theme);
  const autoScale = computeInvoiceAutoScale(order.items?.length || 0, theme);
  const scale = autoScale.scale;

  // Helpers for scaled typography & spacing
  const sPx = (base: number, min = 6.5) => `${Math.max(min, Number((base * scale).toFixed(2)))}px`;
  const sNum = (base: number, min = 4) => Math.max(min, Math.round(base * scale));

  // Financial calculations
  const subtotal = (order.items || []).reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
    0
  );
  const deliveryFee =
    order.courier?.deliveryFee !== undefined
      ? Number(order.courier.deliveryFee)
      : order.shippingCharge !== undefined
      ? Number(order.shippingCharge)
      : Math.max(0, Number(order.totalAmount || 0) - subtotal);

  const totalDiscount =
    Number(order.discountAmount || 0) +
    Number(order.couponDiscount || 0) +
    Number(order.pointsRedeemed || 0);

  const paidAmount = Number(
    order.totalPaid ?? (order.isPaid ? order.totalAmount : 0)
  );
  const dueAmount =
    order.dueAmount !== undefined
      ? Number(order.dueAmount)
      : Math.max(0, Number(order.totalAmount || 0) - paidAmount);

  const trackingUrl =
    order.courier?.trackingUrl ||
    (order.courier?.trackingCode ? `https://steadfast.com.bd/t/${order.courier.trackingCode}` : '');

  const formattedDate = order.createdAt
    ? new Date(order.createdAt).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const fontStack =
    theme.fontFamily === 'serif'
      ? "'Playfair Display', Georgia, serif"
      : theme.fontFamily === 'mono'
      ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      : "'Hind Siliguri', 'Open Sans', system-ui, -apple-system, sans-serif";

  const logoRadius =
    theme.logoShape === 'circle'
      ? '9999px'
      : theme.logoShape === 'rounded'
      ? '10px'
      : '2px';

  const dividerStyle =
    theme.borderStyle === 'dashed'
      ? 'dashed'
      : 'solid';

  const getStatusBadge = (status: string) => {
    const label = status === 'in_transit' ? 'In Transit' : status;
    const isPositive = status === 'delivered' || status === 'in_transit';
    const isWarn = status === 'pending';
    return (
      <span
        style={{
          fontSize: sPx(9.5, 7),
          padding: `${sNum(2, 1)}px ${sNum(6, 3)}px`,
          borderRadius: '4px',
          fontWeight: 700,
          textTransform: 'uppercase',
          backgroundColor: isPositive ? '#ECFDF5' : isWarn ? '#FFFBEB' : '#FFF1F2',
          color: isPositive ? '#166534' : isWarn ? '#92400E' : '#9F1239',
          border: `1px solid ${isPositive ? '#A7F3D0' : isWarn ? '#FDE68A' : '#FECDD3'}`,
          display: 'inline-block',
        }}
      >
        {label}
      </span>
    );
  };

  const paymentBadgeLabel =
    dueAmount <= 0 || order.isPaid || order.paymentStatus === 'PAID'
      ? 'PAID IN FULL'
      : paidAmount > 0
      ? 'PARTIALLY PAID'
      : 'UNPAID / DUE';

  const paymentBadgeColors =
    dueAmount <= 0 || order.isPaid || order.paymentStatus === 'PAID'
      ? { bg: '#DCFCE7', text: '#166534' }
      : paidAmount > 0
      ? { bg: '#FEF3C7', text: '#92400E' }
      : { bg: '#FFE4E6', text: '#9F1239' };

  const headerBg =
    theme.headerStyle === 'solid'
      ? theme.primaryColor
      : theme.headerStyle === 'tinted'
      ? theme.tableHeaderBgColor
      : theme.backgroundColor;

  const headerPrimaryText =
    theme.headerStyle === 'solid' ? theme.headerTextColor : theme.primaryColor;

  const headerSubText =
    theme.headerStyle === 'solid' ? 'rgba(255,255,255,0.88)' : theme.mutedTextColor;

  const elementId = idOverride || `invoice-document-${order.id}`;

  // Thermal Receipt Layout (80mm / 58mm)
  if (paper.isThermal) {
    const padX = theme.paperSize === 'thermal_58' ? sNum(10, 6) : sNum(14, 8);
    const padY = sNum(10, 6);
    const receiptWidthPx = paper.renderWidthPx;

    return (
      <div
        id={elementId}
        className={className || undefined}
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          overflow: 'hidden',
          border: exactPaperWidth ? 'none' : '1px solid #E5E7EB',
          width: exactPaperWidth ? `${receiptWidthPx}px` : '100%',
          maxWidth: `${receiptWidthPx}px`,
          backgroundColor: theme.backgroundColor,
          color: theme.textColor,
          fontFamily: fontStack,
          fontVariantNumeric: 'tabular-nums',
          boxSizing: 'border-box',
        }}
      >
        {/* Thermal Header */}
        <div
          style={{
            backgroundColor: headerBg,
            color: headerPrimaryText,
            padding: `${padY}px ${padX}px`,
            textAlign: 'center',
            borderBottom: `1px ${dividerStyle} ${theme.borderColor}`,
          }}
        >
          {theme.showLogo && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: `${sNum(6, 3)}px` }}>
              <img
                src={effectiveLogo}
                alt={theme.storeName}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                style={{
                  width: `${sNum(Math.min(theme.logoSizePx, 52), 22)}px`,
                  height: `${sNum(Math.min(theme.logoSizePx, 52), 22)}px`,
                  borderRadius: logoRadius,
                  objectFit: 'cover',
                  backgroundColor: '#ffffff',
                  padding: '2px',
                  border: `1px solid ${theme.borderColor}`,
                }}
              />
            </div>
          )}

          <div
            style={{
              fontSize: sPx(Math.min(theme.brandNameSizePx, 17), 9.5),
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            {theme.storeName}
          </div>

          {theme.storeTagline && (
            <div
              style={{
                fontSize: sPx(Math.min(theme.taglineSizePx, 11), 7.5),
                color: headerSubText,
                marginTop: '2px',
              }}
            >
              {theme.storeTagline}
            </div>
          )}

          {theme.showStoreContactInHeader && (
            <div
              style={{
                fontSize: sPx(9.5, 7),
                color: headerSubText,
                marginTop: '3px',
                lineHeight: 1.35,
              }}
            >
              {theme.storeAddress && <div>{theme.storeAddress}</div>}
              {(theme.storePhone || theme.storeEmail) && (
                <div>{[theme.storePhone, theme.storeEmail].filter(Boolean).join(' · ')}</div>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: `${sNum(6, 3)}px`,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: sPx(Math.min(theme.titleSizePx, 11), 7.5),
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor:
                theme.headerStyle === 'solid' ? 'rgba(255,255,255,0.2)' : theme.tableHeaderBgColor,
              color: headerPrimaryText,
            }}
          >
            <span>{theme.documentTitle}</span>
            <span>·</span>
            <span style={{ fontFamily: 'monospace' }}>#{order.id}</span>
          </div>
        </div>

        {/* Thermal Customer & Meta */}
        <div
          style={{
            padding: `${sNum(8, 5)}px ${padX}px`,
            fontSize: sPx(Math.min(theme.metaSizePx, 11), 7.5),
            borderBottom: `1px ${dividerStyle} ${theme.borderColor}`,
            lineHeight: 1.4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: theme.accentColor, textTransform: 'uppercase', fontSize: sPx(9.5, 7) }}>
              Customer
            </span>
            {theme.showOrderSourceBadge && (
              <span
                style={{
                  fontSize: sPx(9, 6.5),
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: theme.accentColor,
                }}
              >
                {order.order_source || 'POS'}
              </span>
            )}
          </div>
          <div style={{ fontWeight: 700 }}>{order.customerName || 'Walk-in Customer'}</div>
          {theme.showCustomerPhone && order.customerPhone && (
            <div style={{ fontFamily: 'monospace', color: theme.mutedTextColor }}>{order.customerPhone}</div>
          )}
          {theme.showCustomerAddress && order.address && (
            <div style={{ color: theme.mutedTextColor, fontSize: sPx(10, 7) }}>{order.address}</div>
          )}
          {theme.showDateTime && formattedDate && (
            <div style={{ color: theme.mutedTextColor, fontSize: sPx(9.5, 7), marginTop: '2px' }}>
              Date: {formattedDate}
            </div>
          )}
          {theme.showCourierTracking && order.courier && (
            <div
              style={{
                marginTop: '4px',
                paddingTop: '4px',
                borderTop: `1px dotted ${theme.borderColor}`,
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: sPx(9.5, 7),
              }}
            >
              <span>CN: #{order.courier.consignmentId}</span>
              <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{order.courier.status}</span>
            </div>
          )}
        </div>

        {/* Thermal Items */}
        <div style={{ padding: `${sNum(8, 5)}px ${padX}px`, borderBottom: `1px ${dividerStyle} ${theme.borderColor}` }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: sPx(Math.min(theme.tableHeaderSizePx, 10), 7),
              fontWeight: 800,
              textTransform: 'uppercase',
              color: theme.accentColor,
              paddingBottom: `${sNum(4, 2)}px`,
              borderBottom: `1px solid ${theme.borderColor}`,
              marginBottom: `${sNum(4, 2)}px`,
            }}
          >
            <span>Item / Qty</span>
            <span>Total</span>
          </div>

          <div>
            {(order.items || []).map((item, idx) => (
              <div
                key={idx}
                style={{
                  paddingTop: `${Math.max(2, Math.round((theme.rowVerticalPaddingPx * scale) / 2))}px`,
                  paddingBottom: `${Math.max(2, Math.round((theme.rowVerticalPaddingPx * scale) / 2))}px`,
                  borderBottom: idx < order.items.length - 1 ? `1px dotted ${theme.borderColor}` : 'none',
                  fontSize: sPx(Math.min(theme.tableBodySizePx, 11.5), 7.5),
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                  <div style={{ fontWeight: 700, flex: 1, lineHeight: 1.25 }}>
                    {theme.showProductSerialNumbers ? `${idx + 1}. ` : ''}
                    {item.name}
                  </div>
                  <div style={{ fontWeight: 800, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                    ৳{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: theme.mutedTextColor,
                    fontSize: sPx(Math.min(theme.tableBodySizePx - 1.5, 10), 7),
                    fontFamily: 'monospace',
                    marginTop: '1px',
                  }}
                >
                  <span>
                    {item.quantity} × ৳{Number(item.price || 0).toLocaleString()}
                    {item.pricingType === 'wholesale' ? ` · ${item.pricingTier || 'WS'}` : ''}
                  </span>
                  {theme.showProductSku && (item.sku || item.barcode) && (
                    <span>{item.sku || item.barcode}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thermal Totals */}
        <div
          style={{
            padding: `${sNum(8, 5)}px ${padX}px`,
            fontSize: sPx(Math.min(theme.totalsSizePx, 11.5), 7.5),
            borderBottom: `1px ${dividerStyle} ${theme.borderColor}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.mutedTextColor }}>
            <span>Subtotal</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: theme.textColor }}>
              ৳{subtotal.toLocaleString()}
            </span>
          </div>

          {theme.showDeliveryCharge && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.mutedTextColor, marginTop: '2px' }}>
              <span>Delivery</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: theme.textColor }}>
                ৳{deliveryFee.toLocaleString()}
              </span>
            </div>
          )}

          {theme.showDiscountBreakdown && totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', marginTop: '2px' }}>
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                -৳{totalDiscount.toLocaleString()}
              </span>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: `${sNum(6, 3)}px`,
              paddingTop: `${sNum(6, 3)}px`,
              borderTop: `1.5px solid ${theme.textColor}`,
              fontWeight: 800,
            }}
          >
            <span style={{ fontSize: sPx(Math.min(theme.grandTotalSizePx - 2, 13), 8.5) }}>Grand Total</span>
            <span style={{ fontSize: sPx(Math.min(theme.grandTotalSizePx, 15), 9.5), color: theme.accentColor, fontFamily: 'monospace' }}>
              ৳{Number(order.totalAmount || 0).toLocaleString()}
            </span>
          </div>

          {theme.showPaymentStatus && (
            <div style={{ marginTop: '4px', fontSize: sPx(10, 7) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.mutedTextColor }}>
                <span>Paid ({order.paymentMethod || 'CASH'})</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#047857' }}>
                  ৳{paidAmount.toLocaleString()}
                </span>
              </div>
              {dueAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#BE123C', fontWeight: 700, marginTop: '2px' }}>
                  <span>Due Balance</span>
                  <span style={{ fontFamily: 'monospace' }}>৳{dueAmount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <span
                  style={{
                    backgroundColor: paymentBadgeColors.bg,
                    color: paymentBadgeColors.text,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: sPx(9, 6.5),
                    fontWeight: 800,
                  }}
                >
                  {paymentBadgeLabel}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Thermal QR & Footer */}
        {(theme.showQrCode && trackingUrl) || theme.showTermsFooter ? (
          <div style={{ padding: `${sNum(8, 5)}px ${padX}px`, textAlign: 'center' }}>
            {theme.showQrCode && trackingUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ padding: '4px', backgroundColor: '#ffffff', border: `1px solid ${theme.borderColor}`, borderRadius: '6px' }}>
                  <QRCodeSVG
                    value={trackingUrl}
                    size={sNum(Math.min(theme.qrSizePx, 72), 40)}
                    level="M"
                    includeMargin={false}
                    bgColor="#ffffff"
                    fgColor={theme.textColor || '#111827'}
                  />
                </div>
                <span style={{ fontSize: sPx(8.5, 6.5), color: theme.mutedTextColor, marginTop: '2px', textTransform: 'uppercase' }}>
                  Scan to Track Order
                </span>
              </div>
            )}

            {theme.showTermsFooter && (
              <div style={{ fontSize: sPx(Math.min(theme.footerSizePx, 10), 7), color: theme.mutedTextColor, lineHeight: 1.35 }}>
                {theme.footerThankYouText && (
                  <p style={{ fontWeight: 600, color: theme.textColor, margin: 0 }}>{theme.footerThankYouText}</p>
                )}
                {theme.footerTermsText && <p style={{ margin: '2px 0 0 0' }}>{theme.footerTermsText}</p>}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  // Standard Sheet Layout (A4, A3, A5, Letter)
  const blockPadX = sNum(theme.paperSize === 'a5' ? 16 : 24, 10);
  const blockPadY = sNum(theme.paperSize === 'a5' ? 12 : 18, 8);
  const headerBottomBorder =
    theme.headerStyle !== 'solid' ? `2px ${dividerStyle} ${theme.borderColor}` : 'none';

  return (
    <div
      id={elementId}
      className={className || undefined}
      style={{
        marginLeft: 'auto',
        marginRight: 'auto',
        overflow: 'hidden',
        border: exactPaperWidth ? 'none' : '1px solid #E5E7EB',
        borderRadius: exactPaperWidth ? '0px' : '12px',
        boxShadow: exactPaperWidth ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        width: exactPaperWidth ? `${paper.renderWidthPx}px` : '100%',
        maxWidth: `${paper.renderWidthPx}px`,
        backgroundColor: theme.backgroundColor,
        color: theme.textColor,
        fontFamily: fontStack,
        fontVariantNumeric: 'tabular-nums',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. HEADER */}
      <div
        style={{
          backgroundColor: headerBg,
          color: headerPrimaryText,
          padding: `${sNum(18, 9)}px ${blockPadX}px`,
          borderBottom: headerBottomBorder,
          display: 'flex',
          flexDirection: theme.headerLayout === 'centered' ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: theme.headerLayout === 'centered' ? 'center' : 'space-between',
          textAlign: theme.headerLayout === 'centered' ? 'center' : 'left',
          gap: `${sNum(12, 6)}px`,
        }}
      >
        {/* Brand + Logo */}
        <div
          style={{
            display: 'flex',
            flexDirection: theme.headerLayout === 'centered' ? 'column' : 'row',
            alignItems: 'center',
            gap: `${sNum(12, 6)}px`,
          }}
        >
          {theme.showLogo && (
            <img
              src={effectiveLogo}
              alt={theme.storeName}
              referrerPolicy="no-referrer"
              onError={() => setLogoFailed(true)}
              style={{
                width: `${sNum(theme.logoSizePx, 24)}px`,
                height: `${sNum(theme.logoSizePx, 24)}px`,
                borderRadius: logoRadius,
                objectFit: 'cover',
                backgroundColor: '#ffffff',
                padding: '2px',
                border:
                  theme.headerStyle === 'solid'
                    ? '1px solid rgba(255,255,255,0.4)'
                    : `1px solid ${theme.borderColor}`,
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <h1
              style={{
                fontSize: sPx(theme.brandNameSizePx, 10),
                fontWeight: 800,
                color: headerPrimaryText,
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              {theme.storeName}
            </h1>
            {theme.storeTagline && (
              <p
                style={{
                  fontSize: sPx(theme.taglineSizePx, 7.5),
                  color: headerSubText,
                  fontWeight: 500,
                  margin: '2px 0 0 0',
                }}
              >
                {theme.storeTagline}
              </p>
            )}
            {theme.showStoreContactInHeader && (
              <p
                style={{
                  fontSize: sPx(Math.max(8, theme.taglineSizePx - 1), 7),
                  color: headerSubText,
                  margin: '3px 0 0 0',
                }}
              >
                {[theme.storeAddress, theme.storePhone, theme.storeEmail].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        </div>

        {/* Invoice Title + Order ID */}
        <div
          style={{
            textAlign: theme.headerLayout === 'centered' ? 'center' : 'right',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              backgroundColor:
                theme.headerStyle === 'solid' ? 'rgba(255,255,255,0.2)' : theme.tableHeaderBgColor,
              color: theme.headerStyle === 'solid' ? theme.headerTextColor : theme.primaryColor,
              fontSize: sPx(theme.titleSizePx, 7.5),
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: `${sNum(3, 1.5)}px ${sNum(10, 5)}px`,
              borderRadius: '9999px',
              display: 'inline-block',
              border:
                theme.headerStyle === 'solid' ? 'none' : `1px solid ${theme.borderColor}`,
            }}
          >
            {theme.documentTitle}
          </div>
          <div
            style={{
              fontSize: sPx(theme.metaSizePx, 8),
              fontWeight: 800,
              color: headerPrimaryText,
              marginTop: `${sNum(4, 2)}px`,
              fontFamily: 'monospace',
            }}
          >
            #{order.id}
          </div>
        </div>
      </div>

      {/* 2. TWO-COLUMN INFO ROW */}
      <div
        style={{
          padding: `${blockPadY}px ${blockPadX}px`,
          borderBottom: `1px ${dividerStyle} ${theme.borderStyle === 'minimal' ? '#E5E7EB' : theme.borderColor}`,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: `${sNum(18, 8)}px`,
          backgroundColor: theme.backgroundColor,
        }}
      >
        {/* Left Column: Customer */}
        <div style={{ fontSize: sPx(theme.metaSizePx, 7.5), lineHeight: 1.45 }}>
          <div
            style={{
              fontSize: sPx(Math.max(8, theme.tableHeaderSizePx), 7),
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: theme.accentColor,
              marginBottom: `${sNum(4, 2)}px`,
            }}
          >
            CUSTOMER
          </div>
          <div
            style={{
              fontSize: sPx(theme.metaSizePx + 1, 8),
              fontWeight: 800,
              color: theme.textColor,
            }}
          >
            {order.customerName || 'In-Person Customer'}
          </div>
          {theme.showCustomerPhone && (
            <div
              style={{
                fontSize: sPx(theme.metaSizePx, 7.5),
                color: theme.mutedTextColor,
                fontFamily: 'monospace',
                fontWeight: 600,
              }}
            >
              {order.customerPhone || 'N/A'}
            </div>
          )}
          {theme.showCustomerAddress && (
            <div
              style={{
                fontSize: sPx(Math.max(9, theme.metaSizePx - 1), 7),
                color: theme.mutedTextColor,
                marginTop: '2px',
              }}
            >
              {order.address || 'In-Store Checkout'}
            </div>
          )}
        </div>

        {/* Right Column: Courier or Order Metadata */}
        {theme.showCourierTracking && order.courier ? (
          <div
            style={{
              backgroundColor: theme.tableHeaderBgColor,
              padding: `${sNum(10, 5)}px ${sNum(12, 6)}px`,
              borderRadius: '8px',
              border: `1px ${dividerStyle} ${theme.borderColor}`,
              fontSize: sPx(Math.max(9, theme.metaSizePx - 1), 7),
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontSize: sPx(Math.max(8, theme.tableHeaderSizePx), 7),
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: theme.accentColor,
                marginBottom: `${sNum(4, 2)}px`,
              }}
            >
              COURIER - STEADFAST
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: theme.mutedTextColor }}>CN ID:</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace', color: theme.textColor }}>
                {order.courier.consignmentId}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ color: theme.mutedTextColor }}>Status:</span>
              {getStatusBadge(order.courier.status)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ color: theme.mutedTextColor }}>COD:</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                ৳{Number(order.courier.codAmount || 0).toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <span style={{ color: theme.mutedTextColor }}>Delivery fee:</span>
              <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                ৳{Number(order.courier.deliveryFee || 0).toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'right',
              fontSize: sPx(theme.metaSizePx, 7.5),
              lineHeight: 1.55,
            }}
          >
            <div
              style={{
                fontSize: sPx(Math.max(8, theme.tableHeaderSizePx), 7),
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: theme.accentColor,
                marginBottom: `${sNum(4, 2)}px`,
              }}
            >
              ORDER INFORMATION
            </div>
            {theme.showOrderSourceBadge && (
              <div style={{ color: theme.mutedTextColor }}>
                Source:{' '}
                <span style={{ fontWeight: 800, color: theme.textColor }}>
                  {order.order_source || 'POS'}
                </span>
              </div>
            )}
            {theme.showDateTime && formattedDate && (
              <div style={{ color: theme.mutedTextColor }}>
                Date: <span style={{ fontWeight: 600, color: theme.textColor }}>{formattedDate}</span>
              </div>
            )}
            <div style={{ color: theme.mutedTextColor }}>
              Payment:{' '}
              <span style={{ fontWeight: 700, color: theme.textColor }}>
                {order.paymentMethod === 'POS_In_Person' ? 'POS In Person' : order.paymentMethod || 'COD'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. ITEM TABLE */}
      <div style={{ padding: `${blockPadY}px ${blockPadX}px` }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                backgroundColor: theme.borderStyle === 'minimal' ? 'transparent' : theme.tableHeaderBgColor,
                borderBottom: `2px ${dividerStyle} ${theme.borderColor}`,
              }}
            >
              {theme.showProductSerialNumbers && (
                <th
                  style={{
                    padding: `${sNum(7, 3)}px ${sNum(6, 3)}px`,
                    fontSize: sPx(theme.tableHeaderSizePx, 7),
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: theme.accentColor,
                    width: '32px',
                  }}
                >
                  #
                </th>
              )}
              <th
                style={{
                  padding: `${sNum(7, 3)}px ${theme.borderStyle === 'grid' ? sNum(8, 4) : 0}px`,
                  fontSize: sPx(theme.tableHeaderSizePx, 7),
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: theme.accentColor,
                }}
              >
                ITEM
              </th>
              <th
                style={{
                  padding: `${sNum(7, 3)}px ${sNum(6, 3)}px`,
                  textAlign: 'right',
                  fontSize: sPx(theme.tableHeaderSizePx, 7),
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: theme.accentColor,
                }}
              >
                PRICE
              </th>
              <th
                style={{
                  padding: `${sNum(7, 3)}px ${sNum(6, 3)}px`,
                  textAlign: 'center',
                  fontSize: sPx(theme.tableHeaderSizePx, 7),
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: theme.accentColor,
                }}
              >
                QTY
              </th>
              <th
                style={{
                  padding: `${sNum(7, 3)}px ${theme.borderStyle === 'grid' ? sNum(8, 4) : 0}px`,
                  textAlign: 'right',
                  fontSize: sPx(theme.tableHeaderSizePx, 7),
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: theme.accentColor,
                }}
              >
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody style={{ fontSize: sPx(theme.tableBodySizePx, 7.5) }}>
            {(order.items || []).map((item, idx) => {
              const rowPad = sNum(theme.rowVerticalPaddingPx, 3);
              const rowBorder = `1px ${dividerStyle} ${
                theme.borderStyle === 'minimal' ? '#F3F4F6' : '#E5E7EB'
              }`;
              return (
                <tr key={idx} style={{ borderBottom: rowBorder }}>
                  {theme.showProductSerialNumbers && (
                    <td
                      style={{
                        padding: `${rowPad}px ${sNum(6, 3)}px`,
                        color: theme.mutedTextColor,
                        fontFamily: 'monospace',
                      }}
                    >
                      {idx + 1}
                    </td>
                  )}
                  <td
                    style={{
                      paddingTop: `${rowPad}px`,
                      paddingBottom: `${rowPad}px`,
                      paddingLeft: `${theme.borderStyle === 'grid' ? sNum(8, 4) : 0}px`,
                      paddingRight: '8px',
                      fontWeight: 600,
                      color: theme.textColor,
                      lineHeight: 1.3,
                    }}
                  >
                    <div>{item.name}</div>
                    {theme.showProductSku && (item.sku || item.barcode) && (
                      <div
                        style={{
                          fontSize: sPx(Math.max(8, theme.tableBodySizePx - 2.5), 6.5),
                          color: theme.mutedTextColor,
                          fontFamily: 'monospace',
                          marginTop: '1px',
                        }}
                      >
                        SKU: {item.sku || item.barcode}
                      </div>
                    )}
                    {item.pricingType === 'wholesale' && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '2px',
                          fontSize: sPx(8.5, 6.5),
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          color: '#92400E',
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        Wholesale ({item.pricingTier || 'Tier'})
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: `${rowPad}px ${sNum(6, 3)}px`,
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      color: theme.mutedTextColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ৳{Number(item.price || 0).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: `${rowPad}px ${sNum(6, 3)}px`,
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      color: theme.mutedTextColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ×{item.quantity}
                  </td>
                  <td
                    style={{
                      padding: `${rowPad}px ${theme.borderStyle === 'grid' ? sNum(8, 4) : 0}px`,
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: theme.textColor,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ৳{(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. BOTTOM ROW (QR + Totals) */}
      <div
        style={{
          padding: `${blockPadY}px ${blockPadX}px`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: `${sNum(16, 8)}px`,
          borderTop: `1px ${dividerStyle} #F3F4F6`,
        }}
      >
        {/* Left: QR or Official badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {theme.showQrCode && trackingUrl ? (
            <>
              <div
                style={{
                  padding: '4px',
                  backgroundColor: '#ffffff',
                  border: `1px solid ${theme.borderColor}`,
                  borderRadius: '8px',
                }}
              >
                <QRCodeSVG
                  value={trackingUrl}
                  size={sNum(theme.qrSizePx, 42)}
                  level="M"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor={theme.textColor || '#111827'}
                />
              </div>
              <span
                style={{
                  fontSize: sPx(9, 6.5),
                  color: theme.mutedTextColor,
                  fontWeight: 600,
                  marginTop: '4px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Track order
              </span>
            </>
          ) : (
            <div style={{ fontSize: sPx(10, 7), color: theme.mutedTextColor, fontStyle: 'italic' }}>
              Official Store Invoice
            </div>
          )}
        </div>

        {/* Right: Totals block */}
        <div
          style={{
            width: `${sNum(theme.paperSize === 'a5' ? 190 : 230, 150)}px`,
            fontSize: sPx(theme.totalsSizePx, 7.5),
            lineHeight: 1.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.mutedTextColor }}>
            <span>Subtotal</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: theme.textColor }}>
              ৳{subtotal.toLocaleString()}
            </span>
          </div>

          {theme.showDeliveryCharge && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.mutedTextColor, marginTop: '2px' }}>
              <span>Delivery</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: theme.textColor }}>
                ৳{deliveryFee.toLocaleString()}
              </span>
            </div>
          )}

          {theme.showDiscountBreakdown && totalDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
              <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                -৳{totalDiscount.toLocaleString()}
              </span>
            </div>
          )}

          <div
            style={{
              borderTop: `2px solid ${theme.textColor}`,
              paddingTop: `${sNum(6, 3)}px`,
              marginTop: `${sNum(6, 3)}px`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: sPx(theme.totalsSizePx + 1, 8), fontWeight: 800, color: theme.textColor }}>
              Grand Total
            </span>
            <span
              style={{
                fontSize: sPx(theme.grandTotalSizePx, 9.5),
                fontWeight: 900,
                color: theme.accentColor,
                fontFamily: 'monospace',
              }}
            >
              ৳{Number(order.totalAmount || 0).toLocaleString()}
            </span>
          </div>

          {theme.showPaymentStatus && (
            <>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: theme.mutedTextColor,
                  paddingTop: '4px',
                  fontSize: sPx(Math.max(9, theme.totalsSizePx - 1), 7),
                }}
              >
                <span>Paid ({order.paymentMethod || 'CASH'})</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#047857' }}>
                  ৳{paidAmount.toLocaleString()}
                </span>
              </div>

              {dueAmount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#BE123C',
                    backgroundColor: '#FFF1F2',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: '1px solid #FECDD3',
                    marginTop: '4px',
                    fontSize: sPx(Math.max(9, theme.totalsSizePx - 1), 7),
                    fontWeight: 700,
                  }}
                >
                  <span>Due Balance</span>
                  <span style={{ fontFamily: 'monospace' }}>৳{dueAmount.toLocaleString()}</span>
                </div>
              )}

              {order.changeAmount !== undefined && order.changeAmount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: theme.mutedTextColor,
                    fontSize: sPx(Math.max(9, theme.totalsSizePx - 1), 7),
                    marginTop: '2px',
                  }}
                >
                  <span>Change Return</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    ৳{Number(order.changeAmount).toLocaleString()}
                  </span>
                </div>
              )}

              <div style={{ textAlign: 'right', paddingTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    fontSize: sPx(9, 6.5),
                    fontWeight: 900,
                    letterSpacing: '0.05em',
                    backgroundColor: paymentBadgeColors.bg,
                    color: paymentBadgeColors.text,
                  }}
                >
                  {paymentBadgeLabel}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4b. SIGNATURE LINES (Optional) */}
      {theme.showSignatureLine && (
        <div
          style={{
            padding: `${sNum(16, 8)}px ${blockPadX}px ${sNum(8, 4)}px`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '24px',
            fontSize: sPx(Math.max(9, theme.footerSizePx - 0.5), 7),
            color: theme.mutedTextColor,
          }}
        >
          <div style={{ flex: 1, maxWidth: '180px', textAlign: 'center' }}>
            <div style={{ borderTop: `1px ${dividerStyle} ${theme.mutedTextColor}`, paddingTop: '4px', fontWeight: 600 }}>
              {theme.signatureLeftLabel || 'Customer Signature'}
            </div>
          </div>
          <div style={{ flex: 1, maxWidth: '180px', textAlign: 'center' }}>
            <div style={{ borderTop: `1px ${dividerStyle} ${theme.mutedTextColor}`, paddingTop: '4px', fontWeight: 600 }}>
              {theme.signatureRightLabel || 'Authorized Signature'}
            </div>
          </div>
        </div>
      )}

      {/* 5. FOOTER */}
      {theme.showTermsFooter && (
        <div
          style={{
            padding: `${sNum(14, 6)}px ${blockPadX}px`,
            borderTop: `1px ${dividerStyle} ${theme.borderStyle === 'minimal' ? '#E5E7EB' : theme.borderColor}`,
            marginTop: `${sNum(6, 2)}px`,
            textAlign: 'center',
            fontSize: sPx(theme.footerSizePx, 7),
            color: theme.mutedTextColor,
            backgroundColor: theme.tableHeaderBgColor,
            lineHeight: 1.45,
          }}
        >
          {theme.footerThankYouText && (
            <p style={{ fontWeight: 600, color: theme.textColor, margin: 0 }}>
              {theme.footerThankYouText}
            </p>
          )}
          {theme.footerTermsText && (
            <p style={{ margin: '2px 0 0 0', opacity: 0.85 }}>{theme.footerTermsText}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceDocument;
