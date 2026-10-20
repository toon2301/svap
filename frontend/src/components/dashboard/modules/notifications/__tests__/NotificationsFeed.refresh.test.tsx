import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import NotificationsFeed from '../NotificationsFeed';
import { listNotificationsPage, markAllNotificationsRead } from '../notificationsApi';
import { fakeServer } from '../notificationsFeedTestUtils';
import { dispatchNotificationsChanged } from '../useNotificationsFeed';

jest.mock('../notificationsApi', () => ({
  __esModule: true,
  listNotificationsPage: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));

jest.mock('@/components/dashboard/contexts/notificationUnreadStore', () => ({
  __esModule: true,
  publishNotificationUnreadCount: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    locale: 'sk',
    t: (_key: string, fallback: string) => fallback,
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
}));

const listMock = listNotificationsPage as jest.Mock;
const markAllMock = markAllNotificationsRead as jest.Mock;

const rows = () => screen.queryAllByText(/^Upozornenie \d+$/);
const LOAD_MORE = 'Zobraziť ďalšie';
const MARK_ALL_READ = 'Označiť ako prečítané';
const RETRY = 'Skúsiť znova';

async function loadMoreTimes(times: number) {
  for (let index = 0; index < times; index += 1) {
    const before = rows().length;
    await act(async () => {
      fireEvent.click(screen.getByText(LOAD_MORE));
    });
    await waitFor(() => expect(rows().length).toBeGreaterThan(before));
  }
}

describe('NotificationsFeed refresh', () => {
  beforeEach(() => {
    listMock.mockReset();
    markAllMock.mockReset();
  });

  it('keeps every loaded notification when the list refreshes (no jump back to the first 15)', async () => {
    fakeServer(listMock, 100);
    render(<NotificationsFeed />);
    await screen.findByText('Upozornenie 1');
    await loadMoreTimes(2);
    expect(rows()).toHaveLength(45);
    listMock.mockClear();

    await act(async () => {
      dispatchNotificationsChanged();
    });

    await waitFor(() => expect(listMock).toHaveBeenCalledWith(1, 45));
    await waitFor(() =>
      expect(document.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'false'),
    );
    expect(rows()).toHaveLength(45);
    expect(screen.getByText(LOAD_MORE)).toBeInTheDocument();
  });

  it('reuses the existing rows on refresh instead of replacing them', async () => {
    fakeServer(listMock, 40);
    render(<NotificationsFeed />);
    const firstRow = (await screen.findByText('Upozornenie 1')).closest('button');
    const fifthRow = screen.getByText('Upozornenie 5').closest('button');

    await act(async () => {
      dispatchNotificationsChanged();
    });
    await waitFor(() =>
      expect(document.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'false'),
    );

    expect(screen.getByText('Upozornenie 1').closest('button')).toBe(firstRow);
    expect(screen.getByText('Upozornenie 5').closest('button')).toBe(fifthRow);
  });

  it('shows no error box when a refresh in the background fails', async () => {
    fakeServer(listMock, 40);
    render(<NotificationsFeed />);
    await screen.findByText('Upozornenie 1');
    listMock.mockRejectedValueOnce(new Error('network'));

    await act(async () => {
      dispatchNotificationsChanged();
    });
    await waitFor(() =>
      expect(document.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'false'),
    );

    expect(screen.queryByText('Skúsiť znova')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(15);
  });

  it('shows the error box when the user-triggered load fails and hides it after a retry succeeds', async () => {
    fakeServer(listMock, 40);
    listMock.mockRejectedValueOnce(new Error('network'));
    render(<NotificationsFeed />);

    const retry = await screen.findByText('Skúsiť znova');
    await act(async () => {
      fireEvent.click(retry);
    });

    await waitFor(() => expect(screen.queryByText('Skúsiť znova')).not.toBeInTheDocument());
    expect(rows()).toHaveLength(15);
  });

  it('still shows the error box when the next batch fails to load', async () => {
    fakeServer(listMock, 100);
    render(<NotificationsFeed />);
    await screen.findByText('Upozornenie 1');
    listMock.mockRejectedValueOnce(new Error('network'));

    await act(async () => {
      fireEvent.click(screen.getByText(LOAD_MORE));
    });

    expect(await screen.findByText('Skúsiť znova')).toBeInTheDocument();
    expect(rows()).toHaveLength(15);
  });

  it('hides the mark-all error box when the user retries and the list loads again', async () => {
    fakeServer(listMock, 40);
    markAllMock.mockRejectedValue(new Error('network'));
    render(<NotificationsFeed />);
    await screen.findByText('Upozornenie 1');
    await act(async () => {
      fireEvent.click(screen.getByText(MARK_ALL_READ));
    });
    const retry = await screen.findByText(RETRY);

    await act(async () => {
      fireEvent.click(retry);
    });

    await waitFor(() => expect(screen.queryByText(RETRY)).not.toBeInTheDocument());
    expect(rows()).toHaveLength(15);
  });
});
