'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { ProfileTab } from '../modules/profile/profileTypes';
import { parseConversationId, parseTargetUserId } from '../modules/messages/messagesRouting';

export interface DashboardRouteState {
  initialRoute: string;
  initialViewedUserId: number | null;
  initialHighlightedSkillId: number | null;
  initialProfileTab?: ProfileTab;
  initialProfileSlug: string | null;
  initialRightItem: string | null;
  initialOfferId: number | null;
  selectedConversationId: number | null;
  targetUserIdForMessages: number | null;
}

const isNumericIdentifier = (value: string): boolean => /^\d+$/.test(value);

export function parseDashboardRouteState(
  pathname: string | null | undefined,
  searchParams?: URLSearchParams | ReadonlyURLSearchParams | null,
): DashboardRouteState {
  const segments = (pathname || '/dashboard')
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  const highlightParam = searchParams?.get('highlight') ?? null;
  const highlightedSkillId =
    highlightParam && Number.isFinite(Number(highlightParam)) ? Number(highlightParam) : null;

  const conversationIdFromPath =
    segments[0] === 'dashboard' && segments[1] === 'messages' && segments[2]
      ? parseConversationId(segments[2])
      : null;
  const conversationIdFromQuery = parseConversationId(searchParams?.get('conversationId'));
  const targetUserIdForMessages = parseTargetUserId(searchParams?.get('targetUserId'));

  const baseState: DashboardRouteState = {
    initialRoute: 'home',
    initialViewedUserId: null,
    initialHighlightedSkillId: highlightedSkillId,
    initialProfileSlug: null,
    initialRightItem: null,
    initialOfferId: null,
    selectedConversationId: conversationIdFromQuery ?? conversationIdFromPath ?? null,
    targetUserIdForMessages,
  };

  if (segments[0] !== 'dashboard') {
    return baseState;
  }

  const section = segments[1] || 'home';

  if (section === 'home') {
    return { ...baseState, initialRoute: 'home' };
  }

  if (section === 'messages') {
    return { ...baseState, initialRoute: 'messages' };
  }

  if (section === 'search') {
    return { ...baseState, initialRoute: 'search' };
  }

  if (section === 'profile') {
    return { ...baseState, initialRoute: 'profile' };
  }

  if (section === 'favorites') {
    return { ...baseState, initialRoute: 'favorites' };
  }

  if (section === 'settings') {
    return { ...baseState, initialRoute: 'settings' };
  }

  if (section === 'requests') {
    return { ...baseState, initialRoute: 'requests' };
  }

  if (section === 'notifications') {
    return { ...baseState, initialRoute: 'notifications' };
  }

  if (section === 'language') {
    return { ...baseState, initialRoute: 'language' };
  }

  if (section === 'account-type') {
    return { ...baseState, initialRoute: 'account-type' };
  }

  if (section === 'privacy') {
    return { ...baseState, initialRoute: 'privacy' };
  }

  if (section === 'skills') {
    const skillsView = segments[2];
    if (skillsView === 'offer') {
      return { ...baseState, initialRoute: 'skills-offer' };
    }
    if (skillsView === 'search') {
      return { ...baseState, initialRoute: 'skills-search' };
    }
    return { ...baseState, initialRoute: 'skills' };
  }

  if (section === 'offers' && segments[3] === 'reviews') {
    const offerId = Number(segments[2]);
    return {
      ...baseState,
      initialRoute: 'offer-reviews',
      initialOfferId: Number.isFinite(offerId) ? offerId : null,
    };
  }

  if (section === 'users' && segments[2]) {
    const identifier = segments[2];
    const userId = isNumericIdentifier(identifier) ? Number(identifier) : null;
    const profileSubview = segments[3] || null;

    if (profileSubview === 'edit') {
      return {
        ...baseState,
        initialRoute: 'profile',
        initialViewedUserId: userId,
        initialProfileSlug: identifier,
        initialRightItem: 'edit-profile',
      };
    }

    if (profileSubview === 'account') {
      return {
        ...baseState,
        initialRoute: 'profile',
        initialViewedUserId: userId,
        initialProfileSlug: identifier,
        initialRightItem: 'account-type',
      };
    }

    if (profileSubview === 'language') {
      return {
        ...baseState,
        initialRoute: 'profile',
        initialViewedUserId: userId,
        initialProfileSlug: identifier,
        initialRightItem: 'language',
      };
    }

    if (profileSubview === 'privacy') {
      return {
        ...baseState,
        initialRoute: 'profile',
        initialViewedUserId: userId,
        initialProfileSlug: identifier,
        initialRightItem: 'privacy',
      };
    }

    if (profileSubview === 'posts') {
      return {
        ...baseState,
        initialRoute: 'user-profile',
        initialViewedUserId: userId,
        initialProfileSlug: identifier,
        initialProfileTab: 'posts',
      };
    }

    if (profileSubview === 'portfolio') {
      return {
        ...baseState,
        initialRoute: 'user-profile',
        initialViewedUserId: userId,
        initialProfileSlug: identifier,
        initialProfileTab: 'portfolio',
      };
    }

    if (profileSubview === 'skills') {
      return {
        ...baseState,
        initialRoute: 'user-profile',
        initialViewedUserId: userId,
        initialProfileSlug: identifier,
        initialProfileTab: 'offers',
      };
    }

    return {
      ...baseState,
      initialRoute: 'user-profile',
      initialViewedUserId: userId,
      initialProfileSlug: identifier,
    };
  }

  return baseState;
}

export function useDashboardRouteState(): DashboardRouteState {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => parseDashboardRouteState(pathname, searchParams),
    [pathname, searchParams],
  );
}
