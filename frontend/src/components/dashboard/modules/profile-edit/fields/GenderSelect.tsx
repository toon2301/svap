'use client';

import React from 'react';

interface GenderSelectProps {
  gender: string;
  onChange: (value: string) => void;
}

export default function GenderSelect({ gender, onChange }: GenderSelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 mb-2">Pohlavie</label>
      <div className="relative">
        <select
          id="gender"
          value={gender}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent appearance-none cursor-pointer"
        >
          <option value="">Vyberte pohlavie</option>
          <option value="male">Muž</option>
          <option value="female">Žena</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <p className="mt-2 text-sm text-gray-500">Toto nie je súčasťou verejného profilu.</p>
    </div>
  );
}


