'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import type { User } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { api, endpoints } from '@/lib/api';
import {
  VERIFY_EMAIL_RESEND_COOLDOWN_MS,
  VERIFY_EMAIL_SENT_TTL_MS,
  clearVerifyEmailSent,
  loadVerifyEmailSentAt,
  saveVerifyEmailSentAt,
} from './verifyEmailSentPersistence';

interface VerifyEmailSectionProps {
  user: User;
  variant?: 'brand' | 'neutral';
  hideTitle?: boolean;
}

/**
 * "Overiť email" sekcia v edit profile – pre KAŽDÉHO používateľa s neovereným
 * emailom (Google OAuth aj ručná registrácia, ktorá ešte neklikla na link).
 * Volá existujúci resend-verification endpoint (backend je zdroj pravdy:
 * already-verified guard + rate limit 3×/hod).
 *
 * Stav „email odoslaný" je perzistovaný v localStorage (per user, TTL 10 min),
 * takže prežije navigáciu preč/späť aj refresh. Tlačidlo „Odoslať znova" je
 * počas cooldownu (60 s) zablokované s countdownom.
 */
export default function VerifyEmailSection({
  user,
  variant = 'brand',
  hideTitle = false,
}: VerifyEmailSectionProps) {
  const { t } = useLanguage();
  const isNeutral = variant === 'neutral';
  const userId = typeof user.id === 'number' ? user.id : null;
  const isVerified = Boolean(user.is_verified);

  const [sentAt, setSentAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());
  const submittingRef = useRef(false);

  // Načítaj perzistovaný stav (alebo vyčisti pri už overenom účte).
  useEffect(() => {
    if (isVerified) {
      clearVerifyEmailSent(userId);
      setSentAt(null);
      return;
    }
    setSentAt(loadVerifyEmailSentAt(userId));
  }, [isVerified, userId]);

  // Countdown ticker – beží len počas cooldownu (≤60 s), potom sa sám zastaví.
  useEffect(() => {
    if (sentAt == null) return;
    if (Date.now() - sentAt >= VERIFY_EMAIL_RESEND_COOLDOWN_MS) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      if (Date.now() - sentAt >= VERIFY_EMAIL_RESEND_COOLDOWN_MS) {
        window.clearInterval(id);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [sentAt]);

  // TTL: po 10 min sa stav „odoslaný" sám zruší → späť na pôvodné tlačidlo.
  useEffect(() => {
    if (sentAt == null) return;
    const remaining = VERIFY_EMAIL_SENT_TTL_MS - (Date.now() - sentAt);
    if (remaining <= 0) {
      clearVerifyEmailSent(userId);
      setSentAt(null);
      return;
    }
    const id = window.setTimeout(() => {
      clearVerifyEmailSent(userId);
      setSentAt(null);
    }, remaining);
    return () => window.clearTimeout(id);
  }, [sentAt, userId]);

  const handleSend = useCallback(async () => {
    if (submittingRef.current) return; // ochrana proti dvojkliku
    submittingRef.current = true;
    setSubmitting(true);
    try {
      await api.post(endpoints.auth.resendVerification, { email: user.email });
      const ts = Date.now();
      saveVerifyEmailSentAt(userId, ts);
      setSentAt(ts);
      setNow(ts);
    } catch {
      toast.error(
        t(
          'profile.verifyEmailError',
          'Verifikačný email sa nepodarilo odoslať. Skúste to znova.',
        ),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [t, user.email, userId]);

  if (isVerified) return null;

  const cooldownRemainingMs = sentAt == null ? 0 : VERIFY_EMAIL_RESEND_COOLDOWN_MS - (now - sentAt);
  const cooldownSeconds = Math.max(0, Math.ceil(cooldownRemainingMs / 1000));
  const inCooldown = cooldownSeconds > 0;
  const emailSent = sentAt != null;

  const sectionClassName = isNeutral
    ? 'w-full mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-[#101011]'
    : 'w-full mt-4 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/20 p-4';
  const iconClassName = isNeutral
    ? 'w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5'
    : 'w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5';
  const titleClassName = isNeutral
    ? 'font-semibold text-sm text-gray-900 dark:text-white mb-1'
    : 'font-semibold text-sm text-purple-700 dark:text-purple-300 mb-1';
  const sentIconClassName = isNeutral
    ? 'w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0'
    : 'w-4 h-4 text-green-600 dark:text-green-400 shrink-0';
  const secondaryButtonClassName = isNeutral
    ? 'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 disabled:hover:bg-transparent dark:border-gray-700 dark:text-gray-100 dark:hover:bg-[#151517] dark:focus:ring-gray-700'
    : 'inline-flex items-center gap-2 rounded-lg border border-purple-300 dark:border-purple-800 px-4 py-2 text-sm font-semibold text-purple-700 dark:text-purple-300 transition hover:bg-purple-100 dark:hover:bg-purple-900/30 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-60 disabled:hover:bg-transparent';
  const primaryButtonClassName = isNeutral
    ? 'inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-60 dark:border-gray-700 dark:bg-[#151517] dark:text-gray-100 dark:hover:bg-[#1d1d20] dark:focus:ring-gray-700'
    : 'inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-60';

  return (
    <div
      data-testid="verify-email-section"
      className={sectionClassName}
    >
      <div className="flex items-start gap-3">
        <EnvelopeIcon className={iconClassName} />
        <div className="flex-1 text-left">
          {!hideTitle && (
            <h3 className={titleClassName}>
              {t('profile.verifyEmailTitle', 'Over svoj email')}
            </h3>
          )}
          {emailSent ? (
            <>
              <p
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-3"
                data-testid="verify-email-sent"
              >
                <CheckCircleIcon className={sentIconClassName} />
                {t(
                  'profile.verifyEmailSent',
                  'Skontroluj svoj email a klikni na verifikačný odkaz.',
                )}
              </p>
              <button
                type="button"
                onClick={handleSend}
                disabled={inCooldown || submitting}
                data-testid="verify-email-resend"
                className={secondaryButtonClassName}
              >
                {inCooldown
                  ? t('profile.verifyEmailResendIn', 'Odoslať znova za {seconds} s').replace(
                      '{seconds}',
                      String(cooldownSeconds),
                    )
                  : t('profile.verifyEmailResend', 'Odoslať znova')}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t(
                  'profile.verifyEmailDescription',
                  'Overením emailu získaš verifikačný odznak pri svojom profile.',
                )}
              </p>
              <button
                type="button"
                onClick={handleSend}
                disabled={submitting}
                className={primaryButtonClassName}
              >
                {t('profile.verifyEmailButton', 'Overiť email')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
