'use client';

/**
 * Komentáre pod príspevkom – inline rozbalenie, nie modal.
 *
 * Donačítavanie je plynulé (rovnako ako hlavný feed), ale observer je SCOPED
 * na túto inštanciu: `useInfiniteScrollSentinel` vracia vlastný ref, takže
 * každá rozbalená karta má vlastný sentinel aj vlastný observer a viac kariet
 * otvorených naraz sa navzájom neovplyvňuje.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { DesktopEmojiPickerButton } from '../messages/DesktopEmojiPickerButton';
import FeedDestructiveConfirm from './FeedDestructiveConfirm';
import FeedCommentLikeButton from './FeedCommentLikeButton';
import FeedCommentEditComposer from './FeedCommentEditComposer';
import FeedCommentReplyComposer from './FeedCommentReplyComposer';
import { useEmojiInsertion } from './useEmojiInsertion';
import { useFeedCommentsPolling } from './useFeedCommentsPolling';
import { useInfiniteScrollSentinel } from './useFeedInfiniteScroll';
import {
  FEED_COMMENT_MAX_LENGTH,
  createFeedPostComment,
  deleteFeedPostComment,
  listFeedCommentReplies,
  updateFeedPostComment,
  listFeedPostComments,
  type FeedPostComment,
} from '@/lib/feedApi';

const COMMENTS_PAGE_SIZE = 10;
/**
 * Strop pre jeden pollovací dopyt – zhodný s `max_page_size` vo
 * `FeedCommentCursorPagination`. BE väčšiu hodnotu ticho oreže, takže sa
 * orezáva rovno tu, nech je zrejmé, čo odpoveď pokrýva.
 */
const COMMENTS_MAX_POLL_SIZE = 50;
/** Do tejto vzdialenosti od spodku sa nový komentár doscrolluje sám. */
const NEAR_BOTTOM_PX = 100;

/** Zhodné s FEED_REPLIES_PREVIEW_LIMIT na backende. */
const REPLIES_PREVIEW_LIMIT = 10;
/** Koľko odpovedí sa dotiahne jedným kliknutím na „Zobraziť ďalšie". */
const REPLIES_PAGE_SIZE = 10;

/**
 * Poradie zhodné s backendom: ``(created_at, id)``.
 *
 * Radiť len podľa id by v drvivej väčšine prípadov vyšlo rovnako (id rastie
 * s časom), ale zoznam by sa od servera rozišiel vždy, keď to neplatí. Jedno
 * pravidlo pre všetky cesty – polling, donačítanie aj vlastný príspevok –
 * znamená, že poradie nezávisí od toho, ktorou z nich sa komentár dostal
 * do lokálneho stavu.
 */
function compareChronologically(
  a: FeedPostComment,
  b: FeedPostComment,
): number {
  if (a.created_at !== b.created_at) {
    return a.created_at < b.created_at ? -1 : 1;
  }
  return a.id - b.id;
}

function sortedChronologically(
  byId: Map<number, FeedPostComment>,
): FeedPostComment[] {
  return [...byId.values()].sort(compareChronologically);
}

/**
 * Zlúči NÁHĽAD odpovedí (prvých pár od začiatku vlákna) s tým, čo appka má.
 *
 * Rovnaký princíp ako `mergeComments` o úroveň vyššie: náhľad má posledné
 * slovo o svojom rozsahu, takže čo v ňom chýba a má nižšie id než jeho koniec,
 * bolo medzitým zmazané. Nad jeho hranicou sa nezahadzuje nič – o tom náhľad
 * nič nehovorí a používateľ tam môže mať vlastné donačítané odpovede.
 *
 * Keď je odpovedí menej než náhľadový strop, pokrýva náhľad celé vlákno, takže
 * jeho dosah je neohraničený (aj prázdny náhľad vtedy znamená „nič tam nie je").
 */
function mergeReplyPreview(
  current: FeedPostComment[],
  preview: FeedPostComment[],
  previewCoversThread: boolean,
): FeedPostComment[] {
  if (!preview.length) return previewCoversThread ? [] : current;
  const highest = previewCoversThread
    ? Number.POSITIVE_INFINITY
    : Math.max(...preview.map((reply) => reply.id));
  const byId = new Map(
    current.filter((reply) => reply.id > highest).map((reply) => [reply.id, reply]),
  );
  preview.forEach((reply) => byId.set(reply.id, reply));
  return sortedChronologically(byId);
}

/**
 * Pripojí ĎALŠIU dávku odpovedí za tie, čo už máme.
 *
 * Dávka je pokračovanie za kotvou, nie pohľad od začiatku vlákna – nehovorí
 * teda nič o predchádzajúcich odpovediach a žiadna sa pri nej nezahadzuje.
 * Prienik podľa id ošetrí prípad, keď medzitým niečo pribudlo pred kotvou.
 */
function mergeReplyBatch(
  current: FeedPostComment[],
  batch: FeedPostComment[],
): FeedPostComment[] {
  if (!batch.length) return current;
  const byId = new Map(current.map((reply) => [reply.id, reply]));
  batch.forEach((reply) => byId.set(reply.id, reply));
  return sortedChronologically(byId);
}

/**
 * Zlúči čerstvú odpoveď servera do lokálneho zoznamu.
 *
 * Kľúčový predpoklad: odpoveď VŽDY začína od začiatku vlákna (polling sa pýta
 * bez cursoru – viď `refresh`). Preto má server posledné slovo o všetkom až po
 * posledné vrátené id:
 *  - čo v odpovedi je → nahradí sa serverovou verziou (čerstvé počty lajkov,
 *    nové komentáre),
 *  - čo v nej chýba a spadá do jej dosahu → medzitým to niekto zmazal,
 *  - čo je NAD jej dosahom → odpoveď o tom nič nehovorí, ostáva nedotknuté.
 *    Nastáva len pri okne dlhšom než COMMENTS_MAX_POLL_SIZE.
 *
 * Dosah určuje `hasNext`, nie počet položiek: keď ďalšia stránka neexistuje,
 * server vrátil celé vlákno, takže dosah je neohraničený. Tým je pravidlo
 * odolné aj voči orezaniu veľkosti stránky na strane BE – dĺžky sa
 * neporovnávajú.
 *
 * Radí sa rovnakým pravidlom ako na backende – ``(created_at, id)``, viď
 * `compareChronologically`.
 */
function mergeComments(
  current: FeedPostComment[],
  incoming: FeedPostComment[],
  hasNext: boolean,
): FeedPostComment[] {
  // Prázdna odpoveď bez ďalšej stránky = vlákno je prázdne (zmazalo sa všetko).
  if (!incoming.length) return hasNext ? current : [];

  const highest = hasNext
    ? Math.max(...incoming.map((comment) => comment.id))
    : Number.POSITIVE_INFINITY;

  const currentById = new Map(current.map((comment) => [comment.id, comment]));
  const byId = new Map(
    current
      .filter((comment) => comment.id > highest)
      .map((comment) => [comment.id, comment]),
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
  return sortedChronologically(byId);
}

/** Ako dlho ostane komentár z notifikácie zvýraznený. */
const HIGHLIGHT_MS = 3000;
/**
 * Strop donačítavania pri hľadaní komentára z notifikácie.
 *
 * Pri COMMENTS_PAGE_SIZE = 10 to je 200 komentárov – hlbšie vlákno je
 * v praxi výnimka a nekonečné stránkovanie by pri zlom odkaze bolo horšie
 * než sa zastaviť.
 */
const HIGHLIGHT_MAX_PAGES = 20;

/**
 * Koľko odpovedí komentár celkovo má.
 *
 * Zdroj pravdy je `replies_count` z backendu (počíta aj tie nenačítané);
 * načítané pole je len poistka, keby pole v odpovedi chýbalo.
 */
function repliesTotal(comment: FeedPostComment): number {
  return comment.replies_count ?? comment.replies?.length ?? 0;
}

/** Komentáre aj ich odpovede v jednom zozname – na hľadanie a počítanie. */
function flattenComments(list: FeedPostComment[]): FeedPostComment[] {
  return list.flatMap((comment) => [comment, ...(comment.replies ?? [])]);
}

type FeedPostCommentsProps = {
  postId: number;
  /** Komentár z notifikácie – doscrolluje sa naň a krátko sa zvýrazní. */
  highlightCommentId?: number | null;
  onCountChange?: (delta: number) => void;
  /** Skutočný počet zo servera – drží číslo pri ikone v súlade so zoznamom. */
  onTotalChange?: (total: number) => void;
};

export default function FeedPostComments({
  postId,
  highlightCommentId,
  onCountChange,
  onTotalChange,
}: FeedPostCommentsProps) {
  const { t } = useLanguage();
  // Mobil má emoji priamo na systémovej klávesnici – appkové
  // tlačidlo je tam duplicitné, tak ho tam nekreslíme.
  const isMobile = useIsMobile();
  const [comments, setComments] = useState<FeedPostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [text, setText] = useState('');
  const [failed, setFailed] = useState(false);
  const nextUrlRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Guard cez REF, nie cez state: sentinel vie vystreliť dvakrát skôr, než
  // React commitne setLoadingMore(true) – obe volania by potom videli
  // loadingMore === false, vyžiadali ten istý cursor a pomalšia odpoveď by
  // prepísala nextUrlRef späť (opakované requesty / preskočená stránka).
  // Rovnaký vzor ako loadingMoreRef v useFeedInfiniteScroll.
  const loadingMoreRef = useRef(false);
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
  const scrollToBottomRef = useRef<ScrollBehavior | null>(null);
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
   * Kam až siaha SÚVISLÝ úsek odpovedí, ktorý appka dostala od servera – per
   * komentár. Posúva ho len serverová odpoveď (náhľad alebo donačítaná dávka),
   * nikdy nie odpoveď pridaná lokálne.
   */
  const replyReachRef = useRef(new Map<number, number>());
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
    } catch {
      if (seq === loadSeqRef.current) setFailed(true);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [postId, markSeen]);

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

  /** Doscrolluje zoznam na koniec; `scrollTo` jsdom nemá, preto fallback. */
  const scrollListToBottom = useCallback((behavior: ScrollBehavior) => {
    const node = scrollRef.current;
    if (!node) return;
    if (typeof node.scrollTo === 'function') {
      node.scrollTo({ top: node.scrollHeight, behavior });
    } else {
      node.scrollTop = node.scrollHeight;
    }
  }, []);

  /**
   * Reakcia na komentáre, ktoré priniesol polling – podľa toho, kde
   * používateľ práve je. Volá sa PRED commitom nového zoznamu, takže rozmery
   * uzla ešte popisujú stav spred pridania; presne to nás zaujíma.
   */
  const announceNewComments = useCallback((added: number) => {
    const node = scrollRef.current;
    // Bez uzla (alebo pri zozname, ktorý sa ešte nescrolluje) je koniec na
    // obrazovke – indikátor by len prekážal.
    const distanceToBottom = node
      ? node.scrollHeight - node.scrollTop - node.clientHeight
      : 0;
    if (distanceToBottom <= NEAR_BOTTOM_PX) {
      scrollToBottomRef.current = 'smooth';
      return;
    }
    // Číta niečo vyššie → pohľad mu neposúvame, len ho upozorníme.
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

  /**
   * Znovu otvorí stránkovanie pre okno DLHŠIE než pollovací strop.
   *
   * `refresh` vie doniesť nové komentáre len vtedy, keď sa celé okno zmestí
   * do jedného dopytu (strop COMMENTS_MAX_POLL_SIZE). Nad ním pokryje iba
   * začiatok vlákna, takže `next` zámerne nepreberá – ukazoval by doprostred
   * už načítaného. Lenže keď je `nextUrlRef` medzitým vyčerpaný (vlákno bolo
   * dočítané do konca), nemá sa odkiaľ pohnúť ďalej a hľadanie komentára za
   * koncom okna by sa vzdalo, hoci ten komentár existuje.
   *
   * Preto sa kurzor postaví nanovo od začiatku: `loadMore` sa ním prehryzie
   * dopredu a už načítané položky cestou zahodí dedup. Cena je pár dopytov
   * navyše, ohraničených tým istým stropom HIGHLIGHT_MAX_PAGES ako zvyšok
   * hľadania.
   */
  const reopenPagination = useCallback(async () => {
    if (loadingMoreRef.current) return;
    const seq = loadSeqRef.current;
    const page = await listFeedPostComments(postId, {
      pageSize: COMMENTS_MAX_POLL_SIZE,
    });
    if (seq !== loadSeqRef.current || loadingMoreRef.current) return;
    if (!page.next) return;
    nextUrlRef.current = page.next;
    setHasMore(true);
  }, [postId]);

  // Sekcia sa mountuje až pri rozbalení, takže „namountovaná" = „otvorená".
  // Každá otvorená karta má vlastnú inštanciu, teda aj vlastný polling.
  useFeedCommentsPolling({ enabled: !loading && !failed, onPoll: refresh });

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
    const behavior = scrollToBottomRef.current;
    if (!behavior) return;
    scrollToBottomRef.current = null;
    scrollListToBottom(behavior);
    // Doscrollovaním sa upozornenie vyčerpalo.
    setNewCommentsCount((current) => (current === 0 ? current : 0));
  }, [comments, scrollListToBottom]);

  // Nový cieľ = nové hľadanie. Časovač sa ruší LEN tu (zmena cieľa) a pri
  // odmountovaní – nie pri každej zmene zoznamu.
  useEffect(() => {
    // Najprv zhasni staré zvýraznenie: pri prechode na iný (alebo žiadny)
    // cieľ by inak ostalo svietiť, kým nedobehne jeho vlastný časovač.
    setHighlighted(null);
    highlightHandledRef.current = null;
    highlightPagesRef.current = 0;
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
   * Posledná odpoveď SÚVISLÉHO úseku od servera – kotva pre ďalšiu dávku.
   *
   * Nie je to posledná načítaná odpoveď: medzi náhľadom a ňou môže byť
   * MEDZERA. Vzniká celkom bežne – vlastná odpoveď sa pridá lokálne (a je
   * novšia než všetko, čo server poslal), rovnako môže pribudnúť cieľ
   * notifikácie. Keby sa kotvilo na ňu, dopyt by medzeru preskočil, staršie
   * odpovede by sa už nikdy nedotiahli a „Zobraziť ďalšie" by vracalo prázdno.
   *
   * Bez donačítania siaha server po náhľadový strop, ďalej ho posúva
   * `replyReachRef`.
   */
  const replyReach = useCallback(
    (parentId: number, replies: FeedPostComment[]): number | null => {
      // Kotva je POZÍCIA v poradí `(created_at, id)`, nie „najvyššie id".
      // Porovnávať id číselne sa nesmie: dávka, ktorá je chronologicky ďalej,
      // môže mať nižšie id, a `Math.max` by sa vrátil na staršiu pozíciu –
      // ďalší dopyt by vracal tú istú dávku dokola a novšie odpovede by sa
      // stali nedosiahnuteľnými.
      //
      // Kým sa nič nedonačítalo, siaha server po koniec náhľadu; potom platí
      // koniec POSLEDNEJ dávky, ktorá je z definície pokračovaním za ním.
      const fetched = replyReachRef.current.get(parentId);
      if (fetched != null) return fetched;
      return replies.length
        ? replies[Math.min(replies.length, REPLIES_PREVIEW_LIMIT) - 1].id
        : null;
    },
    [],
  );

  /**
   * Dotiahne ďalšiu dávku odpovedí jedného komentára.
   *
   * Pokračuje od poslednej odpovede, ktorú už máme (`after`), takže sa nič
   * nezduplikuje ani nevynechá; `mergeReplies` navyše zladí prekryv.
   * Vracia `false` LEN pri zlyhaní požiadavky – volajúci (hľadanie
   * zvýrazneného komentára) sa podľa toho vie zastaviť.
   *
   * `silent` potlačí chybový toast – rovnaký prepínač a z rovnakého dôvodu
   * ako v `loadMore`: hľadanie komentára z notifikácie beží na pozadí,
   * používateľ oň nežiadal. Klik na „Zobraziť ďalšie odpovede" je naopak
   * vedomá akcia, takže tam sa zlyhanie hlási.
   */
  // Iný príspevok = iné vlákna; starý dosah by kotvil na cudzie id.
  useEffect(() => {
    replyReachRef.current = new Map();
  }, [postId]);

  const loadMoreReplies = useCallback(
    async (parentId: number, options?: { silent?: boolean }) => {
      const parent = commentsRef.current.find(
        (comment) => comment.id === parentId,
      );
      const loaded = parent?.replies ?? [];
      setLoadingRepliesFor(parentId);
      try {
        const page = await listFeedCommentReplies(postId, parentId, {
          after: replyReach(parentId, loaded),
          pageSize: REPLIES_PAGE_SIZE,
        });
        markSeen(page.results);
        if (page.results.length) {
          // Dávka prichádza v poradí radenia a je pokračovaním za kotvou,
          // takže jej POSLEDNÝ prvok je nová pozícia – priame priradenie,
          // žiadne porovnávanie čísel s predošlou kotvou.
          replyReachRef.current.set(
            parentId,
            page.results[page.results.length - 1].id,
          );
        }
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
    [postId, markSeen, replyReach],
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
    const parentWithMissingReplies = comments.find((comment) => {
      const loadedReplies = comment.replies ?? [];
      if (loadedReplies.length >= (comment.replies_count ?? 0)) return false;
      // Rozhoduje koniec SÚVISLÉHO úseku, nie posledná načítaná odpoveď:
      // chýbajúce odpovede ležia práve za ním. Podľa poslednej načítanej by
      // vlákno s medzerou (vlastná odpoveď na konci) vyšlo ako „už za cieľom"
      // a cieľ v medzere by sa nikdy nenašiel.
      const reach = replyReach(comment.id, loadedReplies) ?? 0;
      return reach < highlightCommentId;
    });
    if (parentWithMissingReplies) {
      if (highlightPagesRef.current >= HIGHLIGHT_MAX_PAGES) {
        highlightHandledRef.current = highlightCommentId;
        return;
      }
      if (loadingRepliesFor !== null) return;
      highlightPagesRef.current += 1;
      highlightSeekingRef.current = true;
      // Ticho: hľadanie beží na pozadí, používateľ oň nežiadal.
      void loadMoreReplies(parentWithMissingReplies.id, { silent: true }).then(
        (ok) => {
          finishSeek();
          if (!ok) highlightHandledRef.current = highlightCommentId;
        },
      );
      return;
    }

    // Zoznam je vzostupný: keď už je načítané id VYŠŠIE než hľadané, prešli
    // sme okolo neho – komentár medzitým zanikol. Ďalšie stránkovanie by
    // nepomohlo.
    const highestLoaded = comments.length ? comments[comments.length - 1].id : 0;
    const passedIt = highestLoaded > highlightCommentId;

    // Cieľ je ZA načítaným koncom, ale server o ďalšej stránke nevie –
    // typicky preto, že komentár vznikol až po poslednom načítaní. Raz sa
    // spýtaj znova, ale KTOROU cestou závisí od veľkosti okna:
    //  - do stropu: `refresh` pokryje celé okno aj to, čo pribudlo za ním,
    //    takže cieľ dorazí rovno v odpovedi,
    //  - nad stropom: taký dopyt sa už do jednej stránky nezmestí, preto sa
    //    len znovu postaví kurzor a ďalej sa stránkuje cez `loadMore`.
    if (
      !passedIt &&
      !hasMore &&
      !loadingMore &&
      highlightRefreshedRef.current !== highlightCommentId
    ) {
      highlightRefreshedRef.current = highlightCommentId;
      highlightSeekingRef.current = true;
      const recheck =
        comments.length > COMMENTS_MAX_POLL_SIZE ? reopenPagination : refresh;
      void recheck()
        .catch(() => undefined)
        .finally(finishSeek);
      return;
    }

    if (
      passedIt ||
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
        (passedIt || !hasMore || highlightPagesRef.current >= HIGHLIGHT_MAX_PAGES)
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
    replyReach,
    finishSeek,
    seekTick,
    hasMore,
    loadMore,
    refresh,
    reopenPagination,
  ]);

  // Keď sa používateľ dostane na koniec sám, indikátor už nemá čo hlásiť.
  const handleListScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distanceToBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
    if (distanceToBottom <= NEAR_BOTTOM_PX) {
      setNewCommentsCount((current) => (current === 0 ? current : 0));
    }
  }, []);

  const handleNewCommentsClick = useCallback(() => {
    scrollToBottomRef.current = null;
    scrollListToBottom('smooth');
    setNewCommentsCount(0);
  }, [scrollListToBottom]);

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
      // Najstarší prvý (poradie z BE) → nový ide na koniec. Vlastný komentár
      // bez animácie: používateľ práve odoslal, čakať na dojazd nemá zmysel.
      scrollToBottomRef.current = 'auto';
      setComments((current) => [...current, created]);
      // Vlastný komentár sa nesmie vrátiť ako „nový" v najbližšom polle.
      markSeen([created]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || t('feed.commentCreateError', 'Komentár sa nepodarilo pridať.');
      toast.error(message);
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
                replies: [...(comment.replies ?? []), created],
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
    <div
      data-comment-id={comment.id}
      className={`flex items-start gap-2.5 rounded-xl transition-colors duration-700 ${
        highlighted === comment.id ? 'bg-purple-100/80 dark:bg-purple-900/30' : ''
      }`}
    >
      <InitialsAvatar
        name={comment.author?.display_name}
        avatarUrl={comment.author?.avatar_url}
        size="xs"
      />
      <div
        className={`min-w-0 flex-1 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800/60 ${
          isReply ? 'text-[13px]' : ''
        }`}
      >
        <p className="text-xs font-semibold text-gray-900 dark:text-white">
          {comment.author?.display_name}
        </p>
        {editingComment === comment.id ? (
          <FeedCommentEditComposer
            initialText={comment.text}
            submitting={editSubmitting}
            onCancel={() => setEditingComment(null)}
            onSubmit={(next) => void handleSubmitEdit(comment, next)}
            testId={`feed-comment-edit-composer-${comment.id}`}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-100">
            {comment.text}
            {/* „Upravené" vidí LEN autor komentára – backend pole nikomu inému
                neposiela, takže tu netreba porovnávať identity. */}
            {comment.is_edited ? (
              <span
                data-testid={`feed-comment-edited-${comment.id}`}
                className="ml-1 align-baseline text-xs text-gray-400 dark:text-gray-500"
              >
                {t('feed.editedMark', '(upravené)')}
              </span>
            ) : null}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <FeedCommentLikeButton postId={postId} comment={comment} />
          {/* „Upraviť" patrí do TOHTO riadku, nie ku košu vpravo: kôš je
              deštruktívna ikona a navyše ho vidí aj autor príspevku pri cudzom
              komentári. Upravovať smie len autor komentára (`can_edit` z BE) a
              týka sa to aj odpovedí, ktoré vlastné „Odpovedať" nemajú. */}
          {comment.can_edit && editingComment !== comment.id ? (
            <button
              type="button"
              onClick={() => setEditingComment(comment.id)}
              data-testid={`feed-comment-edit-${comment.id}`}
              className="rounded-full px-1.5 py-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
            >
              {t('feed.commentEdit', 'Upraviť')}
            </button>
          ) : null}
          {isReply ? null : (
            <button
              type="button"
              onClick={() => {
                setReplyingTo((current) =>
                  current === comment.id ? null : comment.id,
                );
                setReplyText('');
              }}
              data-testid={`feed-comment-reply-${comment.id}`}
              className="rounded-full px-1.5 py-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
            >
              {t('feed.reply', 'Odpovedať')}
            </button>
          )}
          {/* Počet berieme z `replies_count` (celkový, nie len načítaný), takže
              polling ho aktualizuje aj v ZBALENOM stave – sekcia sa pritom
              sama neotvorí. */}
          {!isReply && repliesTotal(comment) > 0 ? (
            <button
              type="button"
              onClick={() => toggleReplies(comment.id)}
              data-testid={`feed-comment-toggle-replies-${comment.id}`}
              aria-expanded={expandedReplies.has(comment.id)}
              className="rounded-full px-1.5 py-1 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:bg-black/5 hover:text-purple-700 hover:underline dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-purple-300"
            >
              {expandedReplies.has(comment.id)
                ? t('feed.repliesHide', 'Skryť odpovede')
                : t('feed.repliesShow', 'Zobraziť odpovede ({n})').replace(
                    '{n}',
                    String(repliesTotal(comment)),
                  )}
            </button>
          ) : null}
        </div>
      </div>
      {comment.can_delete ? (
        <button
          type="button"
          onClick={() => setPendingDelete(comment)}
          aria-label={t('feed.commentDelete', 'Zmazať komentár')}
          title={t('feed.commentDelete', 'Zmazať komentár')}
          className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );

  return (
    <div
      data-testid="feed-post-comments"
      className="border-t border-gray-200/70 px-4 py-3 dark:border-gray-700/60"
    >
      {/* Ohraničený box s vlastným scrollom: stovky komentárov nenaťahujú
          stránku do nekonečna. `overscroll-contain` zastaví reťazenie scrollu
          na stránku pri dosiahnutí konca (podstatné hlavne na mobile).
          tabIndex robí oblasť dostupnou aj z klávesnice (WCAG 2.1.1). */}
      {/* `relative` kvôli indikátoru nových komentárov, ktorý pláva nad
          spodným okrajom zoznamu. */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleListScroll}
          data-testid="feed-comments-scroll"
          role="region"
          aria-label={t('feed.commentsList', 'Komentáre')}
          tabIndex={0}
          className="max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain pr-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
        >
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

                  {/* TRETIA akcia, samostatná od „Odpovedať" aj „Zobraziť
                      odpovede": objaví sa až po rozbalení a len keď je čo
                      dotiahnuť. */}
                  {expandedReplies.has(comment.id) &&
                  (comment.replies?.length ?? 0) <
                    (comment.replies_count ?? 0) ? (
                    <button
                      type="button"
                      onClick={() => void loadMoreReplies(comment.id)}
                      disabled={loadingRepliesFor === comment.id}
                      data-testid={`feed-comment-more-replies-${comment.id}`}
                      className="ml-4 mt-2 pl-3 text-xs font-medium text-gray-500 underline-offset-2 transition-colors hover:text-purple-700 hover:underline disabled:opacity-60 dark:text-gray-400 dark:hover:text-purple-300"
                    >
                      {loadingRepliesFor === comment.id
                        ? t('common.loading', 'Načítavam...')
                        : t('feed.repliesShowMore', 'Zobraziť ďalšie odpovede ({n})')
                            .replace(
                              '{n}',
                              String(
                                (comment.replies_count ?? 0) -
                                  (comment.replies?.length ?? 0),
                              ),
                            )}
                    </button>
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

          {loadingMore ? (
            <ul className="mt-3 space-y-3" data-testid="feed-comments-loading-more">
              {[0, 1].map((key) => (
                <li key={key} className="flex animate-pulse items-start gap-2.5">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-1.5 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800/60">
                    <div className="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {/* Sentinel patrí TEJTO karte – observer je per-inštancia, takže dve
              naraz rozbalené karty si donačítavanie navzájom nespúšťajú.
              Musí byť VNÚTRI scrollovateľného boxu, inak by ho scroll v zozname
              nikdy neposunul do zorného poľa a donačítavanie by sa nespustilo. */}
          <div ref={sentinelRef} aria-hidden="true" data-testid="feed-comments-sentinel" />
        </div>

        {/* Hlásič pre čítačky. Musí byť v DOM STÁLE a meniť sa len jeho obsah:
            aria-live oznamuje zmeny výhradne v prvku, ktorý čítačka sledovala
            UŽ PREDTÝM, takže na regióne, ktorý sa spolu s tlačidlom objaví a
            zmizne, sa oznámenie nespoľahlivo stratí. Vizuálnu rolu má tlačidlo
            nižšie, tento uzol je len pre asistenčné technológie. */}
        <p
          data-testid="feed-comments-new-announcer"
          aria-live="polite"
          className="sr-only"
        >
          {newCommentsCount > 0 ? newCommentsLabel : ''}
        </p>

        {/* Nenápadné upozornenie namiesto vynúteného posunu pohľadu – ukáže sa
            len vtedy, keď používateľ číta vyššie v zozname. */}
        {newCommentsCount > 0 ? (
          <button
            type="button"
            onClick={handleNewCommentsClick}
            data-testid="feed-comments-new-indicator"
            className="absolute inset-x-0 bottom-2 mx-auto flex w-max items-center gap-1.5 rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <polyline points="19 12 12 19 5 12" />
            </svg>
            {newCommentsLabel}
          </button>
        ) : null}
      </div>

      {/* Composer je MIMO scrollovateľnej časti – ostáva viditeľný bez ohľadu
          na to, kde v zozname používateľ je. */}
      <div className="mt-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={2}
          placeholder={t('feed.commentPlaceholder', 'Napíš komentár...')}
          aria-label={t('feed.commentPlaceholder', 'Napíš komentár...')}
          className="w-full resize-y rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/60 dark:border-gray-600 dark:bg-gray-900/50 dark:text-white dark:placeholder-gray-500"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          {isMobile ? null : (
            <DesktopEmojiPickerButton
              ariaLabel={t('feed.emojiPicker', 'Pridať emoji')}
              disabled={submitting}
              onSelect={insertEmoji}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-gray-800 dark:hover:text-purple-300"
            />
          )}
          <span
            data-testid="feed-comment-counter"
            className={`ml-auto text-xs tabular-nums ${
              tooLong
                ? 'font-semibold text-red-600 dark:text-red-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {text.length}/{FEED_COMMENT_MAX_LENGTH}
          </span>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? t('common.sending', 'Odosielam...')
              : t('feed.commentSubmit', 'Pridať')}
          </button>
        </div>
      </div>

      <FeedDestructiveConfirm
        open={pendingDelete !== null}
        isDeleting={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
