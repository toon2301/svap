'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearDashboardDebugLog,
  isDashboardDebugOptInEnabled,
  type DashboardDebugEntry,
} from '@/utils/debug/dashboardDebug';

function readDashboardDebugEntries(): DashboardDebugEntry[] {
  if (typeof window === 'undefined') return [];
  return window.__dashboardDebug?.getLog() ?? [];
}

export default function DashboardDebugPanel() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [entries, setEntries] = useState<DashboardDebugEntry[]>([]);

  useEffect(() => {
    setIsEnabled(isDashboardDebugOptInEnabled());
  }, []);

  const refreshEntries = useCallback(() => {
    setEntries(readDashboardDebugEntries());
  }, []);

  useEffect(() => {
    if (!isEnabled || !isOpen) return;
    refreshEntries();
  }, [isEnabled, isOpen, refreshEntries]);

  const logText = useMemo(() => JSON.stringify(entries, null, 2), [entries]);

  const handleToggleOpen = useCallback(() => {
    setIsCopied(false);
    setIsOpen((prev) => {
      const next = !prev;
      if (!prev) {
        refreshEntries();
      }
      return next;
    });
  }, [refreshEntries]);

  const handleCopy = useCallback(async () => {
    const nextEntries = readDashboardDebugEntries();
    const nextText = JSON.stringify(nextEntries, null, 2);
    setEntries(nextEntries);

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(nextText);
        setIsCopied(true);
        return;
      }
    } catch {
      // fall through to open panel
    }

    setIsCopied(false);
    setIsOpen(true);
  }, []);

  const handleClear = useCallback(() => {
    clearDashboardDebugLog();
    setEntries([]);
    setIsCopied(false);
  }, []);

  const handleDisable = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.__dashboardDebug?.disable();
    }
    setIsCopied(false);
    setIsOpen(false);
    setEntries([]);
    setIsEnabled(false);
  }, []);

  if (!isEnabled) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[120] flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full bg-black/80 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur transition hover:bg-black"
        >
          {isCopied ? 'Debug skopirovany' : 'Kopirovat debug'}
        </button>
        <button
          type="button"
          onClick={handleToggleOpen}
          className="rounded-full bg-purple-700 px-3 py-2 text-xs font-medium text-white shadow-lg transition hover:bg-purple-800"
        >
          {isOpen ? 'Zatvorit debug' : 'Zobrazit debug'}
        </button>
      </div>

      {isOpen ? (
        <div className="fixed inset-x-3 bottom-20 z-[120] rounded-2xl border border-gray-300 bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 md:left-auto md:right-4 md:w-[28rem]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Dashboard debug</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Zaznamov: {entries.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshEntries}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Obnovit
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Vymazat
              </button>
              <button
                type="button"
                onClick={handleDisable}
                className="rounded-lg border border-red-300 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/30"
              >
                Vypnut
              </button>
            </div>
          </div>

          <textarea
            readOnly
            value={logText}
            className="min-h-[16rem] w-full rounded-xl border border-gray-300 bg-gray-50 p-3 font-mono text-[11px] leading-5 text-gray-800 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            spellCheck={false}
          />
        </div>
      ) : null}
    </>
  );
}
