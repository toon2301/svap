/** @jest-environment node */

import { renderToString } from 'react-dom/server';

import { usePushMessagesPreference } from '../usePushMessagesPreference';

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
 * Hook Správ na serveri (nález 308): počiatočné povolenie sa zisťuje už pri prvom vykreslení, no na serveri `window`
 * ani `Notification` neexistujú. Prvé vykreslenie na serveri preto nesmie spadnúť ani vypísať varovanie a musí byť
 * rovnaké ako pred opravou: voľba sa ešte načítava, bez chyby a s povolením „unsupported“, takže pri hydratácii v
 * prehliadači nevznikne rozdiel v texte stránky.
 */
function Probe() {
  const push = usePushMessagesPreference();
  return <p>{`${push.initialLoading}|${push.error ?? ''}|${push.permission}|${push.supported}`}</p>;
}

describe('usePushMessagesPreference na serveri', () => {
  it('prvé vykreslenie: načítavanie, bez chyby, povolenie „unsupported“ a bez varovania v konzole', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(typeof window).toBe('undefined');
    expect(typeof Notification).toBe('undefined');

    const html = renderToString(<Probe />);

    expect(html).toContain('true||unsupported|false');
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
