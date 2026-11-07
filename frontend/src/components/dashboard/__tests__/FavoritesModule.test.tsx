import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import toast from 'react-hot-toast';

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

    const messageButton = await screen.findByRole('button', { name: 'Správa' });
    fireEvent.click(messageButton);

    expect(pushMock).toHaveBeenCalledWith('/dashboard/messages?targetUserId=7');
  });

  it('removes a favorite user after clicking remove', async () => {
    render(<FavoritesModule />);

    const removeButton = await screen.findByRole('button', { name: 'Odobrať' });
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(setFavoriteUserState).toHaveBeenCalledWith(7, false);
      expect(screen.queryByText('Jana Novakova')).not.toBeInTheDocument();
    });
  });

  it('shows the empty state when no favorites are returned', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([]);

    render(<FavoritesModule />);

    expect(await screen.findByText('Zatiaľ nemáte žiadnych obľúbených používateľov')).toBeInTheDocument();
  });

  // Nález 279: avatar, ktorý sa nenačíta (zmazaný súbor), ostal ako pokazený obrázok s alt textom. Teraz ho nahradia
  // iniciály, ako pri používateľovi bez avatara.
  it('shows the initials when the avatar fails to load', async () => {
    (fetchFavoriteUsers as jest.Mock).mockResolvedValue([
      {
        id: 7,
        slug: 'jana-novakova',
        display_name: 'Jana Novakova',
        avatar_url: 'https://cdn.example.com/avatars/7.webp',
      },
    ]);

    render(<FavoritesModule />);
    fireEvent.error(await screen.findByAltText('Jana Novakova'));

    expect(screen.getByText('JN')).toBeInTheDocument();
    expect(screen.queryByAltText('Jana Novakova')).not.toBeInTheDocument();
  });

  // Nález 175: hláška o chybe bola ako poslednú možnosť surový `message` z knižnice axios („Network Error“,
  // „timeout of 30000ms exceeded“), a záložné texty boli bez diakritiky. Teraz platí text zo servera, potom hláška
  // o sieti a až potom záložný text danej akcie.
  describe('chyby', () => {
    const NETWORK_TEXT = 'Chyba siete. Skontrolujte pripojenie a skúste to znova.';
    const LOAD_FALLBACK = 'Nepodarilo sa načítať obľúbených používateľov.';
    const REMOVE_FALLBACK = 'Nepodarilo sa odobrať používateľa z obľúbených.';

    /** Zlyhania z API: [názov prípadu, chyba, očakávaný text pre načítanie, očakávaný text pre odobratie]. */
    const FAILURES: Array<[string, unknown, string, string]> = [
      ['výpadok siete', { code: 'ERR_NETWORK', message: 'Network Error' }, NETWORK_TEXT, NETWORK_TEXT],
      [
        'časový limit',
        { code: 'ECONNABORTED', message: 'timeout of 30000ms exceeded' },
        NETWORK_TEXT,
        NETWORK_TEXT,
      ],
      [
        'text zo servera v poli error',
        { response: { status: 500, data: { error: 'Služba je dočasne nedostupná.' } } },
        'Služba je dočasne nedostupná.',
        'Služba je dočasne nedostupná.',
      ],
      [
        'text zo servera v poli detail',
        { response: { status: 403, data: { detail: 'Nemáte oprávnenie.' } } },
        'Nemáte oprávnenie.',
        'Nemáte oprávnenie.',
      ],
      [
        'odpoveď servera bez textu',
        { response: { status: 500 }, message: 'Request failed with status code 500' },
        LOAD_FALLBACK,
        REMOVE_FALLBACK,
      ],
      ['obyčajná chyba', new Error('boom'), LOAD_FALLBACK, REMOVE_FALLBACK],
    ];

    it.each(FAILURES)('načítanie zoznamu – %s', async (_name, failure, expectedLoad) => {
      (fetchFavoriteUsers as jest.Mock).mockRejectedValue(failure);

      render(<FavoritesModule />);

      expect(await screen.findByText(expectedLoad)).toBeInTheDocument();
      // Technická správa knižnice sa používateľovi nikdy neukáže.
      const technical = (failure as { message?: string }).message;
      if (technical) expect(screen.queryByText(technical)).toBeNull();
    });

    it.each(FAILURES)('odobratie z obľúbených – %s', async (_name, failure, _expectedLoad, expectedRemove) => {
      (setFavoriteUserState as jest.Mock).mockRejectedValue(failure);

      render(<FavoritesModule />);
      fireEvent.click(await screen.findByRole('button', { name: 'Odobrať' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expectedRemove));
      expect(toast.error).toHaveBeenCalledTimes(1);
      // Neúspešné odobratie používateľa zo zoznamu nevyhodí.
      expect(screen.getByText('Jana Novakova')).toBeInTheDocument();
    });
  });
});
