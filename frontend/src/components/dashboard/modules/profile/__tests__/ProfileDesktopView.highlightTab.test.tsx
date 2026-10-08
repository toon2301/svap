/**
 * Zvýraznená ponuka na desktopovom profile a prepínanie kariet.
 *
 * Sekcia ponúk ostáva namountovaná aj na iných kartách (vtedy nič nevykreslí) a
 * ponuky si drží v stave. Keď zvýraznenie príde (upozornenie na lajk ponuky), kým
 * je zobrazená napríklad karta Portfólio, a profil sa až potom prepne na Ponuky,
 * scroll efekt sekcie nemá čo zachytiť: ponuky ani zvýraznenie sa nezmenili, iba
 * karta. `ProfileDesktopView` preto odovzdá zvýraznenie sekcii, len kým je
 * aktívna karta Ponuky.
 *
 * Karta ponuky a ostatné časti profilu sú atrapy; ide o väzbu medzi obálkou
 * profilu a sekciou ponúk (ref na scroll, `isHighlighted` na karte).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileDesktopView from '../ProfileDesktopView';
import { invalidateOffersCache, makeOffersCacheKey, setOffersToCache } from '../profileOffersCache';
import type { Offer } from '../profileOffersTypes';
import type { ProfileTab } from '../profileTypes';
import type { User } from '@/types';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockAuth = { user: null, updateUser: jest.fn() };
const mockT = (key: string, fallback?: string) => fallback ?? key;

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(''),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: mockT }),
}));

jest.mock('../ProfileOfferCard', () => ({
  __esModule: true,
  default: ({
    offer,
    isHighlighted,
  }: {
    offer: { id: number };
    isHighlighted: boolean;
  }) => <div data-testid={`offer-card-${offer.id}`} data-highlighted={String(isHighlighted)} />,
}));

jest.mock('../ProfileDesktopHeader', () => ({ ProfileDesktopHeader: () => null }));
jest.mock('../ProfileDesktopTabs', () => ({ ProfileDesktopTabs: () => null }));
jest.mock('../ProfileDesktopHamburgerModal', () => ({ ProfileDesktopHamburgerModal: () => null }));
jest.mock('../ReportUserModal', () => ({ ReportUserModal: () => null }));
jest.mock('../ProfileShareModal', () => ({ ProfileShareModal: () => null }));
jest.mock('../ProfilePortfolioSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileFeedSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../UserInfo', () => ({ __esModule: true, default: () => null }));
jest.mock('../../ProfileEditFormDesktop', () => ({ __esModule: true, default: () => null }));

const OWNER_ID = 41;

const profileUser = {
  id: OWNER_ID,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  slug: 'testuser',
  user_type: 'individual',
  is_verified: true,
  is_public: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  profile_completeness: 80,
} as User;

function makeOffer(id: number): Offer {
  return {
    id,
    category: 'Vzdelávanie',
    subcategory: `sub-${id}`,
    description: `Ponuka ${id}`,
    images: [],
    price_currency: 'EUR',
    is_hidden: false,
    tags: [],
  };
}

type ViewProps = { activeTab: ProfileTab; highlightedSkillId: number | null; isOtherUserProfile?: boolean };

function View({ activeTab, highlightedSkillId, isOtherUserProfile = false }: ViewProps) {
  return (
    <ProfileDesktopView
      user={profileUser}
      isEditMode={false}
      isUploading={false}
      onPhotoUpload={jest.fn()}
      onAvatarClick={jest.fn()}
      activeTab={activeTab}
      onChangeTab={jest.fn()}
      onTabsKeyDown={jest.fn()}
      onOpenAllWebsitesModal={jest.fn()}
      isOtherUserProfile={isOtherUserProfile}
      highlightedSkillId={highlightedSkillId}
    />
  );
}

const scrolled: Array<{ element: Element; options: boolean | ScrollIntoViewOptions | undefined }> = [];
const originalScrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  scrolled.length = 0;
  Element.prototype.scrollIntoView = function scrollIntoViewRecorder(
    this: Element,
    options?: boolean | ScrollIntoViewOptions,
  ) {
    scrolled.push({ element: this, options });
  };
  invalidateOffersCache(OWNER_ID);
  setOffersToCache(makeOffersCacheKey(OWNER_ID), [makeOffer(55), makeOffer(56)]);
});

afterEach(() => {
  invalidateOffersCache(OWNER_ID);
});

afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});

describe.each([
  ['vlastný profil', false],
  ['cudzí profil', true],
])('ProfileDesktopView – zvýraznená ponuka a karty (%s)', (_title, isOtherUserProfile) => {
  it('poscrolluje na kartu, keď zvýraznenie príde na inej karte a profil sa až potom prepne na Ponuky', () => {
    const { rerender } = render(
      <View activeTab="offers" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />,
    );
    expect(screen.getByTestId('offer-card-55')).toBeInTheDocument();

    rerender(<View activeTab="portfolio" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />);
    expect(screen.queryByTestId('offer-card-55')).not.toBeInTheDocument();

    rerender(<View activeTab="portfolio" highlightedSkillId={55} isOtherUserProfile={isOtherUserProfile} />);
    expect(scrolled).toHaveLength(0);

    rerender(<View activeTab="offers" highlightedSkillId={55} isOtherUserProfile={isOtherUserProfile} />);

    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].element).toContainElement(screen.getByTestId('offer-card-55'));
    expect(scrolled[0].element).not.toContainElement(screen.getByTestId('offer-card-56'));
    expect(scrolled[0].options).toEqual({ behavior: 'smooth', block: 'center' });
    expect(screen.getByTestId('offer-card-55')).toHaveAttribute('data-highlighted', 'true');
    expect(screen.getByTestId('offer-card-56')).toHaveAttribute('data-highlighted', 'false');
  });

  it('scrolluje len na zvýraznenú kartu, nie na inú ponuku', () => {
    const { rerender } = render(
      <View activeTab="offers" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />,
    );
    rerender(<View activeTab="posts" highlightedSkillId={56} isOtherUserProfile={isOtherUserProfile} />);

    rerender(<View activeTab="offers" highlightedSkillId={56} isOtherUserProfile={isOtherUserProfile} />);

    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].element).toContainElement(screen.getByTestId('offer-card-56'));
    expect(scrolled[0].element).not.toContainElement(screen.getByTestId('offer-card-55'));
  });

  it('zvýraznenie od začiatku na karte Ponuky poscrolluje práve raz', () => {
    render(<View activeTab="offers" highlightedSkillId={55} isOtherUserProfile={isOtherUserProfile} />);

    expect(scrolled).toHaveLength(1);
    expect(scrolled[0].element).toContainElement(screen.getByTestId('offer-card-55'));
    expect(screen.getByTestId('offer-card-55')).toHaveAttribute('data-highlighted', 'true');
  });

  it('zvýraznenie, ktoré medzitým zhaslo, po návrate na Ponuky už neposcrolluje', () => {
    const { rerender } = render(
      <View activeTab="offers" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />,
    );
    rerender(<View activeTab="portfolio" highlightedSkillId={55} isOtherUserProfile={isOtherUserProfile} />);
    rerender(<View activeTab="portfolio" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />);

    rerender(<View activeTab="offers" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />);

    expect(scrolled).toHaveLength(0);
    expect(screen.getByTestId('offer-card-55')).toHaveAttribute('data-highlighted', 'false');
  });

  it('bez zvýraznenia prepínanie kariet neposcrolluje nikam', () => {
    const { rerender } = render(
      <View activeTab="offers" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />,
    );

    rerender(<View activeTab="portfolio" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />);
    rerender(<View activeTab="offers" highlightedSkillId={null} isOtherUserProfile={isOtherUserProfile} />);

    expect(scrolled).toHaveLength(0);
  });
});
