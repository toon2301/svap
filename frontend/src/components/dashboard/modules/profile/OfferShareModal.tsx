'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  PaperAirplaneIcon,
  QrCodeIcon,
  RectangleGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { GroupUserPicker } from '../messages/GroupUserPicker';
import {
  getMessagingErrorMessage,
  sendOfferShare,
} from '../messages/messagingApi';
import {
  requestConversationsRefresh,
  suppressPassiveMessagingRefresh,
} from '../messages/messagesEvents';
import type { GroupMemberCandidate } from '../messages/types';

const OFFER_SHARE_PASSIVE_REFRESH_SUPPRESSION_MS = 12_000;

type OfferSharePreview = {
  id: number;
  title: string;
  imageUrl?: string | null;
  location?: string | null;
};

type OfferShareModalProps = {
  open: boolean;
  onClose: () => void;
  offerUrl: string;
  offer: OfferSharePreview;
};

function sanitizeDownloadName(value: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  return normalized || 'offer';
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

export function OfferShareModal({
  open,
  onClose,
  offerUrl,
  offer,
}: OfferShareModalProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'share' | 'message'>('share');
  const [selectedRecipients, setSelectedRecipients] = useState<GroupMemberCandidate[]>([]);
  const [isSubmittingOfferShare, setIsSubmittingOfferShare] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  const encodedOfferUrl = encodeURIComponent(offerUrl);
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim();
  const emailSubject = encodeURIComponent(t('profile.offerShareEmailSubject', 'Svaply offer'));
  const emailBody = encodeURIComponent(
    `${t('profile.offerShareEmailBody', 'Take a look at this offer:')} ${offerUrl}`,
  );
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedOfferUrl}`;
  const messengerShareUrl = facebookAppId
    ? `https://www.facebook.com/dialog/send?app_id=${encodeURIComponent(facebookAppId)}&link=${encodedOfferUrl}&redirect_uri=${encodedOfferUrl}`
    : `fb-messenger://share?link=${encodedOfferUrl}`;
  const emailShareUrl = `mailto:?subject=${emailSubject}&body=${emailBody}`;

  const qrFileName = useMemo(
    () => `svaply-offer-${sanitizeDownloadName(offer.title)}.png`,
    [offer.title],
  );

  useEffect(() => {
    if (!open || !offerUrl) return;

    let active = true;
    setQrDataUrl(null);
    setQrError(false);

    QRCode.toDataURL(offerUrl, {
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
  }, [open, offerUrl]);

  useEffect(() => {
    if (open) return;
    setMode('share');
    setSelectedRecipients([]);
  }, [open]);

  const handleClose = () => {
    if (isSubmittingOfferShare) return;
    setMode('share');
    setSelectedRecipients([]);
    onClose();
  };

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(offerUrl);
      toast.success(t('profile.offerLinkCopied', 'Offer link copied.'));
    } catch {
      toast.error(t('profile.offerLinkCopyFailed', 'Could not copy the offer link.'));
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

  const handleSendOfferShare = async (event: FormEvent) => {
    event.preventDefault();
    if (selectedRecipients.length === 0) {
      toast.error(t('profile.offerShareRecipientsRequired', 'Select at least one recipient.'));
      return;
    }

    setIsSubmittingOfferShare(true);
    try {
      const result = await sendOfferShare(
        offer.id,
        selectedRecipients.map((recipient) => recipient.id),
      );
      if (result.sent.length === 0) {
        toast.error(t('profile.offerShareFailed', 'Could not send the offer.'));
        return;
      }

      setSelectedRecipients([]);
      setMode('share');
      suppressPassiveMessagingRefresh(OFFER_SHARE_PASSIVE_REFRESH_SUPPRESSION_MS);
      requestConversationsRefresh();
      onClose();
      toast.success(
        result.failed.length > 0
          ? t('profile.offerSharePartialSuccess', 'Offer was sent to some recipients.')
          : t('profile.offerShareSuccess', 'Offer was sent.'),
      );
    } catch (error) {
      toast.error(
        getMessagingErrorMessage(error, {
          fallback: t('profile.offerShareFailed', 'Could not send the offer.'),
          rateLimitFallback: t(
            'messages.sendRateLimited',
            'You are sending too fast. Please wait a moment.',
          ),
          unavailableFallback: t(
            'profile.offerShareUnavailable',
            'This offer is no longer available.',
          ),
        }),
      );
    } finally {
      setIsSubmittingOfferShare(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const isMessageMode = mode === 'message';

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-share-modal-title"
      onClick={handleClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10] sm:max-h-[85vh] sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            {isMessageMode ? (
              <button
                type="button"
                onClick={() => setMode('share')}
                disabled={isSubmittingOfferShare}
                className="mt-0.5 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                aria-label={t('common.back', 'Back')}
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h2 id="offer-share-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                {isMessageMode
                  ? t('profile.offerShareSelectTitle', 'Send offer in a message')
                  : t('profile.shareOfferTitle', 'Share offer')}
              </h2>
              <p className="mt-1 break-all text-sm text-gray-500 dark:text-gray-400">
                {isMessageMode
                  ? t('profile.offerShareSelectHint', 'Select one or more recipients.')
                  : offerUrl}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmittingOfferShare}
            className="ml-3 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label={t('common.close', 'Close')}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {isMessageMode ? (
          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={handleSendOfferShare}
          >
            <div className="subtle-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
              <div className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-black">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-200 dark:bg-gray-800">
                  {offer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {t('messages.offerShareCardTitle', 'Shared offer')}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('messages.offerShareCardTitle', 'Shared offer')}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {offer.title}
                  </div>
                  {offer.location ? (
                    <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {offer.location}
                    </div>
                  ) : null}
                </div>
              </div>
              <GroupUserPicker
                selectedUsers={selectedRecipients}
                onSelectedUsersChange={setSelectedRecipients}
                maxSelected={20}
                disabled={isSubmittingOfferShare}
                placeholder={t(
                  'profile.offerShareRecipientsSearchPlaceholder',
                  'Search recipients...',
                )}
              />
            </div>
            <div className="flex shrink-0 gap-2 border-t border-gray-200 p-4 dark:border-gray-800 sm:p-5">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmittingOfferShare}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingOfferShare || selectedRecipients.length === 0}
                className="flex-1 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmittingOfferShare
                  ? t('common.sending', 'Sending...')
                  : t('profile.offerShareSend', 'Send')}
              </button>
            </div>
          </form>
        ) : (
          <div className="subtle-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
            <div className="grid gap-2">
              <button
                type="button"
                disabled
                className="flex cursor-not-allowed items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-500 opacity-75 dark:border-gray-800 dark:text-gray-400"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  <RectangleGroupIcon className="h-5 w-5" />
                </span>
                {t('profile.shareToBoard', 'Share to board')}
              </button>

              <button
                type="button"
                onClick={() => setMode('message')}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  <PaperAirplaneIcon className="h-5 w-5" />
                </span>
                {t('profile.shareInMessage', 'Send in message')}
              </button>

              <a
                href={facebookShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-base font-bold text-white">
                  f
                </span>
                {t('profile.shareFacebook', 'Share on Facebook')}
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
                {t('profile.shareMessenger', 'Share via Messenger')}
              </a>

              <a
                href={emailShareUrl}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  <EnvelopeIcon className="h-5 w-5" />
                </span>
                {t('profile.shareEmail', 'Share by email')}
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-gray-900"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  <ClipboardDocumentIcon className="h-5 w-5" />
                </span>
                {t('profile.copyOfferLink', 'Copy offer link')}
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-black">
              <div className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                <QrCodeIcon className="h-5 w-5" />
                {t('profile.shareQrCode', 'QR code')}
              </div>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt={t('profile.offerQrCodeAlt', 'Offer QR code')}
                  className="mx-auto h-56 w-56 rounded-xl bg-white p-3"
                />
              ) : (
                <div className="mx-auto flex h-56 w-56 items-center justify-center rounded-xl bg-white p-4 text-sm text-gray-500">
                  {qrError
                    ? t('profile.qrCodeError', 'Could not prepare the QR code.')
                    : t('profile.qrCodeLoading', 'Preparing QR code...')}
                </div>
              )}
              <button
                type="button"
                onClick={handleQrDownload}
                disabled={!qrDataUrl}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-100 px-4 py-2 text-sm font-medium text-purple-800 transition-colors hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-purple-900/30 dark:text-purple-200 dark:hover:bg-purple-900/50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {t('profile.downloadOfferQrCode', 'Download offer QR code')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
