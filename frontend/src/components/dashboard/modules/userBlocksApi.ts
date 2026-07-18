'use client';

import { api, endpoints } from '@/lib/api';

export type UserBlockMutationResponse = {
  user_id: number;
  is_blocked: boolean;
  created?: boolean;
  deleted?: boolean;
};

export type BlockedUser = {
  id: number;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_available: boolean;
};

type BlockedUsersApiResponse = {
  next: string | null;
  previous: string | null;
  results: BlockedUser[];
};

export type BlockedUsersPage = {
  results: BlockedUser[];
  nextCursor: string | null;
};

function validateUserId(userId: number): void {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new TypeError('Invalid user id.');
  }
}

function cursorFromNextUrl(nextUrl: string | null): string | null {
  if (!nextUrl) return null;

  try {
    return new URL(nextUrl, 'https://swaply.local').searchParams.get('cursor');
  } catch {
    return null;
  }
}

export async function blockUser(userId: number): Promise<UserBlockMutationResponse> {
  validateUserId(userId);

  const { data } = await api.post<UserBlockMutationResponse>(endpoints.users.block(userId));
  return data;
}

export async function fetchBlockedUsers(cursor?: string | null): Promise<BlockedUsersPage> {
  const { data } = await api.get<BlockedUsersApiResponse>(endpoints.users.blocked, {
    params: cursor ? { cursor } : undefined,
  });

  return {
    results: data.results,
    nextCursor: cursorFromNextUrl(data.next),
  };
}

export async function unblockUser(userId: number): Promise<UserBlockMutationResponse> {
  validateUserId(userId);

  const { data } = await api.delete<UserBlockMutationResponse>(endpoints.users.block(userId));
  return data;
}
