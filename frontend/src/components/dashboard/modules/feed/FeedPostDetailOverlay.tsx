'use client';

/**
 * Okno detailu príspevku – vrstva NAD celou appkou.
 *
 * Otvára sa odkiaľkoľvek (feed, profil, notifikácia) a nič pod sebou
 * neodmountuje: appka sa nenaviguje, len sa navrch vykreslí portál. Po zavretí
 * je teda používateľ presne tam, kde bol, vrátane pozície scrollu.
 *
 * Rozloženie má dva tvary podľa šírky obrazovky:
 *
 *  - NA POČÍTAČI (od 1 024 px): dva stĺpce vedľa seba (`FeedPostDetailSplitLayout`) pri KAŽDOM príspevku –
 *    vľavo hlavička, text, fotka alebo karta a akcie, vpravo výhradne komentáre. Okno je široké 54 rem (864 px).
 *    Pri fotke, ponuke a portfóliu má pevnú výšku 95 % obrazovky (pružná je fotka alebo karta); príspevok len
 *    s textom (aj repost textového príspevku) nemá nič pružné, preto má výšku podľa obsahu (najmenej 20 rem,
 *    najviac 95 % obrazovky; na veľmi nízkej obrazovke je aj minimum najviac 95 % jej výšky) a text voľného
 *    príspevku sa ukáže celý (R73); repost textového príspevku má text zdieľajúceho na desať riadkov a pôvodný text
 *    na päť (R77).
 *  - POD 1 024 px (zúžené okno prehliadača): pôvodné jednostĺpcové rozloženie – pevný blok (hlavička, text,
 *    akcie) sa nikdy nescrolluje a komentáre dostanú všetok zvyšný priestor. Šírku určuje obsah: 864 px pri
 *    fotke, ponuke a portfóliu, 576 px (36 rem) pri texte; úzke je aj okno pri načítaní a pri chybe, takže sa
 *    textový príspevok po načítaní nehýbe (R63).
 *    Robí to `flex` stĺpec s `min-h-0` na komentárovej časti – bez toho by ju
 *    obsah roztiahol a okno by prerástlo obrazovku (flex položka má
 *    predvolene `min-height: auto`).
 *
 * Obsah pevného bloku je TÁ ISTÁ `FeedPostCard` ako vo feede, len vo variante
 * `detail`: hlavička, „..." menu, lajk, počty aj zdieľanie tak majú jedinú
 * implementáciu a stav ostáva spoločný (rovnaký princíp ako
 * `FeedPostComposerModal` vs. `FeedPostCreateScreen` – iný obal, ten istý
 * vnútrajšok).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';
import FeedPostCard from './FeedPostCard';
import FeedPostComments from './FeedPostComments';
import FeedPostDetailSplitLayout, {
  hasVisibleFeedPhoto,
  sharesOfferOrPortfolio,
} from './FeedPostDetailSplitLayout';
import { sharedFeedPostPhoto } from './feedImageSources';
import { useFeedDialog } from './useFeedDialog';
import { usePendingFeedImages } from './usePendingFeedImages';
import { useFeedPostCommentsCount } from './useFeedPostCommentsCount';
import { useFeedCommentDraft } from './useFeedCommentDraft';
import { handleGoneFeedPost } from './feedPostGone';
import { onFeedPostDeleted } from './feedPostDeletedEvents';
import {
  isFeedLandingTargetMounted,
  onFeedShareLanding,
} from './feedShareLanding';
import { requestFeedHomeNavigation } from './feedHomeNavigation';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';

type FeedPostDetailOverlayProps = {
  postId: number;
  highlightCommentId?: number | null;
  onClose: () => void;
};

export default function FeedPostDetailOverlay({
  postId,
  highlightCommentId = null,
  onClose,
}: FeedPostDetailOverlayProps) {
  const { t } = useLanguage();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // Počet komentárov vysiela aj odoberá – okno predtým len vysielalo, takže
  // o zmene z karty pod ním (ani z inej otvorenej vrstvy) nevedelo.
  const {
    commentsCount,
    publishCommentsCount,
    changeCommentsCount,
    countVersionRef,
  } = useFeedPostCommentsCount(postId, 0);
  // Rozpracovaný komentár drží okno: pri prepnutí rozloženia (dva stĺpce ⇄ jeden) sa komentáre odmountujú a ich
  // vlastný text by sa stratil (viď `useFeedCommentDraft`).
  const commentDraft = useFeedCommentDraft(postId);

  // Fokus, Tab trap aj Escape rieši spoločný hook feed dialógov – vrátane
  // poradia vrstiev, takže Escape nad otvoreným prehliadačom fotky (alebo nad
  // zoznamom lajkov) zavrie najprv ten a až ďalšie stlačenie okno.
  //
  // `ready` je tu podstatné: okno sa vykresľuje portálom, takže pri prvom
  // renderi ešte neexistuje uzol, do ktorého by sa dal presunúť fokus.
  const dialogRef = useFeedDialog({
    open: true,
    onClose,
    ready: portalNode !== null,
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  const goneRef = useRef<() => void>(() => {});
  goneRef.current = () => {
    // Spoločné spracovanie: karta zmizne aj z feedu pod oknom (predtým tam
    // ostávala) a toast padne najviac raz.
    handleGoneFeedPost(postId, t);
    onClose();
  };

  /**
   * Poradové číslo načítania. Okno sa pri prepnutí na iný príspevok
   * neodmountuje, takže pomalšia odpoveď na TEN PREDOŠLÝ môže doraziť až
   * potom – bez tejto kontroly by prepísala už zobrazený nový príspevok.
   * Rovnaký vzor ako `loadSeqRef` v komentároch.
   */
  const loadSeqRef = useRef(0);

  const load = useCallback(async () => {
    loadSeqRef.current += 1;
    const seq = loadSeqRef.current;
    // Počet komentárov v momente ODOSLANIA požiadavky. Kým odpoveď cestuje,
    // môže dorásť inde (komentár z karty pod oknom, dopytovanie počtov) –
    // vtedy je snímka z odpovede staršia a nesmie novšie číslo prepísať.
    const countVersion = countVersionRef.current;
    setLoading(true);
    setFailed(false);
    try {
      const loaded = await getFeedPost(postId);
      if (seq !== loadSeqRef.current) return;
      setPost(loaded);
      if (countVersionRef.current === countVersion) {
        publishCommentsCount(loaded.comments_count ?? 0);
      }
    } catch (err) {
      if (seq !== loadSeqRef.current) return;
      const status = (err as { response?: { status?: number } })?.response?.status;
      // Zavrieť sa smie LEN pri potvrdenej nedostupnosti – výpadok siete je
      // dočasný a používateľ si má môcť dať „skúsiť znova".
      const gone = status === 404 || status === 403 || status === 410;
      setPost(null);
      if (gone) goneRef.current();
      else setFailed(true);
    } finally {
      // Aj „načítavam" patrí len aktuálnemu behu – inak by staršia odpoveď
      // zhasla kostru, hoci nový príspevok sa ešte načítava.
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [countVersionRef, postId, publishCommentsCount]);

  useEffect(() => {
    void load();
  }, [load]);

  // Príspevok zmizol (zmazal ho niekto iný, alebo to zistila iná interakcia) –
  // okno nad ním nemá čo zobrazovať.
  useEffect(
    () => onFeedPostDeleted((deletedId) => {
      if (deletedId === postId) onClose();
    }),
    [postId, onClose],
  );

  // Po zdieľaní sa pristáva na Nástenku, nie do detailu – okno sa preto zavrie
  // samo. Jeho záznam histórie ale OSTÁVA: Späť z Nástenky má vrátiť do
  // príspevku, z ktorého sa zdieľalo, a znovuotvorenie z adresy už appka vie
  // (`decideFeedPostEntry`).
  //
  // Preto `keepHistory` (bez vlastného kroku späť – ten by záznam odobral)
  // a na Nástenku sa ide pushom, rovnako ako pri zdieľaní z profilu. Kto
  // navigáciu spustí, závisí od toho, či je feed pod oknom:
  //
  //  - Feed JE na obrazovke: `FeedShareDialog` nenaviguje (nemá prečo), tak
  //    to spraví okno – inak by adresa ostala na ceste zavretého okna.
  //  - Feed na obrazovke NIE JE: navigáciu spustí dialóg hneď po tomto
  //    signáli. Okno ju nesmie zopakovať, vznikli by dva záznamy.
  const postOverlay = useFeedPostOverlay();
  useEffect(
    () =>
      onFeedShareLanding(() => {
        if (!postOverlay) {
          onClose();
          return;
        }
        const feedOnScreen = isFeedLandingTargetMounted();
        postOverlay.close({ keepHistory: true });
        if (feedOnScreen) requestFeedHomeNavigation();
      }),
    [onClose, postOverlay],
  );

  /**
   * ŽIVÝ stav fotiek – ten istý hook, akým si ich sleduje karta vo feede.
   *
   * Musí bežať TU, nad kartou: podľa fotiek sa vyberá rozloženie, takže
   * jednorazová snímka z načítania nestačí. Keby moderácia zamietla jedinú
   * (rozpracovanú) fotku počas otvoreného okna, ostalo by dvojstĺpcové
   * rozloženie s prázdnou médiovou plochou až do zavretia a znovuotvorenia.
   *
   * Karta v okne dostane výsledok hotový (`liveImages`), takže nad tým istým
   * príspevkom nebežia dva pollingy naraz.
   */
  const liveImages = usePendingFeedImages(post);

  /**
   * Dvojstĺpcové rozloženie potrebuje dosť širokú obrazovku, inak by z dvoch stĺpcov ostali dva nepoužiteľne
   * úzke pruhy (R73: obsah príspevku ho už nepodmieňuje).
   *
   * Hranicu určuje `useIsMobile` – tá istá, akou sa rozhoduje, či sa okno
   * vôbec otvorí namiesto celoobrazovkovej stránky (`decideFeedPostEntry`),
   * takže je to appkina existujúca hranica desktop/mobil (lg, 1024 px), nie
   * nová konštanta. Otvorené okno sa pri zúžení prehliadača nezatvára, takže
   * bez tejto podmienky by sa dva stĺpce udržali aj hlboko pod ňou.
   *
   * Pod hranicou platí pôvodné jednostĺpcové rozloženie.
   */
  const isMobile = useIsMobile();
  /**
   * Fotku „na šírku" má aj REPOSTOVANÝ foto príspevok – vo vnorenom náhľade.
   * Vlastné `images` má prázdne (backend ich posiela len pri `free_post`),
   * takže bez tejto vetvy by repost fotky spadol do jednostĺpcového
   * rozloženia, hoci vyzerá ako bežný foto príspevok.
   *
   * Repost TEXTOVÉHO príspevku fotku nemá a jednostĺpcový ostáva správne.
   */
  const hasPhoto =
    hasVisibleFeedPhoto(liveImages) || sharedFeedPostPhoto(post) !== null;
  /** Zdieľaná ponuka alebo portfólio: karta je hlavný obsah okna ako fotka (R53). */
  const sharesCard = sharesOfferOrPortfolio(post);
  /**
   * Široké okno (864 px): na počítači každý príspevok, pod 1 024 px len príspevok s fotkou, ponukou a portfóliom
   * (ostatné majú 576 px).
   *
   * Pod 1 024 px je kým sa príspevok načítava okno vždy úzke, aj keď `post` ešte drží PREDOŠLÝ príspevok (pri
   * prepnutí na iný príspevok sa okno neodmountuje, viď `loadSeqRef`): kostra nesmie dediť rozmery príspevku, ktorý
   * už nie je na obrazovke. Na počítači je široké hneď, takže sa po načítaní nehýbe žiadny druh príspevku. Pri
   * chybe je `post` `null`.
   */
  const wideContent = !isMobile || (!loading && (hasPhoto || sharesCard));
  /** Dva stĺpce: na počítači po načítaní každý príspevok. */
  const splitLayout = !isMobile && !loading && post !== null;
  /** Príspevok len s textom (aj repost textového príspevku): nič pružné, preto výška podľa obsahu a text voľného príspevku celý. */
  const textOnlySplit = splitLayout && !hasPhoto && !sharesCard;
  /**
   * Vypĺňa zdieľaný náhľad zvyšok jednostĺpcového bloku?
   *
   * Platí pre KAŽDÝ zdieľaný obsah, nie len pre ten s fotkou: práve rozdiel
   * medzi „s fotkou" a „bez fotky" spôsoboval, že sa hlavička raz hýbala
   * a inokedy nie. Dvojstĺpcové rozloženie si pružnú časť rieši samo.
   */
  const sharedFillsColumn = Boolean(post?.shared_content);

  if (!portalNode) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-0 sm:p-4"
      role="presentation"
      data-testid="feed-post-overlay-layer"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t('feed.postDetail', 'Detail príspevku')}
        data-testid="feed-post-overlay"
        // Rozmery: šírku určuje obsah. Široké okno (`max-w-[54rem]`, 864 px, o ~29 %
        // viac než pôvodných `max-w-2xl`, 672 px) má na počítači každý príspevok;
        // pod hranicou lg ju majú len príspevky s fotkou, ponukou a portfóliom,
        // text, repost textového príspevku, kostra a chyba pri načítaní majú užšie
        // (`max-w-xl`, 576 px; R53 a R63). Pod hranicou lg ostáva šírka podľa obsahu,
        // mení sa len rozloženie. Výška je pri jednom stĺpci a pri texte len STROP:
        // krátky príspevok drží okno nízke, dlhý ho natiahne až po `95vh`.
        //
        // Prečo práve 95vh: ostávajú 2,5 % viewportu hore aj dole, takže je
        // vidno, že appka pokračuje pod oknom. Nad 640 px výšky obrazovky je
        // `95vh` tesnejšie než `p-4` podkladu (2 × 16 px), takže odstup drží
        // za všetkých bežných okolností práve táto hodnota.
        //
        // `flex` + `overflow-hidden` zaisťujú, že pretečie len komentárová
        // časť nižšie.
        //
        // Pri dvojstĺpcovom rozložení je výška PEVNÁ (`h-[95vh]`, nie strop):
        // pružná fotka v ľavom stĺpci má `flex-1`, ktoré potrebuje definitívnu
        // výšku rodiča – zo `max-h` by vyšla nula. Príspevok len s textom nemá
        // čo pružné, preto ostáva pri strope a drží okno nízke (najmenej 20 rem,
        // aby ani krátky text s jedným komentárom nevyzeral stlačený; R73).
        // Minimum je `min(20rem,95vh)`, nie holé `20rem`: `min-height` prebíja
        // `max-height`, takže by okno pri výške obrazovky pod asi 337 px malo 320 px,
        // presiahlo strop a vycentrované by vyšlo hore aj dole mimo obrazovky
        // (zatváracie „X" by zmizlo); PR #326.
        className={`relative flex w-full flex-col overflow-hidden rounded-none border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:rounded-2xl ${
          wideContent ? 'max-w-[54rem]' : 'max-w-xl'
        } ${splitLayout && !textOnlySplit ? 'h-[95vh]' : 'max-h-[95vh]'}${
          textOnlySplit ? ' min-h-[min(20rem,95vh)]' : ''
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close', 'Zavrieť')}
          data-testid="feed-post-overlay-close"
          className="absolute right-2 top-2 z-10 rounded-full bg-black/40 p-1.5 text-white transition-colors hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>

        {loading ? (
          <div
            data-testid="feed-post-overlay-loading"
            className="animate-pulse space-y-3 p-4"
          >
            <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
          </div>
        ) : failed ? (
          <div
            data-testid="feed-post-overlay-error"
            className="px-6 py-10 text-center"
          >
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
              {t('feed.loadError', 'Nástenku sa nepodarilo načítať.')}
            </p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              {t('feed.retry', 'Skúsiť znova')}
            </button>
          </div>
        ) : post ? (
          splitLayout ? (
            <FeedPostDetailSplitLayout
              post={post}
              liveImages={liveImages}
              commentsCount={commentsCount}
              highlightCommentId={highlightCommentId}
              onDeleted={onClose}
              onPostUpdated={setPost}
              onCommentsCountChange={(delta) =>
                changeCommentsCount(delta)
              }
              onCommentsTotalChange={publishCommentsCount}
              commentDraft={commentDraft}
              textOnly={textOnlySplit}
            />
          ) : (
          <>
            {/* PEVNÝ blok – hlavička, text, fotky, akcie. Nezmenšuje sa
                (`shrink-0`): čo sa do okna nezmestí, odoberá komentárom,
                nie jemu. Okno má v tomto rozložení len strop `max-h`, nie
                pevnú výšku, takže základ `0%` pri `flex-1` sa vyhodnotí ako
                obsah a zmrštenie by sa rozdelilo medzi blok a komentáre
                podľa ich veľkosti: pri štyroch a viac komentároch by sa
                blok zmáčkol a pole na komentár vypadlo pod okno (nález 363).

                Strop `calc(95vh-11rem)` je POISTKA: nechá komentárom 11 rem
                (pole na komentár s odsadením zaberá okolo 9 rem, k tomu
                riadok zoznamu aj pri prázdnom zozname), takže pri veľmi
                nízkom okne sa v bloku doscrolluje a pole na komentár
                ostane celé vidno.

                DVA režimy podľa toho, čo je vnútri pružné:

                - ZDIEĽANÝ obsah: náhľad vie byť vysoký (ponuka s fotkou), tak
                  sa scrolluje ON a hlavička s akciami stoja. Blok je preto
                  ohraničený flex stĺpec (`overflow-hidden`) a karta dostane
                  `fillHeight`, ktorý náhľadu pridelí zvyšok výšky. Bez toho sa
                  pri ponuke S fotkou rozhýbala celá karta, kým pri ponuke BEZ
                  fotky stála – rozdiel, ktorý používateľ nemá ako pochopiť.

                - Voľný príspevok: nemá čo pružné pohltiť zvyšok, takže ostáva
                  pôvodná POISTKA `overflow-y-auto` pre krajný prípad (nízke
                  okno, dlhý rozbalený text): až keď by sa blok nezmestil pod
                  strop, doscrolluje sa v ňom, takže nič neostane
                  nedosiahnuteľné za orezanou hranou okna. */}
            <div
              className={`subtle-scrollbar min-h-0 shrink-0 max-h-[calc(95vh-11rem)] ${
                sharedFillsColumn
                  ? 'flex flex-col overflow-hidden'
                  : 'overflow-y-auto'
              }`}
              data-testid="feed-post-overlay-fixed"
            >
              <FeedPostCard
                post={post}
                variant="detail"
                fillHeight={sharedFillsColumn}
                liveImages={liveImages}
                commentsCount={commentsCount}
                onDeleted={onClose}
                onPostUpdated={setPost}
              />
            </div>

            {/* Jediná scrollovateľná časť za bežných okolností. `min-h`
                plní dve úlohy naraz: ruší automatické minimum flex položky
                (inak by ju obsah roztiahol a okno by prerástlo `max-h-[95vh]`)
                a zároveň drží komentárom podlahu, aby ich pevný blok nad nimi
                nikdy nestlačil na nulu. `flex-col` a `flexFill` odovzdávajú
                výšku zoznamu komentárov flexom, lebo percentuálna výška
                (`h-full`) sa v okne bez pevnej výšky nevyhodnotí. */}
            <div
              className="flex min-h-[7rem] flex-1 flex-col overflow-hidden"
              data-testid="feed-post-overlay-comments"
            >
              <FeedPostComments
                postId={post.id}
                highlightCommentId={highlightCommentId}
                fillHeight
                flexFill
                draft={commentDraft}
                onCountChange={(delta) =>
                  changeCommentsCount(delta)
                }
                onTotalChange={publishCommentsCount}
              />
            </div>
          </>
          )
        ) : null}
      </div>
    </div>,
    portalNode,
  );
}
