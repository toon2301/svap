import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.unmock('@/contexts/LanguageContext');

import {
  isSupportedCountryCode,
  LanguageProvider,
  useLanguage,
} from '../LanguageContext';
import {
  GEO_DETECTION_CACHE_KEY,
  LAST_MANUAL_OFFER_COUNTRY_KEY,
} from '@/shared/offerCountryPreference';

const originalFetch = global.fetch;
const originalWindowFetch = window.fetch;

function Consumer() {
  const { locale, country, setCountry } = useLanguage();

  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="country">{country ?? '-'}</div>
      <button type="button" onClick={() => setCountry('PL')}>
        set PL
      </button>
    </div>
  );
}

function setNavigatorLanguage(language: string) {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  });
  Object.defineProperty(window.navigator, 'languages', {
    configurable: true,
    value: [language],
  });
}

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    setNavigatorLanguage('sk-SK');
    global.fetch = jest.fn();
    window.fetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    window.fetch = originalWindowFetch;
  });

  it('uses a fresh cached geo detection result without calling ipapi again', async () => {
    localStorage.setItem(
      'appGeoDetectionCacheV2',
      JSON.stringify({
        country: 'SK',
        detectedAt: Date.now(),
        status: 'ok',
      })
    );

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('locale')).toHaveTextContent('sk');
      expect(screen.getByTestId('country')).toHaveTextContent('SK');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses a fresh failed geo cache cooldown and falls back to browser locale', async () => {
    setNavigatorLanguage('de-DE');
    localStorage.setItem(
      'appGeoDetectionCacheV2',
      JSON.stringify({
        country: null,
        detectedAt: Date.now(),
        status: 'failed',
      })
    );

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('locale')).toHaveTextContent('de');
      expect(screen.getByTestId('country')).toHaveTextContent('-');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('accepts an IP-detected country outside the district registry', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'IT' }),
    });

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('country')).toHaveTextContent('IT');
    });
    expect(isSupportedCountryCode('IT')).toBe(true);
    expect(isSupportedCountryCode('ZZ')).toBe(false);
  });

  it('treats an invalid IP country as a failed detection with no fallback', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ country_code: 'ZZ' }),
    });

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('country')).toHaveTextContent('-');
      expect(
        JSON.parse(localStorage.getItem(GEO_DETECTION_CACHE_KEY) || '{}'),
      ).toMatchObject({
        country: null,
        status: 'failed',
      });
    });
  });

  it('prefers the last manual country over a cached IP country', async () => {
    setNavigatorLanguage('de-DE');
    localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'CZ');
    localStorage.setItem(
      GEO_DETECTION_CACHE_KEY,
      JSON.stringify({
        country: 'DE',
        detectedAt: Date.now(),
        status: 'ok',
      }),
    );

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('country')).toHaveTextContent('CZ');
      expect(screen.getByTestId('locale')).toHaveTextContent('de');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not let a late IP response overwrite a manual choice', async () => {
    let finishDetection: ((value: unknown) => void) | undefined;
    (global.fetch as jest.Mock).mockReturnValue(
      new Promise((resolve) => {
        finishDetection = resolve;
      }),
    );

    render(
      <LanguageProvider>
        <Consumer />
      </LanguageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'set PL' }));
    expect(screen.getByTestId('country')).toHaveTextContent('PL');

    await act(async () => {
      finishDetection?.({
        ok: true,
        json: async () => ({
          country_code: 'IT',
          ip: '203.0.113.10',
          city: 'Rome',
        }),
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId('country')).toHaveTextContent('PL');
    });
    expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('PL');
    const geoCache = localStorage.getItem(GEO_DETECTION_CACHE_KEY) || '';
    expect(geoCache).not.toContain('203.0.113.10');
    expect(geoCache).not.toContain('Rome');
  });

});
