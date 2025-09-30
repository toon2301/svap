'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

interface ErrorResponse {
  error?: string;
  message?: string;
  code?: string;
  details?: any;
}

interface UseErrorHandlerReturn {
  handleError: (error: any) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

export function useErrorHandler(): UseErrorHandlerReturn {
  const handleError = useCallback((error: any) => {
    console.error('Error handled by useErrorHandler:', error);
    
    let message = 'Nastala neočakávaná chyba';
    let title = 'Chyba';
    
    if (error?.response?.data) {
      const errorData: ErrorResponse = error.response.data;
      message = errorData.message || errorData.error || message;
      title = errorData.code || title;
    } else if (error?.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    // Zobraziť toast notifikáciu
    showErrorToast(message, title);
  }, []);

  const showError = useCallback((message: string, title: string = 'Chyba') => {
    showErrorToast(message, title);
  }, []);

  const showSuccess = useCallback((message: string, title: string = 'Úspech') => {
    showSuccessToast(message, title);
  }, []);

  const showWarning = useCallback((message: string, title: string = 'Upozornenie') => {
    showWarningToast(message, title);
  }, []);

  const showInfo = useCallback((message: string, title: string = 'Informácia') => {
    showInfoToast(message, title);
  }, []);

  return {
    handleError,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}

// Toast notification functions
function showErrorToast(message: string, title: string) {
  toast.error(`${title}: ${message}`);
}

function showSuccessToast(message: string, title: string) {
  toast.success(`${title}: ${message}`);
}

function showWarningToast(message: string, title: string) {
  toast(`${title}: ${message}`, {
    icon: '⚠️',
    style: {
      background: '#F59E0B',
      color: '#fff',
    },
  });
}

function showInfoToast(message: string, title: string) {
  toast(`${title}: ${message}`, {
    icon: 'ℹ️',
    style: {
      background: '#3B82F6',
      color: '#fff',
    },
  });
}