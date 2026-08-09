'use client';

/**
 * Composer voľného príspevku (Fáza 4.3).
 *
 * Dvojkrokovosť uploadu je pred používateľom SCHOVANÁ: backend vyžaduje, aby
 * príspevok existoval skôr, než sa naň dá naviazať fotka (S3 kľúč obsahuje
 * post_id), takže „Zdieľať" spustí sekvenciu create → upload → refetch a drží
 * loading stav, kým celá nedobehne. Používateľ klikne raz.
 *
 * Keď zlyhá až upload, príspevok už existuje – nemažeme ho (appka nemá delete
 * endpoint a text je platný obsah), ale povieme to samostatným varovaním, nech
 * to nevyzerá, že sa nestalo nič.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedDialog } from './useFeedDialog';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { GroupUserPicker } from '../messages/GroupUserPicker';
import type { GroupMemberCandidate } from '../messages/types';
import { useEmojiInsertion } from './useEmojiInsertion';
import { createFeedPost, getFeedPost, type FeedPost } from '@/lib/feedApi';
import {
  FEED_IMAGE_ACCEPT,
  FEED_IMAGE_MAX_BYTES,
  FEED_IMAGE_MAX_MB,
  uploadFeedPostImage,
} from '@/lib/feedImageUpload';

const CAPTION_MAX_LENGTH = 500;
/** Zhodné s MAX_FEED_POST_TAGS na backende – limit validuje aj BE. */
const MAX_FEED_POST_TAGS = 10;

type FeedPostComposerModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (created: FeedPost) => void;
};

export default function FeedPostComposerModal({
  open,
  onClose,
  onCreated,
}: FeedPostComposerModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<GroupMemberCandidate[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Rozlišuje text na tlačidle: vytváranie vs. nahrávanie fotky. Používateľ
  // tak vidí, že sa niečo deje, aj keď upload trvá dlhšie než samotný zápis.
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { textareaRef, insertEmoji } = useEmojiInsertion(caption, setCaption);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setCaption('');
    setTaggedUsers([]);
    setFile(null);
    setPreviewUrl(null);
    setUploadingImage(false);
  }, [open]);

  // Náhľad cez object URL – vždy uvoľniť, inak Blob visí v pamäti do reloadu.
  useEffect(() => {
    if (!file || typeof URL.createObjectURL !== 'function') {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const dialogRef = useFeedDialog({ open, onClose, canClose: !submitting });

  if (!open || !mounted || typeof document === 'undefined') return null;

  const trimmed = caption.trim();
  const tooLong = caption.length > CAPTION_MAX_LENGTH;
  // Presne BE validácia pre free_post: text je povinný, fotka nie.
  const canSubmit = Boolean(trimmed) && !tooLong && !submitting;

  const handlePickFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    // Reset hodnoty: bez neho by sa výber TOHO ISTÉHO súboru po odstránení
    // nespustil znova (change sa nevystrelí, keď sa hodnota nezmení).
    event.target.value = '';
    if (!selected) return;
    if (selected.size > FEED_IMAGE_MAX_BYTES) {
      toast.error(
        t('feed.composerImageTooLarge', 'Fotka je príliš veľká. Maximum je {max} MB.')
          .replace('{max}', () => String(FEED_IMAGE_MAX_MB)),
      );
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    let created: FeedPost | null = null;
    try {
      created = await createFeedPost({
        caption: trimmed,
        taggedUserIds: taggedUsers.map((user) => user.id),
      });
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('feed.composerError', 'Príspevok sa nepodarilo vytvoriť.');
      toast.error(message);
      setSubmitting(false);
      return;
    }

    // Fotka je voliteľná – bez nej je hotovo hneď.
    let result = created;
    if (file) {
      setUploadingImage(true);
      try {
        await uploadFeedPostImage(created.id, file);
        // Načítaj príspevok znova, nech karta rovno ukáže stav spracovania
        // fotky. Zlyhanie refetchu nie je dôvod na chybu – text už existuje.
        try {
          result = await getFeedPost(created.id);
        } catch {
          result = created;
        }
      } catch (err) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ||
          t(
            'feed.composerImageError',
            'Príspevok bol uverejnený, ale fotku sa nepodarilo nahrať.',
          );
        toast.error(message);
      } finally {
        setUploadingImage(false);
      }
    }

    toast.success(t('feed.composerSuccess', 'Príspevok bol uverejnený.'));
    onCreated?.(result);
    setSubmitting(false);
    onClose();
  };

  const submitLabel = uploadingImage
    ? t('feed.composerUploading', 'Nahrávam fotku...')
    : submitting
      ? t('common.sending', 'Odosielam...')
      : t('feed.composerSubmit', 'Zdieľať');

  return createPortal(
    // Mobil = spodný panel (items-end, rounded-t), desktop = centrovaný modal.
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-composer-title"
      data-testid="feed-composer-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="feed-composer-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {t('feed.composerTitle', 'Nový príspevok')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label={t('common.close', 'Zavrieť')}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={4}
            disabled={submitting}
            placeholder={t('feed.composerPlaceholder', 'Napíš niečo...')}
            aria-label={t('feed.composerPlaceholder', 'Napíš niečo...')}
            className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            <DesktopEmojiPickerButton
              ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
              disabled={submitting}
              onSelect={insertEmoji}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
            />
            <span
              data-testid="feed-composer-counter"
              className={`text-xs tabular-nums ${
                tooLong
                  ? 'font-semibold text-red-600 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {caption.length}/{CAPTION_MAX_LENGTH}
            </span>
          </div>

          {/* Fotka – jedna na príspevok (backendový limit), takže po výbere
              sa ponuka „pridať" mení na náhľad s výmenou/odstránením. */}
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={FEED_IMAGE_ACCEPT}
              onChange={handlePickFile}
              className="hidden"
              data-testid="feed-composer-file-input"
            />
            {file ? (
              <div
                data-testid="feed-composer-image-preview"
                className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={t('feed.composerImageAlt', 'Náhľad vybranej fotky')}
                    className="max-h-56 w-full object-cover"
                  />
                ) : null}
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {file.name}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50 dark:text-purple-300 dark:hover:bg-purple-900/30"
                    >
                      {t('feed.composerImageReplace', 'Vymeniť')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      disabled={submitting}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {t('feed.composerImageRemove', 'Odstrániť')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                data-testid="feed-composer-add-image"
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-purple-400 hover:text-purple-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-purple-500 dark:hover:text-purple-300"
              >
                <PhotoIcon className="h-4 w-4" />
                {t('feed.composerAddImage', 'Pridať fotku')}
              </button>
            )}
          </div>

          <div className="mt-3" data-testid="feed-composer-tag-picker">
            <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('feed.shareTagPeople', 'Označiť ľudí')}{' '}
              <span className="font-normal text-gray-400 dark:text-gray-500">
                ({t('common.optional', 'nepovinné')})
              </span>
            </p>
            <GroupUserPicker
              selectedUsers={taggedUsers}
              maxSelected={MAX_FEED_POST_TAGS}
              disabled={submitting}
              placeholder={t('feed.shareTagPlaceholder', 'Hľadať používateľov...')}
              onSelectedUsersChange={setTaggedUsers}
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              data-testid="feed-composer-submit"
              className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
