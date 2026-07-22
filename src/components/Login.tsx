import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Wand2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const { user, signInWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      const redirect = searchParams.get('redirect') || '/';
      navigate(redirect, { replace: true });
    }
  }, [user, navigate, searchParams]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google Sign-In Failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F8] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-[32px] p-8 border border-pink-100 shadow-xl shadow-pink-100/30 text-center space-y-6"
      >
        {/* Logo Icon */}
        <div className="w-16 h-16 bg-[#E91E8C] rounded-full flex items-center justify-center shadow-lg shadow-[#E91E8C]/20 border border-[#FF62B2] mx-auto">
          <Wand2 className="text-white" size={32} />
        </div>

        {/* Title & Desc */}
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to Korean Skin Food BD</h2>
          <p className="text-sm text-gray-500">
            Sign in to access your custom e-commerce profile, view previous orders, and enjoy personalized K-Beauty recommendations.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-4 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-2xl border-2 border-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="border-t border-pink-50 pt-4 flex justify-between items-center text-[11px] text-gray-400">
          <span>100% Secure Auth</span>
          <span className="flex items-center gap-1 text-[#E91E8C] font-semibold cursor-pointer" onClick={() => navigate('/')}>
            Back to Shop <ArrowRight size={10} />
          </span>
        </div>
      </motion.div>
    </div>
  );
};
