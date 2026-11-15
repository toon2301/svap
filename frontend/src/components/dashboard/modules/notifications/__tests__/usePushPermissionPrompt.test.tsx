import { act, renderHook } from '@testing-library/react';

import { isAppleMobile, isInstalledApp } from '../pushPlatform';
import {
  PUSH_PROMPT_DISMISSED_KEY,
  usePushPermissionPrompt,
  type PushPromptSource,
  type PushPromptVariant,
} from '../usePushPermissionPrompt';

jest.mock('../pushPlatform', () => ({
  isAppleMobile: jest.fn(),
  isInstalledApp: jest.fn(),
}));

/**
 * Výzva na povolenie push pre Správy (nález 321, etapa 3b, R36 a). Ukáže sa len pri výslovne zapnutej a načítanej voľbe
 * Správ, ak ju používateľ neodmietol: `enable` pri podporovanom push s povolením `default`, `ios-install` na iPhone alebo
 * iPade mimo nainštalovanej aplikácie. Počíta sa počas vykresľovania a odmietnutie sa pamätá v prehliadači.
 */
const source = (overrides: Partial<PushPromptSource> = {}): PushPromptSource => ({
  value: true,
  initialLoading: false,
  permission: 'default',
  supported: true,
  disabled: false,
  onChange: jest.fn(),
  ...overrides,
});

type Device = 'iná platforma' | 'iPhone v prehliadači' | 'iPhone v nainštalovanej aplikácii';

/** Nastaví výsledky zisťovania zariadenia. */
function useDevice(device: Device) {
  jest.mocked(isAppleMobile).mockReturnValue(device !== 'iná platforma');
  jest.mocked(isInstalledApp).mockReturnValue(device === 'iPhone v nainštalovanej aplikácii');
}

const UNSUPPORTED = { supported: false, permission: 'unsupported' } as const;

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  useDevice('iná platforma');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('usePushPermissionPrompt: kedy sa výzva ukáže', () => {
  it.each<[string, Partial<PushPromptSource>, Device, PushPromptVariant | null]>([
    ['zapnuté Správy, povolenie default, prehliadač push podporuje', {}, 'iná platforma', 'enable'],
    ['voľba Správ je vypnutá', { value: false }, 'iná platforma', null],
    ['voľba Správ je neznáma po zlyhaní načítania', { value: null }, 'iná platforma', null],
    ['voľba sa ešte načítava', { initialLoading: true }, 'iná platforma', null],
    ['povolenie je už udelené', { permission: 'granted' }, 'iná platforma', null],
    ['povolenie je zablokované', { permission: 'denied' }, 'iná platforma', null],
    ['prehliadač push nepodporuje (nie iPhone)', UNSUPPORTED, 'iná platforma', null],
    ['iPhone v prehliadači, push nie je dostupný', UNSUPPORTED, 'iPhone v prehliadači', 'ios-install'],
    ['iPhone v prehliadači, voľba Správ je vypnutá', { ...UNSUPPORTED, value: false }, 'iPhone v prehliadači', null],
    ['iPhone v prehliadači, voľba Správ je neznáma', { ...UNSUPPORTED, value: null }, 'iPhone v prehliadači', null],
    ['iPhone v prehliadači, voľba sa ešte načítava', { ...UNSUPPORTED, initialLoading: true }, 'iPhone v prehliadači', null],
    ['iPhone v nainštalovanej aplikácii, push nie je dostupný', UNSUPPORTED, 'iPhone v nainštalovanej aplikácii', null],
    ['iPhone v nainštalovanej aplikácii, povolenie default', {}, 'iPhone v nainštalovanej aplikácii', 'enable'],
    ['iPhone v nainštalovanej aplikácii, povolenie udelené', { permission: 'granted' }, 'iPhone v nainštalovanej aplikácii', null],
    ['iPhone v prehliadači, no push je dostupný a povolenie default', {}, 'iPhone v prehliadači', 'enable'],
  ])('%s', (_label, overrides, device, expected) => {
    useDevice(device);

    const { result } = renderHook(() => usePushPermissionPrompt(source(overrides)));

    expect(result.current.variant).toBe(expected);
  });

  it('počíta sa počas vykresľovania: výzva je už v prvom vykreslení, nie až po efekte', () => {
    const seen: Array<PushPromptVariant | null> = [];

    renderHook(() => {
      const prompt = usePushPermissionPrompt(source());
      seen.push(prompt.variant);
      return prompt;
    });

    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((variant) => variant === 'enable')).toBe(true);
  });

  it('výzva príde v tom istom vykreslení ako načítaná voľba a po zmene povolenia zmizne', () => {
    let current = source({ initialLoading: true, value: false });
    const { result, rerender } = renderHook(() => usePushPermissionPrompt(current));
    expect(result.current.variant).toBeNull();

    current = source();
    rerender();
    expect(result.current.variant).toBe('enable');

    current = source({ permission: 'denied' });
    rerender();
    expect(result.current.variant).toBeNull();
  });

  it('`disabled` preberá z hooku Správ: kým beží ukladanie alebo iná akcia, tlačidlo sa nedá stlačiť', () => {
    const { result, rerender } = renderHook(({ disabled }) => usePushPermissionPrompt(source({ disabled })), {
      initialProps: { disabled: true },
    });
    expect(result.current.disabled).toBe(true);

    rerender({ disabled: false });
    expect(result.current.disabled).toBe(false);
  });
});

describe('usePushPermissionPrompt: povolenie', () => {
  it('`enable` zavolá zapnutie Správ (`onChange(true)`) práve raz a hneď, bez čakania', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePushPermissionPrompt(source({ onChange })));

    result.current.enable();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('usePushPermissionPrompt: odmietnutie', () => {
  it.each<[string, Partial<PushPromptSource>, Device]>([
    ['výzva s tlačidlom', {}, 'iná platforma'],
    ['výzva s návodom pre iPhone', UNSUPPORTED, 'iPhone v prehliadači'],
  ])('`dismiss` skryje výzvu (%s) a zapíše príznak do prehliadača', (_label, overrides, device) => {
    useDevice(device);
    const { result } = renderHook(() => usePushPermissionPrompt(source(overrides)));
    expect(result.current.variant).not.toBeNull();

    act(() => result.current.dismiss());

    expect(result.current.variant).toBeNull();
    expect(window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)).toBe('1');
  });

  it('odmietnutie sa po novom vzniku hooku nevráti', () => {
    const first = renderHook(() => usePushPermissionPrompt(source()));
    act(() => first.result.current.dismiss());
    first.unmount();

    const second = renderHook(() => usePushPermissionPrompt(source()));

    expect(second.result.current.variant).toBeNull();
  });

  it.each<[string, Partial<PushPromptSource>, Device]>([
    ['výzva s tlačidlom', {}, 'iná platforma'],
    ['výzva s návodom pre iPhone', UNSUPPORTED, 'iPhone v prehliadači'],
  ])('už uložené odmietnutie výzvu (%s) neukáže', (_label, overrides, device) => {
    useDevice(device);
    window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, '1');

    const { result } = renderHook(() => usePushPermissionPrompt(source(overrides)));

    expect(result.current.variant).toBeNull();
  });

  it('príznak odmietnutia sa číta raz pri vzniku hooku: neskorší zápis do úložiska výzvu neskryje', () => {
    const { result, rerender } = renderHook(() => usePushPermissionPrompt(source()));
    expect(result.current.variant).toBe('enable');

    window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, '1');
    rerender();

    expect(result.current.variant).toBe('enable');
  });

  it('iný obsah pod kľúčom než „1“ sa nepovažuje za odmietnutie', () => {
    window.localStorage.setItem(PUSH_PROMPT_DISMISSED_KEY, '0');

    const { result } = renderHook(() => usePushPermissionPrompt(source()));

    expect(result.current.variant).toBe('enable');
  });
});

describe('usePushPermissionPrompt: úložisko hádže výnimky', () => {
  it('čítanie zlyhá: hook nespadne a výzva sa ukáže (odmietnutie sa nedá zistiť)', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    const { result } = renderHook(() => usePushPermissionPrompt(source()));

    expect(result.current.variant).toBe('enable');
  });

  it('zápis zlyhá: výzva sa po odmietnutí skryje len pre túto reláciu (po novom vzniku hooku sa ukáže znova)', () => {
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const first = renderHook(() => usePushPermissionPrompt(source()));

    act(() => first.result.current.dismiss());

    expect(setItem).toHaveBeenCalledTimes(1);
    expect(first.result.current.variant).toBeNull();
    expect(window.localStorage.getItem(PUSH_PROMPT_DISMISSED_KEY)).toBeNull();
    first.unmount();

    const second = renderHook(() => usePushPermissionPrompt(source()));
    expect(second.result.current.variant).toBe('enable');
  });
});
