'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  findDistrictByCode,
  findDistrictByLabel,
  getDefaultOfferCountryCode,
  getDistrictOptions,
  getSupportedOfferCountries,
  removeDistrictDiacritics,
  type OfferCountryCode,
} from '@/shared/districtRegistry';

interface LocationSectionProps {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string;
  isSaving: boolean;
  district?: string;
  onDistrictChange?: (value: string) => void;
  onDistrictBlur?: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (value: string) => void;
  districtCode?: string;
  onDistrictCodeChange?: (value: string) => void;
  showCountrySelector?: boolean;
  isSeeking?: boolean;
}

const COUNTRY_LABELS: Record<OfferCountryCode, string> = {
  SK: 'Slovensko',
  CZ: 'Česko',
  PL: 'Poľsko',
  HU: 'Maďarsko',
  AT: 'Rakúsko',
  DE: 'Nemecko',
};

export default function LocationSection({
  value,
  onChange,
  onBlur,
  error,
  isSaving,
  district,
  onDistrictChange,
  onDistrictBlur,
  countryCode,
  onCountryCodeChange,
  districtCode,
  onDistrictCodeChange,
  showCountrySelector = false,
  isSeeking = false,
}: LocationSectionProps) {
  const { t, country: appCountry } = useLanguage();
  const [districtInput, setDistrictInput] = useState(district || '');
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [districtError, setDistrictError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelectingFromDropdown = useRef(false);

  const isOfferDistrictFlow = showCountrySelector && typeof onCountryCodeChange === 'function';
  const activeCountryCode = getDefaultOfferCountryCode(
    isOfferDistrictFlow ? countryCode || appCountry || 'SK' : appCountry || 'SK',
  );
  const districtOptions = useMemo(
    () => getDistrictOptions(activeCountryCode),
    [activeCountryCode],
  );
  const districtLabels = useMemo(
    () => districtOptions.map((option) => option.label),
    [districtOptions],
  );

  useEffect(() => {
    const canonicalLabel =
      (district || '').trim() ||
      findDistrictByCode(activeCountryCode, districtCode)?.label ||
      '';
    setDistrictInput(canonicalLabel);
  }, [activeCountryCode, district, districtCode]);

  useEffect(() => {
    if (districtInput.trim() === '') {
      setFilteredDistricts([]);
      setShowDropdown(false);
      return;
    }

    const searchTerm = removeDistrictDiacritics(districtInput);
    const filtered = districtLabels.filter((label) =>
      removeDistrictDiacritics(label).startsWith(searchTerm),
    );
    const exactMatch = districtLabels.some(
      (label) => removeDistrictDiacritics(label) === searchTerm,
    );

    if (
      exactMatch &&
      filtered.length === 1 &&
      removeDistrictDiacritics(filtered[0]) === searchTerm
    ) {
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
  }, [districtInput, districtLabels]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (!showDropdown) {
      return undefined;
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const updateDropdownPosition = () => {
    if (!inputRef.current) {
      return;
    }
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  };

  const setDistrictSelection = (nextLabel: string, nextCode: string) => {
    setDistrictInput(nextLabel);
    onDistrictChange?.(nextLabel);
    onDistrictCodeChange?.(nextCode);
    onDistrictBlur?.(nextLabel);
    setDistrictError('');
  };

  const clearDistrictSelection = () => {
    setDistrictInput('');
    onDistrictChange?.('');
    onDistrictCodeChange?.('');
    onDistrictBlur?.('');
  };

  const handleDistrictInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setDistrictInput(newValue);
    onDistrictChange?.(newValue);
    onDistrictCodeChange?.('');
    setDistrictError('');
    setTimeout(updateDropdownPosition, 0);
  };

  const handleDistrictBlur = () => {
    if (isSelectingFromDropdown.current) {
      isSelectingFromDropdown.current = false;
      return;
    }

    const trimmed = districtInput.trim();
    if (!trimmed) {
      setDistrictError('');
      clearDistrictSelection();
      return;
    }

    const exactMatch = findDistrictByLabel(activeCountryCode, trimmed);
    if (exactMatch) {
      setDistrictSelection(exactMatch.label, exactMatch.code);
      return;
    }

    setDistrictError(
      t('skills.invalidDistrict', 'Neplatný okres. Vyber z navrhovaných možností.'),
    );
    clearDistrictSelection();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    const match = findDistrictByLabel(activeCountryCode, selectedDistrict);
    if (!match) {
      return;
    }
    isSelectingFromDropdown.current = true;
    setDistrictSelection(match.label, match.code);
    setShowDropdown(false);
    setTimeout(() => {
      isSelectingFromDropdown.current = false;
    }, 200);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredDistricts.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredDistricts.length - 1 ? prev + 1 : prev,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      handleDistrictSelect(filteredDistricts[selectedIndex]);
    } else if (event.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCountryCode = getDefaultOfferCountryCode(event.target.value);
    onCountryCodeChange?.(nextCountryCode);
    clearDistrictSelection();
    setDistrictError('');
    setShowDropdown(false);
  };

  return (
    <div className="mt-3 mb-4">
      <div className="flex flex-col gap-3">
        {isOfferDistrictFlow && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('skills.countryTitle', 'Krajina ponuky')}
            </label>
            <select
              value={activeCountryCode}
              onChange={handleCountryChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            >
              {getSupportedOfferCountries().map((code) => (
                <option key={code} value={code}>
                  {COUNTRY_LABELS[code]}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {t('skills.districtTitle', 'Okres (voliteľné)')}
            </label>
            <input
              ref={inputRef}
              data-offer-district-input="true"
              type="text"
              value={districtInput}
              onChange={handleDistrictInputChange}
              onBlur={handleDistrictBlur}
              onFocus={() => {
                const trimmed = districtInput.trim();
                if (trimmed) {
                  const exactMatch = findDistrictByLabel(activeCountryCode, trimmed);
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
            {showDropdown &&
              filteredDistricts.length > 0 &&
              dropdownPosition &&
              typeof window !== 'undefined' &&
              createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed z-[9999] bg-white dark:bg-[#0f0f10] border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto overflow-x-hidden district-dropdown-scrollbar"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                    boxShadow:
                      '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  <div className="py-1">
                    {filteredDistricts.map((label, index) => (
                      <button
                        key={label}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => handleDistrictSelect(label)}
                        className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                          index === selectedIndex
                            ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-200'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        } ${index === 0 ? 'rounded-t-lg' : ''} ${
                          index === filteredDistricts.length - 1 ? 'rounded-b-lg' : ''
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>,
                document.getElementById('app-root') ?? document.body,
              )}
          </div>

          {!isSeeking && districtInput.trim() !== '' && (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('skills.locationTitle', 'Mesto/obec (voliteľné)')}
              </label>
              <input
                type="text"
                value={value}
                onChange={(event) => {
                  const newValue = event.target.value.slice(0, 25);
                  onChange(newValue);
                }}
                placeholder={t(
                  'skills.locationPlaceholder',
                  'Zadaj, kde ponúkaš svoje služby',
                )}
                maxLength={25}
                onBlur={onBlur}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
              />
              {value.length > 0 && (
                <p
                  className={`text-xs mt-1 text-right ${
                    value.length >= 23 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {value.length}/25
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {isSaving && (
        <p className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">
          {t('skills.locationSaving', 'Ukladám miesto...')}
        </p>
      )}
      {(districtError || error) && (
        <div className="mt-2 error-alert-modern text-xs py-2 px-3">
          {districtError || error}
        </div>
      )}
    </div>
  );
}
