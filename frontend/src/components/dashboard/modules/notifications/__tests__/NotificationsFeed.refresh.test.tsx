import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import NotificationsFeed from '../NotificationsFeed';
import {
  listNotificationsPage,
  markAllNotificationsRead,
  type NotificationsPage,
} from '../notificationsApi';
import { deferred, fakeServer } from '../notificationsFeedTestUtils';
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
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(15);
  });

  it('shows the error box when the user-triggered load fails and hides it after a retry succeeds', async () => {
    fakeServer(listMock, 40);
    listMock.mockRejectedValueOnce(new Error('network'));
    render(<NotificationsFeed />);

    const retry = await screen.findByText('Skúsiť znova');
    // Chyba prvého načítania ostáva v pruhu hore; spodný box je len pre „Zobraziť ďalšie“.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(retry);
    });

    await waitFor(() => expect(screen.queryByText('Skúsiť znova')).not.toBeInTheDocument());
    expect(rows()).toHaveLength(15);
  });

  describe('when the next batch fails to load', () => {
    const scrollIntoView = jest.fn();

    beforeEach(() => {
      scrollIntoView.mockReset();
      window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    });

    afterEach(() => {
      Reflect.deleteProperty(window.HTMLElement.prototype, 'scrollIntoView');
    });

    async function failNextBatch(variant: 'page' | 'panel' = 'page') {
      fakeServer(listMock, 100);
      render(<NotificationsFeed variant={variant} />);
      await screen.findByText('Upozornenie 1');
      listMock.mockRejectedValueOnce(new Error('network'));
      await act(async () => {
        fireEvent.click(screen.getByText(LOAD_MORE));
      });
      return screen.findByRole('alert');
    }

    it.each(['page', 'panel'] as const)(
      'shows the error under the list, where the button was, not above the list (%s)',
      async (variant) => {
        const alert = await failNextBatch(variant);

        const lastRow = screen.getByText('Upozornenie 15').closest('button') as HTMLElement;
        expect(
          lastRow.compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(alert).toHaveTextContent('Skúsiť znova');
        expect(screen.getAllByText(RETRY)).toHaveLength(1);
        expect(screen.queryByText(LOAD_MORE)).not.toBeInTheDocument();
        expect(rows()).toHaveLength(15);
      },
    );

    it('mounts a fresh element for the error so the alert is announced', async () => {
      fakeServer(listMock, 100);
      render(<NotificationsFeed />);
      await screen.findByText('Upozornenie 1');
      const buttonSlot = screen.getByText(LOAD_MORE).parentElement;
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        fireEvent.click(screen.getByText(LOAD_MORE));
      });

      expect(await screen.findByRole('alert')).not.toBe(buttonSlot);
    });

    it('brings the error fully into view when it appears at the end of a long list', async () => {
      const alert = await failNextBatch();

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
      expect(scrollIntoView.mock.contexts[0]).toBe(alert);
    });

    it('scrolls to the error once, not again while it stays on screen', async () => {
      await failNextBatch();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      // Obnova na pozadí, ktorá zlyhá, nezmaže chybu ani nesmie znova posunúť zoznam.
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        dispatchNotificationsChanged();
      });
      await waitFor(() =>
        expect(document.querySelector('[aria-busy]')).toHaveAttribute('aria-busy', 'false'),
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('scrolls to the error again when a retry fails too', async () => {
      await failNextBatch();
      listMock.mockRejectedValueOnce(new Error('network'));

      await act(async () => {
        fireEvent.click(screen.getByText(RETRY));
      });

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
    });

    it('does not scroll anywhere when the next batch loads fine', async () => {
      fakeServer(listMock, 100);
      render(<NotificationsFeed />);
      await screen.findByText('Upozornenie 1');

      await act(async () => {
        fireEvent.click(screen.getByText(LOAD_MORE));
      });
      await waitFor(() => expect(rows()).toHaveLength(30));

      expect(scrollIntoView).not.toHaveBeenCalled();
    });

    it('loads the batch again from the retry in the box and then hides it', async () => {
      await failNextBatch();

      await act(async () => {
        fireEvent.click(screen.getByText(RETRY));
      });

      await waitFor(() => expect(rows()).toHaveLength(30));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText(LOAD_MORE)).toBeInTheDocument();
    });

    it('shows no error box when the list ended meanwhile and nothing is left to load', async () => {
      fakeServer(listMock, 100);
      render(<NotificationsFeed />);
      await screen.findByText('Upozornenie 1');
      const slow = deferred<NotificationsPage>();
      listMock.mockImplementationOnce(() => slow.promise);
      await act(async () => {
        fireEvent.click(screen.getByText(LOAD_MORE));
      });
      // Kým dávka letí, zoznam sa skrátil na 10 upozornení a obnova ho zapíše.
      fakeServer(listMock, 10);
      await act(async () => {
        dispatchNotificationsChanged();
      });
      await waitFor(() => expect(rows()).toHaveLength(10));

      await act(async () => {
        slow.reject(new Error('network'));
      });

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText(LOAD_MORE)).not.toBeInTheDocument();
      expect(rows()).toHaveLength(10);
    });

    it('shows the button again after a successful refresh in the background', async () => {
      await failNextBatch();

      await act(async () => {
        dispatchNotificationsChanged();
      });

      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
      expect(screen.getByText(LOAD_MORE)).toBeInTheDocument();
    });
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
