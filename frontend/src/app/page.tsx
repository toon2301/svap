
'use client';

import { useState, lazy, Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../utils/auth';
import LoginForm from '../components/LoginForm';

// Lazy load komponenty - načítavajú sa len keď sú potrebné
const ParticlesBackground = lazy(() => import('../components/ParticlesBackground'));

export default function Home() {
  const router = useRouter();
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
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #F3F0FF 0%, #E9E5FF 100%)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Presmerovávam na dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{background: 'linear-gradient(135deg, #F3F0FF 0%, #E9E5FF 100%)'}}>
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
        className="flex-1 max-w-4xl max-lg:text-center"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.h1 
          className="text-8xl font-bold text-gray-900 mb-8 max-lg:text-5xl max-lg:mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          <span className="text-6xl max-lg:text-4xl">Víta ťa</span> <span className="font-bold" style={{color: '#6B46C1'}}>Svaply</span><span className="text-5xl max-lg:text-3xl" style={{color: '#000000'}}>!</span>
        </motion.h1>
        <motion.p 
          className="text-xl text-gray-600 text-left max-w-3xl leading-relaxed max-lg:text-sm max-lg:mx-auto max-lg:max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
        >
          „Miesto, kde sa stretávajú ľudia s túžbou rásť – jedni učia, druhí sa učia, všetci spolu tvoria silnejšiu komunitu."
        </motion.p>
      </motion.div>

      {/* Login module */}
      <LoginForm />
      </div>

      {/* Footer - Lazy loaded s mobilnou optimalizáciou */}
      <Suspense fallback={
        <div className="h-32 bg-gray-50 border-t border-gray-200 max-lg:h-24">
          {/* Mobilný fallback - menšia výška */}
        </div>
      }>
        <motion.footer 
          className="bg-gray-50 border-t border-gray-200 relative z-10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
      >
        <div className="flex justify-center">
          <div className="max-w-full max-lg:px-4" style={{paddingTop: '20px', paddingBottom: '20px'}}>
            <div className="flex flex-wrap justify-center gap-6 text-center max-lg:gap-3">
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Ako to funguje</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Pre jednotlivcov</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Pre firmy</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Pre školy</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Pomocník</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">FAQ</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Kontakt</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Nahlásiť problém</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">O nás</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Podmienky používania</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Ochrana údajov</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">Cookies</a>
              <a href="#" className="text-gray-600 hover:text-purple-800 transition-colors max-lg:text-sm">GDPR</a>
            </div>

          {/* Spodná časť footeru */}
          <div className="mt-12 pt-8 border-t border-gray-200 max-lg:mt-8 max-lg:pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
            </div>
            <div className="mt-4 text-center text-gray-500 text-sm max-lg:text-xs">
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
