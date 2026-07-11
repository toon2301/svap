const mockPost = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  endpoints: {
    portfolio: {
      like: (id: number) => `/portfolio/${id}/like/`,
    },
  },
}));

import { setPortfolioLikeState } from '../portfolioLikesApi';

describe('setPortfolioLikeState', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('uses POST when enabling a portfolio like', async () => {
    mockPost.mockResolvedValue({
      data: { portfolio_item_id: 7, is_liked_by_me: true, likes_count: 1 },
    });

    const response = await setPortfolioLikeState(7, true);

    expect(mockPost).toHaveBeenCalledWith('/portfolio/7/like/');
    expect(mockDelete).not.toHaveBeenCalled();
    expect(response).toEqual({ portfolio_item_id: 7, is_liked_by_me: true, likes_count: 1 });
  });

  it('uses DELETE when removing a portfolio like', async () => {
    mockDelete.mockResolvedValue({
      data: { portfolio_item_id: 7, is_liked_by_me: false, likes_count: 0 },
    });

    await setPortfolioLikeState(7, false);

    expect(mockDelete).toHaveBeenCalledWith('/portfolio/7/like/');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('rejects invalid portfolio item ids before sending a request', async () => {
    await expect(setPortfolioLikeState(0, true)).rejects.toThrow(/Invalid portfolio item id/);
    await expect(setPortfolioLikeState(1.5, true)).rejects.toThrow(/Invalid portfolio item id/);
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
