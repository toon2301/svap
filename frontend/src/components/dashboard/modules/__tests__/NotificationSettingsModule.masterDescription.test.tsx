import { act, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { api } from '@/lib/api';

import cs from '../../../../../messages/cs.json';
import de from '../../../../../messages/de.json';
import en from '../../../../../messages/en.json';
import hu from '../../../../../messages/hu.json';
import pl from '../../../../../messages/pl.json';
import sk from '../../../../../messages/sk.json';
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

const MESSAGES = { sk, cs, en, pl, de, hu };
type Language = keyof typeof MESSAGES;
const LANGUAGES = Object.keys(MESSAGES) as Language[];

/** Jazyk, v ktorom aplikácia práve beží; `t` berie texty z `messages/<jazyk>.json`, ako skutočný poskytovateľ jazyka. */
let mockLanguage: Language = 'sk';

const lookup = (source: unknown, key: string): string | undefined =>
  key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], source) as
    | string
    | undefined;

const mockT = (key: string, fallback: string) => lookup(MESSAGES[mockLanguage], key) ?? fallback;

jest.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: mockT }) }));

/**
 * Opis hlavného vypínača „Vypnúť všetko“ na počítači (nález 321, časť (c), rozhodnutie R42): rozloženie na počítači ukáže
 * pod názvom vypínača ten istý text `notifications.turnOffAllDesc` ako mobil (nové texty nepribúdajú), vypínač naň ukazuje
 * cez `aria-describedby`, v mobilnej časti ostáva práve jeden opis ako doteraz a opis sa po prepnutí jazyka preloží. Používa
 * sa skutočný modul s odloženou odpoveďou servera, takže opis je vidno aj počas načítania a po zlyhaní načítania.
 */
const description = (language: Language) => MESSAGES[language].notifications.turnOffAllDesc;
const title = (language: Language) => MESSAGES[language].notifications.turnOffAll;

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

/** Odloží odpoveď `GET` s uloženými nastaveniami; test ju dokončí alebo zlyhá sám. */
function deferPreferences() {
  const pending = deferred<{ data: Record<string, boolean> }>();
  jest.mocked(api.get).mockImplementation(async (url: string) => {
    if (url === '/auth/push/preferences/') return pending.promise;
    throw new Error(`Neočakávané GET ${url}`);
  });
  return {
    respond: () =>
      act(async () => {
        pending.resolve({
          data: {
            in_app_notifications: true,
            push_notifications: false,
            notify_likes: true,
            notify_comment_likes: true,
            notify_comments: true,
            notify_tags_and_shares: true,
            notify_skill_requests: true,
          },
        });
      }),
    fail: () =>
      act(async () => {
        pending.reject({ isAxiosError: true, message: 'Network Error' });
      }),
  };
}

const desktopToggle = () => screen.getByTestId('notifications-master-toggle-desktop');
const mobileToggle = () => screen.getByTestId('notifications-master-toggle-mobile');

/** Modul vykresľuje obe rozloženia vedľa seba (CSS ukáže jedno): prvý koreň je počítač, druhý mobil. */
function layouts(container: HTMLElement) {
  return { desktop: container.children[0] as HTMLElement, mobile: container.children[1] as HTMLElement };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLanguage = 'sk';
  deferPreferences();
});

describe('NotificationSettingsModule: opis hlavného vypínača na počítači', () => {
  it('pod názvom je opis `notifications.turnOffAllDesc` a vypínač naň ukazuje cez `aria-describedby`', () => {
    const { container } = render(<NotificationSettingsModule />);
    const { desktop } = layouts(container);

    const text = within(desktop).getByText(description('sk'));
    const name = within(desktop).getByText(title('sk'));
    expect(text).toBeVisible();
    expect(name.parentElement).toBe(text.parentElement);
    expect(name.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(desktopToggle()).toHaveAttribute('aria-describedby', text.id);
    expect(desktopToggle()).toHaveAccessibleName(title('sk'));
    expect(desktopToggle()).toHaveAccessibleDescription(description('sk'));
  });

  it('mobil: ostáva práve jeden opis ako doteraz a vypínač ukazuje na neho (prechádza pred zmenou aj po nej)', () => {
    const { container } = render(<NotificationSettingsModule />);
    const { mobile } = layouts(container);

    expect(within(mobile).getAllByText(description('sk'))).toHaveLength(1);
    const mobileText = within(mobile).getByText(description('sk'));
    expect(mobileToggle()).toHaveAttribute('aria-describedby', mobileText.id);
    expect(mobileToggle()).toHaveAccessibleDescription(description('sk'));
    expect(mobileToggle()).toHaveAccessibleName(title('sk'));
  });

  it('opis je v stránke dvakrát (raz na počítači, raz na mobile) a každý vypínač ukazuje na ten svoj', () => {
    const { container } = render(<NotificationSettingsModule />);
    const { desktop, mobile } = layouts(container);

    expect(screen.getAllByText(description('sk'))).toHaveLength(2);
    const desktopText = within(desktop).getByText(description('sk'));
    const mobileText = within(mobile).getByText(description('sk'));
    expect(desktopText.id).not.toBe(mobileText.id);
    expect(desktopToggle()).toHaveAttribute('aria-describedby', desktopText.id);
    expect(mobileToggle()).toHaveAttribute('aria-describedby', mobileText.id);
  });

  it('opis je vidno hneď počas načítania a vypínač je ním už opísaný', () => {
    const { container } = render(<NotificationSettingsModule />);
    const { desktop } = layouts(container);

    expect(within(desktop).getByText(description('sk'))).toBeVisible();
    expect(desktopToggle()).toHaveAttribute('aria-busy', 'true');
    expect(desktopToggle()).toHaveAccessibleDescription(description('sk'));
  });

  it('opis ostáva po načítaní hodnôt aj po zlyhaní načítania', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const preferences = deferPreferences();
    const { container } = render(<NotificationSettingsModule />);
    const { desktop } = layouts(container);

    await preferences.fail();

    expect(within(desktop).getByText(description('sk'))).toBeVisible();
    expect(desktopToggle()).toBeDisabled();
    expect(desktopToggle()).toHaveAccessibleDescription(description('sk'));
    consoleError.mockRestore();
  });

  it('opis ostáva aj po úspešnom načítaní', async () => {
    const preferences = deferPreferences();
    const { container } = render(<NotificationSettingsModule />);
    const { desktop } = layouts(container);

    await preferences.respond();

    expect(within(desktop).getByText(description('sk'))).toBeVisible();
    expect(desktopToggle()).not.toBeDisabled();
    expect(desktopToggle()).toHaveAccessibleDescription(description('sk'));
  });

  it('po prepnutí jazyka sa opis preloží na počítači aj na mobile', () => {
    const { container, rerender } = render(<NotificationSettingsModule />);
    const { desktop, mobile } = layouts(container);
    expect(within(desktop).getByText(description('sk'))).toBeInTheDocument();

    mockLanguage = 'en';
    rerender(<NotificationSettingsModule />);

    expect(within(desktop).getByText(description('en'))).toBeVisible();
    expect(within(mobile).getByText(description('en'))).toBeInTheDocument();
    expect(within(desktop).queryByText(description('sk'))).not.toBeInTheDocument();
    expect(desktopToggle()).toHaveAccessibleDescription(description('en'));
    expect(mobileToggle()).toHaveAccessibleDescription(description('en'));
  });

  it.each(LANGUAGES)('jazyk %s: opis na počítači je text z `messages` a vypínač je ním opísaný', (language) => {
    mockLanguage = language;
    const { container } = render(<NotificationSettingsModule />);
    const { desktop, mobile } = layouts(container);

    expect(within(desktop).getByText(description(language))).toBeVisible();
    expect(desktopToggle()).toHaveAccessibleName(title(language));
    expect(desktopToggle()).toHaveAccessibleDescription(description(language));
    expect(within(mobile).getAllByText(description(language))).toHaveLength(1);
  });
});
