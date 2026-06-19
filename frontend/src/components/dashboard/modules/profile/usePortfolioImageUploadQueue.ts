'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  uploadPortfolioImageComplete,
  uploadPortfolioImageInit,
  uploadPortfolioImageToStorage,
} from './portfolioApi';
import {
  PORTFOLIO_ALLOWED_IMAGE_EXTENSIONS,
  PORTFOLIO_IMAGE_MAX_BYTES,
  PORTFOLIO_IMAGE_MAX_COUNT,
} from './portfolioFormUtils';
import type { PortfolioImage } from './portfolioTypes';

export type PortfolioUploadStatus = 'queued' | 'uploading' | 'completing' | 'pending' | 'failed';

export type PortfolioUploadQueueItem = {
  id: string;
  imageId?: number;
  file: File;
  previewUrl: string;
  progress: number;
  status: PortfolioUploadStatus;
  error: string | null;
};

type UsePortfolioImageUploadQueueOptions = {
  itemId: number;
  activeImageCount: number;
  serverImages: PortfolioImage[];
  onRefresh: () => Promise<void> | void;
};

const ALLOWED_EXTENSIONS = new Set<string>(PORTFOLIO_ALLOWED_IMAGE_EXTENSIONS);

function createQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fileExtension(file: File): string {
  const name = String(file.name || '');
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : '';
}

function isSupportedImageFile(file: File): boolean {
  if (String(file.type || '').toLowerCase().startsWith('image/')) return true;
  return ALLOWED_EXTENSIONS.has(fileExtension(file));
}

function createObjectUrl(file: File): string {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return '';
  return URL.createObjectURL(file);
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const direct = record.detail || record.error || record.message;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();
    for (const value of Object.values(record)) {
      if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
        return value[0].trim();
      }
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
  }
  return fallback;
}

function activeLocalCount(items: PortfolioUploadQueueItem[]): number {
  return items.filter((item) => item.status !== 'failed').length;
}

function isActiveServerImage(image: PortfolioImage): boolean {
  return image.status === 'pending' || image.status === 'approved' || image.status == null;
}

function adjustedActiveServerCount(
  activeImageCount: number,
  serverImages: PortfolioImage[],
  items: PortfolioUploadQueueItem[],
): number {
  const activeServerIds = new Set<number>();
  serverImages.forEach((image) => {
    if (typeof image.id === 'number' && isActiveServerImage(image)) {
      activeServerIds.add(image.id);
    }
  });
  const duplicateLocalPendingIds = new Set<number>();
  items.forEach((item) => {
    if (
      item.status === 'pending' &&
      typeof item.imageId === 'number' &&
      activeServerIds.has(item.imageId)
    ) {
      duplicateLocalPendingIds.add(item.imageId);
    }
  });
  return Math.max(0, activeImageCount - duplicateLocalPendingIds.size);
}

export function usePortfolioImageUploadQueue({
  itemId,
  activeImageCount,
  serverImages,
  onRefresh,
}: UsePortfolioImageUploadQueueOptions) {
  const { t } = useLanguage();
  const [items, setItems] = useState<PortfolioUploadQueueItem[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const itemsRef = useRef<PortfolioUploadQueueItem[]>([]);
  const previewUrlsRef = useRef(new Map<string, string>());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const revokePreview = useCallback((id: string) => {
    const url = previewUrlsRef.current.get(id);
    if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(url);
    }
    previewUrlsRef.current.delete(id);
  }, []);

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => {
        if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
      });
      previewUrls.clear();
    };
  }, []);

  useEffect(() => {
    const serverById = new Map<number, PortfolioImage>();
    serverImages.forEach((image) => {
      if (typeof image.id === 'number') serverById.set(image.id, image);
    });

    setItems((current) =>
      current.filter((item) => {
        if (item.status !== 'pending' || typeof item.imageId !== 'number') return true;
        const serverImage = serverById.get(item.imageId);
        if (!serverImage || serverImage.status === 'pending') return true;
        revokePreview(item.id);
        return false;
      }),
    );
  }, [revokePreview, serverImages]);

  const remainingSlots = useMemo(
    () =>
      Math.max(
        0,
        PORTFOLIO_IMAGE_MAX_COUNT -
          adjustedActiveServerCount(activeImageCount, serverImages, items) -
          activeLocalCount(items),
      ),
    [activeImageCount, items, serverImages],
  );

  const updateQueueItem = useCallback(
    (id: string, patch: Partial<PortfolioUploadQueueItem>) => {
      setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    },
    [],
  );

  const uploadOne = useCallback(
    async (queueItem: PortfolioUploadQueueItem): Promise<boolean> => {
      updateQueueItem(queueItem.id, {
        status: 'uploading',
        error: null,
        progress: Math.max(queueItem.progress, 1),
      });

      try {
        const init = await uploadPortfolioImageInit(itemId, {
          filename: queueItem.file.name,
          content_type: queueItem.file.type || 'application/octet-stream',
          size_bytes: queueItem.file.size,
        });
        await uploadPortfolioImageToStorage(init, queueItem.file, (progress) => {
          updateQueueItem(queueItem.id, { progress });
        });
        updateQueueItem(queueItem.id, { status: 'completing', progress: 100 });
        const completed = await uploadPortfolioImageComplete(itemId, {
          key: init.key,
          filename: queueItem.file.name,
        });
        updateQueueItem(queueItem.id, {
          imageId: completed.id,
          status: 'pending',
          progress: 100,
          error: null,
        });
        return true;
      } catch (error) {
        updateQueueItem(queueItem.id, {
          status: 'failed',
          error: extractApiErrorMessage(error, t('portfolio.photoUploadFailed')),
        });
        return false;
      }
    },
    [itemId, t, updateQueueItem],
  );

  const refreshAfterSuccess = useCallback(async () => {
    await Promise.resolve(onRefresh());
  }, [onRefresh]);

  const uploadFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      if (files.length === 0) return;

      setSelectionError(null);
      const currentItems = itemsRef.current;
      const adjustedActiveCount = adjustedActiveServerCount(
        activeImageCount,
        serverImages,
        currentItems,
      );
      let slotsLeft = Math.max(
        0,
        PORTFOLIO_IMAGE_MAX_COUNT - adjustedActiveCount - activeLocalCount(currentItems),
      );
      const uploadable: PortfolioUploadQueueItem[] = [];
      const nextItems: PortfolioUploadQueueItem[] = [];

      files.forEach((file) => {
        const id = createQueueId();
        const previewUrl = createObjectUrl(file);
        if (previewUrl) previewUrlsRef.current.set(id, previewUrl);

        if (!isSupportedImageFile(file)) {
          nextItems.push({
            id,
            file,
            previewUrl,
            progress: 0,
            status: 'failed',
            error: t('portfolio.invalidPhotoType'),
          });
          return;
        }

        if (file.size > PORTFOLIO_IMAGE_MAX_BYTES) {
          nextItems.push({
            id,
            file,
            previewUrl,
            progress: 0,
            status: 'failed',
            error: t('portfolio.photoTooLarge'),
          });
          return;
        }

        if (slotsLeft <= 0) {
          revokePreview(id);
          setSelectionError(t('portfolio.maxPhotosLimit'));
          return;
        }

        slotsLeft -= 1;
        const queueItem: PortfolioUploadQueueItem = {
          id,
          file,
          previewUrl,
          progress: 0,
          status: 'queued',
          error: null,
        };
        nextItems.push(queueItem);
        uploadable.push(queueItem);
      });

      if (nextItems.length > 0) {
        setItems((current) => [...current, ...nextItems]);
      }

      if (uploadable.length === 0) return;

      void (async () => {
        const results = await Promise.all(uploadable.map((item) => uploadOne(item)));
        if (results.some(Boolean)) {
          await refreshAfterSuccess();
        }
      })();
    },
    [activeImageCount, refreshAfterSuccess, revokePreview, serverImages, t, uploadOne],
  );

  const retryUpload = useCallback(
    (id: string) => {
      const queueItem = itemsRef.current.find((item) => item.id === id);
      if (!queueItem || queueItem.status !== 'failed') return;
      const reservedByOtherItems = activeLocalCount(itemsRef.current.filter((item) => item.id !== id));
      const adjustedActiveCount = adjustedActiveServerCount(
        activeImageCount,
        serverImages,
        itemsRef.current,
      );
      if (adjustedActiveCount + reservedByOtherItems >= PORTFOLIO_IMAGE_MAX_COUNT) {
        updateQueueItem(id, { error: t('portfolio.maxPhotosLimit') });
        return;
      }

      void (async () => {
        const success = await uploadOne(queueItem);
        if (success) {
          await refreshAfterSuccess();
        }
      })();
    },
    [activeImageCount, refreshAfterSuccess, serverImages, t, updateQueueItem, uploadOne],
  );

  const pendingImageIds = useMemo(() => {
    const ids = new Set<number>();
    items.forEach((item) => {
      if (item.status === 'pending' && typeof item.imageId === 'number') {
        ids.add(item.imageId);
      }
    });
    return ids;
  }, [items]);

  return {
    items,
    remainingSlots,
    maxImages: PORTFOLIO_IMAGE_MAX_COUNT,
    selectionError,
    pendingImageIds,
    uploadFiles,
    retryUpload,
  };
}
