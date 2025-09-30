'use client';

import { useState, useCallback, useEffect } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface FormErrors {
  [key: string]: string | null;
}

interface UseFormValidationReturn {
  errors: FormErrors;
  validateField: (name: string, value: any) => string | null;
  validateForm: (data: any) => boolean;
  setError: (name: string, error: string | null) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

export function useFormValidation(rules: ValidationRules): UseFormValidationReturn {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((name: string, value: any): string | null => {
    const rule = rules[name];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || `${name} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return null;
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `${name} too short`;
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `Invalid ${name} length`;
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || `Invalid ${name}`;
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [rules]);

  const validateForm = useCallback((data: any): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const setError = useCallback((name: string, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = Object.values(errors).some(error => error !== null && error !== '');

  return {
    errors,
    validateField,
    validateForm,
    setError,
    clearErrors,
    hasErrors,
  };
}

// Common validation rules
export const commonValidationRules = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Zadajte platnú emailovú adresu'
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    message: 'Heslo musí obsahovať aspoň 8 znakov, jedno veľké písmeno, jedno malé písmeno a jedno číslo'
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Meno musí mať 2-50 znakov'
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    message: 'Priezvisko musí mať 2-50 znakov'
  },
  phone: {
    pattern: /^[\+]?[0-9\s\-\(\)]{9,}$/,
    message: 'Zadajte platné telefónne číslo'
  },
  website: {
    pattern: /^https?:\/\/.+/,
    message: 'Webová stránka musí začínať s http:// alebo https://'
  }
};

// Auto-save hook - pridáno bez narušenia existujúcich funkcií
export function useAutoSave(formData: any, key: string, interval = 30000) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Kontrola, či sú nejaké údaje na uloženie
    const hasData = Object.values(formData).some(value => 
      value !== '' && value !== null && value !== undefined
    );

    if (!hasData) {
      setIsSaved(false);
      return;
    }

    setIsSaving(true);
    
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(formData));
        setIsSaved(true);
        setIsSaving(false);
      } catch (error) {
        console.error('Chyba pri ukladaní draftu:', error);
        setIsSaving(false);
      }
    }, interval);

    return () => clearTimeout(timeout);
  }, [formData, key, interval]);

  // Načítanie draftu
  const loadDraft = useCallback(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Chyba pri načítaní draftu:', error);
      return null;
    }
  }, [key]);

  // Vymazanie draftu
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setIsSaved(false);
    } catch (error) {
      console.error('Chyba pri mazaní draftu:', error);
    }
  }, [key]);

  return { 
    isSaved, 
    isSaving, 
    loadDraft, 
    clearDraft 
  };
}