'use client';

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { blockUser } from '../userBlocksApi';

type ApiErrorLike = {
  response?: {
    status?: number;
  };
};

type UseBlockUserActionParams = {
  targetUserId: number;
  onBlocked: () => void;
};

function blockErrorMessage(
  error: unknown,
  t: (key: string, fallback?: string) => string,
): string {
  const status = (error as ApiErrorLike)?.response?.status;
  if (status === 404) {
    return t('profile.blockUnavailable', 'Používateľ už nie je dostupný.');
  }
  if (status === 429) {
    return t(
      'profile.blockRateLimited',
      'Blokovanie skúšate príliš často. Skúste to o chvíľu.',
    );
  }
  return t(
    'profile.blockFailed',
    'Používateľa sa nepodarilo zablokovať. Skúste to znova.',
  );
}

export function useBlockUserAction({ targetUserId, onBlocked }: UseBlockUserActionParams) {
  const { t } = useLanguage();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const blockingRef = useRef(false);

  const openConfirm = useCallback(() => {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0 || isBlocking) return;
    setIsConfirmOpen(true);
  }, [isBlocking, targetUserId]);

  const closeConfirm = useCallback(() => {
    if (!isBlocking) setIsConfirmOpen(false);
  }, [isBlocking]);

  const confirmBlock = useCallback(async () => {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0 || blockingRef.current) return;

    blockingRef.current = true;
    setIsBlocking(true);
    try {
      await blockUser(targetUserId);
    } catch (error: unknown) {
      toast.error(blockErrorMessage(error, t));
      blockingRef.current = false;
      setIsBlocking(false);
      return;
    }

    blockingRef.current = false;
    setIsConfirmOpen(false);
    setIsBlocking(false);
    toast.success(t('profile.blockSuccess', 'Používateľ bol zablokovaný.'));
    onBlocked();
  }, [onBlocked, t, targetUserId]);

  return {
    isConfirmOpen,
    isBlocking,
    openConfirm,
    closeConfirm,
    confirmBlock,
  };
}
