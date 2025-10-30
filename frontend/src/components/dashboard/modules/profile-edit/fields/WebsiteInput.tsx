'use client';

import React from 'react';

interface WebsiteInputProps {
  website: string;
  setWebsite: (v: string) => void;
  onSave: () => void;
}

export default function WebsiteInput({ website, setWebsite, onSave }: WebsiteInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor="website" className="block text-base font-medium text-gray-700 mb-2">Web</label>
      <input
        id="website"
        type="url"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave();
        }}
        maxLength={255}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
        placeholder="https://example.com"
      />
    </div>
  );
}


