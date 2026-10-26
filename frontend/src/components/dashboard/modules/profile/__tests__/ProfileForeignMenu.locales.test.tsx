/**
 * Cudzí profil: menu („Zablokovať“, „Nahlásiť“, „Zdieľať“), okno Nahlásiť profil a tlačidlo „Poslať
 * správu“ sa zobrazujú v jazyku aplikácie (nález 165, T11). V češtine a poľštine ostával slovenský text.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { GEO_DETECTION_CACHE_KEY } from '@/shared/offerCountryPreference';
import type { User } from '@/types';
import { ProfileDesktopHamburgerModal } from '../ProfileDesktopHamburgerModal';
import ProfileMobileHamburgerModal from '../ProfileMobileHamburgerModal';
import { ProfileDesktopHeader } from '../ProfileDesktopHeader';
import ProfileMobileView from '../ProfileMobileView';
import { ReportUserModal } from '../ReportUserModal';

jest.unmock('@/contexts/LanguageContext');

const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
  endpoints: { users: { report: (id: number) => `/auth/users/${id}/report/` } },
}));
jest.mock('../UserAvatar', () => ({ __esModule: true, default: () => null }));
jest.mock('../view/WebsitesRow', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileDesktopSocialLinks', () => ({ ProfileDesktopSocialLinks: () => null }));
jest.mock('../../ProfileEditFormMobile', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileOffersMobileSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileFeedSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfilePortfolioSection', () => ({ __esModule: true, default: () => null }));

const LOCALES = ['sk', 'en', 'cs', 'de', 'pl', 'hu'] as const;
type Locale = (typeof LOCALES)[number];

const MENU: Record<Locale, { block: string; report: string; share: string; reported: string }> = {
  sk: { block: 'Zablokovať', report: 'Nahlásiť', share: 'Zdieľať', reported: 'Nahlásenie bolo odoslané.' },
  en: { block: 'Block', report: 'Report', share: 'Share', reported: 'Report submitted.' },
  cs: { block: 'Zablokovat', report: 'Nahlásit', share: 'Sdílet', reported: 'Nahlášení bylo odesláno.' },
  de: { block: 'Blockieren', report: 'Melden', share: 'Teilen', reported: 'Meldung wurde gesendet.' },
  pl: { block: 'Zablokuj', report: 'Zgłoś', share: 'Udostępnij', reported: 'Zgłoszenie zostało wysłane.' },
  hu: { block: 'Letiltás', report: 'Jelentés', share: 'Megosztás', reported: 'A jelentés elküldve.' },
};

const SEND_MESSAGE: Record<Locale, string> = {
  sk: 'Poslať správu',
  en: 'Send message',
  cs: 'Poslat zprávu',
  de: 'Nachricht senden',
  pl: 'Wyślij wiadomość',
  hu: 'Üzenet küldése',
};

const REPORT_MODAL: Record<
  Locale,
  { title: string; reason: string; description: string; placeholder: string; submit: string; sending: string }
> = {
  sk: {
    title: 'Nahlásiť profil',
    reason: 'Dôvod nahlásenia',
    description: 'Popis nahlásenia (Voliteľné)',
    placeholder: 'Popíšte dôvod nahlásenia...',
    submit: 'Odoslať',
    sending: 'Odosielam...',
  },
  en: {
    title: 'Report profile',
    reason: 'Reason for reporting',
    description: 'Report description (Optional)',
    placeholder: 'Describe the reason for reporting...',
    submit: 'Submit',
    sending: 'Sending...',
  },
  cs: {
    title: 'Nahlásit profil',
    reason: 'Důvod nahlášení',
    description: 'Popis nahlášení (Volitelné)',
    placeholder: 'Popište důvod nahlášení...',
    submit: 'Odeslat',
    sending: 'Odesílám...',
  },
  de: {
    title: 'Profil melden',
    reason: 'Grund der Meldung',
    description: 'Meldungsbeschreibung (Optional)',
    placeholder: 'Grund der Meldung beschreiben...',
    submit: 'Absenden',
    sending: 'Wird gesendet...',
  },
  pl: {
    title: 'Zgłoś profil',
    reason: 'Powód zgłoszenia',
    description: 'Opis zgłoszenia (Opcjonalne)',
    placeholder: 'Opisz powód zgłoszenia...',
    submit: 'Wyślij',
    sending: 'Wysyłanie...',
  },
  hu: {
    title: 'Profil jelentése',
    reason: 'Jelentés oka',
    description: 'Jelentés leírása (Opcionális)',
    placeholder: 'Írja le a jelentés okát...',
    submit: 'Küldés',
    sending: 'Küldés...',
  },
};

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

function renderIn(locale: Locale, ui: React.ReactElement) {
  localStorage.setItem('appLocale', locale);
  // Čerstvý odhad krajiny, aby provider nevolal sieť.
  localStorage.setItem(
    GEO_DETECTION_CACHE_KEY,
    JSON.stringify({ country: 'SK', detectedAt: Date.now(), status: 'ok' }),
  );
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

beforeEach(() => {
  localStorage.clear();
  mockPost.mockReset();
});

const hamburgers = {
  'menu na PC': (extra: { isReported?: boolean } = {}) => (
    <ProfileDesktopHamburgerModal
      open
      onClose={jest.fn()}
      onBlockClick={jest.fn()}
      onReportClick={jest.fn()}
      onShareClick={jest.fn()}
      {...extra}
    />
  ),
  'menu na mobile': (extra: { isReported?: boolean } = {}) => (
    <ProfileMobileHamburgerModal
      isOpen
      mounted
      onClose={jest.fn()}
      onBlockClick={jest.fn()}
      onReportClick={jest.fn()}
      onShareClick={jest.fn()}
      {...extra}
    />
  ),
};

describe.each(Object.entries(hamburgers))('%s cudzieho profilu', (_name, menu) => {
  it.each(LOCALES)('jazyk %s: Zablokovať, Nahlásiť a Zdieľať v jazyku aplikácie', (locale) => {
    renderIn(locale, menu());
    expect(screen.getByRole('button', { name: MENU[locale].block })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: MENU[locale].report })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: MENU[locale].share })).toBeInTheDocument();
  });

  it.each(LOCALES)('jazyk %s: už nahlásený profil ukáže potvrdenie v jazyku aplikácie', (locale) => {
    renderIn(locale, menu({ isReported: true }));
    expect(screen.getByText(MENU[locale].reported)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: MENU[locale].report })).not.toBeInTheDocument();
  });

  it.each(['cs', 'pl', 'de', 'hu', 'en'] as const)(
    'jazyk %s: slovenské slová menu sa nezobrazia',
    (locale) => {
      renderIn(locale, menu());
      expect(screen.queryByText(/Nahlásiť|Zdieľať|Zablokovať/)).not.toBeInTheDocument();
    },
  );
});

describe('tlačidlo „Poslať správu“ na cudzom profile', () => {
  const headerProps = (): ComponentProps<typeof ProfileDesktopHeader> => ({
    displayUser: baseUser,
    accountType: 'personal',
    isOtherUserProfile: true,
    isUploading: false,
    onPhotoUpload: jest.fn(),
    onAvatarClick: jest.fn(),
    onOpenAllWebsitesModal: jest.fn(),
    onSendMessage: jest.fn(),
    onHamburgerOpen: jest.fn(),
  });
  const mobileProps = (): ComponentProps<typeof ProfileMobileView> => ({
    user: baseUser,
    displayUser: baseUser,
    isEditMode: false,
    isUploading: false,
    onPhotoUpload: jest.fn(),
    onAvatarClick: jest.fn(),
    activeTab: 'offers',
    onChangeTab: jest.fn(),
    onTabsKeyDown: jest.fn(),
    onOpenAllWebsitesModal: jest.fn(),
    isOtherUserProfile: true,
    onSendMessage: jest.fn(),
  });

  it.each(LOCALES)('PC, jazyk %s: text v jazyku aplikácie', (locale) => {
    renderIn(locale, <ProfileDesktopHeader {...headerProps()} />);
    expect(screen.getByRole('button', { name: SEND_MESSAGE[locale] })).toBeInTheDocument();
  });

  it.each(LOCALES)('mobil, jazyk %s: text v jazyku aplikácie', (locale) => {
    renderIn(locale, <ProfileMobileView {...mobileProps()} />);
    expect(screen.getByRole('button', { name: SEND_MESSAGE[locale] })).toBeInTheDocument();
  });
});

describe('okno Nahlásiť profil', () => {
  it.each(LOCALES)('jazyk %s: nadpis, popisky, tlačidlo a zástupný text v jazyku aplikácie', (locale) => {
    const expected = REPORT_MODAL[locale];
    renderIn(locale, <ReportUserModal open onClose={jest.fn()} userId={7} />);

    expect(screen.getByRole('heading', { name: expected.title })).toBeInTheDocument();
    expect(screen.getByText(expected.reason)).toBeInTheDocument();
    expect(screen.getByText(expected.description)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(expected.placeholder)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: expected.submit })).toBeInTheDocument();
  });

  it.each(LOCALES)('jazyk %s: počas odosielania sa ukáže „Odosielam...“ v jazyku aplikácie', async (locale) => {
    mockPost.mockReturnValue(new Promise(() => {}));
    renderIn(locale, <ReportUserModal open onClose={jest.fn()} userId={7} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: REPORT_MODAL[locale].submit }));
    });

    expect(screen.getByRole('button', { name: REPORT_MODAL[locale].sending })).toBeInTheDocument();
  });

  it.each(['cs', 'pl', 'de', 'hu', 'en'] as const)('jazyk %s: bez slovenských slov', (locale) => {
    renderIn(locale, <ReportUserModal open onClose={jest.fn()} userId={7} />);
    expect(document.body).not.toHaveTextContent(/Nahlásiť|Dôvod|Popis nahlásenia|Voliteľné|Odoslať/);
  });
});
