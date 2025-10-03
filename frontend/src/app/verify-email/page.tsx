'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api, endpoints } from '@/lib/api';
import { setAuthTokens } from '@/utils/auth';

interface VerificationStatus {
  status: 'loading' | 'success' | 'error';
  message: string;
  error?: string;
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    status: 'loading',
    message: 'Overujem email...'
  });

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setVerificationStatus({
          status: 'error',
          message: 'Chyba',
          error: 'Chýba verifikačný token'
        });
        return;
      }

      try {
        const response = await api.post(endpoints.auth.verifyEmail, {
          token: token
        });

        if (response.data.verified) {
          // Automatické prihlásenie po úspešnej verifikácii
          if (response.data.tokens) {
            setAuthTokens({
              access: response.data.tokens.access,
              refresh: response.data.tokens.refresh
            });
            
            setVerificationStatus({
              status: 'success',
              message: 'Email bol úspešne overený! Presmerovávam na dashboard...'
            });
            
            // Presmerovanie na dashboard po 2 sekundách
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
          } else {
            setVerificationStatus({
              status: 'success',
              message: 'Email bol úspešne overený!'
            });
          }
        } else {
          setVerificationStatus({
            status: 'error',
            message: 'Chyba pri overovaní',
            error: response.data.error || 'Nepodarilo sa overiť email'
          });
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        
        let errorMessage = 'Nepodarilo sa overiť email';
        
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.details?.token) {
          errorMessage = error.response.data.details.token[0];
        }

        setVerificationStatus({
          status: 'error',
          message: 'Chyba pri overovaní',
          error: errorMessage
        });
      }
    };

    verifyEmail();
  }, [searchParams]);

  const getStatusIcon = () => {
    switch (verificationStatus.status) {
      case 'loading':
        return (
          <motion.div
            className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        );
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus.status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-purple-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md w-full text-center"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <motion.div 
          className="flex justify-center mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {getStatusIcon()}
        </motion.div>

        <motion.h1 
          className={`text-2xl font-semibold mb-4 ${getStatusColor()}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {verificationStatus.message}
        </motion.h1>

        {verificationStatus.status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <p className="text-gray-600 mb-6">
              Váš email bol úspešne overený. Teraz sa môžete prihlásiť do svojho účtu.
            </p>
            <a
              href="/"
              className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Prihlásiť sa
            </a>
          </motion.div>
        )}

        {verificationStatus.status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <p className="text-gray-600 mb-4">
              {verificationStatus.error}
            </p>
            <div className="space-y-3">
              <a
                href="/register"
                className="inline-block bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors mr-3"
              >
                Registrovať sa znovu
              </a>
              <a
                href="/"
                className="inline-block bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                Späť na hlavnú stránku
              </a>
            </div>
          </motion.div>
        )}

        {verificationStatus.status === 'loading' && (
          <motion.p
            className="text-gray-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            Prosím počkajte, overujem váš email...
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítavam...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
