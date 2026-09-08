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
 * DVA TVARY, nie dva komponenty:
 *  - ponuka/portfólio = dlaždica s náhľadom a rámom (samostatná vec, na ktorú
 *    sa preklikáva),
 *  - zdieľaný PRÍSPEVOK = holý obsah bez rámu. Pôvodného autora už nesie
 *    riadok nad ním, takže rám by do karty pridal len druhé orámovanie.
 *
 * Karty MIMO Nástenky (ProfileOfferCard, ProfileOfferCardMobile, PortfolioCard)
 * s týmto nemajú nič spoločné a zámerne ostávajú nezmenené: stoja na dátach
 * (galéria, recenzie, otváracie hodiny), ktoré snapshot vo feede nenesie.
 * Náhradu za chýbajúci obrázok si však táto karta požičiava od nich, nech
 * zdieľaná ponuka bez fotky vyzerá ako ponuka bez fotky na profile.
 */

import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
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

/**
 * Náhrada za chýbajúci obrázok.
 *
 * Prevzatá z PÔVODNÝCH kariet, nie vymyslená nanovo: ponuka a dopyt dostanú
 * plochu z `OfferImageCarousel`, portfólio popisok z `PortfolioCard`. Zdieľaná
 * položka bez fotky tak vyzerá rovnako ako tá istá položka na profile.
 */
function MissingImage({ type }: { type: SharedContentCard['type'] }) {
  const { t } = useLanguage();

  if (type === 'portfolio_item') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-500 dark:bg-[#0e0e0f] dark:text-gray-400">
        <span>{t('portfolio.noCoverImage', 'Bez titulnej fotky')}</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 dark:from-[#141415] dark:via-[#0f0f10] dark:to-[#0a0a0b]">
      <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="mb-1.5 h-10 w-10 opacity-60"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 7.5l1.027-1.37A1.5 1.5 0 0 1 9 5.5h6a1.5 1.5 0 0 1 1.223.63L17.25 7.5H19.5A1.5 1.5 0 0 1 21 9v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V9A1.5 1.5 0 0 1 4.5 7.5h2.25Z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
          />
        </svg>
        <span className="text-[11px] uppercase tracking-wide opacity-70">
          {t('skills.noPhoto', 'Bez fotografie')}
        </span>
      </div>
    </div>
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
   * Klik na zdieľaný PRÍSPEVOK mimo jeho fotky.
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
    // Ponuka a portfólio si držia tvar dlaždice aj bez fotky – náhrada je tá
    // istá ako na pôvodnej karte. Zdieľaný príspevok nerezervuje nič: prázdny
    // rámec by ho len natiahol.
    photo = (
      <div className={`relative w-full ${PHOTO_FRAME}`}>
        <MissingImage type={data.type} />
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
    // Zdieľaný príspevok nemá rám, takže ani vnútorné odsadenie – text má
    // začínať tam, kde text karty, nie o kúsok vpravo.
    <div className={`space-y-1 text-left ${isPost ? '' : 'p-3'}`}>
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
  // takže sa karta pod rukami nepremení na iný blok. Platí to pre KAŽDÝ typ:
  // zdieľaný príspevok teda ostáva bez rámu aj keď zdroj zmizol, len stlmený.
  const mutedClass = unavailable ? 'opacity-60 saturate-50' : '';
  const frameClass = `overflow-hidden rounded-2xl border border-purple-200/70 bg-white/80 shadow-sm dark:border-purple-800/40 dark:bg-black/20 ${mutedClass}`;

  let frame;
  if (isPost) {
    // BEZ rámu: pôvodný príspevok je pokračovanie karty, nie bublina v bubline.
    // Text a fotka ostávajú DVA samostatné ciele kliku (tlačidlo v tlačidle je
    // neplatné HTML), preto obal `div`.
    //
    // Poradie „text nad fotkou" je rovnaké pravidlo, aké platí pre voľný
    // príspevok – repost sa tak číta ako pôvodný príspevok.
    frame = (
      <div
        data-testid={unavailable ? 'feed-shared-unavailable' : 'feed-shared-post-preview'}
        className={`space-y-2 ${mutedClass}`}
      >
        {/* Zmiznutý zdroj nie je cieľ kliku – nie je kam ísť. */}
        {onOpenPostPreview && caption && !unavailable ? (
          <button
            type="button"
            onClick={onOpenPostPreview}
            data-testid="feed-shared-post-preview-open"
            className="block w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
          >
            {body}
          </button>
        ) : (
          body
        )}
        {photo}
      </div>
    );
  } else if (unavailable) {
    // Ponuka a portfólio sú dlaždice, takže si rám držia aj bez zdroja –
    // mení sa len stlmenie a náhrada za náhľad, ktorý sa už nedá načítať.
    frame = (
      <div data-testid="feed-shared-unavailable" className={frameClass}>
        {photo ?? (
          <div className={`relative w-full ${PHOTO_FRAME}`}>
            <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-[#0e0e0f] dark:text-gray-500">
              <UnavailableIcon />
            </div>
          </div>
        )}
        {body}
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
