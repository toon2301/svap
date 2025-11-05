'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

interface SkillDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  subcategory: string;
  onSave: (description: string, experience?: { value: number; unit: 'years' | 'months' }, tags?: string[]) => void;
  initialDescription?: string;
  initialExperience?: { value: number; unit: 'years' | 'months' };
  initialTags?: string[];
}

export default function SkillDescriptionModal({ 
  isOpen, 
  onClose, 
  category, 
  subcategory, 
  onSave,
  initialDescription = '',
  initialExperience,
  initialTags = []
}: SkillDescriptionModalProps) {
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [experienceValue, setExperienceValue] = useState<string>('');
  const [experienceUnit, setExperienceUnit] = useState<'years' | 'months'>('years');
  const [experienceError, setExperienceError] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>('');
  const [tagError, setTagError] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [emojiDirection, setEmojiDirection] = useState<'top' | 'bottom'>('bottom');
  const [pickerCoords, setPickerCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiWrapperRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalNode(typeof window !== 'undefined' ? document.body : null);
  }, []);


  // Reset a nastavenie počiatočných hodnôt pri otvorení/zatvorení modalu
  useEffect(() => {
    if (isOpen) {
      setDescription(initialDescription || '');
      setError('');
      setShowEmojiPicker(false);
      if (initialExperience) {
        setExperienceValue(initialExperience.value.toString());
        setExperienceUnit(initialExperience.unit);
      } else {
        setExperienceValue('');
        setExperienceUnit('years');
      }
      setExperienceError('');
      setTags(Array.isArray(initialTags) ? initialTags : []);
      setTagInput('');
      setTagError('');
    } else {
      setDescription('');
      setError('');
      setShowEmojiPicker(false);
      setExperienceValue('');
      setExperienceUnit('years');
      setExperienceError('');
      setTags([]);
      setTagInput('');
      setTagError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);
  
  // Aktualizácia len keď sa zmení initialDescription pri editácii (nie pri každom renderi)
  const prevInitialDescriptionRef = React.useRef<string | undefined>();
  useEffect(() => {
    if (isOpen && initialDescription !== prevInitialDescriptionRef.current) {
      prevInitialDescriptionRef.current = initialDescription;
      if (initialDescription !== undefined) {
        setDescription(initialDescription);
      }
    }
  }, [isOpen, initialDescription]);

  // Zavrie emoji picker pri kliknutí mimo neho
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
    if (newValue.length > 75) {
      setError('Popis zručnosti môže mať maximálne 75 znakov');
      return;
    }
    setDescription(newValue);
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
      const estimatedHeight = 360; // približná výška pickera
      const openOnTop = spaceBelow < estimatedHeight;
      setEmojiDirection(openOnTop ? 'top' : 'bottom');

      const estimatedWidth = 352; // približná šírka pickera
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

  const handleSave = () => {
    const trimmed = description.trim();
    
    if (!trimmed) {
      setError('Popis zručnosti je povinný');
      return;
    }

    if (trimmed.length > 75) {
      setError('Popis zručnosti môže mať maximálne 75 znakov');
      return;
    }

    // Validácia dĺžky praxe (voliteľné)
    let experience: { value: number; unit: 'years' | 'months' } | undefined;
    if (experienceValue.trim()) {
      const numValue = parseFloat(experienceValue.trim());
      if (isNaN(numValue) || numValue <= 0) {
        setExperienceError('Dĺžka praxe musí byť kladné číslo');
        return;
      }
      if (numValue > 100) {
        setExperienceError('Dĺžka praxe nemôže byť väčšia ako 100');
        return;
      }
      experience = {
        value: numValue,
        unit: experienceUnit
      };
    }

    setExperienceError('');
    onSave(trimmed, experience, tags);
    // Modal sa zatvorí automaticky v Dashboard.tsx cez setIsSkillDescriptionModalOpen(false)
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 75) {
      setDescription(value);
      setError('');
    }
  };

  if (!isOpen) return null;

  const remainingChars = 75 - description.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-visible">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold">Opíš svoju zručnosť</h2>
            <button 
              aria-label="Close" 
              onClick={onClose} 
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 pb-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-medium text-gray-800 dark:text-gray-200">{category}</span>
                <span className="mx-2">→</span>
                <span className="text-gray-700 dark:text-gray-300">{subcategory}</span>
              </p>
            </div>

            <div className="mb-2 relative">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={handleChange}
                  placeholder=""
                  className="w-full px-3 py-2 pr-20 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent resize-none"
                  rows={4}
                  maxLength={75}
                  autoFocus
                />
                <button
                  ref={emojiButtonRef}
                  type="button"
                  onClick={toggleEmojiPicker}
                  className="absolute right-2 top-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
                  aria-label="Pridať emoji"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
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

              <div className="flex items-center justify-between mt-2">
                <div className="flex-1">
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                </div>
                <p className={`text-xs ${remainingChars < 10 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {remainingChars} znakov
                </p>
              </div>
            </div>

            {/* Tagy (voliteľné) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <span>Tagy (voliteľné)</span>
                  <div className="relative inline-flex group">
                    <button
                      type="button"
                      className="w-4 h-4 rounded-full bg-gray-400 dark:bg-gray-500 text-white flex items-center justify-center hover:bg-gray-500 dark:hover:bg-gray-400 transition-colors cursor-help"
                      aria-label="Informácie o tagoch"
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 pointer-events-none">
                      <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[280px] leading-relaxed">
                        Hashtagy slúžia na lepšie vyhľadávanie vás a vašich ponúk v aplikácii.
                        <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
              {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {tags.map((tag, idx) => (
                    <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2.5 py-1 text-xs">
                      {tag}
                      <button
                        type="button"
                        aria-label={`Odstrániť tag ${tag}`}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-300 dark:hover:text-purple-200"
                        onClick={() => {
                          setTags((prev) => prev.filter((t) => t !== tag));
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setTagError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const raw = tagInput.trim();
                    if (!raw) return;
                    const candidate = raw.replace(/,+$/g, '');
                    const lower = candidate.toLowerCase();
                    if (tags.some((t) => t.toLowerCase() === lower)) {
                      setTagError('Tento tag už máš pridaný');
                      return;
                    }
                    if (tags.length >= 5) {
                      alert('Môžeš pridať maximálne 5 tagov.');
                      return;
                    }
                    setTags((prev) => [...prev, candidate]);
                    setTagInput('');
                    setTagError('');
                  }
                }}
                placeholder="Napíš tag a stlač Enter alebo ,"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
                aria-label="Vstup pre tagy"
              />
              {tagError && (
                <p className="text-sm text-red-500 mt-1">{tagError}</p>
              )}
            </div>

            {/* Dĺžka praxe */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dĺžka praxe (voliteľné)
              </label>
              <div className="flex items-stretch h-11 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-purple-300 focus-within:border-purple-300 dark:focus-within:border-purple-500 transition-all hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-black">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={experienceValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100)) {
                      setExperienceValue(val);
                      setExperienceError('');
                    }
                  }}
                  placeholder="0"
                  className="flex-1 px-3 py-0 h-full border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="self-stretch w-px bg-gray-300 dark:bg-gray-600"></div>
                <div className="relative flex-shrink-0">
                  <select
                    value={experienceUnit}
                    onChange={(e) => setExperienceUnit(e.target.value as 'years' | 'months')}
                    className="appearance-none px-3 py-0 h-full pr-10 border-0 bg-transparent text-gray-900 dark:text-white focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    <option value="years">rokov</option>
                    <option value="months">mesiacov</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg 
                      className="w-5 h-5 text-gray-400 dark:text-gray-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              {experienceError && (
                <p className="text-sm text-red-500 mt-1">{experienceError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!description.trim()}
              >
                Pridať
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

