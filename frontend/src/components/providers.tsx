'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useIsMobileState } from '@/hooks/useIsMobile';

type QueryErrorWithStatus = {
  response?: {
    status?: unknown;
  };
};

function getQueryErrorStatus(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const status = (error as QueryErrorWithStatus).response?.status;
  return typeof status === 'number' ? status : null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const { isMobile, isResolved } = useIsMobileState();
  const useMobileToastLayout = isResolved && isMobile;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: (failureCount, error: unknown) => {
              const status = getQueryErrorStatus(error);
              // Don't retry client errors, except 429 where retry/backoff is expected.
              if (status != null && status >= 400 && status < 500 && status !== 429) {
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
        {mounted && createPortal(
          <Toaster
            position={useMobileToastLayout ? 'top-center' : 'top-right'}
            containerClassName="toast-modern"
            containerStyle={{
              position: 'fixed',
              top: useMobileToastLayout ? 'calc(env(safe-area-inset-top, 0px) + 12px)' : 24,
              right: useMobileToastLayout ? 12 : 24,
              left: useMobileToastLayout ? 12 : 24,
              bottom: 'auto',
              zIndex: 10050,
            }}
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
                maxWidth: useMobileToastLayout ? 'calc(100vw - 24px)' : '380px',
                width: useMobileToastLayout ? '100%' : undefined,
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
                  maxWidth: useMobileToastLayout ? 'calc(100vw - 24px)' : '380px',
                  width: useMobileToastLayout ? '100%' : undefined,
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
                  maxWidth: useMobileToastLayout ? 'calc(100vw - 24px)' : '380px',
                  width: useMobileToastLayout ? '100%' : undefined,
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: 'var(--toast-error-accent)',
                },
              },
            }}
          />,
          document.body
        )}
        {process.env.NODE_ENV === 'development' &&
          process.env.NEXT_PUBLIC_HIDE_REACT_QUERY_DEVTOOLS !== 'true' && (
            <ReactQueryDevtools initialIsOpen={false} />
          )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
