import React, { useState } from 'react';
import { WholesaleCustomer } from '../types';
import { wholesaleService, isValidPhoneNumber, isValidUrl, formatUrl } from '../services/wholesaleService';
import { 
  X, Building2, User, Phone, Mail, MapPin, Globe, Facebook, 
  Instagram, MessageSquare, CreditCard, ShieldCheck, Loader2, 
  CheckCircle2, AlertCircle, Save, Plus, Store, Sparkles
} from 'lucide-react';

interface AdminAddWholesaleCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerAdded: (newCustomer: WholesaleCustomer, openOrderModal?: boolean) => void;
}

export function AdminAddWholesaleCustomerModal({
  isOpen,
  onClose,
  onCustomerAdded
}: AdminAddWholesaleCustomerModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'business' | 'financial'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    businessName: '',
    pageName: '',
    businessType: 'Retailer',
    location: 'Dhaka',
    businessAddress: '',
    facebookPageUrl: '',
    instagramUrl: '',
    whatsappNumber: '',
    websiteUrl: '',
    tradeLicenseNumber: '',
    creditLimit: 50000,
    status: 'active' as 'active' | 'pending' | 'suspended',
    wholesaleAccess: true,
    tier: 'standard',
    notes: ''
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'creditLimit') {
      setFormData(prev => ({ ...prev, [name]: Number(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (createOrderDirectly: boolean = false) => {
    setErrorMessage(null);

    // Validation
    if (!formData.name.trim()) {
      setActiveTab('basic');
      setErrorMessage('Customer full name is required.');
      return;
    }

    if (!formData.phone.trim()) {
      setActiveTab('basic');
      setErrorMessage('Primary contact phone number is required.');
      return;
    }

    if (!isValidPhoneNumber(formData.phone.trim())) {
      setActiveTab('basic');
      setErrorMessage('Please enter a valid phone number (e.g., 01712345678 or +8801712345678).');
      return;
    }

    if (formData.altPhone && !isValidPhoneNumber(formData.altPhone.trim())) {
      setActiveTab('basic');
      setErrorMessage('Alternative contact phone number format is invalid.');
      return;
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setActiveTab('basic');
        setErrorMessage('Please enter a valid email address.');
        return;
      }
    }

    if (formData.facebookPageUrl && !isValidUrl(formData.facebookPageUrl.trim())) {
      setActiveTab('business');
      setErrorMessage('Facebook Page link format is invalid.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newCustomer = await wholesaleService.adminCreateWholesaleCustomer({
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        altPhone: formData.altPhone.trim(),
        email: formData.email.trim(),
        businessName: formData.businessName.trim() || formData.name.trim(),
        storeName: formData.businessName.trim() || formData.name.trim(),
        pageName: formData.pageName.trim(),
        businessType: formData.businessType,
        location: formData.location.trim(),
        businessAddress: formData.businessAddress.trim(),
        address: formData.businessAddress.trim(),
        facebookPageUrl: formData.facebookPageUrl ? formatUrl(formData.facebookPageUrl) : '',
        instagramUrl: formData.instagramUrl ? formatUrl(formData.instagramUrl) : '',
        whatsappNumber: formData.whatsappNumber.trim() || formData.phone.trim(),
        websiteUrl: formData.websiteUrl ? formatUrl(formData.websiteUrl) : '',
        tradeLicenseNumber: formData.tradeLicenseNumber.trim(),
        creditLimit: formData.creditLimit,
        status: formData.status,
        wholesaleAccess: formData.wholesaleAccess,
        tier: formData.tier,
        notes: formData.notes.trim()
      });

      // Reset form
      setFormData({
        name: '',
        phone: '',
        altPhone: '',
        email: '',
        businessName: '',
        pageName: '',
        businessType: 'Retailer',
        location: 'Dhaka',
        businessAddress: '',
        facebookPageUrl: '',
        instagramUrl: '',
        whatsappNumber: '',
        websiteUrl: '',
        tradeLicenseNumber: '',
        creditLimit: 50000,
        status: 'active',
        wholesaleAccess: true,
        tier: 'standard',
        notes: ''
      });

      onCustomerAdded(newCustomer, createOrderDirectly);
      onClose();
    } catch (err: any) {
      console.error('[AdminAddWholesaleCustomerModal] Error:', err);
      setErrorMessage(err.message || 'Failed to create wholesale customer profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Store size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Add Wholesale Partner</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-extrabold uppercase px-2 py-0.5 rounded-full">
                  B2B Manual
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Register a new wholesale customer profile, shop details, and credit terms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 px-6 bg-slate-50/50 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'basic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={14} />
            <span>1. Contact Info</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'business'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={14} />
            <span>2. Store &amp; Social</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'financial'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard size={14} />
            <span>3. Terms &amp; Credit</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab Form Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Customer Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Primary Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alternate Phone Number
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="tel"
                      name="altPhone"
                      value={formData.altPhone}
                      onChange={handleChange}
                      placeholder="e.g. 018XXXXXXXX (Optional)"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="partner@example.com (Optional)"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    If provided, customer can also log in using Google Auth with this email.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Business / Store / Page Name
                  </label>
                  <div className="relative">
                    <Building2 size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Glam Glow Cosmetics"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Business Model / Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                  >
                    <option value="Retailer">Retail Cosmetics Shop</option>
                    <option value="Online Reseller">Facebook / Instagram Page Reseller</option>
                    <option value="Salon & Spa">Beauty Salon / Parlour / Spa</option>
                    <option value="Wholesaler">Sub-Wholesaler / Distributor</option>
                    <option value="Pharmacy / Clinic">Dermatology Clinic / Pharmacy</option>
                    <option value="Other">Other Business</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    District / City
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Dhaka, Chittagong, Sylhet"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                    />
                  </div>
                  {/* Quick District Presets */}
                  <div className="flex gap-1.5 mt-1.5">
                    {['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi'].map(dist => (
                      <button
                        key={dist}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, location: dist }))}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-bold transition cursor-pointer"
                      >
                        {dist}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Facebook Page Link / Username
                  </label>
                  <div className="relative">
                    <Facebook size={15} className="absolute left-3.5 top-3 text-blue-600" />
                    <input
                      type="text"
                      name="facebookPageUrl"
                      value={formData.facebookPageUrl}
                      onChange={handleChange}
                      placeholder="https://facebook.com/glamglowbd"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Store / Delivery Address
                </label>
                <textarea
                  name="businessAddress"
                  rows={2}
                  value={formData.businessAddress}
                  onChange={handleChange}
                  placeholder="Shop #12, Level 2, Shimanto Square, Dhanmondi, Dhaka"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Credit Limit (BDT)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-400">৳</span>
                    <input
                      type="number"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleChange}
                      min={0}
                      step={5000}
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Default ৳50,000 credit limit for approved partners.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Account Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                  >
                    <option value="active">Active (Full Wholesale Access)</option>
                    <option value="pending">Pending Approval</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Wholesale Tier
                  </label>
                  <select
                    name="tier"
                    value={formData.tier}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition"
                  >
                    <option value="standard">Standard Wholesale (Tier 1 &amp; Tier 2)</option>
                    <option value="silver">Silver Partner</option>
                    <option value="gold">Gold Partner</option>
                    <option value="vip">VIP Distributor</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      name="wholesaleAccess"
                      checked={formData.wholesaleAccess}
                      onChange={handleChange}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-extrabold text-slate-800">
                      Grant Instant Wholesale Access
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Internal Administrative Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. Store visit done; verified Facebook page with 45k followers; payment terms 7 days."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-indigo-600 focus:bg-white transition leading-relaxed"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="w-full sm:w-auto flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={14} />
              <span>Save &amp; Create Order</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Add Wholesale Customer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
