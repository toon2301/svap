'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useLanguage } from '@/contexts/LanguageContext';

type SkillImage = {
  id?: number;
  image_url?: string | null;
  image?: string | null;
  order?: number;
};

const CURRENCY_OPTIONS = ['€', 'Kč', '$', 'zł', 'Ft'] as const;
type CurrencyOption = typeof CURRENCY_OPTIONS[number];

const currencyFromLocale = (locale: string): CurrencyOption => {
  if (locale === 'pl') return 'zł';
  if (locale === 'hu') return 'Ft';
  if (locale === 'cs') return 'Kč';
  // de, sk, en → default to Euro in this app
  return '€';
};

const ensureCurrencyOption = (value?: string | null): CurrencyOption => {
  if (value && CURRENCY_OPTIONS.includes(value as CurrencyOption)) {
    return value as CurrencyOption;
  }
  return '€';
};

function CurrencySelect({ value, onChange }: { value: CurrencyOption; onChange: (v: CurrencyOption) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    setPortalRoot(typeof window !== 'undefined' ? document.body : null);
  }, []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(96, rect.width);
    const estimatedMenuH = CURRENCY_OPTIONS.length * 36 + 12; // approx height
    const gap = 6;
    const canOpenDown = rect.bottom + gap + estimatedMenuH <= window.innerHeight;
    const top = canOpenDown ? rect.bottom + gap : Math.max(8, rect.top - gap - estimatedMenuH);
    const left = rect.left + rect.width - width;
    setPos({ left, top, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const handleReflow = () => updatePosition();
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [open]);

  return (
    <div className="relative h-full flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(updatePosition);
          }
        }}
        className="relative h-full flex items-center gap-2 px-3 pr-9 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 rounded-r-lg cursor-pointer"
      >
        {value}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && portalRoot && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-[#0d0d10]/95 backdrop-blur-sm shadow-[0_12px_30px_rgba(99,102,241,0.18)] overflow-hidden z-[9999] p-1"
        >
          {CURRENCY_OPTIONS.map((cur) => (
            <button
              key={cur}
              role="option"
              aria-selected={value === cur}
              onClick={() => {
                onChange(cur);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 ${
                value === cur
                  ? 'bg-purple-100 text-purple-700 font-semibold dark:bg-purple-900/30 dark:text-purple-200'
                  : 'text-gray-800 hover:bg-gray-100/90 dark:text-gray-100 dark:hover:bg-[#18181c]'
              }`}
            >
              {cur}
            </button>
          ))}
        </div>,
        portalRoot
      )}
    </div>
  );
}

const UNIT_OPTIONS = [
  { value: 'years' as const, label: 'rokov' },
  { value: 'months' as const, label: 'mesiacov' },
];

type UnitOption = typeof UNIT_OPTIONS[number]['value'];

function ExperienceUnitSelect({ value, onChange }: { value: UnitOption; onChange: (v: UnitOption) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);

  useEffect(() => {
    setPortalRoot(typeof window !== 'undefined' ? document.body : null);
  }, []);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(120, rect.width);
    const estimatedMenuH = UNIT_OPTIONS.length * 36 + 12;
    const gap = 6;
    const canOpenDown = rect.bottom + gap + estimatedMenuH <= window.innerHeight;
    const top = canOpenDown ? rect.bottom + gap : Math.max(8, rect.top - gap - estimatedMenuH);
    const left = rect.left + rect.width - width;
    setPos({ left, top, width });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const handleReflow = () => updatePosition();
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [open]);

  const labelFor = (opt: UnitOption) => UNIT_OPTIONS.find(o => o.value === opt)?.label || opt;

  return (
    <div className="relative h-full flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            requestAnimationFrame(updatePosition);
          }
        }}
        className="relative h-full flex items-center gap-2 px-3 pr-9 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 rounded-r-lg cursor-pointer"
      >
        {labelFor(value)}
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 dark:text-gray-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && portalRoot && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width }}
          className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-[#0d0d10]/95 backdrop-blur-sm shadow-[0_12px_30px_rgba(99,102,241,0.18)] overflow-hidden z-[9999] p-1"
        >
          {UNIT_OPTIONS.map(({ value: v, label }) => (
            <button
              key={v}
              role="option"
              aria-selected={value === v}
              onClick={() => {
                onChange(v);
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 dark:focus-visible:ring-purple-600 ${
                value === v
                  ? 'bg-purple-100 text-purple-700 font-semibold dark:bg-purple-900/30 dark:text-purple-200'
                  : 'text-gray-800 hover:bg-gray-100/90 dark:text-gray-100 dark:hover:bg-[#18181c]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>,
        portalRoot
      )}
    </div>
  );
}

interface SkillDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  subcategory: string;
  onSave: (description: string, experience?: { value: number; unit: 'years' | 'months' }, tags?: string[], images?: File[], priceFrom?: number | null, priceCurrency?: string) => void;
  initialDescription?: string;
  initialExperience?: { value: number; unit: 'years' | 'months' };
  initialTags?: string[];
  initialImages?: SkillImage[];
  onRemoveExistingImage?: (imageId: number) => Promise<SkillImage[] | void>;
  initialPriceFrom?: number | null;
  initialPriceCurrency?: string;
}

export default function SkillDescriptionModal({ 
  isOpen, 
  onClose, 
  category, 
  subcategory, 
  onSave,
  initialDescription = '',
  initialExperience,
  initialTags = [],
  initialImages = [],
  onRemoveExistingImage,
  initialPriceFrom = null,
  initialPriceCurrency = '€',
}: SkillDescriptionModalProps) {
  const { locale } = useLanguage();
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
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string>('');
  const [existingImages, setExistingImages] = useState<SkillImage[]>([]);
  const [removingImageId, setRemovingImageId] = useState<number | null>(null);
  const [priceFrom, setPriceFrom] = useState<string>('');
  const [priceCurrency, setPriceCurrency] = useState<CurrencyOption>('€');
  const [userTouchedCurrency, setUserTouchedCurrency] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string>('');

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
      setImages([]);
      setImagePreviews([]);
      setImageError('');
      setExistingImages(Array.isArray(initialImages) ? initialImages : []);
      setPriceFrom(initialPriceFrom !== null && initialPriceFrom !== undefined ? String(initialPriceFrom) : '');
      // Default currency: if incoming is invalid/empty and no initial price, use language-based default
      if ((initialPriceCurrency ?? '') === '' && (initialPriceFrom === null || initialPriceFrom === undefined)) {
        setPriceCurrency(currencyFromLocale(locale));
      } else {
        setPriceCurrency(ensureCurrencyOption(initialPriceCurrency));
      }
      setUserTouchedCurrency(false);
      setPriceError('');
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
      setImages([]);
      setImagePreviews([]);
      setImageError('');
      setExistingImages([]);
      setPriceFrom('');
      setPriceCurrency(currencyFromLocale(locale));
      setUserTouchedCurrency(false);
      setPriceError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Aktualizuj existujúce obrázky pri zmene prop počas otvoreného modalu
  useEffect(() => {
    if (isOpen) {
      setExistingImages(Array.isArray(initialImages) ? initialImages : []);
      // priceFrom a priceCurrency neresetuj počas editácie, nech sa dá plynule písať
    }
  }, [initialImages, isOpen]);
  
  // Keď sa zmení jazyk a používateľ ešte nemenil menu, prispôsob menu automaticky
  useEffect(() => {
    if (!isOpen) return;
    if (userTouchedCurrency) return;
    const hasNoPrice = !priceFrom || priceFrom.trim() === '';
    if (hasNoPrice) {
      setPriceCurrency(currencyFromLocale(locale));
    }
  }, [locale, isOpen, userTouchedCurrency, priceFrom]);

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
    let priceValue: number | null = null;
    if (priceFrom.trim()) {
      const parsed = parseFloat(priceFrom.trim().replace(',', '.'));
      if (isNaN(parsed) || parsed < 0) {
        setPriceError('Cena musí byť nezáporné číslo');
        return;
      }
      priceValue = parsed;
    }
    setPriceError('');
    onSave(trimmed, experience, tags, images, priceValue, priceCurrency);
    // Modal sa zatvorí automaticky v Dashboard.tsx cez setIsSkillDescriptionModalOpen(false)
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 75) {
      setDescription(value);
      setError('');
    }
  };

  const remainingChars = 75 - description.length;
  const validExistingImages = React.useMemo(() => {
    const result: SkillImage[] = [];
    const seen = new Set<string>();
    for (const img of existingImages) {
      const src = img?.image_url || img?.image || '';
      if (!src) continue;
      const key = img?.id ? `id-${img.id}` : `src-${src}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(img);
    }
    return result;
  }, [existingImages]);
  const totalImagesCount = validExistingImages.length + imagePreviews.length;
  const maxImages = 6;

  if (!isOpen) return null;

  const handleRemoveExistingImage = async (imageId: number) => {
    if (!onRemoveExistingImage) return;
    setRemovingImageId(imageId);
    try {
      const updated = await onRemoveExistingImage(imageId);
      if (Array.isArray(updated)) {
        setExistingImages(updated);
      } else {
        setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Odstránenie obrázka zlyhalo.';
      alert(msg);
    } finally {
      setRemovingImageId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-visible">
          <div className="flex items-center justify-between px-6 pt-6 pb-3">
            <h2 className="text-xl font-semibold">Opíš svoju službu/zručnosť</h2>
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
                <div className="mb-2 flex flex-wrap gap-x-2 gap-y-px leading-[12px]">
                  {tags.map((tag, idx) => (
                    <span key={`${tag}-${idx}`} className="text-[11px] text-purple-700 dark:text-purple-300 leading-[12px]">
                      #{tag}
                      <button
                        type="button"
                        aria-label={`Odstrániť tag ${tag}`}
                        className="ml-1 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 align-baseline"
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

            {/* Obrázky (voliteľné) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fotky (voliteľné, max. 6)
              </label>
              {imageError && <p className="text-sm text-red-500 mb-2">{imageError}</p>}
              <div className="flex flex-wrap gap-3">
                {validExistingImages.length > 0 && (
                  <div className="basis-full text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Nahrané fotky
                  </div>
                )}
                {validExistingImages.map((img) => {
                  const src = img.image_url || img.image || '';
                  const isRemoving = removingImageId === img.id;
                  return (
                    <div key={`${img.id ?? src}`} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                      <img src={src} alt="Existujúca fotka" className={`w-full h-full object-cover transition-opacity ${isRemoving ? 'opacity-50' : 'opacity-100'}`} />
                      {onRemoveExistingImage && img.id ? (
                        <button
                          type="button"
                          aria-label="Odstrániť existujúcu fotku"
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/80 transition"
                          onClick={() => handleRemoveExistingImage(img.id!)}
                          disabled={isRemoving}
                        >
                          {isRemoving ? (
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8" />
                            </svg>
                          ) : (
                            '×'
                          )}
                        </button>
                      ) : null}
                    </div>
                  );
                })}

                {imagePreviews.length > 0 && (
                  <div className="basis-full text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Nové fotky
                  </div>
                )}
                {imagePreviews.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                    <img src={src} alt={`Náhľad ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      aria-label="Odstrániť obrázok"
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      onClick={() => {
                        setImages((prev) => prev.filter((_, i) => i !== idx));
                        setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {totalImagesCount < maxImages && (
                  <label className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        const currentNew = images.length;
                        const allowed = maxImages - (validExistingImages.length + currentNew);
                        if (allowed <= 0) {
                          setImageError('Dosiahol si maximálny počet 6 fotiek.');
                          e.currentTarget.value = '';
                          return;
                        }
                        const selected = files.slice(0, allowed);

                        // basic validation and preview
                        const newPreviews: string[] = [];
                        for (const f of selected) {
                          if (!f.type.startsWith('image/')) {
                            setImageError('Súbor musí byť obrázok.');
                            continue;
                          }
                          newPreviews.push(URL.createObjectURL(f));
                        }
                        setImages((prev) => [...prev, ...selected]);
                        setImagePreviews((prev) => [...prev, ...newPreviews]);
                        setImageError('');
                        // reset input value so the same file can be re-selected if removed
                        e.currentTarget.value = '';
                      }}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 16.5l4.5-4.5L12 16.5l4.5-4.5L21 16.5M3 7.5h18" />
                    </svg>
                  </label>
                )}
                {totalImagesCount >= maxImages && (
                  <p className="basis-full text-xs text-gray-500 dark:text-gray-400">Dosiahol si maximálny počet 6 fotiek.</p>
                )}
              </div>
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
                <ExperienceUnitSelect value={experienceUnit} onChange={setExperienceUnit} />
              </div>
              {experienceError && (
                <p className="text-sm text-red-500 mt-1">{experienceError}</p>
              )}
            </div>

            {/* Cena od */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cena od (voliteľné)
              </label>
              <div className="flex items-stretch h-11 border border-gray-300 dark:border-gray-700 rounded-lg overflow-visible focus-within:ring-1 focus-within:ring-purple-300 focus-within:border-purple-300 dark:focus-within:border-purple-500 transition-all hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-black">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={priceFrom}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0)) {
                      setPriceFrom(val);
                      setPriceError('');
                    }
                  }}
                  placeholder="0"
                  className="flex-1 px-3 py-0 h-full border-0 bg-transparent text-sm font-medium text-gray-900 dark:text-white focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="self-stretch w-px bg-gray-300 dark:bg-gray-600"></div>
                <CurrencySelect value={priceCurrency} onChange={(v) => { setPriceCurrency(v); setUserTouchedCurrency(true); }} />
              </div>
              {priceError && (
                <p className="text-sm text-red-500 mt-1">{priceError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Zrušiť
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!description.trim()}
              >
                {existingImages.length || initialDescription || initialExperience || (initialTags && initialTags.length)
                  ? 'Zmeniť'
                  : 'Pridať'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

