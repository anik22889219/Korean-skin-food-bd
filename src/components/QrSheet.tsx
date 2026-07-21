import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Product } from '../types';
import { 
  Printer, 
  CheckSquare, 
  Square, 
  ArrowLeft, 
  Search, 
  Grid,
  Filter,
  Eye,
  Info
} from 'lucide-react';

interface QrSheetProps {
  onBack: () => void;
  products: Product[];
}

export default function QrSheet({ onBack, products }: QrSheetProps) {
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    products.map(p => p.id) // Select all by default
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // List of unique categories for filtering
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filter products based on search query and category
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.nameBN.includes(searchQuery) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      // Unselect all currently filtered
      const filteredIds = filteredProducts.map(p => p.id);
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select all currently filtered
      const filteredIds = filteredProducts.map(p => p.id);
      setSelectedProductIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Get only selected products to render the QR codes
  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 print:p-0">
      
      {/* HEADER SECTION (HIDDEN ON PRINT) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-pink-100 pb-5 print:hidden">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-xl cursor-pointer transition shadow-sm"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Grid className="text-[#E91E8C]" size={24} />
              <span>In-Store QR Sheet Generator</span>
            </h2>
            <p className="text-xs text-pink-600 font-semibold tracking-wider uppercase mt-1">
              Printable Product QR Codes and Price Tags
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="px-4 py-2 bg-white border border-pink-200 hover:bg-pink-50 text-pink-700 rounded-xl text-xs font-bold cursor-pointer transition shadow-sm flex items-center gap-1.5"
          >
            <Eye size={14} />
            <span>{isPreviewMode ? "Show Product Checklist" : "Preview QR Sheet"}</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={selectedProducts.length === 0}
            className="px-6 py-2 bg-gradient-to-r from-[#FF4B91] to-[#E91E8C] text-white rounded-xl text-xs font-bold cursor-pointer transition disabled:opacity-40 shadow-md shadow-pink-100 flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Selected ({selectedProducts.length})</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS (HIDDEN ON PRINT AND PREVIEW MODE) */}
      {!isPreviewMode && (
        <div className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center print:hidden">
          
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, brand, or ingredients..."
              className="w-full bg-pink-50/10 text-gray-800 text-xs pl-10 pr-4 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-2">
            <Filter size={15} className="text-pink-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-pink-50/10 text-gray-800 text-xs px-3 py-2.5 rounded-xl border border-pink-100 outline-none focus:border-[#E91E8C]"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 text-right">
            <button
              onClick={handleToggleSelectAll}
              className="text-xs text-pink-700 hover:text-pink-900 font-bold flex items-center justify-end gap-1.5 w-full cursor-pointer"
            >
              {selectedProductIds.length === filteredProducts.length ? (
                <>
                  <Square size={14} />
                  <span>Deselect Filtered</span>
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  <span>Select Filtered</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}

      {/* DUAL WORKSPACE VIEWS */}
      {isPreviewMode ? (
        // Renders only the print preview sheets directly on screen for visual alignment
        <div className="bg-pink-50/20 p-8 rounded-[32px] border border-dashed border-pink-200">
          <div className="text-center text-xs text-gray-500 mb-6 print:hidden">
            <Info size={14} className="inline mr-1 text-[#E91E8C]" />
            <span>This is how the QR code tags sheet will print. Click <strong>"Print Selected"</strong> to trigger paper layout.</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white p-12 rounded-2xl shadow-inner max-w-5xl mx-auto">
            {selectedProducts.map(p => {
              const itemUrl = `${window.location.origin}/pos/product/${p.id}`;
              return (
                <div 
                  key={p.id}
                  className="border border-gray-200 p-4 rounded-xl text-center flex flex-col items-center justify-between space-y-3 bg-white hover:border-pink-300 transition"
                >
                  <div className="p-2 border border-pink-50 rounded-lg shadow-sm">
                    <QRCodeSVG value={itemUrl} size={110} fgColor="#000000" level="Q" />
                  </div>
                  <div className="space-y-1 w-full text-left">
                    <span className="text-[8px] font-bold text-gray-400 tracking-wide block uppercase font-sans">{p.brand}</span>
                    <h4 className="text-[10px] font-bold text-gray-800 leading-tight truncate font-sans">{p.name}</h4>
                    <h5 className="text-[9px] font-semibold text-gray-500 truncate font-sans">{p.nameBN}</h5>
                    <div className="border-t border-dashed border-gray-100 pt-1.5 mt-1.5 flex justify-between items-center text-[10px] font-mono">
                      <span className="text-gray-400">Barcode:</span>
                      <strong className="text-gray-900">{p.barcode || p.id}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-extrabold mt-1">
                      <span className="text-pink-600">Price:</span>
                      <strong className="text-[#E91E8C]">৳{p.discountPrice || p.price}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // GRID CHECKLIST OF PRODUCTS WITH DETAILED DATA
        <div className="bg-white rounded-[32px] border border-pink-100 shadow-sm overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pink-50/50 text-gray-700 font-extrabold border-b border-pink-100">
                  <th className="py-4 px-6 w-12 text-center">Print</th>
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6">Category & Brand</th>
                  <th className="py-4 px-6 text-center">Current Stock</th>
                  <th className="py-4 px-6 text-right">Price (BDT)</th>
                  <th className="py-4 px-6 text-center">QR Scan Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50 text-gray-700">
                {filteredProducts.map(p => {
                  const isChecked = selectedProductIds.includes(p.id);
                  return (
                    <tr 
                      key={p.id}
                      className={`hover:bg-pink-50/10 transition cursor-pointer ${isChecked ? 'bg-pink-50/5' : ''}`}
                      onClick={() => handleToggleSelect(p.id)}
                    >
                      <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleToggleSelect(p.id)}
                          className="text-pink-600 hover:text-pink-800 transition cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare size={18} className="text-[#E91E8C]" />
                          ) : (
                            <Square size={18} className="text-gray-300" />
                          )}
                        </button>
                      </td>
                      
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={p.image} 
                            alt={p.name} 
                            className="w-10 h-10 object-cover rounded-xl shadow-sm border border-pink-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="max-w-md">
                            <h4 className="font-bold text-gray-900 leading-snug">{p.name}</h4>
                            <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{p.nameBN}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-[10px] uppercase font-extrabold text-pink-600 block">{p.brand}</span>
                        <span className="text-[11px] text-gray-500 font-medium">{p.category}</span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold font-mono ${p.stock <= 5 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-pink-50 text-pink-700 border border-pink-100'}`}>
                          {p.stock} units
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right font-mono font-bold">
                        {p.discountPrice ? (
                          <div>
                            <span className="line-through text-gray-400 mr-1.5 text-[10px]">৳{p.price}</span>
                            <span className="text-[#E91E8C] font-extrabold">৳{p.discountPrice}</span>
                          </div>
                        ) : (
                          <span className="text-gray-800">৳{p.price}</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center font-mono text-[9px] text-gray-400 max-w-xs truncate">
                        {`/pos/product/${p.id}`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINT-ONLY CSS AND CONTENT BLOCK */}
      <div className="hidden print:block print:bg-white print:p-0 print:m-0">
        <style>{`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            /* Grid layout for A4 label printing */
            .print-grid {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 15mm !important;
              padding: 10mm !important;
            }
            .print-label {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              border: 0.5px solid #dddddd !important;
              padding: 5mm !important;
              border-radius: 4px !important;
              text-align: center !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: space-between !important;
            }
          }
        `}</style>

        <div className="print-grid">
          {selectedProducts.map(p => {
            const itemUrl = `${window.location.origin}/pos/product/${p.id}`;
            return (
              <div key={p.id} className="print-label">
                <div style={{ padding: '2mm', marginBottom: '3mm' }}>
                  <QRCodeSVG value={itemUrl} size={110} fgColor="#000000" level="H" />
                </div>
                <div style={{ width: '100%', textAlign: 'left', fontFamily: 'sans-serif' }}>
                  <span style={{ fontSize: '7pt', fontWeight: 'bold', color: '#666666', textTransform: 'uppercase', display: 'block' }}>
                    {p.brand}
                  </span>
                  <h4 style={{ fontSize: '9pt', fontWeight: 'bold', margin: '1mm 0 0.5mm 0', color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </h4>
                  <h5 style={{ fontSize: '8pt', color: '#555555', margin: '0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.nameBN}
                  </h5>
                  <div style={{ borderTop: '0.5px dashed #cccccc', marginTop: '2mm', paddingTop: '1.5mm', fontSize: '8pt', color: '#444444', display: 'flex', justifyContent: 'between' }}>
                    <span style={{ color: '#888888' }}>ID: {p.id}</span>
                  </div>
                  <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#E91E8C', display: 'flex', justifyContent: 'space-between', marginTop: '1mm' }}>
                    <span>Price:</span>
                    <strong>৳{p.discountPrice || p.price}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
