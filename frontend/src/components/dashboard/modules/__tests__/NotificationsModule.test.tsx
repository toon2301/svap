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
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  endpoints: {
    push: {
      vapidPublicKey: '/auth/push/vapid-public-key/',
      subscriptions: '/auth/push/subscriptions/',
      subscriptionCurrent: '/auth/push/subscriptions/current/',
      preferences: '/auth/push/preferences/',
    },
  },
}));

function createNotificationValue(
  permission: NotificationPermission,
  requestPermissionResult: NotificationPermission,
) {
  return {
    permission,
    requestPermission: jest
      .fn()
      .mockImplementation(async () => requestPermissionResult),
  };
}

function setupPushBrowser({
  permission = 'granted',
  requestPermissionResult = permission,
  existingSubscription = null,
}: {
  permission?: NotificationPermission;
  requestPermissionResult?: NotificationPermission;
  existingSubscription?: any;
} = {}) {
  const mockSubscription =
    existingSubscription ?? {
      endpoint: 'https://push.example.com/subscription/1',
      unsubscribe: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        endpoint: 'https://push.example.com/subscription/1',
        keys: {
          p256dh: 'mock-p256dh',
          auth: 'mock-auth',
        },
      }),
    };

  const pushManager = {
    getSubscription: jest.fn().mockResolvedValue(existingSubscription),
    subscribe: jest.fn().mockResolvedValue(mockSubscription),
  };

  const registration = { pushManager };
  const notificationValue = createNotificationValue(
    permission,
    requestPermissionResult,
  );

  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: notificationValue,
  });
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    writable: true,
    value: notificationValue,
  });
  Object.defineProperty(window, 'PushManager', {
    configurable: true,
    writable: true,
    value: function PushManager() {},
  });
  Object.defineProperty(globalThis, 'PushManager', {
    configurable: true,
    writable: true,
    value: function PushManager() {},
  });
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    writable: true,
    value: true,
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: {
      register: jest.fn().mockResolvedValue(registration),
    },
  });

  return {
    mockSubscription,
    pushManager,
    registration,
    requestPermission: notificationValue.requestPermission,
  };
}

function createPreferencesResponse(pushNotifications: boolean) {
  return {
    data: {
      email_notifications: true,
      push_notifications: pushNotifications,
    },
  };
}

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

function getDesktopPushSection() {
  return screen.getByTestId('notifications-push-messages-desktop');
}

function getDesktopOnButton() {
  return within(getDesktopPushSection()).getByText(/Zapnut/i);
}

function getDesktopOffButton() {
  return within(getDesktopPushSection()).getByText(/Vypnut/i);
}

describe('NotificationsModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { api } = require('@/lib/api');

    api.get.mockImplementation(async (url: string) => {
      if (url === '/auth/push/preferences/') {
        return createPreferencesResponse(false);
      }

      if (url === '/auth/push/vapid-public-key/') {
        return {
          data: {
            public_key: 'SGVsbG8',
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });
    api.post.mockResolvedValue({ data: { ok: true, created: true } });
    api.patch.mockImplementation(async (_url: string, payload: any) => ({
      data: {
        email_notifications: true,
        push_notifications:
          typeof payload?.push_notifications === 'boolean'
            ? payload.push_notifications
            : false,
      },
    }));
    api.delete.mockResolvedValue({ data: { ok: true, deleted: true } });

    setupPushBrowser();
  });

  it('renders notifications header and push section on desktop and mobile', async () => {
    await renderNotificationsModule();

    expect(screen.getByText('Upozornenia')).toBeInTheDocument();
    expect(
      screen.getAllByText('Správy').length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByTestId('notifications-push-messages-mobile'),
    ).toBeInTheDocument();
  });

  it('does not request browser permission automatically on initial render', async () => {
    const { requestPermission } = setupPushBrowser({
      permission: 'default',
    });

    await renderNotificationsModule();

    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('requests browser permission, creates a subscription and persists the push preference', async () => {
    const { api } = require('@/lib/api');
    const { requestPermission } = setupPushBrowser({
      permission: 'default',
      requestPermissionResult: 'granted',
    });

    await renderNotificationsModule();

    await waitFor(() => {
      expect(getDesktopOnButton().closest('button')).not.toBeDisabled();
    });

    fireEvent.click(getDesktopOnButton());

    await waitFor(() => {
      expect(requestPermission).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/auth/push/vapid-public-key/');
      expect(api.post).toHaveBeenCalledWith('/auth/push/subscriptions/', {
        subscription: {
          endpoint: 'https://push.example.com/subscription/1',
          keys: {
            p256dh: 'mock-p256dh',
            auth: 'mock-auth',
          },
        },
      });
      expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', {
        push_notifications: true,
      });
    });
  });

  it('keeps the preference off and shows a browser guidance message when permission is denied', async () => {
    const { api } = require('@/lib/api');
    setupPushBrowser({ permission: 'denied' });

    await renderNotificationsModule();

    await waitFor(() => {
      expect(getDesktopOnButton().closest('button')).not.toBeDisabled();
    });

    fireEvent.click(getDesktopOnButton());

    await waitFor(() => {
      expect(
        within(getDesktopPushSection()).getByText(
          'Push notifikacie su v tomto prehliadaci zablokovane. Povol ich v nastaveniach prehliadaca.',
        ),
      ).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalledWith('/auth/push/preferences/', {
      push_notifications: true,
    });
  });

  it('persists disabling push before unregistering the current browser subscription', async () => {
    const { api } = require('@/lib/api');
    const existingSubscription = {
      endpoint: 'https://push.example.com/subscription/current',
      unsubscribe: jest.fn().mockResolvedValue(true),
      toJSON: jest.fn().mockReturnValue({
        endpoint: 'https://push.example.com/subscription/current',
        keys: {
          p256dh: 'mock-p256dh',
          auth: 'mock-auth',
        },
      }),
    };

    api.get.mockImplementation(async (url: string) => {
      if (url === '/auth/push/preferences/') {
        return createPreferencesResponse(true);
      }

      if (url === '/auth/push/vapid-public-key/') {
        return {
          data: {
            public_key: 'SGVsbG8',
          },
        };
      }

      throw new Error(`Unexpected GET ${url}`);
    });

    setupPushBrowser({
      permission: 'granted',
      existingSubscription,
    });

    await renderNotificationsModule();

    await waitFor(() => {
      expect(getDesktopOffButton().closest('button')).not.toBeDisabled();
    });

    fireEvent.click(getDesktopOffButton());

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', {
        push_notifications: false,
      });
      expect(api.delete).toHaveBeenCalledWith(
        '/auth/push/subscriptions/current/',
        {
          data: {
            endpoint: 'https://push.example.com/subscription/current',
          },
        },
      );
      expect(existingSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    });

    expect(api.patch.mock.invocationCallOrder[0]).toBeLessThan(
      api.delete.mock.invocationCallOrder[0],
    );
  });
});
