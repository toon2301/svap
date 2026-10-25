/**
 * Mobil, cudzí profil: druhé tlačidlo z troch (osoba s +) po pridaní medzi obľúbených zmení + na −
 * (nález 164, T9.3).
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import type { User } from '@/types';
import ProfileMobileView from '../ProfileMobileView';

jest.mock('../../ProfileEditFormMobile', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileOffersMobileSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileFeedSection', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfilePortfolioSection', () => ({ __esModule: true, default: () => null }));

type Props = ComponentProps<typeof ProfileMobileView>;

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

const PLUS_PATH = 'M18 7.5v3m0 0v3m0-3h3m-3 0h-3';
const MINUS_PATH = 'M22 10.5h-6m';

function props(overrides: Partial<Props> = {}): Props {
  return {
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
    onToggleFavorite: jest.fn(),
    onToggleProfileLike: jest.fn(),
    ...overrides,
  };
}

const pathOf = (button: HTMLElement) => button.querySelector('svg path')?.getAttribute('d') ?? '';

describe('ProfileMobileView – ikona obľúbených', () => {
  it('nie je medzi obľúbenými: osoba s +', () => {
    render(<ProfileMobileView {...props({ isFavorited: false })} />);
    const button = screen.getByRole('button', { name: '+ Pridať k obľúbeným' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(pathOf(button).startsWith(PLUS_PATH)).toBe(true);
  });

  it('je medzi obľúbenými: osoba s −, fialové tlačidlo', () => {
    render(<ProfileMobileView {...props({ isFavorited: true })} />);
    const button = screen.getByRole('button', { name: 'Odobrať z obľúbených' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(pathOf(button).startsWith(MINUS_PATH)).toBe(true);
    expect(button.className).toContain('bg-purple-600');
  });

  it('prepnutie stavu vymení ikonu tam aj späť', () => {
    const { rerender } = render(<ProfileMobileView {...props({ isFavorited: false })} />);
    rerender(<ProfileMobileView {...props({ isFavorited: true })} />);
    expect(
      pathOf(screen.getByRole('button', { name: 'Odobrať z obľúbených' })).startsWith(MINUS_PATH),
    ).toBe(true);
    rerender(<ProfileMobileView {...props({ isFavorited: false })} />);
    expect(
      pathOf(screen.getByRole('button', { name: '+ Pridať k obľúbeným' })).startsWith(PLUS_PATH),
    ).toBe(true);
  });
});
