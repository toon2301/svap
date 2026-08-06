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
    try {
      setPost(await getFeedPost(postId));
    } catch {
      // 404 (zmazaný / neviditeľný) aj sieťová chyba končia rovnako – bez
      // príspevku nie je čo zobraziť a používateľ nemá kde uviaznuť.
      setPost(null);
      goneRef.current();
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
