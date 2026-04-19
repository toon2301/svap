'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';

export function MessageImageLightbox({
  open,
  imageUrl,
  alt,
  onClose,
}: {
  open: boolean;
  imageUrl: string | null;
  alt: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof document === 'undefined') {
      return;
    }

    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open || !imageUrl || !mounted || !portalNode) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[112] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('messages.imagePreview', 'Náhľad obrázka')}
      data-testid="message-image-lightbox"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white transition-colors hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-white/60"
        aria-label={t('common.close', 'Zatvoriť')}
        data-testid="message-image-lightbox-close"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
      <div
        className="flex max-h-full max-w-full items-center justify-center"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="max-h-[calc(100vh-2rem)] max-w-full rounded-2xl object-contain shadow-2xl"
          data-testid="message-image-lightbox-image"
        />
      </div>
    </div>,
    portalNode,
  );
}

