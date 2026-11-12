'use client';

import { showPreferenceSaveError } from './preferenceSaveError';
import type { NotificationsMaster } from './settingsTypes';
import type { NotificationPreferencesController } from './useNotificationPreferences';

/**
 * Hlavný vypínač „Vypnúť všetko“ (nález 321, rozhodnutie R35). Je zapnutý vtedy, keď je `in_app_notifications` na serveri
 * `false` (inverzne), a jeho zmena ukladá práve túto voľbu s opačnou hodnotou; ostatné voľby sa nemenia, takže sa
 * uložené hodnoty kategórií po vypnutí vrátia a Správy (push) vypínač nijako neovplyvňuje. Chyba uloženia (aj pri
 * vypnutom internete) ide na toast. Kým sa voľby načítavajú, vypínač nemá polohu (`loading`), po zlyhaní načítania je
 * zakázaný.
 */
export function useNotificationMaster(
  controller: NotificationPreferencesController,
): NotificationsMaster {
  const { preferences, loading, loadFailed, updatePreference } = controller;

  return {
    enabled: !preferences.inAppNotifications,
    disabled: loadFailed,
    loading,
    onChange: (enabled: boolean) => {
      void updatePreference('inAppNotifications', !enabled, {
        onError: showPreferenceSaveError,
      });
    },
  };
}
