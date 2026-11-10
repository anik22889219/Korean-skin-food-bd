import React from 'react';
import { Link } from 'react-router-dom';
import { SeoHead } from './SeoHead';
import { AlertCircle, Home, ShoppingBag, Sparkles, BookOpen } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center space-y-8">
      <SeoHead
        title="404: Page Not Found | Korean Skin Food BD"
        description="The page you are looking for does not exist or may have been relocated. Discover authentic Korean skincare at Korean Skin Food BD."
        noindex={true}
      />

      <div className="w-24 h-24 bg-pink-50 text-[#E91E8C] rounded-full flex items-center justify-center mx-auto border-2 border-pink-100 shadow-sm animate-pulse">
        <AlertCircle size={44} />
      </div>

      <div className="space-y-3">
        <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-[#E91E8C] bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
          Error 404
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
          The link you followed may be broken or the page may have been removed. Discover authentic Korean cosmeceuticals and skincare routines below:
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#E91E8C] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#d0177c] transition"
        >
          <Home size={15} />
          <span>Return Home</span>
        </Link>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-800 font-bold text-xs rounded-xl border border-pink-200 hover:bg-pink-50 transition shadow-2xs"
        >
          <ShoppingBag size={15} className="text-[#E91E8C]" />
          <span>Browse Skincare Shop</span>
        </Link>
        <Link
          to="/brands"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-800 font-bold text-xs rounded-xl border border-pink-200 hover:bg-pink-50 transition shadow-2xs"
        >
          <Sparkles size={15} className="text-[#E91E8C]" />
          <span>Explore Brands</span>
        </Link>
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-800 font-bold text-xs rounded-xl border border-pink-200 hover:bg-pink-50 transition shadow-2xs"
        >
          <BookOpen size={15} className="text-[#E91E8C]" />
          <span>Skincare Guides</span>
        </Link>
      </div>
    </div>
  );
};
