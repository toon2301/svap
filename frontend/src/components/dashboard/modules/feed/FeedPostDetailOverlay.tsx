'use client';

/**
 * Okno detailu príspevku – vrstva NAD celou appkou.
 *
 * Otvára sa odkiaľkoľvek (feed, profil, notifikácia) a nič pod sebou
 * neodmountuje: appka sa nenaviguje, len sa navrch vykreslí portál. Po zavretí
 * je teda používateľ presne tam, kde bol, vrátane pozície scrollu.
 *
 * Rozloženie: pevný blok (hlavička, text, fotky, akcie) sa nikdy nescrolluje,
 * komentáre dostanú všetok zvyšný priestor. Robí to `flex` stĺpec s
 * `min-h-0` na komentárovej časti – bez toho by ju obsah roztiahol a okno by
 * prerástlo obrazovku (flex položka má predvolene `min-height: auto`).
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
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';
import FeedPostCard from './FeedPostCard';
import FeedPostComments from './FeedPostComments';
import { useFeedDialog } from './useFeedDialog';
import { emitFeedPostCounts } from './feedPostCountEvents';

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
  const [commentsCount, setCommentsCount] = useState(0);

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
    toast.error(t('feed.postUnavailable', 'Tento príspevok už nie je dostupný.'));
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
    setLoading(true);
    setFailed(false);
    try {
      const loaded = await getFeedPost(postId);
      if (seq !== loadSeqRef.current) return;
      setPost(loaded);
      setCommentsCount(loaded.comments_count ?? 0);
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
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Počet komentárov drží okno; karta vo feede POD ním o novom komentári inak
  // nevie a po zavretí by ukazovala staré číslo. Až po načítaní – dovtedy je
  // v stave nula, ktorá by karte počet vynulovala.
  useEffect(() => {
    // `post.id !== postId` = v stave je ešte predošlý príspevok; jeho počet by
    // sa poslal pod cudzím identifikátorom.
    if (!post || post.id !== postId) return;
    emitFeedPostCounts({ postId, commentsCount });
  }, [post, postId, commentsCount]);

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
        // Rozmery: `max-w-[54rem]` (864 px) je o ~29 % viac než pôvodných
        // `max-w-2xl` (672 px) – šírka je FIXNÁ pre foto aj text-only variant,
        // nech okno vyzerá rovnako bez ohľadu na obsah. Výška je len STROP:
        // krátky príspevok drží okno nízke, dlhý ho natiahne až po `95vh`.
        //
        // Prečo práve 95vh: ostávajú 2,5 % viewportu hore aj dole, takže je
        // vidno, že appka pokračuje pod oknom. Nad 640 px výšky obrazovky je
        // `95vh` tesnejšie než `p-4` podkladu (2 × 16 px), takže odstup drží
        // za všetkých bežných okolností práve táto hodnota.
        //
        // `flex` + `overflow-hidden` zaisťujú, že pretečie len komentárová
        // časť nižšie.
        className="relative flex max-h-[95vh] w-full max-w-[54rem] flex-col overflow-hidden rounded-none border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-[#0f0f10] sm:rounded-2xl"
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
          <>
            {/* PEVNÝ blok – hlavička, text, fotky, akcie. Za bežných
                okolností sa nescrolluje: komentáre pod ním majú `flex-1` so
                základom 0, takže si berú až to, čo zvýši.

                `overflow-y-auto` je POISTKA pre krajný prípad (nízke okno,
                dlhý rozbalený text): až keď by sa blok sám nezmestil, zmrští
                sa a doscrolluje sa v ňom, takže nič neostane nedosiahnuteľné
                za orezanou hranou okna. */}
            <div
              className="min-h-0 overflow-y-auto"
              data-testid="feed-post-overlay-fixed"
            >
              <FeedPostCard
                post={post}
                variant="detail"
                commentsCount={commentsCount}
                onDeleted={onClose}
              />
            </div>

            {/* Jediná scrollovateľná časť za bežných okolností. `min-h`
                plní dve úlohy naraz: ruší automatické minimum flex položky
                (inak by ju obsah roztiahol a okno by prerástlo `max-h-[90vh]`)
                a zároveň drží komentárom podlahu, aby ich pevný blok nad nimi
                nikdy nestlačil na nulu. */}
            <div
              className="min-h-[7rem] flex-1 overflow-hidden"
              data-testid="feed-post-overlay-comments"
            >
              <FeedPostComments
                postId={post.id}
                highlightCommentId={highlightCommentId}
                fillHeight
                onCountChange={(delta) =>
                  setCommentsCount((count) => Math.max(0, count + delta))
                }
                onTotalChange={setCommentsCount}
              />
            </div>
          </>
        ) : null}
      </div>
    </div>,
    portalNode,
  );
}
