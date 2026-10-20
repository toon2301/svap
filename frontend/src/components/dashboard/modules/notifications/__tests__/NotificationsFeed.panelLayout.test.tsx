import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import NotificationsFeed from '../NotificationsFeed';
import { listNotificationsPage } from '../notificationsApi';
import { fakeServer } from '../notificationsFeedTestUtils';

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
  useIsMobile: () => false,
}));

const listMock = listNotificationsPage as jest.Mock;

/**
 * Rozloženie jsdom nepočíta, takže tu stráži len trieda; skutočný účinok (telo stránky sa pri
 * otvorenom paneli neroztiahne) je overený v reálnom prehliadači.
 */
describe('NotificationsFeed panel layout', () => {
  beforeEach(() => {
    listMock.mockReset();
    fakeServer(listMock, 40);
  });

  it('keeps the scrolling panel positioned so its hidden titles are clipped by it', async () => {
    const { container } = render(<NotificationsFeed variant="panel" />);
    const hiddenTitle = await screen.findByText('Upozornenie 1');

    const panel = container.querySelector('section') as HTMLElement;
    expect(panel).toHaveClass('relative', 'overflow-y-auto');
    // Skrytý titulok upozornenia je naozaj vnútri panela, ktorý ho má orezať.
    expect(hiddenTitle).toHaveClass('sr-only');
    expect(panel).toContainElement(hiddenTitle);
  });

  it('does not turn the page variant into a scrolling container', async () => {
    const { container } = render(<NotificationsFeed />);
    await screen.findByText('Upozornenie 1');

    expect(container.querySelector('section')).not.toHaveClass('overflow-y-auto');
  });
});
