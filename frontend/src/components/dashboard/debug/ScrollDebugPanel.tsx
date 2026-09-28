'use client';

/**
 * [DEBUG ?debugscroll=1 – DOČASNÉ, ODSTRÁNIŤ]
 *
 * Ladiaci pásik scrollu pre skutočný iPhone: `?debugscroll=1` zapne,
 * `?debugscroll=0` vypne a zmaže záznam (stav v sessionStorage). Odchod
 * z dashboardu (odhlásenie, neplatná session) meranie ukončí a záznam
 * s príznakom zmaže; rovnako remount či návrat z bfcache po vypnutí.
 * Bez príznaku sa nič neinštaluje a panel nevykreslí nič.
 * Pred mountom tiež nič (žiadny hydration mismatch).
 *
 * Panel je hore cez hlavičku, prepúšťa dotyky (pointer-events: none) okrem
 * tlačidiel a číta záznam z vlastného externého store – nový riadok
 * neprekreslí DashboardLayout, len panel. Texty sú zámerne len slovensky:
 * dočasný nástroj pre testera, nie používateľské UI.
 */

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SCROLL_DEBUG_PANEL_ATTR, environmentLine } from './scrollDebugDom';
import { endScrollDebugSession, installScrollDebug } from './scrollDebugInstall';
import {
  clearScrollDebugLog,
  currentDebugClick,
  formatScrollDebugCopy,
  getScrollDebugLines,
  getServerScrollDebugLines,
  isScrollDebugFlagStored,
  logDebugLine,
  resolveScrollDebugFlag,
  subscribeScrollDebugLog,
} from './scrollDebugLog';
import { scrollDebugState } from './scrollDebugState';

const VISIBLE_LINES = 8;
const USER_MARKS = ['OK', 'ZOSPODU', 'BEZ ZVÝRAZNENIA'] as const;

const PANEL_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 'env(safe-area-inset-top, 0px)',
  left: 0,
  right: 0,
  maxHeight: 90,
  zIndex: 2147483000,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  pointerEvents: 'none',
  background: 'rgba(0, 0, 0, 0.6)',
  color: '#d1fae5',
  font: '9px/10px ui-monospace, SFMono-Regular, Menlo, monospace',
  WebkitTextSizeAdjust: '100%',
};

const BUTTON_ROW_STYLE: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'nowrap',
  alignItems: 'center',
  gap: 3,
  padding: '1px 2px',
};

const BUTTON_STYLE: React.CSSProperties = {
  pointerEvents: 'auto',
  font: 'inherit',
  lineHeight: '14px',
  padding: '0 4px',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  borderRadius: 3,
  background: 'rgba(255, 255, 255, 0.12)',
  color: '#fff',
  whiteSpace: 'nowrap',
};

const LOG_STYLE: React.CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  padding: '0 2px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};

function lineColor(line: string): string | undefined {
  if (line.includes('!!!')) return '#fca5a5';
  if (line.includes(' USER ')) return '#fde68a';
  if (line.includes(' CLICK ')) return '#93c5fd';
  return undefined;
}

/**
 * Schránka: Clipboard API, inak skrytý textarea VNÚTRI panela a execCommand.
 * `preventScroll` – fokus nesmie posunúť stránku.
 */
async function copyToClipboard(text: string, host: HTMLElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // skúsi sa záložná cesta
  }
  if (!host) return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.setAttribute('aria-hidden', 'true');
  Object.assign(textarea.style, { position: 'fixed', top: '0', left: '0', width: '1px', height: '1px', opacity: '0' });
  host.appendChild(textarea);
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    host.removeChild(textarea);
  }
}

function ScrollDebugPanelView() {
  const lines = useSyncExternalStore(subscribeScrollDebugLog, getScrollDebugLines, getServerScrollDebugLines);
  const panelRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('');
  const firstVisible = Math.max(0, lines.length - VISIBLE_LINES);

  const markUser = (mark: (typeof USER_MARKS)[number]) => {
    logDebugLine(`USER ${mark} @C${currentDebugClick().n}`);
    setStatus(mark);
  };

  const copy = async () => {
    let environment = 'ENV ?';
    try {
      environment = environmentLine();
    } catch {
      // hlavička bez štýlov
    }
    const all = getScrollDebugLines();
    const ok = await copyToClipboard(formatScrollDebugCopy(environment, all), panelRef.current);
    setStatus(ok ? `skopírované ${all.length}` : 'kopírovanie zlyhalo');
  };

  return (
    <div ref={panelRef} {...{ [SCROLL_DEBUG_PANEL_ATTR]: '' }} style={PANEL_STYLE}>
      <div style={BUTTON_ROW_STYLE}>
        {USER_MARKS.map((mark) => (
          <button key={mark} type="button" style={BUTTON_STYLE} onClick={() => markUser(mark)}>
            {mark}
          </button>
        ))}
        <button type="button" style={BUTTON_STYLE} onClick={copy}>
          Kopírovať
        </button>
        <button
          type="button"
          style={BUTTON_STYLE}
          onClick={() => {
            clearScrollDebugLog();
            setStatus('vymazané');
          }}
        >
          Vymazať
        </button>
        <span>{status}</span>
      </div>
      <div style={LOG_STYLE}>
        {lines.slice(firstVisible).map((line, index) => (
          <div key={firstVisible + index} style={{ color: lineColor(line) }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScrollDebugPanel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!resolveScrollDebugFlag()) {
      // Vypnuté, no v tejto stránke pásik ešte beží (remount) – koniec.
      if (scrollDebugState.active) endScrollDebugSession();
      return;
    }
    installScrollDebug();
    setEnabled(true);
    // Späť z bfcache: stránka ožije so starým stavom, hoci ju iné načítanie
    // (?debugscroll=0) medzitým vypnulo – inak by merala a ukladala ďalej.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || isScrollDebugFlagStored()) return;
      endScrollDebugSession();
      setEnabled(false);
    };
    window.addEventListener('pageshow', onPageShow);
    // Remount v rámci dashboardu meranie nekončí (hooky patria stránke).
    // Odchod z neho áno – odhlásenie a neplatná session idú na '/' bez reloadu.
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      if (!window.location.pathname.startsWith('/dashboard')) endScrollDebugSession();
    };
  }, []);

  return enabled ? <ScrollDebugPanelView /> : null;
}

/**
 * memo: panel nemá props, takže ho prekreslenie DashboardLayout (navigácia
 * počas okna po kliku) neprekreslí – inak by si `useSyncExternalStore`
 * prečítal nové riadky a zadržanie výstupu počas okna by obišiel.
 */
export default React.memo(ScrollDebugPanel);
