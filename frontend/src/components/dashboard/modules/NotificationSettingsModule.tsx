'use client';

import { useLanguage } from '@/contexts/LanguageContext';

import Desktop from './notifications/Desktop';
import Mobile from './notifications/Mobile';
import { useNotificationCategories } from './notifications/useNotificationCategories';
import { useNotificationMaster } from './notifications/useNotificationMaster';
import { useNotificationPreferences } from './notifications/useNotificationPreferences';
import { usePushMessagesPreferenceWith } from './notifications/usePushMessagesPreference';
import { usePushPermissionPrompt } from './notifications/usePushPermissionPrompt';

type NotificationSettingsModuleProps = {
  onBack?: () => void;
};

/**
 * Nastavenia → Upozornenia (nález 321, etapa 3a). Jedno načítanie siedmich volieb zo servera (`useNotificationPreferences`),
 * z ktorého čerpá voľba Správy (`usePushMessagesPreferenceWith`) aj päť kategórií (`useNotificationCategories`); modul sám
 * nedrží žiadny stav kategórií, hodnoty, načítavanie, zlyhanie načítania aj ukladanie sú v zdieľanom hooku a rozloženia
 * `Desktop` a `Mobile` dostávajú len hotové riadky. Hlavný vypínač „Vypnúť všetko“ (`useNotificationMaster`) je
 * `in_app_notifications` na serveri v opačnej hodnote a keď je zapnutý, kategórie sú „Vypnuté“ a zakázané (R35). Pod voľbou
 * Správy sa podľa jej stavu ukáže výzva na povolenie upozornení v tomto zariadení (`usePushPermissionPrompt`, etapa 3b).
 */
export default function NotificationSettingsModule({ onBack }: NotificationSettingsModuleProps = {}) {
  const { t } = useLanguage();
  const preferences = useNotificationPreferences();
  const pushMessages = usePushMessagesPreferenceWith(preferences);
  const pushPrompt = usePushPermissionPrompt(pushMessages);
  const master = useNotificationMaster(preferences);
  const categories = useNotificationCategories(preferences);

  const labels = {
    title: t('notifications.title', 'Upozornenia'),
    back: t('common.back', 'Späť'),
    turnOffAll: t('notifications.turnOffAll', 'Vypnut vsetko'),
    turnOffAllDesc: t(
      'notifications.turnOffAllDesc',
      'Docasne vypnut vsetky upozornenia',
    ),
    loadingPreferences: t(
      'notifications.loadingPreferences',
      'Nacitam nastavenia upozorneni...',
    ),
    messagesPush: t('notifications.messagesPush', 'Správy'),
    messagesPushDesc: t(
      'notifications.messagesPushDesc',
      'Zapnite alebo vypnite upozornenia na  spravy, ked nie ste v aktivnom chate.',
    ),
  };

  const labelsCommon = {
    off: t('notifications.off', 'Vypnute'),
    on: t('notifications.on', 'Zapnute'),
  };

  const pushPromptLabels = {
    title: t('notifications.pushPromptTitle', 'Povoľte upozornenia na správy'),
    body: t(
      'notifications.pushPromptBody',
      'Upozornenia na správy máte zapnuté, no toto zariadenie ich ešte nemá povolené. Po povolení vám správy prídu aj vtedy, keď Svaply nemáte otvorené.',
    ),
    enable: t(
      'notifications.pushPromptEnable',
      'Zapnúť upozornenia na správy v tomto zariadení',
    ),
    dismiss: t('notifications.pushPromptDismiss', 'Nie teraz'),
    iosGuide: t(
      'notifications.pushPromptIosGuide',
      'Na iPhone a iPade fungujú upozornenia len v aplikácii pridanej na plochu. V Safari ťuknite na Zdieľať, vyberte Pridať na plochu a Svaply potom otvorte z ikony na ploche.',
    ),
  };

  return (
    <>
      <Desktop
        labels={labels}
        labelsCommon={labelsCommon}
        master={master}
        categories={categories}
        pushMessages={pushMessages}
        pushPrompt={pushPrompt}
        pushPromptLabels={pushPromptLabels}
        onBack={onBack}
      />
      <Mobile
        labels={labels}
        labelsCommon={labelsCommon}
        master={master}
        categories={categories}
        pushMessages={pushMessages}
        pushPrompt={pushPrompt}
        pushPromptLabels={pushPromptLabels}
      />
    </>
  );
}
