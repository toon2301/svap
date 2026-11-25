'use client';

/**
 * Zdieľaný obsah a označenia pod príspevkom: text zdieľajúceho nad náhľadom, vnorený náhľad zdieľanej ponuky,
 * portfólia alebo príspevku a zoznam označených používateľov s „x" pri vlastnom označení.
 *
 * Presunuté z `FeedPostCard.tsx` bez zmeny (krok d delenia karty, nález 333, R23): JSX, komentáre aj obsluhy sú
 * rovnaké ako predtým, mení sa len odsadenie (o štyri znaky) a podmienka `isShared || taggedUsers.length` z výrazu v
 * JSX sa stala skorým `return null`. Text zdieľajúceho (`sharedCaptionNode`) sa presunul s blokom, lebo ho používa len
 * on. Komponent nemá vlastný stav ani efekty; otvárače (preklik na zdroj, náhľad zdieľaného príspevku, fotka v reposte,
 * odstránenie označenia) dostáva od karty ako vlastnosti. Jediný hák je údaj, či stojí v ľavom stĺpci
 * dvojstĺpcového okna (`useFeedDetailSplit`): len tam dostane karta ponuky a portfólia pružnú plochu fotky.
 *
 * PRUŽNÝ STĹPEC OKNA (`fillHeight`): koreňový `div` ostáva PRIAMYM potomkom koreňa karty, na rovnakom mieste medzi
 * médiami a riadkom akcií, a nič sa neobaľuje; pri zdieľanom obsahu v okne je jedinou pružnou časťou stĺpca. `fillHeight`
 * aj `fixedBlock` idú ako vlastnosti do toho istého výrazu v `className`. Keď nie je čo ukázať (voľný príspevok bez
 * označení), komponent vracia `null`.
 *
 * TEXT ZDIEĽAJÚCEHO V OKNE (ľavý stĺpec dvojstĺpcového okna): karta je hlavný obsah a text je jej komentár, preto má
 * päť riadkov (`SPLIT_SHARED_CAPTION_LINES`) a po rozbalení nemá pevný strop (`fillParent`): vyplní zvyšok stĺpca,
 * ustúpi karte, keď sa nezmestí (najmenej päť riadkov), a posúva sa len vo vlastnom rámčeku. Medzery medzi súrodencami
 * dáva v ľavom stĺpci `gap-3` namiesto `space-y-3`: repost s fotkou rozpúšťa obal karty a rám (`display: contents`), na
 * ktorých by sa vonkajšie okraje stratili. Mimo ľavého stĺpca ostáva všetko ako predtým.
 *
 * PROFIL PÔVODNÉHO AUTORA (nález 362): avatar a meno nad náhľadom otvoria jeho profil (`openUserProfile` s vlastníkom z feed API,
 * `shared_content.owner`); v okne detailu sa pred odchodom zatvorí okno (`closeOverlayOnLeave` z karty, rovnako ako pri
 * hlavičke). Pri nedostupnom zdroji backend vlastníka neposiela, takže sa riadok nepreklikáva.
 *
 * REPOST TEXTOVÉHO PRÍSPEVKU V OKNE (`useFeedDetailTextOnly`, R73 a R77): nič tu nesúperí o miesto, preto má text zdieľajúceho
 * desať riadkov (`DETAIL_CAPTION_LINES`; predtým bol celý) a pôvodný text päť (`SharedContentPreviewCard`); „Viac" je od
 * 11. a od 6. riadku.
 */

import FeedPostCaption, {
  CARD_CAPTION_LINES,
  DETAIL_CAPTION_LINES,
} from './FeedPostCaption';
import { useFeedDetailSplit } from './FeedDetailSplitContext';
import { useFeedDetailTextOnly } from './FeedDetailTextOnlyContext';
import { openUserProfile } from './feedProfileNavigation';
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
  /** Preklik VON z karty (profil pôvodného autora): v okne detailu zavrie okno; bez vlastnosti sa nič nezatvára. */
  closeOverlayOnLeave?: () => void;
  sharedPhotoPostId: number | null;
  setSharedPhotoOpen: (open: boolean) => void;
  taggedUsers: FeedTaggedUser[];
  setTagRemoveOpen: (open: boolean) => void;
  t: (key: string, fallback?: string) => string;
};

/** Text zdieľajúceho nad kartou v dvojstĺpcovom okne: karta je hlavný obsah, text je jej komentár, preto kratší náhľad. */
const SPLIT_SHARED_CAPTION_LINES = 5;

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
  closeOverlayOnLeave,
  sharedPhotoPostId,
  setSharedPhotoOpen,
  taggedUsers,
  setTagRemoveOpen,
  t,
}: FeedPostSharedBlockProps) {
  // Pružná plocha fotky ide len do ľavého stĺpca dvojstĺpcového okna (pevná výška); jednostĺpcové okno ju nemá.
  const inSplitColumn = useFeedDetailSplit();
  // Okno príspevku len s textom (R73, R77): text zdieľajúceho má desať riadkov, pôvodný text päť; blok je pružný len
  // vtedy, keď nesie zdieľaný obsah.
  const textOnly = useFeedDetailTextOnly();
  if (!(isShared || taggedUsers.length)) return null;

  // Preklik na profil pôvodného autora zo zdieľaného obsahu: vlastník je z feed API (`shared_content.owner`, pri nedostupnom
  // zdroji `null`), pred odchodom sa zatvorí okno detailu.
  const sharedOwner = post.shared_content?.owner ?? null;
  const handleOpenSharedOwner = sharedOwner
    ? () => openUserProfile(sharedOwner, { beforeNavigate: closeOverlayOnLeave })
    : undefined;

  // Text autora zdieľania – v okne ide nad náhľad, na karte pod neho.
  const sharedCaptionNode =
    isShared && caption ? (
      <FeedPostCaption
        text={caption}
        boundedExpansion={isDetail}
        expansionBound={fillHeight ? 'roomy' : 'compact'}
        maxLines={
          textOnly
            ? DETAIL_CAPTION_LINES
            : isDetail
              ? fillHeight && inSplitColumn
                ? SPLIT_SHARED_CAPTION_LINES
                : DETAIL_CAPTION_LINES
              : CARD_CAPTION_LINES
        }
        fillParent={fillHeight && inSplitColumn && !textOnly}
        collapseBlankLines
        onTextClick={
          opensMobileDetail ? () => setMobileDetailOpen(true) : undefined
        }
      />
    ) : null;

  // Pružný je blok v okne so zdieľaným obsahom; samotní označení (voľný príspevok len s textom) nesúperia s textom o miesto.
  const flexible = fillHeight && !(textOnly && !isShared);

  return (
    <div
      className={`${flexible && inSplitColumn ? 'gap-3' : 'space-y-3'} px-4 py-3 ${
        // V okne detailu je náhľad JEDINÁ pružná časť stĺpca: keď sa
        // nezmestí, scrolluje sa on, nie karta. Bez toho by sa pri vyššom
        // náhľade (ponuka s fotkou) rozhýbala aj hlavička a riadok akcií –
        // tie musia stáť bez ohľadu na to, či náhľad fotku má.
        //
        // Zdieľaný príspevok a vlastné fotky sa nikdy nestretnú (backend
        // posiela `images` len pri `free_post`), takže o `flex-1` tu nie je
        // s čím súperiť.
        flexible
          ? `subtle-scrollbar min-h-0 flex-1 overflow-y-auto${
              inSplitColumn ? ' flex flex-col' : ''
            }`
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
          onOpenOwner={handleOpenSharedOwner}
          onOpenSource={handleOpenSharedSource}
          onOpenPostPreview={handleOpenSharedPostPreview}
          // Fotka vnútri repostu patrí PÔVODNÉMU príspevku – otvára jeho
          // fotoprehliadač, nie detail zdieľajúceho.
          onOpenPostPhoto={
            sharedPhotoPostId != null
              ? () => setSharedPhotoOpen(true)
              : undefined
          }
          fillHeight={fillHeight && inSplitColumn}
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
