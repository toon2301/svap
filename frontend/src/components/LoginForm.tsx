'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { setAuthTokens } from '@/utils/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import Credentials from './login/Credentials';
import GoogleLoginBlock from './login/GoogleLoginBlock';

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
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
      console.error('Login error:', error);
      
      // Rate limit (429) - špeciálna správa
      if (error.response?.status === 429) {
        setLoginErrors({ 
          general: t('auth.tooManyRequests', 'Príliš veľa pokusov. Skúste to o chvíľu.') 
        });
        setIsLoginLoading(false);
        return;
      }
      
      // Account locked (423)
      if (error.response?.status === 423) {
        const errorMessage = error.response?.data?.error || t('auth.accountLocked', 'Účet je dočasne zablokovaný. Skúste to neskôr.');
        setLoginErrors({ general: errorMessage });
        setIsLoginLoading(false);
        return;
      }
      
      // Ak máme details, spracuj ich
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        
        // Skontroluj non_field_errors
        if (details.non_field_errors && Array.isArray(details.non_field_errors) && details.non_field_errors.length > 0) {
          const firstError = details.non_field_errors[0];
          const errorText = typeof firstError === 'string' ? firstError : String(firstError);
          
          // Kontrola, či je to chyba neovereného emailu
          if (errorText.includes('nie je overený') || errorText.includes('Skontrolujte si email')) {
            setLoginErrors({ 
              email_verification: t('auth.emailNotVerifiedMessage') 
            });
            setIsLoginLoading(false);
            return;
          }
          
          // Inak nastav ako general error
          setLoginErrors({ general: errorText });
          setIsLoginLoading(false);
          return;
        }
        
        // Ak nie je non_field_errors, skús použiť error z response alebo details
        const errorMessage = error.response?.data?.error || (details.error || t('auth.invalidCredentials'));
        setLoginErrors({ general: typeof errorMessage === 'string' ? errorMessage : t('auth.invalidCredentials') });
        setIsLoginLoading(false);
        return;
      }
      
      // Ak máme error priamo v response.data.error
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        if (typeof errorMessage === 'string' && (errorMessage.includes('nie je overený') || errorMessage.includes('Skontrolujte si email'))) {
          setLoginErrors({ 
            email_verification: t('auth.emailNotVerifiedMessage') 
          });
        } else {
          setLoginErrors({ general: typeof errorMessage === 'string' ? errorMessage : t('auth.invalidCredentials') });
        }
        setIsLoginLoading(false);
        return;
      }
      
      // Fallback - vždy zobraz nejakú chybovú správu
      setLoginErrors({ general: t('auth.invalidCredentials') });
    } finally {
      setIsLoginLoading(false);
    }
  };

  return (
    <motion.div 
      className="w-full max-w-[min(500px,90vw)] lg:max-w-[clamp(280px,28vw,380px)] xl:max-w-[clamp(380px,30vw,500px)] bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 lg:ml-[clamp(0px,2vw,30px)]"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
    >
      <div className="px-[clamp(1rem,3vw,1.5rem)] py-[clamp(1rem,3vw,1.5rem)] lg:py-[clamp(0.875rem,2vw,1.25rem)]">
        
        <motion.h1 
          className="text-[clamp(1.25rem,2.5vw,1.5rem)] font-medium mb-[clamp(0.75rem,2vw,1rem)] text-center tracking-wider text-black dark:text-white"
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
          className="space-y-[clamp(0.625rem,1.5vw,1rem)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          onSubmit={handleLoginSubmit}
          role="form"
          aria-label={t('auth.login')}
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.9 }}>
            <Credentials
              t={t}
              email={loginData.email}
              password={loginData.password}
              errors={{ email: loginErrors.email, password: loginErrors.password }}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onEmailChange={handleLoginInputChange}
              onPasswordChange={handleLoginInputChange}
              onKeyDown={handleKeyDown}
            />
          </motion.div>
          
          <motion.button
            type="submit"
            disabled={isLoginLoading}
            className={`w-full text-white px-4 py-[clamp(0.5rem,1.5vw,0.625rem)] rounded-2xl font-semibold text-[clamp(0.875rem,2vw,1.25rem)] transition-all ${
              isLoginLoading ? 'cursor-not-allowed bg-purple-400 opacity-80' : 'cursor-pointer bg-purple-600 hover:bg-purple-700'
            }`}
            style={{
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
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
        <GoogleLoginBlock t={t} isGoogleLoading={isGoogleLoading} isLoginLoading={isLoginLoading} onGoogleLogin={handleGoogleLogin} />

        <div className="text-center mt-[clamp(0.5rem,1.2vw,0.625rem)]">
          <p className="text-[clamp(0.75rem,1.5vw,0.875rem)] text-gray-500 dark:text-gray-400 mb-[clamp(0.25rem,0.8vw,0.375rem)]">
            <a href="/forgot-password" className="text-purple-700 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors">
              {t('auth.forgotPassword')}
            </a>
          </p>
          <p className="text-[clamp(0.875rem,1.8vw,1rem)] text-gray-600 dark:text-gray-300">
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
