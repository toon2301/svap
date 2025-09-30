'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { setAuthTokens } from '@/utils/auth';

export default function OAuthCallback() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh_token');
      const userId = searchParams.get('user_id');
      const error = searchParams.get('error');
      
      console.log('OAuth callback page loaded');
      console.log('Full URL:', window.location.href);
      console.log('Search params:', searchParams.toString());
      console.log('Token:', token ? `${token.substring(0, 20)}...` : 'null');
      console.log('Refresh token:', refreshToken ? `${refreshToken.substring(0, 20)}...` : 'null');
      console.log('User ID:', userId);
      console.log('Error:', error);
      
      if (error) {
        console.error('OAuth error from URL:', error);
        setError(`OAuth prihlásenie zlyhalo: ${error}`);
        setStatus('error');
        
        // Pošli error správu do parent okna
        if (window.opener) {
          console.log('Sending error message to parent window');
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: `OAuth prihlásenie zlyhalo: ${error}`
          }, '*');
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
        return;
      }
      
      if (!token || !refreshToken) {
        console.error('Missing tokens');
        setError('Chýbajú tokeny z Google prihlásenia');
        setStatus('error');
        
        // Pošli error správu do parent okna
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: 'Chýbajú tokeny z Google prihlásenia'
          }, '*');
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
        return;
      }

      try {
        console.log('Preparing tokens for parent window...');
        // Priprav tokeny pre hlavné okno (NEUKLADAJ ich do popup okna!)
        const tokens = {
          access: token,
          refresh: refreshToken
        };
        
        console.log('Storing tokens and closing popup...');
        // Ulož tokeny do localStorage (zdieľané medzi oknami)
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        localStorage.setItem('oauth_success', 'true');
        
        console.log('Tokens stored in localStorage, closing popup...');
        // Zatvor popup okno
        setTimeout(() => {
          console.log('Closing popup window...');
          window.close();
        }, 1000);
        
        setStatus('success');
        
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        
        const errorMessage = err.message || 'Chyba pri uložení tokenov';
        setError(errorMessage);
        setStatus('error');
        
        console.log('Sending error message to parent window:', errorMessage);
        // Pošli error správu do parent okna
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: errorMessage
          }, '*');
        }
        
        // Zatvor popup po chybe
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Prihlasujem vás...
            </h2>
            <p className="text-gray-600">
              Prosím počkajte, spracovávam vaše prihlásenie.
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Úspešne prihlásený!
            </h2>
            <p className="text-gray-600">
              Zatváram okno a presmerovávam vás na dashboard...
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Chyba pri prihlásení
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Zatvoriť okno
            </button>
          </div>
        )}
      </div>
    </div>
  );
}