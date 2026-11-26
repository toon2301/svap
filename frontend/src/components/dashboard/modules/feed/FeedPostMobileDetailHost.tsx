'use client';

/**
 * Hostiteľ mobilnej obrazovky detailu príspevku, ktorú otvára upozornenie alebo adresa príspevku (nález 360, R82).
 *
 * Obrazovku (`FeedPostMobileDetail`) dosiaľ otvárala len karta, ktorá príspevok už mala. Z upozornenia alebo z adresy
 * `/dashboard/feed/<id>` je známe len číslo príspevku (a pri komentári aj číslo komentára), takže ho hostiteľ najprv načíta
 * a až potom obrazovku ukáže. Je to mobilný náprotivok okna detailu na počítači (`FeedPostDetailOverlay`) a drží rovnaké
 * pravidlá, každé s jedným miestom pravdy v spoločných moduloch:
 *
 *  - načítanie je očíslované: odpoveď na PREDOŠLÝ príspevok (druhé upozornenie na iný príspevok) neprepíše nový;
 *  - príspevok, ktorý je zmazaný alebo na ktorý niet prístupu (404, 403, 410), sa spracuje spoločne (`handleGoneFeedPost`:
 *    zmizne zo zoznamov a hláška padne najviac raz) a obrazovka sa zatvorí; iná chyba (sieť) ponúkne „Skúsiť znova";
 *  - zmazanie príspevku (aj z inej vrstvy) obrazovku zatvorí;
 *  - po zdieľaní sa pristáva na Nástenke (`feedShareLanding`): obrazovka sa zatvorí so záznamom v histórii, aby na neho
 *    viedlo Späť z Nástenky, a keď je Nástenka na obrazovke, hostiteľ ju sám zobrazí (dialóg zdieľania nenaviguje);
 *  - odchod na profil alebo na zdroj zdieľaného obsahu zatvára obrazovku `keepHistory` (`onLeave`): krok späť po bežnom
 *    zatvorení by navigáciu vzápätí zrušil.
 *
 * Bežné zatvorenie (X, Escape, zmazanie) volá `onClose`, ktorým dashboard zatvorí cieľ a vráti záznam v histórii.
 * Kým sa príspevok načítava, a keď načítanie zlyhá, ukazuje sa celoobrazovkový stav s tlačidlom X (rovnaké texty a kostra
 * ako v okne na počítači), aby sa dalo zrušiť aj čakanie.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';
import FeedPostMobileDetail from './FeedPostMobileDetail';
import { useFeedDialog } from './useFeedDialog';
import { handleGoneFeedPost, isFeedPostGoneError } from './feedPostGone';
import { onFeedPostDeleted } from './feedPostDeletedEvents';
import { isFeedLandingTargetMounted, onFeedShareLanding } from './feedShareLanding';
import { requestFeedHomeNavigation } from './feedHomeNavigation';
import { useFeedPostOverlay } from '../../contexts/FeedPostOverlayContext';

type FeedPostMobileDetailHostProps = {
  postId: number;
  /** Komentár z upozornenia: obrazovka naň doscrolluje a zvýrazní ho. */
  highlightCommentId?: number | null;
  onClose: () => void;
};

export default function FeedPostMobileDetailHost({
  postId,
  highlightCommentId = null,
  onClose,
}: FeedPostMobileDetailHostProps) {
  const { t } = useLanguage();
  const postOverlay = useFeedPostOverlay();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalNode(document.getElementById('app-root') ?? document.body);
  }, []);

  /**
   * Poradové číslo načítania. Hostiteľ sa pri prepnutí na iný príspevok neodmountuje, takže pomalšia odpoveď na PREDOŠLÝ
   * príspevok môže doraziť až potom; bez tejto kontroly by prepísala už zobrazený nový príspevok.
   */
  const loadSeqRef = useRef(0);
  // Zmiznutý príspevok: `handleGoneFeedPost` ho odstráni zo zoznamov a vyšle signál zmiznutia VŽDY, na ktorý sa obrazovka zatvára
  // (počúva ho efekt nižšie), takže sa tu nezatvára druhýkrát.
  const goneRef = useRef<() => void>(() => {});
  goneRef.current = () => handleGoneFeedPost(postId, t);

  const load = useCallback(async () => {
    loadSeqRef.current += 1;
    const seq = loadSeqRef.current;
    setLoading(true);
    setFailed(false);
    try {
      const loaded = await getFeedPost(postId);
      if (seq !== loadSeqRef.current) return;
      setPost(loaded);
    } catch (error) {
      if (seq !== loadSeqRef.current) return;
      setPost(null);
      // Zavrieť sa smie LEN pri potvrdenej nedostupnosti: výpadok siete je dočasný a používateľ si má môcť dať „skúsiť znova".
      if (isFeedPostGoneError(error)) goneRef.current();
      else setFailed(true);
    } finally {
      // Aj „načítavam" patrí len aktuálnemu behu, inak by staršia odpoveď zhasla kostru nového načítania.
      if (seq === loadSeqRef.current) setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Príspevok zmizol (zmazal ho niekto iný, alebo to zistila iná interakcia): obrazovka nad ním nemá čo ukazovať.
  useEffect(
    () =>
      onFeedPostDeleted((deletedId) => {
        if (deletedId === postId) onClose();
      }),
    [postId, onClose],
  );

  // Po zdieľaní sa pristáva na Nástenke, nie v detaile. Záznam histórie ostáva (`keepHistory`), nech na príspevok, z ktorého
  // sa zdieľalo, vedie Späť z Nástenky. Keď je Nástenka na obrazovke, dialóg zdieľania nenaviguje, takže ju zobrazí hostiteľ;
  // keď nie je, navigáciu spustí dialóg hneď po tomto signáli a hostiteľ ju nesmie zopakovať (vznikli by dva záznamy).
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

  // Odchod na profil alebo na zdroj zdieľaného obsahu: zatvorenie bez kroku späť (`keepHistory`).
  const leave = useCallback(() => {
    if (postOverlay) postOverlay.close({ keepHistory: true });
    else onClose();
  }, [onClose, postOverlay]);

  const showShell = loading || failed || post === null;
  // Fokus, Tab trap a Escape stavu načítavania; hotovú obrazovku si drží `FeedPostMobileDetail` sama.
  const dialogRef = useFeedDialog({ open: showShell, onClose, ready: portalNode !== null });

  if (!portalNode) return null;

  if (!showShell && post) {
    return (
      <FeedPostMobileDetail
        post={post}
        highlightCommentId={highlightCommentId}
        onClose={onClose}
        onLeave={leave}
        onPostUpdated={setPost}
      />
    );
  }

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={t('feed.postDetail', 'Detail príspevku')}
      data-testid="feed-mobile-detail-host"
      className="fixed inset-0 z-[111] flex flex-col bg-white focus:outline-none dark:bg-[#0f0f10]"
    >
      <header className="flex shrink-0 items-center border-b border-gray-200 px-3 py-2 dark:border-gray-800">
        <button
          type="button"
          onClick={onClose}
          data-testid="feed-mobile-detail-host-close"
          aria-label={t('common.close', 'Zavrieť')}
          className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-gray-400 dark:hover:bg-white/10"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </header>
      {failed ? (
        <div data-testid="feed-mobile-detail-host-error" className="px-6 py-10 text-center">
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
      ) : (
        <div data-testid="feed-mobile-detail-host-loading" className="animate-pulse space-y-3 p-4">
          <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      )}
    </div>,
    portalNode,
  );
}
