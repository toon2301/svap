'use client';

import { useState, useCallback } from 'react';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { useErrorHandler } from './useErrorHandler';
import { useLoading } from '@/contexts/LoadingContext';

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  error?: string;
  code?: string;
}

interface UseApiReturn {
  data: any;
  loading: boolean;
  error: string | null;
  execute: (config: AxiosRequestConfig) => Promise<any>;
  get: (url: string, config?: AxiosRequestConfig) => Promise<any>;
  post: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<any>;
  put: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<any>;
  patch: (url: string, data?: any, config?: AxiosRequestConfig) => Promise<any>;
  delete: (url: string, config?: AxiosRequestConfig) => Promise<any>;
  reset: () => void;
}

export function useApi(): UseApiReturn {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { handleError } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();

  const execute = useCallback(async (config: AxiosRequestConfig) => {
    setLoading(true);
    setError(null);
    startLoading('Načítavam...');

    try {
      const response: AxiosResponse<ApiResponse> = await axios({
        ...config,
        baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      });

      setData(response.data.data || response.data);
      return response.data.data || response.data;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Nastala chyba pri načítavaní';
      setError(errorMessage);
      handleError(err);
      throw err;
    } finally {
      setLoading(false);
      stopLoading();
    }
  }, [handleError, startLoading, stopLoading]);

  const get = useCallback((url: string, config?: AxiosRequestConfig) => {
    return execute({ ...config, method: 'GET', url });
  }, [execute]);

  const post = useCallback((url: string, data?: any, config?: AxiosRequestConfig) => {
    return execute({ ...config, method: 'POST', url, data });
  }, [execute]);

  const put = useCallback((url: string, data?: any, config?: AxiosRequestConfig) => {
    return execute({ ...config, method: 'PUT', url, data });
  }, [execute]);

  const patch = useCallback((url: string, data?: any, config?: AxiosRequestConfig) => {
    return execute({ ...config, method: 'PATCH', url, data });
  }, [execute]);

  const deleteMethod = useCallback((url: string, config?: AxiosRequestConfig) => {
    return execute({ ...config, method: 'DELETE', url });
  }, [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    get,
    post,
    put,
    patch,
    delete: deleteMethod,
    reset,
  };
}

// Hook pre špecifické API endpointy
export function useAuthApi() {
  const api = useApi();

  const login = useCallback((email: string, password: string) => {
    return api.post('/auth/login/', { email, password });
  }, [api]);

  const register = useCallback((userData: any) => {
    return api.post('/auth/register/', userData);
  }, [api]);

  const verifyEmail = useCallback((token: string) => {
    return api.post('/auth/verify-email/', { token });
  }, [api]);

  const refreshToken = useCallback((refreshToken: string) => {
    return api.post('/auth/refresh/', { refresh: refreshToken });
  }, [api]);

  const logout = useCallback(() => {
    return api.post('/auth/logout/');
  }, [api]);

  return {
    ...api,
    login,
    register,
    verifyEmail,
    refreshToken,
    logout,
  };
}

export function useProfileApi() {
  const api = useApi();

  const getProfile = useCallback(() => {
    return api.get('/profile/');
  }, [api]);

  const updateProfile = useCallback((profileData: any) => {
    return api.patch('/profile/', profileData);
  }, [api]);

  return {
    ...api,
    getProfile,
    updateProfile,
  };
}