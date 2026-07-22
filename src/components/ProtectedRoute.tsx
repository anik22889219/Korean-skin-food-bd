import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wand2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF5F8] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 bg-[#E91E8C] rounded-full flex items-center justify-center shadow-lg shadow-[#E91E8C]/20 border border-[#FF62B2] animate-bounce">
          <Wand2 className="text-white animate-spin" size={24} />
        </div>
        <p className="text-sm font-medium text-pink-600 animate-pulse font-mono">Loading your account...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
