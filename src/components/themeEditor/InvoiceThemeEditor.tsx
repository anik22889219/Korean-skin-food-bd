import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Layout,
  Loader2,
  Maximize2,
  Palette,
  Printer,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Type,
  Upload,
} from 'lucide-react';
import { InvoiceDocument } from '../InvoiceDocument';
import { Order } from '../../types';
import {
  InvoiceBorderStyle,
  InvoiceFontFamily,
  InvoiceHeaderLayout,
  InvoiceHeaderStyle,
  InvoiceLogoShape,
  InvoiceOrientation,
  InvoicePaperSize,
  InvoiceThemeSettings,
} from '../../types/theme';
import { uploadFileToCloudinary } from '../../services/cloudinaryService';
import { computeInvoiceAutoScale, getEffectivePaperMetrics, PAPER_SPECS } from '../../utils/invoicePaper';
import { downloadInvoicePDF, printInvoice } from '../../utils/invoicePdf';

interface InvoiceThemeEditorProps {
  invoiceTheme: InvoiceThemeSettings;
  onChange: React.Dispatch<React.SetStateAction<InvoiceThemeSettings>>;
  openMediaPicker: (targetPath: string) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  isSaving: boolean;
}

type EditorSubTab = 'paper' | 'branding' | 'typography' | 'colors' | 'sections';
type SampleScenario = 'website' | 'pos' | 'wholesale';

const SAMPLE_SKINCARE_ITEMS = [
  { name: 'COSRX Advanced Snail 96 Mucin Power Essence 100ml', sku: 'CRX-SNL-096', price: 1650 },
  { name: 'SKIN1004 Madagascar Centella Ampoule 55ml', sku: 'S104-CNT-055', price: 1450 },
  { name: 'Beauty of Joseon Relief Sun: Rice + Probiotics 50ml', sku: 'BOJ-SUN-050', price: 1350 },
  { name: 'Anua Heartleaf 77% Soothing Toner 250ml', sku: 'ANU-HRT-250', price: 1750 },
  { name: 'Some By Mi AHA BHA PHA 30 Days Miracle Serum', sku: 'SBM-MRC-050', price: 1550 },
  { name: 'Round Lab 1025 Dokdo Cleanser 150ml', sku: 'RLB-DKD-150', price: 1180 },
  { name: 'Torriden DIVE-IN Low Molecular Hyaluronic Serum', sku: 'TRD-DIV-050', price: 1850 },
  { name: 'Axis-Y Dark Spot Correcting Glow Serum 50ml', sku: 'AXY-GLW-050', price: 1420 },
  { name: 'Laneige Water Sleeping Mask EX 70ml', sku: 'LNG-WSM-070', price: 2450 },
  { name: 'Klairs Freshly Juiced Vitamin Drop 35ml', sku: 'KLR-VIT-035', price: 1890 },
  { name: 'Isntree Hyaluronic Acid Watery Sun Gel 50ml', sku: 'ISN-SUN-050', price: 1480 },
  { name: 'Innisfree No-Sebum Mineral Powder 5g', sku: 'INF-NSM-005', price: 750 },
  { name: 'Pyunkang Yul Essence Toner 200ml', sku: 'PKY-ESS-200', price: 1320 },
  { name: 'Mary & May Idebenone + Blackberry Cream 70g', sku: 'MNM-IDB-070', price: 1790 },
  { name: 'Numbuzin No.3 Skin Softening Serum 50ml', sku: 'NMZ-N03-050', price: 1920 },
  { name: 'Haruharu Wonder Black Rice Hyaluronic Toner', sku: 'HRH-BRC-150', price: 1460 },
  { name: 'Mediheal Teatree Essential Sheet Mask (Pack)', sku: 'MDH-TTR-010', price: 1250 },
  { name: 'Banila Co Clean It Zero Cleansing Balm 100ml', sku: 'BNL-CIZ-100', price: 1850 },
  { name: 'Heimish All Clean Balm 120ml', sku: 'HMS-ACB-120', price: 1590 },
  { name: 'Etude SoonJung 2x Barrier Intensive Cream 60ml', sku: 'ETD-SNJ-060', price: 1420 },
  { name: 'I\'m From Rice Toner 150ml', sku: 'IMF-RIC-150', price: 2150 },
  { name: 'Mixsoon Bean Essence 50ml', sku: 'MXS-BEN-050', price: 2290 },
  { name: 'Kaine Rosemary Relief Gel Cleanser 150ml', sku: 'KNE-RSM-150', price: 1380 },
  { name: 'Tirtir Milk Skin Toner 150ml', sku: 'TRT-MLK-150', price: 2050 },
];

const INVOICE_COLOR_PRESETS = [
  { name: 'Rose Flagship', primary: '#C81E78', accent: '#993556', tableBg: '#FDF2F8', border: '#ED93B1' },
  { name: 'Obsidian Mono', primary: '#0F172A', accent: '#334155', tableBg: '#F8FAFC', border: '#CBD5E1' },
  { name: 'Emerald Clinic', primary: '#047857', accent: '#065F46', tableBg: '#ECFDF5', border: '#A7F3D0' },
  { name: 'Royal Indigo', primary: '#3730A3', accent: '#312E81', tableBg: '#EEF2FF', border: '#C7D2FE' },
  { name: 'Burgundy Luxe', primary: '#881337', accent: '#9F1239', tableBg: '#FFF1F2', border: '#FECDD3' },
  { name: 'Thermal Classic', primary: '#111827', accent: '#111827', tableBg: '#F3F4F6', border: '#9CA3AF' },
];

export const InvoiceThemeEditor: React.FC<InvoiceThemeEditorProps> = ({
  invoiceTheme,
  onChange,
  openMediaPicker,
  onSave,
  onReset,
  isSaving,
}) => {
  const [subTab, setSubTab] = useState<EditorSubTab>('paper');
  const [sampleScenario, setSampleScenario] = useState<SampleScenario>('website');
  const [sampleItemCount, setSampleItemCount] = useState<number>(4);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isTestingPdf, setIsTestingPdf] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [previewZoomScale, setPreviewZoomScale] = useState<number>(1);
  const logoUploadRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  const paperMetrics = useMemo(() => getEffectivePaperMetrics(invoiceTheme), [invoiceTheme]);
  const autoScaleInfo = useMemo(
    () => computeInvoiceAutoScale(sampleItemCount, invoiceTheme),
    [sampleItemCount, invoiceTheme]
  );

  // Measure preview container width to scale wide sheets (A3/A4/Landscape) neatly without overflow
  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;
    const updateScale = () => {
      const availableW = Math.max(240, el.clientWidth - 24);
      const targetW = paperMetrics.renderWidthPx;
      setPreviewZoomScale(Math.min(1, Number((availableW / targetW).toFixed(3))));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [paperMetrics.renderWidthPx]);

  // Build dynamic sample order reflecting scenario & sampleItemCount
  const sampleOrder: Order = useMemo(() => {
    const count = Math.max(1, Math.min(24, sampleItemCount));
    const items = Array.from({ length: count }, (_, idx) => {
      const base = SAMPLE_SKINCARE_ITEMS[idx % SAMPLE_SKINCARE_ITEMS.length];
      const qty = idx === 0 ? 2 : 1;
      const unitPrice = sampleScenario === 'wholesale' ? Math.round(base.price * 0.72) : base.price;
      return {
        productId: `sample-${idx + 1}`,
        name: base.name,
        sku: base.sku,
        barcode: `8809${String(100000 + idx)}`,
        price: unitPrice,
        quantity: sampleScenario === 'wholesale' ? qty * 5 : qty,
        pricingType: sampleScenario === 'wholesale' ? 'wholesale' : 'retail',
        pricingTier: sampleScenario === 'wholesale' ? '1-49 Units' : undefined,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = sampleScenario === 'pos' ? 0 : sampleScenario === 'wholesale' ? 250 : 80;
    const discount = sampleScenario === 'website' ? 150 : 0;
    const grandTotal = Math.max(0, subtotal + shipping - discount);
    const paid =
      sampleScenario === 'pos'
        ? grandTotal
        : sampleScenario === 'wholesale'
        ? Math.round(grandTotal * 0.6)
        : 0;
    const due = Math.max(0, grandTotal - paid);

    if (sampleScenario === 'pos') {
      return {
        id: 'POS-904218',
        customerName: 'Nusrat Jahan Mim',
        customerPhone: '01712-345678',
        address: 'Banani Flagship Counter, Dhaka',
        items,
        totalAmount: grandTotal,
        shippingCharge: 0,
        status: 'delivered',
        order_source: 'POS',
        stock_deducted: true,
        createdAt: new Date().toISOString(),
        paymentMethod: 'POS_In_Person',
        sessionType: 'POS',
        isPaid: true,
        paymentStatus: 'PAID',
        totalPaid: grandTotal,
        dueAmount: 0,
        changeAmount: 200,
      };
    }

    if (sampleScenario === 'wholesale') {
      return {
        id: 'WS-44019',
        customerName: 'Glow Studio BD (Wholesale Partner)',
        customerPhone: '01819-887766',
        address: 'House 14, Road 6, Dhanmondi, Dhaka 1205',
        items,
        totalAmount: grandTotal,
        shippingCharge: shipping,
        status: 'processing',
        order_source: 'WHOLESALE',
        stock_deducted: true,
        createdAt: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
        sessionType: 'Online',
        isPaid: false,
        paymentStatus: 'PARTIALLY_PAID',
        totalPaid: paid,
        dueAmount: due,
      };
    }

    return {
      id: 'ORD-582910',
      customerName: 'Ayesha Siddiqua',
      customerPhone: '01911-223344',
      address: 'Flat 4B, House 22, Road 11, Banani, Dhaka',
      items,
      totalAmount: grandTotal,
      shippingCharge: shipping,
      discountAmount: discount,
      couponCode: 'GLOW150',
      status: 'shipped',
      order_source: 'WEBSITE',
      stock_deducted: true,
      createdAt: new Date().toISOString(),
      paymentMethod: 'COD',
      sessionType: 'Online',
      isPaid: false,
      paymentStatus: 'UNPAID',
      totalPaid: 0,
      dueAmount: grandTotal,
      courier: {
        provider: 'steadfast',
        consignmentId: 'SF9482710',
        trackingCode: 'TRK884920',
        status: 'in_transit',
        codAmount: grandTotal,
        deliveryFee: shipping,
        trackingUrl: 'https://steadfast.com.bd/t/TRK884920',
        createdAt: new Date().toISOString(),
      },
    };
  }, [sampleItemCount, sampleScenario]);

  const updateField = <K extends keyof InvoiceThemeSettings>(
    key: K,
    value: InvoiceThemeSettings[K]
  ) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const res = await uploadFileToCloudinary(file, {
        folder: 'invoice_logos',
        resourceType: 'image',
      });
      if (res?.secureUrl) {
        updateField('logoUrl', res.secureUrl);
      }
    } catch (err) {
      console.error('Failed to upload invoice logo:', err);
      alert('Failed to upload logo from device. Please try again.');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const applyRecommendedPaperTypography = (paperSize: InvoicePaperSize) => {
    if (paperSize === 'thermal_58') {
      onChange((prev) => ({
        ...prev,
        paperSize,
        orientation: 'portrait',
        marginTopMm: 2,
        marginRightMm: 2,
        marginBottomMm: 2,
        marginLeftMm: 2,
        logoSizePx: 32,
        brandNameSizePx: 13,
        taglineSizePx: 9,
        titleSizePx: 9,
        metaSizePx: 9.5,
        tableHeaderSizePx: 8.5,
        tableBodySizePx: 9.5,
        totalsSizePx: 9.5,
        grandTotalSizePx: 12,
        footerSizePx: 8.5,
        rowVerticalPaddingPx: 5,
        qrSizePx: 56,
        borderStyle: 'dashed',
      }));
      return;
    }
    if (paperSize === 'thermal_80') {
      onChange((prev) => ({
        ...prev,
        paperSize,
        orientation: 'portrait',
        marginTopMm: 3,
        marginRightMm: 3,
        marginBottomMm: 3,
        marginLeftMm: 3,
        logoSizePx: 38,
        brandNameSizePx: 15,
        taglineSizePx: 10,
        titleSizePx: 10,
        metaSizePx: 10.5,
        tableHeaderSizePx: 9.5,
        tableBodySizePx: 10.5,
        totalsSizePx: 10.5,
        grandTotalSizePx: 13,
        footerSizePx: 9.5,
        rowVerticalPaddingPx: 6,
        qrSizePx: 64,
        borderStyle: 'dashed',
      }));
      return;
    }
    if (paperSize === 'a3') {
      onChange((prev) => ({
        ...prev,
        paperSize,
        marginTopMm: 12,
        marginRightMm: 12,
        marginBottomMm: 12,
        marginLeftMm: 12,
        productsPerPage: 16,
        logoSizePx: 54,
        brandNameSizePx: 19,
        taglineSizePx: 12,
        titleSizePx: 12,
        metaSizePx: 13,
        tableHeaderSizePx: 11,
        tableBodySizePx: 13,
        totalsSizePx: 13,
        grandTotalSizePx: 17,
        footerSizePx: 12,
        rowVerticalPaddingPx: 11,
        qrSizePx: 88,
      }));
      return;
    }
    if (paperSize === 'a5') {
      onChange((prev) => ({
        ...prev,
        paperSize,
        marginTopMm: 7,
        marginRightMm: 7,
        marginBottomMm: 7,
        marginLeftMm: 7,
        productsPerPage: 7,
        logoSizePx: 36,
        brandNameSizePx: 14,
        taglineSizePx: 10,
        titleSizePx: 10,
        metaSizePx: 10.5,
        tableHeaderSizePx: 9,
        tableBodySizePx: 10.5,
        totalsSizePx: 10.5,
        grandTotalSizePx: 13,
        footerSizePx: 9.5,
        rowVerticalPaddingPx: 7,
        qrSizePx: 64,
      }));
      return;
    }
    // A4 or Letter
    onChange((prev) => ({
      ...prev,
      paperSize,
      marginTopMm: 10,
      marginRightMm: 10,
      marginBottomMm: 10,
      marginLeftMm: 10,
      productsPerPage: 10,
      logoSizePx: 44,
      brandNameSizePx: 16,
      taglineSizePx: 11,
      titleSizePx: 11,
      metaSizePx: 12,
      tableHeaderSizePx: 10,
      tableBodySizePx: 12,
      totalsSizePx: 12,
      grandTotalSizePx: 15,
      footerSizePx: 11,
      rowVerticalPaddingPx: 10,
      qrSizePx: 76,
    }));
  };

  const handleTestPdf = async () => {
    setIsTestingPdf(true);
    try {
      await downloadInvoicePDF(sampleOrder, undefined, invoiceTheme);
    } finally {
      setIsTestingPdf(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    try {
      await printInvoice(sampleOrder, undefined, invoiceTheme);
    } finally {
      setIsTestingPrint(false);
    }
  };

  const controlTabs: Array<{ id: EditorSubTab; label: string; Icon: React.FC<{ size?: number }> }> = [
    { id: 'paper', label: 'Paper & Fit', Icon: Maximize2 },
    { id: 'branding', label: 'Logo & Header', Icon: ImageIcon },
    { id: 'typography', label: 'Text Sizes', Icon: Type },
    { id: 'colors', label: 'Colors & Border', Icon: Palette },
    { id: 'sections', label: 'Sections & Footer', Icon: Sliders },
  ];

  const paperOptions = Object.values(PAPER_SPECS);

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-[24px] border border-pink-100 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-pink-50 border border-pink-100 text-[#E91E8C] flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              Unified Invoice & Receipt Designer
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize page size (A4, A3, A5, Letter, 80mm & 58mm Thermal), logo, font sizes, and products-per-page single-sheet auto-scaling across all Website, POS, and Wholesale invoices.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={isTestingPrint}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isTestingPrint ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            <span>Test Print</span>
          </button>
          <button
            type="button"
            onClick={handleTestPdf}
            disabled={isTestingPdf}
            className="px-3.5 py-2 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-[#C81E78] text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isTestingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            <span>Test PDF</span>
          </button>
          <button
            type="button"
            onClick={onReset}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-[#E91E8C] hover:bg-pink-600 text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-md shadow-pink-500/20 cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{isSaving ? 'Saving...' : 'Save Design'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace: Controls Left, Live Paper Preview Right */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: Configuration Controls */}
        <div className="xl:col-span-5 bg-white rounded-[24px] border border-pink-100 shadow-xs overflow-hidden">
          {/* Sub-Navigation Pills */}
          <div className="p-3 border-b border-pink-100 bg-slate-50/70 flex gap-1.5 overflow-x-auto no-scrollbar">
            {controlTabs.map(({ id, label, Icon }) => {
              const active = subTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSubTab(id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? 'bg-[#E91E8C] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-pink-200 hover:text-[#E91E8C]'
                  }`}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 space-y-5 text-xs">
            {/* SUBTAB 1: PAPER SIZE & SINGLE-PAGE AUTO-FIT */}
            {subTab === 'paper' && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-black text-slate-900">Select Invoice Paper Size</label>
                    <button
                      type="button"
                      onClick={() => applyRecommendedPaperTypography(invoiceTheme.paperSize)}
                      className="text-[11px] font-bold text-[#E91E8C] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Adjust font sizes & padding cleanly for current paper size"
                    >
                      <Sparkles size={12} />
                      <span>Match Text Sizes to {PAPER_SPECS[invoiceTheme.paperSize]?.shortLabel}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paperOptions.map((spec) => {
                      const selected = invoiceTheme.paperSize === spec.id;
                      return (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => updateField('paperSize', spec.id)}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                            selected
                              ? 'bg-pink-50/80 border-[#E91E8C] ring-1 ring-[#E91E8C]'
                              : 'bg-white border-slate-200 hover:border-pink-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-black text-xs ${selected ? 'text-[#C81E78]' : 'text-slate-900'}`}>
                              {spec.shortLabel}
                            </span>
                            {selected && <Check size={13} className="text-[#E91E8C]" />}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5 tabular-nums">
                            {spec.sizeTag}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Orientation (Cut-Sheet formats only) */}
                {!paperMetrics.isThermal && (
                  <div>
                    <label className="block font-bold text-slate-800 mb-1.5">Page Orientation</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['portrait', 'landscape'] as InvoiceOrientation[]).map((orient) => (
                        <button
                          key={orient}
                          type="button"
                          onClick={() => updateField('orientation', orient)}
                          className={`py-2 px-3 rounded-xl border font-bold capitalize transition cursor-pointer ${
                            invoiceTheme.orientation === orient
                              ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-pink-200'
                          }`}
                        >
                          {orient}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Products Per Page & Auto-Scale Engine */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="font-black text-slate-900 block">Products Per Page Limit</span>
                      <span className="text-[11px] text-slate-500">
                        Max items at 100% scale before single-page compression activates.
                      </span>
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={invoiceTheme.productsPerPage}
                      onChange={(e) => updateField('productsPerPage', Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white font-mono font-black text-center text-slate-900 tabular-nums"
                    />
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    value={Math.min(30, invoiceTheme.productsPerPage)}
                    onChange={(e) => updateField('productsPerPage', Number(e.target.value))}
                    className="w-full accent-[#E91E8C] cursor-pointer"
                  />

                  <label className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Auto-Scale Text to Fit 1 Page
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Automatically shrinks font sizes & row padding when items exceed limit.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={invoiceTheme.autoScaleToFit}
                      onChange={(e) => updateField('autoScaleToFit', e.target.checked)}
                      className="w-4 h-4 accent-[#E91E8C] rounded cursor-pointer"
                    />
                  </label>

                  {invoiceTheme.autoScaleToFit && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-700">
                        <span>Minimum Text Scale Floor</span>
                        <span className="font-mono tabular-nums text-[#C81E78]">
                          {invoiceTheme.minAutoScalePercent}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={45}
                        max={90}
                        step={5}
                        value={invoiceTheme.minAutoScalePercent}
                        onChange={(e) => updateField('minAutoScalePercent', Number(e.target.value))}
                        className="w-full accent-[#E91E8C] cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* Page Margins (mm) */}
                <div>
                  <label className="block font-bold text-slate-800 mb-2">
                    Print & PDF Page Margins (mm)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {(
                      [
                        ['marginTopMm', 'Top'],
                        ['marginRightMm', 'Right'],
                        ['marginBottomMm', 'Bottom'],
                        ['marginLeftMm', 'Left'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">{label}</span>
                        <input
                          type="number"
                          min={0}
                          max={35}
                          value={invoiceTheme[key]}
                          onChange={(e) => updateField(key, Math.max(0, Math.min(35, Number(e.target.value) || 0)))}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 tabular-nums"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2: LOGO & BRAND HEADER */}
            {subTab === 'branding' && (
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <span className="font-bold text-slate-800">Display Brand Logo on Invoice</span>
                  <input
                    type="checkbox"
                    checked={invoiceTheme.showLogo}
                    onChange={(e) => updateField('showLogo', e.target.checked)}
                    className="w-4 h-4 accent-[#E91E8C] rounded"
                  />
                </label>

                {invoiceTheme.showLogo && (
                  <div className="space-y-3 p-4 rounded-2xl border border-pink-100 bg-pink-50/20">
                    <label className="block font-bold text-slate-800">Invoice Logo Image</label>
                    <input
                      type="text"
                      value={invoiceTheme.logoUrl}
                      onChange={(e) => updateField('logoUrl', e.target.value)}
                      placeholder="Leave blank to use Global Logo or Brand SVG"
                      className="w-full px-3 py-2 rounded-xl border border-pink-200 bg-white font-mono text-[11px] outline-none focus:border-[#E91E8C]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openMediaPicker('invoice.logoUrl')}
                        className="px-3 py-2 rounded-xl bg-white border border-pink-200 text-[#E91E8C] font-bold flex items-center gap-1.5 hover:bg-pink-50 transition cursor-pointer"
                      >
                        <ImageIcon size={13} />
                        <span>Media Library</span>
                      </button>
                      <input
                        ref={logoUploadRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoDeviceUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isUploadingLogo}
                        onClick={() => logoUploadRef.current?.click()}
                        className="px-3 py-2 rounded-xl bg-[#E91E8C] text-white font-bold flex items-center gap-1.5 hover:bg-pink-600 transition cursor-pointer disabled:opacity-50"
                      >
                        {isUploadingLogo ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                        <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                      </button>
                      {invoiceTheme.logoUrl && (
                        <button
                          type="button"
                          onClick={() => updateField('logoUrl', '')}
                          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div>
                        <div className="flex justify-between font-bold text-slate-700 mb-1">
                          <span>Logo Size</span>
                          <span className="font-mono tabular-nums">{invoiceTheme.logoSizePx}px</span>
                        </div>
                        <input
                          type="range"
                          min={24}
                          max={96}
                          value={invoiceTheme.logoSizePx}
                          onChange={(e) => updateField('logoSizePx', Number(e.target.value))}
                          className="w-full accent-[#E91E8C]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Logo Shape</label>
                        <select
                          value={invoiceTheme.logoShape}
                          onChange={(e) => updateField('logoShape', e.target.value as InvoiceLogoShape)}
                          className="w-full px-2.5 py-1.5 rounded-xl border border-pink-200 bg-white font-semibold"
                        >
                          <option value="circle">Circle</option>
                          <option value="rounded">Rounded Square</option>
                          <option value="square">Sharp Square</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Header Style</label>
                    <select
                      value={invoiceTheme.headerStyle}
                      onChange={(e) => updateField('headerStyle', e.target.value as InvoiceHeaderStyle)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                    >
                      <option value="solid">Solid Brand Banner</option>
                      <option value="tinted">Soft Tinted Banner</option>
                      <option value="minimal">Minimal Ink-Saver</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Header Layout</label>
                    <select
                      value={invoiceTheme.headerLayout}
                      onChange={(e) => updateField('headerLayout', e.target.value as InvoiceHeaderLayout)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                    >
                      <option value="split">Left Brand / Right ID</option>
                      <option value="centered">Centered Stack</option>
                      <option value="compact">Compact Row</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Store Display Name</label>
                    <input
                      type="text"
                      value={invoiceTheme.storeName}
                      onChange={(e) => updateField('storeName', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Document Title Badge</label>
                    <input
                      type="text"
                      value={invoiceTheme.documentTitle}
                      onChange={(e) => updateField('documentTitle', e.target.value)}
                      placeholder="Cash Invoice / Tax Invoice"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Header Tagline / Branch</label>
                  <input
                    type="text"
                    value={invoiceTheme.storeTagline}
                    onChange={(e) => updateField('storeTagline', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>

                <div className="space-y-2.5 pt-1 border-t border-slate-100">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-slate-800">Show Store Address & Phone in Header</span>
                    <input
                      type="checkbox"
                      checked={invoiceTheme.showStoreContactInHeader}
                      onChange={(e) => updateField('showStoreContactInHeader', e.target.checked)}
                      className="w-4 h-4 accent-[#E91E8C] rounded"
                    />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={invoiceTheme.storePhone}
                      onChange={(e) => updateField('storePhone', e.target.value)}
                      placeholder="Store Phone"
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                    />
                    <input
                      type="text"
                      value={invoiceTheme.storeEmail}
                      onChange={(e) => updateField('storeEmail', e.target.value)}
                      placeholder="Store Email"
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                    />
                  </div>
                  <input
                    type="text"
                    value={invoiceTheme.storeAddress}
                    onChange={(e) => updateField('storeAddress', e.target.value)}
                    placeholder="Store Branch Address"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </div>
              </div>
            )}

            {/* SUBTAB 3: TYPOGRAPHY & ELEMENT TEXT SIZES */}
            {subTab === 'typography' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Invoice Font Family</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['sans', 'Modern Sans'],
                        ['serif', 'Editorial Serif'],
                        ['mono', 'Receipt Mono'],
                      ] as Array<[InvoiceFontFamily, string]>
                    ).map(([fontId, fontLabel]) => (
                      <button
                        key={fontId}
                        type="button"
                        onClick={() => updateField('fontFamily', fontId)}
                        className={`py-2 px-2.5 rounded-xl border font-bold text-[11px] transition cursor-pointer ${
                          invoiceTheme.fontFamily === fontId
                            ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-pink-200'
                        }`}
                      >
                        {fontLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {(
                    [
                      ['brandNameSizePx', 'Store Brand Name', 11, 28],
                      ['taglineSizePx', 'Store Tagline', 8, 16],
                      ['titleSizePx', 'Invoice Title Badge', 8, 16],
                      ['metaSizePx', 'Customer & Order Info', 8, 16],
                      ['tableHeaderSizePx', 'Table Column Headers', 8, 15],
                      ['tableBodySizePx', 'Product Line Text', 8, 16],
                      ['rowVerticalPaddingPx', 'Product Row Spacing', 3, 18],
                      ['totalsSizePx', 'Subtotal / Delivery Lines', 8, 16],
                      ['grandTotalSizePx', 'Grand Total Emphasis', 11, 24],
                      ['footerSizePx', 'Footer & Terms Text', 8, 15],
                    ] as Array<[keyof InvoiceThemeSettings, string, number, number]>
                  ).map(([key, label, min, max]) => {
                    const val = Number(invoiceTheme[key] || min);
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={min}
                              max={max}
                              value={val}
                              onChange={(e) =>
                                updateField(
                                  key,
                                  Math.max(min, Math.min(max, Number(e.target.value) || min)) as any
                                )
                              }
                              className="w-14 px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-center font-bold text-slate-900 tabular-nums"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">px</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          value={val}
                          onChange={(e) => updateField(key, Number(e.target.value) as any)}
                          className="w-full accent-[#E91E8C] cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUBTAB 4: COLORS & BORDERS */}
            {subTab === 'colors' && (
              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-2">Quick Color Palettes</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INVOICE_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() =>
                          onChange((prev) => ({
                            ...prev,
                            primaryColor: preset.primary,
                            accentColor: preset.accent,
                            tableHeaderBgColor: preset.tableBg,
                            borderColor: preset.border,
                          }))
                        }
                        className="p-2.5 rounded-xl border border-slate-200 bg-white hover:border-pink-300 flex items-center gap-2 text-left transition cursor-pointer"
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <span className="text-[11px] font-bold text-slate-700 truncate">
                          {preset.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {(
                    [
                      ['primaryColor', 'Primary Header Color'],
                      ['accentColor', 'Accent & Labels Color'],
                      ['headerTextColor', 'Header Text Color'],
                      ['tableHeaderBgColor', 'Table & Card Tint'],
                      ['borderColor', 'Divider & Border Color'],
                      ['backgroundColor', 'Paper Background'],
                      ['textColor', 'Primary Text Color'],
                      ['mutedTextColor', 'Secondary Text Color'],
                    ] as Array<[keyof InvoiceThemeSettings, string]>
                  ).map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <label className="block font-bold text-slate-700 text-[11px]">{label}</label>
                      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50">
                        <input
                          type="color"
                          value={String(invoiceTheme[key] || '#000000')}
                          onChange={(e) => updateField(key, e.target.value as any)}
                          className="w-7 h-7 rounded-lg cursor-pointer border-none bg-transparent"
                        />
                        <input
                          type="text"
                          value={String(invoiceTheme[key] || '')}
                          onChange={(e) => updateField(key, e.target.value as any)}
                          className="flex-1 bg-transparent font-mono text-[11px] font-bold text-slate-800 outline-none uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">Table & Section Border Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['grid', 'Crisp Grid'],
                        ['minimal', 'Clean Minimal'],
                        ['dashed', 'Receipt Dashed'],
                      ] as Array<[InvoiceBorderStyle, string]>
                    ).map(([styleId, label]) => (
                      <button
                        key={styleId}
                        type="button"
                        onClick={() => updateField('borderStyle', styleId)}
                        className={`py-2 px-2.5 rounded-xl border font-bold text-[11px] transition cursor-pointer ${
                          invoiceTheme.borderStyle === styleId
                            ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-pink-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 5: SECTIONS, QR & FOOTER */}
            {subTab === 'sections' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(
                    [
                      ['showOrderSourceBadge', 'Order Source (WEB/POS/WS)'],
                      ['showDateTime', 'Date & Timestamp'],
                      ['showCustomerPhone', 'Customer Phone'],
                      ['showCustomerAddress', 'Delivery Address'],
                      ['showCourierTracking', 'Courier Steadfast Block'],
                      ['showPaymentStatus', 'Payment & Status Badge'],
                      ['showProductSerialNumbers', 'Serial # Column'],
                      ['showProductSku', 'Product SKU / Barcode'],
                      ['showDeliveryCharge', 'Delivery Charge Line'],
                      ['showDiscountBreakdown', 'Discount / Coupon Line'],
                    ] as Array<[keyof InvoiceThemeSettings, string]>
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer hover:bg-white transition"
                    >
                      <span className="font-semibold text-slate-700 text-[11px]">{label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(invoiceTheme[key])}
                        onChange={(e) => updateField(key, e.target.checked as any)}
                        className="w-4 h-4 accent-[#E91E8C] rounded shrink-0"
                      />
                    </label>
                  ))}
                </div>

                {/* QR Tracking */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-slate-800">Courier Tracking QR Code</span>
                    <input
                      type="checkbox"
                      checked={invoiceTheme.showQrCode}
                      onChange={(e) => updateField('showQrCode', e.target.checked)}
                      className="w-4 h-4 accent-[#E91E8C] rounded"
                    />
                  </label>
                  {invoiceTheme.showQrCode && (
                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>QR Code Size</span>
                        <span className="font-mono tabular-nums">{invoiceTheme.qrSizePx}px</span>
                      </div>
                      <input
                        type="range"
                        min={48}
                        max={120}
                        value={invoiceTheme.qrSizePx}
                        onChange={(e) => updateField('qrSizePx', Number(e.target.value))}
                        className="w-full accent-[#E91E8C]"
                      />
                    </div>
                  )}
                </div>

                {/* Signature Lines */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-slate-800">Show Signature Lines</span>
                    <input
                      type="checkbox"
                      checked={invoiceTheme.showSignatureLine}
                      onChange={(e) => updateField('showSignatureLine', e.target.checked)}
                      className="w-4 h-4 accent-[#E91E8C] rounded"
                    />
                  </label>
                  {invoiceTheme.showSignatureLine && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={invoiceTheme.signatureLeftLabel}
                        onChange={(e) => updateField('signatureLeftLabel', e.target.value)}
                        placeholder="Customer Signature"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px]"
                      />
                      <input
                        type="text"
                        value={invoiceTheme.signatureRightLabel}
                        onChange={(e) => updateField('signatureRightLabel', e.target.value)}
                        placeholder="Authorized Signature"
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-[11px]"
                      />
                    </div>
                  )}
                </div>

                {/* Footer Copy */}
                <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-bold text-slate-800">Show Footer Note & Terms</span>
                    <input
                      type="checkbox"
                      checked={invoiceTheme.showTermsFooter}
                      onChange={(e) => updateField('showTermsFooter', e.target.checked)}
                      className="w-4 h-4 accent-[#E91E8C] rounded"
                    />
                  </label>
                  {invoiceTheme.showTermsFooter && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Thank You Line
                        </label>
                        <input
                          type="text"
                          value={invoiceTheme.footerThankYouText}
                          onChange={(e) => updateField('footerThankYouText', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">
                          Exchange / Return Policy Line
                        </label>
                        <textarea
                          rows={2}
                          value={invoiceTheme.footerTermsText}
                          onChange={(e) => updateField('footerTermsText', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Interactive Live Sample Invoice Preview */}
        <div className="xl:col-span-7 space-y-3 xl:sticky xl:top-4">
          {/* Preview Simulator Toolbar */}
          <div className="bg-white p-4 rounded-[24px] border border-pink-100 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layout size={15} className="text-[#E91E8C]" />
                <span className="text-xs font-black text-slate-900">Live Sample Preview</span>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {paperMetrics.spec.shortLabel}{' '}
                  {paperMetrics.isThermal ? '' : invoiceTheme.orientation} ·{' '}
                  {paperMetrics.widthMm}×{paperMetrics.heightMm}mm
                </span>
              </div>

              {/* Order Source Type Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                {(
                  [
                    ['website', 'Website'],
                    ['pos', 'POS'],
                    ['wholesale', 'Wholesale'],
                  ] as Array<[SampleScenario, string]>
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSampleScenario(key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      sampleScenario === key
                        ? 'bg-white text-[#C81E78] shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Item Count Tester & Auto-Scale Indicator */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700">
                    Test Sample Product Count:{' '}
                    <span className="font-mono font-black text-slate-900 tabular-nums">
                      {sampleItemCount} items
                    </span>
                  </span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      autoScaleInfo.isAutoScaled ? 'text-[#C81E78]' : 'text-emerald-700'
                    }`}
                  >
                    {autoScaleInfo.isAutoScaled
                      ? `Auto-Scaled ${Math.round(autoScaleInfo.scale * 100)}% (>${autoScaleInfo.productsPerPage}/pg)`
                      : `Full 100% Scale (≤${autoScaleInfo.productsPerPage}/pg)`}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  value={sampleItemCount}
                  onChange={(e) => setSampleItemCount(Number(e.target.value))}
                  className="w-full accent-[#E91E8C] cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSampleItemCount(3)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  3 items
                </button>
                <button
                  type="button"
                  onClick={() => setSampleItemCount(invoiceTheme.productsPerPage)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-700 cursor-pointer"
                >
                  Limit ({invoiceTheme.productsPerPage})
                </button>
                <button
                  type="button"
                  onClick={() => setSampleItemCount(Math.min(24, invoiceTheme.productsPerPage + 6))}
                  className="px-2.5 py-1.5 rounded-lg border border-pink-200 bg-pink-50 hover:bg-pink-100 text-[11px] font-bold text-[#C81E78] cursor-pointer"
                >
                  Overflow ({Math.min(24, invoiceTheme.productsPerPage + 6)})
                </button>
              </div>
            </div>
          </div>

          {/* Paper Desk Mat Viewport */}
          <div
            ref={previewContainerRef}
            className="bg-slate-200/70 rounded-[24px] border border-slate-300/70 p-3 sm:p-5 overflow-hidden flex justify-center min-h-[420px]"
          >
            <div
              style={{
                width: `${Math.round(paperMetrics.renderWidthPx * previewZoomScale)}px`,
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: `${paperMetrics.renderWidthPx}px`,
                  transform: `scale(${previewZoomScale})`,
                  transformOrigin: 'top center',
                  marginBottom:
                    previewZoomScale < 1
                      ? `-${Math.round((1 - previewZoomScale) * 200)}px`
                      : '0px',
                }}
              >
                <InvoiceDocument
                  order={sampleOrder}
                  themeOverride={invoiceTheme}
                  idOverride="invoice-theme-editor-preview"
                  exactPaperWidth={true}
                  className="shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceThemeEditor;
