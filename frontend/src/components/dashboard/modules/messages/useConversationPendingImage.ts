'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getMessageImageMaxSizeMb, validateMessageImageFile } from './messageImageUpload';

type Translate = (key: string, defaultValue?: string) => string;

type UseConversationPendingImageArgs = {
  sending: boolean;
  t: Translate;
};

export function useConversationPendingImage({
  sending,
  t,
}: UseConversationPendingImageArgs) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImagePreviewUrlRef = useRef<string | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string | null>(null);

  const clearPendingImage = useCallback(() => {
    if (pendingImagePreviewUrlRef.current) {
      URL.revokeObjectURL(pendingImagePreviewUrlRef.current);
      pendingImagePreviewUrlRef.current = null;
    }

    setPendingImageFile(null);
    setPendingImagePreviewUrl(null);
  }, []);

  useEffect(() => {
    return () => {
      if (pendingImagePreviewUrlRef.current) {
        URL.revokeObjectURL(pendingImagePreviewUrlRef.current);
        pendingImagePreviewUrlRef.current = null;
      }
    };
  }, []);

  const applyPendingImageSelection = useCallback(
    (file: File | null) => {
      if (!file) {
        return;
      }

      const validationError = validateMessageImageFile(file);

      if (validationError === 'invalid_type') {
        toast.error(
          t(
            'messages.invalidImageType',
            'Vyberte platný obrázok vo formáte JPG, PNG, GIF, WebP alebo HEIC.',
          ),
        );
        return;
      }

      if (validationError === 'too_large') {
        toast.error(
          t(
            'messages.imageTooLarge',
            'Obrázok je príliš veľký. Maximálna veľkosť je {size} MB.',
          ).replace('{size}', String(getMessageImageMaxSizeMb())),
        );
        return;
      }

      const nextPreviewUrl = URL.createObjectURL(file);
      if (pendingImagePreviewUrlRef.current) {
        URL.revokeObjectURL(pendingImagePreviewUrlRef.current);
      }

      pendingImagePreviewUrlRef.current = nextPreviewUrl;
      setPendingImageFile(file);
      setPendingImagePreviewUrl(nextPreviewUrl);
    },
    [t],
  );

  const handlePendingImageInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = '';
      applyPendingImageSelection(file);
    },
    [applyPendingImageSelection],
  );

  const openImagePicker = useCallback(() => {
    if (sending) return;
    imageInputRef.current?.click();
  }, [sending]);

  const openCameraPicker = useCallback(() => {
    if (sending) return;
    cameraInputRef.current?.click();
  }, [sending]);

  return {
    imageInputRef,
    cameraInputRef,
    pendingImageFile,
    pendingImagePreviewUrl,
    clearPendingImage,
    handlePendingImageInputChange,
    openImagePicker,
    openCameraPicker,
  };
}
