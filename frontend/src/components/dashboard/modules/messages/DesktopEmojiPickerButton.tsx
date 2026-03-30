'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { FaceSmileIcon } from '@heroicons/react/24/outline';

type EmojiMartSelection = {
  native?: string | null;
  skins?: Array<{ native?: string | null }> | null;
};

function extractEmojiNative(selection: EmojiMartSelection | null | undefined): string {
  return selection?.native || selection?.skins?.[0]?.native || '';
}

export function DesktopEmojiPickerButton({
  ariaLabel,
  disabled = false,
  onSelect,
  className = '',
}: {
  ariaLabel: string;
  disabled?: boolean;
  onSelect: (emoji: string) => void;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [pickerCoords, setPickerCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  useEffect(() => {
    if (disabled) {
      setShowPicker(false);
    }
  }, [disabled]);

  const updatePickerPosition = () => {
    const anchor = buttonRef.current;
    if (!anchor || typeof window === 'undefined') return;

    const rect = anchor.getBoundingClientRect();
    const estimatedWidth = 352;
    const estimatedHeight = 435;
    const margin = 8;
    const openAbove = window.innerHeight - rect.bottom < estimatedHeight;
    const left = Math.min(
      Math.max(rect.right - estimatedWidth, margin),
      window.innerWidth - estimatedWidth - margin,
    );
    const top = openAbove
      ? Math.max(rect.top - estimatedHeight - margin, margin)
      : Math.min(rect.bottom + margin, window.innerHeight - estimatedHeight - margin);

    setPickerCoords({ top, left });
  };

  useEffect(() => {
    if (!showPicker) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || pickerRef.current?.contains(target)) {
        return;
      }
      setShowPicker(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowPicker(false);
      }
    };

    const handleViewportChange = () => {
      updatePickerPosition();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [showPicker]);

  const handleToggle = () => {
    if (disabled) return;
    updatePickerPosition();
    setShowPicker((current) => !current);
  };

  const handleEmojiSelect = (selection: EmojiMartSelection) => {
    const emoji = extractEmojiNative(selection);
    if (!emoji) return;
    onSelect(emoji);
    setShowPicker(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-label={ariaLabel}
        title={ariaLabel}
        className={`inline-flex items-center justify-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        <FaceSmileIcon className="h-5 w-5" />
      </button>

      {showPicker && portalNode
        ? createPortal(
            <div
              ref={pickerRef}
              className="fixed z-[9999]"
              style={{ top: pickerCoords.top, left: pickerCoords.left }}
            >
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10]">
                <div className="subtle-scrollbar max-h-[435px] overflow-y-auto">
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="auto"
                    previewPosition="none"
                    skinTonePosition="none"
                    navPosition="top"
                    searchPosition="none"
                    perLine={8}
                  />
                </div>
              </div>
            </div>,
            portalNode,
          )
        : null}
    </>
  );
}
