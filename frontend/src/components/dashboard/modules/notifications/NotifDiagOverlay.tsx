'use client';

import { useSyncExternalStore } from 'react';

import { getDiagSnapshot, subscribeDiag } from './notifDiag';

const VISIBLE_LINES = 15;

/** DOČASNÁ DIAGNOSTIKA (vetva 134-diag) – NEZLUČOVAŤ. Priehľadný výpis nad spodnou navigáciou. */
export default function NotifDiagOverlay() {
  const text = useSyncExternalStore(subscribeDiag, getDiagSnapshot, () => '');
  if (!text) return null;

  return (
    <pre
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 84,
        zIndex: 99999,
        margin: 0,
        padding: '4px 6px',
        font: '10px/1.25 ui-monospace, Menlo, monospace',
        color: '#fff',
        background: 'rgba(0,0,0,0.8)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        pointerEvents: 'none',
      }}
    >
      {text.split('\n').slice(-VISIBLE_LINES).join('\n')}
    </pre>
  );
}
