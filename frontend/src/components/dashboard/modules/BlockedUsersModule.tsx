'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from 'react';
import { NoSymbolIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiErrorMessage } from '@/lib/apiError';
import SettingsDetailHeader from './settings/SettingsDetailHeader';
import {
  fetchBlockedUsers,
  unblockUser,
  type BlockedUser,
} from './userBlocksApi';
import { UnblockUserConfirmDialog } from './UnblockUserConfirmDialog';

type BlockedUsersModuleProps = {
  onBack?: () => void;
};

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || 'U';
}

function mergeUniqueUsers(current: BlockedUser[], incoming: BlockedUser[]): BlockedUser[] {
  const usersById = new Map(current.map((user) => [user.id, user]));
  incoming.forEach((user) => usersById.set(user.id, user));
  return Array.from(usersById.values());
}

function BlockedUserRow({
  user,
  disabled,
  onSelect,
}: {
  user: BlockedUser;
  disabled: boolean;
  onSelect: (user: BlockedUser) => void;
}) {
  const { t } = useLanguage();
  const displayName = user.is_available
    ? user.display_name || user.username || t('blockedUsers.unavailableUser')
    : t('blockedUsers.unavailableUser');
  const username = user.is_available && user.username ? '@' + user.username : null;

  return (
    <div className='flex min-w-0 items-center gap-3 py-4'>
      <div className='flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-sm font-bold text-purple-700 dark:bg-purple-950/50 dark:text-purple-200'>
        {user.is_available && user.avatar_url ? (
          <img src={user.avatar_url} alt='' className='h-full w-full object-cover' loading='lazy' />
        ) : user.is_available ? (
          initialsFromName(displayName)
        ) : (
          <UserIcon className='h-6 w-6' aria-hidden='true' />
        )}
      </div>
      <div className='min-w-0 flex-1'>
        <p className='truncate text-sm font-semibold text-gray-900 dark:text-white'>
          {displayName}
        </p>
        {username ? (
          <p className='truncate text-xs text-gray-500 dark:text-gray-400'>{username}</p>
        ) : null}
      </div>
      <button
        type='button'
        onClick={() => onSelect(user)}
        disabled={disabled}
        className='shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:hover:border-gray-600 dark:hover:bg-gray-900'
      >
        {t('blockedUsers.unblock')}
      </button>
    </div>
  );
}

export default function BlockedUsersModule({ onBack }: BlockedUsersModuleProps) {
  const { t } = useLanguage();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const mountedRef = useRef(false);
  const removedUserIdsRef = useRef(new Set<number>());
  const translationRef = useRef(t);

  useEffect(() => {
    translationRef.current = t;
  }, [t]);

  const loadInitialUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const page = await fetchBlockedUsers();
      if (!mountedRef.current) return;
      setUsers(page.results.filter((user) => !removedUserIdsRef.current.has(user.id)));
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      if (mountedRef.current) {
        setLoadError(
          getApiErrorMessage(
            error,
            translationRef.current(
              'blockedUsers.loadFailed',
              'Blokovaných používateľov sa nepodarilo načítať.',
            ),
          ),
        );
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void loadInitialUsers();
    return () => {
      mountedRef.current = false;
    };
  }, [loadInitialUsers]);

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await fetchBlockedUsers(nextCursor);
      const visibleUsers = page.results.filter(
        (user) => !removedUserIdsRef.current.has(user.id),
      );
      setUsers((current) => mergeUniqueUsers(current, visibleUsers));
      setNextCursor(page.nextCursor);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('blockedUsers.loadFailed')));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleUnblock = async () => {
    if (!selectedUser || pendingUserId !== null) return;
    const userId = selectedUser.id;
    setPendingUserId(userId);
    try {
      await unblockUser(userId);
      removedUserIdsRef.current.add(userId);
      setUsers((current) => current.filter((user) => user.id !== userId));
      setSelectedUser(null);
      toast.success(t('blockedUsers.unblockSuccess'));
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, t('blockedUsers.unblockFailed')));
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <div className='hidden lg:block'>
        <SettingsDetailHeader
          title={t('blockedUsers.title')}
          backLabel={t('common.back')}
          onBack={onBack}
        />
      </div>

      {isLoading ? (
        <div className='space-y-3' aria-label={t('blockedUsers.loading')}>
          {[0, 1, 2].map((item) => (
            <div key={item} className='flex animate-pulse items-center gap-3 border-b border-gray-200 py-4 dark:border-gray-800'>
              <div className='h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-800' />
              <div className='flex-1 space-y-2'>
                <div className='h-4 w-36 rounded bg-gray-200 dark:bg-gray-800' />
                <div className='h-3 w-24 rounded bg-gray-100 dark:bg-gray-900' />
              </div>
              <div className='h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-800' />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className='py-16 text-center'>
          <NoSymbolIcon className='mx-auto h-11 w-11 text-gray-400' aria-hidden='true' />
          <p className='mt-3 text-sm text-gray-600 dark:text-gray-300'>{loadError}</p>
          <button
            type='button'
            onClick={() => void loadInitialUsers()}
            className='mt-5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900'
          >
            {t('blockedUsers.retry')}
          </button>
        </div>
      ) : users.length === 0 ? (
        <div className='py-16 text-center'>
          <NoSymbolIcon className='mx-auto h-12 w-12 text-gray-400 dark:text-gray-500' aria-hidden='true' />
          <h2 className='mt-3 text-base font-semibold text-gray-900 dark:text-white'>
            {t('blockedUsers.emptyTitle')}
          </h2>
          <p className='mx-auto mt-1 max-w-md text-sm text-gray-500 dark:text-gray-400'>
            {t('blockedUsers.emptyDescription')}
          </p>
        </div>
      ) : (
        <div>
          <div className='divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800'>
            {users.map((user) => (
              <BlockedUserRow
                key={user.id}
                user={user}
                disabled={pendingUserId !== null}
                onSelect={setSelectedUser}
              />
            ))}
          </div>
          {nextCursor ? (
            <div className='flex justify-center pt-6'>
              <button
                type='button'
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore}
                className='rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-900'
              >
                {isLoadingMore ? t('blockedUsers.loading') : t('blockedUsers.loadMore')}
              </button>
            </div>
          ) : null}
        </div>
      )}

      <UnblockUserConfirmDialog
        open={selectedUser !== null}
        isSubmitting={selectedUser !== null && pendingUserId === selectedUser.id}
        onClose={() => {
          if (pendingUserId === null) setSelectedUser(null);
        }}
        onConfirm={() => void handleUnblock()}
      />
    </div>
  );
}
