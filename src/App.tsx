import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { MainLayout } from './components/MainLayout';
import { StoreCatalog } from './components/StoreCatalog';
import { ShopCategoryPage } from './components/ShopCategoryPage';
import { ProductDetail } from './components/ProductDetail';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboardHome } from './components/AdminDashboardHome';
import { ProductManagement } from './components/ProductManagement';
import { AdminSEO } from './components/AdminSEO';
import { AdminSocial } from './components/AdminSocial';
import { AdminChatLeads } from './components/AdminChatLeads';
import { AdminThemeEditor } from './components/AdminThemeEditor';
import { AdminOrders } from './components/AdminOrders';
import { AdminSlackSettings } from './components/AdminSlackSettings';
import { AdminAIAgents } from './components/AdminAIAgents';
import { UserManagement } from './components/UserManagement';
import { AdminCreators } from './components/AdminCreators';
import { CreatorRoute } from './components/CreatorRoute';
import { CreatorLayout } from './components/CreatorLayout';
import { CreatorDashboard } from './components/CreatorDashboard';
import { CreatorProfilePage } from './components/CreatorProfilePage';
import { CreatorReelsPage } from './components/CreatorReelsPage';
import { CreatorReelUploadPage } from './components/CreatorReelUploadPage';
import { CreatorLeaderboardPage } from './components/CreatorLeaderboardPage';
import { BecomeCreatorPage } from './components/BecomeCreatorPage';
import { AboutUs } from './components/AboutUs';
import { ContactUs } from './components/ContactUs';
import PosRegister from './components/PosRegister';
import PosScan from './components/PosScan';
import { productService } from './services/productService';
import { analytics } from './services/analyticsService';

// Centralized SPA Route Tracker for Meta Pixel PageView and GA4 page_view
const RouteTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    analytics.trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return null;
};

// Wrapper for in-store QR scanning to consume useParams and AuthContext cleanly
const PosScanRouteWrapper: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#FFF5F8] text-gray-800 font-sans">
      <PosScan 
        sessionId={sessionId || ''} 
        onBack={() => navigate('/')} 
        currentUser={profile} 
        onLoginStaff={(email, role) => {
          console.log('[PosScan] Simulated staff login overlay:', email, role);
        }}
      />
    </div>
  );
};

// Wrapper for the POS Register simulator to pass products
const PosRegisterRouteWrapper: React.FC = () => {
  const navigate = useNavigate();
  const products = productService.getProducts();
  
  return <PosRegister onBack={() => navigate('/admin')} products={products} />;
};

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <RouteTracker />
          <Routes>
            {/* PUBLIC SHOP PAGES */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<StoreCatalog />} />
              <Route path="shop" element={<ShopCategoryPage />} />
              <Route path="become-a-creator" element={<BecomeCreatorPage />} />
              <Route path="creator/apply" element={<BecomeCreatorPage />} />
              <Route path="about-us" element={<AboutUs />} />
              <Route path="contact-us" element={<ContactUs />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="login" element={<Login />} />
              
              {/* CUSTOMER PORTAL - REQUIRES GOOGLE AUTH */}
              <Route element={<ProtectedRoute />}>
                <Route path="profile" element={<Profile />} />
              </Route>

              {/* CREATOR SYSTEM ROUTES */}
              <Route path="creator" element={<CreatorRoute />}>
                <Route element={<CreatorLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<CreatorDashboard />} />
                  <Route path="profile" element={<CreatorProfilePage />} />
                  <Route path="reels" element={<CreatorReelsPage />} />
                  <Route path="reels/upload" element={<CreatorReelUploadPage />} />
                  <Route path="leaderboard" element={<CreatorLeaderboardPage />} />
                </Route>
              </Route>
            </Route>

            {/* IN-STORE POS LIVE SCAN (PUBLICLY ACCESSIBLE URL FOR MOBILE CAMERAS) */}
            <Route path="pos/scan/:sessionId" element={<PosScanRouteWrapper />} />

            {/* ADMIN DASHBOARD HUB - ADMINS/SUPER_ADMINS ONLY */}
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardHome />} />
                <Route path="creators" element={<AdminCreators />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="theme-editor" element={<AdminThemeEditor />} />
                <Route path="pos" element={<PosRegisterRouteWrapper />} />
                <Route path="products" element={<ProductManagement />} />
                <Route path="seo" element={<AdminSEO />} />
                <Route path="social" element={<AdminSocial />} />
                <Route path="chat-leads" element={<AdminChatLeads />} />
                <Route path="slack" element={<AdminSlackSettings />} />
                <Route path="ai-agents" element={<AdminAIAgents />} />
              </Route>
            </Route>

            {/* FALLBACK ROUTING */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
