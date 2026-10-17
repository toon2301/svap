import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { api } from '@/lib/api';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import type { OfferCountryCode } from '@/shared/countryRegistry';
import { GEO_DETECTION_CACHE_KEY, LAST_MANUAL_OFFER_COUNTRY_KEY } from '@/shared/offerCountryPreference';
import type { User } from '@/types';
import SearchModule from '../SearchModule';
import LocationSection from '../skills/skillDescriptionModal/sections/LocationSection';
import OfferWatchForm from '../offer-watch/settings/OfferWatchForm';
import { createOfferWatchDraft } from '../offer-watch/offerWatchDraft';
import { useSearchApi } from './hooks/useSearchApi';
import { useSearchState } from './hooks/useSearchState';

jest.unmock('@/contexts/LanguageContext');
jest.mock('@/lib/api', () => ({
  api: { get: jest.fn() },
  endpoints: { dashboard: { search: '/search/', searchRecommendations: '/recommendations/' } },
}));

const mockGet = api.get as jest.Mock;
const account = { id: 91 } as User;
const noop = () => {};
const searchCalls = () => mockGet.mock.calls.filter(([path]) => path === '/search/');

function Flow({ kind }: { kind: 'offer' | 'seeking' | 'watch' | 'watch-edit' }) {
  const [showForm, setShowForm] = useState(true);
  const [countryCode, setCountryCode] = useState<OfferCountryCode>('SK');
  const [draft, setDraft] = useState(() => createOfferWatchDraft());
  const language = useLanguage();
  const state = useSearchState();
  const search = useSearchApi({ searchState: state });
  return <>
    <output data-testid='form-country'>{language.country}</output>
    <output data-testid='search-country'>{language.searchCountry}</output>
    <button onClick={search.invalidateCache}>Clear test cache</button>
    {showForm ? kind.startsWith('watch') ? <OfferWatchForm idPrefix='country-test' draft={draft}
      errors={{}} onChange={setDraft} onSubmit={noop} submitLabel='Uložiť' submittingLabel='Ukladanie'
      isSubmitting={false} secondaryLabel='Zrušiť' onSecondary={() => setShowForm(false)}
      persistCountrySelection={kind === 'watch'} /> : <section>
      <LocationSection value='' onChange={noop} onBlur={noop} error='' isSaving={false}
        countryCode={countryCode} onCountryCodeChange={setCountryCode} showCountrySelector isSeeking={kind === 'seeking'} />
      <button onClick={() => setShowForm(false)}>Zrušiť</button>
    </section> : <SearchModule user={account} />}
  </>;
}

describe('real form country selection, cancellation and later search', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('appLocale', 'sk');
    localStorage.setItem(GEO_DETECTION_CACHE_KEY, JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }));
    mockGet.mockReset().mockResolvedValue({ data: { skills: [], users: [] }, status: 200 });
  });

  it.each(['offer', 'seeking', 'watch', 'watch-edit'] as const)(
    'keeps %s form preference semantics without leaking selected CZ into search after cancellation', async (kind) => {
      render(<LanguageProvider><Flow kind={kind} /></LanguageProvider>);
      fireEvent.click(screen.getByRole('button', { name: 'Clear test cache' }));
      if (kind.startsWith('watch')) fireEvent.focus(screen.getByRole('combobox', { name: 'Krajina' }));
      else fireEvent.click(screen.getByRole('button', { name: 'Krajina' }));
      fireEvent.click(screen.getByRole('option', { name: /Česko/ }));
      if (kind === 'watch-edit') {
        expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBeNull();
        expect(screen.getByTestId('form-country')).toHaveTextContent('SK');
      } else {
        expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('CZ');
        expect(screen.getByTestId('form-country')).toHaveTextContent('CZ');
      }
      expect(screen.getByTestId('search-country')).toHaveTextContent('SK');
      fireEvent.click(screen.getByRole('button', { name: 'Zrušiť' }));
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'monitorovanie' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(searchCalls()).toHaveLength(1));
      expect(searchCalls()[0][1].params.country).toBe('SK');
    },
  );

  it('automatically re-runs the current query with refreshed IP country, not a pending manual country', async () => {
    const originalFetch = global.fetch;
    localStorage.removeItem(GEO_DETECTION_CACHE_KEY);
    localStorage.setItem(LAST_MANUAL_OFFER_COUNTRY_KEY, 'CZ');
    let finish!: (value: unknown) => void;
    global.fetch = jest.fn().mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    try {
      render(<LanguageProvider><SearchModule user={account} /></LanguageProvider>);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'monitorovanie-refreshed' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      await waitFor(() => expect(searchCalls()).toHaveLength(1));
      expect(searchCalls()[0][1].params).not.toHaveProperty('country');
      await act(async () => { finish({ ok: true, json: async () => ({ country_code: 'SK' }) }); });
      await waitFor(() => expect(searchCalls()).toHaveLength(2));
      expect(searchCalls()[1][1].params.country).toBe('SK');
      expect(localStorage.getItem(LAST_MANUAL_OFFER_COUNTRY_KEY)).toBe('CZ');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
