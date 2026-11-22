'use client';

/**
 * Zdieľaný obsah a označenia pod príspevkom: text zdieľajúceho nad náhľadom, vnorený náhľad zdieľanej ponuky,
 * portfólia alebo príspevku a zoznam označených používateľov s „x" pri vlastnom označení.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok d delenia karty, nález 333, R23): JSX, komentáre aj obsluhy sú
 * rovnaké ako predtým, mení sa len odsadenie (o štyri znaky) a podmienka `isShared || taggedUsers.length` z výrazu v
 * JSX sa stala skorým `return null`. Text zdieľajúceho (`sharedCaptionNode`) sa presunul s blokom, lebo ho používa len
 * on. Komponent nemá vlastný stav ani hooky; otvárače (preklik na zdroj, náhľad zdieľaného príspevku, fotka v reposte,
 * odstránenie označenia) dostáva od karty ako vlastnosti.
 *
 * PRUŽNÝ STĹPEC OKNA (`fillHeight`): koreňový `div` ostáva PRIAMYM potomkom koreňa karty, na rovnakom mieste medzi
 * médiami a riadkom akcií, a nič sa neobaľuje; pri zdieľanom obsahu v okne je jedinou pružnou časťou stĺpca. `fillHeight`
 * aj `fixedBlock` idú ako vlastnosti do toho istého výrazu v `className`. Keď nie je čo ukázať (voľný príspevok bez
 * označení), komponent vracia `null`.
 */

import FeedPostCaption, {
  CARD_CAPTION_LINES,
  DETAIL_CAPTION_LINES,
} from './FeedPostCaption';
import SharedContentPreviewCard from './SharedContentPreviewCard';
import { sharedContentCardFromPost } from './sharedContentCard';
import type { FeedPost, FeedTaggedUser } from '@/lib/feedApi';

type FeedPostSharedBlockProps = {
  /** Okno detailu s pružným stĺpcom: blok je v ňom pri zdieľanom obsahu jediná pružná časť. */
  fillHeight: boolean;
  /** Trieda pevného bloku pružného stĺpca: `shrink-0` pri `fillHeight`, inak prázdny reťazec. */
  fixedBlock: string;
  isShared: boolean;
  isDetail: boolean;
  caption: string;
  opensMobileDetail: boolean;
  setMobileDetailOpen: (open: boolean) => void;
  post: FeedPost;
  isSelfShare: boolean;
  handleOpenSharedSource: (() => void) | undefined;
  handleOpenSharedPostPreview: (() => void) | undefined;
  sharedPhotoPostId: number | null;
  setSharedPhotoOpen: (open: boolean) => void;
  taggedUsers: FeedTaggedUser[];
  setTagRemoveOpen: (open: boolean) => void;
  t: (key: string, fallback?: string) => string;
};

export default function FeedPostSharedBlock({
  fillHeight,
  fixedBlock,
  isShared,
  isDetail,
  caption,
  opensMobileDetail,
  setMobileDetailOpen,
  post,
  isSelfShare,
  handleOpenSharedSource,
  handleOpenSharedPostPreview,
  sharedPhotoPostId,
  setSharedPhotoOpen,
  taggedUsers,
  setTagRemoveOpen,
  t,
}: FeedPostSharedBlockProps) {
  if (!(isShared || taggedUsers.length)) return null;

  // Text autora zdieľania – v okne ide nad náhľad, na karte pod neho.
  const sharedCaptionNode =
    isShared && caption ? (
      <FeedPostCaption
        text={caption}
        boundedExpansion={isDetail}
        expansionBound={fillHeight ? 'roomy' : 'compact'}
        maxLines={isDetail ? DETAIL_CAPTION_LINES : CARD_CAPTION_LINES}
        collapseBlankLines
        onTextClick={
          opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
        }
      />
    ) : null;

  return (
    <div
      className={`space-y-3 px-4 py-3 ${
        // V okne detailu je náhľad JEDINÁ pružná časť stĺpca: keď sa
        // nezmestí, scrolluje sa on, nie karta. Bez toho by sa pri vyššom
        // náhľade (ponuka s fotkou) rozhýbala aj hlavička a riadok akcií –
        // tie musia stáť bez ohľadu na to, či náhľad fotku má.
        //
        // Zdieľaný príspevok a vlastné fotky sa nikdy nestretnú (backend
        // posiela `images` len pri `free_post`), takže o `flex-1` tu nie je
        // s čím súperiť.
        fillHeight
          ? 'subtle-scrollbar min-h-0 flex-1 overflow-y-auto'
          : fixedBlock
      }`}
    >
      {/* Sprievodný text zdieľajúceho ide VŽDY nad náhľad – rovnaké
          pravidlo ako „text nad fotkou" pri voľnom príspevku. Je to jeho
          komentár k obsahu, takže sa má prečítať skôr než obsah sám. */}
      {sharedCaptionNode}

      {isShared ? (
        <SharedContentPreviewCard
          data={sharedContentCardFromPost(post)}
          hideOwner={isSelfShare}
          onOpenSource={handleOpenSharedSource}
          onOpenPostPreview={handleOpenSharedPostPreview}
          // Fotka vnútri repostu patrí PÔVODNÉMU príspevku – otvára jeho
          // fotoprehliadač, nie detail zdieľajúceho.
          onOpenPostPhoto={
            sharedPhotoPostId != null
              ? () => setSharedPhotoOpen(true)
              : undefined
          }
        />
      ) : null}

      {taggedUsers.length ? (
        <ul className="flex flex-wrap gap-1.5" data-testid="feed-post-tags">
          {taggedUsers.map((tagged) => {
            // „x" patrí VÝHRADNE vlastnému označeniu; príznak dáva backend,
            // ktorý je aj tak jediný, kto o tom rozhoduje.
            const isOwnTag = tagged.can_remove_tag === true;
            return (
              <li
                key={tagged.id}
                data-testid={`feed-post-tag-${tagged.id}`}
                className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-200"
              >
                @{tagged.display_name}
                {isOwnTag ? (
                  <button
                    type="button"
                    onClick={() => setTagRemoveOpen(true)}
                    data-testid="feed-post-tag-remove"
                    aria-label={t('feed.tagRemoveAction', 'Odstrániť označenie')}
                    title={t('feed.tagRemoveAction', 'Odstrániť označenie')}
                    className="-mr-1 rounded-full p-0.5 text-purple-500 transition-colors hover:bg-purple-200 hover:text-purple-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60 dark:text-purple-300 dark:hover:bg-purple-800/60 dark:hover:text-white"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="h-3 w-3"
                      aria-hidden="true"
                    >
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="18" y1="6" x2="6" y2="18" />
                    </svg>
                  </button>
                ) : null}
              </li>
            );
          })}
          </ul>
      ) : null}
    </div>
  );
}
