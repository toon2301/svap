'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { setAuthTokens } from '@/utils/auth';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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

    if (!loginData.email.trim()) newErrors.email = t('auth.emailRequired');
    if (!loginData.password) newErrors.password = t('auth.passwordRequired');

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (loginData.email && !emailRegex.test(loginData.email)) {
      newErrors.email = t('auth.invalidEmailFormat');
    }

    setLoginErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResendVerification = async () => {
    if (!loginData.email) {
      setLoginErrors({ email: t('auth.enterEmailForResend') });
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
        setLoginErrors({ general: t('auth.verificationSent') });
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setLoginErrors({});

    try {
      // Použi rovnakú baseURL ako Axios klient (rešpektuje dev runtime override cez sessionStorage)
      const axiosBase = (api.defaults.baseURL as string) || '';
      const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || '';
      const baseApi = axiosBase || (backendOrigin ? `${backendOrigin}/api` : (process.env.NEXT_PUBLIC_API_URL || '/api'));
      const callbackUrl = `${window.location.origin}/auth/callback`; // bez trailing slash
      const googleLoginUrl = `${baseApi}/oauth/google/login/?callback=${encodeURIComponent(callbackUrl)}`;
      
      // Otvor Google OAuth v novom okne
      const popup = window.open(
        googleLoginUrl,
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        setLoginErrors({ general: t('auth.googleLoginFailed') });
        setIsGoogleLoading(false);
        return;
      }

      // Počúvaj na správy z popup okna
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (process.env.NODE_ENV !== 'production') {
          console.debug('Received message from popup');
        }
        
        if (event.data.type === 'OAUTH_SUCCESS') {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('OAuth success message received');
          }
          clearInterval(checkClosed);
          
          // Ulož tokeny pomocou setAuthTokens
          setAuthTokens({
            access: event.data.tokens.access,
            refresh: event.data.tokens.refresh
          });
          
          // Reset preferovaného modulu a nastav flag na vynútenie HOME
          try {
            localStorage.setItem('activeModule', 'home');
            sessionStorage.setItem('forceHome', '1');
          } catch (e) {}
          
          setIsGoogleLoading(false);
          router.push('/dashboard');
        } else if (event.data.type === 'OAUTH_ERROR') {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('OAuth error message received');
          }
          clearInterval(checkClosed);
          setIsGoogleLoading(false);
          setLoginErrors({ general: event.data.error });
        }
      };
      
      // Pridaj event listener pre správy z popup okna
      window.addEventListener('message', handleMessage);
      
      // Kontrola či sa popup zatvoril (fallback)
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
            if (process.env.NODE_ENV !== 'production') {
              console.debug('Popup closed without message, checking localStorage...');
            }
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            
            // Fallback: skontroluj localStorage
            const accessToken = localStorage.getItem('access_token');
            const refreshToken = localStorage.getItem('refresh_token');
            const oauthSuccess = localStorage.getItem('oauth_success');
            
            if (accessToken && refreshToken && oauthSuccess === 'true') {
              if (process.env.NODE_ENV !== 'production') {
                console.debug('OAuth success detected via localStorage fallback');
              }
              
              // Ulož tokeny pomocou setAuthTokens
              setAuthTokens({
                access: accessToken,
                refresh: refreshToken
              });
              
              // Vymaž dočasné localStorage položky
              localStorage.removeItem('oauth_success');
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              
              // Reset preferovaného modulu a nastav flag na vynútenie HOME
              try {
                localStorage.setItem('activeModule', 'home');
                sessionStorage.setItem('forceHome', '1');
              } catch (e) {}
              
              setIsGoogleLoading(false);
              router.push('/dashboard');
            } else {
              if (process.env.NODE_ENV !== 'production') {
                console.debug('No OAuth tokens found in localStorage');
              }
              setIsGoogleLoading(false);
              setLoginErrors({ general: t('auth.googleLoginFailed') });
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.debug('Error checking popup status');
          }
        }
      }, 1000);

    } catch (error: any) {
      console.error('Google login error:', error);
      setLoginErrors({ 
        general: error.response?.data?.error || t('auth.googleLoginFailed') 
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
      
      // Reset preferovaného modulu po prihlásení a nastav flag na vynútenie HOME
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeModule', 'home');
        sessionStorage.setItem('forceHome', '1');
      }
      
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
              email_verification: t('auth.emailNotVerifiedMessage') 
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
            email_verification: t('auth.emailNotVerifiedMessage') 
          });
        } else {
          setLoginErrors({ general: typeof errorMessage === 'string' ? errorMessage : t('auth.invalidCredentials') });
        }
      } else {
        setLoginErrors({ general: t('auth.invalidCredentials') });
      }
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <motion.div 
      className="bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800"
      style={{
        width: isMobile ? '100%' : '500px',
        maxWidth: isMobile ? '600px' : '500px',
        marginLeft: isMobile ? '0' : '50px'
      }}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
    >
      <div style={{
        marginLeft: isMobile ? '24px' : '30px', 
        marginRight: isMobile ? '24px' : '30px', 
        marginTop: isMobile ? '30px' : '24px', 
        marginBottom: isMobile ? '30px' : '24px'
      }}>
        
        <motion.h1 
          className="text-3xl font-medium mb-12 text-center tracking-wider max-lg:text-2xl max-lg:mb-8 text-black dark:text-white"
          style={{
            fontSize: isMobile ? '24px' : '28px',
            marginBottom: isMobile ? '32px' : '24px'
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
        >
          {t('auth.login')}
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
                <p className="font-semibold text-sm max-lg:text-base" id="email-verification-help">{t('auth.emailNotVerified')}</p>
                <p className="text-xs mt-1 max-lg:text-sm max-lg:mt-1">{loginErrors.email_verification}</p>
                <div className="mt-2 max-lg:mt-2">
                  <button
                    onClick={handleResendVerification}
                    disabled={isResending}
                    aria-label={t('auth.resendVerification')}
                    aria-describedby="resend-button-help"
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors w-full max-lg:px-4 max-lg:py-2 max-lg:text-sm ${
                      isResending 
                        ? 'bg-amber-200 text-amber-600 cursor-not-allowed' 
                        : 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800'
                    }`}
                  >
                    {isResending ? t('auth.resending') : t('auth.resendVerification')}
                  </button>
                  <div id="resend-button-help" className="sr-only">
                    {t('auth.resendVerification')}
                  </div>
                  {resendSuccess && (
                    <p className="text-xs text-green-700 mt-1 max-lg:text-sm max-lg:mt-1" aria-live="polite">
                      {t('auth.verificationSent')}
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
          className="space-y-5 max-lg:space-y-4"
          style={{
            gap: isMobile ? '24px' : '20px'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          onSubmit={handleLoginSubmit}
          role="form"
          aria-label={t('auth.login')}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.9 }}
          >
            <label htmlFor="login-email" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-2 max-lg:text-base max-lg:mb-1">
              {t('auth.email')}
            </label>
            <input
              id="login-email"
              type="email"
              name="email"
              value={loginData.email}
              onChange={handleLoginInputChange}
              onKeyDown={(e) => handleKeyDown(e, 'email')}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all ${
                loginErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder={t('placeholders.email')}
              aria-label={t('auth.emailHelp')}
              aria-required="true"
              aria-invalid={loginErrors.email ? "true" : "false"}
              aria-describedby={loginErrors.email ? "email-error" : "email-help"}
              tabIndex={1}
              autoComplete="email"
            />
            <div id="email-help" className="sr-only">
              {t('auth.emailHelp')}
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
            <label htmlFor="login-password" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-2 max-lg:text-base max-lg:mb-1">
              {t('auth.password')}
            </label>
            <div className="relative flex items-center">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={loginData.password}
                onChange={handleLoginInputChange}
                onKeyDown={(e) => handleKeyDown(e, 'password')}
                className={`w-full px-3 py-2 text-sm pr-12 border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all ${
                  loginErrors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder={t('placeholders.password')}
                aria-label={t('auth.passwordHelp')}
                aria-required="true"
                aria-invalid={loginErrors.password ? "true" : "false"}
                aria-describedby={loginErrors.password ? "password-error" : "password-help"}
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
            <div id="password-help" className="sr-only">
              {t('auth.passwordHelp')}
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
            className={`w-full text-white px-4 py-2.5 rounded-lg font-semibold text-xl transition-all max-lg:px-4 max-lg:py-2 max-lg:text-xl ${
              isLoginLoading ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
            style={{
              backgroundColor: isLoginLoading ? '#A855F7' : '#7C3AED',
              opacity: isLoginLoading ? 0.8 : 1,
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
              marginTop: isMobile ? '24px' : '20px'
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
              {isLoginLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </div>
          </motion.button>
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
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">{t('common.or')}</span>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoginLoading}
            aria-label={t('auth.loginWithGoogle')}
            aria-describedby="google-login-help"
            className={`w-full mt-4 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-black hover:bg-gray-50 dark:hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all ${
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
                {isGoogleLoading ? t('auth.loggingInGoogle') : t('auth.loginWithGoogle')}
              </span>
            </div>
          </motion.button>
          <div id="google-login-help" className="sr-only">
            {t('accessibility.googleLoginHelp')}
          </div>
        </motion.div>

        <div className="text-center" style={{marginTop: isMobile ? '16px' : '12px'}}>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-lg:text-sm" style={{marginBottom: isMobile ? '12px' : '8px', fontSize: isMobile ? '20px' : '16px'}}>
            <a href="/forgot-password" className="text-purple-700 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors max-lg:text-base">
              {t('auth.forgotPassword')}
            </a>
          </p>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-lg:text-base" style={{fontSize: isMobile ? '24px' : '18px'}}>
            {t('auth.noAccount')}{' '}
            <a href="/register" className="text-purple-800 dark:text-purple-400 font-semibold hover:text-purple-900 dark:hover:text-purple-300">
              {t('auth.register')}
            </a>
          </p>
        </div>

      </div>
    </motion.div>
  );
}
