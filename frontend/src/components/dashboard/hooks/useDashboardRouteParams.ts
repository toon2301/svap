'use client';

import React from 'react';
import { parseFeedPostId } from '@/lib/feedApi';
import { parseConversationId, parseTargetUserId } from '../modules/messages/messagesRouting';

type SearchParamsReader = { get(name: string): string | null } | null | undefined;

/** Hodnoty odvodené z adresy (cesta a query): recenzie, príspevok, portfólio a správy. */
export function useDashboardRouteParams(
  pathname: string | null | undefined,
  searchParams: SearchParamsReader,
) {
  // OdvodiÅ¥ offerId pre recenzie z URL (fix: client-side navigÃ¡cia bez full reloadu)
  const offerIdFromReviewsPath = React.useMemo(() => {
    const m = pathname?.match(/^\/dashboard\/offers\/(\d+)\/reviews\/?$/);
    return m ? Number(m[1]) : null;
  }, [pathname]);

  const feedPostIdFromPath = React.useMemo(() => {
    const m = pathname?.match(/^\/dashboard\/feed\/(\d+)\/?$/);
    return m ? parseFeedPostId(m[1]) : null;
  }, [pathname]);

  const conversationIdFromMessagesPath = React.useMemo(() => {
    const m = pathname?.match(/^\/dashboard\/messages\/(\d+)\/?$/);
    return m ? Number(m[1]) : null;
  }, [pathname]);

  const portfolioDetailMatch = React.useMemo(
    () => pathname?.match(/^\/dashboard\/users\/([^/]+)\/portfolio\/(\d+)\/?$/) ?? null,
    [pathname],
  );

  const portfolioOwnerIdentifierFromPath = React.useMemo(
    () => (portfolioDetailMatch?.[1] ? decodeURIComponent(portfolioDetailMatch[1]) : null),
    [portfolioDetailMatch],
  );

  const portfolioItemIdFromPath = React.useMemo(
    () => (portfolioDetailMatch?.[2] ? Number(portfolioDetailMatch[2]) : null),
    [portfolioDetailMatch],
  );

  const portfolioCreateMatch = React.useMemo(
    () => pathname?.match(/^\/dashboard\/users\/([^/]+)\/portfolio\/create\/?$/) ?? null,
    [pathname],
  );

  const portfolioCreateOwnerIdentifierFromPath = React.useMemo(
    () => (portfolioCreateMatch?.[1] ? decodeURIComponent(portfolioCreateMatch[1]) : null),
    [portfolioCreateMatch],
  );

  const conversationIdFromMessagesQuery = React.useMemo(
    () => parseConversationId(searchParams?.get('conversationId')),
    [searchParams],
  );
  const targetUserIdFromMessagesQuery = React.useMemo(
    () => parseTargetUserId(searchParams?.get('targetUserId')),
    [searchParams],
  );

  const selectedConversationId = conversationIdFromMessagesQuery ?? conversationIdFromMessagesPath ?? null;

  return {
    offerIdFromReviewsPath,
    feedPostIdFromPath,
    portfolioOwnerIdentifierFromPath,
    portfolioItemIdFromPath,
    portfolioCreateMatch,
    portfolioCreateOwnerIdentifierFromPath,
    targetUserIdFromMessagesQuery,
    selectedConversationId,
  };
}
