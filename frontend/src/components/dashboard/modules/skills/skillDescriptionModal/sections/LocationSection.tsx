'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  SLOVAK_DISTRICTS,
  CZECH_DISTRICTS,
  POLISH_DISTRICTS,
  HUNGARIAN_DISTRICTS,
  AUSTRIAN_DISTRICTS,
  GERMAN_DISTRICTS,
} from '../districts';

// Funkcia na odstránenie diakritiky
function removeDiacritics(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

interface LocationSectionProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string;
  isSaving: boolean;
  district?: string;
  onDistrictChange?: (value: string) => void;
  onDistrictBlur?: (value: string) => void;
  isSeeking?: boolean;
}

export default function LocationSection({
  value,
  onChange,
  onBlur,
  error,
  isSaving,
  district,
  onDistrictChange,
  onDistrictBlur,
  isSeeking = false,
}: LocationSectionProps) {
  const { t, country } = useLanguage();
  const [districtInput, setDistrictInput] = useState(district || '');
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [districtError, setDistrictError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectingFromDropdown = useRef(false);

  // Vyber správny zoznam okresov podľa krajiny (nie jazyka)
  const getDistrictsList = (): string[] => {
    if (country === 'CZ') {
      return CZECH_DISTRICTS;
    }
    if (country === 'PL') {
      return POLISH_DISTRICTS;
    }
    if (country === 'HU') {
      return HUNGARIAN_DISTRICTS;
    }
    if (country === 'AT') {
      return AUSTRIAN_DISTRICTS;
    }
    if (country === 'DE') {
      return GERMAN_DISTRICTS;
    }
    // Predvolené: slovenské okresy (ak krajina nie je detekovaná alebo je SK)
    return SLOVAK_DISTRICTS;
  };

  const DISTRICTS = getDistrictsList();

  useEffect(() => {
    setDistrictInput(district || '');
  }, [district]);

  useEffect(() => {
    if (districtInput.trim() === '') {
      setFilteredDistricts([]);
      setShowDropdown(false);
      return;
    }

    const searchTerm = removeDiacritics(districtInput);
    const filtered = DISTRICTS.filter((d) =>
      removeDiacritics(d).startsWith(searchTerm)
    );
    
    // Skontroluj, či je okres presne rovnaký ako jeden z okresov (presná zhoda)
    const exactMatch = DISTRICTS.some((d) => 
      removeDiacritics(d).toLowerCase() === searchTerm.toLowerCase()
    );
    
    // Ak je presná zhoda, nezobrazuj dropdown
    if (exactMatch && filtered.length === 1 && removeDiacritics(filtered[0]).toLowerCase() === searchTerm.toLowerCase()) {
      setFilteredDistricts([]);
      setShowDropdown(false);
      return;
    }
    
    setFilteredDistricts(filtered);
    setShowDropdown(filtered.length > 0);
    setSelectedIndex(-1);
    if (filtered.length > 0) {
      updateDropdownPosition();
    }
  }, [districtInput, country]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ak klikneme na dropdown item, necháme handleDistrictSelect to spracovať
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const validateDistrict = (districtValue: string): boolean => {
    if (!districtValue.trim()) {
      setDistrictError('');
      return true; // Prázdny okres je OK (voliteľné)
    }
    
    const normalizedInput = removeDiacritics(districtValue.trim());
    const isValid = DISTRICTS.some((d) => 
      removeDiacritics(d).toLowerCase() === normalizedInput.toLowerCase()
    );
    
    if (!isValid) {
      setDistrictError(t('skills.invalidDistrict', 'Neplatný okres. Vyber z navrhovaných možností.'));
      return false;
    }
    
    setDistrictError('');
    return true;
  };

  const handleDistrictInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDistrictInput(newValue);
    onDistrictChange?.(newValue);
    setDistrictError(''); // Vymaž chybu pri písaní
    setTimeout(updateDropdownPosition, 0);
  };

  const handleDistrictBlur = () => {
    // Ak sme práve vybrali z dropdownu, preskoč validáciu
    if (isSelectingFromDropdown.current) {
      isSelectingFromDropdown.current = false;
      return;
    }

    const trimmed = districtInput.trim();
    if (!trimmed) {
      setDistrictError('');
      onDistrictChange?.('');
      onDistrictBlur?.('');
      return;
    }

    const normalizedInput = removeDiacritics(trimmed);
    
    // Nájdi presnú zhodu (case-insensitive, bez diakritiky)
    const exactMatch = DISTRICTS.find((d) => 
      removeDiacritics(d).toLowerCase() === normalizedInput.toLowerCase()
    );
    
    if (exactMatch) {
      // Ak je presná zhoda, nastav presnú hodnotu z zoznamu (s diakritikou a správnym case)
      setDistrictInput(exactMatch);
      onDistrictChange?.(exactMatch);
      setDistrictError('');
      onDistrictBlur?.(exactMatch);
    } else {
      // Ak nie je presná zhoda, nastav chybu a vymaž neplatnú hodnotu
      setDistrictError(t('skills.invalidDistrict', 'Neplatný okres. Vyber z navrhovaných možností.'));
      setDistrictInput('');
      onDistrictChange?.('');
      onDistrictBlur?.('');
      // Fokus späť na input, aby používateľ videl chybu
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    isSelectingFromDropdown.current = true;
    setDistrictInput(selectedDistrict);
    onDistrictChange?.(selectedDistrict);
    onDistrictBlur?.(selectedDistrict);
    setDistrictError(''); // Vymaž chybu pri výbere z dropdownu
    setShowDropdown(false);
    // Nevoláme blur() - necháme input bez focusu prirodzene
    // Resetujeme flag po krátkom čase, aby blur event (ak sa spustí) vedel, že sme vybrali z dropdownu
    setTimeout(() => {
      isSelectingFromDropdown.current = false;
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredDistricts.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredDistricts.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleDistrictSelect(filteredDistricts[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="mt-3 mb-4">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Okres */}
        <div ref={containerRef} className="flex-1 relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {t('skills.districtTitle', 'Okres (voliteľné)')}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={districtInput}
            onChange={handleDistrictInputChange}
            onBlur={handleDistrictBlur}
            onFocus={() => {
              // Skontroluj, či je okres už presne vyplnený a platný
              const trimmed = districtInput.trim();
              if (trimmed) {
                const normalizedInput = removeDiacritics(trimmed);
                const exactMatch = DISTRICTS.some((d) => 
                  removeDiacritics(d).toLowerCase() === normalizedInput.toLowerCase()
                );
                // Ak je presná zhoda, nezobrazuj dropdown
                if (exactMatch) {
                  setShowDropdown(false);
                  return;
                }
              }
              updateDropdownPosition();
              if (filteredDistricts.length > 0) {
                setShowDropdown(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('skills.districtPlaceholder', 'Zadaj okres')}
            maxLength={50}
            className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent ${
              districtError
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-gray-700'
            }`}
          />
          {showDropdown && filteredDistricts.length > 0 && dropdownPosition && typeof window !== 'undefined' && createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden district-dropdown-scrollbar"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="py-1">
                {filteredDistricts.map((d, index) => (
                  <button
                    key={d}
                    type="button"
                    onMouseDown={(e) => {
                      // Zabráň blur eventu na inpute pri kliknutí na dropdown item
                      e.preventDefault();
                    }}
                    onClick={() => handleDistrictSelect(d)}
                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                      index === selectedIndex
                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    } ${index === 0 ? 'rounded-t-lg' : ''} ${
                      index === filteredDistricts.length - 1 ? 'rounded-b-lg' : ''
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>,
            document.getElementById('app-root') ?? document.body
          )}
        </div>
        {/* Miesto - v sekcii "Hľadám" sa nezobrazuje vôbec, v "Ponúkam" sa zobrazí keď je vyplnený okres */}
        {!isSeeking && districtInput.trim() !== '' && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('skills.locationTitle', 'Mesto/dedina (voliteľné)')}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => {
                // Obmedziť na 35 znakov
                const newValue = e.target.value.slice(0, 35);
                onChange(newValue);
              }}
              placeholder={t('skills.locationPlaceholder', 'Zadaj, kde ponúkaš svoje služby')}
              maxLength={35}
              onBlur={onBlur}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            />
            {value.length > 0 && (
              <p className={`text-xs mt-1 text-right ${value.length >= 33 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                {value.length}/35
              </p>
            )}
          </div>
        )}
      </div>
      {isSaving && (
        <p className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">
          {t('skills.locationSaving', 'Ukladám miesto...')}
        </p>
      )}
      {(districtError || error) && (
        <p className="mt-2 text-xs leading-snug text-red-500 whitespace-normal break-words">
          {districtError || error}
        </p>
      )}
    </div>
  );
}

