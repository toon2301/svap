/**
 * Preklik na profil autora KOMENTÁRA.
 *
 * V otvorenom okne detailu (desktop) musí okno zmiznúť ako súčasť prechodu –
 * inak ostane visieť nad profilom, na ktorý sa práve prešlo. Hlavička
 * príspevku to robila od začiatku, komentáre nie.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FeedPostComments from '../FeedPostComments';
import {
  FeedPostOverlayProvider,
  useFeedPostOverlay,
} from '../../../contexts/FeedPostOverlayContext';

jest.mock('@/lib/feedApi', () => ({
  FEED_COMMENT_MAX_LENGTH: 500,
  listFeedPostComments: jest.fn(),
  listFeedCommentReplies: jest.fn(),
  createFeedPostComment: jest.fn(),
  deleteFeedPostComment: jest.fn(),
  updateFeedPostComment: jest.fn(),
  likeFeedPostComment: jest.fn(),
  unlikeFeedPostComment: jest.fn(),
  listFeedCommentLikers: jest.fn(),
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
  DesktopEmojiPickerButton: () => null,
}));

const feedApi = jest.requireMock('@/lib/feedApi');
const mockedListComments = feedApi.listFeedPostComments as jest.Mock;

const commentAuthor = {
  id: 21,
  display_name: 'Peter Malý',
  slug: 'peter',
  user_type: 'individual',
  avatar_url: null,
};

function comment(id: number) {
  return {
    id,
    text: 'Pekné!',
    author: commentAuthor,
    can_delete: false,
    can_edit: false,
    likes_count: 0,
    is_liked_by_me: false,
    replies: [],
    replies_count: 0,
    created_at: '2026-01-01T11:00:00Z',
  };
}

/** Okno detailu, ktoré si o sebe povie cez kontext – ako v appke. */
function OverlayHarness({ open }: { open: boolean }) {
  const overlay = useFeedPostOverlay();
  // Otvoriť RAZ: `overlay` mení identitu pri každom otvorení/zatvorení, takže
  // efekt bez tejto poistky spadne do nekonečnej slučky.
  const openedRef = React.useRef(false);
  React.useEffect(() => {
    if (!open || openedRef.current) return;
    openedRef.current = true;
    overlay?.open({ postId: 7 });
  }, [open, overlay]);
  return <FeedPostComments postId={7} />;
}

/** Zatvorenie okna aj navigácia idú do JEDNEJ postupnosti – poradie je to,
 *  na čom tu záleží. */
let events: Array<{ type: 'close' | 'navigate'; detail?: unknown }>;

function renderComments(open: boolean) {
  return render(
    <FeedPostOverlayProvider
      onTargetChange={(target, options) => {
        if (target === null) events.push({ type: 'close', detail: options ?? {} });
      }}
    >
      <OverlayHarness open={open} />
    </FeedPostOverlayProvider>,
  );
}

/** Odber si treba pamätať – odhlásiť sa dá len TOU ISTOU referenciou. */
let navigationListener: (event: Event) => void;

beforeEach(() => {
  jest.clearAllMocks();
  events = [];
  navigationListener = (event: Event) =>
    events.push({ type: 'navigate', detail: (event as CustomEvent).detail });
  window.addEventListener('goToUserProfile', navigationListener);
  mockedListComments.mockResolvedValue({
    results: [comment(100)],
    next: null,
    previous: null,
    count: 1,
  });
});

afterEach(() => {
  window.removeEventListener('goToUserProfile', navigationListener);
});

describe('preklik z komentára v otvorenom okne detailu', () => {
  it.each([
    ['avatar', 'feed-comment-avatar-100'],
    ['meno', 'feed-comment-author-100'],
  ])('closes the overlay before navigating – %s', async (_name, testId) => {
    renderComments(true);
    fireEvent.click(await screen.findByTestId(testId));

    // Jedna postupnosť: najprv sa okno zavrie, až POTOM sa naviguje.
    // `keepHistory`, lebo adresu si rieši samotná navigácia – krok späť by ju
    // vzápätí zrušil.
    expect(events).toEqual([
      { type: 'close', detail: { keepHistory: true } },
      { type: 'navigate', detail: { identifier: 'peter' } },
    ]);
  });
});

describe('preklik z komentára mimo okna', () => {
  it('touches no overlay bookkeeping when nothing is open', async () => {
    renderComments(false);
    fireEvent.click(await screen.findByTestId('feed-comment-avatar-100'));

    // Komentáre sa kreslia aj v karte, na mobilnej obrazovke a v paneli nad
    // fotkou – zatváranie niečoho neotvoreného by len pomiešalo históriu.
    expect(events).toEqual([
      { type: 'navigate', detail: { identifier: 'peter' } },
    ]);
  });
});
