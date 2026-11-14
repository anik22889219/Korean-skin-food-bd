import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { themeService, DEFAULT_PAGES_THEME } from '../services/themeService';
import { NotFoundPageThemeSettings } from '../types/theme';
import { AlertCircle, Home, ShoppingBag, Sparkles, BookOpen } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const [pageTheme, setPageTheme] = useState<NotFoundPageThemeSettings>(DEFAULT_PAGES_THEME.notFound);

  useEffect(() => {
    return themeService.subscribePages((p) => {
      if (p?.notFound) setPageTheme(p.notFound);
    });
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center space-y-8">
      <SeoHead
        title={`${pageTheme.title} | Korean Skin Food BD`}
        description="The page you are looking for does not exist or may have been relocated. Discover authentic Korean skincare at Korean Skin Food BD."
        noindex={true}
      />

      <div className="w-24 h-24 bg-pink-50 text-[#E91E8C] rounded-full flex items-center justify-center mx-auto border-2 border-pink-100 shadow-sm animate-pulse">
        <AlertCircle size={44} />
      </div>

      <div className="space-y-3">
        <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#E91E8C] bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
          {pageTheme.badgeText}
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          {pageTheme.title}
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          {pageTheme.description}
        </p>
      </div>

      {pageTheme.showQuickLinks && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#E91E8C] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#d0177c] transition"
          >
            <Home size={15} />
            <span>{pageTheme.homeBtnLabel}</span>
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-800 font-bold text-xs rounded-xl border border-pink-200 hover:bg-pink-50 transition shadow-2xs"
          >
            <ShoppingBag size={15} className="text-[#E91E8C]" />
            <span>{pageTheme.shopBtnLabel}</span>
          </Link>
          <Link
            to="/brands"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-800 font-bold text-xs rounded-xl border border-pink-200 hover:bg-pink-50 transition shadow-2xs"
          >
            <Sparkles size={15} className="text-[#E91E8C]" />
            <span>{pageTheme.brandsBtnLabel}</span>
          </Link>
          <Link
            to="/guides"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-800 font-bold text-xs rounded-xl border border-pink-200 hover:bg-pink-50 transition shadow-2xs"
          >
            <BookOpen size={15} className="text-[#E91E8C]" />
            <span>{pageTheme.guidesBtnLabel}</span>
          </Link>
        </div>
      )}
    </div>
  );
};
