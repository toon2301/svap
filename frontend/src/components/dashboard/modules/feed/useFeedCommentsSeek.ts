'use client';

/**
 * Hľadanie komentára z notifikácie (krok 4 delenia `FeedPostComments.tsx`, nález 333, R23).
 *
 * Presunuté z komponentu bez zmeny správania: stav a refy hľadania (`highlight*`, `seekTick`), reset pri
 * zmene cieľa a efekt, ktorý komentár nájde (stránkuje komentáre aj odpovede), doscrolluje naň a na pár
 * sekúnd ho zvýrazní. Hook vracia id zvýrazneného komentára.
 *
 * Poradie efektov sa nesmie meniť: najprv reset hľadania, potom hľadanie. Do závislostí sa nesmie
 * dostať `t` (mock `useLanguage` vracia pri každom volaní novú funkciu).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { HIGHLIGHT_MAX_PAGES, HIGHLIGHT_MS, flattenComments } from './feedCommentsLogic';
import type { FeedPostComment } from '@/lib/feedApi';

type UseFeedCommentsSeekOptions = {
  /** Komentár z notifikácie, ktorý sa hľadá (null = nič sa nehľadá). */
  highlightCommentId?: number | null;
  comments: FeedPostComment[];
  /** Rozbalené vlákna odpovedí; hľadanie rozbalí rodiča hľadanej odpovede. */
  expandedReplies: Set<number>;
  setExpandedReplies: Dispatch<SetStateAction<Set<number>>>;
  loading: boolean;
  loadingMore: boolean;
  loadingRepliesFor: number | null;
  hasMore: boolean;
  loadMore: (options?: { silent?: boolean }) => Promise<boolean>;
  refresh: () => Promise<void>;
  loadMoreReplies: (
    parentId: number,
    options?: { silent?: boolean },
  ) => Promise<boolean>;
};

export function useFeedCommentsSeek({
  highlightCommentId,
  comments,
  expandedReplies,
  setExpandedReplies,
  loading,
  loadingMore,
  loadingRepliesFor,
  hasMore,
  loadMore,
  refresh,
  loadMoreReplies,
}: UseFeedCommentsSeekOptions): number | null {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  // Ktorý cieľ už bol vybavený – doscrolluje sa RAZ, aby ďalší poll alebo
  // donačítanie nestrhlo pohľad späť, keď si používateľ odscrolloval inam.
  const highlightHandledRef = useRef<number | null>(null);
  // Časovač zvýraznenia drží ref, nie cleanup efektu závislého od `comments`:
  // ten by ho rušil pri KAŽDOM polle, takže by zvýraznenie buď zmizlo
  // predčasne, alebo (po zmeškanom vyčistení) ostalo visieť.
  const highlightTimerRef = useRef<number | null>(null);
  /** Koľko stránok sa už donačítalo pri hľadaní cieľa – strop proti slučke. */
  const highlightPagesRef = useRef(0);
  /**
   * Rozpočet donačítavania ODPOVEDÍ pri hľadaní – oddelený od stránkovania
   * komentárov.
   *
   * Appka nevie, či cieľ notifikácie je vrcholový komentár alebo odpoveď (a ak
   * odpoveď, tak čia), takže skúša oboje. So spoločným rozpočtom stačilo jedno
   * vlákno s dvomi stovkami nedotiahnutých odpovedí na to, aby ho celý minulo
   * a k stránkovaniu komentárov – teda k skutočnému cieľu – sa už nedostalo.
   */
  const highlightReplyPagesRef = useRef(0);
  /**
   * Beží práve donačítanie kvôli hľadaniu?
   *
   * Stav `loadingMore` na to nestačí: `setLoadingMore(false)` v `finally`
   * prebehne SKÔR než `.then` s výsledkom, takže by efekt stihol vystreliť
   * druhý pokus ešte pred vyhodnotením toho prvého.
   */
  const highlightSeekingRef = useRef(false);
  /**
   * Prebudenie efektu po dobehnutí kola hľadania.
   *
   * Samotný `highlightSeekingRef` je ref, takže jeho vynulovanie nespustí
   * efekt znova. Keď sa medzitým stihol efekt prebehnúť (prekreslenie po
   * `setComments` môže prísť skôr, než dobehne `.then`), narazil by na
   * zdvihnutý príznak, ticho by sa vrátil – a keďže by už nič ďalšie stav
   * nemenilo, hľadanie by zamrzlo na polceste. Tento počítadlový stav
   * garantuje ešte jeden beh po každom kole.
   */
  const [seekTick, setSeekTick] = useState(0);
  /**
   * Pre ktorý cieľ sa už raz preverilo, či vlákno medzitým nenarástlo.
   *
   * `hasMore` je len snímka spred posledného načítania. Komentár vzniknutý
   * PO ňom leží za koncom okna a `nextUrlRef` je null, takže hľadanie by ho
   * vyhodnotilo ako „koniec vlákna" a vzdalo to bez jediného dotazu na
   * server – presne to zlyhanie pri druhej notifikácii v poradí.
   */
  const highlightRefreshedRef = useRef<number | null>(null);

  const finishSeek = useCallback(() => {
    highlightSeekingRef.current = false;
    setSeekTick((tick) => tick + 1);
  }, []);

  // Nový cieľ = nové hľadanie. Časovač sa ruší LEN tu (zmena cieľa) a pri
  // odmountovaní – nie pri každej zmene zoznamu.
  useEffect(() => {
    // Najprv zhasni staré zvýraznenie: pri prechode na iný (alebo žiadny)
    // cieľ by inak ostalo svietiť, kým nedobehne jeho vlastný časovač.
    setHighlighted(null);
    highlightHandledRef.current = null;
    highlightPagesRef.current = 0;
    highlightReplyPagesRef.current = 0;
    highlightSeekingRef.current = false;
    highlightRefreshedRef.current = null;
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
    };
  }, [highlightCommentId]);

  /**
   * Komentár z notifikácie: nájdi ho, doscrolluj naň a krátko ho zvýrazni.
   *
   * Keď v načítanom okne nie je, DONAČÍTAVA sa ďalej – a to je bežný prípad,
   * nie okrajový: komentáre sú zoradené vzostupne, takže čerstvý komentár
   * (o akom notifikácia takmer vždy je) leží na POSLEDNEJ stránke, nie na
   * prvej.
   *
   * Prečo stránkovať a nepýtať si komentár priamo: aby sa dalo NA komentár
   * doscrollovať, musí byť v zozname aj všetko pred ním – zoznam je súvislé
   * okno od začiatku vlákna. Samostatný „daj mi tento komentár" endpoint by
   * vrátil objekt, ale nie jeho pozíciu, takže stránky by sa aj tak museli
   * donačítať. Preto sa znovupoužije `loadMore`, bez zásahu do backendu.
   */
  useEffect(() => {
    if (!highlightCommentId || loading) return;
    if (highlightHandledRef.current === highlightCommentId) return;
    if (highlightSeekingRef.current) return;

    // Cieľom môže byť aj ODPOVEĎ – tá v zozname žije vnorená v rodičovi.
    const target = flattenComments(comments).find(
      (comment) => comment.id === highlightCommentId,
    );
    if (target) {
      // Vlákno odpovedí je predvolene ZBALENÉ, takže hľadaná odpoveď nemusí
      // byť v DOM – najprv otvor práve toho rodiča (nie všetky). Scroll aj
      // zvýraznenie dobehnú v ďalšom behu efektu, keď už uzol existuje.
      const parentId = target.parent_comment_id ?? null;
      if (parentId != null && !expandedReplies.has(parentId)) {
        setExpandedReplies((current) => new Set(current).add(parentId));
        return;
      }
      highlightHandledRef.current = highlightCommentId;
      setHighlighted(highlightCommentId);
      const node = document.querySelector(
        `[data-comment-id="${highlightCommentId}"]`,
      );
      if (node && typeof node.scrollIntoView === 'function') {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      highlightTimerRef.current = window.setTimeout(
        () => setHighlighted(null),
        HIGHLIGHT_MS,
      );
      return;
    }

    // Cieľ môže byť ODPOVEĎ ZA úvodným náhľadom – rodiča máme, odpoveď ešte
    // nie. Donačítaj ďalšiu dávku odpovedí; efekt sa po nej spustí znova, a ak
    // treba, dávky sa reťazia. Poistky sú tie isté ako pri stránkovaní
    // komentárov: spoločný strop pokusov a zastavenie pri zlyhaní.
    // Chýbajúce odpovede sú vždy tie STARŠIE pod načítanými, takže stačí
    // vedieť, či vlákno ešte nie je dotiahnuté celé. Porovnávať id s cieľom
    // netreba – smer je jednoznačný a medzera v zozname nevzniká.
    const parentWithMissingReplies = comments.find(
      (comment) =>
        (comment.replies?.length ?? 0) < (comment.replies_count ?? 0),
    );
    if (
      parentWithMissingReplies &&
      highlightReplyPagesRef.current < HIGHLIGHT_MAX_PAGES
    ) {
      if (loadingRepliesFor !== null) return;
      highlightReplyPagesRef.current += 1;
      highlightSeekingRef.current = true;
      // Ticho: hľadanie beží na pozadí, používateľ oň nežiadal.
      void loadMoreReplies(parentWithMissingReplies.id, { silent: true }).then(
        (ok) => {
          finishSeek();
          // Zlyhanie zastaví ďalšie doťahovanie odpovedí (opakovaný pokus by
          // pri výpadku siete len opakoval ten istý neúspech), ale hľadanie
          // ako také nekončí – cieľ môže byť vrcholový komentár nižšie.
          if (!ok) highlightReplyPagesRef.current = HIGHLIGHT_MAX_PAGES;
        },
      );
      return;
    }
    // Vyčerpaný rozpočet odpovedí NIE JE koniec hľadania – pokračuje sa
    // stránkovaním komentárov, ktoré má rozpočet vlastný.

    // Cieľ nie je v okne. Keď je NOVŠÍ než čokoľvek načítané, leží nad ním –
    // presne tam, kam sa pozerá dopyt bez kurzora, takže stačí raz obnoviť.
    // (V starom, opačnom poradí pribúdali nové komentáre ZA koncom okna, a
    // preto tu musel byť ešte druhý mechanizmus na znovupostavenie kurzora.)
    if (
      !hasMore &&
      !loadingMore &&
      highlightRefreshedRef.current !== highlightCommentId
    ) {
      highlightRefreshedRef.current = highlightCommentId;
      highlightSeekingRef.current = true;
      void refresh()
        .catch(() => undefined)
        .finally(finishSeek);
      return;
    }

    // Inak je STARŠÍ – donačítava sa smerom nadol, stránku po stránke.
    if (
      !hasMore ||
      loadingMore ||
      highlightPagesRef.current >= HIGHLIGHT_MAX_PAGES
    ) {
      // Vzdaj to ticho – zoznam ostáva normálne použiteľný, len bez skoku.
      //
      // Definitívne to však vzdaj LEN vtedy, keď naozaj nie je čo skúsiť.
      // Vlákno s nedotiahnutými odpoveďami môže cieľ ešte priniesť – a jeho
      // dávka sa do stavu dostane až o prekreslenie neskôr, než sa posunie
      // dosah servera. Bez tejto poistky by práve ten medzičas označil
      // hľadanie za vybavené a odpoveď, ktorá o chvíľu dorazí, by sa už
      // nikdy nezvýraznila.
      const someThreadIncomplete = comments.some(
        (comment) =>
          (comment.replies?.length ?? 0) < (comment.replies_count ?? 0),
      );
      if (
        !someThreadIncomplete &&
        (!hasMore || highlightPagesRef.current >= HIGHLIGHT_MAX_PAGES)
      ) {
        highlightHandledRef.current = highlightCommentId;
      }
      return;
    }

    highlightPagesRef.current += 1;
    highlightSeekingRef.current = true;
    // Ticho: hľadanie beží na pozadí, používateľ oň nežiadal.
    void loadMore({ silent: true }).then((ok) => {
      finishSeek();
      // Zlyhanie sa berie rovnako ako „koniec vlákna" – ďalšie pokusy by pri
      // výpadku siete len opakovali ten istý neúspech.
      //
      // Zapisuje sa BEZ ohľadu na to, či medzitým efekt prebehol znova:
      // `loadingMore` sa prepne skôr než dorazí tento výsledok, takže guard
      // typu „zrušené pri cleanupe" by výsledok zahodil a hľadanie by sa
      // rozbehlo nanovo. Ref patrí cieľu, nie behu efektu – pri zmene
      // `highlightCommentId` ho aj tak resetuje efekt vyššie.
      if (!ok) highlightHandledRef.current = highlightCommentId;
      // Po úspechu narastie `comments` a tento efekt sa spustí znova.
    });
  }, [
    comments,
    expandedReplies,
    setExpandedReplies,
    highlightCommentId,
    loading,
    loadingMore,
    loadingRepliesFor,
    loadMoreReplies,
    finishSeek,
    seekTick,
    hasMore,
    loadMore,
    refresh,
  ]);

  return highlighted;
}
