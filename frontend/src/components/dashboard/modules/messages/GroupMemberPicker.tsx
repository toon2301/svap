'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function GroupMemberPicker({
  disabled = false,
  onInvite,
}: {
  disabled?: boolean;
  onInvite: (userId: number) => void;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState('');

  const handleInvite = () => {
    const userId = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(userId) || userId < 1) return;
    onInvite(userId);
    setValue('');
  };

  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        inputMode="numeric"
        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 disabled:opacity-60 dark:border-gray-800 dark:bg-black dark:text-white dark:focus:ring-purple-900/40"
        placeholder={t('messages.groupInviteUserIdPlaceholder', 'ID používateľa')}
      />
      <button
        type="button"
        onClick={handleInvite}
        disabled={disabled || !value.trim()}
        className="rounded-xl bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
      >
        {t('messages.invite', 'Pozvať')}
      </button>
    </div>
  );
}
