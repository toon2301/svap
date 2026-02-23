'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const { theme } = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    // Nastav dark mode pre popup okno
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleCallback = async () => {
      const userId = searchParams.get('user_id');
      const error = searchParams.get('error');
      const oauthSuccess = searchParams.get('oauth');
      
      const isProd = process.env.NODE_ENV === 'production';
      if (!isProd) {
        console.debug('OAuth callback loaded');
        console.debug('Search params:', searchParams.toString());
        console.debug('User ID:', userId);
        console.debug('Error:', error);
      }
      
      if (error) {
        console.error('OAuth error from URL:', error);
        setError(`${t('auth.oauthLoginFailed')}: ${error}`);
        setStatus('error');
        
        // Pošli error správu do parent okna
        if (window.opener) {
          !isProd && console.debug('Sending error message to parent window');
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: `${t('auth.oauthLoginFailed')}: ${error}`
          }, window.location.origin);
        }
        
        setTimeout(() => {
          window.close();
        }, 3000);
        return;
      }
      
      // Cookie-only mód: backend nastaví HttpOnly cookies, tokeny NESMÚ byť v URL
      if (oauthSuccess === 'success') {
        try {
          // Over session cez /me/ (ak prešlo, cookies fungujú)
          await api.get('/auth/me/');
          setStatus('success');
          if (window.opener) {
            const oauthNonce = sessionStorage.getItem('oauth_nonce');
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              nonce: oauthNonce
            }, window.location.origin);
            sessionStorage.removeItem('oauth_nonce');
          }
          setTimeout(() => window.close(), 1000);
          return;
        } catch (e) {
          setError(t('auth.missingGoogleTokens'));
          setStatus('error');
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_ERROR', error: t('auth.missingGoogleTokens') }, window.location.origin);
          }
          setTimeout(() => window.close(), 3000);
          return;
        }
      }

      setError(t('auth.oauthLoginFailed'));
      setStatus('error');
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_ERROR', error: t('auth.oauthLoginFailed') }, window.location.origin);
      }
      setTimeout(() => window.close(), 3000);
    };

    handleCallback();
  }, [searchParams, theme, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('auth.loggingYouIn')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('auth.pleaseWaitProcessing')}
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('auth.successfullyLoggedIn')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {t('auth.closingWindowRedirecting')}
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {t('auth.loginError')}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}