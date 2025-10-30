'use client';

import React from 'react';
import styles from './SkillsCategoryModal.module.css';

interface SkillsCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  selected?: string | null;
  onSelect: (value: string) => void;
}

export default function SkillsCategoryModal({ isOpen, onClose, categories, selected, onSelect }: SkillsCategoryModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={onClose}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold">Kategória</h2>
            <button aria-label="Close" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className={`px-2 pb-4 ${styles.scrollArea}`}>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#111] text-left"
              >
                <span className="text-sm">{name}</span>
                {selected === name && (
                  <svg className="w-4 h-4 text-gray-800 dark:text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


