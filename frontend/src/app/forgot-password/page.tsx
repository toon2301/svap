'use client';

import { useState, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useLanguage } from '../../contexts/LanguageContext';

// Lazy load particle efekt
const ParticlesBackground = lazy(() => import('../../components/ParticlesBackground'));

interface ForgotPasswordData {
  email: string;
}

interface ForgotPasswordErrors {
  general?: string;
  email?: string;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [formData, setFormData] = useState<ForgotPasswordData>({
    email: ''
  });
  const [errors, setErrors] = useState<ForgotPasswordErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Vymazanie chyby pri zmene hodnoty
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ForgotPasswordErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = t('auth.emailRequired');
    }

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = t('auth.invalidEmailFormat');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // Použi vlastný password reset endpoint
      await api.post('/auth/password-reset/', {
        email: formData.email
      });
      
      setIsSuccess(true);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else {
        setErrors({ general: t('auth.passwordResetError') });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col relative" style={{background: 'var(--background)'}}>
        <Suspense fallback={
          <div className="absolute inset-0 z-0 max-lg:hidden">
            {/* Fallback len pre desktop */}
          </div>
        }>
          <ParticlesBackground />
        </Suspense>
        
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <motion.div 
            className="w-full max-w-[min(600px,90vw)] lg:max-w-[clamp(400px,40vw,600px)] bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="px-[clamp(1.5rem,4vw,2.5rem)] py-[clamp(1.5rem,3vw,1.875rem)]">
              <motion.h1 
                className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium text-center mb-[clamp(1.5rem,3vw,2rem)] text-black dark:text-white tracking-wider"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {t('auth.emailSent')}
              </motion.h1>

              <motion.div 
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">{t('auth.passwordResetEmailSent')}</p>
                    <p className="text-sm mt-1">
                      {t('auth.checkEmailForReset', 'Skontrolujte si emailovú schránku na adrese')} <strong>{formData.email}</strong> {t('auth.andClickResetLink', 'a kliknite na odkaz pre reset hesla')}.
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <p className="text-[clamp(1rem,2vw,1.5rem)] text-gray-600 dark:text-gray-300 mb-4">
                  {t('auth.backToLogin')}
                </p>
                <a 
                  href="/" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-purple-700 transition-colors"
                >
                  {t('auth.login')}
                </a>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{background: 'var(--background)'}}>
      <Suspense fallback={
        <div className="absolute inset-0 z-0 max-lg:hidden">
          {/* Fallback len pre desktop */}
        </div>
      }>
        <ParticlesBackground />
      </Suspense>
      
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div 
          className="w-full max-w-[min(600px,90vw)] lg:max-w-[clamp(400px,40vw,600px)] bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="px-[clamp(1.5rem,4vw,2.5rem)] py-[clamp(1.5rem,3vw,1.875rem)]">
            <motion.h1 
              className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-medium text-center mb-[clamp(1.5rem,3vw,2rem)] text-black dark:text-white tracking-wider"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {t('auth.forgotPassword')}
            </motion.h1>

            <motion.p 
              className="text-[clamp(0.875rem,2vw,1.125rem)] text-gray-600 dark:text-gray-300 text-center mb-[clamp(1.5rem,3vw,2rem)]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {t('auth.forgotPasswordDescription')}
            </motion.p>

            {errors.general && (
              <motion.div 
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {errors.general}
              </motion.div>
            )}

            <motion.form 
              onSubmit={handleSubmit}
              className="space-y-6 max-lg:space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div>
                <label htmlFor="email" className="block text-[clamp(0.875rem,1.8vw,1.125rem)] font-normal text-gray-600 dark:text-gray-300 mb-2">
                  {t('auth.emailAddress')}
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-[clamp(0.75rem,2vw,1rem)] text-[clamp(0.875rem,1.8vw,1.125rem)] border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                  placeholder={t('auth.emailPlaceholder')}
                  aria-label={t('auth.enterEmailForReset')}
                  aria-required="true"
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : "email-help"}
                />
                <div id="email-help" className="sr-only">
                  {t('auth.enterEmailForReset')}
                </div>
                {errors.email && (
                  <p id="email-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                    {errors.email}
                  </p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                aria-label={t('auth.sendResetEmail')}
                className={`w-full text-white px-6 py-[clamp(0.75rem,2vw,1.25rem)] rounded-2xl font-semibold text-[clamp(0.875rem,2vw,1.25rem)] transition-all mt-6 ${
                  isLoading ? 'cursor-not-allowed bg-purple-400 opacity-80' : 'cursor-pointer bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
                }`}
                style={{
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-center gap-3">
                  {isLoading && (
                    <motion.div
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      aria-hidden="true"
                    />
                  )}
                  {isLoading ? t('auth.sending') : t('auth.sendResetEmail')}
                </div>
              </motion.button>
            </motion.form>

            <div className="text-center mt-4">
              <p className="text-[clamp(0.875rem,2vw,1.5rem)] text-gray-600 dark:text-gray-300">
                {t('auth.rememberPassword')}{' '}
                <a 
                  href="/" 
                  className="text-purple-800 dark:text-purple-400 font-semibold hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
                >
                  {t('auth.login')}
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
