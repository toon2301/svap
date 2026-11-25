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
 * RIADOK PÔVODNÉHO AUTORA (avatar a meno nad kartou) je tlačidlo, ktoré otvorí jeho profil (`onOpenOwner`, nález 362), keď
 * volajúci vlastnosť zadá, zdroj je dostupný a vlastník má id alebo adresu profilu; inak ostáva obyčajný `div` ako predtým
 * (náhľad v dialógu zdieľania, nedostupný zdroj). Stojí MIMO tlačidla náhľadu, lebo tlačidlo v tlačidle je neplatné HTML.
 *
 * Karty MIMO Nástenky (ProfileOfferCard, ProfileOfferCardMobile, PortfolioCard)
 * s týmto nemajú nič spoločné a zámerne ostávajú nezmenené: stoja na dátach
 * (galéria, recenzie, otváracie hodiny), ktoré snapshot vo feede nenesie.
 * Náhradu za chýbajúci obrázok si však táto karta požičiava od nich, nech
 * zdieľaná ponuka bez fotky vyzerá ako ponuka bez fotky na profile.
 *
 * PRUŽNÁ PLOCHA (`fillHeight`): v ľavom stĺpci dvojstĺpcového okna detailu je plocha náhľadu ponuky a portfólia
 * (fotka, náhrada aj ikona nedostupného zdroja) pružná: vyplní zvyšok stĺpca a nezmenší sa pod 8 rem (128 px),
 * rovnako ako médiová plocha príspevku s fotkou (R53, R68). Platí aj pre zdieľaný príspevok, ale len keď má fotku;
 * bez nej alebo so zlyhaným náhľadom ju `fillHeight` neovplyvní (nie je čo naťahovať). Repost s fotkou rozpúšťa obal
 * karty aj rám (`display: contents`), aby text zdieľajúceho, meno pôvodného autora, pôvodný text a plocha fotky boli
 * súrodenci jedného flex stĺpca bloku: pružné zmenšovanie funguje len medzi priamymi súrodencami, takže len tak texty
 * ustúpia a blok sa neposúva. Všade inde (feed, dialóg zdieľania, jednostĺpcové okno) ostáva výška 256 px.
 */

import { useState, type ReactNode } from 'react';
import { useFeedDetailTextOnly } from './FeedDetailTextOnlyContext';
import FeedPostCaption, { CARD_CAPTION_LINES } from './FeedPostCaption';
import InitialsAvatar from '@/components/shared/InitialsAvatar';
import { useLanguage } from '@/contexts/LanguageContext';
import BlurredContainImage from '../shared/BlurredContainImage';
import { canOpenUserProfile } from './feedProfileNavigation';
import { formatOfferPriceLabel } from './offerPriceLabel';
import type { SharedContentCard } from './sharedContentCard';

/** Výška náhľadu obrázka. Jedna hodnota pre všetky typy aj všetky kontexty. */
const PHOTO_FRAME = 'h-64';

/** Pružná plocha náhľadu v dvojstĺpcovom okne: vyplní zvyšok stĺpca, najmenej však 8 rem (128 px). */
const PHOTO_FRAME_FILL = 'min-h-32 flex-1';

/**
 * Pôvodný text reposta v okne príspevku len s textom (R73, R77): nič tu nesúperí o miesto, preto päť riadkov a „Viac" od
 * šiesteho (predtým bol celý). Všade inde (feed, mobilný detail, repost s fotkou v okne) ostávajú tri riadky ako karta.
 */
const TEXT_ONLY_ORIGINAL_CAPTION_LINES = 5;

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

/**
 * Jedna karta zdieľaného obsahu (ponuka, portfólio alebo príspevok). Náhľad, ktorý sa nepodarilo načítať (napr. po
 * zmazaní pôvodnej fotky), nahrádza náhradou namiesto pokazeného obrázka.
 */
export default function SharedContentPreviewCard({
  data,
  hideOwner = false,
  onOpenOwner,
  onOpenSource,
  onOpenPostPreview,
  onOpenPostPhoto,
  fillHeight = false,
}: {
  data: SharedContentCard | null;
  /** Zdieľa sám seba: meno by sa zopakovalo hneď pod hlavičkou karty. */
  hideOwner?: boolean;
  /**
   * Klik na avatar alebo meno pôvodného autora (riadok nad kartou): otvorí jeho profil. Riadok je tlačidlo len keď je
   * vlastnosť zadaná, zdroj je dostupný a vlastník má id alebo adresu profilu (`SharedContentCardOwner`); inak ostáva
   * obyčajný `div`. Dialóg zdieľania ju nezadáva, takže náhľad v ňom sa nepreklikáva.
   */
  onOpenOwner?: () => void;
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
  /**
   * Ľavý stĺpec dvojstĺpcového okna s pevnou výškou: plocha náhľadu ponuky a portfólia vyplní zvyšok stĺpca.
   * Pre zdieľaný príspevok sa ignoruje.
   */
  fillHeight?: boolean;
}) {
  const { t, locale } = useLanguage();
  // Adresa náhľadu, ktorú sa nepodarilo načítať. Porovnáva sa s aktuálnou adresou, takže karta, ktorej sa náhľad
  // zmení na inú fotku, chybu nezdedí.
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  // Okno príspevku len s textom (R73, R77): pôvodný text reposta má päť riadkov namiesto troch.
  const textOnly = useFeedDetailTextOnly();
  if (!data) return null;

  const isPost = data.type === 'feed_post';
  const isOffer = data.type === 'offer';
  const unavailable = data.unavailable === true;
  // Riadok pôvodného autora je tlačidlo len keď sa z neho dá prekliknúť: volajúci zadal `onOpenOwner`, zdroj je dostupný
  // (pri nedostupnom backend vlastníka neposiela, snapshot nesie len meno) a vlastník má id alebo adresu profilu.
  const ownerOpensProfile =
    Boolean(onOpenOwner) &&
    !unavailable &&
    canOpenUserProfile({ id: data.owner?.id ?? 0, slug: data.owner?.slug ?? null });
  const thumbnailFailed = Boolean(data.thumbnailUrl) && failedThumbnail === data.thumbnailUrl;
  // Pružná plocha: ponuka a portfólio vždy, zdieľaný príspevok len vtedy, keď má fotku (bez nej nie je čo naťahovať).
  const hasPhotoPlane = Boolean(data.thumbnailUrl) && !thumbnailFailed;
  const stretch = fillHeight && (!isPost || hasPhotoPlane);
  // Repost s fotkou: obal aj rám sa rozpustia, aby texty a fotka zdieľali jeden flex stĺpec bloku.
  const flatten = stretch && isPost;
  const photoFrame = stretch ? PHOTO_FRAME_FILL : PHOTO_FRAME;
  // Pri pružnej ploche obsah vypĺňa rám absolútne, nezávisle od toho, ako prehliadač rátá percentá výšky vo flex položke.
  const fillContent = (node: ReactNode) =>
    stretch ? <div className="absolute inset-0">{node}</div> : node;
  /** Náhľad sa nenačítal (napr. pôvodná fotka je zmazaná): karta ukáže náhradu namiesto pokazeného obrázka. */
  const handleThumbnailError = () => setFailedThumbnail(data.thumbnailUrl ?? null);
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
  if (data.thumbnailUrl && !thumbnailFailed) {
    // Rámec má PEVNÚ výšku a fotka sa doň vkladá cez `object-contain`
    // s rozmazaným pozadím – ten istý `BlurredContainImage`, aký používa
    // karusel príspevku. `object-cover` by fotku orezal.
    photo = (
      <div
        data-testid="feed-shared-card-media"
        className={`relative w-full ${photoFrame}`}
      >
        {fillContent(onOpenPostPhoto ? (
          <button
            type="button"
            onClick={onOpenPostPhoto}
            data-testid="feed-shared-post-photo"
            aria-label={t('feed.imageOpen', 'Otvoriť fotku na celú obrazovku')}
            className="block h-full w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400/60"
          >
            <BlurredContainImage
              src={data.thumbnailUrl}
              alt=""
              loading="lazy"
              onError={handleThumbnailError}
            />
          </button>
        ) : (
          <BlurredContainImage
            src={data.thumbnailUrl}
            alt=""
            loading="lazy"
            onError={handleThumbnailError}
          />
        ))}
        {typeBadge}
      </div>
    );
  } else if (!isPost && !(unavailable && thumbnailFailed)) {
    // Ponuka a portfólio si držia tvar dlaždice aj bez fotky – náhrada je tá
    // istá ako na pôvodnej karte. Zdieľaný príspevok nerezervuje nič: prázdny
    // rámec by ho len natiahol.
    //
    // Zlyhaný náhľad sa správa ako chýbajúci (zmazaná fotka): ponuka a portfólio
    // dostanú náhradu, príspevok nič. Výnimka je nedostupný zdroj so zlyhaným
    // náhľadom: `photo` ostáva `null`, takže platí ikona nedostupného zdroja nižšie.
    photo = (
      <div
        data-testid="feed-shared-card-media"
        className={`relative w-full ${photoFrame}`}
      >
        {fillContent(<MissingImage type={data.type} />)}
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

  // Text pôvodného príspevku: rovnaké „Viac"/„Menej" ako text karty (3 riadky, v okne len s textom 5; „Viac" len pri
  // presahu). Obal s prekliknutím na pôvodný príspevok je len okolo ODSEKU; prepínač stojí mimo neho, lebo tlačidlo v
  // tlačidle je neplatné HTML a ťuk na „Viac" nemá nič otvárať. Len zdieľaný príspevok: popis ponuky a portfólia rieši
  // `tileCaptionNode`.
  const captionNode = caption && isPost ? (
    <FeedPostCaption
      text={caption}
      testId="feed-shared-caption"
      maxLines={textOnly ? TEXT_ONLY_ORIGINAL_CAPTION_LINES : CARD_CAPTION_LINES}
      boundedExpansion={flatten}
      fillParent={flatten}
      collapseBlankLines
      wrapText={
        isPost && onOpenPostPreview && !unavailable
          ? (paragraph) => (
              <button
                type="button"
                onClick={onOpenPostPreview}
                data-testid="feed-shared-post-preview-open"
                className="block w-full rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60"
              >
                {paragraph}
              </button>
            )
          : undefined
      }
    />
  ) : null;

  // Ponuka a portfólio: dlaždica je TLAČIDLO (ťuk vedie na zdroj), takže popis, ak by prišiel (backend ho pri nich posiela
  // prázdny), je obyčajný odsek bez prepínača, rovnaký ako pred K58. „Viac" v tlačidle je neplatné HTML a jeho ťuk by prešiel
  // na dlaždicu a otvoril zdroj namiesto rozbalenia textu.
  const tileCaptionNode =
    caption && !isPost ? (
      <p
        data-testid="feed-shared-caption"
        className="line-clamp-4 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200"
      >
        {caption}
      </p>
    ) : null;

  const body = (
    // Zdieľaný príspevok nemá rám, takže ani vnútorné odsadenie – text má
    // začínať tam, kde text karty, nie o kúsok vpravo.
    <div className={`space-y-1 text-left ${isPost ? '' : 'p-3'}${stretch ? ' shrink-0' : ''}`}>
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

      {/* Text zdieľaného PRÍSPEVKU ide mimo tela (viď `captionNode`); ponuka a portfólio ho posielajú prázdny. */}
      {tileCaptionNode}
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
        className={flatten ? `contents ${mutedClass}` : `space-y-2 ${mutedClass}`}
      >
        {/* Telo (nedostupný zdroj, názov, meta, cena) zdieľaný príspevok zvyčajne nemá. Zmiznutý zdroj nie je cieľ
            kliku – nie je kam ísť, preto sa v ňom text neobaľuje (viď `wrapText` v `captionNode`). */}
        {unavailable || title || meta || priceBadge ? body : null}
        {captionNode}
        {photo}
      </div>
    );
  } else if (unavailable) {
    // Ponuka a portfólio sú dlaždice, takže si rám držia aj bez zdroja –
    // mení sa len stlmenie a náhrada za náhľad, ktorý sa už nedá načítať.
    frame = (
      <div
        data-testid="feed-shared-unavailable"
        className={`${frameClass}${stretch ? ' flex flex-1 flex-col' : ''}`}
      >
        {photo ?? (
          <div
            data-testid="feed-shared-card-media"
            className={`relative w-full ${photoFrame}`}
          >
            {fillContent(
              <div
                data-testid="feed-shared-unavailable-icon"
                className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400 dark:bg-[#0e0e0f] dark:text-gray-500"
              >
                <UnavailableIcon />
              </div>,
            )}
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
        className={`${stretch ? 'flex flex-1 flex-col' : 'block'} w-full text-left transition-colors hover:bg-white disabled:cursor-default dark:hover:bg-black/30 ${frameClass}`}
      >
        {photo}
        {body}
      </button>
    );
  }

  // Riadok vlastníka: ten istý obsah aj rozmery ako doteraz, len ako tlačidlo (`min-h-0`: globálne pravidlo `button` by riadok
  // natiahlo na 36 px; `max-w-full`: dlhé meno sa orezáva v tlačidle) bez podčiarkovania. Prístupný názov nesie aj meno, aby
  // obsahoval viditeľný text.
  const ownerRowClass = `${flatten ? '' : 'mb-2 '}flex items-center gap-2`;
  const ownerContent = data.owner ? (
    <>
      <InitialsAvatar
        name={data.owner.displayName}
        avatarUrl={data.owner.avatarUrl}
        size="xs"
      />
      <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">
        {data.owner.displayName}
      </span>
    </>
  ) : null;

  return (
    <div
      data-testid="feed-shared-card"
      data-shared-type={data.type}
      className={stretch ? (flatten ? 'contents' : 'flex flex-1 flex-col') : undefined}
    >
      {/* Pôvodný vlastník stojí NAD kartou – obsah patrí jemu, nie tomu, kto
          ho zdieľa. Pri zdieľaní seba samého sa vynecháva: meno už nesie
          hlavička karty ("Znovu zdieľané"), druhýkrát by mýlilo. */}
      {data.owner && !hideOwner ? (
        ownerOpensProfile ? (
          <button
            type="button"
            onClick={onOpenOwner}
            data-testid="feed-shared-card-owner"
            aria-label={`${t('feed.openProfile', 'Otvoriť profil')}: ${data.owner.displayName}`}
            className={`${ownerRowClass} min-h-0 max-w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60`}
          >
            {ownerContent}
          </button>
        ) : (
          <div data-testid="feed-shared-card-owner" className={ownerRowClass}>
            {ownerContent}
          </div>
        )
      ) : null}
      {frame}
    </div>
  );
}
