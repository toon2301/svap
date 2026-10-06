'use client';

import { useEffect, useState } from 'react';
import { listConversations, listMessageRequests, openConversation } from '../modules/messages/messagingApi';
import type { MessagingUserBrief } from '../modules/messages/types';

type MobileMessagePeerInput = {
  activeModule: string;
  selectedConversationId: number | null;
  targetUserIdFromMessagesQuery: number | null;
  t: (key: string, fallback?: string) => string;
};

/**
 * Kto je na druhej strane otvorenej konverzácie (partner alebo skupina) pre hornú
 * lištu mobilných Správ. Mimo modulu Správy sa stav vynuluje; pri `?targetUserId`
 * sa konverzácia otvorí, inak sa podľa ID konverzácie hľadá v zozname konverzácií
 * a potom v žiadostiach o správu. Odpoveď, ktorá príde po zmene vstupov, sa zahodí.
 */
export function useMobileMessagePeer({
  activeModule,
  selectedConversationId,
  targetUserIdFromMessagesQuery,
  t,
}: MobileMessagePeerInput) {
  const [mobileMessagePeer, setMobileMessagePeer] = useState<MessagingUserBrief | null>(null);
  const [mobileMessageGroup, setMobileMessageGroup] = useState<{
    name: string;
    avatarMembers: MessagingUserBrief[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (activeModule !== 'messages') {
      setMobileMessagePeer(null);
      setMobileMessageGroup(null);
      return () => {
        cancelled = true;
      };
    }

    const targetUserId =
      targetUserIdFromMessagesQuery != null && Number.isFinite(targetUserIdFromMessagesQuery)
        ? targetUserIdFromMessagesQuery
        : null;

    if (targetUserId != null) {
      void (async () => {
        try {
          const result = await openConversation(targetUserId);
          if (cancelled) return;
          setMobileMessagePeer(result.other_user ?? null);
          setMobileMessageGroup(null);
        } catch {
          if (!cancelled) {
            setMobileMessagePeer(null);
            setMobileMessageGroup(null);
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    const conversationId =
      selectedConversationId != null && Number.isFinite(selectedConversationId)
        ? selectedConversationId
        : null;

    if (conversationId == null) {
      setMobileMessagePeer(null);
      setMobileMessageGroup(null);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const conversations = await listConversations();
        if (cancelled) return;
        let match = conversations.find((item) => item.id === conversationId) ?? null;
        if (!match) {
          const requests = await listMessageRequests();
          if (cancelled) return;
          match = requests.find((item) => item.id === conversationId) ?? null;
        }
        if (match?.is_group) {
          setMobileMessagePeer(null);
          setMobileMessageGroup({
            name: (match.name || '').trim() || t('messages.unknownGroup', 'Skupina'),
            avatarMembers: match.avatar_members ?? [],
          });
        } else {
          setMobileMessagePeer(match?.other_user ?? null);
          setMobileMessageGroup(null);
        }
      } catch {
        if (!cancelled) {
          setMobileMessagePeer(null);
          setMobileMessageGroup(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeModule, selectedConversationId, targetUserIdFromMessagesQuery, t]);

  return { mobileMessagePeer, mobileMessageGroup };
}
