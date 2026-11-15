/**
 * Spoločné typy obrazovky Nastavenia → Upozornenia pre rozloženie na počítači (`Desktop`) aj na mobile (`Mobile`):
 * obe dostávajú tie isté už preložené texty a riadky a nepoznajú hooky ani server.
 */

/** Identifikátor kategórie upozornení: stabilný (nezávisí od textov) a použitý v `data-testid` riadkov. */
export type NotificationCategoryId =
  | 'likes'
  | 'tags-and-shares'
  | 'comments'
  | 'comment-likes'
  | 'skill-requests';

/** Preložené texty obrazovky. */
export interface NotificationsLabels {
  title: string;
  back: string;
  turnOffAll: string;
  turnOffAllDesc: string;
  loadingPreferences: string;
  messagesPush: string;
  messagesPushDesc: string;
}

/** Popisky možností „Vypnuté“ a „Zapnuté“. */
export interface NotificationsCommonLabels {
  off: string;
  on: string;
}

/** Hlavný vypínač „Vypnúť všetko“. */
export interface NotificationsMaster {
  /** Poloha vypínača; `null` = hodnota nie je známa (nenačítala sa zo servera): bez polohy a zakázaný. */
  enabled: boolean | null;
  /** Voľby sa ešte načítavajú zo servera: vypínač nemá polohu, len kostru. */
  loading: boolean;
  onChange: (enabled: boolean) => void;
}

/** Riadok jednej kategórie upozornení: preložený text, zobrazená hodnota a zmena, ktorá ju uloží. */
export interface NotificationCategoryRow {
  id: NotificationCategoryId;
  title: string;
  description: string;
  /**
   * Zobrazená hodnota („Zapnuté“ = `true`); pri zablokovanej kategórii vždy `false`. `null` = hodnota nie je známa
   * (nenačítala sa zo servera): žiadna voľba nie je vybraná, nie predvolená.
   */
  value: boolean | null;
  /** Riadky sa nedajú meniť (kategórie sú zablokované hlavným vypínačom alebo sa nenačítali zo servera). */
  disabled: boolean;
  /** Hodnoty sa ešte načítavajú zo servera: namiesto riadkov je kostra (nikdy nepravdivé „Vypnuté“). */
  loading: boolean;
  onChange: (enabled: boolean) => void;
}

/** Voľba Správy (push) z `usePushMessagesPreference`; `value` je `null`, kým nie je známa (nenačítala sa). */
export interface PushMessagesProps {
  value: boolean | null;
  disabled: boolean;
  loading: boolean;
  initialLoading?: boolean;
  error: string | null;
  onChange: (value: boolean) => void;
}

/** Preložené texty výzvy na povolenie push upozornení pre Správy (nález 321, etapa 3b, R36 a). */
export interface PushPromptLabels {
  title: string;
  /** Text výzvy s tlačidlom na povolenie. */
  body: string;
  /** Tlačidlo, ktoré vyžiada povolenie upozornení v tomto zariadení. */
  enable: string;
  /** Tlačidlo „Nie teraz“: výzvu skryje a v tomto prehliadači sa už nevráti. */
  dismiss: string;
  /** Návod pre iPhone a iPad mimo nainštalovanej aplikácie (namiesto textu a tlačidla na povolenie). */
  iosGuide: string;
}

/** Výzva na povolenie push pre Správy z `usePushPermissionPrompt`; `variant` je `null`, keď sa výzva nemá ukázať. */
export interface PushPromptProps {
  /** `enable` = text a tlačidlo na povolenie, `ios-install` = návod bez tlačidla na povolenie, `null` = žiadna výzva. */
  variant: 'enable' | 'ios-install' | null;
  /** Tlačidlo na povolenie sa nedá stlačiť (beží ukladanie alebo iná akcia). */
  disabled: boolean;
  /** Vyžiada povolenie; volá sa priamo v obsluhe kliknutia, kvôli geste používateľa. */
  enable: () => void;
  /** Skryje výzvu a v tomto prehliadači sa už nevráti. */
  dismiss: () => void;
}
