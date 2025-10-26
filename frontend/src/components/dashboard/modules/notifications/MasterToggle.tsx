'use client';

import React from 'react';

interface MasterToggleProps {
  enabled: boolean;
  onChange: (v: boolean) => void;
  label: string;
  compact?: boolean; // mobile compact
}

export default function MasterToggle({ enabled, onChange, label, compact }: MasterToggleProps) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800' : ''}`}>
      <span className={compact ? 'text-sm font-medium text-gray-900 dark:text-white' : 'text-sm font-medium text-gray-900 dark:text-white'}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          height: compact ? '22px' : '24px',
          width: compact ? '42px' : '44px',
          alignItems: 'center',
          borderRadius: '9999px',
          backgroundColor: enabled ? '#c084fc' : '#d1d5db',
          transition: 'all 0.2s ease-in-out',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: enabled ? '22px' : '2px',
            height: compact ? '18px' : '20px',
            width: compact ? '18px' : '20px',
            borderRadius: '50%',
            backgroundColor: enabled ? 'white' : '#f3f4f6',
            transition: 'all 0.2s ease-in-out',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        />
      </button>
    </div>
  );
}


