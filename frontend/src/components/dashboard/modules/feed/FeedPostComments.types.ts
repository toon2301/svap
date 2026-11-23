/**
 * Vlastnosti komponentu `FeedPostComments` (krok 8 delenia `FeedPostComments.tsx`, nález 333, R23).
 *
 * Presunuté z komponentu bez zmeny: typ aj komentáre pri jeho vlastnostiach sú rovnaké ako predtým. Komponent ich
 * dostáva cez `export default`, päť importérov (karta, okno jedno- a dvojstĺpcové, panel nad fotkou, mobilný detail)
 * sa nemení.
 */

import type { ReactNode } from 'react';

/**
 * Koncept nového komentára, ktorý namiesto komponentu drží jeho rodič (viď `draft`): text aj to, že sa práve odosiela.
 *
 * Odosielanie môže bežať, kým sa komponent odmountuje a vykreslí znova (prepnutie rozloženia okna). Nová inštancia by inak
 * začala s tlačidlom „Pridať“ znova použiteľným a ten istý komentár by sa dal odoslať druhýkrát.
 */
export type FeedCommentDraft = {
  value: string;
  onChange: (value: string) => void;
  /** Komentár sa práve odosiela, aj z inštancie, ktorá sa medzitým odmountovala. */
  submitting: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  /**
   * Odoslanie dobehlo úspešne: pole sa vyprázdni, len ak ešte obsahuje odoslaný text.
   *
   * Odpoveď servera môže prísť po tom, čo používateľ napísal ďalší komentár, a ten sa nesmie stratiť.
   */
  onSent: (sentText: string) => void;
};

export type FeedPostCommentsProps = {
  /**
   * Sekcia vyplní výšku rodiča namiesto vlastného stropu.
   *
   * V karte je zoznam ohraničený pevným stropom, aby stovky komentárov
   * nenaťahovali stránku. V okne detailu je to naopak: pevný blok nad ním má
   * svoju výšku a komentáre majú dostať PRESNE zvyšok – strop by tam nechal
   * prázdne miesto alebo by okno prerástol.
   */
  fillHeight?: boolean;
  /**
   * Výška ide cez flex celým reťazcom namiesto percentuálnej (`h-full`). Má zmysel len spolu s `fillHeight`.
   *
   * Rodič, ktorý má len strop `max-h` (jednostĺpcové okno detailu), má NEDEFINITNÚ výšku: `h-full` sa tam nevyhodnotí,
   * zoznam ostane vysoký ako všetky komentáre, neposúva sa a pole na komentár vypadne pod okraj okna (nález 363).
   * Ostatné miesta (dvojstĺpcové okno, mobilný detail, panel nad fotkou) majú výšku pevnú a ostávajú pri `h-full`.
   */
  flexFill?: boolean;
  /**
   * Text rozpracovaného komentára a jeho odosielanie drží rodič, nie komponent.
   *
   * Okno detailu na počítači prepína rozloženie (dva stĺpce / jeden stĺpec) pri prechode cez 1 024 px aj pri zmene
   * fotiek a pri prepnutí komentáre odmountuje, takže ich vlastný stav by sa stratil: text aj to, že sa komentár práve
   * odosiela (inak by sa dal odoslať druhýkrát). Bez vlastnosti (karta, mobilný detail, panel nad fotkou) si všetko drží
   * komponent sám.
   */
  draft?: FeedCommentDraft;
  /**
   * Ukázať čas pri komentári.
   *
   * Zapína to mobilný prehliadač fotky, kde je meta riadok jediné miesto, kde
   * sa čas dá zobraziť. Na karte a v okne detailu ostáva riadok zámerne
   * strohý (čas nesie samotný príspevok nad nimi).
   */
  showTimestamp?: boolean;
  /**
   * Jednoriadkové pole na komentár s ikonou odoslania namiesto tlačidla.
   *
   * Pre vysunutý panel nad fotkou, kde má byť composer čo najnižší. Emoji
   * tlačidlo tam nie je tak či tak – to appka na mobile skrýva všade.
   */
  compactComposer?: boolean;
  /**
   * Obsah vložený NAD zoznam, do tej istej scrollovateľnej plochy.
   *
   * Mobilná obrazovka detailu tým dosiahne, že text, fotka aj riadok akcií
   * scrollujú SPOLU s komentármi ako jeden súvislý povrch, a pole na nový
   * komentár im pritom ostáva pevne na spodku. Bez toho by mala obrazovka dva
   * nezávislé scrolly nad sebou.
   *
   * Musí byť VNÚTRI scrollovateľného boxu, nie nad ním – inak by donačítavanie
   * (sentinel) aj doscrollovanie na komentár merali inú plochu, než ktorou
   * používateľ naozaj hýbe.
   */
  listHeader?: ReactNode;
  /**
   * Prvé načítanie dobehlo a zoznam je VYKRESLENÝ; nesie svoju scrollovaciu
   * plochu.
   *
   * Volajúci, ktorý chce po otvorení niekam doscrollovať, to nesmie robiť
   * skôr: kým je zoznam v stave „Načítavam…", je obsah plochy KRATŠÍ než ona
   * sama, takže sa scroll nemá kam pohnúť a ticho sa zahodí.
   *
   * Signál je jednorazový na príspevok a zámerne EXPLICITNÝ – pasívne
   * sledovanie `loading` zvonka by volajúceho nechalo hádať, či už je čo
   * merať.
   */
  onCommentsReady?: (scroller: HTMLElement | null) => void;
  postId: number;
  /** Komentár z notifikácie – doscrolluje sa naň a krátko sa zvýrazní. */
  highlightCommentId?: number | null;
  onCountChange?: (delta: number) => void;
  /** Skutočný počet zo servera – drží číslo pri ikone v súlade so zoznamom. */
  onTotalChange?: (total: number) => void;
};
