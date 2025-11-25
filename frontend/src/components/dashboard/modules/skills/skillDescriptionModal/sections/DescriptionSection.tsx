'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DescriptionSectionProps {
  description: string;
  onChange: (value: string) => void;
  error: string;
  onErrorChange: (value: string) => void;
  isOpen: boolean;
}

export default function DescriptionSection({
  description,
  onChange,
  error,
  onErrorChange,
  isOpen,
}: DescriptionSectionProps) {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerCoords, setPickerCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setPortalNode(typeof window !== 'undefined' ? document.body : null);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowEmojiPicker(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showEmojiPicker && emojiWrapperRef.current && !emojiWrapperRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showEmojiPicker]);

  const insertAtCursor = (text: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? description.length;
    const end = el.selectionEnd ?? description.length;
    const newValue = description.slice(0, start) + text + description.slice(end);
    if (newValue.length > 100) {
      onErrorChange(t('skills.descriptionTooLong', 'Popis zručnosti môže mať maximálne 100 znakov'));
      return;
    }
    onChange(newValue);
    onErrorChange('');
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleEmojiSelect = (emoji: any) => {
    const native = (emoji && (emoji.native || (emoji.skins && emoji.skins[0] && emoji.skins[0].native))) || '';
    if (!native) return;
    insertAtCursor(native);
  };

  const computePickerPosition = () => {
    const anchor = emojiButtonRef.current;
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = 360;
      const openOnTop = spaceBelow < estimatedHeight;
      const estimatedWidth = 352;
      const margin = 8;
      const left = Math.min(Math.max(rect.right - estimatedWidth, margin), window.innerWidth - estimatedWidth - margin);
      const top = openOnTop ? Math.max(rect.top - estimatedHeight - margin, margin) : Math.min(rect.bottom + margin, window.innerHeight - margin);
      setPickerCoords({ top, left });
    }
  };

  const toggleEmojiPicker = () => {
    computePickerPosition();
    setShowEmojiPicker((s) => !s);
  };

  useEffect(() => {
    if (!showEmojiPicker) return;
    const onScrollOrResize = () => computePickerPosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [showEmojiPicker]);

  const handleChange = (value: string) => {
    if (value.length <= 100) {
      onChange(value);
      onErrorChange('');
    }
  };

  const remainingChars = 100 - description.length;

  return (
    <div className="mb-2 relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={description}
          onChange={(e) => handleChange(e.target.value)}
          placeholder=""
          className="w-full px-3 pt-2 pb-6 pr-20 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none"
          rows={2}
          maxLength={100}
          autoFocus
        />
        <button
          ref={emojiButtonRef}
          type="button"
          onClick={toggleEmojiPicker}
          className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
          aria-label={t('skills.addEmoji', 'Pridať emoji')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
      </div>

      {showEmojiPicker && portalNode && createPortal(
        <div
          ref={emojiWrapperRef}
          className="fixed z-[9999]"
          style={{ top: pickerCoords.top, left: pickerCoords.left }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="auto"
            previewPosition="none"
            skinTonePosition="none"
            navPosition="top"
            searchPosition="top"
            perLine={8}
          />
        </div>,
        portalNode
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        {t('skills.descriptionHint', 'Sem napíš krátky a výstižný popis.')}
      </p>
    </div>
  );
}

