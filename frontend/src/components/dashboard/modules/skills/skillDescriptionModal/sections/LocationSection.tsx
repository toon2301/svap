'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/contexts/LanguageContext';

// Zoznam slovenských okresov
const SLOVAK_DISTRICTS = [
  'Bánovce nad Bebravou',
  'Banská Bystrica',
  'Banská Štiavnica',
  'Bardejov',
  'Bratislava I',
  'Bratislava II',
  'Bratislava III',
  'Bratislava IV',
  'Bratislava V',
  'Brezno',
  'Bytča',
  'Čadca',
  'Detva',
  'Dolný Kubín',
  'Dunajská Streda',
  'Galanta',
  'Gelnica',
  'Hlohovec',
  'Humenné',
  'Ilava',
  'Kežmarok',
  'Komárno',
  'Košice I',
  'Košice II',
  'Košice III',
  'Košice IV',
  'Košice-okolie',
  'Krupina',
  'Kysucké Nové Mesto',
  'Levice',
  'Levoča',
  'Liptovský Mikuláš',
  'Lučenec',
  'Malacky',
  'Martin',
  'Medzilaborce',
  'Michalovce',
  'Myjava',
  'Námestovo',
  'Nitra',
  'Nové Mesto nad Váhom',
  'Nové Zámky',
  'Partizánske',
  'Pezinok',
  'Piešťany',
  'Poltár',
  'Poprad',
  'Považská Bystrica',
  'Prešov',
  'Prievidza',
  'Púchov',
  'Revúca',
  'Rimavská Sobota',
  'Rožňava',
  'Ružomberok',
  'Sabinov',
  'Senec',
  'Senica',
  'Skalica',
  'Snina',
  'Sobrance',
  'Spišská Nová Ves',
  'Stará Ľubovňa',
  'Stropkov',
  'Svidník',
  'Šaľa',
  'Topoľčany',
  'Trebišov',
  'Trenčín',
  'Trnava',
  'Turčianske Teplice',
  'Tvrdošín',
  'Veľký Krtíš',
  'Vranov nad Topľou',
  'Zlaté Moravce',
  'Zvolen',
  'Žarnovica',
  'Žiar nad Hronom',
  'Žilina',
];

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
}

export default function LocationSection({ value, onChange, onBlur, error, isSaving, district, onDistrictChange }: LocationSectionProps) {
  const { t } = useLanguage();
  const [districtInput, setDistrictInput] = useState(district || '');
  const [filteredDistricts, setFilteredDistricts] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [districtError, setDistrictError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const filtered = SLOVAK_DISTRICTS.filter((d) =>
      removeDiacritics(d).startsWith(searchTerm)
    );
    
    // Skontroluj, či je okres presne rovnaký ako jeden z okresov (presná zhoda)
    const exactMatch = SLOVAK_DISTRICTS.some((d) => 
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
  }, [districtInput]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
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
    const isValid = SLOVAK_DISTRICTS.some((d) => 
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
    validateDistrict(districtInput);
  };

  const handleDistrictSelect = (selectedDistrict: string) => {
    setDistrictInput(selectedDistrict);
    onDistrictChange?.(selectedDistrict);
    setDistrictError(''); // Vymaž chybu pri výbere z dropdownu
    setShowDropdown(false);
    inputRef.current?.blur();
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
    <div className="mb-4">
      <div className="flex gap-3">
        {/* Okres */}
        <div ref={containerRef} className="flex-1 relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                const exactMatch = SLOVAK_DISTRICTS.some((d) => 
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
          {districtError && (
            <p className="text-xs text-red-500 mt-1">
              {districtError}
            </p>
          )}
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
            document.body
          )}
        </div>
        {/* Miesto - zobrazí sa len keď je vyplnený okres */}
        {districtInput.trim() !== '' && (
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('skills.locationTitle', 'Mesto/dedina (voliteľné)')}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t('skills.locationPlaceholder', 'Zadaj, kde ponúkaš svoje služby')}
              maxLength={25}
              onBlur={onBlur}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-black text-gray-900 dark:text-white focus:ring-1 focus:ring-purple-300 focus:border-transparent"
            />
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {t('skills.locationHint', 'Sem napíš, kde ponúkaš svoje služby a zručnosti.')}
      </p>
      {isSaving && (
        <p className="text-xs text-purple-600 dark:text-purple-300 mt-0.5">
          {t('skills.locationSaving', 'Ukladám miesto...')}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500 mt-0.5">
          {error}
        </p>
      )}
    </div>
  );
}

