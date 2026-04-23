'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
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
  pinActionLabel?: string;
  onClose: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onPinToggle: () => void;
};

const MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE: React.CSSProperties = {
  WebkitTouchCallout: 'none',
  WebkitUserSelect: 'none',
  userSelect: 'none',
  touchAction: 'manipulation',
};

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

export function MessageActionsMenu({
  open,
  isMobile,
  anchorRect,
  preview = null,
  canCopy = false,
  canDelete = false,
  canPin = false,
  pinActionLabel,
  onClose,
  onCopy,
  onDelete,
  onPinToggle,
}: MessageActionsMenuProps) {
  const { t } = useLanguage();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

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

  const desktopPosition = useMemo(() => {
    if (typeof window === 'undefined' || !anchorRect) {
      return null;
    }

    const menuWidth = 192;
    const horizontalPadding = 8;
    const top = Math.min(anchorRect.bottom + 8, window.innerHeight - 80);
    const left = Math.max(
      horizontalPadding,
      Math.min(anchorRect.right - menuWidth, window.innerWidth - menuWidth - horizontalPadding),
    );

    return { top, left };
  }, [anchorRect]);

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
          <div className="ml-auto w-fit max-w-[min(75vw,18rem)] overflow-hidden rounded-2xl bg-brand text-sm text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-black/5">
            {preview.imageUrl ? (
              <img
                src={preview.imageUrl}
                alt={t('messages.imagePreview', 'Náhľad obrázka')}
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
                  canCopy || canDelete ? ' mt-2' : ''
                }`}
                data-testid="message-pin-action"
                style={MOBILE_ACTIONS_INTERACTION_SUPPRESSION_STYLE}
              >
                <MessagePinIcon className="h-5 w-5" />
                <span>{pinActionLabel || t('messages.pinAction', 'Pripnúť správu')}</span>
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
                  canCopy || canPin ? ' mt-2' : ''
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
        className="absolute w-48 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10]"
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
              canCopy || canDelete ? ' mt-1' : ''
            }`}
            data-testid="message-pin-action"
          >
            <MessagePinIcon className="h-4 w-4" />
            <span>{pinActionLabel || t('messages.pinAction', 'Pripnúť správu')}</span>
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20${
              canCopy || canPin ? ' mt-1' : ''
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
