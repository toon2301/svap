/**
 * Zloženie aktuálnej adresy prehliadača.
 *
 * Helper vznikol preto, že si ho dashboard skladal na dvoch miestach zvlášť
 * a jedno z nich zabúdalo na fragment. Tieto testy držia všetky štyri tvary
 * adresy, ktoré vedia nastať.
 */

import { currentBrowserUrl } from '../currentBrowserUrl';

const FALLBACK = '/dashboard';

describe('currentBrowserUrl', () => {
  it('keeps the query and the fragment together', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?tab=posts#sekcia');

    expect(currentBrowserUrl(FALLBACK)).toBe(
      '/dashboard/users/peter?tab=posts#sekcia',
    );
  });

  it('returns a bare path when there is neither', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter');

    expect(currentBrowserUrl(FALLBACK)).toBe('/dashboard/users/peter');
  });

  it('keeps a query on its own', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?offer=55');

    expect(currentBrowserUrl(FALLBACK)).toBe('/dashboard/users/peter?offer=55');
  });

  it('keeps a fragment on its own', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter#sekcia');

    expect(currentBrowserUrl(FALLBACK)).toBe('/dashboard/users/peter#sekcia');
  });

  it('stays relative to the origin', () => {
    window.history.replaceState(null, '', '/dashboard/users/peter?tab=posts');

    // Uložená hodnota ide do `history.pushState`, kam patrí relatívna adresa –
    // `window.location.href` by tam priniesol aj origin.
    expect(currentBrowserUrl(FALLBACK)).not.toContain('http');
  });
});
