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
import AccountTypeSelect from './register/AccountTypeSelect';
import CredentialsSection from './register/CredentialsSection';
import PasswordSection from './register/PasswordSection';
import BirthGenderSection from './register/BirthGenderSection';
import CompanySection from './register/CompanySection';
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
  }, [loadDraft]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Dropdown handling - minimal delay for select elements
    if (e.target.tagName === 'SELECT') {
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

  // Touch handlers for dropdown elements
  const handleTouchStart = (e: React.TouchEvent, fieldName: string) => {
    setTouchStartTime(Date.now());
    setActiveDropdown(fieldName);
  };

  const handleTouchEnd = (e: React.TouchEvent, fieldName: string) => {
    if (touchStartTime) {
      const touchDuration = Date.now() - touchStartTime;
      // Only prevent default for extremely short touches (likely accidental double-tap)
      if (touchDuration < 50) {
        e.preventDefault();
      }
      setTouchStartTime(null);
    }
  };

  const handleSelectFocus = (fieldName: string) => {
    setActiveDropdown(fieldName);
  };

  const handleSelectBlur = (fieldName: string) => {
    // Add small delay before clearing active dropdown
    setTimeout(() => {
      setActiveDropdown(null);
    }, 50);
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
          className="w-full max-w-[min(580px,90vw)] lg:max-w-[clamp(380px,35vw,480px)] xl:max-w-[clamp(480px,38vw,580px)] bg-white dark:bg-black rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="px-[clamp(1.25rem,4vw,2rem)] py-[clamp(1.5rem,4vw,1.5rem)]">
            <motion.h1 
              className="text-[clamp(1.5rem,3vw,1.875rem)] font-medium text-center mb-[clamp(1rem,2vw,1.5rem)] text-black dark:text-white tracking-wider"
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
              <AccountTypeSelect
                t={t}
                  value={formData.user_type}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown as any}
                onTouchStart={handleTouchStart as any}
                onTouchEnd={handleTouchEnd as any}
                onFocus={handleSelectFocus}
                onBlur={handleSelectBlur}
              />

              {/* Prihlasovacie údaje */}
              <CredentialsSection
                t={t}
                username={formData.username}
                email={formData.email}
                errors={errors}
                emailStatus={emailStatus}
                emailError={emailError}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown as any}
                onEmailBlur={checkEmailAvailability}
              />

              {/* Heslá */}
              <PasswordSection
                t={t}
                password={formData.password}
                passwordConfirm={formData.password_confirm}
                errors={errors}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                showPasswordConfirm={showPasswordConfirm}
                setShowPasswordConfirm={setShowPasswordConfirm}
                onChange={handleInputChange as any}
                onKeyDown={handleKeyDown as any}
              />

              {/* Dátum narodenia */}
              <BirthGenderSection
                t={t}
                birthDay={formData.birth_day}
                birthMonth={formData.birth_month}
                birthYear={formData.birth_year}
                gender={formData.gender}
                errors={errors}
                onDateChange={(e) => {
                    const dateValue = e.target.value;
                    if (dateValue) {
                      const [year, month, day] = dateValue.split('-');
                    setFormData(prev => ({ ...prev, birth_year: year, birth_month: month, birth_day: day }));
                    } else {
                    setFormData(prev => ({ ...prev, birth_year: '', birth_month: '', birth_day: '' }));
                  }
                }}
                onKeyDown={handleKeyDown as any}
                onGenderChange={handleInputChange as any}
                bindSelectHandlers={{ onTouchStart: handleTouchStart as any, onTouchEnd: handleTouchEnd as any, onFocus: handleSelectFocus, onBlur: handleSelectBlur }}
              />

              {/* Pre firmy */}
              {formData.user_type === 'company' && (
                <CompanySection
                  t={t}
                  companyName={formData.company_name}
                  website={formData.website}
                  errors={errors}
                  onChange={handleInputChange as any}
                />
              )}

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white px-4 py-[clamp(0.5rem,1.5vw,0.625rem)] rounded-2xl font-semibold text-[clamp(0.875rem,2vw,1.25rem)] transition-all mt-5 ${
                  isLoading ? 'cursor-not-allowed bg-purple-400 opacity-80' : 'cursor-pointer bg-purple-600 hover:bg-purple-700 hover:shadow-lg'
                }`}
                style={{
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
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
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-purple-700 transition-colors"
                >
                  {t('auth.loginLink')}
                </a>
              </motion.div>
            ) : (
              <div className="text-center mt-4">
                <p className="text-[clamp(0.875rem,1.5vw,1rem)] text-gray-600 dark:text-gray-300">
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
          <div className="h-32 bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800">
            {/* Desktop fallback */}
          </div>
        }>
          <motion.footer 
            className="bg-gray-50 dark:bg-black border-t border-gray-200 dark:border-gray-800 relative z-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
        >
          <div className="main-column py-8 lg:py-4 2xl:py-10">
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
    </div>
  );
} 
