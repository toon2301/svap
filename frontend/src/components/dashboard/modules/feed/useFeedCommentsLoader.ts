'use client';

/**
 * Načítanie a obnova komentárov (krok 6 delenia `FeedPostComments.tsx`, nález 333, R23).
 *
 * Presunuté z komponentu bez zmeny správania: zoznam komentárov a jeho stavy (`loading`, `failed`, `gone`,
 * `loadingMore`, `hasMore`, `loadingRepliesFor`), prvé načítanie (`load`), donačítanie ďalšej stránky
 * (`loadMore`), tichá obnova pollingom (`refresh` a `useFeedCommentsPolling`) a donačítanie odpovedí
 * (`loadMoreReplies`) spolu s refmi, ktoré ich chránia pred zastaranými odpoveďami (`loadSeqRef`, `nextUrlRef`,
 * `commentsRef`, `highestSeenIdRef`), a `markSeen`.
 *
 * Poradie efektov sa nesmie meniť: najprv reset `gone`, potom `load`, potom polling (hook sa volá na mieste
 * pôvodných refov a `load`, pred efektmi signálu, sentinelu a posunu). Do závislostí sa nesmie dostať `t`
 * (mock `useLanguage` vracia pri každom volaní novú funkciu, `load` by sa spúšťal pri každom rendri): drží ho
 * `tRef`.
 *
 * Nález 338 (K41, R48): odpoveď prvého načítania, ktorú zahodilo pridanie komentára, nechávala zoznam na
 * „Načítavam…“ (`loading` zhasínal len pri zhode poradia). Teraz sa v takom prípade načíta znova (viď `load`).
 *
 * PR #295 (nálezy CodeRabbitu): odmontovaná inštancia nespúšťa opakované načítanie ani nevolá `onTotalChange`
 * (rodič počet rozošle všetkým miestam s rovnakým `postId`, takže by zastaraná odpoveď mohla prepísať novší
 * počet z iného miesta): stav Reactu po odmontovaní zastaví React, volanie callbacku nie, preto kontrola
 * `mountedRef`. `loadRef` sa zapisuje v efekte po commite, nie pri vykresľovaní.
 *
 * Nález 351 (K43, R61): po zlyhaní donačítania ostávalo `hasMore` pravdivé a kurzor sa neposúval, takže sentinel
 * (nový observer pri každom prepnutí `enabled`, s okamžitým začiatočným oznámením) o chvíľu spustil ten istý dopyt
 * znova: desiatky dopytov a toastov za sekundu, kým bol koniec zoznamu vo výhľade. Po zlyhaní `loadMore` (nie
 * `silent` hľadania) sa preto doťahovanie pozastaví (`loadMorePaused`) a samo obnoví: po úspešnej obnove
 * pollingom, po udalosti `online` a po novom načítaní. `hasMore` sa nemení, takže hľadanie komentára z upozornenia
 * (`useFeedCommentsSeek`) sa správa ako doteraz. Rovnako sa správa donačítavanie odpovedí: po zlyhaní
 * `loadMoreReplies` (nie `silent`) sa pozastaví (`repliesPaused`, spoločné pre všetky vlákna a nezávislé od
 * komentárov) a obnoví sa tými istými spúšťačmi.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useFeedCommentsPolling } from './useFeedCommentsPolling';
import { handleFeedPostErrorIfGone } from './feedPostGone';
import {
  COMMENTS_MAX_POLL_SIZE,
  COMMENTS_PAGE_SIZE,
  REPLIES_PAGE_SIZE,
  flattenComments,
  mergeComments,
  mergeReplyBatch,
} from './feedCommentsLogic';
import {
  listFeedCommentReplies,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

type UseFeedCommentsLoaderOptions = {
  postId: number;
  /** Preklad; drží sa cez ref, takže sa do závislostí callbackov nedostane. */
  t: (key: string, fallback?: string) => string;
  /** Skutočný počet zo servera; drží sa cez ref z rovnakého dôvodu ako `t`. */
  onTotalChange?: (total: number) => void;
  /** Reakcia na komentáre, ktoré priniesla obnova (hook posunu a indikátora nových). */
  announceNewComments: (added: number) => void;
};

export function useFeedCommentsLoader({
  postId,
  t,
  onTotalChange,
  announceNewComments,
}: UseFeedCommentsLoaderOptions) {
  const [comments, setComments] = useState<FeedPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);
  /**
   * Príspevok už neexistuje.
   *
   * Nie je to to isté ako `failed`: pri zlyhaní sa oplatí skúsiť znova, tu už
   * nie je čo skúšať. Zastavuje pravidelné dopytovanie – bez neho by sa
   * odstránený príspevok dopytoval ďalej každých 8 sekúnd, kým je komponent
   * namountovaný, a každé kolo by nanovo rozposielalo „príspevok zmizol".
   */
  const [gone, setGone] = useState(false);
  const nextUrlRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Guard cez REF, nie cez state: sentinel vie vystreliť dvakrát skôr, než
  // React commitne setLoadingMore(true) – obe volania by potom videli
  // loadingMore === false, vyžiadali ten istý cursor a pomalšia odpoveď by
  // prepísala nextUrlRef späť (opakované requesty / preskočená stránka).
  // Rovnaký vzor ako loadingMoreRef v useFeedInfiniteScroll.
  const loadingMoreRef = useRef(false);
  const [loadingRepliesFor, setLoadingRepliesFor] = useState<number | null>(null);
  /**
   * Automatické doťahovanie starších komentárov je pozastavené po zlyhaní (nález 351, K43, R61).
   *
   * Hlavný feed a profil ho po chybe vypínajú cez `!error` a ručné tlačidlo; komentáre žiadne tlačidlo nemajú, preto
   * sa pozastavenie zruší samo (viď hlavička súboru). Sentinel v komponente ho berie ako ďalšiu podmienku `enabled`.
   */
  const [loadMorePaused, setLoadMorePaused] = useState(false);
  /**
   * To isté pre donačítavanie odpovedí (nález 351, K43, R61): po zlyhaní `loadMoreReplies` sa sentinely vlákien vypnú
   * a samy sa obnovia. Spoločné pre všetky rozbalené vlákna, lebo výpadok sa týka všetkých, a nezávislé od
   * `loadMorePaused`: zlyhanie jedného druhé nezastaví.
   */
  const [repliesPaused, setRepliesPaused] = useState(false);

  // `t` drží ref, aby nebolo v závislostiach callbackov: rodič sa pri zmene
  // počtu komentárov prerenderuje a keby `t` menilo identitu, `load` by sa
  // reštartoval a prepísal práve pridaný komentár späť na serverový stav.
  const tRef = useRef(t);
  tRef.current = t;
  // Cez ref, aby callback nemusel byť v závislostiach `load`/`loadMore` –
  // inak by sa zoznam pri každom rendri rodiča načítaval odznova.
  const onTotalChangeRef = useRef(onTotalChange);
  onTotalChangeRef.current = onTotalChange;
  // Poradové číslo načítania. Pridanie/zmazanie komentára ho zvýši, takže
  // odpoveď staršieho `load()`, ktorá dobehne až potom, sa zahodí – inak by
  // prepísala čerstvo pridaný komentár serverovým stavom spred mutácie.
  const loadSeqRef = useRef(0);
  /**
   * Číslo posledného volania `load()`. Samotné `loadSeqRef` nestačí: zvyšujú ho aj mutácie, takže z rozdielu sa
   * nedá poznať, či odpoveď zahodila mutácia (a `loading` by už nezhasol nikto), alebo novšie načítanie
   * (napríklad pri zmene príspevku), ktoré si `loading` zhasne samo.
   */
  const latestLoadRef = useRef(0);
  /** Najnovší `load`, aby sa vedel zopakovať aj z vlastného `finally` (nález 338). */
  const loadRef = useRef<() => Promise<void>>(async () => undefined);
  /**
   * Je inštancia ešte namontovaná? Stav Reactu po odmontovaní zastaví React sám, no volanie `onTotalChange`
   * (rodič ho rozošle všetkým miestam s rovnakým `postId`) a opakované načítanie nie, preto kontrola tu.
   */
  const mountedRef = useRef(true);
  // Aktuálne načítané okno pre `refresh` – cez ref (nie závislosť), aby sa
  // pollovací callback pri každom novom komentári nepreskladal.
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  /**
   * Najvyššie id, ktoré používateľ UŽ mal na obrazovke.
   *
   * Posúvajú ho OBE cesty – polling aj donačítavanie – preto ref, nie
   * odvodenie zo snapshotu zoznamu: ten je v momente výpočtu zastaraný a
   * komentáre, ktoré si používateľ práve sám doscrolloval, by sa počítali
   * ako „nové". Monotónnosť je zámer: zmazanie najnovšieho komentára nesmie
   * hranicu znížiť, inak by poll staršie komentáre ohlásil znova.
   */
  const highestSeenIdRef = useRef(0);
  const markSeen = useCallback((seen: FeedPostComment[]) => {
    seen.forEach((comment) => {
      if (comment.id > highestSeenIdRef.current) {
        highestSeenIdRef.current = comment.id;
      }
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    // Nové načítanie (iný príspevok, opakovanie po mutácii) začína s čistým štítom (nález 351).
    setLoadMorePaused(false);
    setRepliesPaused(false);
    loadingMoreRef.current = false;
    const call = (latestLoadRef.current += 1);
    const seq = (loadSeqRef.current += 1);
    try {
      const page = await listFeedPostComments(postId, {
        pageSize: COMMENTS_PAGE_SIZE,
      });
      // Medzitým pribudol/ubudol komentár → táto odpoveď je zastaraná.
      if (seq !== loadSeqRef.current) return;
      setComments(page.results);
      // Iný príspevok = iné vlákno, hranica sa počíta odznova.
      highestSeenIdRef.current = 0;
      markSeen(flattenComments(page.results));
      nextUrlRef.current = page.next;
      setHasMore(Boolean(page.next));
      // Počet pri ikone musí vychádzať z TOHO ISTÉHO načítania ako zoznam,
      // inak by po realtime obnovení ukazoval staré číslo. `count` z BE
      // je celkový, nie len veľkosť stránky. Odmontovaná inštancia ho nepublikuje (PR #295).
      if (mountedRef.current && typeof page.count === 'number') {
        onTotalChangeRef.current?.(page.count);
      }
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      // Príspevok medzitým zmizol – nemá zmysel ponúkať „skúsiť znova",
      // spoločné spracovanie ho odstráni zo zoznamov a zavrie otvorené vrstvy.
      if (handleFeedPostErrorIfGone(error, postId, tRef.current)) {
        setGone(true);
        return;
      }
      setFailed(true);
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false);
      } else if (call === latestLoadRef.current && mountedRef.current) {
        // Odpoveď zahodila mutácia (napríklad pridaný komentár), nie novšie načítanie: `loading` by už nezhasol
        // nikto a zoznam by ostal na „Načítavam…“ (nález 338). Načíta sa znova nad aktuálnym stavom. Zastaranú
        // odpoveď nezlučujeme, lebo je spred mutácie: `mergeComments` by z nej vlastný komentár odstránil ako
        // „zmazaný“. Slučka nehrozí: opakovanie zneplatní len ďalšia mutácia, teda ďalšia akcia používateľa.
        // Odmontovaný zoznam už nemá čo načítať (PR #295).
        void loadRef.current();
      }
    }
  }, [postId, markSeen]);

  // Zápis až po commite: render sa môže zahodiť a ref nesmie ukazovať na `load` z nezapísaného stavu (nález
  // CodeRabbitu na PR #295). Efekty `loadRef` a `mountedRef` idú pred efektmi `gone`, `load` a pollingu, takže ich
  // vzájomné poradie nemenia a obe sú nastavené, kým sa spustí prvé načítanie.
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    // Aj `true`: React vo vývoji efekt spustí, odmontuje a spustí znova.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Nový príspevok začína s čistým štítom – „zmizol" patrí konkrétnemu id.
  useEffect(() => {
    setGone(false);
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Donačíta ďalšiu stránku.
   *
   * Vracia `false` IBA keď požiadavka zlyhala – volajúci sa podľa toho vie
   * zastaviť. „Nič sa nerobilo" (beží iné donačítanie, nie je ďalšia stránka)
   * vracia `true`: zlyhanie to nie je a opakovanie rieši bežná cesta.
   *
   * `silent` potlačí chybový toast. Používa ho hľadanie komentára z
   * notifikácie – to beží na pozadí, používateľ oň nežiadal, takže hlásiť mu
   * zlyhanie nemá čo.
   */
  const loadMore = useCallback(async (options?: { silent?: boolean }) => {
    if (loadingMoreRef.current || !nextUrlRef.current) return true;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    // Rovnaká ochrana ako v `load()`: mutácia počas donačítavania zvýši
    // sekvenciu, takže táto stránka je už postavená na neplatnom kurzore.
    // `nextUrlRef` sa vtedy ZÁMERNE neposúva – ďalší scroll si tú istú
    // stránku vyžiada znova, už nad aktuálnym stavom.
    const seq = loadSeqRef.current;
    try {
      const page = await listFeedPostComments(postId, {
        cursorUrl: nextUrlRef.current,
      });
      if (seq !== loadSeqRef.current) return true;
      setComments((current) => {
        const seen = new Set(current.map((comment) => comment.id));
        return [...current, ...page.results.filter((c) => !seen.has(c.id))];
      });
      // Používateľ si ich doscrolloval sám – polling ich už nesmie ohlásiť
      // ako nové. Zapisuje sa synchrónne, nie až po prekreslení, lebo poll
      // môže dobehnúť skôr, než React zoznam commitne.
      markSeen(flattenComments(page.results));
      nextUrlRef.current = page.next;
      setHasMore(Boolean(page.next));
    } catch {
      // Chybu hlás len za AKTUÁLNY pokus. Keď medzitým prebehla mutácia, tento
      // request je už zneplatnený a jeho zlyhanie nemá čo riešiť – hláška
      // „komentáre sa nepodarilo načítať" hneď po úspešnom pridaní komentára
      // by len mýlila. Ďalší scroll si stránku vyžiada znova.
      if (seq === loadSeqRef.current && !options?.silent) {
        toast.error(
          tRef.current('feed.commentsLoadError', 'Komentáre sa nepodarilo načítať.'),
        );
        // Pozastav automatické doťahovanie, kým sa nevráti spojenie: koniec zoznamu je stále vo výhľade a
        // sentinel by hneď zopakoval ten istý neúspech (nález 351). Hľadanie (`silent`) ani zastaraný pokus
        // nepozastavujú nič.
        setLoadMorePaused(true);
      }
      return false;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
    return true;
  }, [postId, markSeen]);

  /**
   * Tichá obnova na pozadí – bez loading stavu a s MERGE namiesto prepísania.
   *
   * Pýta sa ZÁMERNE bez cursoru, na celé načítané okno naraz (+ priestor pre
   * nové komentáre). Uložený kurzor by bol lacnejší, ale nesie pozíciu vo
   * vlákne a o ničom PRED sebou nevypovedá: zmazanie na skoršej stránke by
   * ostalo navždy neviditeľné a `count` BE pri cursor requestoch nevracia
   * vôbec. Dopyt od začiatku dá jednu konzistentnú pravdu o celom okne.
   */
  const refresh = useCallback(async () => {
    const seq = loadSeqRef.current;
    const loaded = commentsRef.current;
    // Stránkovací stav pri ODOSLANÍ requestu. `loadingMoreRef` sám nestačí:
    // pokrýva len donačítavanie, ktoré ešte beží. Keby loadMore stihol počas
    // tohto awaitu celý dobehnúť, príznak je opäť false a odpoveď postavená
    // na kratšom okne by mu prepísala už posunutý kurzor – stránkovanie by sa
    // vrátilo späť a stránka by sa načítala druhýkrát.
    const cursorAtStart = nextUrlRef.current;
    const pageSize = Math.min(
      loaded.length + COMMENTS_PAGE_SIZE,
      COMMENTS_MAX_POLL_SIZE,
    );
    const page = await listFeedPostComments(postId, { pageSize });
    // Medzitým prebehla mutácia → táto odpoveď je spred nej, zahoď ju.
    if (seq !== loadSeqRef.current) return;
    // Odpoveď prišla, takže spojenie funguje: pozastavené doťahovanie komentárov aj odpovedí sa obnoví (nález 351).
    // Zahodená odpoveď nemá žiadny účinok, preto je to až za kontrolou; ďalší polling to dobehne.
    setLoadMorePaused(false);
    setRepliesPaused(false);
    // Odčítané hneď po awaite: `loadMore` posúva `nextUrlRef` synchrónne, ešte
    // pred prekreslením, takže je to spoľahlivejší ukazovateľ než dĺžka
    // zoznamu (tú drží ref zosynchronizovaný až pri rendri).
    const paginationUntouched = nextUrlRef.current === cursorAtStart;

    const hasNext = Boolean(page.next);
    // Hranicu prepočítaj z AKTUÁLNEHO okna, nie zo snapshotu spred awaitu:
    // keby loadMore medzitým dotiahol ďalšiu stránku, jej komentáre už
    // používateľ na obrazovke má a nesmú sa počítať ako nové.
    markSeen(flattenComments(commentsRef.current));
    const highestSeen = highestSeenIdRef.current;
    // Aj odpovede sú novinky – prídu vnorené v obnovenom rodičovi.
    const added = flattenComments(page.results).filter(
      (comment) => comment.id > highestSeen,
    ).length;

    setComments((current) => mergeComments(current, page.results, hasNext));
    markSeen(flattenComments(page.results));
    // Počet pri ikone drží krok so zoznamom aj vtedy, keď nové komentáre
    // pribudli za hranicou toho, čo má používateľ načítané. Odmontovaná inštancia ho nepublikuje (PR #295).
    if (mountedRef.current && typeof page.count === 'number') {
      onTotalChangeRef.current?.(page.count);
    }

    // Stránkovací stav preberáme len keď dopyt pokryl CELÉ okno. Pri dlhšom
    // okne (nad stropom) by `next` ukazoval doprostred už načítaného a
    // donačítavanie by sa vrátilo späť. Súbežné `loadMore` má prednosť.
    if (pageSize >= loaded.length && !loadingMoreRef.current && paginationUntouched) {
      nextUrlRef.current = page.next;
      setHasMore(hasNext);
    }

    if (added > 0) announceNewComments(added);
  }, [postId, announceNewComments, markSeen]);

  // Sekcia sa mountuje až pri rozbalení, takže „namountovaná" = „otvorená".
  // Každá otvorená karta má vlastnú inštanciu, teda aj vlastný polling.
  useFeedCommentsPolling({
    enabled: !loading && !failed && !gone,
    onPoll: refresh,
  });

  /**
   * Dotiahne ďalšiu dávku odpovedí jedného komentára.
   *
   * Pokračuje od najstaršej odpovede, ktorú už máme (`after`), smerom
   * k starším – nič sa nezduplikuje ani nevynechá; `mergeReplyBatch` navyše
   * zladí prekryv.
   * Vracia `false` LEN pri zlyhaní požiadavky – volajúci (hľadanie
   * zvýrazneného komentára) sa podľa toho vie zastaviť.
   *
   * `silent` potlačí chybový toast – rovnaký prepínač a z rovnakého dôvodu
   * ako v `loadMore`: hľadanie komentára z notifikácie beží na pozadí,
   * používateľ oň nežiadal. Klik na „Zobraziť ďalšie odpovede" je naopak
   * vedomá akcia, takže tam sa zlyhanie hlási.
   */
  const loadMoreReplies = useCallback(
    async (parentId: number, options?: { silent?: boolean }) => {
      const parent = commentsRef.current.find(
        (comment) => comment.id === parentId,
      );
      const loaded = parent?.replies ?? [];
      setLoadingRepliesFor(parentId);
      try {
        const page = await listFeedCommentReplies(postId, parentId, {
          // Kotvou je NAJSTARŠIA načítaná odpoveď, teda koniec zoznamu.
          // Sledovať „kam siaha server" už netreba: nové odpovede (vlastné aj
          // cudzie) pribúdajú NAVRCH, takže pod kotvou nikdy nevznikne medzera.
          after: loaded.length ? loaded[loaded.length - 1].id : null,
          pageSize: REPLIES_PAGE_SIZE,
        });
        markSeen(page.results);
        setComments((current) =>
          current.map((comment) =>
            comment.id === parentId
              ? {
                  ...comment,
                  replies: mergeReplyBatch(comment.replies ?? [], page.results),
                }
              : comment,
          ),
        );
        return true;
      } catch {
        if (!options?.silent) {
          toast.error(
            tRef.current(
              'feed.repliesLoadError',
              'Odpovede sa nepodarilo načítať.',
            ),
          );
          // Rovnako ako pri komentároch: koniec vlákna je stále vo výhľade a sentinel by hneď zopakoval ten istý
          // neúspech (nález 351). Tiché hľadanie (`silent`) nič nepozastavuje.
          setRepliesPaused(true);
        }
        return false;
      } finally {
        setLoadingRepliesFor(null);
      }
    },
    [postId, markSeen],
  );

  // Spojenie sa vrátilo: pozastavené doťahovanie komentárov aj odpovedí sa obnoví hneď, nie až pri najbližšom
  // pollingu (nález 351). Efekt je zámerne posledný v hooku, takže poradie existujúcich efektov sa nemení.
  useEffect(() => {
    const resume = () => {
      setLoadMorePaused(false);
      setRepliesPaused(false);
    };
    window.addEventListener('online', resume);
    return () => window.removeEventListener('online', resume);
  }, []);

  return {
    comments,
    setComments,
    loading,
    loadingMore,
    failed,
    hasMore,
    loadMorePaused,
    loadingRepliesFor,
    repliesPaused,
    loadSeqRef,
    markSeen,
    loadMore,
    refresh,
    loadMoreReplies,
  };
}
