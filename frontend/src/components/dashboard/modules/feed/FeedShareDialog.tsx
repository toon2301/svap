'use client';

/**
 * Jednokrokový dialóg „zdieľať na Nástenku".
 *
 * JEDNA implementácia pre všetky tri zdroje (príspevok, ponuka, portfólio) –
 * líšia sa len náhľadom a tým, ktoré `shared_*_id` ide na backend. Preto sa
 * volajúcemu odovzdáva hotový `preview` a funkcia `onShare`; dialóg sám o type
 * zdroja nič nevie.
 *
 * Sprievodný text ide vždy do `caption` (je to text NOVÉHO príspevku) –
 * snapshot pôvodného obsahu si backend dopĺňa sám.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedDialog } from './useFeedDialog';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import BlurredContainImage from '../shared/BlurredContainImage';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { GroupUserPicker } from '../messages/GroupUserPicker';
import type { GroupMemberCandidate } from '../messages/types';
import { useEmojiInsertion } from './useEmojiInsertion';
import { translateFeedActionError } from './feedActionErrors';
import { emitFeedPostCreated } from './feedShareEvents';
import type { FeedPost } from '@/lib/feedApi';

const SHARE_CAPTION_MAX_LENGTH = 500;
/** Zhodné s MAX_FEED_POST_TAGS na backende – limit validuje aj BE. */
const MAX_FEED_POST_TAGS = 10;

export type FeedSharePreview = {
  /**
   * Hlavný riadok náhľadu: meno vlastníka (príspevok) alebo názov
   * (ponuka, portfólio) – podľa toho, čo obsah v skutočnosti identifikuje.
   */
  heading: string;
  text?: string | null;
  thumbnailUrl?: string | null;
  /** Avatar dáva zmysel len keď je `heading` meno človeka. */
  showAvatar?: boolean;
  /** Hotový text ceny (viď formatOfferPriceLabel) - len pri ponuke. */
  priceLabel?: string;
};

type FeedShareDialogProps = {
  open: boolean;
  onClose: () => void;
  preview: FeedSharePreview;
  /** Vlastné volanie API – rozhoduje, ktorý `shared_*_id` sa pošle. */
  onShare: (caption: string, taggedUserIds: number[]) => Promise<FeedPost>;
  /** Volá sa PO úspechu; feed sa notifikuje aj eventom (viď feedShareEvents). */
  onShared?: (created: FeedPost) => void;
};

export default function FeedShareDialog({
  open,
  onClose,
  preview,
  onShare,
  onShared,
}: FeedShareDialogProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [caption, setCaption] = useState('');
  const [taggedUsers, setTaggedUsers] = useState<GroupMemberCandidate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { textareaRef, insertEmoji } = useEmojiInsertion(caption, setCaption);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    setCaption('');
    setTaggedUsers([]);
  }, [open]);

  const dialogRef = useFeedDialog({ open, onClose, canClose: !submitting });

  if (!open || !mounted || typeof document === 'undefined') return null;

  const tooLong = caption.length > SHARE_CAPTION_MAX_LENGTH;

  const handleSubmit = async () => {
    if (tooLong || submitting) return;
    setSubmitting(true);
    try {
      const created = await onShare(
        caption.trim(),
        taggedUsers.map((user) => user.id),
      );
      toast.success(t('feed.shareSuccess', 'Príspevok bol zdieľaný.'));
      // Feed nemusí byť namountovaný (zdieľa sa z profilu) – event ho vloží na
      // vrch, keď je, a inak sa ticho stratí. Viď feedShareEvents.
      emitFeedPostCreated(created);
      onShared?.(created);
      onClose();
    } catch (err) {
      // Skrytá/nedostupná ponuka či portfólio vracia z BE zrozumiteľnú hlášku –
      // FE ju len zobrazí, validáciu neduplikuje. Sieťové a rate-limit chyby
      // idú cez spoločný helper, nech sa správajú ako inde vo feede.
      const serverMessage = (
        err as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      toast.error(
        serverMessage ||
          translateFeedActionError(t, err, () =>
            t('feed.shareError', 'Zdieľanie sa nepodarilo.'),
          ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feed-share-title"
      data-testid="feed-share-modal"
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
        <div className="flex-1 overflow-y-auto subtle-scrollbar p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="feed-share-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {t('feed.shareToBoard', 'Zdieľať na Nástenku')}
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
            rows={3}
            disabled={submitting}
            placeholder={t('feed.shareCaptionPlaceholder', 'Pridaj vlastný komentár...')}
            aria-label={t('feed.shareCaptionPlaceholder', 'Pridaj vlastný komentár...')}
            className="w-full resize-y subtle-scrollbar rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
          />
          <div className="mt-1 flex items-center justify-between gap-3">
            <DesktopEmojiPickerButton
              ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
              disabled={submitting}
              onSelect={insertEmoji}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
            />
            <span className="text-xs tabular-nums text-gray-400 dark:text-gray-500">
              <span className={tooLong ? 'font-semibold text-red-600 dark:text-red-400' : ''}>
                {caption.length}/{SHARE_CAPTION_MAX_LENGTH}
              </span>
            </span>
          </div>

          {/* Označenie ľudí – rovnaký picker ako zdieľanie ponuky do správ.
              Voliteľné; limit aj blokovanie validuje BE. */}
          <div className="mt-3" data-testid="feed-share-tag-picker">
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

          {/* Náhľad zdieľaného obsahu – rovnaký fialový obal ako na karte. */}
          <div
            data-testid="feed-share-preview"
            className="mt-3 rounded-xl border border-purple-200 bg-[#EEEDFE] p-3 dark:border-purple-800/60 dark:bg-purple-950/30"
          >
            <div className="flex items-center gap-2">
              {preview.showAvatar ? (
                <InitialsAvatar name={preview.heading} size="xs" />
              ) : null}
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {preview.heading}
              </span>
            </div>
            {preview.text ? (
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
                {preview.text}
              </p>
            ) : null}
            {preview.priceLabel ? (
              <span
                data-testid="feed-share-preview-price"
                className="mt-2 inline-block rounded-md border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-xs font-bold tabular-nums text-purple-700 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-300"
              >
                {preview.priceLabel}
              </span>
            ) : null}
            {preview.thumbnailUrl ? (
              // Rovnaké letterbox ošetrenie ako karta vo feede - náhľad tu
              // musí vyzerať tak, ako bude vyzerať po zdieľaní.
              <div className="mt-2 h-40 w-full overflow-hidden rounded-lg">
                <BlurredContainImage src={preview.thumbnailUrl} alt="" />
              </div>
            ) : null}
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
              disabled={submitting || tooLong}
              data-testid="feed-share-submit"
              className="rounded-lg bg-purple-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? t('common.sending', 'Odosielam...')
                : t('feed.shareSubmit', 'Zdieľať')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
