import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { LanguageProvider, useLanguage } from '../LanguageContext';
import {
  GEO_DETECTION_CACHE_KEY,
  GEO_DETECTION_FAILURE_TTL_MS,
  GEO_DETECTION_SUCCESS_TTL_MS,
  LAST_MANUAL_OFFER_COUNTRY_KEY,
} from '@/shared/offerCountryPreference';

jest.unmock('@/contexts/LanguageContext');

const originalFetch = global.fetch;
const wrapper = ({ children }: PropsWithChildren) => <LanguageProvider>{children}</LanguageProvider>;

function cache(country: string | null, age = 0, status = country ? 'ok' : 'failed') {
  localStorage.setItem(GEO_DETECTION_CACHE_KEY, JSON.stringify({
    country, detectedAt: Date.now() - age, status,
  }));
}

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

describe('independent IP search country with the real LanguageProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'CZ');
    Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-GB' });
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['en-GB'] });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ country_code: 'SK' }) });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('separates a fresh IP country from a saved manual form country without changing browser locale', () => {
    cache('SK');
    const hook = renderHook(useLanguage, { wrapper });
    expect(hook.result.current).toMatchObject({ country: 'CZ', searchCountry: 'SK', locale: 'en' });
    expect(global.fetch).not.toHaveBeenCalled();
    act(() => hook.result.current.setCountry('PL'));
    expect(hook.result.current).toMatchObject({ country: 'PL', searchCountry: 'SK', locale: 'en' });
    expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('PL');
    expect(JSON.parse(localStorage.getItem(GEO_DETECTION_CACHE_KEY)!)).toMatchObject({ country: 'SK' });
    act(() => hook.result.current.setCountry(null));
    expect(hook.result.current).toMatchObject({ country: null, searchCountry: 'SK' });
    expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBeNull();
  });

  it.each([
    ['successful cache', 'CZ', GEO_DETECTION_SUCCESS_TTL_MS, 'ok'],
    ['failed cache', null, GEO_DETECTION_FAILURE_TTL_MS, 'failed'],
  ])('refreshes an expired %s even when a manual country exists', async (_label, country, age, status) => {
    cache(country, age, status);
    const hook = renderHook(useLanguage, { wrapper });
    expect(hook.result.current.searchCountry).toBeNull();
    await waitFor(() => expect(hook.result.current.searchCountry).toBe('SK'));
    expect(hook.result.current).toMatchObject({ country: 'CZ', locale: 'en' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/');
    expect(JSON.parse(localStorage.getItem(GEO_DETECTION_CACHE_KEY)!)).toMatchObject({ country: 'SK', status: 'ok' });
  });

  it.each([
    [GEO_DETECTION_SUCCESS_TTL_MS - 100, 'SK', 'ok', 'SK'],
    [GEO_DETECTION_FAILURE_TTL_MS - 100, null, 'failed', null],
    [0, 'SK', 'failed', null],
  ])('retains the cache TTL contract at age %s without using manual country for search', (age, country, status, expected) => {
    cache(country, age, status);
    const hook = renderHook(useLanguage, { wrapper });
    expect(hook.result.current.searchCountry).toBe(expected);
    expect(hook.result.current.country).toBe('CZ');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(['IT', 'sk', 'US'])('accepts supported country %s independently of district availability', async (country) => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ country_code: country }) });
    const hook = renderHook(useLanguage, { wrapper });
    await waitFor(() => expect(hook.result.current.searchCountry).toBe(country.toUpperCase()));
    expect(hook.result.current.country).toBe('CZ');
  });

  it('canonicalizes whitespace and case before using an IP country in requests or preferences', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => ({ country_code: ' sk ' }) });
    const hook = renderHook(useLanguage, { wrapper });
    await waitFor(() => expect(hook.result.current.searchCountry).toBe('SK'));
    expect(JSON.parse(localStorage.getItem(GEO_DETECTION_CACHE_KEY)!)).toMatchObject({ country: 'SK', status: 'ok' });
  });

  it.each([
    ['invalid country', { ok: true, json: async () => ({ country_code: 'ZZ' }) }],
    ['missing country', { ok: true, json: async () => ({}) }],
    ['empty body', { ok: true, json: async () => null }],
    ['failed status', { ok: false, json: jest.fn() }],
    ['invalid JSON', { ok: true, json: async () => { throw new Error('JSON'); } }],
  ])('keeps search country unset on %s rather than falling back to manual CZ or SK', async (_label, response) => {
    (global.fetch as jest.Mock).mockResolvedValue(response);
    const hook = renderHook(useLanguage, { wrapper });
    await waitFor(() => expect(localStorage.getItem(GEO_DETECTION_CACHE_KEY)).not.toBeNull());
    expect(hook.result.current).toMatchObject({ country: 'CZ', searchCountry: null, locale: 'en' });
    expect(JSON.parse(localStorage.getItem(GEO_DETECTION_CACHE_KEY)!)).toMatchObject({ country: null, status: 'failed' });
  });

  it('handles an offline detection without replacing the existing form preference', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Offline'));
    const hook = renderHook(useLanguage, { wrapper });
    await waitFor(() => expect(localStorage.getItem(GEO_DETECTION_CACHE_KEY)).not.toBeNull());
    expect(hook.result.current).toMatchObject({ country: 'CZ', searchCountry: null, locale: 'en' });
  });

  it('does not overwrite a manual form selection made while the IP request is pending', async () => {
    const request = deferred();
    (global.fetch as jest.Mock).mockReturnValue(request.promise);
    const hook = renderHook(useLanguage, { wrapper });
    act(() => hook.result.current.setCountry('HU'));
    await act(async () => { request.resolve({ ok: true, json: async () => ({ country_code: 'SK' }) }); });
    expect(hook.result.current).toMatchObject({ country: 'HU', searchCountry: 'SK', locale: 'en' });
    expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('HU');
  });

  it('respects a late direct form preference writer without inheriting it for search', async () => {
    localStorage.removeItem(LAST_MANUAL_OFFER_COUNTRY_KEY);
    const request = deferred();
    (global.fetch as jest.Mock).mockReturnValue(request.promise);
    const hook = renderHook(useLanguage, { wrapper });
    localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'PL');
    await act(async () => { request.resolve({ ok: true, json: async () => ({ country_code: 'SK' }) }); });
    expect(hook.result.current).toMatchObject({ country: 'PL', searchCountry: 'SK', locale: 'sk' });
  });

  it('preserves an explicitly selected locale when newly independent IP detection finishes late', async () => {
    const request = deferred();
    (global.fetch as jest.Mock).mockReturnValue(request.promise);
    const hook = renderHook(useLanguage, { wrapper });
    act(() => hook.result.current.setLocale('hu'));
    await act(async () => { request.resolve({ ok: true, json: async () => ({ country_code: 'SK' }) }); });
    expect(hook.result.current).toMatchObject({ country: 'CZ', searchCountry: 'SK', locale: 'hu' });
    expect(localStorage.getItem('appLocale')).toBe('hu');
  });

  it.each(['success', 'failure'])('does not write late %s detection after unmount', async (outcome) => {
    const request = deferred();
    (global.fetch as jest.Mock).mockReturnValue(request.promise);
    const hook = renderHook(useLanguage, { wrapper });
    hook.unmount();
    await act(async () => {
      if (outcome === 'success') request.resolve({ ok: true, json: async () => ({ country_code: 'SK' }) });
      else request.reject(new Error('Offline'));
    });
    expect(localStorage.getItem(GEO_DETECTION_CACHE_KEY)).toBeNull();
    expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('CZ');
  });

  it('recovers from a malformed IP cache with an independent fresh lookup', async () => {
    localStorage.setItem(GEO_DETECTION_CACHE_KEY, 'malformed');
    const hook = renderHook(useLanguage, { wrapper });
    await waitFor(() => expect(hook.result.current.searchCountry).toBe('SK'));
    expect(hook.result.current.country).toBe('CZ');
  });

  it('keeps live IP search country available when storage is denied', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Denied'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied'); });
    const hook = renderHook(useLanguage, { wrapper });
    await waitFor(() => expect(hook.result.current.searchCountry).toBe('SK'));
    expect(hook.result.current.country).toBe('SK');
    act(() => hook.result.current.setLocale('de'));
    expect(hook.result.current.locale).toBe('de');
  });
});
