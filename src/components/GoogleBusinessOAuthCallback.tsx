import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { googleBusinessService } from '../services/googleBusinessService';

export const GoogleBusinessOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // 1. Check for error parameters from Google OAuth
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error) {
      const msg = errorDescription || error;
      setStatus('error');
      setErrorMessage(msg);
      if (window.opener) {
        window.opener.postMessage({ type: 'GOOGLE_BUSINESS_OAUTH_ERROR', error: msg }, '*');
        setTimeout(() => window.close(), 2000);
      }
      return;
    }

    // 2. Extract code or access_token from query or hash fragment
    const code = searchParams.get('code');
    let accessToken = searchParams.get('access_token');
    
    if (!accessToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      accessToken = hashParams.get('access_token');
    }

    if (accessToken) {
      googleBusinessService.setOAuthAccessToken(accessToken);
    }

    if (code || accessToken) {
      setStatus('success');
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'GOOGLE_BUSINESS_OAUTH_SUCCESS',
            code,
            accessToken,
          },
          '*'
        );
        setTimeout(() => window.close(), 1200);
      } else {
        setTimeout(() => {
          navigate('/admin/testimonials', { replace: true });
        }, 1500);
      }
    } else {
      setStatus('error');
      setErrorMessage('No authorization code or token was received from Google.');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-6 text-center space-y-4">
        {status === 'processing' && (
          <div className="space-y-3 py-6">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
            <h2 className="text-base font-black text-slate-900">Connecting Google Business Profile...</h2>
            <p className="text-xs text-slate-500">Please wait while we complete the authorization.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3 py-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h2 className="text-base font-black text-slate-900">Google Business Connected!</h2>
            <p className="text-xs text-slate-500">Redirecting to Customer Reviews dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3 py-4">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-base font-black text-slate-900">Authorization Notice</h2>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 text-left leading-relaxed">
              {errorMessage}
            </div>
            <p className="text-[11px] text-slate-500">
              Note: For Google Business Profile sync, ensure the Authorized Redirect URI in Google Cloud Console is configured, or sync directly using your Place ID.
            </p>
            <button
              onClick={() => navigate('/admin/testimonials')}
              className="mt-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Customer Reviews</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
