'use client';

import React from 'react';

interface BioInputProps {
  bio: string;
  setBio: (v: string) => void;
  onSave: () => void;
}

export default function BioInput({ bio, setBio, onSave }: BioInputProps) {
  return (
    <div className="mb-4">
      <label htmlFor="bio" className="block text-base font-medium text-gray-700 mb-2">
        Bio
      </label>
      <div className="relative">
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) onSave();
          }}
          maxLength={150}
          className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-300 focus:border-transparent"
          placeholder="Napíšte niečo o sebe..."
          rows={2}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">{bio.length}/150</div>
      </div>
    </div>
  );
}


