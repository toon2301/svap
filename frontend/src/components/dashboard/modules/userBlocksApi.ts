'use client';

import { api, endpoints } from '@/lib/api';

export type UserBlockMutationResponse = {
  user_id: number;
  is_blocked: boolean;
  created?: boolean;
};

export async function blockUser(userId: number): Promise<UserBlockMutationResponse> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new TypeError('Invalid user id.');
  }

  const { data } = await api.post<UserBlockMutationResponse>(endpoints.users.block(userId));
  return data;
}
