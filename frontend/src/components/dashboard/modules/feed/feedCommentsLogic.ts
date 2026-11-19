/**
 * Konštanty a čisté funkcie komentárov pod príspevkom: poradie (najnovšie
 * hore), zlučovanie zoznamu s odpoveďou servera a počty odpovedí.
 *
 * Nič z Reactu, žiadny stav ani volania servera, preto sa dajú skúšať
 * samostatne (`__tests__/feedCommentsLogic.test.ts`). Vytiahnuté z
 * `FeedPostComments.tsx` ako čistý presun bez zmeny textu (nález 333, delenie
 * súboru).
 */

import type { FeedPostComment } from '@/lib/feedApi';

export const COMMENTS_PAGE_SIZE = 10;
/**
 * Strop pre jeden pollovací dopyt – zhodný s `max_page_size` vo
 * `FeedCommentCursorPagination`. BE väčšiu hodnotu ticho oreže, takže sa
 * orezáva rovno tu, nech je zrejmé, čo odpoveď pokrýva.
 */
export const COMMENTS_MAX_POLL_SIZE = 50;
/**
 * Do tejto vzdialenosti od vrchu sa nový komentár doscrolluje sám. Ak je nad komentármi hlavička (mobilný
 * detail), počíta sa od prvého komentára, nie od vrchu zoznamu (`isNearCommentsStart`).
 */
export const NEAR_TOP_PX = 100;
/**
 * Rezerva nad prvým komentárom, keď sa zoznam doscrolluje na začiatok komentárov (nález 346, R58): komentár
 * sa nezlepí s horným okrajom plochy. Nezávisí od výšky plochy ani komentára, takže platí aj s otvorenou
 * klávesnicou.
 */
export const FIRST_COMMENT_MARGIN_PX = 8;

/**
 * Kam doscrollovať, aby bol prvý komentár navrchu viditeľnej plochy s malou rezervou.
 *
 * `commentsStart` je odstup prvého komentára od začiatku obsahu zoznamu, teda výška hlavičky nad komentármi
 * (0 = nad komentármi nič nie je alebo sa to nedá zmerať). Bez hlavičky ostáva cieľ 0, ako bol.
 */
export function commentsScrollTarget(commentsStart: number): number {
  return Math.max(0, commentsStart - FIRST_COMMENT_MARGIN_PX);
}

/**
 * Je čitateľ pri začiatku komentárov, takže nový komentár uvidí hneď?
 *
 * S hlavičkou sa meria od prvého komentára, nie od vrchu zoznamu: nad komentármi leží text a fotka, takže kto
 * číta komentáre, je ďaleko od vrchu zoznamu, no tesne pri ich začiatku. Meria sa na obe strany, takže kto je
 * v hlavičke vyššie než NEAR_TOP_PX nad komentármi, pri nich nie je. Bez hlavičky (`commentsStart` 0) platí
 * pravidlo ako doteraz: pri vrchu je každý do NEAR_TOP_PX od neho, aj so záporným `scrollTop` (odraz na iOS).
 */
export function isNearCommentsStart(scrollTop: number, commentsStart: number): boolean {
  const distance = scrollTop - commentsStart;
  return (commentsStart > 0 ? Math.abs(distance) : distance) <= NEAR_TOP_PX;
}

/** Zhodné s FEED_REPLIES_PREVIEW_LIMIT na backende. */
export const REPLIES_PREVIEW_LIMIT = 10;
/** Koľko odpovedí sa dotiahne jedným kliknutím na „Zobraziť ďalšie". */
export const REPLIES_PAGE_SIZE = 10;

/**
 * Poradie zhodné s backendom: NAJNOVŠIE HORE, teda `(-created_at, -id)`.
 *
 * Radiť len podľa id by v drvivej väčšine prípadov vyšlo rovnako (id rastie
 * s časom), ale zoznam by sa od servera rozišiel vždy, keď to neplatí. Jedno
 * pravidlo pre všetky cesty – polling, donačítanie aj vlastný komentár –
 * znamená, že poradie nezávisí od toho, ktorou z nich sa komentár dostal
 * do lokálneho stavu.
 */
export function compareNewestFirst(a: FeedPostComment, b: FeedPostComment): number {
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? 1 : -1;
  }
  return b.id - a.id;
}

/** Je `item` STARŠÍ než `edge`? (V zozname teda leží pod ním.) */
export function isOlderThan(item: FeedPostComment, edge: FeedPostComment): boolean {
  return compareNewestFirst(item, edge) > 0;
}

export function sortedNewestFirst(
  byId: Map<number, FeedPostComment>,
): FeedPostComment[] {
  return [...byId.values()].sort(compareNewestFirst);
}

/**
 * Zlúči NÁHĽAD odpovedí (pár NAJNOVŠÍCH) s tým, čo appka má.
 *
 * Rovnaký princíp ako `mergeComments` o úroveň vyššie: náhľad má posledné
 * slovo o svojom rozsahu – od najnovšej odpovede po tú svoju najstaršiu –
 * takže čo v ňom v tomto rozsahu chýba, bolo medzitým zmazané. Čo je STARŠIE
 * než jeho koniec, sa nezahadzuje: o tom náhľad nič nehovorí a používateľ tam
 * môže mať donačítané staršie odpovede.
 *
 * Keď je odpovedí menej než náhľadový strop, pokrýva náhľad celé vlákno, takže
 * jeho dosah je neohraničený (aj prázdny náhľad vtedy znamená „nič tam nie je").
 */
export function mergeReplyPreview(
  current: FeedPostComment[],
  preview: FeedPostComment[],
  previewCoversThread: boolean,
): FeedPostComment[] {
  if (!preview.length) return previewCoversThread ? [] : current;
  const oldestInPreview = preview[preview.length - 1];
  const byId = new Map(
    (previewCoversThread
      ? []
      : current.filter((reply) => isOlderThan(reply, oldestInPreview))
    ).map((reply) => [reply.id, reply]),
  );
  preview.forEach((reply) => byId.set(reply.id, reply));
  return sortedNewestFirst(byId);
}

/**
 * Pripojí ĎALŠIU dávku odpovedí za tie, čo už máme.
 *
 * Dávka nesie STARŠIE odpovede za kotvou, nie pohľad od najnovšej – nehovorí
 * teda nič o tých nad ňou a žiadna sa pri nej nezahadzuje. Prienik podľa id
 * ošetrí prípad, keď medzitým niečo pribudlo.
 */
export function mergeReplyBatch(
  current: FeedPostComment[],
  batch: FeedPostComment[],
): FeedPostComment[] {
  if (!batch.length) return current;
  const byId = new Map(current.map((reply) => [reply.id, reply]));
  batch.forEach((reply) => byId.set(reply.id, reply));
  return sortedNewestFirst(byId);
}

/**
 * Zlúči čerstvú odpoveď servera do lokálneho zoznamu.
 *
 * Kľúčový predpoklad: odpoveď VŽDY začína od najnovšieho komentára (polling sa
 * pýta bez cursoru – viď `refresh`). Preto má server posledné slovo o všetkom
 * až po posledný vrátený komentár:
 *  - čo v odpovedi je → nahradí sa serverovou verziou (čerstvé počty lajkov,
 *    nové komentáre),
 *  - čo v nej chýba a spadá do jej dosahu → medzitým to niekto zmazal,
 *  - čo je STARŠIE než jej koniec → odpoveď o tom nič nehovorí, ostáva
 *    nedotknuté. Nastáva len pri okne dlhšom než COMMENTS_MAX_POLL_SIZE.
 *
 * Dosah určuje `hasNext`, nie počet položiek: keď ďalšia stránka neexistuje,
 * server vrátil celé vlákno, takže dosah je neohraničený. Tým je pravidlo
 * odolné aj voči orezaniu veľkosti stránky na strane BE – dĺžky sa
 * neporovnávajú.
 *
 * Radí sa rovnakým pravidlom ako na backende – najnovšie hore, viď
 * `compareNewestFirst`.
 */
export function mergeComments(
  current: FeedPostComment[],
  incoming: FeedPostComment[],
  hasNext: boolean,
): FeedPostComment[] {
  // Prázdna odpoveď bez ďalšej stránky = vlákno je prázdne (zmazalo sa všetko).
  if (!incoming.length) return hasNext ? current : [];

  const oldestIncoming = incoming[incoming.length - 1];

  const currentById = new Map(current.map((comment) => [comment.id, comment]));
  const byId = new Map(
    (hasNext
      ? current.filter((comment) => isOlderThan(comment, oldestIncoming))
      : []
    ).map((comment) => [comment.id, comment]),
  );
  incoming.forEach((comment) => {
    // Prišiel len NÁHĽAD odpovedí. Keby sa komentár nahradil celý, používateľ
    // by prišiel o odpovede, ktoré si sám donačítal nad rámec náhľadu.
    const existing = currentById.get(comment.id);
    byId.set(comment.id, {
      ...comment,
      replies: mergeReplyPreview(
        existing?.replies ?? [],
        comment.replies ?? [],
        (comment.replies_count ?? 0) <= REPLIES_PREVIEW_LIMIT,
      ),
    });
  });
  return sortedNewestFirst(byId);
}

/** Ako dlho ostane komentár z notifikácie zvýraznený. */
export const HIGHLIGHT_MS = 3000;
/**
 * Strop donačítavania pri hľadaní komentára z notifikácie.
 *
 * Pri COMMENTS_PAGE_SIZE = 10 to je 200 komentárov – hlbšie vlákno je
 * v praxi výnimka a nekonečné stránkovanie by pri zlom odkaze bolo horšie
 * než sa zastaviť.
 */
export const HIGHLIGHT_MAX_PAGES = 20;

/**
 * Koľko odpovedí komentár celkovo má.
 *
 * Zdroj pravdy je `replies_count` z backendu (počíta aj tie nenačítané);
 * načítané pole je len poistka, keby pole v odpovedi chýbalo.
 */
export function repliesTotal(comment: FeedPostComment): number {
  return comment.replies_count ?? comment.replies?.length ?? 0;
}

/** Komentáre aj ich odpovede v jednom zozname – na hľadanie a počítanie. */
export function flattenComments(list: FeedPostComment[]): FeedPostComment[] {
  return list.flatMap((comment) => [comment, ...(comment.replies ?? [])]);
}
