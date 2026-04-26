import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import FavoritesModule from '../FavoritesModule';
import { fetchFavoriteUsers } from '../favoritesApi';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  __esModule: true,
  useLanguage: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../favoritesApi', () => ({
  __esModule: true,
  fetchFavoriteUsers: jest.fn(),
  setFavoriteUserState: jest.fn(),
}));

describe('FavoritesModule', () => {
  it('renders a loading state before favorites are resolved', () => {
    (fetchFavoriteUsers as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<FavoritesModule />);

    expect(screen.getByText('Nacitavam oblubenych pouzivatelov...')).toBeInTheDocument();
  });
});
