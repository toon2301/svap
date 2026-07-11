const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  endpoints: {
    dashboard: {
      profileLike: (id: number) => `/dashboard/users/${id}/profile/like/`,
    },
  },
}));

import { setProfileLikeState } from '../profileLikesApi';

describe('setProfileLikeState', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('uses POST when enabling a profile like', async () => {
    mockPost.mockResolvedValue({
      data: { profile_user_id: 7, is_profile_liked_by_me: true, profile_likes_count: 1 },
    });

    const response = await setProfileLikeState(7, true);

    expect(mockPost).toHaveBeenCalledWith('/dashboard/users/7/profile/like/');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(response).toEqual({
      profile_user_id: 7,
      is_profile_liked_by_me: true,
      profile_likes_count: 1,
    });
  });

  it('uses DELETE when removing a profile like', async () => {
    mockDelete.mockResolvedValue({
      data: { profile_user_id: 7, is_profile_liked_by_me: false, profile_likes_count: 0 },
    });

    await setProfileLikeState(7, false);

    expect(mockDelete).toHaveBeenCalledWith('/dashboard/users/7/profile/like/');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects invalid profile user ids', async () => {
    await expect(setProfileLikeState(0, true)).rejects.toThrow(/Invalid profile user id/);
    await expect(setProfileLikeState(1.5, true)).rejects.toThrow(/Invalid profile user id/);
  });
});
