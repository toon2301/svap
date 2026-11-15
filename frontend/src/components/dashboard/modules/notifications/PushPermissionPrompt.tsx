'use client';

import { useId } from 'react';

import type { PushPromptLabels, PushPromptProps } from './settingsTypes';

type PushPermissionPromptProps = {
  prompt: PushPromptProps;
  labels: PushPromptLabels;
  /** `data-testid` oblasti; rozloženie na počítači a na mobile ho majú rozdielny, lebo sú v DOM obe naraz. */
  testId: string;
};

/**
 * Výzva na povolenie push upozornení pre Správy v Nastaveniach → Upozornenia (nález 321, etapa 3b, R36 a). Pomenovaná
 * oblasť s nadpisom, textom a tlačidlami: „Zapnúť“ (len pri `enable`) vyžiada povolenie priamo v obsluhe kliknutia, kvôli
 * geste používateľa, a kým beží ukladanie alebo iná akcia, je zakázané; „Nie teraz“ výzvu skryje. Pri `ios-install` je
 * namiesto bežného textu návod pre iPhone a tlačidlo na povolenie chýba (mimo nainštalovanej aplikácie by nič neurobilo).
 * Pri `null` sa nevykreslí nič. Rozloženia na počítači aj na mobile sú v DOM obe, preto má každá výzva vlastný `useId`.
 * Komponent nepozná hooky ani server, dostáva len hotový stav a preložené texty.
 */
export default function PushPermissionPrompt({ prompt, labels, testId }: PushPermissionPromptProps) {
  const titleId = useId();

  if (prompt.variant === null) {
    return null;
  }

  return (
    <section
      aria-labelledby={titleId}
      data-testid={testId}
      className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-[#101011]"
    >
      <h4 id={titleId} className="text-sm font-medium text-gray-900 dark:text-white">
        {labels.title}
      </h4>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        {prompt.variant === 'ios-install' ? labels.iosGuide : labels.body}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {prompt.variant === 'enable' && (
          <button
            type="button"
            onClick={() => prompt.enable()}
            disabled={prompt.disabled}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {labels.enable}
          </button>
        )}
        <button
          type="button"
          onClick={() => prompt.dismiss()}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500/35 dark:border-gray-700 dark:bg-[#101011] dark:text-gray-200 dark:hover:bg-gray-900"
        >
          {labels.dismiss}
        </button>
      </div>
    </section>
  );
}
