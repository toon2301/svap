import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import BlockedUsersModule from './BlockedUsersModule';
import { fetchBlockedUsers, unblockUser } from './userBlocksApi';

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
