'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false;
              }
              return failureCount < 3;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </LanguageProvider>
        <Toaster
          position="top-right"
          containerClassName="toast-modern"
          gutter={12}
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--toast-bg)',
              color: 'var(--toast-text)',
              borderRadius: '16px',
              padding: '16px 20px',
              boxShadow: 'var(--toast-shadow)',
              border: '1px solid var(--toast-border)',
              fontSize: '14px',
              fontWeight: 500,
              maxWidth: '380px',
            },
            success: {
              duration: 3000,
              style: {
                background: 'var(--toast-success-bg)',
                color: 'var(--toast-success-text)',
                border: '1px solid var(--toast-success-border)',
                borderLeft: '5px solid var(--toast-success-accent)',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: 'var(--toast-shadow)',
              },
              iconTheme: {
                primary: '#fff',
                secondary: 'var(--toast-success-accent)',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: 'var(--toast-error-bg)',
                color: 'var(--toast-error-text)',
                border: 'none',
                borderLeft: '5px solid var(--toast-error-accent)',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: 'var(--toast-shadow)',
              },
              iconTheme: {
                primary: '#fff',
                secondary: 'var(--toast-error-accent)',
              },
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
