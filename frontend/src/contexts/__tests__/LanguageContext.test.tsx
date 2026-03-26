import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LanguageProvider, useLanguage } from '../LanguageContext';

const originalFetch = global.fetch;
const originalWindowFetch = window.fetch;

function Consumer() {
  const { locale, country } = useLanguage();

  return (
    <div>
      <div data-testid="locale">{locale}</div>
      <div data-testid="country">{country ?? '-'}</div>
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
      'appGeoDetectionCacheV1',
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
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uses a fresh failed geo cache cooldown and falls back to browser locale', async () => {
    setNavigatorLanguage('de-DE');
    localStorage.setItem(
      'appGeoDetectionCacheV1',
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
      expect(screen.getByTestId('locale')).toHaveTextContent('sk');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

});
