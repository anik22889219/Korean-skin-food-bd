import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Package, AlertTriangle, AlertCircle, CheckCheck, 
  ChevronRight, Boxes, ShoppingBag, X,
  Clock, Sparkles, Smartphone, Monitor, Tablet, Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { posService } from '../services/posService';
import { useAuth } from '../context/AuthContext';
import { Order, Product, PosSessionNotification, PosDeviceType } from '../types';

export interface AdminNotification {
  id: string;
  notificationId?: string;
  type: 'new_order' | 'low_stock' | 'out_of_stock' | 'pos_session_started';
  title: string;
  subtitle: string;
  timestamp: string;
  targetUrl: string;
  badgeTone: string;
  iconTone: string;
  isRead?: boolean;
  isDismissed?: boolean;
  // Specific POS Session fields
  sessionId?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  deviceType?: PosDeviceType;
}

export const AdminNotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const userRole = profile?.role;
  const userUid = user?.uid || '';

  // Admins, Super Admins, Inventory Managers, and authorized staff receive POS session notifications
  const canReceivePosNotifs = useMemo(() => {
    return isAdmin || Boolean(userRole && ['admin', 'super_admin', 'inventory_manager', 'customer_support'].includes(userRole)) || user?.email === 'koreanskinfood.bd@gmail.com';
  }, [isAdmin, userRole, user?.email]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pos' | 'orders' | 'stock'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [posNotifs, setPosNotifs] = useState<PosSessionNotification[]>([]);

  // Independent per-user read and dismissed notification state
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const storageKey = userUid ? `ksf_admin_read_notifications_${userUid}` : 'ksf_admin_read_notifications';
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const storageKey = userUid ? `ksf_admin_dismissed_notifications_${userUid}` : 'ksf_admin_dismissed_notifications';
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Re-sync storage keys if userUid changes
  useEffect(() => {
    if (!userUid) return;
    try {
      const readKey = `ksf_admin_read_notifications_${userUid}`;
      const savedRead = localStorage.getItem(readKey);
      if (savedRead) setReadIds(new Set(JSON.parse(savedRead)));

      const dismissedKey = `ksf_admin_dismissed_notifications_${userUid}`;
      const savedDismissed = localStorage.getItem(dismissedKey);
      if (savedDismissed) setDismissedIds(new Set(JSON.parse(savedDismissed)));
    } catch (e) {
      console.warn('[AdminNotificationBell] Error loading per-user notification state:', e);
    }
  }, [userUid]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to real-time order and product updates
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

  // 2. Real-time subscription to POS Session Administrative Notifications (Admin & Super Admin ONLY)
  useEffect(() => {
    if (!canReceivePosNotifs) {
      setPosNotifs([]);
      return;
    }

    const unsubscribe = posService.subscribeAdminNotifications((notifications) => {
      setPosNotifs(notifications);
    }, (err) => {
      console.warn('[AdminNotificationBell] Admin notification stream notice:', err);
    });

    return () => {
      unsubscribe();
    };
  }, [canReceivePosNotifs]);

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

  // Format helpers
  const formatRole = (role?: string) => {
    if (!role) return 'Store Staff';
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    if (role === 'inventory_manager') return 'Inventory Manager';
    return role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDevice = (device?: PosDeviceType) => {
    if (device === 'mobile') return 'Mobile';
    if (device === 'tablet') return 'Tablet';
    return 'Desktop';
  };

  const getDeviceIcon = (device?: PosDeviceType) => {
    if (device === 'mobile') return <Smartphone size={12} className="text-indigo-500 shrink-0" />;
    if (device === 'tablet') return <Tablet size={12} className="text-indigo-500 shrink-0" />;
    return <Monitor size={12} className="text-indigo-500 shrink-0" />;
  };

  const formatTime = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return 'Recently';
    }
  };

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

  // Compute aggregated notifications list
  const notifications: AdminNotification[] = useMemo(() => {
    const list: AdminNotification[] = [];
    const seenSessionIds = new Set<string>();

    // 1. POS Session Started Notifications (Admin & Super Admin ONLY)
    if (canReceivePosNotifs && Array.isArray(posNotifs)) {
      posNotifs.forEach(notif => {
        const notifId = notif.id || notif.notificationId || `pos-session-${notif.sessionId}`;
        const sessionId = notif.sessionId || notifId.replace('pos-session-', '');

        // Idempotency: Prevent duplicate notifications for the same session ID
        if (seenSessionIds.has(sessionId)) return;
        seenSessionIds.add(sessionId);

        // Check if current admin has dismissed this notification
        const isDismissed = dismissedIds.has(notifId) || 
          Boolean(userUid && notif.dismissedBy && notif.dismissedBy.includes(userUid));
        
        if (isDismissed) return;

        const isRead = readIds.has(notifId) || 
          Boolean(userUid && notif.readBy && notif.readBy.includes(userUid));

        list.push({
          id: notifId,
          notificationId: notifId,
          type: 'pos_session_started',
          sessionId,
          userId: notif.userId,
          userName: notif.userName || 'Store Staff',
          userRole: notif.userRole || 'staff',
          deviceType: notif.deviceType || 'desktop',
          title: '🔔 New POS Session Started',
          subtitle: `${notif.userName || 'Staff'} (${formatRole(notif.userRole)}) • ${formatDevice(notif.deviceType)}`,
          timestamp: notif.createdAt || new Date().toISOString(),
          targetUrl: `/admin/pos?session=${sessionId}`,
          badgeTone: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          iconTone: 'bg-indigo-50 text-indigo-600 border-indigo-100',
          isRead,
          isDismissed: false
        });
      });
    }

    // 2. Incoming / Pending Orders
    const pendingOrders = orders.filter(o => o.status === 'pending');
    pendingOrders.forEach(o => {
      const notifId = `order-${o.id}`;
      if (dismissedIds.has(notifId)) return;

      const itemCount = o.items.reduce((sum, it) => sum + it.quantity, 0);
      list.push({
        id: notifId,
        type: 'new_order',
        title: `Incoming Order #${o.id}`,
        subtitle: `${o.customerName || 'Customer'} • ৳${o.totalAmount.toLocaleString()} (${itemCount} items) • ${o.sessionType === 'POS' ? 'POS Register' : 'Online Store'}`,
        timestamp: o.createdAt,
        targetUrl: '/admin/orders',
        badgeTone: 'bg-pink-100 text-[#E91E8C] border-pink-200',
        iconTone: 'bg-pink-50 text-[#E91E8C] border-pink-100',
        isRead: readIds.has(notifId)
      });
    });

    // 3. Out of Stock Products
    const outOfStockProds = products.filter(p => p.stock <= 0);
    outOfStockProds.forEach(p => {
      const notifId = `stock-out-${p.id}`;
      if (dismissedIds.has(notifId)) return;

      list.push({
        id: notifId,
        type: 'out_of_stock',
        title: `Out of Stock: ${p.name}`,
        subtitle: `${p.brand || 'K-Beauty'} • 0 units left in inventory • Urgent Restock Required`,
        timestamp: p.updatedAt || p.createdAt || new Date().toISOString(),
        targetUrl: '/admin/products',
        badgeTone: 'bg-rose-100 text-rose-800 border-rose-200',
        iconTone: 'bg-rose-50 text-rose-600 border-rose-100',
        isRead: readIds.has(notifId)
      });
    });

    // 4. Low Stock Products (1 to 5 units)
    const lowStockProds = products.filter(p => p.stock > 0 && p.stock <= 5);
    lowStockProds.forEach(p => {
      const notifId = `stock-low-${p.id}`;
      if (dismissedIds.has(notifId)) return;

      list.push({
        id: notifId,
        type: 'low_stock',
        title: `Low Stock Alert: ${p.name}`,
        subtitle: `${p.brand || 'K-Beauty'} • Only ${p.stock} units remaining in stock`,
        timestamp: p.updatedAt || p.createdAt || new Date().toISOString(),
        targetUrl: '/admin/products',
        badgeTone: 'bg-amber-100 text-amber-800 border-amber-200',
        iconTone: 'bg-amber-50 text-amber-600 border-amber-100',
        isRead: readIds.has(notifId)
      });
    });

    // Sort: unread first, then by timestamp desc
    return list.sort((a, b) => {
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [canReceivePosNotifs, posNotifs, orders, products, readIds, dismissedIds, userUid]);

  // Counts
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const posNotificationsCount = useMemo(() => {
    return notifications.filter(n => n.type === 'pos_session_started' && !n.isRead).length;
  }, [notifications]);

  const pendingOrdersCount = useMemo(() => {
    return notifications.filter(n => n.type === 'new_order' && !n.isRead).length;
  }, [notifications]);

  const stockAlertsCount = useMemo(() => {
    return notifications.filter(n => (n.type === 'low_stock' || n.type === 'out_of_stock') && !n.isRead).length;
  }, [notifications]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'pos') {
      return notifications.filter(n => n.type === 'pos_session_started');
    }
    if (activeFilter === 'orders') {
      return notifications.filter(n => n.type === 'new_order');
    }
    if (activeFilter === 'stock') {
      return notifications.filter(n => n.type === 'low_stock' || n.type === 'out_of_stock');
    }
    return notifications;
  }, [notifications, activeFilter]);

  // Mark all as read (Independent per recipient)
  const handleMarkAllAsRead = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadIds(allIds);
    try {
      const storageKey = userUid ? `ksf_admin_read_notifications_${userUid}` : 'ksf_admin_read_notifications';
      localStorage.setItem(storageKey, JSON.stringify(Array.from(allIds)));
    } catch (e) {
      console.error(e);
    }
    // Update individual POS session docs if applicable
    notifications.forEach(n => {
      if (n.type === 'pos_session_started' && n.id) {
        posService.markNotificationRead(n.id, userUid);
      }
    });
  };

  // Click individual notification
  const handleNotificationClick = (item: AdminNotification) => {
    const next = new Set(readIds);
    next.add(item.id);
    setReadIds(next);
    try {
      const storageKey = userUid ? `ksf_admin_read_notifications_${userUid}` : 'ksf_admin_read_notifications';
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    } catch (e) {
      console.error(e);
    }
    if (item.type === 'pos_session_started' && item.id) {
      posService.markNotificationRead(item.id, userUid);
    }
    setIsOpen(false);
    navigate(item.targetUrl, {
      state: item.sessionId ? { targetSessionId: item.sessionId, liveView: true } : undefined
    });
  };

  // Handle [ View Live POS ] button click
  const handleViewLivePos = (e: React.MouseEvent, item: AdminNotification) => {
    e.stopPropagation();
    const next = new Set(readIds);
    next.add(item.id);
    setReadIds(next);
    try {
      const storageKey = userUid ? `ksf_admin_read_notifications_${userUid}` : 'ksf_admin_read_notifications';
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    } catch (err) {
      console.error(err);
    }
    if (item.id) {
      posService.markNotificationRead(item.id, userUid);
    }
    setIsOpen(false);
    navigate(item.targetUrl || `/admin/pos?session=${item.sessionId}`, {
      state: { targetSessionId: item.sessionId, liveView: true }
    });
  };

  // Handle [ Dismiss ] button click
  const handleDismiss = (e: React.MouseEvent, item: AdminNotification) => {
    e.stopPropagation();
    const next = new Set(dismissedIds);
    next.add(item.id);
    setDismissedIds(next);
    try {
      const storageKey = userUid ? `ksf_admin_dismissed_notifications_${userUid}` : 'ksf_admin_dismissed_notifications';
      localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
    } catch (err) {
      console.error(err);
    }
    if (item.type === 'pos_session_started' && item.id) {
      posService.markNotificationDismissed(item.id, userUid);
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

      {/* Flyout Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="admin_notification_dropdown_panel"
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed inset-x-2.5 top-16 max-h-[82dvh] sm:fixed-none sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[440px] sm:max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-pink-100/90 z-50 overflow-hidden flex flex-col"
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
                      <span className="truncate">Store Alerts & Live Feeds</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[#E91E8C] text-white text-[9px] font-mono font-black shrink-0">
                          {unreadCount} New
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">Real-time POS sessions, inventory & orders</p>
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

                {canReceivePosNotifs && (
                  <button
                    type="button"
                    id="admin_notif_filter_pos"
                    onClick={() => setActiveFilter('pos')}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                      activeFilter === 'pos'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Radio size={11} className={posNotificationsCount > 0 ? "animate-pulse text-indigo-300" : ""} />
                    <span>POS Sessions</span>
                    {posNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-md bg-indigo-500 text-white font-mono text-[9px]">
                        {posNotificationsCount}
                      </span>
                    )}
                  </button>
                )}

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
                  <span>Orders</span>
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
                  <span>Stock</span>
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
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-[260px] mx-auto">
                    {activeFilter === 'pos'
                      ? 'No active POS session notifications.'
                      : activeFilter === 'orders' 
                      ? 'No new incoming orders awaiting fulfillment.'
                      : activeFilter === 'stock'
                      ? 'Inventory healthy! No low stock alerts.'
                      : 'No unread alerts across POS sessions, catalog, or orders.'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((item) => {
                  const isPos = item.type === 'pos_session_started';
                  const isOrder = item.type === 'new_order';
                  const isOutOfStock = item.type === 'out_of_stock';

                  // POS Session Notification Card Layout
                  if (isPos) {
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`
                          p-3 rounded-xl border transition-all cursor-pointer relative group active:scale-[0.99] touch-manipulation space-y-2.5
                          ${item.isRead 
                            ? 'bg-white hover:bg-slate-50/80 border-slate-200/90 text-slate-600' 
                            : 'bg-indigo-50/50 hover:bg-indigo-50/80 border-indigo-200 text-slate-900 shadow-xs'}
                        `}
                      >
                        {/* Top Header: Title + Time */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Radio size={12} className={!item.isRead ? "animate-pulse" : ""} />
                            </div>
                            <span className="text-[11px] font-black text-indigo-950 truncate group-hover:text-indigo-600 transition-colors">
                              🔔 New POS Session Started
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-mono text-slate-400 flex items-center gap-0.5">
                              <Clock size={9} />
                              <span>{formatTimeAgo(item.timestamp)}</span>
                            </span>
                            {!item.isRead && (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white shrink-0" />
                            )}
                          </div>
                        </div>

                        {/* Session Metadata Box */}
                        <div className="bg-white/95 rounded-xl p-2.5 border border-indigo-100/90 shadow-2xs space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-extrabold text-slate-900 truncate">{item.userName || 'Store Staff'}</span>
                            </div>
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                              {formatRole(item.userRole)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-500 text-[10px] pt-1 border-t border-slate-100">
                            <span className="flex items-center gap-1 font-medium">
                              {getDeviceIcon(item.deviceType)}
                              <span className="capitalize">{formatDevice(item.deviceType)}</span>
                            </span>
                            <span className="font-mono text-slate-400">
                              Started: <span className="font-semibold text-slate-600">{formatTime(item.timestamp)}</span>
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: [ View Live POS ] & [ Dismiss ] */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            id={`view_live_pos_${item.sessionId}`}
                            onClick={(e) => handleViewLivePos(e, item)}
                            className="flex-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-lg text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer min-h-[30px]"
                            title={`Open Live POS for Session ${item.sessionId}`}
                          >
                            <Monitor size={12} />
                            <span>View Live POS</span>
                          </button>

                          <button
                            type="button"
                            id={`dismiss_pos_notif_${item.sessionId}`}
                            onClick={(e) => handleDismiss(e, item)}
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-[10px] font-bold transition flex items-center justify-center cursor-pointer min-h-[30px] border border-slate-200/80"
                            title="Dismiss this notification"
                          >
                            <span>Dismiss</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Standard Order or Stock Alert Card
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`
                        p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative group active:scale-[0.99] touch-manipulation
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
                  navigate('/admin/pos');
                }}
                className="flex-1 py-2 sm:py-1.5 px-2 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl border border-slate-200 hover:border-indigo-200 text-[10px] font-extrabold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer min-h-[36px]"
              >
                <Monitor size={12} className="text-indigo-600" />
                <span className="truncate">POS Terminal</span>
              </button>

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
                <span className="truncate">Stock ({products.filter(p => p.stock <= 5).length})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
