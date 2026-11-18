'use client';

/**
 * Komentáre pod príspevkom – inline rozbalenie, nie modal.
 *
 * Donačítavanie je plynulé (rovnako ako hlavný feed), ale observer je SCOPED
 * na túto inštanciu: `useInfiniteScrollSentinel` vracia vlastný ref, takže
 * každá rozbalená karta má vlastný sentinel aj vlastný observer a viac kariet
 * otvorených naraz sa navzájom neovplyvňuje.
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedCommentItem from './FeedCommentItem';
import FeedCommentComposer from './FeedCommentComposer';
import FeedCommentsLoadingMore from './FeedCommentsLoadingMore';
import FeedCommentsNewIndicator from './FeedCommentsNewIndicator';
import FeedCommentReplyComposer from './FeedCommentReplyComposer';
import FeedRepliesAutoLoader from './FeedRepliesAutoLoader';
import { useEmojiInsertion } from './useEmojiInsertion';
import { useFeedCommentsPolling } from './useFeedCommentsPolling';
import { openUserProfile } from './feedProfileNavigation';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';
import { handleFeedPostErrorIfGone } from './feedPostGone';
import { useInfiniteScrollSentinel } from './useFeedInfiniteScroll';
import {
  COMMENTS_MAX_POLL_SIZE,
  COMMENTS_PAGE_SIZE,
  HIGHLIGHT_MAX_PAGES,
  HIGHLIGHT_MS,
  NEAR_TOP_PX,
  REPLIES_PAGE_SIZE,
  flattenComments,
  mergeComments,
  mergeReplyBatch,
  repliesTotal,
} from './feedCommentsLogic';
import {
  FEED_COMMENT_MAX_LENGTH,
  createFeedPostComment,
  deleteFeedPostComment,
  listFeedCommentReplies,
  updateFeedPostComment,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

type FeedPostCommentsProps = {
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

export default function FeedPostComments({
  postId,
  fillHeight = false,
  showTimestamp = false,
  compactComposer = false,
  listHeader,
  onCommentsReady,
  highlightCommentId,
  onCountChange,
  onTotalChange,
}: FeedPostCommentsProps) {
  const { t, locale } = useLanguage();
  // Mobil má emoji priamo na systémovej klávesnici – appkové
  // tlačidlo je tam duplicitné, tak ho tam nekreslíme.
  const isMobile = useIsMobile();
  const [comments, setComments] = useState<FeedPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
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
  // Okno detailu vie o sebe cez kontext – komentáre sa v ňom vykresľujú tiež,
  // takže ho vedia zavrieť rovnako ako hlavička príspevku.
  const postOverlay = useFeedPostOverlay();

  /**
   * Preklik na profil autora komentára.
   *
   * V otvorenom okne detailu musí okno zmiznúť, inak ostane visieť nad
   * profilom, na ktorý sa práve prešlo. `keepHistory`: adresu si rieši
   * samotná navigácia, krok späť by ju vzápätí zrušil – rovnaká úvaha ako
   * pri preklikoch z hlavičky príspevku.
   *
   * Kontrola `target` je podstatná: komentáre sa kreslia aj mimo okna
   * (rozbalené v karte, mobilná obrazovka, panel nad fotkou) a zatváranie
   * niečoho, čo otvorené nie je, by len pomiešalo účtovníctvo histórie.
   */
  const openCommentAuthorProfile = useCallback(
    (author: FeedPostComment['author']) => {
      openUserProfile(author, {
        beforeNavigate: () => {
          if (postOverlay?.target) postOverlay.close({ keepHistory: true });
        },
      });
    },
    [postOverlay],
  );

  const [pendingDelete, setPendingDelete] = useState<FeedPostComment | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  // Rozbalenie je LOKÁLNE per komentár – jedno vlákno môže mať naraz
  // rozbalené jedny odpovede a zbalené druhé.
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    () => new Set(),
  );
  const [loadingRepliesFor, setLoadingRepliesFor] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Ohraničený scrollovateľný zoznam + požadované správanie doscrollovania po
  // commite (null = nescrollovať). Nový komentár ide na koniec, takže by inak
  // pribudol pod zlomom boxu a pôsobil by, akoby sa vôbec nepridal.
  // 'auto' = vlastný komentár (okamžite), 'smooth' = cudzí z pollingu.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  /** Signál „zoznam je vykreslený" padne raz na príspevok. */
  const commentsReadyRef = useRef(false);
  const onCommentsReadyRef = useRef(onCommentsReady);
  onCommentsReadyRef.current = onCommentsReady;
  const scrollToTopRef = useRef<ScrollBehavior | null>(null);
  /** Počet komentárov, ktoré prišli, kým používateľ čítal vyššie v zozname. */
  const [newCommentsCount, setNewCommentsCount] = useState(0);
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
  const { textareaRef, insertEmoji } = useEmojiInsertion(text, setText);
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
  // Aktuálne načítané okno pre `refresh` – cez ref (nie závislosť), aby sa
  // pollovací callback pri každom novom komentári nepreskladal.
  const finishSeek = useCallback(() => {
    highlightSeekingRef.current = false;
    setSeekTick((tick) => tick + 1);
  }, []);

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
    loadingMoreRef.current = false;
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
      // je celkový, nie len veľkosť stránky.
      if (typeof page.count === 'number') {
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
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [postId, markSeen]);

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
      }
      return false;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
    return true;
  }, [postId, markSeen]);

  /** Doscrolluje zoznam navrch; `scrollTo` jsdom nemá, preto fallback. */
  const scrollListToTop = useCallback((behavior: ScrollBehavior) => {
    const node = scrollRef.current;
    if (!node) return;
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: 0, behavior });
    } else {
      node.scrollTop = 0;
    }
  }, []);

  /**
   * Reakcia na komentáre, ktoré priniesol polling – podľa toho, kde
   * používateľ práve je. Volá sa PRED commitom nového zoznamu, takže rozmery
   * uzla ešte popisujú stav spred pridania; presne to nás zaujíma.
   */
  const announceNewComments = useCallback((added: number) => {
    const node = scrollRef.current;
    // Nové komentáre pribúdajú NAVRCH. Kto je pri vrchu, má ich rovno pred
    // sebou – vtedy stačí dorovnať pohľad, indikátor by len prekážal.
    const distanceToTop = node ? node.scrollTop : 0;
    if (distanceToTop <= NEAR_TOP_PX) {
      scrollToTopRef.current = 'smooth';
      return;
    }
    // Číta staršie nižšie → pohľad mu netrháme, len ho upozorníme.
    setNewCommentsCount((current) => current + added);
  }, []);

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
    // pribudli za hranicou toho, čo má používateľ načítané.
    if (typeof page.count === 'number') {
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
   * Ohlás, že zoznam je vykreslený.
   *
   * Beží AŽ po commite, v ktorom `loading` prepol na false – komentáre sú
   * teda už v DOM a plocha má svoju skutočnú výšku. Neúspešné načítanie sa
   * neohlasuje: nie je čo ukázať a doscrollovať by sa nemalo kam.
   */
  useEffect(() => {
    commentsReadyRef.current = false;
  }, [postId]);

  useEffect(() => {
    if (commentsReadyRef.current || loading || failed) return;
    commentsReadyRef.current = true;
    onCommentsReadyRef.current?.(scrollRef.current);
  }, [loading, failed]);

  // Rootom observera je ohraničený box, nie viewport – donačítanie tak reaguje
  // na scroll VNÚTRI zoznamu. Menší rootMargin než v hlavnom feede: predsávka
  // 400px by v ~26rem vysokom boxe znamenala, že sentinel je "blízko" vždy.
  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: loadMore,
    enabled: hasMore && !loading && !loadingMore,
    root: scrollRef,
    rootMargin: '80px',
  });

  // Beží až po commite DOM, takže scrollHeight už zahŕňa nový komentár.
  // Gate cez ref: donačítanie staršej stránky pridáva komentáre tiež, ale
  // vtedy pozíciu scrollu meniť nechceme.
  useEffect(() => {
    const behavior = scrollToTopRef.current;
    if (!behavior) return;
    scrollToTopRef.current = null;
    scrollListToTop(behavior);
    // Doscrollovaním sa upozornenie vyčerpalo.
    setNewCommentsCount((current) => (current === 0 ? current : 0));
  }, [comments, scrollListToTop]);

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
        }
        return false;
      } finally {
        setLoadingRepliesFor(null);
      }
    },
    [postId, markSeen],
  );

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

  // Keď sa používateľ dostane navrch sám, indikátor už nemá čo hlásiť.
  const handleListScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    if (node.scrollTop <= NEAR_TOP_PX) {
      setNewCommentsCount((current) => (current === 0 ? current : 0));
    }
  }, []);

  const handleNewCommentsClick = useCallback(() => {
    scrollToTopRef.current = null;
    scrollListToTop('smooth');
    setNewCommentsCount(0);
  }, [scrollListToTop]);

  const trimmed = text.trim();
  const tooLong = text.length > FEED_COMMENT_MAX_LENGTH;
  const canSubmit = Boolean(trimmed) && !tooLong && !submitting;

  // Skloňovanie: 1 / 2–4 / 5+ pokrýva sk, cs aj pl. V en, de a hu, kde sa
  // tvary 2–4 a 5+ nelíšia, majú oba kľúče rovnaký text, takže rovnaká vetva
  // funguje pre všetkých šesť jazykov bez ďalšej logiky.
  const newCommentsLabel = `${newCommentsCount} ${
    newCommentsCount === 1
      ? t('feed.newCommentsOne', 'nový komentár')
      : newCommentsCount < 5
        ? t('feed.newCommentsFew', 'nové komentáre')
        : t('feed.newCommentsMany', 'nových komentárov')
  }`;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const created = await createFeedPostComment(postId, trimmed);
      // Zneplatní prebiehajúci load() – jeho odpoveď by tento komentár
      // prepísala stavom spred vytvorenia.
      loadSeqRef.current += 1;
      // Najnovší prvý (poradie z BE) → vlastný komentár ide NAVRCH. Composer
      // je pod zoznamom, takže pri dlhšom vlákne je vrch mimo dohľadu –
      // pohľad sa tam dorovná bez animácie (používateľ práve odoslal, čakať
      // na dojazd nemá zmysel).
      scrollToTopRef.current = 'auto';
      setComments((current) => [created, ...current]);
      // Vlastný komentár sa nesmie vrátiť ako „nový" v najbližšom polle.
      markSeen([created]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      if (!handleFeedPostErrorIfGone(err, postId, t)) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error || t('feed.commentCreateError', 'Komentár sa nepodarilo pridať.');
        toast.error(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReplies = (commentId: number) => {
    setExpandedReplies((current) => {
      const next = new Set(current);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleSubmitEdit = async (comment: FeedPostComment, text: string) => {
    if (editSubmitting || !text) return;
    setEditSubmitting(true);
    try {
      const updated = await updateFeedPostComment(postId, comment.id, text);
      // Zneplatní prebiehajúci load() – rovnako ako pri vytvorení komentára.
      loadSeqRef.current += 1;
      // Preberá sa LEN text a príznak úpravy. Celý objekt by prepísal odpovede
      // náhľadom zo serverovej odpovede, takže by používateľ prišiel o tie,
      // ktoré si sám donačítal.
      const patch = (item: FeedPostComment): FeedPostComment =>
        item.id === comment.id
          ? { ...item, text: updated.text, is_edited: updated.is_edited }
          : item;
      setComments((current) =>
        current.map((item) => ({
          ...patch(item),
          replies: item.replies?.map(patch),
        })),
      );
      setEditingComment(null);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        t('feed.commentUpdateError', 'Komentár sa nepodarilo upraviť.');
      toast.error(message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: number) => {
    const trimmedReply = replyText.trim();
    if (!trimmedReply || replySubmitting) return;
    setReplySubmitting(true);
    try {
      const created = await createFeedPostComment(postId, trimmedReply, parentId);
      // Zneplatní prebiehajúci load() – rovnako ako pri bežnom komentári.
      loadSeqRef.current += 1;
      markSeen([created]);
      setComments((current) =>
        current.map((comment) =>
          comment.id === parentId
            ? {
                ...comment,
                // Najnovšia odpoveď je prvá – rovnaký smer ako komentáre.
                replies: [created, ...(comment.replies ?? [])],
                // Počet drží tlačidlo „Zobraziť odpovede (N)" – bez neho by
                // sa vlastná odpoveď po zbalení už nedala otvoriť.
                replies_count: repliesTotal(comment) + 1,
              }
            : comment,
        ),
      );
      setReplyText('');
      setReplyingTo(null);
      // Vlastnú odpoveď má autor hneď vidieť, aj keď mal sekciu zbalenú.
      setExpandedReplies((current) => new Set(current).add(parentId));
      onCountChange?.(1);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('feed.replyCreateError', 'Odpoveď sa nepodarilo pridať.');
      toast.error(message);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    const comment = pendingDelete;
    if (!comment) return;
    setDeleting(true);
    try {
      await deleteFeedPostComment(postId, comment.id);
      loadSeqRef.current += 1;
      // Zmazaný môže byť vrcholový komentár aj odpoveď – odpoveď žije
      // vnorená, takže sa musí odstrániť z rodiča.
      setComments((current) =>
        current
          .filter((item) => item.id !== comment.id)
          .map((item) =>
            item.replies?.some((reply) => reply.id === comment.id)
              ? {
                  ...item,
                  replies: item.replies.filter((reply) => reply.id !== comment.id),
                  replies_count: Math.max(repliesTotal(item) - 1, 0),
                }
              : item,
          ),
      );
      // Backend maže vrcholový komentár aj jeho odpovede naraz (CASCADE),
      // takže číslo pri ikone musí klesnúť o celý podstrom – nie o jedno.
      // Odpoveď žiadne vlastné odpovede nemá, takže tam ostáva -1.
      // Ráta sa CELKOVÝ počet odpovedí, nie len načítaný – zbalené vlákno má
      // v appke nanajvýš náhľad, backend však zmaže všetky.
      onCountChange?.(-(1 + repliesTotal(comment)));
      toast.success(t('feed.commentDeleted', 'Komentár bol zmazaný.'));
      setPendingDelete(null);
    } catch {
      toast.error(t('feed.commentDeleteError', 'Komentár sa nepodarilo zmazať.'));
    } finally {
      setDeleting(false);
    }
  };

  /**
   * Jeden komentár. Tá istá funkcia kreslí vrcholový komentár aj odpoveď –
   * líšia sa len veľkosťou a tým, že odpoveď NEMÁ tlačidlo „Odpovedať"
   * (vnorenie je jednoúrovňové, na odpoveď sa už odpovedať nedá).
   */
  const renderComment = (comment: FeedPostComment, isReply = false) => (
    <FeedCommentItem
      comment={comment}
      isReply={isReply}
      postId={postId}
      highlighted={highlighted}
      editingComment={editingComment}
      editSubmitting={editSubmitting}
      expandedReplies={expandedReplies}
      showTimestamp={showTimestamp}
      t={t}
      locale={locale}
      openCommentAuthorProfile={openCommentAuthorProfile}
      setEditingComment={setEditingComment}
      handleSubmitEdit={handleSubmitEdit}
      setReplyingTo={setReplyingTo}
      setReplyText={setReplyText}
      toggleReplies={toggleReplies}
      setPendingDelete={setPendingDelete}
    />
  );

  return (
    <div
      data-testid="feed-post-comments"
      className={`border-t border-gray-200/70 px-4 py-3 dark:border-gray-700/60 ${
        fillHeight ? 'flex h-full min-h-0 flex-col' : ''
      }`}
    >
      {/* Ohraničený box s vlastným scrollom: stovky komentárov nenaťahujú
          stránku do nekonečna. `overscroll-contain` zastaví reťazenie scrollu
          na stránku pri dosiahnutí konca (podstatné hlavne na mobile).
          tabIndex robí oblasť dostupnou aj z klávesnice (WCAG 2.1.1). */}
      {/* `relative` kvôli indikátoru nových komentárov, ktorý pláva nad
          spodným okrajom zoznamu. */}
      <div className={`relative ${fillHeight ? 'min-h-0 flex-1' : ''}`}>
        <div
          ref={scrollRef}
          onScroll={handleListScroll}
          data-testid="feed-comments-scroll"
          role="region"
          aria-label={t('feed.commentsList', 'Komentáre')}
          tabIndex={0}
          // `subtle-scrollbar` je appkina utilita (tenký zaoblený scrollbar so
          // svetlým aj tmavým variantom v globals.css) – tú istú má composer,
          // zdieľací dialóg aj zoznam lajkujúcich. V dvojstĺpcovom okne
          // detailu je toto JEDINÉ scrollovateľné miesto, takže by tu
          // predvolený systémový scrollbar bil do očí najviac.
          className={`subtle-scrollbar overflow-y-auto overscroll-contain pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 ${
            fillHeight ? 'h-full' : 'max-h-[min(26rem,60dvh)]'
          }`}
        >
          {listHeader}
          {loading ? (
            <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
              {t('common.loading', 'Načítavam...')}
            </p>
          ) : failed ? (
            <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
              {t('feed.commentsLoadError', 'Komentáre sa nepodarilo načítať.')}
            </p>
          ) : comments.length === 0 ? (
            <p
              data-testid="feed-comments-empty"
              className="py-2 text-sm text-gray-500 dark:text-gray-400"
            >
              {t('feed.commentsEmpty', 'Zatiaľ žiadne komentáre.')}
            </p>
          ) : (
            <ul className="space-y-3">
              {comments.map((comment) => (
                <li key={comment.id}>
                  {renderComment(comment)}

                  {/* Odpovede – jedna úroveň, odsadené a menšie. Žiadna
                      @menovka: kontext dáva samotné vnorenie. Predvolene
                      zbalené, nech dlhé vlákno neprevalcuje zoznam. */}
                  {expandedReplies.has(comment.id) && comment.replies?.length ? (
                    <ul
                      data-testid={`feed-comment-replies-${comment.id}`}
                      className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3 ml-4 dark:border-gray-700"
                    >
                      {comment.replies.map((reply) => (
                        <li key={reply.id}>{renderComment(reply, true)}</li>
                      ))}
                    </ul>
                  ) : null}

                  {/* Staršie odpovede sa dopĺňajú samy pri scrollovaní –
                      žiadne tlačidlo. Sentinel patrí TOMUTO vláknu, takže
                      viac rozbalených naraz sa navzájom nespúšťa. */}
                  {expandedReplies.has(comment.id) &&
                  (comment.replies?.length ?? 0) <
                    (comment.replies_count ?? 0) ? (
                    <FeedRepliesAutoLoader
                      enabled={loadingRepliesFor !== comment.id}
                      loading={loadingRepliesFor === comment.id}
                      root={scrollRef}
                      onLoadMore={() => void loadMoreReplies(comment.id)}
                      testId={`feed-comment-replies-sentinel-${comment.id}`}
                    />
                  ) : null}

                  {replyingTo === comment.id ? (
                    <div className="ml-4 pl-3">
                      <FeedCommentReplyComposer
                        value={replyText}
                        onChange={setReplyText}
                        submitting={replySubmitting}
                        onSubmit={() => void handleSubmitReply(comment.id)}
                        onCancel={() => {
                          setReplyingTo(null);
                          setReplyText('');
                        }}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {loadingMore ? <FeedCommentsLoadingMore /> : null}

          {/* Sentinel patrí TEJTO karte – observer je per-inštancia, takže dve
              naraz rozbalené karty si donačítavanie navzájom nespúšťajú.
              Musí byť VNÚTRI scrollovateľného boxu, inak by ho scroll v zozname
              nikdy neposunul do zorného poľa a donačítavanie by sa nespustilo. */}
          <div ref={sentinelRef} aria-hidden="true" data-testid="feed-comments-sentinel" />
        </div>

        <FeedCommentsNewIndicator
          newCommentsCount={newCommentsCount}
          newCommentsLabel={newCommentsLabel}
          handleNewCommentsClick={handleNewCommentsClick}
        />
      </div>

      {/* Composer je MIMO scrollovateľnej časti – ostáva viditeľný bez ohľadu
          na to, kde v zozname používateľ je. */}
      <FeedCommentComposer
        compactComposer={compactComposer}
        textareaRef={textareaRef}
        text={text}
        setText={setText}
        t={t}
        handleSubmit={handleSubmit}
        canSubmit={canSubmit}
        tooLong={tooLong}
        isMobile={isMobile}
        submitting={submitting}
        insertEmoji={insertEmoji}
      />

      <FeedDestructiveConfirm
        open={pendingDelete !== null}
        isDeleting={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
