'use client';

import React, { ReactNode } from 'react';

interface MobileFullScreenModalProps {
  isOpen: boolean;
  title: ReactNode;
  onBack: () => void;
  onSave: () => void;
  children: ReactNode;
}

export default function MobileFullScreenModal({ isOpen, title, onBack, onSave, children }: MobileFullScreenModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex flex-col">
      <div className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <button onClick={onBack} aria-label="Späť" className="p-2 -ml-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        <button onClick={onSave} aria-label="Uložiť" className="p-2 -mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </button>
      </div>
      <div className="flex-1 bg-white dark:bg-black p-4">{children}</div>
    </div>
  );
}


