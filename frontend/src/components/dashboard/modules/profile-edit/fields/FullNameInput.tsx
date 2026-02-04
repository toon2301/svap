'use client';

import React, { useState, useEffect } from 'react';

interface FullNameInputProps {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onSave: (nextFirstName: string, nextLastName: string) => void;
}

export default function FullNameInput({ firstName, lastName, setFirstName, setLastName, onSave }: FullNameInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Synchronizovať lokálny state s firstName a lastName
  useEffect(() => {
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || '';
    setInputValue(fullName);
  }, [firstName, lastName]);

  const handleSaveWithParse = async () => {
    // Obmedziť na 35 znakov
    const trimmedValue = inputValue.trim().slice(0, 35);
    const parts = trimmedValue.split(/\s+/).filter(Boolean);
    let newFirstName = '';
    let newLastName = '';
    
    if (parts.length === 0) {
      newFirstName = '';
      newLastName = '';
    } else if (parts.length === 1) {
      newFirstName = parts[0];
      newLastName = '';
    } else {
      newFirstName = parts.slice(0, -1).join(' ');
      newLastName = parts[parts.length - 1];
    }
    
    // Nastaviť hodnoty
    setFirstName(newFirstName);
    setLastName(newLastName);

    // Uložiť rovno s vypočítanými hodnotami (nespoliehať sa na asynchrónny React state)
    onSave(newFirstName, newLastName);
  };

  return (
    <div className="mb-4">
      <label htmlFor="first_name" className="block text-base font-medium text-gray-700 mb-2">
        Meno
      </label>
      <input
        id="first_name"
        type="text"
        value={inputValue}
        onChange={(e) => {
          const value = e.target.value;
          // Obmedziť na 35 znakov
          if (value.length <= 35) {
            setInputValue(value);
          }
        }}
        onBlur={handleSaveWithParse}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSaveWithParse();
        }}
        maxLength={35}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder="Zadajte svoje meno a priezvisko"
      />
      <div className="mt-1 text-xs text-gray-500 text-right">
        {inputValue.length}/35 znakov
      </div>
    </div>
  );
}


