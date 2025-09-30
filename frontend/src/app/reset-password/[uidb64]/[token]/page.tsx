'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';

// Lazy load particle efekt
const ParticlesBackground = lazy(() => import('../../../../components/ParticlesBackground'));

interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}

interface ResetPasswordErrors {
  general?: string;
  password?: string;
  confirmPassword?: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const uidb64 = params.uidb64 as string;
  const token = params.token as string;
  
  const [formData, setFormData] = useState<ResetPasswordData>({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<ResetPasswordErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Reset zoom level for desktop when opening from email link
    const resetZoom = () => {
      if (window.innerWidth >= 769) {
        // Detect current zoom level
        const currentZoom = window.outerWidth / window.innerWidth;
        console.log('Current zoom level:', currentZoom);
        
        // Force reset all scaling
        document.documentElement.style.zoom = '1';
        document.documentElement.style.transform = 'scale(1)';
        document.body.style.transform = 'scale(1)';
        document.body.style.zoom = '1';
        
        // Reset all elements
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          (el as HTMLElement).style.transform = 'scale(1)';
          (el as HTMLElement).style.zoom = '1';
        });
        
        // Force browser zoom reset
        if (window.devicePixelRatio) {
          document.documentElement.style.fontSize = '16px';
        }
        
        // If zoom is not 1, try to reset browser zoom
        if (currentZoom !== 1) {
          console.log('Attempting to reset browser zoom from:', currentZoom);
          // Try to reset browser zoom by setting viewport
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
          }
        }
      }
    };

    // Reset zoom immediately
    resetZoom();
    
    // Reset zoom multiple times to ensure it sticks
    const timeoutId1 = setTimeout(resetZoom, 100);
    const timeoutId2 = setTimeout(resetZoom, 500);
    const timeoutId3 = setTimeout(resetZoom, 1000);
    const timeoutId4 = setTimeout(resetZoom, 2000);

    // Overenie platnosti tokenu pri načítaní stránky
    const validateToken = async () => {
      try {
        const response = await api.get(`/auth/password-reset-verify/${uidb64}/${token}/`);
        setIsValidToken(true);
        setUserEmail(response.data.email);
      } catch (error) {
        console.error('Token validation error:', error);
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    if (uidb64 && token) {
      validateToken();
    } else {
      setIsValidating(false);
      setIsValidToken(false);
    }

    // Cleanup timeouts
    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      clearTimeout(timeoutId4);
    };
  }, [uidb64, token]);

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
    const newErrors: ResetPasswordErrors = {};

    if (!formData.password) {
      newErrors.password = 'Heslo je povinné';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Heslo musí mať aspoň 8 znakov';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Potvrdenie hesla je povinné';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Heslá sa nezhodujú';
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
      await api.post(`/auth/password-reset/${uidb64}/${token}/`, {
        password: formData.password
      });
      
      setIsSuccess(true);
      
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      if (error.response?.data?.error) {
        setErrors({ general: error.response.data.error });
      } else {
        setErrors({ general: 'Chyba pri zmene hesla. Skúste to neskôr.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading stav
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #F3F0FF 0%, #E9E5FF 100%)'}}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Overujem odkaz...</p>
        </div>
      </div>
    );
  }

  // Neplatný token
  if (!isValidToken) {
    return (
      <div className="min-h-screen flex flex-col relative" style={{background: 'linear-gradient(135deg, #F3F0FF 0%, #E9E5FF 100%)'}}>
        <Suspense fallback={<div className="absolute inset-0 z-0 max-lg:hidden"></div>}>
          <ParticlesBackground />
        </Suspense>
        
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <motion.div 
            className="bg-white rounded-2xl shadow-xl border border-gray-200"
            style={{ width: '100%', maxWidth: '600px' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div style={{ margin: '40px' }}>
              <motion.h1 
                className="text-4xl font-medium text-center mb-8 text-black tracking-wider max-lg:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Neplatný odkaz
              </motion.h1>

              <motion.div 
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-semibold">Odkaz na reset hesla je neplatný alebo vypršal</p>
                    <p className="text-sm mt-1">
                      Požiadajte o nový odkaz na reset hesla.
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="text-center">
                <a 
                  href="/forgot-password" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Požiadať o nový odkaz
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Úspešná zmena hesla
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col relative" style={{background: 'linear-gradient(135deg, #F3F0FF 0%, #E9E5FF 100%)'}}>
        <Suspense fallback={<div className="absolute inset-0 z-0 max-lg:hidden"></div>}>
          <ParticlesBackground />
        </Suspense>
        
        <div className="flex-1 flex items-center justify-center p-4 relative z-10">
          <motion.div 
            className="bg-white rounded-2xl shadow-xl border border-gray-200"
            style={{ width: '100%', maxWidth: '600px' }}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div style={{ margin: '40px' }}>
              <motion.h1 
                className="text-4xl font-medium text-center mb-8 text-black tracking-wider max-lg:text-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                Heslo zmenené!
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
                    <p className="font-semibold">Heslo bolo úspešne zmenené!</p>
                    <p className="text-sm mt-1">
                      Teraz sa môžete prihlásiť s novým heslom.
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="text-center">
                <a 
                  href="/" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Prihlásiť sa
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Formulár pre reset hesla
  return (
    <div className="min-h-screen flex flex-col relative" style={{background: 'linear-gradient(135deg, #F3F0FF 0%, #E9E5FF 100%)'}}>
      <Suspense fallback={<div className="absolute inset-0 z-0 max-lg:hidden"></div>}>
        <ParticlesBackground />
      </Suspense>
      
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <motion.div 
          className="bg-white rounded-2xl shadow-xl border border-gray-200"
          style={{ width: '100%', maxWidth: '600px' }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div style={{ margin: '40px' }}>
            <motion.h1 
              className="text-4xl font-medium text-center mb-8 text-black tracking-wider max-lg:text-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Nastaviť nové heslo
            </motion.h1>

            <motion.p 
              className="text-lg text-gray-600 text-center mb-8 max-lg:text-base"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Pre účet: <strong>{userEmail}</strong>
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
                <label htmlFor="password" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                  Nové heslo
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-16 py-12 pr-16 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    aria-label="Zadajte nové heslo"
                    aria-required="true"
                    aria-invalid={errors.password ? "true" : "false"}
                    aria-describedby={errors.password ? "password-error" : "password-help"}
                    style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded"
                  >
                    {showPassword ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div id="password-help" className="sr-only">
                  Zadajte nové heslo (minimálne 8 znakov)
                </div>
                {errors.password && (
                  <p id="password-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                    {errors.password}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                  Potvrdiť heslo
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-16 py-12 pr-16 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="••••••••"
                    aria-label="Potvrdte nové heslo"
                    aria-required="true"
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                    aria-describedby={errors.confirmPassword ? "confirm-password-error" : "confirm-password-help"}
                    style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Skryť heslo" : "Zobraziť heslo"}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div id="confirm-password-help" className="sr-only">
                  Zadajte nové heslo znovu pre potvrdenie
                </div>
                {errors.confirmPassword && (
                  <p id="confirm-password-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                aria-label="Nastaviť nové heslo"
                className={`w-full text-white px-6 py-4 rounded-lg font-semibold text-xl transition-all ${
                  isLoading ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
                }`}
                style={{
                  backgroundColor: isLoading ? '#A855F7' : '#7C3AED',
                  opacity: isLoading ? 0.8 : 1,
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                  marginTop: '24px',
                  paddingTop: '20px',
                  paddingBottom: '20px'
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
                  {isLoading ? 'Nastavujem heslo...' : 'Nastaviť heslo'}
                </div>
              </motion.button>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
