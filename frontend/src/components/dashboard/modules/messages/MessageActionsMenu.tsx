'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DocumentDuplicateIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { OUTGOING_MESSAGE_BUBBLE_CLASS } from './conversationDetailConstants';
import { MessagePinIcon } from './MessagePinIcon';

type MessageActionPreview = {
  text?: string | null;
  imageUrl?: string | null;
  timestamp?: string | null;
};

type MessageActionsMenuProps = {
  open: boolean;
  isMobile: boolean;
  anchorRect: DOMRect | null;
  preview?: MessageActionPreview | null;
  canCopy?: boolean;
  canDelete?: boolean;
  canPin?: boolean;
  canForward?: boolean;
  pinActionLabel?: string;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onPinToggle: () => void;
  onForward: () => void;
};

const MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE: React.CSSProperties = {
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  touchAction: 'manipulation',
};
const DESKTOP_MENU_WIDTH = 192;
const DESKTOP_MENU_GAP = 8;
const DESKTOP_MENU_VIEWPORT_PADDING = 8;
const DESKTOP_MENU_FALLBACK_HEIGHT = 184;

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

/**
 * Calculates a viewport-safe top coordinate for the desktop action menu.
 *
 * @param anchorRect - Trigger button position in viewport coordinates.
 * @param menuHeight - Measured menu height or a fallback before first layout.
 * @param viewportHeight - Current viewport height.
 * @returns The top coordinate that keeps the menu inside the viewport.
 */
function getDesktopMenuTop(
  anchorRect: DOMRect,
  menuHeight: number,
  viewportHeight: number,
): number {
  const maxMenuHeight = Math.max(0, viewportHeight - DESKTOP_MENU_VIEWPORT_PADDING * 2);
  const effectiveMenuHeight = Math.min(
    menuHeight || DESKTOP_MENU_FALLBACK_HEIGHT,
    maxMenuHeight,
  );
  const spaceBelow = viewportHeight - anchorRect.bottom - DESKTOP_MENU_GAP;
  const spaceAbove = anchorRect.top - DESKTOP_MENU_GAP;
  const shouldOpenUp = spaceBelow < effectiveMenuHeight && spaceAbove > spaceBelow;
  const preferredTop = shouldOpenUp
    ? anchorRect.top - effectiveMenuHeight - DESKTOP_MENU_GAP
    : anchorRect.bottom + DESKTOP_MENU_GAP;

  return clamp(
    preferredTop,
    DESKTOP_MENU_VIEWPORT_PADDING,
    viewportHeight - effectiveMenuHeight - DESKTOP_MENU_VIEWPORT_PADDING,
  );
}

export function MessageActionsMenu({
  open,
  isMobile,
  anchorRect,
  preview = null,
  canCopy = false,
  canDelete = false,
  canPin = false,
  canForward = false,
  pinActionLabel,
  onClose,
  onCopy,
  onDelete,
  onPinToggle,
  onForward,
}: MessageActionsMenuProps) {
  const { t } = useLanguage();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const [desktopMenuHeight, setDesktopMenuHeight] = useState(DESKTOP_MENU_FALLBACK_HEIGHT);
  const [desktopViewportSize, setDesktopViewportSize] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    height: typeof window === 'undefined' ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !isMobile || typeof window === 'undefined') return;

    window.getSelection?.()?.removeAllRanges();
  }, [isMobile, open]);

  useEffect(() => {
    if (!open || isMobile || typeof window === 'undefined') return;

    const updateDesktopViewportSize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      setDesktopViewportSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    updateDesktopViewportSize();
    window.addEventListener('resize', updateDesktopViewportSize);
    return () => window.removeEventListener('resize', updateDesktopViewportSize);
  }, [isMobile, open]);

  useLayoutEffect(() => {
    if (!open || isMobile) return;

    const measuredHeight = desktopMenuRef.current?.offsetHeight ?? 0;
    if (measuredHeight <= 0) return;
    setDesktopMenuHeight((current) => (current === measuredHeight ? current : measuredHeight));
  }, [canCopy, canDelete, canForward, canPin, isMobile, open, pinActionLabel]);

  const desktopPosition = useMemo(() => {
    const viewportWidth = desktopViewportSize.width;
    const viewportHeight = desktopViewportSize.height;

    if (!anchorRect || viewportWidth <= 0 || viewportHeight <= 0) {
      return null;
    }

    const menuWidth = DESKTOP_MENU_WIDTH;
    const horizontalPadding = DESKTOP_MENU_VIEWPORT_PADDING;
    const top = getDesktopMenuTop(anchorRect, desktopMenuHeight, viewportHeight);
    const left = Math.max(
      horizontalPadding,
      Math.min(anchorRect.right - menuWidth, viewportWidth - menuWidth - horizontalPadding),
    );
    const maxHeight = Math.max(0, viewportHeight - DESKTOP_MENU_VIEWPORT_PADDING * 2);

    return { top, left, maxHeight };
  }, [anchorRect, desktopMenuHeight, desktopViewportSize.height, desktopViewportSize.width]);

  const mobilePreviewPosition = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const horizontalPadding = 16;
    const topPadding = 72;
    const reservedBottomSpace = 300;
    const fallbackWidth = Math.min(240, viewportWidth - horizontalPadding * 2);
    const previewWidth =
      anchorRect && anchorRect.width > 0
        ? Math.min(anchorRect.width, viewportWidth - horizontalPadding * 2)
        : fallbackWidth;
    const previewLeft = anchorRect
      ? clamp(anchorRect.left, horizontalPadding, viewportWidth - previewWidth - horizontalPadding)
      : viewportWidth - previewWidth - horizontalPadding;
    const previewTop = anchorRect
      ? clamp(anchorRect.top, topPadding, viewportHeight - reservedBottomSpace)
      : topPadding;

    return {
      left: previewLeft,
      top: previewTop,
      width: previewWidth,
    };
  }, [anchorRect]);

  const suppressNativeContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (!isMobile) return;
    event.preventDefault();
  };

  if (!open) {
    return null;
  }

  const mobileActions = (
    <div
      className="fixed inset-0 z-[105]"
      role="dialog"
      aria-modal="true"
      aria-label={t('messages.openMessageActions', 'Otvoriť možnosti správy')}
      data-testid="message-actions-dialog"
      onContextMenu={suppressNativeContextMenu}
      style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
    >
      <div
        className="absolute inset-0 bg-white/82 backdrop-blur-md dark:bg-[#050506]/84"
        data-testid="message-actions-backdrop"
        onClick={onClose}
      />

      {preview && mobilePreviewPosition ? (
        <div
          className="pointer-events-none absolute"
          data-testid="message-actions-mobile-preview"
          style={{
            ...MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE,
            left: mobilePreviewPosition.left,
            top: mobilePreviewPosition.top,
            width: mobilePreviewPosition.width,
          }}
        >
          {preview.timestamp ? (
            <div className="mb-1.5 text-right text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
              {preview.timestamp}
            </div>
          ) : null}
          <div
            className={`ml-auto w-fit max-w-[min(75vw,18rem)] overflow-hidden rounded-2xl text-sm shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/5 ${OUTGOING_MESSAGE_BUBBLE_CLASS}`}
          >
            {preview.imageUrl ? (
              <img
                src={preview.imageUrl}
                alt={t('messages.imagePreview', 'Náhľad obrázka')}
                loading="lazy"
                decoding="async"
                className="block h-auto max-h-40 w-auto max-w-full object-contain"
              />
            ) : null}
            {preview.text ? (
              <div className="px-3 py-2">
                <div className="whitespace-pre-wrap break-words">{preview.text}</div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
        <div
          className="pointer-events-auto overflow-hidden rounded-[1.75rem] border border-gray-200 bg-white/96 shadow-[0_-8px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-gray-800 dark:bg-[#0f0f10]/96"
          data-testid="message-actions-menu"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={suppressNativeContextMenu}
          style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
        >
          <div className="px-4 pb-4 pt-3">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            {canCopy ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopy();
                }}
                onContextMenu={suppressNativeContextMenu}
                className="flex w-full select-none items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60"
                data-testid="message-copy-action"
                style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
              >
                <DocumentDuplicateIcon className="h-5 w-5" />
                <span>{t('messages.copyAction', 'Kopírovať')}</span>
              </button>
            ) : null}
            {canPin ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onPinToggle();
                }}
                onContextMenu={suppressNativeContextMenu}
                className={`flex w-full select-none items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60${
                  canCopy || canForward || canDelete ? ' mt-2' : ''
                }`}
                data-testid="message-pin-action"
                style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
              >
                <MessagePinIcon className="h-5 w-5" />
                <span>{pinActionLabel || t('messages.pinAction', 'Pripnúť správu')}</span>
              </button>
            ) : null}
            {canForward ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onForward();
                }}
                onContextMenu={suppressNativeContextMenu}
                className={`flex w-full select-none items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60${
                  canCopy || canPin ? ' mt-2' : ''
                }`}
                data-testid="message-forward-action"
                style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                <span>{t('messages.forwardAction', 'Preposlať')}</span>
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                onContextMenu={suppressNativeContextMenu}
                className={`flex w-full select-none items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20${
                  canCopy || canPin || canForward ? ' mt-2' : ''
                }`}
                data-testid="message-delete-action"
                style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
              >
                <TrashIcon className="h-5 w-5" />
                <span>{t('messages.deleteAction', 'Vymazať')}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              onContextMenu={suppressNativeContextMenu}
              className="mt-2 flex w-full select-none items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60"
              style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
            >
              {t('common.cancel', 'Zrušiť')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    if (!portalNode) {
      return null;
    }

    return createPortal(mobileActions, portalNode);
  }

  return (
    <div
      className="fixed inset-0 z-[105] bg-transparent"
      onClick={onClose}
      data-testid="message-actions-menu"
    >
      <div
        ref={desktopMenuRef}
        className="absolute w-48 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10]"
        style={desktopPosition ?? undefined}
        onClick={(event) => event.stopPropagation()}
      >
        {canCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60"
            data-testid="message-copy-action"
          >
            <DocumentDuplicateIcon className="h-4 w-4" />
            <span>{t('messages.copyAction', 'Kopírovať')}</span>
          </button>
        ) : null}
        {canPin ? (
          <button
            type="button"
            onClick={onPinToggle}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60${
              canCopy || canForward || canDelete ? ' mt-1' : ''
            }`}
            data-testid="message-pin-action"
          >
            <MessagePinIcon className="h-4 w-4" />
            <span>{pinActionLabel || t('messages.pinAction', 'Pripnúť správu')}</span>
          </button>
        ) : null}
        {canForward ? (
          <button
            type="button"
            onClick={onForward}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60${
              canCopy || canPin ? ' mt-1' : ''
            }`}
            data-testid="message-forward-action"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span>{t('messages.forwardAction', 'Preposlať')}</span>
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20${
              canCopy || canPin || canForward ? ' mt-1' : ''
            }`}
            data-testid="message-delete-action"
          >
            <TrashIcon className="h-4 w-4" />
            <span>{t('messages.deleteAction', 'Vymazať')}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
