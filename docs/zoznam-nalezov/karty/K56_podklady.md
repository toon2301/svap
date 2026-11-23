# Podklady K56: prototyp opráv 355 a 356, overené testy a zásahy

Pripravil agent 23. 11. 2026 ako podklad ku karte `karty/K56.md`. Prototyp je v kópii `frontend` z `main` `46eb8d0b` mimo repozitára; agent ho kolegovi neodovzdáva ako hotový kód, len ako dôkaz, že postup ide, a ako východisko pre testy: kolega ich skontroluje, uprav a odôvodní každú zmenu v texte commitu. Čísla riadkov platia pre `main` `46eb8d0b`. Testy majú popisy po slovensky (R62) a mocky ako existujúce sady karty (`FeedPostEdit.test.tsx`, `FeedPostCard.feedSync.test.tsx`, `FeedMobileOpenState.test.tsx`).

## 1. Zmena kódu v prototype

Oprava 355 je jeden riadok (`post={currentPost}`) a dva komentáre, oprava 356 jedna závislosť efektu a komentár nad ním. `FeedPostCard.tsx` má po zmene 498 riadkov (pred zmenou 493; limit 500), `FeedPostCardLayers.tsx` 204 (bez zmeny).

```diff
--- a/frontend/src/components/dashboard/modules/feed/FeedPostCardLayers.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostCardLayers.tsx
@@ -12,8 +12,8 @@
  * Vracia fragment, takže všetky vrstvy ostávajú PRIAMYMI potomkami koreňa karty (`motion.article`) na rovnakom mieste
  * (za vloženými komentármi) a v DOM nepribudne žiadny obal.
  *
- * Okno zdieľania dostáva `post`, nie `currentPost` (nález 355): po úprave vlastného príspevku preto ešte ukáže starý
- * text. Presun to nemení, opraví sa to samostatne (K56).
+ * Okno zdieľania dostáva `currentPost`, takže po úprave vlastného príspevku ukáže nový text (nález 355); `post` z feedu
+ * berú len zoznam lajkujúcich a nahlásenie kvôli `post.id`.
  */
 
 import FeedDestructiveConfirm from './FeedDestructiveConfirm';
@@ -28,7 +28,7 @@
 import type { FeedPostCardProps } from './FeedPostCard.types';
 
 type FeedPostCardLayersProps = {
-  // Príspevok z feedu (nie `currentPost`): `post.id` berú zoznam lajkujúcich a nahlásenie, celý objekt okno zdieľania.
+  // Príspevok z feedu: `post.id` berú zoznam lajkujúcich a nahlásenie (okno zdieľania dostáva `currentPost`).
   post: FeedPost;
   // Fotoprehliadač pôvodného príspevku (fotka v reposte).
   sharedPhotoOpen: boolean;
@@ -196,7 +196,7 @@
       <FeedPostShareModal
         open={shareOpen}
         onClose={() => setShareOpen(false)}
-        post={post}
+        post={currentPost}
         onShared={onShared}
       />
     </>
--- a/frontend/src/components/dashboard/modules/feed/FeedPostCard.tsx
+++ b/frontend/src/components/dashboard/modules/feed/FeedPostCard.tsx
@@ -219,6 +219,11 @@
    * prehliadač fotky aj obrazovka detailu naskočili na ZASTARANÝ stav a
    * správny sa ukázal až po prvom rozposlaní počtov. Obe sa nasadzujú z toho
    * istého objektu, takže stačí zosúladiť ten.
+   *
+   * `post` je medzi závislosťami, aby sa lajk premietol aj po obnove feedu: ten
+   * vráti `currentPost` na hodnoty z feedu (efekt vyššie) a bez nového behu by
+   * starý lajk ostal, kým sa lajk alebo počet znova nezmení (nález 356). Efekt
+   * s `setCurrentPost(post)` preto musí ostať PRED týmto.
    */
   useEffect(() => {
     setCurrentPost((previous) =>
@@ -226,7 +231,7 @@
         ? previous
         : { ...previous, is_liked_by_me: isLiked, likes_count: likesCount },
     );
-  }, [isLiked, likesCount]);
+  }, [post, isLiked, likesCount]);
 
   const {
     photoViewerIndex,
```

Znenie komentárov je návrh; podstatné je, aby po oprave nehovorili o chybe, ktorá už neplatí (úvodný komentár `FeedPostCardLayers.tsx` a komentár vlastnosti `post`), a aby komentár nad E5 vysvetľoval, prečo je `post` v závislostiach a prečo musí E4 ostať pred E5.

## 2. Test 355: `__tests__/FeedPostCard.shareAfterEdit.test.tsx` (170 riadkov, 3 testy)

Pred opravou padá druhý test (v náhľade ostane „Povodny text“), prvý a tretí prechádzajú pred opravou aj po nej.

```tsx
/**
 * Okno zdieľania po úprave vlastného príspevku (oprava nálezu 355, dávka K56).
 *
 * Po úprave drží novú verziu príspevku v karte `currentPost`; náhľad v okne zdieľania z nej musí vychádzať, nie zo
 * starého príspevku z feedu (`post`), inak by pred odoslaním ukázal starý text. Obnova feedu po úprave prináša ešte
 * čerstvejšiu verziu, tá má prednosť pred lokálnou, takže okno ukáže text z feedu.
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { updateFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedUpdate = updateFeedPost as jest.MockedFunction<typeof updateFeedPost>;

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 1,
    post_type: 'free_post',
    caption: 'Povodny text',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 0,
    comments_count: 0,
    is_liked_by_me: false,
    can_manage: true,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

/** Upraví text vlastného príspevku cez menu „…“ a počká, kým sa nový text ukáže v karte. */
async function upravText(novyText: string) {
  await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
  await userEvent.click(within(screen.getByTestId('feed-post-menu')).getByTestId('feed-post-edit'));
  const input = await screen.findByTestId('feed-post-edit-input');
  await userEvent.clear(input);
  await userEvent.type(input, novyText);
  await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
  await waitFor(() =>
    expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument(),
  );
  expect(await screen.findByText(novyText)).toBeInTheDocument();
}

/** Otvorí okno zdieľania a vráti jeho náhľad. */
async function otvorNahladZdielania() {
  await userEvent.click(screen.getByTestId('feed-share-button'));
  const modal = await screen.findByTestId('feed-share-modal');
  return within(modal).getByTestId('feed-share-preview');
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('okno zdieľania po úprave príspevku', () => {
  it('ukáže v náhľade pôvodný text, kým sa príspevok neupraví', async () => {
    render(<FeedPostCard post={makePost()} />);

    const preview = await otvorNahladZdielania();

    expect(within(preview).getByText('Povodny text')).toBeInTheDocument();
  });

  it('ukáže v náhľade text po úprave, nie starý text z feedu', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text', is_edited: true }));
    render(<FeedPostCard post={makePost()} />);

    await upravText('Novy text');
    const preview = await otvorNahladZdielania();

    expect(within(preview).getByText('Novy text')).toBeInTheDocument();
    expect(within(preview).queryByText('Povodny text')).not.toBeInTheDocument();
  });

  it('po obnove feedu s čerstvejším textom ukáže v náhľade text z feedu', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text', is_edited: true }));
    const { rerender } = render(<FeedPostCard post={makePost()} />);
    await upravText('Novy text');

    // Obnova feedu prinesie ešte novšiu verziu (upravil ju niekto iný alebo iné zariadenie): má prednosť.
    rerender(<FeedPostCard post={makePost({ caption: 'Text z feedu', is_edited: true })} />);
    expect(await screen.findByText('Text z feedu')).toBeInTheDocument();
    const preview = await otvorNahladZdielania();

    expect(within(preview).getByText('Text z feedu')).toBeInTheDocument();
    expect(within(preview).queryByText('Novy text')).not.toBeInTheDocument();
  });
});
```

## 3. Test 356: `__tests__/FeedPostCard.feedRefreshDuringLike.test.tsx` (285 riadkov, 6 testov)

Pred opravou padajú prvé tri testy (detail po lajku, prehliadač fotky po lajku a detail po odobratí lajku, vždy po obnove feedu počas lajku), ostatné tri prechádzajú pred opravou aj po nej. Test „otvorená obrazovka detailu preberie lajk z obnoveného feedu“ v súbore **nie je** zámerne: otvorená obrazovka detailu si lajk berie len pri otvorení a ďalej ho dostáva udalosťou počtov (`feedPostCountEvents`), nie vlastnosťou `post`, takže by padal aj po oprave (prvý návrh prototypu mal taký test a pri behu sa ukázalo, že predpoklad je zlý).

```tsx
/**
 * Obnova feedu počas prebiehajúceho lajku a mobilné vrstvy (oprava nálezu 356, dávka K56).
 *
 * Obnova feedu pošle do karty nový objekt príspevku so starým lajkom (snapshot je spred lajku). Hook lajku ho počas
 * lajku nepreberie, takže karta ukazuje lajk používateľa, ale `currentPost`, z ktorého sa nasadzujú mobilná obrazovka
 * detailu aj prehliadač fotky, sa vrátil na starý stav a po dokončení lajku sa už nezmenil (lajk aj počet ostali
 * rovnaké ako optimistický stav). Mobilné vrstvy sa preto otvorili s nesprávnym lajkom. Testy overujú, že sa otvoria
 * s tým istým lajkom a počtom ako karta, a že oprava nepokazila bežné obnovenie feedu bez lajku.
 */

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FeedPostCard from '../FeedPostCard';
import { resetOverlayLayers } from '../../shared/overlayLayers';
import { likeFeedPost, unlikeFeedPost, updateFeedPost, type FeedPost } from '@/lib/feedApi';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  updateFeedPost: jest.fn(),
  deleteFeedPostImage: jest.fn(),
  deleteFeedPost: jest.fn(),
  getFeedPost: jest.fn(),
  likeFeedPost: jest.fn(),
  unlikeFeedPost: jest.fn(),
  listFeedPostComments: jest.fn(() =>
    Promise.resolve({ results: [], next: null, previous: null, count: 0 }),
  ),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  reportFeedPost: jest.fn(),
  shareFeedPost: jest.fn(),
  removeOwnFeedPostTag: jest.fn(),
  listFeedPostLikers: jest.fn(),
  listFeedCommentLikers: jest.fn(),
}));

jest.mock('@/lib/feedImageUpload', () => ({
  uploadFeedPostImages: jest.fn(),
  isAllowedFeedImageName: () => true,
  MAX_FEED_POST_IMAGES: 5,
  FEED_IMAGE_MAX_MB: 5,
  FEED_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  FEED_IMAGE_ACCEPT: '.jpg,.png',
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (_k: string, fallback: string) => fallback,
    locale: 'sk',
  }),
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => true,
  useIsMobileState: () => ({ isMobile: true, isResolved: true }),
}));

jest.mock('../../shared/useProtectedImage', () => ({
  useProtectedImage: (src: string | null) => ({
    resolvedSrc: src,
    isProtected: false,
    isLoading: false,
    isError: false,
  }),
}));

jest.mock('../../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: ({ ariaLabel }: { ariaLabel: string }) => (
    <button type="button" aria-label={ariaLabel}>
      emoji
    </button>
  ),
}));

jest.mock('../../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    article: ({ children, ...props }: React.ComponentProps<'article'>) => (
      <article {...props}>{children}</article>
    ),
  },
}));

const mockedLike = likeFeedPost as jest.MockedFunction<typeof likeFeedPost>;
const mockedUnlike = unlikeFeedPost as jest.MockedFunction<typeof unlikeFeedPost>;
const mockedUpdate = updateFeedPost as jest.MockedFunction<typeof updateFeedPost>;

type LikePayload = Awaited<ReturnType<typeof likeFeedPost>>;

/** Lajk, ktorý server dokončí až na požiadanie testu. */
function pendingLike() {
  let finish!: (payload: LikePayload) => void;
  const promise = new Promise<LikePayload>((resolve) => {
    finish = resolve;
  });
  return { promise, finish };
}

function makePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 7,
    post_type: 'free_post',
    caption: 'Ahoj',
    author: {
      id: 10,
      display_name: 'Jana',
      slug: 'jana',
      user_type: 'individual',
      avatar_url: null,
    },
    images: [
      {
        id: 11,
        status: 'approved',
        thumbnail_url: 'http://api.test/11-t.webp',
        large_url: 'http://api.test/11-l.webp',
      },
    ],
    shared_content: null,
    shared_content_unavailable: false,
    tagged_users: [],
    likes_count: 3,
    comments_count: 2,
    is_liked_by_me: false,
    can_manage: false,
    created_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as FeedPost;
}

const likeCount = () => screen.getByTestId('feed-like-count');

/** Otvorí mobilnú obrazovku detailu ikonou komentárov a vráti jej lajk a počet lajkov. */
async function otvorDetail() {
  await userEvent.click(screen.getByTestId('feed-comments-button'));
  const detail = await screen.findByTestId('feed-mobile-detail');
  return {
    like: within(detail).getByTestId('feed-mobile-detail-like'),
    count: within(detail).getByTestId('feed-mobile-detail-like-count'),
  };
}

/** Otvorí mobilný prehliadač fotky ťuknutím na fotku a vráti jeho lajk a počet lajkov. */
async function otvorPrehliadacFotky() {
  await userEvent.click(screen.getByTestId('feed-image-open-11'));
  const viewer = await screen.findByTestId('feed-photo-viewer');
  return {
    like: within(viewer).getByTestId('feed-photo-viewer-like'),
    count: within(viewer).getByTestId('feed-photo-viewer-like-count'),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  resetOverlayLayers();
});

describe('obnova feedu počas prebiehajúceho lajku', () => {
  it('mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty', async () => {
    const server = pendingLike();
    mockedLike.mockReturnValue(server.promise);
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    expect(likeCount()).toHaveTextContent('4');
    // Obnova feedu so starým snapshotom (nový objekt, lajk ešte nie je na serveri): karta ho počas lajku nepreberie.
    rerender(<FeedPostCard post={makePost()} />);
    await act(async () => {
      server.finish({ is_liked_by_me: true, likes_count: 4 });
    });
    expect(likeCount()).toHaveTextContent('4');

    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'true');
    expect(detail.count).toHaveTextContent('4');
  });

  it('mobilný prehliadač fotky otvorený po lajku ukáže lajk a počet z karty', async () => {
    const server = pendingLike();
    mockedLike.mockReturnValue(server.promise);
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    rerender(<FeedPostCard post={makePost()} />);
    await act(async () => {
      server.finish({ is_liked_by_me: true, likes_count: 4 });
    });

    const viewer = await otvorPrehliadacFotky();

    expect(viewer.like).toHaveAttribute('aria-pressed', 'true');
    expect(viewer.count).toHaveTextContent('4');
  });

  it('mobilná obrazovka detailu ukáže po obnove feedu počas odobratia lajku odobraný lajk', async () => {
    const server = pendingLike();
    mockedUnlike.mockReturnValue(server.promise);
    const lajknuty = { is_liked_by_me: true, likes_count: 3 };
    const { rerender } = render(<FeedPostCard post={makePost(lajknuty)} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    expect(likeCount()).toHaveTextContent('2');
    rerender(<FeedPostCard post={makePost(lajknuty)} />);
    await act(async () => {
      server.finish({ is_liked_by_me: false, likes_count: 2 });
    });
    expect(likeCount()).toHaveTextContent('2');

    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'false');
    expect(detail.count).toHaveTextContent('2');
  });

  it('ak server po obnove feedu vráti iný počet, detail ukáže počet zo servera', async () => {
    const server = pendingLike();
    mockedLike.mockReturnValue(server.promise);
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    await userEvent.click(screen.getByTestId('feed-like-button'));
    // Obnova feedu medzitým prinesie iný počet (lajkol aj niekto ďalší).
    rerender(<FeedPostCard post={makePost({ likes_count: 5 })} />);
    await act(async () => {
      server.finish({ is_liked_by_me: true, likes_count: 6 });
    });
    expect(likeCount()).toHaveTextContent('6');

    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'true');
    expect(detail.count).toHaveTextContent('6');
  });
});

describe('obnova feedu bez prebiehajúceho lajku', () => {
  it('mobilná obrazovka detailu ukáže lajk a počet z čerstvého príspevku z feedu', async () => {
    const { rerender } = render(<FeedPostCard post={makePost()} />);

    rerender(<FeedPostCard post={makePost({ is_liked_by_me: true, likes_count: 8 })} />);
    expect(likeCount()).toHaveTextContent('8');
    const detail = await otvorDetail();

    expect(detail.like).toHaveAttribute('aria-pressed', 'true');
    expect(detail.count).toHaveTextContent('8');
  });

  it('lajk po úprave textu nevráti v karte starý text', async () => {
    mockedUpdate.mockResolvedValue(makePost({ caption: 'Novy text', is_edited: true, can_manage: true }));
    mockedLike.mockResolvedValue({ is_liked_by_me: true, likes_count: 4 });
    render(<FeedPostCard post={makePost({ can_manage: true })} />);

    await userEvent.click(screen.getByTestId('feed-post-menu-trigger'));
    await userEvent.click(within(screen.getByTestId('feed-post-menu')).getByTestId('feed-post-edit'));
    const input = await screen.findByTestId('feed-post-edit-input');
    await userEvent.clear(input);
    await userEvent.type(input, 'Novy text');
    await userEvent.click(screen.getByTestId('feed-post-edit-submit'));
    await waitFor(() =>
      expect(screen.queryByTestId('feed-post-edit-modal')).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Novy text')).toBeInTheDocument();

    // Premietnutie lajku do `currentPost` musí zachovať lokálnu verziu príspevku (text po úprave), nie ju nahradiť
    // príspevkom z feedu.
    await userEvent.click(screen.getByTestId('feed-like-button'));
    await waitFor(() => expect(likeCount()).toHaveTextContent('4'));

    expect(screen.getByText('Novy text')).toBeInTheDocument();
    expect(screen.queryByText('Ahoj')).not.toBeInTheDocument();
  });
});
```

## 4. Výsledky prototypu

- Nové testy pred opravami (kód z `main` `46eb8d0b` a oba súbory testov): 4 z 9 padajú a 5 prechádza (355: „ukáže v náhľade text po úprave, nie starý text z feedu“; 356: „mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty“, „mobilný prehliadač fotky otvorený po lajku ukáže lajk a počet z karty“ a „mobilná obrazovka detailu ukáže po obnove feedu počas odobratia lajku odobraný lajk“).
- Nové testy po opravách: 9 z 9 prechádza, päť opakovaných behov oboch súborov za sebou bez pádu.
- Celý Jest na prototype: 637 sád, 9 497 testov a 0 snapshotov prešlo (na `main` `46eb8d0b` 635, 9 488 a 0; pribudli 2 sady a 9 testov).
- `tsc --noEmit`: čisté (kód 0). ESLint s `--max-warnings=0` nad `FeedPostCard.tsx`, `FeedPostCardLayers.tsx` a oboma novými súbormi: 0 varovaní.

## 5. Zásahy do opravených miest a ich výsledky

Jeden zásah naraz v kópii `frontend` mimo repozitára (po každom sa súbor vráti na opravenú verziu); najprv proti oboma novým súborom testov, a čo tam prežije, proti všetkým 95 súvisiacim sadám Nástenky spolu s nimi (`--bail=1`). Zásahy sú doslovný text na zmenu; stĺpec „prvý padnutý test“ ukazuje, čo zásah zachytilo ako prvé.

| Zásah | Čo sa pokazí | Výsledok | Prvý padnutý test |
| --- | --- | --- | --- |
| Q1 | 355: okno zdieľania dostane post z feedu namiesto currentPost | zachytený (nové testy) | FeedPostCard.shareAfterEdit: „ukáže v náhľade text po úprave, nie starý text z feedu“ |
| Q2 | 356: závislosti E5 bez `post` (pôvodný stav) | zachytený (nové testy) | FeedPostCard.feedRefreshDuringLike: „mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty“ |
| Q3 | 356: zlá oprava, závislosti len na lajk a počet z feedu | zachytený (nové testy) | FeedPostCard.feedRefreshDuringLike: „mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty“ |
| Q4 | 356: E4 (prepis currentPost príspevkom z feedu) chýba | zachytený (nové testy) | FeedPostCard.shareAfterEdit: „po obnove feedu s čerstvejším textom ukáže v náhľade text z feedu“ |
| Q5 | 356: E4 beží AŽ PO E5 (poradie efektov) | zachytený (nové testy) | FeedPostCard.feedRefreshDuringLike: „mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty“ |
| Q6 | 356: E5 premieta len lajk, nie počet | zachytený (nové testy) | FeedPostCard.feedRefreshDuringLike: „mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty“ |
| Q7 | 356: E5 premieta len počet, nie lajk | zachytený (nové testy) | FeedPostCard.feedRefreshDuringLike: „mobilná obrazovka detailu otvorená po lajku ukáže lajk a počet z karty“ |
| Q8 | 356: E5 nahradí currentPost príspevkom z feedu s lajkom (zahodí lokálnu úpravu) | zachytený (nové testy) | FeedPostCard.feedRefreshDuringLike: „lajk po úprave textu nevráti v karte starý text“ |
| Q9 | 356: E5 závislosti len `post` (lajk sa nepremieta) | zachytený (nové testy) | FeedPostCard.feedRefreshDuringLike: „ak server po obnove feedu vráti iný počet, detail ukáže počet zo serve“ |

Q3 je „zlá oprava“, ktorá vyzerá rozumne (závislosť na polí lajku a počte z `post`), no pri zastaranom snapshote, ktorý má rovnaké hodnoty ako pred lajkom, sa efekt nespustí; Q5 je zlé poradie efektov. Obe musia padnúť, ak sa niekto k oprave vráti.

Presné zmeny (každá sa robí na opravenej verzii z časti 1; Q1 je vo `FeedPostCardLayers.tsx`, ostatné vo `FeedPostCard.tsx`):

```text
Q1  post={currentPost}  →  post={post}                      (okno zdieľania, riadok 199)
Q2  }, [post, isLiked, likesCount]);  →  }, [isLiked, likesCount]);
Q3  }, [post, isLiked, likesCount]);  →  }, [post.is_liked_by_me, post.likes_count, isLiked, likesCount]);
Q4  efekt E4 `useEffect(() => { setCurrentPost(post); }, [post]);` sa odstráni
Q5  efekt E4 sa presunie pod koniec efektu E5 (E5 beží pred E4)
Q6  { ...previous, is_liked_by_me: isLiked, likes_count: likesCount }  →  { ...previous, is_liked_by_me: isLiked }
Q7  { ...previous, is_liked_by_me: isLiked, likes_count: likesCount }  →  { ...previous, likes_count: likesCount }
Q8  { ...previous, is_liked_by_me: isLiked, likes_count: likesCount }  →  { ...post, is_liked_by_me: isLiked, likes_count: likesCount }
Q9  }, [post, isLiked, likesCount]);  →  }, [post]);
```
