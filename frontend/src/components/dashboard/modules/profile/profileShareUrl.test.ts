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

  it('builds an absolute profile URL from the supplied origin', () => {
    expect(
      buildProfileShareUrl(
        { id: 42, username: 'jana', slug: 'jana novakova' },
        'https://svaply.example/',
      ),
    ).toBe('https://svaply.example/dashboard/users/jana%20novakova');
  });
});
