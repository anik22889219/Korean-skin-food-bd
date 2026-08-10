import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-pink-100/70 p-4 shadow-sm animate-pulse flex flex-col space-y-3">
      <div className="w-full aspect-square bg-slate-100 rounded-xl" />
      <div className="space-y-2 pt-1 flex-1">
        <div className="h-3 w-1/3 bg-pink-100 rounded" />
        <div className="h-4 w-4/5 bg-slate-200 rounded" />
        <div className="h-3 w-1/2 bg-slate-100 rounded" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
        <div className="h-5 w-16 bg-slate-200 rounded-lg" />
        <div className="h-8 w-24 bg-pink-200 rounded-xl" />
      </div>
    </div>
  );
};

export const StoreCatalogSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-[1720px] mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-8 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="w-full min-h-[380px] bg-gradient-to-r from-pink-50 via-slate-50 to-pink-50 rounded-3xl p-8 md:p-12 border border-pink-100 flex flex-col justify-center space-y-6">
        <div className="h-6 w-36 bg-pink-200/60 rounded-full" />
        <div className="h-10 sm:h-14 w-3/4 max-w-2xl bg-slate-200 rounded-2xl" />
        <div className="h-5 w-2/3 max-w-xl bg-slate-100 rounded-lg" />
        <div className="flex gap-4 pt-2">
          <div className="h-12 w-40 bg-pink-300/50 rounded-2xl" />
          <div className="h-12 w-32 bg-slate-200 rounded-2xl" />
        </div>
      </div>

      {/* Categories Filter Bar Skeleton */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 w-28 bg-white border border-pink-100 rounded-full shrink-0" />
        ))}
      </div>

      {/* Search & Filter Options Skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-pink-100">
        <div className="h-11 w-full sm:w-80 bg-slate-100 rounded-xl" />
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="h-11 w-32 bg-slate-100 rounded-xl" />
          <div className="h-11 w-32 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* Product Cards Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const ProductDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-slate-200 rounded" />
        <div className="h-4 w-4 bg-slate-200 rounded" />
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-4 w-4 bg-slate-200 rounded" />
        <div className="h-4 w-36 bg-pink-200 rounded" />
      </div>

      {/* Main Product Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Images */}
        <div className="lg:col-span-6 space-y-4">
          <div className="w-full aspect-square bg-slate-100 rounded-3xl border border-pink-100" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square bg-slate-100 rounded-xl border border-pink-100" />
            ))}
          </div>
        </div>

        {/* Right Column: Info */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-3">
            <div className="h-4 w-28 bg-pink-200 rounded-full" />
            <div className="h-8 w-4/5 bg-slate-200 rounded-xl" />
            <div className="h-4 w-1/3 bg-slate-100 rounded" />
          </div>

          <div className="h-12 w-40 bg-slate-200 rounded-2xl" />

          <div className="space-y-2 border-y border-slate-100 py-4">
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-5/6 bg-slate-100 rounded" />
            <div className="h-4 w-2/3 bg-slate-100 rounded" />
          </div>

          <div className="flex gap-4 pt-2">
            <div className="h-14 flex-1 bg-pink-300/60 rounded-2xl" />
            <div className="h-14 w-14 bg-emerald-100 rounded-2xl" />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <div className="h-16 bg-pink-50/50 rounded-xl border border-pink-100" />
            <div className="h-16 bg-pink-50/50 rounded-xl border border-pink-100" />
          </div>
        </div>
      </div>
    </div>
  );
};
