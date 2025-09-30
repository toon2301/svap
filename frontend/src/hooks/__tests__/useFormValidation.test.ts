import { renderHook, act } from '@testing-library/react';
import { useFormValidation, commonValidationRules } from '../useFormValidation';

describe('useFormValidation', () => {
  const rules = {
    email: {
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Invalid email'
    },
    password: {
      required: true,
      minLength: 8,
      message: 'Password too short'
    },
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      message: 'Invalid name length'
    }
  };

  it('inicializuje s prázdnymi chybami', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    expect(result.current.errors).toEqual({});
    expect(result.current.hasErrors).toBe(false);
  });

  it('validuje jednotlivé polia', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      const error = result.current.validateField('email', 'invalid-email');
      expect(error).toBe('Invalid email');
    });

    act(() => {
      const error = result.current.validateField('email', 'test@example.com');
      expect(error).toBeNull();
    });
  });

  it('validuje celý formulár', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    const validData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'John Doe'
    };

    const invalidData = {
      email: 'invalid-email',
      password: '123',
      name: 'A'
    };

    act(() => {
      const isValid = result.current.validateForm(validData);
      expect(isValid).toBe(true);
      expect(result.current.hasErrors).toBe(false);
    });

    act(() => {
      const isValid = result.current.validateForm(invalidData);
      expect(isValid).toBe(false);
    });
    
    // hasErrors sa aktualizuje po setErrors
    expect(result.current.hasErrors).toBe(true);
  });

  it('nastavuje chyby pre neplatné polia', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.validateForm({
        email: 'invalid-email',
        password: '123',
        name: 'A'
      });
    });

    expect(result.current.errors.email).toBe('Invalid email');
    expect(result.current.errors.password).toBe('Password too short');
    expect(result.current.errors.name).toBe('Invalid name length');
  });

  it('umožňuje nastaviť chybu manuálne', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.setError('email', 'Custom error');
    });

    expect(result.current.errors.email).toBe('Custom error');
    expect(result.current.hasErrors).toBe(true);
  });

  it('umožňuje vymazať chyby', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      result.current.setError('email', 'Custom error');
    });

    expect(result.current.hasErrors).toBe(true);

    act(() => {
      result.current.clearErrors();
    });

    expect(result.current.errors).toEqual({});
    expect(result.current.hasErrors).toBe(false);
  });

  it('validuje required polia', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      const error = result.current.validateField('email', '');
      expect(error).toBe('Invalid email');
    });

    act(() => {
      const error = result.current.validateField('email', '   ');
      expect(error).toBe('Invalid email');
    });
  });

  it('validuje minLength', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      const error = result.current.validateField('password', '123');
      expect(error).toBe('Password too short');
    });
  });

  it('validuje maxLength', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      const error = result.current.validateField('name', 'A'.repeat(51));
      expect(error).toBe('Invalid name length');
    });
  });

  it('validuje pattern', () => {
    const { result } = renderHook(() => useFormValidation(rules));

    act(() => {
      const error = result.current.validateField('email', 'not-an-email');
      expect(error).toBe('Invalid email');
    });
  });

  it('preskočí validáciu pre prázdne hodnoty ak nie sú required', () => {
    const optionalRules = {
      optionalField: {
        pattern: /^[0-9]+$/,
        message: 'Must be numbers only'
      }
    };

    const { result } = renderHook(() => useFormValidation(optionalRules));

    act(() => {
      const error = result.current.validateField('optionalField', '');
      expect(error).toBeNull();
    });
  });
});

describe('commonValidationRules', () => {
  it('obsahuje email validáciu', () => {
    expect(commonValidationRules.email).toBeDefined();
    expect(commonValidationRules.email.required).toBe(true);
    expect(commonValidationRules.email.pattern).toBeInstanceOf(RegExp);
  });

  it('obsahuje password validáciu', () => {
    expect(commonValidationRules.password).toBeDefined();
    expect(commonValidationRules.password.required).toBe(true);
    expect(commonValidationRules.password.minLength).toBe(8);
  });

  it('obsahuje firstName validáciu', () => {
    expect(commonValidationRules.firstName).toBeDefined();
    expect(commonValidationRules.firstName.required).toBe(true);
    expect(commonValidationRules.firstName.minLength).toBe(2);
    expect(commonValidationRules.firstName.maxLength).toBe(50);
  });

  it('obsahuje lastName validáciu', () => {
    expect(commonValidationRules.lastName).toBeDefined();
    expect(commonValidationRules.lastName.required).toBe(true);
    expect(commonValidationRules.lastName.minLength).toBe(2);
    expect(commonValidationRules.lastName.maxLength).toBe(50);
  });

  it('obsahuje phone validáciu', () => {
    expect(commonValidationRules.phone).toBeDefined();
    expect(commonValidationRules.phone.pattern).toBeInstanceOf(RegExp);
  });

  it('obsahuje website validáciu', () => {
    expect(commonValidationRules.website).toBeDefined();
    expect(commonValidationRules.website.pattern).toBeInstanceOf(RegExp);
  });
});
