
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

      <div className="flex items-center justify-center flex-1 px-4 sm:px-6 lg:px-8 max-lg:flex-col max-lg:gap-6 relative z-10 pt-2 pb-6 lg:pt-4 lg:pb-8">
        {/* Main content */}
        <motion.div 
          className="flex-1 max-w-4xl max-lg:text-center -mt-8 lg:-mt-24"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="flex items-center flex-wrap max-lg:flex-nowrap max-lg:justify-center max-lg:gap-0 lg:gap-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <span 
              className="text-[clamp(1.75rem,5vw,3.75rem)] font-bold text-gray-900 dark:text-white whitespace-nowrap"
              lang={locale}
            >
              {t('homepage.welcome', 'Víta ťa')}
            </span>
            <img
              src="/Logotyp _svaply_ na fialovom pozadí.png"
              alt="Svaply"
              className="w-auto h-[clamp(180px,28vw,400px)] -ml-[clamp(10px,2vw,40px)] lg:-ml-[clamp(30px,3vw,50px)] mt-[clamp(8px,1.5vw,20px)]"
            />
          </motion.div>
          <motion.p 
            className="text-[clamp(0.75rem,1.5vw,1.25rem)] text-gray-600 dark:text-gray-300 text-left max-w-[clamp(300px,80%,700px)] leading-relaxed -mt-24 max-lg:mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          >
            {t('homepage.description', '„Miesto, kde sa stretávajú ľudia s túžbou rásť – jedni učia, druhí sa učia, všetci spolu tvoria silnejšiu komunitu."')}
          </motion.p>
        </motion.div>

        {/* Login module */}
        <LoginForm />
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
          <div className="max-w-6xl mx-auto px-4 py-8 lg:py-6 xl:py-8">
            <div className="flex flex-wrap justify-center gap-3 lg:gap-4 text-center text-sm text-gray-600 dark:text-gray-300">
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
            <div className="mt-6 lg:mt-8 border-t border-gray-200 dark:border-gray-800 pt-4 lg:pt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              © 2024 Svaply. Všetky práva vyhradené.
            </div>
          </div>
        </motion.footer>
      </Suspense>
    </div>
  );
}
