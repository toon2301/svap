import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestsModule from '../RequestsModule';

const mockMarkAllRead = jest.fn().mockResolvedValue(undefined);
const mockRefreshUnreadCount = jest.fn();
let mockUnreadCount = 0;

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, defaultValue?: string) =>
      typeof defaultValue === 'string' ? defaultValue : key,
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      avatar_url: null,
    },
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
}));

jest.mock('../../contexts/RequestsNotificationsContext', () => ({
  useRequestsNotifications: () => ({
    unreadCount: mockUnreadCount,
    refreshUnreadCount: mockRefreshUnreadCount,
    markAllRead: mockMarkAllRead,
  }),
}));

jest.mock('../requests/requestsApi', () => ({
  fetchSkillRequests: jest.fn().mockResolvedValue({ received: [], sent: [] }),
  updateSkillRequest: jest.fn().mockResolvedValue({ data: { id: 1, status: 'pending' } }),
}));

describe('RequestsModule', () => {
  beforeEach(() => {
    mockUnreadCount = 0;
    mockMarkAllRead.mockClear();
    mockRefreshUnreadCount.mockClear();
  });

  it('renders heading and empty state', async () => {
    render(<RequestsModule />);
    expect(screen.getByText('Spolupráce')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Žiadne prijaté žiadosti').length).toBeGreaterThan(0);
    });
  });

  it('marks unread requests as read after the received pending view finishes loading', async () => {
    mockUnreadCount = 2;

    render(<RequestsModule />);

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalledTimes(1);
    });
  });
});
