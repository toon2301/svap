import { Profiler } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { api } from '@/lib/api';

import sk from '../../../../../messages/sk.json';
import NotificationSettingsModule from '../NotificationSettingsModule';
import { PUSH_PROMPT_DISMISSED_KEY } from '../notifications/usePushPermissionPrompt';

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

/**
 * Výzva na povolenie push pre Správy v Nastaveniach → Upozornenia (nález 321, etapa 3b, R36 a). Používa sa skutočný hook
 * s odloženou odpoveďou API a riadeným prehliadačom (povolenie, podpora push, zariadenie). Výzva sa ukáže len pri
 * výslovne zapnutých a načítaných Správach, keď prehliadač push podporuje a povolenie ešte nebolo vyžiadané (alebo na
 * iPhone mimo nainštalovanej aplikácie ako návod); povolenie sa vyžiada len kliknutím na tlačidlo a priamo v obsluhe
 * kliknutia. Zariadenie sa tu napodobňuje len user agentom a `navigator.standalone`; správanie skutočného iPhonu sa z
 * testov overiť nedá.
 */
const TITLE = sk.notifications.pushPromptTitle;
const BODY = sk.notifications.pushPromptBody;
const ENABLE = sk.notifications.pushPromptEnable;
const DISMISS = sk.notifications.pushPromptDismiss;
const IOS_GUIDE = sk.notifications.pushPromptIosGuide;
const BLOCKED = 'Push notifikácie sú v tomto prehliadači zablokované. Povoľ ich v nastaveniach prehliadača.';

const IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Odber, ktorý vráti prehliadač po úspešnom povolení (s kľúčmi, ktoré server pri registrácii vyžaduje). */
const SUBSCRIPTION = {
  endpoint: 'https://push.example.test/sub/1',
  toJSON: () => ({ endpoint: 'https://push.example.test/sub/1', keys: { p256dh: 'p', auth: 'a' } }),
  unsubscribe: jest.fn().mockResolvedValue(true),
};

type FakeNotification = {
  permission: NotificationPermission;
  requestPermission: jest.Mock<Promise<NotificationPermission>, []>;
};

/**
 * Nastaví push API prehliadača. `permission` je povolenie na začiatku, `grant` odpoveď používateľa na dialóg
 * (po ňom sa povolenie zmení ako v prehliadači) a `subscription` existujúci odber tohto prehliadača.
 */
function setupBrowser({
  permission = 'default',
  grant = 'granted',
  subscription = null,
}: {
  permission?: NotificationPermission;
  grant?: NotificationPermission;
  subscription?: unknown;
} = {}) {
  const notification: FakeNotification = {
    permission,
    requestPermission: jest.fn(async () => {
      notification.permission = grant;
      return grant;
    }),
  };
  const registration = {
    pushManager: {
      getSubscription: jest.fn().mockResolvedValue(subscription),
      subscribe: jest.fn().mockResolvedValue(SUBSCRIPTION),
    },
  };
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(window, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, writable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: { register: jest.fn().mockResolvedValue(registration) },
  });
  return { notification, registration };
}

/** Vráti prehliadač do stavu bez push API a bez nastavenia zariadenia (jsdom ich nemá). */
function resetBrowser() {
  for (const target of [window, globalThis] as Array<Record<string, unknown>>) {
    Reflect.deleteProperty(target, 'Notification');
    Reflect.deleteProperty(target, 'PushManager');
  }
  for (const key of ['serviceWorker', 'userAgent', 'standalone']) {
    Reflect.deleteProperty(navigator, key);
  }
}

/** Odloží odpoveď GET s uloženými nastaveniami; test ju dokončí sám. Kľúč VAPID ide hneď. */
function deferPreferences() {
  const pending = deferred<{ data: { in_app_notifications: boolean; push_notifications: boolean } }>();
  jest.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/auth/push/preferences/') return pending.promise;
    if (url === '/auth/push/vapid-public-key/') return { data: { public_key: 'AAAA' } };
    throw new Error(`Neočakávané GET ${url}`);
  });
  return {
    respond: (push: boolean) =>
      act(async () => {
        pending.resolve({ data: { in_app_notifications: true, push_notifications: push } });
      }),
    fail: () =>
      act(async () => {
        pending.reject(new Error('network'));
      }),
  };
}

const flush = () => act(async () => undefined);

const desktopBox = () => screen.getByTestId('notifications-push-messages-desktop');
const mobileBox = () => screen.getByTestId('notifications-push-messages-mobile');
const promptIn = (layout: 'desktop' | 'mobile') =>
  within(layout === 'desktop' ? desktopBox() : mobileBox()).queryByTestId(`notifications-push-prompt-${layout}`);
const prompts = () => [promptIn('desktop'), promptIn('mobile')];
const anyPrompt = () => prompts().some((prompt) => prompt !== null);

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  jest.mocked(api.post).mockResolvedValue({ data: {} });
});

afterEach(() => {
  resetBrowser();
});

describe('NotificationSettingsModule: výzva na povolenie push, kedy sa ukáže', () => {
  it('zapnuté Správy a povolenie ešte nevyžiadané: výzva s tlačidlami je v oboch rozloženiach, v obale Správ pod stavovým riadkom', async () => {
    const { notification } = setupBrowser({ permission: 'default' });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(true);

    expect(screen.getAllByRole('region', { name: TITLE })).toHaveLength(2);
    for (const layout of ['desktop', 'mobile'] as const) {
      const box = layout === 'desktop' ? desktopBox() : mobileBox();
      const prompt = promptIn(layout);
      expect(prompt).toBeInTheDocument();
      expect(prompt).toHaveTextContent(BODY);
      expect(within(prompt as HTMLElement).getByRole('button', { name: ENABLE })).toBeEnabled();
      expect(within(prompt as HTMLElement).getByRole('button', { name: DISMISS })).toBeEnabled();
      // Výzva je pod stavovým riadkom (a teda aj pod voľbou) v tom istom obale.
      const status = within(box).getByTestId('notifications-push-status');
      expect(status.compareDocumentPosition(prompt as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // Povolenie sa nikdy nevyžiada samo, len kliknutím na tlačidlo.
    expect(notification.requestPermission).not.toHaveBeenCalled();
  });

  it('kým sa voľba načítava, výzva nie je; príde v tom istom vykreslení, v ktorom kostru nahradia riadky', async () => {
    setupBrowser({ permission: 'default' });
    const preferences = deferPreferences();
    const commits: Array<{ skeleton: boolean; prompts: number }> = [];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const record = () =>
      commits.push({
        skeleton: container.querySelector('[data-testid="notifications-push-messages-desktop"] [data-testid="section-options-skeleton"]') !== null,
        prompts: container.querySelectorAll('[data-testid^="notifications-push-prompt-"]').length,
      });
    render(
      <Profiler id="module" onRender={record}>
        <NotificationSettingsModule />
      </Profiler>,
      { container },
    );
    expect(commits[commits.length - 1]).toEqual({ skeleton: true, prompts: 0 });

    await preferences.respond(true);

    // Nikdy nie je vykreslenie s riadkami voľby bez výzvy: tá by prišla o snímok neskôr a posunula by obsah pod ňou.
    expect(commits.filter((commit) => !commit.skeleton && commit.prompts === 0)).toEqual([]);
    expect(commits[commits.length - 1]).toEqual({ skeleton: false, prompts: 2 });
  });

  it.each([
    ['voľba Správ je vypnutá', { permission: 'default' as const, push: false }],
    ['povolenie je už udelené', { permission: 'granted' as const, push: true, subscription: SUBSCRIPTION }],
    ['povolenie je zablokované', { permission: 'denied' as const, push: true }],
  ])('%s: výzva nie je v žiadnom rozložení', async (_label, { permission, push, subscription }) => {
    setupBrowser({ permission, subscription });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(push);

    expect(anyPrompt()).toBe(false);
    expect(screen.queryByRole('region', { name: TITLE })).not.toBeInTheDocument();
  });

  it('zlyhanie načítania voľby: výzva nie je (voľba je neznáma, nie zapnutá)', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    setupBrowser({ permission: 'default' });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.fail();

    expect(anyPrompt()).toBe(false);
    consoleError.mockRestore();
  });

  it('prehliadač push nepodporuje a nejde o iPhone: výzva nie je', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(true);

    expect(anyPrompt()).toBe(false);
  });
});

describe('NotificationSettingsModule: výzva na povolenie push, tlačidlo „Zapnúť“', () => {
  it('vyžiada povolenie hneď v obsluhe kliknutia, bez čakania, a kým beží, tlačidlá sú zakázané', async () => {
    const { notification } = setupBrowser({ permission: 'default', grant: 'granted' });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    await preferences.respond(true);

    fireEvent.click(within(desktopBox()).getByRole('button', { name: ENABLE }));

    // Bez `await`: prehliadač povolenie vyžiada len pri geste používateľa, takže volanie musí prebehnúť v tom istom
    // behu obsluhy kliknutia (nie po `await` ani po `setTimeout`).
    expect(notification.requestPermission).toHaveBeenCalledTimes(1);
    for (const layout of ['desktop', 'mobile'] as const) {
      expect(within(promptIn(layout) as HTMLElement).getByRole('button', { name: ENABLE })).toBeDisabled();
    }
  });

  it('po udelení povolenia sa zaregistruje odber tohto prehliadača a výzva zmizne v oboch rozloženiach', async () => {
    const { notification, registration } = setupBrowser({ permission: 'default', grant: 'granted' });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    await preferences.respond(true);

    fireEvent.click(within(mobileBox()).getByRole('button', { name: ENABLE }));
    await flush();

    expect(notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(registration.pushManager.subscribe).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/auth/push/subscriptions/', {
      subscription: { endpoint: SUBSCRIPTION.endpoint, keys: { p256dh: 'p', auth: 'a' } },
    });
    expect(anyPrompt()).toBe(false);
  });

  it('používateľ povolenie v dialógu zamietne: výzva zmizne a ostane len existujúca hláška o zablokovaní', async () => {
    const { notification } = setupBrowser({ permission: 'default', grant: 'denied' });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    await preferences.respond(true);

    fireEvent.click(within(desktopBox()).getByRole('button', { name: ENABLE }));
    await flush();

    expect(notification.requestPermission).toHaveBeenCalledTimes(1);
    expect(anyPrompt()).toBe(false);
    expect(within(desktopBox()).getByRole('alert')).toHaveTextContent(BLOCKED);
    expect(window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)).toBeNull();
  });
});

describe('NotificationSettingsModule: výzva na povolenie push, tlačidlo „Nie teraz“', () => {
  it('skryje výzvu v oboch rozloženiach, nič nevyžiada ani neuloží na server a zapíše príznak do prehliadača', async () => {
    const { notification } = setupBrowser({ permission: 'default' });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    await preferences.respond(true);

    fireEvent.click(within(desktopBox()).getByRole('button', { name: DISMISS }));

    expect(anyPrompt()).toBe(false);
    expect(window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)).toBe('1');
    expect(notification.requestPermission).not.toHaveBeenCalled();
    expect(api.patch).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
    // Obaly Správ a voľba ostávajú.
    expect(desktopBox()).toBeInTheDocument();
    expect(mobileBox()).toBeInTheDocument();
  });

  it('po opätovnom otvorení Nastavení sa výzva v tomto prehliadači už neukáže', async () => {
    setupBrowser({ permission: 'default' });
    const first = deferPreferences();
    const view = render(<NotificationSettingsModule />);
    await first.respond(true);
    fireEvent.click(within(mobileBox()).getByRole('button', { name: DISMISS }));
    view.unmount();

    const second = deferPreferences();
    render(<NotificationSettingsModule />);
    await second.respond(true);

    expect(anyPrompt()).toBe(false);
  });
});

describe('NotificationSettingsModule: výzva na povolenie push, iPhone (napodobnený user agentom)', () => {
  /** iPhone v prehliadači: user agent iPhonu, bez push API a bez nainštalovanej aplikácie. */
  function useIphoneInBrowser() {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: IPHONE_USER_AGENT });
  }

  it('mimo nainštalovanej aplikácie je namiesto tlačidla „Zapnúť“ návod a „Nie teraz“ ho skryje', async () => {
    useIphoneInBrowser();
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(true);

    for (const layout of ['desktop', 'mobile'] as const) {
      const prompt = promptIn(layout) as HTMLElement;
      expect(prompt).toHaveTextContent(IOS_GUIDE);
      expect(within(prompt).queryByRole('button', { name: ENABLE })).not.toBeInTheDocument();
      expect(within(prompt).getByRole('button', { name: DISMISS })).toBeEnabled();
    }

    fireEvent.click(within(desktopBox()).getByRole('button', { name: DISMISS }));

    expect(anyPrompt()).toBe(false);
    expect(window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)).toBe('1');
  });

  it('návod sa neukáže, keď je voľba Správ vypnutá', async () => {
    useIphoneInBrowser();
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(false);

    expect(anyPrompt()).toBe(false);
  });

  it('v nainštalovanej aplikácii (`navigator.standalone`) bez push API návod nie je', async () => {
    useIphoneInBrowser();
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(true);

    expect(anyPrompt()).toBe(false);
  });

  it('v nainštalovanej aplikácii s push API a povolením default je bežná výzva s tlačidlom, nie návod', async () => {
    useIphoneInBrowser();
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
    setupBrowser({ permission: 'default' });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(true);

    for (const layout of ['desktop', 'mobile'] as const) {
      const prompt = promptIn(layout) as HTMLElement;
      expect(prompt).toHaveTextContent(BODY);
      expect(prompt).not.toHaveTextContent(IOS_GUIDE);
      expect(within(prompt).getByRole('button', { name: ENABLE })).toBeEnabled();
    }
  });
});
