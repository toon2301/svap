/**
 * Záložné texty Obľúbených sa zhodujú so slovenskými textami v `messages/sk.json` (nález 281).
 *
 * Záložný text sa ukáže len pri chýbajúcom preklade, no šesť z nich bolo bez diakritiky („Nacitavam oblubenych
 * pouzivatelov...“, „Sprava“, „Odobrat“). Test beží s `t`, ktoré vráti záložný text (ako pri chýbajúcom preklade),
 * a porovná ho so slovenským textom daného kľúča, takže zlyhá aj pri budúcom rozdiele.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import sk from '../../../../../messages/sk.json';
import FavoritesModule from '../FavoritesModule';
import { fetchFavoriteUsers } from '../favoritesApi';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../favoritesApi', () => ({
  __esModule: true,
  fetchFavoriteUsers: jest.fn(),
  setFavoriteUserState: jest.fn(),
}));

/** Slovenský text kľúča z `messages/sk.json` (kľúče sú vnorené: `favorites.loading` → `sk.favorites.loading`). */
function skText(key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], sk);
  if (typeof value !== 'string') throw new Error(`V sk.json chýba text pre kľúč ${key}`);
  return value;
}

describe('FavoritesModule: záložné texty sú v slovenčine s diakritikou', () => {
  it('načítavanie', () => {
    (fetchFavoriteUsers as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<FavoritesModule />);

    expect(screen.getByText(skText('favorites.loading'))).toBeInTheDocument();
  });

  it('prázdny zoznam: nadpis aj pomocný text', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([]);

    render(<FavoritesModule />);

    expect(await screen.findByText(skText('favorites.emptyTitle'))).toBeInTheDocument();
    expect(screen.getByText(skText('favorites.emptyHint'))).toBeInTheDocument();
  });

  it('tlačidlá karty používateľa', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([
      { id: 7, slug: 'jana-novakova', display_name: 'Jana Novakova', avatar_url: null },
    ]);

    render(<FavoritesModule />);

    expect(await screen.findByRole('button', { name: skText('skills.message') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: skText('favorites.removeAction') })).toBeInTheDocument();
  });

  it('používateľ bez mena', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([
      { id: 9, slug: 'bez-mena', display_name: '', avatar_url: null },
    ]);

    render(<FavoritesModule />);

    expect(await screen.findByRole('heading', { name: skText('favorites.unknownUser') })).toBeInTheDocument();
  });
});
