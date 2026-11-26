/**
 * Vlastnosti komponentu `FeedPostCard` (krok g delenia `FeedPostCard.tsx`, nález 333, R23).
 *
 * Presunuté z komponentu bez zmeny: typ aj komentáre pri jeho vlastnostiach sú rovnaké ako predtým. Komponent ich
 * dostáva cez `export default`, päť importérov karty (zoznam Nástenky, profil, permalink, okno detailu a jeho
 * dvojstĺpcové rozloženie) sa nemení.
 */

import type { FeedPost, FeedPostImage } from '@/lib/feedApi';

export type FeedPostCardProps = {
  post: FeedPost;
  /**
   * `card` = dlaždica vo feede (vlastný rám, komentáre sa rozbaľujú v nej).
   * `detail` = vnútrajšok okna detailu: bez rámu a BEZ komentárovej sekcie –
   * tú si okno vykresľuje samo v scrollovateľnej časti.
   */
  variant?: 'card' | 'detail';
  /**
   * Karta vyplní výšku rodiča a fotka si vezme zvyšok (dvojstĺpcové okno
   * detailu pri príspevku S FOTKOU).
   *
   * Hlavička, text, označenia aj riadok akcií majú vtedy pevnú výšku
   * (`shrink-0`) a jediná pružná časť je médiová plocha, takže rozbalenie
   * textu fotku zmenší namiesto toho, aby stĺpec pretiekol. Bez fotky nemá
   * čo zvyšok pohltiť, preto to zapína výhradne `FeedPostDetailSplitLayout`.
   */
  fillHeight?: boolean;
  /**
   * Živý stav fotiek zvonka – karta si ho vtedy nesleduje sama.
   *
   * Používa to okno detailu: podľa fotiek sa rozhoduje o rozložení, takže ich
   * musí poznať UŽ NAD kartou. Aby nad tým istým príspevkom nebežali dva
   * pollingy, dostane ich karta hotové (viď `usePendingFeedImages`).
   */
  liveImages?: FeedPostImage[];
  /**
   * Autor príspevok upravil. Karta si novú verziu drží aj sama; okno detailu
   * ju ale potrebuje tiež – rozhoduje sa podľa nej o rozložení a podáva karte
   * fotky späť.
   */
  onPostUpdated?: (post: FeedPost) => void;
  /** V okne drží počet komentárov okno (má ich pod sebou), nie karta. */
  commentsCount?: number;
  /** V appke sa nepoužíva (komentáre rozbalené rovno v karte mal zrušený modul detailu príspevku); ostáva len pre testy. */
  initialCommentsOpen?: boolean;
  /** Komentár z notifikácie – sekcia naň doscrolluje a zvýrazní ho. */
  highlightCommentId?: number | null;
  /** Zdieľanie ďalej vloží nový príspevok na vrch feedu (ako composer). */
  onShared?: (created: FeedPost) => void;
  /**
   * Používateľ odstránil svoje označenie. Zoznamy filtrované na „kde som
   * označený" (profilový tab) tam príspevok už nemajú prečo držať.
   */
  onSelfTagRemoved?: (postId: number) => void;
  /** Autor zmazal príspevok – zoznamy ho majú okamžite vyhodiť. */
  onDeleted?: (postId: number) => void;
};
