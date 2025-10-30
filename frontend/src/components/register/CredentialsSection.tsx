'use client';

import React from 'react';

interface Props {
  t: (k: string, def?: string) => string;
  username: string;
  email: string;
  errors: Record<string, string>;
  emailStatus: 'checking' | 'available' | 'taken' | 'error' | null;
  emailError: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string) => void;
  onEmailBlur: (email: string) => void;
}

export default function CredentialsSection({ t, username, email, errors, emailStatus, emailError, onChange, onKeyDown, onEmailBlur }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="username" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
          {t('auth.username')} *
        </label>
        <input
          id="username"
          type="text"
          name="username"
          value={username}
          onChange={onChange}
          onKeyDown={(e) => onKeyDown(e, 'username')}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
            errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder={t('auth.usernamePlaceholder')}
          aria-label={t('auth.usernameHelp')}
          aria-required="true"
          aria-invalid={errors.username ? 'true' : 'false'}
          aria-describedby={errors.username ? 'username-error' : 'username-help'}
          tabIndex={2}
          autoComplete="username"
        />
        <div id="username-help" className="sr-only">{t('auth.usernameHelp')}</div>
        {errors.username && (
          <p id="username-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">{errors.username}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
          {t('auth.email')} *
        </label>
        <input
          id="email"
          type="email"
          name="email"
          value={email}
          onChange={onChange}
          onKeyDown={(e) => onKeyDown(e, 'email')}
          onBlur={(e) => onEmailBlur(e.target.value)}
          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
            errors.email ? 'border-red-500' : emailStatus === 'taken' ? 'border-red-500' : emailStatus === 'available' ? 'border-green-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder={t('auth.emailPlaceholder')}
          aria-label={t('auth.emailHelp')}
          aria-required="true"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : 'email-help'}
          tabIndex={3}
          autoComplete="email"
        />
        <div id="email-help" className="sr-only">{t('auth.emailHelp')}</div>

        {emailStatus === 'checking' && (
          <div className="flex items-center text-blue-600 text-sm mt-1" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            {t('auth.checkingEmail')}
          </div>
        )}
        {emailStatus === 'available' && (
          <div className="flex items-center text-green-600 text-sm mt-1" role="status" aria-live="polite">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {t('auth.emailAvailable')}
          </div>
        )}
        {emailStatus === 'taken' && (
          <div className="flex items-center text-red-600 text-sm mt-1" role="alert" aria-live="polite">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {t('auth.emailTaken')}
          </div>
        )}
        {emailStatus === 'error' && emailError && (
          <div className="flex items-center text-red-600 text-sm mt-1" role="alert" aria-live="polite">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {emailError}
          </div>
        )}
        {errors.email && (
          <p id="email-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">{errors.email}</p>
        )}
      </div>
    </div>
  );
}


