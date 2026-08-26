'use client';

/**
 * Úprava TEXTU príspevku – malý dialóg, nie composer.
 *
 * Prečo nie `FeedPostComposerForm`: ten je postavený na vytvorení príspevku a
 * väčšinu svojej hmoty venuje veciam, ktoré sa tu nemenia – výber a náhľady
 * fotiek, tagovanie, dvojkrokové odoslanie (create → upload → refetch) a
 * priebeh nahrávania. Použiť ho na úpravu textu by znamenalo tie časti
 * povypínať a cez celý formulár pretiahnuť „režim úpravy"; podmienok by
 * pribudlo viac, než koľko má tento súbor riadkov. Ostáva teda len to, čo
 * úprava naozaj potrebuje: text, emoji, počítadlo a Uložiť.
 *
 * Obal (portál, prekrytie, fokus, Escape) je zhodný s `FeedPostComposerModal`
 * vrátane `useFeedDialog`, takže sa dialógy appky správajú rovnako.
 *
 * Fotky sa menia v TOM ISTOM okne a tým istým klikom ako text: kým je modal
 * otvorený, sú zmeny len draft (`useFeedPostPhotoDraft`) a na server nejde nič.
 * „Zrušiť" draft zahodí, „Uložiť" ho premietne – najprv text a mazanie fotiek,
 * až potom upload nových, aby sa pravidlo „príspevok nesmie ostať prázdny"
 * vyhodnocovalo voči tomu medzistavu, ktorý naozaj vznikne.
 */

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { useEmojiInsertion } from './useEmojiInsertion';
import { useFeedDialog } from './useFeedDialog';
import { CAPTION_MAX_LENGTH } from './FeedPostComposerForm';
import { translateFeedActionError } from './feedActionErrors';
import { useFeedPostPhotoDraft } from './useFeedPostPhotoDraft';
import {
  deleteFeedPostImage,
  getFeedPost,
  updateFeedPost,
  type FeedPost,
} from '@/lib/feedApi';
import {
  FEED_IMAGE_ACCEPT,
  FEED_IMAGE_MAX_BYTES,
  FEED_IMAGE_MAX_MB,
  MAX_FEED_POST_IMAGES,
  isAllowedFeedImageName,
  uploadFeedPostImages,
} from '@/lib/feedImageUpload';

type FeedPostEditModalProps = {
  open: boolean;
  post: FeedPost;
  onClose: () => void;
  /** Karta si prevezme aktualizovaný príspevok – bez obnovenia feedu. */
  onUpdated?: (updated: FeedPost) => void;
};

export default function FeedPostEditModal({
  open,
  post,
  onClose,
  onUpdated,
}: FeedPostEditModalProps) {
  const { t } = useLanguage();
  // Mobil má emoji priamo na systémovej klávesnici – appkové
  // tlačidlo je tam duplicitné, tak ho tam nekreslíme.
  const isMobile = useIsMobile();
  const [caption, setCaption] = useState(post.caption ?? '');
  const [saving, setSaving] = useState(false);
  // Rozlišuje text na tlačidle: ukladanie vs. nahrávanie fotiek, a pri
  // viacerých ukazuje priebeh („nahrávam 2 z 4") – rovnako ako composer.
  const [uploadProgress, setUploadProgress] = useState<
    { current: number; total: number } | null
  >(null);
  // `images` môže v payloade chýbať (staršie/zúžené tvary odpovede), preto
  // opatrne – z chýbajúceho poľa nesmie byť pád celej karty.
  const draft = useFeedPostPhotoDraft(post.images ?? []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { textareaRef, insertEmoji } = useEmojiInsertion(caption, setCaption);
  const dialogRef = useFeedDialog({ open, onClose, canClose: !saving });

  const trimmed = caption.trim();
  const tooLong = caption.length > CAPTION_MAX_LENGTH;
  // Rovnaké pravidlo ako na backende, len vyhodnotené voči DRAFTU: rozhoduje,
  // čo na príspevku ostane PO uložení, nie čo na ňom je teraz. Zdieľanie text
  // nepotrebuje nikdy.
  const isFreePost = post.post_type === 'free_post';
  const wouldBeEmpty = isFreePost && !trimmed && draft.keptCount === 0;
  // Poslednú fotku pri prázdnom texte nejde ani OZNAČIŤ na odobratie –
  // uložením by príspevok ostal bez obsahu a backend by to aj tak odmietol.
  const removalBlocked = isFreePost && !trimmed && draft.keptCount <= 1;
  const canSave = !saving && !tooLong && !wouldBeEmpty;

  const handlePickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    // Reset hodnoty: bez neho by sa výber TÝCH ISTÝCH súborov po odobratí
    // nespustil znova (change sa nevystrelí, keď sa hodnota nezmení).
    event.target.value = '';
    if (!selected.length) return;

    const accepted: File[] = [];
    for (const candidate of selected) {
      // Formát aj veľkosť overíme TU, rovnako ako composer – inak by sa to
      // používateľ dozvedel až v polovici ukladacej sekvencie.
      if (!isAllowedFeedImageName(candidate.name)) {
        toast.error(
          t('feed.composerImageBadType', 'Tento formát fotky nie je podporovaný.'),
        );
        continue;
      }
      if (candidate.size > FEED_IMAGE_MAX_BYTES) {
        toast.error(
          t(
            'feed.composerImageTooLarge',
            'Fotka je príliš veľká. Maximum je {max} MB.',
          ).replace('{max}', String(FEED_IMAGE_MAX_MB)),
        );
        continue;
      }
      accepted.push(candidate);
    }
    if (!accepted.length) return;

    if (accepted.length > draft.remainingSlots) {
      toast.error(
        t(
          'feed.composerImagesLimit',
          'Príspevok môže mať najviac {max} fotiek.',
        ).replace('{max}', String(MAX_FEED_POST_IMAGES)),
      );
    }
    draft.addFiles(accepted.slice(0, draft.remainingSlots));
  };

  /**
   * Načíta príspevok znova a odovzdá ho karte; draft sa zladí so serverom.
   *
   * Volá sa LEN keď sa hýbalo fotkami – ich stav (nové id, URL, „spracúva sa")
   * z jednotlivých odpovedí poskladať nejde. Pri zmene samotného textu stačí
   * odpoveď PATCH-u, takže bežná textová úprava ostáva na jednej požiadavke.
   */
  const syncFromServer = async (fallback: FeedPost | null) => {
    try {
      const fresh = await getFeedPost(post.id);
      draft.reset(fresh.images ?? []);
      onUpdated?.(fresh);
    } catch {
      // Zlyhaný refetch nie je dôvod hlásiť chybu – zmeny sú uložené. Karta
      // aspoň dostane, čo o nich vieme, a zvyšok dorovná obnovenie feedu.
      if (fallback) onUpdated?.(fallback);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // (a) TEXT ako prvý. Keď zlyhá, nič ďalšie sa ani neskúsi – inak by sa
      // fotky odobrali pod textom, ktorý sa nezmenil.
      let updated: FeedPost | null = null;
      if (trimmed !== (post.caption ?? '')) {
        try {
          updated = await updateFeedPost(post.id, trimmed);
        } catch (error) {
          toast.error(
            translateFeedActionError(t, error, () =>
              t('feed.postUpdateError', 'Príspevok sa nepodarilo upraviť.'),
            ),
          );
          return;
        }
      }

      // (b) MAZANIE označených fotiek – pred uploadom, nech sa uvoľní miesto
      // v limite a nech sa pravidlo „nesmie ostať prázdne" vyhodnocuje voči
      // medzistavu, ktorý naozaj vznikne.
      let removalFailed = false;
      for (const imageId of draft.removedIds) {
        try {
          await deleteFeedPostImage(post.id, imageId);
        } catch {
          removalFailed = true;
        }
      }

      // (c) UPLOAD nových – sekvenčne, rovnaký helper aj priebeh ako composer.
      let uploadFailures: string[] = [];
      if (draft.added.length) {
        try {
          const failures = await uploadFeedPostImages(
            post.id,
            draft.added,
            (current, total) => setUploadProgress({ current, total }),
            { isEdit: true },
          );
          uploadFailures = failures.map((failure) => failure.file.name);
        } finally {
          setUploadProgress(null);
        }
      }

      // Karta dostane skutočný stav aj pri čiastočnom zlyhaní – používateľ má
      // vidieť, čo naozaj prešlo.
      if (draft.removedIds.length || draft.added.length) {
        await syncFromServer(updated);
      } else if (updated) {
        onUpdated?.(updated);
      }

      if (removalFailed) {
        toast.error(
          t('feed.editPhotosRemoveError', 'Niektoré fotky sa nepodarilo odobrať.'),
        );
      }
      if (uploadFailures.length) {
        // Menovite, nie generické „niečo zlyhalo" – používateľ inak nevie,
        // ktorú fotku má skúsiť znova.
        toast.error(
          t(
            'feed.editPhotosUploadError',
            'Tieto fotky sa nepodarilo nahrať: {names}',
          ).replace('{names}', uploadFailures.join(', ')),
        );
      }
      // Pri zlyhaní modal NEZATVÁRAME – používateľ vidí, čo ostáva, a môže to
      // skúsiť znova bez toho, aby si zmeny pamätal sám.
      if (removalFailed || uploadFailures.length) return;

      toast.success(t('feed.postUpdated', 'Príspevok bol upravený.'));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-post-edit-title"
      data-testid="feed-post-edit-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-[#0f0f10]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex-1 overflow-y-auto subtle-scrollbar p-4 sm:p-6">
          <h2
            id="feed-post-edit-title"
            className="mb-3 text-base font-semibold text-gray-900 dark:text-white"
          >
            {t('feed.editPost', 'Upraviť príspevok')}
          </h2>

          <textarea
            ref={textareaRef}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={5}
            disabled={saving}
            autoFocus
            placeholder={t('feed.captionPlaceholder', 'Čo máš na srdci?')}
            aria-label={t('feed.editPost', 'Upraviť príspevok')}
            data-testid="feed-post-edit-input"
            className="w-full resize-y subtle-scrollbar rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
          />

          {/* Fotky – draft. Označené na odobratie tu ZOSTÁVAJÚ (stlmené), nech
              je pred uložením vidieť, čo sa zmení; novo pridané čakajú na
              upload. Na server ide všetko až kliknutím na „Uložiť". */}
          <div className="mt-3">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={FEED_IMAGE_ACCEPT}
              onChange={handlePickFiles}
              className="hidden"
              data-testid="feed-post-edit-file-input"
            />

            {draft.existing.length || draft.added.length ? (
              <ul
                data-testid="feed-post-edit-photos"
                className="mb-2 grid grid-cols-3 gap-2"
              >
                {draft.existing.map((entry) => (
                  <li
                    key={`existing-${entry.image.id}`}
                    data-testid={`feed-post-edit-photo-${entry.image.id}`}
                    data-removed={entry.removed ? 'true' : 'false'}
                    className={`relative overflow-hidden rounded-xl border transition-opacity ${
                      entry.removed
                        ? 'border-red-300 opacity-40 dark:border-red-800'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {entry.image.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.image.thumbnail_url}
                        alt={t('feed.imageAlt', 'Fotka príspevku')}
                        className="h-24 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                        <PhotoIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => draft.toggleRemoved(entry.image.id)}
                      // Poslednú fotku pri prázdnom texte nejde odobrať; už
                      // označenú sa dá vrátiť späť vždy.
                      disabled={saving || (removalBlocked && !entry.removed)}
                      data-testid={`feed-post-edit-photo-remove-${entry.image.id}`}
                      aria-pressed={entry.removed}
                      aria-label={
                        entry.removed
                          ? t('feed.editPhotoKeep', 'Ponechať fotku')
                          : t('feed.editPhotoRemove', 'Odobrať fotku')
                      }
                      title={
                        removalBlocked && !entry.removed
                          ? t(
                              'feed.editPhotoRemoveBlocked',
                              'Príspevok nesmie ostať bez textu aj bez fotky.',
                            )
                          : undefined
                      }
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white transition-colors hover:bg-black/75 disabled:opacity-40"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                    {entry.removed ? (
                      <span className="block truncate bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        {t('feed.editPhotoMarkedRemoved', 'Odoberie sa')}
                      </span>
                    ) : null}
                  </li>
                ))}

                {draft.added.map((file, index) => (
                  <li
                    key={`added-${file.name}-${index}`}
                    data-testid="feed-post-edit-new-photo"
                    className="relative overflow-hidden rounded-xl border border-purple-300 dark:border-purple-800"
                  >
                    {draft.addedPreviews[index] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={draft.addedPreviews[index]}
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
                      onClick={() => draft.dropAdded(index)}
                      disabled={saving}
                      data-testid="feed-post-edit-new-photo-remove"
                      aria-label={t('feed.composerImageRemove', 'Odstrániť').concat(
                        ': ',
                        file.name,
                      )}
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white transition-colors hover:bg-black/75 disabled:opacity-50"
                    >
                      <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                    <span className="block truncate px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400">
                      {file.name}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {draft.remainingSlots > 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                data-testid="feed-post-edit-add-photo"
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-purple-400 hover:text-purple-700 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:border-purple-500 dark:hover:text-purple-300"
              >
                <PhotoIcon className="h-4 w-4" />
                {t('feed.editAddPhoto', 'Pridať fotku')}
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                  {t('feed.composerImagesRemaining', 'ešte {n}').replace(
                    '{n}',
                    String(draft.remainingSlots),
                  )}
                </span>
              </button>
            ) : (
              <p
                data-testid="feed-post-edit-photos-full"
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {t(
                  'feed.composerImagesLimit',
                  'Príspevok môže mať najviac {max} fotiek.',
                ).replace('{max}', String(MAX_FEED_POST_IMAGES))}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            {isMobile ? null : (
              <DesktopEmojiPickerButton
                ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
                disabled={saving}
                onSelect={insertEmoji}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
              />
            )}
            <span
              className={`ml-auto text-xs tabular-nums ${
                tooLong
                  ? 'font-semibold text-red-600 dark:text-red-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
              data-testid="feed-post-edit-counter"
            >
              {caption.length}/{CAPTION_MAX_LENGTH}
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              data-testid="feed-post-edit-submit"
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadProgress
                ? t(
                    'feed.composerUploadingProgress',
                    'Nahrávam fotku {current} z {total}...',
                  )
                    .replace('{current}', String(uploadProgress.current))
                    .replace('{total}', String(uploadProgress.total))
                : saving
                  ? t('common.saving', 'Ukladám...')
                  : t('common.save', 'Uložiť')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
