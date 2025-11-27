
'use client';

import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../utils/auth';
import LoginForm from '../components/LoginForm';

// Lazy load komponenty - načítavajú sa len keď sú potrebné
const ParticlesBackground = lazy(() => import('../components/ParticlesBackground'));

export default function Home() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [isAuth, setIsAuth] = useState(false);
  const headerGroupRef = useRef<HTMLDivElement | null>(null);
  const [mobileScale, setMobileScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const auth = isAuthenticated();
      setIsAuth(auth);
      
      // Ak je používateľ prihlásený, presmeruj na dashboard
      if (auth) {
        router.push('/dashboard');
      }
    };

    checkAuth();
  }, [router]);

  // Mobile detection (client only)
  useEffect(() => {
    const update = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth <= 1024);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Auto-scale header line (text + logo) on mobile so it fits one line across languages
  useEffect(() => {
    if (!isMobile) {
      setMobileScale(1);
      return;
    }

    const el = headerGroupRef.current;
    if (!el) return;

    const measureAndScale = () => {
      if (!el) return;
      // Reset scale to measure natural width
      setMobileScale(1);
      // Use next frame to measure after scale reset
      requestAnimationFrame(() => {
        const parentWidth = el.parentElement?.clientWidth ?? window.innerWidth;
        const rect = el.getBoundingClientRect();
        const totalWidth = rect.width;
        const available = Math.max(0, parentWidth - 16); // small padding
        const nextScale = totalWidth > 0 ? Math.min(1, available / totalWidth) : 1;
        setMobileScale(nextScale);
      });
    };

    measureAndScale();
    window.addEventListener('resize', measureAndScale);
    return () => window.removeEventListener('resize', measureAndScale);
  }, [isMobile, locale]);

  // Ak je používateľ prihlásený, zobraz loading
  if (isAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'var(--background)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">{t('homepage.redirectingToDashboard', 'Presmerovávam na dashboard...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[var(--background)]">
      {/* Particle efekt - lazy loaded s mobilnou optimalizáciou */}
      <Suspense
        fallback={<div className="absolute inset-0 z-0 max-lg:hidden" />}
      >
        <ParticlesBackground />
      </Suspense>

      <div className="flex-1 relative z-10 py-12 lg:py-16">
        <div className="main-column flex flex-col-reverse lg:flex-row items-center lg:items-start gap-10 lg:gap-16">
          {/* Hero text */}
          <motion.div
            className="flex-1 w-full max-lg:text-center space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              ref={headerGroupRef}
              className="flex items-center flex-wrap max-lg:flex-nowrap max-lg:justify-center max-lg:gap-1 text-gray-900 dark:text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ transformOrigin: 'center center', scale: isMobile ? mobileScale : 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            >
              <span className="text-heading font-semibold whitespace-nowrap" lang={locale}>
                {t('homepage.welcome', 'Víta ťa')}
              </span>
              <img
                src="/Logotyp _svaply_ na fialovom pozadí.png"
                alt="Svaply"
                className="w-auto h-28 md:h-40 lg:h-48 ml-4 max-lg:h-[clamp(80px,20vw,120px)]"
              />
            </motion.div>
            <motion.p
              className="text-body text-gray-600 dark:text-gray-300 leading-relaxed max-w-3xl max-lg:mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
            >
              {t(
                'homepage.description',
                '„Miesto, kde sa stretávajú ľudia s túžbou rásť – jedni učia, druhí sa učia, všetci spolu tvoria silnejšiu komunitu."',
              )}
            </motion.p>
          </motion.div>

          {/* Login modul */}
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
          >
            <LoginForm />
          </motion.div>
        </div>
      </div>

      {/* Footer - Lazy loaded s mobilnou optimalizáciou */}
      <Suspense
        fallback={<div className="h-32 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800 max-lg:h-24" />}
      >
        <motion.footer
          className="bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800 relative z-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <div className="main-column py-8 lg:py-10">
            <div className="flex flex-wrap justify-center gap-4 text-center text-small text-gray-600 dark:text-gray-300">
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.howItWorks', 'Ako to funguje')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.forIndividuals', 'Pre jednotlivcov')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.forCompanies', 'Pre firmy')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.forSchools', 'Pre školy')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.help', 'Pomocník')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.faq', 'FAQ')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.contact', 'Kontakt')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.reportIssue', 'Nahlásiť problém')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.aboutUs', 'O nás')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.termsOfUse', 'Podmienky používania')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.privacyPolicy', 'Ochrana údajov')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.cookies', 'Cookies')}</a>
              <a href="#" className="hover:text-purple-800 dark:hover:text-purple-400 transition-colors">{t('footer.gdpr', 'GDPR')}</a>
            </div>
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6 text-center text-small text-gray-500 dark:text-gray-400">
              © 2024 Svaply. Všetky práva vyhradené.
            </div>
          </div>
        </motion.footer>
      </Suspense>
    </div>
  );
}
