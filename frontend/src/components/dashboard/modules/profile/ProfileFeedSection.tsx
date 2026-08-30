'use client';

/**
 * Profilové taby „Príspevky" a „Označený" (Fáza 4.5).
 *
 * Zámerne LEN čítací pohľad: karty, donačítavanie, prázdny/loading/chybový
 * stav. Composer, pull-to-refresh ani „skontrolovať nové" tu nie sú – tie
 * patria Nástenke a druhá kópia by znamenala dve miesta, kde sa správanie
 * môže rozísť.
 *
 * Dáta idú cez `loader` v useFeedInfiniteScroll, takže stránkovanie, dedup
 * podľa id aj guard proti dvojitému donačítaniu sú tie isté ako v hlavnom
 * feede. Viditeľnosť rieši backend – súkromný, blokovaný či neexistujúci
 * profil vráti prázdny zoznam, takže FE nemá čo dopočítavať.
 *
 * Endpointy sú AllowAny, preto sekcia funguje aj pre neprihláseného diváka.
 */

import { useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import FeedCardSkeleton from '../feed/FeedCardSkeleton';
import FeedPostCard from '../feed/FeedPostCard';
import {
  useFeedInfiniteScroll,
  useInfiniteScrollSentinel,
} from '../feed/useFeedInfiniteScroll';
import {
  listUserFeedPosts,
  listUserTaggedFeedPosts,
  type ListFeedPostsParams,
} from '@/lib/feedApi';
import type { ProfileTab } from './profileTypes';

/** Taby, ktoré táto sekcia obsluhuje. */
export type ProfileFeedTab = Extract<ProfileTab, 'posts' | 'tagged'>;

type ProfileFeedSectionProps = {
  activeTab: ProfileTab;
  tab: ProfileFeedTab;
  ownerUserId: number;
  /** Rozlišuje len znenie prázdneho stavu – prístup rieši backend. */
  isOtherUserProfile?: boolean;
};

function ProfileFeedEmptyState({
  tab,
  isOtherUserProfile,
}: {
  tab: ProfileFeedTab;
  isOtherUserProfile: boolean;
}) {
  const { t } = useLanguage();

  // Znenia sú rodovo neutrálne zámerne – slovenské „označený/označená" by
  // polovicu používateľov oslovovalo nesprávne.
  const message =
    tab === 'posts'
      ? t('profile.postsEmpty', 'Zatiaľ žiadne príspevky.')
      : isOtherUserProfile
        ? t(
            'profile.taggedEmptyOther',
            'Tohto používateľa zatiaľ nikto neoznačil v príspevku.',
          )
        : t('profile.taggedEmptyOwn', 'Zatiaľ ťa nikto neoznačil v príspevku.');

  return (
    <div
      data-testid={`profile-feed-empty-${tab}`}
      className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white/60 px-5 py-8 text-center shadow-sm dark:border-gray-800 dark:bg-[#0f0f10]"
    >
      <p className="mx-auto max-w-md text-sm leading-6 text-gray-600 dark:text-gray-400">
        {message}
      </p>
    </div>
  );
}

function ProfileFeedList({
  tab,
  ownerUserId,
  isOtherUserProfile = false,
}: Omit<ProfileFeedSectionProps, 'activeTab'>) {
  const { t } = useLanguage();

  const loader = useCallback(
    (params: ListFeedPostsParams) =>
      tab === 'tagged'
        ? listUserTaggedFeedPosts(ownerUserId, params)
        : listUserFeedPosts(ownerUserId, params),
    [tab, ownerUserId],
  );

  const {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reload,
    removePost,
    isEmpty,
  } = useFeedInfiniteScroll({ loader });

  const sentinelRef = useInfiniteScrollSentinel({
    onIntersect: loadMore,
    // Po zlyhaní observer vypneme – sentinel ostáva vo viewporte, takže by sa
    // inak pokúšal o request v slučke. Tlačidlo nižšie ostáva dostupné.
    enabled: hasMore && !loading && !loadingMore && !error,
  });

  if (loading) {
    return (
      <div
        className="-mx-4 mt-4 space-y-3 sm:mx-0 sm:space-y-4"
        data-testid="profile-feed-loading"
      >
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </div>
    );
  }

  if (error && posts.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center dark:border-gray-700 dark:bg-[#202223]">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {t('feed.loadError', 'Nástenku sa nepodarilo načítať.')}
        </p>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
        >
          {t('feed.retry', 'Skúsiť znova')}
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <ProfileFeedEmptyState tab={tab} isOtherUserProfile={isOtherUserProfile} />
    );
  }

  return (
    // Rovnaké plnošírkové správanie ako vo feede – karta je ten istý komponent.
    <div
      className="-mx-4 mt-4 space-y-3 sm:mx-0 sm:space-y-4"
      data-testid={`profile-feed-list-${tab}`}
    >
      {posts.map((post) => (
        <FeedPostCard
          key={post.id}
          post={post}
          // Zoznam je filtrovaný na „kde je označený VLASTNÍK profilu".
          // Odstránenie MÔJHO označenia teda vyhadzuje príspevok len na
          // mojom vlastnom profile. Na cudzom profile vlastníkov tag ďalej
          // existuje, takže príspevok tam patrí – zmizne iba môj chip.
          onSelfTagRemoved={
            tab === 'tagged' && !isOtherUserProfile ? removePost : undefined
          }
          onDeleted={removePost}
        />
      ))}

      {loadingMore ? <FeedCardSkeleton /> : null}

      {/* Sentinel patrí TEJTO sekcii – v inom tabe je odmountovaná, takže
          donačítavanie nebeží na pozadí. */}
      <div ref={sentinelRef} aria-hidden="true" data-testid="profile-feed-sentinel" />

      {/* Fallback k observeru (prehliadač bez neho, veľmi vysoké okno) a
          zároveň doterajší „Zobraziť ďalšie" vzor appky. */}
      {hasMore && !loadingMore ? (
        <button
          type="button"
          onClick={() => void loadMore()}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-purple-700 dark:border-gray-700 dark:bg-black dark:text-gray-300 dark:hover:bg-gray-900"
        >
          {t('feed.loadMore', 'Zobraziť ďalšie')}
        </button>
      ) : null}

      {error && posts.length > 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t('feed.loadMoreError', 'Ďalšie príspevky sa nepodarilo načítať.')}
        </p>
      ) : null}
    </div>
  );
}

export default function ProfileFeedSection({
  activeTab,
  tab,
  ownerUserId,
  isOtherUserProfile,
}: ProfileFeedSectionProps) {
  // Gate je NAD komponentom s hookmi, nie v ňom: neaktívny tab sa tak vôbec
  // nemountuje a nič nesťahuje. Prvá stránka sa načíta pri otvorení tabu.
  if (activeTab !== tab) return null;

  return (
    // Kľúč vynúti čerstvé načítanie pri prechode na iný profil – `loader`
    // drží useFeedInfiniteScroll cez ref, takže samotná zmena ownerUserId
    // by refetch nespustila a ostali by tu príspevky predošlého profilu.
    <ProfileFeedList
      key={`${tab}-${ownerUserId}`}
      tab={tab}
      ownerUserId={ownerUserId}
      isOtherUserProfile={isOtherUserProfile}
    />
  );
}
