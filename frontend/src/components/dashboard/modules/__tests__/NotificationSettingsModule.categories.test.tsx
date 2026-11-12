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
 * Päť kategórií v Nastavenia → Upozornenia (nález 321, etapa 3a) so skutočnými hookmi a simulovaným serverom
 * (`GET`/`PATCH /api/auth/push/preferences/` so siedmimi voľbami). Kým sa voľby nenačítajú, kategórie majú kostru a nie
 * falošné „Vypnuté“; po načítaní nesú hodnoty zo servera; zmena sa uloží (pošle sa len jej kľúč) a prežije nové
 * otvorenie obrazovky; zlyhanie ukladania vráti hodnotu a ohlási sa toastom, nie blokom v stránke.
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

/** Stav simulovaného servera (nový účet má všetko zapnuté, Správy vypnuté). */
function resetServer(overrides: Partial<Server> = {}) {
  server = {
    in_app_notifications: true,
    push_notifications: false,
    notify_likes: true,
    notify_comment_likes: true,
    notify_comments: true,
    notify_tags_and_shares: true,
    notify_skill_requests: true,
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

/** Prehliadač s podporou push a nevyžiadaným povolením (nespúšťa kontrolu odberu ani registráciu). */
function setupBrowser() {
  const notification = { permission: 'default', requestPermission: jest.fn() };
  Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(globalThis, 'Notification', { configurable: true, writable: true, value: notification });
  Object.defineProperty(window, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(globalThis, 'PushManager', { configurable: true, writable: true, value: function PushManager() {} });
  Object.defineProperty(window, 'isSecureContext', { configurable: true, writable: true, value: true });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    writable: true,
    value: { register: jest.fn().mockResolvedValue({ pushManager: { getSubscription: jest.fn(), subscribe: jest.fn() } }) },
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

const category = (id: string, layout: Layout) => screen.getByTestId(`notifications-category-${id}-${layout}`);
const option = (id: string, layout: Layout, label: 'Vypnuté' | 'Zapnuté') =>
  within(category(id, layout)).getByRole('button', { name: new RegExp(label) });

/** Je riadok voľby vybraný? Vybraný kruh (ToggleCircle) má čierne pozadie. */
const isSelected = (button: HTMLElement) =>
  (button.querySelector('div > div') as HTMLElement).className.includes('bg-black');

/** Stlačenie riadku tak, ako ho posiela prehliadač: najprv `pointerdown`, potom `click` (obe vyberú hodnotu). */
function press(button: HTMLElement) {
  fireEvent.pointerDown(button);
  fireEvent.click(button);
}

const flush = () => act(async () => undefined);

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

describe('NotificationSettingsModule: kategórie počas načítania', () => {
  it('kým sa voľby načítavajú, kategórie nemajú riadky „Vypnuté / Zapnuté“, ale kostru', () => {
    deferPreferences();
    render(<NotificationSettingsModule />);

    CATEGORIES.forEach(([id]) => {
      LAYOUTS.forEach((layout) => {
        const box = category(id, layout);
        expect(within(box).queryAllByRole('button')).toHaveLength(0);
        expect(within(box).queryByText('Vypnuté')).not.toBeInTheDocument();
        expect(within(box).queryByText('Zapnuté')).not.toBeInTheDocument();
      });
      expect(within(category(id, 'desktop')).getByTestId('section-options-skeleton')).toHaveAttribute(
        'aria-busy',
        'true',
      );
      expect(within(category(id, 'mobile')).getByTestId(`notifications-category-skeleton-${id}-mobile`)).toHaveAttribute(
        'aria-busy',
        'true',
      );
    });
  });

  it('nadpisy a opisy kategórií sú vidno hneď, aj počas načítavania', () => {
    deferPreferences();
    render(<NotificationSettingsModule />);

    LAYOUTS.forEach((layout) => {
      expect(within(category('likes', layout)).getByText('Páči sa mi to')).toBeInTheDocument();
      expect(within(category('skill-requests', layout)).getByText('Žiadosť o zručnosť')).toBeInTheDocument();
    });
  });

  it('premenovaná kategória ukazuje názov a opis označenia a zdieľania príspevku (R34), nie starý „Páči sa mi to a komentáre“', () => {
    deferPreferences();
    render(<NotificationSettingsModule />);

    LAYOUTS.forEach((layout) => {
      const box = category('tags-and-shares', layout);
      expect(within(box).getByText('Označenie a zdieľanie príspevku')).toBeInTheDocument();
      expect(
        within(box).getByText('Keď vás niekto označí v príspevku alebo zdieľa váš príspevok'),
      ).toBeInTheDocument();
      expect(within(box).queryByText('Páči sa mi to a komentáre')).not.toBeInTheDocument();
      expect(within(box).queryByText(/Reakcie a komentáre na fotkách/)).not.toBeInTheDocument();
    });
    expect(screen.queryByText('Páči sa mi to a komentáre')).not.toBeInTheDocument();
  });

  it('po načítaní sú hneď vybrané hodnoty zo servera, bez prechodného „Vypnuté“', async () => {
    resetServer({
      notify_likes: false,
      notify_tags_and_shares: true,
      notify_comments: false,
      notify_comment_likes: true,
      notify_skill_requests: false,
    });
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.respond();

    CATEGORIES.forEach(([id, key]) => {
      LAYOUTS.forEach((layout) => {
        const enabled = server[key];
        expect(within(category(id, layout)).queryByTestId('section-options-skeleton')).not.toBeInTheDocument();
        expect(isSelected(option(id, layout, 'Zapnuté'))).toBe(enabled);
        expect(isSelected(option(id, layout, 'Vypnuté'))).toBe(!enabled);
        expect(option(id, layout, 'Zapnuté')).not.toBeDisabled();
        expect(option(id, layout, 'Vypnuté')).not.toBeDisabled();
      });
    });
  });

  it('nový účet (všetko zapnuté) ukáže po načítaní všetky kategórie ako „Zapnuté“', async () => {
    mockServer();
    render(<NotificationSettingsModule />);

    await waitFor(() => expect(isSelected(option('likes', 'desktop', 'Zapnuté'))).toBe(true));

    CATEGORIES.forEach(([id]) => {
      LAYOUTS.forEach((layout) => expect(isSelected(option(id, layout, 'Zapnuté'))).toBe(true));
    });
  });
});

describe('NotificationSettingsModule: zmena kategórie', () => {
  it.each(CATEGORIES)('%s na počítači: zmena pošle PATCH len s kľúčom %s a prežije nové otvorenie', async (id, key) => {
    mockServer();
    const first = render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option(id, 'desktop', 'Zapnuté'))).toBe(true));

    press(option(id, 'desktop', 'Vypnuté'));

    // Hodnota sa prepne hneď (optimisticky), ešte pred odpoveďou servera.
    expect(isSelected(option(id, 'desktop', 'Vypnuté'))).toBe(true);
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', { [key]: false });
    await flush();
    first.unmount();

    render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option(id, 'desktop', 'Vypnuté'))).toBe(true));
    // Ostatné kategórie ostali zapnuté.
    CATEGORIES.filter(([other]) => other !== id).forEach(([other]) => {
      expect(isSelected(option(other, 'desktop', 'Zapnuté'))).toBe(true);
    });
  });

  it.each(CATEGORIES)('%s na mobile: zmena pošle PATCH len s kľúčom %s', async (id, key) => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option(id, 'mobile', 'Zapnuté'))).toBe(true));

    press(option(id, 'mobile', 'Vypnuté'));

    expect(isSelected(option(id, 'mobile', 'Vypnuté'))).toBe(true);
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', { [key]: false });
    // Počítačové aj mobilné rozloženie ukazujú tú istú hodnotu (jeden zdieľaný stav).
    expect(isSelected(option(id, 'desktop', 'Vypnuté'))).toBe(true);
  });

  it('zapnutie späť pošle PATCH s hodnotou true a Správy sa nedotknú', async () => {
    resetServer({ notify_comments: false, push_notifications: false });
    mockServer();
    render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option('comments', 'desktop', 'Vypnuté'))).toBe(true));

    press(option('comments', 'desktop', 'Zapnuté'));

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(api.patch).toHaveBeenCalledWith('/auth/push/preferences/', { notify_comments: true });
    expect(api.patch).not.toHaveBeenCalledWith('/auth/push/preferences/', expect.objectContaining({ push_notifications: expect.anything() }));
    expect(server.push_notifications).toBe(false);
  });
});

describe('NotificationSettingsModule: chyba uloženia kategórie', () => {
  it('zlyhanie vráti hodnotu a ohlási sa toastom s prekladom, nie blokom v stránke', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option('likes', 'desktop', 'Zapnuté'))).toBe(true));
    jest.mocked(api.patch).mockRejectedValue({ isAxiosError: true, message: 'Network Error' });

    press(option('likes', 'desktop', 'Vypnuté'));
    expect(isSelected(option('likes', 'desktop', 'Vypnuté'))).toBe(true);

    await waitFor(() => expect(isSelected(option('likes', 'desktop', 'Zapnuté'))).toBe(true));
    LAYOUTS.forEach((layout) => expect(isSelected(option('likes', layout, 'Zapnuté'))).toBe(true));
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith(
      'Nastavenia upozornení sa nepodarilo uložiť.',
      expect.objectContaining({ id: expect.any(String) }),
    );
    // Žiadny nový blok v stránke, ktorý by posunul obsah (nález 308).
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('pri vypnutom internete sa nič neodošle, hodnota sa nezmení a toast je preložený (319)', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option('comments', 'mobile', 'Zapnuté'))).toBe(true));
    onLine = jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);

    press(option('comments', 'mobile', 'Vypnuté'));
    await flush();

    expect(api.patch).not.toHaveBeenCalled();
    expect(isSelected(option('comments', 'mobile', 'Zapnuté'))).toBe(true);
    expect(isSelected(option('comments', 'desktop', 'Zapnuté'))).toBe(true);
    expect(toast.error).toHaveBeenCalledWith(
      'Bez pripojenia na internet sa nastavenie nedá zmeniť.',
      expect.objectContaining({ id: expect.any(String) }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rýchle dvojité prepnutie: prvý zápis uspeje a druhý zlyhá, riadok ukazuje hodnotu uloženú na serveri (PR 258)', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option('likes', 'desktop', 'Zapnuté'))).toBe(true));
    const first = deferred<{ data: Server }>();
    let patchCount = 0;
    jest.mocked(api.patch).mockImplementation(async () => {
      patchCount += 1;
      if (patchCount === 1) return first.promise;
      throw { isAxiosError: true, message: 'Network Error' };
    });

    press(option('likes', 'desktop', 'Vypnuté'));
    press(option('likes', 'desktop', 'Zapnuté'));

    // Druhý zápis čaká na prvý: na server zatiaľ odišiel len jeden PATCH a rozhranie ukazuje poslednú voľbu.
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(isSelected(option('likes', 'desktop', 'Zapnuté'))).toBe(true);
    await act(async () => {
      server = { ...server, notify_likes: false };
      first.resolve({ data: { ...server } });
    });

    // Prvý zápis uložil „Vypnuté“, druhý zlyhal: riadok sa vráti na to, čo má server, nie na pôvodné „Zapnuté“.
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(isSelected(option('likes', 'desktop', 'Vypnuté'))).toBe(true));
    LAYOUTS.forEach((layout) => expect(isSelected(option('likes', layout, 'Vypnuté'))).toBe(true));
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it('zlyhanie jednej kategórie nevráti inú, medzitým uloženú', async () => {
    mockServer();
    render(<NotificationSettingsModule />);
    await waitFor(() => expect(isSelected(option('likes', 'desktop', 'Zapnuté'))).toBe(true));
    const likes = deferred<{ data: Server }>();
    jest.mocked(api.patch).mockImplementation(async (_url: string, body?: unknown) => {
      if ('notify_likes' in (body as object)) return likes.promise;
      server = { ...server, ...(body as Partial<Server>) };
      return { data: { ...server } };
    });

    press(option('likes', 'desktop', 'Vypnuté'));
    press(option('comments', 'desktop', 'Vypnuté'));
    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(2));
    await flush();
    await act(async () => {
      likes.reject({ isAxiosError: true, message: 'Network Error' });
    });

    expect(isSelected(option('likes', 'desktop', 'Zapnuté'))).toBe(true);
    expect(isSelected(option('comments', 'desktop', 'Vypnuté'))).toBe(true);
  });
});

describe('NotificationSettingsModule: zlyhanie načítania', () => {
  it('kostra zmizne a riadky kategórií aj Správ sú zakázané (nedá sa meniť, čo sa nenačítalo)', async () => {
    const preferences = deferPreferences();
    render(<NotificationSettingsModule />);

    await preferences.fail();

    CATEGORIES.forEach(([id]) => {
      LAYOUTS.forEach((layout) => {
        const box = category(id, layout);
        expect(within(box).queryByTestId('section-options-skeleton')).not.toBeInTheDocument();
        expect(within(box).queryByTestId(`notifications-category-skeleton-${id}-mobile`)).not.toBeInTheDocument();
        const buttons = within(box).getAllByRole('button');
        expect(buttons).toHaveLength(2);
        buttons.forEach((button) => expect(button).toBeDisabled());
      });
    });
    [
      screen.getByTestId('notifications-push-messages-desktop'),
      screen.getByTestId('notifications-push-messages-mobile'),
    ].forEach((box) => {
      within(box)
        .getAllByRole('button')
        .forEach((button) => expect(button).toBeDisabled());
      expect(within(box).getByRole('alert')).toHaveTextContent('Nastavenia upozornení sa nepodarilo načítať.');
    });
    expect(api.patch).not.toHaveBeenCalled();
  });
});
