'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DetailedDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  initialValue?: string;
}

const MAX_LENGTH = 1000;

export default function DetailedDescriptionModal({
  isOpen,
  onClose,
  onSave,
  initialValue = '',
}: DetailedDescriptionModalProps) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerCoords, setPickerCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const target = document.getElementById('app-root') ?? document.body;
    setPortalNode(target);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue || '');
      setError('');
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else {
      setValue('');
      setError('');
      setShowEmojiPicker(false);
    }
  }, [isOpen, initialValue]);

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
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + text + value.slice(end);
    if (newValue.length > MAX_LENGTH) {
      setError(t('skills.detailedDescriptionTooLong', `Podrobný popis môže mať maximálne ${MAX_LENGTH} znakov.`));
      return;
    }
    setValue(newValue);
    setError('');
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

  if (!isOpen) return null;

  const remaining = MAX_LENGTH - value.length;

  const handleSave = () => {
    const trimmed = value.trim();
    setError('');
    onSave(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold">
              {t('skills.detailedDescriptionTitle', 'Pridaj podrobný opis')}
            </h2>
            <button
              aria-label={t('common.close', 'Zavrieť')}
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t(
                'skills.detailedDescriptionHint',
                'Opíš detaily služby – postup, čo je zahrnuté, očakávania a výsledok.',
              )}
            </p>

            <div className="relative">
              <textarea
                ref={textareaRef}
                rows={10}
                value={value}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_LENGTH) {
                    setValue(e.target.value);
                    setError('');
                  }
                }}
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-black px-4 pt-3 pb-8 pr-20 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none overflow-y-auto subtle-scrollbar"
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
              <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-500">
                {remaining}
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
              >
                {t('common.cancel', 'Zrušiť')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-purple-600 text-white px-4 py-2 hover:bg-purple-700 transition-colors"
              >
                {t('common.save', 'Uložiť')}
              </button>
            </div>
          </div>
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
    </div>
  );
}


