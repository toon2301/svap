'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { setAuthTokens } from '@/utils/auth';

interface LoginData {
  email: string;
  password: string;
}

interface LoginErrors {
  general?: string;
  email?: string;
  password?: string;
  email_verification?: string;
}

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter();
  const [loginData, setLoginData] = useState<LoginData>({
    email: '',
    password: ''
  });
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);


  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent;
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isMobileDevice = width <= 768 || isMobileUserAgent;
      
      setIsMobile(isMobileDevice);
    };
    
    // Skús to s malým oneskorením
    setTimeout(checkMobile, 100);
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Vymazanie chyby pri zmene hodnoty
    if (loginErrors[name as keyof typeof loginErrors]) {
      setLoginErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (fieldName === 'email') {
        document.getElementById('login-password')?.focus();
      } else if (fieldName === 'password') {
        handleLoginSubmit(e as any);
      }
    }
  };

  const validateLoginForm = (): boolean => {
    const newErrors: any = {};

    if (!loginData.email.trim()) newErrors.email = 'Email je povinný';
    if (!loginData.password) newErrors.password = 'Heslo je povinné';

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (loginData.email && !emailRegex.test(loginData.email)) {
      newErrors.email = 'Neplatný formát emailu';
    }

    setLoginErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResendVerification = async () => {
    if (!loginData.email) {
      setLoginErrors({ email: 'Zadajte email pre znovu odoslanie verifikácie' });
      return;
    }

    setIsResending(true);
    setResendSuccess(false);
    setLoginErrors({});

    try {
      const response = await api.post(endpoints.auth.resendVerification, {
        email: loginData.email
      });
      
      setResendSuccess(true);
      setLoginErrors({});
      
    } catch (error: any) {
      if (error.response?.data?.error) {
        setLoginErrors({ general: error.response.data.error });
      } else {
        setLoginErrors({ general: 'Chyba pri odosielaní verifikačného emailu' });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setLoginErrors({});

    try {
      // Priamo presmeruj na Google login endpoint
      const googleLoginUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'}/oauth/google/login/`;
      
      // Otvor Google OAuth v novom okne
      const popup = window.open(
        googleLoginUrl,
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        setLoginErrors({ general: 'Popup blokátor blokuje prihlásenie cez Google' });
        setIsGoogleLoading(false);
        return;
      }

      // Kontrola či sa popup zatvoril a spracuj výsledok
      const checkClosed = setInterval(async () => {
        try {
          // Bezpečne skontroluj, či je popup zatvorený
          let popupClosed = false;
          try {
            popupClosed = popup.closed;
          } catch (e) {
            // Ignoruj Cross-Origin-Opener-Policy chyby
            popupClosed = true;
          }
          
          if (popupClosed) {
            console.log('Popup closed, checking for OAuth success...');
            clearInterval(checkClosed);
            
            // Skontroluj, či sa tokeny uložili do localStorage
            const accessToken = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');
            const oauthSuccess = localStorage.getItem('oauth_success');
            
            if (accessToken && refreshToken && oauthSuccess === 'true') {
              console.log('OAuth success detected via localStorage');
              
              // Ulož tokeny pomocou setAuthTokens
              setAuthTokens({
                access: accessToken,
                refresh: refreshToken
              });
              
              // Vymaž dočasné localStorage položky
              localStorage.removeItem('oauth_success');
              
              setIsGoogleLoading(false);
              router.push('/dashboard');
            } else {
              console.log('No OAuth tokens found in localStorage');
              setIsGoogleLoading(false);
              setLoginErrors({ general: 'Google prihlásenie sa nepodarilo dokončiť' });
            }
          }
        } catch (error) {
          console.log('Error checking popup status:', error);
        }
      }, 1000);

    } catch (error: any) {
      console.error('Google login error:', error);
      setLoginErrors({ 
        general: error.response?.data?.error || 'Chyba pri prihlásení cez Google' 
      });
      setIsGoogleLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateLoginForm()) return;

    setIsLoginLoading(true);
    setLoginErrors({});

    try {
      const response = await api.post(endpoints.auth.login, loginData);
      
      // Uloženie tokenov
      setAuthTokens(response.data.tokens);
      
      // Presmerovanie na dashboard
      router.push('/dashboard');
      
    } catch (error: any) {
      
      if (error.response?.data?.details) {
        // Kontrola, či je to chyba neovereného emailu v details
        const details = error.response.data.details;
        
        // Skontroluj non_field_errors
        if (details.non_field_errors && Array.isArray(details.non_field_errors)) {
          const hasEmailVerificationError = details.non_field_errors.some((msg: string) => 
            msg.includes('nie je overený') || msg.includes('Skontrolujte si email'));
          
          if (hasEmailVerificationError) {
            setLoginErrors({ 
              email_verification: 'Váš email nie je overený. Skontrolujte si emailovú schránku a kliknite na verifikačný odkaz.' 
            });
            return;
          }
        }
        
        // Ak nie je to email verification error, zobraz normálne chyby
        setLoginErrors(details);
      } else if (error.response?.data?.error) {
        // Kontrola, či je to chyba neovereného emailu
        const errorMessage = error.response.data.error;
        if (typeof errorMessage === 'string' && (errorMessage.includes('nie je overený') || errorMessage.includes('Skontrolujte si email'))) {
          setLoginErrors({ 
            email_verification: 'Váš email nie je overený. Skontrolujte si emailovú schránku a kliknite na verifikačný odkaz.' 
          });
        } else {
          setLoginErrors({ general: typeof errorMessage === 'string' ? errorMessage : 'Neplatné prihlasovacie údaje.' });
        }
      } else {
        setLoginErrors({ general: 'Neplatné prihlasovacie údaje.' });
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <motion.div 
      className="bg-white rounded-2xl shadow-xl border border-gray-200"
      style={{
        width: isMobile ? '100%' : '700px',
        maxWidth: isMobile ? '600px' : '700px',
        marginLeft: isMobile ? '0' : '64px'
      }}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
    >
      <div style={{
        marginLeft: isMobile ? '24px' : '40px', 
        marginRight: isMobile ? '24px' : '40px', 
        marginTop: '30px', 
        marginBottom: '30px'
      }}>
        
        <motion.h1 
          className="text-4xl font-medium mb-16 text-center tracking-wider max-lg:text-2xl max-lg:mb-8 text-black"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
        >
          Prihlásiť sa
        </motion.h1>


        {loginErrors.email_verification && (
          <motion.div 
            className="bg-amber-100 border border-amber-400 text-amber-800 px-2 py-2 rounded mb-3 max-lg:px-3 max-lg:py-2"
            role="alert"
            aria-live="polite"
            aria-describedby="email-verification-help"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start">
              <svg 
                className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 max-lg:w-5 max-lg:h-5" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-sm max-lg:text-base" id="email-verification-help">Email nie je overený</p>
                <p className="text-xs mt-1 max-lg:text-sm max-lg:mt-1">{loginErrors.email_verification}</p>
                <div className="mt-2 max-lg:mt-2">
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    aria-label="Znovu odoslať verifikačný email"
                    aria-describedby="resend-button-help"
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors w-full max-lg:px-4 max-lg:py-2 max-lg:text-sm ${
                      isResending 
                        ? 'bg-amber-200 text-amber-600 cursor-not-allowed' 
                        : 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
                    }`}
                  >
                    {isResending ? 'Odosielam...' : 'Znovu odoslať verifikáciu'}
                  </button>
                  <div id="resend-button-help" className="sr-only">
                    Kliknite pre znovu odoslanie verifikačného emailu
                  </div>
                  {resendSuccess && (
                    <p className="text-xs text-green-700 mt-1 max-lg:text-sm max-lg:mt-1" aria-live="polite">
                      ✓ Verifikačný email bol odoslaný!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {loginErrors.general && (
          <motion.div 
            className="bg-red-100 border border-red-400 text-red-700 px-3 py-3 rounded mb-4 max-lg:px-4 max-lg:py-4"
            role="alert"
            aria-live="assertive"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-sm max-lg:text-base max-lg:font-medium">{loginErrors.general}</p>
          </motion.div>
        )}

        <motion.form 
          className="space-y-6 max-lg:space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          onSubmit={handleLoginSubmit}
          role="form"
          aria-label="Prihlasovací formulár"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            <label htmlFor="login-email" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={loginData.email}
              onChange={handleLoginInputChange}
              onKeyDown={(e) => handleKeyDown(e, 'email')}
              className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all ${
                loginErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Email.."
              aria-label="Zadajte svoju emailovú adresu"
              aria-required="true"
              aria-invalid={loginErrors.email ? "true" : "false"}
              aria-describedby={loginErrors.email ? "email-error" : "email-help"}
              tabIndex={1}
              autoComplete="email"
              style={{
                paddingLeft: '12px', 
                paddingRight: '12px', 
                paddingTop: '16px', 
                paddingBottom: '16px',
                minHeight: '60px',
                fontSize: 'clamp(16px, 4vw, 20px)'
              }}
            />
            <div id="email-help" className="sr-only">
              Zadajte platnú emailovú adresu pre prihlásenie do aplikácie
            </div>
            {loginErrors.email && (
              <p id="email-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                {loginErrors.email}
              </p>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.0 }}
          >
            <label htmlFor="login-password" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
              Heslo
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={loginData.password}
                onChange={handleLoginInputChange}
                onKeyDown={(e) => handleKeyDown(e, 'password')}
                className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all ${
                  loginErrors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                aria-label="Zadajte svoje heslo"
                aria-required="true"
                aria-invalid={loginErrors.password ? "true" : "false"}
                aria-describedby={loginErrors.password ? "password-error" : "password-help"}
                tabIndex={2}
                autoComplete="current-password"
                style={{
                  paddingLeft: '12px', 
                  paddingRight: '12px', 
                  paddingTop: '16px', 
                  paddingBottom: '16px',
                  minHeight: '60px',
                  fontSize: 'clamp(16px, 4vw, 20px)'
                }}
              />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Skryť heslo" : "Zobraziť heslo"}
                  aria-describedby="password-toggle-help"
                  tabIndex={-1}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded"
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
                <div id="password-toggle-help" className="sr-only">
                  Tlačidlo pre zobrazenie alebo skrytie hesla
                </div>
            </div>
            <div id="password-help" className="sr-only">
              Zadajte svoje heslo pre prihlásenie do aplikácie
            </div>
            {loginErrors.password && (
              <p id="password-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                {loginErrors.password}
              </p>
            )}
          </motion.div>
          
          <motion.button
            type="submit"
            disabled={isLoginLoading}
            aria-label="Prihlásiť sa do aplikácie"
            aria-describedby="login-button-help"
            className={`w-full text-white px-12 rounded-lg font-semibold text-3xl transition-all max-lg:px-6 max-lg:py-3 max-lg:text-lg ${
              isLoginLoading ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{
              backgroundColor: isLoginLoading ? '#A855F7' : '#7C3AED',
              opacity: isLoginLoading ? 0.8 : 1,
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              marginTop: '24px',
              paddingTop: '20px',
              paddingBottom: '20px'
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.1 }}
            whileHover={!isLoginLoading ? { scale: 1.02 } : {}}
            whileTap={!isLoginLoading ? { scale: 0.98 } : {}}
            tabIndex={3}
          >
            <div className="flex items-center justify-center gap-3">
              {isLoginLoading && (
                <motion.div
                  className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  aria-hidden="true"
                />
              )}
              {isLoginLoading ? 'Prihlasujem sa...' : 'Prihlásiť sa'}
            </div>
          </motion.button>
          <div id="login-button-help" className="sr-only">
            Kliknite pre prihlásenie do aplikácie pomocou emailu a hesla
          </div>
        </motion.form>
        
        {/* Google prihlásenie */}
        <motion.div 
          className="mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.2 }}
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">alebo</span>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoginLoading}
            aria-label="Prihlásiť sa pomocou Google účtu"
            aria-describedby="google-login-help"
            className={`w-full mt-4 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all ${
              isGoogleLoading || isLoginLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            whileHover={!isGoogleLoading && !isLoginLoading ? { scale: 1.02 } : {}}
            whileTap={!isGoogleLoading && !isLoginLoading ? { scale: 0.98 } : {}}
            tabIndex={4}
          >
            <div className="flex items-center justify-center gap-3">
              {isGoogleLoading ? (
                <motion.div
                  className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  aria-hidden="true"
                />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>
                {isGoogleLoading ? 'Prihlasujem cez Google...' : 'Prihlásiť sa cez Google'}
              </span>
            </div>
          </motion.button>
          <div id="google-login-help" className="sr-only">
            Otvorí sa nové okno pre prihlásenie cez Google. Po úspešnom prihlásení sa automaticky presmerujete späť do aplikácie.
          </div>
        </motion.div>

        <div className="text-center" style={{marginTop: '16px'}}>
          <p className="text-xl text-gray-500 max-lg:text-sm" style={{marginBottom: '12px'}}>
            <a href="/forgot-password" className="text-purple-700 hover:text-purple-600 font-medium transition-colors max-lg:text-base">
              Zabudli ste heslo?
            </a>
          </p>
          <p className="text-2xl text-gray-600 max-lg:text-base">
            Nemáte účet?{' '}
            <a href="/register" className="text-purple-800 font-semibold hover:text-purple-900">
              Registrovať sa
            </a>
          </p>
        </div>

      </div>
    </motion.div>
  );
}
