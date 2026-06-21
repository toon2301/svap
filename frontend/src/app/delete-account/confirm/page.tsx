'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, endpoints } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';

type Status = 'idle' | 'loading' | 'success' | 'error';

function ConfirmDeletionContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? null;

  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirm = async () => {
    if (status === 'loading' || status === 'success') return; // dvojklik / opakovanie
    if (!token) {
      setStatus('error');
      setErrorMessage(
        t('deleteConfirm.missingToken', 'Odkaz je neplatný – chýba token.'),
      );
      return;
    }
    setStatus('loading');
    try {
      await api.post(endpoints.auth.confirmAccountDeletion, { token });
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMessage(
        t(
          'deleteConfirm.invalidToken',
          'Odkaz je neplatný, expirovaný alebo už bol použitý.',
        ),
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0e0e0f] border border-gray-200 dark:border-gray-800 shadow-sm p-8 text-center">
        {status === 'success' ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {t('deleteConfirm.successTitle', 'Účet bol zmazaný')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {t(
                'deleteConfirm.successBody',
                'Tvoj účet bol natrvalo zmazaný a osobné údaje anonymizované. Ďakujeme, že si používal Svaply.',
              )}
            </p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
            >
              {t('deleteConfirm.backHome', 'Späť na úvod')}
            </Link>
          </>
        ) : status === 'error' ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {t('deleteConfirm.errorTitle', 'Odkaz sa nepodarilo použiť')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{errorMessage}</p>
            <Link
              href="/"
              className="inline-block rounded-lg bg-gray-200 dark:bg-gray-800 px-5 py-2.5 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-700"
            >
              {t('deleteConfirm.backHome', 'Späť na úvod')}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-3">
              {t('deleteConfirm.title', 'Potvrdenie zmazania účtu')}
            </h1>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-6">
              {t(
                'deleteConfirm.body',
                'Toto je NEZVRATNÁ akcia. Tvoj profil bude anonymizovaný a tvoje ponuky, portfólio aj hodnotenia odstránené. Pre dokončenie klikni na tlačidlo nižšie.',
              )}
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={status === 'loading'}
              className="w-full rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === 'loading'
                ? t('deleteConfirm.deleting', 'Mažem…')
                : t('deleteConfirm.confirmButton', 'Áno, natrvalo zmazať účet')}
            </button>
            <Link
              href="/"
              className="mt-4 inline-block text-sm text-gray-500 dark:text-gray-400 hover:underline"
            >
              {t('deleteConfirm.cancel', 'Zrušiť')}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function ConfirmDeletionPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmDeletionContent />
    </Suspense>
  );
}
