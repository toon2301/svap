'use client';

import { useState } from 'react';

type FaqAccordionItemProps = {
  id: string;
  question: string;
  answer: string;
};

export function FaqAccordionItem({ id, question, answer }: FaqAccordionItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = `${id}-panel`;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-black overflow-hidden shadow-sm">
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 px-4 sm:px-5 py-4 text-left font-semibold text-gray-900 dark:text-white hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-inset"
      >
        <span className="text-sm sm:text-base">{question}</span>
        <svg
          className={`w-5 h-5 shrink-0 text-purple-600 dark:text-purple-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={id}
        hidden={!open}
        className="px-4 sm:px-5 pb-4"
      >
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
          {answer}
        </p>
      </div>
    </div>
  );
}

type FaqAccordionProps = {
  items: readonly FaqAccordionItemProps[];
};

export default function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FaqAccordionItem key={item.id} {...item} />
      ))}
    </div>
  );
}
