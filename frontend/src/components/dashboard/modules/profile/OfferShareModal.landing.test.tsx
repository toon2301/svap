/**
 * Zdieľanie ponuky Z PROFILU – celý reťazec, nie dialóg izolovane.
 *
 * Existujúce testy presmerovania renderovali `FeedShareDialog` samostatne,
 * takže im unikalo všetko, čo robí SKUTOČNÁ kompozícia: dialóg žije vnútri
 * `OfferShareModal`, ktorý sa po úspechu sám odmountuje (rodič zahodí
 * `shareOffer`). Tento súbor ide presne tou cestou.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { OfferShareModal } from './OfferShareModal';
import { shareOfferToFeed } from '@/lib/feedApi';
import { resetFeedShareLanding } from '../feed/feedShareLanding';
import { onFeedHomeNavigation } from '../feed/feedHomeNavigation';
import { setCurrentAccountId } from '@/lib/currentAccount';
import { resetFeedReturnState, saveFeedReturn } from '../feed/feedReturnState';

const mockRouterPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
  usePathname: () => '/dashboard/users/me',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('qrcode', () => ({
  __esModule: true,
  default: { toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,x') },
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn() },
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}));

jest.mock('@/lib/feedApi', () => ({ shareOfferToFeed: jest.fn() }));

jest.mock('../messages/GroupUserPicker', () => ({
  GroupUserPicker: () => <div />,
}));

jest.mock('../messages/messagingApi', () => ({
  getMessagingErrorMessage: jest.fn(),
  sendOfferShare: jest.fn(),
}));

jest.mock('../messages/messagesEvents', () => ({
  requestConversationsRefresh: jest.fn(),
  suppressPassiveMessagingRefresh: jest.fn(),
}));

jest.mock('../messages/DesktopEmojiPickerButton', () => ({
  DesktopEmojiPickerButton: () => null,
}));

jest.mock('@/hooks', () => ({
  useIsMobile: () => false,
  useIsMobileState: () => ({ isMobile: false, isResolved: true }),
}));

const mockedShareOffer = shareOfferToFeed as jest.MockedFunction<
  typeof shareOfferToFeed
>;

const offer = {
  id: 5,
  title: 'Kurz gitary',
  imageUrl: null,
  location: 'Bratislava',
  is_seeking: false,
  price_negotiable: false,
  price_from: '25',
  price_currency: '€',
};

/**
 * Rodič, ktorý modal ZAHODÍ – presne ako `ProfileOffersSection`, kde je
 * `<OfferShareModal>` vykreslený len kým `shareOffer` nie je `null`.
 */
function ProfileHost() {
  const [shareOffer, setShareOffer] = React.useState<typeof offer | null>(offer);
  if (!shareOffer) return <div data-testid="profile-without-modal" />;
  return (
    <OfferShareModal
      open
      onClose={() => setShareOffer(null)}
      offerUrl="https://svaply.test/offer/5"
      offer={shareOffer}
    />
  );
}

let homeRequests: number;
let stopHomeRequests: () => void;

beforeEach(() => {
  jest.clearAllMocks();
  mockRouterPush.mockReset();
  homeRequests = 0;
  stopHomeRequests = onFeedHomeNavigation(() => {
    homeRequests += 1;
  });
  resetFeedShareLanding();
  resetFeedReturnState();
  // Snímka sa ukladá len prihlásenému účtu.
  setCurrentAccountId(42);
  mockedShareOffer.mockResolvedValue({ id: 101 } as never);
});

afterEach(() => {
  stopHomeRequests();
  resetFeedShareLanding();
  resetFeedReturnState();
  setCurrentAccountId(null);
});

/** Otvorí vnorený dialóg Nástenky a odošle zdieľanie. */
async function shareToBoard() {
  await userEvent.click(
    await screen.findByRole('button', { name: /Zdieľať na Nástenku/i }),
  );
  await userEvent.click(await screen.findByTestId('feed-share-submit'));
}

describe('zdieľanie vlastnej ponuky z profilu', () => {
  it('lands on the feed even though the modal unmounts itself', async () => {
    render(<ProfileHost />);
    await shareToBoard();

    await waitFor(() => expect(mockedShareOffer).toHaveBeenCalled());
    // Rodič modal zahodil – a napriek tomu sa musí navigovať na Nástenku.
    await waitFor(() =>
      expect(screen.getByTestId('profile-without-modal')).toBeInTheDocument(),
    );
    await waitFor(() => expect(homeRequests).toBe(1));
    // Router sa nepoužíva – push na route, na ktorej appka už je, by nič
    // neprepol a chyba by ostala neviditeľná.
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('drops a stale feed snapshot so the new post is reachable', async () => {
    // Na profil sa prišlo z Nástenky, takže snímka existuje. Vznikla PRED
    // zdieľaním, takže nový príspevok neobsahuje.
    saveFeedReturn({
      posts: [{ id: 1 }] as never,
      nextUrl: null,
      scrollTop: 400,
    });

    render(<ProfileHost />);
    await shareToBoard();

    await waitFor(() => expect(homeRequests).toBe(1));
  });
});
