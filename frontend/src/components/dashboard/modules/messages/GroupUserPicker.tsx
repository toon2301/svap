'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { listGroupMemberCandidates } from './messagingApi';
import type { GroupMemberCandidate } from './types';

const GROUP_PICKER_SEARCH_DEBOUNCE_MS = 250;
const MAX_GROUP_SEARCH_LENGTH = 100;

function normalizeSearch(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function initials(name: string): string {
  return (name || 'U').slice(0, 1).toUpperCase();
}

function candidatePresenceLabel(
  candidate: GroupMemberCandidate,
  t: (key: string, fallback: string) => string,
): string {
  return candidate.presence_status === 'online'
    ? t('messages.groupPresenceOnline', 'Aktívny teraz')
    : t('messages.groupPresenceUnknown', 'Naposledy neznáme');
}

export function GroupUserPicker({
  conversationId = null,
  selectedUsers = [],
  maxSelected = 49,
  disabled = false,
  placeholder,
  onSelectedUsersChange,
  onPickUser,
}: {
  conversationId?: number | null;
  selectedUsers?: GroupMemberCandidate[];
  maxSelected?: number;
  disabled?: boolean;
  placeholder?: string;
  onSelectedUsersChange?: (users: GroupMemberCandidate[]) => void;
  onPickUser?: (user: GroupMemberCandidate) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<GroupMemberCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const selectedIds = useMemo(() => new Set(selectedUsers.map((user) => user.id)), [selectedUsers]);
  const normalizedQuery = normalizeSearch(query);
  const isActionPicker = typeof onPickUser === 'function';
  const visibleCandidates = isActionPicker
    ? candidates
    : candidates.filter((candidate) => !selectedIds.has(candidate.id));
  const isSelectionFull = !isActionPicker && selectedUsers.length >= maxSelected;

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    let isActive = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      void listGroupMemberCandidates({
        search: normalizedQuery,
        conversationId,
      })
        .then((results) => {
          if (!isActive || requestIdRef.current !== requestId) return;
          setCandidates(results);
        })
        .catch(() => {
          if (!isActive || requestIdRef.current !== requestId) return;
          setCandidates([]);
          setError(t('messages.groupCandidatesLoadFailed', 'Používateľov sa nepodarilo načítať.'));
        })
        .finally(() => {
          if (isActive && requestIdRef.current === requestId) {
            setLoading(false);
          }
        });
    }, GROUP_PICKER_SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [conversationId, normalizedQuery, t]);

  const toggleSelectedUser = (candidate: GroupMemberCandidate) => {
    if (disabled) return;
    if (onPickUser) {
      onPickUser(candidate);
      setQuery('');
      return;
    }

    if (selectedIds.has(candidate.id)) {
      onSelectedUsersChange?.(selectedUsers.filter((user) => user.id !== candidate.id));
      return;
    }
    if (selectedUsers.length >= maxSelected) return;
    onSelectedUsersChange?.([...selectedUsers, candidate]);
    setQuery('');
  };

  const removeSelectedUser = (userId: number) => {
    if (disabled) return;
    onSelectedUsersChange?.(selectedUsers.filter((user) => user.id !== userId));
  };

  return (
    <div className="space-y-3">
      {!isActionPicker && selectedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-100"
            >
              <span className="truncate">{user.display_name || t('messages.unknownUser', 'Používateľ')}</span>
              <button
                type="button"
                onClick={() => removeSelectedUser(user.id)}
                disabled={disabled}
                className="rounded-full p-0.5 hover:bg-purple-100 disabled:opacity-60 dark:hover:bg-purple-800/50"
                aria-label={t('messages.groupRemoveSelectedMember', 'Odobrať vybraného člena')}
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <input
        value={query}
        maxLength={MAX_GROUP_SEARCH_LENGTH}
        onChange={(event) => setQuery(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-200 disabled:opacity-60 dark:border-gray-800 dark:bg-black dark:text-white dark:focus:ring-purple-900/40"
        placeholder={
          placeholder || t('messages.groupCandidatesSearchPlaceholder', 'Hľadať používateľov podľa mena...')
        }
      />

      {!isActionPicker ? (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t('messages.groupSelectedCount', '{count}/{max} vybraných')
            .replace('{count}', String(selectedUsers.length))
            .replace('{max}', String(maxSelected))}
        </div>
      ) : null}

      {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {t('messages.groupCandidatesLoading', 'Načítavam používateľov...')}
          </div>
        ) : visibleCandidates.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 p-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            {normalizedQuery
              ? t('messages.groupNoSearchResults', 'Nenašli sa žiadni používatelia.')
              : t('messages.groupNoCandidates', 'Zatiaľ nemáte žiadne návrhy. Skúste vyhľadávanie.')}
          </div>
        ) : (
          visibleCandidates.map((candidate) => {
            const title = candidate.display_name || t('messages.unknownUser', 'Používateľ');
            const isSelected = selectedIds.has(candidate.id);
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => toggleSelectedUser(candidate)}
                disabled={disabled || (!isActionPicker && isSelectionFull && !isSelected)}
                className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-black dark:hover:bg-gray-900"
              >
                <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-900/40">
                  {candidate.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={candidate.avatar_url} alt={title} className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300">
                      {initials(title)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {candidatePresenceLabel(candidate, t)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
