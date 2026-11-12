'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import type { NotificationPreferenceKey } from './notificationPreferenceKeys';
import { showPreferenceSaveError } from './preferenceSaveError';
import type { NotificationCategoryId, NotificationCategoryRow } from './settingsTypes';
import type { NotificationPreferencesController } from './useNotificationPreferences';

/** Kategória upozornení: voľba servera, ktorú zapína a vypína, a jej preložený názov a opis. */
interface CategoryDefinition {
  id: NotificationCategoryId;
  preference: NotificationPreferenceKey;
  title: string;
  description: string;
}

/**
 * Päť kategórií upozornení v poradí obrazovky Nastavenia → Upozornenia (nález 321, etapa 3a): preložený názov a opis,
 * hodnota zo servera a zmena, ktorá ju uloží (cez `updatePreference` zdieľaného `controller`). Chyba uloženia (aj pri
 * vypnutom internete) sa ukáže ako toast, nie ako blok, ktorý by posunul obsah (nález 308). Keď je hlavný vypínač
 * „Vypnúť všetko“ zapnutý (`in_app_notifications` je `false`, R35), kategórie sa ukážu ako „Vypnuté“ a zakázané; ich
 * uložené hodnoty sa nemenia, takže sa po vypnutí hlavného vypínača vrátia. Kým sa voľby nenačítajú (`loading`), riadok
 * nesie `loading` a namiesto hodnoty sa ukáže kostra; po zlyhaní načítania sú riadky zakázané.
 */
export function useNotificationCategories(
  controller: NotificationPreferencesController,
): NotificationCategoryRow[] {
  const { t } = useLanguage();
  const { preferences, loading, loadFailed, updatePreference } = controller;
  const blocked = !preferences.inAppNotifications;

  const definitions: CategoryDefinition[] = [
    {
      id: 'likes',
      preference: 'notifyLikes',
      title: t('notifications.likes', 'Páči sa mi to'),
      description: t(
        'notifications.likesDesc',
        "Zapnite alebo vypnite upozornenia na 'Páči sa mi to'.",
      ),
    },
    {
      id: 'tags-and-shares',
      preference: 'notifyTagsAndShares',
      title: t('notifications.tagsAndShares', 'Označenie a zdieľanie príspevku'),
      description: t(
        'notifications.tagsAndSharesDesc',
        'Keď vás niekto označí v príspevku alebo zdieľa váš príspevok',
      ),
    },
    {
      id: 'comments',
      preference: 'notifyComments',
      title: t('notifications.comments', 'Komentáre'),
      description: t(
        'notifications.commentsDesc',
        'Zapnite alebo vypnite upozornenia na komentáre.',
      ),
    },
    {
      id: 'comment-likes',
      preference: 'notifyCommentLikes',
      title: t('notifications.likesForComments', 'Páči sa mi to pre komentáre'),
      description: t(
        'notifications.likesForCommentsDesc',
        "Zapnite alebo vypnite upozornenia na 'Páči sa mi to' pre komentáre.",
      ),
    },
    {
      id: 'skill-requests',
      preference: 'notifySkillRequests',
      title: t('notifications.skillRequest', 'Žiadosť o zručnosť'),
      description: t(
        'notifications.skillRequestDesc',
        'Zapnite alebo vypnite upozornenia na žiadosti o zručnosť.',
      ),
    },
  ];

  return definitions.map(({ id, preference, title, description }) => ({
    id,
    title,
    description,
    value: blocked ? false : preferences[preference],
    disabled: blocked || loadFailed,
    loading,
    onChange: (enabled: boolean) => {
      void updatePreference(preference, enabled, { onError: showPreferenceSaveError });
    },
  }));
}
