/**
 * Profil: „a ďalší (N)“ pod webom sa zobrazuje v jazyku aplikácie (nález 166 – rozšírenie na rovnakú
 * chybu na tej istej obrazovke). Text bol natvrdo po slovensky v mobilnom zobrazení aj v riadku webov na PC.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';
import type { User } from '@/types';
import ProfileMobileView from '../ProfileMobileView';
import WebsitesRow from '../view/WebsitesRow';

jest.unmock('@/contexts/LanguageContext');

jest.mock('../../ProfileEditFormMobile', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileOffersMobileSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileFeedSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfilePortfolioSection', () => ({ __esModule: true, default: () => null }));

const EXPECTED = {
  sk: 'a ďalší (2)',
  en: 'and 2 more',
  cs: 'a další (2)',
  de: 'und 2 weitere',
  pl: 'i 2 więcej',
  hu: 'és még 2',
} as const;
type Locale = keyof typeof EXPECTED;
const LOCALES = Object.keys(EXPECTED) as Locale[];

const baseUser = {
  id: 7,
  username: 'jana',
  email: 'j@example.com',
  first_name: 'Jana',
  last_name: 'Nováková',
  slug: 'jana',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

const withWebsites = (additional: string[]): User =>
  ({ ...baseUser, website: 'https://jana.example', additional_websites: additional }) as User;

const THREE_WEBSITES = withWebsites(['https://dva.example', 'https://tri.example']);

function mobileProps(user: User): ComponentProps<typeof ProfileMobileView> {
  return {
    user,
    displayUser: user,
    isEditMode: false,
    isUploading: false,
    onPhotoUpload: jest.fn(),
    onAvatarClick: jest.fn(),
    activeTab: 'offers',
    onChangeTab: jest.fn(),
    onTabsKeyDown: jest.fn(),
    onOpenAllWebsitesModal: jest.fn(),
    isOtherUserProfile: true,
  };
}

function renderIn(locale: Locale, ui: React.ReactElement) {
  localStorage.setItem('appLocale', locale);
  // Čerstvý odhad krajiny, aby provider nevolal sieť.
  localStorage.setItem(
    GEO_DETECTION_CACHE_KEY,
    JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }),
  );
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

const views = {
  'riadok webov na PC': (user: User) => <WebsitesRow user={user} onOpenAll={jest.fn()} />,
  'mobilné zobrazenie': (user: User) => <ProfileMobileView {...mobileProps(user)} />,
};

beforeEach(() => localStorage.clear());

describe.each(Object.entries(views))('%s', (_name, view) => {
  it.each(LOCALES)('jazyk %s: počet ďalších webov v jazyku aplikácie', (locale) => {
    renderIn(locale, view(THREE_WEBSITES));
    expect(screen.getByText(EXPECTED[locale])).toBeInTheDocument();
    expect(screen.getByText('https://jana.example')).toBeInTheDocument();
  });

  it.each(['cs', 'pl', 'de', 'hu', 'en'] as const)('jazyk %s: po slovensky sa nezobrazí nič', (locale) => {
    renderIn(locale, view(THREE_WEBSITES));
    expect(screen.queryByText(/ďalší/)).not.toBeInTheDocument();
  });

  it.each(LOCALES)('jazyk %s: pri jedinom webe sa „a ďalší“ nezobrazí, ostane odkaz', (locale) => {
    const { container } = renderIn(locale, view(withWebsites([])));
    expect(screen.getByRole('link', { name: 'https://jana.example' })).toBeInTheDocument();
    for (const text of Object.values(EXPECTED)) {
      expect(container).not.toHaveTextContent(text.replace('2', '0'));
    }
    expect(container).not.toHaveTextContent(/\{count\}/);
  });
});
