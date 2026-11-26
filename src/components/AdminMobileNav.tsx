import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, LucideIcon } from 'lucide-react';

export interface AdminMobileNavItem {
  to: string;
  label: string;
  badge?: string;
  icon: LucideIcon;
  end?: boolean;
  highlight?: boolean;
}

interface AdminMobileNavProps {
  visibleNavItems: AdminMobileNavItem[];
  activePosCount?: number;
  onOpenMore: () => void;
  isDrawerOpen: boolean;
}

const CORE_TAB_PRIORITY: { to: string; shortLabel: string }[] = [
  { to: '/admin', shortLabel: 'Overview' },
  { to: '/admin/orders', shortLabel: 'Orders' },
  { to: '/admin/products', shortLabel: 'Products' },
  { to: '/admin/pos', shortLabel: 'POS' },
];

const SHORT_LABEL_MAP: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/orders': 'Orders',
  '/admin/products': 'Products',
  '/admin/pos': 'POS',
  '/admin/wholesale': 'Wholesale',
  '/admin/business-finance': 'Finance',
  '/admin/payments-due': 'Due Pay',
  '/admin/reports': 'Reports',
  '/admin/analytics': 'Analytics',
  '/admin/creators': 'Creators',
  '/admin/users': 'Users',
  '/admin/ai-agents': 'AI Agents',
  '/admin/discounts': 'Promos',
  '/admin/theme-editor': 'Theme',
  '/admin/shipments': 'Shipments',
  '/admin/combos': 'Combos',
  '/admin/taxonomies': 'Catalog',
  '/admin/testimonials': 'Reviews',
  '/admin/seo': 'SEO',
  '/admin/blogs': 'Blogs',
  '/admin/meta-catalog': 'Meta',
  '/admin/pinterest': 'Pinterest',
  '/admin/social': 'Social',
  '/admin/chat-leads': 'Leads',
  '/admin/slack': 'Slack',
};

const triggerHaptic = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(15);
    } catch {
      // ignore unsupported environments
    }
  }
};

export const AdminMobileNav: React.FC<AdminMobileNavProps> = ({
  visibleNavItems,
  activePosCount = 0,
  onOpenMore,
  isDrawerOpen,
}) => {
  const location = useLocation();

  // Hide global admin bottom bar on POS routes so PosMobileNav owns the bottom dock cleanly
  const isPosRoute = location.pathname === '/admin/pos' || location.pathname.startsWith('/admin/pos/');

  const coreTabs = useMemo(() => {
    const selected: (AdminMobileNavItem & { shortLabel: string })[] = [];
    const seen = new Set<string>();

    // First pick preferred core tabs that the current user role has access to
    for (const pref of CORE_TAB_PRIORITY) {
      const match = visibleNavItems.find((item) => item.to === pref.to);
      if (match && !seen.has(match.to)) {
        selected.push({ ...match, shortLabel: pref.shortLabel });
        seen.add(match.to);
      }
    }

    // For specialized roles (e.g., Customer Support or HR), fill remaining slots up to 4 from allowed modules
    if (selected.length < 4) {
      for (const item of visibleNavItems) {
        if (selected.length >= 4) break;
        if (!seen.has(item.to)) {
          selected.push({
            ...item,
            shortLabel: SHORT_LABEL_MAP[item.to] || item.label.split(' ')[0],
          });
          seen.add(item.to);
        }
      }
    }

    return selected.slice(0, 4);
  }, [visibleNavItems]);

  if (isPosRoute) {
    return null;
  }

  // Highlight "More" when the drawer is open or when the active route isn't one of the 4 pinned tabs
  const isCoreRouteActive = coreTabs.some((tab) => {
    if (tab.end || tab.to === '/admin') {
      return location.pathname === tab.to;
    }
    return location.pathname === tab.to || location.pathname.startsWith(`${tab.to}/`);
  });
  const isMoreActive = isDrawerOpen || (!isCoreRouteActive && location.pathname.startsWith('/admin'));

  return (
    <nav
      id="admin_mobile_bottom_nav"
      aria-label="Admin Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-pink-100 px-2 py-1.5 pb-safe flex items-center justify-around shadow-lg lg:hidden print:hidden"
    >
      {coreTabs.map((tab) => {
        const Icon = tab.icon;
        const posBadge = tab.to === '/admin/pos' && activePosCount > 0 ? activePosCount : undefined;

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            onClick={triggerHaptic}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all relative cursor-pointer min-w-[56px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]/40 ${
                isActive
                  ? 'text-[#E91E8C] font-bold'
                  : 'text-gray-400 hover:text-gray-600 font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <div
                    className={`p-1.5 rounded-xl transition-all ${
                      isActive ? 'bg-[#E91E8C]/10 scale-105' : 'bg-transparent'
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  {posBadge !== undefined && (
                    <span className="absolute -top-1 -right-1.5 bg-emerald-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs tabular-nums">
                      {posBadge > 99 ? '99+' : posBadge}
                    </span>
                  )}
                </div>

                <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap shrink-0">
                  {tab.shortLabel}
                </span>
              </>
            )}
          </NavLink>
        );
      })}

      <button
        type="button"
        id="admin_mobile_bottom_more_btn"
        aria-label="Open All Admin Modules"
        aria-expanded={isDrawerOpen}
        onClick={() => {
          triggerHaptic();
          onOpenMore();
        }}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-2xl transition-all relative cursor-pointer min-w-[56px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E8C]/40 ${
          isMoreActive
            ? 'text-[#E91E8C] font-bold'
            : 'text-gray-400 hover:text-gray-600 font-medium'
        }`}
      >
        <div className="relative">
          <div
            className={`p-1.5 rounded-xl transition-all ${
              isMoreActive ? 'bg-[#E91E8C]/10 scale-105' : 'bg-transparent'
            }`}
          >
            <Menu size={20} />
          </div>
        </div>

        <span className="text-[10px] mt-0.5 tracking-tight whitespace-nowrap shrink-0">
          More
        </span>
      </button>
    </nav>
  );
};
