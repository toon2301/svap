'use client';

import { useState, useEffect } from 'react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { api, endpoints } from '@/lib/api';
import { useAutoSave } from '@/hooks/useFormValidation';
import { fetchCsrfToken } from '@/utils/csrf';

interface FormData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
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

interface UseRegisterFormParams {
  t: (key: string, defaultValue?: string) => string;
}

export function useRegisterForm({ t }: UseRegisterFormParams) {
  const { executeRecaptcha } = useGoogleReCaptcha();

  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    user_type: 'individual',
    company_name: '',
    website: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
    gender: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Smart validácia - email availability
  const [emailStatus, setEmailStatus] = useState<
    'checking' | 'available' | 'taken' | 'error' | null
  >(null);
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

    // Získaj CSRF token z backendu – v testoch preskoč, aby sme nevolali sieťové requesty
    if (process.env.NODE_ENV !== 'test') {
      fetchCsrfToken().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Nepodarilo sa získať CSRF token:', err);
      });
    }
  }, [loadDraft]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Dropdown handling - minimal delay for select elements
    if (e.target.tagName === 'SELECT') {
      // Add very small delay to prevent immediate blur, but allow normal interaction
      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
        // Reset active dropdown state after update
        setActiveDropdown(null);
      }, 10);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Vymazanie chyby pri zmene hodnoty
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }

    // Vymaž chybu pre password_confirm pri každej zmene
    if (name === 'password_confirm' || name === 'password') {
      setErrors((prev) => {
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
    // Pre username pole povoliť všetky znaky vrátane medzier
    if (fieldName === 'username') {
      // Nechaj medzery prejsť bez zásahu
      if (e.key === 'Enter') {
        e.preventDefault();
        const nextElement = document.getElementById('email');
        if (nextElement) {
          (nextElement as HTMLElement).focus();
        }
      }
      return; // Ukončiť handler pre username, nechaj medzery prejsť
    }
    
    if (e.key === 'Enter') {
      e.preventDefault();
      const fieldOrder = [
        'username',
        'email',
        'password',
        'password_confirm',
        'user_type',
        'birth_date',
        'gender',
        'company_name',
        'website',
      ];
      const currentIndex = fieldOrder.indexOf(fieldName);
      const nextField = fieldOrder[currentIndex + 1];

      if (nextField) {
        const nextElement =
          document.getElementById(nextField) ||
          (document.querySelector(`[name="${nextField}"]`) as HTMLElement | null);
        if (nextElement) {
          nextElement.focus();
        }
      } else {
        // Posledné pole - odoslať formulár
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Skutočné API volanie na backend
      const response = await api.get(
        `/auth/check-email/${encodeURIComponent(email)}/`,
      );
      const isAvailable = response.data.available;

      setEmailStatus(isAvailable ? 'available' : 'taken');
      setEmailError(null);
    } catch (error: any) {
      // eslint-disable-next-line no-console
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
    } else if (
      formData.password &&
      formData.password.trim() !== formData.password_confirm.trim()
    ) {
      newErrors.password_confirm = t('auth.passwordsDoNotMatch');
    }

    // Dátum narodenia a pohlavie - len pre jednotlivcov
    if (formData.user_type === 'individual') {
      if (!formData.birth_day) newErrors.birth_day = t('auth.birthDateRequired');
      if (!formData.birth_month) newErrors.birth_month = t('auth.birthDateRequired');
      if (!formData.birth_year) newErrors.birth_year = t('auth.birthDateRequired');
      if (!formData.gender) newErrors.gender = t('auth.genderRequired');
    }

    // Validácia emailu
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = t('auth.invalidEmailFormat');
    }

    // Validácia hesiel
    if (formData.password && formData.password.length < 8) {
      newErrors.password = t('auth.passwordMinLength');
    }

    // Validácia dátumu narodenia - len pre jednotlivcov
    if (formData.user_type === 'individual' && formData.birth_day && formData.birth_month && formData.birth_year) {
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
      const age = currentYear - year;
      if (age < 13) {
        newErrors.birth_year = t('auth.ageRequirement');
      }
    }

    // Validácia pre firmy - company_name sa ukladá z username poľa
    if (formData.user_type === 'company') {
      if (!formData.username.trim()) {
        newErrors.username = t('auth.companyNameRequired');
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
      const reCaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
      const isTestKey = !reCaptchaSiteKey || reCaptchaSiteKey === 'test-site-key' || reCaptchaSiteKey.startsWith('test-');
      
      // V development režime s test kľúčom alebo bez kľúča pokračujeme bez reCAPTCHA
      if (isTestKey && process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Registrácia bez reCAPTCHA (development režim s test kľúčom)');
        // Pokračujeme bez captcha tokenu
      } else if (executeRecaptcha) {
        try {
          captchaToken = await executeRecaptcha('register');
        } catch (captchaError) {
          // eslint-disable-next-line no-console
          console.error('reCAPTCHA error:', captchaError);
          // Ak je to chyba s test-site-key, v development režime pokračujeme bez CAPTCHA
          if (isTestKey && process.env.NODE_ENV === 'development') {
            console.warn('⚠️ reCAPTCHA error s test kľúčom - pokračujeme bez CAPTCHA v development režime');
            // Pokračujeme bez captcha tokenu
          } else {
            setErrors({ general: t('auth.captchaError') });
            setIsLoading(false);
            return;
          }
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn('reCAPTCHA nie je k dispozícii');
        // S test kľúčom (test-site-key) alebo v development mode pokračujeme bez CAPTCHA
        if (!isTestKey && process.env.NODE_ENV === 'production') {
          setErrors({ general: t('auth.captchaUnavailable') });
          setIsLoading(false);
          return;
        }
      }

      // Pre firmu: uložiť username (názov firmy) do first_name a company_name
      // Pre jednotlivca: uložiť username do first_name
      const updatedFormData = {
        ...formData,
        first_name: formData.username.trim(), // Username sa uloží ako first_name
        last_name: '', // Priezvisko necháme prázdne
        // Pre firmu: nastaviť company_name z username (názov firmy)
        ...(formData.user_type === 'company' && {
          company_name: formData.username.trim(),
        }),
      };

      // Vyčistenie prázdnych polí pred odoslaním, ale zachovanie povinných polí
      const cleanedData = Object.fromEntries(
        Object.entries(updatedFormData).filter(([key, value]) => {
          // Zachovaj povinné polia aj keď sú prázdne
          const requiredFields = [
            'username',
            'email',
            'password',
            'password_confirm',
            'user_type',
            // Dátum narodenia a pohlavie len pre jednotlivcov
            ...(formData.user_type === 'individual' ? ['birth_day', 'birth_month', 'birth_year', 'gender'] : []),
          ];
          if (requiredFields.includes(key)) {
            return true;
          }
          // Pre ostatné polia odstráň prázdne hodnoty
          return value !== '';
        }),
      );

      // Pridaj CAPTCHA token do dát
      // V development režime s test kľúčom neposielame captcha_token vôbec (backend to nevyžaduje v DEBUG režime)
      const dataWithCaptcha: any = {
        ...cleanedData,
      };
      
      // Pridaj captcha_token len ak máme platný token
      // V development režime s test kľúčom ho vôbec neposielame, lebo backend v DEBUG režime nevyžaduje CAPTCHA
      if (captchaToken && captchaToken.trim() !== '') {
        dataWithCaptcha.captcha_token = captchaToken;
      }
      // Ak je test kľúč alebo prázdny token v development režime, captcha_token vôbec neposielame
      // Backend v DEBUG režime má captcha_token ako nepovinný

      const response = await api.post(endpoints.auth.register, dataWithCaptcha);

      // Zobrazenie úspešnej hlášky
      setRegistrationSuccess(true);

      // Vymazanie draftu po úspešnej registrácii - pridáno bez narušenia existujúcich funkcií
      clearDraft();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Registration error:', error);
      // eslint-disable-next-line no-console
      console.error('Error response:', error.response?.data);
      // eslint-disable-next-line no-console
      console.error('Error status:', error.response?.status);

      // Detailné error handling - zobrazujeme všetko
      let errorMessage = t('auth.registrationError');

      if (error.response?.data) {
        if (error.response.data.details) {
          // Ak sú detaily, zobrazíme ich
          setErrors(error.response.data.details);
          return;
        }
        if (error.response.data.error) {
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

  // Handler pre zmenu username s limitom 35 znakov
  const handleUsernameChange = (value: string) => {
    if (value.length <= 35) {
      setFormData(prev => ({ ...prev, username: value }));
    }
  };

  return {
    formData,
    setFormData,
    errors,
    isLoading,
    showPassword,
    setShowPassword,
    showPasswordConfirm,
    setShowPasswordConfirm,
    registrationSuccess,
    emailStatus,
    emailError,
    handleInputChange,
    handleUsernameChange,
    handleTouchStart,
    handleTouchEnd,
    handleSelectFocus,
    handleSelectBlur,
    handleKeyDown,
    checkEmailAvailability,
    handleSubmit,
    getButtonText,
  };
}

export type UseRegisterFormReturn = ReturnType<typeof useRegisterForm>;


