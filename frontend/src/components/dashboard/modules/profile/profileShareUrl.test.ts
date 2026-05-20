import {
  buildProfileSharePath,
  buildProfileShareUrl,
  getProfileShareIdentifier,
} from './profileShareUrl';

describe('profileShareUrl', () => {
  it('uses the URL-safe profile slug when available', () => {
    expect(getProfileShareIdentifier({ id: 42, username: 'jana', slug: 'jana-novakova' })).toBe(
      'jana-novakova',
    );
  });

  it('falls back to the numeric id when slug is missing', () => {
    expect(buildProfileSharePath({ id: 42, username: 'jana', slug: null })).toBe('/dashboard/users/42');
  });

  it('falls back to the numeric id when slug is empty or whitespace', () => {
    expect(getProfileShareIdentifier({ id: 42, username: 'jana', slug: '' })).toBe('42');
    expect(buildProfileSharePath({ id: 42, username: 'jana', slug: '  ' })).toBe('/dashboard/users/42');
  });

  it('builds an absolute profile URL from the supplied origin', () => {
    expect(
      buildProfileShareUrl(
        { id: 42, username: 'jana', slug: 'jana novakova' },
        'https://svaply.example/',
      ),
    ).toBe('https://svaply.example/dashboard/users/jana%20novakova');
  });

  it('builds an absolute profile URL from an origin without trailing slash', () => {
    expect(
      buildProfileShareUrl(
        { id: 42, username: 'jana', slug: 'jana-novakova' },
        'https://svaply.example',
      ),
    ).toBe('https://svaply.example/dashboard/users/jana-novakova');
  });

  it('returns only the profile path when origin is omitted outside the browser', () => {
    const user = { id: 42, username: 'jana', slug: 'jana-novakova' };
    const originalWindow = globalThis.window;

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: undefined,
    });

    try {
      expect(buildProfileShareUrl(user)).toBe(buildProfileSharePath(user));
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
