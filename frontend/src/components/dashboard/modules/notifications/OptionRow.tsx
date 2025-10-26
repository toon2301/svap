'use client';

import React from 'react';
import ToggleCircle from './ToggleCircle';

interface OptionRowProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: (v: boolean) => void;
  dense?: boolean; // for desktop spacing vs mobile
  rightDot?: boolean; // show right-side dot when selected (mobile "Zapnuté")
}

export default function OptionRow({ label, selected, disabled, onSelect, dense, rightDot }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(true)}
      onPointerDown={(e) => {
        e.preventDefault();
        onSelect(true);
      }}
      disabled={disabled}
      className={`w-full flex ${rightDot ? 'items-center justify-between' : 'items-center'} ${dense ? 'p-2' : 'p-4'} rounded ${
        dense ? '' : 'rounded-xl'
      } transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 ring-0`}
      tabIndex={-1}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <div className="flex items-center">
        <ToggleCircle selected={selected} />
        <span
          className={`text-sm font-medium ${
            selected ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {label}
        </span>
      </div>
      {rightDot && selected && <div className="w-2 h-2 rounded-full bg-black dark:bg-white"></div>}
    </button>
  );
}


