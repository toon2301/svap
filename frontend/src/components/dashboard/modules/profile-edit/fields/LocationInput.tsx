'use client';

import React from 'react';

interface LocationInputProps {
  location: string;
  setLocation: (v: string) => void;
  onSave: () => void;
}

export default function LocationInput({ location, setLocation, onSave }: LocationInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 mb-2">Lokalita</label>
      <input
        id="location"
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
        maxLength={100}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder="Zadajte svoje mesto alebo obec"
      />
    </div>
  );
}


