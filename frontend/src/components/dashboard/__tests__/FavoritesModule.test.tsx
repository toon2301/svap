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
        display_name: 'Jana Novakova',
        avatar_url: null,
      },
    ]);
    (setFavoriteUserState as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders fetched favorite users and opens the profile from the card header and from the name', async () => {
    const opened: string[] = [];
    const listener = (event: Event) => opened.push((event as CustomEvent<{ identifier: string }>).detail.identifier);
    window.addEventListener('goToUserProfile', listener);
    try {
      render(<FavoritesModule />);

      expect(await screen.findByText('Jana Novakova')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('Jana Novakova'));
      fireEvent.click(screen.getByRole('heading', { name: 'Jana Novakova' }));

      expect(opened).toEqual(['jana-novakova', 'jana-novakova']);
      // profil sa otvára stavom Dashboardu, nie routerom
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('goToUserProfile', listener);
    }
  });

  it('uses the numeric id when the favorite has no slug', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([
      { id: 9, slug: '  ', display_name: 'Bez Slugu', avatar_url: null },
    ]);
    const listener = jest.fn();
    window.addEventListener('goToUserProfile', listener);
    try {
      render(<FavoritesModule />);
      fireEvent.click(await screen.findByLabelText('Bez Slugu'));
      expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ identifier: '9' });
    } finally {
      window.removeEventListener('goToUserProfile', listener);
    }
  });

  it('opens messages from the primary action button', async () => {
    render(<FavoritesModule />);

    const messageButton = await screen.findByRole('button', { name: 'Sprava' });
    fireEvent.click(messageButton);

    expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?targetUserId=7');
  });

  it('removes a favorite user after clicking remove', async () => {
    render(<FavoritesModule />);

    const removeButton = await screen.findByRole('button', { name: 'Odobrat' });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(setFavoriteUserState).toHaveBeenCalledWith(7, false);
      expect(screen.queryByText('Jana Novakova')).not.toBeInTheDocument();
    });
  });

  it('shows the empty state when no favorites are returned', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([]);

    render(<FavoritesModule />);

    expect(await screen.findByText('Zatial nemate ziadnych oblubenych pouzivatelov')).toBeInTheDocument();
  });
});
