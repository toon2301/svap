'use client';

import React, { useState, useEffect } from 'react';

interface MasterToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  compact?: boolean; // mobile compact
}

export default function MasterToggle({ enabled, onChange, label, compact }: MasterToggleProps) {

  return (
    <div className={`flex items-center ${compact ? 'justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800' : 'justify-between'}`}>
      <span className={compact ? 'text-sm font-medium text-gray-900 dark:text-white' : 'text-sm font-medium text-gray-900 dark:text-white'}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
          enabled ? 'bg-purple-400 border border-purple-400' : 'bg-gray-300 dark:bg-gray-600'
        }`}
        style={{
          transform: 'scaleY(0.8)',
          transformOrigin: 'left center',
        }}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
            enabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}


