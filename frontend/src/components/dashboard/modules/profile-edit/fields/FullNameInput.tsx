'use client';

import React from 'react';

interface FullNameInputProps {
  firstName: string;
  lastName: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  onSave: () => void;
}

export default function FullNameInput({ firstName, lastName, setFirstName, setLastName, onSave }: FullNameInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor="first_name" className="block text-base font-medium text-gray-700 mb-2">
        Meno
      </label>
      <input
        id="first_name"
        type="text"
        value={`${firstName} ${lastName}`.trim()}
        onChange={(e) => {
          const value = e.target.value || '';
          const parts = value.trim().split(/\s+/).filter(Boolean);
          if (parts.length === 0) {
            setFirstName('');
            setLastName('');
          } else if (parts.length === 1) {
            setFirstName(parts[0]);
          } else {
            setFirstName(parts.slice(0, -1).join(' '));
            setLastName(parts[parts.length - 1]);
          }
        }}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
        maxLength={18}
        pattern="[a-zA-ZáčďéěíĺľňóôŕšťúýžÁČĎÉĚÍĹĽŇÓÔŔŠŤÚÝŽ\s-]*"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder="Zadajte svoje meno a priezvisko"
      />
    </div>
  );
}


