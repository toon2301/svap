'use client';

import toast from 'react-hot-toast';

import { useLanguage } from '@/contexts/LanguageContext';

import type { NotificationPreferenceKey } from './notificationPreferenceKeys';
import type { NotificationCategoryId, NotificationCategoryRow } from './settingsTypes';
import type { NotificationPreferencesController } from './useNotificationPreferences';

/** Jedna zdieľaná karta pre chyby ukladania, aby sa opakované zlyhania (napr. viac ťuknutí bez internetu) nezoradili pod seba. */
export const SAVE_ERROR_TOAST_ID = 'notification-preferences-save-error';

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
 * vypnutom internete) sa ukáže ako toast, nie ako blok, ktorý by posunul obsah (nález 308). Zablokované kategórie
 * (`blocked`, hlavný vypínač „Vypnúť všetko“) sa ukážu ako „Vypnuté“ a zakázané; ich uložené hodnoty sa nemenia, takže
 * sa po odblokovaní vrátia. Kým sa voľby nenačítajú (`loading`), riadok nesie `loading` a namiesto hodnoty sa ukáže
 * kostra; po zlyhaní načítania sú riadky zakázané.
 */
export function useNotificationCategories(
  controller: NotificationPreferencesController,
  blocked: boolean,
): NotificationCategoryRow[] {
  const { t } = useLanguage();
  const { preferences, loading, loadFailed, updatePreference } = controller;

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
      title: t('notifications.likesAndComments', 'Páči sa mi to a komentáre'),
      description: t(
        'notifications.likesAndCommentsDesc',
        'Reakcie a komentáre na fotkách, kde ste označení',
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
      void updatePreference(preference, enabled, {
        onError: (message) => {
          toast.error(message, { id: SAVE_ERROR_TOAST_ID });
        },
      });
    },
  }));
}
