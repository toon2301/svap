'use client';

/**
 * Telo composera voľného príspevku – polia, fotky, tagovanie, odoslanie.
 *
 * Vyčlenené z `FeedPostComposerModal`, lebo ten istý obsah teraz nesú DVA
 * obaly: centrovaný modal na desktope a celoobrazovková routa na mobile
 * (vzor `PortfolioCreateScreen`). Mení sa iba obal – logika žije tu, aby sa
 * nemohli rozísť.
 *
 * Dvojkrokovosť uploadu je pred používateľom SCHOVANÁ: backend vyžaduje, aby
 * príspevok existoval skôr, než sa naň dá naviazať fotka (S3 kľúč obsahuje
 * post_id), takže „Zdieľať" spustí sekvenciu create → upload → refetch a drží
 * loading stav, kým celá nedobehne. Používateľ klikne raz.
 *
 * Keď zlyhá až upload, príspevok už existuje – nemažeme ho automaticky (text
 * je platný obsah a autor ho vie zmazať sám), ale povieme to samostatným
 * varovaním. Pri viacerých fotkách varovanie MENUJE tie, ktoré neprešli.
 */

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { GroupUserPicker } from '../messages/GroupUserPicker';
import type { GroupMemberCandidate } from '../messages/types';
import { useEmojiInsertion } from './useEmojiInsertion';
import { imagePickError, pickFeedImages } from './pickFeedImages';
import { createFeedPost, getFeedPost, type FeedPost } from '@/lib/feedApi';
import {
  FEED_IMAGE_ACCEPT,
  MAX_FEED_POST_IMAGES,
  uploadFeedPostImages,
} from '@/lib/feedImageUpload';

export const CAPTION_MAX_LENGTH = 500;
/** Zhodné s MAX_FEED_POST_TAGS na backende – limit validuje aj BE. */
const MAX_FEED_POST_TAGS = 10;

type FeedPostComposerFormProps = {
  onClose: () => void;
  onCreated?: (created: FeedPost) => void;
  /** Modal si kreslí hlavičku sem; celoobrazovková routa má vlastnú. */
  showHeading?: boolean;
  /** Obal podľa toho blokuje zatvorenie počas odosielania. */
  onSubmittingChange?: (submitting: boolean) => void;
};

export default function FeedPostComposerForm({
  onClose,
  onCreated,
  showHeading = false,
  onSubmittingChange,
}: FeedPostComposerFormProps) {
  const { t } = useLanguage();
  // Mobil má emoji priamo na systémovej klávesnici – appkové
  // tlačidlo je tam duplicitné, tak ho tam nekreslíme.
  const isMobile = useIsMobile();
  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<GroupMemberCandidate[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Rozlišuje text na tlačidle: vytváranie vs. nahrávanie fotiek, a pri
  // viacerých ukazuje priebeh („nahrávam 2 z 4").
  const [uploadProgress, setUploadProgress] = useState<
    { current: number; total: number } | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Cez ref, aby zmena identity callbacku nereštartovala efekt.
  const onSubmittingChangeRef = useRef(onSubmittingChange);
  onSubmittingChangeRef.current = onSubmittingChange;
  const { textareaRef, insertEmoji } = useEmojiInsertion(caption, setCaption);

  // Reset stavu netreba: obal renderuje formulár až keď je otvorený, takže
  // každé otvorenie je nový mount.
  // Náhľady cez object URL – vždy uvoľniť, inak Blob visí v pamäti do reloadu.
  useEffect(() => {
    if (!files.length || typeof URL.createObjectURL !== 'function') {
      setPreviewUrls([]);
      return;
    }
    const urls = files.map((item) => URL.createObjectURL(item));
    setPreviewUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  // Obal potrebuje vedieť, či beží odosielanie (nesmie sa dať zavrieť).
  useEffect(() => {
    onSubmittingChangeRef.current?.(submitting);
  }, [submitting]);

  const trimmed = caption.trim();
  const tooLong = caption.length > CAPTION_MAX_LENGTH;
  // Presne BE validácia pre free_post: text ALEBO aspoň jedna fotka.
  // Prázdny príspevok (ani text, ani fotka) sa odoslať nedá.
  const hasContent = Boolean(trimmed) || files.length > 0;
  const canSubmit = hasContent && !tooLong && !submitting;

  const remainingSlots = MAX_FEED_POST_IMAGES - files.length;

  const handlePickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    // Reset hodnoty: bez neho by sa výber TÝCH ISTÝCH súborov po odobratí
    // nespustil znova (change sa nevystrelí, keď sa hodnota nezmení).
    event.target.value = '';
    if (!selected.length) return;

    const { accepted, rejected, overLimit } = pickFeedImages(
      selected,
      remainingSlots,
    );
    rejected.forEach(({ reason }) => toast.error(imagePickError(t, reason)));
    // Limit sa vynucuje priebežne: nadbytočné sa zahodia a povie sa to.
    if (overLimit) {
      toast.error(
        t('feed.composerImagesLimit', 'Príspevok môže mať najviac {max} fotiek.')
          .replace('{max}', String(MAX_FEED_POST_IMAGES)),
      );
    }
    setFiles((current) => [...current, ...accepted].slice(0, MAX_FEED_POST_IMAGES));
  };

  const handleRemoveFile = (index: number) => {
    setFiles((current) => current.filter((_, position) => position !== index));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    let created: FeedPost | null = null;
    try {
      created = await createFeedPost({
        caption: trimmed,
        taggedUserIds: taggedUsers.map((user) => user.id),
        // Fotka pri vytváraní ešte neexistuje (S3 kľúč potrebuje post_id),
        // takže backendu posielame ZÁMER – bez neho by príspevok bez textu
        // odmietol ako prázdny.
        willAttachPhoto: files.length > 0,
      });
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('feed.composerError', 'Príspevok sa nepodarilo vytvoriť.');
      toast.error(message);
      setSubmitting(false);
      return;
    }

    // Fotky sú voliteľné – bez nich je hotovo hneď.
    let result = created;
    let imageFailed = false;
    if (files.length) {
      try {
        // Postupne, nie paralelne – priebeh sa dá hlásiť a chyba priradiť
        // ku konkrétnemu súboru.
        const failures = await uploadFeedPostImages(
          created.id,
          files,
          (current, total) => setUploadProgress({ current, total }),
        );
        if (failures.length) {
          imageFailed = true;
          // Menovite, nie generické „niečo zlyhalo" – používateľ inak nevie,
          // ktorú fotku má skúsiť znova.
          toast.error(
            t(
              'feed.composerImagesError',
              'Príspevok bol uverejnený, ale tieto fotky sa nepodarilo nahrať: {names}',
            ).replace(
              '{names}',
              failures.map((failure) => failure.file.name).join(', '),
            ),
          );
        }
        // Načítaj príspevok znova, nech karta rovno ukáže stav spracovania
        // fotiek. Zlyhanie refetchu nie je dôvod na chybu – text už existuje.
        try {
          result = await getFeedPost(created.id);
        } catch {
          result = created;
        }
      } finally {
        setUploadProgress(null);
      }
    }

    // Úspech hlásime len keď naozaj prešlo VŠETKO – pri zlyhanom uploade už
    // odišiel vysvetľujúci error toast a dva protichodné hlášky vedľa seba
    // by len mýlili.
    if (!imageFailed) {
      toast.success(t('feed.composerSuccess', 'Príspevok bol uverejnený.'));
    }
    onCreated?.(result);
    setSubmitting(false);
    onClose();
  };

  const submitLabel = uploadProgress
    ? t('feed.composerUploadingProgress', 'Nahrávam fotku {current} z {total}...')
        .replace('{current}', String(uploadProgress.current))
        .replace('{total}', String(uploadProgress.total))
    : submitting
      ? t('common.sending', 'Odosielam...')
      : t('feed.composerSubmit', 'Zdieľať');

  return (
    <>
      {showHeading ? (
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
      ) : null}

          <textarea
            ref={textareaRef}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={4}
            disabled={submitting}
            placeholder={t('feed.composerPlaceholder', 'Napíš niečo...')}
            aria-label={t('feed.composerPlaceholder', 'Napíš niečo...')}
            className="w-full resize-y subtle-scrollbar rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            {isMobile ? null : (
              <DesktopEmojiPickerButton
                ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
                disabled={submitting}
                onSelect={insertEmoji}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
              />
            )}
            <span
              data-testid="feed-composer-counter"
              // `ml-auto`: na mobile emoji tlačidlo nie je, takže bez neho by
              // počítadlo skočilo doľava. Na desktope je bez účinku.
              className={`ml-auto text-xs tabular-nums ${
                tooLong
                  ? 'font-semibold text-red-600 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {caption.length}/{CAPTION_MAX_LENGTH}
            </span>
          </div>

          {/* Fotky – až MAX_FEED_POST_IMAGES. Tlačidlo „pridať" ostáva
              dostupné, kým sú voľné miesta, a hlási, koľko ich ešte je. */}
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FEED_IMAGE_ACCEPT}
              onChange={handlePickFiles}
              className="hidden"
              data-testid="feed-composer-file-input"
            />

            {files.length ? (
              <ul
                data-testid="feed-composer-image-previews"
                className="mb-2 grid grid-cols-3 gap-2"
              >
                {files.map((item, index) => (
                  <li
                    key={`${item.name}-${index}`}
                    data-testid="feed-composer-image-preview"
                    className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    {previewUrls[index] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrls[index]}
                        alt={t('feed.composerImageAlt', 'Náhľad vybranej fotky')}
                        className="h-24 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <PhotoIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      disabled={submitting}
                      aria-label={t('feed.composerImageRemove', 'Odstrániť')
                        .concat(': ', item.name)}
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white transition-colors hover:bg-black/75 disabled:opacity-50"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                    <span className="block truncate px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {remainingSlots > 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
                data-testid="feed-composer-add-image"
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-purple-400 hover:text-purple-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-purple-500 dark:hover:text-purple-300"
              >
                <PhotoIcon className="h-4 w-4" />
                {t('feed.composerAddImages', 'Pridať fotky')}
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                  {t('feed.composerImagesRemaining', 'ešte {n}').replace(
                    '{n}',
                    String(remainingSlots),
                  )}
                </span>
              </button>
            ) : (
              <p
                data-testid="feed-composer-images-full"
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {t('feed.composerImagesLimit', 'Príspevok môže mať najviac {max} fotiek.')
                  .replace('{max}', String(MAX_FEED_POST_IMAGES))}
              </p>
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
    </>
  );
}
