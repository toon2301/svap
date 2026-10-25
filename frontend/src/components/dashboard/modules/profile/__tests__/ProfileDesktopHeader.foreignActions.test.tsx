/**
 * Cudzí profil na PC: zvýraznenie „+ Pridať k obľúbeným“ a „Palec hore“ (nález 163, T9.2).
 * Zapnutý stav je fialový s bielym textom a vo svetlom aj tmavom režime rovnaký (bez `dark:` tried);
 * vypnutý stav a ostatné tlačidlá sa nemenia.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ComponentProps } from 'react';
import type { User } from '@/types';
import { ProfileDesktopHeader } from '../ProfileDesktopHeader';

jest.mock('../UserAvatar', () => ({ __esModule: true, default: () => null }));
jest.mock('../view/WebsitesRow', () => ({ __esModule: true, default: () => null }));
jest.mock('../ProfileDesktopSocialLinks', () => ({ ProfileDesktopSocialLinks: () => null }));

type Props = ComponentProps<typeof ProfileDesktopHeader>;

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
  profile_likes_count: 3,
} as User;

function renderHeader(overrides: Partial<Props> = {}, userOverrides: Partial<User> = {}) {
  const props: Props = {
    displayUser: { ...baseUser, ...userOverrides } as User,
    accountType: 'personal',
    isOtherUserProfile: true,
    isUploading: false,
    onPhotoUpload: jest.fn(),
    onAvatarClick: jest.fn(),
    onOpenAllWebsitesModal: jest.fn(),
    onSendMessage: jest.fn(),
    onToggleFavorite: jest.fn(),
    onToggleProfileLike: jest.fn(),
    onHamburgerOpen: jest.fn(),
    ...overrides,
  };
  const view = render(<ProfileDesktopHeader {...props} />);
  return { ...view, props };
}

const favoriteButton = () => screen.getByRole('button', { name: /obľúbeným|obľúbených/ });
const likeButton = () => screen.getByRole('button', { name: /Palec hore \(/ });
const classSet = (el: HTMLElement) => new Set(el.className.split(/\s+/).filter(Boolean));

// Zapnutý stav (svetlá fialová farba mobilu bez tmavých odlišností) a vypnutý stav z desktopu.
const ON = ['border-purple-300', 'bg-purple-600', 'text-white', 'hover:bg-purple-700'];
const darkClasses = (cls: Set<string>) => [...cls].filter((c) => c.startsWith('dark:'));
const OFF = ['border-purple-200', 'bg-purple-100', 'text-purple-800', 'hover:bg-purple-200'];

describe('ProfileDesktopHeader – obľúbené (cudzí profil)', () => {
  it('vypnuté: svetlá fialová, bez zapnutých tried', () => {
    renderHeader({ isFavorited: false });
    const cls = classSet(favoriteButton());
    OFF.forEach((c) => expect(cls.has(c)).toBe(true));
    ON.forEach((c) => expect(cls.has(c)).toBe(false));
    expect(favoriteButton()).toHaveAttribute('aria-pressed', 'false');
    expect(favoriteButton()).toHaveTextContent('+ Pridať k obľúbeným');
  });

  it('zapnuté: fialová s bielym textom, rovnaká v oboch režimoch (bez dark tried), bez vypnutých tried', () => {
    renderHeader({ isFavorited: true });
    const cls = classSet(favoriteButton());
    ON.forEach((c) => expect(cls.has(c)).toBe(true));
    OFF.forEach((c) => expect(cls.has(c)).toBe(false));
    expect(darkClasses(cls)).toEqual([]);
    expect(favoriteButton()).toHaveAttribute('aria-pressed', 'true');
    expect(favoriteButton()).toHaveTextContent('Odobrať z obľúbených');
  });

  it('rozloženie tlačidla sa zapnutím nemení (rovnaká výška a šírka)', () => {
    const { unmount } = renderHeader({ isFavorited: false });
    const off = classSet(favoriteButton());
    unmount();
    renderHeader({ isFavorited: true });
    const on = classSet(favoriteButton());
    const layout = [
      'flex',
      'min-w-0',
      'rounded-2xl',
      'border',
      'px-4',
      'py-2',
      'text-sm',
      'whitespace-nowrap',
      'transition-colors',
      'disabled:opacity-60',
    ];
    layout.forEach((c) => {
      expect(off.has(c)).toBe(true);
      expect(on.has(c)).toBe(true);
    });
  });

  it('kliknutie volá onToggleFavorite, počas čakania je tlačidlo vypnuté', () => {
    const { props, rerender } = renderHeader({ isFavorited: false });
    fireEvent.click(favoriteButton());
    expect(props.onToggleFavorite).toHaveBeenCalledTimes(1);
    rerender(<ProfileDesktopHeader {...props} isFavoritePending />);
    expect(favoriteButton()).toBeDisabled();
    expect(favoriteButton()).toHaveAttribute('aria-busy', 'true');
  });
});

describe('ProfileDesktopHeader – Palec hore (cudzí profil)', () => {
  it('zapnuté: fialová s bielym textom, rovnaká v oboch režimoch (bez tmavých prebíjajúcich tried)', () => {
    renderHeader({}, { is_profile_liked_by_me: true });
    const cls = classSet(likeButton());
    ['!border-purple-300', '!bg-purple-600', '!text-white', 'hover:!bg-purple-700'].forEach((c) =>
      expect(cls.has(c)).toBe(true),
    );
    // staré tmavé triedy, ktoré zapnutý stav robili v tmavom režime nerozoznateľným od vypnutého
    expect([...cls].filter((c) => c.startsWith('dark:!'))).toEqual([]);
    expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
  });

  it('vypnuté: svetlá fialová, nezmenené', () => {
    renderHeader({}, { is_profile_liked_by_me: false });
    const cls = classSet(likeButton());
    ['!border-purple-200', '!bg-purple-100', '!text-purple-800', 'hover:!bg-purple-200'].forEach(
      (c) => expect(cls.has(c)).toBe(true),
    );
    expect(cls.has('!bg-purple-600')).toBe(false);
    expect(likeButton()).toHaveAttribute('aria-pressed', 'false');
  });

  it('kliknutie volá onToggleProfileLike', () => {
    const { props } = renderHeader();
    fireEvent.click(likeButton());
    expect(props.onToggleProfileLike).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileDesktopHeader – ostatné tlačidlá ostávajú rovnaké', () => {
  it('Poslať správu a menu majú len vypnuté triedy, bez zapnutých', () => {
    renderHeader({ isFavorited: true }, { is_profile_liked_by_me: true });
    const send = screen.getByRole('button', { name: 'Poslať správu' });
    const menu = screen.getByRole('button', { name: 'Menu' });
    [send, menu].forEach((el) => {
      const cls = classSet(el);
      OFF.forEach((c) => expect(cls.has(c)).toBe(true));
      expect(cls.has('bg-purple-600')).toBe(false);
    });
  });

  it('vlastný profil nemá obľúbené ani zapínateľný like', () => {
    renderHeader({ isOtherUserProfile: false }, { is_profile_liked_by_me: true });
    expect(screen.queryByRole('button', { name: /obľúbeným|obľúbených/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Palec hore \(/ })).toBeNull();
  });
});
