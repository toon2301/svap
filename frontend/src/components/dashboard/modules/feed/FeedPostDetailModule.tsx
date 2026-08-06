'use client';

/**
 * Detail jedného príspevku (permalink z notifikácií: /dashboard/feed/<id>).
 *
 * Nedostupný príspevok (zmazaný, autor blokovaný/súkromný) nekončí systémovou
 * 404 stránkou – zobrazí sa toast a používateľ sa vráti na Nástenku, rovnaký
 * vzor ako `PortfolioDetailModule.handleItemGone`.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { getFeedPost, type FeedPost } from '@/lib/feedApi';
import FeedPostCard from './FeedPostCard';

const FEED_PATH = '/dashboard/home';

type FeedPostDetailModuleProps = {
  postId: number | null;
  /** Prepnutie modulu bez reloadu (Dashboard drží aktívny modul v stave). */
  onNavigateToFeed?: () => void;
};

export default function FeedPostDetailModule({
  postId,
  onNavigateToFeed,
}: FeedPostDetailModuleProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // `t`, router a callback cez ref – inak by sa efekt reštartoval pri každom
  // rendri rodiča a príspevok by sa načítaval dokola.
  const goneRef = useRef<() => void>(() => {});
  goneRef.current = () => {
    toast.error(t('feed.postUnavailable', 'Tento príspevok už nie je dostupný.'));
    onNavigateToFeed?.();
    router.push(FEED_PATH);
  };

  const load = useCallback(async () => {
    if (!postId) {
      goneRef.current();
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      setPost(await getFeedPost(postId));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      // Presmerovať sa smie LEN pri potvrdenej neexistencii/nedostupnosti.
      // Výpadok siete či 5xx je dočasný – vtedy ponúkni opakovanie, inak by
      // používateľa vyhodilo z permalinku pri chvíľkovom probléme.
      const gone = status === 404 || status === 403 || status === 410;
      setPost(null);
      if (gone) {
        goneRef.current();
      } else {
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div
        data-testid="feed-detail-loading"
        className="mx-auto max-w-2xl animate-pulse space-y-4 py-6"
      >
        <div className="h-64 rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-[#202223]" />
      </div>
    );
  }

  if (failed) {
    return (
      <div
        data-testid="feed-detail-error"
        className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-[#202223]"
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
    );
  }

  if (!post) return null;

  return (
    <motion.section
      data-testid="feed-post-detail"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-2xl py-4 pb-10"
      aria-label={t('feed.postDetail', 'Detail príspevku')}
    >
      {/* Komentáre sú na permalinku rozbalené rovno – používateľ sem prišiel
          z notifikácie o komentári/lajku, takže ich chce vidieť bez ďalšieho kliku. */}
      <FeedPostCard post={post} initialCommentsOpen />
    </motion.section>
  );
}
