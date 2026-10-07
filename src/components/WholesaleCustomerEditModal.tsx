import React, { useState, useEffect } from 'react';
import { WholesaleCustomer } from '../types';
import { wholesaleService, isValidPhoneNumber, isValidUrl, formatUrl } from '../services/wholesaleService';
import { 
  X, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Globe, 
  Facebook, 
  Instagram, 
  MessageSquare, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Save,
  HelpCircle
} from 'lucide-react';

interface WholesaleCustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: WholesaleCustomer | null;
  onCustomerUpdated: (updatedCustomer: WholesaleCustomer) => void;
}

export function WholesaleCustomerEditModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated
}: WholesaleCustomerEditModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'business' | 'financial'>('basic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    altPhone: '',
    email: '',
    businessName: '',
    pageName: '',
    businessType: 'Retailer',
    location: '',
    businessAddress: '',
    facebookPageUrl: '',
    instagramUrl: '',
    whatsappNumber: '',
    websiteUrl: '',
    tradeLicenseNumber: '',
    creditLimit: 0,
    status: 'active' as 'active' | 'pending' | 'suspended',
    wholesaleAccess: true,
    tier: 'standard',
    notes: ''
  });

  // Load customer data when opened
  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name || '',
        phone: customer.phone || '',
        altPhone: customer.altPhone || '',
        email: customer.email || '',
        businessName: customer.businessName || customer.storeName || '',
        pageName: customer.pageName || '',
        businessType: customer.businessType || 'Retailer',
        location: customer.location || '',
        businessAddress: customer.businessAddress || customer.address || '',
        facebookPageUrl: customer.facebookPageUrl || '',
        instagramUrl: customer.instagramUrl || '',
        whatsappNumber: customer.whatsappNumber || '',
        websiteUrl: customer.websiteUrl || '',
        tradeLicenseNumber: customer.tradeLicenseNumber || '',
        creditLimit: Number(customer.creditLimit || 0),
        status: customer.status || 'active',
        wholesaleAccess: customer.wholesaleAccess !== false,
        tier: customer.tier || 'standard',
        notes: customer.notes || ''
      });
      setErrorMessage(null);
      setSuccessMessage(null);
      setActiveTab('basic');
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'creditLimit') {
      setFormData(prev => ({ ...prev, [name]: Math.max(0, Number(value) || 0) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToggleAccess = (enabled: boolean) => {
    setFormData(prev => ({ ...prev, wholesaleAccess: enabled }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.id) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Validation
    if (!formData.name.trim()) {
      setErrorMessage('Full name is required.');
      setActiveTab('basic');
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Primary contact phone is required.');
      setActiveTab('basic');
      return;
    }
    if (!isValidPhoneNumber(formData.phone.trim())) {
      setErrorMessage('Invalid primary phone number format.');
      setActiveTab('basic');
      return;
    }
    if (formData.altPhone && !isValidPhoneNumber(formData.altPhone.trim())) {
      setErrorMessage('Invalid alternative phone number format.');
      setActiveTab('basic');
      return;
    }
    if (formData.facebookPageUrl && !isValidUrl(formData.facebookPageUrl.trim())) {
      setErrorMessage('Invalid Facebook page URL.');
      setActiveTab('business');
      return;
    }
    if (formData.instagramUrl && !isValidUrl(formData.instagramUrl.trim())) {
      setErrorMessage('Invalid Instagram URL.');
      setActiveTab('business');
      return;
    }
    if (formData.websiteUrl && !isValidUrl(formData.websiteUrl.trim())) {
      setErrorMessage('Invalid website URL.');
      setActiveTab('business');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<WholesaleCustomer> = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        altPhone: formData.altPhone.trim(),
        email: formData.email.trim(),
        businessName: formData.businessName.trim(),
        storeName: formData.businessName.trim(),
        pageName: formData.pageName.trim(),
        businessType: formData.businessType,
        location: formData.location.trim(),
        address: formData.businessAddress.trim(),
        businessAddress: formData.businessAddress.trim(),
        facebookPageUrl: formData.facebookPageUrl ? formatUrl(formData.facebookPageUrl) : '',
        instagramUrl: formData.instagramUrl ? formatUrl(formData.instagramUrl) : '',
        whatsappNumber: formData.whatsappNumber.trim(),
        websiteUrl: formData.websiteUrl ? formatUrl(formData.websiteUrl) : '',
        tradeLicenseNumber: formData.tradeLicenseNumber.trim(),
        creditLimit: Number(formData.creditLimit) || 0,
        status: formData.status,
        wholesaleAccess: formData.wholesaleAccess,
        tier: formData.tier,
        notes: formData.notes.trim()
      };

      await wholesaleService.adminUpdateWholesaleCustomer(customer.id, payload);

      const updatedObj: WholesaleCustomer = {
        ...customer,
        ...payload,
        updatedAt: new Date().toISOString()
      };

      setSuccessMessage('Wholesaler profile updated successfully!');
      onCustomerUpdated(updatedObj);

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update wholesaler profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  Edit Wholesaler Profile
                </h2>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  formData.status === 'active' 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : formData.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {formData.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {customer.businessName || customer.name} · ID: <span className="font-mono">{customer.id.slice(0, 10)}...</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'basic'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <User size={16} />
            Contact & Owner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('business')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'business'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 size={16} />
            Business & Channels
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'financial'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CreditCard size={16} />
            Status & Credit Rules
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Alerts */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-sm">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: Contact & Owner Info */}
          {activeTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Owner / Contact Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Tanvir Ahmed"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Primary Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 01712345678"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Alternative Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <MessageSquare size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="altPhone"
                      value={formData.altPhone}
                      onChange={handleChange}
                      placeholder="e.g. 01812345678"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. wholesale@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  City / Location Region
                </label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="e.g. Dhanmondi, Dhaka"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Complete Physical / Delivery Address
                </label>
                <textarea
                  name="businessAddress"
                  rows={3}
                  value={formData.businessAddress}
                  onChange={handleChange}
                  placeholder="House #, Road #, Area, District..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Business & Channels */}
          {activeTab === 'business' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Business / Store Name
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      placeholder="e.g. Glow K-Beauty Shop"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Facebook Page Name / Brand Tag
                  </label>
                  <div className="relative">
                    <Facebook size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="pageName"
                      value={formData.pageName}
                      onChange={handleChange}
                      placeholder="e.g. Glow Cosmetics BD"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                  >
                    <option value="Retailer">Retail Store / Physical Outlet</option>
                    <option value="Online Reseller">Online / Facebook F-Commerce Page</option>
                    <option value="Salon / Spa">Salon / Beauty Spa</option>
                    <option value="Wholesaler / Distributor">Wholesale Sub-Distributor</option>
                    <option value="Super Shop">Super Shop / Chain Outlet</option>
                    <option value="Dermatology / Clinic">Dermatology / Aesthetic Clinic</option>
                    <option value="Other">Other Business Format</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Trade License / TIN (Optional)
                  </label>
                  <div className="relative">
                    <FileText size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="tradeLicenseNumber"
                      value={formData.tradeLicenseNumber}
                      onChange={handleChange}
                      placeholder="e.g. TRAD/DNCC/123456/2026"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Social Channels */}
              <div className="pt-2 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Online Links & Handles
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Facebook Page URL
                    </label>
                    <div className="relative">
                      <Facebook size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
                      <input
                        type="text"
                        name="facebookPageUrl"
                        value={formData.facebookPageUrl}
                        onChange={handleChange}
                        placeholder="https://facebook.com/glowcosmeticsbd"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Instagram Page / Handle
                      </label>
                      <div className="relative">
                        <Instagram size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-600" />
                        <input
                          type="text"
                          name="instagramUrl"
                          value={formData.instagramUrl}
                          onChange={handleChange}
                          placeholder="https://instagram.com/glowcosmetics"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Official Website
                      </label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          name="websiteUrl"
                          value={formData.websiteUrl}
                          onChange={handleChange}
                          placeholder="https://glowshop.com.bd"
                          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Financial & Status Controls (Admin privileged) */}
          {activeTab === 'financial' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Access & Status */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-slate-900 block">Wholesale Catalog Access</span>
                    <span className="text-xs text-slate-500">Allow this user to access the wholesale pricing and ordering portal</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAccess(!formData.wholesaleAccess)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.wholesaleAccess ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formData.wholesaleAccess ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Account Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    >
                      <option value="active">Active (Full access)</option>
                      <option value="pending">Pending Verification</option>
                      <option value="suspended">Suspended / Blocked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                      Pricing Tier
                    </label>
                    <select
                      name="tier"
                      value={formData.tier}
                      onChange={handleChange}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all"
                    >
                      <option value="standard">Standard Tier (1-49 vs 50+)</option>
                      <option value="silver">Silver Tier Partner</option>
                      <option value="gold">Gold Tier VIP</option>
                      <option value="platinum">Platinum Strategic Partner</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Credit Limit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Credit Limit (BDT ৳)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      name="creditLimit"
                      value={formData.creditLimit}
                      onChange={handleChange}
                      min="0"
                      step="500"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all tabular-nums"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Maximum unpaid balance allowed before order lock.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Financial Summary (Live)
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                    <div>Total Orders: <span className="font-bold text-slate-900 font-mono tabular-nums">{customer.totalOrders || 0}</span></div>
                    <div>Purchased: <span className="font-bold text-indigo-600 font-mono tabular-nums">৳{(customer.totalWholesalePurchase || 0).toLocaleString()}</span></div>
                    <div>Paid: <span className="font-bold text-emerald-600 font-mono tabular-nums">৳{(customer.totalPaid || 0).toLocaleString()}</span></div>
                    <div>Current Due: <span className="font-bold text-rose-600 font-mono tabular-nums">৳{(customer.totalDue || 0).toLocaleString()}</span></div>
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Admin Internal Notes & Terms
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Special discount arrangement, preferred transport company, or payment terms..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all resize-none"
                />
              </div>

            </div>
          )}

        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            {activeTab !== 'financial' && (
              <button
                type="button"
                onClick={() => setActiveTab(activeTab === 'basic' ? 'business' : 'financial')}
                className="px-4 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
              >
                Next Section →
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
