import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestsModule from '../RequestsModule';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, defaultValue?: string) =>
      typeof defaultValue === 'string' ? defaultValue : key,
  }),
}));

jest.mock('../../contexts/RequestsNotificationsContext', () => ({
  useRequestsNotifications: () => ({
    unreadCount: 0,
    refreshUnreadCount: jest.fn(),
    markAllRead: jest.fn(),
  }),
}));

jest.mock('../requests/requestsApi', () => ({
  fetchSkillRequests: jest.fn().mockResolvedValue({ received: [], sent: [] }),
  updateSkillRequest: jest.fn().mockResolvedValue({ data: { id: 1, status: 'pending' } }),
}));

describe('RequestsModule', () => {
  it('renders heading and empty state', async () => {
    render(<RequestsModule />);
    expect(screen.getByText('Žiadosti')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('Žiadne prijaté žiadosti').length).toBeGreaterThan(0);
    });
  });
});


