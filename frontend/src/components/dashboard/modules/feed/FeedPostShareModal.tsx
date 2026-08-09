'use client';

/**
 * Zdieľanie príspevku ďalej – jednokrokový dialóg s náhľadom a vlastným textom.
 *
 * Payload: sprievodný text ide do `caption` (je to text NOVÉHO príspevku).
 * `shared_post_caption` si backend dopĺňa sám ako snapshot pôvodného textu.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeedDialog } from './useFeedDialog';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import { GroupUserPicker } from '../messages/GroupUserPicker';
import type { GroupMemberCandidate } from '../messages/types';
import { useEmojiInsertion } from './useEmojiInsertion';
import { shareFeedPost, type FeedPost } from '@/lib/feedApi';

const SHARE_CAPTION_MAX_LENGTH = 500;
/** Zhodné s MAX_FEED_POST_TAGS na backende – limit validuje aj BE. */
const MAX_FEED_POST_TAGS = 10;

type FeedPostShareModalProps = {
  open: boolean;
  onClose: () => void;
  post: FeedPost;
  onShared?: (created: FeedPost) => void;
};

export default function FeedPostShareModal({
  open,
  onClose,
  post,
  onShared,
}: FeedPostShareModalProps) {
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

  // Náhľad: pri zdieľaní zdieľania ukazujeme koreňový obsah, ktorý sa reálne
  // prevezme (backend reťazec sploští), nie medzičlánok.
  const previewAuthor =
    post.shared_content?.owner_display_name || post.author?.display_name || '';
  const previewText = post.shared_content
    ? post.shared_content.caption || post.shared_content.title
    : post.caption;
  const previewThumbnail =
    post.shared_content?.thumbnail_url ||
    post.images?.[0]?.thumbnail_url ||
    null;

  const tooLong = caption.length > SHARE_CAPTION_MAX_LENGTH;

  const handleSubmit = async () => {
    if (tooLong || submitting) return;
    setSubmitting(true);
    try {
      const created = await shareFeedPost(
        post.id,
        caption.trim(),
        taggedUsers.map((user) => user.id),
      );
      toast.success(t('feed.shareSuccess', 'Príspevok bol zdieľaný.'));
      onShared?.(created);
      onClose();
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('feed.shareError', 'Zdieľanie sa nepodarilo.');
      toast.error(message);
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="feed-share-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {t('feed.sharePost', 'Zdieľať ďalej')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label={t('common.close', 'Zavrieť')}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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
            className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
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

          {/* Označenie ľudí – rovnaký picker, aký používa zdieľanie ponuky do
              správ (OfferShareModal). Voliteľné; limit aj blokovanie validuje BE. */}
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
              <InitialsAvatar name={previewAuthor} size="xs" />
              <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                {previewAuthor}
              </span>
            </div>
            {previewText ? (
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
                {previewText}
              </p>
            ) : null}
            {previewThumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewThumbnail}
                alt=""
                className="mt-2 max-h-40 w-full rounded-lg object-cover"
              />
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
