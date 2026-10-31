'use client';

import { useEffect, type RefObject } from 'react';
import { forgetSearchScroll, prepareSearchScrollRefresh, readSearchScroll, refreshSearchScroll } from './searchScrollMemory';

export const SEARCH_SCROLL_RESTORE_TIMEOUT_MS = 6000;
const USER_INPUT_EVENTS = ['touchstart', 'wheel', 'keydown', 'mousedown'] as const;

/** Restore the nested main after real results, never merely because skeletons are tall. */
export function useSearchScrollRestoration(
  mainRef: RefObject<HTMLElement | null>,
  viewerId: number | null | undefined,
): void {
  useEffect(() => {
    const snapshot = readSearchScroll(viewerId);
    const main = mainRef.current;
    if (!snapshot || !main) return;

    let stopped = false;
    let frame = 0;
    let initialFrames = 0;
    let deadlinePassed = false;
    let trackingFrame: number | null = null;
    let pendingCommit: (() => void) | null = null;
    let trackingStopped = false;
    const url = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    const stop = () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      clearTimeout(timeout);
      mutations.disconnect();
      resize?.disconnect();
      USER_INPUT_EVENTS.forEach((name) => main.removeEventListener(name, abandon, true));
      window.removeEventListener('popstate', stop);
      window.removeEventListener('resize', schedule);
      main.removeEventListener('load', schedule, true);
    };
    const abandon = () => {
      stop();
      forgetSearchScroll(snapshot.id);
    };
    const ready = () => !main.querySelector('[data-search-loading="true"]');
    const stillCurrent = () => mainRef.current === main
      && `${window.location.pathname}${window.location.search}${window.location.hash}` === url;
    const flushTracking = () => {
      if (trackingFrame !== null) window.cancelAnimationFrame(trackingFrame);
      trackingFrame = null;
      const commit = pendingCommit;
      pendingCommit = null;
      // Commit the last verified source position, even if navigation already detached its main.
      commit?.();
    };
    const stopTracking = () => {
      if (trackingStopped) return;
      trackingStopped = true;
      flushTracking();
      main.removeEventListener('scroll', trackScroll);
      window.removeEventListener('popstate', stopTracking);
      window.removeEventListener('pagehide', flushTracking);
    };
    const trackScroll = () => {
      if (trackingStopped) return;
      if (!stillCurrent()) { stopTracking(); return; }
      pendingCommit = prepareSearchScrollRefresh(snapshot.id, main.scrollTop);
      if (trackingFrame !== null) return;
      const scheduledFrame: number = window.requestAnimationFrame(() => {
        if (trackingFrame !== scheduledFrame) return;
        trackingFrame = null;
        if (!stillCurrent()) { stopTracking(); return; }
        flushTracking();
      });
      trackingFrame = scheduledFrame;
    };
    const finish = (top: number) => {
      main.scrollTop = top;
      stop();
      // Repeated history returns retain this entry, but never its pre-scroll or pre-clamp position.
      refreshSearchScroll(snapshot.id, main.scrollTop);
      main.addEventListener('scroll', trackScroll, { passive: true });
      window.addEventListener('popstate', stopTracking);
      window.addEventListener('pagehide', flushTracking);
    };
    const timeout = setTimeout(() => {
      // This bounds layout growth, not a slow request's lifetime.
      deadlinePassed = true;
      schedule();
    }, SEARCH_SCROLL_RESTORE_TIMEOUT_MS);

    const attempt = () => {
      if (stopped) return;
      if (!stillCurrent()) { stop(); return; }
      // Child passive effects first switch the initial empty render to loading.
      initialFrames += 1;
      if (initialFrames <= 2) { schedule(); return; }
      if (!ready()) return;
      const available = Math.max(0, main.scrollHeight - main.clientHeight);
      if (available >= snapshot.top || deadlinePassed) {
        finish(Math.min(snapshot.top, available));
        return;
      }
    };

    function schedule() {
      if (stopped) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(attempt);
    }

    // API, image and layout changes wake restoration; slow requests do not keep polling frames.
    const mutations = new MutationObserver(schedule);
    mutations.observe(main, { childList: true, subtree: true, attributes: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resize?.observe(main);
    if (main.firstElementChild) resize?.observe(main.firstElementChild);

    USER_INPUT_EVENTS.forEach((name) => main.addEventListener(name, abandon, { capture: true, passive: true }));
    window.addEventListener('popstate', stop);
    window.addEventListener('resize', schedule);
    main.addEventListener('load', schedule, true);
    schedule();
    return () => { stop(); stopTracking(); };
  }, [mainRef, viewerId]);
}
