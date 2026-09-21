'use client';

/**
 * DOČASNÉ LADENIE – NA ODSTRÁNENIE.
 *
 * Pásik na spodku obrazovky s poslednými udalosťami, aby sa dali prečítať na
 * telefóne. Zobrazí sa len s `?debugtabs=1` v adrese; bez neho sa nenazbiera
 * žiadny riadok a komponent nevykreslí nič.
 *
 * `pointer-events: none` je zámerné – pásik nesmie brať dotyky obrazovke pod
 * sebou, inak by prekážal práve tomu testovaniu, kvôli ktorému tam je.
 */

import { useEffect, useState } from 'react';
import { subscribeTabDebug } from './tabDebugLog';

export default function TabDebugPanel() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => subscribeTabDebug(setLines), []);

  if (lines.length === 0) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.82)',
        color: '#7CFC9B',
        font: '10px/1.35 ui-monospace, SFMono-Regular, Menlo, monospace',
        padding: '4px 6px calc(4px + env(safe-area-inset-bottom, 0px))',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}
    >
      {lines.map((line, index) => (
        <div key={`${index}-${line}`}>{line}</div>
      ))}
    </div>
  );
}
