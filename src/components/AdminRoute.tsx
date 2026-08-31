import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessAdminRoute, isStaffRole, hasPermission } from '../utils/permissions';
import { ShieldCheck, ShieldAlert, Lock } from 'lucide-react';

interface AdminRouteProps {
  requiredPermission?: Parameters<typeof hasPermission>[1];
}

interface ServerAuthResult {
  status: 'checking' | 'authorized' | 'unauthorized';
  redirectUrl?: string;
  errorMessage?: string;
  verifiedRole?: string;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ requiredPermission }) => {
  const { user, profile, loading, isStaff } = useAuth();
  const location = useLocation();

  const [serverAuth, setServerAuth] = useState<ServerAuthResult>({
    status: 'checking'
  });

  useEffect(() => {
    let isMounted = true;

    // Reset status to checking whenever location or user changes
    setServerAuth({ status: 'checking' });

    if (loading) {
      return;
    }

    if (!user) {
      if (isMounted) {
        setServerAuth({ status: 'unauthorized', redirectUrl: '/login' });
      }
      return;
    }

    // Fast-fail if client role is clearly non-staff
    if (!isStaff || !profile?.role || !isStaffRole(profile.role)) {
      if (isMounted) {
        setServerAuth({ status: 'unauthorized', redirectUrl: '/' });
      }
      return;
    }

    // Fast-fail client permission check to avoid unnecessary network if definitely not permitted
    if (requiredPermission && !hasPermission(profile.role, requiredPermission)) {
      let fallback = '/';
      if (hasPermission(profile.role, 'VIEW_ADMIN_DASHBOARD')) fallback = '/admin';
      else if (hasPermission(profile.role, 'USE_POS')) fallback = '/admin/pos';

      if (isMounted) {
        setServerAuth({ status: 'unauthorized', redirectUrl: fallback });
      }
      return;
    }

    if (!canAccessAdminRoute(profile.role, location.pathname)) {
      let fallback = '/';
      if (hasPermission(profile.role, 'VIEW_ADMIN_DASHBOARD') && location.pathname !== '/admin') fallback = '/admin';
      else if (hasPermission(profile.role, 'USE_POS') && location.pathname !== '/admin/pos') fallback = '/admin/pos';
      else if (hasPermission(profile.role, 'MANAGE_PRODUCTS') && location.pathname !== '/admin/products') fallback = '/admin/products';

      if (isMounted) {
        setServerAuth({ status: 'unauthorized', redirectUrl: fallback });
      }
      return;
    }

    // Perform authoritative server-side authorization check with fresh ID Token
    async function verifyWithServer() {
      try {
        const idToken = await user?.getIdToken(true);
        if (!idToken) {
          if (isMounted) {
            setServerAuth({ status: 'unauthorized', redirectUrl: '/login' });
          }
          return;
        }

        const res = await fetch('/api/auth/verify-route', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            pathname: location.pathname,
            requiredPermission
          })
        });

        const data = await res.json().catch(() => ({}));

        if (!isMounted) return;

        if (res.ok && data.authorized) {
          setServerAuth({
            status: 'authorized',
            verifiedRole: data.role
          });
        } else {
          setServerAuth({
            status: 'unauthorized',
            redirectUrl: data.redirectUrl || '/',
            errorMessage: data.error || 'Server rejected administrative authorization.'
          });
        }
      } catch (err: any) {
        console.error('Server route authorization check failed:', err);
        // Fail-closed: Never silently authorize on server errors
        if (isMounted) {
          setServerAuth({
            status: 'unauthorized',
            errorMessage: 'Security verification failed: server authorization unreachable. Access denied.'
          });
        }
      }
    }

    verifyWithServer();

    return () => {
      isMounted = false;
    };
  }, [user, profile, loading, isStaff, location.pathname, requiredPermission]);

  // If AuthContext is loading OR server-side authorization is in progress
  if (loading || serverAuth.status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4 p-4">
        <div className="relative">
          <div className="w-14 h-14 bg-pink-500/10 rounded-2xl flex items-center justify-center border border-pink-500/30 shadow-2xl shadow-pink-500/20">
            <Lock className="text-pink-500 animate-pulse" size={24} />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950 animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-200 tracking-wide">Authorizing Administrative Access</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">Verifying server-side credentials...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Server authorization failed
  if (serverAuth.status === 'unauthorized') {
    if (serverAuth.redirectUrl && serverAuth.redirectUrl !== location.pathname) {
      return <Navigate to={serverAuth.redirectUrl} replace />;
    }

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center text-slate-100 shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <ShieldAlert size={28} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-sm text-slate-400 mb-6">
            {serverAuth.errorMessage || (
              <>
                Your role (<span className="text-pink-400 font-semibold uppercase">{profile?.role?.replace('_', ' ') || 'unassigned'}</span>) is not authorized to access this administrative module.
              </>
            )}
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-[#E91E8C] to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white text-xs font-bold rounded-xl shadow-lg transition"
          >
            Return to Store
          </a>
        </div>
      </div>
    );
  }

  // Server authorized - safe to mount child components and initiate data fetching
  return <Outlet />;
};
