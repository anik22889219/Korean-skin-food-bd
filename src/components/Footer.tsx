import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wand2, Mail, Phone, MapPin, MessageSquare, 
  ExternalLink, ShieldCheck, Truck, HeartHandshake
} from 'lucide-react';
import { themeService, DEFAULT_GLOBAL_THEME } from '../services/themeService';
import { GlobalThemeSettings } from '../types/theme';

export const Footer: React.FC = () => {
  const [globalTheme, setGlobalTheme] = useState<GlobalThemeSettings>(DEFAULT_GLOBAL_THEME);

  useEffect(() => {
    const unsubscribe = themeService.subscribeGlobal((gt) => {
      setGlobalTheme(gt);
    });
    return () => unsubscribe();
  }, []);

  return (
    <footer id="main_footer" className="bg-white border-t border-pink-100 text-gray-700 pt-12 pb-20 md:pb-12 px-4 md:px-8 lg:px-12 shadow-inner mt-auto">
      <div className="w-full max-w-[1720px] mx-auto space-y-10">
        
        {/* Top Section: Guarantee Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8 border-b border-pink-100/70">
          <div className="flex items-center gap-3 bg-pink-50/30 p-3.5 rounded-2xl border border-pink-100/50">
            <div className="w-10 h-10 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">100% Genuine Imports</h4>
              <p className="text-[11px] text-gray-500 font-medium">Directly sourced from Seoul, South Korea</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-pink-50/30 p-3.5 rounded-2xl border border-pink-100/50">
            <div className="w-10 h-10 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">Nationwide Delivery</h4>
              <p className="text-[11px] text-gray-500 font-medium">Cash on Delivery across Bangladesh</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-pink-50/30 p-3.5 rounded-2xl border border-pink-100/50">
            <div className="w-10 h-10 rounded-xl bg-[#E91E8C]/10 text-[#E91E8C] flex items-center justify-center shrink-0">
              <HeartHandshake size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">Free Skincare Advice</h4>
              <p className="text-[11px] text-gray-500 font-medium">Expert routine guidance via WhatsApp</p>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 text-xs">
          
          {/* Brand Info & Social Links - 4 Cols */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group">
              {globalTheme.logoUrl ? (
                <img src={globalTheme.logoUrl} alt={globalTheme.logoText} className="h-9 object-contain" />
              ) : (
                <>
                  <div className="w-9 h-9 bg-[#E91E8C] rounded-full flex items-center justify-center shadow-md shadow-[#E91E8C]/25 border border-[#FF62B2]">
                    <Wand2 className="text-white" size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-gray-900 tracking-tight leading-none">{globalTheme.logoText || 'Korean Skin Food BD'}</h3>
                    <p className="text-[10px] text-pink-600 mt-1 font-bold tracking-wider uppercase">
                      {globalTheme.logoTagline || 'K-BEAUTY COSMECEUTICALS'}
                    </p>
                  </div>
                </>
              )}
            </Link>

            <p className="text-gray-500 text-xs leading-relaxed font-medium pr-2">
              Your trusted destination in Bangladesh for 100% authentic Korean skincare, K-Beauty formulations, and barrier-repairing cosmeceuticals straight from Seoul.
            </p>

            {/* Social Media Links Section */}
            <div id="footer_social_links" className="pt-2 space-y-2.5">
              <span className="text-[10px] font-black uppercase text-pink-700 tracking-widest block">
                Connect With Us On Social Media
              </span>
              <div className="flex items-center gap-3">
                {/* Facebook Button */}
                {globalTheme.facebookUrl && (
                  <a
                    href={globalTheme.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="footer_facebook_link"
                    aria-label="Facebook"
                    className="w-10 h-10 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2] text-[#1877F2] hover:text-white border border-[#1877F2]/20 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 group cursor-pointer"
                    title="Facebook"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                )}

                {/* Instagram Button */}
                {globalTheme.instagramUrl && (
                  <a
                    href={globalTheme.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="footer_instagram_link"
                    aria-label="Instagram"
                    className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#833AB4]/10 via-[#FD1D1D]/10 to-[#FCB045]/10 hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#FCB045] text-[#E1306C] hover:text-white border border-[#E1306C]/20 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 group cursor-pointer"
                    title="Instagram"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                )}

                {/* Messenger Button */}
                {globalTheme.messengerUrl && (
                  <a
                    href={globalTheme.messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    id="footer_messenger_link"
                    aria-label="Messenger"
                    className="w-10 h-10 rounded-xl bg-[#0084FF]/10 hover:bg-[#0084FF] text-[#0084FF] hover:text-white border border-[#0084FF]/20 flex items-center justify-center transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 group cursor-pointer"
                    title="Messenger"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.082.3 2.23.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26 6.559-6.96 3.125 3.26 5.893-3.26-6.559 6.96z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Links Column - 3 Cols */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider border-b border-pink-100 pb-2">
              Explore Store
            </h4>
            <ul className="space-y-2 text-gray-600 font-semibold">
              <li>
                <Link to="/" className="hover:text-[#E91E8C] transition-colors flex items-center gap-1.5 py-0.5">
                  <span className="text-[#E91E8C]">›</span> Home Page
                </Link>
              </li>
              <li>
                <Link to="/shop" className="hover:text-[#E91E8C] transition-colors flex items-center gap-1.5 py-0.5">
                  <span className="text-[#E91E8C]">›</span> Shop All Skincare
                </Link>
              </li>
              <li>
                <Link to="/about-us" className="hover:text-[#E91E8C] transition-colors flex items-center gap-1.5 py-0.5">
                  <span className="text-[#E91E8C]">›</span> About Our Story
                </Link>
              </li>
              <li>
                <Link to="/contact-us" className="hover:text-[#E91E8C] transition-colors flex items-center gap-1.5 py-0.5">
                  <span className="text-[#E91E8C]">›</span> Contact & Help Desk
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-[#E91E8C] transition-colors flex items-center gap-1.5 py-0.5">
                  <span className="text-[#E91E8C]">›</span> My Account & Orders
                </Link>
              </li>
            </ul>
          </div>

          {/* Popular Categories Column - 2 Cols */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider border-b border-pink-100 pb-2">
              K-Beauty Focus
            </h4>
            <ul className="space-y-2 text-gray-600 font-semibold">
              <li>
                <Link to="/shop?category=Cleanser" className="hover:text-[#E91E8C] transition-colors">
                  Cleansers & Oils
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Serum" className="hover:text-[#E91E8C] transition-colors">
                  Serums & Ampoules
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Sunscreen" className="hover:text-[#E91E8C] transition-colors">
                  Korean Sunscreens
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Moisturizer" className="hover:text-[#E91E8C] transition-colors">
                  Barrier Moisturizers
                </Link>
              </li>
              <li>
                <Link to="/shop?category=Toner" className="hover:text-[#E91E8C] transition-colors">
                  Essences & Toners
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support - 3 Cols */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-black uppercase text-gray-900 tracking-wider border-b border-pink-100 pb-2">
              Direct Contact
            </h4>
            <div className="space-y-3 text-gray-600 font-semibold">
              <div className="flex items-start gap-2.5">
                <MapPin size={16} className="text-[#E91E8C] shrink-0 mt-0.5" />
                <span>Banani Road 11, Dhaka, Bangladesh</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={16} className="text-[#E91E8C] shrink-0" />
                <a href={`tel:${globalTheme.contactPhone.replace(/\s+/g, '')}`} className="hover:text-[#E91E8C] font-mono font-bold transition-colors">
                  {globalTheme.contactPhone || '+880 1700-000000'}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={16} className="text-[#E91E8C] shrink-0" />
                <a href={`mailto:${globalTheme.contactEmail}`} className="hover:text-[#E91E8C] transition-colors truncate">
                  {globalTheme.contactEmail || 'koreanskinfood.bd@gmail.com'}
                </a>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <MessageSquare size={16} className="text-emerald-600 shrink-0" />
                <a 
                  href={globalTheme.messengerUrl || "https://m.me/651561268050601"} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-emerald-700 hover:underline font-bold"
                >
                  Message us on Messenger
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Copyright and Meta */}
        <div className="border-t border-pink-100 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-[11px] font-semibold text-gray-500">
          <div>
            <p className="font-extrabold text-pink-700">
              {globalTheme.footerText || 'Korean Skin Food BD © 2026. All rights reserved.'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              100% Original imported Cosmeceuticals straight from Seoul for skin care enthusiasts in Bangladesh.
            </p>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end gap-3 text-[10px] text-gray-500 font-bold">
            <span className="bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-100">
              COD Inside Dhaka: {globalTheme.currencySymbol || '৳'}80
            </span>
            <span className="bg-pink-50 px-2.5 py-1 rounded-lg border border-pink-100">
              COD Outside Dhaka: {globalTheme.currencySymbol || '৳'}150
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-100">
              Free Delivery &gt; {globalTheme.currencySymbol || '৳'}2,000
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};
