'use client';

import React, { useEffect, useRef, useState } from 'react';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DescriptionSectionProps {
  description: string;
  onChange: (value: string) => void;
  error: string;
  onErrorChange: (value: string) => void;
  isOpen: boolean;
  isSeeking?: boolean;
}

export default function DescriptionSection({
  description,
  onChange,
  error,
  onErrorChange,
  isOpen,
  isSeeking = false,
}: DescriptionSectionProps) {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleChange = (value: string) => {
    if (value.length <= 100) {
      onChange(value);
      onErrorChange('');
    }
  };

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? description.length;
    const end = el.selectionEnd ?? description.length;
    const current = description;

    const before = current.slice(0, start);
    const after = current.slice(end);

    const maxExtra = 100 - current.length + (end - start);
    if (maxExtra <= 0) return;

    const toInsert = text.slice(0, maxExtra);
    const newValue = before + toInsert + after;

    handleChange(newValue);

    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + toInsert.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleEmojiSelect = (emoji: any) => {
    const native = (emoji && (emoji.native || (emoji.skins && emoji.skins[0] && emoji.skins[0].native))) || '';
    if (!native) return;
    insertAtCursor(native);
  };

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (emojiWrapperRef.current && !emojiWrapperRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const remainingChars = 100 - description.length;

  return (
    <div className="mb-2 relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          className="w-full px-3 pt-2 pb-6 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none skill-description-textarea-scrollbar"
          rows={2}
          maxLength={100}
          autoFocus
        />
        <button
          type="button"
          onClick={() => setShowEmojiPicker((s) => !s)}
          className="absolute right-1.5 top-0.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          aria-label={t('skills.addEmoji', 'Pridať emoji')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end pr-3 pb-2">
          <span
            className={`text-xs font-medium ${
              remainingChars < 10 ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'
            }`}
            aria-live="polite"
            aria-atomic="true"
            title={t('skills.charsSuffix', 'znakov')}
          >
            {remainingChars}
          </span>
        </div>

        {showEmojiPicker && (
          <div
            ref={emojiWrapperRef}
            className="absolute z-20 right-0 top-10 shadow-lg border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="subtle-scrollbar max-h-[320px] overflow-y-auto rounded-xl">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="auto"
                previewPosition="none"
                skinTonePosition="none"
                navPosition="top"
                searchPosition="top"
                perLine={7}
              />
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {isSeeking
          ? t('skills.descriptionHintSeeking', 'Sem napíš krátky a výstižný popis čo hľadáš')
          : t('skills.descriptionHint', 'Sem napíš krátky a výstižný popis.')}
      </p>
    </div>
  );
}

 