'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../../lib/api';

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

export default function ResetPasswordClient() {
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await api.get(`/auth/password-reset-verify/${uidb64}/${token}/`);
        if (response.data.valid) {
          setIsValidating(false);
        } else {
          setValidationError('Token je neplatný alebo expiroval');
          setIsValidating(false);
        }
      } catch (error) {
        setValidationError('Chyba pri overovaní tokenu');
        setIsValidating(false);
      }
    };

    if (uidb64 && token) {
      validateToken();
    } else {
      setValidationError('Neplatný odkaz');
      setIsValidating(false);
    }
  }, [uidb64, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Vymaž chybu pre toto pole
    if (errors[name as keyof ResetPasswordErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ResetPasswordErrors = {};

    if (!formData.password) {
      newErrors.password = 'Heslo je povinné';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Heslo musí mať aspoň 8 znakov';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Heslo musí obsahovať veľké písmeno, malé písmeno a číslo';
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
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await api.post(`/auth/password-reset/${uidb64}/${token}/`, {
        password: formData.password,
        confirm_password: formData.confirmPassword
      });

      if (response.status === 200) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      if (error.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        setErrors({
          general: apiErrors.non_field_errors?.[0] || 'Chyba pri zmene hesla',
          password: apiErrors.password?.[0],
          confirmPassword: apiErrors.confirm_password?.[0]
        });
      } else {
        setErrors({
          general: 'Chyba pri zmene hesla. Skúste to znovu.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Overujem token...</p>
        </div>
      </div>
    );
  }

  if (validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Neplatný odkaz</h1>
          <p className="text-gray-600 mb-6">{validationError}</p>
          <button
            onClick={() => router.push('/forgot-password')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Požiadať o nový odkaz
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Suspense fallback={<div>Loading...</div>}>
          <ParticlesBackground />
        </Suspense>
        <div className="relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white p-8 rounded-2xl shadow-xl max-w-md mx-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-green-500 text-6xl mb-4"
            >
              ✅
            </motion.div>
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-2xl font-bold text-gray-900 mb-4"
            >
              Heslo úspešne zmenené!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="text-gray-600 mb-6"
            >
              Vaše heslo bolo úspešne zmenené. Budete presmerovaní na prihlasovaciu stránku.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
            ></motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<div>Loading...</div>}>
        <ParticlesBackground />
      </Suspense>
      <div className="relative z-10 w-full max-w-md mx-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white p-8 rounded-2xl shadow-xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Zmena hesla
            </h1>
            <p className="text-gray-600">
              Zadajte nové heslo pre váš účet
            </p>
          </motion.div>

          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-red-600 text-sm">{errors.general}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Nové heslo
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Zadajte nové heslo"
                disabled={isLoading}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Potvrdenie hesla
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Potvrďte nové heslo"
                disabled={isLoading}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </motion.div>

            <motion.button
              type="submit"
              disabled={isLoading}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Mením heslo...
                </div>
              ) : (
                'Zmeniť heslo'
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => router.push('/login')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Späť na prihlásenie
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
