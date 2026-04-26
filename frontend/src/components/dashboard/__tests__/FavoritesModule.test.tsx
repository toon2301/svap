import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import FavoritesModule from '../modules/FavoritesModule';
import { fetchFavoriteUsers, setFavoriteUserState } from '../modules/favoritesApi';

const pushMock = jest.fn();

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
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
    push: pushMock,
  }),
}));

jest.mock('../modules/favoritesApi', () => ({
  __esModule: true,
  fetchFavoriteUsers: jest.fn(),
  setFavoriteUserState: jest.fn(),
}));

describe('FavoritesModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([
      {
        id: 7,
        slug: 'jana-novakova',
        display_name: 'Jana Nováková',
        avatar_url: null,
      },
    ]);
    (setFavoriteUserState as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders fetched favorite users and navigates to the profile', async () => {
    render(<FavoritesModule />);

    expect(await screen.findByText('Jana Nováková')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Jana Nováková/i }));

    expect(pushMock).toHaveBeenCalledWith('/dashboard/users/jana-novakova');
  });

  it('removes a favorite user after clicking remove', async () => {
    render(<FavoritesModule />);

    const removeButton = await screen.findByRole('button', { name: 'Odobrať' });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(setFavoriteUserState).toHaveBeenCalledWith(7, false);
      expect(screen.queryByText('Jana Nováková')).not.toBeInTheDocument();
    });
  });

  it('shows the empty state when no favorites are returned', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([]);

    render(<FavoritesModule />);

    expect(
      await screen.findByText('Zatiaľ nemáte žiadnych obľúbených používateľov'),
    ).toBeInTheDocument();
  });
});
