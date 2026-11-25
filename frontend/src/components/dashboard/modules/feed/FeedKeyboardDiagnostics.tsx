'use client';

/**
 * Skrytý prekryv s hodnotami viditeľnej plochy pri klávesnici (nálezy 375 až 377, kolo 3c).
 *
 * Kým je diagnostika vypnutá (predvolene), komponent nevykreslí nič. Zapnutý kreslí do `body` malý nedotknuteľný blok s číslami
 * z `feedKeyboardDiagnostics.ts` a obnovuje ich pri každej udalosti `visualViewport` a pravidelne. Pozri tam, ako sa zapína.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  collectKeyboardDiagnostics,
  formatKeyboardDiagnostics,
  useKeyboardDiagnosticsFlag,
  type DiagnosticsCounters,
} from './feedKeyboardDiagnostics';

/** Ako často sa čísla obnovujú aj bez udalostí (ms). */
export const KEYBOARD_DIAGNOSTICS_REFRESH_MS = 250;

type FeedKeyboardDiagnosticsProps = {
  /** Názov v prvom riadku („panel“ alebo „detail“); detail sa kreslí vpravo, aby sa dve vrstvy nezakrývali. */
  label: string;
  /** `data-testid` vrstvy, ktorej poloha sa meria. */
  layerTestId: string;
  /** `data-testid` panela komentárov (len pri prehliadači fotky). */
  panelTestId?: string;
};

function DiagnosticsOverlay({ label, layerTestId, panelTestId }: FeedKeyboardDiagnosticsProps) {
  const counters = useRef<DiagnosticsCounters>({ resize: 0, scroll: 0, lastEventAt: null });
  const [text, setText] = useState('');

  useEffect(() => {
    const refresh = () => {
      const now = performance.now();
      setText(
        formatKeyboardDiagnostics(
          label,
          collectKeyboardDiagnostics(layerTestId, panelTestId ?? null, counters.current, now),
          new Date().toTimeString().slice(0, 8),
        ),
      );
    };
    const onResize = () => {
      counters.current.resize += 1;
      counters.current.lastEventAt = performance.now();
      refresh();
    };
    const onScroll = () => {
      counters.current.scroll += 1;
      counters.current.lastEventAt = performance.now();
      refresh();
    };
    const viewport = window.visualViewport;
    refresh();
    viewport?.addEventListener('resize', onResize);
    viewport?.addEventListener('scroll', onScroll);
    const timer = window.setInterval(refresh, KEYBOARD_DIAGNOSTICS_REFRESH_MS);
    return () => {
      viewport?.removeEventListener('resize', onResize);
      viewport?.removeEventListener('scroll', onScroll);
      window.clearInterval(timer);
    };
  }, [label, layerTestId, panelTestId]);

  return createPortal(
    <pre
      aria-hidden="true"
      data-testid="feed-kbd-diagnostics"
      className={`pointer-events-none fixed top-[62px] z-[300] m-0 whitespace-pre rounded bg-black/80 px-1.5 py-1 font-mono text-[10px] leading-[12px] text-lime-300 ${
        label === 'detail' ? 'right-1' : 'left-1'
      }`}
    >
      {text}
    </pre>,
    document.body,
  );
}

export default function FeedKeyboardDiagnostics(props: FeedKeyboardDiagnosticsProps) {
  const enabled = useKeyboardDiagnosticsFlag();
  return enabled ? <DiagnosticsOverlay {...props} /> : null;
}
