import { api, endpoints } from '@/lib/api';

export type ProfileLikeResponse = {
  profile_user_id: number;
  is_profile_liked_by_me: boolean;
  profile_likes_count: number;
};

function assertProfileUserId(userId: number): void {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid profile user id');
  }
}

export async function setProfileLikeState(
  userId: number,
  shouldLike: boolean,
): Promise<ProfileLikeResponse> {
  assertProfileUserId(userId);
  const endpoint = endpoints.dashboard.profileLike(userId);
  const response = shouldLike
    ? await api.post<ProfileLikeResponse>(endpoint)
    : await api.delete<ProfileLikeResponse>(endpoint);
  return response.data;
}
