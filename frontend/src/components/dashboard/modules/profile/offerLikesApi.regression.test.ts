import { api, endpoints } from '@/lib/api';
import { setOfferLikeState } from './offerLikesApi';

jest.mock('@/lib/api', () => ({
  api: { post: jest.fn(), delete: jest.fn() },
  endpoints: {
    skills: { like: jest.fn((id: number) => `/auth/skills/${id}/like/`) },
  },
}));

const post = api.post as jest.Mock;
const remove = api.delete as jest.Mock;
const endpoint = endpoints.skills.like as jest.Mock;

describe('offerLikesApi: unchanged Like contract outside Offer Watch results', () => {
  beforeEach(() => jest.resetAllMocks());

  it.each([true, false])('uses the existing mutation method for shouldLike=%s', async (shouldLike) => {
    const path = '/auth/skills/61/like/';
    const response = { offer_id: 61, is_liked_by_me: shouldLike, likes_count: shouldLike ? 3 : 2 };
    endpoint.mockReturnValue(path);
    (shouldLike ? post : remove).mockResolvedValue({ data: response });

    await expect(setOfferLikeState(61, shouldLike)).resolves.toBe(response);
    expect(endpoint).toHaveBeenCalledTimes(1);
    expect(endpoint).toHaveBeenCalledWith(61);
    expect(shouldLike ? post : remove).toHaveBeenCalledTimes(1);
    expect(shouldLike ? post : remove).toHaveBeenCalledWith(path);
    expect(shouldLike ? remove : post).not.toHaveBeenCalled();
  });

  it.each([1, Number.MAX_SAFE_INTEGER])('accepts a positive safe integer ID: %s', async (offerId) => {
    endpoint.mockReturnValue(`/auth/skills/${offerId}/like/`);
    const response = { offer_id: offerId, is_liked_by_me: false, likes_count: 0 };
    remove.mockResolvedValue({ data: response });
    await expect(setOfferLikeState(offerId, false)).resolves.toBe(response);
    expect(endpoint).toHaveBeenCalledWith(offerId);
    expect(post).not.toHaveBeenCalled();
  });

  it.each([
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
    '61' as unknown as number,
    null as unknown as number,
    undefined as unknown as number,
  ])('rejects an invalid ID before endpoint resolution or network activity: %s', async (offerId) => {
    await expect(setOfferLikeState(offerId, true)).rejects.toThrow('Invalid offer id');
    expect(endpoint).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it.each([true, false].flatMap((shouldLike) =>
    [401, 403, 404, 429, 500, null].map((status) => ({ shouldLike, status })),
  ))('propagates failures unchanged without retry ($shouldLike, HTTP=$status)', async ({ shouldLike, status }) => {
    const failure = Object.assign(new Error('Request failed'), {
      response: status === null ? undefined : { status },
    });
    endpoint.mockReturnValue('/auth/skills/61/like/');
    (shouldLike ? post : remove).mockRejectedValue(failure);

    await expect(setOfferLikeState(61, shouldLike)).rejects.toBe(failure);
    expect(shouldLike ? post : remove).toHaveBeenCalledTimes(1);
    expect(shouldLike ? remove : post).not.toHaveBeenCalled();
  });
});
