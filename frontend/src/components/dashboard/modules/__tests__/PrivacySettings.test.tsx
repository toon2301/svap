import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { api } from '@/lib/api';
import type { User } from '@/types';

import PrivacySettings from '../PrivacySettings';

jest.mock('@/lib/api', () => ({
  api: { patch: jest.fn() },
}));

/**
 * Súkromie v oboch rozloženiach naraz (nález 286): mobilná aj desktopová obrazovka sú v DOM vždy a o tom, ktorá je
 * vidno, rozhoduje CSS. Prepínanie podľa príznaka `useIsMobile` sa vzdalo, lebo ten je v prvom vykreslení vždy
 * „desktop“ a na telefóne by sa na snímok ukázala skrytá (prázdna) desktopová obrazovka.
 */
const makeUser = (isPublic: boolean) =>
  ({
    id: 42,
    username: 'u',
    email: 'u@e.com',
    first_name: 'U',
    last_name: 'U',
    user_type: 'individual',
    is_verified: true,
    is_public: isPublic,
    created_at: '',
    updated_at: '',
    profile_completeness: 50,
  }) as User;

/** Mobilná obrazovka je v obale `block lg:hidden`, desktopová v obale `hidden lg:flex`. */
function screens(container: HTMLElement) {
  const mobile = container.querySelector<HTMLElement>('.block.lg\\:hidden');
  const desktop = container.querySelector<HTMLElement>('.hidden.lg\\:flex');
  if (!mobile || !desktop) throw new Error('chýba jedna z obrazoviek Súkromia');
  return { mobile, desktop };
}

/** Prepínače obrazovky: [súkromný účet, verejný účet]. */
const togglesOf = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button')).filter((button) =>
    button.className.includes('w-11'),
  );

const isOn = (toggle: HTMLElement) => toggle.className.includes('bg-purple-400');

describe('PrivacySettings', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  const renderPrivacy = (isPublic = true, props: Partial<React.ComponentProps<typeof PrivacySettings>> = {}) =>
    render(
      <PrivacySettings
        user={makeUser(isPublic)}
        onUserUpdate={jest.fn()}
        onBack={jest.fn()}
        {...props}
      />,
    );

  it('vykreslí mobilnú aj desktopovú obrazovku, každú v obale, ktorý ju pri inej šírke skryje', () => {
    const { container } = renderPrivacy();
    const { mobile, desktop } = screens(container);

    expect(mobile).not.toBe(desktop);
    expect(mobile.contains(desktop)).toBe(false);
    expect(desktop.contains(mobile)).toBe(false);
    [mobile, desktop].forEach((root) => {
      expect(within(root).getByText('Súkromný účet')).toBeInTheDocument();
      expect(within(root).getByText('Verejný účet')).toBeInTheDocument();
      expect(togglesOf(root)).toHaveLength(2);
    });
  });

  it('obal má jediný koreňový prvok, aby okolie nevidelo dve deti (napr. medzery space-y)', () => {
    const { container } = renderPrivacy();

    expect(container.children).toHaveLength(1);
    const { mobile, desktop } = screens(container);
    expect(container.firstElementChild?.contains(mobile)).toBe(true);
    expect(container.firstElementChild?.contains(desktop)).toBe(true);
  });

  it('ovládanie je v DOM hneď po prvom vykreslení, bez čakania na zistenie šírky okna', () => {
    window.matchMedia = jest.fn(() => {
      throw new Error('Súkromie nesmie závisieť od matchMedia');
    }) as unknown as typeof window.matchMedia;

    const { container } = renderPrivacy();

    expect(togglesOf(container)).toHaveLength(4);
    expect(screen.getAllByText('Súkromný účet')).toHaveLength(2);
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  it('značkovanie je rovnaké pri úzkom aj širokom okne', () => {
    const withViewport = (mobile: boolean) => {
      window.matchMedia = jest.fn().mockImplementation((query: string) => ({
        matches: mobile,
        media: query,
        onchange: null,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })) as unknown as typeof window.matchMedia;
    };

    withViewport(false);
    const wide = renderPrivacy();
    const wideHtml = wide.container.innerHTML;
    wide.unmount();

    withViewport(true);
    const narrow = renderPrivacy();

    expect(narrow.container.innerHTML).toBe(wideHtml);
  });

  it.each([
    ['verejný účet', true, [false, true]],
    ['súkromný účet', false, [true, false]],
  ])('ukáže uložený stav používateľa (%s) v oboch obrazovkách', (_name, isPublic, expected) => {
    const { container } = renderPrivacy(isPublic);
    const { mobile, desktop } = screens(container);

    expect(togglesOf(mobile).map(isOn)).toEqual(expected);
    expect(togglesOf(desktop).map(isOn)).toEqual(expected);
  });

  it('šípka späť je len na desktopovej obrazovke a volá onBack', () => {
    const onBack = jest.fn();
    const { container } = renderPrivacy(true, { onBack });
    const { mobile, desktop } = screens(container);

    expect(within(mobile).queryByRole('button', { name: 'Späť' })).not.toBeInTheDocument();
    fireEvent.click(within(desktop).getByRole('button', { name: 'Späť' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['mobilnej', 'mobile'],
    ['desktopovej', 'desktop'],
  ] as const)(
    'potvrdenie na %s obrazovke uloží zmenu, dialóg je len jeden a po aktualizácii používateľa ju ukážu obe obrazovky',
    async (_name, which) => {
      const updated = makeUser(false);
      jest.mocked(api.patch).mockResolvedValueOnce({ data: { user: updated } });
      const onUserUpdate = jest.fn();
      const view = renderPrivacy(true, { onUserUpdate });

      fireEvent.click(togglesOf(screens(view.container)[which])[0]);

      expect(screen.getAllByText('Chcete prepnúť svoj účet na súkromný?')).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Zmeniť' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/auth/profile/', { is_public: false }));
      await waitFor(() => expect(onUserUpdate).toHaveBeenCalledWith(updated));
      await waitFor(() =>
        expect(screen.queryByText('Chcete prepnúť svoj účet na súkromný?')).not.toBeInTheDocument(),
      );

      view.rerender(<PrivacySettings user={updated} onUserUpdate={onUserUpdate} onBack={jest.fn()} />);
      const after = screens(view.container);
      expect(togglesOf(after.mobile).map(isOn)).toEqual([true, false]);
      expect(togglesOf(after.desktop).map(isOn)).toEqual([true, false]);
    },
  );
});
