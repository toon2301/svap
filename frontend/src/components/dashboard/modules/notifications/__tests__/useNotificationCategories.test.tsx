import { renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';

import { DEFAULT_PREFERENCES, type NotificationPreferenceKey } from '../notificationPreferenceKeys';
import { SAVE_ERROR_TOAST_ID } from '../preferenceSaveError';
import { useNotificationCategories } from '../useNotificationCategories';
import type { NotificationPreferencesController } from '../useNotificationPreferences';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

/**
 * Riadky kategórií upozornení pre obrazovku Nastavenia → Upozornenia (nález 321, etapa 3a): každá kategória zapína a
 * vypína svoju voľbu servera, hodnoty idú zo zdieľaného stavu, kategórie zablokované hlavným vypínačom (R35,
 * `in_app_notifications` je `false`) sa ukážu ako „Vypnuté“ a zakázané a chyba uloženia ide na toast.
 */

/** Zdieľaný stav volieb s atrapou ukladania; `overrides` prepíše, čo test potrebuje. */
function makeController(
  overrides: Partial<NotificationPreferencesController> = {},
): NotificationPreferencesController {
  return {
    preferences: { ...DEFAULT_PREFERENCES },
    loading: false,
    loadFailed: false,
    error: null,
    isSaving: () => false,
    updatePreference: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

/** Dvojice „identifikátor riadku → voľba servera“ v poradí, v akom sú kategórie na obrazovke. */
const CATEGORIES: ReadonlyArray<readonly [string, NotificationPreferenceKey]> = [
  ['likes', 'notifyLikes'],
  ['tags-and-shares', 'notifyTagsAndShares'],
  ['comments', 'notifyComments'],
  ['comment-likes', 'notifyCommentLikes'],
  ['skill-requests', 'notifySkillRequests'],
];

describe('useNotificationCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('vráti päť kategórií v poradí obrazovky', () => {
    const { result } = renderHook(() => useNotificationCategories(makeController()));

    expect(result.current.map((row) => row.id)).toEqual(CATEGORIES.map(([id]) => id));
  });

  it.each(CATEGORIES)('kategória %s ukladá voľbu %s a posiela len ju', (id, preference) => {
    const controller = makeController();
    const { result } = renderHook(() => useNotificationCategories(controller));
    const row = result.current.find((entry) => entry.id === id);

    row?.onChange(false);

    expect(controller.updatePreference).toHaveBeenCalledTimes(1);
    expect(controller.updatePreference).toHaveBeenCalledWith(preference, false, {
      onError: expect.any(Function),
    });
  });

  it('hodnota každého riadku je hodnota jeho voľby zo stavu (nie cudzia)', () => {
    const controller = makeController({
      preferences: {
        ...DEFAULT_PREFERENCES,
        notifyLikes: false,
        notifyTagsAndShares: true,
        notifyComments: false,
        notifyCommentLikes: true,
        notifySkillRequests: false,
      },
    });
    const { result } = renderHook(() => useNotificationCategories(controller));

    expect(Object.fromEntries(result.current.map((row) => [row.id, row.value]))).toEqual({
      likes: false,
      'tags-and-shares': true,
      comments: false,
      'comment-likes': true,
      'skill-requests': false,
    });
    expect(result.current.every((row) => row.disabled === false)).toBe(true);
  });

  it('zablokované kategórie (hlavný vypínač) sú „Vypnuté“ a zakázané, aj keď sú uložené zapnuté', () => {
    const controller = makeController({
      preferences: { ...DEFAULT_PREFERENCES, inAppNotifications: false },
    });
    const { result } = renderHook(() => useNotificationCategories(controller));

    expect(result.current.every((row) => row.value === false)).toBe(true);
    expect(result.current.every((row) => row.disabled === true)).toBe(true);
    // Uložené hodnoty sa nemenia: stav ostáva zapnutý a po odblokovaní sa riadky vrátia.
    expect(controller.preferences.notifyLikes).toBe(true);
    expect(controller.updatePreference).not.toHaveBeenCalled();
  });

  it('po vypnutí hlavného vypínača sa vrátia uložené hodnoty', () => {
    const stored = { ...DEFAULT_PREFERENCES, notifyLikes: false, notifyComments: true };
    const { result, rerender } = renderHook(
      ({ inApp }) =>
        useNotificationCategories(
          makeController({ preferences: { ...stored, inAppNotifications: inApp } }),
        ),
      { initialProps: { inApp: false } },
    );
    expect(result.current.find((row) => row.id === 'comments')?.value).toBe(false);

    rerender({ inApp: true });

    expect(result.current.find((row) => row.id === 'comments')?.value).toBe(true);
    expect(result.current.find((row) => row.id === 'likes')?.value).toBe(false);
  });

  it('kým sa voľby načítavajú, každý riadok nesie príznak načítavania (namiesto hodnoty je kostra)', () => {
    const controller = makeController({ loading: true });
    const { result } = renderHook(() => useNotificationCategories(controller));

    expect(result.current.every((row) => row.loading === true)).toBe(true);
  });

  it('po zlyhaní načítania sú riadky zakázané, už sa nenačítavajú a ich hodnota je neznáma (null), nie predvolená', () => {
    const controller = makeController({ loadFailed: true });
    const { result } = renderHook(() => useNotificationCategories(controller));

    expect(result.current.every((row) => row.disabled === true)).toBe(true);
    expect(result.current.every((row) => row.loading === false)).toBe(true);
    // Predvolené hodnoty (všetko zapnuté) nie sú stav servera, preto sa nesmú ukázať ako vybrané.
    expect(result.current.every((row) => row.value === null)).toBe(true);
  });

  it('pri úspešnom načítaní je hodnota vždy pravdivostná (nie null), aj pri zablokovaní hlavným vypínačom', () => {
    const loaded = renderHook(() => useNotificationCategories(makeController()));
    expect(loaded.result.current.every((row) => typeof row.value === 'boolean')).toBe(true);

    const blocked = renderHook(() =>
      useNotificationCategories(
        makeController({ preferences: { ...DEFAULT_PREFERENCES, inAppNotifications: false } }),
      ),
    );
    expect(blocked.result.current.every((row) => row.value === false)).toBe(true);
  });

  it('chyba uloženia ide na toast s jedným spoločným identifikátorom, nie do stránky', () => {
    const controller = makeController();
    const { result } = renderHook(() => useNotificationCategories(controller));

    result.current[0].onChange(false);
    const options = jest.mocked(controller.updatePreference).mock.calls[0][2];
    options?.onError?.('Nastavenia upozornení sa nepodarilo uložiť.');

    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledWith('Nastavenia upozornení sa nepodarilo uložiť.', {
      id: SAVE_ERROR_TOAST_ID,
    });
  });

  it('názvy a opisy sú preložené (slovenčina s diakritikou)', () => {
    const { result } = renderHook(() => useNotificationCategories(makeController()));

    expect(result.current.map((row) => row.title)).toEqual([
      'Páči sa mi to',
      'Označenie a zdieľanie príspevku',
      'Komentáre',
      'Páči sa mi to pre komentáre',
      'Žiadosť o zručnosť',
    ]);
    result.current.forEach((row) => {
      expect(row.description.trim()).not.toBe('');
      expect(row.description).not.toMatch(/^notifications\./);
    });
  });
});
