'use client';

import { RefObject, useEffect, useLayoutEffect } from 'react';

const PIN_SETTLE_DELAY_MS = 160;
const PIN_MAX_DURATION_MS = 8000;
const PIN_CANCEL_DISTANCE_PX = 24;

type UseInitialBottomPinOptions = {
  conversationId: number;
  enabled: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  scrollToBottom: () => void;
};

function getDistanceToBottom(scrollContainer: HTMLDivElement): number {
  return scrollContainer.scrollHeight - scrollContainer.clientHeight - scrollContainer.scrollTop;
}

export function useInitialBottomPin({
  conversationId,
  enabled,
  scrollContainerRef,
  contentRef,
  scrollToBottom,
}: UseInitialBottomPinOptions): void {
  useLayoutEffect(() => {
    if (!enabled) return;
    scrollToBottom();
  }, [conversationId, enabled, scrollToBottom]);

  useEffect(() => {
    if (!enabled) return;

    const scrollContainer = scrollContainerRef.current;
    const content = contentRef.current;
    if (!scrollContainer || !content) return;

    let isFinished = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let maxTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingImages = new Set<HTMLImageElement>();
    const removeImageListeners: Array<() => void> = [];

    const clearTimers = () => {
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
      if (maxTimer) {
        clearTimeout(maxTimer);
        maxTimer = null;
      }
    };

    const finish = () => {
      if (isFinished) return;
      isFinished = true;
      clearTimers();
      resizeObserver?.disconnect();
      scrollContainer.removeEventListener('scroll', handleScroll);
      removeImageListeners.forEach((removeListener) => removeListener());
    };

    const scheduleSettleCheck = () => {
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      settleTimer = setTimeout(() => {
        if (pendingImages.size === 0) {
          finish();
        }
      }, PIN_SETTLE_DELAY_MS);
    };

    const pinToBottom = () => {
      if (isFinished) return;
      scrollToBottom();
      scheduleSettleCheck();
    };

    const handleScroll = () => {
      if (isFinished) return;
      if (getDistanceToBottom(scrollContainer) > PIN_CANCEL_DISTANCE_PX) {
        finish();
      }
    };

    const handleTrackedImageSettled = (image: HTMLImageElement) => {
      pendingImages.delete(image);
      pinToBottom();
    };

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            pinToBottom();
          });

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver?.observe(content);

    const images = Array.from(content.querySelectorAll('img'));
    images.forEach((image) => {
      if (image.complete) return;

      pendingImages.add(image);
      const onLoadOrError = () => handleTrackedImageSettled(image);
      image.addEventListener('load', onLoadOrError);
      image.addEventListener('error', onLoadOrError);
      removeImageListeners.push(() => {
        image.removeEventListener('load', onLoadOrError);
        image.removeEventListener('error', onLoadOrError);
      });
    });

    maxTimer = setTimeout(() => {
      finish();
    }, PIN_MAX_DURATION_MS);

    pinToBottom();

    return finish;
  }, [conversationId, contentRef, enabled, scrollContainerRef, scrollToBottom]);
}
