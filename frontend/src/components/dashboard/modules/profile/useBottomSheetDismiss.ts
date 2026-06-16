'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

const DISMISS_DISTANCE_PX = 80;
const DISMISS_VELOCITY_PX_MS = 0.6;

export function shouldDismissBottomSheetDrag(deltaPx: number, elapsedMs: number): boolean {
  const velocity = deltaPx / Math.max(elapsedMs, 1);
  return deltaPx >= DISMISS_DISTANCE_PX || velocity >= DISMISS_VELOCITY_PX_MS;
}

type UseBottomSheetDismissOptions = {
  onDismiss: () => void;
  enabled?: boolean;
};

type DragHandleProps = {
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  style: CSSProperties;
};

export function useBottomSheetDismiss({
  onDismiss,
  enabled = true,
}: UseBottomSheetDismissOptions): {
  dragHandleProps: DragHandleProps;
  sheetStyle: CSSProperties;
  isDragging: boolean;
} {
  const dragOffsetRef = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const pointerStartYRef = useRef(0);
  const pointerStartTimeRef = useRef(0);
  const isClosingRef = useRef(false);
  const prefersReducedMotionRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    prefersReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const resetDrag = useCallback(() => {
    dragOffsetRef.current = 0;
    setDragOffset(0);
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  const dismiss = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    onDismiss();
  }, [onDismiss]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      pointerStartYRef.current = event.clientY;
      pointerStartTimeRef.current = performance.now();
      isDraggingRef.current = true;
      setIsDragging(true);
      if (typeof event.currentTarget.setPointerCapture === 'function') {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || !isDraggingRef.current) return;
      const delta = Math.max(0, event.clientY - pointerStartYRef.current);
      dragOffsetRef.current = delta;
      setDragOffset(delta);
    },
    [enabled],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || !isDraggingRef.current) return;
      if (
        typeof event.currentTarget.hasPointerCapture === 'function' &&
        event.currentTarget.hasPointerCapture(event.pointerId)
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setIsDragging(false);
      isDraggingRef.current = false;

      const delta = dragOffsetRef.current;
      const elapsed = Math.max(performance.now() - pointerStartTimeRef.current, 1);

      if (shouldDismissBottomSheetDrag(delta, elapsed)) {
        dismiss();
        return;
      }

      resetDrag();
    },
    [dismiss, enabled, resetDrag],
  );

  const onPointerCancel = useCallback(() => {
    resetDrag();
  }, [resetDrag]);

  useEffect(() => {
    if (enabled) {
      isClosingRef.current = false;
      resetDrag();
    }
  }, [enabled, resetDrag]);

  const sheetStyle: CSSProperties = {
    transform: `translateY(${dragOffset}px)`,
    transition:
      isDragging || prefersReducedMotionRef.current ? 'none' : 'transform 200ms ease-out',
  };

  const dragHandleProps: DragHandleProps = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    style: { touchAction: 'none' },
  };

  return { dragHandleProps, sheetStyle, isDragging };
}
