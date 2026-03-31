import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';

import NotificationsModule from '../NotificationsModule';
import { LanguageProvider } from '@/contexts/LanguageContext';

jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
  endpoints: {
    push: {
      preferences: '/auth/push/preferences/',
    },
  },
}));

async function renderNotificationsModule() {
  const { api } = require('@/lib/api');
  window.localStorage.setItem('appLocale', 'sk');

  render(
    <LanguageProvider>
      <NotificationsModule />
    </LanguageProvider>,
  );

  await waitFor(() => {
    expect(api.get).toHaveBeenCalledWith('/auth/push/preferences/');
  });
}

describe('NotificationsModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({
      data: {
        email_notifications: true,
        push_notifications: true,
      },
    });
    api.patch.mockImplementation(async (_url: string, payload: any) => ({
      data: {
        email_notifications: true,
        push_notifications:
          typeof payload?.push_notifications === 'boolean'
            ? payload.push_notifications
            : true,
      },
    }));
  });

  it('renders notifications header and persisted push messages section', async () => {
    await renderNotificationsModule();

    expect(screen.getByText('Upozornenia')).toBeInTheDocument();
    expect(
      screen.getAllByText('Push upozornenia na spravy').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByTestId('notifications-push-messages-mobile'),
    ).toBeInTheDocument();
  });

  it('persists desktop push message preference changes through the API', async () => {
    const { api } = require('@/lib/api');

    await renderNotificationsModule();

    const desktopSection = screen.getByTestId(
      'notifications-push-messages-desktop',
    );
    await waitFor(() => {
      expect(
        within(desktopSection).getByText('Vypnuté').closest('button'),
      ).not.toBeDisabled();
    });

    fireEvent.click(within(desktopSection).getByText('Vypnuté'));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', {
        push_notifications: false,
      });
    });
  });
});
