import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import BlockedUsersModule from './BlockedUsersModule';
import { fetchBlockedUsers, unblockUser, type BlockedUsersPage } from './userBlocksApi';

jest.mock('./userBlocksApi', () => ({
  fetchBlockedUsers: jest.fn(),
  unblockUser: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const translations: Record<string, string> = {
  'blockedUsers.title': 'Blokovaní používatelia',
  'blockedUsers.emptyTitle': 'Nemáte nikoho zablokovaného',
  'blockedUsers.emptyDescription': 'Prázdny zoznam',
  'blockedUsers.unavailableUser': 'Nedostupný používateľ',
  'blockedUsers.unblock': 'Odblokovať',
  'blockedUsers.unblocking': 'Odblokujem...',
  'blockedUsers.confirmTitle': 'Odblokovať používateľa?',
  'blockedUsers.confirmDescription': 'Potvrďte odblokovanie.',
  'blockedUsers.unblockSuccess': 'Používateľ bol odblokovaný.',
  'blockedUsers.unblockFailed': 'Odblokovanie zlyhalo.',
  'blockedUsers.loadFailed': 'Načítanie zlyhalo.',
  'blockedUsers.loadMore': 'Zobraziť ďalších',
  'blockedUsers.loading': 'Načítavam...',
  'blockedUsers.retry': 'Skúsiť znova',
  'common.cancel': 'Zrušiť',
  'common.back': 'Späť',
};

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, fallback?: string) => translations[key] || fallback || key,
  }),
}));

const mockedFetchBlockedUsers = jest.mocked(fetchBlockedUsers);
const mockedUnblockUser = jest.mocked(unblockUser);

describe('BlockedUsersModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redacts unavailable accounts and removes only the confirmed row after success', async () => {
    mockedFetchBlockedUsers.mockResolvedValueOnce({
      nextCursor: null,
      results: [
        { id: 2, username: 'visible', display_name: 'Visible User', avatar_url: null, is_available: true },
        {
          id: 3,
          username: 'must-not-render',
          display_name: 'Sensitive Hidden Name',
          avatar_url: null,
          is_available: false,
        },
      ],
    });
    mockedUnblockUser.mockResolvedValueOnce({
      user_id: 2,
      is_blocked: false,
      deleted: true,
    });

    render(<BlockedUsersModule />);

    await screen.findByText('Visible User');
    expect(screen.getByText('Nedostupný používateľ')).toBeInTheDocument();
    expect(screen.queryByText('Sensitive Hidden Name')).not.toBeInTheDocument();
    expect(screen.queryByText('must-not-render')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Odblokovať' })[0]);
    const dialog = await screen.findByTestId('unblock-user-confirm-dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Odblokovať' }));

    await waitFor(() => expect(mockedUnblockUser).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByText('Visible User')).not.toBeInTheDocument());
    expect(screen.getByText('Nedostupný používateľ')).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledWith('Používateľ bol odblokovaný.');
  });

  it('keeps the row when unblocking fails', async () => {
    mockedFetchBlockedUsers.mockResolvedValueOnce({
      nextCursor: null,
      results: [
        { id: 4, username: 'blocked', display_name: 'Blocked User', avatar_url: null, is_available: true },
      ],
    });
    mockedUnblockUser.mockRejectedValueOnce(new Error('network'));

    render(<BlockedUsersModule />);
    await screen.findByText('Blocked User');
    fireEvent.click(screen.getByRole('button', { name: 'Odblokovať' }));
    fireEvent.click(within(await screen.findByTestId('unblock-user-confirm-dialog')).getByRole('button', { name: 'Odblokovať' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByText('Blocked User')).toBeInTheDocument();
  });

  it('loads the next cursor page without duplicating users', async () => {
    mockedFetchBlockedUsers
      .mockResolvedValueOnce({
        nextCursor: 'next',
        results: [
          { id: 5, username: 'first', display_name: 'First User', avatar_url: null, is_available: true },
        ],
      })
      .mockResolvedValueOnce({
        nextCursor: null,
        results: [
          { id: 5, username: 'first', display_name: 'First User', avatar_url: null, is_available: true },
          { id: 6, username: 'second', display_name: 'Second User', avatar_url: null, is_available: true },
        ],
      });

    render(<BlockedUsersModule />);
    await screen.findByText('First User');
    fireEvent.click(screen.getByRole('button', { name: 'Zobraziť ďalších' }));

    await screen.findByText('Second User');
    expect(screen.getAllByText('First User')).toHaveLength(1);
    expect(mockedFetchBlockedUsers).toHaveBeenLastCalledWith('next');
  });
});


/**
 * Prechodné stavy pri vstupe do sekcie (nález 286). Kostra sa nesmie ukázať pri rýchlej odpovedi (preblesk kostry pred
 * prázdnym stavom), musí mať rovnaké rozmery ako výsledok a obsah sa nesmie vložiť skokom. Hodiny sú falošné, aby sa
 * oneskorenie 200 ms dalo presne overiť, a odpoveď API dokončuje test sám.
 */
describe('BlockedUsersModule: prechodné stavy pri vstupe (nález 286)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const users = (count: number): BlockedUsersPage => ({
    nextCursor: null,
    results: Array.from({ length: count }, (_, index) => ({
      id: 100 + index,
      username: `user${index}`,
      display_name: `Používateľ ${index + 1}`,
      avatar_url: null,
      is_available: true,
    })),
  });

  /** Odpoveď API, ktorú dokončí až test: vráti funkcie na úspech a na chybu. */
  function deferFetch() {
    let resolve!: (page: BlockedUsersPage) => void;
    let reject!: (error: Error) => void;
    mockedFetchBlockedUsers.mockImplementationOnce(
      () =>
        new Promise<BlockedUsersPage>((res, rej) => {
          resolve = res;
          reject = rej;
        }),
    );
    return {
      respond: (page: BlockedUsersPage) => act(async () => resolve(page)),
      fail: () => act(async () => reject(new Error('network'))),
    };
  }

  /** Posunie falošné hodiny o `ms` v `act`. */
  const advance = (ms: number) => {
    act(() => {
      jest.advanceTimersByTime(ms);
    });
  };

  it('kostra je v prvom snímku neviditeľná, drží miesto a ukáže sa až po 200 ms', () => {
    deferFetch();
    render(<BlockedUsersModule />);

    const region = screen.getByTestId('blocked-users-loading');
    expect(region).toHaveAttribute('data-visible', 'false');
    expect(screen.getByTestId('blocked-users-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('blocked-users-skeleton').parentElement).toHaveClass('invisible');

    advance(199);
    expect(region).toHaveAttribute('data-visible', 'false');
    advance(1);
    expect(region).toHaveAttribute('data-visible', 'true');
    expect(screen.getByTestId('blocked-users-skeleton').parentElement).toHaveClass('animate-pulse');
  });

  it('načítavací región má aria-busy a text pre čítače obrazovky', () => {
    deferFetch();
    render(<BlockedUsersModule />);

    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Načítavam...');
  });

  it('rýchla odpoveď (pred 200 ms) kostru neukáže a rovno ukáže prázdny stav', async () => {
    const api = deferFetch();
    render(<BlockedUsersModule />);
    advance(100);
    expect(screen.getByTestId('blocked-users-loading')).toHaveAttribute('data-visible', 'false');

    await api.respond(users(0));

    expect(screen.queryByTestId('blocked-users-loading')).not.toBeInTheDocument();
    expect(screen.getByText('Nemáte nikoho zablokovaného')).toBeInTheDocument();
    advance(1000);
    expect(screen.queryByTestId('blocked-users-loading')).not.toBeInTheDocument();
  });

  it('pomalá odpoveď: kostra sa ukáže a po odpovedi ju nahradí zoznam', async () => {
    const api = deferFetch();
    render(<BlockedUsersModule />);
    advance(300);
    expect(screen.getByTestId('blocked-users-loading')).toHaveAttribute('data-visible', 'true');

    await api.respond(users(3));

    expect(screen.queryByTestId('blocked-users-loading')).not.toBeInTheDocument();
    expect(screen.getByText('Používateľ 1')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Odblokovať' })).toHaveLength(3);
  });

  it('kostra má rovnaké rozloženie ako zoznam: rovnaké triedy zoznamu aj riadku a tri riadky', async () => {
    const api = deferFetch();
    render(<BlockedUsersModule />);
    const skeleton = screen.getByTestId('blocked-users-skeleton');
    const skeletonListClass = skeleton.className;
    const skeletonRowClass = (skeleton.firstElementChild as HTMLElement).className;
    expect(skeleton.children).toHaveLength(3);

    await api.respond(users(3));

    const list = screen.getByTestId('blocked-users-list');
    expect(list.className).toBe(skeletonListClass);
    expect((list.firstElementChild as HTMLElement).className).toBe(skeletonRowClass);
    expect(list.children).toHaveLength(3);
  });

  it('prázdny stav, chyba aj zoznam sa vložia s krátkym prechodom, nie skokom', async () => {
    const empty = deferFetch();
    const { unmount } = render(<BlockedUsersModule />);
    await empty.respond(users(0));
    expect(screen.getByText('Nemáte nikoho zablokovaného').parentElement).toHaveClass('animate-content-in');
    unmount();

    const failing = deferFetch();
    const second = render(<BlockedUsersModule />);
    await failing.fail();
    expect(screen.getByText('network').parentElement).toHaveClass('animate-content-in');
    second.unmount();

    const full = deferFetch();
    render(<BlockedUsersModule />);
    await full.respond(users(2));
    expect(screen.getByTestId('blocked-users-list').parentElement).toHaveClass('animate-content-in');
  });

  it('pri „Skúsiť znova“ sa oneskorenie kostry počíta odznova', async () => {
    const first = deferFetch();
    render(<BlockedUsersModule />);
    await first.fail();

    const second = deferFetch();
    fireEvent.click(screen.getByRole('button', { name: 'Skúsiť znova' }));

    const region = screen.getByTestId('blocked-users-loading');
    expect(region).toHaveAttribute('data-visible', 'false');
    advance(200);
    expect(region).toHaveAttribute('data-visible', 'true');
    await second.respond(users(1));
    expect(screen.getByText('Používateľ 1')).toBeInTheDocument();
  });
});
