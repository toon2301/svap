'use client';

import { lazy, Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';

const ParticlesBackground = lazy(() => import('../ParticlesBackground'));

const INSTAGRAM_URL = 'https://www.instagram.com/svaplyofficial/';
const FACEBOOK_URL = 'https://www.facebook.com/SvaplyOfficial';
const SUPPORT_EMAIL = 'info@svaply.com';

const sectionMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.55, ease: 'easeOut' },
};

interface ContactFormData {
  email: string;
  message: string;
}

interface ContactFormErrors {
  general?: string;
  email?: string;
  message?: string;
}

function SocialLinks({ t }: { t: (key: string, fallback?: string) => string }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('contact.social.instagram', 'Instagram')}
        className="p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t('contact.social.facebook', 'Facebook')}
        className="p-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
    </div>
  );
}

export default function ContactPage() {
  const { t } = useLanguage();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const [formData, setFormData] = useState<ContactFormData>({ email: '', message: '' });
  const [errors, setErrors] = useState<ContactFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ContactFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ContactFormErrors = {};
    const email = formData.email.trim();
    const message = formData.message.trim();

    if (!email) {
      newErrors.email = t('auth.emailRequired', 'Email je povinný');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = t('auth.invalidEmailFormat', 'Neplatný formát emailu');
      }
    }

    if (!message) {
      newErrors.message = t('contact.errors.messageRequired', 'Správa je povinná');
    } else if (message.length > 2000) {
      newErrors.message = t(
        'contact.errors.messageTooLong',
        'Správa môže mať maximálne 2000 znakov'
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resolveCaptchaToken = async (): Promise<string | null> => {
    const reCaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    const isTestKey =
      !reCaptchaSiteKey ||
      reCaptchaSiteKey === 'test-site-key' ||
      reCaptchaSiteKey.startsWith('test-');

    if (isTestKey && process.env.NODE_ENV === 'development') {
      return '';
    }

    if (executeRecaptcha) {
      try {
        return await executeRecaptcha('contact');
      } catch {
        if (isTestKey && process.env.NODE_ENV === 'development') {
          return '';
        }
        setErrors({ general: t('auth.captchaError', 'Overenie CAPTCHA zlyhalo.') });
        return null;
      }
    }

    if (!isTestKey && process.env.NODE_ENV === 'production') {
      setErrors({
        general: t('auth.captchaUnavailable', 'CAPTCHA nie je dostupná.'),
      });
      return null;
    }

    return '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    const captchaToken = await resolveCaptchaToken();
    if (captchaToken === null) {
      setIsLoading(false);
      return;
    }

    const websiteField = form.elements.namedItem('website') as
      | HTMLInputElement
      | null;
    const website = websiteField?.value?.trim() ?? '';

    try {
      await api.post('/contact/', {
        email: formData.email.trim(),
        message: formData.message.trim(),
        captcha_token: captchaToken || undefined,
        ...(website ? { website } : {}),
      });
      setIsSuccess(true);
    } catch (error: unknown) {
      const err = error as {
        response?: {
          status?: number;
          data?: Record<string, unknown>;
        };
      };
      const data = err.response?.data;

      if (err.response?.status === 429) {
        setErrors({
          general: t(
            'contact.errors.rateLimited',
            'Príliš veľa pokusov. Skúste to neskôr.'
          ),
        });
        return;
      }

      if (data && typeof data === 'object') {
        const fieldErrors: ContactFormErrors = {};
        if (Array.isArray(data.email) && data.email[0]) {
          fieldErrors.email = String(data.email[0]);
        }
        if (Array.isArray(data.message) && data.message[0]) {
          fieldErrors.message = String(data.message[0]);
        }
        if (typeof data.error === 'string') {
          fieldErrors.general = data.error;
        }
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          return;
        }
      }

      setErrors({
        general: t(
          'contact.errors.general',
          'Nepodarilo sa odoslať správu. Skúste to neskôr.'
        ),
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col relative bg-[var(--background)]">
        <Suspense fallback={<div className="absolute inset-0 z-0 hidden lg:block" />}>
          <ParticlesBackground />
        </Suspense>

        <header className="relative z-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-black/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Link
              href="/"
              className="text-sm font-medium text-purple-800 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
            >
              ← {t('contact.backToHome', 'Späť na úvod')}
            </Link>
          </div>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            {...sectionMotion}
            className="w-full max-w-lg rounded-2xl border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 p-8 text-center shadow-sm"
          >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('contact.success.title', 'Správa odoslaná')}
            </h1>
            <p className="mt-4 text-gray-600 dark:text-gray-300 leading-relaxed">
              {t(
                'contact.success.message',
                'Ďakujeme za správu. Ozveme sa ti do 24 hodín.'
              )}
            </p>
            <Link
              href="/"
              className="inline-flex mt-8 items-center justify-center rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 transition-colors"
            >
              {t('contact.success.backToHome', 'Späť na úvod')}
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[var(--background)]">
      <Suspense fallback={<div className="absolute inset-0 z-0 hidden lg:block" />}>
        <ParticlesBackground />
      </Suspense>

      <header className="relative z-10 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-black/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/"
            className="text-sm font-medium text-purple-800 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
          >
            ← {t('contact.backToHome', 'Späť na úvod')}
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div className="max-w-4xl mx-auto px-4 py-10 lg:py-14 space-y-10 lg:space-y-14">
          <motion.section {...sectionMotion} className="text-center">
            <h1 className="text-[clamp(1.75rem,4vw,2.75rem)] font-bold text-gray-900 dark:text-white leading-tight">
              {t('contact.hero.title', 'Kontakt')}
            </h1>
            <p className="mt-4 text-[clamp(1rem,2vw,1.125rem)] text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
              {t(
                'contact.hero.subtitle',
                'Máš otázku alebo potrebuješ pomoc?\nNapíš nám – radi ti pomôžeme.'
              )}
            </p>
          </motion.section>

          <motion.section
            {...sectionMotion}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-6 lg:p-8 shadow-sm text-center space-y-4"
          >
            <p className="text-lg font-medium text-gray-900 dark:text-white">{SUPPORT_EMAIL}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('contact.faqPrefix', 'Pozri si aj')}{' '}
              <Link
                href="/faq"
                className="font-medium text-purple-800 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
              >
                {t('contact.faqLink', 'často kladené otázky')}
              </Link>
            </p>
            <SocialLinks t={t} />
          </motion.section>

          <motion.section
            {...sectionMotion}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black p-6 lg:p-8 shadow-sm"
          >
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {errors.general && (
                <p className="text-red-500 text-sm" role="alert">
                  {errors.general}
                </p>
              )}

              <div>
                <label
                  htmlFor="contact-email"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                >
                  {t('contact.form.email', 'Váš email')}
                </label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-60"
                />
                {errors.email && (
                  <p className="mt-1 text-red-500 text-sm" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2"
                >
                  {t('contact.form.message', 'Správa')}
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={6}
                  value={formData.message}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder={t(
                    'contact.form.messagePlaceholder',
                    'Napíš svoju správu...'
                  )}
                  className="w-full resize-y min-h-[140px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-300 disabled:opacity-60"
                />
                {errors.message && (
                  <p className="mt-1 text-red-500 text-sm" role="alert">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Honeypot – skryté pre používateľov */}
              <div className="hidden" aria-hidden>
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 transition-colors"
              >
                {isLoading
                  ? t('contact.form.submitting', 'Odosielam...')
                  : t('contact.form.submit', 'Odoslať')}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t(
                  'contact.privacyNote',
                  'Údaje používame len na zodpovedanie tvojej správy.'
                )}
              </p>
            </form>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
