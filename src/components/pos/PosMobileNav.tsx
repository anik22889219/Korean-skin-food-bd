import React from 'react';
import { ShoppingBag, ScanLine, Search, PackagePlus, History } from 'lucide-react';
import { PosTab } from './types';

interface PosMobileNavProps {
  activeTab: PosTab;
  onTabChange: (tab: PosTab) => void;
  cartCount: number;
  stockInCount: number;
}

export const PosMobileNav: React.FC<PosMobileNavProps> = ({
  activeTab,
  onTabChange,
  cartCount,
  stockInCount
}) => {
  const tabs: { id: PosTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'sale',
      label: 'Register',
      icon: <ShoppingBag size={20} />,
      badge: cartCount
    },
    {
      id: 'scan',
      label: 'Scanner',
      icon: <ScanLine size={20} />
    },
    {
      id: 'search',
      label: 'Search',
      icon: <Search size={20} />
    },
    {
      id: 'stock_in',
      label: 'Stock In',
      icon: <PackagePlus size={20} />,
      badge: stockInCount
    },
    {
      id: 'history',
      label: 'History',
      icon: <History size={20} />
    }
  ];

  return (
    <nav 
      aria-label="POS Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-pink-100 px-2 py-1.5 pb-safe flex items-center justify-around shadow-lg lg:hidden print:hidden"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (navigator.vibrate) {
                try {
                  navigator.vibrate(15);
                } catch {
                  // ignore
                }
              }
              onTabChange(tab.id);
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative cursor-pointer min-w-[56px] ${
              isActive
                ? 'text-[#E91E8C] font-bold'
                : 'text-gray-400 hover:text-gray-600 font-medium'
            }`}
          >
            <div className="relative">
              <div
                className={`p-1.5 rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#E91E8C]/10 scale-105'
                    : 'bg-transparent'
                }`}
              >
                {tab.icon}
              </div>

              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="absolute -top-1 -right-1.5 bg-[#E91E8C] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-scaleIn">
                  {tab.badge! > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>

            <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
