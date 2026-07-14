jest.mock('@/lib/apiUrl', () => ({
  getConfiguredApiUrl: () => '/api',
}));

import {
  isProtectedPortfolioImageUrl,
  resolveProtectedPortfolioImageRequestUrl,
} from './protectedImageUrl';

describe('protectedImageUrl', () => {
  it('detects an absolute protected portfolio file URL and returns an axios-relative path with the query', () => {
    const url =
      'https://backend-http-svap.up.railway.app/api/auth/portfolio/5/images/13/file/?variant=medium';
    expect(resolveProtectedPortfolioImageRequestUrl(url)).toBe(
      '/auth/portfolio/5/images/13/file/?variant=medium',
    );
    expect(isProtectedPortfolioImageUrl(url)).toBe(true);
  });

  it('detects a relative protected path', () => {
    expect(
      resolveProtectedPortfolioImageRequestUrl('/api/auth/portfolio/5/images/13/file/'),
    ).toBe('/auth/portfolio/5/images/13/file/');
  });

  it('treats non-file portfolio URLs as public (null)', () => {
    expect(
      resolveProtectedPortfolioImageRequestUrl('https://backend/api/auth/portfolio/5/images/13/'),
    ).toBeNull();
    expect(
      resolveProtectedPortfolioImageRequestUrl('https://backend/api/auth/portfolio/5/'),
    ).toBeNull();
  });

  it('treats public S3 / blob / data / empty URLs as not protected', () => {
    expect(
      resolveProtectedPortfolioImageRequestUrl('https://cdn.example.com/media/offers/1/x.webp'),
    ).toBeNull();
    expect(resolveProtectedPortfolioImageRequestUrl('blob:http://localhost/abc')).toBeNull();
    expect(resolveProtectedPortfolioImageRequestUrl('data:image/png;base64,AAAA')).toBeNull();
    expect(resolveProtectedPortfolioImageRequestUrl('')).toBeNull();
    expect(resolveProtectedPortfolioImageRequestUrl(null)).toBeNull();
    expect(resolveProtectedPortfolioImageRequestUrl(undefined)).toBeNull();
  });

  it('does not match messaging image URLs (only portfolio file endpoint is protected here)', () => {
    expect(
      resolveProtectedPortfolioImageRequestUrl(
        'https://backend/api/auth/messaging/conversations/9/messages/1/image/',
      ),
    ).toBeNull();
  });
});
