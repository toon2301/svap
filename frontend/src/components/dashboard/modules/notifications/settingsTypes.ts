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
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/** Riadok jednej kategórie upozornení: preložený text, zobrazená hodnota a zmena, ktorá ju uloží. */
export interface NotificationCategoryRow {
  id: NotificationCategoryId;
  title: string;
  description: string;
  /** Zobrazená hodnota („Zapnuté“ = `true`); pri zablokovanej kategórii vždy `false`. */
  value: boolean;
  /** Riadky sa nedajú meniť (kategórie sú zablokované hlavným vypínačom alebo sa nenačítali zo servera). */
  disabled: boolean;
  /** Hodnoty sa ešte načítavajú zo servera: namiesto riadkov je kostra (nikdy nepravdivé „Vypnuté“). */
  loading: boolean;
  onChange: (enabled: boolean) => void;
}

/** Voľba Správy (push) z `usePushMessagesPreference`. */
export interface PushMessagesProps {
  value: boolean;
  disabled: boolean;
  loading: boolean;
  initialLoading?: boolean;
  error: string | null;
  onChange: (value: boolean) => void;
}
