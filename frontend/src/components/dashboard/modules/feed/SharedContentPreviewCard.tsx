'use client';

/**
 * JEDNA karta zdieľaného obsahu na Nástenke – ponuka, portfólio aj príspevok.
 *
 * Kreslí ju feed zoznam, detail príspevku (desktopové okno v oboch layoutoch
 * aj mobilná obrazovka) a dialóg zdieľania. Preto berie normalizovaný
 * `SharedContentCard` (viď sharedContentCard.ts), nie `FeedPost` – dialóg
 * zdieľa niečo, čo príspevkom ešte len bude, a napriek tomu má ukázať presne
 * tú istú kartu.
 *
 * Karty MIMO Nástenky (ProfileOfferCard, ProfileOfferCardMobile, PortfolioCard)
 * s týmto nemajú nič spoločné a zámerne ostávajú nezmenené: stoja na dátach
 * (galéria, recenzie, otváracie hodiny), ktoré snapshot vo feede nenesie.
 */

import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import ExchangeIcon from './FeedExchangeIcon';
import { formatOfferPriceLabel } from './offerPriceLabel';
import type { SharedContentCard } from './sharedContentCard';

/** Výška náhľadu obrázka. Jedna hodnota pre všetky typy aj všetky kontexty. */
const PHOTO_FRAME = 'h-64';

function UnavailableIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-7 w-7"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
    </svg>
  );
}

export default function SharedContentPreviewCard({
  data,
  hideOwner = false,
  onOpenSource,
  onOpenPostPreview,
  onOpenPostPhoto,
}: {
  data: SharedContentCard | null;
  /** Zdieľa sám seba: meno by sa zopakovalo hneď pod hlavičkou karty. */
  hideOwner?: boolean;
  /** Klik na kartu ponuky/portfólia – vedie rovno na zdroj. */
  onOpenSource?: () => void;
  /**
   * Klik na kartu zdieľaného PRÍSPEVKU mimo jeho fotky.
   *
   * Ponuka a portfólio vedú rovno na zdroj; mini príspevok je ukážka obsahu,
   * ku ktorému sa zdieľajúci vyjadril, takže tu volajúci rozhoduje sám – na
   * mobile detail zdieľajúceho, na desktope nič.
   */
  onOpenPostPreview?: () => void;
  /**
   * Klik PRIAMO na fotku vnútri repostu.
   *
   * Fotka patrí PÔVODNÉMU príspevku, takže vedie do jeho fotoprehliadača – nie
   * do detailu zdieľajúceho. Preto samostatný cieľ kliku vedľa
   * `onOpenPostPreview`, nie jeden spoločný na celej karte.
   */
  onOpenPostPhoto?: () => void;
}) {
  const { t, locale } = useLanguage();
  if (!data) return null;

  const isPost = data.type === 'feed_post';
  const isOffer = data.type === 'offer';
  const unavailable = data.unavailable === true;
  // Spoločný helper s dialógom zdieľania – inak by používateľ pri zdieľaní
  // videl inú cenu než tú, čo o chvíľu pristane vo feede.
  const priceLabel = formatOfferPriceLabel(t, locale, data.price);
  const title = (data.title || '').trim();
  const caption = (data.caption || '').trim();
  const meta = (data.meta || '').trim();

  const unavailableText = isOffer
    ? t('feed.sharedOfferUnavailable', 'Táto ponuka už nie je dostupná')
    : data.type === 'portfolio_item'
      ? t('feed.sharedPortfolioUnavailable', 'Toto portfólio už nie je dostupné')
      : t('feed.sharedPostUnavailable', 'Tento príspevok už nie je dostupný');

  // Ponúkam/Hľadám sedí NA náhľade, nie v texte pod ním: pri ponuke je to prvá
  // vec, ktorú treba prečítať, a nad obrázkom ju nikto neprehliadne.
  const typeBadge =
    isOffer && data.isSeeking !== null && data.isSeeking !== undefined ? (
      <span
        data-testid="feed-shared-card-kind"
        className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-purple-700 shadow-sm dark:bg-black/80 dark:text-purple-200"
      >
        {data.isSeeking ? t('skills.search', 'Hľadám') : t('skills.offering', 'Ponúkam')}
      </span>
    ) : null;

  let photo = null;
  if (data.thumbnailUrl) {
    // Rámec má PEVNÚ výšku a fotka sa doň vkladá cez `object-contain`
    // s rozmazaným pozadím – ten istý `BlurredContainImage`, aký používa
    // karusel príspevku. `object-cover` by fotku orezal.
    photo = (
      <div className={`relative w-full ${PHOTO_FRAME}`}>
        {onOpenPostPhoto ? (
          <button
            type="button"
            onClick={onOpenPostPhoto}
            data-testid="feed-shared-post-photo"
            aria-label={t('feed.imageOpen', 'Otvoriť fotku na celú obrazovku')}
            className="block h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400/60"
          >
            <BlurredContainImage src={data.thumbnailUrl} alt="" loading="lazy" />
          </button>
        ) : (
          <BlurredContainImage src={data.thumbnailUrl} alt="" loading="lazy" />
        )}
        {typeBadge}
      </div>
    );
  } else if (!isPost) {
    // Ponuka a portfólio bez obrázka dostanú nízky pásik: tvar karty ostáva,
    // ale prázdne miesto na celú výšku náhľadu nevzniká. Textový repost
    // nerezervuje nič – prázdny rámec by kartu len natiahol.
    photo = (
      <div className="relative flex h-32 w-full items-center justify-center bg-purple-50 text-purple-400 dark:bg-purple-950/30 dark:text-purple-500/70">
        {unavailable ? <UnavailableIcon /> : <ExchangeIcon />}
        {typeBadge}
      </div>
    );
  }

  const priceBadge = priceLabel ? (
    <span
      data-testid="feed-shared-card-price"
      className="shrink-0 rounded-md border border-purple-100 bg-purple-50 px-1.5 py-0.5 text-xs font-bold tabular-nums text-purple-700 dark:border-purple-800/30 dark:bg-purple-900/20 dark:text-purple-300"
    >
      {priceLabel}
    </span>
  ) : null;

  const body = (
    <div className="space-y-1 p-3 text-left">
      {isPost ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-700/80 dark:text-purple-300/80">
          {t('feed.originalPost', 'Pôvodný príspevok')}
        </p>
      ) : null}

      {unavailable ? (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {unavailableText}
        </p>
      ) : null}

      {title || priceBadge ? (
        <div className="flex items-start gap-2">
          {title ? (
            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-900 dark:text-white">
              {title}
            </span>
          ) : (
            // Cena bez názvu (ponuka s nevyplneným titulkom) by inak zmizla.
            <span className="min-w-0 flex-1" />
          )}
          {priceBadge}
        </div>
      ) : null}

      {meta ? (
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{meta}</p>
      ) : null}

      {caption ? (
        <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
          {caption}
        </p>
      ) : null}
    </div>
  );

  // Stlmenie je JEDINÝ rozdiel nedostupného zdroja – layout ostáva ten istý,
  // takže sa karta pod rukami nepremení na iný blok.
  const frameClass = `overflow-hidden rounded-2xl border border-purple-200/70 bg-white/80 shadow-sm dark:border-purple-800/40 dark:bg-black/20 ${
    unavailable ? 'opacity-60 saturate-50' : ''
  }`;

  let frame;
  if (unavailable) {
    frame = (
      <div data-testid="feed-shared-unavailable" className={frameClass}>
        {photo}
        {body}
      </div>
    );
  } else if (isPost) {
    // Fotka a zvyšok karty sú DVA samostatné ciele kliku, nie vnorené tlačidlá
    // (tlačidlo v tlačidle je neplatné HTML). Obal preto ostáva `div`.
    frame = (
      <div data-testid="feed-shared-post-preview" className={frameClass}>
        {photo}
        {onOpenPostPreview ? (
          <button
            type="button"
            onClick={onOpenPostPreview}
            data-testid="feed-shared-post-preview-open"
            className="block w-full text-left transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400/60 dark:hover:bg-black/30"
          >
            {body}
          </button>
        ) : (
          body
        )}
      </div>
    );
  } else {
    frame = (
      <button
        type="button"
        onClick={onOpenSource}
        disabled={!onOpenSource}
        data-testid="feed-shared-compact-preview"
        className={`block w-full text-left transition-colors hover:bg-white disabled:cursor-default dark:hover:bg-black/30 ${frameClass}`}
      >
        {photo}
        {body}
      </button>
    );
  }

  return (
    <div data-testid="feed-shared-card" data-shared-type={data.type}>
      {/* Pôvodný vlastník stojí NAD kartou – obsah patrí jemu, nie tomu, kto
          ho zdieľa. Pri zdieľaní seba samého sa vynecháva: meno už nesie
          hlavička karty ("Znovu zdieľané"), druhýkrát by mýlilo. */}
      {data.owner && !hideOwner ? (
        <div
          data-testid="feed-shared-card-owner"
          className="mb-2 flex items-center gap-2"
        >
          <InitialsAvatar
            name={data.owner.displayName}
            avatarUrl={data.owner.avatarUrl}
            size="xs"
          />
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {data.owner.displayName}
          </span>
        </div>
      ) : null}
      {frame}
    </div>
  );
}
