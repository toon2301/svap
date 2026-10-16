'use client';

import { useEffect, useRef, useState } from 'react';
import {
  listConversations,
  listMessageRequests,
  listMessages,
  openConversation,
} from '../modules/messages/messagingApi';
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
 * sa konverzácia otvorí, inak sa podľa ID konverzácie hľadá v zozname konverzácií,
 * potom v žiadostiach o správu a nakoniec v samotnej konverzácii (zoznamy majú len
 * prvú stránku, starší chat v nich nemusí byť). Odpoveď, ktorá príde po zmene
 * vstupov, sa zahodí.
 *
 * Partner patrí ku konkrétnej konverzácii: keď sa konverzácia (alebo cieľ) zmení,
 * predošlý partner sa zahodí skôr, než príde nový – inak by sa na chvíľu ukázal
 * cudzí človek. Jediná výnimka je rozpísaná konverzácia s používateľom X, ktorá sa
 * po odoslaní správy (alebo ak už existuje) nahradí adresou `?conversationId=`: ide
 * o tú istú konverzáciu, takže partner X ostane zobrazený, kým sa nepotvrdí.
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
  /** Konverzácia, ku ktorej patrí zobrazený partner (`target:ID` alebo `conversation:ID`). */
  const peerKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (activeModule !== 'messages') {
      peerKeyRef.current = null;
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
    const requestedConversationId =
      selectedConversationId != null && Number.isFinite(selectedConversationId)
        ? selectedConversationId
        : null;

    // Iná konverzácia = iný partner: predošlého nenechať zobrazeného počas načítania.
    const nextKey =
      targetUserId != null
        ? `target:${targetUserId}`
        : requestedConversationId != null
          ? `conversation:${requestedConversationId}`
          : null;
    const previousKey = peerKeyRef.current;
    if (nextKey !== previousKey) {
      peerKeyRef.current = nextKey;
      const draftPeerId =
        previousKey?.startsWith('target:') && nextKey?.startsWith('conversation:')
          ? Number(previousKey.slice('target:'.length))
          : null;
      setMobileMessagePeer((current) =>
        draftPeerId !== null && current?.id === draftPeerId ? current : null,
      );
      setMobileMessageGroup(null);
    }

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

    const conversationId = requestedConversationId;

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
        if (!match) {
          // Zoznamy majú len prvú stránku. Konverzáciu, ktorú v nich niet, pozná
          // aj samotný detail: vráti ju spolu so správami (prvú položku stačí).
          const page = await listMessages(conversationId, 1);
          if (cancelled) return;
          match = page.conversation;
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
