'use client';

import { useState, Suspense, lazy, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { api, endpoints } from '@/lib/api';
import { setAuthTokens } from '@/utils/auth';
import { useAutoSave } from '@/hooks/useFormValidation';
import { fetchCsrfToken } from '@/utils/csrf';
import { useLanguage } from '@/contexts/LanguageContext';
// import { logMobileDebugInfo, checkNetworkConnectivity } from '@/utils/mobileDebug';

// Lazy load particle efekt
const ParticlesBackground = lazy(() => import('./ParticlesBackground'));

interface FormData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  user_type: 'individual' | 'company';
  company_name: string;
  website: string;
  birth_day: string;
  birth_month: string;
  birth_year: string;
  gender: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const { executeRecaptcha } = useGoogleReCaptcha();
  const { t } = useLanguage();
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    user_type: 'individual',
    company_name: '',
    website: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
    gender: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  // Smart validácia - email availability
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'taken' | 'error' | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // Mobile dropdown handling - touch event tracking
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Auto-save funkcionalita - pridáno bez narušenia existujúcich funkcií (ticho v pozadí)
  const { loadDraft, clearDraft } = useAutoSave(formData, 'registration_draft', 30000);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Mobile debugging - dočasne vypnuté
    // if (window.innerWidth <= 768) {
    //   logMobileDebugInfo();
    // }
    
    // Načítanie draftu pri inicializácii - pridáno bez narušenia existujúcich funkcií (ticho v pozadí)
    const savedDraft = loadDraft();
    if (savedDraft) {
      setFormData(savedDraft);
      // Žiadne hlášenie - funguje ticho v pozadí
    }
    
    // Získaj CSRF token z backendu
    fetchCsrfToken().catch(err => {
      console.error('Nepodarilo sa získať CSRF token:', err);
    });
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [loadDraft]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Mobile dropdown handling - minimal delay for select elements
    if (isMobile && e.target.tagName === 'SELECT') {
      // Add very small delay to prevent immediate blur, but allow normal interaction
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          [name]: value
        }));
        // Reset active dropdown state after update
        setActiveDropdown(null);
      }, 10);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Vymazanie chyby pri zmene hodnoty
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Vymaž chybu pre password_confirm pri každej zmene
    if (name === 'password_confirm' || name === 'password') {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.password_confirm;
        return newErrors;
      });
    }
  };

  // Mobile touch handlers for dropdown elements
  const handleTouchStart = (e: React.TouchEvent, fieldName: string) => {
    if (isMobile) {
      setTouchStartTime(Date.now());
      setActiveDropdown(fieldName);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, fieldName: string) => {
    if (isMobile && touchStartTime) {
      const touchDuration = Date.now() - touchStartTime;
      // Only prevent default for extremely short touches (likely accidental double-tap)
      if (touchDuration < 50) {
        e.preventDefault();
      }
      setTouchStartTime(null);
    }
  };

  const handleSelectFocus = (fieldName: string) => {
    if (isMobile) {
      setActiveDropdown(fieldName);
    }
  };

  const handleSelectBlur = (fieldName: string) => {
    if (isMobile) {
      // Add small delay before clearing active dropdown
      setTimeout(() => {
        setActiveDropdown(null);
      }, 50);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent, fieldName: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fieldOrder = ['username', 'email', 'password', 'password_confirm', 'user_type', 'birth_date', 'gender', 'company_name', 'website'];
      const currentIndex = fieldOrder.indexOf(fieldName);
      const nextField = fieldOrder[currentIndex + 1];
      
      if (nextField) {
        const nextElement = document.getElementById(nextField) || document.querySelector(`[name="${nextField}"]`);
        if (nextElement) {
          (nextElement as HTMLElement).focus();
        }
      } else {
        // Posledné pole - odoslať formulár
        handleSubmit(e as any);
      }
    }
  };

  // Smart validácia - kontrola dostupnosti emailu s debouncing
  const checkEmailAvailability = async (email: string) => {
    // Reset status ak je email prázdny alebo neplatný
    if (!email || !email.includes('@')) {
      setEmailStatus(null);
      setEmailError(null);
      return;
    }
    
    setEmailStatus('checking');
    setEmailError(null);
    
    try {
      // Debounce - počkaj 500ms pred volaním API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Skutočné API volanie na backend
      const response = await api.get(`/auth/check-email/${encodeURIComponent(email)}/`);
      const isAvailable = response.data.available;
      
      setEmailStatus(isAvailable ? 'available' : 'taken');
      setEmailError(null);
    } catch (error: any) {
      console.error('Chyba pri kontrole emailu:', error);
      
      // Ak API vráti chybu, zobrazíme ju
      if (error.response?.data?.error) {
        setEmailError(error.response.data.error);
      } else {
        setEmailError('Chyba pri kontrole dostupnosti emailu');
      }
      setEmailStatus('error');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Povinné polia
    if (!formData.username.trim()) newErrors.username = t('auth.usernameRequired');
    if (!formData.email.trim()) newErrors.email = t('auth.emailRequired');
    if (!formData.password) newErrors.password = t('auth.passwordRequired');
    
    // Validácia password_confirm
    if (!formData.password_confirm || formData.password_confirm.trim() === '') {
      newErrors.password_confirm = t('auth.confirmPasswordRequired');
    } else if (formData.password && formData.password.trim() !== formData.password_confirm.trim()) {
      newErrors.password_confirm = t('auth.passwordsDoNotMatch');
    }
    
    if (!formData.birth_day) newErrors.birth_day = t('auth.birthDateRequired');
    if (!formData.birth_month) newErrors.birth_month = t('auth.birthDateRequired');
    if (!formData.birth_year) newErrors.birth_year = t('auth.birthDateRequired');
    if (!formData.gender) newErrors.gender = t('auth.genderRequired');

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = t('auth.invalidEmailFormat');
    }

    // Validácia hesiel
    if (formData.password && formData.password.length < 8) {
      newErrors.password = t('auth.passwordMinLength');
    }

    // Validácia dátumu narodenia
    if (formData.birth_day && formData.birth_month && formData.birth_year) {
      const day = parseInt(formData.birth_day);
      const month = parseInt(formData.birth_month);
      const year = parseInt(formData.birth_year);
      const currentYear = new Date().getFullYear();
      
      if (year < 1900 || year > currentYear) {
        newErrors.birth_year = t('auth.invalidBirthYear');
      }
      if (month < 1 || month > 12) {
        newErrors.birth_month = t('auth.invalidMonth');
      }
      if (day < 1 || day > 31) {
        newErrors.birth_day = t('auth.invalidDay');
      }
      
      // Kontrola počtu dní v mesiaci
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) {
        newErrors.birth_day = t('auth.invalidDayForMonth');
      }
      
      // Kontrola veku (aspoň 13 rokov)
      const birthDate = new Date(year, month - 1, day);
      const age = currentYear - year;
      if (age < 13) {
        newErrors.birth_year = t('auth.ageRequirement');
      }
    }

    // Validácia pre firmy
    if (formData.user_type === 'company') {
      if (!formData.company_name.trim()) {
        newErrors.company_name = t('auth.companyNameRequired');
      }
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
      // Získaj reCAPTCHA token
      let captchaToken = '';
      if (executeRecaptcha) {
        try {
          captchaToken = await executeRecaptcha('register');
        } catch (captchaError) {
          console.error('reCAPTCHA error:', captchaError);
          setErrors({ general: t('auth.captchaError') });
          setIsLoading(false);
          return;
        }
      } else {
        console.warn('reCAPTCHA nie je k dispozícii');
        // V development mode môžeme pokračovať bez CAPTCHA
        if (process.env.NODE_ENV === 'production') {
          setErrors({ general: t('auth.captchaUnavailable') });
          setIsLoading(false);
          return;
        }
      }

      // Mobile connectivity check - dočasne vypnuté pre testovanie
      // if (window.innerWidth <= 768) {
      //   const isConnected = await checkNetworkConnectivity();
      //   if (!isConnected) {
      //     setErrors({ general: 'Nie je možné sa pripojiť k serveru. Skontrolujte internetové pripojenie.' });
      //     setIsLoading(false);
      //     return;
      //   }
      // }

      // Vyčistenie prázdnych polí pred odoslaním, ale zachovanie povinných polí
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => {
          // Zachovaj povinné polia aj keď sú prázdne
          const requiredFields = ['username', 'email', 'password', 'password_confirm', 'user_type', 'birth_day', 'birth_month', 'birth_year', 'gender'];
          if (requiredFields.includes(key)) {
            return true;
          }
          // Pre ostatné polia odstráň prázdne hodnoty
          return value !== '';
        })
      );

      // Pridaj CAPTCHA token do dát
      const dataWithCaptcha = {
        ...cleanedData,
        captcha_token: captchaToken
      };

      const response = await api.post(endpoints.auth.register, dataWithCaptcha);
      
      console.log('Registrácia úspešná:', response.data);
      // Zobrazenie úspešnej hlášky
      setRegistrationSuccess(true);
      
      // Vymazanie draftu po úspešnej registrácii - pridáno bez narušenia existujúcich funkcií
      clearDraft();
      
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Detailné error handling - zobrazujeme všetko
      let errorMessage = t('auth.registrationError');
      
      if (error.response?.data) {
        if (error.response.data.details) {
          // Ak sú detaily, zobrazíme ich
          setErrors(error.response.data.details);
          return;
        } else if (error.response.data.error) {
          errorMessage += error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage += error.response.data.message;
        } else {
          errorMessage += JSON.stringify(error.response.data);
        }
      }
      
      if (error.response?.status) {
        errorMessage += ` (Status: ${error.response.status})`;
      }
      
      if (error.message) {
        errorMessage += ` - ${error.message}`;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return t('auth.registering');
    return t('auth.registerButton');
  };

  const getButtonStyle = () => {
    if (isLoading) return { backgroundColor: '#A855F7', opacity: 0.8 };
    return { backgroundColor: '#7C3AED' };
  };

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
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        
        <motion.div 
          className="bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800"
          style={{
            width: isMobile ? '100%' : '100%',
            maxWidth: isMobile ? '600px' : '580px'
          }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div style={{
            marginLeft: isMobile ? '24px' : '32px', 
            marginRight: isMobile ? '24px' : '32px', 
            marginTop: '24px', 
            marginBottom: '24px'
          }}>
            <motion.h1 
              className="text-3xl font-medium text-center mb-6 text-black dark:text-white tracking-wider max-lg:text-2xl max-lg:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {registrationSuccess ? t('auth.registrationSuccess') : t('auth.registration')}
            </motion.h1>

            {registrationSuccess ? (
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
                    <p className="font-semibold">{t('auth.registrationSuccess')}</p>
                    <p className="text-sm mt-1">{t('auth.registrationSuccessMessage')}</p>
                  </div>
                </div>
              </motion.div>
            ) : errors.general && (
              <motion.div 
                className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {errors.general}
              </motion.div>
            )}


            {!registrationSuccess && (
              <motion.form 
                onSubmit={handleSubmit}
                className="space-y-4 max-lg:space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
              {/* Typ účtu */}
              <div>
                <label className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                  {t('auth.accountType')}
                </label>
                <select
                  id="user_type"
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleInputChange}
                  onKeyDown={(e) => handleKeyDown(e, 'user_type')}
                  onTouchStart={(e) => handleTouchStart(e, 'user_type')}
                  onTouchEnd={(e) => handleTouchEnd(e, 'user_type')}
                  onFocus={() => handleSelectFocus('user_type')}
                  onBlur={() => handleSelectBlur('user_type')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white"
                  aria-label={t('auth.selectAccountType')}
                  aria-required="true"
                  aria-describedby="user-type-help"
                  tabIndex={1}
                >
                  <option value="individual">{t('auth.individual')}</option>
                  <option value="company">{t('auth.company')}</option>
                </select>
                <div id="user-type-help" className="sr-only">
                  {t('auth.selectAccountTypeHelp')}
                </div>
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Prihlasovacie údaje */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="username" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                    {t('auth.username')} *
                  </label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'username')}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                      errors.username ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                    }`}
                    placeholder={t('auth.usernamePlaceholder')}
                    aria-label={t('auth.usernameHelp')}
                    aria-required="true"
                    aria-invalid={errors.username ? "true" : "false"}
                    aria-describedby={errors.username ? "username-error" : "username-help"}
                    tabIndex={2}
                    autoComplete="username"
                  />
                  <div id="username-help" className="sr-only">
                    {t('auth.usernameHelp')}
                  </div>
                  {errors.username && (
                    <p id="username-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                      {errors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                    {t('auth.email')} *
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'email')}
                    onBlur={(e) => checkEmailAvailability(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                      errors.email ? 'border-red-500' : 
                      emailStatus === 'taken' ? 'border-red-500' :
                      emailStatus === 'available' ? 'border-green-500' : 'border-gray-300 dark:border-gray-700'
                    }`}
                    placeholder={t('auth.emailPlaceholder')}
                    aria-label={t('auth.emailHelp')}
                    aria-required="true"
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={errors.email ? "email-error" : "email-help"}
                    tabIndex={3}
                    autoComplete="email"
                  />
                  <div id="email-help" className="sr-only">
                    {t('auth.emailHelp')}
                  </div>
                  
                  {/* Smart validácia - vizuálne indikátory */}
                  {emailStatus === 'checking' && (
                    <div className="flex items-center text-blue-600 text-sm mt-1" role="status" aria-live="polite">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      {t('auth.checkingEmail')}
                    </div>
                  )}
                  
                  {emailStatus === 'available' && (
                    <div className="flex items-center text-green-600 text-sm mt-1" role="status" aria-live="polite">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {t('auth.emailAvailable')}
                    </div>
                  )}
                  
                  {emailStatus === 'taken' && (
                    <div className="flex items-center text-red-600 text-sm mt-1" role="alert" aria-live="polite">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {t('auth.emailTaken')}
                    </div>
                  )}
                  
                  {emailStatus === 'error' && emailError && (
                    <div className="flex items-center text-red-600 text-sm mt-1" role="alert" aria-live="polite">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      {emailError}
                    </div>
                  )}
                  
                  {errors.email && (
                    <p id="email-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Heslá */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                    {t('auth.password')} *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'password')}
                      className={`w-full px-3 py-2 text-sm pr-12 border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                        errors.password ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                      placeholder={t('auth.passwordPlaceholder')}
                      aria-label={t('auth.passwordHelp')}
                      aria-required="true"
                      aria-invalid={errors.password ? "true" : "false"}
                      aria-describedby={errors.password ? "password-error" : "password-help"}
                      tabIndex={4}
                      autoComplete="new-password"
                    />
                    <div id="password-help" className="sr-only">
                      {t('auth.passwordHelp')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-2 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-1 focus:ring-purple-300 focus:ring-offset-2 rounded"
                      style={{ height: '100%' }}
                    >
                    
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password_confirm" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                    {t('auth.confirmPassword')} *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="password_confirm"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm pr-12 border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                        errors.password_confirm ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                      placeholder={t('auth.passwordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      aria-label={showPasswordConfirm ? t('auth.hidePassword') : t('auth.showPassword')}
                      className="absolute right-2 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      style={{ height: '100%' }}
                    >
                      {showPasswordConfirm ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password_confirm && (
                    <p className="text-red-500 text-sm mt-1">{errors.password_confirm}</p>
                  )}
                </div>
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Dátum narodenia */}
              <div>
                <label htmlFor="birth_date" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                  {t('auth.birthDate')} *
                </label>
                <input
                  id="birth_date"
                  type="date"
                  name="birth_date"
                  value={formData.birth_day && formData.birth_month && formData.birth_year 
                    ? `${formData.birth_year}-${formData.birth_month}-${formData.birth_day}` 
                    : ''}
                  onChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      const [year, month, day] = dateValue.split('-');
                      setFormData(prev => ({
                        ...prev,
                        birth_year: year,
                        birth_month: month,
                        birth_day: day
                      }));
                    } else {
                      setFormData(prev => ({
                        ...prev,
                        birth_year: '',
                        birth_month: '',
                        birth_day: ''
                      }));
                    }
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'birth_date')}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                    errors.birth_day || errors.birth_month || errors.birth_year ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                  aria-label={t('auth.birthDateHelp')}
                  aria-required="true"
                  aria-invalid={errors.birth_day || errors.birth_month || errors.birth_year ? "true" : "false"}
                  aria-describedby={errors.birth_day || errors.birth_month || errors.birth_year ? "birth-date-error" : "birth-date-help"}
                  tabIndex={5}
                />
                <div id="birth-date-help" className="sr-only">
                  {t('auth.birthDateHelp')}
                </div>
                
                {/* Error messages */}
                {(errors.birth_day || errors.birth_month || errors.birth_year) && (
                  <p id="birth-date-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                    {errors.birth_day || errors.birth_month || errors.birth_year}
                  </p>
                )}
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Pohlavie */}
              <div>
                <label htmlFor="gender" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                  {t('auth.gender')} *
                </label>
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  onTouchStart={(e) => handleTouchStart(e, 'gender')}
                  onTouchEnd={(e) => handleTouchEnd(e, 'gender')}
                  onFocus={() => handleSelectFocus('gender')}
                  onBlur={() => handleSelectBlur('gender')}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                    errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  <option value="">{t('auth.selectGender')}</option>
                  <option value="male">{t('auth.male')}</option>
                  <option value="female">{t('auth.female')}</option>
                  <option value="other">{t('auth.other')}</option>
                </select>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                )}
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Pre firmy */}
              {formData.user_type === 'company' && (
                <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <h3 className="text-base font-normal text-purple-700 dark:text-purple-400 mb-2 max-lg:text-base max-lg:mb-1">
                    {t('auth.companyInfo')}
                  </h3>
                  
                  <div>
                    <label htmlFor="company_name" className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                      {t('auth.companyName')} *
                    </label>
                    <input
                      id="company_name"
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white ${
                        errors.company_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                      }`}
                      placeholder={t('auth.companyNamePlaceholder')}
                    />
                    {errors.company_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-normal text-gray-600 dark:text-gray-300 mb-1.5 max-lg:text-base max-lg:mb-1">
                      {t('auth.website')}
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent outline-none transition-all bg-white dark:bg-black text-gray-900 dark:text-white"
                      placeholder={t('auth.websitePlaceholder')}
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white px-4 py-2.5 rounded-lg font-semibold text-xl transition-all max-lg:px-4 max-lg:py-2 max-lg:text-xl ${
                  isLoading ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
                }`}
                style={{
                  ...getButtonStyle(),
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                  marginTop: '20px'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
                tabIndex={10}
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
                  {getButtonText()}
                </div>
              </motion.button>
            </motion.form>
            )}

            {registrationSuccess ? (
              <motion.div 
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                <p className="text-2xl text-gray-600 dark:text-gray-300 max-lg:text-base mb-4">
                  {t('auth.afterVerification')}
                </p>
                <a 
                  href="/" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  {t('auth.loginLink')}
                </a>
              </motion.div>
            ) : (
              <div className="text-center" style={{marginTop: '16px'}}>
                <p className="text-base text-gray-600 dark:text-gray-300 max-lg:text-base">
                  {t('auth.haveAccount')}{' '}
                  <a 
                    href="/" 
                    className="text-purple-800 dark:text-purple-400 font-semibold hover:text-purple-900 dark:hover:text-purple-300 transition-colors"
                  >
                    {t('auth.loginLink')}
                  </a>
                </p>
              </div>
            )}

            {/* OAuth tlačidlá */}
            <motion.div 
              className="space-y-4 mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Footer - Lazy loaded s mobilnou optimalizáciou - skrytý na mobile */}
      <div className="hidden lg:block">
        <Suspense fallback={
          <div className="h-32 bg-gray-50 border-t border-gray-200">
            {/* Desktop fallback */}
          </div>
        }>
          <motion.footer 
            className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 relative z-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
        >
        <div className="flex justify-center">
          <div className="max-w-full max-lg:px-4" style={{paddingTop: '80px', paddingBottom: '80px'}}>
            <div className="flex flex-wrap justify-center gap-6 text-center max-lg:gap-3">
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.howItWorks')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.forIndividuals')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.forCompanies')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.forSchools')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.help')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.faq')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.contact')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.reportIssue')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.aboutUs')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.termsOfUse')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.privacyPolicy')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.cookies')}</a>
              <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-purple-800 dark:hover:text-purple-400 transition-colors max-lg:text-sm">{t('footer.gdpr')}</a>
            </div>

          {/* Spodná časť footeru */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 max-lg:mt-8 max-lg:pt-6">
            <div className="flex flex-col md:flex-row justify-between items-center">
            </div>
            <div className="mt-4 text-center text-gray-500 dark:text-gray-400 text-sm max-lg:text-xs">
              {t('footer.allRightsReserved')}
            </div>
          </div>
          </div>
        </div>
      </motion.footer>
      </Suspense>
      </div>
    </div>
  );
} 
