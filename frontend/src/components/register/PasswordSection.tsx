'use client';

import React from 'react';

interface Props {
  t: (k: string, def?: string) => string;
  password: string;
  passwordConfirm: string;
  errors: Record<string, string>;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  showPasswordConfirm: boolean;
  setShowPasswordConfirm: (v: boolean) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string) => void;
}

export default function PasswordSection({ t, password, passwordConfirm, errors, showPassword, setShowPassword, showPasswordConfirm, setShowPasswordConfirm, onChange, onKeyDown }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label htmlFor="password" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
          {t('auth.password')} *
        </label>
        <div className="relative flex items-center">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={password}
            onChange={onChange}
            onKeyDown={(e) => onKeyDown(e, 'password')}
            className={`w-full px-3 py-2 text-sm pr-12 border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
              errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder={t('auth.passwordPlaceholder')}
            aria-label={t('auth.passwordHelp')}
            aria-required="true"
            aria-invalid={errors.password ? 'true' : 'false'}
            aria-describedby={errors.password ? 'password-error' : 'password-help'}
            tabIndex={4}
            autoComplete="new-password"
          />
          <div id="password-help" className="sr-only">{t('auth.passwordHelp')}</div>
          <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className="absolute right-2 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-300 focus:ring-offset-2 rounded" style={{ height: '100%' }}>
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
      </div>

      <div>
        <label htmlFor="password_confirm" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
          {t('auth.confirmPassword')} *
        </label>
        <div className="relative flex items-center">
          <input
            id="password_confirm"
            type={showPasswordConfirm ? 'text' : 'password'}
            name="password_confirm"
            value={passwordConfirm}
            onChange={onChange}
            className={`w-full px-3 py-2 text-sm pr-12 border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
              errors.password_confirm ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
            }`}
            placeholder={t('auth.passwordPlaceholder')}
          />
          <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)} aria-label={showPasswordConfirm ? t('auth.hidePassword') : t('auth.showPassword')} className="absolute right-2 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" style={{ height: '100%' }}>
            {showPasswordConfirm ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {errors.password_confirm && <p className="text-red-500 text-sm mt-1">{errors.password_confirm}</p>}
      </div>
    </div>
  );
}


