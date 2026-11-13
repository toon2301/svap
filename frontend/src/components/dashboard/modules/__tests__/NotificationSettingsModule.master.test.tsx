import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';

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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

/**
 * Hlavný vypínač „Vypnúť všetko“ (nález 321, etapa 3a, rozhodnutie R35) so skutočnými hookmi a simulovaným serverom:
 * zapnutý je vtedy, keď je `in_app_notifications` na serveri `false` (inverzne). Zapnutý vypínač ukáže päť kategórií
 * ako „Vypnuté“ a zakázané, ich uložené hodnoty sa nemenia a po vypnutí sa vrátia; Správy (push) vypínač nemení ani
 * nezakazuje. Zmena sa uloží na server a prežije nové otvorenie obrazovky.
 */

type Server = {
  in_app_notifications: boolean;
  push_notifications: boolean;
  notify_likes: boolean;
  notify_comment_likes: boolean;
  notify_comments: boolean;
  notify_tags_and_shares: boolean;
  notify_skill_requests: boolean;
};

let server: Server;

/** Stav simulovaného servera; kategórie majú zámerne rôzne uložené hodnoty, aby sa dalo overiť ich vrátenie. */
function resetServer(overrides: Partial<Server> = {}) {
  server = {
    in_app_notifications: true,
    push_notifications: true,
    notify_likes: false,
    notify_comment_likes: true,
    notify_comments: false,
    notify_tags_and_shares: true,
    notify_skill_requests: false,
    ...overrides,
  };
}

/** `GET` vráti stav servera, `PATCH` ho zmení a vráti všetkých sedem hodnôt (ako skutočný server). */
function mockServer() {
  jest.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/auth/push/preferences/') return { data: { ...server } };
    throw new Error(`Neočakávané GET ${url}`);
  });
  jest.mocked(api.patch).mockImplementation(async (_url: string, body?: unknown) => {
    server = { ...server, ...(body as Partial<Server>) };
    return { data: { ...server } };
  });
}

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (reason: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Odloží odpoveď `GET`; test ju dokončí sám. */
function deferPreferences() {
  const pending = deferred<{ data: Server }>();
  jest.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/auth/push/preferences/') return pending.promise;
    throw new Error(`Neočakávané GET ${url}`);
  });
  return {
    respond: () =>
      act(async () => {
        pending.resolve({ data: { ...server } });
      }),
    fail: () =>
      act(async () => {
        pending.reject({ isAxiosError: true, message: 'Network Error' });
      }),
  };
}

/** Prehliadač s podporou push, povolenie je už udelené a odber existuje (Správy ostanú bez varovania). */
function setupBrowser() {
  const subscription = {
    endpoint: 'https://push.example.test/sub/1',
    unsubscribe: jest.fn().mockResolvedValue(true),
    toJSON: () => ({ endpoint: 'https://push.example.test/sub/1', keys: { p256dh: 'p', auth: 'a' } }),
  };
  const notification = { permission: 'granted', requestPermission: jest.fn() };
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(window, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, writable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: {
      register: jest.fn().mockResolvedValue({
        pushManager: { getSubscription: jest.fn().mockResolvedValue(subscription), subscribe: jest.fn() },
      }),
    },
  });
}

/** Kategórie v poradí obrazovky: identifikátor riadku a kľúč servera, ktorý zapína a vypína. */
const CATEGORIES = [
  ['likes', 'notify_likes'],
  ['tags-and-shares', 'notify_tags_and_shares'],
  ['comments', 'notify_comments'],
  ['comment-likes', 'notify_comment_likes'],
  ['skill-requests', 'notify_skill_requests'],
] as const;

type Layout = 'desktop' | 'mobile';
const LAYOUTS: Layout[] = ['desktop', 'mobile'];

const master = (layout: Layout) => screen.getByTestId(`notifications-master-toggle-${layout}`);
/** Zapnutý hlavný vypínač má fialové pozadie. */
const isMasterOn = (layout: Layout) => master(layout).className.includes('bg-purple-400');
const category = (id: string, layout: Layout) => screen.getByTestId(`notifications-category-${id}-${layout}`);
const option = (box: HTMLElement, label: 'Vypnuté' | 'Zapnuté') =>
  within(box).getByRole('button', { name: new RegExp(label) });
const pushBox = (layout: Layout) => screen.getByTestId(`notifications-push-messages-${layout}`);

/** Je riadok voľby vybraný? Vybraný kruh (ToggleCircle) má čierne pozadie. */
const isSelected = (button: HTMLElement) =>
  (button.querySelector('div > div') as HTMLElement).className.includes('bg-black');

/** Hodnoty kategórií tak, ako ich ukazuje obrazovka (true = vybrané „Zapnuté“). */
const shownCategories = (layout: Layout) =>
  Object.fromEntries(CATEGORIES.map(([id]) => [id, isSelected(option(category(id, layout), 'Zapnuté'))]));

const flush = () => act(async () => undefined);

/** Počká, kým sa voľby načítajú (hlavný vypínač prestane byť zakázaný). */
const waitForLoaded = () => waitFor(() => expect(master('desktop')).not.toBeDisabled());

let onLine: jest.SpyInstance | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  resetServer();
  setupBrowser();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  onLine?.mockRestore();
  onLine = null;
  jest.mocked(console.error).mockRestore();
});

describe('NotificationSettingsModule: hlavný vypínač podľa servera (R35)', () => {
  it('in_app_notifications zapnuté na serveri: hlavný vypínač je vypnutý a kategórie sú aktívne s uloženými hodnotami', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();

    LAYOUTS.forEach((layout) => {
      expect(isMasterOn(layout)).toBe(false);
      expect(shownCategories(layout)).toEqual({
        likes: false,
        'tags-and-shares': true,
        comments: false,
        'comment-likes': true,
        'skill-requests': false,
      });
      CATEGORIES.forEach(([id]) => {
        expect(option(category(id, layout), 'Vypnuté')).not.toBeDisabled();
        expect(option(category(id, layout), 'Zapnuté')).not.toBeDisabled();
      });
    });
  });

  it('in_app_notifications vypnuté na serveri: hlavný vypínač je zapnutý, kategórie „Vypnuté“ a zakázané, Správy nedotknuté', async () => {
    resetServer({ in_app_notifications: false });
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();

    LAYOUTS.forEach((layout) => {
      expect(isMasterOn(layout)).toBe(true);
      CATEGORIES.forEach(([id]) => {
        const box = category(id, layout);
        expect(isSelected(option(box, 'Vypnuté'))).toBe(true);
        expect(isSelected(option(box, 'Zapnuté'))).toBe(false);
        expect(option(box, 'Vypnuté')).toBeDisabled();
        expect(option(box, 'Zapnuté')).toBeDisabled();
      });
      // Správy: hodnota zo servera („Zapnuté“) a riadky sa dajú meniť.
      expect(isSelected(option(pushBox(layout), 'Zapnuté'))).toBe(true);
      expect(option(pushBox(layout), 'Vypnuté')).not.toBeDisabled();
      expect(option(pushBox(layout), 'Zapnuté')).not.toBeDisabled();
    });
  });
});

describe('NotificationSettingsModule: zapnutie a vypnutie hlavného vypínača', () => {
  it.each(LAYOUTS)('%s: zapnutie pošle PATCH len s in_app_notifications false a zablokuje kategórie bez zmeny ich hodnôt', async (layout) => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();
    const stored = { ...server };

    fireEvent.click(master(layout));

    // Zmena sa ukáže hneď (optimisticky) v oboch rozloženiach.
    LAYOUTS.forEach((other) => {
      expect(isMasterOn(other)).toBe(true);
      CATEGORIES.forEach(([id]) => {
        expect(isSelected(option(category(id, other), 'Vypnuté'))).toBe(true);
        expect(option(category(id, other), 'Vypnuté')).toBeDisabled();
      });
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', { in_app_notifications: false });
    await flush();
    // Uložené hodnoty kategórií ani Správ sa na serveri nezmenili.
    expect(server).toEqual({ ...stored, in_app_notifications: false });
  });

  it.each(LAYOUTS)('%s: vypnutie pošle PATCH s in_app_notifications true a vrátia sa pôvodné hodnoty kategórií', async (layout) => {
    resetServer({ in_app_notifications: false });
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();
    expect(isMasterOn(layout)).toBe(true);

    fireEvent.click(master(layout));

    LAYOUTS.forEach((other) => {
      expect(isMasterOn(other)).toBe(false);
      expect(shownCategories(other)).toEqual({
        likes: false,
        'tags-and-shares': true,
        comments: false,
        'comment-likes': true,
        'skill-requests': false,
      });
      CATEGORIES.forEach(([id]) => expect(option(category(id, other), 'Zapnuté')).not.toBeDisabled());
    });
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', { in_app_notifications: true });
    expect(server.in_app_notifications).toBe(true);
  });

  it('zapnutý hlavný vypínač prežije nové otvorenie obrazovky', async () => {
    mockServer();
    const first = render(<NotificationSettingsModule />);
    await waitForLoaded();
    fireEvent.click(master('desktop'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    await flush();
    first.unmount();

    render(<NotificationSettingsModule />);
    await waitForLoaded();

    LAYOUTS.forEach((layout) => {
      expect(isMasterOn(layout)).toBe(true);
      expect(option(category('comments', layout), 'Vypnuté')).toBeDisabled();
    });
  });

  it('hlavný vypínač nezasahuje do Správ: nič sa neposiela pre push_notifications', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();

    fireEvent.click(master('desktop'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    fireEvent.click(master('desktop'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));

    jest.mocked(api.patch).mock.calls.forEach(([, body]) => {
      expect(Object.keys(body as object)).toEqual(['in_app_notifications']);
    });
    expect(server.push_notifications).toBe(true);
  });
});

describe('NotificationSettingsModule: hlavný vypínač pri chybe a počas načítania', () => {
  it('zlyhanie uloženia vráti hlavný vypínač, kategórie ostanú aktívne a chyba ide na toast', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();
    jest.mocked(api.patch).mockRejectedValue({ isAxiosError: true, message: 'Network Error' });

    fireEvent.click(master('mobile'));
    expect(isMasterOn('mobile')).toBe(true);

    await waitFor(() => expect(isMasterOn('mobile')).toBe(false));
    expect(isMasterOn('desktop')).toBe(false);
    CATEGORIES.forEach(([id]) => expect(option(category(id, 'mobile'), 'Zapnuté')).not.toBeDisabled());
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      'Nastavenia upozornení sa nepodarilo uložiť.',
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rýchle dvojité prepnutie: prvý zápis uspeje a druhý zlyhá, hlavný vypínač ukazuje hodnotu uloženú na serveri (PR 258)', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();
    const first = deferred<{ data: Server }>();
    let patchCount = 0;
    jest.mocked(api.patch).mockImplementation(async () => {
      patchCount += 1;
      if (patchCount === 1) return first.promise;
      throw { isAxiosError: true, message: 'Network Error' };
    });

    fireEvent.click(master('desktop'));
    fireEvent.click(master('desktop'));

    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(isMasterOn('desktop')).toBe(false);
    await act(async () => {
      server = { ...server, in_app_notifications: false };
      first.resolve({ data: { ...server } });
    });

    // Prvý zápis uložil `in_app_notifications` false (hlavný vypínač zapnutý), druhý zlyhal: vypínač zostane zapnutý.
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(isMasterOn('desktop')).toBe(true));
    LAYOUTS.forEach((layout) => {
      expect(isMasterOn(layout)).toBe(true);
      expect(option(category('likes', layout), 'Vypnuté')).toBeDisabled();
    });
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('pri vypnutom internete sa nič neodošle, hlavný vypínač sa nezmení a toast je preložený (319)', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();
    onLine = jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    fireEvent.click(master('desktop'));
    await flush();

    expect(api.patch).not.toHaveBeenCalled();
    LAYOUTS.forEach((layout) => expect(isMasterOn(layout)).toBe(false));
    expect(toast.error).toHaveBeenCalledWith(
      'Bez pripojenia na internet sa nastavenie nedá zmeniť.',
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  it('kým sa voľby načítavajú, hlavný vypínač je zakázaný (bez polohy), označený ako zaneprázdnený a nič neodošle', async () => {
    mockServer();
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    LAYOUTS.forEach((layout) => {
      expect(master(layout)).toBeDisabled();
      expect(master(layout)).toHaveAttribute('aria-busy', 'true');
      expect(isMasterOn(layout)).toBe(false);
    });
    fireEvent.click(master('desktop'));
    expect(api.patch).not.toHaveBeenCalled();

    await preferences.respond();

    LAYOUTS.forEach((layout) => {
      expect(master(layout)).not.toBeDisabled();
      expect(master(layout)).not.toHaveAttribute('aria-busy');
    });
  });

  it('po zlyhaní načítania je hlavný vypínač zakázaný a bez polohy (predvolená hodnota nie je stav servera)', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.fail();

    LAYOUTS.forEach((layout) => {
      expect(master(layout)).toBeDisabled();
      expect(master(layout)).not.toHaveAttribute('aria-busy');
      // Neznáma poloha: bez bežca a nie fialový ako zapnutý vypínač.
      expect(master(layout).querySelector('span')).toBeNull();
      expect(isMasterOn(layout)).toBe(false);
    });
    expect(api.patch).not.toHaveBeenCalled();
  });
});

describe('NotificationSettingsModule: prístupnosť hlavného vypínača (PR 258)', () => {
  it('v počítačovom aj mobilnom rozložení je prepínač s názvom „Vypnúť všetko“ a oznamuje svoj stav', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();

    const switches = screen.getAllByRole('switch', { name: 'Vypnúť všetko' });
    expect(switches).toHaveLength(2);
    switches.forEach((toggle) => expect(toggle).toHaveAttribute('aria-checked', 'false'));

    fireEvent.click(master('mobile'));

    screen
      .getAllByRole('switch', { name: 'Vypnúť všetko' })
      .forEach((toggle) => expect(toggle).toHaveAttribute('aria-checked', 'true'));
  });

  it('mobilný prepínač má opis (že Správy ostanú a žiadosti o zručnosť sa zobrazia bez odznaku) bez zdvojenia nadpisu', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();

    expect(master('mobile')).toHaveAccessibleName('Vypnúť všetko');
    expect(master('mobile')).toHaveAccessibleDescription(
      'Vypne všetky upozornenia okrem Správ. Nové žiadosti o zručnosť sa aj tak zobrazia v Žiadostiach, len bez odznaku.',
    );
    // Nadpis „Vypnúť všetko“ je v mobilnom rozložení len raz (názov sa prepája, nekopíruje).
    const mobileLayout = master('mobile').closest('.lg\\:hidden') as HTMLElement;
    expect(within(mobileLayout).getAllByText('Vypnúť všetko')).toHaveLength(1);
  });

  it('počas načítania a po zlyhaní načítania to nie je prepínač (čítačka by ho oznámila ako vypnutý), ale pomenované tlačidlo', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Vypnúť všetko' })).toHaveLength(2);
    LAYOUTS.forEach((layout) => expect(master(layout)).not.toHaveAttribute('aria-checked'));
    await preferences.fail();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Vypnúť všetko' })).toHaveLength(2);
    LAYOUTS.forEach((layout) => {
      expect(master(layout)).toHaveAccessibleName('Vypnúť všetko');
      expect(master(layout)).not.toHaveAttribute('aria-checked');
    });
  });

  it('po úspešnom načítaní sa z pomenovaného tlačidla stane prepínač v oboch rozloženiach', async () => {
    mockServer();
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();

    await preferences.respond();

    expect(screen.getAllByRole('switch', { name: 'Vypnúť všetko' })).toHaveLength(2);
  });
});

describe('NotificationSettingsModule: opis hlavného vypínača', () => {
  it('mobil ukazuje opis, že sa vypnú všetky upozornenia okrem Správ a nové žiadosti o zručnosť sa zobrazia bez odznaku', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitForLoaded();

    expect(
      screen.getByText(
        'Vypne všetky upozornenia okrem Správ. Nové žiadosti o zručnosť sa aj tak zobrazia v Žiadostiach, len bez odznaku.',
      ),
    ).toBeInTheDocument();
  });
});
