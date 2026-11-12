import { renderHook } from '@testing-library/react';
import toast from 'react-hot-toast';

import { DEFAULT_PREFERENCES } from '../notificationPreferenceKeys';
import { SAVE_ERROR_TOAST_ID } from '../preferenceSaveError';
import { useNotificationMaster } from '../useNotificationMaster';
import type { NotificationPreferencesController } from '../useNotificationPreferences';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

/**
 * Hlavný vypínač „Vypnúť všetko“ (nález 321, rozhodnutie R35): zapnutý je vtedy, keď je `in_app_notifications` na
 * serveri `false` (inverzne), a jeho zmena ukladá práve túto voľbu s opačnou hodnotou.
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

describe('useNotificationMaster', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('upozornenia zapnuté na serveri: hlavný vypínač je vypnutý', () => {
    const { result } = renderHook(() => useNotificationMaster(makeController()));

    expect(result.current.enabled).toBe(false);
  });

  it('upozornenia vypnuté na serveri: hlavný vypínač je zapnutý (inverzne)', () => {
    const controller = makeController({ preferences: { ...DEFAULT_PREFERENCES, inAppNotifications: false } });
    const { result } = renderHook(() => useNotificationMaster(controller));

    expect(result.current.enabled).toBe(true);
  });

  it('zapnutie hlavného vypínača ukladá in_app_notifications false, vypnutie true', () => {
    const controller = makeController();
    const { result } = renderHook(() => useNotificationMaster(controller));

    result.current.onChange(true);
    result.current.onChange(false);

    expect(controller.updatePreference).toHaveBeenNthCalledWith(1, 'inAppNotifications', false, {
      onError: expect.any(Function),
    });
    expect(controller.updatePreference).toHaveBeenNthCalledWith(2, 'inAppNotifications', true, {
      onError: expect.any(Function),
    });
  });

  it('počas načítania je vypínač zakázaný a nesie príznak načítavania; po zlyhaní načítania je len zakázaný', () => {
    const loading = renderHook(() => useNotificationMaster(makeController({ loading: true })));
    expect(loading.result.current.loading).toBe(true);

    const failed = renderHook(() => useNotificationMaster(makeController({ loadFailed: true })));
    expect(failed.result.current.disabled).toBe(true);
    expect(failed.result.current.loading).toBe(false);

    const ready = renderHook(() => useNotificationMaster(makeController()));
    expect(ready.result.current.disabled).toBe(false);
    expect(ready.result.current.loading).toBe(false);
  });

  it('chyba uloženia ide na toast s rovnakým spoločným identifikátorom ako pri kategóriách', () => {
    const controller = makeController();
    const { result } = renderHook(() => useNotificationMaster(controller));

    result.current.onChange(true);
    const options = jest.mocked(controller.updatePreference).mock.calls[0][2];
    options?.onError?.('Nastavenia upozornení sa nepodarilo uložiť.');

    expect(toast.error).toHaveBeenCalledWith('Nastavenia upozornení sa nepodarilo uložiť.', {
      id: SAVE_ERROR_TOAST_ID,
    });
  });
});
