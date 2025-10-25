
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
    <div className="min-h-screen flex flex-col relative" style={{background: 'var(--background)'}}>
      {/* Particle efekt - lazy loaded s mobilnou optimalizáciou */}
      <Suspense fallback={
        <div className="absolute inset-0 z-0 max-lg:hidden">
          {/* Fallback len pre desktop - na mobile sa particle efekt načítava až potom */}
        </div>
      }>
        <ParticlesBackground />
      </Suspense>
      <div className="flex items-center justify-center flex-1 px-8 max-lg:flex-col max-lg:px-4 max-lg:gap-8 relative z-10" style={{paddingTop: '40px'}}>
      {/* Main content */}
      <motion.div 
        className="flex-1 max-w-4xl max-lg:text-center mt-[-72px] lg:mt-[-100px]"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div 
          ref={headerGroupRef}
          className="text-8xl font-bold text-gray-900 dark:text-white max-lg:text-5xl flex items-center flex-wrap max-lg:flex-nowrap max-lg:justify-center max-lg:gap-0"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ transformOrigin: 'center center', scale: isMobile ? mobileScale : 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <span 
            className={`text-6xl max-lg:text-[clamp(26px,7vw,36px)] whitespace-nowrap max-lg:mt-1 max-lg:mr-1`}
            lang={locale}
          >
            {t('homepage.welcome', 'Víta ťa')}
          </span>
          <img
            src="/Logotyp _svaply_ na fialovom pozadí.png"
            alt="Svaply"
            className={`w-auto h-56 md:h-60 lg:h-[450px] mt-2 lg:mt-[20px] ml-[-40px] lg:ml-[-50px] max-lg:ml-[-20px] max-lg:h-auto max-lg:mt-2.5 max-lg:w-[clamp(160px,40vw,240px)]`}
          />
        </motion.div>
        <motion.p 
          className={`text-xl text-gray-600 dark:text-gray-300 text-left max-w-3xl leading-relaxed max-lg:text-xs max-lg:mx-auto max-lg:max-w-xs mb-0 lg:mt-[-130px] max-lg:mt-[-45px]`}
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
      <Suspense fallback={
        <div className="h-32 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800 max-lg:h-24">
          {/* Mobilný fallback - menšia výška */}
        </div>
      }>
        <motion.footer 
          className="bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800 relative z-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
      >
        <div className="flex justify-center">
          <div className="max-w-full max-lg:px-4" style={{paddingTop: '20px', paddingBottom: '20px'}}>
            <div className="flex flex-wrap justify-center gap-6 text-center max-lg:gap-3">
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.howItWorks', 'Ako to funguje')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.forIndividuals', 'Pre jednotlivcov')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.forCompanies', 'Pre firmy')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.forSchools', 'Pre školy')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.help', 'Pomocník')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.faq', 'FAQ')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.contact', 'Kontakt')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.reportIssue', 'Nahlásiť problém')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.aboutUs', 'O nás')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.termsOfUse', 'Podmienky používania')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.privacyPolicy', 'Ochrana údajov')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.cookies', 'Cookies')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.gdpr', 'GDPR')}</a>
            </div>

          {/* Spodná časť footeru */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800 max-lg:mt-8 max-lg:pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
            </div>
            <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm max-lg:text-xs">
              © 2024 Svaply. Všetky práva vyhradené.
            </div>
          </div>
          </div>
        </div>
      </motion.footer>
      </Suspense>
    </div>
  );
}
