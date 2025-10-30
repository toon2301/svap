'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GoogleLoginBlockProps {
  t: (k: string, def?: string) => string;
  isGoogleLoading: boolean;
  isLoginLoading: boolean;
  onGoogleLogin: () => void;
}

export default function GoogleLoginBlock({ t, isGoogleLoading, isLoginLoading, onGoogleLogin }: GoogleLoginBlockProps) {
  return (
    <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 1.2 }}>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">{t('common.or')}</span>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={onGoogleLogin}
        disabled={isGoogleLoading || isLoginLoading}
        aria-label={t('auth.loginWithGoogle')}
        aria-describedby="google-login-help"
        className={`w-full mt-4 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all ${
          isGoogleLoading || isLoginLoading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        whileHover={!isGoogleLoading && !isLoginLoading ? { scale: 1.02 } : {}}
        whileTap={!isGoogleLoading && !isLoginLoading ? { scale: 0.98 } : {}}
        tabIndex={4}
      >
        <div className="flex items-center justify-center gap-3">
          {isGoogleLoading ? (
            <motion.div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} aria-hidden="true" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span>{isGoogleLoading ? t('auth.loggingInGoogle') : t('auth.loginWithGoogle')}</span>
        </div>
      </motion.button>
      <div id="google-login-help" className="sr-only">{t('accessibility.googleLoginHelp')}</div>
    </motion.div>
  );
}


