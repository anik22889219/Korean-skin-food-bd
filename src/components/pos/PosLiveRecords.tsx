import React, { useState, useEffect } from 'react';
import { PosSession } from '../../types';
import { posService, isSessionStale, formatSessionActivityTime } from '../../services/posService';
import { 
  Radio, 
  Smartphone, 
  Monitor, 
  Tablet, 
  User, 
  Eye, 
  Search, 
  X, 
  Clock, 
  Package, 
  Layers, 
  Activity,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface PosLiveRecordsProps {
  onSelectSession: (sessionId: string) => void;
  currentUserRole?: string;
}

export const PosLiveRecords: React.FC<PosLiveRecordsProps> = ({
  onSelectSession,
  currentUserRole
}) => {
  const [liveSessions, setLiveSessions] = useState<PosSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastTick, setLastTick] = useState(Date.now());

  // 1. Subscribe to active POS sessions in real time via posService / onSnapshot
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = posService.subscribeActiveSessions(
      (sessions) => {
        setLiveSessions(sessions);
        setIsLoading(false);
      },
      (err) => {
        console.warn('[PosLiveRecords] Active sessions subscription note:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Periodic ticker every 5 seconds to keep relative time strings and LIVE/STALE status badges freshly updated
  useEffect(() => {
    const timer = setInterval(() => {
      setLastTick(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Filter sessions by query
  const filteredSessions = liveSessions.filter((sess) => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return true;
    const operator = (sess.userName || sess.operatorName || '').toLowerCase();
    const role = (sess.userRole || '').toLowerCase();
    const sId = (sess.sessionId || sess.id || '').toLowerCase();
    const email = (sess.operatorEmail || '').toLowerCase();
    const device = (sess.deviceType || '').toLowerCase();
    return (
      operator.includes(term) ||
      role.includes(term) ||
      sId.includes(term) ||
      email.includes(term) ||
      device.includes(term)
    );
  });

  const getDeviceIcon = (device?: string) => {
    if (device === 'mobile') return <Smartphone size={14} className="text-pink-500" />;
    if (device === 'tablet') return <Tablet size={14} className="text-purple-500" />;
    return <Monitor size={14} className="text-blue-500" />;
  };

  const getDeviceLabel = (device?: string) => {
    if (device === 'mobile') return 'Mobile';
    if (device === 'tablet') return 'Tablet';
    return 'Desktop';
  };

  const getRoleBadgeColor = (role?: string) => {
    if (role === 'super_admin') return 'bg-purple-100 text-purple-800 border-purple-200';
    if (role === 'admin') return 'bg-pink-100 text-pink-800 border-pink-200';
    if (role === 'inventory_manager') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleDisplayName = (role?: string) => {
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Admin';
    if (role === 'inventory_manager') return 'Inventory Manager';
    return role ? role.replace('_', ' ') : 'Staff';
  };

  // Helper to calculate products count and total units
  const getSessionCounts = (session: PosSession) => {
    const items = Array.isArray(session.items) ? session.items : [];
    if (items.length > 0) {
      const uniqueProductsCount = items.length;
      const totalUnitsCount = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
      return { uniqueProductsCount, totalUnitsCount };
    }
    const totalScanned = session.totalScannedItems || 0;
    return { uniqueProductsCount: totalScanned > 0 ? 1 : 0, totalUnitsCount: totalScanned };
  };

  const mobileCount = liveSessions.filter((s) => s.deviceType === 'mobile').length;
  const desktopCount = liveSessions.filter((s) => s.deviceType === 'desktop' || !s.deviceType).length;

  return (
    <div className="space-y-6 animate-fadeIn" id="pos-live-records-container">
      {/* Live Monitoring Header & Metric Summary */}
      <div className="bg-white p-5 sm:p-6 rounded-[32px] border border-pink-100 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span>Live Staff POS Registers</span>
              </h3>
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                {liveSessions.length} Active {liveSessions.length === 1 ? 'Session' : 'Sessions'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Real-time read-only observation of active in-store and mobile registers operated by authorized staff.
            </p>
          </div>

          {/* Device Breakdown Pills */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="inline-flex items-center gap-1.5 bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1.5 rounded-xl font-bold">
              <Smartphone size={13} />
              <span>{mobileCount} Mobile</span>
            </span>
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl font-bold">
              <Monitor size={13} />
              <span>{desktopCount} Desktop</span>
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="relative">
          <Search size={16} className="text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search live registers by operator name, role, device, or session ID..."
            className="w-full bg-gray-50/70 text-gray-800 text-xs pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 outline-none focus:border-[#E91E8C] focus:bg-white transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* LIVE POS SESSIONS GRID / CARDS */}
      {isLoading ? (
        <div className="bg-white rounded-[32px] border border-pink-100 p-12 text-center space-y-3 shadow-xs">
          <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-700">Connecting to live staff registers...</p>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white rounded-[32px] border border-pink-100 p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 bg-pink-50 rounded-full flex items-center justify-center mx-auto text-[#E91E8C]">
            <Radio size={28} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">
              {searchQuery ? 'No matching live POS registers' : 'No staff POS registers currently open'}
            </h4>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search criteria.'
                : 'When an authorized staff member opens a mobile or desktop POS session, it will automatically appear here in real-time.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredSessions.map((session) => {
            const isStale = isSessionStale(session.lastSeenAt || session.updated_at, 90);
            const { uniqueProductsCount, totalUnitsCount } = getSessionCounts(session);
            const activityText = formatSessionActivityTime(session.lastSeenAt || session.lastScanTime || session.updated_at);
            const startedDate = session.startedAt || session.created_at;
            const formattedStartTime = startedDate 
              ? new Date(startedDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) 
              : 'Recently';

            return (
              <div
                key={session.id}
                id={`live-pos-card-${session.id}`}
                className="bg-white rounded-[28px] border border-pink-100 hover:border-pink-300 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 relative overflow-hidden group"
              >
                {/* Top Status Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-center text-[#E91E8C] font-bold text-sm shrink-0">
                      {getDeviceIcon(session.deviceType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">
                          {session.userName || session.operatorName || 'Store Staff'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor(session.userRole)}`}>
                          {getRoleDisplayName(session.userRole)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                          {getDeviceIcon(session.deviceType)}
                          <span>{getDeviceLabel(session.deviceType)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Realtime Live / Stale Badge */}
                  <div className="shrink-0 text-right">
                    {!isStale ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-xl text-[11px] font-extrabold shadow-2xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>LIVE</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-xl text-[11px] font-extrabold">
                        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                        <span>IDLE</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Session Details Matrix */}
                <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-[11px]">Session ID</span>
                    <span className="font-mono font-bold text-gray-800 text-[11px]">
                      {session.sessionId || session.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-[11px]">Started</span>
                    <span className="text-gray-800 font-medium text-[11px] flex items-center gap-1">
                      <Clock size={11} className="text-gray-400" />
                      {formattedStartTime}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                    <span className="text-gray-500 text-[11px]">Live Cart Content</span>
                    <span className="font-bold text-[#E91E8C] text-[11px]">
                      {uniqueProductsCount} {uniqueProductsCount === 1 ? 'Product' : 'Products'} ({totalUnitsCount} {totalUnitsCount === 1 ? 'Unit' : 'Units'})
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-[11px]">Last Activity</span>
                    <span className="text-gray-700 font-medium text-[11px]">
                      {activityText}
                    </span>
                  </div>
                </div>

                {/* Action: View Live POS Button */}
                <button
                  type="button"
                  id={`btn-view-live-pos-${session.id}`}
                  onClick={() => onSelectSession(session.sessionId || session.id)}
                  className="w-full bg-[#E91E8C] hover:bg-[#FF4B91] active:scale-[0.98] text-white py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs shadow-pink-200 group-hover:shadow-md"
                >
                  <Eye size={15} />
                  <span>VIEW LIVE POS</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
