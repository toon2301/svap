'use client';

/**
 * Dvojstĺpcové rozloženie okna detailu – VÝHRADNE pre príspevok s fotkou.
 *
 * Text-only príspevok ostáva na pôvodnom jednostĺpcovom rozložení priamo vo
 * `FeedPostDetailOverlay`: bez fotky by pravý stĺpec nemal čo vyvážiť a
 * v ľavom by nebolo nič pružné, čo by pohltilo zvyšok výšky.
 *
 *   ĽAVÝ (56 %)                      PRAVÝ (44 %)
 *   ─────────────────────────        ─────────────────────
 *   hlavička        shrink-0         nadpis „Komentáre"   shrink-0
 *   text            shrink-0         zoznam komentárov    flex-1, JEDINÝ scroll
 *   fotka/karusel   flex-1 ← pružná  pole na komentár     shrink-0
 *   akcie           shrink-0
 *
 * PREČO SA ĽAVÝ STĹPEC PRI BEŽNOM OBSAHU NESCROLLUJE:
 *
 *  1. Okno má pri fotke PEVNÚ výšku `h-[95vh]` (nie `max-h`), takže stĺpec má
 *     definitívnu výšku – bez nej by `flex-1` na fotke nemalo z čoho počítať.
 *  2. Hlavička (~3,75 rem) a riadok akcií (~2,75 rem) sú `shrink-0` s pevnou
 *     výškou, text má strop `max-h-[40vh]` (`expansionBound="roomy"`) a fotka
 *     je pružná (`flex-1`). Rozbalenie „Viac" teda fotku len primerane zmenší.
 *  3. Strop textu je POISTKA, nie bežný stav: caption má limit 500 znakov
 *     (FE `CAPTION_MAX_LENGTH`, BE `MAX_TEXT_LENGTH`) a pri šírke ľavého
 *     stĺpca (56 % z 54 rem ≈ 484 px, po odsadení ≈ 452 px, ~64 znakov na
 *     riadok) sa 500 znakov zmestí do ~8 riadkov ≈ 160 px. Naráža naň len
 *     text plný vynútených zalomení.
 *
 * ČO SA STANE V KRAJNOM PRÍPADE (a prečo tu je `overflow-y-auto`):
 *
 * Pevných častí je viac než len hlavička, text a akcie – pribúdajú aj
 * označení ľudia (až 10, `MAX_FEED_POST_TAGS`), ktorí sa pri šírke stĺpca
 * zalomia do niekoľkých riadkov. Pri KOMBINÁCII všetkého naraz (text na
 * strope + plný zoznam označených + nízke okno) by ich súčet vedel prerásť
 * `95vh`. Keby stĺpec ostal `overflow-hidden`, fotka by sa scvrkla na nulu a
 * riadok akcií by sa odrezal MIMO dohľad, bez možnosti sa k nemu dostať.
 *
 * Preto dvojica opatrení, ktorá zodpovedá poistke jednostĺpcového rozloženia
 * (`min-h-0 overflow-y-auto` na pevnom bloku):
 *  - médiová plocha má podlahu `min-h-[8rem]`, takže fotka nikdy nezmizne,
 *  - stĺpec ako celok sa v takom prípade dá doscrollovať (`overflow-y-auto`
 *    s appkinou utilitou `subtle-scrollbar`).
 * Pri bežnom obsahu sa scrollovacia lišta neobjaví – všetko sa zmestí.
 */

import { useLanguage } from '@/contexts/LanguageContext';
import type { FeedPost, FeedPostImage } from '@/lib/feedApi';
import FeedPostCard from './FeedPostCard';
import FeedPostComments from './FeedPostComments';

/**
 * Je čo ukázať v médiovej ploche?
 *
 * Zamietnuté fotky karusel nekreslí (autorovi z nich ostane len poznámka),
 * takže by z príspevku spravili prázdny ľavý stĺpec. Rozpracované sa naopak
 * kreslia ako stavová plocha, takže sa počítajú.
 *
 * Berie ŽIVÝ zoznam fotiek, nie príspevok: moderácia môže rozpracovanú fotku
 * zamietnuť aj počas otvoreného okna a rozloženie sa vtedy musí prepnúť samo.
 * Zoznam preto vedie `usePendingFeedImages` v okne, nie snímka z načítania.
 *
 * Backend posiela `images` len pri `free_post` – zdieľané príspevky sem teda
 * nikdy nespadnú a ich poradie „text nad náhľadom" ostáva na jednostĺpcovom
 * rozložení nezmenené.
 */
export function hasVisibleFeedPhoto(images: FeedPostImage[] | undefined): boolean {
  return (images ?? []).some((image) => image.status !== 'rejected');
}

type FeedPostDetailSplitLayoutProps = {
  post: FeedPost;
  /** Živý stav fotiek – sleduje ho okno, karta ho dostáva hotový. */
  liveImages: FeedPostImage[];
  /** Počet komentárov drží okno – karta ich pod sebou nemá. */
  commentsCount: number;
  highlightCommentId?: number | null;
  /** Príspevok zmizol (autor ho zmazal) – okno sa má zavrieť. */
  onDeleted: () => void;
  /** Autor príspevok upravil v okne – okno si má obnoviť svoju verziu. */
  onPostUpdated: (post: FeedPost) => void;
  onCommentsCountChange: (delta: number) => void;
  onCommentsTotalChange: (total: number) => void;
};

export default function FeedPostDetailSplitLayout({
  post,
  liveImages,
  commentsCount,
  highlightCommentId = null,
  onDeleted,
  onPostUpdated,
  onCommentsCountChange,
  onCommentsTotalChange,
}: FeedPostDetailSplitLayoutProps) {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-0 flex-1" data-testid="feed-post-overlay-split">
      {/* ĽAVÝ STĹPEC – hlavička, text, fotka, akcie POKOPE a v tomto poradí.
          `min-w-0` drží dlhé meno autora v stĺpci. `overflow-y-auto` je
          POISTKA pre krajnú kombináciu obsahu, nie bežný stav – viď rozpis
          v hlavičke súboru. */}
      <div
        data-testid="feed-post-overlay-media"
        className="subtle-scrollbar flex min-h-0 w-[56%] min-w-0 flex-col overflow-y-auto"
      >
        <FeedPostCard
          post={post}
          variant="detail"
          fillHeight
          liveImages={liveImages}
          commentsCount={commentsCount}
          onDeleted={onDeleted}
          onPostUpdated={onPostUpdated}
        />
      </div>

      {/* PRAVÝ STĹPEC – výhradne komentáre. */}
      <div
        data-testid="feed-post-overlay-comments"
        className="flex min-h-0 w-[44%] min-w-0 flex-col border-l border-gray-200 dark:border-gray-800"
      >
        {/* `pr-12` uvoľňuje miesto zatváraciemu „X" okna, ktoré sedí práve nad
            týmto rohom – v tomto rozložení už teda hlavička karty vľavo
            odsadenie nepotrebuje. */}
        <h2 className="shrink-0 px-4 pb-2 pr-12 pt-3 text-sm font-semibold text-gray-900 dark:text-white">
          {t('feed.comments', 'Komentáre')}
        </h2>
        {/* `min-h-0` ruší automatické minimum flex položky – bez neho by zoznam
            komentárov stĺpec roztiahol a okno by prerástlo obrazovku. */}
        <div className="min-h-0 flex-1">
          <FeedPostComments
            postId={post.id}
            highlightCommentId={highlightCommentId}
            fillHeight
            onCountChange={onCommentsCountChange}
            onTotalChange={onCommentsTotalChange}
          />
        </div>
      </div>
    </div>
  );
}
