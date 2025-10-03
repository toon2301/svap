'use client';

import { useState, Suspense, lazy, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { setAuthTokens } from '@/utils/auth';
import { useAutoSave } from '@/hooks/useFormValidation';
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
      const fieldOrder = ['username', 'email', 'password', 'password_confirm', 'user_type', 'birth_day', 'birth_month', 'birth_year', 'gender', 'company_name', 'website'];
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
    if (!formData.username.trim()) newErrors.username = 'Používateľské meno je povinné';
    if (!formData.email.trim()) newErrors.email = 'Email je povinný';
    if (!formData.password) newErrors.password = 'Heslo je povinné';
    
    // Validácia password_confirm
    if (!formData.password_confirm || formData.password_confirm.trim() === '') {
      newErrors.password_confirm = 'Potvrdenie hesla je povinné';
    } else if (formData.password && formData.password.trim() !== formData.password_confirm.trim()) {
      newErrors.password_confirm = 'Heslá sa nezhodujú';
    }
    
    if (!formData.birth_day) newErrors.birth_day = 'Deň narodenia je povinný';
    if (!formData.birth_month) newErrors.birth_month = 'Mesiac narodenia je povinný';
    if (!formData.birth_year) newErrors.birth_year = 'Rok narodenia je povinný';
    if (!formData.gender) newErrors.gender = 'Pohlavie je povinné';

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Neplatný formát emailu';
    }

    // Validácia hesiel
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Heslo musí mať aspoň 8 znakov';
    }

    // Validácia dátumu narodenia
    if (formData.birth_day && formData.birth_month && formData.birth_year) {
      const day = parseInt(formData.birth_day);
      const month = parseInt(formData.birth_month);
      const year = parseInt(formData.birth_year);
      const currentYear = new Date().getFullYear();
      
      if (year < 1900 || year > currentYear) {
        newErrors.birth_year = 'Neplatný rok narodenia';
      }
      if (month < 1 || month > 12) {
        newErrors.birth_month = 'Neplatný mesiac';
      }
      if (day < 1 || day > 31) {
        newErrors.birth_day = 'Neplatný deň';
      }
      
      // Kontrola počtu dní v mesiaci
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) {
        newErrors.birth_day = 'Neplatný deň pre daný mesiac';
      }
      
      // Kontrola veku (aspoň 13 rokov)
      const birthDate = new Date(year, month - 1, day);
      const age = currentYear - year;
      if (age < 13) {
        newErrors.birth_year = 'Musíte mať aspoň 13 rokov';
      }
    }

    // Validácia pre firmy
    if (formData.user_type === 'company') {
      if (!formData.company_name.trim()) {
        newErrors.company_name = 'Názov firmy je povinný';
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

    try {
      const response = await api.post(endpoints.auth.register, cleanedData);
      
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
      let errorMessage = 'Chyba pri registrácii: ';
      
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
    if (isLoading) return 'Registrujem...';
    return 'Registrovať sa';
  };

  const getButtonStyle = () => {
    if (isLoading) return { backgroundColor: '#A855F7', opacity: 0.8 };
    return { backgroundColor: '#7C3AED' };
  };

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
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        
        <motion.div 
          className="bg-white rounded-2xl shadow-xl border border-gray-200"
          style={{
            width: isMobile ? '100%' : '100%',
            maxWidth: isMobile ? '600px' : '672px'
          }}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div style={{
            marginLeft: isMobile ? '24px' : '40px', 
            marginRight: isMobile ? '24px' : '40px', 
            marginTop: '30px', 
            marginBottom: '30px'
          }}>
            <motion.h1 
              className="text-4xl font-medium text-center mb-8 text-black tracking-wider max-lg:text-2xl max-lg:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {registrationSuccess ? 'Registrácia úspešná!' : 'Registrácia'}
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
                    <p className="font-semibold">Úspešná registrácia!</p>
                    <p className="text-sm mt-1">Skontrolujte si email a potvrďte registráciu kliknutím na odkaz v emaile.</p>
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
                className="space-y-6 max-lg:space-y-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
              {/* Typ účtu */}
              <div>
                <label className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                  Typ účtu
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
                  className="w-full px-16 py-12 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base"
                  style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  aria-label="Vyberte typ účtu"
                  aria-required="true"
                  aria-describedby="user-type-help"
                  tabIndex={1}
                >
                  <option value="individual">Osoba</option>
                  <option value="company">Firma</option>
                </select>
                <div id="user-type-help" className="sr-only">
                  Vyberte, či sa registrujete ako osoba alebo firma
                </div>
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Prihlasovacie údaje */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="username" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                    Používateľské meno *
                  </label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'username')}
                    className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                      errors.username ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Používateľské meno"
                    aria-label="Zadajte svoje používateľské meno"
                    aria-required="true"
                    aria-invalid={errors.username ? "true" : "false"}
                    aria-describedby={errors.username ? "username-error" : "username-help"}
                    tabIndex={2}
                    autoComplete="username"
                    style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  />
                  <div id="username-help" className="sr-only">
                    Zadajte jedinečné používateľské meno pre váš účet
                  </div>
                  {errors.username && (
                    <p id="username-error" className="text-red-500 text-sm mt-1" role="alert" aria-live="polite">
                      {errors.username}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleKeyDown(e, 'email')}
                    onBlur={(e) => checkEmailAvailability(e.target.value)}
                    className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                      errors.email ? 'border-red-500' : 
                      emailStatus === 'taken' ? 'border-red-500' :
                      emailStatus === 'available' ? 'border-green-500' : 'border-gray-300'
                    }`}
                    placeholder="vas@email.sk"
                    aria-label="Zadajte svoju emailovú adresu"
                    aria-required="true"
                    aria-invalid={errors.email ? "true" : "false"}
                    aria-describedby={errors.email ? "email-error" : "email-help"}
                    tabIndex={3}
                    autoComplete="email"
                    style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  />
                  <div id="email-help" className="sr-only">
                    Zadajte platnú emailovú adresu pre registráciu
                  </div>
                  
                  {/* Smart validácia - vizuálne indikátory */}
                  {emailStatus === 'checking' && (
                    <div className="flex items-center text-blue-600 text-sm mt-1" role="status" aria-live="polite">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Kontrolujem dostupnosť emailu...
                    </div>
                  )}
                  
                  {emailStatus === 'available' && (
                    <div className="flex items-center text-green-600 text-sm mt-1" role="status" aria-live="polite">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Email je dostupný ✅
                    </div>
                  )}
                  
                  {emailStatus === 'taken' && (
                    <div className="flex items-center text-red-600 text-sm mt-1" role="alert" aria-live="polite">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Email už je obsadený ❌
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
                  <label htmlFor="password" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                    Heslo *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyDown={(e) => handleKeyDown(e, 'password')}
                      className={`w-full px-16 py-12 text-xl pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                        errors.password ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                      aria-label="Zadajte svoje heslo"
                      aria-required="true"
                      aria-invalid={errors.password ? "true" : "false"}
                      aria-describedby={errors.password ? "password-error" : "password-help"}
                      tabIndex={4}
                      autoComplete="new-password"
                      style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                    />
                    <div id="password-help" className="sr-only">
                      Heslo musí obsahovať aspoň 8 znakov
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded"
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
                  <label htmlFor="password_confirm" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                    Potvrdenie hesla *
                  </label>
                  <div className="relative">
                    <input
                      id="password_confirm"
                      type={showPasswordConfirm ? 'text' : 'password'}
                      name="password_confirm"
                      value={formData.password_confirm}
                      onChange={handleInputChange}
                      className={`w-full px-16 py-12 text-xl pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                        errors.password_confirm ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                      style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      aria-label={showPasswordConfirm ? 'Skryť heslo' : 'Zobraziť heslo'}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                <label className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                  Dátum narodenia *
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <select
                    name="birth_day"
                    value={formData.birth_day}
                    onChange={handleInputChange}
                    onTouchStart={(e) => handleTouchStart(e, 'birth_day')}
                    onTouchEnd={(e) => handleTouchEnd(e, 'birth_day')}
                    onFocus={() => handleSelectFocus('birth_day')}
                    onBlur={() => handleSelectBlur('birth_day')}
                    className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                      errors.birth_day ? 'border-red-500' : 'border-gray-300'
                    }`}
                    style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  >
                    <option value="">Deň</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day.toString().padStart(2, '0')}>
                        {day.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>

                  <select
                    name="birth_month"
                    value={formData.birth_month}
                    onChange={handleInputChange}
                    onTouchStart={(e) => handleTouchStart(e, 'birth_month')}
                    onTouchEnd={(e) => handleTouchEnd(e, 'birth_month')}
                    onFocus={() => handleSelectFocus('birth_month')}
                    onBlur={() => handleSelectBlur('birth_month')}
                    className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                      errors.birth_month ? 'border-red-500' : 'border-gray-300'
                    }`}
                    style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  >
                    <option value="">Mesiac</option>
                    {[
                      'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
                      'Júl', 'August', 'September', 'Október', 'November', 'December'
                    ].map((month, index) => (
                      <option key={index} value={(index + 1).toString().padStart(2, '0')}>
                        {month}
                      </option>
                    ))}
                  </select>

                  <select
                    name="birth_year"
                    value={formData.birth_year}
                    onChange={handleInputChange}
                    onTouchStart={(e) => handleTouchStart(e, 'birth_year')}
                    onTouchEnd={(e) => handleTouchEnd(e, 'birth_year')}
                    onFocus={() => handleSelectFocus('birth_year')}
                    onBlur={() => handleSelectBlur('birth_year')}
                    className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                      errors.birth_year ? 'border-red-500' : 'border-gray-300'
                    }`}
                    style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                  >
                    <option value="">Rok</option>
                    {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Error messages outside select elements */}
                <div className="grid grid-cols-3 gap-4 mt-2">
                  {errors.birth_day && (
                    <p className="text-red-500 text-sm">{errors.birth_day}</p>
                  )}
                  {errors.birth_month && (
                    <p className="text-red-500 text-sm">{errors.birth_month}</p>
                  )}
                  {errors.birth_year && (
                    <p className="text-red-500 text-sm">{errors.birth_year}</p>
                  )}
                </div>
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Pohlavie */}
              <div>
                <label htmlFor="gender" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                  Pohlavie *
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
                  className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                    errors.gender ? 'border-red-500' : 'border-gray-300'
                  }`}
                  style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                >
                  <option value="">Vyberte pohlavie</option>
                  <option value="male">Muž</option>
                  <option value="female">Žena</option>
                  <option value="other">Iné</option>
                </select>
                {errors.gender && (
                  <p className="text-red-500 text-sm mt-1">{errors.gender}</p>
                )}
              </div>

              <div style={{marginTop: '12px'}}></div>

              {/* Pre firmy */}
              {formData.user_type === 'company' && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                  <h3 className="text-lg font-normal text-purple-700 mb-2 max-lg:text-base max-lg:mb-1">
                    Informácie o firme
                  </h3>
                  
                  <div>
                    <label htmlFor="company_name" className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                      Názov firmy *
                    </label>
                    <input
                      id="company_name"
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      className={`w-full px-16 py-12 text-xl border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base ${
                        errors.company_name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Názov firmy"
                      style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                    />
                    {errors.company_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-lg font-normal text-gray-600 mb-2 max-lg:text-base max-lg:mb-1">
                      Webstránka
                    </label>
                    <input
                      type="url"
                      name="website"
                      value={formData.website}
                      onChange={handleInputChange}
                      className="w-full px-16 py-12 text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all max-lg:px-4 max-lg:py-3 max-lg:text-base"
                      placeholder="https://www.example.sk"
                      style={{paddingLeft: '12px', paddingRight: '12px', paddingTop: '16px', paddingBottom: '16px'}}
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full text-white px-6 py-4 rounded-lg font-semibold text-xl transition-all ${
                  isLoading ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-lg'
                }`}
                style={{
                  ...getButtonStyle(),
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
                <p className="text-2xl text-gray-600 max-lg:text-base mb-4">
                  Po overení emailu sa môžete prihlásiť
                </p>
                <a 
                  href="/" 
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Prihlásiť sa
                </a>
              </motion.div>
            ) : (
              <div className="text-center" style={{marginTop: '16px'}}>
                <p className="text-2xl text-gray-600 max-lg:text-base">
                  Už máte účet?{' '}
                  <a 
                    href="/" 
                    className="text-purple-800 font-semibold hover:text-purple-900 transition-colors"
                  >
                    Prihlásiť sa
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
            className="bg-gray-50 border-t border-gray-200 relative z-10"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
        >
        <div className="flex justify-center">
          <div className="max-w-full max-lg:px-4" style={{paddingTop: '80px', paddingBottom: '80px'}}>
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
    </div>
  );
}
