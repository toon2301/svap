/** @jest-environment node */

import { renderToString } from 'react-dom/server';

import NotificationSettingsModule from '../NotificationSettingsModule';

jest.mock('@/lib/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  endpoints: {
    push: {
      vapidPublicKey: '/auth/push/vapid-public-key/',
      subscriptions: '/auth/push/subscriptions/',
      subscriptionCurrent: '/auth/push/subscriptions/current/',
      preferences: '/auth/push/preferences/',
    },
  },
}));

/**
 * Nastavenia → Upozornenia na serveri (nález 321, etapa 3b): výzva na povolenie push číta príznak odmietnutia z
 * `localStorage` už pri prvom vykreslení, no na serveri `window` neexistuje. Prvé vykreslenie na serveri preto nesmie
 * spadnúť ani vypísať varovanie a výzva v ňom ešte nie je (voľba Správ sa načítava), takže pri hydratácii v prehliadači
 * nevznikne rozdiel v texte stránky; obaly Správ sú v HTML od začiatku.
 */
describe('NotificationSettingsModule na serveri: výzva na povolenie push', () => {
  it('prvé vykreslenie: bez výzvy, s obalmi Správ a bez varovania v konzole', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(typeof window).toBe('undefined');
    expect(typeof localStorage).toBe('undefined');

    const html = renderToString(<NotificationSettingsModule />);

    expect(html).toContain('notifications-push-messages-desktop');
    expect(html).toContain('notifications-push-messages-mobile');
    expect(html).not.toContain('notifications-push-prompt');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
