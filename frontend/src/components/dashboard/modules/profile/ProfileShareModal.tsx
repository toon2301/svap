'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  QrCodeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

type ProfileShareModalProps = {
  open: boolean;
  onClose: () => void;
  profileUrl: string;
  displayName: string;
};

function sanitizeDownloadName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return normalized || 'profile';
}

function copyTextToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(value);
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    if (!copied) {
      throw new Error('copy failed');
    }
    return Promise.resolve();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ProfileShareModal({
  open,
  onClose,
  profileUrl,
  displayName,
}: ProfileShareModalProps) {
  const { t } = useLanguage();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  const encodedProfileUrl = encodeURIComponent(profileUrl);
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim();
  const emailSubject = encodeURIComponent(t('profile.profileShareEmailSubject', 'Profil na Svaply'));
  const emailBody = encodeURIComponent(
    `${t('profile.profileShareEmailBody', 'Pozri si tento profil:')} ${profileUrl}`,
  );
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedProfileUrl}`;
  const messengerShareUrl = facebookAppId
    ? `https://www.facebook.com/dialog/send?app_id=${encodeURIComponent(facebookAppId)}&link=${encodedProfileUrl}&redirect_uri=${encodedProfileUrl}`
    : `fb-messenger://share?link=${encodedProfileUrl}`;
  const emailShareUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  const qrFileName = useMemo(
    () => `svaply-profile-${sanitizeDownloadName(displayName)}.png`,
    [displayName],
  );

  useEffect(() => {
    if (!open || !profileUrl) return;

    let active = true;
    setQrDataUrl(null);
    setQrError(false);

    QRCode.toDataURL(profileUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 224,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (active) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (active) {
          setQrError(true);
        }
      });

    return () => {
      active = false;
    };
  }, [open, profileUrl]);

  if (!open || typeof document === 'undefined') return null;

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(profileUrl);
      toast.success(t('profile.profileLinkCopied', 'Odkaz na profil bol skopírovaný.'));
    } catch {
      toast.error(t('profile.profileLinkCopyFailed', 'Odkaz sa nepodarilo skopírovať.'));
    }
  };

  const handleQrDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = qrFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-share-modal-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10] sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800 sm:p-5">
          <div>
            <h2 id="profile-share-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('profile.shareProfileTitle', 'Zdieľať profil')}
            </h2>
            <p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">{profileUrl}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-3 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label={t('common.close', 'Zavrieť')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-2">
            <a
              href={facebookShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-base font-bold text-white">
                f
              </span>
              {t('profile.shareFacebook', 'Zdieľať na Facebooku')}
            </a>

            <a
              href={messengerShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
              </span>
              {t('profile.shareMessenger', 'Zdieľať cez Messenger')}
            </a>

            <a
              href={emailShareUrl}
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                <EnvelopeIcon className="h-5 w-5" />
              </span>
              {t('profile.shareEmail', 'Zdieľať e-mailom')}
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                <ClipboardDocumentIcon className="h-5 w-5" />
              </span>
              {t('profile.copyProfileLink', 'Skopírovať odkaz')}
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-black">
            <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <QrCodeIcon className="h-5 w-5" />
              {t('profile.shareQrCode', 'QR kód')}
            </div>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={t('profile.qrCodeAlt', 'QR kód profilu')}
                className="mx-auto h-56 w-56 rounded-xl bg-white p-3"
              />
            ) : (
              <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl bg-white p-4 text-sm text-gray-500">
                {qrError
                  ? t('profile.qrCodeError', 'QR kód sa nepodarilo pripraviť.')
                  : t('profile.qrCodeLoading', 'Pripravujem QR kód...')}
              </div>
            )}
            <button
              type="button"
              onClick={handleQrDownload}
              disabled={!qrDataUrl}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-900/30 dark:text-purple-200 dark:hover:bg-purple-900/50"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {t('profile.downloadQrCode', 'Stiahnuť QR kód')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
