import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StrictMode } from 'react';

import { installFiringIntersectionObserver } from '../../feed/feedObserverTestUtils';
import NotificationsFeed from '../NotificationsFeed';
import { listNotificationsPage, type NotificationsPage } from '../notificationsApi';
import { deferred, fakeServer } from '../notificationsFeedTestUtils';
import { dispatchNotificationsChanged } from '../useNotificationsFeed';

jest.mock('../notificationsApi', () => ({
  __esModule: true,
  listNotificationsPage: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  markNotificationRead: jest.fn(),
}));
const publishMock = jest.fn();
jest.mock('@/components/dashboard/contexts/notificationUnreadStore', () => ({
  __esModule: true,
  publishNotificationUnreadCount: (...args: unknown[]) => publishMock(...args),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ locale: 'sk', t: (_key: string, fallback: string) => fallback }),
}));
jest.mock('@/hooks', () => ({ useIsMobile: () => true }));

const listMock = listNotificationsPage as jest.Mock;
const rows = () => screen.queryAllByText(/^Upozornenie \d+$/);
const SENTINEL = 'notifications-load-more-sentinel';

describe.each(['page', 'panel'] as const)('NotificationsFeed automatic loading (%s)', (variant) => {
  let observer: ReturnType<typeof installFiringIntersectionObserver>;
  const fire = async (times = 1) => {
    await waitFor(() => expect(observer.count()).toBe(1));
    await act(async () => {
      for (let i = 0; i < times; i += 1) observer.fire(SENTINEL);
    });
  };

  beforeEach(() => {
    listMock.mockReset();
    publishMock.mockReset();
    observer = installFiringIntersectionObserver();
  });
  afterEach(() => {
    observer.restore();
    jest.useRealTimers();
  });

  it('has no "Zobraziť ďalšie" button and loads the next batch when the sentinel is reached', async () => {
    fakeServer(listMock, 100);
    render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    expect(screen.queryByRole('button', { name: 'Zobraziť ďalšie' })).not.toBeInTheDocument();
    expect(screen.queryByText('Zobraziť ďalšie')).not.toBeInTheDocument();

    await fire();
    await waitFor(() => expect(rows()).toHaveLength(30));
    expect(listMock).toHaveBeenLastCalledWith(2, 15);
    await fire();
    await waitFor(() => expect(rows()).toHaveLength(45));
    expect(publishMock).not.toHaveBeenCalled();
  });

  it('keeps loading batches by itself while the end of the list stays in range, then stops at the end', async () => {
    fakeServer(listMock, 40);
    render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    await fire(); // 30
    await waitFor(() => expect(rows()).toHaveLength(30));
    await fire(); // 40 (poslednú dávku už nemá čo nasledovať)
    await waitFor(() => expect(rows()).toHaveLength(40));
    await waitFor(() => expect(observer.count()).toBe(0));
    expect(screen.queryByTestId(SENTINEL)).not.toBeInTheDocument();
  });

  it('does not watch anything when everything fits in the first batch', async () => {
    fakeServer(listMock, 10);
    render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    expect(observer.count()).toBe(0);
    expect(screen.queryByTestId(SENTINEL)).not.toBeInTheDocument();
  });

  it('shows two skeleton rows while a batch is loading and stops watching until it arrives', async () => {
    fakeServer(listMock, 100);
    render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    const slow = deferred<NotificationsPage>();
    listMock.mockImplementationOnce(() => slow.promise);
    await fire(3); // trojité spustenie = jedna požiadavka
    expect(listMock.mock.calls.filter(([page]) => page === 2)).toHaveLength(1);
    const skeleton = screen.getByTestId('notifications-load-more-skeleton');
    expect(skeleton.querySelectorAll('[data-testid="notification-skeleton-row"]')).toHaveLength(2);
    expect(observer.count()).toBe(0);
    expect(screen.getByRole('status')).toHaveTextContent('Načítavam…');

    await act(async () => {
      slow.resolve({ ...(await fakeListPage(100, 2)) });
    });
    await waitFor(() => expect(rows()).toHaveLength(30));
    expect(screen.queryByTestId('notifications-load-more-skeleton')).not.toBeInTheDocument();
    expect(observer.count()).toBe(1);
  });

  it('retries quietly after a failure: no alert, no button, 5 s then 10 s', async () => {
    fakeServer(listMock, 100);
    render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    jest.useFakeTimers();
    listMock
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('network'));

    await fire();
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Skúsiť znova')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notifications-load-more-skeleton')).not.toBeInTheDocument();
    expect(observer.count()).toBe(0); // pauza
    expect(rows()).toHaveLength(15);

    await act(async () => {
      jest.advanceTimersByTime(4_999);
    });
    expect(observer.count()).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(observer.count()).toBe(1);

    await fire(); // druhé zlyhanie
    await act(async () => {
      await Promise.resolve();
    });
    expect(observer.count()).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(9_999);
    });
    expect(observer.count()).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(observer.count()).toBe(1);

    await fire(); // úspech
    await act(async () => {
      await Promise.resolve();
    });
    expect(rows()).toHaveLength(30);
    expect(listMock.mock.calls.filter(([page]) => page === 2)).toHaveLength(3);

    // Úspešná dávka vráti pauzu na začiatok: ďalšie zlyhanie čaká znova 5 s, nie 20 s.
    listMock.mockRejectedValueOnce(new Error('network'));
    await fire();
    await act(async () => {
      await Promise.resolve();
    });
    expect(observer.count()).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(4_999);
    });
    expect(observer.count()).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(observer.count()).toBe(1);
  });

  it('a successful refresh in the background ends the pause at once', async () => {
    fakeServer(listMock, 100);
    render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    listMock.mockRejectedValueOnce(new Error('network'));
    await fire();
    await waitFor(() => expect(observer.count()).toBe(0));

    await act(async () => {
      dispatchNotificationsChanged();
    });
    await waitFor(() => expect(observer.count()).toBe(1));
  });

  it('does not start a batch while a refresh of the window is running', async () => {
    fakeServer(listMock, 100);
    render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    const slowRefresh = deferred<NotificationsPage>();
    listMock.mockImplementationOnce(() => slowRefresh.promise);
    await act(async () => {
      dispatchNotificationsChanged();
    });
    await waitFor(() => expect(observer.count()).toBe(0));
    await act(async () => {
      slowRefresh.resolve(await fakeListPage(100, 1, 15));
    });
    await waitFor(() => expect(observer.count()).toBe(1));
  });

  it('unmount disconnects the observer and clears the retry timer', async () => {
    fakeServer(listMock, 100);
    const view = render(<NotificationsFeed variant={variant} />);
    await screen.findByText('Upozornenie 1');
    jest.useFakeTimers();
    listMock.mockRejectedValueOnce(new Error('network'));
    await fire();
    await act(async () => {
      await Promise.resolve();
    });
    const timersBefore = jest.getTimerCount();
    view.unmount();
    expect(observer.count()).toBe(0);
    expect(jest.getTimerCount()).toBeLessThan(timersBefore);
  });
});

it('works under StrictMode: one watched sentinel and one request per firing', async () => {
  const observer = installFiringIntersectionObserver();
  listMock.mockReset();
  fakeServer(listMock, 100);
  render(
    <StrictMode>
      <NotificationsFeed />
    </StrictMode>,
  );
  await screen.findByText('Upozornenie 1');
  await waitFor(() => expect(observer.count()).toBe(1));
  await act(async () => {
    observer.fire(SENTINEL);
  });
  await waitFor(() => expect(rows()).toHaveLength(30));
  expect(listMock.mock.calls.filter(([page]) => page === 2)).toHaveLength(1);
  observer.restore();
});

async function fakeListPage(
  total: number,
  page: number,
  pageSize = 15,
): Promise<NotificationsPage> {
  const { serverPage } = jest.requireActual(
    '../notificationsFeedTestUtils',
  ) as typeof import('../notificationsFeedTestUtils');
  return serverPage(total, page, pageSize);
}
