'use client';

/**
 * Vnorený náhľad zdieľaného obsahu (ponuka, portfólio, pôvodný príspevok).
 *
 * Vytiahnuté z karty do vlastného súboru, lebo ho teraz kreslia TRI miesta:
 * karta vo feede, desktopové okno detailu a mobilná obrazovka detailu. Vzhľad
 * aj stav „obsah už nie je dostupný" tak majú jedinú implementáciu.
 */

import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FeedPost } from '@/lib/feedApi';
import ExchangeIcon from './FeedExchangeIcon';
import { formatOfferPriceLabel } from './offerPriceLabel';

export default function SharedContentPreview({
  post,
  hideOwner = false,
  onOpenSource,
  interactivePostPreview = false,
}: {
  post: FeedPost;
  hideOwner?: boolean;
  onOpenSource?: () => void;
  /**
   * Aj náhľad zdieľaného PRÍSPEVKU je cieľ kliku.
   *
   * Ponuka a portfólio sú klikateľné odjakživa; mini príspevok nie. Zapínajú
   * si to mobilné obrazovky, kde ťuk kdekoľvek na zdieľanom príspevku niekam
   * vedie. Na desktope ostáva náhľad nekliknuteľný ako doteraz, preto je to
   * voľba volajúceho a nie automatika podľa `onOpenSource`.
   */
  interactivePostPreview?: boolean;
}) {
  const { t, locale } = useLanguage();
  const shared = post.shared_content;
  if (!shared) return null;

  if (post.shared_content_unavailable) {
    return (
      <div
        data-testid="feed-shared-unavailable"
        className="flex items-center gap-3 rounded-xl border border-purple-200/70 bg-white/70 p-3 dark:border-purple-800/40 dark:bg-black/20"
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-6 w-6"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {shared.type === 'offer'
              ? t('feed.sharedOfferUnavailable', 'Táto ponuka už nie je dostupná')
              : shared.type === 'portfolio_item'
                ? t('feed.sharedPortfolioUnavailable', 'Toto portfólio už nie je dostupné')
                : t('feed.sharedPostUnavailable', 'Tento príspevok už nie je dostupný')}
          </p>
          {shared.title || shared.caption ? (
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">
              {shared.title || shared.caption}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  // Zdieľaný VOĽNÝ príspevok – „mini príspevok" (autor + text + fotka),
  // nie „mini ponuka" (náhľad + názov + kategória).
  if (shared.type === 'feed_post') {
    const clickablePostPreview = interactivePostPreview && Boolean(onOpenSource);
    const Wrapper = clickablePostPreview ? 'button' : 'div';
    return (
      // Výraznejší rám než pri ponuke/portfóliu: tu sú „hore" aj „dole"
      // PRÍSPEVKY OD ĽUDÍ, takže bez zreteľného predelu to môže vyzerať,
      // akoby pôvodný autor zdieľal sám seba. Ponuka ani portfólio túto
      // zámenu nevyvolávajú – náhľad je tam očividne iný typ obsahu.
      <Wrapper
        data-testid="feed-shared-post-preview"
        {...(clickablePostPreview
          ? { type: 'button' as const, onClick: onOpenSource }
          : {})}
        className={`w-full rounded-xl border-2 border-purple-300 bg-white/90 p-3 text-left shadow-sm dark:border-purple-700/70 dark:bg-black/30 ${
          clickablePostPreview
            ? 'transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60'
            : ''
        }`}
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-purple-700/80 dark:text-purple-300/80">
          {t('feed.originalPost', 'Pôvodný príspevok')}
        </p>
        {hideOwner ? null : (
          <div className="flex items-center gap-2">
            <InitialsAvatar
              name={shared.owner_display_name}
              avatarUrl={shared.owner?.avatar_url}
              size="xs"
            />
            <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {shared.owner_display_name}
            </span>
          </div>
        )}
        {shared.caption ? (
          <p className="mt-2 line-clamp-4 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
            {shared.caption}
          </p>
        ) : null}
        {shared.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shared.thumbnail_url}
            alt=""
            className="mt-2 max-h-64 w-full rounded-lg object-cover"
          />
        ) : null}
      </Wrapper>
    );
  }

  // Kompaktný náhľad podľa vzoru OfferShareMessageCard z messages: nízky
  // horizontálny riadok s malým obrázkom, celý klikateľný. Fialový obal karty
  // aj „výmena ďalej" hlavička ostávajú – mení sa len tento vnútorný náhľad.
  const isOffer = shared.type === 'offer';
  // Spoločný helper s náhľadom v zdieľacom dialógu – inak by používateľ pri
  // zdieľaní videl inú cenu než tú, čo o chvíľu pristane vo feede.
  const priceLabel = formatOfferPriceLabel(t, locale, shared);

  return (
    <button
      type="button"
      onClick={onOpenSource}
      disabled={!onOpenSource}
      data-testid="feed-shared-compact-preview"
      className="flex w-full items-center gap-3 rounded-xl border border-purple-200/70 bg-white/80 p-2.5 text-left transition-colors hover:bg-white disabled:cursor-default dark:border-purple-800/40 dark:bg-black/20 dark:hover:bg-black/30"
    >
      {shared.thumbnail_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={shared.thumbnail_url}
          alt=""
          className="h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-500 dark:bg-purple-900/40 dark:text-purple-300">
          <ExchangeIcon />
        </span>
      )}
      <span className="min-w-0 flex-1">
        {isOffer && shared.is_seeking !== null ? (
          <span className="block text-[10px] font-black uppercase tracking-[0.12em] text-purple-600 dark:text-purple-300">
            {shared.is_seeking
              ? t('skills.search', 'Hľadám')
              : t('skills.offering', 'Ponúkam')}
          </span>
        ) : null}
        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
          {shared.title}
        </span>
        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
          {shared.owner_display_name}
        </span>
      </span>
      {priceLabel ? (
        <span className="shrink-0 rounded-md border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-xs font-bold tabular-nums text-purple-700 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-300">
          {priceLabel}
        </span>
      ) : null}
    </button>
  );
}
