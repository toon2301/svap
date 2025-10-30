'use client';

import React from 'react';

interface CredentialsProps {
  t: (k: string, def?: string) => string;
  email: string;
  password: string;
  errors: { email?: string; password?: string };
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string) => void;
}

export default function Credentials({ t, email, password, errors, showPassword, setShowPassword, onEmailChange, onPasswordChange, onKeyDown }: CredentialsProps) {
  return (
    <>
      <div>
        <label htmlFor="login-email" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-2 max-lg:text-base max-lg:mb-1">
          {t('auth.email')}
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          value={email}
          onChange={onEmailChange}
          onKeyDown={(e) => onKeyDown(e, 'email')}
          className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all ${
            errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
          }`}
          placeholder={t('placeholders.email')}
          aria-label={t('auth.emailHelp')}
          aria-required="true"
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : 'email-help'}
          tabIndex={1}
          autoComplete="email"
        />
        <div id="email-help" className="sr-only">
          {t('auth.emailHelp')}
        </div>
        {errors.email && (
          <p id="email-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="login-password" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-2 max-lg:text-base max-lg:mb-1">
          {t('auth.password')}
        </label>
        <div className="relative flex items-center">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={onPasswordChange}
            onKeyDown={(e) => onKeyDown(e, 'password')}
            className={`w-full px-3 py-2 text-sm pr-12 border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all ${
              errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder={t('placeholders.password')}
            aria-label={t('auth.passwordHelp')}
            aria-required="true"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : 'password-help'}
            tabIndex={2}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            className="absolute right-3 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded w-6 h-6"
            style={{ height: '100%' }}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        <div id="password-help" className="sr-only">{t('auth.passwordHelp')}</div>
        {errors.password && (
          <p id="password-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
            {errors.password}
          </p>
        )}
      </div>
    </>
  );
}


