/**
 * Načítavanie a chybová obrazovka cudzieho profilu sa zobrazujú v jazyku aplikácie (nález 166, T14).
 * V češtine a poľštine ostával slovenský text a pri výpadku siete sa ukazovalo anglické „Network Error“
 * (surová správa z knižnice axios; rovnako „timeout of 30000ms exceeded“ a „Request failed with status code“).
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';
import { api } from '@/lib/api';
import { SearchUserProfileModule } from './SearchUserProfileModule';
import ViewedUserProfileGate from './ViewedUserProfileGate';
import { invalidateUserProfileCache } from '../profile/profileUserCache';

jest.unmock('@/contexts/LanguageContext');

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));
jest.mock('@/hooks', () => ({ __esModule: true, useIsMobile: () => false }));
jest.mock('@/lib/api', () => ({
  __esModule: true,
  api: { get: jest.fn(), post: jest.fn() },
  endpoints: {
    dashboard: { userProfile: (id: number) => `/auth/dashboard/users/${id}/` },
    users: { block: (id: number) => `/auth/users/${id}/block/` },
  },
}));
jest.mock('../favoritesApi', () => ({ __esModule: true, setFavoriteUserState: jest.fn() }));
jest.mock('../messages/messagingApi', () => ({ __esModule: true, getMessagingErrorMessage: jest.fn() }));
jest.mock('../profile/profileLikesApi', () => ({ __esModule: true, setProfileLikeState: jest.fn() }));
jest.mock('../profile/profileOffersCache', () => ({ __esModule: true, invalidateOffersCache: jest.fn() }));
jest.mock('./hooks/useSearchApi', () => ({ __esModule: true, invalidateSearchCacheForUser: jest.fn() }));
jest.mock('./recentSearchStorage', () => ({ __esModule: true, removeUserFromRecentSearches: jest.fn() }));
jest.mock('../profile/ProfileDesktopView', () => ({ __esModule: true, default: () => null }));
jest.mock('../profile/ProfileMobileView', () => ({ __esModule: true, default: () => null }));
jest.mock('../profile/ProfileWebsitesModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../shared/OfferImageGalleryLightbox', () => ({ __esModule: true, default: () => null }));

const LOCALES = ['sk', 'en', 'cs', 'de', 'pl', 'hu'] as const;
type Locale = (typeof LOCALES)[number];

type Texts = {
  loadingProfile: string;
  loadingUserProfile: string;
  notFound: string;
  rateLimited: string;
  loadError: string;
  networkError: string;
  backToDashboard: string;
  retry: string;
};

const TEXTS: Record<Locale, Texts> = {
  sk: {
    loadingProfile: 'Načítavam profil...',
    loadingUserProfile: 'Načítavam profil používateľa...',
    notFound: 'Profil používateľa sa nepodarilo načítať.',
    rateLimited: 'Príliš veľa požiadaviek pri načítavaní profilu, skúste to o chvíľu.',
    loadError: 'Nepodarilo sa načítať profil používateľa.',
    networkError: 'Chyba siete. Skontrolujte pripojenie a skúste to znova.',
    backToDashboard: 'Späť na nástenku',
    retry: 'Skúsiť znova',
  },
  en: {
    loadingProfile: 'Loading profile...',
    loadingUserProfile: 'Loading user profile...',
    notFound: 'Failed to load user profile.',
    rateLimited: 'Too many requests while loading profile. Please try again shortly.',
    loadError: 'Failed to load user profile.',
    networkError: 'Network error. Check your connection and try again.',
    backToDashboard: 'Back to dashboard',
    retry: 'Try again',
  },
  cs: {
    loadingProfile: 'Načítám profil...',
    loadingUserProfile: 'Načítám profil uživatele...',
    notFound: 'Profil uživatele se nepodařilo načíst.',
    rateLimited: 'Příliš mnoho požadavků při načítání profilu, zkuste to za chvíli.',
    loadError: 'Nepodařilo se načíst profil uživatele.',
    networkError: 'Chyba sítě. Zkontrolujte připojení a zkuste to znovu.',
    backToDashboard: 'Zpět na nástěnku',
    retry: 'Zkusit znovu',
  },
  de: {
    loadingProfile: 'Profil wird geladen...',
    loadingUserProfile: 'Nutzerprofil wird geladen...',
    notFound: 'Nutzerprofil konnte nicht geladen werden.',
    rateLimited: 'Zu viele Anfragen beim Laden des Profils, bitte später erneut versuchen.',
    loadError: 'Profil konnte nicht geladen werden.',
    networkError: 'Netzwerkfehler. Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
    backToDashboard: 'Zurück zum Dashboard',
    retry: 'Erneut versuchen',
  },
  pl: {
    loadingProfile: 'Ładowanie profilu...',
    loadingUserProfile: 'Ładowanie profilu użytkownika...',
    notFound: 'Nie udało się załadować profilu użytkownika.',
    rateLimited: 'Zbyt wiele żądań podczas ładowania profilu, spróbuj za chwilę.',
    loadError: 'Nie udało się załadować profilu użytkownika.',
    networkError: 'Błąd sieci. Sprawdź połączenie i spróbuj ponownie.',
    backToDashboard: 'Powrót do panelu',
    retry: 'Spróbuj ponownie',
  },
  hu: {
    loadingProfile: 'Profil betöltése...',
    loadingUserProfile: 'Felhasználói profil betöltése...',
    notFound: 'A felhasználói profil nem tölthető be.',
    rateLimited: 'Túl sok kérés a profil betöltésekor, próbálja később.',
    loadError: 'A felhasználói profil betöltése sikertelen.',
    networkError: 'Hálózati hiba. Ellenőrizze a kapcsolatot, és próbálja újra.',
    backToDashboard: 'Vissza az irányítópultra',
    retry: 'Újrapróbálom',
  },
};

// Surové technické správy knižnice axios, ktoré sa používateľovi nesmú ukázať.
const TECHNICAL_MESSAGES = /Network Error|timeout of|Request failed with status code/;

function renderIn(locale: Locale, ui: React.ReactElement) {
  localStorage.setItem('appLocale', locale);
  // Čerstvý odhad krajiny, aby provider nevolal sieť.
  localStorage.setItem(
    GEO_DETECTION_CACHE_KEY,
    JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }),
  );
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const renderProfile = (locale: Locale) =>
  renderIn(locale, <SearchUserProfileModule userId={42} currentUserId={7} />);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  invalidateUserProfileCache(42);
  window.history.replaceState(null, '', '/dashboard/users/42');
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('SearchUserProfileModule – texty v jazyku aplikácie', () => {
  it.each(LOCALES)('jazyk %s: načítavanie profilu', (locale) => {
    (api.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderProfile(locale);
    expect(screen.getByText(TEXTS[locale].loadingUserProfile)).toBeInTheDocument();
  });

  const failures: Array<[string, unknown, keyof Texts]> = [
    ['404', { response: { status: 404 } }, 'notFound'],
    ['429', { response: { status: 429 } }, 'rateLimited'],
    ['500 bez textu', { response: { status: 500 } }, 'loadError'],
    [
      '502 so správou knižnice',
      { message: 'Request failed with status code 502', response: { status: 502 } },
      'loadError',
    ],
    ['výpadok siete', { code: 'ERR_NETWORK', message: 'Network Error' }, 'networkError'],
    [
      'časový limit',
      { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' },
      'networkError',
    ],
  ];

  describe.each(failures)('chyba %s', (_label, failure, textKey) => {
    it.each(LOCALES)('jazyk %s: preložený text a tlačidlo späť na nástenku', async (locale) => {
      (api.get as jest.Mock).mockRejectedValue(failure);
      renderProfile(locale);

      expect(await screen.findByText(TEXTS[locale][textKey])).toBeInTheDocument();
      expect(screen.getByRole('button', { name: TEXTS[locale].backToDashboard })).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent(TECHNICAL_MESSAGES);
    });
  });

  it('text z backendu (error) sa zobrazí tak, ako prišiel', async () => {
    (api.get as jest.Mock).mockRejectedValue({
      response: { status: 500, data: { error: 'Chyba servera' } },
    });
    renderProfile('cs');
    expect(await screen.findByText('Chyba servera')).toBeInTheDocument();
  });

  it.each(['cs', 'pl', 'de', 'hu', 'en'] as const)(
    'jazyk %s: žiadny slovenský text na chybovej obrazovke',
    async (locale) => {
      (api.get as jest.Mock).mockRejectedValue({ response: { status: 429 } });
      renderProfile(locale);
      await screen.findByText(TEXTS[locale].rateLimited);
      expect(document.body).not.toHaveTextContent(/Príliš|nepodarilo|Späť|Načítavam/);
    },
  );
});

describe('SearchUserProfileModule – zmena jazyka pri zobrazenej chybe', () => {
  function LocaleSwitch({ to }: { to: Locale }) {
    const { setLocale } = useLanguage();
    return (
      <button type="button" onClick={() => setLocale(to)}>
        switch locale
      </button>
    );
  }

  it('hotová chyba sa po zmene jazyka prepíše do nového jazyka (nepoužije sa text z čias načítania)', async () => {
    (api.get as jest.Mock).mockRejectedValue({ response: { status: 404 } });
    renderIn(
      'sk',
      <>
        <LocaleSwitch to="cs" />
        <SearchUserProfileModule userId={42} currentUserId={7} />
      </>,
    );
    expect(await screen.findByText(TEXTS.sk.notFound)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'switch locale' }));
    });

    expect(screen.getByText(TEXTS.cs.notFound)).toBeInTheDocument();
    expect(screen.queryByText(TEXTS.sk.notFound)).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('server mohol poslať text, ktorý nie je reťazec: ukáže sa všeobecná chyba, nie pád', async () => {
    (api.get as jest.Mock).mockRejectedValue({
      response: { status: 500, data: { detail: { field: ['x'] } } },
    });
    renderProfile('de');
    expect(await screen.findByText(TEXTS.de.loadError)).toBeInTheDocument();
  });
});

describe('ViewedUserProfileGate – texty v jazyku aplikácie', () => {
  it.each(LOCALES)('jazyk %s: zisťovanie profilu', (locale) => {
    renderIn(locale, <ViewedUserProfileGate isResolving loadError={false} />);
    expect(screen.getByText(TEXTS[locale].loadingProfile)).toBeInTheDocument();
  });

  it.each(LOCALES)('jazyk %s: profil neexistuje', (locale) => {
    renderIn(locale, <ViewedUserProfileGate isResolving={false} loadError={false} />);
    expect(screen.getByText(TEXTS[locale].notFound)).toBeInTheDocument();
  });

  it.each(LOCALES)('jazyk %s: chyba s tlačidlom na nový pokus', (locale) => {
    renderIn(locale, <ViewedUserProfileGate isResolving={false} loadError onRetry={jest.fn()} />);
    expect(screen.getByText(TEXTS[locale].loadError)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: TEXTS[locale].retry })).toBeInTheDocument();
  });
});
