'use client';

import React from 'react';
import UserAvatar from '../../profile/UserAvatar';
import { User } from '@/types';

interface AvatarActionsModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onPhotoUpload: (file: File) => Promise<void> | void;
  isUploading?: boolean;
  onRemove: () => Promise<void> | void;
  onAvatarClick?: () => void;
}

export default function AvatarActionsModal({ user, isOpen, onClose, onPhotoUpload, isUploading, onRemove, onAvatarClick }: AvatarActionsModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 lg:bg-transparent" onClick={onClose}>
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[32rem] max-w-[90vw] lg:top-32 lg:translate-y-0 lg:ml-[-12rem]" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-2xl bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] shadow-xl overflow-hidden">
          <div className="flex justify-center py-6">
            <UserAvatar 
              user={user} 
              size="large" 
              onPhotoUpload={onPhotoUpload}
              isUploading={!!isUploading}
              onAvatarClick={onAvatarClick}
            />
          </div>
          <div className="px-2 space-y-3 pb-6">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) onPhotoUpload(file);
                };
                input.click();
              }}
              className="w-full py-4 text-lg rounded-2xl bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
            >
              Zmeniť fotku
            </button>
            <button
              onClick={() => onRemove()}
              className="w-full py-4 text-lg rounded-2xl bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
              disabled={isUploading}
            >
              Odstrániť fotku
            </button>
            <button
              onClick={onClose}
              className="w-full py-4 text-lg rounded-2xl bg-[var(--muted)] text-[var(--foreground)] hover:bg-gray-200 dark:hover:bg-[#141414]"
            >
              Zrušiť
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


