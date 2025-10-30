'use client';

import React from 'react';

interface ProfessionInputProps {
  profession: string;
  setProfession: (v: string) => void;
  onSave: () => void;
  visible: boolean;
  onToggleVisible: () => void;
}

export default function ProfessionInput({ profession, setProfession, onSave, visible, onToggleVisible }: ProfessionInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 mb-2">Profesia</label>
      <input
        id="profession"
        type="text"
        value={profession}
        onChange={(e) => setProfession(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
        maxLength={100}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder="Zadajte svoju profesiu"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onToggleVisible}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${visible ? 'bg-purple-600' : 'bg-gray-200'}`}
        >
          <span className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${visible ? 'left-6' : 'left-1'}`} />
        </button>
        <span className="text-xs text-gray-500">Zobraziť profesiu verejne</span>
      </div>
    </div>
  );
}


