import { act, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { api } from '@/lib/api';

import NotificationSettingsModule from '../NotificationSettingsModule';

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
 * Úvodné načítanie sekcie Upozornenia (nález 286). Používa sa skutočný hook s odloženou odpoveďou API a riadeným
 * service workerom a hodiny sú falošné, aby sa oneskorenie 200 ms dalo overiť presne. Kým sa uložená voľba Správ
 * nenačíta, nesmú byť vykreslené riadky „Vypnuté / Zapnuté“ (ukazovali by nepravdivý výber), namiesto nich je kostra
 * rovnakej výšky; stavový riadok pod voľbou drží miesto, takže sa nič neposúva.
 */

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

const preferencesResponse = (push: boolean) => ({
  data: { in_app_notifications: true, push_notifications: push },
});

/** Nastaví push API prehliadača; `subscription` riadi, kedy sa dokončí kontrola existujúceho odberu. */
function setupBrowser({
  permission = 'default',
  subscription,
}: {
  permission?: NotificationPermission;
  subscription?: Deferred<unknown>;
} = {}) {
  const notification = { permission, requestPermission: jest.fn() };
  const registration = {
    pushManager: {
      getSubscription: jest.fn(() => (subscription ? subscription.promise : Promise.resolve(null))),
      subscribe: jest.fn(),
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
}

/** Odloží odpoveď GET s uloženými nastaveniami; test ju dokončí sám. */
function deferPreferences() {
  const pending = deferred<ReturnType<typeof preferencesResponse>>();
  jest.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/auth/push/preferences/') return pending.promise;
    throw new Error(`Neočakávané GET ${url}`);
  });
  return {
    respond: (push: boolean) =>
      act(async () => {
        pending.resolve(preferencesResponse(push));
      }),
    fail: () =>
      act(async () => {
        pending.reject(new Error('network'));
      }),
  };
}

const advance = (ms: number) => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

const flush = () => act(async () => undefined);

const desktopBox = () => screen.getByTestId('notifications-push-messages-desktop');
const mobileBox = () => screen.getByTestId('notifications-push-messages-mobile');
const boxes = () => [desktopBox(), mobileBox()];
const skeletons = () => [
  within(desktopBox()).getByTestId('section-options-skeleton'),
  within(mobileBox()).getByTestId('notifications-push-skeleton-mobile'),
];
const statusLines = () => boxes().map((box) => within(box).getByTestId('notifications-push-status'));

/** Je riadok voľby vybraný? Vybraný kruh (ToggleCircle) má čierne pozadie. */
const isSelected = (button: HTMLElement) =>
  (button.querySelector('div > div') as HTMLElement).className.includes('bg-black');

describe('NotificationSettingsModule: úvodné načítanie (nález 286)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    setupBrowser();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('kým sa voľba načítava, nie sú riadky „Vypnuté / Zapnuté“, ale kostra, a obal Správ ostáva v DOM', () => {
    deferPreferences();
    render(<NotificationSettingsModule />);

    boxes().forEach((box) => {
      expect(box).toBeInTheDocument();
      expect(within(box).queryAllByRole('button')).toHaveLength(0);
      expect(within(box).queryByText('Vypnuté')).not.toBeInTheDocument();
      expect(within(box).queryByText('Zapnuté')).not.toBeInTheDocument();
    });
    skeletons().forEach((skeleton) => {
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
      expect(skeleton).toHaveTextContent('Načítavam nastavenia upozornení...');
    });
  });

  it('kostra mobilu má odsadenie mobilného riadku a kostra desktopu hustejšie, ako skutočné riadky', () => {
    deferPreferences();
    render(<NotificationSettingsModule />);

    within(mobileBox())
      .getAllByTestId('notifications-push-skeleton-mobile-row')
      .forEach((row) => {
        expect(row).toHaveClass('p-4');
        expect(row).not.toHaveClass('p-2');
      });
    within(desktopBox())
      .getAllByTestId('section-options-skeleton-row')
      .forEach((row) => {
        expect(row).toHaveClass('p-2');
        expect(row).not.toHaveClass('p-4');
      });
  });

  it('nadpis a popis Správ sú vidno hneď, aj počas načítavania', () => {
    deferPreferences();
    render(<NotificationSettingsModule />);

    expect(within(desktopBox()).getByText('Správy')).toBeInTheDocument();
    expect(within(mobileBox()).getByText('Správy')).toBeInTheDocument();
  });

  it('kostra je v prvom snímku neviditeľná (drží miesto) a ukáže sa až po 200 ms', () => {
    deferPreferences();
    render(<NotificationSettingsModule />);

    skeletons().forEach((skeleton) => expect(skeleton).toHaveAttribute('data-visible', 'false'));
    advance(199);
    skeletons().forEach((skeleton) => expect(skeleton).toHaveAttribute('data-visible', 'false'));
    advance(1);
    skeletons().forEach((skeleton) => expect(skeleton).toHaveAttribute('data-visible', 'true'));
  });

  it('rýchla odpoveď (pred 200 ms): kostra sa nikdy neukáže a rovno sú riadky s uloženou voľbou', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    advance(100);
    skeletons().forEach((skeleton) => expect(skeleton).toHaveAttribute('data-visible', 'false'));

    await preferences.respond(true);

    boxes().forEach((box) => {
      expect(within(box).queryByTestId('section-options-skeleton')).not.toBeInTheDocument();
      expect(within(box).queryByTestId('notifications-push-skeleton-mobile')).not.toBeInTheDocument();
      expect(within(box).getAllByRole('button')).toHaveLength(2);
    });
    advance(1000);
    boxes().forEach((box) => expect(within(box).queryByRole('status', { busy: true })).not.toBeInTheDocument());
  });

  it('po načítaní je hneď vybraná uložená voľba, bez prechodného „Vypnuté“', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    advance(300);

    await preferences.respond(true);

    boxes().forEach((box) => {
      const off = within(box).getByRole('button', { name: /Vypnuté/ });
      const on = within(box).getByRole('button', { name: /Zapnuté/ });
      expect(isSelected(off)).toBe(false);
      expect(isSelected(on)).toBe(true);
      expect(off).not.toBeDisabled();
      expect(on).not.toBeDisabled();
    });
  });

  it('uložené „Vypnuté“ sa po načítaní zobrazí ako vybrané „Vypnuté“', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond(false);

    boxes().forEach((box) => {
      expect(isSelected(within(box).getByRole('button', { name: /Vypnuté/ }))).toBe(true);
      expect(isSelected(within(box).getByRole('button', { name: /Zapnuté/ }))).toBe(false);
    });
  });

  it('stavový riadok je v DOM od začiatku, počas načítavania je prázdny a po načítaní ostáva ten istý prvok', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    const before = statusLines();

    before.forEach((line) => {
      expect(line).toBeEmptyDOMElement();
      expect(line).toHaveClass('min-h-4');
    });
    advance(1000);
    before.forEach((line) => expect(line).toBeEmptyDOMElement());

    await preferences.respond(false);

    statusLines().forEach((line, index) => {
      expect(line).toBe(before[index]);
      expect(line).toBeEmptyDOMElement();
    });
  });

  it('pri zlyhaní načítania kostra zmizne, ukáže sa chyba a zakázané riadky bez vybranej voľby', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    advance(300);

    await preferences.fail();

    boxes().forEach((box) => {
      expect(within(box).queryByTestId('section-options-skeleton')).not.toBeInTheDocument();
      expect(within(box).queryByTestId('notifications-push-skeleton-mobile')).not.toBeInTheDocument();
      expect(within(box).getAllByRole('button')).toHaveLength(2);
      // Predvolené „Vypnuté“ nie je stav servera, preto nie je vybraný žiadny riadok (PR 258).
      within(box)
        .getAllByRole('button')
        .forEach((button) => expect(isSelected(button)).toBe(false));
      expect(within(box).getByText('Nastavenia upozornení sa nepodarilo načítať.')).toBeInTheDocument();
      // Chyba sa pridá do stránky až po zlyhaní, preto musí byť upozornením, ktoré čítač obrazovky oznámi.
      expect(within(box).getByRole('alert')).toHaveTextContent('Nastavenia upozornení sa nepodarilo načítať.');
    });
    consoleError.mockRestore();
  });
});

describe('NotificationSettingsModule: kontrola prehliadača po načítaní voľby (nález 286)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('kým beží kontrola odberu, voľba je hneď po načítaní vidno a text „Načítavam…“ sa ukáže až po 200 ms v rezervovanom riadku', async () => {
    const subscription = deferred<unknown>();
    setupBrowser({ permission: 'granted', subscription });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    await flush();
    const lines = statusLines();

    await preferences.respond(false);

    boxes().forEach((box) => expect(within(box).getAllByRole('button')).toHaveLength(2));
    lines.forEach((line) => expect(line).toBeEmptyDOMElement());
    advance(199);
    lines.forEach((line) => expect(line).toBeEmptyDOMElement());
    advance(1);
    lines.forEach((line) => expect(line).toHaveTextContent('Načítavam nastavenia upozornení...'));

    await act(async () => {
      subscription.resolve(null);
    });
    statusLines().forEach((line, index) => {
      expect(line).toBe(lines[index]);
      expect(line).toBeEmptyDOMElement();
    });
  });

  it('service worker, ktorý sa neozve, nenechá voľbu navždy v kostre', async () => {
    setupBrowser({ permission: 'granted', subscription: deferred<unknown>() });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    await flush();

    await preferences.respond(false);
    advance(5000);

    boxes().forEach((box) => {
      expect(within(box).queryByTestId('section-options-skeleton')).not.toBeInTheDocument();
      expect(within(box).queryByTestId('notifications-push-skeleton-mobile')).not.toBeInTheDocument();
      expect(within(box).getAllByRole('button')).toHaveLength(2);
    });
  });

  it('rýchla kontrola odberu (pod 200 ms) text „Načítavam…“ neukáže vôbec', async () => {
    const subscription = deferred<unknown>();
    setupBrowser({ permission: 'granted', subscription });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    await flush();
    await preferences.respond(false);
    advance(100);

    await act(async () => {
      subscription.resolve(null);
    });
    advance(1000);

    statusLines().forEach((line) => expect(line).toBeEmptyDOMElement());
  });
});
