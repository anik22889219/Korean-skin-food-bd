import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Package, AlertTriangle, AlertCircle, CheckCheck, 
  ExternalLink, ChevronRight, Boxes, ShoppingBag, X,
  Clock, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { Order, Product } from '../types';

export interface AdminNotification {
  id: string;
  type: 'new_order' | 'low_stock' | 'out_of_stock';
  title: string;
  subtitle: string;
  timestamp: string;
  targetUrl: string;
  badgeTone: string;
  iconTone: string;
  isRead?: boolean;
}

export const AdminNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'orders' | 'stock'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('ksf_admin_read_notifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time order and product updates
  useEffect(() => {
    const unsubOrders = orderService.subscribe((ords) => {
      setOrders(ords);
    });
    const unsubProducts = productService.subscribe((prods) => {
      setProducts(prods);
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  // Close dropdown on outside click or ESC key, and handle mobile body lock
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      // Prevent background scroll on small screens
      if (window.innerWidth < 640) {
        document.body.style.overflow = 'hidden';
      }
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Compute notifications list
  const notifications: AdminNotification[] = useMemo(() => {
    const list: AdminNotification[] = [];

    // 1. Incoming / Pending Orders
    const pendingOrders = orders.filter(o => o.status === 'pending');
    pendingOrders.forEach(o => {
      const itemCount = o.items.reduce((sum, it) => sum + it.quantity, 0);
      list.push({
        id: `order-${o.id}`,
        type: 'new_order',
        title: `Incoming Order #${o.id}`,
        subtitle: `${o.customerName || 'Customer'} • ৳${o.totalAmount.toLocaleString()} (${itemCount} items) • ${o.sessionType === 'POS' ? 'POS Register' : 'Online Store'}`,
        timestamp: o.createdAt,
        targetUrl: '/admin/orders',
        badgeTone: 'bg-pink-100 text-[#E91E8C] border-pink-200',
        iconTone: 'bg-pink-50 text-[#E91E8C] border-pink-100',
        isRead: readIds.has(`order-${o.id}`)
      });
    });

    // 2. Out of Stock Products
    const outOfStockProds = products.filter(p => p.stock <= 0);
    outOfStockProds.forEach(p => {
      list.push({
        id: `stock-out-${p.id}`,
        type: 'out_of_stock',
        title: `Out of Stock: ${p.name}`,
        subtitle: `${p.brand || 'K-Beauty'} • 0 units left in inventory • Urgent Restock Required`,
        timestamp: p.updatedAt || p.createdAt || new Date().toISOString(),
        targetUrl: '/admin/products',
        badgeTone: 'bg-rose-100 text-rose-800 border-rose-200',
        iconTone: 'bg-rose-50 text-rose-600 border-rose-100',
        isRead: readIds.has(`stock-out-${p.id}`)
      });
    });

    // 3. Low Stock Products (1 to 5 units)
    const lowStockProds = products.filter(p => p.stock > 0 && p.stock <= 5);
    lowStockProds.forEach(p => {
      list.push({
        id: `stock-low-${p.id}`,
        type: 'low_stock',
        title: `Low Stock Alert: ${p.name}`,
        subtitle: `${p.brand || 'K-Beauty'} • Only ${p.stock} units remaining in stock`,
        timestamp: p.updatedAt || p.createdAt || new Date().toISOString(),
        targetUrl: '/admin/products',
        badgeTone: 'bg-amber-100 text-amber-800 border-amber-200',
        iconTone: 'bg-amber-50 text-amber-600 border-amber-100',
        isRead: readIds.has(`stock-low-${p.id}`)
      });
    });

    // Sort: unread first, then by timestamp desc
    return list.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [orders, products, readIds]);

  // Counts
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const pendingOrdersCount = useMemo(() => {
    return notifications.filter(n => n.type === 'new_order' && !n.isRead).length;
  }, [notifications]);

  const stockAlertsCount = useMemo(() => {
    return notifications.filter(n => (n.type === 'low_stock' || n.type === 'out_of_stock') && !n.isRead).length;
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'orders') {
      return notifications.filter(n => n.type === 'new_order');
    }
    if (activeFilter === 'stock') {
      return notifications.filter(n => n.type === 'low_stock' || n.type === 'out_of_stock');
    }
    return notifications;
  }, [notifications, activeFilter]);

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    try {
      localStorage.setItem('ksf_admin_read_notifications', JSON.stringify(Array.from(allIds)));
    } catch (e) {
      console.error(e);
    }
  };

  // Click individual notification
  const handleNotificationClick = (item: AdminNotification) => {
    const next = new Set(readIds);
    next.add(item.id);
    setReadIds(next);
    try {
      localStorage.setItem('ksf_admin_read_notifications', JSON.stringify(Array.from(next)));
    } catch (e) {
      console.error(e);
    }
    setIsOpen(false);
    navigate(item.targetUrl);
  };

  // Helper for human-readable time
  const formatTimeAgo = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      if (isNaN(diffMs)) return 'Recently';
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Action Button */}
      <button
        type="button"
        id="admin_navbar_notification_bell"
        onClick={() => setIsOpen(prev => !prev)}
        className={`
          relative p-2 sm:p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center min-w-[38px] min-h-[38px]
          ${isOpen 
            ? 'bg-pink-50 text-[#E91E8C] border-pink-300 shadow-xs' 
            : 'bg-white text-slate-600 hover:text-[#E91E8C] hover:bg-pink-50/60 border-slate-200/80 hover:border-pink-200 shadow-2xs'}
        `}
        title={`Operational Alerts (${unreadCount} unread)`}
        aria-label="Admin Notifications & Alerts"
        aria-expanded={isOpen}
      >
        <Bell size={18} className={unreadCount > 0 ? "text-[#E91E8C]" : "text-slate-600"} />

        {/* Counter Badge */}
        {unreadCount > 0 && (
          <span 
            id="admin_notification_unread_badge"
            className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-gradient-to-r from-[#E91E8C] to-rose-500 text-white font-mono text-[10px] font-black rounded-full flex items-center justify-center shadow-md ring-2 ring-white animate-pulse"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Mobile Dimmed Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 sm:hidden"
            id="admin_notif_mobile_backdrop"
          />
        )}
      </AnimatePresence>

      {/* Flyout Notification Panel (Fixed & Centered on Mobile, Absolute Anchor on Desktop) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="admin_notification_dropdown_panel"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-x-2.5 top-16 max-h-[82dvh] sm:fixed-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[420px] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-pink-100/90 z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 text-white border-b border-slate-800 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#E91E8C] to-purple-600 p-0.5 flex items-center justify-center shadow-md shrink-0">
                    <Bell size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5 truncate">
                      <span className="truncate">Store Alerts & Tasks</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#E91E8C] text-white text-[9px] font-mono font-black shrink-0">
                          {unreadCount} New
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">Real-time inventory and incoming orders</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      id="admin_notifications_mark_all_read_btn"
                      onClick={handleMarkAllAsRead}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-pink-300 hover:text-white transition flex items-center gap-1 border border-slate-700 cursor-pointer min-h-[30px]"
                      title="Mark all alerts as read"
                    >
                      <CheckCheck size={12} />
                      <span>Mark Read</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer min-w-[30px] min-h-[30px] flex items-center justify-center"
                    title="Close Alerts"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Segmented Filter Pills with horizontal touch scroll */}
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80 overflow-x-auto pb-0.5 scrollbar-none [scrollbar-width:none]">
                <button
                  type="button"
                  id="admin_notif_filter_all"
                  onClick={() => setActiveFilter('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    activeFilter === 'all'
                      ? 'bg-[#E91E8C] text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>All</span>
                  <span className="px-1 py-0.2 rounded-md bg-black/30 font-mono text-[9px]">
                    {notifications.length}
                  </span>
                </button>

                <button
                  type="button"
                  id="admin_notif_filter_orders"
                  onClick={() => setActiveFilter('orders')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    activeFilter === 'orders'
                      ? 'bg-[#E91E8C] text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Package size={11} />
                  <span>Incoming Orders</span>
                  {pendingOrdersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-pink-500 text-white font-mono text-[9px]">
                      {pendingOrdersCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  id="admin_notif_filter_stock"
                  onClick={() => setActiveFilter('stock')}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                    activeFilter === 'stock'
                      ? 'bg-[#E91E8C] text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <AlertTriangle size={11} />
                  <span>Stock Alerts</span>
                  {stockAlertsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white font-mono text-[9px]">
                      {stockAlertsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Notification List */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-2 space-y-2 sm:space-y-1.5 max-h-[50vh] sm:max-h-[380px] [scrollbar-width:thin] [scrollbar-color:#f1f5f9_transparent] overscroll-contain">
              {filteredNotifications.length === 0 ? (
                <div className="py-10 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2.5 border border-emerald-100 shadow-xs">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="text-xs font-black text-slate-800">All caught up!</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-[240px] mx-auto">
                    {activeFilter === 'orders' 
                      ? 'No new incoming orders awaiting fulfillment.'
                      : activeFilter === 'stock'
                      ? 'Inventory healthy! No low stock alerts.'
                      : 'No unread alerts across the K-Beauty catalog or order workflow.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isOrder = item.type === 'new_order';
                  const isOutOfStock = item.type === 'out_of_stock';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`
                        p-3 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative group active:scale-[0.99] touch-manipulation
                        ${item.isRead 
                          ? 'bg-white hover:bg-slate-50/80 border-slate-100 text-slate-600' 
                          : 'bg-pink-50/40 hover:bg-pink-50/80 border-pink-200/80 text-slate-900 shadow-2xs'}
                      `}
                    >
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border shadow-2xs ${item.iconTone}`}>
                        {isOrder ? (
                          <ShoppingBag size={15} />
                        ) : isOutOfStock ? (
                          <AlertCircle size={15} />
                        ) : (
                          <AlertTriangle size={15} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-black text-slate-900 truncate group-hover:text-[#E91E8C] transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0 flex items-center gap-0.5">
                            <Clock size={9} />
                            <span>{formatTimeAgo(item.timestamp)}</span>
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.subtitle}
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100/80">
                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${item.badgeTone}`}>
                            {isOrder ? 'Order' : isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                          </span>

                          <span className="text-[10px] font-extrabold text-[#E91E8C] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                            <span>{isOrder ? 'Fulfill Order' : 'Inspect Stock'}</span>
                            <ChevronRight size={11} />
                          </span>
                        </div>
                      </div>

                      {/* Unread indicator dot */}
                      {!item.isRead && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#E91E8C] ring-2 ring-white" />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Quick-Action Shortcuts */}
            <div className="p-3 bg-slate-50 border-t border-pink-100 flex items-center justify-between gap-2 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/orders');
                }}
                className="flex-1 py-2 sm:py-1.5 px-2 bg-white hover:bg-pink-50 text-slate-700 hover:text-[#E91E8C] rounded-xl border border-slate-200 hover:border-pink-200 text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[36px]"
              >
                <Package size={12} className="text-[#E91E8C]" />
                <span className="truncate">Orders ({orders.filter(o => o.status === 'pending').length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin/products');
                }}
                className="flex-1 py-2 sm:py-1.5 px-2 bg-white hover:bg-pink-50 text-slate-700 hover:text-[#E91E8C] rounded-xl border border-slate-200 hover:border-pink-200 text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[36px]"
              >
                <Boxes size={12} className="text-[#E91E8C]" />
                <span className="truncate">Stock Alerts ({products.filter(p => p.stock <= 5).length})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
