'use client';

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { User } from '../../../../types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, endpoints } from '../../../../lib/api';

interface DeleteAccountSectionProps {
  user: User;
  variant?: 'danger' | 'neutral';
  hideTitle?: boolean;
}

/**
 * GDPR – "Danger zone" sekcia na zmazanie vlastného účtu.
 * - heslový účet: dialóg s poľom na heslo → DELETE /auth/account/ → odhlásenie.
 * - OAuth účet (bez hesla): dialóg s informáciou → request-deletion → "skontroluj email".
 * Backend je zdroj pravdy (overuje heslo aj typ účtu); FE iba prispôsobuje UI.
 */
export default function DeleteAccountSection({
  user,
  variant = 'danger',
  hideTitle = false,
}: DeleteAccountSectionProps) {
  const { t } = useLanguage();
  const isNeutral = variant === 'neutral';
  const { logout } = useAuth();

  // Default true → bezpečnejšie (pýta heslo); backend aj tak rozhodne.
  const hasPassword = user.has_password !== false;

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const submittingRef = useRef(false);

  const openDialog = () => {
    setPassword('');
    setError('');
    setEmailSent(false);
    setIsOpen(true);
  };

  const closeDialog = () => {
    if (submittingRef.current) return; // nezatváraj počas prebiehajúceho requestu
    setIsOpen(false);
  };

  const handleConfirm = async () => {
    if (submittingRef.current) return; // ochrana proti dvojkliku
    setError('');

    if (hasPassword && !password.trim()) {
      setError(t('deleteAccount.passwordRequired', 'Zadajte heslo.'));
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (hasPassword) {
        // POST (nie DELETE) – DELETE s telom je v prehliadači/Next-proxy nespoľahlivé.
        await api.post(endpoints.auth.deleteAccount, { password });
        // Úspech: toast prežije navigáciu (portál), logout vyčistí stav + redirect na "/".
        toast.success(t('deleteAccount.deletedToast', 'Účet bol zmazaný.'));
        submittingRef.current = false;
        logout();
      } else {
        await api.post(endpoints.auth.requestAccountDeletion, {});
        submittingRef.current = false;
        setSubmitting(false);
        setEmailSent(true);
      }
    } catch (err: unknown) {
      submittingRef.current = false;
      setSubmitting(false);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (hasPassword && status === 403) {
        setError(t('deleteAccount.wrongPassword', 'Nesprávne heslo. Skúste znova.'));
        return;
      }
      toast.error(
        t('deleteAccount.errorToast', 'Účet sa nepodarilo zmazať. Skúste to znova.'),
      );
    }
  };

  const sectionClassName = isNeutral
    ? 'w-full mt-[clamp(1rem,3vw,2rem)] rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#101011]'
    : 'w-full mt-[clamp(1rem,3vw,2rem)] rounded-lg border-2 border-red-300 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/20 p-6';
  const iconClassName = isNeutral
    ? 'w-6 h-6 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5'
    : 'w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5';
  const titleClassName = isNeutral
    ? 'font-semibold text-lg text-gray-900 dark:text-white mb-2'
    : 'font-semibold text-lg text-red-700 dark:text-red-300 mb-2';
  const actionButtonClassName = isNeutral
    ? 'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-700 dark:bg-[#151517] dark:text-gray-100 dark:hover:bg-[#1d1d20] dark:focus:ring-gray-700'
    : 'inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400';
  const actionIconClassName = isNeutral ? 'w-4 h-4 text-gray-500 dark:text-gray-400' : 'w-4 h-4';

  return (
    <>
      <div className={sectionClassName}>
        <div className="flex items-start gap-3">
          <TrashIcon className={iconClassName} />
          <div className="flex-1 text-left">
            {!hideTitle && (
              <h3 className={titleClassName}>
              {t('deleteAccount.sectionTitle', 'Zmazať účet')}
              </h3>
            )}
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400 mb-4">
              {t(
                'deleteAccount.sectionDescription',
                'Nezvratné zmazanie účtu. Tvoj profil bude anonymizovaný a tvoje ponuky, portfólio a hodnotenia budú odstránené. Konverzácie ostanú zachované pre druhú stranu.',
              )}
            </p>
            <button
              type="button"
              onClick={openDialog}
              className={actionButtonClassName}
            >
              <TrashIcon className={actionIconClassName} />
              {t('deleteAccount.button', 'Zmazať účet')}
            </button>
          </div>
        </div>
      </div>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={closeDialog}
          >
            <div
              className="w-full max-w-sm md:max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
                <div className="px-6 pt-6 pb-2 flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-7 h-7 text-red-600 dark:text-red-400 shrink-0" />
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {emailSent
                      ? t('deleteAccount.emailSentTitle', 'Skontroluj svoj email')
                      : t('deleteAccount.modalTitle', 'Naozaj chceš zmazať účet?')}
                  </h2>
                </div>

                <div className="px-6 pb-6 pt-2 space-y-4">
                  {emailSent ? (
                    <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {t(
                        'deleteAccount.emailSentBody',
                        'Poslali sme ti email s odkazom na potvrdenie zmazania účtu. Účet sa zmaže až po kliknutí na odkaz (platí 48 hodín).',
                      )}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                        {t(
                          'deleteAccount.modalWarning',
                          'Táto akcia je NEZVRATNÁ. Tvoj profil bude anonymizovaný a ponuky, portfólio aj tvoje hodnotenia budú odstránené. Konverzácie ostanú zachované pre druhú stranu.',
                        )}
                      </p>

                      {hasPassword ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('deleteAccount.passwordLabel', 'Pre potvrdenie zadaj heslo')}
                          </label>
                          <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (error) setError('');
                            }}
                            disabled={submitting}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-60"
                          />
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                          {t(
                            'deleteAccount.oauthInfo',
                            'Tvoj účet je prepojený cez Google (bez hesla). Po kliknutí na "Zmazať účet" ti pošleme email s potvrdzovacím odkazom.',
                          )}
                        </p>
                      )}

                      {error ? (
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                          {error}
                        </p>
                      ) : null}
                    </>
                  )}

                  <div className="space-y-2 pt-1">
                    {emailSent ? (
                      <button
                        onClick={closeDialog}
                        className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414] font-semibold"
                      >
                        {t('deleteAccount.close', 'Zavrieť')}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleConfirm}
                          disabled={submitting}
                          className="w-full py-3 text-base rounded-lg bg-red-600 text-white hover:bg-red-700 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {submitting
                            ? t('deleteAccount.deleting', 'Mažem…')
                            : hasPassword
                              ? t('deleteAccount.confirmButton', 'Áno, zmazať účet')
                              : t('deleteAccount.sendEmailButton', 'Zmazať účet')}
                        </button>
                        <button
                          onClick={closeDialog}
                          disabled={submitting}
                          className="w-full py-3 text-base rounded-lg bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414] disabled:opacity-60"
                        >
                          {t('deleteAccount.cancel', 'Zrušiť')}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.getElementById('app-root') ?? document.body,
        )}
    </>
  );
}
