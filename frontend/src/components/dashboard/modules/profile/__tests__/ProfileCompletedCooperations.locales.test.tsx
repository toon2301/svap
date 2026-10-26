/**
 * Profil: „Dokončené spolupráce“ sa zobrazuje v jazyku aplikácie (nález 165, T11). Text bol natvrdo po
 * slovensky v hlavičke na PC aj v mobilnom zobrazení, pre vlastný aj cudzí profil.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';
import type { User } from '@/types';
import { ProfileDesktopHeader } from '../ProfileDesktopHeader';
import ProfileMobileView from '../ProfileMobileView';

jest.unmock('@/contexts/LanguageContext');

jest.mock('../UserAvatar', () => ({ __esModule: true, default: () => null }));
jest.mock('../view/WebsitesRow', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileDesktopSocialLinks', () => ({ ProfileDesktopSocialLinks: () => null }));
jest.mock('../../ProfileEditFormMobile', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileOffersMobileSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileFeedSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfilePortfolioSection', () => ({ __esModule: true, default: () => null }));

type HeaderProps = ComponentProps<typeof ProfileDesktopHeader>;
type MobileProps = ComponentProps<typeof ProfileMobileView>;

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

const userWith = (completed: number | undefined): User =>
  ({ ...baseUser, completed_cooperations_count: completed }) as User;

const EXPECTED = {
  sk: 'Dokončené spolupráce: 3',
  en: 'Completed requests: 3',
  cs: 'Dokončené žádosti: 3',
  de: 'Abgeschlossene Anfragen: 3',
  pl: 'Zakończone prośby: 3',
  hu: 'Befejezett kérések: 3',
} as const;
type Locale = keyof typeof EXPECTED;
const locales = Object.keys(EXPECTED) as Locale[];

function headerProps(user: User, isOtherUserProfile: boolean): HeaderProps {
  return {
    displayUser: user,
    accountType: 'personal',
    isOtherUserProfile,
    isUploading: false,
    onPhotoUpload: jest.fn(),
    onAvatarClick: jest.fn(),
    onOpenAllWebsitesModal: jest.fn(),
    onHamburgerOpen: jest.fn(),
  };
}

function mobileProps(user: User, isOtherUserProfile: boolean): MobileProps {
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
    isOtherUserProfile,
  };
}

const views = {
  'PC hlavička': (user: User, other: boolean) => (
    <ProfileDesktopHeader {...headerProps(user, other)} />
  ),
  'mobilné zobrazenie': (user: User, other: boolean) => (
    <ProfileMobileView {...mobileProps(user, other)} />
  ),
};

function renderIn(locale: Locale, ui: React.ReactElement) {
  localStorage.setItem('appLocale', locale);
  // Čerstvý odhad krajiny, aby provider nevolal sieť.
  localStorage.setItem(
    GEO_DETECTION_CACHE_KEY,
    JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }),
  );
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

beforeEach(() => localStorage.clear());

describe.each(Object.entries(views))('%s', (_name, view) => {
  it.each(locales)('cudzí profil, jazyk %s: počet spoluprác v jazyku aplikácie', (locale) => {
    renderIn(locale, view(userWith(3), true));
    expect(screen.getByText(EXPECTED[locale])).toBeInTheDocument();
  });

  it.each(locales)('vlastný profil, jazyk %s: rovnaký text', (locale) => {
    renderIn(locale, view(userWith(3), false));
    expect(screen.getByText(EXPECTED[locale])).toBeInTheDocument();
  });

  it.each(['cs', 'pl', 'de', 'hu', 'en'] as const)(
    'jazyk %s: po slovensky sa nezobrazí nič',
    (locale) => {
      renderIn(locale, view(userWith(3), true));
      expect(screen.queryByText(/Dokončené spolupráce/)).not.toBeInTheDocument();
    },
  );

  it.each(locales)('jazyk %s: bez dokončených spoluprác sa riadok nezobrazí', (locale) => {
    const { container } = renderIn(locale, view(userWith(0), true));
    for (const text of Object.values(EXPECTED)) {
      expect(container).not.toHaveTextContent(text.replace(': 3', ':'));
    }
  });

  it('chýbajúci počet sa nezobrazí ako „undefined“ ani „NaN“', () => {
    const { container } = renderIn('sk', view(userWith(undefined), true));
    expect(container).not.toHaveTextContent('Dokončené spolupráce');
    expect(container).not.toHaveTextContent(/undefined|NaN/);
  });
});
