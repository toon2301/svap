'use client';

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { unblockUser } from '../userBlocksApi';

type UseUnblockUserActionParams = {
  targetUserId: number;
  onUnblocked: () => void;
};

/**
 * Mirror of useBlockUserAction for removing a block inline (e.g. from the
 * ConversationDetail banner). Reuses the existing blockedUsers.* copy shared
 * with the Settings > Blocked users flow so no new translations are needed.
 */
export function useUnblockUserAction({ targetUserId, onUnblocked }: UseUnblockUserActionParams) {
  const { t } = useLanguage();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const unblockingRef = useRef(false);

  const openConfirm = useCallback(() => {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0 || isUnblocking) return;
    setIsConfirmOpen(true);
  }, [isUnblocking, targetUserId]);

  const closeConfirm = useCallback(() => {
    if (!isUnblocking) setIsConfirmOpen(false);
  }, [isUnblocking]);

  const confirmUnblock = useCallback(async () => {
    if (!Number.isInteger(targetUserId) || targetUserId <= 0 || unblockingRef.current) return;

    unblockingRef.current = true;
    setIsUnblocking(true);
    try {
      await unblockUser(targetUserId);
    } catch {
      toast.error(t('blockedUsers.unblockFailed', 'Používateľa sa nepodarilo odblokovať.'));
      unblockingRef.current = false;
      setIsUnblocking(false);
      return;
    }

    unblockingRef.current = false;
    setIsConfirmOpen(false);
    setIsUnblocking(false);
    toast.success(t('blockedUsers.unblockSuccess', 'Používateľ bol odblokovaný.'));
    onUnblocked();
  }, [onUnblocked, t, targetUserId]);

  return {
    isConfirmOpen,
    isUnblocking,
    openConfirm,
    closeConfirm,
    confirmUnblock,
  };
}
